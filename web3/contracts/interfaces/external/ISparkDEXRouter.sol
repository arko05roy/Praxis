// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

/**
 * @title ISparkDEXRouter
 * @notice Interface for SparkDEX V3 SwapRouter (Uniswap V3 style)
 * @dev Based on Uniswap V3 SwapRouter interface
 */
interface ISparkDEXRouter {
    struct ExactInputSingleParams {
        address tokenIn;
        address tokenOut;
        uint24 fee;
        address recipient;
        uint256 deadline;
        uint256 amountIn;
        uint256 amountOutMinimum;
        uint160 sqrtPriceLimitX96;
    }

    struct ExactInputParams {
        bytes path;
        address recipient;
        uint256 deadline;
        uint256 amountIn;
        uint256 amountOutMinimum;
    }

    struct ExactOutputSingleParams {
        address tokenIn;
        address tokenOut;
        uint24 fee;
        address recipient;
        uint256 deadline;
        uint256 amountOut;
        uint256 amountInMaximum;
        uint160 sqrtPriceLimitX96;
    }

    struct ExactOutputParams {
        bytes path;
        address recipient;
        uint256 deadline;
        uint256 amountOut;
        uint256 amountInMaximum;
    }

    /**
     * @notice Swaps `amountIn` of one token for as much as possible of another token
     * @param params The parameters necessary for the swap, encoded as `ExactInputSingleParams`
     * @return amountOut The amount of the received token
     */
    function exactInputSingle(
        ExactInputSingleParams calldata params
    ) external payable returns (uint256 amountOut);

    /**
     * @notice Swaps `amountIn` of one token for as much as possible of another along the specified path
     * @param params The parameters necessary for the multi-hop swap, encoded as `ExactInputParams`
     * @return amountOut The amount of the received token
     */
    function exactInput(
        ExactInputParams calldata params
    ) external payable returns (uint256 amountOut);

    /**
     * @notice Swaps as little as possible of one token for `amountOut` of another token
     * @param params The parameters necessary for the swap, encoded as `ExactOutputSingleParams`
     * @return amountIn The amount of the input token
     */
    function exactOutputSingle(
        ExactOutputSingleParams calldata params
    ) external payable returns (uint256 amountIn);

    /**
     * @notice Swaps as little as possible of one token for `amountOut` of another along the specified path
     * @param params The parameters necessary for the multi-hop swap, encoded as `ExactOutputParams`
     * @return amountIn The amount of the input token
     */
    function exactOutput(
        ExactOutputParams calldata params
    ) external payable returns (uint256 amountIn);

    /**
     * @notice Returns the address of the WETH9 contract
     */
    function WETH9() external view returns (address);

    /**
     * @notice Returns the address of the factory
     */
    function factory() external view returns (address);
}
