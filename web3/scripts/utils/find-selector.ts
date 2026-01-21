import { ethers } from "ethers";

const ERRORS = [
    "Unauthorized()",
    "OnlyOwner()",
    "InvalidAdapter()",
    "PriceStale(bytes21,uint64,uint256)",
    "FeedNotConfigured(address)",
    "InvalidFeedId(bytes21)",
    "InvalidPrice(bytes21)",
    "NoRouteFound(address,address)",
    "InsufficientOutput(uint256,uint256)",
    "DeadlineExpired(uint256,uint256)",
    "ExcessiveSlippage(uint256,uint256)",
    "AssetNotSupported(address)",
    "InsufficientBalance(uint256,uint256)",
    "ExcessiveWithdrawal(uint256,uint256)",
    "CooldownNotElapsed(uint256,uint256)",
    "ExcessiveLeverage(uint256,uint256)",
    "PositionUndercollateralized(bytes32)",
    "PositionNotFound(bytes32)",
    "InvalidMarket(bytes32)",
    "MarginRemovalWouldLiquidate(bytes32,uint256,uint256)",
    "NotFAsset(address)",
    "FAssetAlreadyRegistered(address)",
    "StrategyStepFailed(uint256,bytes)",
    "InvalidActionType(uint8)",
    "EmptyStrategy()",
    "ProofVerificationFailed()",
    "InvalidAttestationType(bytes32)",
    "InvalidAttestationResponse()",
    "ZeroAddress()",
    "ZeroAmount()",
    "ArrayLengthMismatch(uint256,uint256)",
    "Paused()",
    "ReentrancyGuard()",
    "NotImplemented()",
    "ExecutorBanned(address)",
    "CapitalExceedsTierLimit(uint256,uint256)",
    "DrawdownExceedsTierLimit(uint16,uint16)",
    "RiskLevelExceedsTierLimit(uint8,uint8)",
    "InsufficientStake(uint256,uint256)",
    "ERTNotFound(uint256)",
    "ERTNotActive(uint256,uint8)",
    "ERTExpired(uint256,uint256)",
    "NotERTHolder(address,address)",
    "AdapterNotAllowed(address,uint256)",
    "AssetNotAllowed(address,uint256)",
    "CapitalLimitExceeded(uint256,uint256)",
    "DrawdownLimitExceeded(uint256,uint256)",
    "PositionSizeExceeded(uint256,uint256)",
    "UtilizationLimitExceeded(uint256,uint256)",
    "CircuitBreakerActive()",
    "DailyLossLimitExceeded(uint256,uint256)",
    "AssetExposureLimitExceeded(address,uint256,uint256)",
    "ExpiryConcentrationExceeded(uint256,uint256,uint256)",
    "InsuranceFundInsufficient(uint256,uint256)",
    "OnlyController()",
    "OnlySettlement()",
    "OnlyVault()",
    "StakeMustExceedDrawdown(uint16,uint16)",
    "InvalidTier(uint8)",
    "DurationTooShort(uint256,uint256)",
    "DurationTooLong(uint256,uint256)",
    // Standard ERC20 errors
    "ERC20InsufficientBalance(address,uint256,uint256)",
    "ERC20InvalidSender(address)",
    "ERC20InvalidReceiver(address)",
    "ERC20InsufficientAllowance(address,uint256,uint256)",
    "ERC20InvalidApprover(address)",
    "ERC20InvalidSpender(address)"
];

const TARGET = "0x15b31976";

console.log("Searching for selector:", TARGET);

for (const err of ERRORS) {
    const selector = ethers.id(err).slice(0, 10);
    if (selector === TARGET) {
        console.log("MATCH FOUND:", err);
    }
}
