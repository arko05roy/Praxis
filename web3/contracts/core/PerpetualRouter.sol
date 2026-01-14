// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

import {IPerpetualAdapter} from "../interfaces/IPerpetualAdapter.sol";
import {IERC20} from "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import {SafeERC20} from "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import {Ownable} from "@openzeppelin/contracts/access/Ownable.sol";
import {ReentrancyGuard} from "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import {PraxisStructs} from "../lib/PraxisStructs.sol";
import {PraxisErrors} from "../lib/PraxisErrors.sol";
import {PraxisEvents} from "../lib/PraxisEvents.sol";

/**
 * @title PerpetualRouter
 * @notice Registry and router for perpetual trading adapters
 * @dev Aggregates perpetual trading options across protocols like SparkDEX Eternal
 *      Enables leveraged trading up to 100x through PRAXIS ERTs
 */
contract PerpetualRouter is Ownable, ReentrancyGuard {
    using SafeERC20 for IERC20;

    // =============================================================
    //                         STRUCTS
    // =============================================================

    /// @notice Adapter registration info
    struct AdapterInfo {
        address adapter;
        string name;
        uint256 maxLeverage;
        bool active;
    }

    /// @notice Market info from adapters
    struct MarketInfo {
        address adapter;
        bytes32 marketId;
        string name;
        uint256 maxLeverage;
        int256 fundingRate;
        uint256 openInterest;
    }

    // =============================================================
    //                         STATE
    // =============================================================

    /// @notice Array of registered adapters
    address[] public adapters;

    /// @notice Adapter info mapping
    mapping(address => AdapterInfo) public adapterInfo;

    /// @notice Maximum number of adapters to prevent gas issues
    uint256 public constant MAX_ADAPTERS = 20;

    // =============================================================
    //                         EVENTS
    // =============================================================

    event PerpAdapterAdded(address indexed adapter, string name, uint256 maxLeverage);
    event PerpAdapterRemoved(address indexed adapter);
    event PositionOpenedViaRouter(
        address indexed user,
        address indexed adapter,
        bytes32 indexed positionId,
        bytes32 market,
        bool isLong,
        uint256 size,
        uint256 collateral
    );
    event PositionClosedViaRouter(
        address indexed user,
        address indexed adapter,
        bytes32 indexed positionId,
        int256 pnl
    );
    event MarginAdjusted(
        address indexed user,
        bytes32 indexed positionId,
        uint256 amount,
        bool isIncrease
    );

    // =============================================================
    //                       CONSTRUCTOR
    // =============================================================

    /**
     * @notice Constructor
     */
    constructor() Ownable(msg.sender) {}

    // =============================================================
    //                     ADAPTER MANAGEMENT
    // =============================================================

    /**
     * @notice Add a perpetual adapter to the registry
     * @param adapter Address of the adapter to add
     */
    function addAdapter(address adapter) external onlyOwner {
        if (adapter == address(0)) revert PraxisErrors.ZeroAddress();
        if (adapterInfo[adapter].active) revert PraxisErrors.InvalidAdapter();
        if (adapters.length >= MAX_ADAPTERS) {
            revert PraxisErrors.ArrayLengthMismatch(MAX_ADAPTERS, adapters.length + 1);
        }

        // Get adapter info
        string memory adapterName = IPerpetualAdapter(adapter).name();

        // Get max leverage from first available market
        bytes32[] memory markets = IPerpetualAdapter(adapter).getAvailableMarkets();
        uint256 maxLeverage = 0;
        if (markets.length > 0) {
            PraxisStructs.PerpMarket memory market = IPerpetualAdapter(adapter).getMarketInfo(markets[0]);
            maxLeverage = market.maxLeverage;
        }

        adapters.push(adapter);
        adapterInfo[adapter] = AdapterInfo({
            adapter: adapter,
            name: adapterName,
            maxLeverage: maxLeverage,
            active: true
        });

        emit PerpAdapterAdded(adapter, adapterName, maxLeverage);
    }

    /**
     * @notice Remove an adapter from the registry
     * @param adapter Address of the adapter to remove
     */
    function removeAdapter(address adapter) external onlyOwner {
        if (!adapterInfo[adapter].active) revert PraxisErrors.InvalidAdapter();

        // Find and remove the adapter
        for (uint256 i = 0; i < adapters.length; i++) {
            if (adapters[i] == adapter) {
                adapters[i] = adapters[adapters.length - 1];
                adapters.pop();
                break;
            }
        }

        adapterInfo[adapter].active = false;
        emit PerpAdapterRemoved(adapter);
    }

    // =============================================================
    //                      MARKET QUERIES
    // =============================================================

    /**
     * @notice Get all available markets from all adapters
     * @return markets Array of market information
     */
    function getAllMarkets() external view returns (MarketInfo[] memory markets) {
        // First, count total markets
        uint256 totalMarkets = 0;
        for (uint256 i = 0; i < adapters.length; i++) {
            try IPerpetualAdapter(adapters[i]).getAvailableMarkets() returns (bytes32[] memory adapterMarkets) {
                totalMarkets += adapterMarkets.length;
            } catch {
                continue;
            }
        }

        markets = new MarketInfo[](totalMarkets);
        uint256 index = 0;

        for (uint256 i = 0; i < adapters.length; i++) {
            try IPerpetualAdapter(adapters[i]).getAvailableMarkets() returns (bytes32[] memory adapterMarkets) {
                for (uint256 j = 0; j < adapterMarkets.length; j++) {
                    try IPerpetualAdapter(adapters[i]).getMarketInfo(adapterMarkets[j]) returns (
                        PraxisStructs.PerpMarket memory info
                    ) {
                        markets[index] = MarketInfo({
                            adapter: adapters[i],
                            marketId: adapterMarkets[j],
                            name: info.name,
                            maxLeverage: info.maxLeverage,
                            fundingRate: info.fundingRate,
                            openInterest: info.openInterest
                        });
                        index++;
                    } catch {
                        continue;
                    }
                }
            } catch {
                continue;
            }
        }
    }

    /**
     * @notice Find the adapter that supports a specific market
     * @param market Market identifier
     * @return adapter Address of the supporting adapter (address(0) if none)
     */
    function findAdapterForMarket(bytes32 market) external view returns (address adapter) {
        for (uint256 i = 0; i < adapters.length; i++) {
            try IPerpetualAdapter(adapters[i]).isMarketSupported(market) returns (bool supported) {
                if (supported) {
                    return adapters[i];
                }
            } catch {
                continue;
            }
        }
        return address(0);
    }

    /**
     * @notice Get market info from the best adapter
     * @param market Market identifier
     * @return adapter Address of the adapter
     * @return info Market information
     */
    function getMarketInfo(bytes32 market) external view returns (
        address adapter,
        PraxisStructs.PerpMarket memory info
    ) {
        adapter = this.findAdapterForMarket(market);
        if (adapter != address(0)) {
            info = IPerpetualAdapter(adapter).getMarketInfo(market);
        }
    }

    /**
     * @notice Get funding rate for a market
     * @param market Market identifier
     * @return fundingRate Current funding rate
     * @return adapter Address of the adapter
     */
    function getFundingRate(bytes32 market) external view returns (
        int256 fundingRate,
        address adapter
    ) {
        adapter = this.findAdapterForMarket(market);
        if (adapter != address(0)) {
            fundingRate = IPerpetualAdapter(adapter).getFundingRate(market);
        }
    }

    // =============================================================
    //                    POSITION MANAGEMENT
    // =============================================================

    /**
     * @notice Open a position through a specific adapter
     * @param adapter Address of the adapter to use
     * @param market Market identifier
     * @param collateral Amount of collateral to deposit
     * @param size Position size
     * @param leverage Leverage multiplier
     * @param isLong True for long, false for short
     * @return positionId Unique position identifier
     */
    function openPosition(
        address adapter,
        bytes32 market,
        uint256 collateral,
        uint256 size,
        uint256 leverage,
        bool isLong
    ) external nonReentrant returns (bytes32 positionId) {
        if (!adapterInfo[adapter].active) revert PraxisErrors.InvalidAdapter();
        if (collateral == 0) revert PraxisErrors.ZeroAmount();
        if (size == 0) revert PraxisErrors.ZeroAmount();

        // Get collateral token
        address collateralToken = IPerpetualAdapter(adapter).collateralToken();

        // Pull collateral from user
        IERC20(collateralToken).safeTransferFrom(msg.sender, address(this), collateral);

        // Approve adapter
        IERC20(collateralToken).forceApprove(adapter, collateral);

        // Open position
        positionId = IPerpetualAdapter(adapter).openPosition(
            market,
            collateral,
            size,
            leverage,
            isLong,
            msg.sender
        );

        emit PositionOpenedViaRouter(
            msg.sender,
            adapter,
            positionId,
            market,
            isLong,
            size,
            collateral
        );
    }

    /**
     * @notice Open a position using the best adapter for a market
     * @param market Market identifier
     * @param collateral Amount of collateral
     * @param size Position size
     * @param leverage Leverage multiplier
     * @param isLong Position direction
     * @return adapter The adapter used
     * @return positionId Position identifier
     */
    function openPositionBestAdapter(
        bytes32 market,
        uint256 collateral,
        uint256 size,
        uint256 leverage,
        bool isLong
    ) external nonReentrant returns (address adapter, bytes32 positionId) {
        adapter = this.findAdapterForMarket(market);
        if (adapter == address(0)) {
            revert PraxisErrors.InvalidMarket(market);
        }

        // Get collateral token
        address collateralToken = IPerpetualAdapter(adapter).collateralToken();

        // Pull collateral from user
        IERC20(collateralToken).safeTransferFrom(msg.sender, address(this), collateral);

        // Approve adapter
        IERC20(collateralToken).forceApprove(adapter, collateral);

        // Open position
        positionId = IPerpetualAdapter(adapter).openPosition(
            market,
            collateral,
            size,
            leverage,
            isLong,
            msg.sender
        );

        emit PositionOpenedViaRouter(
            msg.sender,
            adapter,
            positionId,
            market,
            isLong,
            size,
            collateral
        );
    }

    /**
     * @notice Close a position through a specific adapter
     * @param adapter Address of the adapter
     * @param positionId Position identifier
     * @return pnl Realized profit/loss
     */
    function closePosition(
        address adapter,
        bytes32 positionId
    ) external nonReentrant returns (int256 pnl) {
        if (!adapterInfo[adapter].active) revert PraxisErrors.InvalidAdapter();

        pnl = IPerpetualAdapter(adapter).closePosition(positionId, msg.sender);

        emit PositionClosedViaRouter(msg.sender, adapter, positionId, pnl);
    }

    /**
     * @notice Partially close a position
     * @param adapter Address of the adapter
     * @param positionId Position identifier
     * @param sizeToClose Amount of position to close
     * @return pnl Realized profit/loss for closed portion
     */
    function partialClose(
        address adapter,
        bytes32 positionId,
        uint256 sizeToClose
    ) external nonReentrant returns (int256 pnl) {
        if (!adapterInfo[adapter].active) revert PraxisErrors.InvalidAdapter();
        if (sizeToClose == 0) revert PraxisErrors.ZeroAmount();

        pnl = IPerpetualAdapter(adapter).partialClose(
            positionId,
            sizeToClose,
            msg.sender
        );
    }

    // =============================================================
    //                    MARGIN MANAGEMENT
    // =============================================================

    /**
     * @notice Add margin to a position
     * @param adapter Address of the adapter
     * @param positionId Position identifier
     * @param amount Amount of margin to add
     */
    function addMargin(
        address adapter,
        bytes32 positionId,
        uint256 amount
    ) external nonReentrant {
        if (!adapterInfo[adapter].active) revert PraxisErrors.InvalidAdapter();
        if (amount == 0) revert PraxisErrors.ZeroAmount();

        // Get collateral token
        address collateralToken = IPerpetualAdapter(adapter).collateralToken();

        // Pull margin from user
        IERC20(collateralToken).safeTransferFrom(msg.sender, address(this), amount);

        // Approve adapter
        IERC20(collateralToken).forceApprove(adapter, amount);

        // Add margin
        IPerpetualAdapter(adapter).addMargin(positionId, amount);

        emit MarginAdjusted(msg.sender, positionId, amount, true);
    }

    /**
     * @notice Remove margin from a position
     * @param adapter Address of the adapter
     * @param positionId Position identifier
     * @param amount Amount of margin to remove
     */
    function removeMargin(
        address adapter,
        bytes32 positionId,
        uint256 amount
    ) external nonReentrant {
        if (!adapterInfo[adapter].active) revert PraxisErrors.InvalidAdapter();
        if (amount == 0) revert PraxisErrors.ZeroAmount();

        // Remove margin (sends to msg.sender)
        IPerpetualAdapter(adapter).removeMargin(positionId, amount, msg.sender);

        emit MarginAdjusted(msg.sender, positionId, amount, false);
    }

    // =============================================================
    //                      POSITION QUERIES
    // =============================================================

    /**
     * @notice Get position information
     * @param adapter Address of the adapter
     * @param positionId Position identifier
     * @return position Position details
     */
    function getPosition(
        address adapter,
        bytes32 positionId
    ) external view returns (PraxisStructs.PerpPosition memory position) {
        if (!adapterInfo[adapter].active) revert PraxisErrors.InvalidAdapter();
        return IPerpetualAdapter(adapter).getPosition(positionId);
    }

    /**
     * @notice Get all positions for a user in a market
     * @param adapter Address of the adapter
     * @param user User address
     * @param market Market identifier
     * @return positions Array of positions
     */
    function getUserPositions(
        address adapter,
        address user,
        bytes32 market
    ) external view returns (PraxisStructs.PerpPosition[] memory positions) {
        if (!adapterInfo[adapter].active) revert PraxisErrors.InvalidAdapter();
        return IPerpetualAdapter(adapter).getUserPositions(user, market);
    }

    /**
     * @notice Get liquidation price for a position
     * @param adapter Address of the adapter
     * @param positionId Position identifier
     * @return liquidationPrice Price at which position gets liquidated
     */
    function getLiquidationPrice(
        address adapter,
        bytes32 positionId
    ) external view returns (uint256 liquidationPrice) {
        if (!adapterInfo[adapter].active) revert PraxisErrors.InvalidAdapter();
        return IPerpetualAdapter(adapter).getLiquidationPrice(positionId);
    }

    /**
     * @notice Get health factor of a position
     * @param adapter Address of the adapter
     * @param positionId Position identifier
     * @return healthFactor Health factor (>1e18 = healthy)
     */
    function getPositionHealthFactor(
        address adapter,
        bytes32 positionId
    ) external view returns (uint256 healthFactor) {
        if (!adapterInfo[adapter].active) revert PraxisErrors.InvalidAdapter();
        return IPerpetualAdapter(adapter).getPositionHealthFactor(positionId);
    }

    /**
     * @notice Get unrealized PnL for a position
     * @param adapter Address of the adapter
     * @param positionId Position identifier
     * @return pnl Unrealized profit/loss
     */
    function getUnrealizedPnl(
        address adapter,
        bytes32 positionId
    ) external view returns (int256 pnl) {
        if (!adapterInfo[adapter].active) revert PraxisErrors.InvalidAdapter();
        return IPerpetualAdapter(adapter).getUnrealizedPnl(positionId);
    }

    // =============================================================
    //                         ESTIMATES
    // =============================================================

    /**
     * @notice Estimate entry price and price impact
     * @param adapter Address of the adapter
     * @param market Market identifier
     * @param size Position size
     * @param isLong Position direction
     * @return entryPrice Estimated entry price
     * @return priceImpact Estimated price impact in bps
     */
    function estimateEntryPrice(
        address adapter,
        bytes32 market,
        uint256 size,
        bool isLong
    ) external view returns (uint256 entryPrice, uint256 priceImpact) {
        if (!adapterInfo[adapter].active) revert PraxisErrors.InvalidAdapter();
        return IPerpetualAdapter(adapter).estimateEntryPrice(market, size, isLong);
    }

    /**
     * @notice Calculate liquidation price for given parameters
     * @param adapter Address of the adapter
     * @param market Market identifier
     * @param collateral Collateral amount
     * @param size Position size
     * @param leverage Leverage multiplier
     * @param isLong Position direction
     * @param entryPrice Entry price
     * @return liquidationPrice Calculated liquidation price
     */
    function calculateLiquidationPrice(
        address adapter,
        bytes32 market,
        uint256 collateral,
        uint256 size,
        uint256 leverage,
        bool isLong,
        uint256 entryPrice
    ) external view returns (uint256 liquidationPrice) {
        if (!adapterInfo[adapter].active) revert PraxisErrors.InvalidAdapter();
        return IPerpetualAdapter(adapter).calculateLiquidationPrice(
            market,
            collateral,
            size,
            leverage,
            isLong,
            entryPrice
        );
    }

    // =============================================================
    //                         VIEW FUNCTIONS
    // =============================================================

    /**
     * @notice Get all registered adapters
     * @return Array of adapter addresses
     */
    function getAdapters() external view returns (address[] memory) {
        return adapters;
    }

    /**
     * @notice Get the number of registered adapters
     * @return Number of adapters
     */
    function getAdapterCount() external view returns (uint256) {
        return adapters.length;
    }

    /**
     * @notice Check if an adapter is registered and active
     * @param adapter Address of the adapter
     * @return True if adapter is active
     */
    function isAdapterActive(address adapter) external view returns (bool) {
        return adapterInfo[adapter].active;
    }

    /**
     * @notice Get adapter details
     * @param adapter Address of the adapter
     * @return info Adapter information
     */
    function getAdapterInfo(address adapter) external view returns (AdapterInfo memory info) {
        return adapterInfo[adapter];
    }

    /**
     * @notice Check if a market is supported by any adapter
     * @param market Market identifier
     * @return supported True if market is supported
     */
    function isMarketSupported(bytes32 market) external view returns (bool supported) {
        for (uint256 i = 0; i < adapters.length; i++) {
            try IPerpetualAdapter(adapters[i]).isMarketSupported(market) returns (bool isSupported) {
                if (isSupported) return true;
            } catch {
                continue;
            }
        }
        return false;
    }

    // =============================================================
    //                         ADMIN FUNCTIONS
    // =============================================================

    /**
     * @notice Rescue tokens accidentally sent to this contract
     * @param token Token to rescue (use address(0) for native tokens)
     * @param to Address to send rescued tokens
     * @param amount Amount to rescue
     */
    function rescueTokens(
        address token,
        address to,
        uint256 amount
    ) external onlyOwner {
        if (to == address(0)) revert PraxisErrors.ZeroAddress();

        if (token == address(0)) {
            (bool success, ) = to.call{value: amount}("");
            if (!success) revert PraxisErrors.ZeroAmount();
        } else {
            IERC20(token).safeTransfer(to, amount);
        }
    }

    /**
     * @notice Receive native tokens for execution fees
     */
    receive() external payable {}
}
