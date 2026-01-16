// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

import {ERC4626} from "@openzeppelin/contracts/token/ERC20/extensions/ERC4626.sol";
import {ERC20} from "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import {IERC20} from "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import {SafeERC20} from "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import {Ownable} from "@openzeppelin/contracts/access/Ownable.sol";
import {ReentrancyGuard} from "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import {Pausable} from "@openzeppelin/contracts/utils/Pausable.sol";
import {PraxisStructs} from "../lib/PraxisStructs.sol";
import {PraxisErrors} from "../lib/PraxisErrors.sol";
import {PraxisEvents} from "../lib/PraxisEvents.sol";

interface IUtilizationController {
    function canAllocate(uint256 totalAssets, uint256 currentAllocated, uint256 newAllocation) external view returns (bool);
    function canWithdraw(uint256 totalAssets, uint256 currentAllocated, uint256 withdrawAmount) external view returns (bool);
}

interface ICircuitBreaker {
    function isPaused() external view returns (bool);
    function canMintERT() external view returns (bool);
}

interface IAdapter {
    function name() external view returns (string memory);
}

/**
 * @title ExecutionVault
 * @notice ERC-4626 vault that holds LP capital for execution rights
 * @dev Capital never leaves the vault - only executed through adapters
 */
contract ExecutionVault is ERC4626, Ownable, ReentrancyGuard, Pausable {
    using SafeERC20 for IERC20;

    // =============================================================
    //                          CONSTANTS
    // =============================================================

    /// @notice Basis points denominator
    uint256 public constant BPS = 10000;

    // =============================================================
    //                          STORAGE
    // =============================================================

    /// @notice Capital allocated per ERT
    mapping(uint256 => uint256) public ertCapitalAllocated;

    /// @notice Total capital currently allocated to ERTs
    uint256 public totalAllocated;

    /// @notice Execution controller address (only it can execute actions)
    address public executionController;

    /// @notice Utilization controller for allocation limits
    address public utilizationController;

    /// @notice Circuit breaker for emergency pauses
    address public circuitBreaker;

    /// @notice Registered adapters that can be called
    mapping(address => bool) public registeredAdapters;

    /// @notice Minimum deposit amount
    uint256 public minDeposit;

    /// @notice Maximum total assets (0 = unlimited)
    uint256 public maxTotalAssets;

    // =============================================================
    //                          EVENTS
    // =============================================================

    event AdapterRegistered(address indexed adapter);
    event AdapterUnregistered(address indexed adapter);
    event MinDepositUpdated(uint256 oldMin, uint256 newMin);
    event MaxTotalAssetsUpdated(uint256 oldMax, uint256 newMax);

    // =============================================================
    //                          MODIFIERS
    // =============================================================

    modifier onlyController() {
        if (msg.sender != executionController) {
            revert PraxisErrors.OnlyController();
        }
        _;
    }

    modifier whenCircuitBreakerNotActive() {
        if (circuitBreaker != address(0)) {
            if (ICircuitBreaker(circuitBreaker).isPaused()) {
                revert PraxisErrors.CircuitBreakerActive();
            }
        }
        _;
    }

    // =============================================================
    //                         CONSTRUCTOR
    // =============================================================

    /**
     * @notice Initialize the ExecutionVault
     * @param _asset The base asset (e.g., USDC)
     * @param _name The vault token name
     * @param _symbol The vault token symbol
     */
    constructor(
        IERC20 _asset,
        string memory _name,
        string memory _symbol
    ) ERC4626(_asset) ERC20(_name, _symbol) Ownable(msg.sender) {
        minDeposit = 1e6; // 1 USDC minimum
    }

    // =============================================================
    //                      LP FUNCTIONS
    // =============================================================

    /**
     * @notice Deposit assets and receive vault shares
     * @dev Overrides ERC4626 to add checks
     */
    function deposit(uint256 assets, address receiver)
        public
        override
        nonReentrant
        whenNotPaused
        returns (uint256 shares)
    {
        if (assets < minDeposit) {
            revert PraxisErrors.InsufficientBalance(minDeposit, assets);
        }

        if (maxTotalAssets > 0 && totalAssets() + assets > maxTotalAssets) {
            revert PraxisErrors.CapitalLimitExceeded(totalAssets() + assets, maxTotalAssets);
        }

        shares = super.deposit(assets, receiver);
    }

    /**
     * @notice Withdraw assets by burning shares
     * @dev Overrides ERC4626 to check utilization
     */
    function withdraw(uint256 assets, address receiver, address owner_)
        public
        override
        nonReentrant
        whenNotPaused
        returns (uint256 shares)
    {
        // Check if withdrawal respects utilization limits
        if (utilizationController != address(0)) {
            if (!IUtilizationController(utilizationController).canWithdraw(
                totalAssets(),
                totalAllocated,
                assets
            )) {
                revert PraxisErrors.UtilizationLimitExceeded(
                    (totalAllocated * BPS) / (totalAssets() - assets),
                    7000 // Default max utilization
                );
            }
        }

        shares = super.withdraw(assets, receiver, owner_);
    }

    /**
     * @notice Redeem shares for assets
     * @dev Overrides ERC4626 to check utilization
     */
    function redeem(uint256 shares, address receiver, address owner_)
        public
        override
        nonReentrant
        whenNotPaused
        returns (uint256 assets)
    {
        assets = previewRedeem(shares);

        // Check if withdrawal respects utilization limits
        if (utilizationController != address(0)) {
            if (!IUtilizationController(utilizationController).canWithdraw(
                totalAssets(),
                totalAllocated,
                assets
            )) {
                revert PraxisErrors.UtilizationLimitExceeded(
                    (totalAllocated * BPS) / (totalAssets() - assets),
                    7000
                );
            }
        }

        assets = super.redeem(shares, receiver, owner_);
    }

    // =============================================================
    //                   EXECUTION FUNCTIONS
    // =============================================================

    /**
     * @notice Allocate capital to an ERT
     * @param ertId The ERT ID
     * @param amount The amount to allocate
     */
    function allocateCapital(uint256 ertId, uint256 amount)
        external
        onlyController
        whenCircuitBreakerNotActive
    {
        // Check utilization limits
        if (utilizationController != address(0)) {
            if (!IUtilizationController(utilizationController).canAllocate(
                totalAssets(),
                totalAllocated,
                amount
            )) {
                revert PraxisErrors.UtilizationLimitExceeded(
                    ((totalAllocated + amount) * BPS) / totalAssets(),
                    7000
                );
            }
        }

        ertCapitalAllocated[ertId] += amount;
        totalAllocated += amount;

        emit PraxisEvents.CapitalAllocated(ertId, amount, totalAllocated);
    }

    /**
     * @notice Execute an action using vault capital
     * @param ertId The ERT ID executing the action
     * @param adapter The adapter to call
     * @param data The encoded function call
     * @return result The result of the call
     */
    function executeAction(
        uint256 ertId,
        address adapter,
        bytes calldata data
    ) external onlyController nonReentrant returns (bytes memory result) {
        if (!registeredAdapters[adapter]) {
            revert PraxisErrors.InvalidAdapter();
        }

        // Execute the call
        bool success;
        (success, result) = adapter.call(data);

        if (!success) {
            // Bubble up the revert reason
            assembly {
                let ptr := mload(0x40)
                let size := returndatasize()
                returndatacopy(ptr, 0, size)
                revert(ptr, size)
            }
        }

        emit PraxisEvents.ActionExecuted(ertId, PraxisStructs.ActionType.SWAP, adapter);
    }

    /**
     * @notice Transfer tokens to adapter for execution
     * @param adapter The adapter address
     * @param token The token to transfer
     * @param amount The amount to transfer
     */
    function transferToAdapter(
        address adapter,
        address token,
        uint256 amount
    ) external onlyController {
        if (!registeredAdapters[adapter]) {
            revert PraxisErrors.InvalidAdapter();
        }

        IERC20(token).safeTransfer(adapter, amount);
    }

    /**
     * @notice Approve adapter to spend tokens
     * @param adapter The adapter address
     * @param token The token to approve
     * @param amount The amount to approve
     */
    function approveAdapter(
        address adapter,
        address token,
        uint256 amount
    ) external onlyController {
        if (!registeredAdapters[adapter]) {
            revert PraxisErrors.InvalidAdapter();
        }

        IERC20(token).forceApprove(adapter, amount);
    }

    /**
     * @notice Return capital from an ERT after settlement
     * @param ertId The ERT ID
     * @param amount The amount being returned
     * @param pnl The profit or loss
     */
    function returnCapital(
        uint256 ertId,
        uint256 amount,
        int256 pnl
    ) external onlyController {
        uint256 allocated = ertCapitalAllocated[ertId];

        // Handle accounting
        if (amount <= totalAllocated) {
            totalAllocated -= amount;
        } else {
            totalAllocated = 0;
        }

        ertCapitalAllocated[ertId] = 0;

        emit PraxisEvents.CapitalReturned(ertId, amount, pnl);
    }

    // =============================================================
    //                      VIEW FUNCTIONS
    // =============================================================

    /**
     * @notice Get available capital (not allocated to ERTs)
     * @return The available capital
     */
    function availableCapital() external view returns (uint256) {
        uint256 total = totalAssets();
        if (totalAllocated >= total) return 0;
        return total - totalAllocated;
    }

    /**
     * @notice Get current utilization rate
     * @return utilizationBps The utilization in basis points
     */
    function utilizationRate() external view returns (uint256 utilizationBps) {
        uint256 total = totalAssets();
        if (total == 0) return 0;
        return (totalAllocated * BPS) / total;
    }

    /**
     * @notice Get capital allocated to a specific ERT
     * @param ertId The ERT ID
     * @return The allocated amount
     */
    function getAllocatedCapital(uint256 ertId) external view returns (uint256) {
        return ertCapitalAllocated[ertId];
    }

    /**
     * @notice Get vault information
     * @return info The vault info struct
     */
    function getVaultInfo() external view returns (PraxisStructs.VaultInfo memory info) {
        uint256 total = totalAssets();

        info = PraxisStructs.VaultInfo({
            totalAssets: total,
            totalShares: totalSupply(),
            totalAllocated: totalAllocated,
            availableCapital: total > totalAllocated ? total - totalAllocated : 0,
            utilizationBps: total > 0 ? (totalAllocated * BPS) / total : 0,
            insuranceFundBalance: 0 // Set by gateway
        });
    }

    /**
     * @notice Check if an adapter is registered
     * @param adapter The adapter address
     * @return Whether it's registered
     */
    function isAdapterRegistered(address adapter) external view returns (bool) {
        return registeredAdapters[adapter];
    }

    // =============================================================
    //                      ADMIN FUNCTIONS
    // =============================================================

    /**
     * @notice Set the execution controller
     * @param _controller The controller address
     */
    function setExecutionController(address _controller) external onlyOwner {
        if (_controller == address(0)) revert PraxisErrors.ZeroAddress();
        executionController = _controller;
    }

    /**
     * @notice Set the utilization controller
     * @param _controller The controller address
     */
    function setUtilizationController(address _controller) external onlyOwner {
        utilizationController = _controller;
    }

    /**
     * @notice Set the circuit breaker
     * @param _circuitBreaker The circuit breaker address
     */
    function setCircuitBreaker(address _circuitBreaker) external onlyOwner {
        circuitBreaker = _circuitBreaker;
    }

    /**
     * @notice Register an adapter
     * @param adapter The adapter address
     */
    function registerAdapter(address adapter) external onlyOwner {
        if (adapter == address(0)) revert PraxisErrors.ZeroAddress();
        registeredAdapters[adapter] = true;
        emit AdapterRegistered(adapter);
    }

    /**
     * @notice Unregister an adapter
     * @param adapter The adapter address
     */
    function unregisterAdapter(address adapter) external onlyOwner {
        registeredAdapters[adapter] = false;
        emit AdapterUnregistered(adapter);
    }

    /**
     * @notice Set minimum deposit amount
     * @param _minDeposit The minimum amount
     */
    function setMinDeposit(uint256 _minDeposit) external onlyOwner {
        uint256 oldMin = minDeposit;
        minDeposit = _minDeposit;
        emit MinDepositUpdated(oldMin, _minDeposit);
    }

    /**
     * @notice Set maximum total assets
     * @param _maxTotalAssets The maximum (0 = unlimited)
     */
    function setMaxTotalAssets(uint256 _maxTotalAssets) external onlyOwner {
        uint256 oldMax = maxTotalAssets;
        maxTotalAssets = _maxTotalAssets;
        emit MaxTotalAssetsUpdated(oldMax, _maxTotalAssets);
    }

    /**
     * @notice Pause the vault
     */
    function pause() external onlyOwner {
        _pause();
    }

    /**
     * @notice Unpause the vault
     */
    function unpause() external onlyOwner {
        _unpause();
    }

    /**
     * @notice Rescue tokens accidentally sent to this contract
     * @dev Cannot rescue the base asset
     * @param token Token to rescue
     * @param to Address to send rescued tokens
     * @param amount Amount to rescue
     */
    function rescueTokens(address token, address to, uint256 amount) external onlyOwner {
        if (token == asset()) revert PraxisErrors.InvalidAdapter();
        if (to == address(0)) revert PraxisErrors.ZeroAddress();
        IERC20(token).safeTransfer(to, amount);
    }

    /**
     * @notice Emergency function to force return capital
     * @dev Only use if settlement fails
     * @param ertId The ERT ID
     */
    function emergencyReturnCapital(uint256 ertId) external onlyOwner {
        uint256 allocated = ertCapitalAllocated[ertId];

        if (allocated <= totalAllocated) {
            totalAllocated -= allocated;
        } else {
            totalAllocated = 0;
        }

        ertCapitalAllocated[ertId] = 0;

        emit PraxisEvents.CapitalReturned(ertId, allocated, 0);
    }
}
