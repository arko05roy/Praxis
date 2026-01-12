// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

import {IAdapter} from "../adapters/IAdapter.sol";
import {IERC20} from "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import {SafeERC20} from "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";

/**
 * @title MockAdapter
 * @notice Mock adapter for testing SwapRouter
 */
contract MockAdapter is IAdapter {
    using SafeERC20 for IERC20;

    string private _name;
    address private _router;

    // Mock values
    uint256 public mockAmountOut;
    uint256 public mockGasEstimate;
    bool public mockPoolAvailable;

    constructor(string memory name_) {
        _name = name_;
        _router = address(this);
        mockAmountOut = 100 ether;
        mockGasEstimate = 150000;
        mockPoolAvailable = true;
    }

    function name() external view override returns (string memory) {
        return _name;
    }

    function router() external view override returns (address) {
        return _router;
    }

    function setQuote(uint256 amountOut_, uint256 gasEstimate_) external {
        mockAmountOut = amountOut_;
        mockGasEstimate = gasEstimate_;
    }

    function setPoolAvailable(bool available_) external {
        mockPoolAvailable = available_;
    }

    function getQuote(
        address /* tokenIn */,
        address /* tokenOut */,
        uint256 /* amountIn */
    ) external view override returns (uint256 amountOut, uint256 gasEstimate) {
        return (mockAmountOut, mockGasEstimate);
    }

    function swap(
        address tokenIn,
        address tokenOut,
        uint256 amountIn,
        uint256 /* minAmountOut */,
        address to,
        bytes calldata /* extraData */
    ) external override returns (uint256 amountOut) {
        // Pull tokens from caller
        IERC20(tokenIn).safeTransferFrom(msg.sender, address(this), amountIn);

        // For testing, mint mock output tokens if possible
        // Otherwise just return the mock amount
        try IMintable(tokenOut).mint(to, mockAmountOut) {} catch {}

        return mockAmountOut;
    }

    function isPoolAvailable(
        address /* tokenIn */,
        address /* tokenOut */
    ) external view override returns (bool) {
        return mockPoolAvailable;
    }
}

// Interface for minting in swap (avoid naming collision)
interface IMintable {
    function mint(address to, uint256 amount) external;
}
