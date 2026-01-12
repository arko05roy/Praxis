// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

/**
 * @title IEnosysRouter
 * @notice Interface for Enosys DEX Router (Uniswap V3 style)
 * @dev Enosys V3 is a concentrated liquidity AMM on Flare
 */
interface IEnosysRouter {
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
     * @param params The parameters necessary for the swap
     * @return amountOut The amount of the received token
     */
    function exactInputSingle(
        ExactInputSingleParams calldata params
    ) external payable returns (uint256 amountOut);

    /**
     * @notice Swaps `amountIn` of one token for as much as possible of another along the specified path
     * @param params The parameters necessary for the multi-hop swap
     * @return amountOut The amount of the received token
     */
    function exactInput(
        ExactInputParams calldata params
    ) external payable returns (uint256 amountOut);

    /**
     * @notice Swaps as little as possible of one token for `amountOut` of another token
     * @param params The parameters necessary for the swap
     * @return amountIn The amount of the input token
     */
    function exactOutputSingle(
        ExactOutputSingleParams calldata params
    ) external payable returns (uint256 amountIn);

    /**
     * @notice Swaps as little as possible of one token for `amountOut` of another
     * @param params The parameters necessary for the multi-hop swap
     * @return amountIn The amount of the input token
     */
    function exactOutput(
        ExactOutputParams calldata params
    ) external payable returns (uint256 amountIn);

    /**
     * @notice Returns the address of WETH9
     */
    function WETH9() external view returns (address);

    /**
     * @notice Returns the address of the factory
     */
    function factory() external view returns (address);
}
