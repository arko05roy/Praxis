// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

import {Ownable} from "@openzeppelin/contracts/access/Ownable.sol";
import {PraxisStructs} from "../lib/PraxisStructs.sol";
import {PraxisErrors} from "../lib/PraxisErrors.sol";
import {PraxisEvents} from "../lib/PraxisEvents.sol";

/**
 * @title ReputationManager
 * @notice Manages executor reputation tiers, stake requirements, and tier progression
 * @dev Core component of the PRAXIS safety system - executors must earn access to larger capital
 */
contract ReputationManager is Ownable {
    // =============================================================
    //                          CONSTANTS
    // =============================================================

    /// @notice Number of consecutive losses before tier downgrade
    uint256 public constant DOWNGRADE_LOSS_THRESHOLD = 5;

    /// @notice Basis points denominator
    uint256 public constant BPS = 10000;

    // =============================================================
    //                          STORAGE
    // =============================================================

    /// @notice Tier configurations
    mapping(PraxisStructs.ExecutorTier => PraxisStructs.TierConfig) public tierConfigs;

    /// @notice Executor reputations
    mapping(address => PraxisStructs.ExecutorReputation) public reputations;

    /// @notice Address of the settlement engine (only it can update reputations)
    address public settlementEngine;

    /// @notice Address of the execution controller (can query reputation)
    address public executionController;

    // =============================================================
    //                          MODIFIERS
    // =============================================================

    modifier onlySettlement() {
        if (msg.sender != settlementEngine) {
            revert PraxisErrors.OnlySettlement();
        }
        _;
    }

    // =============================================================
    //                         CONSTRUCTOR
    // =============================================================

    /**
     * @notice Initialize the ReputationManager with tier configurations
     */
    constructor() Ownable(msg.sender) {
        _initializeTierConfigs();
    }

    /**
     * @notice Initialize default tier configurations
     * @dev Called in constructor, sets up the 5-tier system
     */
    function _initializeTierConfigs() internal {
        // Tier 0 - Unverified (brand new wallet)
        tierConfigs[PraxisStructs.ExecutorTier.UNVERIFIED] = PraxisStructs.TierConfig({
            maxCapital: 100e6,           // $100 (6 decimals for USDC)
            stakeRequiredBps: 5000,      // 50%
            maxDrawdownBps: 2000,        // 20%
            allowedRiskLevel: 0,         // Conservative only
            settlementsRequired: 0,
            profitRateBps: 0,
            volumeRequired: 0
        });

        // Tier 1 - Novice (some history)
        tierConfigs[PraxisStructs.ExecutorTier.NOVICE] = PraxisStructs.TierConfig({
            maxCapital: 1000e6,          // $1,000
            stakeRequiredBps: 2500,      // 25%
            maxDrawdownBps: 1500,        // 15%
            allowedRiskLevel: 1,         // Conservative + Moderate
            settlementsRequired: 3,
            profitRateBps: 5000,         // 50% profitable
            volumeRequired: 0
        });

        // Tier 2 - Verified (proven track record)
        tierConfigs[PraxisStructs.ExecutorTier.VERIFIED] = PraxisStructs.TierConfig({
            maxCapital: 10000e6,         // $10,000
            stakeRequiredBps: 1500,      // 15%
            maxDrawdownBps: 1000,        // 10%
            allowedRiskLevel: 1,         // Up to Moderate
            settlementsRequired: 10,
            profitRateBps: 6000,         // 60% profitable
            volumeRequired: 5000e6       // $5k volume
        });

        // Tier 3 - Established (consistent performer)
        tierConfigs[PraxisStructs.ExecutorTier.ESTABLISHED] = PraxisStructs.TierConfig({
            maxCapital: 100000e6,        // $100,000
            stakeRequiredBps: 1000,      // 10%
            maxDrawdownBps: 1000,        // 10%
            allowedRiskLevel: 2,         // All strategies
            settlementsRequired: 25,
            profitRateBps: 6500,         // 65% profitable
            volumeRequired: 50000e6      // $50k volume
        });

        // Tier 4 - Elite (top performers / whitelisted)
        tierConfigs[PraxisStructs.ExecutorTier.ELITE] = PraxisStructs.TierConfig({
            maxCapital: 500000e6,        // $500,000
            stakeRequiredBps: 500,       // 5%
            maxDrawdownBps: 1500,        // 15%
            allowedRiskLevel: 2,         // All strategies
            settlementsRequired: 50,
            profitRateBps: 7000,         // 70% profitable
            volumeRequired: 500000e6     // $500k volume
        });
    }

    // =============================================================
    //                      VIEW FUNCTIONS
    // =============================================================

    /**
     * @notice Get executor's current tier config
     * @param executor The executor address
     * @return The tier configuration for the executor's current tier
     */
    function getExecutorTierConfig(address executor) external view returns (PraxisStructs.TierConfig memory) {
        return tierConfigs[reputations[executor].tier];
    }

    /**
     * @notice Get tier config for a specific tier
     * @param tier The tier to query
     * @return The tier configuration
     */
    function getTierConfig(PraxisStructs.ExecutorTier tier) external view returns (PraxisStructs.TierConfig memory) {
        return tierConfigs[tier];
    }

    /**
     * @notice Get executor's full reputation record
     * @param executor The executor address
     * @return The executor's reputation data
     */
    function getReputation(address executor) external view returns (PraxisStructs.ExecutorReputation memory) {
        return reputations[executor];
    }

    /**
     * @notice Check if executor can request given capital amount
     * @param executor The executor address
     * @param capitalUsd The capital amount in USD (6 decimals)
     * @return Whether the executor can request this amount
     */
    function canRequestCapital(address executor, uint256 capitalUsd) external view returns (bool) {
        PraxisStructs.ExecutorReputation memory rep = reputations[executor];
        if (rep.isBanned) return false;

        PraxisStructs.TierConfig memory config = tierConfigs[rep.tier];
        return capitalUsd <= config.maxCapital;
    }

    /**
     * @notice Get required stake for executor and capital amount
     * @param executor The executor address
     * @param capitalUsd The capital amount in USD (6 decimals)
     * @return The required stake amount
     */
    function getRequiredStake(address executor, uint256 capitalUsd) external view returns (uint256) {
        PraxisStructs.TierConfig memory config = tierConfigs[reputations[executor].tier];
        return (capitalUsd * config.stakeRequiredBps) / BPS;
    }

    /**
     * @notice Get maximum allowed drawdown for executor
     * @param executor The executor address
     * @return The maximum drawdown in bps
     */
    function getMaxDrawdown(address executor) external view returns (uint16) {
        return tierConfigs[reputations[executor].tier].maxDrawdownBps;
    }

    /**
     * @notice Get maximum allowed risk level for executor
     * @param executor The executor address
     * @return The maximum risk level (0=Conservative, 1=Moderate, 2=Aggressive)
     */
    function getMaxRiskLevel(address executor) external view returns (uint8) {
        return tierConfigs[reputations[executor].tier].allowedRiskLevel;
    }

    /**
     * @notice Check if executor is banned
     * @param executor The executor address
     * @return Whether the executor is banned
     */
    function isBanned(address executor) external view returns (bool) {
        return reputations[executor].isBanned;
    }

    /**
     * @notice Check if executor is whitelisted
     * @param executor The executor address
     * @return Whether the executor is whitelisted
     */
    function isWhitelisted(address executor) external view returns (bool) {
        return reputations[executor].isWhitelisted;
    }

    /**
     * @notice Get executor's current tier
     * @param executor The executor address
     * @return The current tier
     */
    function getExecutorTier(address executor) external view returns (PraxisStructs.ExecutorTier) {
        return reputations[executor].tier;
    }

    /**
     * @notice Calculate profit rate for an executor
     * @param executor The executor address
     * @return profitRateBps The profit rate in basis points
     */
    function calculateProfitRate(address executor) public view returns (uint256 profitRateBps) {
        PraxisStructs.ExecutorReputation memory rep = reputations[executor];
        if (rep.totalSettlements == 0) return 0;
        return (rep.profitableSettlements * BPS) / rep.totalSettlements;
    }

    /**
     * @notice Check if executor qualifies for next tier
     * @param executor The executor address
     * @return qualifies Whether executor qualifies for upgrade
     * @return nextTier The next tier they would upgrade to
     */
    function checkTierUpgradeEligibility(address executor)
        external
        view
        returns (bool qualifies, PraxisStructs.ExecutorTier nextTier)
    {
        PraxisStructs.ExecutorReputation memory rep = reputations[executor];

        // Can't upgrade if banned or already elite
        if (rep.isBanned || rep.tier == PraxisStructs.ExecutorTier.ELITE) {
            return (false, rep.tier);
        }

        nextTier = PraxisStructs.ExecutorTier(uint8(rep.tier) + 1);
        PraxisStructs.TierConfig memory nextConfig = tierConfigs[nextTier];

        uint256 profitRate = calculateProfitRate(executor);

        bool meetsSettlements = rep.totalSettlements >= nextConfig.settlementsRequired;
        bool meetsProfitRate = profitRate >= nextConfig.profitRateBps;
        bool meetsVolume = rep.totalVolumeUsd >= nextConfig.volumeRequired;

        // Elite tier requires whitelist OR meeting all requirements
        if (nextTier == PraxisStructs.ExecutorTier.ELITE) {
            qualifies = rep.isWhitelisted || (meetsSettlements && meetsProfitRate && meetsVolume);
        } else {
            qualifies = meetsSettlements && meetsProfitRate && meetsVolume;
        }
    }

    // =============================================================
    //                   SETTLEMENT FUNCTIONS
    // =============================================================

    /**
     * @notice Record settlement and update reputation (called by SettlementEngine)
     * @param executor The executor address
     * @param capitalUsed The capital amount used in the ERT
     * @param pnl The profit or loss from the settlement
     * @param maxDrawdownHit The maximum drawdown hit during ERT lifetime
     */
    function recordSettlement(
        address executor,
        uint256 capitalUsed,
        int256 pnl,
        uint256 maxDrawdownHit
    ) external onlySettlement {
        PraxisStructs.ExecutorReputation storage rep = reputations[executor];

        rep.totalSettlements++;
        rep.totalVolumeUsd += capitalUsed;
        rep.totalPnlUsd += pnl;
        rep.lastSettlementTime = block.timestamp;

        if (pnl >= 0) {
            rep.profitableSettlements++;
            rep.consecutiveProfits++;
            rep.consecutiveLosses = 0;
        } else {
            rep.consecutiveLosses++;
            rep.consecutiveProfits = 0;

            // Track worst loss
            if (capitalUsed > 0) {
                uint256 lossBps = (uint256(-pnl) * BPS) / capitalUsed;
                if (lossBps > rep.largestLossBps) {
                    rep.largestLossBps = lossBps;
                }
            }
        }

        // Check for tier upgrade
        _checkTierUpgrade(executor);

        // Check for tier downgrade (consecutive losses)
        _checkTierDowngrade(executor);

        emit PraxisEvents.ReputationUpdated(executor, rep.totalSettlements, rep.totalPnlUsd);
    }

    // =============================================================
    //                    INTERNAL FUNCTIONS
    // =============================================================

    /**
     * @notice Check if executor qualifies for tier upgrade
     * @param executor The executor address
     */
    function _checkTierUpgrade(address executor) internal {
        PraxisStructs.ExecutorReputation storage rep = reputations[executor];

        // Can't upgrade if banned or already elite
        if (rep.isBanned || rep.tier == PraxisStructs.ExecutorTier.ELITE) return;

        // Check next tier requirements
        PraxisStructs.ExecutorTier nextTier = PraxisStructs.ExecutorTier(uint8(rep.tier) + 1);
        PraxisStructs.TierConfig memory nextConfig = tierConfigs[nextTier];

        uint256 profitRate = calculateProfitRate(executor);

        bool meetsSettlements = rep.totalSettlements >= nextConfig.settlementsRequired;
        bool meetsProfitRate = profitRate >= nextConfig.profitRateBps;
        bool meetsVolume = rep.totalVolumeUsd >= nextConfig.volumeRequired;

        // Elite tier requires whitelist OR meeting all requirements
        if (nextTier == PraxisStructs.ExecutorTier.ELITE) {
            if (rep.isWhitelisted || (meetsSettlements && meetsProfitRate && meetsVolume)) {
                PraxisStructs.ExecutorTier oldTier = rep.tier;
                rep.tier = nextTier;
                emit PraxisEvents.TierUpgrade(executor, oldTier, nextTier);
            }
        } else if (meetsSettlements && meetsProfitRate && meetsVolume) {
            PraxisStructs.ExecutorTier oldTier = rep.tier;
            rep.tier = nextTier;
            emit PraxisEvents.TierUpgrade(executor, oldTier, nextTier);
        }
    }

    /**
     * @notice Downgrade tier on consecutive losses
     * @param executor The executor address
     */
    function _checkTierDowngrade(address executor) internal {
        PraxisStructs.ExecutorReputation storage rep = reputations[executor];

        // 5 consecutive losses = drop one tier
        if (rep.consecutiveLosses >= DOWNGRADE_LOSS_THRESHOLD &&
            rep.tier != PraxisStructs.ExecutorTier.UNVERIFIED) {
            PraxisStructs.ExecutorTier oldTier = rep.tier;
            rep.tier = PraxisStructs.ExecutorTier(uint8(rep.tier) - 1);
            rep.consecutiveLosses = 0; // Reset after downgrade
            emit PraxisEvents.TierDowngrade(executor, oldTier, rep.tier);
        }
    }

    // =============================================================
    //                      ADMIN FUNCTIONS
    // =============================================================

    /**
     * @notice Set the settlement engine address
     * @param _settlementEngine The settlement engine address
     */
    function setSettlementEngine(address _settlementEngine) external onlyOwner {
        if (_settlementEngine == address(0)) revert PraxisErrors.ZeroAddress();
        settlementEngine = _settlementEngine;
    }

    /**
     * @notice Set the execution controller address
     * @param _executionController The execution controller address
     */
    function setExecutionController(address _executionController) external onlyOwner {
        if (_executionController == address(0)) revert PraxisErrors.ZeroAddress();
        executionController = _executionController;
    }

    /**
     * @notice Whitelist executor for Elite tier
     * @param executor The executor address to whitelist
     */
    function whitelistExecutor(address executor) external onlyOwner {
        if (executor == address(0)) revert PraxisErrors.ZeroAddress();

        reputations[executor].isWhitelisted = true;
        emit PraxisEvents.ExecutorWhitelisted(executor);

        // Check if they now qualify for upgrade
        _checkTierUpgrade(executor);
    }

    /**
     * @notice Remove whitelist from executor
     * @param executor The executor address
     */
    function removeWhitelist(address executor) external onlyOwner {
        reputations[executor].isWhitelisted = false;
    }

    /**
     * @notice Ban malicious executor
     * @param executor The executor address to ban
     * @param reason The reason for banning
     */
    function banExecutor(address executor, string calldata reason) external onlyOwner {
        if (executor == address(0)) revert PraxisErrors.ZeroAddress();

        reputations[executor].isBanned = true;
        emit PraxisEvents.ExecutorBanned(executor, reason);
    }

    /**
     * @notice Unban an executor
     * @param executor The executor address to unban
     */
    function unbanExecutor(address executor) external onlyOwner {
        reputations[executor].isBanned = false;
        // Reset to tier 0 after unban
        reputations[executor].tier = PraxisStructs.ExecutorTier.UNVERIFIED;
    }

    /**
     * @notice Update tier configuration
     * @param tier The tier to update
     * @param config The new configuration
     */
    function setTierConfig(
        PraxisStructs.ExecutorTier tier,
        PraxisStructs.TierConfig calldata config
    ) external onlyOwner {
        // Validate: stake must be >= max drawdown (except Elite which has reputation backing)
        if (tier != PraxisStructs.ExecutorTier.ELITE) {
            if (config.stakeRequiredBps < config.maxDrawdownBps) {
                revert PraxisErrors.StakeMustExceedDrawdown(config.stakeRequiredBps, config.maxDrawdownBps);
            }
        }

        tierConfigs[tier] = config;
    }

    /**
     * @notice Manually set executor tier (emergency use only)
     * @param executor The executor address
     * @param tier The tier to set
     */
    function setExecutorTier(address executor, PraxisStructs.ExecutorTier tier) external onlyOwner {
        if (executor == address(0)) revert PraxisErrors.ZeroAddress();
        if (uint8(tier) > uint8(PraxisStructs.ExecutorTier.ELITE)) {
            revert PraxisErrors.InvalidTier(uint8(tier));
        }

        PraxisStructs.ExecutorTier oldTier = reputations[executor].tier;
        reputations[executor].tier = tier;

        if (uint8(tier) > uint8(oldTier)) {
            emit PraxisEvents.TierUpgrade(executor, oldTier, tier);
        } else if (uint8(tier) < uint8(oldTier)) {
            emit PraxisEvents.TierDowngrade(executor, oldTier, tier);
        }
    }
}
