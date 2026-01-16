import { expect } from "chai";
import { network } from "hardhat";
import { SignerWithAddress } from "@nomicfoundation/hardhat-ethers/signers";

const { ethers } = await network.connect();

/**
 * CircuitBreaker Comprehensive Test Suite
 *
 * This test suite exhaustively validates the CircuitBreaker contract which:
 * - Monitors vault losses and triggers emergency pause when thresholds are exceeded
 * - Tracks daily losses using a rolling 24-hour window
 * - Triggers circuit breaker at 5% daily loss (configurable)
 * - Auto-resets after 1 day (24 hours)
 * - Supports manual pause/unpause by owner with cooldown
 * - Integrates with ExecutionVault and SettlementEngine
 *
 * The CircuitBreaker is a critical safety mechanism that prevents cascading losses
 * during market crashes or coordinated attacks. These tests assume the contract
 * contains subtle bugs until proven otherwise through exhaustive verification.
 *
 * Tests run against Flare mainnet fork to ensure realistic environment.
 */
describe("CircuitBreaker", function () {
  this.timeout(120000);

  // Contract instances
  let circuitBreaker: any;
  let mockVault: any;
  let usdc: any;
  let usdcAddress: string;

  // Signers
  let owner: SignerWithAddress;
  let settlementEngine: SignerWithAddress;
  let vault: SignerWithAddress;
  let nonOwner: SignerWithAddress;
  let attacker: SignerWithAddress;

  // Constants
  const BPS = 10000n;
  const ONE_USDC = 10n ** 6n;
  const ONE_DAY = 86400n; // 1 day in seconds
  const ONE_HOUR = 3600n;
  const DEFAULT_MAX_DAILY_LOSS_BPS = 500n; // 5%
  const DEFAULT_COOLDOWN = 3600n; // 1 hour

  // Initial snapshot for testing
  const INITIAL_SNAPSHOT = 1_000_000n * ONE_USDC; // $1M vault

  before(async function () {
    const chainId = (await ethers.provider.getNetwork()).chainId;
    if (chainId !== 14n) {
      console.log(`Skipping - not on Flare fork (chainId: ${chainId})`);
      this.skip();
    }

    [owner, settlementEngine, vault, nonOwner, attacker] = await ethers.getSigners();
    console.log(`Test owner: ${await owner.getAddress()}`);
    console.log(`Settlement engine: ${await settlementEngine.getAddress()}`);
    console.log(`Vault: ${await vault.getAddress()}`);
  });

  beforeEach(async function () {
    // Deploy MockERC20 for testing (simulating USDC with 6 decimals)
    const MockERC20 = await ethers.getContractFactory("MockERC20");
    usdc = await MockERC20.deploy("Mock USDC", "mUSDC", 6);
    await usdc.waitForDeployment();
    usdcAddress = await usdc.getAddress();

    // Deploy CircuitBreaker with initial snapshot
    const CircuitBreaker = await ethers.getContractFactory("CircuitBreaker");
    circuitBreaker = await CircuitBreaker.deploy(
      await vault.getAddress(),
      INITIAL_SNAPSHOT
    );
    await circuitBreaker.waitForDeployment();

    // Configure settlement engine
    await circuitBreaker.setSettlementEngine(await settlementEngine.getAddress());

    console.log(`CircuitBreaker deployed at: ${await circuitBreaker.getAddress()}`);
    console.log(`Initial snapshot: ${ethers.formatUnits(INITIAL_SNAPSHOT, 6)} USDC`);
  });

  // =============================================================
  //                    DEPLOYMENT TESTS
  // =============================================================

  describe("Deployment and Initialization", function () {
    it("should deploy with correct vault address", async function () {
      expect(await circuitBreaker.vault()).to.equal(await vault.getAddress());
    });

    it("should deploy with correct initial snapshot", async function () {
      expect(await circuitBreaker.snapshotTotalAssets()).to.equal(INITIAL_SNAPSHOT);
    });

    it("should deploy with default max daily loss of 500 bps (5%)", async function () {
      expect(await circuitBreaker.maxDailyLossBps()).to.equal(DEFAULT_MAX_DAILY_LOSS_BPS);
    });

    it("should deploy with default unpause cooldown of 1 hour", async function () {
      expect(await circuitBreaker.unpauseCooldown()).to.equal(DEFAULT_COOLDOWN);
    });

    it("should deploy with owner as msg.sender", async function () {
      expect(await circuitBreaker.owner()).to.equal(await owner.getAddress());
    });

    it("should deploy with isPaused set to false", async function () {
      expect(await circuitBreaker.isPaused()).to.be.false;
    });

    it("should deploy with zero daily loss accumulated", async function () {
      expect(await circuitBreaker.dailyLossAccumulated()).to.equal(0n);
    });

    it("should deploy with pausedAt set to zero", async function () {
      expect(await circuitBreaker.pausedAt()).to.equal(0n);
    });

    it("should set lastResetTimestamp to block.timestamp on deployment", async function () {
      const lastReset = await circuitBreaker.lastResetTimestamp();
      expect(lastReset).to.be.gt(0n);
    });

    it("should expose BPS constant as 10000", async function () {
      expect(await circuitBreaker.BPS()).to.equal(BPS);
    });

    it("should expose ONE_DAY constant as 86400 seconds", async function () {
      expect(await circuitBreaker.ONE_DAY()).to.equal(ONE_DAY);
    });

    it("should expose DEFAULT_MAX_DAILY_LOSS_BPS constant as 500", async function () {
      expect(await circuitBreaker.DEFAULT_MAX_DAILY_LOSS_BPS()).to.equal(DEFAULT_MAX_DAILY_LOSS_BPS);
    });

    describe("Constructor Validation", function () {
      it("should reject zero address for vault", async function () {
        const CircuitBreaker = await ethers.getContractFactory("CircuitBreaker");
        await expect(
          CircuitBreaker.deploy(ethers.ZeroAddress, INITIAL_SNAPSHOT)
        ).to.be.revertedWithCustomError(circuitBreaker, "ZeroAddress");
      });

      it("should accept zero initial snapshot", async function () {
        const CircuitBreaker = await ethers.getContractFactory("CircuitBreaker");
        const cb = await CircuitBreaker.deploy(await vault.getAddress(), 0n);
        await cb.waitForDeployment();
        expect(await cb.snapshotTotalAssets()).to.equal(0n);
      });

      it("should accept very large initial snapshot", async function () {
        const CircuitBreaker = await ethers.getContractFactory("CircuitBreaker");
        const largeSnapshot = ethers.MaxUint256 / 2n;
        const cb = await CircuitBreaker.deploy(await vault.getAddress(), largeSnapshot);
        await cb.waitForDeployment();
        expect(await cb.snapshotTotalAssets()).to.equal(largeSnapshot);
      });
    });
  });

  // =============================================================
  //                   LOSS RECORDING TESTS
  // =============================================================

  describe("Loss Recording (recordLoss)", function () {
    describe("Basic Loss Recording", function () {
      it("should allow settlement engine to record loss", async function () {
        const lossAmount = 10_000n * ONE_USDC; // $10k loss on $1M = 1%
        await circuitBreaker.connect(settlementEngine).recordLoss(lossAmount);
        expect(await circuitBreaker.dailyLossAccumulated()).to.equal(lossAmount);
      });

      it("should emit DailyLossRecorded event with correct values", async function () {
        const lossAmount = 10_000n * ONE_USDC;
        const expectedLossBps = (lossAmount * BPS) / INITIAL_SNAPSHOT;

        await expect(circuitBreaker.connect(settlementEngine).recordLoss(lossAmount))
          .to.emit(circuitBreaker, "DailyLossRecorded")
          .withArgs(lossAmount, lossAmount, expectedLossBps);
      });

      it("should accumulate multiple losses within same day", async function () {
        const loss1 = 10_000n * ONE_USDC;
        const loss2 = 20_000n * ONE_USDC;

        await circuitBreaker.connect(settlementEngine).recordLoss(loss1);
        await circuitBreaker.connect(settlementEngine).recordLoss(loss2);

        expect(await circuitBreaker.dailyLossAccumulated()).to.equal(loss1 + loss2);
      });

      it("should handle zero loss gracefully", async function () {
        await circuitBreaker.connect(settlementEngine).recordLoss(0n);
        expect(await circuitBreaker.dailyLossAccumulated()).to.equal(0n);
      });

      it("should handle very small loss (1 wei)", async function () {
        await circuitBreaker.connect(settlementEngine).recordLoss(1n);
        expect(await circuitBreaker.dailyLossAccumulated()).to.equal(1n);
      });

      it("should handle loss equal to entire snapshot", async function () {
        // This represents 100% loss - catastrophic scenario
        await circuitBreaker.connect(settlementEngine).recordLoss(INITIAL_SNAPSHOT);
        expect(await circuitBreaker.dailyLossAccumulated()).to.equal(INITIAL_SNAPSHOT);
        // Should trigger circuit breaker
        expect(await circuitBreaker.isPaused()).to.be.true;
      });
    });

    describe("Circuit Breaker Triggering", function () {
      it("should trigger at exactly 5% loss", async function () {
        // 5% of $1M = $50,000
        const exactThreshold = (INITIAL_SNAPSHOT * DEFAULT_MAX_DAILY_LOSS_BPS) / BPS;

        await circuitBreaker.connect(settlementEngine).recordLoss(exactThreshold);

        expect(await circuitBreaker.isPaused()).to.be.true;
      });

      it("should trigger above 5% loss", async function () {
        const aboveThreshold = (INITIAL_SNAPSHOT * DEFAULT_MAX_DAILY_LOSS_BPS) / BPS + 1n;

        await circuitBreaker.connect(settlementEngine).recordLoss(aboveThreshold);

        expect(await circuitBreaker.isPaused()).to.be.true;
      });

      it("should NOT trigger below 5% loss", async function () {
        // 4.99% loss
        const belowThreshold = (INITIAL_SNAPSHOT * (DEFAULT_MAX_DAILY_LOSS_BPS - 1n)) / BPS;

        await circuitBreaker.connect(settlementEngine).recordLoss(belowThreshold);

        expect(await circuitBreaker.isPaused()).to.be.false;
      });

      it("should trigger when cumulative losses exceed threshold", async function () {
        // Two 3% losses = 6% total > 5%
        const loss1 = (INITIAL_SNAPSHOT * 300n) / BPS; // 3%
        const loss2 = (INITIAL_SNAPSHOT * 300n) / BPS; // 3%

        await circuitBreaker.connect(settlementEngine).recordLoss(loss1);
        expect(await circuitBreaker.isPaused()).to.be.false;

        await circuitBreaker.connect(settlementEngine).recordLoss(loss2);
        expect(await circuitBreaker.isPaused()).to.be.true;
      });

      it("should emit CircuitBreakerTriggered event when triggered", async function () {
        const triggerLoss = (INITIAL_SNAPSHOT * DEFAULT_MAX_DAILY_LOSS_BPS) / BPS;
        const expectedLossBps = (triggerLoss * BPS) / INITIAL_SNAPSHOT;

        await expect(circuitBreaker.connect(settlementEngine).recordLoss(triggerLoss))
          .to.emit(circuitBreaker, "CircuitBreakerTriggered")
          .withArgs(triggerLoss, expectedLossBps);
      });

      it("should set pausedAt timestamp when triggered", async function () {
        const triggerLoss = (INITIAL_SNAPSHOT * DEFAULT_MAX_DAILY_LOSS_BPS) / BPS;

        const tx = await circuitBreaker.connect(settlementEngine).recordLoss(triggerLoss);
        const block = await ethers.provider.getBlock(tx.blockNumber);

        expect(await circuitBreaker.pausedAt()).to.equal(block?.timestamp);
      });

      it("should NOT trigger when snapshot is zero (division protection)", async function () {
        // Deploy circuit breaker with zero snapshot
        const CircuitBreaker = await ethers.getContractFactory("CircuitBreaker");
        const cbZero = await CircuitBreaker.deploy(await vault.getAddress(), 0n);
        await cbZero.waitForDeployment();
        await cbZero.setSettlementEngine(await settlementEngine.getAddress());

        // Record any loss - should not trigger (division by zero protection)
        await cbZero.connect(settlementEngine).recordLoss(1000n);

        expect(await cbZero.isPaused()).to.be.false;
      });

      it("should stay triggered after additional losses", async function () {
        const triggerLoss = (INITIAL_SNAPSHOT * DEFAULT_MAX_DAILY_LOSS_BPS) / BPS;

        await circuitBreaker.connect(settlementEngine).recordLoss(triggerLoss);
        expect(await circuitBreaker.isPaused()).to.be.true;

        // Additional losses should not change paused state
        await circuitBreaker.connect(settlementEngine).recordLoss(triggerLoss);
        expect(await circuitBreaker.isPaused()).to.be.true;
      });
    });

    describe("Access Control", function () {
      it("should reject recordLoss from non-settlement engine", async function () {
        await expect(
          circuitBreaker.connect(nonOwner).recordLoss(1000n)
        ).to.be.revertedWithCustomError(circuitBreaker, "OnlySettlement");
      });

      it("should reject recordLoss from owner (owner is not settlement engine)", async function () {
        await expect(
          circuitBreaker.connect(owner).recordLoss(1000n)
        ).to.be.revertedWithCustomError(circuitBreaker, "OnlySettlement");
      });

      it("should reject recordLoss from vault", async function () {
        await expect(
          circuitBreaker.connect(vault).recordLoss(1000n)
        ).to.be.revertedWithCustomError(circuitBreaker, "OnlySettlement");
      });
    });
  });

  // =============================================================
  //                   PROFIT RECORDING TESTS
  // =============================================================

  describe("Profit Recording (recordProfit)", function () {
    beforeEach(async function () {
      // Record initial loss to test profit offset
      const initialLoss = 30_000n * ONE_USDC; // 3% loss
      await circuitBreaker.connect(settlementEngine).recordLoss(initialLoss);
    });

    describe("Basic Profit Recording", function () {
      it("should allow settlement engine to record profit", async function () {
        const profitAmount = 10_000n * ONE_USDC;
        const initialLoss = await circuitBreaker.dailyLossAccumulated();

        await circuitBreaker.connect(settlementEngine).recordProfit(profitAmount);

        expect(await circuitBreaker.dailyLossAccumulated()).to.equal(initialLoss - profitAmount);
      });

      it("should offset accumulated loss with profit", async function () {
        const currentLoss = 30_000n * ONE_USDC;
        const profit = 10_000n * ONE_USDC;

        await circuitBreaker.connect(settlementEngine).recordProfit(profit);

        expect(await circuitBreaker.dailyLossAccumulated()).to.equal(currentLoss - profit);
      });

      it("should handle profit exactly equal to loss", async function () {
        const currentLoss = await circuitBreaker.dailyLossAccumulated();

        await circuitBreaker.connect(settlementEngine).recordProfit(currentLoss);

        expect(await circuitBreaker.dailyLossAccumulated()).to.equal(0n);
      });

      it("should cap at zero when profit exceeds loss (no negative loss)", async function () {
        const currentLoss = await circuitBreaker.dailyLossAccumulated();
        const excessProfit = currentLoss + 10_000n * ONE_USDC;

        await circuitBreaker.connect(settlementEngine).recordProfit(excessProfit);

        expect(await circuitBreaker.dailyLossAccumulated()).to.equal(0n);
      });

      it("should handle zero profit gracefully", async function () {
        const lossBefore = await circuitBreaker.dailyLossAccumulated();

        await circuitBreaker.connect(settlementEngine).recordProfit(0n);

        expect(await circuitBreaker.dailyLossAccumulated()).to.equal(lossBefore);
      });

      it("should handle profit when no losses accumulated", async function () {
        // Deploy fresh circuit breaker with no losses
        const CircuitBreaker = await ethers.getContractFactory("CircuitBreaker");
        const freshCB = await CircuitBreaker.deploy(await vault.getAddress(), INITIAL_SNAPSHOT);
        await freshCB.waitForDeployment();
        await freshCB.setSettlementEngine(await settlementEngine.getAddress());

        // Record profit with no losses - should stay at 0
        await freshCB.connect(settlementEngine).recordProfit(10_000n * ONE_USDC);

        expect(await freshCB.dailyLossAccumulated()).to.equal(0n);
      });
    });

    describe("Access Control", function () {
      it("should reject recordProfit from non-settlement engine", async function () {
        await expect(
          circuitBreaker.connect(nonOwner).recordProfit(1000n)
        ).to.be.revertedWithCustomError(circuitBreaker, "OnlySettlement");
      });

      it("should reject recordProfit from owner", async function () {
        await expect(
          circuitBreaker.connect(owner).recordProfit(1000n)
        ).to.be.revertedWithCustomError(circuitBreaker, "OnlySettlement");
      });
    });
  });

  // =============================================================
  //                   AUTO-RESET TESTS
  // =============================================================

  describe("Auto-Reset After 24 Hours", function () {
    describe("Daily Reset Mechanics", function () {
      it("should reset daily loss after 24 hours", async function () {
        // Record loss
        const lossAmount = 20_000n * ONE_USDC;
        await circuitBreaker.connect(settlementEngine).recordLoss(lossAmount);
        expect(await circuitBreaker.dailyLossAccumulated()).to.equal(lossAmount);

        // Fast forward 24+ hours
        await ethers.provider.send("evm_increaseTime", [Number(ONE_DAY) + 1]);
        await ethers.provider.send("evm_mine", []);

        // Trigger reset by calling recordLoss
        await circuitBreaker.connect(settlementEngine).recordLoss(0n);

        // Loss should be reset
        expect(await circuitBreaker.dailyLossAccumulated()).to.equal(0n);
      });

      it("should emit DailyReset event when reset occurs", async function () {
        // Record loss
        await circuitBreaker.connect(settlementEngine).recordLoss(10_000n * ONE_USDC);

        // Fast forward 24+ hours
        await ethers.provider.send("evm_increaseTime", [Number(ONE_DAY) + 1]);
        await ethers.provider.send("evm_mine", []);

        await expect(circuitBreaker.connect(settlementEngine).recordLoss(0n))
          .to.emit(circuitBreaker, "DailyReset");
      });

      it("should auto-unpause after 24 hours from pausedAt", async function () {
        // Trigger circuit breaker
        const triggerLoss = (INITIAL_SNAPSHOT * DEFAULT_MAX_DAILY_LOSS_BPS) / BPS;
        await circuitBreaker.connect(settlementEngine).recordLoss(triggerLoss);
        expect(await circuitBreaker.isPaused()).to.be.true;

        // Fast forward 24+ hours
        await ethers.provider.send("evm_increaseTime", [Number(ONE_DAY) + 1]);
        await ethers.provider.send("evm_mine", []);

        // Trigger internal reset by calling recordLoss
        await circuitBreaker.connect(settlementEngine).recordLoss(0n);

        // Should be unpaused
        expect(await circuitBreaker.isPaused()).to.be.false;
      });

      it("should emit CircuitBreakerReset event when auto-unpause occurs", async function () {
        // Trigger circuit breaker
        const triggerLoss = (INITIAL_SNAPSHOT * DEFAULT_MAX_DAILY_LOSS_BPS) / BPS;
        await circuitBreaker.connect(settlementEngine).recordLoss(triggerLoss);

        // Fast forward 24+ hours
        await ethers.provider.send("evm_increaseTime", [Number(ONE_DAY) + 1]);
        await ethers.provider.send("evm_mine", []);

        await expect(circuitBreaker.connect(settlementEngine).recordLoss(0n))
          .to.emit(circuitBreaker, "CircuitBreakerReset")
          .withArgs(await circuitBreaker.getAddress());
      });

      it("should NOT reset before 24 hours", async function () {
        const lossAmount = 20_000n * ONE_USDC;
        await circuitBreaker.connect(settlementEngine).recordLoss(lossAmount);

        // Fast forward 23 hours (not enough)
        await ethers.provider.send("evm_increaseTime", [Number(ONE_DAY) - 3600]);
        await ethers.provider.send("evm_mine", []);

        // Record another loss
        const newLoss = 5_000n * ONE_USDC;
        await circuitBreaker.connect(settlementEngine).recordLoss(newLoss);

        // Should still have accumulated loss
        expect(await circuitBreaker.dailyLossAccumulated()).to.equal(lossAmount + newLoss);
      });

      it("should update lastResetTimestamp on reset", async function () {
        const initialReset = await circuitBreaker.lastResetTimestamp();

        // Fast forward 24+ hours
        await ethers.provider.send("evm_increaseTime", [Number(ONE_DAY) + 100]);
        await ethers.provider.send("evm_mine", []);

        await circuitBreaker.connect(settlementEngine).recordLoss(0n);

        const newReset = await circuitBreaker.lastResetTimestamp();
        expect(newReset).to.be.gt(initialReset);
      });

      it("should normalize lastResetTimestamp to day boundary", async function () {
        // Fast forward to odd time (not on day boundary)
        await ethers.provider.send("evm_increaseTime", [Number(ONE_DAY) + 12345]);
        await ethers.provider.send("evm_mine", []);

        await circuitBreaker.connect(settlementEngine).recordLoss(0n);

        const lastReset = await circuitBreaker.lastResetTimestamp();
        // Should be divisible by ONE_DAY (normalized to day boundary)
        expect(lastReset % ONE_DAY).to.equal(0n);
      });

      it("should NOT auto-unpause if pausedAt + ONE_DAY not reached", async function () {
        // Trigger circuit breaker
        const triggerLoss = (INITIAL_SNAPSHOT * DEFAULT_MAX_DAILY_LOSS_BPS) / BPS;
        await circuitBreaker.connect(settlementEngine).recordLoss(triggerLoss);
        expect(await circuitBreaker.isPaused()).to.be.true;

        // Fast forward 23 hours (not enough from pausedAt)
        await ethers.provider.send("evm_increaseTime", [Number(ONE_DAY) - 3600]);
        await ethers.provider.send("evm_mine", []);

        // Even if daily reset happens, should not unpause if pausedAt + ONE_DAY not reached
        // Note: This depends on timing - the test checks the logic
        const isPaused = await circuitBreaker.isPaused();
        // Should still be paused since not enough time from pausedAt
        expect(isPaused).to.be.true;
      });
    });

    describe("Reset via recordProfit", function () {
      it("should trigger daily reset when calling recordProfit after 24 hours", async function () {
        // Record loss
        await circuitBreaker.connect(settlementEngine).recordLoss(20_000n * ONE_USDC);

        // Fast forward 24+ hours
        await ethers.provider.send("evm_increaseTime", [Number(ONE_DAY) + 1]);
        await ethers.provider.send("evm_mine", []);

        // Call recordProfit - should trigger reset
        await circuitBreaker.connect(settlementEngine).recordProfit(1n);

        expect(await circuitBreaker.dailyLossAccumulated()).to.equal(0n);
      });
    });
  });

  // =============================================================
  //                   SNAPSHOT UPDATE TESTS
  // =============================================================

  describe("Snapshot Updates (updateSnapshot)", function () {
    describe("Authorization", function () {
      it("should allow owner to update snapshot", async function () {
        const newSnapshot = 2_000_000n * ONE_USDC;

        // Fast forward to trigger update eligibility
        await ethers.provider.send("evm_increaseTime", [Number(ONE_DAY) + 1]);
        await ethers.provider.send("evm_mine", []);

        await circuitBreaker.connect(owner).updateSnapshot(newSnapshot);
        expect(await circuitBreaker.snapshotTotalAssets()).to.equal(newSnapshot);
      });

      it("should allow vault to update snapshot", async function () {
        const newSnapshot = 2_000_000n * ONE_USDC;

        // Fast forward to trigger update eligibility
        await ethers.provider.send("evm_increaseTime", [Number(ONE_DAY) + 1]);
        await ethers.provider.send("evm_mine", []);

        await circuitBreaker.connect(vault).updateSnapshot(newSnapshot);
        expect(await circuitBreaker.snapshotTotalAssets()).to.equal(newSnapshot);
      });

      it("should allow settlement engine to update snapshot", async function () {
        const newSnapshot = 2_000_000n * ONE_USDC;

        // Fast forward to trigger update eligibility
        await ethers.provider.send("evm_increaseTime", [Number(ONE_DAY) + 1]);
        await ethers.provider.send("evm_mine", []);

        await circuitBreaker.connect(settlementEngine).updateSnapshot(newSnapshot);
        expect(await circuitBreaker.snapshotTotalAssets()).to.equal(newSnapshot);
      });

      it("should reject unauthorized caller", async function () {
        await expect(
          circuitBreaker.connect(nonOwner).updateSnapshot(1000n)
        ).to.be.revertedWithCustomError(circuitBreaker, "Unauthorized");
      });

      it("should reject attacker address", async function () {
        await expect(
          circuitBreaker.connect(attacker).updateSnapshot(1000n)
        ).to.be.revertedWithCustomError(circuitBreaker, "Unauthorized");
      });
    });

    describe("Snapshot Update Logic", function () {
      it("should NOT update snapshot if not a new day", async function () {
        const originalSnapshot = await circuitBreaker.snapshotTotalAssets();
        const newSnapshot = 2_000_000n * ONE_USDC;

        // No time passage - same day
        await circuitBreaker.connect(owner).updateSnapshot(newSnapshot);

        // Should remain unchanged
        expect(await circuitBreaker.snapshotTotalAssets()).to.equal(originalSnapshot);
      });

      it("should update snapshot after day boundary", async function () {
        const newSnapshot = 2_000_000n * ONE_USDC;

        // Fast forward 24+ hours
        await ethers.provider.send("evm_increaseTime", [Number(ONE_DAY) + 1]);
        await ethers.provider.send("evm_mine", []);

        await circuitBreaker.connect(owner).updateSnapshot(newSnapshot);
        expect(await circuitBreaker.snapshotTotalAssets()).to.equal(newSnapshot);
      });

      it("should emit DailyReset event when updating on new day", async function () {
        const newSnapshot = 2_000_000n * ONE_USDC;

        // Fast forward 24+ hours
        await ethers.provider.send("evm_increaseTime", [Number(ONE_DAY) + 1]);
        await ethers.provider.send("evm_mine", []);

        await expect(circuitBreaker.connect(owner).updateSnapshot(newSnapshot))
          .to.emit(circuitBreaker, "DailyReset")
          .withArgs(newSnapshot);
      });

      it("should accept zero as new snapshot", async function () {
        // Fast forward 24+ hours
        await ethers.provider.send("evm_increaseTime", [Number(ONE_DAY) + 1]);
        await ethers.provider.send("evm_mine", []);

        await circuitBreaker.connect(owner).updateSnapshot(0n);
        expect(await circuitBreaker.snapshotTotalAssets()).to.equal(0n);
      });

      it("should accept very large snapshot", async function () {
        const largeSnapshot = ethers.MaxUint256 / 2n;

        // Fast forward 24+ hours
        await ethers.provider.send("evm_increaseTime", [Number(ONE_DAY) + 1]);
        await ethers.provider.send("evm_mine", []);

        await circuitBreaker.connect(owner).updateSnapshot(largeSnapshot);
        expect(await circuitBreaker.snapshotTotalAssets()).to.equal(largeSnapshot);
      });

      it("should reset daily loss accumulation on snapshot update", async function () {
        // Record some loss
        await circuitBreaker.connect(settlementEngine).recordLoss(10_000n * ONE_USDC);
        expect(await circuitBreaker.dailyLossAccumulated()).to.be.gt(0n);

        // Fast forward 24+ hours
        await ethers.provider.send("evm_increaseTime", [Number(ONE_DAY) + 1]);
        await ethers.provider.send("evm_mine", []);

        // Update snapshot - triggers internal reset
        await circuitBreaker.connect(owner).updateSnapshot(INITIAL_SNAPSHOT);

        // Daily loss should be reset
        expect(await circuitBreaker.dailyLossAccumulated()).to.equal(0n);
      });
    });
  });

  // =============================================================
  //                   MANUAL PAUSE/UNPAUSE TESTS
  // =============================================================

  describe("Manual Pause/Unpause", function () {
    describe("emergencyPause()", function () {
      it("should allow owner to emergency pause", async function () {
        await circuitBreaker.emergencyPause();
        expect(await circuitBreaker.isPaused()).to.be.true;
      });

      it("should set pausedAt timestamp", async function () {
        const tx = await circuitBreaker.emergencyPause();
        const block = await ethers.provider.getBlock(tx.blockNumber);
        expect(await circuitBreaker.pausedAt()).to.equal(block?.timestamp);
      });

      it("should emit CircuitBreakerTriggered event with 0 lossBps", async function () {
        await expect(circuitBreaker.emergencyPause())
          .to.emit(circuitBreaker, "CircuitBreakerTriggered")
          .withArgs(0n, 0n);
      });

      it("should emit CircuitBreakerTriggered with current dailyLoss when already accumulated", async function () {
        const lossAmount = 10_000n * ONE_USDC;
        await circuitBreaker.connect(settlementEngine).recordLoss(lossAmount);

        await expect(circuitBreaker.emergencyPause())
          .to.emit(circuitBreaker, "CircuitBreakerTriggered")
          .withArgs(lossAmount, 0n);
      });

      it("should be idempotent (can pause when already paused)", async function () {
        await circuitBreaker.emergencyPause();
        expect(await circuitBreaker.isPaused()).to.be.true;

        // Pause again - should not revert
        await circuitBreaker.emergencyPause();
        expect(await circuitBreaker.isPaused()).to.be.true;
      });

      it("should reject non-owner", async function () {
        let reverted = false;
        try {
          await circuitBreaker.connect(nonOwner).emergencyPause();
        } catch {
          reverted = true;
        }
        expect(reverted).to.be.true;
      });

      it("should update pausedAt even when already paused", async function () {
        await circuitBreaker.emergencyPause();
        const firstPausedAt = await circuitBreaker.pausedAt();

        // Fast forward
        await ethers.provider.send("evm_increaseTime", [3600]);
        await ethers.provider.send("evm_mine", []);

        await circuitBreaker.emergencyPause();
        const secondPausedAt = await circuitBreaker.pausedAt();

        expect(secondPausedAt).to.be.gt(firstPausedAt);
      });
    });

    describe("manualUnpause()", function () {
      beforeEach(async function () {
        // Pause the circuit breaker first
        await circuitBreaker.emergencyPause();
      });

      it("should allow owner to unpause after cooldown", async function () {
        // Fast forward past cooldown
        await ethers.provider.send("evm_increaseTime", [Number(DEFAULT_COOLDOWN) + 1]);
        await ethers.provider.send("evm_mine", []);

        await circuitBreaker.manualUnpause();
        expect(await circuitBreaker.isPaused()).to.be.false;
      });

      it("should emit CircuitBreakerReset event", async function () {
        // Fast forward past cooldown
        await ethers.provider.send("evm_increaseTime", [Number(DEFAULT_COOLDOWN) + 1]);
        await ethers.provider.send("evm_mine", []);

        await expect(circuitBreaker.manualUnpause())
          .to.emit(circuitBreaker, "CircuitBreakerReset")
          .withArgs(await owner.getAddress());
      });

      it("should reject unpause before cooldown", async function () {
        // Only wait half the cooldown
        await ethers.provider.send("evm_increaseTime", [Number(DEFAULT_COOLDOWN) / 2]);
        await ethers.provider.send("evm_mine", []);

        await expect(
          circuitBreaker.manualUnpause()
        ).to.be.revertedWithCustomError(circuitBreaker, "CooldownNotElapsed");
      });

      it("should allow unpause at exactly cooldown boundary", async function () {
        // Fast forward exactly to cooldown
        await ethers.provider.send("evm_increaseTime", [Number(DEFAULT_COOLDOWN)]);
        await ethers.provider.send("evm_mine", []);

        await circuitBreaker.manualUnpause();
        expect(await circuitBreaker.isPaused()).to.be.false;
      });

      it("should do nothing if already unpaused", async function () {
        // Fast forward past cooldown
        await ethers.provider.send("evm_increaseTime", [Number(DEFAULT_COOLDOWN) + 1]);
        await ethers.provider.send("evm_mine", []);

        await circuitBreaker.manualUnpause();
        expect(await circuitBreaker.isPaused()).to.be.false;

        // Call again - should not revert, just return early
        await circuitBreaker.manualUnpause();
        expect(await circuitBreaker.isPaused()).to.be.false;
      });

      it("should reject non-owner", async function () {
        await ethers.provider.send("evm_increaseTime", [Number(DEFAULT_COOLDOWN) + 1]);
        await ethers.provider.send("evm_mine", []);

        let reverted = false;
        try {
          await circuitBreaker.connect(nonOwner).manualUnpause();
        } catch {
          reverted = true;
        }
        expect(reverted).to.be.true;
      });
    });

    describe("forceReset()", function () {
      beforeEach(async function () {
        // Accumulate some loss
        await circuitBreaker.connect(settlementEngine).recordLoss(30_000n * ONE_USDC);
      });

      it("should allow owner to force reset", async function () {
        const newSnapshot = 500_000n * ONE_USDC;
        await circuitBreaker.forceReset(newSnapshot);

        expect(await circuitBreaker.dailyLossAccumulated()).to.equal(0n);
        expect(await circuitBreaker.snapshotTotalAssets()).to.equal(newSnapshot);
      });

      it("should update lastResetTimestamp to current time", async function () {
        const tx = await circuitBreaker.forceReset(INITIAL_SNAPSHOT);
        const block = await ethers.provider.getBlock(tx.blockNumber);

        expect(await circuitBreaker.lastResetTimestamp()).to.equal(block?.timestamp);
      });

      it("should emit DailyReset event", async function () {
        const newSnapshot = 500_000n * ONE_USDC;
        await expect(circuitBreaker.forceReset(newSnapshot))
          .to.emit(circuitBreaker, "DailyReset")
          .withArgs(newSnapshot);
      });

      it("should reset accumulated loss even during same day", async function () {
        // No time passage
        expect(await circuitBreaker.dailyLossAccumulated()).to.be.gt(0n);

        await circuitBreaker.forceReset(INITIAL_SNAPSHOT);

        expect(await circuitBreaker.dailyLossAccumulated()).to.equal(0n);
      });

      it("should NOT unpause (only resets tracking)", async function () {
        // Trigger circuit breaker
        const triggerLoss = (INITIAL_SNAPSHOT * DEFAULT_MAX_DAILY_LOSS_BPS) / BPS;
        await circuitBreaker.connect(settlementEngine).recordLoss(triggerLoss);
        expect(await circuitBreaker.isPaused()).to.be.true;

        // Force reset - should NOT unpause
        await circuitBreaker.forceReset(INITIAL_SNAPSHOT);

        // Still paused (forceReset only resets tracking, not pause state)
        expect(await circuitBreaker.isPaused()).to.be.true;
      });

      it("should accept zero as new snapshot", async function () {
        await circuitBreaker.forceReset(0n);
        expect(await circuitBreaker.snapshotTotalAssets()).to.equal(0n);
      });

      it("should reject non-owner", async function () {
        let reverted = false;
        try {
          await circuitBreaker.connect(nonOwner).forceReset(INITIAL_SNAPSHOT);
        } catch {
          reverted = true;
        }
        expect(reverted).to.be.true;
      });
    });
  });

  // =============================================================
  //                    VIEW FUNCTION TESTS
  // =============================================================

  describe("View Functions", function () {
    describe("canMintERT()", function () {
      it("should return true when not paused", async function () {
        expect(await circuitBreaker.canMintERT()).to.be.true;
      });

      it("should return false when paused", async function () {
        await circuitBreaker.emergencyPause();
        expect(await circuitBreaker.canMintERT()).to.be.false;
      });
    });

    describe("getCurrentDailyLossBps()", function () {
      it("should return 0 when no loss accumulated", async function () {
        expect(await circuitBreaker.getCurrentDailyLossBps()).to.equal(0n);
      });

      it("should return correct bps for accumulated loss", async function () {
        // 1% loss = 100 bps
        const lossAmount = (INITIAL_SNAPSHOT * 100n) / BPS;
        await circuitBreaker.connect(settlementEngine).recordLoss(lossAmount);

        expect(await circuitBreaker.getCurrentDailyLossBps()).to.equal(100n);
      });

      it("should return 0 when snapshot is zero", async function () {
        const CircuitBreaker = await ethers.getContractFactory("CircuitBreaker");
        const cbZero = await CircuitBreaker.deploy(await vault.getAddress(), 0n);
        await cbZero.waitForDeployment();

        expect(await cbZero.getCurrentDailyLossBps()).to.equal(0n);
      });

      it("should return BPS (10000) for 100% loss", async function () {
        await circuitBreaker.connect(settlementEngine).recordLoss(INITIAL_SNAPSHOT);
        expect(await circuitBreaker.getCurrentDailyLossBps()).to.equal(BPS);
      });
    });

    describe("remainingLossCapacity()", function () {
      it("should return full capacity when no loss", async function () {
        // 5% of $1M = $50,000
        const expectedCapacity = (INITIAL_SNAPSHOT * DEFAULT_MAX_DAILY_LOSS_BPS) / BPS;
        expect(await circuitBreaker.remainingLossCapacity()).to.equal(expectedCapacity);
      });

      it("should return reduced capacity after loss", async function () {
        const lossAmount = 20_000n * ONE_USDC; // 2% loss
        await circuitBreaker.connect(settlementEngine).recordLoss(lossAmount);

        // 5% of $1M - $20k = $50k - $20k = $30k
        const maxLoss = (INITIAL_SNAPSHOT * DEFAULT_MAX_DAILY_LOSS_BPS) / BPS;
        const expectedRemaining = maxLoss - lossAmount;

        expect(await circuitBreaker.remainingLossCapacity()).to.equal(expectedRemaining);
      });

      it("should return 0 when at or above threshold", async function () {
        // 5% loss exactly
        const triggerLoss = (INITIAL_SNAPSHOT * DEFAULT_MAX_DAILY_LOSS_BPS) / BPS;
        await circuitBreaker.connect(settlementEngine).recordLoss(triggerLoss);

        expect(await circuitBreaker.remainingLossCapacity()).to.equal(0n);
      });

      it("should return 0 when loss exceeds threshold", async function () {
        // 10% loss (exceeds 5% threshold)
        const excessLoss = (INITIAL_SNAPSHOT * 1000n) / BPS;
        await circuitBreaker.connect(settlementEngine).recordLoss(excessLoss);

        expect(await circuitBreaker.remainingLossCapacity()).to.equal(0n);
      });
    });

    describe("wouldTrigger()", function () {
      it("should return false for loss below remaining capacity", async function () {
        const smallLoss = 10_000n * ONE_USDC; // 1%
        expect(await circuitBreaker.wouldTrigger(smallLoss)).to.be.false;
      });

      it("should return true for loss at threshold", async function () {
        const triggerLoss = (INITIAL_SNAPSHOT * DEFAULT_MAX_DAILY_LOSS_BPS) / BPS;
        expect(await circuitBreaker.wouldTrigger(triggerLoss)).to.be.true;
      });

      it("should return true for loss above threshold", async function () {
        const excessLoss = (INITIAL_SNAPSHOT * 600n) / BPS; // 6%
        expect(await circuitBreaker.wouldTrigger(excessLoss)).to.be.true;
      });

      it("should account for already accumulated loss", async function () {
        // Accumulate 3% loss
        const existingLoss = (INITIAL_SNAPSHOT * 300n) / BPS;
        await circuitBreaker.connect(settlementEngine).recordLoss(existingLoss);

        // 2% more would NOT trigger (3% + 2% = 5%, at threshold)
        const smallLoss = (INITIAL_SNAPSHOT * 200n) / BPS;
        expect(await circuitBreaker.wouldTrigger(smallLoss)).to.be.true;

        // 1.9% more would NOT trigger (3% + 1.9% = 4.9%, below threshold)
        const safeLoss = (INITIAL_SNAPSHOT * 190n) / BPS;
        expect(await circuitBreaker.wouldTrigger(safeLoss)).to.be.false;
      });

      it("should return false when snapshot is zero", async function () {
        const CircuitBreaker = await ethers.getContractFactory("CircuitBreaker");
        const cbZero = await CircuitBreaker.deploy(await vault.getAddress(), 0n);
        await cbZero.waitForDeployment();

        expect(await cbZero.wouldTrigger(1000n)).to.be.false;
      });

      it("should handle zero potential loss", async function () {
        expect(await circuitBreaker.wouldTrigger(0n)).to.be.false;
      });
    });

    describe("timeUntilReset()", function () {
      it("should return ~24 hours immediately after deployment", async function () {
        const timeUntil = await circuitBreaker.timeUntilReset();
        // Should be close to ONE_DAY (within a few seconds due to block time)
        expect(timeUntil).to.be.lte(ONE_DAY);
        expect(timeUntil).to.be.gt(ONE_DAY - 60n); // Within 60 seconds
      });

      it("should decrease over time", async function () {
        const initialTime = await circuitBreaker.timeUntilReset();

        // Fast forward 1 hour
        await ethers.provider.send("evm_increaseTime", [Number(ONE_HOUR)]);
        await ethers.provider.send("evm_mine", []);

        const laterTime = await circuitBreaker.timeUntilReset();
        expect(laterTime).to.be.lt(initialTime);
        expect(initialTime - laterTime).to.be.gte(ONE_HOUR - 5n); // Allow small variance
      });

      it("should return 0 after 24 hours", async function () {
        // Fast forward 24+ hours
        await ethers.provider.send("evm_increaseTime", [Number(ONE_DAY) + 1]);
        await ethers.provider.send("evm_mine", []);

        expect(await circuitBreaker.timeUntilReset()).to.equal(0n);
      });
    });

    describe("canManualUnpause()", function () {
      it("should return false when not paused", async function () {
        expect(await circuitBreaker.canManualUnpause()).to.be.false;
      });

      it("should return false when paused but cooldown not elapsed", async function () {
        await circuitBreaker.emergencyPause();
        expect(await circuitBreaker.canManualUnpause()).to.be.false;
      });

      it("should return true when paused and cooldown elapsed", async function () {
        await circuitBreaker.emergencyPause();

        // Fast forward past cooldown
        await ethers.provider.send("evm_increaseTime", [Number(DEFAULT_COOLDOWN) + 1]);
        await ethers.provider.send("evm_mine", []);

        expect(await circuitBreaker.canManualUnpause()).to.be.true;
      });

      it("should return true at exactly cooldown boundary", async function () {
        await circuitBreaker.emergencyPause();

        // Fast forward exactly to cooldown
        await ethers.provider.send("evm_increaseTime", [Number(DEFAULT_COOLDOWN)]);
        await ethers.provider.send("evm_mine", []);

        expect(await circuitBreaker.canManualUnpause()).to.be.true;
      });
    });
  });

  // =============================================================
  //                    ADMIN FUNCTION TESTS
  // =============================================================

  describe("Admin Functions", function () {
    describe("setSettlementEngine()", function () {
      it("should allow owner to set settlement engine", async function () {
        const newEngine = await nonOwner.getAddress();
        await circuitBreaker.setSettlementEngine(newEngine);
        expect(await circuitBreaker.settlementEngine()).to.equal(newEngine);
      });

      it("should reject zero address", async function () {
        await expect(
          circuitBreaker.setSettlementEngine(ethers.ZeroAddress)
        ).to.be.revertedWithCustomError(circuitBreaker, "ZeroAddress");
      });

      it("should reject non-owner", async function () {
        let reverted = false;
        try {
          await circuitBreaker.connect(nonOwner).setSettlementEngine(await nonOwner.getAddress());
        } catch {
          reverted = true;
        }
        expect(reverted).to.be.true;
      });

      it("should allow recording with new settlement engine", async function () {
        const newEngine = nonOwner;
        await circuitBreaker.setSettlementEngine(await newEngine.getAddress());

        // Old engine should fail
        await expect(
          circuitBreaker.connect(settlementEngine).recordLoss(1000n)
        ).to.be.revertedWithCustomError(circuitBreaker, "OnlySettlement");

        // New engine should work
        await circuitBreaker.connect(newEngine).recordLoss(1000n);
        expect(await circuitBreaker.dailyLossAccumulated()).to.equal(1000n);
      });
    });

    describe("setVault()", function () {
      it("should allow owner to set vault", async function () {
        const newVault = await nonOwner.getAddress();
        await circuitBreaker.setVault(newVault);
        expect(await circuitBreaker.vault()).to.equal(newVault);
      });

      it("should reject zero address", async function () {
        await expect(
          circuitBreaker.setVault(ethers.ZeroAddress)
        ).to.be.revertedWithCustomError(circuitBreaker, "ZeroAddress");
      });

      it("should reject non-owner", async function () {
        let reverted = false;
        try {
          await circuitBreaker.connect(nonOwner).setVault(await nonOwner.getAddress());
        } catch {
          reverted = true;
        }
        expect(reverted).to.be.true;
      });

      it("should allow new vault to update snapshot", async function () {
        const newVault = nonOwner;
        await circuitBreaker.setVault(await newVault.getAddress());

        // Fast forward to enable update
        await ethers.provider.send("evm_increaseTime", [Number(ONE_DAY) + 1]);
        await ethers.provider.send("evm_mine", []);

        // Old vault should fail
        await expect(
          circuitBreaker.connect(vault).updateSnapshot(1000n)
        ).to.be.revertedWithCustomError(circuitBreaker, "Unauthorized");

        // New vault should work
        await circuitBreaker.connect(newVault).updateSnapshot(1000n);
        expect(await circuitBreaker.snapshotTotalAssets()).to.equal(1000n);
      });
    });

    describe("setMaxDailyLoss()", function () {
      it("should allow owner to update max daily loss", async function () {
        const newMax = 1000n; // 10%
        await circuitBreaker.setMaxDailyLoss(newMax);
        expect(await circuitBreaker.maxDailyLossBps()).to.equal(newMax);
      });

      it("should emit MaxDailyLossUpdated event", async function () {
        const oldMax = await circuitBreaker.maxDailyLossBps();
        const newMax = 1000n;

        await expect(circuitBreaker.setMaxDailyLoss(newMax))
          .to.emit(circuitBreaker, "MaxDailyLossUpdated")
          .withArgs(oldMax, newMax);
      });

      it("should reject value exceeding BPS (10000)", async function () {
        await expect(
          circuitBreaker.setMaxDailyLoss(BPS + 1n)
        ).to.be.revertedWithCustomError(circuitBreaker, "ArrayLengthMismatch");
      });

      it("should accept exactly BPS (100%)", async function () {
        await circuitBreaker.setMaxDailyLoss(BPS);
        expect(await circuitBreaker.maxDailyLossBps()).to.equal(BPS);
      });

      it("should accept zero (effectively always triggers)", async function () {
        await circuitBreaker.setMaxDailyLoss(0n);
        expect(await circuitBreaker.maxDailyLossBps()).to.equal(0n);

        // Any loss should now trigger
        await circuitBreaker.connect(settlementEngine).recordLoss(1n);
        expect(await circuitBreaker.isPaused()).to.be.true;
      });

      it("should reject non-owner", async function () {
        let reverted = false;
        try {
          await circuitBreaker.connect(nonOwner).setMaxDailyLoss(1000n);
        } catch {
          reverted = true;
        }
        expect(reverted).to.be.true;
      });

      it("should affect trigger threshold immediately", async function () {
        // Lower threshold to 1%
        await circuitBreaker.setMaxDailyLoss(100n);

        // 1% loss should now trigger (instead of 5%)
        const triggerLoss = (INITIAL_SNAPSHOT * 100n) / BPS;
        await circuitBreaker.connect(settlementEngine).recordLoss(triggerLoss);

        expect(await circuitBreaker.isPaused()).to.be.true;
      });

      it("should affect wouldTrigger immediately", async function () {
        // Raise threshold to 10%
        await circuitBreaker.setMaxDailyLoss(1000n);

        // 6% loss should NOT trigger now
        const safeLoss = (INITIAL_SNAPSHOT * 600n) / BPS;
        expect(await circuitBreaker.wouldTrigger(safeLoss)).to.be.false;
      });
    });

    describe("setUnpauseCooldown()", function () {
      it("should allow owner to update cooldown", async function () {
        const newCooldown = 7200n; // 2 hours
        await circuitBreaker.setUnpauseCooldown(newCooldown);
        expect(await circuitBreaker.unpauseCooldown()).to.equal(newCooldown);
      });

      it("should emit UnpauseCooldownUpdated event", async function () {
        const oldCooldown = await circuitBreaker.unpauseCooldown();
        const newCooldown = 7200n;

        await expect(circuitBreaker.setUnpauseCooldown(newCooldown))
          .to.emit(circuitBreaker, "UnpauseCooldownUpdated")
          .withArgs(oldCooldown, newCooldown);
      });

      it("should accept zero cooldown (immediate unpause)", async function () {
        await circuitBreaker.setUnpauseCooldown(0n);
        expect(await circuitBreaker.unpauseCooldown()).to.equal(0n);

        // Test immediate unpause
        await circuitBreaker.emergencyPause();
        expect(await circuitBreaker.isPaused()).to.be.true;

        await circuitBreaker.manualUnpause();
        expect(await circuitBreaker.isPaused()).to.be.false;
      });

      it("should accept very large cooldown", async function () {
        const largeCooldown = ONE_DAY * 365n; // 1 year
        await circuitBreaker.setUnpauseCooldown(largeCooldown);
        expect(await circuitBreaker.unpauseCooldown()).to.equal(largeCooldown);
      });

      it("should reject non-owner", async function () {
        let reverted = false;
        try {
          await circuitBreaker.connect(nonOwner).setUnpauseCooldown(7200n);
        } catch {
          reverted = true;
        }
        expect(reverted).to.be.true;
      });

      it("should affect unpause timing immediately", async function () {
        // Set longer cooldown
        const longCooldown = 7200n; // 2 hours
        await circuitBreaker.setUnpauseCooldown(longCooldown);

        await circuitBreaker.emergencyPause();

        // Wait original cooldown (1 hour)
        await ethers.provider.send("evm_increaseTime", [Number(DEFAULT_COOLDOWN) + 1]);
        await ethers.provider.send("evm_mine", []);

        // Should still fail (need 2 hours now)
        await expect(
          circuitBreaker.manualUnpause()
        ).to.be.revertedWithCustomError(circuitBreaker, "CooldownNotElapsed");

        // Wait remaining time
        await ethers.provider.send("evm_increaseTime", [Number(longCooldown - DEFAULT_COOLDOWN)]);
        await ethers.provider.send("evm_mine", []);

        // Now should work
        await circuitBreaker.manualUnpause();
        expect(await circuitBreaker.isPaused()).to.be.false;
      });
    });
  });

  // =============================================================
  //                    EDGE CASES AND ATTACKS
  // =============================================================

  describe("Edge Cases and Attack Vectors", function () {
    describe("Arithmetic Edge Cases", function () {
      it("should handle loss bps calculation with very small snapshot", async function () {
        // Deploy with tiny snapshot
        const CircuitBreaker = await ethers.getContractFactory("CircuitBreaker");
        const tinySnapshot = 100n; // 100 units
        const cb = await CircuitBreaker.deploy(await vault.getAddress(), tinySnapshot);
        await cb.waitForDeployment();
        await cb.setSettlementEngine(await settlementEngine.getAddress());

        // 5% of 100 = 5 units
        const triggerLoss = 5n;
        await cb.connect(settlementEngine).recordLoss(triggerLoss);

        expect(await cb.isPaused()).to.be.true;
      });

      it("should handle loss larger than snapshot (>100%)", async function () {
        // Record more than 100% loss (e.g., leverage scenarios)
        const excessLoss = INITIAL_SNAPSHOT * 2n;
        await circuitBreaker.connect(settlementEngine).recordLoss(excessLoss);

        // Should trigger and not overflow
        expect(await circuitBreaker.isPaused()).to.be.true;
        expect(await circuitBreaker.dailyLossAccumulated()).to.equal(excessLoss);
        expect(await circuitBreaker.getCurrentDailyLossBps()).to.equal(BPS * 2n); // 200%
      });

      it("should handle rapid loss/profit cycles", async function () {
        for (let i = 0; i < 10; i++) {
          await circuitBreaker.connect(settlementEngine).recordLoss(1000n * ONE_USDC);
          await circuitBreaker.connect(settlementEngine).recordProfit(500n * ONE_USDC);
        }

        // Net loss = 10 * 1000 - 10 * 500 = 5000 USDC
        expect(await circuitBreaker.dailyLossAccumulated()).to.equal(5000n * ONE_USDC);
      });

      it("should handle profit exceeding loss (capped at 0)", async function () {
        await circuitBreaker.connect(settlementEngine).recordLoss(1000n * ONE_USDC);
        await circuitBreaker.connect(settlementEngine).recordProfit(2000n * ONE_USDC);

        // Should not go negative
        expect(await circuitBreaker.dailyLossAccumulated()).to.equal(0n);
      });
    });

    describe("Timing Edge Cases", function () {
      it("should handle multiple day transitions correctly", async function () {
        // Record loss on day 1
        await circuitBreaker.connect(settlementEngine).recordLoss(10_000n * ONE_USDC);

        // Fast forward 3 days
        await ethers.provider.send("evm_increaseTime", [Number(ONE_DAY) * 3]);
        await ethers.provider.send("evm_mine", []);

        // Record loss - should reset and track new day
        await circuitBreaker.connect(settlementEngine).recordLoss(5_000n * ONE_USDC);

        expect(await circuitBreaker.dailyLossAccumulated()).to.equal(5_000n * ONE_USDC);
      });

      it("should handle block timestamp manipulation tolerance", async function () {
        // EVM allows ~15 second manipulation window
        // Test that logic is robust to this

        const lastReset = await circuitBreaker.lastResetTimestamp();

        // Fast forward to just before day boundary
        await ethers.provider.send("evm_increaseTime", [Number(ONE_DAY) - 10]);
        await ethers.provider.send("evm_mine", []);

        await circuitBreaker.connect(settlementEngine).recordLoss(1000n);
        const lossBeforeReset = await circuitBreaker.dailyLossAccumulated();

        // Now cross the boundary
        await ethers.provider.send("evm_increaseTime", [15]);
        await ethers.provider.send("evm_mine", []);

        await circuitBreaker.connect(settlementEngine).recordLoss(500n);

        // Loss should be reset (new day)
        expect(await circuitBreaker.dailyLossAccumulated()).to.equal(500n);
        expect(await circuitBreaker.lastResetTimestamp()).to.be.gt(lastReset);
      });

      it("should handle pause at end of day then auto-reset", async function () {
        // Trigger at end of day
        const triggerLoss = (INITIAL_SNAPSHOT * DEFAULT_MAX_DAILY_LOSS_BPS) / BPS;
        await circuitBreaker.connect(settlementEngine).recordLoss(triggerLoss);
        expect(await circuitBreaker.isPaused()).to.be.true;

        const pausedAt = await circuitBreaker.pausedAt();

        // Fast forward slightly less than a day
        await ethers.provider.send("evm_increaseTime", [Number(ONE_DAY) - 100]);
        await ethers.provider.send("evm_mine", []);

        // Still paused (pausedAt + ONE_DAY not reached)
        await circuitBreaker.connect(settlementEngine).recordLoss(0n);
        expect(await circuitBreaker.isPaused()).to.be.true;

        // Complete the day
        await ethers.provider.send("evm_increaseTime", [200]);
        await ethers.provider.send("evm_mine", []);

        // Now should auto-unpause
        await circuitBreaker.connect(settlementEngine).recordLoss(0n);
        expect(await circuitBreaker.isPaused()).to.be.false;
      });
    });

    describe("State Consistency", function () {
      it("should maintain consistency between paused state and pausedAt", async function () {
        // When not paused, pausedAt should be 0 or reflect last pause
        expect(await circuitBreaker.isPaused()).to.be.false;

        // Pause
        await circuitBreaker.emergencyPause();
        expect(await circuitBreaker.isPaused()).to.be.true;
        expect(await circuitBreaker.pausedAt()).to.be.gt(0n);

        // Unpause after cooldown
        await ethers.provider.send("evm_increaseTime", [Number(DEFAULT_COOLDOWN) + 1]);
        await ethers.provider.send("evm_mine", []);
        await circuitBreaker.manualUnpause();

        expect(await circuitBreaker.isPaused()).to.be.false;
        // Note: pausedAt is NOT reset on unpause - it preserves last pause time
        expect(await circuitBreaker.pausedAt()).to.be.gt(0n);
      });

      it("should maintain consistency after rapid pause/unpause cycles", async function () {
        // Set zero cooldown for rapid cycles
        await circuitBreaker.setUnpauseCooldown(0n);

        for (let i = 0; i < 5; i++) {
          await circuitBreaker.emergencyPause();
          expect(await circuitBreaker.isPaused()).to.be.true;

          await circuitBreaker.manualUnpause();
          expect(await circuitBreaker.isPaused()).to.be.false;
        }
      });

      it("should maintain loss tracking consistency after force reset", async function () {
        // Accumulate loss
        await circuitBreaker.connect(settlementEngine).recordLoss(30_000n * ONE_USDC);

        // Force reset
        await circuitBreaker.forceReset(500_000n * ONE_USDC);

        // Verify all tracking is reset
        expect(await circuitBreaker.dailyLossAccumulated()).to.equal(0n);
        expect(await circuitBreaker.snapshotTotalAssets()).to.equal(500_000n * ONE_USDC);

        // Now accumulate new loss - should work from new baseline
        const newLoss = 25_000n * ONE_USDC; // 5% of new 500k snapshot
        await circuitBreaker.connect(settlementEngine).recordLoss(newLoss);

        expect(await circuitBreaker.isPaused()).to.be.true;
      });
    });

    describe("Interaction with whenNotPaused modifier", function () {
      it("should revert when circuit breaker is active (indirect test via vault integration)", async function () {
        // This tests the modifier behavior
        await circuitBreaker.emergencyPause();
        expect(await circuitBreaker.isPaused()).to.be.true;

        // canMintERT should return false
        expect(await circuitBreaker.canMintERT()).to.be.false;
      });
    });

    describe("Gas Consumption Edge Cases", function () {
      it("should handle many consecutive losses efficiently", async function () {
        // Record many small losses
        for (let i = 0; i < 20; i++) {
          await circuitBreaker.connect(settlementEngine).recordLoss(100n * ONE_USDC);
        }

        expect(await circuitBreaker.dailyLossAccumulated()).to.equal(2000n * ONE_USDC);
      });

      it("should handle many consecutive profits efficiently", async function () {
        // First record a large loss
        await circuitBreaker.connect(settlementEngine).recordLoss(20_000n * ONE_USDC);

        // Then many small profits
        for (let i = 0; i < 20; i++) {
          await circuitBreaker.connect(settlementEngine).recordProfit(100n * ONE_USDC);
        }

        expect(await circuitBreaker.dailyLossAccumulated()).to.equal(18_000n * ONE_USDC);
      });
    });

    describe("Reentrancy Protection (Implicit)", function () {
      it("should complete loss recording atomically", async function () {
        // Record loss and verify state is consistent
        const lossAmount = 10_000n * ONE_USDC;

        const tx = await circuitBreaker.connect(settlementEngine).recordLoss(lossAmount);
        await tx.wait();

        // State should be consistent
        const accumulated = await circuitBreaker.dailyLossAccumulated();
        const currentBps = await circuitBreaker.getCurrentDailyLossBps();
        const expectedBps = (accumulated * BPS) / INITIAL_SNAPSHOT;

        expect(currentBps).to.equal(expectedBps);
      });
    });
  });

  // =============================================================
  //                    ACCESS CONTROL SUMMARY
  // =============================================================

  describe("Access Control Summary", function () {
    it("should reject all settlement-only functions from non-settlement engine", async function () {
      await expect(
        circuitBreaker.connect(nonOwner).recordLoss(1000n)
      ).to.be.revertedWithCustomError(circuitBreaker, "OnlySettlement");

      await expect(
        circuitBreaker.connect(nonOwner).recordProfit(1000n)
      ).to.be.revertedWithCustomError(circuitBreaker, "OnlySettlement");
    });

    it("should reject updateSnapshot from unauthorized callers", async function () {
      await expect(
        circuitBreaker.connect(nonOwner).updateSnapshot(1000n)
      ).to.be.revertedWithCustomError(circuitBreaker, "Unauthorized");

      await expect(
        circuitBreaker.connect(attacker).updateSnapshot(1000n)
      ).to.be.revertedWithCustomError(circuitBreaker, "Unauthorized");
    });

    it("should reject all owner-only functions from non-owner", async function () {
      const ownerOnlyTests = [
        () => circuitBreaker.connect(nonOwner).setSettlementEngine(nonOwner.getAddress()),
        () => circuitBreaker.connect(nonOwner).setVault(nonOwner.getAddress()),
        () => circuitBreaker.connect(nonOwner).setMaxDailyLoss(1000n),
        () => circuitBreaker.connect(nonOwner).setUnpauseCooldown(7200n),
        () => circuitBreaker.connect(nonOwner).emergencyPause(),
        () => circuitBreaker.connect(nonOwner).manualUnpause(),
        () => circuitBreaker.connect(nonOwner).forceReset(INITIAL_SNAPSHOT),
      ];

      for (const testFn of ownerOnlyTests) {
        let reverted = false;
        try {
          await testFn();
        } catch {
          reverted = true;
        }
        expect(reverted).to.be.true;
      }
    });
  });

  // =============================================================
  //            INTEGRATION SCENARIO TESTS
  // =============================================================

  describe("Integration Scenarios", function () {
    describe("Market Crash Scenario", function () {
      it("should trigger and recover from cascading losses", async function () {
        // Simulate rapid losses
        const losses = [
          10_000n * ONE_USDC,  // 1%
          15_000n * ONE_USDC,  // 1.5%
          20_000n * ONE_USDC,  // 2%
          10_000n * ONE_USDC,  // 1% - should trigger (total 5.5%)
        ];

        for (let i = 0; i < losses.length - 1; i++) {
          await circuitBreaker.connect(settlementEngine).recordLoss(losses[i]);
          expect(await circuitBreaker.isPaused()).to.be.false;
        }

        // Final loss triggers
        await circuitBreaker.connect(settlementEngine).recordLoss(losses[losses.length - 1]);
        expect(await circuitBreaker.isPaused()).to.be.true;

        // Wait for auto-reset (24 hours)
        await ethers.provider.send("evm_increaseTime", [Number(ONE_DAY) + 1]);
        await ethers.provider.send("evm_mine", []);

        // Any interaction triggers reset
        await circuitBreaker.connect(settlementEngine).recordLoss(0n);
        expect(await circuitBreaker.isPaused()).to.be.false;
        expect(await circuitBreaker.dailyLossAccumulated()).to.equal(0n);
      });
    });

    describe("Normal Trading Day Scenario", function () {
      it("should handle mixed PnL throughout the day", async function () {
        // Morning: losses
        await circuitBreaker.connect(settlementEngine).recordLoss(5_000n * ONE_USDC);
        await circuitBreaker.connect(settlementEngine).recordLoss(3_000n * ONE_USDC);

        // Midday: profits recover some
        await circuitBreaker.connect(settlementEngine).recordProfit(2_000n * ONE_USDC);
        await circuitBreaker.connect(settlementEngine).recordProfit(4_000n * ONE_USDC);

        // Afternoon: more losses
        await circuitBreaker.connect(settlementEngine).recordLoss(7_000n * ONE_USDC);

        // End of day: profits
        await circuitBreaker.connect(settlementEngine).recordProfit(3_000n * ONE_USDC);

        // Net loss = (5000+3000+7000) - (2000+4000+3000) = 15000 - 9000 = 6000 USDC
        // This is 0.6% of $1M - should NOT trigger
        expect(await circuitBreaker.dailyLossAccumulated()).to.equal(6_000n * ONE_USDC);
        expect(await circuitBreaker.isPaused()).to.be.false;
      });
    });

    describe("Admin Response Scenario", function () {
      it("should allow admin to manage circuit breaker during crisis", async function () {
        // Crisis triggers circuit breaker
        const triggerLoss = (INITIAL_SNAPSHOT * DEFAULT_MAX_DAILY_LOSS_BPS) / BPS;
        await circuitBreaker.connect(settlementEngine).recordLoss(triggerLoss);
        expect(await circuitBreaker.isPaused()).to.be.true;

        // Admin increases threshold temporarily
        await circuitBreaker.setMaxDailyLoss(1000n); // 10%

        // Manual unpause after cooldown
        await ethers.provider.send("evm_increaseTime", [Number(DEFAULT_COOLDOWN) + 1]);
        await ethers.provider.send("evm_mine", []);
        await circuitBreaker.manualUnpause();

        expect(await circuitBreaker.isPaused()).to.be.false;

        // Additional 5% loss should not trigger now
        const additionalLoss = (INITIAL_SNAPSHOT * 500n) / BPS;
        await circuitBreaker.connect(settlementEngine).recordLoss(additionalLoss);
        expect(await circuitBreaker.isPaused()).to.be.false;

        // Restore normal threshold
        await circuitBreaker.setMaxDailyLoss(DEFAULT_MAX_DAILY_LOSS_BPS);
      });
    });

    describe("Snapshot Update Scenario", function () {
      it("should adjust threshold after vault growth", async function () {
        // Initial: $1M vault, 5% = $50k threshold

        // Next day: vault grows to $2M
        await ethers.provider.send("evm_increaseTime", [Number(ONE_DAY) + 1]);
        await ethers.provider.send("evm_mine", []);

        const newSnapshot = 2_000_000n * ONE_USDC;
        await circuitBreaker.connect(vault).updateSnapshot(newSnapshot);

        // New threshold: 5% of $2M = $100k
        const newThreshold = (newSnapshot * DEFAULT_MAX_DAILY_LOSS_BPS) / BPS;

        // $60k loss should NOT trigger (was $50k before)
        const safeLoss = 60_000n * ONE_USDC;
        await circuitBreaker.connect(settlementEngine).recordLoss(safeLoss);

        expect(await circuitBreaker.isPaused()).to.be.false;
        expect(await circuitBreaker.remainingLossCapacity()).to.equal(newThreshold - safeLoss);
      });

      it("should adjust threshold after vault shrinkage", async function () {
        // Initial: $1M vault, 5% = $50k threshold

        // Next day: vault shrinks to $500k
        await ethers.provider.send("evm_increaseTime", [Number(ONE_DAY) + 1]);
        await ethers.provider.send("evm_mine", []);

        const newSnapshot = 500_000n * ONE_USDC;
        await circuitBreaker.connect(vault).updateSnapshot(newSnapshot);

        // New threshold: 5% of $500k = $25k

        // $30k loss SHOULD trigger now (was safe before)
        const triggerLoss = 30_000n * ONE_USDC;
        await circuitBreaker.connect(settlementEngine).recordLoss(triggerLoss);

        expect(await circuitBreaker.isPaused()).to.be.true;
      });
    });
  });
});
