// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

/**
 * @title ISparkDEXQuoter
 * @notice Interface for SparkDEX V3 QuoterV2 (Uniswap V3 style)
 * @dev Quotes return additional information useful for calculating optimal swap amounts
 */
interface ISparkDEXQuoter {
    /**
     * @notice Parameters for quoting exact input single swap
     */
    struct QuoteExactInputSingleParams {
        address tokenIn;
        address tokenOut;
        uint256 amountIn;
        uint24 fee;
        uint160 sqrtPriceLimitX96;
    }

    /**
     * @notice Parameters for quoting exact output single swap
     */
    struct QuoteExactOutputSingleParams {
        address tokenIn;
        address tokenOut;
        uint256 amount;
        uint24 fee;
        uint160 sqrtPriceLimitX96;
    }

    /**
     * @notice Returns the amount out received for a given exact input single swap without executing
     * @param params The params for the quote
     * @return amountOut The amount of tokenOut that would be received
     * @return sqrtPriceX96After The sqrt price of the pool after the swap
     * @return initializedTicksCrossed The number of initialized ticks crossed
     * @return gasEstimate The estimated gas for the swap
     */
    function quoteExactInputSingle(
        QuoteExactInputSingleParams memory params
    )
        external
        returns (
            uint256 amountOut,
            uint160 sqrtPriceX96After,
            uint32 initializedTicksCrossed,
            uint256 gasEstimate
        );

    /**
     * @notice Returns the amount out received for a given exact input but for a swap of multiple pools
     * @param path The path of the swap encoded as bytes
     * @param amountIn The amount of the first token to swap
     * @return amountOut The amount of the last token that would be received
     * @return sqrtPriceX96AfterList List of sqrt prices after each pool in the path
     * @return initializedTicksCrossedList List of initialized ticks crossed for each pool
     * @return gasEstimate The estimated gas for the swap
     */
    function quoteExactInput(
        bytes memory path,
        uint256 amountIn
    )
        external
        returns (
            uint256 amountOut,
            uint160[] memory sqrtPriceX96AfterList,
            uint32[] memory initializedTicksCrossedList,
            uint256 gasEstimate
        );

    /**
     * @notice Returns the amount in required for a given exact output single swap
     * @param params The params for the quote
     * @return amountIn The amount of tokenIn that would be required
     * @return sqrtPriceX96After The sqrt price of the pool after the swap
     * @return initializedTicksCrossed The number of initialized ticks crossed
     * @return gasEstimate The estimated gas for the swap
     */
    function quoteExactOutputSingle(
        QuoteExactOutputSingleParams memory params
    )
        external
        returns (
            uint256 amountIn,
            uint160 sqrtPriceX96After,
            uint32 initializedTicksCrossed,
            uint256 gasEstimate
        );

    /**
     * @notice Returns the amount in required for a given exact output but for a swap of multiple pools
     * @param path The path of the swap encoded as bytes
     * @param amountOut The amount of the last token to receive
     * @return amountIn The amount of first token required to be paid
     * @return sqrtPriceX96AfterList List of sqrt prices after each pool in the path
     * @return initializedTicksCrossedList List of initialized ticks crossed for each pool
     * @return gasEstimate The estimated gas for the swap
     */
    function quoteExactOutput(
        bytes memory path,
        uint256 amountOut
    )
        external
        returns (
            uint256 amountIn,
            uint160[] memory sqrtPriceX96AfterList,
            uint32[] memory initializedTicksCrossedList,
            uint256 gasEstimate
        );
}
