// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

import {ReentrancyGuard} from "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import {Pausable} from "@openzeppelin/contracts/utils/Pausable.sol";
import {Ownable} from "@openzeppelin/contracts/access/Ownable.sol";
import {IERC20} from "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import {SafeERC20} from "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import {IERC20Permit} from "@openzeppelin/contracts/token/ERC20/extensions/IERC20Permit.sol";

import {IPraxisGateway} from "../interfaces/IPraxisGateway.sol";
import {IExecutionVault} from "../interfaces/IExecutionVault.sol";
import {IExecutionRightsNFT} from "../interfaces/IExecutionRightsNFT.sol";
import {ISettlementEngine} from "../interfaces/ISettlementEngine.sol";
import {IPositionManager} from "../interfaces/IPositionManager.sol";
import {IReputationManager} from "../interfaces/IReputationManager.sol";
import {PraxisStructs} from "../lib/PraxisStructs.sol";
import {PraxisErrors} from "../lib/PraxisErrors.sol";
import {PraxisEvents} from "../lib/PraxisEvents.sol";

/**
 * @title PraxisGateway
 * @notice Unified entry point for all PRAXIS protocol interactions
 * @dev This is a thin facade that forwards calls to underlying contracts without holding state
 *
 * Design Philosophy:
 * - No state storage - all state is in underlying contracts
 * - Forward calls to appropriate contracts
 * - Provide convenience wrappers for common workflows
 * - Single entry point for better UX and gas optimization
 *
 * Components wired:
 * - ExecutionVault: LP deposits/withdrawals
 * - ExecutionRightsNFT: ERT minting and management
 * - ExecutionController: Action execution
 * - SettlementEngine: PnL settlement
 * - ReputationManager: Executor tier management
 * - PositionManager: Position tracking
 */
contract PraxisGateway is IPraxisGateway, ReentrancyGuard, Pausable, Ownable {
    using SafeERC20 for IERC20;

    // =============================================================
    //                         CONSTANTS
    // =============================================================

    uint16 public constant BPS = 10000;

    // =============================================================
    //                       IMMUTABLES
    // =============================================================

    /// @notice The execution vault (ERC-4626)
    IExecutionVault public immutable vault;

    /// @notice The execution rights NFT contract
    IExecutionRightsNFT public immutable ertNFT;

    /// @notice The base asset (USDC)
    IERC20 public immutable baseAsset;

    /// @notice The reputation manager
    IReputationManager public immutable reputationManager;

    /// @notice The position manager
    IPositionManager public immutable positionManager;

    // =============================================================
    //                         STATE
    // =============================================================

    /// @notice The settlement engine
    ISettlementEngine public settlementEngine;

    /// @notice The execution controller
    address public executionController;

    // =============================================================
    //                        CONSTRUCTOR
    // =============================================================

    /**
     * @notice Initialize the gateway with all required components
     * @param _vault The execution vault address
     * @param _ertNFT The execution rights NFT address
     * @param _settlementEngine The settlement engine address
     * @param _executionController The execution controller address
     * @param _reputationManager The reputation manager address
     * @param _positionManager The position manager address
     */
    constructor(
        address _vault,
        address _ertNFT,
        address _settlementEngine,
        address _executionController,
        address _reputationManager,
        address _positionManager
    ) Ownable(msg.sender) {
        if (_vault == address(0)) revert PraxisErrors.ZeroAddress();
        if (_ertNFT == address(0)) revert PraxisErrors.ZeroAddress();

        vault = IExecutionVault(_vault);
        ertNFT = IExecutionRightsNFT(_ertNFT);
        settlementEngine = ISettlementEngine(_settlementEngine);
        executionController = _executionController;
        reputationManager = IReputationManager(_reputationManager);
        positionManager = IPositionManager(_positionManager);

        // Get base asset from vault
        baseAsset = IERC20(vault.asset());
    }

    // =============================================================
    //                        LP FUNCTIONS
    // =============================================================

    /**
     * @inheritdoc IPraxisGateway
     */
    function deposit(uint256 amount) external nonReentrant whenNotPaused returns (uint256 shares) {
        if (amount == 0) revert PraxisErrors.ZeroAmount();

        // Transfer tokens from user to gateway
        baseAsset.safeTransferFrom(msg.sender, address(this), amount);

        // Approve vault to spend tokens
        baseAsset.approve(address(vault), amount);

        // Deposit to vault on behalf of user
        shares = vault.deposit(amount, msg.sender);

        emit LPDeposit(msg.sender, amount, shares);
    }

    /**
     * @inheritdoc IPraxisGateway
     */
    function depositWithPermit(
        uint256 amount,
        uint256 deadline,
        uint8 v,
        bytes32 r,
        bytes32 s
    ) external nonReentrant whenNotPaused returns (uint256 shares) {
        if (amount == 0) revert PraxisErrors.ZeroAmount();

        // Use permit to approve transfer
        IERC20Permit(address(baseAsset)).permit(msg.sender, address(this), amount, deadline, v, r, s);

        // Transfer tokens from user to gateway
        baseAsset.safeTransferFrom(msg.sender, address(this), amount);

        // Approve vault to spend tokens
        baseAsset.approve(address(vault), amount);

        // Deposit to vault on behalf of user
        shares = vault.deposit(amount, msg.sender);

        emit LPDeposit(msg.sender, amount, shares);
    }

    /**
     * @inheritdoc IPraxisGateway
     */
    function withdraw(uint256 shares) external nonReentrant whenNotPaused returns (uint256 amount) {
        if (shares == 0) revert PraxisErrors.ZeroAmount();

        // Redeem shares from vault (vault will transfer directly to user)
        amount = vault.redeem(shares, msg.sender, msg.sender);

        emit LPWithdraw(msg.sender, shares, amount);
    }

    /**
     * @inheritdoc IPraxisGateway
     */
    function getVaultInfo() external view returns (VaultInfo memory info) {
        info.totalAssets = vault.totalAssets();
        info.totalShares = vault.totalSupply();
        info.allocatedCapital = vault.totalAllocated();
        info.availableCapital = vault.availableCapital();

        // Calculate utilization rate
        if (info.totalAssets > 0) {
            info.utilizationRate = uint16((info.allocatedCapital * BPS) / info.totalAssets);
        }
    }

    // =============================================================
    //                     EXECUTOR FUNCTIONS
    // =============================================================

    /**
     * @inheritdoc IPraxisGateway
     */
    function requestExecutionRights(
        uint256 capitalNeeded,
        uint256 duration,
        PraxisStructs.RiskConstraints calldata constraints,
        FeeParams calldata fees
    ) external payable nonReentrant whenNotPaused returns (uint256 ertId) {
        if (capitalNeeded == 0) revert PraxisErrors.ZeroAmount();
        if (duration == 0) revert PraxisErrors.ZeroAmount();

        // Build fee structure
        PraxisStructs.FeeStructure memory feeParams = PraxisStructs.FeeStructure({
            baseFeeAprBps: fees.baseFeeAprBps,
            profitShareBps: fees.profitShareBps,
            stakedAmount: msg.value
        });

        // Mint ERT through NFT contract
        ertId = ertNFT.mint{value: msg.value}(
            msg.sender,
            capitalNeeded,
            duration,
            constraints,
            feeParams
        );

        emit ExecutionRightsRequested(msg.sender, ertId, capitalNeeded, duration);
    }

    /**
     * @inheritdoc IPraxisGateway
     */
    function executeWithRights(
        uint256 ertId,
        Action[] calldata actions
    ) external nonReentrant whenNotPaused returns (bytes[] memory results) {
        // Verify caller is ERT holder
        if (ertNFT.ownerOf(ertId) != msg.sender) {
            revert PraxisErrors.Unauthorized();
        }

        results = new bytes[](actions.length);

        // Execute each action through the controller
        for (uint256 i = 0; i < actions.length; i++) {
            // Forward call to execution controller
            (bool success, bytes memory result) = executionController.call(
                abi.encodeWithSignature(
                    "executeAction(uint256,address,bytes)",
                    ertId,
                    actions[i].adapter,
                    actions[i].data
                )
            );

            if (!success) {
                // Bubble up the revert reason
                assembly {
                    revert(add(result, 32), mload(result))
                }
            }

            results[i] = result;
        }

        emit ActionsExecuted(msg.sender, ertId, actions.length);
    }

    /**
     * @inheritdoc IPraxisGateway
     */
    function settleRights(uint256 ertId) external nonReentrant returns (PraxisStructs.SettlementResult memory result) {
        // Verify caller is ERT holder
        if (ertNFT.ownerOf(ertId) != msg.sender) {
            revert PraxisErrors.Unauthorized();
        }

        // Settle through settlement engine
        result = settlementEngine.settle(ertId);

        emit ExecutionRightsSettled(msg.sender, ertId, result.totalPnl);
    }

    /**
     * @inheritdoc IPraxisGateway
     */
    function forceSettleRights(uint256 ertId) external nonReentrant returns (PraxisStructs.SettlementResult memory result) {
        // Anyone can force settle expired ERTs
        result = settlementEngine.forceSettle(ertId);

        PraxisStructs.ExecutionRights memory rights = ertNFT.getRights(ertId);
        emit ExecutionRightsSettled(rights.executor, ertId, result.totalPnl);
    }

    // =============================================================
    //                       VIEW FUNCTIONS
    // =============================================================

    /**
     * @inheritdoc IPraxisGateway
     */
    function getExecutionRights(uint256 ertId) external view returns (PraxisStructs.ExecutionRights memory rights) {
        return ertNFT.getRights(ertId);
    }

    /**
     * @inheritdoc IPraxisGateway
     */
    function getPositions(uint256 ertId) external view returns (PraxisStructs.TrackedPosition[] memory positions) {
        return positionManager.getPositions(ertId);
    }

    /**
     * @inheritdoc IPraxisGateway
     */
    function estimatePnl(uint256 ertId) external view returns (int256 pnl) {
        return settlementEngine.calculatePnl(ertId);
    }

    /**
     * @inheritdoc IPraxisGateway
     */
    function estimateSettlement(uint256 ertId) external view returns (PraxisStructs.SettlementResult memory result) {
        return settlementEngine.estimateSettlement(ertId);
    }

    /**
     * @inheritdoc IPraxisGateway
     */
    function checkExecutor(address executor) external view returns (bool isAuthorized, PraxisStructs.ExecutorTier tier) {
        PraxisStructs.ExecutorReputation memory rep = reputationManager.getReputation(executor);
        isAuthorized = !rep.isBanned;
        tier = rep.tier;
    }

    /**
     * @inheritdoc IPraxisGateway
     */
    function getRequiredStake(address executor, uint256 capitalNeeded) external view returns (uint256 requiredStake) {
        return reputationManager.getRequiredStake(executor, capitalNeeded);
    }

    // =============================================================
    //                    CONVENIENCE FUNCTIONS
    // =============================================================

    /**
     * @inheritdoc IPraxisGateway
     */
    function depositAndExecute(
        uint256 depositAmount,
        uint256 capitalNeeded,
        uint256 duration,
        PraxisStructs.RiskConstraints calldata constraints,
        FeeParams calldata fees,
        Action[] calldata actions
    ) external payable nonReentrant whenNotPaused returns (uint256 ertId, bytes[] memory results) {
        if (depositAmount == 0) revert PraxisErrors.ZeroAmount();
        if (capitalNeeded == 0) revert PraxisErrors.ZeroAmount();
        if (capitalNeeded > depositAmount) revert PraxisErrors.InsufficientBalance(capitalNeeded, depositAmount);

        // 1. Deposit as LP
        baseAsset.safeTransferFrom(msg.sender, address(this), depositAmount);
        baseAsset.approve(address(vault), depositAmount);
        vault.deposit(depositAmount, msg.sender);

        // 2. Request execution rights
        PraxisStructs.FeeStructure memory feeParams = PraxisStructs.FeeStructure({
            baseFeeAprBps: fees.baseFeeAprBps,
            profitShareBps: fees.profitShareBps,
            stakedAmount: msg.value
        });

        ertId = ertNFT.mint{value: msg.value}(
            msg.sender,
            capitalNeeded,
            duration,
            constraints,
            feeParams
        );

        // 3. Execute actions if provided
        if (actions.length > 0) {
            results = new bytes[](actions.length);

            for (uint256 i = 0; i < actions.length; i++) {
                (bool success, bytes memory result) = executionController.call(
                    abi.encodeWithSignature(
                        "executeAction(uint256,address,bytes)",
                        ertId,
                        actions[i].adapter,
                        actions[i].data
                    )
                );

                if (!success) {
                    assembly {
                        revert(add(result, 32), mload(result))
                    }
                }

                results[i] = result;
            }
        }

        emit DepositAndExecute(msg.sender, depositAmount, ertId);
    }

    // =============================================================
    //                       ADMIN FUNCTIONS
    // =============================================================

    /**
     * @inheritdoc IPraxisGateway
     */
    function setSettlementEngine(address newSettlementEngine) external onlyOwner {
        if (newSettlementEngine == address(0)) revert PraxisErrors.ZeroAddress();
        settlementEngine = ISettlementEngine(newSettlementEngine);
    }

    /**
     * @inheritdoc IPraxisGateway
     */
    function setExecutionController(address newController) external onlyOwner {
        if (newController == address(0)) revert PraxisErrors.ZeroAddress();
        executionController = newController;
    }

    /**
     * @inheritdoc IPraxisGateway
     */
    function pause() external onlyOwner {
        _pause();
    }

    /**
     * @inheritdoc IPraxisGateway
     */
    function unpause() external onlyOwner {
        _unpause();
    }

    // =============================================================
    //                        RECEIVE ETH
    // =============================================================

    /**
     * @notice Receive ETH for stake refunds
     */
    receive() external payable {}
}
