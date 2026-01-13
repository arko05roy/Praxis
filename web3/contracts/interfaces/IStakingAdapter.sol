// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

import {IYieldAdapter} from "./IYieldAdapter.sol";

/**
 * @title IStakingAdapter
 * @notice Interface for liquid staking adapters in the PRAXIS protocol
 * @dev Extends IYieldAdapter with staking-specific functionality
 */
interface IStakingAdapter is IYieldAdapter {
    /**
     * @notice Stake native tokens and receive liquid staking tokens
     * @param amount Amount of tokens to stake (in wei)
     * @param recipient Address to receive the liquid staking tokens
     * @return shares Amount of liquid staking tokens received
     */
    function stake(
        uint256 amount,
        address recipient
    ) external payable returns (uint256 shares);

    /**
     * @notice Request to unstake tokens (initiates cooldown period)
     * @param shares Amount of liquid staking tokens to unstake
     * @return requestId Unique identifier for this unstake request
     */
    function requestUnstake(uint256 shares) external returns (uint256 requestId);

    /**
     * @notice Complete a pending unstake request after cooldown
     * @param requestId The unstake request identifier
     * @param recipient Address to receive the unstaked tokens
     * @return amount Amount of underlying tokens received
     */
    function completeUnstake(
        uint256 requestId,
        address recipient
    ) external returns (uint256 amount);

    /**
     * @notice Get the cooldown period for unstaking
     * @return Cooldown period in seconds
     */
    function getCooldownPeriod() external view returns (uint256);

    /**
     * @notice Check if an unstake request is ready to be completed
     * @param requestId The unstake request identifier
     * @return True if the request can be completed
     */
    function isUnstakeClaimable(uint256 requestId) external view returns (bool);

    /**
     * @notice Get details of an unstake request
     * @param requestId The unstake request identifier
     * @return user Address of the user who made the request
     * @return shares Amount of shares in the request
     * @return unlockTime Timestamp when the request can be completed
     * @return claimed Whether the request has been claimed
     */
    function getUnstakeRequest(
        uint256 requestId
    ) external view returns (
        address user,
        uint256 shares,
        uint256 unlockTime,
        bool claimed
    );

    /**
     * @notice Get the liquid staking token address
     * @return Address of the liquid staking token (e.g., sFLR)
     */
    function stakingToken() external view returns (address);
}
