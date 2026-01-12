// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

import {IAdapter} from "../adapters/IAdapter.sol";
import {IERC20} from "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import {SafeERC20} from "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import {Ownable} from "@openzeppelin/contracts/access/Ownable.sol";
import {ReentrancyGuard} from "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import {PraxisStructs} from "../lib/PraxisStructs.sol";
import {PraxisErrors} from "../lib/PraxisErrors.sol";
import {PraxisEvents} from "../lib/PraxisEvents.sol";

/**
 * @title SwapRouter
 * @notice DEX aggregator that finds the best rates across multiple adapters
 * @dev Queries all registered adapters for quotes and executes through the best route
 */
contract SwapRouter is Ownable, ReentrancyGuard {
    using SafeERC20 for IERC20;

    /// @notice Array of registered adapters
    address[] public adapters;

    /// @notice Mapping to check if an adapter is registered
    mapping(address => bool) public isRegisteredAdapter;

    /// @notice Maximum number of adapters to prevent gas issues
    uint256 public constant MAX_ADAPTERS = 20;

    /// @notice Events
    event AdapterAdded(address indexed adapter, string name);
    event AdapterRemoved(address indexed adapter);
    event SwapExecuted(
        address indexed user,
        address indexed tokenIn,
        address indexed tokenOut,
        uint256 amountIn,
        uint256 amountOut,
        address adapter
    );

    /**
     * @notice Constructor
     */
    constructor() Ownable(msg.sender) {}

    /**
     * @notice Add an adapter to the registry
     * @param adapter Address of the adapter to add
     */
    function addAdapter(address adapter) external onlyOwner {
        if (adapter == address(0)) revert PraxisErrors.ZeroAddress();
        if (isRegisteredAdapter[adapter]) revert PraxisErrors.InvalidAdapter();
        if (adapters.length >= MAX_ADAPTERS) {
            revert PraxisErrors.ArrayLengthMismatch(MAX_ADAPTERS, adapters.length + 1);
        }

        adapters.push(adapter);
        isRegisteredAdapter[adapter] = true;

        string memory adapterName = IAdapter(adapter).name();
        emit AdapterAdded(adapter, adapterName);
    }

    /**
     * @notice Remove an adapter from the registry
     * @param adapter Address of the adapter to remove
     */
    function removeAdapter(address adapter) external onlyOwner {
        if (!isRegisteredAdapter[adapter]) revert PraxisErrors.InvalidAdapter();

        // Find and remove the adapter
        for (uint256 i = 0; i < adapters.length; i++) {
            if (adapters[i] == adapter) {
                // Move the last element to this position and pop
                adapters[i] = adapters[adapters.length - 1];
                adapters.pop();
                break;
            }
        }

        isRegisteredAdapter[adapter] = false;
        emit AdapterRemoved(adapter);
    }

    /**
     * @notice Get quotes from all adapters for a swap
     * @param tokenIn Address of input token
     * @param tokenOut Address of output token
     * @param amountIn Amount of input token
     * @return quotes Array of quotes from each adapter
     */
    function getAllQuotes(
        address tokenIn,
        address tokenOut,
        uint256 amountIn
    ) external view returns (PraxisStructs.Quote[] memory quotes) {
        quotes = new PraxisStructs.Quote[](adapters.length);

        for (uint256 i = 0; i < adapters.length; i++) {
            IAdapter adapter = IAdapter(adapters[i]);

            try adapter.getQuote(tokenIn, tokenOut, amountIn) returns (
                uint256 amountOut,
                uint256 gasEstimate
            ) {
                quotes[i] = PraxisStructs.Quote({
                    adapter: adapters[i],
                    name: adapter.name(),
                    amountOut: amountOut,
                    gasEstimate: gasEstimate,
                    priceImpact: 0 // Would require additional calculation
                });
            } catch {
                // Adapter failed to quote, leave quote empty
                quotes[i] = PraxisStructs.Quote({
                    adapter: adapters[i],
                    name: adapter.name(),
                    amountOut: 0,
                    gasEstimate: 0,
                    priceImpact: 0
                });
            }
        }
    }

    /**
     * @notice Find the best route for a swap
     * @param tokenIn Address of input token
     * @param tokenOut Address of output token
     * @param amountIn Amount of input token
     * @return bestAdapter Address of the adapter with best rate
     * @return bestAmountOut Best output amount
     */
    function findBestRoute(
        address tokenIn,
        address tokenOut,
        uint256 amountIn
    ) external view returns (address bestAdapter, uint256 bestAmountOut) {
        bestAmountOut = 0;
        bestAdapter = address(0);

        for (uint256 i = 0; i < adapters.length; i++) {
            try IAdapter(adapters[i]).getQuote(tokenIn, tokenOut, amountIn) returns (
                uint256 amountOut,
                uint256 /* gasEstimate */
            ) {
                if (amountOut > bestAmountOut) {
                    bestAmountOut = amountOut;
                    bestAdapter = adapters[i];
                }
            } catch {
                // Skip failed quotes
                continue;
            }
        }
    }

    /**
     * @notice Execute a swap through the best route
     * @param tokenIn Address of input token
     * @param tokenOut Address of output token
     * @param amountIn Amount of input token to swap
     * @param minAmountOut Minimum acceptable output amount
     * @param deadline Transaction deadline timestamp
     * @return amountOut Actual output amount received
     */
    function swap(
        address tokenIn,
        address tokenOut,
        uint256 amountIn,
        uint256 minAmountOut,
        uint256 deadline
    ) external nonReentrant returns (uint256 amountOut) {
        // Check deadline
        if (block.timestamp > deadline) {
            revert PraxisErrors.DeadlineExpired(deadline, block.timestamp);
        }

        if (amountIn == 0) revert PraxisErrors.ZeroAmount();

        // Find best route
        (address bestAdapter, uint256 expectedOut) = this.findBestRoute(
            tokenIn,
            tokenOut,
            amountIn
        );

        if (bestAdapter == address(0) || expectedOut == 0) {
            revert PraxisErrors.NoRouteFound(tokenIn, tokenOut);
        }

        // Pull tokens from user to this contract
        IERC20(tokenIn).safeTransferFrom(msg.sender, address(this), amountIn);

        // Approve adapter to spend tokens
        IERC20(tokenIn).forceApprove(bestAdapter, amountIn);

        // Execute swap through best adapter
        amountOut = IAdapter(bestAdapter).swap(
            tokenIn,
            tokenOut,
            amountIn,
            minAmountOut,
            msg.sender, // Send directly to user
            "" // No extra data
        );

        // Verify output
        if (amountOut < minAmountOut) {
            revert PraxisErrors.InsufficientOutput(minAmountOut, amountOut);
        }

        emit SwapExecuted(
            msg.sender,
            tokenIn,
            tokenOut,
            amountIn,
            amountOut,
            bestAdapter
        );
    }

    /**
     * @notice Execute a swap through a specific adapter
     * @param adapter Address of the adapter to use
     * @param tokenIn Address of input token
     * @param tokenOut Address of output token
     * @param amountIn Amount of input token to swap
     * @param minAmountOut Minimum acceptable output amount
     * @param deadline Transaction deadline timestamp
     * @param extraData Additional data for the adapter
     * @return amountOut Actual output amount received
     */
    function swapViaAdapter(
        address adapter,
        address tokenIn,
        address tokenOut,
        uint256 amountIn,
        uint256 minAmountOut,
        uint256 deadline,
        bytes calldata extraData
    ) external nonReentrant returns (uint256 amountOut) {
        // Check deadline
        if (block.timestamp > deadline) {
            revert PraxisErrors.DeadlineExpired(deadline, block.timestamp);
        }

        if (!isRegisteredAdapter[adapter]) revert PraxisErrors.InvalidAdapter();
        if (amountIn == 0) revert PraxisErrors.ZeroAmount();

        // Pull tokens from user to this contract
        IERC20(tokenIn).safeTransferFrom(msg.sender, address(this), amountIn);

        // Approve adapter to spend tokens
        IERC20(tokenIn).forceApprove(adapter, amountIn);

        // Execute swap through specified adapter
        amountOut = IAdapter(adapter).swap(
            tokenIn,
            tokenOut,
            amountIn,
            minAmountOut,
            msg.sender,
            extraData
        );

        // Verify output
        if (amountOut < minAmountOut) {
            revert PraxisErrors.InsufficientOutput(minAmountOut, amountOut);
        }

        emit SwapExecuted(
            msg.sender,
            tokenIn,
            tokenOut,
            amountIn,
            amountOut,
            adapter
        );
    }

    /**
     * @notice Check if a token pair is supported by any adapter
     * @param tokenIn Address of input token
     * @param tokenOut Address of output token
     * @return supported True if at least one adapter supports the pair
     */
    function isPairSupported(
        address tokenIn,
        address tokenOut
    ) external view returns (bool supported) {
        for (uint256 i = 0; i < adapters.length; i++) {
            try IAdapter(adapters[i]).isPoolAvailable(tokenIn, tokenOut) returns (
                bool available
            ) {
                if (available) return true;
            } catch {
                continue;
            }
        }
        return false;
    }

    /**
     * @notice Get all registered adapters
     * @return Array of adapter addresses
     */
    function getAdapters() external view returns (address[] memory) {
        return adapters;
    }

    /**
     * @notice Get the number of registered adapters
     * @return Number of adapters
     */
    function getAdapterCount() external view returns (uint256) {
        return adapters.length;
    }

    /**
     * @notice Rescue tokens accidentally sent to this contract
     * @param token Token to rescue
     * @param to Address to send rescued tokens
     * @param amount Amount to rescue
     */
    function rescueTokens(
        address token,
        address to,
        uint256 amount
    ) external onlyOwner {
        if (to == address(0)) revert PraxisErrors.ZeroAddress();
        IERC20(token).safeTransfer(to, amount);
    }

    /**
     * @notice Receive native tokens
     */
    receive() external payable {}
}
