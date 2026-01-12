// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

import {BaseAdapter} from "./BaseAdapter.sol";
import {IBlazeSwapRouter} from "../interfaces/external/IBlazeSwapRouter.sol";
import {IBlazeSwapFactory} from "../interfaces/external/IBlazeSwapFactory.sol";
import {IERC20} from "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import {SafeERC20} from "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import {PraxisErrors} from "../lib/PraxisErrors.sol";

/**
 * @title BlazeSwapAdapter
 * @notice Adapter for BlazeSwap (Uniswap V2 style DEX on Flare)
 * @dev Implements swaps using constant product AMM (x*y=k)
 */
contract BlazeSwapAdapter is BaseAdapter {
    using SafeERC20 for IERC20;

    /// @notice BlazeSwap Factory contract
    IBlazeSwapFactory public immutable factory;

    /// @notice WETH/WFLR address
    address public immutable weth;

    /**
     * @notice Constructor
     * @param router_ BlazeSwap Router address
     * @param factory_ BlazeSwap Factory address
     * @param weth_ WETH/WFLR address for routing
     */
    constructor(
        address router_,
        address factory_,
        address weth_
    ) BaseAdapter("BlazeSwap", router_) {
        if (factory_ == address(0)) revert PraxisErrors.ZeroAddress();
        if (weth_ == address(0)) revert PraxisErrors.ZeroAddress();

        factory = IBlazeSwapFactory(factory_);
        weth = weth_;
    }

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
    ) external view override returns (uint256 amountOut, uint256 gasEstimate) {
        if (amountIn == 0) return (0, 0);

        // Build path
        address[] memory path = _buildPath(tokenIn, tokenOut);

        // Check if direct pair exists
        if (path.length == 0) {
            return (0, 0);
        }

        // Get amounts out
        try IBlazeSwapRouter(_getRouter()).getAmountsOut(amountIn, path) returns (
            uint256[] memory amounts
        ) {
            amountOut = amounts[amounts.length - 1];
            // V2 swaps are generally cheaper than V3
            gasEstimate = path.length == 2 ? 150000 : 250000;
        } catch {
            return (0, 0);
        }
    }

    /**
     * @notice Execute a token swap
     * @param tokenIn Address of input token
     * @param tokenOut Address of output token
     * @param amountIn Amount of input token to swap
     * @param minAmountOut Minimum acceptable output amount
     * @param to Address to receive the output tokens
     * @param extraData Unused for V2 swaps
     * @return amountOut Actual output amount received
     */
    function swap(
        address tokenIn,
        address tokenOut,
        uint256 amountIn,
        uint256 minAmountOut,
        address to,
        bytes calldata extraData
    ) external override nonReentrant returns (uint256 amountOut) {
        // Suppress unused parameter warning
        extraData;

        if (amountIn == 0) revert PraxisErrors.ZeroAmount();
        if (to == address(0)) revert PraxisErrors.ZeroAddress();

        // Build path
        address[] memory path = _buildPath(tokenIn, tokenOut);
        if (path.length == 0) {
            revert PraxisErrors.NoRouteFound(tokenIn, tokenOut);
        }

        // Pull tokens from caller
        _pullTokens(tokenIn, msg.sender, amountIn);

        // Approve router
        _approveToken(tokenIn, amountIn);

        // Execute swap
        uint256[] memory amounts = IBlazeSwapRouter(_getRouter())
            .swapExactTokensForTokens(
                amountIn,
                minAmountOut,
                path,
                to,
                block.timestamp
            );

        amountOut = amounts[amounts.length - 1];

        // Verify output
        if (amountOut < minAmountOut) {
            revert PraxisErrors.InsufficientOutput(minAmountOut, amountOut);
        }

        return amountOut;
    }

    /**
     * @notice Check if a pool exists for the token pair
     * @param tokenIn Address of input token
     * @param tokenOut Address of output token
     * @return supported True if a pool exists (direct or via WETH)
     */
    function isPoolAvailable(
        address tokenIn,
        address tokenOut
    ) external view override returns (bool supported) {
        // Check direct pair
        address directPair = factory.getPair(tokenIn, tokenOut);
        if (directPair != address(0)) {
            return true;
        }

        // Check if both can route through WETH
        if (tokenIn != weth && tokenOut != weth) {
            address pairIn = factory.getPair(tokenIn, weth);
            address pairOut = factory.getPair(weth, tokenOut);
            if (pairIn != address(0) && pairOut != address(0)) {
                return true;
            }
        }

        return false;
    }

    /**
     * @notice Build the swap path between two tokens
     * @param tokenIn Input token
     * @param tokenOut Output token
     * @return path Array of token addresses for the swap path
     */
    function _buildPath(
        address tokenIn,
        address tokenOut
    ) internal view returns (address[] memory path) {
        // Check for direct pair
        address directPair = factory.getPair(tokenIn, tokenOut);
        if (directPair != address(0)) {
            path = new address[](2);
            path[0] = tokenIn;
            path[1] = tokenOut;
            return path;
        }

        // Try routing through WETH if no direct pair
        if (tokenIn != weth && tokenOut != weth) {
            address pairIn = factory.getPair(tokenIn, weth);
            address pairOut = factory.getPair(weth, tokenOut);

            if (pairIn != address(0) && pairOut != address(0)) {
                path = new address[](3);
                path[0] = tokenIn;
                path[1] = weth;
                path[2] = tokenOut;
                return path;
            }
        }

        // No route found - return empty array
        return new address[](0);
    }

    /**
     * @notice Get the WETH address used by this adapter
     * @return WETH address
     */
    function getWETH() external view returns (address) {
        return weth;
    }

    /**
     * @notice Get the direct pair address for two tokens
     * @param tokenA First token
     * @param tokenB Second token
     * @return pair Pair address (zero if doesn't exist)
     */
    function getPair(
        address tokenA,
        address tokenB
    ) external view returns (address pair) {
        return factory.getPair(tokenA, tokenB);
    }
}
