// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

import {PraxisStructs} from "./PraxisStructs.sol";

/**
 * @title PraxisEvents
 * @notice Event definitions for the PRAXIS protocol
 */
library PraxisEvents {
    // =============================================================
    //                         ORACLE EVENTS
    // =============================================================

    /// @notice Emitted when a token-to-feed mapping is configured
    /// @param token Token address
    /// @param feedId FTSO feed ID
    event FeedConfigured(address indexed token, bytes21 indexed feedId);

    /// @notice Emitted when a feed mapping is removed
    /// @param token Token address
    event FeedRemoved(address indexed token);

    /// @notice Emitted when price staleness threshold is updated
    /// @param oldMaxAge Previous max age
    /// @param newMaxAge New max age
    event MaxPriceAgeUpdated(uint256 oldMaxAge, uint256 newMaxAge);

    // =============================================================
    //                          SWAP EVENTS
    // =============================================================

    /// @notice Emitted when a swap is executed
    /// @param user User who initiated the swap
    /// @param tokenIn Input token
    /// @param tokenOut Output token
    /// @param amountIn Amount of input token
    /// @param amountOut Amount of output token received
    /// @param adapter Adapter used for the swap
    event SwapExecuted(
        address indexed user,
        address indexed tokenIn,
        address indexed tokenOut,
        uint256 amountIn,
        uint256 amountOut,
        address adapter
    );

    /// @notice Emitted when an adapter is added to the registry
    /// @param adapter Adapter address
    /// @param name Adapter name
    event AdapterAdded(address indexed adapter, string name);

    /// @notice Emitted when an adapter is removed from the registry
    /// @param adapter Adapter address
    event AdapterRemoved(address indexed adapter);

    // =============================================================
    //                         YIELD EVENTS
    // =============================================================

    /// @notice Emitted when assets are deposited for yield
    /// @param user User address
    /// @param asset Asset deposited
    /// @param amount Amount deposited
    /// @param shares Shares received
    event YieldDeposited(
        address indexed user,
        address indexed asset,
        uint256 amount,
        uint256 shares
    );

    /// @notice Emitted when assets are withdrawn from yield
    /// @param user User address
    /// @param asset Asset withdrawn
    /// @param amount Amount received
    /// @param shares Shares burned
    event YieldWithdrawn(
        address indexed user,
        address indexed asset,
        uint256 amount,
        uint256 shares
    );

    /// @notice Emitted when rewards are claimed
    /// @param user User address
    /// @param rewardToken Reward token address
    /// @param amount Amount claimed
    event RewardsClaimed(
        address indexed user,
        address indexed rewardToken,
        uint256 amount
    );

    /// @notice Emitted when staking is initiated
    /// @param user User address
    /// @param asset Asset staked (address(0) for native)
    /// @param amount Amount staked
    /// @param shares Shares received
    event Staked(
        address indexed user,
        address indexed asset,
        uint256 amount,
        uint256 shares
    );

    /// @notice Emitted when unstake is requested
    /// @param user User address
    /// @param stakingToken Staking token being unstaked
    /// @param shares Shares to unstake
    /// @param requestId Unstake request ID
    event UnstakeRequested(
        address indexed user,
        address indexed stakingToken,
        uint256 shares,
        uint256 indexed requestId
    );

    /// @notice Emitted when unstake is completed
    /// @param user User address
    /// @param asset Asset received (address(0) for native)
    /// @param amount Amount received
    /// @param requestId Unstake request ID
    event UnstakeCompleted(
        address indexed user,
        address indexed asset,
        uint256 amount,
        uint256 indexed requestId
    );

    // =============================================================
    //                       PERPETUAL EVENTS
    // =============================================================

    /// @notice Emitted when a perpetual position is opened
    /// @param user User address
    /// @param positionId Position identifier
    /// @param market Market identifier
    /// @param side LONG or SHORT
    /// @param size Position size
    /// @param collateral Collateral amount
    /// @param leverage Leverage used
    /// @param entryPrice Entry price
    event PositionOpened(
        address indexed user,
        bytes32 indexed positionId,
        bytes32 indexed market,
        PraxisStructs.PositionSide side,
        uint256 size,
        uint256 collateral,
        uint256 leverage,
        uint256 entryPrice
    );

    /// @notice Emitted when a perpetual position is closed
    /// @param user User address
    /// @param positionId Position identifier
    /// @param exitPrice Exit price
    /// @param realizedPnl Realized profit/loss
    /// @param collateralReturned Collateral returned to user
    event PositionClosed(
        address indexed user,
        bytes32 indexed positionId,
        uint256 exitPrice,
        int256 realizedPnl,
        uint256 collateralReturned
    );

    /// @notice Emitted when margin is added to a position
    /// @param positionId Position identifier
    /// @param amountAdded Amount of margin added
    /// @param newCollateral New total collateral
    event MarginAdded(
        bytes32 indexed positionId,
        uint256 amountAdded,
        uint256 newCollateral
    );

    /// @notice Emitted when margin is removed from a position
    /// @param positionId Position identifier
    /// @param amountRemoved Amount of margin removed
    /// @param newCollateral New total collateral
    event MarginRemoved(
        bytes32 indexed positionId,
        uint256 amountRemoved,
        uint256 newCollateral
    );

    // =============================================================
    //                        FASSET EVENTS
    // =============================================================

    /// @notice Emitted when an FAsset is added to the registry
    /// @param fAsset FAsset address
    /// @param symbol FAsset symbol
    event FAssetAdded(address indexed fAsset, string symbol);

    /// @notice Emitted when an FAsset is removed from the registry
    /// @param fAsset FAsset address
    event FAssetRemoved(address indexed fAsset);

    // =============================================================
    //                       STRATEGY EVENTS
    // =============================================================

    /// @notice Emitted when a strategy is executed
    /// @param user User address
    /// @param strategyId Strategy execution ID
    /// @param actionsCount Number of actions executed
    /// @param tokenIn Initial input token
    /// @param amountIn Initial input amount
    /// @param tokenOut Final output token
    /// @param amountOut Final output amount
    event StrategyExecuted(
        address indexed user,
        bytes32 indexed strategyId,
        uint256 actionsCount,
        address tokenIn,
        uint256 amountIn,
        address tokenOut,
        uint256 amountOut
    );

    /// @notice Emitted when a preset strategy is executed
    /// @param user User address
    /// @param strategyId Strategy execution ID
    /// @param presetId Preset strategy identifier
    event PresetStrategyExecuted(
        address indexed user,
        bytes32 indexed strategyId,
        bytes32 indexed presetId
    );

    // =============================================================
    //                          FDC EVENTS
    // =============================================================

    /// @notice Emitted when an EVM transaction proof is verified
    /// @param transactionHash Hash of the verified transaction
    /// @param sourceId Source chain ID
    /// @param votingRound FDC voting round
    event EVMTransactionVerified(
        bytes32 indexed transactionHash,
        bytes32 indexed sourceId,
        uint64 votingRound
    );

    /// @notice Emitted when a payment proof is verified
    /// @param transactionId Payment transaction ID
    /// @param sourceId Source chain ID
    event PaymentVerified(
        bytes32 indexed transactionId,
        bytes32 indexed sourceId
    );

    // =============================================================
    //                    ADMINISTRATIVE EVENTS
    // =============================================================

    /// @notice Emitted when the contract is paused
    event ProtocolPaused(address indexed by);

    /// @notice Emitted when the contract is unpaused
    event ProtocolUnpaused(address indexed by);

    /// @notice Emitted when ownership is transferred
    /// @param previousOwner Previous owner address
    /// @param newOwner New owner address
    event OwnershipTransferred(
        address indexed previousOwner,
        address indexed newOwner
    );

    // =============================================================
    //                  PHASE 6: EXECUTION RIGHTS EVENTS
    // =============================================================

    /// @notice Emitted when an executor's tier is upgraded
    /// @param executor Executor address
    /// @param oldTier Previous tier
    /// @param newTier New tier
    event TierUpgrade(
        address indexed executor,
        PraxisStructs.ExecutorTier oldTier,
        PraxisStructs.ExecutorTier newTier
    );

    /// @notice Emitted when an executor's tier is downgraded
    /// @param executor Executor address
    /// @param oldTier Previous tier
    /// @param newTier New tier
    event TierDowngrade(
        address indexed executor,
        PraxisStructs.ExecutorTier oldTier,
        PraxisStructs.ExecutorTier newTier
    );

    /// @notice Emitted when an executor's reputation is updated
    /// @param executor Executor address
    /// @param settlements Total settlements
    /// @param totalPnl Lifetime PnL
    event ReputationUpdated(
        address indexed executor,
        uint256 settlements,
        int256 totalPnl
    );

    /// @notice Emitted when an executor is banned
    /// @param executor Executor address
    /// @param reason Reason for ban
    event ExecutorBanned(address indexed executor, string reason);

    /// @notice Emitted when an executor is whitelisted
    /// @param executor Executor address
    event ExecutorWhitelisted(address indexed executor);

    // =============================================================
    //                     VAULT EVENTS
    // =============================================================

    /// @notice Emitted when capital is allocated to an ERT
    /// @param ertId ERT identifier
    /// @param amount Amount allocated
    /// @param totalAllocated New total allocated
    event CapitalAllocated(
        uint256 indexed ertId,
        uint256 amount,
        uint256 totalAllocated
    );

    /// @notice Emitted when capital is returned from an ERT
    /// @param ertId ERT identifier
    /// @param amount Amount returned
    /// @param pnl Profit or loss
    event CapitalReturned(
        uint256 indexed ertId,
        uint256 amount,
        int256 pnl
    );

    /// @notice Emitted when an action is executed through the vault
    /// @param ertId ERT identifier
    /// @param actionType Type of action
    /// @param adapter Adapter used
    event ActionExecuted(
        uint256 indexed ertId,
        PraxisStructs.ActionType actionType,
        address indexed adapter
    );

    // =============================================================
    //                  EXECUTION RIGHTS NFT EVENTS
    // =============================================================

    /// @notice Emitted when execution rights are minted
    /// @param ertId ERT identifier
    /// @param executor Executor address
    /// @param vault Vault address
    /// @param capitalLimit Maximum capital
    /// @param expiryTime Expiry timestamp
    /// @param stakedAmount Amount staked
    event RightsMinted(
        uint256 indexed ertId,
        address indexed executor,
        address indexed vault,
        uint256 capitalLimit,
        uint256 expiryTime,
        uint256 stakedAmount
    );

    /// @notice Emitted when execution rights are settled
    /// @param ertId ERT identifier
    /// @param totalPnl Final PnL
    /// @param capitalReturned Capital returned to vault
    event RightsSettled(
        uint256 indexed ertId,
        int256 totalPnl,
        uint256 capitalReturned
    );

    /// @notice Emitted when execution rights expire
    /// @param ertId ERT identifier
    /// @param expiryTime When it expired
    event RightsExpired(uint256 indexed ertId, uint256 expiryTime);

    // =============================================================
    //                  SAFETY SYSTEM EVENTS
    // =============================================================

    /// @notice Emitted when circuit breaker is triggered
    /// @param dailyLoss Daily loss amount
    /// @param lossBps Loss in basis points
    event CircuitBreakerTriggered(uint256 dailyLoss, uint256 lossBps);

    /// @notice Emitted when circuit breaker is reset
    /// @param resetBy Address that triggered reset
    event CircuitBreakerReset(address indexed resetBy);

    /// @notice Emitted when asset exposure is added
    /// @param asset Asset address
    /// @param amount Amount added
    /// @param totalExposure New total exposure
    event ExposureAdded(
        address indexed asset,
        uint256 amount,
        uint256 totalExposure
    );

    /// @notice Emitted when asset exposure is removed
    /// @param asset Asset address
    /// @param amount Amount removed
    /// @param totalExposure New total exposure
    event ExposureRemoved(
        address indexed asset,
        uint256 amount,
        uint256 totalExposure
    );

    /// @notice Emitted when insurance is collected from profit
    /// @param amount Amount collected
    /// @param fundBalance New fund balance
    event InsuranceCollected(uint256 amount, uint256 fundBalance);

    /// @notice Emitted when insurance covers a loss
    /// @param lossAmount Total loss amount
    /// @param coveredAmount Amount covered by insurance
    /// @param fundBalance Remaining fund balance
    event LossCovered(
        uint256 lossAmount,
        uint256 coveredAmount,
        uint256 fundBalance
    );

    // =============================================================
    //                  SETTLEMENT EVENTS
    // =============================================================

    /// @notice Emitted when an ERT is settled
    /// @param ertId ERT identifier
    /// @param totalPnl Total profit or loss
    /// @param lpEarnings LP's total earnings (base fee + profit share)
    /// @param executorEarnings Executor's earnings
    /// @param insuranceFee Insurance fund contribution
    event Settled(
        uint256 indexed ertId,
        int256 totalPnl,
        uint256 lpEarnings,
        uint256 executorEarnings,
        uint256 insuranceFee
    );

    /// @notice Emitted when an ERT is force settled
    /// @param ertId ERT identifier
    /// @param reason Reason for force settlement
    event ForceSettled(uint256 indexed ertId, string reason);

    // =============================================================
    //                  POSITION TRACKING EVENTS
    // =============================================================

    /// @notice Emitted when a position is recorded
    /// @param ertId ERT identifier
    /// @param positionId Position identifier
    /// @param asset Asset address
    /// @param size Position size
    /// @param entryValueUsd Entry value in USD
    event PositionRecorded(
        uint256 indexed ertId,
        bytes32 indexed positionId,
        address indexed asset,
        uint256 size,
        uint256 entryValueUsd
    );

    /// @notice Emitted when a position is closed
    /// @param ertId ERT identifier
    /// @param positionId Position identifier
    /// @param realizedPnl Realized PnL
    event PositionClosed(
        uint256 indexed ertId,
        bytes32 indexed positionId,
        int256 realizedPnl
    );
}
