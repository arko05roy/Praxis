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

    // =============================================================
    //                  PHASE 6: EXECUTION RIGHTS ERRORS
    // =============================================================

    /// @notice Executor is banned from the protocol
    /// @param executor The banned executor address
    error ExecutorBanned(address executor);

    /// @notice Requested capital exceeds tier limit
    /// @param requested Amount requested
    /// @param tierLimit Maximum allowed for tier
    error CapitalExceedsTierLimit(uint256 requested, uint256 tierLimit);

    /// @notice Drawdown exceeds tier limit
    /// @param requested Requested drawdown bps
    /// @param tierLimit Maximum allowed for tier
    error DrawdownExceedsTierLimit(uint16 requested, uint16 tierLimit);

    /// @notice Strategy risk level exceeds tier allowance
    /// @param requested Requested risk level
    /// @param tierLimit Maximum allowed for tier
    error RiskLevelExceedsTierLimit(uint8 requested, uint8 tierLimit);

    /// @notice Insufficient stake provided
    /// @param provided Amount provided
    /// @param required Amount required
    error InsufficientStake(uint256 provided, uint256 required);

    /// @notice ERT not found
    /// @param ertId The ERT ID that wasn't found
    error ERTNotFound(uint256 ertId);

    /// @notice ERT is not active
    /// @param ertId The ERT ID
    /// @param currentStatus Current status of the ERT
    error ERTNotActive(uint256 ertId, uint8 currentStatus);

    /// @notice ERT has expired
    /// @param ertId The ERT ID
    /// @param expiryTime When it expired
    error ERTExpired(uint256 ertId, uint256 expiryTime);

    /// @notice Caller is not the ERT holder
    /// @param caller The calling address
    /// @param holder The actual holder
    error NotERTHolder(address caller, address holder);

    /// @notice Adapter not in ERT whitelist
    /// @param adapter The adapter address
    /// @param ertId The ERT ID
    error AdapterNotAllowed(address adapter, uint256 ertId);

    /// @notice Asset not in ERT whitelist
    /// @param asset The asset address
    /// @param ertId The ERT ID
    error AssetNotAllowed(address asset, uint256 ertId);

    /// @notice Capital limit exceeded
    /// @param requested Amount requested to deploy
    /// @param available Amount available
    error CapitalLimitExceeded(uint256 requested, uint256 available);

    /// @notice Drawdown limit exceeded
    /// @param currentDrawdown Current drawdown in bps
    /// @param maxDrawdown Maximum allowed drawdown
    error DrawdownLimitExceeded(uint256 currentDrawdown, uint256 maxDrawdown);

    /// @notice Position size exceeds limit
    /// @param positionSize Position size in bps of capital
    /// @param maxSize Maximum allowed size
    error PositionSizeExceeded(uint256 positionSize, uint256 maxSize);

    // =============================================================
    //                  VAULT & SAFETY ERRORS
    // =============================================================

    /// @notice Vault utilization limit exceeded
    /// @param currentUtilization Current utilization in bps
    /// @param maxUtilization Maximum allowed utilization
    error UtilizationLimitExceeded(uint256 currentUtilization, uint256 maxUtilization);

    /// @notice Circuit breaker is active
    error CircuitBreakerActive();

    /// @notice Daily loss limit exceeded
    /// @param dailyLoss Current daily loss in bps
    /// @param maxDailyLoss Maximum allowed daily loss
    error DailyLossLimitExceeded(uint256 dailyLoss, uint256 maxDailyLoss);

    /// @notice Asset exposure limit exceeded
    /// @param asset The asset address
    /// @param currentExposure Current exposure amount
    /// @param maxExposure Maximum allowed exposure
    error AssetExposureLimitExceeded(address asset, uint256 currentExposure, uint256 maxExposure);

    /// @notice Too much capital expiring on the same day
    /// @param expiryDay The day timestamp
    /// @param totalExpiring Total capital expiring
    /// @param maxAllowed Maximum allowed
    error ExpiryConcentrationExceeded(uint256 expiryDay, uint256 totalExpiring, uint256 maxAllowed);

    /// @notice Insurance fund insufficient
    /// @param required Amount required
    /// @param available Amount available
    error InsuranceFundInsufficient(uint256 required, uint256 available);

    /// @notice Only the controller can call this function
    error OnlyController();

    /// @notice Only the settlement engine can call this function
    error OnlySettlement();

    /// @notice Only the vault can call this function
    error OnlyVault();

    /// @notice Stake percentage must exceed max drawdown
    /// @param stakeBps Stake percentage
    /// @param drawdownBps Drawdown percentage
    error StakeMustExceedDrawdown(uint16 stakeBps, uint16 drawdownBps);

    /// @notice Invalid tier for operation
    /// @param tier The invalid tier value
    error InvalidTier(uint8 tier);

    /// @notice Duration too short
    /// @param duration Provided duration
    /// @param minDuration Minimum required duration
    error DurationTooShort(uint256 duration, uint256 minDuration);

    /// @notice Duration too long
    /// @param duration Provided duration
    /// @param maxDuration Maximum allowed duration
    error DurationTooLong(uint256 duration, uint256 maxDuration);
}
