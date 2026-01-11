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
}
