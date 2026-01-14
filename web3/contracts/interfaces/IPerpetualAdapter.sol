// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

import {PraxisStructs} from "../lib/PraxisStructs.sol";

/**
 * @title IPerpetualAdapter
 * @notice Base interface for all perpetual trading adapters in the PRAXIS protocol
 * @dev All perpetual adapters must implement this interface to enable leveraged trading
 *      through Execution Rights Tokens (ERTs)
 */
interface IPerpetualAdapter {
    // =============================================================
    //                         VIEW FUNCTIONS
    // =============================================================

    /**
     * @notice Returns the name of the perpetual protocol this adapter connects to
     * @return Human-readable name (e.g., "SparkDEX Eternal")
     */
    function name() external view returns (string memory);

    /**
     * @notice Returns the address of the underlying perpetual protocol contract
     * @return Address of the main perpetual protocol contract
     */
    function protocol() external view returns (address);

    /**
     * @notice Returns the collateral token used by this perpetual protocol
     * @return Address of the collateral token (e.g., USDC)
     */
    function collateralToken() external view returns (address);

    /**
     * @notice Check if a market is supported by this adapter
     * @param market Market identifier (bytes32)
     * @return True if the market is supported and active
     */
    function isMarketSupported(bytes32 market) external view returns (bool);

    /**
     * @notice Get market information
     * @param market Market identifier
     * @return info Market details including max leverage, funding rate, etc.
     */
    function getMarketInfo(
        bytes32 market
    ) external view returns (PraxisStructs.PerpMarket memory info);

    /**
     * @notice Get the current funding rate for a market
     * @param market Market identifier
     * @return fundingRate Funding rate in basis points per hour (can be negative)
     *         Positive = longs pay shorts, Negative = shorts pay longs
     */
    function getFundingRate(bytes32 market) external view returns (int256 fundingRate);

    /**
     * @notice Get the current index price for a market
     * @param market Market identifier
     * @return indexPrice Current price from oracle (scaled by market decimals)
     */
    function getIndexPrice(bytes32 market) external view returns (uint256 indexPrice);

    /**
     * @notice Get all available markets from this adapter
     * @return markets Array of market identifiers
     */
    function getAvailableMarkets() external view returns (bytes32[] memory markets);

    // =============================================================
    //                      POSITION QUERIES
    // =============================================================

    /**
     * @notice Get a specific position by ID
     * @param positionId Unique position identifier
     * @return position Full position details
     */
    function getPosition(
        bytes32 positionId
    ) external view returns (PraxisStructs.PerpPosition memory position);

    /**
     * @notice Get all positions for a user in a specific market
     * @param user User address
     * @param market Market identifier
     * @return positions Array of positions
     */
    function getUserPositions(
        address user,
        bytes32 market
    ) external view returns (PraxisStructs.PerpPosition[] memory positions);

    /**
     * @notice Get the liquidation price for a position
     * @param positionId Position identifier
     * @return liquidationPrice Price at which position becomes liquidatable
     */
    function getLiquidationPrice(
        bytes32 positionId
    ) external view returns (uint256 liquidationPrice);

    /**
     * @notice Calculate the health factor of a position
     * @param positionId Position identifier
     * @return healthFactor Health factor scaled by 1e18 (>1e18 = healthy, <1e18 = liquidatable)
     */
    function getPositionHealthFactor(
        bytes32 positionId
    ) external view returns (uint256 healthFactor);

    /**
     * @notice Calculate the unrealized PnL for a position
     * @param positionId Position identifier
     * @return pnl Unrealized profit/loss in collateral token decimals
     */
    function getUnrealizedPnl(bytes32 positionId) external view returns (int256 pnl);

    /**
     * @notice Get the minimum margin required for a position
     * @param positionId Position identifier
     * @return minMargin Minimum collateral required to avoid liquidation
     */
    function getMinimumMargin(bytes32 positionId) external view returns (uint256 minMargin);

    // =============================================================
    //                    POSITION MANAGEMENT
    // =============================================================

    /**
     * @notice Open a new perpetual position
     * @param market Market identifier (e.g., keccak256("BTC/USD"))
     * @param collateral Amount of collateral to deposit
     * @param size Position size in base asset units
     * @param leverage Leverage multiplier (e.g., 5 = 5x leverage)
     * @param isLong True for long position, false for short
     * @param onBehalfOf Address that will own the position
     * @return positionId Unique identifier for the new position
     *
     * @dev Validates leverage against market max and ERT constraints
     *      Collateral is pulled from msg.sender
     *      Emits PositionOpened event
     */
    function openPosition(
        bytes32 market,
        uint256 collateral,
        uint256 size,
        uint256 leverage,
        bool isLong,
        address onBehalfOf
    ) external returns (bytes32 positionId);

    /**
     * @notice Close an existing position
     * @param positionId Position identifier
     * @param to Address to receive collateral and PnL
     * @return pnl Realized profit/loss (positive = profit, negative = loss)
     *
     * @dev Only position owner or authorized caller can close
     *      Emits PositionClosed event
     */
    function closePosition(
        bytes32 positionId,
        address to
    ) external returns (int256 pnl);

    /**
     * @notice Partially close a position
     * @param positionId Position identifier
     * @param sizeToClose Amount of position size to close
     * @param to Address to receive collateral and PnL
     * @return pnl Realized profit/loss for the closed portion
     *
     * @dev Must maintain minimum position size and margin requirements
     */
    function partialClose(
        bytes32 positionId,
        uint256 sizeToClose,
        address to
    ) external returns (int256 pnl);

    // =============================================================
    //                     MARGIN MANAGEMENT
    // =============================================================

    /**
     * @notice Add margin to an existing position
     * @param positionId Position identifier
     * @param amount Amount of collateral to add
     *
     * @dev Collateral is pulled from msg.sender
     *      Emits MarginAdded event
     */
    function addMargin(bytes32 positionId, uint256 amount) external;

    /**
     * @notice Remove margin from an existing position
     * @param positionId Position identifier
     * @param amount Amount of collateral to remove
     * @param to Address to receive removed collateral
     *
     * @dev Reverts if removal would cause liquidation
     *      Emits MarginRemoved event
     */
    function removeMargin(bytes32 positionId, uint256 amount, address to) external;

    // =============================================================
    //                         ESTIMATES
    // =============================================================

    /**
     * @notice Estimate the entry price for a position
     * @param market Market identifier
     * @param size Position size
     * @param isLong Position direction
     * @return entryPrice Estimated entry price after slippage
     * @return priceImpact Estimated price impact in basis points
     */
    function estimateEntryPrice(
        bytes32 market,
        uint256 size,
        bool isLong
    ) external view returns (uint256 entryPrice, uint256 priceImpact);

    /**
     * @notice Estimate the exit price for closing a position
     * @param positionId Position identifier
     * @return exitPrice Estimated exit price after slippage
     * @return priceImpact Estimated price impact in basis points
     */
    function estimateExitPrice(
        bytes32 positionId
    ) external view returns (uint256 exitPrice, uint256 priceImpact);

    /**
     * @notice Calculate liquidation price for given parameters
     * @param market Market identifier
     * @param collateral Collateral amount
     * @param size Position size
     * @param leverage Leverage multiplier
     * @param isLong Position direction
     * @param entryPrice Entry price
     * @return liquidationPrice Calculated liquidation price
     */
    function calculateLiquidationPrice(
        bytes32 market,
        uint256 collateral,
        uint256 size,
        uint256 leverage,
        bool isLong,
        uint256 entryPrice
    ) external view returns (uint256 liquidationPrice);
}
