// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

import {IStakingAdapter} from "../interfaces/IStakingAdapter.sol";
import {ISceptre} from "../interfaces/external/ISceptre.sol";
import {IERC20} from "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import {SafeERC20} from "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import {Ownable} from "@openzeppelin/contracts/access/Ownable.sol";
import {ReentrancyGuard} from "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import {PraxisErrors} from "../lib/PraxisErrors.sol";
import {PraxisEvents} from "../lib/PraxisEvents.sol";

/**
 * @title SceptreAdapter
 * @notice Adapter for Sceptre liquid staking protocol on Flare
 * @dev Enables staking FLR to receive sFLR liquid staking tokens
 *      Handles the two-phase unstaking process with cooldown period
 */
contract SceptreAdapter is IStakingAdapter, Ownable, ReentrancyGuard {
    using SafeERC20 for IERC20;

    /// @notice The Sceptre staking contract (also the sFLR token)
    ISceptre public immutable sceptre;

    /// @notice WFLR token address for wrapped FLR handling
    address public immutable wflr;

    /// @notice Name of the adapter
    string private constant ADAPTER_NAME = "Sceptre";

    /// @notice Default gas estimate for staking operations
    uint256 public constant DEFAULT_GAS_ESTIMATE = 150000;

    /// @notice Seconds per year for APY calculations (365.25 days)
    uint256 private constant SECONDS_PER_YEAR = 31557600;

    /// @notice Mapping of withdrawal request IDs to their owners
    mapping(uint256 => address) public requestOwners;

    /// @notice User's withdrawal request IDs
    mapping(address => uint256[]) public userRequests;

    /**
     * @notice Constructor
     * @param sceptre_ Address of the Sceptre staking contract (sFLR)
     * @param wflr_ Address of the WFLR token
     */
    constructor(
        address sceptre_,
        address wflr_
    ) Ownable(msg.sender) {
        if (sceptre_ == address(0)) revert PraxisErrors.ZeroAddress();
        if (wflr_ == address(0)) revert PraxisErrors.ZeroAddress();

        sceptre = ISceptre(sceptre_);
        wflr = wflr_;
    }

    // =============================================================
    //                     IYieldAdapter IMPLEMENTATION
    // =============================================================

    /**
     * @notice Returns the adapter name
     */
    function name() external pure override returns (string memory) {
        return ADAPTER_NAME;
    }

    /**
     * @notice Returns the Sceptre protocol address
     */
    function protocol() external view override returns (address) {
        return address(sceptre);
    }

    /**
     * @notice Deposit FLR/sFLR - for staking, use stake() instead
     * @dev This function is for IYieldAdapter compatibility
     *      For FLR staking, send FLR value with the call
     *      Note: No nonReentrant here as _stake is called internally
     */
    function deposit(
        address asset,
        uint256 amount,
        address recipient
    ) external payable override returns (uint256 shares) {
        // If asset is native FLR (address(0) or wflr), stake it
        if (asset == address(0) || asset == wflr) {
            return _stake(amount, recipient);
        }
        revert PraxisErrors.AssetNotSupported(asset);
    }

    /**
     * @notice Withdraw is not instant for Sceptre - use requestUnstake + completeUnstake
     * @dev Reverts as Sceptre requires a two-phase withdrawal
     */
    function withdraw(
        address,
        uint256,
        address
    ) external pure override returns (uint256) {
        revert PraxisErrors.NotImplemented();
    }

    /**
     * @notice Get the current staking APY
     * @dev APY is estimated based on recent reward distribution
     *      Returns a rough estimate - actual APY varies based on network rewards
     */
    function getAPY(address) external pure override returns (uint256 apyBps) {
        // Sceptre APY is typically around 3-6% depending on network conditions
        // This would need to be calculated from historical exchange rate changes
        // For now, return a conservative estimate
        return 400; // 4% APY in basis points
    }

    /**
     * @notice Check if an asset is supported
     * @param asset Address of the asset (address(0) for native FLR)
     */
    function isAssetSupported(address asset) external view override returns (bool) {
        return asset == address(0) || asset == wflr || asset == address(sceptre);
    }

    /**
     * @notice Get user's underlying FLR balance from their sFLR
     * @param asset Not used (always returns FLR equivalent)
     * @param user Address of the user
     */
    function getUnderlyingBalance(
        address asset,
        address user
    ) external view override returns (uint256) {
        if (asset != address(0) && asset != wflr && asset != address(sceptre)) {
            return 0;
        }
        uint256 shares = sceptre.balanceOf(user);
        return sceptre.getPooledFlrByShares(shares);
    }

    /**
     * @notice Get the current exchange rate (sFLR to FLR)
     * @dev Returns the amount of FLR per 1e18 sFLR
     */
    function getExchangeRate(address) external view override returns (uint256) {
        return sceptre.getPooledFlrByShares(1e18);
    }

    /**
     * @notice Get total value locked in Sceptre
     */
    function getTVL(address) external view override returns (uint256) {
        return sceptre.totalPooledFlr();
    }

    // =============================================================
    //                   IStakingAdapter IMPLEMENTATION
    // =============================================================

    /**
     * @notice Stake FLR and receive sFLR
     * @param amount Amount of FLR to stake (must match msg.value)
     * @param recipient Address to receive sFLR
     * @return shares Amount of sFLR received
     */
    function stake(
        uint256 amount,
        address recipient
    ) public payable override nonReentrant returns (uint256 shares) {
        return _stake(amount, recipient);
    }

    /**
     * @notice Internal stake implementation
     * @param amount Amount of FLR to stake (must match msg.value)
     * @param recipient Address to receive sFLR
     * @return shares Amount of sFLR received
     */
    function _stake(
        uint256 amount,
        address recipient
    ) internal returns (uint256 shares) {
        if (amount == 0) revert PraxisErrors.ZeroAmount();
        if (recipient == address(0)) revert PraxisErrors.ZeroAddress();
        if (msg.value != amount) revert PraxisErrors.InsufficientBalance(amount, msg.value);

        // Get sFLR balance before
        uint256 balanceBefore = sceptre.balanceOf(address(this));

        // Stake FLR via Sceptre using submit() which returns shares
        shares = sceptre.submit{value: amount}();

        // Verify we received the expected shares
        uint256 balanceAfter = sceptre.balanceOf(address(this));
        uint256 actualShares = balanceAfter - balanceBefore;

        if (actualShares == 0) revert PraxisErrors.ZeroAmount();

        // Transfer sFLR to recipient
        if (recipient != address(this)) {
            IERC20(address(sceptre)).safeTransfer(recipient, actualShares);
        }

        emit PraxisEvents.Staked(
            recipient,
            address(0), // FLR (native)
            amount,
            actualShares
        );

        return actualShares;
    }

    /**
     * @notice Request to unstake sFLR (initiates cooldown)
     * @dev Sceptre uses per-user indexed unlock requests, not global IDs
     *      The returned requestId is actually the user's unlock request index
     * @param shares Amount of sFLR to unstake
     * @return requestId The unlock request index for this adapter's address
     */
    function requestUnstake(
        uint256 shares
    ) external override nonReentrant returns (uint256 requestId) {
        if (shares == 0) revert PraxisErrors.ZeroAmount();

        // Pull sFLR from caller
        IERC20(address(sceptre)).safeTransferFrom(msg.sender, address(this), shares);

        // Get the current unlock request count (this will be the new index)
        requestId = sceptre.getUnlockRequestCount(address(this));

        // Request unlock from Sceptre (no return value)
        sceptre.requestUnlock(shares);

        // Track the request owner using our internal index
        requestOwners[requestId] = msg.sender;
        userRequests[msg.sender].push(requestId);

        emit PraxisEvents.UnstakeRequested(
            msg.sender,
            address(sceptre),
            shares,
            requestId
        );

        return requestId;
    }

    /**
     * @notice Complete a pending unstake request after cooldown
     * @dev Uses Sceptre's index-based redeem function
     * @param requestId The unlock request index (from this adapter's perspective)
     * @param recipient Address to receive the unstaked FLR
     * @return amount Amount of FLR received
     */
    function completeUnstake(
        uint256 requestId,
        address recipient
    ) external override nonReentrant returns (uint256 amount) {
        if (recipient == address(0)) revert PraxisErrors.ZeroAddress();

        // Verify caller is the request owner
        address owner = requestOwners[requestId];
        if (owner != msg.sender) revert PraxisErrors.Unauthorized();

        // Check if withdrawal is ready
        if (!_isUnlockClaimable(requestId)) {
            (uint256 startedAt,) = sceptre.userUnlockRequests(address(this), requestId);
            uint256 unlockTime = startedAt + sceptre.cooldownPeriod();
            revert PraxisErrors.CooldownNotElapsed(unlockTime, block.timestamp);
        }

        // Get balance before withdrawal
        uint256 balanceBefore = address(this).balance;

        // Redeem the specific unlock request by index
        // Note: Sceptre's redeem(uint256) is the overloaded version that takes an index
        sceptre.redeem(requestId);

        // Verify we received FLR
        uint256 balanceAfter = address(this).balance;
        amount = balanceAfter - balanceBefore;

        if (amount == 0) revert PraxisErrors.ZeroAmount();

        // Transfer FLR to recipient
        (bool success, ) = recipient.call{value: amount}("");
        if (!success) revert PraxisErrors.ZeroAmount();

        emit PraxisEvents.UnstakeCompleted(
            msg.sender,
            address(0), // FLR (native)
            amount,
            requestId
        );

        return amount;
    }

    /**
     * @notice Get the cooldown period for unstaking
     * @return Cooldown period in seconds (~14.5 days)
     */
    function getCooldownPeriod() external view override returns (uint256) {
        return sceptre.cooldownPeriod();
    }

    /**
     * @notice Check if an unstake request is ready to be completed
     * @param requestId The unlock request index
     */
    function isUnstakeClaimable(uint256 requestId) external view override returns (bool) {
        return _isUnlockClaimable(requestId);
    }

    /**
     * @notice Internal function to check if unlock is claimable
     * @param unlockIndex The unlock request index
     */
    function _isUnlockClaimable(uint256 unlockIndex) internal view returns (bool) {
        // Get request details from Sceptre
        (uint256 startedAt, uint256 shareAmount) = sceptre.userUnlockRequests(address(this), unlockIndex);

        // If no shares, request doesn't exist or was already redeemed
        if (shareAmount == 0) return false;

        // Check if cooldown has elapsed
        uint256 cooldown = sceptre.cooldownPeriod();
        uint256 unlockTime = startedAt + cooldown;

        // Also check we're within the redeem period
        uint256 redeemWindowEnd = unlockTime + sceptre.redeemPeriod();

        return block.timestamp >= unlockTime && block.timestamp <= redeemWindowEnd;
    }

    /**
     * @notice Get details of an unstake request
     * @param requestId The unlock request index
     */
    function getUnstakeRequest(
        uint256 requestId
    ) external view override returns (
        address user,
        uint256 shares,
        uint256 unlockTime,
        bool claimed
    ) {
        user = requestOwners[requestId];

        // Get request details from Sceptre
        (uint256 startedAt, uint256 shareAmount) = sceptre.userUnlockRequests(address(this), requestId);

        shares = shareAmount;
        unlockTime = startedAt + sceptre.cooldownPeriod();
        // If shareAmount is 0, either never existed or was redeemed
        claimed = (shareAmount == 0 && user != address(0));
    }

    /**
     * @notice Get the liquid staking token address (sFLR)
     */
    function stakingToken() external view override returns (address) {
        return address(sceptre);
    }

    /**
     * @notice Get all withdrawal requests for a user
     * @param user Address of the user
     * @return Array of request indices
     */
    function getUserRequests(address user) external view returns (uint256[] memory) {
        return userRequests[user];
    }

    // =============================================================
    //                         ADMIN FUNCTIONS
    // =============================================================

    /**
     * @notice Rescue tokens accidentally sent to this contract
     * @param token Token to rescue (use address(0) for native FLR)
     * @param to Address to send rescued tokens
     * @param amount Amount to rescue
     */
    function rescueTokens(
        address token,
        address to,
        uint256 amount
    ) external onlyOwner {
        if (to == address(0)) revert PraxisErrors.ZeroAddress();

        if (token == address(0)) {
            (bool success, ) = to.call{value: amount}("");
            if (!success) revert PraxisErrors.ZeroAmount();
        } else {
            IERC20(token).safeTransfer(to, amount);
        }
    }

    /**
     * @notice Receive native FLR
     */
    receive() external payable {}
}
