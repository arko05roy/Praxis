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
}
