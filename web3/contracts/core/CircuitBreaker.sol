// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

import {Ownable} from "@openzeppelin/contracts/access/Ownable.sol";
import {PraxisErrors} from "../lib/PraxisErrors.sol";
import {PraxisEvents} from "../lib/PraxisEvents.sol";

/**
 * @title CircuitBreaker
 * @notice Monitors vault losses and triggers emergency pause when thresholds are exceeded
 * @dev Prevents cascading losses during market crashes or coordinated attacks
 */
contract CircuitBreaker is Ownable {
    // =============================================================
    //                          CONSTANTS
    // =============================================================

    /// @notice Basis points denominator
    uint256 public constant BPS = 10000;

    /// @notice Default maximum daily loss before circuit breaker triggers (5%)
    uint256 public constant DEFAULT_MAX_DAILY_LOSS_BPS = 500;

    /// @notice One day in seconds
    uint256 public constant ONE_DAY = 1 days;

    // =============================================================
    //                          STORAGE
    // =============================================================

    /// @notice Maximum daily loss in basis points
    uint256 public maxDailyLossBps;

    /// @notice Accumulated loss for current day
    uint256 public dailyLossAccumulated;

    /// @notice Timestamp of last daily reset
    uint256 public lastResetTimestamp;

    /// @notice Snapshot of total assets at day start
    uint256 public snapshotTotalAssets;

    /// @notice Whether the circuit breaker is active (paused)
    bool public isPaused;

    /// @notice Reference to the execution vault
    address public vault;

    /// @notice Reference to the settlement engine
    address public settlementEngine;

    /// @notice Cooldown period before manual unpause is allowed
    uint256 public unpauseCooldown;

    /// @notice Timestamp when pause was triggered
    uint256 public pausedAt;

    // =============================================================
    //                          EVENTS
    // =============================================================

    event DailyLossRecorded(uint256 amount, uint256 totalDaily, uint256 lossBps);
    event DailyReset(uint256 newSnapshot);
    event MaxDailyLossUpdated(uint256 oldMax, uint256 newMax);
    event UnpauseCooldownUpdated(uint256 oldCooldown, uint256 newCooldown);

    // =============================================================
    //                          MODIFIERS
    // =============================================================

    modifier onlySettlement() {
        if (msg.sender != settlementEngine) {
            revert PraxisErrors.OnlySettlement();
        }
        _;
    }

    modifier whenNotPaused() {
        if (isPaused) {
            revert PraxisErrors.CircuitBreakerActive();
        }
        _;
    }

    // =============================================================
    //                         CONSTRUCTOR
    // =============================================================

    /**
     * @notice Initialize the CircuitBreaker
     * @param _vault Address of the execution vault
     * @param _initialSnapshot Initial total assets snapshot
     */
    constructor(address _vault, uint256 _initialSnapshot) Ownable(msg.sender) {
        if (_vault == address(0)) revert PraxisErrors.ZeroAddress();

        vault = _vault;
        maxDailyLossBps = DEFAULT_MAX_DAILY_LOSS_BPS;
        snapshotTotalAssets = _initialSnapshot;
        lastResetTimestamp = block.timestamp;
        unpauseCooldown = 1 hours;
    }

    // =============================================================
    //                      CORE FUNCTIONS
    // =============================================================

    /**
     * @notice Record a loss from settlement
     * @param lossAmount The loss amount in base asset
     */
    function recordLoss(uint256 lossAmount) external onlySettlement {
        _resetIfNewDay();

        dailyLossAccumulated += lossAmount;

        uint256 lossBps = 0;
        if (snapshotTotalAssets > 0) {
            lossBps = (dailyLossAccumulated * BPS) / snapshotTotalAssets;
        }

        emit DailyLossRecorded(lossAmount, dailyLossAccumulated, lossBps);

        _checkAndTrigger();
    }

    /**
     * @notice Record a profit (reduces accumulated loss tracking)
     * @param profitAmount The profit amount in base asset
     */
    function recordProfit(uint256 profitAmount) external onlySettlement {
        _resetIfNewDay();

        // Profits offset losses for the day
        if (profitAmount >= dailyLossAccumulated) {
            dailyLossAccumulated = 0;
        } else {
            dailyLossAccumulated -= profitAmount;
        }
    }

    /**
     * @notice Update the total assets snapshot (called when vault balance changes significantly)
     * @param newTotalAssets The new total assets value
     */
    function updateSnapshot(uint256 newTotalAssets) external {
        if (msg.sender != vault && msg.sender != settlementEngine && msg.sender != owner()) {
            revert PraxisErrors.Unauthorized();
        }

        // Check if a new day has started BEFORE resetting (since _resetIfNewDay updates lastResetTimestamp)
        bool isNewDay = block.timestamp >= lastResetTimestamp + ONE_DAY;

        _resetIfNewDay();

        // Only update snapshot if it's a new day (checked before reset updated lastResetTimestamp)
        if (isNewDay) {
            snapshotTotalAssets = newTotalAssets;
            // Note: DailyReset event already emitted by _resetIfNewDay(), emit again with new snapshot
            emit DailyReset(newTotalAssets);
        }
    }

    // =============================================================
    //                    INTERNAL FUNCTIONS
    // =============================================================

    /**
     * @notice Check if circuit breaker should trigger
     */
    function _checkAndTrigger() internal {
        if (snapshotTotalAssets == 0) return;

        uint256 lossBps = (dailyLossAccumulated * BPS) / snapshotTotalAssets;

        if (lossBps >= maxDailyLossBps) {
            // Only update pausedAt when transitioning from unpaused to paused
            // This preserves the original pause time for auto-unpause calculation
            if (!isPaused) {
                isPaused = true;
                pausedAt = block.timestamp;
                emit PraxisEvents.CircuitBreakerTriggered(dailyLossAccumulated, lossBps);
            }
        }
    }

    /**
     * @notice Reset daily tracking if new day
     */
    function _resetIfNewDay() internal {
        if (block.timestamp >= lastResetTimestamp + ONE_DAY) {
            dailyLossAccumulated = 0;
            lastResetTimestamp = (block.timestamp / ONE_DAY) * ONE_DAY; // Normalize to day boundary

            // Auto-unpause on new day if was paused
            if (isPaused && block.timestamp >= pausedAt + ONE_DAY) {
                isPaused = false;
                emit PraxisEvents.CircuitBreakerReset(address(this));
            }

            emit DailyReset(snapshotTotalAssets);
        }
    }

    // =============================================================
    //                      VIEW FUNCTIONS
    // =============================================================

    /**
     * @notice Check if new ERTs can be minted
     * @return Whether the system is accepting new ERTs
     */
    function canMintERT() external view returns (bool) {
        return !isPaused;
    }

    /**
     * @notice Get current daily loss in basis points
     * @return The current daily loss percentage
     */
    function getCurrentDailyLossBps() external view returns (uint256) {
        if (snapshotTotalAssets == 0) return 0;
        return (dailyLossAccumulated * BPS) / snapshotTotalAssets;
    }

    /**
     * @notice Get remaining loss capacity before circuit breaker triggers
     * @return The remaining loss capacity in base asset
     */
    function remainingLossCapacity() external view returns (uint256) {
        uint256 maxLoss = (snapshotTotalAssets * maxDailyLossBps) / BPS;
        if (dailyLossAccumulated >= maxLoss) return 0;
        return maxLoss - dailyLossAccumulated;
    }

    /**
     * @notice Check if a potential loss would trigger the circuit breaker
     * @param potentialLoss The potential loss amount
     * @return Whether this loss would trigger the breaker
     */
    function wouldTrigger(uint256 potentialLoss) external view returns (bool) {
        if (snapshotTotalAssets == 0) return false;
        uint256 totalLoss = dailyLossAccumulated + potentialLoss;
        uint256 lossBps = (totalLoss * BPS) / snapshotTotalAssets;
        return lossBps >= maxDailyLossBps;
    }

    /**
     * @notice Get time until auto-reset
     * @return Seconds until the next daily reset
     */
    function timeUntilReset() external view returns (uint256) {
        uint256 nextReset = lastResetTimestamp + ONE_DAY;
        if (block.timestamp >= nextReset) return 0;
        return nextReset - block.timestamp;
    }

    /**
     * @notice Check if manual unpause is available
     * @return Whether manual unpause can be called
     */
    function canManualUnpause() external view returns (bool) {
        return isPaused && block.timestamp >= pausedAt + unpauseCooldown;
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
     * @notice Update the vault address
     * @param _vault New vault address
     */
    function setVault(address _vault) external onlyOwner {
        if (_vault == address(0)) revert PraxisErrors.ZeroAddress();
        vault = _vault;
    }

    /**
     * @notice Update maximum daily loss threshold
     * @param _maxDailyLossBps New maximum in basis points
     */
    function setMaxDailyLoss(uint256 _maxDailyLossBps) external onlyOwner {
        if (_maxDailyLossBps > BPS) {
            revert PraxisErrors.ArrayLengthMismatch(BPS, _maxDailyLossBps);
        }

        uint256 oldMax = maxDailyLossBps;
        maxDailyLossBps = _maxDailyLossBps;

        emit MaxDailyLossUpdated(oldMax, _maxDailyLossBps);
    }

    /**
     * @notice Update unpause cooldown
     * @param _cooldown New cooldown period in seconds
     */
    function setUnpauseCooldown(uint256 _cooldown) external onlyOwner {
        uint256 oldCooldown = unpauseCooldown;
        unpauseCooldown = _cooldown;
        emit UnpauseCooldownUpdated(oldCooldown, _cooldown);
    }

    /**
     * @notice Manual unpause (after cooldown period)
     * @dev Also resets daily loss to give a fresh start after admin intervention
     */
    function manualUnpause() external onlyOwner {
        if (!isPaused) return;
        if (block.timestamp < pausedAt + unpauseCooldown) {
            revert PraxisErrors.CooldownNotElapsed(pausedAt + unpauseCooldown, block.timestamp);
        }

        isPaused = false;
        // Reset daily loss to prevent immediate re-trigger after admin intervention
        dailyLossAccumulated = 0;
        emit PraxisEvents.CircuitBreakerReset(msg.sender);
    }

    /**
     * @notice Emergency pause (can be called anytime by owner)
     */
    function emergencyPause() external onlyOwner {
        isPaused = true;
        pausedAt = block.timestamp;
        emit PraxisEvents.CircuitBreakerTriggered(dailyLossAccumulated, 0);
    }

    /**
     * @notice Force reset daily tracking (emergency use)
     * @param newSnapshot New total assets snapshot
     */
    function forceReset(uint256 newSnapshot) external onlyOwner {
        dailyLossAccumulated = 0;
        lastResetTimestamp = block.timestamp;
        snapshotTotalAssets = newSnapshot;
        emit DailyReset(newSnapshot);
    }
}
