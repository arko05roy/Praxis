// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

/**
 * @title IAdapter
 * @notice Base interface for all DEX adapters in the PRAXIS protocol
 * @dev All DEX adapters must implement this interface
 */
interface IAdapter {
    /**
     * @notice Returns the name of the DEX this adapter connects to
     * @return name Human-readable name (e.g., "SparkDEX V3", "BlazeSwap")
     */
    function name() external view returns (string memory);

    /**
     * @notice Returns the address of the underlying DEX router
     * @return router Address of the DEX router contract
     */
    function router() external view returns (address);

    /**
     * @notice Get a quote for swapping tokens
     * @param tokenIn Address of input token
     * @param tokenOut Address of output token
     * @param amountIn Amount of input token
     * @return amountOut Expected output amount
     * @return gasEstimate Estimated gas cost for the swap
     */
    function getQuote(
        address tokenIn,
        address tokenOut,
        uint256 amountIn
    ) external view returns (uint256 amountOut, uint256 gasEstimate);

    /**
     * @notice Execute a token swap
     * @param tokenIn Address of input token
     * @param tokenOut Address of output token
     * @param amountIn Amount of input token to swap
     * @param minAmountOut Minimum acceptable output amount
     * @param to Address to receive the output tokens
     * @param extraData Additional adapter-specific data (e.g., fee tier, path)
     * @return amountOut Actual output amount received
     */
    function swap(
        address tokenIn,
        address tokenOut,
        uint256 amountIn,
        uint256 minAmountOut,
        address to,
        bytes calldata extraData
    ) external returns (uint256 amountOut);

    /**
     * @notice Check if a token pair is supported by this adapter
     * @param tokenIn Address of input token
     * @param tokenOut Address of output token
     * @return supported True if the pair is supported
     */
    function isPoolAvailable(
        address tokenIn,
        address tokenOut
    ) external view returns (bool supported);
}
