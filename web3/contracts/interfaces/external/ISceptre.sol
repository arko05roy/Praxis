// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

/**
 * @title ISceptre
 * @notice Interface for the Sceptre liquid staking protocol on Flare
 * @dev sFLR is the liquid staking token that represents staked FLR
 *      Address on Flare Mainnet: 0x12e605bc104e93B45e1aD99F9e555f659051c2BB
 */
interface ISceptre {
    // =============================================================
    //                         STAKING FUNCTIONS
    // =============================================================

    /**
     * @notice Deposit FLR and receive sFLR
     * @return shares Amount of sFLR shares minted
     */
    function deposit() external payable returns (uint256 shares);

    /**
     * @notice Submit a request to withdraw staked FLR (initiates cooldown)
     * @param shares Amount of sFLR to unstake
     * @return requestId Unique identifier for the withdrawal request
     */
    function requestWithdrawal(uint256 shares) external returns (uint256 requestId);

    /**
     * @notice Complete a withdrawal request after cooldown period
     * @param requestId The withdrawal request identifier
     * @return amount Amount of FLR received
     */
    function completeWithdrawal(uint256 requestId) external returns (uint256 amount);

    /**
     * @notice Cancel a pending withdrawal request
     * @param requestId The withdrawal request identifier
     */
    function cancelWithdrawal(uint256 requestId) external;

    // =============================================================
    //                         VIEW FUNCTIONS
    // =============================================================

    /**
     * @notice Get the amount of FLR that would be received for shares
     * @param shares Amount of sFLR shares
     * @return Amount of FLR the shares represent
     */
    function getPooledFlrByShares(uint256 shares) external view returns (uint256);

    /**
     * @notice Get the amount of shares that would be minted for FLR
     * @param flrAmount Amount of FLR
     * @return Amount of sFLR shares that would be minted
     */
    function getSharesByPooledFlr(uint256 flrAmount) external view returns (uint256);

    /**
     * @notice Get the total amount of FLR in the staking pool
     * @return Total pooled FLR
     */
    function totalPooledFlare() external view returns (uint256);

    /**
     * @notice Get the cooldown period for withdrawals
     * @return Cooldown period in seconds
     */
    function cooldownPeriod() external view returns (uint256);

    /**
     * @notice Get the redeem period after cooldown (window to claim)
     * @return Redeem period in seconds
     */
    function redeemPeriod() external view returns (uint256);

    /**
     * @notice Get withdrawal request details
     * @param requestId The withdrawal request identifier
     * @return owner Address that owns the request
     * @return shares Amount of sFLR in the request
     * @return unlockTime Timestamp when withdrawal can be completed
     * @return completed Whether the withdrawal has been completed
     */
    function getWithdrawalRequest(uint256 requestId) external view returns (
        address owner,
        uint256 shares,
        uint256 unlockTime,
        bool completed
    );

    /**
     * @notice Check if a withdrawal request is ready to be claimed
     * @param requestId The withdrawal request identifier
     * @return True if the request can be completed
     */
    function isWithdrawalReady(uint256 requestId) external view returns (bool);

    /**
     * @notice Get the next withdrawal request ID
     * @return The next request ID that will be assigned
     */
    function nextWithdrawalRequestId() external view returns (uint256);

    // =============================================================
    //                         ERC20 FUNCTIONS
    // =============================================================

    /**
     * @notice Get sFLR balance for an account
     * @param account Address to check
     * @return Balance of sFLR
     */
    function balanceOf(address account) external view returns (uint256);

    /**
     * @notice Get total supply of sFLR
     * @return Total sFLR supply
     */
    function totalSupply() external view returns (uint256);

    /**
     * @notice Transfer sFLR tokens
     * @param to Recipient address
     * @param amount Amount to transfer
     * @return True if successful
     */
    function transfer(address to, uint256 amount) external returns (bool);

    /**
     * @notice Transfer sFLR tokens from another address
     * @param from Sender address
     * @param to Recipient address
     * @param amount Amount to transfer
     * @return True if successful
     */
    function transferFrom(address from, address to, uint256 amount) external returns (bool);

    /**
     * @notice Approve spender to use tokens
     * @param spender Address to approve
     * @param amount Amount to approve
     * @return True if successful
     */
    function approve(address spender, uint256 amount) external returns (bool);

    /**
     * @notice Get allowance for spender
     * @param owner Token owner
     * @param spender Approved spender
     * @return Remaining allowance
     */
    function allowance(address owner, address spender) external view returns (uint256);

    /**
     * @notice Get token decimals
     * @return Number of decimals (18)
     */
    function decimals() external view returns (uint8);

    /**
     * @notice Get token symbol
     * @return Token symbol (sFLR)
     */
    function symbol() external view returns (string memory);

    /**
     * @notice Get token name
     * @return Token name
     */
    function name() external view returns (string memory);
}
