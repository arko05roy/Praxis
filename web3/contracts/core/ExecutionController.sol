// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

import {IERC20} from "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import {SafeERC20} from "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import {Ownable} from "@openzeppelin/contracts/access/Ownable.sol";
import {ReentrancyGuard} from "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import {PraxisStructs} from "../lib/PraxisStructs.sol";
import {PraxisErrors} from "../lib/PraxisErrors.sol";
import {PraxisEvents} from "../lib/PraxisEvents.sol";

interface IExecutionRightsNFT {
    function getRights(uint256 tokenId) external view returns (PraxisStructs.ExecutionRights memory);
    function isValid(uint256 tokenId) external view returns (bool);
    function isExpired(uint256 tokenId) external view returns (bool);
    function getExecutor(uint256 tokenId) external view returns (address);
    function getConstraints(uint256 tokenId) external view returns (PraxisStructs.RiskConstraints memory);
    function updateStatus(uint256 tokenId, uint256 capitalDeployed, int256 realizedPnl, int256 unrealizedPnl) external;
    function markLiquidated(uint256 tokenId) external;
    function ownerOf(uint256 tokenId) external view returns (address);
}

interface IExecutionVault {
    function allocateCapital(uint256 ertId, uint256 amount) external;
    function executeAction(uint256 ertId, address adapter, bytes calldata data) external returns (bytes memory);
    function transferToAdapter(address adapter, address token, uint256 amount) external;
    function approveAdapter(address adapter, address token, uint256 amount) external;
    function returnCapital(uint256 ertId, uint256 amount, int256 pnl) external;
    function isAdapterRegistered(address adapter) external view returns (bool);
    function totalAssets() external view returns (uint256);
}

interface IPositionManager {
    function recordPosition(uint256 ertId, address adapter, address asset, uint256 size, uint256 entryValueUsd, PraxisStructs.ActionType positionType) external returns (bytes32);
    function recordPositionWithId(uint256 ertId, bytes32 externalPositionId, address adapter, address asset, uint256 size, uint256 entryValueUsd, PraxisStructs.ActionType positionType) external;
    function closePosition(bytes32 positionId, int256 realizedPnl) external;
    function updatePosition(bytes32 positionId, uint256 newSize, uint256 newValueUsd) external;
    function getPositions(uint256 ertId) external view returns (PraxisStructs.TrackedPosition[] memory);
    function getTotalEntryValue(uint256 ertId) external view returns (uint256);
    function hasOpenPositions(uint256 ertId) external view returns (bool);
}

interface IExposureManager {
    function recordExposure(address asset, uint256 usdAmount, uint256 totalVaultAssets) external;
    function removeExposure(address asset, uint256 usdAmount) external;
    function canAddExposure(address asset, uint256 usdAmount, uint256 totalVaultAssets) external view returns (bool);
}

interface ICircuitBreaker {
    function isPaused() external view returns (bool);
}

interface IFlareOracle {
    function getTokenPriceUSD(address token) external payable returns (uint256 priceInWei, uint64 timestamp);
    function hasFeed(address token) external view returns (bool);
}

/**
 * @title ExecutionController
 * @notice Validates and executes actions against ERT constraints
 * @dev Central coordinator for all execution rights operations
 */
contract ExecutionController is Ownable, ReentrancyGuard {
    using SafeERC20 for IERC20;

    // =============================================================
    //                          CONSTANTS
    // =============================================================

    /// @notice Basis points denominator
    uint256 public constant BPS = 10000;

    /// @notice Price precision (18 decimals)
    uint256 public constant PRICE_PRECISION = 1e18;

    // =============================================================
    //                          STORAGE
    // =============================================================

    /// @notice Execution Rights NFT contract
    address public ertNFT;

    /// @notice Execution Vault contract
    address public executionVault;

    /// @notice Position Manager contract
    address public positionManager;

    /// @notice Exposure Manager contract
    address public exposureManager;

    /// @notice Circuit Breaker contract
    address public circuitBreaker;

    /// @notice Flare Oracle contract
    address public flareOracle;

    /// @notice Registered adapters
    mapping(address => bool) public registeredAdapters;

    // =============================================================
    //                          EVENTS
    // =============================================================

    event ActionValidated(uint256 indexed ertId, PraxisStructs.ActionType actionType, address adapter);
    event ActionRejected(uint256 indexed ertId, string reason);

    // =============================================================
    //                          MODIFIERS
    // =============================================================

    modifier whenNotPaused() {
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
     * @notice Initialize the ExecutionController
     * @param _ertNFT Address of ERT NFT contract
     * @param _vault Address of execution vault
     * @param _positionManager Address of position manager
     * @param _exposureManager Address of exposure manager
     * @param _flareOracle Address of Flare oracle
     */
    constructor(
        address _ertNFT,
        address _vault,
        address _positionManager,
        address _exposureManager,
        address _flareOracle
    ) Ownable(msg.sender) {
        if (_ertNFT == address(0)) revert PraxisErrors.ZeroAddress();
        if (_vault == address(0)) revert PraxisErrors.ZeroAddress();
        if (_positionManager == address(0)) revert PraxisErrors.ZeroAddress();
        if (_flareOracle == address(0)) revert PraxisErrors.ZeroAddress();

        ertNFT = _ertNFT;
        executionVault = _vault;
        positionManager = _positionManager;
        exposureManager = _exposureManager;
        flareOracle = _flareOracle;
    }

    // =============================================================
    //                   EXECUTION FUNCTIONS
    // =============================================================

    /**
     * @notice Validate and execute a batch of actions
     * @param ertId The ERT ID
     * @param actions Array of actions to execute
     * @return results Array of results from each action
     */
    function validateAndExecute(
        uint256 ertId,
        PraxisStructs.Action[] calldata actions
    ) external nonReentrant whenNotPaused returns (bytes[] memory results) {
        // Validate ERT
        _validateERT(ertId, msg.sender);

        PraxisStructs.ExecutionRights memory rights = IExecutionRightsNFT(ertNFT).getRights(ertId);

        if (actions.length == 0) {
            revert PraxisErrors.EmptyStrategy();
        }

        results = new bytes[](actions.length);

        for (uint256 i = 0; i < actions.length; i++) {
            // Validate each action against constraints
            _validateAction(ertId, rights, actions[i]);

            // Execute the action
            results[i] = _executeAction(ertId, rights, actions[i]);

            emit ActionValidated(ertId, actions[i].actionType, actions[i].adapter);
        }

        // Update ERT status after all actions
        _updateERTStatus(ertId);
    }

    /**
     * @notice Execute a single action
     * @param ertId The ERT ID
     * @param action The action to execute
     * @return result The result of the action
     */
    function executeSingle(
        uint256 ertId,
        PraxisStructs.Action calldata action
    ) external nonReentrant whenNotPaused returns (bytes memory result) {
        _validateERT(ertId, msg.sender);

        PraxisStructs.ExecutionRights memory rights = IExecutionRightsNFT(ertNFT).getRights(ertId);

        _validateAction(ertId, rights, action);
        result = _executeAction(ertId, rights, action);

        _updateERTStatus(ertId);

        emit ActionValidated(ertId, action.actionType, action.adapter);
    }

    // =============================================================
    //                  VALIDATION FUNCTIONS
    // =============================================================

    /**
     * @notice Validate ERT ownership and status
     * @param ertId The ERT ID
     * @param caller The caller address
     */
    function _validateERT(uint256 ertId, address caller) internal view {
        IExecutionRightsNFT nft = IExecutionRightsNFT(ertNFT);

        // Check if ERT exists and is valid
        if (!nft.isValid(ertId)) {
            PraxisStructs.ExecutionRights memory rights = nft.getRights(ertId);
            revert PraxisErrors.ERTNotActive(ertId, uint8(rights.ertStatus));
        }

        // Check caller is the holder
        if (nft.ownerOf(ertId) != caller) {
            revert PraxisErrors.NotERTHolder(caller, nft.ownerOf(ertId));
        }

        // Check not expired
        if (nft.isExpired(ertId)) {
            PraxisStructs.ExecutionRights memory rights = nft.getRights(ertId);
            revert PraxisErrors.ERTExpired(ertId, rights.expiryTime);
        }
    }

    /**
     * @notice Validate a single action against ERT constraints
     * @param ertId The ERT ID
     * @param rights The execution rights
     * @param action The action to validate
     */
    function _validateAction(
        uint256 ertId,
        PraxisStructs.ExecutionRights memory rights,
        PraxisStructs.Action calldata action
    ) internal view {
        // Check adapter is in whitelist
        bool adapterAllowed = false;
        for (uint256 i = 0; i < rights.constraints.allowedAdapters.length; i++) {
            if (rights.constraints.allowedAdapters[i] == action.adapter) {
                adapterAllowed = true;
                break;
            }
        }
        if (!adapterAllowed) {
            revert PraxisErrors.AdapterNotAllowed(action.adapter, ertId);
        }

        // Check adapter is registered in vault
        if (!IExecutionVault(executionVault).isAdapterRegistered(action.adapter)) {
            revert PraxisErrors.InvalidAdapter();
        }

        // Check assets are in whitelist
        bool tokenInAllowed = _isAssetAllowed(action.tokenIn, rights.constraints.allowedAssets);
        bool tokenOutAllowed = _isAssetAllowed(action.tokenOut, rights.constraints.allowedAssets);

        if (!tokenInAllowed) {
            revert PraxisErrors.AssetNotAllowed(action.tokenIn, ertId);
        }
        if (action.tokenOut != address(0) && !tokenOutAllowed) {
            revert PraxisErrors.AssetNotAllowed(action.tokenOut, ertId);
        }

        // Check capital limit
        uint256 currentDeployed = rights.status.capitalDeployed;
        if (currentDeployed + action.amountIn > rights.capitalLimit) {
            revert PraxisErrors.CapitalLimitExceeded(
                currentDeployed + action.amountIn,
                rights.capitalLimit
            );
        }

        // Check position size (for new positions)
        if (action.amountIn > 0 && rights.constraints.maxPositionSizeBps > 0) {
            uint256 positionSizeBps = (action.amountIn * BPS) / rights.capitalLimit;
            if (positionSizeBps > rights.constraints.maxPositionSizeBps) {
                revert PraxisErrors.PositionSizeExceeded(positionSizeBps, rights.constraints.maxPositionSizeBps);
            }
        }

        // Check exposure limits
        if (exposureManager != address(0) && action.tokenOut != address(0)) {
            uint256 totalAssets = IExecutionVault(executionVault).totalAssets();
            // Estimate value (simplified - should use oracle)
            if (!IExposureManager(exposureManager).canAddExposure(
                action.tokenOut,
                action.amountIn, // Simplified
                totalAssets
            )) {
                revert PraxisErrors.AssetExposureLimitExceeded(
                    action.tokenOut,
                    action.amountIn,
                    0
                );
            }
        }

        // Check drawdown
        _checkDrawdown(ertId, rights);
    }

    /**
     * @notice Check if asset is in allowed list
     * @param asset The asset address
     * @param allowedAssets The allowed assets array
     * @return Whether the asset is allowed
     */
    function _isAssetAllowed(address asset, address[] memory allowedAssets) internal pure returns (bool) {
        if (asset == address(0)) return true; // Native token always allowed

        for (uint256 i = 0; i < allowedAssets.length; i++) {
            if (allowedAssets[i] == asset) {
                return true;
            }
        }
        return false;
    }

    /**
     * @notice Check current drawdown against limits
     * @param ertId The ERT ID
     * @param rights The execution rights
     */
    function _checkDrawdown(
        uint256 ertId,
        PraxisStructs.ExecutionRights memory rights
    ) internal view {
        int256 totalPnl = rights.status.realizedPnl + rights.status.unrealizedPnl;

        if (totalPnl < 0) {
            uint256 drawdownBps = (uint256(-totalPnl) * BPS) / rights.capitalLimit;

            if (drawdownBps >= rights.constraints.maxDrawdownBps) {
                revert PraxisErrors.DrawdownLimitExceeded(drawdownBps, rights.constraints.maxDrawdownBps);
            }
        }
    }

    // =============================================================
    //                   EXECUTION FUNCTIONS
    // =============================================================

    /**
     * @notice Execute a validated action
     * @param ertId The ERT ID
     * @param rights The execution rights
     * @param action The action to execute
     * @return result The result of the action
     */
    function _executeAction(
        uint256 ertId,
        PraxisStructs.ExecutionRights memory rights,
        PraxisStructs.Action calldata action
    ) internal returns (bytes memory result) {
        IExecutionVault vault = IExecutionVault(executionVault);

        // Handle different action types
        if (action.actionType == PraxisStructs.ActionType.SWAP) {
            result = _executeSwap(ertId, action, vault);
        } else if (action.actionType == PraxisStructs.ActionType.SUPPLY ||
                   action.actionType == PraxisStructs.ActionType.STAKE) {
            result = _executeDeposit(ertId, action, vault);
        } else if (action.actionType == PraxisStructs.ActionType.WITHDRAW ||
                   action.actionType == PraxisStructs.ActionType.UNSTAKE) {
            result = _executeWithdraw(ertId, action, vault);
        } else if (action.actionType == PraxisStructs.ActionType.OPEN_POSITION) {
            result = _executeOpenPosition(ertId, action, vault);
        } else if (action.actionType == PraxisStructs.ActionType.CLOSE_POSITION) {
            result = _executeClosePosition(ertId, action, vault);
        } else {
            revert PraxisErrors.InvalidActionType(uint8(action.actionType));
        }
    }

    /**
     * @notice Execute a swap action
     */
    function _executeSwap(
        uint256 ertId,
        PraxisStructs.Action calldata action,
        IExecutionVault vault
    ) internal returns (bytes memory result) {
        // Approve adapter to spend tokens
        vault.approveAdapter(action.adapter, action.tokenIn, action.amountIn);

        // Build the call data for the swap
        bytes memory callData = abi.encodeWithSignature(
            "swap(address,address,uint256,uint256,address,bytes)",
            action.tokenIn,
            action.tokenOut,
            action.amountIn,
            action.minAmountOut,
            executionVault, // Return tokens to vault
            action.extraData
        );

        // Execute through vault
        result = vault.executeAction(ertId, action.adapter, callData);

        // Record position
        IPositionManager(positionManager).recordPosition(
            ertId,
            action.adapter,
            action.tokenOut,
            action.amountIn, // Simplified - should decode result
            action.amountIn, // Entry value
            action.actionType
        );

        // Update exposure
        if (exposureManager != address(0)) {
            IExposureManager(exposureManager).recordExposure(
                action.tokenOut,
                action.amountIn,
                vault.totalAssets()
            );
        }
    }

    /**
     * @notice Execute a deposit/stake action
     */
    function _executeDeposit(
        uint256 ertId,
        PraxisStructs.Action calldata action,
        IExecutionVault vault
    ) internal returns (bytes memory result) {
        vault.approveAdapter(action.adapter, action.tokenIn, action.amountIn);

        bytes memory callData = abi.encodeWithSignature(
            "deposit(address,uint256,address)",
            action.tokenIn,
            action.amountIn,
            executionVault
        );

        result = vault.executeAction(ertId, action.adapter, callData);

        IPositionManager(positionManager).recordPosition(
            ertId,
            action.adapter,
            action.tokenIn,
            action.amountIn,
            action.amountIn,
            action.actionType
        );
    }

    /**
     * @notice Execute a withdraw/unstake action
     */
    function _executeWithdraw(
        uint256 ertId,
        PraxisStructs.Action calldata action,
        IExecutionVault vault
    ) internal returns (bytes memory result) {
        bytes memory callData = abi.encodeWithSignature(
            "withdraw(address,uint256,address)",
            action.tokenIn,
            action.amountIn,
            executionVault
        );

        result = vault.executeAction(ertId, action.adapter, callData);

        // Close position tracking
        bytes32 positionId = keccak256(abi.encodePacked(ertId, action.adapter, action.tokenIn));
        // Note: This is simplified - would need proper position ID tracking
    }

    /**
     * @notice Execute open perpetual position
     */
    function _executeOpenPosition(
        uint256 ertId,
        PraxisStructs.Action calldata action,
        IExecutionVault vault
    ) internal returns (bytes memory result) {
        // Decode perp-specific data from extraData
        (bytes32 market, uint256 size, uint8 leverage, bool isLong) =
            abi.decode(action.extraData, (bytes32, uint256, uint8, bool));

        // Validate leverage against ERT constraints
        {
            uint8 maxLev = IExecutionRightsNFT(ertNFT).getRights(ertId).constraints.maxLeverage;
            if (leverage > maxLev) {
                revert PraxisErrors.ExcessiveLeverage(leverage, maxLev);
            }
        }

        vault.approveAdapter(action.adapter, action.tokenIn, action.amountIn);

        result = vault.executeAction(
            ertId,
            action.adapter,
            abi.encodeWithSignature(
                "openPosition(bytes32,uint256,uint256,uint8,bool,address)",
                market, action.amountIn, size, leverage, isLong, executionVault
            )
        );

        // Record position with decoded position ID
        uint256 entryValue = uint256(action.amountIn) * uint256(leverage);
        IPositionManager(positionManager).recordPositionWithId(
            ertId, abi.decode(result, (bytes32)), action.adapter,
            action.tokenIn, size, entryValue, action.actionType
        );
    }

    /**
     * @notice Execute close perpetual position
     */
    function _executeClosePosition(
        uint256 ertId,
        PraxisStructs.Action calldata action,
        IExecutionVault vault
    ) internal returns (bytes memory result) {
        bytes32 positionId = abi.decode(action.extraData, (bytes32));

        bytes memory callData = abi.encodeWithSignature(
            "closePosition(bytes32,address)",
            positionId,
            executionVault
        );

        result = vault.executeAction(ertId, action.adapter, callData);

        // Decode PnL from result
        int256 realizedPnl = abi.decode(result, (int256));

        IPositionManager(positionManager).closePosition(positionId, realizedPnl);
    }

    /**
     * @notice Update ERT status after actions
     */
    function _updateERTStatus(uint256 ertId) internal {
        // Get current positions value
        uint256 totalDeployed = IPositionManager(positionManager).getTotalEntryValue(ertId);

        // Calculate PnL (simplified - would need oracle call)
        int256 realizedPnl = 0;
        int256 unrealizedPnl = 0;

        IExecutionRightsNFT(ertNFT).updateStatus(ertId, totalDeployed, realizedPnl, unrealizedPnl);
    }

    // =============================================================
    //                      VIEW FUNCTIONS
    // =============================================================

    /**
     * @notice Check if an action would be valid
     * @param ertId The ERT ID
     * @param action The action to check
     * @return valid Whether the action would be valid
     * @return reason Reason if invalid
     */
    function checkActionValidity(
        uint256 ertId,
        PraxisStructs.Action calldata action
    ) external view returns (bool valid, string memory reason) {
        try this.validateActionView(ertId, action) {
            return (true, "");
        } catch Error(string memory _reason) {
            return (false, _reason);
        } catch {
            return (false, "Unknown error");
        }
    }

    /**
     * @notice View-only action validation (for checkActionValidity)
     */
    function validateActionView(
        uint256 ertId,
        PraxisStructs.Action calldata action
    ) external view {
        IExecutionRightsNFT nft = IExecutionRightsNFT(ertNFT);

        if (!nft.isValid(ertId)) {
            revert("ERT not valid");
        }

        PraxisStructs.ExecutionRights memory rights = nft.getRights(ertId);
        _validateAction(ertId, rights, action);
    }

    // =============================================================
    //                      ADMIN FUNCTIONS
    // =============================================================

    /**
     * @notice Set the ERT NFT contract
     */
    function setERTNFT(address _ertNFT) external onlyOwner {
        if (_ertNFT == address(0)) revert PraxisErrors.ZeroAddress();
        ertNFT = _ertNFT;
    }

    /**
     * @notice Set the execution vault
     */
    function setExecutionVault(address _vault) external onlyOwner {
        if (_vault == address(0)) revert PraxisErrors.ZeroAddress();
        executionVault = _vault;
    }

    /**
     * @notice Set the position manager
     */
    function setPositionManager(address _positionManager) external onlyOwner {
        if (_positionManager == address(0)) revert PraxisErrors.ZeroAddress();
        positionManager = _positionManager;
    }

    /**
     * @notice Set the exposure manager
     */
    function setExposureManager(address _exposureManager) external onlyOwner {
        exposureManager = _exposureManager;
    }

    /**
     * @notice Set the circuit breaker
     */
    function setCircuitBreaker(address _circuitBreaker) external onlyOwner {
        circuitBreaker = _circuitBreaker;
    }

    /**
     * @notice Set the Flare oracle
     */
    function setFlareOracle(address _oracle) external onlyOwner {
        if (_oracle == address(0)) revert PraxisErrors.ZeroAddress();
        flareOracle = _oracle;
    }

    /**
     * @notice Register an adapter
     */
    function registerAdapter(address adapter) external onlyOwner {
        if (adapter == address(0)) revert PraxisErrors.ZeroAddress();
        registeredAdapters[adapter] = true;
    }

    /**
     * @notice Unregister an adapter
     */
    function unregisterAdapter(address adapter) external onlyOwner {
        registeredAdapters[adapter] = false;
    }
}
