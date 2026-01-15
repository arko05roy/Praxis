// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

import {IERC20} from "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import {SafeERC20} from "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";

/**
 * @title MockSwapRouter
 * @notice Mock SwapRouter for testing FAssetsAdapter
 */
contract MockSwapRouter {
    using SafeERC20 for IERC20;

    // Mock values
    bool public mockPairSupported;
    address public mockBestAdapter;
    uint256 public mockBestAmountOut;
    uint256 public mockSwapAmountOut;

    constructor() {
        mockPairSupported = true;
        mockBestAdapter = address(this);
        mockBestAmountOut = 100 ether;
        mockSwapAmountOut = 100 ether;
    }

    function setPairSupported(bool supported) external {
        mockPairSupported = supported;
    }

    function setBestRoute(address adapter, uint256 amountOut) external {
        mockBestAdapter = adapter;
        mockBestAmountOut = amountOut;
    }

    function setSwapAmountOut(uint256 amountOut) external {
        mockSwapAmountOut = amountOut;
    }

    function isPairSupported(
        address /* tokenIn */,
        address /* tokenOut */
    ) external view returns (bool) {
        return mockPairSupported;
    }

    function findBestRoute(
        address /* tokenIn */,
        address /* tokenOut */,
        uint256 /* amountIn */
    ) external view returns (address bestAdapter, uint256 bestAmountOut) {
        return (mockBestAdapter, mockBestAmountOut);
    }

    function swap(
        address tokenIn,
        address tokenOut,
        uint256 amountIn,
        uint256 /* minAmountOut */,
        uint256 /* deadline */
    ) external returns (uint256 amountOut) {
        // Pull tokens from caller (FAssetsAdapter)
        IERC20(tokenIn).safeTransferFrom(msg.sender, address(this), amountIn);

        // For testing, mint mock output tokens if possible
        try IMintable(tokenOut).mint(msg.sender, mockSwapAmountOut) {} catch {}

        return mockSwapAmountOut;
    }

    // Name function to satisfy adapter interface checks
    function name() external pure returns (string memory) {
        return "MockSwapRouter";
    }
}

interface IMintable {
    function mint(address to, uint256 amount) external;
}
