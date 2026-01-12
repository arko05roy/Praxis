// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

/**
 * @title IBlazeSwapRouter
 * @notice Interface for BlazeSwap Router (Uniswap V2 style)
 * @dev BlazeSwap is a Uniswap V2 fork on Flare with FTSO integration
 */
interface IBlazeSwapRouter {
    /**
     * @notice Swap exact tokens for tokens
     * @param amountIn The amount of input tokens to send
     * @param amountOutMin The minimum amount of output tokens that must be received
     * @param path An array of token addresses representing the swap path
     * @param to Recipient of the output tokens
     * @param deadline Unix timestamp after which the transaction will revert
     * @return amounts The input token amount and all subsequent output token amounts
     */
    function swapExactTokensForTokens(
        uint256 amountIn,
        uint256 amountOutMin,
        address[] calldata path,
        address to,
        uint256 deadline
    ) external returns (uint256[] memory amounts);

    /**
     * @notice Swap tokens for exact tokens
     * @param amountOut The amount of output tokens to receive
     * @param amountInMax The maximum amount of input tokens that can be spent
     * @param path An array of token addresses representing the swap path
     * @param to Recipient of the output tokens
     * @param deadline Unix timestamp after which the transaction will revert
     * @return amounts The input token amount and all subsequent output token amounts
     */
    function swapTokensForExactTokens(
        uint256 amountOut,
        uint256 amountInMax,
        address[] calldata path,
        address to,
        uint256 deadline
    ) external returns (uint256[] memory amounts);

    /**
     * @notice Swap exact ETH for tokens
     * @param amountOutMin The minimum amount of output tokens that must be received
     * @param path An array of token addresses representing the swap path (first must be WETH)
     * @param to Recipient of the output tokens
     * @param deadline Unix timestamp after which the transaction will revert
     * @return amounts The input token amount and all subsequent output token amounts
     */
    function swapExactETHForTokens(
        uint256 amountOutMin,
        address[] calldata path,
        address to,
        uint256 deadline
    ) external payable returns (uint256[] memory amounts);

    /**
     * @notice Swap exact tokens for ETH
     * @param amountIn The amount of input tokens to send
     * @param amountOutMin The minimum amount of ETH that must be received
     * @param path An array of token addresses representing the swap path (last must be WETH)
     * @param to Recipient of the ETH
     * @param deadline Unix timestamp after which the transaction will revert
     * @return amounts The input token amount and all subsequent output token amounts
     */
    function swapExactTokensForETH(
        uint256 amountIn,
        uint256 amountOutMin,
        address[] calldata path,
        address to,
        uint256 deadline
    ) external returns (uint256[] memory amounts);

    /**
     * @notice Given an input amount of an asset and pair reserves, returns the maximum output amount
     * @param amountIn The input amount
     * @param reserveIn The reserve of the input token
     * @param reserveOut The reserve of the output token
     * @return amountOut The maximum output amount
     */
    function getAmountOut(
        uint256 amountIn,
        uint256 reserveIn,
        uint256 reserveOut
    ) external pure returns (uint256 amountOut);

    /**
     * @notice Given an output amount of an asset and pair reserves, returns the required input amount
     * @param amountOut The output amount
     * @param reserveIn The reserve of the input token
     * @param reserveOut The reserve of the output token
     * @return amountIn The required input amount
     */
    function getAmountIn(
        uint256 amountOut,
        uint256 reserveIn,
        uint256 reserveOut
    ) external pure returns (uint256 amountIn);

    /**
     * @notice Given an input amount and a path, returns all output amounts
     * @param amountIn The input amount
     * @param path An array of token addresses representing the swap path
     * @return amounts The output amounts for each hop in the path
     */
    function getAmountsOut(
        uint256 amountIn,
        address[] calldata path
    ) external view returns (uint256[] memory amounts);

    /**
     * @notice Given an output amount and a path, returns all input amounts
     * @param amountOut The output amount
     * @param path An array of token addresses representing the swap path
     * @return amounts The input amounts for each hop in the path
     */
    function getAmountsIn(
        uint256 amountOut,
        address[] calldata path
    ) external view returns (uint256[] memory amounts);

    /**
     * @notice Returns the address of the factory
     */
    function factory() external view returns (address);

    /**
     * @notice Returns the address of WETH
     */
    function WETH() external view returns (address);
}
