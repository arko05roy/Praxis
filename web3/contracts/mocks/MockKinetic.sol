// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

import {ERC20} from "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import {IERC20} from "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import {SafeERC20} from "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import {Ownable} from "@openzeppelin/contracts/access/Ownable.sol";
import {ReentrancyGuard} from "@openzeppelin/contracts/utils/ReentrancyGuard.sol";

/**
 * @title MockKToken
 * @notice Receipt token for MockKinetic deposits
 * @dev Similar to Compound's cToken / Kinetic's kToken
 */
contract MockKToken is ERC20, Ownable {
    address public immutable underlying;
    address public comptroller;

    constructor(
        string memory name_,
        string memory symbol_,
        address underlying_,
        address comptroller_
    ) ERC20(name_, symbol_) Ownable(msg.sender) {
        underlying = underlying_;
        comptroller = comptroller_;
    }

    function mint(address to, uint256 amount) external {
        require(msg.sender == comptroller, "MockKToken: ONLY_COMPTROLLER");
        _mint(to, amount);
    }

    function burn(address from, uint256 amount) external {
        require(msg.sender == comptroller, "MockKToken: ONLY_COMPTROLLER");
        _burn(from, amount);
    }

    function setComptroller(address newComptroller) external onlyOwner {
        comptroller = newComptroller;
    }
}

/**
 * @title MockKinetic
 * @notice Mock lending protocol for Coston2 testnet demo
 * @dev Simulates Kinetic's lending/supply functionality
 *      - supply() deposits underlying and receives kTokens
 *      - withdraw() burns kTokens and receives underlying
 *      - No borrowing functionality (out of scope for demo)
 */
contract MockKinetic is Ownable, ReentrancyGuard {
    using SafeERC20 for IERC20;

    // =============================================================
    //                          STRUCTS
    // =============================================================

    struct Market {
        bool isListed;
        address kToken;
        uint256 exchangeRate;  // kToken per underlying (scaled by 1e18)
        uint256 supplyAPY;     // APY in basis points (e.g., 800 = 8%)
        uint256 totalSupply;   // Total underlying supplied
    }

    // =============================================================
    //                          STORAGE
    // =============================================================

    /// @notice Mapping from underlying token to market info
    mapping(address => Market) public markets;

    /// @notice List of all underlying tokens with markets
    address[] public allMarkets;

    // =============================================================
    //                          EVENTS
    // =============================================================

    event MarketListed(address indexed underlying, address indexed kToken);
    event Supply(address indexed user, address indexed underlying, uint256 amount, uint256 kTokenAmount);
    event Withdraw(address indexed user, address indexed underlying, uint256 kTokenAmount, uint256 amount);
    event ExchangeRateUpdated(address indexed underlying, uint256 oldRate, uint256 newRate);
    event APYUpdated(address indexed underlying, uint256 oldAPY, uint256 newAPY);

    // =============================================================
    //                         CONSTRUCTOR
    // =============================================================

    constructor() Ownable(msg.sender) {}

    // =============================================================
    //                    SUPPLY/WITHDRAW FUNCTIONS
    // =============================================================

    /**
     * @notice Supply underlying tokens and receive kTokens
     * @param underlying Address of the underlying token
     * @param amount Amount of underlying to supply
     * @return kTokenAmount Amount of kTokens received
     */
    function supply(
        address underlying,
        uint256 amount
    ) external nonReentrant returns (uint256 kTokenAmount) {
        Market storage market = markets[underlying];
        require(market.isListed, "MockKinetic: MARKET_NOT_LISTED");
        require(amount > 0, "MockKinetic: ZERO_AMOUNT");

        // Calculate kTokens to mint
        kTokenAmount = _underlyingToKToken(underlying, amount);

        // Transfer underlying from user
        IERC20(underlying).safeTransferFrom(msg.sender, address(this), amount);

        // Update total supply
        market.totalSupply += amount;

        // Mint kTokens to user
        MockKToken(market.kToken).mint(msg.sender, kTokenAmount);

        emit Supply(msg.sender, underlying, amount, kTokenAmount);
    }

    /**
     * @notice Withdraw underlying tokens by burning kTokens
     * @param underlying Address of the underlying token
     * @param kTokenAmount Amount of kTokens to redeem
     * @return amount Amount of underlying received
     */
    function withdraw(
        address underlying,
        uint256 kTokenAmount
    ) external nonReentrant returns (uint256 amount) {
        Market storage market = markets[underlying];
        require(market.isListed, "MockKinetic: MARKET_NOT_LISTED");
        require(kTokenAmount > 0, "MockKinetic: ZERO_AMOUNT");

        MockKToken kToken = MockKToken(market.kToken);
        require(kToken.balanceOf(msg.sender) >= kTokenAmount, "MockKinetic: INSUFFICIENT_BALANCE");

        // Calculate underlying to return
        amount = _kTokenToUnderlying(underlying, kTokenAmount);
        require(IERC20(underlying).balanceOf(address(this)) >= amount, "MockKinetic: INSUFFICIENT_LIQUIDITY");

        // Update total supply
        market.totalSupply -= amount;

        // Burn kTokens
        kToken.burn(msg.sender, kTokenAmount);

        // Transfer underlying to user
        IERC20(underlying).safeTransfer(msg.sender, amount);

        emit Withdraw(msg.sender, underlying, kTokenAmount, amount);
    }

    /**
     * @notice Withdraw all underlying tokens for a given market
     * @param underlying Address of the underlying token
     * @return amount Amount of underlying received
     */
    function withdrawAll(address underlying) external nonReentrant returns (uint256 amount) {
        Market storage market = markets[underlying];
        require(market.isListed, "MockKinetic: MARKET_NOT_LISTED");

        MockKToken kToken = MockKToken(market.kToken);
        uint256 kTokenAmount = kToken.balanceOf(msg.sender);
        require(kTokenAmount > 0, "MockKinetic: ZERO_BALANCE");

        // Calculate underlying to return
        amount = _kTokenToUnderlying(underlying, kTokenAmount);
        require(IERC20(underlying).balanceOf(address(this)) >= amount, "MockKinetic: INSUFFICIENT_LIQUIDITY");

        // Update total supply
        market.totalSupply -= amount;

        // Burn kTokens
        kToken.burn(msg.sender, kTokenAmount);

        // Transfer underlying to user
        IERC20(underlying).safeTransfer(msg.sender, amount);

        emit Withdraw(msg.sender, underlying, kTokenAmount, amount);
    }

    // =============================================================
    //                    CONVERSION FUNCTIONS
    // =============================================================

    /**
     * @notice Convert underlying amount to kToken amount
     */
    function _underlyingToKToken(address underlying, uint256 amount) internal view returns (uint256) {
        // kToken = underlying * 1e18 / exchangeRate
        return (amount * 1e18) / markets[underlying].exchangeRate;
    }

    /**
     * @notice Convert kToken amount to underlying amount
     */
    function _kTokenToUnderlying(address underlying, uint256 kTokenAmount) internal view returns (uint256) {
        // underlying = kToken * exchangeRate / 1e18
        return (kTokenAmount * markets[underlying].exchangeRate) / 1e18;
    }

    // =============================================================
    //                      VIEW FUNCTIONS
    // =============================================================

    /**
     * @notice Get market info for an underlying token
     */
    function getMarket(address underlying) external view returns (
        bool isListed,
        address kToken,
        uint256 exchangeRate,
        uint256 supplyAPY,
        uint256 totalSupply
    ) {
        Market storage market = markets[underlying];
        return (
            market.isListed,
            market.kToken,
            market.exchangeRate,
            market.supplyAPY,
            market.totalSupply
        );
    }

    /**
     * @notice Get the kToken address for an underlying
     */
    function getKToken(address underlying) external view returns (address) {
        return markets[underlying].kToken;
    }

    /**
     * @notice Get exchange rate for a market
     */
    function getExchangeRate(address underlying) external view returns (uint256) {
        return markets[underlying].exchangeRate;
    }

    /**
     * @notice Get supply APY for a market (in basis points)
     */
    function getSupplyAPY(address underlying) external view returns (uint256) {
        return markets[underlying].supplyAPY;
    }

    /**
     * @notice Preview supply: calculate kTokens for a given underlying amount
     */
    function previewSupply(address underlying, uint256 amount) external view returns (uint256) {
        require(markets[underlying].isListed, "MockKinetic: MARKET_NOT_LISTED");
        return _underlyingToKToken(underlying, amount);
    }

    /**
     * @notice Preview withdraw: calculate underlying for a given kToken amount
     */
    function previewWithdraw(address underlying, uint256 kTokenAmount) external view returns (uint256) {
        require(markets[underlying].isListed, "MockKinetic: MARKET_NOT_LISTED");
        return _kTokenToUnderlying(underlying, kTokenAmount);
    }

    /**
     * @notice Get underlying balance for a user (converts their kToken balance)
     */
    function underlyingBalanceOf(address underlying, address user) external view returns (uint256) {
        Market storage market = markets[underlying];
        if (!market.isListed) return 0;
        uint256 kTokenBalance = MockKToken(market.kToken).balanceOf(user);
        return _kTokenToUnderlying(underlying, kTokenBalance);
    }

    /**
     * @notice Get all listed markets
     */
    function getAllMarkets() external view returns (address[] memory) {
        return allMarkets;
    }

    // =============================================================
    //                      ADMIN FUNCTIONS
    // =============================================================

    /**
     * @notice List a new market for an underlying token
     * @param underlying The underlying token address
     * @param kTokenName Name for the kToken
     * @param kTokenSymbol Symbol for the kToken
     * @param initialExchangeRate Initial exchange rate (1e18 = 1:1)
     * @param initialAPY Initial APY in basis points
     */
    function listMarket(
        address underlying,
        string memory kTokenName,
        string memory kTokenSymbol,
        uint256 initialExchangeRate,
        uint256 initialAPY
    ) external onlyOwner returns (address kToken) {
        require(!markets[underlying].isListed, "MockKinetic: MARKET_EXISTS");
        require(underlying != address(0), "MockKinetic: ZERO_ADDRESS");
        require(initialExchangeRate > 0, "MockKinetic: ZERO_RATE");

        // Deploy kToken
        kToken = address(new MockKToken(
            kTokenName,
            kTokenSymbol,
            underlying,
            address(this)
        ));

        // Create market
        markets[underlying] = Market({
            isListed: true,
            kToken: kToken,
            exchangeRate: initialExchangeRate,
            supplyAPY: initialAPY,
            totalSupply: 0
        });

        allMarkets.push(underlying);

        emit MarketListed(underlying, kToken);
    }

    /**
     * @notice Update exchange rate for a market (simulates interest accrual)
     * @param underlying The underlying token address
     * @param newRate New exchange rate
     */
    function setExchangeRate(address underlying, uint256 newRate) external onlyOwner {
        Market storage market = markets[underlying];
        require(market.isListed, "MockKinetic: MARKET_NOT_LISTED");
        require(newRate > 0, "MockKinetic: ZERO_RATE");

        uint256 oldRate = market.exchangeRate;
        market.exchangeRate = newRate;

        emit ExchangeRateUpdated(underlying, oldRate, newRate);
    }

    /**
     * @notice Simulate interest accrual
     * @param underlying The underlying token address
     * @param yieldBps Yield to add in basis points
     */
    function accrueInterest(address underlying, uint256 yieldBps) external onlyOwner {
        Market storage market = markets[underlying];
        require(market.isListed, "MockKinetic: MARKET_NOT_LISTED");

        uint256 oldRate = market.exchangeRate;
        market.exchangeRate = (market.exchangeRate * (10000 + yieldBps)) / 10000;

        emit ExchangeRateUpdated(underlying, oldRate, market.exchangeRate);
    }

    /**
     * @notice Update supply APY for display
     * @param underlying The underlying token address
     * @param newAPY New APY in basis points
     */
    function setSupplyAPY(address underlying, uint256 newAPY) external onlyOwner {
        Market storage market = markets[underlying];
        require(market.isListed, "MockKinetic: MARKET_NOT_LISTED");

        uint256 oldAPY = market.supplyAPY;
        market.supplyAPY = newAPY;

        emit APYUpdated(underlying, oldAPY, newAPY);
    }

    /**
     * @notice Rescue tokens accidentally sent to the contract
     */
    function rescueTokens(address token, address to, uint256 amount) external onlyOwner {
        IERC20(token).safeTransfer(to, amount);
    }
}
