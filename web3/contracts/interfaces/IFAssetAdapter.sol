// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

import {PraxisStructs} from "../lib/PraxisStructs.sol";

/**
 * @title IFAssetAdapter
 * @notice Interface for FAssets adapter in the PRAXIS protocol
 * @dev Handles detection, querying, and integration of FAssets (FXRP, FBTC, FDOGE)
 *
 * FAssets are Flare's trustless, over-collateralized bridge tokens that enable
 * non-smart contract assets (XRP, BTC, DOGE) to participate in Flare DeFi.
 *
 * This adapter does NOT handle minting/redemption (which requires cross-chain
 * interaction via FDC proofs). Instead, it focuses on:
 * - Detecting if a token is an FAsset
 * - Querying FAsset information
 * - Supporting FAsset swaps via DEX integration
 */
interface IFAssetAdapter {
    // =============================================================
    //                           ERRORS
    // =============================================================

    /// @notice Thrown when an address is not a recognized FAsset
    error NotAnFAsset(address token);

    /// @notice Thrown when FAsset is not yet deployed
    error FAssetNotDeployed(string symbol);

    /// @notice Thrown when swap is not supported for the pair
    error SwapNotSupported(address tokenIn, address tokenOut);

    // =============================================================
    //                           EVENTS
    // =============================================================

    /// @notice Emitted when an FAsset is registered
    event FAssetRegistered(address indexed token, string symbol, string underlying);

    /// @notice Emitted when an FAsset swap is executed
    event FAssetSwapped(
        address indexed tokenIn,
        address indexed tokenOut,
        uint256 amountIn,
        uint256 amountOut,
        address indexed to
    );

    // =============================================================
    //                      DETECTION FUNCTIONS
    // =============================================================

    /**
     * @notice Check if an address is a registered FAsset token
     * @param token Address to check
     * @return isFAsset True if the address is an FAsset
     */
    function isFAsset(address token) external view returns (bool isFAsset);

    /**
     * @notice Get all registered FAsset addresses
     * @return fAssets Array of FAsset token addresses
     */
    function getAllFAssets() external view returns (address[] memory fAssets);

    /**
     * @notice Get the number of registered FAssets
     * @return count Number of FAssets
     */
    function getFAssetCount() external view returns (uint256 count);

    // =============================================================
    //                      INFO FUNCTIONS
    // =============================================================

    /**
     * @notice Get detailed information about an FAsset
     * @param token FAsset token address
     * @return info FAsset information struct
     */
    function getFAssetInfo(address token) external view returns (PraxisStructs.FAssetInfo memory info);

    /**
     * @notice Get the underlying asset symbol for an FAsset
     * @param token FAsset token address
     * @return underlying Underlying asset symbol (e.g., "XRP" for FXRP)
     */
    function getUnderlyingAsset(address token) external view returns (string memory underlying);

    /**
     * @notice Get the FAsset symbol
     * @param token FAsset token address
     * @return symbol FAsset symbol (e.g., "FXRP")
     */
    function getFAssetSymbol(address token) external view returns (string memory symbol);

    /**
     * @notice Get the FAsset decimals
     * @param token FAsset token address
     * @return decimals Token decimals
     */
    function getFAssetDecimals(address token) external view returns (uint8 decimals);

    /**
     * @notice Get the total supply of an FAsset
     * @param token FAsset token address
     * @return totalSupply Total minted FAssets
     */
    function getFAssetTotalSupply(address token) external view returns (uint256 totalSupply);

    /**
     * @notice Get balance of FAsset for an address
     * @param token FAsset token address
     * @param account Account to check
     * @return balance FAsset balance
     */
    function getFAssetBalance(address token, address account) external view returns (uint256 balance);

    // =============================================================
    //                      PRICE FUNCTIONS
    // =============================================================

    /**
     * @notice Get the USD price of an FAsset using FTSO
     * @dev Requires payment for FTSO feed fee
     * @param token FAsset token address
     * @return price Price in USD with 18 decimals
     * @return timestamp Price timestamp
     */
    function getFAssetPriceUSD(address token) external payable returns (uint256 price, uint256 timestamp);

    /**
     * @notice Get the value of an amount of FAsset in USD
     * @dev Requires payment for FTSO feed fee
     * @param token FAsset token address
     * @param amount Amount of FAsset
     * @return valueUSD Value in USD with 18 decimals
     */
    function getFAssetValueUSD(address token, uint256 amount) external payable returns (uint256 valueUSD);

    // =============================================================
    //                      DEX INTEGRATION
    // =============================================================

    /**
     * @notice Check if a swap pair involving FAsset is supported
     * @param tokenIn Input token (can be FAsset or other token)
     * @param tokenOut Output token (can be FAsset or other token)
     * @return supported True if the pair can be swapped
     */
    function isSwapSupported(address tokenIn, address tokenOut) external view returns (bool supported);

    /**
     * @notice Get a quote for swapping an FAsset
     * @param tokenIn Input token address
     * @param tokenOut Output token address
     * @param amountIn Amount of input token
     * @return amountOut Expected output amount
     * @return route Best route for the swap (via which DEX)
     */
    function getSwapQuote(
        address tokenIn,
        address tokenOut,
        uint256 amountIn
    ) external view returns (uint256 amountOut, string memory route);

    /**
     * @notice Execute a swap involving an FAsset
     * @param tokenIn Input token address
     * @param tokenOut Output token address
     * @param amountIn Amount of input token
     * @param minAmountOut Minimum acceptable output amount
     * @param to Address to receive output tokens
     * @return amountOut Actual output amount received
     */
    function swap(
        address tokenIn,
        address tokenOut,
        uint256 amountIn,
        uint256 minAmountOut,
        address to
    ) external returns (uint256 amountOut);

    // =============================================================
    //                      LIQUIDITY INFO
    // =============================================================

    /**
     * @notice Get available DEX liquidity for an FAsset pair
     * @param fAsset FAsset token address
     * @param pairedToken Token paired with the FAsset
     * @return liquidity Available liquidity in USD
     */
    function getPairLiquidity(
        address fAsset,
        address pairedToken
    ) external view returns (uint256 liquidity);

    /**
     * @notice Get best available liquidity pools for an FAsset
     * @param fAsset FAsset token address
     * @return pools Array of pool addresses
     * @return liquidities Array of liquidity amounts (in USD)
     */
    function getBestPools(
        address fAsset
    ) external view returns (address[] memory pools, uint256[] memory liquidities);
}
