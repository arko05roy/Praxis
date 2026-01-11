// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

/**
 * @title PraxisErrors
 * @notice Custom error definitions for the PRAXIS protocol
 */
library PraxisErrors {
    // =============================================================
    //                         ACCESS CONTROL
    // =============================================================

    /// @notice Caller is not authorized to perform the action
    error Unauthorized();

    /// @notice Only the contract owner can call this function
    error OnlyOwner();

    /// @notice Caller is not a registered adapter
    error InvalidAdapter();

    // =============================================================
    //                         ORACLE ERRORS
    // =============================================================

    /// @notice Price data is too old (exceeds MAX_PRICE_AGE)
    /// @param feedId The feed ID that has stale data
    /// @param timestamp Timestamp of the stale price
    /// @param maxAge Maximum allowed age in seconds
    error PriceStale(bytes21 feedId, uint64 timestamp, uint256 maxAge);

    /// @notice No feed is configured for the given token
    /// @param token The token address that has no feed mapping
    error FeedNotConfigured(address token);

    /// @notice Invalid feed ID provided
    /// @param feedId The invalid feed ID
    error InvalidFeedId(bytes21 feedId);

    /// @notice Price returned is zero or invalid
    /// @param feedId The feed ID with invalid price
    error InvalidPrice(bytes21 feedId);

    // =============================================================
    //                         SWAP ERRORS
    // =============================================================

    /// @notice No route found for the swap
    /// @param tokenIn Input token
    /// @param tokenOut Output token
    error NoRouteFound(address tokenIn, address tokenOut);

    /// @notice Output amount is less than minimum required
    /// @param expected Minimum expected output
    /// @param actual Actual output received
    error InsufficientOutput(uint256 expected, uint256 actual);

    /// @notice Transaction deadline has passed
    /// @param deadline The deadline timestamp
    /// @param current Current block timestamp
    error DeadlineExpired(uint256 deadline, uint256 current);

    /// @notice Slippage exceeds maximum allowed
    /// @param maxSlippage Maximum allowed slippage in bps
    /// @param actualSlippage Actual slippage in bps
    error ExcessiveSlippage(uint256 maxSlippage, uint256 actualSlippage);

    // =============================================================
    //                         YIELD ERRORS
    // =============================================================

    /// @notice Asset is not supported by the protocol
    /// @param asset The unsupported asset address
    error AssetNotSupported(address asset);

    /// @notice Insufficient balance to perform the operation
    /// @param required Amount required
    /// @param available Amount available
    error InsufficientBalance(uint256 required, uint256 available);

    /// @notice Withdrawal amount exceeds deposited balance
    /// @param requested Amount requested
    /// @param available Amount available
    error ExcessiveWithdrawal(uint256 requested, uint256 available);

    /// @notice Cooldown period has not elapsed
    /// @param unlockTime Timestamp when unlock is available
    /// @param currentTime Current block timestamp
    error CooldownNotElapsed(uint256 unlockTime, uint256 currentTime);

    // =============================================================
    //                       PERPETUAL ERRORS
    // =============================================================

    /// @notice Leverage exceeds maximum allowed for the market
    /// @param requested Requested leverage
    /// @param maximum Maximum allowed leverage
    error ExcessiveLeverage(uint256 requested, uint256 maximum);

    /// @notice Position would be immediately liquidatable
    /// @param positionId The position ID
    error PositionUndercollateralized(bytes32 positionId);

    /// @notice Position not found
    /// @param positionId The position ID that wasn't found
    error PositionNotFound(bytes32 positionId);

    /// @notice Market not found or not active
    /// @param marketId The market ID
    error InvalidMarket(bytes32 marketId);

    /// @notice Margin removal would cause liquidation
    /// @param positionId The position ID
    /// @param currentMargin Current margin amount
    /// @param minMargin Minimum required margin
    error MarginRemovalWouldLiquidate(
        bytes32 positionId,
        uint256 currentMargin,
        uint256 minMargin
    );

    // =============================================================
    //                        FASSET ERRORS
    // =============================================================

    /// @notice Address is not a valid FAsset
    /// @param token The token address
    error NotFAsset(address token);

    /// @notice FAsset already registered
    /// @param fAsset The FAsset address
    error FAssetAlreadyRegistered(address fAsset);

    // =============================================================
    //                       STRATEGY ERRORS
    // =============================================================

    /// @notice Strategy execution failed at a specific step
    /// @param stepIndex Index of the failed step
    /// @param reason Reason for failure
    error StrategyStepFailed(uint256 stepIndex, bytes reason);

    /// @notice Invalid action type for the adapter
    /// @param actionType The invalid action type
    error InvalidActionType(uint8 actionType);

    /// @notice Strategy is empty (no actions)
    error EmptyStrategy();

    // =============================================================
    //                          FDC ERRORS
    // =============================================================

    /// @notice FDC proof verification failed
    error ProofVerificationFailed();

    /// @notice Invalid attestation type
    /// @param attestationType The invalid attestation type
    error InvalidAttestationType(bytes32 attestationType);

    /// @notice Attestation response data is invalid
    error InvalidAttestationResponse();

    // =============================================================
    //                       GENERAL ERRORS
    // =============================================================

    /// @notice Zero address provided where not allowed
    error ZeroAddress();

    /// @notice Zero amount provided where not allowed
    error ZeroAmount();

    /// @notice Array length mismatch
    /// @param expected Expected length
    /// @param actual Actual length
    error ArrayLengthMismatch(uint256 expected, uint256 actual);

    /// @notice Operation is paused
    error Paused();

    /// @notice Reentrancy detected
    error ReentrancyGuard();

    /// @notice Function not implemented
    error NotImplemented();
}
