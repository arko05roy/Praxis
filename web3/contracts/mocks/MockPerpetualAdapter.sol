// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

import {IPerpetualAdapter} from "../interfaces/IPerpetualAdapter.sol";
import {PraxisStructs} from "../lib/PraxisStructs.sol";
import {IERC20} from "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import {SafeERC20} from "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";

/**
 * @title MockPerpetualAdapter
 * @notice Mock adapter for testing PerpetualRouter
 */
contract MockPerpetualAdapter is IPerpetualAdapter {
    using SafeERC20 for IERC20;

    string private _name;
    address private _protocol;
    address private _collateralToken;

    // Mock values
    bytes32[] private _markets;
    mapping(bytes32 => bool) private _marketSupported;
    mapping(bytes32 => PraxisStructs.PerpMarket) private _marketInfo;
    mapping(bytes32 => PraxisStructs.PerpPosition) private _positions;

    uint256 public nextPositionNonce;
    int256 public mockFundingRate;
    uint256 public mockIndexPrice;
    uint256 public mockLiquidationPrice;
    uint256 public mockHealthFactor;
    int256 public mockUnrealizedPnl;
    int256 public mockClosePnl;
    uint256 public mockMinMargin;
    uint256 public mockEntryPrice;
    uint256 public mockPriceImpact;

    constructor(string memory name_, address collateralToken_) {
        _name = name_;
        _protocol = address(this);
        _collateralToken = collateralToken_;

        // Set default mock values
        mockFundingRate = 10; // 0.1% per hour
        mockIndexPrice = 50000e8; // $50,000
        mockLiquidationPrice = 45000e8; // $45,000
        mockHealthFactor = 2e18; // Health factor of 2
        mockUnrealizedPnl = 100e6; // $100 profit
        mockClosePnl = 100e6;
        mockMinMargin = 100e6; // $100 minimum
        mockEntryPrice = 50000e8;
        mockPriceImpact = 10; // 0.1% price impact
    }

    // =============================================================
    //                         VIEW FUNCTIONS
    // =============================================================

    function name() external view override returns (string memory) {
        return _name;
    }

    function protocol() external view override returns (address) {
        return _protocol;
    }

    function collateralToken() external view override returns (address) {
        return _collateralToken;
    }

    function isMarketSupported(bytes32 market) external view override returns (bool) {
        return _marketSupported[market];
    }

    function getMarketInfo(
        bytes32 market
    ) external view override returns (PraxisStructs.PerpMarket memory) {
        return _marketInfo[market];
    }

    function getFundingRate(bytes32) external view override returns (int256) {
        return mockFundingRate;
    }

    function getIndexPrice(bytes32) external view override returns (uint256) {
        return mockIndexPrice;
    }

    function getAvailableMarkets() external view override returns (bytes32[] memory) {
        return _markets;
    }

    // =============================================================
    //                      POSITION QUERIES
    // =============================================================

    function getPosition(
        bytes32 positionId
    ) external view override returns (PraxisStructs.PerpPosition memory) {
        return _positions[positionId];
    }

    function getUserPositions(
        address,
        bytes32
    ) external pure override returns (PraxisStructs.PerpPosition[] memory) {
        return new PraxisStructs.PerpPosition[](0);
    }

    function getLiquidationPrice(bytes32) external view override returns (uint256) {
        return mockLiquidationPrice;
    }

    function getPositionHealthFactor(bytes32) external view override returns (uint256) {
        return mockHealthFactor;
    }

    function getUnrealizedPnl(bytes32) external view override returns (int256) {
        return mockUnrealizedPnl;
    }

    function getMinimumMargin(bytes32) external view override returns (uint256) {
        return mockMinMargin;
    }

    // =============================================================
    //                    POSITION MANAGEMENT
    // =============================================================

    function openPosition(
        bytes32 market,
        uint256 collateral,
        uint256 size,
        uint256 leverage,
        bool isLong,
        address onBehalfOf
    ) external override returns (bytes32 positionId) {
        // Pull collateral
        IERC20(_collateralToken).safeTransferFrom(msg.sender, address(this), collateral);

        // Generate position ID
        positionId = keccak256(abi.encodePacked(
            onBehalfOf,
            market,
            nextPositionNonce++
        ));

        // Store position
        _positions[positionId] = PraxisStructs.PerpPosition({
            positionId: positionId,
            market: market,
            user: onBehalfOf,
            side: isLong ? PraxisStructs.PositionSide.LONG : PraxisStructs.PositionSide.SHORT,
            size: size,
            collateral: collateral,
            leverage: leverage,
            entryPrice: mockEntryPrice,
            liquidationPrice: mockLiquidationPrice,
            unrealizedPnl: mockUnrealizedPnl,
            fundingAccrued: 0
        });

        return positionId;
    }

    function closePosition(
        bytes32 positionId,
        address to
    ) external override returns (int256 pnl) {
        PraxisStructs.PerpPosition memory pos = _positions[positionId];

        // Return collateral + pnl to recipient
        uint256 returnAmount = pos.collateral;
        if (mockClosePnl > 0) {
            returnAmount += uint256(mockClosePnl);
        } else if (mockClosePnl < 0 && uint256(-mockClosePnl) < pos.collateral) {
            returnAmount = pos.collateral - uint256(-mockClosePnl);
        }

        if (returnAmount > 0) {
            IERC20(_collateralToken).safeTransfer(to, returnAmount);
        }

        delete _positions[positionId];
        return mockClosePnl;
    }

    function partialClose(
        bytes32 positionId,
        uint256,
        address to
    ) external override returns (int256 pnl) {
        PraxisStructs.PerpPosition storage pos = _positions[positionId];

        // For mock, just return some funds
        uint256 returnAmount = pos.collateral / 2;
        IERC20(_collateralToken).safeTransfer(to, returnAmount);

        pos.collateral -= returnAmount;
        pos.size = pos.size / 2;

        return mockClosePnl / 2;
    }

    // =============================================================
    //                     MARGIN MANAGEMENT
    // =============================================================

    function addMargin(bytes32 positionId, uint256 amount) external override {
        IERC20(_collateralToken).safeTransferFrom(msg.sender, address(this), amount);
        _positions[positionId].collateral += amount;
    }

    function removeMargin(
        bytes32 positionId,
        uint256 amount,
        address to
    ) external override {
        _positions[positionId].collateral -= amount;
        IERC20(_collateralToken).safeTransfer(to, amount);
    }

    // =============================================================
    //                         ESTIMATES
    // =============================================================

    function estimateEntryPrice(
        bytes32,
        uint256,
        bool
    ) external view override returns (uint256 entryPrice, uint256 priceImpact) {
        return (mockEntryPrice, mockPriceImpact);
    }

    function estimateExitPrice(
        bytes32
    ) external view override returns (uint256 exitPrice, uint256 priceImpact) {
        return (mockEntryPrice, mockPriceImpact);
    }

    function calculateLiquidationPrice(
        bytes32,
        uint256,
        uint256,
        uint256,
        bool,
        uint256
    ) external view override returns (uint256) {
        return mockLiquidationPrice;
    }

    // =============================================================
    //                         MOCK SETTERS
    // =============================================================

    function addMarket(
        bytes32 marketId,
        string memory marketName,
        uint256 maxLeverage
    ) external {
        _markets.push(marketId);
        _marketSupported[marketId] = true;
        _marketInfo[marketId] = PraxisStructs.PerpMarket({
            marketId: marketId,
            name: marketName,
            maxLeverage: maxLeverage,
            openInterest: 0,
            fundingRate: mockFundingRate,
            indexPrice: mockIndexPrice
        });
    }

    function setFundingRate(int256 rate) external {
        mockFundingRate = rate;
    }

    function setIndexPrice(uint256 price) external {
        mockIndexPrice = price;
    }

    function setLiquidationPrice(uint256 price) external {
        mockLiquidationPrice = price;
    }

    function setHealthFactor(uint256 factor) external {
        mockHealthFactor = factor;
    }

    function setUnrealizedPnl(int256 pnl) external {
        mockUnrealizedPnl = pnl;
    }

    function setClosePnl(int256 pnl) external {
        mockClosePnl = pnl;
    }

    function setEntryPrice(uint256 price) external {
        mockEntryPrice = price;
    }

    function setPriceImpact(uint256 impact) external {
        mockPriceImpact = impact;
    }
}
