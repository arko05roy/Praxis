// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

/**
 * @title ISparkDEXEternal
 * @notice Interface for SparkDEX Eternal perpetual trading protocol on Flare
 * @dev SparkDEX Eternal uses multiple contracts:
 *      - OrderBook: Submit market/limit/stop orders
 *      - Store: Read positions, markets, assets
 *      - PositionManager: Margin management
 *      - FundingTracker: Funding rate calculations
 *      - Executor: Order execution (keeper-only)
 *
 * NOTE: This interface was reverse-engineered from mainnet contract probing.
 * Some struct layouts may not exactly match - use raw calls for critical operations.
 *
 * Verified working functions (as of discovery):
 * - Store: gov(), positionManager(), getMarketList(), getMarketCount(), getMarket(bytes10)
 * - FundingTracker: fundingInterval(), store()
 * - PositionManager: gov(), store(), getPositionCount(), getUserPositions(address)
 * - OrderBook: gov(), store(), positionManager(), getUserOrderCount(address), getUserOrders(address)
 */

// =============================================================
//                         STRUCTS
// =============================================================

/**
 * @notice Order detail parameters
 * @param orderType 0=market, 1=limit, 2=stop, 3=trailing stop
 * @param isReduceOnly Whether order can only reduce position
 * @param price Limit/stop price (0 for market orders)
 * @param expiry Order expiry timestamp (0 for no expiry)
 * @param cancelOrderId Order ID to cancel when this executes
 * @param executionFee Fee paid to keeper for execution
 * @param trailingStopPercentage Trailing stop percentage in bps
 */
struct OrderDetail {
    uint8 orderType;
    bool isReduceOnly;
    uint96 price;
    uint32 expiry;
    uint32 cancelOrderId;
    uint64 executionFee;
    uint16 trailingStopPercentage;
}

/**
 * @notice Order parameters for submitting trades
 * @param user Order owner address
 * @param margin Collateral amount
 * @param asset Collateral token address
 * @param market Market identifier (e.g., "ETH-USD" encoded as bytes10)
 * @param isLong True for long, false for short
 * @param size Position size
 * @param fee Trading fee
 * @param timestamp Order creation timestamp
 * @param orderId Unique order identifier
 * @param orderDetail Additional order parameters
 */
struct Order {
    address user;
    uint96 margin;
    address asset;
    bytes10 market;
    bool isLong;
    uint96 size;
    uint96 fee;
    uint32 timestamp;
    uint32 orderId;
    OrderDetail orderDetail;
}

/**
 * @notice Market configuration (reverse-engineered from getMarket response)
 * @dev The actual struct returns 13 words. This struct attempts to decode them.
 *      Word 0: name (bytes32 "Ethereum / USD")
 *      Word 1: category (bytes32 "crypto")
 *      Word 2: isActive (bool)
 *      Word 3: maxLeverage (uint256, e.g., 100 for 100x)
 *      Word 4: liquidationFee (uint256, basis points e.g., 500 = 0.5%)
 *      Word 5: unknown (uint256, e.g., 8)
 *      Word 6: maintenanceMargin? (uint256, e.g., 9500 = 95%)
 *      Word 7: openFee? (uint256, e.g., 5000 = 50%)
 *      Word 8: reserved (uint256, 0)
 *      Word 9: unknown (uint256, e.g., 30)
 *      Word 10: reserved (uint256, 0)
 *      Word 11: tier? (uint256, e.g., 7)
 *      Word 12: marketId (bytes10/bytes32)
 */
struct Market {
    bytes32 name;           // Word 0: Display name (e.g., "Ethereum / USD")
    bytes32 category;       // Word 1: Category (e.g., "crypto")
    bool isActive;          // Word 2: Whether market is active
    uint256 maxLeverage;    // Word 3: Max leverage (e.g., 100)
    uint256 liquidationFee; // Word 4: Liquidation fee in bps
    uint256 feeMultiplier;  // Word 5: Fee multiplier or tier
    uint256 maintenanceMargin; // Word 6: Maintenance margin bps
    uint256 openFee;        // Word 7: Open fee bps
    uint256 closeFee;       // Word 8: Close fee bps
    uint256 fundingInterval; // Word 9: Funding interval
    uint256 reserved1;      // Word 10: Reserved
    uint256 tier;           // Word 11: Market tier
    bytes10 marketId;       // Word 12: Market identifier
}

/**
 * @notice Asset configuration
 * @param minSize Minimum deposit/withdrawal size
 * @param isActive Whether asset is active
 */
struct Asset {
    uint256 minSize;
    bool isActive;
}

/**
 * @notice Position data
 * @param user Position owner
 * @param market Market identifier
 * @param isLong Position direction
 * @param asset Collateral asset
 * @param size Position size
 * @param timestamp Position creation time
 * @param margin Collateral amount
 * @param price Average entry price
 * @param fundingTracker Funding accumulator value at entry
 */
struct Position {
    address user;
    bytes10 market;
    bool isLong;
    address asset;
    uint96 size;
    uint32 timestamp;
    uint96 margin;
    uint96 price;
    int256 fundingTracker;
}

/**
 * @notice Open interest tracking
 * @param longOI Total long open interest
 * @param shortOI Total short open interest
 */
struct OpenInterest {
    uint128 longOI;
    uint128 shortOI;
}

/**
 * @notice Liquidity order for pool deposits/withdrawals
 * @param asset Asset address
 * @param amount Amount to deposit/withdraw
 * @param user Order owner
 * @param liquidityOrderId Unique order ID
 * @param orderType DEPOSIT or WITHDRAW
 * @param timestamp Creation timestamp
 * @param minAmountMinusTax Minimum amount after tax
 * @param executionFee Fee paid to keeper
 */
struct LiquidityOrder {
    address asset;
    uint96 amount;
    address user;
    uint32 liquidityOrderId;
    LiquidityType orderType;
    uint32 timestamp;
    uint96 minAmountMinusTax;
    uint64 executionFee;
}

enum LiquidityType {
    DEPOSIT,
    WITHDRAW
}

// =============================================================
//                         INTERFACES
// =============================================================

/**
 * @title ISparkDEXOrderBook
 * @notice Interface for submitting orders to SparkDEX Eternal
 * @dev VERIFIED functions marked with [V], unverified with [?]
 */
interface ISparkDEXOrderBook {
    // ============== VERIFIED FUNCTIONS ==============

    /// @notice Get governance address [V]
    function gov() external view returns (address);

    /// @notice Get store contract address [V]
    function store() external view returns (address);

    /// @notice Get position manager address [V]
    function positionManager() external view returns (address);

    /// @notice Get order count for a user [V]
    function getUserOrderCount(address _user) external view returns (uint256);

    /// @notice Get orders for a user [V] - returns bytes32 array of order keys
    function getUserOrders(address _user) external view returns (bytes32[] memory);

    // ============== UNVERIFIED FUNCTIONS (may revert) ==============

    /**
     * @notice Submit a new order [?]
     * @param _params Order parameters
     * @param _tpPrice Take profit price (0 for none)
     * @param _slPrice Stop loss price (0 for none)
     * @param _trailingStopPercentage Trailing stop % in bps (0 for none)
     * @param _referralCode Referral code (bytes32(0) for none)
     */
    function submitOrder(
        Order memory _params,
        uint96 _tpPrice,
        uint96 _slPrice,
        uint16 _trailingStopPercentage,
        bytes32 _referralCode
    ) external payable;

    /**
     * @notice Submit a new order with signature for new accounts [?]
     * @param _params Order parameters
     * @param _tpPrice Take profit price
     * @param _slPrice Stop loss price
     * @param _trailingStopPercentage Trailing stop percentage
     * @param _referralCode Referral code
     * @param _signature Signature for account enablement
     */
    function submitOrderWithSignature(
        Order memory _params,
        uint96 _tpPrice,
        uint96 _slPrice,
        uint16 _trailingStopPercentage,
        bytes32 _referralCode,
        bytes memory _signature
    ) external payable;

    /**
     * @notice Cancel an existing order [?]
     * @param _orderId Order ID to cancel
     */
    function cancelOrder(uint32 _orderId) external;

    /**
     * @notice Cancel multiple orders [?]
     * @param _orderIds Array of order IDs to cancel
     */
    function cancelOrders(uint32[] calldata _orderIds) external;
}

/**
 * @title ISparkDEXStore
 * @notice Interface for reading SparkDEX Eternal state
 * @dev VERIFIED functions marked with [V], unverified with [?]
 */
interface ISparkDEXStore {
    // ============== VERIFIED FUNCTIONS ==============

    /// @notice Get governance address [V]
    function gov() external view returns (address);

    /// @notice Get position manager address [V]
    function positionManager() external view returns (address);

    /// @notice Get address storage contract [V]
    function addressStorage() external view returns (address);

    /// @notice Get list of all market IDs [V]
    function getMarketList() external view returns (bytes10[] memory);

    /// @notice Get total market count [V]
    function getMarketCount() external view returns (uint256);

    /// @notice Get market configuration [V] - returns 13 words
    /// @dev Use with caution - struct layout may not match exactly
    function getMarket(bytes10 _market) external view returns (Market memory);

    // ============== UNVERIFIED FUNCTIONS (may revert) ==============

    // Market queries [?]
    function getMarketMany(bytes10[] calldata _markets) external view returns (Market[] memory);
    function getMarketByIndex(uint256 _index) external view returns (bytes10);

    // Asset queries [?]
    function getAsset(address _asset) external view returns (Asset memory);
    function getAssetList() external view returns (address[] memory);
    function getAssetCount() external view returns (uint256);
    function getAssetByIndex(uint256 _index) external view returns (address);

    // Balance queries [?]
    function getBalance(address _asset) external view returns (uint256);
    function getAvailable(address _asset) external view returns (uint256);
    function getAvailableForOI(address _asset) external view returns (uint256);
    function getUserBalance(address _asset, address _account) external view returns (uint256);
    function getUserBalances(address[] calldata _assets, address _account) external view returns (uint256[] memory);
    function getGlobalUPL(address _asset) external view returns (int256);

    // Position queries [?]
    function getPosition(address _user, address _asset, bytes10 _market) external view returns (Position memory);
    function getUserPositionMarkets(address _user, address _asset) external view returns (bytes10[] memory);
    function getUserPositions(address _user) external view returns (Position[] memory);

    // Open interest queries [?]
    function getOIForMarketAsset(bytes10 _market, address _asset) external view returns (OpenInterest memory);
    function getOIForMarket(bytes10 _market) external view returns (uint256 longOI, uint256 shortOI);

    // Liquidity order queries [?]
    function getLiquidityOrders(uint256 _length) external view returns (LiquidityOrder[] memory);
    function getLiquidityOrderCount() external view returns (uint256);

    // Constants [?]
    function BPS_DIVIDER() external view returns (uint256);
    function MAX_FEE() external view returns (uint256);
    function MAX_LIQTHRESHOLD() external view returns (uint256);
}

/**
 * @title ISparkDEXPositionManager
 * @notice Interface for managing positions in SparkDEX Eternal
 * @dev VERIFIED functions marked with [V], unverified with [?]
 */
interface ISparkDEXPositionManager {
    // ============== VERIFIED FUNCTIONS ==============

    /// @notice Get governance address [V]
    function gov() external view returns (address);

    /// @notice Get store contract address [V]
    function store() external view returns (address);

    /// @notice Get total position count ever created [V]
    function getPositionCount() external view returns (uint256);

    /// @notice Get position IDs for a user [V]
    function getUserPositions(address _user) external view returns (bytes32[] memory);

    // ============== UNVERIFIED FUNCTIONS (may revert) ==============

    /**
     * @notice Add margin to an existing position [?]
     * @param _asset Collateral asset address
     * @param _market Market identifier
     * @param _margin Amount of margin to add
     */
    function addMargin(address _asset, bytes10 _market, uint96 _margin) external;

    /**
     * @notice Remove margin from an existing position [?]
     * @param _asset Collateral asset address
     * @param _market Market identifier
     * @param _margin Amount of margin to remove
     */
    function removeMargin(address _asset, bytes10 _market, uint256 _margin) external;

    // Events
    event PositionIncreased(
        uint32 indexed orderId,
        address indexed user,
        address indexed asset,
        bytes10 market,
        bool isLong,
        uint256 size,
        uint256 margin,
        uint256 price,
        uint256 positionMargin,
        uint256 positionSize,
        uint256 positionPrice,
        int256 fundingTracker,
        uint256 fee,
        uint256 keeperFee
    );

    event PositionDecreased(
        uint32 indexed orderId,
        address indexed user,
        address indexed asset,
        bytes10 market,
        bool isLong,
        uint256 size,
        uint256 margin,
        uint256 price,
        uint256 positionMargin,
        uint256 positionSize,
        uint256 positionPrice,
        int256 fundingTracker,
        uint256 fee,
        uint256 keeperFee,
        int256 pnl,
        int256 fundingFee
    );

    event MarginIncreased(
        address indexed user,
        address indexed asset,
        bytes10 indexed market,
        uint256 marginDiff,
        uint256 positionMargin
    );

    event MarginDecreased(
        address indexed user,
        address indexed asset,
        bytes10 indexed market,
        uint256 marginDiff,
        uint256 positionMargin
    );
}

/**
 * @title ISparkDEXFundingTracker
 * @notice Interface for funding rate calculations
 * @dev VERIFIED functions marked with [V], unverified with [?]
 */
interface ISparkDEXFundingTracker {
    // ============== VERIFIED FUNCTIONS ==============

    /// @notice Get governance address [V]
    function gov() external view returns (address);

    /// @notice Get store contract address [V]
    function store() external view returns (address);

    /// @notice Get position manager address [V]
    function positionManager() external view returns (address);

    /// @notice Get funding update interval in seconds [V] - returns 3600 (1 hour)
    function fundingInterval() external view returns (uint256);

    // ============== UNVERIFIED FUNCTIONS (may revert) ==============

    /**
     * @notice Get current funding rate for a market [?]
     * @param _market Market identifier
     * @return Current funding rate (positive = longs pay shorts)
     */
    function getFundingRate(bytes10 _market) external view returns (int256);

    /**
     * @notice Get funding tracker value for a market [?]
     * @param _market Market identifier
     * @return Cumulative funding tracker value
     */
    function getFundingTracker(bytes10 _market) external view returns (int256);

    /**
     * @notice Calculate funding fee for a position [?]
     * @param _market Market identifier
     * @param _isLong Position direction
     * @param _size Position size
     * @param _fundingTracker Position's funding tracker value at entry
     * @return fundingFee Funding fee amount (can be negative)
     */
    function getFundingFee(
        bytes10 _market,
        bool _isLong,
        uint256 _size,
        int256 _fundingTracker
    ) external view returns (int256 fundingFee);
}

/**
 * @title ISparkDEXTradingValidator
 * @notice Interface for validating trades and calculating liquidation
 * @dev VERIFIED functions marked with [V], unverified with [?]
 */
interface ISparkDEXTradingValidator {
    // ============== VERIFIED FUNCTIONS ==============

    /// @notice Get store contract address [V]
    function store() external view returns (address);

    /// @notice Get position manager address [V]
    function positionManager() external view returns (address);

    // ============== UNVERIFIED FUNCTIONS (may revert) ==============

    /**
     * @notice Check if a position can be liquidated [?]
     * @param _user Position owner
     * @param _asset Collateral asset
     * @param _market Market identifier
     * @return True if position can be liquidated
     */
    function canLiquidate(
        address _user,
        address _asset,
        bytes10 _market
    ) external view returns (bool);

    /**
     * @notice Get liquidation price for a position [?]
     * @param _user Position owner
     * @param _asset Collateral asset
     * @param _market Market identifier
     * @return Liquidation price
     */
    function getLiquidationPrice(
        address _user,
        address _asset,
        bytes10 _market
    ) external view returns (uint256);

    /**
     * @notice Calculate PnL for a position at a given price [?]
     * @param _isLong Position direction
     * @param _price Current price
     * @param _positionPrice Entry price
     * @param _size Position size
     * @param _fundingFee Accumulated funding fee
     * @return pnl Profit/loss amount
     */
    function getPnL(
        bool _isLong,
        uint256 _price,
        uint256 _positionPrice,
        uint256 _size,
        int256 _fundingFee
    ) external pure returns (int256 pnl);
}

/**
 * @title ISparkDEXAddressStorage
 * @notice Interface for SparkDEX Eternal address registry
 */
interface ISparkDEXAddressStorage {
    function orderBook() external view returns (address);
    function store() external view returns (address);
    function positionManager() external view returns (address);
    function executor() external view returns (address);
    function fundingTracker() external view returns (address);
    function tradingValidator() external view returns (address);
    function referralStorage() external view returns (address);
}
