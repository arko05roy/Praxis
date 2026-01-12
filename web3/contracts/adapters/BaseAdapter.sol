// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

import {IAdapter} from "./IAdapter.sol";
import {IERC20} from "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import {SafeERC20} from "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import {Ownable} from "@openzeppelin/contracts/access/Ownable.sol";
import {ReentrancyGuard} from "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import {PraxisErrors} from "../lib/PraxisErrors.sol";

/**
 * @title BaseAdapter
 * @notice Abstract base contract for all DEX adapters
 * @dev Provides common functionality for token approvals, transfers, and reentrancy protection
 */
abstract contract BaseAdapter is IAdapter, Ownable, ReentrancyGuard {
    using SafeERC20 for IERC20;

    /// @notice Name of the DEX
    string private _name;

    /// @notice Address of the DEX router
    address private immutable _router;

    /// @notice Default gas estimate for swaps (can be overridden)
    uint256 public constant DEFAULT_GAS_ESTIMATE = 200000;

    /**
     * @notice Constructor
     * @param name_ Name of the DEX
     * @param router_ Address of the DEX router
     */
    constructor(string memory name_, address router_) Ownable(msg.sender) {
        if (router_ == address(0)) revert PraxisErrors.ZeroAddress();
        _name = name_;
        _router = router_;
    }

    /**
     * @notice Returns the name of the DEX
     */
    function name() external view override returns (string memory) {
        return _name;
    }

    /**
     * @notice Returns the router address
     */
    function router() external view override returns (address) {
        return _router;
    }

    /**
     * @notice Internal function to get the router address
     * @return The router address
     */
    function _getRouter() internal view returns (address) {
        return _router;
    }

    /**
     * @notice Approve tokens for spending by the router
     * @param token Token to approve
     * @param amount Amount to approve
     */
    function _approveToken(address token, uint256 amount) internal {
        IERC20(token).forceApprove(_router, amount);
    }

    /**
     * @notice Transfer tokens from sender to this contract
     * @param token Token to transfer
     * @param from Address to transfer from
     * @param amount Amount to transfer
     */
    function _pullTokens(address token, address from, uint256 amount) internal {
        IERC20(token).safeTransferFrom(from, address(this), amount);
    }

    /**
     * @notice Transfer tokens from this contract to recipient
     * @param token Token to transfer
     * @param to Address to transfer to
     * @param amount Amount to transfer
     */
    function _pushTokens(address token, address to, uint256 amount) internal {
        IERC20(token).safeTransfer(to, amount);
    }

    /**
     * @notice Get the balance of a token held by this contract
     * @param token Token to check
     * @return balance Token balance
     */
    function _getBalance(address token) internal view returns (uint256) {
        return IERC20(token).balanceOf(address(this));
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
