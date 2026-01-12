// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

import {BaseAdapter} from "./BaseAdapter.sol";
import {IEnosysRouter} from "../interfaces/external/IEnosysRouter.sol";
import {ISparkDEXQuoter} from "../interfaces/external/ISparkDEXQuoter.sol";
import {IUniswapV3Factory} from "../interfaces/external/IUniswapV3Factory.sol";
import {IERC20} from "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import {SafeERC20} from "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import {PraxisErrors} from "../lib/PraxisErrors.sol";

/**
 * @title EnosysAdapter
 * @notice Adapter for Enosys DEX V3 (concentrated liquidity DEX on Flare)
 * @dev Implements swaps using Uniswap V3 style interface
 *      Enosys V3 uses the same interface as Uniswap V3
 */
contract EnosysAdapter is BaseAdapter {
    using SafeERC20 for IERC20;

    /// @notice Enosys V3 Quoter contract (same interface as Uniswap V3 QuoterV2)
    ISparkDEXQuoter public immutable quoter;

    /// @notice Enosys V3 Factory contract
    IUniswapV3Factory public immutable factory;

    /// @notice Default fee tier (3000 = 0.3%)
    uint24 public defaultFeeTier;

    /// @notice Available fee tiers on Enosys V3
    uint24[] public feeTiers;

    /// @notice Events
    event DefaultFeeTierUpdated(uint24 oldFee, uint24 newFee);

    /**
     * @notice Constructor
     * @param router_ Enosys V3 SwapRouter address
     * @param quoter_ Enosys V3 QuoterV2 address
     * @param factory_ Enosys V3 Factory address
     */
    constructor(
        address router_,
        address quoter_,
        address factory_
    ) BaseAdapter("Enosys V3", router_) {
        if (quoter_ == address(0)) revert PraxisErrors.ZeroAddress();
        if (factory_ == address(0)) revert PraxisErrors.ZeroAddress();

        quoter = ISparkDEXQuoter(quoter_);
        factory = IUniswapV3Factory(factory_);
        defaultFeeTier = 3000; // 0.3% default

        // Initialize available fee tiers (same as Uniswap V3)
        feeTiers.push(100);   // 0.01%
        feeTiers.push(500);   // 0.05%
        feeTiers.push(3000);  // 0.3%
        feeTiers.push(10000); // 1%
    }

    /**
     * @notice Get a quote for swapping tokens
     * @dev Note: Uses staticcall internally to simulate the quote
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

        // Try each fee tier and find the best output
        uint256 bestAmountOut = 0;

        for (uint256 i = 0; i < feeTiers.length; i++) {
            uint24 fee = feeTiers[i];

            // Check if pool exists first
            address pool = factory.getPool(tokenIn, tokenOut, fee);
            if (pool == address(0)) continue;

            // Try to get quote using staticcall
            bytes memory quoteData = abi.encodeWithSelector(
                ISparkDEXQuoter.quoteExactInputSingle.selector,
                ISparkDEXQuoter.QuoteExactInputSingleParams({
                    tokenIn: tokenIn,
                    tokenOut: tokenOut,
                    amountIn: amountIn,
                    fee: fee,
                    sqrtPriceLimitX96: 0
                })
            );

            // Use staticcall to simulate the quote
            (bool success, bytes memory returnData) = address(quoter).staticcall(quoteData);

            if (success && returnData.length >= 32) {
                // Decode the amountOut from the return data
                (uint256 quotedAmount, , , ) = abi.decode(
                    returnData,
                    (uint256, uint160, uint32, uint256)
                );

                if (quotedAmount > bestAmountOut) {
                    bestAmountOut = quotedAmount;
                }
            }
        }

        return (bestAmountOut, DEFAULT_GAS_ESTIMATE);
    }

    /**
     * @notice Execute a token swap
     * @param tokenIn Address of input token
     * @param tokenOut Address of output token
     * @param amountIn Amount of input token to swap
     * @param minAmountOut Minimum acceptable output amount
     * @param to Address to receive the output tokens
     * @param extraData Fee tier encoded as uint24 (optional)
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
        if (amountIn == 0) revert PraxisErrors.ZeroAmount();
        if (to == address(0)) revert PraxisErrors.ZeroAddress();

        // Decode fee tier from extraData or use default
        uint24 fee = extraData.length >= 3
            ? abi.decode(extraData, (uint24))
            : defaultFeeTier;

        // Pull tokens from caller
        _pullTokens(tokenIn, msg.sender, amountIn);

        // Approve router
        _approveToken(tokenIn, amountIn);

        // Execute swap
        IEnosysRouter.ExactInputSingleParams memory params = IEnosysRouter
            .ExactInputSingleParams({
                tokenIn: tokenIn,
                tokenOut: tokenOut,
                fee: fee,
                recipient: to,
                deadline: block.timestamp,
                amountIn: amountIn,
                amountOutMinimum: minAmountOut,
                sqrtPriceLimitX96: 0 // No price limit
            });

        amountOut = IEnosysRouter(_getRouter()).exactInputSingle(params);

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
     * @return supported True if a pool exists
     */
    function isPoolAvailable(
        address tokenIn,
        address tokenOut
    ) external view override returns (bool supported) {
        // Check all fee tiers
        for (uint256 i = 0; i < feeTiers.length; i++) {
            address pool = factory.getPool(tokenIn, tokenOut, feeTiers[i]);
            if (pool != address(0)) {
                return true;
            }
        }
        return false;
    }

    /**
     * @notice Set the default fee tier
     * @param newFeeTier New default fee tier
     */
    function setDefaultFeeTier(uint24 newFeeTier) external onlyOwner {
        emit DefaultFeeTierUpdated(defaultFeeTier, newFeeTier);
        defaultFeeTier = newFeeTier;
    }

    /**
     * @notice Get all available fee tiers
     * @return Array of fee tiers
     */
    function getFeeTiers() external view returns (uint24[] memory) {
        return feeTiers;
    }

    /**
     * @notice Find the pool with best liquidity for given fee tier
     * @param tokenIn Input token
     * @param tokenOut Output token
     * @param fee Fee tier
     * @return pool Pool address
     */
    function getPoolForFeeTier(
        address tokenIn,
        address tokenOut,
        uint24 fee
    ) external view returns (address pool) {
        return factory.getPool(tokenIn, tokenOut, fee);
    }
}
