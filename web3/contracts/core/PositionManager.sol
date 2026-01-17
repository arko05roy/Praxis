// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

import {Ownable} from "@openzeppelin/contracts/access/Ownable.sol";
import {PraxisStructs} from "../lib/PraxisStructs.sol";
import {PraxisErrors} from "../lib/PraxisErrors.sol";
import {PraxisEvents} from "../lib/PraxisEvents.sol";

interface IFlareOracle {
    function getTokenPriceUSD(address token) external payable returns (uint256 priceInWei, uint64 timestamp);
    function hasFeed(address token) external view returns (bool);
}

/**
 * @title PositionManager
 * @notice Tracks all open positions for each Execution Rights Token (ERT)
 * @dev Used for PnL calculation and drawdown monitoring
 */
contract PositionManager is Ownable {
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

    /// @notice Mapping from ERT ID to array of tracked positions
    mapping(uint256 => PraxisStructs.TrackedPosition[]) public ertPositions;

    /// @notice Mapping from position ID to ERT ID for reverse lookup
    mapping(bytes32 => uint256) public positionToErt;

    /// @notice Mapping from position ID to array index for efficient lookup
    mapping(bytes32 => uint256) public positionIndex;

    /// @notice Mapping to track if a position exists
    mapping(bytes32 => bool) public positionExists;

    /// @notice Reference to the execution controller
    address public executionController;

    /// @notice Reference to the settlement engine (can close positions during settlement)
    address public settlementEngine;

    /// @notice Reference to the Flare oracle
    address public flareOracle;

    /// @notice Counter for generating position IDs
    uint256 private _positionNonce;

    // =============================================================
    //                          MODIFIERS
    // =============================================================

    modifier onlyController() {
        if (msg.sender != executionController && msg.sender != settlementEngine) {
            revert PraxisErrors.OnlyController();
        }
        _;
    }

    // =============================================================
    //                         CONSTRUCTOR
    // =============================================================

    /**
     * @notice Initialize the PositionManager
     * @param _flareOracle Address of the Flare oracle
     */
    constructor(address _flareOracle) Ownable(msg.sender) {
        if (_flareOracle == address(0)) revert PraxisErrors.ZeroAddress();
        flareOracle = _flareOracle;
    }

    // =============================================================
    //                      CORE FUNCTIONS
    // =============================================================

    /**
     * @notice Record a new position
     * @param ertId The ERT ID that owns this position
     * @param adapter The adapter used
     * @param asset The asset involved
     * @param size The position size
     * @param entryValueUsd The entry value in USD
     * @param positionType The type of position
     * @return positionId The generated position ID
     */
    function recordPosition(
        uint256 ertId,
        address adapter,
        address asset,
        uint256 size,
        uint256 entryValueUsd,
        PraxisStructs.ActionType positionType
    ) external onlyController returns (bytes32 positionId) {
        // Generate unique position ID
        positionId = keccak256(abi.encodePacked(ertId, adapter, asset, block.timestamp, _positionNonce++));

        PraxisStructs.TrackedPosition memory pos = PraxisStructs.TrackedPosition({
            ertId: ertId,
            adapter: adapter,
            positionId: positionId,
            asset: asset,
            size: size,
            entryValueUsd: entryValueUsd,
            timestamp: block.timestamp,
            positionType: positionType
        });

        // Store position
        uint256 index = ertPositions[ertId].length;
        ertPositions[ertId].push(pos);

        // Store reverse mappings
        positionToErt[positionId] = ertId;
        positionIndex[positionId] = index;
        positionExists[positionId] = true;

        emit PraxisEvents.PositionRecorded(ertId, positionId, asset, size, entryValueUsd);
    }

    /**
     * @notice Record a position with an external position ID (e.g., from perpetual adapter)
     * @param ertId The ERT ID that owns this position
     * @param externalPositionId The external position ID
     * @param adapter The adapter used
     * @param asset The asset involved
     * @param size The position size
     * @param entryValueUsd The entry value in USD
     * @param positionType The type of position
     */
    function recordPositionWithId(
        uint256 ertId,
        bytes32 externalPositionId,
        address adapter,
        address asset,
        uint256 size,
        uint256 entryValueUsd,
        PraxisStructs.ActionType positionType
    ) external onlyController {
        if (positionExists[externalPositionId]) {
            revert PraxisErrors.InvalidAdapter(); // Position already exists
        }

        PraxisStructs.TrackedPosition memory pos = PraxisStructs.TrackedPosition({
            ertId: ertId,
            adapter: adapter,
            positionId: externalPositionId,
            asset: asset,
            size: size,
            entryValueUsd: entryValueUsd,
            timestamp: block.timestamp,
            positionType: positionType
        });

        // Store position
        uint256 index = ertPositions[ertId].length;
        ertPositions[ertId].push(pos);

        // Store reverse mappings
        positionToErt[externalPositionId] = ertId;
        positionIndex[externalPositionId] = index;
        positionExists[externalPositionId] = true;

        emit PraxisEvents.PositionRecorded(ertId, externalPositionId, asset, size, entryValueUsd);
    }

    /**
     * @notice Update a position's size
     * @param positionId The position ID to update
     * @param newSize The new position size
     * @param newValueUsd The new USD value
     */
    function updatePosition(
        bytes32 positionId,
        uint256 newSize,
        uint256 newValueUsd
    ) external onlyController {
        if (!positionExists[positionId]) {
            revert PraxisErrors.PositionNotFound(positionId);
        }

        uint256 ertId = positionToErt[positionId];
        uint256 index = positionIndex[positionId];

        ertPositions[ertId][index].size = newSize;
        ertPositions[ertId][index].entryValueUsd = newValueUsd;
    }

    /**
     * @notice Close a position
     * @param positionId The position ID to close
     * @param realizedPnl The realized PnL from closing
     */
    function closePosition(bytes32 positionId, int256 realizedPnl) external onlyController {
        if (!positionExists[positionId]) {
            revert PraxisErrors.PositionNotFound(positionId);
        }

        uint256 ertId = positionToErt[positionId];
        uint256 index = positionIndex[positionId];
        uint256 lastIndex = ertPositions[ertId].length - 1;

        // If not the last element, swap with last
        if (index != lastIndex) {
            PraxisStructs.TrackedPosition memory lastPosition = ertPositions[ertId][lastIndex];
            ertPositions[ertId][index] = lastPosition;
            positionIndex[lastPosition.positionId] = index;
        }

        // Remove last element
        ertPositions[ertId].pop();

        // Clean up mappings
        delete positionToErt[positionId];
        delete positionIndex[positionId];
        delete positionExists[positionId];

        emit PraxisEvents.PositionClosed(ertId, positionId, realizedPnl);
    }

    /**
     * @notice Close all positions for an ERT
     * @param ertId The ERT ID
     */
    function closeAllPositions(uint256 ertId) external onlyController {
        PraxisStructs.TrackedPosition[] storage positions = ertPositions[ertId];

        // Clean up mappings for each position
        for (uint256 i = 0; i < positions.length; i++) {
            bytes32 posId = positions[i].positionId;
            delete positionToErt[posId];
            delete positionIndex[posId];
            delete positionExists[posId];
        }

        // Clear the array
        delete ertPositions[ertId];
    }

    // =============================================================
    //                      VIEW FUNCTIONS
    // =============================================================

    /**
     * @notice Get all positions for an ERT
     * @param ertId The ERT ID
     * @return Array of tracked positions
     */
    function getPositions(uint256 ertId) external view returns (PraxisStructs.TrackedPosition[] memory) {
        return ertPositions[ertId];
    }

    /**
     * @notice Get position count for an ERT
     * @param ertId The ERT ID
     * @return Number of open positions
     */
    function getPositionCount(uint256 ertId) external view returns (uint256) {
        return ertPositions[ertId].length;
    }

    /**
     * @notice Get a specific position
     * @param positionId The position ID
     * @return The tracked position
     */
    function getPosition(bytes32 positionId) external view returns (PraxisStructs.TrackedPosition memory) {
        if (!positionExists[positionId]) {
            revert PraxisErrors.PositionNotFound(positionId);
        }

        uint256 ertId = positionToErt[positionId];
        uint256 index = positionIndex[positionId];

        return ertPositions[ertId][index];
    }

    /**
     * @notice Calculate total entry value for an ERT
     * @param ertId The ERT ID
     * @return totalValue The sum of all position entry values
     */
    function getTotalEntryValue(uint256 ertId) external view returns (uint256 totalValue) {
        PraxisStructs.TrackedPosition[] memory positions = ertPositions[ertId];

        for (uint256 i = 0; i < positions.length; i++) {
            totalValue += positions[i].entryValueUsd;
        }
    }

    /**
     * @notice Calculate unrealized PnL for an ERT (requires oracle call)
     * @dev This is a payable function as it calls the oracle
     * @param ertId The ERT ID
     * @return pnl The unrealized PnL (can be negative)
     */
    function calculateUnrealizedPnl(uint256 ertId) external payable returns (int256 pnl) {
        PraxisStructs.TrackedPosition[] memory positions = ertPositions[ertId];
        IFlareOracle oracle = IFlareOracle(flareOracle);

        for (uint256 i = 0; i < positions.length; i++) {
            // Get current price from oracle
            if (oracle.hasFeed(positions[i].asset)) {
                (uint256 currentPriceWei,) = oracle.getTokenPriceUSD{value: msg.value / positions.length}(positions[i].asset);

                // Calculate current value: size * currentPrice / PRICE_PRECISION
                uint256 currentValue = (positions[i].size * currentPriceWei) / PRICE_PRECISION;

                // PnL = current value - entry value
                pnl += int256(currentValue) - int256(positions[i].entryValueUsd);
            }
        }
    }

    /**
     * @notice Calculate unrealized PnL using provided prices (for batch operations)
     * @param ertId The ERT ID
     * @param assets Array of asset addresses
     * @param prices Array of prices (18 decimals)
     * @return pnl The unrealized PnL
     */
    function calculateUnrealizedPnlWithPrices(
        uint256 ertId,
        address[] calldata assets,
        uint256[] calldata prices
    ) external view returns (int256 pnl) {
        if (assets.length != prices.length) {
            revert PraxisErrors.ArrayLengthMismatch(assets.length, prices.length);
        }

        PraxisStructs.TrackedPosition[] memory positions = ertPositions[ertId];

        for (uint256 i = 0; i < positions.length; i++) {
            // Find price for this asset
            for (uint256 j = 0; j < assets.length; j++) {
                if (assets[j] == positions[i].asset) {
                    uint256 currentValue = (positions[i].size * prices[j]) / PRICE_PRECISION;
                    pnl += int256(currentValue) - int256(positions[i].entryValueUsd);
                    break;
                }
            }
        }
    }

    /**
     * @notice Get total exposure per asset for an ERT
     * @param ertId The ERT ID
     * @return assets Array of asset addresses
     * @return exposures Array of exposure amounts
     */
    function getExposureByAsset(uint256 ertId)
        external
        view
        returns (address[] memory assets, uint256[] memory exposures)
    {
        PraxisStructs.TrackedPosition[] memory positions = ertPositions[ertId];

        // Count unique assets
        uint256 uniqueCount = 0;
        address[] memory tempAssets = new address[](positions.length);
        uint256[] memory tempExposures = new uint256[](positions.length);

        for (uint256 i = 0; i < positions.length; i++) {
            bool found = false;
            for (uint256 j = 0; j < uniqueCount; j++) {
                if (tempAssets[j] == positions[i].asset) {
                    tempExposures[j] += positions[i].entryValueUsd;
                    found = true;
                    break;
                }
            }
            if (!found) {
                tempAssets[uniqueCount] = positions[i].asset;
                tempExposures[uniqueCount] = positions[i].entryValueUsd;
                uniqueCount++;
            }
        }

        // Copy to correctly sized arrays
        assets = new address[](uniqueCount);
        exposures = new uint256[](uniqueCount);

        for (uint256 i = 0; i < uniqueCount; i++) {
            assets[i] = tempAssets[i];
            exposures[i] = tempExposures[i];
        }
    }

    /**
     * @notice Check if ERT has any open positions
     * @param ertId The ERT ID
     * @return Whether the ERT has positions
     */
    function hasOpenPositions(uint256 ertId) external view returns (bool) {
        return ertPositions[ertId].length > 0;
    }

    // =============================================================
    //                      ADMIN FUNCTIONS
    // =============================================================

    /**
     * @notice Set the execution controller address
     * @param _executionController The execution controller address
     */
    function setExecutionController(address _executionController) external onlyOwner {
        if (_executionController == address(0)) revert PraxisErrors.ZeroAddress();
        executionController = _executionController;
    }

    /**
     * @notice Set the settlement engine address
     * @param _settlementEngine The settlement engine address
     */
    function setSettlementEngine(address _settlementEngine) external onlyOwner {
        settlementEngine = _settlementEngine;
    }

    /**
     * @notice Set the Flare oracle address
     * @param _flareOracle The oracle address
     */
    function setFlareOracle(address _flareOracle) external onlyOwner {
        if (_flareOracle == address(0)) revert PraxisErrors.ZeroAddress();
        flareOracle = _flareOracle;
    }
}
