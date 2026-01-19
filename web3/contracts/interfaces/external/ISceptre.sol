// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

/**
 * @title ISceptre
 * @notice Interface for the Sceptre liquid staking protocol on Flare
 * @dev sFLR is the liquid staking token that represents staked FLR
 *      Address on Flare Mainnet: 0x12e605bc104e93B45e1aD99F9e555f659051c2BB
 *
 * IMPORTANT: This interface matches the actual mainnet contract.
 * Key differences from typical staking interfaces:
 * - deposit() returns nothing, use submit() to get shares returned
 * - Uses requestUnlock/redeem pattern, not requestWithdrawal/completeWithdrawal
 * - Unlock requests are per-user indexed, not global request IDs
 */
interface ISceptre {
    // =============================================================
    //                         STAKING FUNCTIONS
    // =============================================================

    /**
     * @notice Deposit FLR and receive sFLR (no return value)
     * @dev Use submit() if you need the share amount returned
     */
    function deposit() external payable;

    /**
     * @notice Submit FLR and receive sFLR with share amount returned
     * @return shares Amount of sFLR shares minted
     */
    function submit() external payable returns (uint256 shares);

    /**
     * @notice Submit wrapped FLR (WFLR) and receive sFLR
     * @param amount Amount of WFLR to stake
     * @return shares Amount of sFLR shares minted
     */
    function submitWrapped(uint256 amount) external returns (uint256 shares);

    /**
     * @notice Request to unlock sFLR for redemption (initiates cooldown)
     * @param shareAmount Amount of sFLR to unlock
     */
    function requestUnlock(uint256 shareAmount) external;

    /**
     * @notice Redeem all unlocked requests that are past cooldown
     */
    function redeem() external;

    /**
     * @notice Redeem a specific unlock request by index
     * @param unlockIndex Index of the unlock request for the caller
     * @dev This is an overloaded version of redeem()
     */
    function redeem(uint256 unlockIndex) external;

    /**
     * @notice Cancel a specific unlock request
     * @param unlockIndex Index of the unlock request for the caller
     */
    function cancelUnlockRequest(uint256 unlockIndex) external;

    /**
     * @notice Cancel all pending (not yet redeemable) unlock requests
     */
    function cancelPendingUnlockRequests() external;

    /**
     * @notice Cancel all redeemable unlock requests
     */
    function cancelRedeemableUnlockRequests() external;

    /**
     * @notice Redeem overdue shares (past redeem window) - returns shares to user
     */
    function redeemOverdueShares() external;

    // =============================================================
    //                         VIEW FUNCTIONS
    // =============================================================

    /**
     * @notice Get the amount of FLR that would be received for shares
     * @param shareAmount Amount of sFLR shares
     * @return Amount of FLR the shares represent
     */
    function getPooledFlrByShares(uint256 shareAmount) external view returns (uint256);

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
    function totalPooledFlr() external view returns (uint256);

    /**
     * @notice Get the total shares (same as totalSupply for sFLR)
     * @return Total shares
     */
    function totalShares() external view returns (uint256);

    /**
     * @notice Get the cooldown period for withdrawals
     * @return Cooldown period in seconds (~14.5 days)
     */
    function cooldownPeriod() external view returns (uint256);

    /**
     * @notice Get the redeem period after cooldown (window to claim)
     * @return Redeem period in seconds (~2 days)
     */
    function redeemPeriod() external view returns (uint256);

    /**
     * @notice Get unlock request details for a user
     * @param user Address of the user
     * @param unlockIndex Index of the unlock request
     * @return startedAt Timestamp when unlock was requested
     * @return shareAmount Amount of sFLR in the request
     */
    function userUnlockRequests(address user, uint256 unlockIndex) external view returns (
        uint256 startedAt,
        uint256 shareAmount
    );

    /**
     * @notice Get the number of unlock requests for a user
     * @param user Address of the user
     * @return Number of unlock requests
     */
    function getUnlockRequestCount(address user) external view returns (uint256);

    /**
     * @notice Get paginated unlock requests for a user
     * @param user Address of the user
     * @param from Starting index
     * @param to Ending index (exclusive)
     * @return requests Array of unlock request structs
     * @return indices Array of request indices
     */
    function getPaginatedUnlockRequests(
        address user,
        uint256 from,
        uint256 to
    ) external view returns (
        UnlockRequest[] memory requests,
        uint256[] memory indices
    );

    /**
     * @notice Get shares held in custody for a user (during unlock)
     * @param user Address of the user
     * @return Amount of shares in custody
     */
    function userSharesInCustody(address user) external view returns (uint256);

    /**
     * @notice Check if the contract is paused
     * @return True if paused
     */
    function paused() external view returns (bool);

    /**
     * @notice Check if minting is paused
     * @return True if minting is paused
     */
    function mintingPaused() external view returns (bool);

    /**
     * @notice Get the number of unique stakers
     * @return Staker count
     */
    function stakerCount() external view returns (uint256);

    /**
     * @notice Get the maximum FLR that can be staked (cap)
     * @return Total pooled FLR cap
     */
    function totalPooledFlrCap() external view returns (uint256);

    /**
     * @notice Get the wrapped FLR token address
     * @return WFLR token address
     */
    function wrappedToken() external view returns (address);

    // =============================================================
    //                         STRUCTS
    // =============================================================

    /**
     * @notice Unlock request structure
     */
    struct UnlockRequest {
        uint256 startedAt;
        uint256 shareAmount;
    }

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
