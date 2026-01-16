// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

/**
 * @title PraxisStructs
 * @notice Shared data structures for the PRAXIS protocol
 */
library PraxisStructs {
    /**
     * @notice Risk levels for yield strategies
     */
    enum RiskLevel {
        CONSERVATIVE, // Simple lending/staking
        MODERATE,     // LP positions with stable pairs
        AGGRESSIVE    // Volatile LP and leveraged positions
    }

    /**
     * @notice Types of actions that can be executed
     */
    enum ActionType {
        SWAP,           // Token swap on DEX
        SUPPLY,         // Supply to lending protocol
        WITHDRAW,       // Withdraw from lending protocol
        BORROW,         // Borrow from lending protocol
        REPAY,          // Repay borrowed amount
        STAKE,          // Stake tokens
        UNSTAKE,        // Unstake tokens
        OPEN_POSITION,  // Open perpetual position
        CLOSE_POSITION, // Close perpetual position
        ADD_MARGIN,     // Add margin to perp position
        REMOVE_MARGIN   // Remove margin from perp position
    }

    /**
     * @notice Position side for perpetuals
     */
    enum PositionSide {
        LONG,
        SHORT
    }

    /**
     * @notice A single action in a strategy
     * @param actionType Type of action to execute
     * @param adapter Address of the adapter to use
     * @param tokenIn Input token address
     * @param tokenOut Output token address (or receipt token)
     * @param amountIn Amount of input token (0 = use all from previous step)
     * @param minAmountOut Minimum acceptable output amount
     * @param extraData Additional data for the adapter
     */
    struct Action {
        ActionType actionType;
        address adapter;
        address tokenIn;
        address tokenOut;
        uint256 amountIn;
        uint256 minAmountOut;
        bytes extraData;
    }

    /**
     * @notice Quote from a DEX adapter
     * @param adapter Address of the adapter
     * @param name Name of the DEX
     * @param amountOut Expected output amount
     * @param gasEstimate Estimated gas cost
     * @param priceImpact Price impact in basis points
     */
    struct Quote {
        address adapter;
        string name;
        uint256 amountOut;
        uint256 gasEstimate;
        uint256 priceImpact;
    }

    /**
     * @notice Yield option from a protocol
     * @param adapter Address of the adapter
     * @param name Protocol name
     * @param apy Annual percentage yield in basis points
     * @param risk Risk level of the option
     * @param tvl Total value locked
     * @param requiresLock Whether tokens are locked
     * @param lockPeriod Lock period in seconds (0 if no lock)
     */
    struct YieldOption {
        address adapter;
        string name;
        uint256 apy;
        RiskLevel risk;
        uint256 tvl;
        bool requiresLock;
        uint256 lockPeriod;
    }

    /**
     * @notice User position in a yield protocol
     * @param adapter Adapter address
     * @param asset Underlying asset
     * @param shares Shares/receipt tokens held
     * @param underlyingBalance Current underlying balance
     * @param earnedRewards Unclaimed rewards
     */
    struct Position {
        address adapter;
        address asset;
        uint256 shares;
        uint256 underlyingBalance;
        uint256 earnedRewards;
    }

    /**
     * @notice FAsset information
     * @param fAssetAddress Address of the FAsset token
     * @param symbol FAsset symbol (e.g., "FXRP")
     * @param underlying Underlying asset name (e.g., "XRP")
     * @param totalMinted Total FAssets minted
     * @param collateralRatio Collateral ratio in percentage
     */
    struct FAssetInfo {
        address fAssetAddress;
        string symbol;
        string underlying;
        uint256 totalMinted;
        uint256 collateralRatio;
    }

    /**
     * @notice Perpetual position
     * @param positionId Unique position identifier
     * @param market Market identifier
     * @param user Position owner
     * @param side LONG or SHORT
     * @param size Position size in base asset
     * @param collateral Collateral amount
     * @param leverage Leverage multiplier
     * @param entryPrice Entry price
     * @param liquidationPrice Liquidation price
     * @param unrealizedPnl Unrealized profit/loss
     * @param fundingAccrued Accumulated funding payments
     */
    struct PerpPosition {
        bytes32 positionId;
        bytes32 market;
        address user;
        PositionSide side;
        uint256 size;
        uint256 collateral;
        uint256 leverage;
        uint256 entryPrice;
        uint256 liquidationPrice;
        int256 unrealizedPnl;
        int256 fundingAccrued;
    }

    /**
     * @notice Perpetual market info
     * @param marketId Market identifier
     * @param name Market name (e.g., "BTC/USD")
     * @param maxLeverage Maximum allowed leverage
     * @param openInterest Total open interest
     * @param fundingRate Current funding rate in basis points per hour
     * @param indexPrice Current index price from oracle
     */
    struct PerpMarket {
        bytes32 marketId;
        string name;
        uint256 maxLeverage;
        uint256 openInterest;
        int256 fundingRate;
        uint256 indexPrice;
    }

    /**
     * @notice Parameters for a swap
     * @param tokenIn Input token
     * @param tokenOut Output token
     * @param amountIn Amount to swap
     * @param minAmountOut Minimum output
     * @param recipient Address to receive output
     * @param deadline Transaction deadline
     */
    struct SwapParams {
        address tokenIn;
        address tokenOut;
        uint256 amountIn;
        uint256 minAmountOut;
        address recipient;
        uint256 deadline;
    }

    /**
     * @notice A single hop in a multi-hop swap route
     * @param tokenIn Input token for this hop
     * @param tokenOut Output token for this hop
     * @param adapter Adapter to use for this hop
     * @param poolFee Fee tier (for V3-style DEXs)
     */
    struct Hop {
        address tokenIn;
        address tokenOut;
        address adapter;
        uint24 poolFee;
    }

    /**
     * @notice Complete swap route
     * @param hops Array of hops in the route
     * @param totalGasEstimate Total estimated gas
     * @param expectedOutput Expected final output
     */
    struct Route {
        Hop[] hops;
        uint256 totalGasEstimate;
        uint256 expectedOutput;
    }

    // =============================================================
    //                  PHASE 6: EXECUTION RIGHTS SYSTEM
    // =============================================================

    /**
     * @notice Executor reputation tier
     * @dev Tier determines capital limits, stake requirements, and allowed strategies
     */
    enum ExecutorTier {
        UNVERIFIED,  // Tier 0 - New wallet, max $100, 50% stake
        NOVICE,      // Tier 1 - Some history, max $1k, 25% stake
        VERIFIED,    // Tier 2 - Proven track record, max $10k, 15% stake
        ESTABLISHED, // Tier 3 - Consistent performer, max $100k, 10% stake
        ELITE        // Tier 4 - Top performer / whitelisted, max $500k, 5% stake
    }

    /**
     * @notice Execution Rights Token status
     */
    enum ERTStatus {
        PENDING,     // Not yet activated
        ACTIVE,      // Currently active
        SETTLED,     // Settled and finalized
        EXPIRED,     // Expired without settlement
        LIQUIDATED   // Force settled due to constraints violation
    }

    /**
     * @notice Configuration for each reputation tier
     * @param maxCapital Maximum capital in USD (6 decimals)
     * @param stakeRequiredBps Stake as percentage of capital (5000 = 50%)
     * @param maxDrawdownBps Maximum allowed loss (1500 = 15%)
     * @param allowedRiskLevel 0=Conservative, 1=Moderate, 2=Aggressive
     * @param settlementsRequired Number of settlements needed to reach this tier
     * @param profitRateBps Required profitable percentage (6500 = 65%)
     * @param volumeRequired Total volume in USD required
     */
    struct TierConfig {
        uint256 maxCapital;
        uint16 stakeRequiredBps;
        uint16 maxDrawdownBps;
        uint8 allowedRiskLevel;
        uint256 settlementsRequired;
        uint16 profitRateBps;
        uint256 volumeRequired;
    }

    /**
     * @notice Executor's reputation record
     * @param tier Current reputation tier
     * @param totalSettlements Total ERTs settled
     * @param profitableSettlements ERTs that made profit
     * @param totalVolumeUsd Cumulative capital used
     * @param totalPnlUsd Lifetime PnL
     * @param largestLossBps Worst single loss (for risk assessment)
     * @param consecutiveProfits Current profit streak
     * @param consecutiveLosses Current loss streak
     * @param lastSettlementTime Timestamp of last settlement
     * @param isWhitelisted DAO/admin approved for Elite tier
     * @param isBanned Banned for malicious behavior
     */
    struct ExecutorReputation {
        ExecutorTier tier;
        uint256 totalSettlements;
        uint256 profitableSettlements;
        uint256 totalVolumeUsd;
        int256 totalPnlUsd;
        uint256 largestLossBps;
        uint256 consecutiveProfits;
        uint256 consecutiveLosses;
        uint256 lastSettlementTime;
        bool isWhitelisted;
        bool isBanned;
    }

    /**
     * @notice Risk constraints enforced by ExecutionController
     * @param maxLeverage Maximum leverage multiplier (e.g., 5 = 5x)
     * @param maxDrawdownBps Maximum drawdown in bps (1000 = 10%)
     * @param maxPositionSizeBps Maximum single position as % of capital
     * @param allowedAdapters Whitelist of protocol adapter addresses
     * @param allowedAssets Whitelist of tradeable asset addresses
     */
    struct RiskConstraints {
        uint8 maxLeverage;
        uint16 maxDrawdownBps;
        uint16 maxPositionSizeBps;
        address[] allowedAdapters;
        address[] allowedAssets;
    }

    /**
     * @notice Fee structure for LP/Executor split
     * @param baseFeeAprBps Annual base fee to LP (200 = 2%)
     * @param profitShareBps LP's share of profits (2000 = 20%)
     * @param stakedAmount Executor's staked collateral for losses
     */
    struct FeeStructure {
        uint16 baseFeeAprBps;
        uint16 profitShareBps;
        uint256 stakedAmount;
    }

    /**
     * @notice Current execution status tracking
     * @param capitalDeployed Currently deployed capital
     * @param realizedPnl Closed position PnL
     * @param unrealizedPnl Open position PnL (mark-to-market)
     * @param highWaterMark Peak value for performance fee calculation
     * @param maxDrawdownHit Maximum drawdown experienced during ERT lifetime
     */
    struct ExecutionStatus {
        uint256 capitalDeployed;
        int256 realizedPnl;
        int256 unrealizedPnl;
        uint256 highWaterMark;
        uint256 maxDrawdownHit;
    }

    /**
     * @notice Execution Rights parameters embedded in ERT NFT
     * @param tokenId ERT NFT ID
     * @param executor Who holds the rights
     * @param vault Source vault address
     * @param capitalLimit Maximum capital that can be deployed
     * @param startTime When rights become active
     * @param expiryTime When rights expire
     * @param constraints Risk constraints to enforce
     * @param fees Fee structure parameters
     * @param status Current execution status
     * @param ertStatus Current ERT lifecycle status
     */
    struct ExecutionRights {
        uint256 tokenId;
        address executor;
        address vault;
        uint256 capitalLimit;
        uint256 startTime;
        uint256 expiryTime;
        RiskConstraints constraints;
        FeeStructure fees;
        ExecutionStatus status;
        ERTStatus ertStatus;
    }

    /**
     * @notice Tracked position within an ERT
     * @param ertId The ERT that owns this position
     * @param adapter Protocol adapter used
     * @param positionId Internal or external position ID
     * @param asset Asset involved in the position
     * @param size Position size
     * @param entryValueUsd USD value at entry (via FTSO)
     * @param timestamp When position was opened
     * @param positionType Type of position (SWAP, SUPPLY, STAKE, etc.)
     */
    struct TrackedPosition {
        uint256 ertId;
        address adapter;
        bytes32 positionId;
        address asset;
        uint256 size;
        uint256 entryValueUsd;
        uint256 timestamp;
        ActionType positionType;
    }

    /**
     * @notice Settlement result for an ERT
     * @param ertId ERT that was settled
     * @param totalPnl Total profit or loss
     * @param lpBaseFee Base fee paid to LP
     * @param lpProfitShare LP's share of profits
     * @param insuranceFee Fee collected for insurance fund
     * @param executorProfit Executor's remaining profit
     * @param capitalReturned Capital returned to vault
     * @param stakeReturned Stake returned to executor
     * @param stakeSlashed Stake slashed to cover losses
     */
    struct SettlementResult {
        uint256 ertId;
        int256 totalPnl;
        uint256 lpBaseFee;
        uint256 lpProfitShare;
        uint256 insuranceFee;
        uint256 executorProfit;
        uint256 capitalReturned;
        uint256 stakeReturned;
        uint256 stakeSlashed;
    }

    /**
     * @notice Vault information for LPs
     * @param totalAssets Total assets in the vault
     * @param totalShares Total shares issued
     * @param totalAllocated Capital allocated to active ERTs
     * @param availableCapital Capital available for new ERTs
     * @param utilizationBps Current utilization rate in bps
     * @param insuranceFundBalance Insurance fund balance
     */
    struct VaultInfo {
        uint256 totalAssets;
        uint256 totalShares;
        uint256 totalAllocated;
        uint256 availableCapital;
        uint256 utilizationBps;
        uint256 insuranceFundBalance;
    }
}
