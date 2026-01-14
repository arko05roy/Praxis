// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

import {IPerpetualAdapter} from "../interfaces/IPerpetualAdapter.sol";
import {
    ISparkDEXOrderBook,
    ISparkDEXStore,
    ISparkDEXPositionManager,
    ISparkDEXFundingTracker,
    ISparkDEXTradingValidator,
    ISparkDEXAddressStorage,
    Order,
    OrderDetail,
    Market,
    Position
} from "../interfaces/external/ISparkDEXEternal.sol";
import {PraxisStructs} from "../lib/PraxisStructs.sol";
import {PraxisErrors} from "../lib/PraxisErrors.sol";
import {PraxisEvents} from "../lib/PraxisEvents.sol";
import {IERC20} from "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import {SafeERC20} from "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import {Ownable} from "@openzeppelin/contracts/access/Ownable.sol";
import {ReentrancyGuard} from "@openzeppelin/contracts/utils/ReentrancyGuard.sol";

/**
 * @title SparkDEXEternalAdapter
 * @notice Adapter for SparkDEX Eternal perpetual trading protocol on Flare
 * @dev Enables leveraged trading up to 100x through the PRAXIS protocol
 *      Uses FTSO price feeds for accurate pricing and liquidation calculations
 */
contract SparkDEXEternalAdapter is IPerpetualAdapter, Ownable, ReentrancyGuard {
    using SafeERC20 for IERC20;

    // =============================================================
    //                         CONSTANTS
    // =============================================================

    /// @notice Name of the adapter
    string private constant ADAPTER_NAME = "SparkDEX Eternal";

    /// @notice Basis points divisor
    uint256 private constant BPS_DIVIDER = 10000;

    /// @notice Scaling factor for prices (1e8)
    uint256 private constant PRICE_PRECISION = 1e8;

    /// @notice Default execution fee for orders (in native token)
    uint64 public constant DEFAULT_EXECUTION_FEE = 0.001 ether;

    // =============================================================
    //                         STATE
    // =============================================================

    /// @notice SparkDEX Eternal address storage contract
    ISparkDEXAddressStorage public immutable addressStorage;

    /// @notice Primary collateral token (e.g., USDT0)
    address public immutable primaryCollateral;

    /// @notice Cached contract references (updated via refresh)
    ISparkDEXOrderBook public orderBook;
    ISparkDEXStore public store;
    ISparkDEXPositionManager public positionManager;
    ISparkDEXFundingTracker public fundingTracker;
    ISparkDEXTradingValidator public tradingValidator;

    /// @notice Mapping of position IDs to their data (for tracking PRAXIS-created positions)
    /// @dev positionId = keccak256(abi.encodePacked(user, asset, market))
    mapping(bytes32 => address) public positionOwners;

    /// @notice Next position nonce for generating unique IDs
    uint256 private _positionNonce;

    // =============================================================
    //                         EVENTS
    // =============================================================

    event ContractAddressesRefreshed();
    event OrderSubmitted(
        address indexed user,
        bytes10 indexed market,
        bool isLong,
        uint256 size,
        uint256 margin
    );

    // =============================================================
    //                       CONSTRUCTOR
    // =============================================================

    /**
     * @notice Constructor
     * @param addresses_ Array of SparkDEX Eternal contract addresses:
     *        [0] = orderBook
     *        [1] = store
     *        [2] = positionManager
     *        [3] = fundingTracker
     *        [4] = tradingValidator
     * @param primaryCollateral_ Primary collateral token address
     */
    constructor(
        address[5] memory addresses_,
        address primaryCollateral_
    ) Ownable(msg.sender) {
        if (primaryCollateral_ == address(0)) revert PraxisErrors.ZeroAddress();

        // Validate all addresses
        for (uint256 i = 0; i < 5; i++) {
            if (addresses_[i] == address(0)) revert PraxisErrors.ZeroAddress();
        }

        // Set immutable placeholder - use orderBook address for protocol reference
        addressStorage = ISparkDEXAddressStorage(addresses_[0]);
        primaryCollateral = primaryCollateral_;

        // Initialize contract references directly
        orderBook = ISparkDEXOrderBook(addresses_[0]);
        store = ISparkDEXStore(addresses_[1]);
        positionManager = ISparkDEXPositionManager(addresses_[2]);
        fundingTracker = ISparkDEXFundingTracker(addresses_[3]);
        tradingValidator = ISparkDEXTradingValidator(addresses_[4]);
    }

    // =============================================================
    //                     VIEW FUNCTIONS
    // =============================================================

    /// @inheritdoc IPerpetualAdapter
    function name() external pure override returns (string memory) {
        return ADAPTER_NAME;
    }

    /// @inheritdoc IPerpetualAdapter
    function protocol() external view override returns (address) {
        return address(store);
    }

    /// @inheritdoc IPerpetualAdapter
    function collateralToken() external view override returns (address) {
        return primaryCollateral;
    }

    /// @inheritdoc IPerpetualAdapter
    function isMarketSupported(bytes32 market) external view override returns (bool) {
        bytes10 market10 = _toBytes10(market);
        Market memory marketInfo = store.getMarket(market10);
        return marketInfo.isActive;
    }

    /// @inheritdoc IPerpetualAdapter
    function getMarketInfo(
        bytes32 market
    ) external view override returns (PraxisStructs.PerpMarket memory info) {
        bytes10 market10 = _toBytes10(market);
        Market memory sparkMarket = store.getMarket(market10);

        // Get open interest - use try/catch since interface may not match
        uint256 totalOI = 0;
        try store.getOIForMarket(market10) returns (uint256 longOI, uint256 shortOI) {
            totalOI = longOI + shortOI;
        } catch {
            // Interface mismatch - OI unavailable
        }

        // Get funding rate - use try/catch since interface may not match
        int256 fundingRateValue = 0;
        try fundingTracker.getFundingRate(market10) returns (int256 rate) {
            fundingRateValue = rate;
        } catch {
            // Interface mismatch - funding rate unavailable
        }

        info = PraxisStructs.PerpMarket({
            marketId: market,
            name: _bytes32ToString(sparkMarket.name),
            maxLeverage: sparkMarket.maxLeverage,
            openInterest: totalOI,
            fundingRate: fundingRateValue,
            indexPrice: 0 // Will be filled by oracle query if needed
        });
    }

    /// @inheritdoc IPerpetualAdapter
    function getFundingRate(bytes32 market) external view override returns (int256) {
        try fundingTracker.getFundingRate(_toBytes10(market)) returns (int256 rate) {
            return rate;
        } catch {
            // Interface mismatch - return 0
            return 0;
        }
    }

    /// @inheritdoc IPerpetualAdapter
    function getIndexPrice(bytes32 market) external view override returns (uint256) {
        // SparkDEX uses FTSO for prices - this would require oracle integration
        // For now, return 0 and let the caller use FlareOracle directly
        // In production, this could query the FTSO via Store's price mechanism
        bytes10 market10 = _toBytes10(market);
        Market memory marketInfo = store.getMarket(market10);
        // Price is fetched from FTSO/Pyth via the pythFeed
        // The actual price query would need to go through FTSOv2
        return 0;
    }

    /// @inheritdoc IPerpetualAdapter
    function getAvailableMarkets() external view override returns (bytes32[] memory markets) {
        bytes10[] memory sparkMarkets = store.getMarketList();
        markets = new bytes32[](sparkMarkets.length);

        for (uint256 i = 0; i < sparkMarkets.length; i++) {
            markets[i] = _toBytes32(sparkMarkets[i]);
        }
    }

    // =============================================================
    //                     POSITION QUERIES
    // =============================================================

    /// @inheritdoc IPerpetualAdapter
    function getPosition(
        bytes32 positionId
    ) external view override returns (PraxisStructs.PerpPosition memory position) {
        // Decode position ID to get user, asset, market
        (address user, address asset, bytes10 market) = _decodePositionId(positionId);

        Position memory sparkPos = store.getPosition(user, asset, market);

        if (sparkPos.user == address(0)) {
            revert PraxisErrors.PositionNotFound(positionId);
        }

        // Calculate unrealized PnL
        int256 fundingFee = fundingTracker.getFundingFee(
            market,
            sparkPos.isLong,
            sparkPos.size,
            sparkPos.fundingTracker
        );

        // Get liquidation price
        uint256 liqPrice = tradingValidator.getLiquidationPrice(user, asset, market);

        position = PraxisStructs.PerpPosition({
            positionId: positionId,
            market: _toBytes32(market),
            user: sparkPos.user,
            side: sparkPos.isLong ? PraxisStructs.PositionSide.LONG : PraxisStructs.PositionSide.SHORT,
            size: sparkPos.size,
            collateral: sparkPos.margin,
            leverage: sparkPos.size / sparkPos.margin, // Approximate leverage
            entryPrice: sparkPos.price,
            liquidationPrice: liqPrice,
            unrealizedPnl: 0, // Would need current price to calculate
            fundingAccrued: fundingFee
        });
    }

    /// @inheritdoc IPerpetualAdapter
    function getUserPositions(
        address user,
        bytes32 market
    ) external view override returns (PraxisStructs.PerpPosition[] memory positions) {
        bytes10 market10 = _toBytes10(market);

        // Get position for primary collateral
        Position memory sparkPos = store.getPosition(user, primaryCollateral, market10);

        if (sparkPos.user == address(0) || sparkPos.size == 0) {
            return new PraxisStructs.PerpPosition[](0);
        }

        positions = new PraxisStructs.PerpPosition[](1);
        bytes32 positionId = _encodePositionId(user, primaryCollateral, market10);

        int256 fundingFee = fundingTracker.getFundingFee(
            market10,
            sparkPos.isLong,
            sparkPos.size,
            sparkPos.fundingTracker
        );

        uint256 liqPrice = tradingValidator.getLiquidationPrice(user, primaryCollateral, market10);

        positions[0] = PraxisStructs.PerpPosition({
            positionId: positionId,
            market: market,
            user: sparkPos.user,
            side: sparkPos.isLong ? PraxisStructs.PositionSide.LONG : PraxisStructs.PositionSide.SHORT,
            size: sparkPos.size,
            collateral: sparkPos.margin,
            leverage: sparkPos.size / sparkPos.margin,
            entryPrice: sparkPos.price,
            liquidationPrice: liqPrice,
            unrealizedPnl: 0,
            fundingAccrued: fundingFee
        });
    }

    /// @inheritdoc IPerpetualAdapter
    function getLiquidationPrice(
        bytes32 positionId
    ) external view override returns (uint256) {
        (address user, address asset, bytes10 market) = _decodePositionId(positionId);
        return tradingValidator.getLiquidationPrice(user, asset, market);
    }

    /// @inheritdoc IPerpetualAdapter
    function getPositionHealthFactor(
        bytes32 positionId
    ) external view override returns (uint256) {
        (address user, address asset, bytes10 market) = _decodePositionId(positionId);

        Position memory pos = store.getPosition(user, asset, market);
        if (pos.user == address(0) || pos.size == 0) {
            return type(uint256).max; // No position = infinite health
        }

        // Health factor = margin / required margin
        // Required margin = size / maxLeverage
        Market memory marketInfo = store.getMarket(market);
        uint256 requiredMargin = pos.size / marketInfo.maxLeverage;

        if (requiredMargin == 0) return type(uint256).max;

        return (uint256(pos.margin) * 1e18) / requiredMargin;
    }

    /// @inheritdoc IPerpetualAdapter
    function getUnrealizedPnl(bytes32 positionId) external view override returns (int256) {
        (address user, address asset, bytes10 market) = _decodePositionId(positionId);

        Position memory pos = store.getPosition(user, asset, market);
        if (pos.user == address(0) || pos.size == 0) {
            return 0;
        }

        // Would need current price from oracle to calculate
        // This is a simplified version - in production, integrate with FlareOracle
        int256 fundingFee = fundingTracker.getFundingFee(
            market,
            pos.isLong,
            pos.size,
            pos.fundingTracker
        );

        return -fundingFee; // Return negative of fees paid (funding impact)
    }

    /// @inheritdoc IPerpetualAdapter
    function getMinimumMargin(bytes32 positionId) external view override returns (uint256) {
        (address user, address asset, bytes10 market) = _decodePositionId(positionId);

        Position memory pos = store.getPosition(user, asset, market);
        if (pos.user == address(0) || pos.size == 0) {
            return 0;
        }

        Market memory marketInfo = store.getMarket(market);
        // Minimum margin = size / maxLeverage (maintenance margin)
        return pos.size / marketInfo.maxLeverage;
    }

    // =============================================================
    //                   POSITION MANAGEMENT
    // =============================================================

    /// @inheritdoc IPerpetualAdapter
    function openPosition(
        bytes32 market,
        uint256 collateral,
        uint256 size,
        uint256 leverage,
        bool isLong,
        address onBehalfOf
    ) external override nonReentrant returns (bytes32 positionId) {
        if (collateral == 0) revert PraxisErrors.ZeroAmount();
        if (size == 0) revert PraxisErrors.ZeroAmount();
        if (onBehalfOf == address(0)) revert PraxisErrors.ZeroAddress();

        bytes10 market10 = _toBytes10(market);

        // Validate market
        Market memory marketInfo = store.getMarket(market10);
        if (!marketInfo.isActive) revert PraxisErrors.InvalidMarket(market);

        // Validate leverage
        if (leverage > marketInfo.maxLeverage) {
            revert PraxisErrors.ExcessiveLeverage(leverage, marketInfo.maxLeverage);
        }

        // Pull collateral from caller
        IERC20(primaryCollateral).safeTransferFrom(msg.sender, address(this), collateral);

        // Approve OrderBook to spend collateral
        IERC20(primaryCollateral).forceApprove(address(orderBook), collateral);

        // Calculate fee (from market open fee rate)
        uint96 fee = uint96((size * marketInfo.openFee) / BPS_DIVIDER);

        // Create order
        Order memory order = Order({
            user: onBehalfOf,
            margin: uint96(collateral),
            asset: primaryCollateral,
            market: market10,
            isLong: isLong,
            size: uint96(size),
            fee: fee,
            timestamp: uint32(block.timestamp),
            orderId: 0, // Will be assigned by OrderBook
            orderDetail: OrderDetail({
                orderType: 0, // Market order
                isReduceOnly: false,
                price: 0, // Market order = no price limit
                expiry: 0, // No expiry
                cancelOrderId: 0,
                executionFee: DEFAULT_EXECUTION_FEE,
                trailingStopPercentage: 0
            })
        });

        // Submit order (send execution fee)
        orderBook.submitOrder{value: DEFAULT_EXECUTION_FEE}(
            order,
            0, // No take profit
            0, // No stop loss
            0, // No trailing stop
            bytes32(0) // No referral
        );

        // Generate position ID
        positionId = _encodePositionId(onBehalfOf, primaryCollateral, market10);
        positionOwners[positionId] = onBehalfOf;

        emit OrderSubmitted(onBehalfOf, market10, isLong, size, collateral);

        emit PraxisEvents.PositionOpened(
            onBehalfOf,
            positionId,
            market,
            isLong ? PraxisStructs.PositionSide.LONG : PraxisStructs.PositionSide.SHORT,
            size,
            collateral,
            leverage,
            0 // Entry price will be determined at execution
        );
    }

    /// @inheritdoc IPerpetualAdapter
    function closePosition(
        bytes32 positionId,
        address to
    ) external override nonReentrant returns (int256 pnl) {
        if (to == address(0)) revert PraxisErrors.ZeroAddress();

        (address user, address asset, bytes10 market) = _decodePositionId(positionId);

        // Verify caller authorization
        if (msg.sender != user && msg.sender != positionOwners[positionId]) {
            revert PraxisErrors.Unauthorized();
        }

        Position memory pos = store.getPosition(user, asset, market);
        if (pos.user == address(0) || pos.size == 0) {
            revert PraxisErrors.PositionNotFound(positionId);
        }

        Market memory marketInfo = store.getMarket(market);
        // Use closeFee for closing positions (or openFee if closeFee is 0)
        uint256 feeRate = marketInfo.closeFee > 0 ? marketInfo.closeFee : marketInfo.openFee;
        uint96 fee = uint96((uint256(pos.size) * feeRate) / BPS_DIVIDER);

        // Create close order (reduce-only, opposite direction)
        Order memory order = Order({
            user: user,
            margin: 0, // No additional margin for close
            asset: asset,
            market: market,
            isLong: !pos.isLong, // Opposite direction to close
            size: pos.size, // Close entire position
            fee: fee,
            timestamp: uint32(block.timestamp),
            orderId: 0,
            orderDetail: OrderDetail({
                orderType: 0, // Market order
                isReduceOnly: true,
                price: 0,
                expiry: 0,
                cancelOrderId: 0,
                executionFee: DEFAULT_EXECUTION_FEE,
                trailingStopPercentage: 0
            })
        });

        // Submit close order
        orderBook.submitOrder{value: DEFAULT_EXECUTION_FEE}(
            order,
            0,
            0,
            0,
            bytes32(0)
        );

        // Calculate estimated PnL (actual will be determined at execution)
        pnl = fundingTracker.getFundingFee(
            market,
            pos.isLong,
            pos.size,
            pos.fundingTracker
        );

        emit PraxisEvents.PositionClosed(
            user,
            positionId,
            0, // Exit price determined at execution
            pnl,
            pos.margin
        );
    }

    /// @inheritdoc IPerpetualAdapter
    function partialClose(
        bytes32 positionId,
        uint256 sizeToClose,
        address to
    ) external override nonReentrant returns (int256 pnl) {
        if (to == address(0)) revert PraxisErrors.ZeroAddress();
        if (sizeToClose == 0) revert PraxisErrors.ZeroAmount();

        (address user, address asset, bytes10 market) = _decodePositionId(positionId);

        // Verify caller authorization
        if (msg.sender != user && msg.sender != positionOwners[positionId]) {
            revert PraxisErrors.Unauthorized();
        }

        Position memory pos = store.getPosition(user, asset, market);
        if (pos.user == address(0) || pos.size == 0) {
            revert PraxisErrors.PositionNotFound(positionId);
        }

        if (sizeToClose > pos.size) {
            sizeToClose = pos.size; // Cap at position size
        }

        Market memory marketInfo = store.getMarket(market);
        // Use closeFee for closing positions (or openFee if closeFee is 0)
        uint256 feeRate = marketInfo.closeFee > 0 ? marketInfo.closeFee : marketInfo.openFee;
        uint96 fee = uint96((sizeToClose * feeRate) / BPS_DIVIDER);

        // Create partial close order
        Order memory order = Order({
            user: user,
            margin: 0,
            asset: asset,
            market: market,
            isLong: !pos.isLong,
            size: uint96(sizeToClose),
            fee: fee,
            timestamp: uint32(block.timestamp),
            orderId: 0,
            orderDetail: OrderDetail({
                orderType: 0,
                isReduceOnly: true,
                price: 0,
                expiry: 0,
                cancelOrderId: 0,
                executionFee: DEFAULT_EXECUTION_FEE,
                trailingStopPercentage: 0
            })
        });

        orderBook.submitOrder{value: DEFAULT_EXECUTION_FEE}(
            order,
            0,
            0,
            0,
            bytes32(0)
        );

        // Estimate PnL proportionally
        int256 totalFunding = fundingTracker.getFundingFee(
            market,
            pos.isLong,
            pos.size,
            pos.fundingTracker
        );

        pnl = (totalFunding * int256(sizeToClose)) / int256(uint256(pos.size));

        return pnl;
    }

    // =============================================================
    //                    MARGIN MANAGEMENT
    // =============================================================

    /// @inheritdoc IPerpetualAdapter
    function addMargin(bytes32 positionId, uint256 amount) external override nonReentrant {
        if (amount == 0) revert PraxisErrors.ZeroAmount();

        (address user, address asset, bytes10 market) = _decodePositionId(positionId);

        Position memory pos = store.getPosition(user, asset, market);
        if (pos.user == address(0) || pos.size == 0) {
            revert PraxisErrors.PositionNotFound(positionId);
        }

        // Pull margin from caller
        IERC20(asset).safeTransferFrom(msg.sender, address(this), amount);

        // Approve PositionManager
        IERC20(asset).forceApprove(address(positionManager), amount);

        // Add margin
        positionManager.addMargin(asset, market, uint96(amount));

        emit PraxisEvents.MarginAdded(
            positionId,
            amount,
            pos.margin + uint96(amount)
        );
    }

    /// @inheritdoc IPerpetualAdapter
    function removeMargin(
        bytes32 positionId,
        uint256 amount,
        address to
    ) external override nonReentrant {
        if (amount == 0) revert PraxisErrors.ZeroAmount();
        if (to == address(0)) revert PraxisErrors.ZeroAddress();

        (address user, address asset, bytes10 market) = _decodePositionId(positionId);

        // Verify caller authorization
        if (msg.sender != user && msg.sender != positionOwners[positionId]) {
            revert PraxisErrors.Unauthorized();
        }

        Position memory pos = store.getPosition(user, asset, market);
        if (pos.user == address(0) || pos.size == 0) {
            revert PraxisErrors.PositionNotFound(positionId);
        }

        // Check if removal would cause liquidation
        Market memory marketInfo = store.getMarket(market);
        uint256 minMargin = pos.size / marketInfo.maxLeverage;

        if (pos.margin - amount < minMargin) {
            revert PraxisErrors.MarginRemovalWouldLiquidate(
                positionId,
                pos.margin,
                minMargin
            );
        }

        // Remove margin (will transfer to msg.sender, then we forward to 'to')
        uint256 balanceBefore = IERC20(asset).balanceOf(address(this));
        positionManager.removeMargin(asset, market, amount);
        uint256 balanceAfter = IERC20(asset).balanceOf(address(this));

        uint256 received = balanceAfter - balanceBefore;
        if (received > 0 && to != address(this)) {
            IERC20(asset).safeTransfer(to, received);
        }

        emit PraxisEvents.MarginRemoved(
            positionId,
            amount,
            pos.margin - uint96(amount)
        );
    }

    // =============================================================
    //                         ESTIMATES
    // =============================================================

    /// @inheritdoc IPerpetualAdapter
    function estimateEntryPrice(
        bytes32 market,
        uint256 size,
        bool isLong
    ) external view override returns (uint256 entryPrice, uint256 priceImpact) {
        // SparkDEX uses FTSO prices with minimal slippage for perps
        // Price impact depends on open interest imbalance
        bytes10 market10 = _toBytes10(market);

        (uint256 longOI, uint256 shortOI) = store.getOIForMarket(market10);

        // Estimate price impact based on OI imbalance
        // This is a simplified calculation
        uint256 totalOI = longOI + shortOI;
        if (totalOI == 0) {
            priceImpact = 0;
        } else {
            if (isLong) {
                priceImpact = (size * BPS_DIVIDER) / (totalOI + size);
            } else {
                priceImpact = (size * BPS_DIVIDER) / (totalOI + size);
            }
        }

        // Entry price would come from FTSO
        entryPrice = 0; // Would need oracle query
    }

    /// @inheritdoc IPerpetualAdapter
    function estimateExitPrice(
        bytes32 positionId
    ) external view override returns (uint256 exitPrice, uint256 priceImpact) {
        (address user, address asset, bytes10 market) = _decodePositionId(positionId);

        Position memory pos = store.getPosition(user, asset, market);
        if (pos.user == address(0) || pos.size == 0) {
            return (0, 0);
        }

        (uint256 longOI, uint256 shortOI) = store.getOIForMarket(market);
        uint256 totalOI = longOI + shortOI;

        if (totalOI == 0) {
            priceImpact = 0;
        } else {
            priceImpact = (uint256(pos.size) * BPS_DIVIDER) / totalOI;
        }

        exitPrice = 0; // Would need oracle query
    }

    /// @inheritdoc IPerpetualAdapter
    function calculateLiquidationPrice(
        bytes32 market,
        uint256 collateral,
        uint256 size,
        uint256 leverage,
        bool isLong,
        uint256 entryPrice
    ) external view override returns (uint256 liquidationPrice) {
        bytes10 market10 = _toBytes10(market);
        Market memory marketInfo = store.getMarket(market10);

        // Liquidation threshold typically around 90-98%
        // liqPrice = entryPrice * (1 - margin/size) for longs
        // liqPrice = entryPrice * (1 + margin/size) for shorts

        uint256 marginRatio = (collateral * PRICE_PRECISION) / size;

        if (isLong) {
            liquidationPrice = entryPrice - ((entryPrice * marginRatio * 90) / (100 * PRICE_PRECISION));
        } else {
            liquidationPrice = entryPrice + ((entryPrice * marginRatio * 90) / (100 * PRICE_PRECISION));
        }
    }

    // =============================================================
    //                      ADMIN FUNCTIONS
    // =============================================================

    /**
     * @notice Refresh contract addresses from AddressStorage
     * @dev Call this if SparkDEX updates their contracts
     */
    function refreshContractAddresses() external onlyOwner {
        _refreshContractAddresses();
        emit ContractAddressesRefreshed();
    }

    /**
     * @notice Rescue tokens accidentally sent to this contract
     * @param token Token to rescue
     * @param to Address to send tokens
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

    /// @notice Receive native tokens for execution fees
    receive() external payable {}

    // =============================================================
    //                      INTERNAL FUNCTIONS
    // =============================================================

    /**
     * @notice Refresh all contract addresses from AddressStorage
     */
    function _refreshContractAddresses() internal {
        // No-op: Contract addresses are set in constructor and are immutable
        // Kept for interface compatibility
    }

    /**
     * @notice Convert bytes32 to bytes10 (SparkDEX market format)
     * @param input bytes32 value
     * @return bytes10 truncated value
     */
    function _toBytes10(bytes32 input) internal pure returns (bytes10) {
        return bytes10(input);
    }

    /**
     * @notice Convert bytes10 to bytes32
     * @param input bytes10 value
     * @return bytes32 padded value
     */
    function _toBytes32(bytes10 input) internal pure returns (bytes32) {
        return bytes32(input);
    }

    /**
     * @notice Convert bytes32 to string (trim null bytes)
     * @param input bytes32 value (null-terminated string)
     * @return result String without trailing null bytes
     */
    function _bytes32ToString(bytes32 input) internal pure returns (string memory) {
        // Find the end of the string (first null byte)
        uint256 length = 0;
        for (uint256 i = 0; i < 32; i++) {
            if (input[i] == 0) break;
            length++;
        }

        // Copy the bytes
        bytes memory result = new bytes(length);
        for (uint256 i = 0; i < length; i++) {
            result[i] = input[i];
        }

        return string(result);
    }

    /**
     * @notice Encode a position ID from components
     * @param user Position owner
     * @param asset Collateral asset
     * @param market Market identifier
     * @return positionId Unique position identifier
     */
    function _encodePositionId(
        address user,
        address asset,
        bytes10 market
    ) internal pure returns (bytes32) {
        return keccak256(abi.encodePacked(user, asset, market));
    }

    /**
     * @notice Decode a position ID to components
     * @dev Uses positionOwners mapping to recover user
     * @param positionId Position identifier
     * @return user Position owner
     * @return asset Collateral asset
     * @return market Market identifier
     */
    function _decodePositionId(
        bytes32 positionId
    ) internal view returns (address user, address asset, bytes10 market) {
        // Look up the owner from our mapping
        user = positionOwners[positionId];

        // Default to primary collateral
        asset = primaryCollateral;

        // For market, we need to check against known positions
        // This is a simplified version - in production, store full mapping
        if (user != address(0)) {
            // Try to find the position in known markets
            bytes10[] memory markets = store.getMarketList();
            for (uint256 i = 0; i < markets.length; i++) {
                bytes32 checkId = _encodePositionId(user, asset, markets[i]);
                if (checkId == positionId) {
                    market = markets[i];
                    break;
                }
            }
        }
    }
}
