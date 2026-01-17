// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

import {PraxisStructs} from "../lib/PraxisStructs.sol";

/**
 * @title IPositionManager
 * @notice Interface for the PRAXIS Position Manager
 * @dev Tracks all open positions per ERT and calculates unrealized PnL
 */
interface IPositionManager {
    /**
     * @notice Get all positions for an ERT
     * @param ertId The ERT ID
     * @return positions Array of tracked positions
     */
    function getPositions(uint256 ertId) external view returns (PraxisStructs.TrackedPosition[] memory positions);

    /**
     * @notice Get position count for an ERT
     * @param ertId The ERT ID
     * @return count Number of positions
     */
    function getPositionCount(uint256 ertId) external view returns (uint256 count);

    /**
     * @notice Get a specific position by ID
     * @param positionId The position ID
     * @return position The tracked position
     */
    function getPosition(bytes32 positionId) external view returns (PraxisStructs.TrackedPosition memory position);

    /**
     * @notice Get total entry value for an ERT
     * @param ertId The ERT ID
     * @return totalValue Sum of all position entry values
     */
    function getTotalEntryValue(uint256 ertId) external view returns (uint256 totalValue);

    /**
     * @notice Calculate unrealized PnL for an ERT
     * @dev This is payable as it calls the oracle
     * @param ertId The ERT ID
     * @return pnl The unrealized PnL
     */
    function calculateUnrealizedPnl(uint256 ertId) external payable returns (int256 pnl);

    /**
     * @notice Calculate unrealized PnL with provided prices
     * @param ertId The ERT ID
     * @param tokens Array of token addresses
     * @param pricesInWei Array of prices in wei (18 decimals)
     * @return pnl The unrealized PnL
     */
    function calculateUnrealizedPnlWithPrices(
        uint256 ertId,
        address[] calldata tokens,
        uint256[] calldata pricesInWei
    ) external view returns (int256 pnl);

    /**
     * @notice Get exposure by asset for an ERT
     * @param ertId The ERT ID
     * @return tokens Array of tokens
     * @return exposures Array of exposure amounts
     */
    function getExposureByAsset(uint256 ertId) external view returns (address[] memory tokens, int256[] memory exposures);

    /**
     * @notice Check if an ERT has open positions
     * @param ertId The ERT ID
     * @return hasPositions Whether there are open positions
     */
    function hasOpenPositions(uint256 ertId) external view returns (bool hasPositions);

    /**
     * @notice Record a new position (called by controller)
     * @param ertId The ERT ID
     * @param adapter The adapter address
     * @param tokenIn Input token
     * @param tokenOut Output token
     * @param amountIn Amount input
     * @param amountOut Amount output
     * @param priceInWei Entry price
     * @param extraData Extra position data
     * @return positionId The created position ID
     */
    function recordPosition(
        uint256 ertId,
        address adapter,
        address tokenIn,
        address tokenOut,
        uint256 amountIn,
        uint256 amountOut,
        uint256 priceInWei,
        bytes calldata extraData
    ) external returns (bytes32 positionId);

    /**
     * @notice Close a position
     * @param positionId The position ID
     * @param realizedPnl The realized PnL
     */
    function closePosition(bytes32 positionId, int256 realizedPnl) external;

    /**
     * @notice Close all positions for an ERT
     * @param ertId The ERT ID
     */
    function closeAllPositions(uint256 ertId) external;

    /**
     * @notice Set the execution controller address
     * @param controller The controller address
     */
    function setExecutionController(address controller) external;
}
