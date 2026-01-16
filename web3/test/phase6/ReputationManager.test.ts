import { expect } from "chai";
import { network } from "hardhat";
import { SignerWithAddress } from "@nomicfoundation/hardhat-ethers/signers";

const { ethers } = await network.connect();

/**
 * ReputationManager Comprehensive Test Suite
 *
 * This test suite exhaustively validates the ReputationManager contract which manages:
 * - Executor tier system (UNVERIFIED -> NOVICE -> VERIFIED -> ESTABLISHED -> ELITE)
 * - Reputation tracking and settlement recording
 * - Stake requirement calculations
 * - Ban/unban functionality
 * - Tier upgrades and downgrades based on performance
 *
 * Tests run against Flare mainnet fork to ensure realistic environment.
 */
describe("ReputationManager", function () {
  this.timeout(120000);

  // Contract instances
  let reputationManager: any;

  // Signers
  let owner: SignerWithAddress;
  let settlementEngine: SignerWithAddress;
  let executor1: SignerWithAddress;
  let executor2: SignerWithAddress;
  let executor3: SignerWithAddress;
  let nonOwner: SignerWithAddress;

  // Constants matching contract
  const BPS = 10000n;
  const DOWNGRADE_LOSS_THRESHOLD = 5n;

  // Tier enum values
  const ExecutorTier = {
    UNVERIFIED: 0,
    NOVICE: 1,
    VERIFIED: 2,
    ESTABLISHED: 3,
    ELITE: 4
  };

  before(async function () {
    const chainId = (await ethers.provider.getNetwork()).chainId;
    if (chainId !== 14n) {
      console.log(`Skipping - not on Flare fork (chainId: ${chainId})`);
      this.skip();
    }

    [owner, settlementEngine, executor1, executor2, executor3, nonOwner] = await ethers.getSigners();
    console.log(`Test owner: ${await owner.getAddress()}`);
  });

  beforeEach(async function () {
    // Deploy fresh ReputationManager for each test
    const ReputationManager = await ethers.getContractFactory("ReputationManager");
    reputationManager = await ReputationManager.deploy();
    await reputationManager.waitForDeployment();

    // Set the settlement engine
    await reputationManager.setSettlementEngine(await settlementEngine.getAddress());
  });

  // =============================================================
  //                    DEPLOYMENT TESTS
  // =============================================================

  describe("Deployment and Initialization", function () {
    it("should deploy with owner as msg.sender", async function () {
      expect(await reputationManager.owner()).to.equal(await owner.getAddress());
    });

    it("should have settlement engine as zero address initially before setting", async function () {
      // Deploy fresh contract without setting settlement engine
      const ReputationManager = await ethers.getContractFactory("ReputationManager");
      const freshManager = await ReputationManager.deploy();
      await freshManager.waitForDeployment();

      expect(await freshManager.settlementEngine()).to.equal(ethers.ZeroAddress);
    });

    it("should reject zero address for settlement engine", async function () {
      await expect(
        reputationManager.setSettlementEngine(ethers.ZeroAddress)
      ).to.be.revertedWithCustomError(reputationManager, "ZeroAddress");
    });

    it("should reject zero address for execution controller", async function () {
      await expect(
        reputationManager.setExecutionController(ethers.ZeroAddress)
      ).to.be.revertedWithCustomError(reputationManager, "ZeroAddress");
    });

    it("should allow owner to set execution controller", async function () {
      const controllerAddr = await executor1.getAddress();
      await reputationManager.setExecutionController(controllerAddr);
      expect(await reputationManager.executionController()).to.equal(controllerAddr);
    });
  });

  // =============================================================
  //                 TIER CONFIGURATION TESTS
  // =============================================================

  describe("Tier Configuration Initialization", function () {
    describe("UNVERIFIED Tier (Tier 0)", function () {
      it("should have correct maxCapital of $100", async function () {
        const config = await reputationManager.getTierConfig(ExecutorTier.UNVERIFIED);
        expect(config.maxCapital).to.equal(100n * 10n ** 6n); // 100 USDC (6 decimals)
      });

      it("should require 50% stake", async function () {
        const config = await reputationManager.getTierConfig(ExecutorTier.UNVERIFIED);
        expect(config.stakeRequiredBps).to.equal(5000n);
      });

      it("should allow 20% max drawdown", async function () {
        const config = await reputationManager.getTierConfig(ExecutorTier.UNVERIFIED);
        expect(config.maxDrawdownBps).to.equal(2000n);
      });

      it("should only allow conservative strategies (risk level 0)", async function () {
        const config = await reputationManager.getTierConfig(ExecutorTier.UNVERIFIED);
        expect(config.allowedRiskLevel).to.equal(0n);
      });

      it("should require 0 settlements to reach", async function () {
        const config = await reputationManager.getTierConfig(ExecutorTier.UNVERIFIED);
        expect(config.settlementsRequired).to.equal(0n);
      });

      it("should require 0% profit rate to reach", async function () {
        const config = await reputationManager.getTierConfig(ExecutorTier.UNVERIFIED);
        expect(config.profitRateBps).to.equal(0n);
      });

      it("should require 0 volume to reach", async function () {
        const config = await reputationManager.getTierConfig(ExecutorTier.UNVERIFIED);
        expect(config.volumeRequired).to.equal(0n);
      });
    });

    describe("NOVICE Tier (Tier 1)", function () {
      it("should have correct maxCapital of $1,000", async function () {
        const config = await reputationManager.getTierConfig(ExecutorTier.NOVICE);
        expect(config.maxCapital).to.equal(1000n * 10n ** 6n);
      });

      it("should require 25% stake", async function () {
        const config = await reputationManager.getTierConfig(ExecutorTier.NOVICE);
        expect(config.stakeRequiredBps).to.equal(2500n);
      });

      it("should allow 15% max drawdown", async function () {
        const config = await reputationManager.getTierConfig(ExecutorTier.NOVICE);
        expect(config.maxDrawdownBps).to.equal(1500n);
      });

      it("should allow moderate strategies (risk level 1)", async function () {
        const config = await reputationManager.getTierConfig(ExecutorTier.NOVICE);
        expect(config.allowedRiskLevel).to.equal(1n);
      });

      it("should require 3 settlements", async function () {
        const config = await reputationManager.getTierConfig(ExecutorTier.NOVICE);
        expect(config.settlementsRequired).to.equal(3n);
      });

      it("should require 50% profit rate", async function () {
        const config = await reputationManager.getTierConfig(ExecutorTier.NOVICE);
        expect(config.profitRateBps).to.equal(5000n);
      });
    });

    describe("VERIFIED Tier (Tier 2)", function () {
      it("should have correct maxCapital of $10,000", async function () {
        const config = await reputationManager.getTierConfig(ExecutorTier.VERIFIED);
        expect(config.maxCapital).to.equal(10000n * 10n ** 6n);
      });

      it("should require 15% stake", async function () {
        const config = await reputationManager.getTierConfig(ExecutorTier.VERIFIED);
        expect(config.stakeRequiredBps).to.equal(1500n);
      });

      it("should require 10 settlements and 60% profit rate", async function () {
        const config = await reputationManager.getTierConfig(ExecutorTier.VERIFIED);
        expect(config.settlementsRequired).to.equal(10n);
        expect(config.profitRateBps).to.equal(6000n);
      });

      it("should require $5,000 volume", async function () {
        const config = await reputationManager.getTierConfig(ExecutorTier.VERIFIED);
        expect(config.volumeRequired).to.equal(5000n * 10n ** 6n);
      });
    });

    describe("ESTABLISHED Tier (Tier 3)", function () {
      it("should have correct maxCapital of $100,000", async function () {
        const config = await reputationManager.getTierConfig(ExecutorTier.ESTABLISHED);
        expect(config.maxCapital).to.equal(100000n * 10n ** 6n);
      });

      it("should require 10% stake", async function () {
        const config = await reputationManager.getTierConfig(ExecutorTier.ESTABLISHED);
        expect(config.stakeRequiredBps).to.equal(1000n);
      });

      it("should allow all strategies (risk level 2)", async function () {
        const config = await reputationManager.getTierConfig(ExecutorTier.ESTABLISHED);
        expect(config.allowedRiskLevel).to.equal(2n);
      });

      it("should require 25 settlements and 65% profit rate", async function () {
        const config = await reputationManager.getTierConfig(ExecutorTier.ESTABLISHED);
        expect(config.settlementsRequired).to.equal(25n);
        expect(config.profitRateBps).to.equal(6500n);
      });

      it("should require $50,000 volume", async function () {
        const config = await reputationManager.getTierConfig(ExecutorTier.ESTABLISHED);
        expect(config.volumeRequired).to.equal(50000n * 10n ** 6n);
      });
    });

    describe("ELITE Tier (Tier 4)", function () {
      it("should have correct maxCapital of $500,000", async function () {
        const config = await reputationManager.getTierConfig(ExecutorTier.ELITE);
        expect(config.maxCapital).to.equal(500000n * 10n ** 6n);
      });

      it("should require only 5% stake", async function () {
        const config = await reputationManager.getTierConfig(ExecutorTier.ELITE);
        expect(config.stakeRequiredBps).to.equal(500n);
      });

      it("should allow 15% max drawdown (higher tolerance for elite)", async function () {
        const config = await reputationManager.getTierConfig(ExecutorTier.ELITE);
        expect(config.maxDrawdownBps).to.equal(1500n);
      });

      it("should require 50 settlements and 70% profit rate", async function () {
        const config = await reputationManager.getTierConfig(ExecutorTier.ELITE);
        expect(config.settlementsRequired).to.equal(50n);
        expect(config.profitRateBps).to.equal(7000n);
      });

      it("should require $500,000 volume", async function () {
        const config = await reputationManager.getTierConfig(ExecutorTier.ELITE);
        expect(config.volumeRequired).to.equal(500000n * 10n ** 6n);
      });
    });
  });

  // =============================================================
  //              NEW EXECUTOR REPUTATION TESTS
  // =============================================================

  describe("New Executor Default State", function () {
    it("should have UNVERIFIED tier by default", async function () {
      const rep = await reputationManager.getReputation(await executor1.getAddress());
      expect(rep.tier).to.equal(ExecutorTier.UNVERIFIED);
    });

    it("should have zero total settlements", async function () {
      const rep = await reputationManager.getReputation(await executor1.getAddress());
      expect(rep.totalSettlements).to.equal(0n);
    });

    it("should have zero profitable settlements", async function () {
      const rep = await reputationManager.getReputation(await executor1.getAddress());
      expect(rep.profitableSettlements).to.equal(0n);
    });

    it("should have zero total volume", async function () {
      const rep = await reputationManager.getReputation(await executor1.getAddress());
      expect(rep.totalVolumeUsd).to.equal(0n);
    });

    it("should have zero total PnL", async function () {
      const rep = await reputationManager.getReputation(await executor1.getAddress());
      expect(rep.totalPnlUsd).to.equal(0n);
    });

    it("should not be banned", async function () {
      const rep = await reputationManager.getReputation(await executor1.getAddress());
      expect(rep.isBanned).to.be.false;
    });

    it("should not be whitelisted", async function () {
      const rep = await reputationManager.getReputation(await executor1.getAddress());
      expect(rep.isWhitelisted).to.be.false;
    });

    it("should have zero consecutive profits and losses", async function () {
      const rep = await reputationManager.getReputation(await executor1.getAddress());
      expect(rep.consecutiveProfits).to.equal(0n);
      expect(rep.consecutiveLosses).to.equal(0n);
    });
  });

  // =============================================================
  //                    VIEW FUNCTION TESTS
  // =============================================================

  describe("View Functions", function () {
    describe("getExecutorTierConfig", function () {
      it("should return UNVERIFIED config for new executor", async function () {
        const config = await reputationManager.getExecutorTierConfig(await executor1.getAddress());
        expect(config.maxCapital).to.equal(100n * 10n ** 6n);
      });

      it("should return correct config after tier upgrade", async function () {
        // Set executor to NOVICE manually
        await reputationManager.setExecutorTier(await executor1.getAddress(), ExecutorTier.NOVICE);
        const config = await reputationManager.getExecutorTierConfig(await executor1.getAddress());
        expect(config.maxCapital).to.equal(1000n * 10n ** 6n);
      });
    });

    describe("canRequestCapital", function () {
      it("should allow capital within tier limit", async function () {
        const canRequest = await reputationManager.canRequestCapital(
          await executor1.getAddress(),
          50n * 10n ** 6n // $50 for UNVERIFIED tier (max $100)
        );
        expect(canRequest).to.be.true;
      });

      it("should allow capital exactly at tier limit", async function () {
        const canRequest = await reputationManager.canRequestCapital(
          await executor1.getAddress(),
          100n * 10n ** 6n // $100 = exactly the limit
        );
        expect(canRequest).to.be.true;
      });

      it("should reject capital exceeding tier limit", async function () {
        const canRequest = await reputationManager.canRequestCapital(
          await executor1.getAddress(),
          101n * 10n ** 6n // $101 > $100 limit
        );
        expect(canRequest).to.be.false;
      });

      it("should reject any capital for banned executor", async function () {
        await reputationManager.banExecutor(await executor1.getAddress(), "Test ban");
        const canRequest = await reputationManager.canRequestCapital(
          await executor1.getAddress(),
          1n * 10n ** 6n // Even $1
        );
        expect(canRequest).to.be.false;
      });

      it("should allow higher capital after tier upgrade", async function () {
        await reputationManager.setExecutorTier(await executor1.getAddress(), ExecutorTier.NOVICE);
        const canRequest = await reputationManager.canRequestCapital(
          await executor1.getAddress(),
          500n * 10n ** 6n // $500 (NOVICE limit is $1000)
        );
        expect(canRequest).to.be.true;
      });
    });

    describe("getRequiredStake", function () {
      it("should calculate 50% stake for UNVERIFIED tier", async function () {
        const requiredStake = await reputationManager.getRequiredStake(
          await executor1.getAddress(),
          100n * 10n ** 6n // $100 capital
        );
        expect(requiredStake).to.equal(50n * 10n ** 6n); // 50% = $50
      });

      it("should calculate 25% stake for NOVICE tier", async function () {
        await reputationManager.setExecutorTier(await executor1.getAddress(), ExecutorTier.NOVICE);
        const requiredStake = await reputationManager.getRequiredStake(
          await executor1.getAddress(),
          1000n * 10n ** 6n // $1000 capital
        );
        expect(requiredStake).to.equal(250n * 10n ** 6n); // 25% = $250
      });

      it("should calculate 5% stake for ELITE tier", async function () {
        await reputationManager.setExecutorTier(await executor1.getAddress(), ExecutorTier.ELITE);
        const requiredStake = await reputationManager.getRequiredStake(
          await executor1.getAddress(),
          100000n * 10n ** 6n // $100,000 capital
        );
        expect(requiredStake).to.equal(5000n * 10n ** 6n); // 5% = $5,000
      });

      it("should handle zero capital correctly", async function () {
        const requiredStake = await reputationManager.getRequiredStake(
          await executor1.getAddress(),
          0n
        );
        expect(requiredStake).to.equal(0n);
      });
    });

    describe("getMaxDrawdown", function () {
      it("should return 20% (2000 bps) for UNVERIFIED", async function () {
        const maxDrawdown = await reputationManager.getMaxDrawdown(await executor1.getAddress());
        expect(maxDrawdown).to.equal(2000n);
      });

      it("should return 15% (1500 bps) for NOVICE", async function () {
        await reputationManager.setExecutorTier(await executor1.getAddress(), ExecutorTier.NOVICE);
        const maxDrawdown = await reputationManager.getMaxDrawdown(await executor1.getAddress());
        expect(maxDrawdown).to.equal(1500n);
      });
    });

    describe("getMaxRiskLevel", function () {
      it("should return 0 (Conservative) for UNVERIFIED", async function () {
        const riskLevel = await reputationManager.getMaxRiskLevel(await executor1.getAddress());
        expect(riskLevel).to.equal(0n);
      });

      it("should return 1 (Moderate) for NOVICE and VERIFIED", async function () {
        await reputationManager.setExecutorTier(await executor1.getAddress(), ExecutorTier.NOVICE);
        expect(await reputationManager.getMaxRiskLevel(await executor1.getAddress())).to.equal(1n);

        await reputationManager.setExecutorTier(await executor1.getAddress(), ExecutorTier.VERIFIED);
        expect(await reputationManager.getMaxRiskLevel(await executor1.getAddress())).to.equal(1n);
      });

      it("should return 2 (Aggressive) for ESTABLISHED and ELITE", async function () {
        await reputationManager.setExecutorTier(await executor1.getAddress(), ExecutorTier.ESTABLISHED);
        expect(await reputationManager.getMaxRiskLevel(await executor1.getAddress())).to.equal(2n);

        await reputationManager.setExecutorTier(await executor1.getAddress(), ExecutorTier.ELITE);
        expect(await reputationManager.getMaxRiskLevel(await executor1.getAddress())).to.equal(2n);
      });
    });

    describe("getExecutorTier", function () {
      it("should return current tier correctly", async function () {
        expect(await reputationManager.getExecutorTier(await executor1.getAddress())).to.equal(ExecutorTier.UNVERIFIED);

        await reputationManager.setExecutorTier(await executor1.getAddress(), ExecutorTier.ESTABLISHED);
        expect(await reputationManager.getExecutorTier(await executor1.getAddress())).to.equal(ExecutorTier.ESTABLISHED);
      });
    });

    describe("calculateProfitRate", function () {
      it("should return 0 for executor with no settlements", async function () {
        const profitRate = await reputationManager.calculateProfitRate(await executor1.getAddress());
        expect(profitRate).to.equal(0n);
      });

      it("should calculate correct profit rate with settlements", async function () {
        // Record 4 profitable out of 5 total (80%)
        const addr = await executor1.getAddress();
        await reputationManager.connect(settlementEngine).recordSettlement(addr, 100n * 10n ** 6n, 10n * 10n ** 6n, 0);
        await reputationManager.connect(settlementEngine).recordSettlement(addr, 100n * 10n ** 6n, 10n * 10n ** 6n, 0);
        await reputationManager.connect(settlementEngine).recordSettlement(addr, 100n * 10n ** 6n, 10n * 10n ** 6n, 0);
        await reputationManager.connect(settlementEngine).recordSettlement(addr, 100n * 10n ** 6n, 10n * 10n ** 6n, 0);
        await reputationManager.connect(settlementEngine).recordSettlement(addr, 100n * 10n ** 6n, -10n * 10n ** 6n, 0); // loss

        const profitRate = await reputationManager.calculateProfitRate(addr);
        expect(profitRate).to.equal(8000n); // 80% = 8000 bps
      });

      it("should return 10000 bps for 100% profit rate", async function () {
        const addr = await executor1.getAddress();
        await reputationManager.connect(settlementEngine).recordSettlement(addr, 100n * 10n ** 6n, 10n * 10n ** 6n, 0);
        await reputationManager.connect(settlementEngine).recordSettlement(addr, 100n * 10n ** 6n, 10n * 10n ** 6n, 0);

        const profitRate = await reputationManager.calculateProfitRate(addr);
        expect(profitRate).to.equal(10000n); // 100%
      });

      it("should return 0 for 0% profit rate (all losses)", async function () {
        const addr = await executor1.getAddress();
        await reputationManager.connect(settlementEngine).recordSettlement(addr, 100n * 10n ** 6n, -10n * 10n ** 6n, 0);
        await reputationManager.connect(settlementEngine).recordSettlement(addr, 100n * 10n ** 6n, -10n * 10n ** 6n, 0);

        const profitRate = await reputationManager.calculateProfitRate(addr);
        expect(profitRate).to.equal(0n);
      });
    });

    describe("checkTierUpgradeEligibility", function () {
      it("should return false for banned executor", async function () {
        await reputationManager.banExecutor(await executor1.getAddress(), "Test");
        const [qualifies, nextTier] = await reputationManager.checkTierUpgradeEligibility(await executor1.getAddress());
        expect(qualifies).to.be.false;
      });

      it("should return false for ELITE executor (already max tier)", async function () {
        await reputationManager.setExecutorTier(await executor1.getAddress(), ExecutorTier.ELITE);
        const [qualifies, nextTier] = await reputationManager.checkTierUpgradeEligibility(await executor1.getAddress());
        expect(qualifies).to.be.false;
        expect(nextTier).to.equal(ExecutorTier.ELITE);
      });

      it("should correctly identify next tier", async function () {
        const [qualifies, nextTier] = await reputationManager.checkTierUpgradeEligibility(await executor1.getAddress());
        expect(nextTier).to.equal(ExecutorTier.NOVICE);
      });
    });
  });

  // =============================================================
  //               SETTLEMENT RECORDING TESTS
  // =============================================================

  describe("Settlement Recording", function () {
    describe("Access Control", function () {
      it("should reject calls from non-settlement engine", async function () {
        await expect(
          reputationManager.connect(nonOwner).recordSettlement(
            await executor1.getAddress(),
            100n * 10n ** 6n,
            10n * 10n ** 6n,
            0
          )
        ).to.be.revertedWithCustomError(reputationManager, "OnlySettlement");
      });

      it("should allow calls from settlement engine", async function () {
        await reputationManager.connect(settlementEngine).recordSettlement(
          await executor1.getAddress(),
          100n * 10n ** 6n,
          10n * 10n ** 6n,
          0
        );

        const rep = await reputationManager.getReputation(await executor1.getAddress());
        expect(rep.totalSettlements).to.equal(1n);
      });
    });

    describe("State Updates on Profitable Settlement", function () {
      it("should increment total settlements", async function () {
        const addr = await executor1.getAddress();
        await reputationManager.connect(settlementEngine).recordSettlement(addr, 100n * 10n ** 6n, 10n * 10n ** 6n, 0);

        const rep = await reputationManager.getReputation(addr);
        expect(rep.totalSettlements).to.equal(1n);
      });

      it("should increment profitable settlements on profit", async function () {
        const addr = await executor1.getAddress();
        await reputationManager.connect(settlementEngine).recordSettlement(addr, 100n * 10n ** 6n, 10n * 10n ** 6n, 0);

        const rep = await reputationManager.getReputation(addr);
        expect(rep.profitableSettlements).to.equal(1n);
      });

      it("should add capital to total volume", async function () {
        const addr = await executor1.getAddress();
        await reputationManager.connect(settlementEngine).recordSettlement(addr, 100n * 10n ** 6n, 10n * 10n ** 6n, 0);
        await reputationManager.connect(settlementEngine).recordSettlement(addr, 200n * 10n ** 6n, 20n * 10n ** 6n, 0);

        const rep = await reputationManager.getReputation(addr);
        expect(rep.totalVolumeUsd).to.equal(300n * 10n ** 6n);
      });

      it("should accumulate positive PnL", async function () {
        const addr = await executor1.getAddress();
        await reputationManager.connect(settlementEngine).recordSettlement(addr, 100n * 10n ** 6n, 10n * 10n ** 6n, 0);
        await reputationManager.connect(settlementEngine).recordSettlement(addr, 100n * 10n ** 6n, 20n * 10n ** 6n, 0);

        const rep = await reputationManager.getReputation(addr);
        expect(rep.totalPnlUsd).to.equal(30n * 10n ** 6n);
      });

      it("should increment consecutive profits on profit", async function () {
        const addr = await executor1.getAddress();
        await reputationManager.connect(settlementEngine).recordSettlement(addr, 100n * 10n ** 6n, 10n * 10n ** 6n, 0);
        await reputationManager.connect(settlementEngine).recordSettlement(addr, 100n * 10n ** 6n, 10n * 10n ** 6n, 0);
        await reputationManager.connect(settlementEngine).recordSettlement(addr, 100n * 10n ** 6n, 10n * 10n ** 6n, 0);

        const rep = await reputationManager.getReputation(addr);
        expect(rep.consecutiveProfits).to.equal(3n);
        expect(rep.consecutiveLosses).to.equal(0n);
      });

      it("should update last settlement time", async function () {
        const addr = await executor1.getAddress();
        const tx = await reputationManager.connect(settlementEngine).recordSettlement(addr, 100n * 10n ** 6n, 10n * 10n ** 6n, 0);
        const block = await ethers.provider.getBlock(tx.blockNumber);

        const rep = await reputationManager.getReputation(addr);
        expect(rep.lastSettlementTime).to.equal(block?.timestamp);
      });

      it("should treat zero PnL as profitable", async function () {
        const addr = await executor1.getAddress();
        await reputationManager.connect(settlementEngine).recordSettlement(addr, 100n * 10n ** 6n, 0n, 0);

        const rep = await reputationManager.getReputation(addr);
        expect(rep.profitableSettlements).to.equal(1n);
        expect(rep.consecutiveProfits).to.equal(1n);
      });
    });

    describe("State Updates on Losing Settlement", function () {
      it("should increment total settlements but not profitable settlements", async function () {
        const addr = await executor1.getAddress();
        await reputationManager.connect(settlementEngine).recordSettlement(addr, 100n * 10n ** 6n, -10n * 10n ** 6n, 0);

        const rep = await reputationManager.getReputation(addr);
        expect(rep.totalSettlements).to.equal(1n);
        expect(rep.profitableSettlements).to.equal(0n);
      });

      it("should increment consecutive losses on loss", async function () {
        const addr = await executor1.getAddress();
        await reputationManager.connect(settlementEngine).recordSettlement(addr, 100n * 10n ** 6n, -10n * 10n ** 6n, 0);
        await reputationManager.connect(settlementEngine).recordSettlement(addr, 100n * 10n ** 6n, -10n * 10n ** 6n, 0);

        const rep = await reputationManager.getReputation(addr);
        expect(rep.consecutiveLosses).to.equal(2n);
        expect(rep.consecutiveProfits).to.equal(0n);
      });

      it("should reset consecutive profits on loss", async function () {
        const addr = await executor1.getAddress();
        // 3 profits
        await reputationManager.connect(settlementEngine).recordSettlement(addr, 100n * 10n ** 6n, 10n * 10n ** 6n, 0);
        await reputationManager.connect(settlementEngine).recordSettlement(addr, 100n * 10n ** 6n, 10n * 10n ** 6n, 0);
        await reputationManager.connect(settlementEngine).recordSettlement(addr, 100n * 10n ** 6n, 10n * 10n ** 6n, 0);

        let rep = await reputationManager.getReputation(addr);
        expect(rep.consecutiveProfits).to.equal(3n);

        // 1 loss
        await reputationManager.connect(settlementEngine).recordSettlement(addr, 100n * 10n ** 6n, -10n * 10n ** 6n, 0);

        rep = await reputationManager.getReputation(addr);
        expect(rep.consecutiveProfits).to.equal(0n);
        expect(rep.consecutiveLosses).to.equal(1n);
      });

      it("should reset consecutive losses on profit", async function () {
        const addr = await executor1.getAddress();
        // 3 losses
        await reputationManager.connect(settlementEngine).recordSettlement(addr, 100n * 10n ** 6n, -10n * 10n ** 6n, 0);
        await reputationManager.connect(settlementEngine).recordSettlement(addr, 100n * 10n ** 6n, -10n * 10n ** 6n, 0);
        await reputationManager.connect(settlementEngine).recordSettlement(addr, 100n * 10n ** 6n, -10n * 10n ** 6n, 0);

        let rep = await reputationManager.getReputation(addr);
        expect(rep.consecutiveLosses).to.equal(3n);

        // 1 profit
        await reputationManager.connect(settlementEngine).recordSettlement(addr, 100n * 10n ** 6n, 10n * 10n ** 6n, 0);

        rep = await reputationManager.getReputation(addr);
        expect(rep.consecutiveLosses).to.equal(0n);
        expect(rep.consecutiveProfits).to.equal(1n);
      });

      it("should track largest loss in bps", async function () {
        const addr = await executor1.getAddress();

        // 5% loss
        await reputationManager.connect(settlementEngine).recordSettlement(addr, 100n * 10n ** 6n, -5n * 10n ** 6n, 0);
        let rep = await reputationManager.getReputation(addr);
        expect(rep.largestLossBps).to.equal(500n); // 5% = 500 bps

        // 10% loss - should update
        await reputationManager.connect(settlementEngine).recordSettlement(addr, 100n * 10n ** 6n, -10n * 10n ** 6n, 0);
        rep = await reputationManager.getReputation(addr);
        expect(rep.largestLossBps).to.equal(1000n); // 10% = 1000 bps

        // 3% loss - should NOT update (smaller)
        await reputationManager.connect(settlementEngine).recordSettlement(addr, 100n * 10n ** 6n, -3n * 10n ** 6n, 0);
        rep = await reputationManager.getReputation(addr);
        expect(rep.largestLossBps).to.equal(1000n); // Still 10%
      });

      it("should handle zero capital in loss tracking", async function () {
        const addr = await executor1.getAddress();
        // Should not revert with zero capital
        await reputationManager.connect(settlementEngine).recordSettlement(addr, 0n, -10n * 10n ** 6n, 0);
        const rep = await reputationManager.getReputation(addr);
        expect(rep.largestLossBps).to.equal(0n); // Division by zero avoided
      });

      it("should accumulate negative PnL", async function () {
        const addr = await executor1.getAddress();
        await reputationManager.connect(settlementEngine).recordSettlement(addr, 100n * 10n ** 6n, -10n * 10n ** 6n, 0);
        await reputationManager.connect(settlementEngine).recordSettlement(addr, 100n * 10n ** 6n, -20n * 10n ** 6n, 0);

        const rep = await reputationManager.getReputation(addr);
        expect(rep.totalPnlUsd).to.equal(-30n * 10n ** 6n);
      });
    });

    describe("ReputationUpdated Event", function () {
      it("should emit ReputationUpdated event", async function () {
        const addr = await executor1.getAddress();
        await expect(
          reputationManager.connect(settlementEngine).recordSettlement(addr, 100n * 10n ** 6n, 10n * 10n ** 6n, 0)
        ).to.emit(reputationManager, "ReputationUpdated");
      });
    });
  });

  // =============================================================
  //                  TIER UPGRADE TESTS
  // =============================================================

  describe("Automatic Tier Upgrades", function () {
    it("should upgrade from UNVERIFIED to NOVICE when requirements met", async function () {
      const addr = await executor1.getAddress();

      // NOVICE requires: 3 settlements, 50% profit rate
      // 2 profits + 1 loss = 66% profit rate, 3 settlements
      await reputationManager.connect(settlementEngine).recordSettlement(addr, 100n * 10n ** 6n, 10n * 10n ** 6n, 0);
      await reputationManager.connect(settlementEngine).recordSettlement(addr, 100n * 10n ** 6n, 10n * 10n ** 6n, 0);

      // Still UNVERIFIED (only 2 settlements)
      let rep = await reputationManager.getReputation(addr);
      expect(rep.tier).to.equal(ExecutorTier.UNVERIFIED);

      // Third settlement should trigger upgrade
      await reputationManager.connect(settlementEngine).recordSettlement(addr, 100n * 10n ** 6n, 10n * 10n ** 6n, 0);

      rep = await reputationManager.getReputation(addr);
      expect(rep.tier).to.equal(ExecutorTier.NOVICE);
    });

    it("should NOT upgrade if profit rate too low", async function () {
      const addr = await executor1.getAddress();

      // NOVICE requires 50% profit rate
      // 1 profit + 2 losses = 33% profit rate
      await reputationManager.connect(settlementEngine).recordSettlement(addr, 100n * 10n ** 6n, 10n * 10n ** 6n, 0);
      await reputationManager.connect(settlementEngine).recordSettlement(addr, 100n * 10n ** 6n, -10n * 10n ** 6n, 0);
      await reputationManager.connect(settlementEngine).recordSettlement(addr, 100n * 10n ** 6n, -10n * 10n ** 6n, 0);

      const rep = await reputationManager.getReputation(addr);
      expect(rep.tier).to.equal(ExecutorTier.UNVERIFIED); // Still at tier 0
    });

    it("should emit TierUpgrade event on upgrade", async function () {
      const addr = await executor1.getAddress();

      await reputationManager.connect(settlementEngine).recordSettlement(addr, 100n * 10n ** 6n, 10n * 10n ** 6n, 0);
      await reputationManager.connect(settlementEngine).recordSettlement(addr, 100n * 10n ** 6n, 10n * 10n ** 6n, 0);

      await expect(
        reputationManager.connect(settlementEngine).recordSettlement(addr, 100n * 10n ** 6n, 10n * 10n ** 6n, 0)
      ).to.emit(reputationManager, "TierUpgrade")
       .withArgs(addr, ExecutorTier.UNVERIFIED, ExecutorTier.NOVICE);
    });

    it("should NOT upgrade banned executor", async function () {
      const addr = await executor1.getAddress();
      await reputationManager.banExecutor(addr, "Test ban");

      // Record enough settlements for upgrade
      await reputationManager.connect(settlementEngine).recordSettlement(addr, 100n * 10n ** 6n, 10n * 10n ** 6n, 0);
      await reputationManager.connect(settlementEngine).recordSettlement(addr, 100n * 10n ** 6n, 10n * 10n ** 6n, 0);
      await reputationManager.connect(settlementEngine).recordSettlement(addr, 100n * 10n ** 6n, 10n * 10n ** 6n, 0);

      const rep = await reputationManager.getReputation(addr);
      expect(rep.tier).to.equal(ExecutorTier.UNVERIFIED); // Should not upgrade
    });

    it("should NOT upgrade beyond ELITE", async function () {
      const addr = await executor1.getAddress();
      await reputationManager.setExecutorTier(addr, ExecutorTier.ELITE);

      // Record many settlements
      for (let i = 0; i < 10; i++) {
        await reputationManager.connect(settlementEngine).recordSettlement(addr, 100000n * 10n ** 6n, 10000n * 10n ** 6n, 0);
      }

      const rep = await reputationManager.getReputation(addr);
      expect(rep.tier).to.equal(ExecutorTier.ELITE); // Still ELITE
    });

    describe("Volume Requirements for Higher Tiers", function () {
      it("should NOT upgrade to VERIFIED without sufficient volume", async function () {
        const addr = await executor1.getAddress();
        await reputationManager.setExecutorTier(addr, ExecutorTier.NOVICE);

        // VERIFIED requires $5000 volume, but we only provide $1000 total
        // 10 settlements * $100 = $1000
        for (let i = 0; i < 10; i++) {
          await reputationManager.connect(settlementEngine).recordSettlement(addr, 100n * 10n ** 6n, 10n * 10n ** 6n, 0);
        }

        const rep = await reputationManager.getReputation(addr);
        expect(rep.tier).to.equal(ExecutorTier.NOVICE); // Not upgraded due to insufficient volume
      });

      it("should upgrade to VERIFIED with sufficient volume", async function () {
        const addr = await executor1.getAddress();
        await reputationManager.setExecutorTier(addr, ExecutorTier.NOVICE);

        // VERIFIED requires: 10 settlements, 60% profit rate, $5000 volume
        // 10 settlements * $500 = $5000, all profitable = 100% profit rate
        for (let i = 0; i < 10; i++) {
          await reputationManager.connect(settlementEngine).recordSettlement(addr, 500n * 10n ** 6n, 50n * 10n ** 6n, 0);
        }

        const rep = await reputationManager.getReputation(addr);
        expect(rep.tier).to.equal(ExecutorTier.VERIFIED);
      });
    });

    describe("ELITE Tier Whitelist", function () {
      it("should allow whitelisted executor to upgrade to ELITE without full requirements", async function () {
        const addr = await executor1.getAddress();
        await reputationManager.setExecutorTier(addr, ExecutorTier.ESTABLISHED);
        await reputationManager.whitelistExecutor(addr);

        // Record just 1 settlement - should trigger whitelist upgrade check
        await reputationManager.connect(settlementEngine).recordSettlement(addr, 1000n * 10n ** 6n, 100n * 10n ** 6n, 0);

        const rep = await reputationManager.getReputation(addr);
        expect(rep.tier).to.equal(ExecutorTier.ELITE);
      });

      it("should upgrade to ELITE immediately on whitelist if already ESTABLISHED", async function () {
        const addr = await executor1.getAddress();
        await reputationManager.setExecutorTier(addr, ExecutorTier.ESTABLISHED);

        await expect(reputationManager.whitelistExecutor(addr))
          .to.emit(reputationManager, "TierUpgrade")
          .withArgs(addr, ExecutorTier.ESTABLISHED, ExecutorTier.ELITE);

        const rep = await reputationManager.getReputation(addr);
        expect(rep.tier).to.equal(ExecutorTier.ELITE);
      });
    });
  });

  // =============================================================
  //                 TIER DOWNGRADE TESTS
  // =============================================================

  describe("Automatic Tier Downgrades", function () {
    it("should downgrade after 5 consecutive losses", async function () {
      const addr = await executor1.getAddress();
      await reputationManager.setExecutorTier(addr, ExecutorTier.NOVICE);

      // Record 5 consecutive losses
      for (let i = 0; i < 5; i++) {
        await reputationManager.connect(settlementEngine).recordSettlement(addr, 100n * 10n ** 6n, -10n * 10n ** 6n, 0);
      }

      const rep = await reputationManager.getReputation(addr);
      expect(rep.tier).to.equal(ExecutorTier.UNVERIFIED); // Downgraded from NOVICE
    });

    it("should emit TierDowngrade event on downgrade", async function () {
      const addr = await executor1.getAddress();
      await reputationManager.setExecutorTier(addr, ExecutorTier.NOVICE);

      // Record 4 losses
      for (let i = 0; i < 4; i++) {
        await reputationManager.connect(settlementEngine).recordSettlement(addr, 100n * 10n ** 6n, -10n * 10n ** 6n, 0);
      }

      // 5th loss triggers downgrade
      await expect(
        reputationManager.connect(settlementEngine).recordSettlement(addr, 100n * 10n ** 6n, -10n * 10n ** 6n, 0)
      ).to.emit(reputationManager, "TierDowngrade")
       .withArgs(addr, ExecutorTier.NOVICE, ExecutorTier.UNVERIFIED);
    });

    it("should reset consecutive losses after downgrade", async function () {
      const addr = await executor1.getAddress();
      await reputationManager.setExecutorTier(addr, ExecutorTier.NOVICE);

      // Record 5 consecutive losses (triggers downgrade)
      for (let i = 0; i < 5; i++) {
        await reputationManager.connect(settlementEngine).recordSettlement(addr, 100n * 10n ** 6n, -10n * 10n ** 6n, 0);
      }

      const rep = await reputationManager.getReputation(addr);
      expect(rep.consecutiveLosses).to.equal(0n); // Reset after downgrade
    });

    it("should NOT downgrade below UNVERIFIED", async function () {
      const addr = await executor1.getAddress();

      // Record 10 consecutive losses
      for (let i = 0; i < 10; i++) {
        await reputationManager.connect(settlementEngine).recordSettlement(addr, 100n * 10n ** 6n, -10n * 10n ** 6n, 0);
      }

      const rep = await reputationManager.getReputation(addr);
      expect(rep.tier).to.equal(ExecutorTier.UNVERIFIED); // Can't go below 0
    });

    it("should interrupt loss streak with a profit", async function () {
      const addr = await executor1.getAddress();
      await reputationManager.setExecutorTier(addr, ExecutorTier.NOVICE);

      // Record 4 losses
      for (let i = 0; i < 4; i++) {
        await reputationManager.connect(settlementEngine).recordSettlement(addr, 100n * 10n ** 6n, -10n * 10n ** 6n, 0);
      }

      // 1 profit - resets streak
      await reputationManager.connect(settlementEngine).recordSettlement(addr, 100n * 10n ** 6n, 10n * 10n ** 6n, 0);

      // 4 more losses - should NOT downgrade (need 5 consecutive)
      for (let i = 0; i < 4; i++) {
        await reputationManager.connect(settlementEngine).recordSettlement(addr, 100n * 10n ** 6n, -10n * 10n ** 6n, 0);
      }

      const rep = await reputationManager.getReputation(addr);
      expect(rep.tier).to.equal(ExecutorTier.NOVICE); // Still NOVICE
    });

    it("should downgrade multiple tiers with repeated loss streaks", async function () {
      const addr = await executor1.getAddress();
      await reputationManager.setExecutorTier(addr, ExecutorTier.ESTABLISHED);

      // First downgrade: ESTABLISHED -> VERIFIED
      for (let i = 0; i < 5; i++) {
        await reputationManager.connect(settlementEngine).recordSettlement(addr, 100n * 10n ** 6n, -10n * 10n ** 6n, 0);
      }
      expect((await reputationManager.getReputation(addr)).tier).to.equal(ExecutorTier.VERIFIED);

      // Second downgrade: VERIFIED -> NOVICE
      for (let i = 0; i < 5; i++) {
        await reputationManager.connect(settlementEngine).recordSettlement(addr, 100n * 10n ** 6n, -10n * 10n ** 6n, 0);
      }
      expect((await reputationManager.getReputation(addr)).tier).to.equal(ExecutorTier.NOVICE);

      // Third downgrade: NOVICE -> UNVERIFIED
      for (let i = 0; i < 5; i++) {
        await reputationManager.connect(settlementEngine).recordSettlement(addr, 100n * 10n ** 6n, -10n * 10n ** 6n, 0);
      }
      expect((await reputationManager.getReputation(addr)).tier).to.equal(ExecutorTier.UNVERIFIED);
    });
  });

  // =============================================================
  //                   ADMIN FUNCTION TESTS
  // =============================================================

  describe("Admin Functions", function () {
    describe("setSettlementEngine", function () {
      it("should allow owner to set settlement engine", async function () {
        const newEngine = await executor2.getAddress();
        await reputationManager.setSettlementEngine(newEngine);
        expect(await reputationManager.settlementEngine()).to.equal(newEngine);
      });

      it("should reject non-owner", async function () {
        await expect(
          reputationManager.connect(nonOwner).setSettlementEngine(await executor2.getAddress())
        ).to.be.revertedWithCustomError(reputationManager, "OwnableUnauthorizedAccount");
      });

      it("should reject zero address", async function () {
        await expect(
          reputationManager.setSettlementEngine(ethers.ZeroAddress)
        ).to.be.revertedWithCustomError(reputationManager, "ZeroAddress");
      });
    });

    describe("whitelistExecutor", function () {
      it("should allow owner to whitelist executor", async function () {
        const addr = await executor1.getAddress();
        await reputationManager.whitelistExecutor(addr);

        const rep = await reputationManager.getReputation(addr);
        expect(rep.isWhitelisted).to.be.true;
      });

      it("should emit ExecutorWhitelisted event", async function () {
        const addr = await executor1.getAddress();
        await expect(reputationManager.whitelistExecutor(addr))
          .to.emit(reputationManager, "ExecutorWhitelisted")
          .withArgs(addr);
      });

      it("should reject zero address", async function () {
        await expect(
          reputationManager.whitelistExecutor(ethers.ZeroAddress)
        ).to.be.revertedWithCustomError(reputationManager, "ZeroAddress");
      });

      it("should trigger upgrade check after whitelist", async function () {
        const addr = await executor1.getAddress();
        await reputationManager.setExecutorTier(addr, ExecutorTier.ESTABLISHED);

        await reputationManager.whitelistExecutor(addr);

        const rep = await reputationManager.getReputation(addr);
        expect(rep.tier).to.equal(ExecutorTier.ELITE); // Auto upgraded
      });
    });

    describe("removeWhitelist", function () {
      it("should allow owner to remove whitelist", async function () {
        const addr = await executor1.getAddress();
        await reputationManager.whitelistExecutor(addr);
        await reputationManager.removeWhitelist(addr);

        const rep = await reputationManager.getReputation(addr);
        expect(rep.isWhitelisted).to.be.false;
      });

      it("should not affect tier when whitelist removed", async function () {
        const addr = await executor1.getAddress();
        await reputationManager.setExecutorTier(addr, ExecutorTier.ESTABLISHED);
        await reputationManager.whitelistExecutor(addr);

        // Tier upgraded to ELITE
        expect((await reputationManager.getReputation(addr)).tier).to.equal(ExecutorTier.ELITE);

        // Remove whitelist - tier should remain
        await reputationManager.removeWhitelist(addr);
        expect((await reputationManager.getReputation(addr)).tier).to.equal(ExecutorTier.ELITE);
      });
    });

    describe("banExecutor", function () {
      it("should allow owner to ban executor", async function () {
        const addr = await executor1.getAddress();
        await reputationManager.banExecutor(addr, "Malicious behavior");

        const rep = await reputationManager.getReputation(addr);
        expect(rep.isBanned).to.be.true;
      });

      it("should emit ExecutorBanned event", async function () {
        const addr = await executor1.getAddress();
        await expect(reputationManager.banExecutor(addr, "Test reason"))
          .to.emit(reputationManager, "ExecutorBanned")
          .withArgs(addr, "Test reason");
      });

      it("should reject zero address", async function () {
        await expect(
          reputationManager.banExecutor(ethers.ZeroAddress, "reason")
        ).to.be.revertedWithCustomError(reputationManager, "ZeroAddress");
      });

      it("should prevent banned executor from requesting capital", async function () {
        const addr = await executor1.getAddress();
        await reputationManager.banExecutor(addr, "reason");

        expect(await reputationManager.canRequestCapital(addr, 1n)).to.be.false;
      });
    });

    describe("unbanExecutor", function () {
      it("should allow owner to unban executor", async function () {
        const addr = await executor1.getAddress();
        await reputationManager.banExecutor(addr, "reason");
        await reputationManager.unbanExecutor(addr);

        const rep = await reputationManager.getReputation(addr);
        expect(rep.isBanned).to.be.false;
      });

      it("should reset tier to UNVERIFIED after unban", async function () {
        const addr = await executor1.getAddress();
        await reputationManager.setExecutorTier(addr, ExecutorTier.ELITE);
        await reputationManager.banExecutor(addr, "reason");
        await reputationManager.unbanExecutor(addr);

        const rep = await reputationManager.getReputation(addr);
        expect(rep.tier).to.equal(ExecutorTier.UNVERIFIED);
      });
    });

    describe("setTierConfig", function () {
      it("should allow owner to update tier config", async function () {
        const newConfig = {
          maxCapital: 200n * 10n ** 6n,
          stakeRequiredBps: 4000n,
          maxDrawdownBps: 1500n,
          allowedRiskLevel: 1n,
          settlementsRequired: 5n,
          profitRateBps: 5500n,
          volumeRequired: 1000n * 10n ** 6n
        };

        await reputationManager.setTierConfig(ExecutorTier.NOVICE, newConfig);

        const config = await reputationManager.getTierConfig(ExecutorTier.NOVICE);
        expect(config.maxCapital).to.equal(200n * 10n ** 6n);
        expect(config.stakeRequiredBps).to.equal(4000n);
      });

      it("should reject stake < drawdown for non-ELITE tiers", async function () {
        const badConfig = {
          maxCapital: 200n * 10n ** 6n,
          stakeRequiredBps: 1000n, // 10% stake
          maxDrawdownBps: 2000n,   // 20% drawdown - stake must be >= drawdown
          allowedRiskLevel: 1n,
          settlementsRequired: 5n,
          profitRateBps: 5500n,
          volumeRequired: 1000n * 10n ** 6n
        };

        await expect(
          reputationManager.setTierConfig(ExecutorTier.NOVICE, badConfig)
        ).to.be.revertedWithCustomError(reputationManager, "StakeMustExceedDrawdown");
      });

      it("should allow stake < drawdown for ELITE tier", async function () {
        const eliteConfig = {
          maxCapital: 500000n * 10n ** 6n,
          stakeRequiredBps: 500n,   // 5% stake
          maxDrawdownBps: 1500n,    // 15% drawdown - allowed for ELITE
          allowedRiskLevel: 2n,
          settlementsRequired: 50n,
          profitRateBps: 7000n,
          volumeRequired: 500000n * 10n ** 6n
        };

        await reputationManager.setTierConfig(ExecutorTier.ELITE, eliteConfig);

        const config = await reputationManager.getTierConfig(ExecutorTier.ELITE);
        expect(config.stakeRequiredBps).to.equal(500n);
      });
    });

    describe("setExecutorTier", function () {
      it("should allow owner to manually set tier", async function () {
        const addr = await executor1.getAddress();
        await reputationManager.setExecutorTier(addr, ExecutorTier.VERIFIED);

        const rep = await reputationManager.getReputation(addr);
        expect(rep.tier).to.equal(ExecutorTier.VERIFIED);
      });

      it("should emit TierUpgrade event when upgrading", async function () {
        const addr = await executor1.getAddress();
        await expect(reputationManager.setExecutorTier(addr, ExecutorTier.NOVICE))
          .to.emit(reputationManager, "TierUpgrade")
          .withArgs(addr, ExecutorTier.UNVERIFIED, ExecutorTier.NOVICE);
      });

      it("should emit TierDowngrade event when downgrading", async function () {
        const addr = await executor1.getAddress();
        await reputationManager.setExecutorTier(addr, ExecutorTier.ELITE);

        await expect(reputationManager.setExecutorTier(addr, ExecutorTier.NOVICE))
          .to.emit(reputationManager, "TierDowngrade")
          .withArgs(addr, ExecutorTier.ELITE, ExecutorTier.NOVICE);
      });

      it("should reject zero address", async function () {
        await expect(
          reputationManager.setExecutorTier(ethers.ZeroAddress, ExecutorTier.NOVICE)
        ).to.be.revertedWithCustomError(reputationManager, "ZeroAddress");
      });

      it("should reject invalid tier (> ELITE)", async function () {
        // Passing an invalid enum value (5 is beyond ExecutorTier.ELITE = 4) will
        // cause a revert at the EVM level when it tries to cast to the enum
        let reverted = false;
        try {
          await reputationManager.setExecutorTier(await executor1.getAddress(), 5);
        } catch {
          reverted = true;
        }
        expect(reverted).to.be.true;
      });

      it("should emit no event when tier unchanged", async function () {
        const addr = await executor1.getAddress();
        // Set to NOVICE first
        await reputationManager.setExecutorTier(addr, ExecutorTier.NOVICE);

        // Set to NOVICE again - should not emit
        const tx = await reputationManager.setExecutorTier(addr, ExecutorTier.NOVICE);
        const receipt = await tx.wait();

        // Filter for TierUpgrade and TierDowngrade events
        const upgradeEvents = receipt?.logs.filter((log: any) => {
          try {
            return reputationManager.interface.parseLog(log)?.name === "TierUpgrade";
          } catch { return false; }
        });
        const downgradeEvents = receipt?.logs.filter((log: any) => {
          try {
            return reputationManager.interface.parseLog(log)?.name === "TierDowngrade";
          } catch { return false; }
        });

        expect(upgradeEvents?.length || 0).to.equal(0);
        expect(downgradeEvents?.length || 0).to.equal(0);
      });
    });
  });

  // =============================================================
  //                   EDGE CASES & BOUNDARY TESTS
  // =============================================================

  describe("Edge Cases and Boundary Conditions", function () {
    describe("Extreme Values", function () {
      it("should handle maximum uint256 capital correctly in stake calculation", async function () {
        const addr = await executor1.getAddress();
        // Use a large but reasonable value
        const largeCapital = ethers.parseUnits("1000000000", 6); // $1B

        const requiredStake = await reputationManager.getRequiredStake(addr, largeCapital);
        // 50% of $1B = $500M
        expect(requiredStake).to.equal(largeCapital / 2n);
      });

      it("should handle maximum negative PnL", async function () {
        const addr = await executor1.getAddress();
        // Record a massive loss
        const massiveLoss = -ethers.parseUnits("1000000000", 6); // -$1B
        await reputationManager.connect(settlementEngine).recordSettlement(addr, ethers.parseUnits("1000000000", 6), massiveLoss, 0);

        const rep = await reputationManager.getReputation(addr);
        expect(rep.totalPnlUsd).to.equal(massiveLoss);
      });

      it("should handle small capital amounts correctly", async function () {
        const addr = await executor1.getAddress();
        const tinyCapital = 1n; // 1 wei equivalent

        const requiredStake = await reputationManager.getRequiredStake(addr, tinyCapital);
        // 50% of 1 = 0 (due to integer division)
        expect(requiredStake).to.equal(0n);
      });
    });

    describe("State Consistency", function () {
      it("should maintain consistent state across multiple executors", async function () {
        const addr1 = await executor1.getAddress();
        const addr2 = await executor2.getAddress();

        // Both start at UNVERIFIED
        expect((await reputationManager.getReputation(addr1)).tier).to.equal(ExecutorTier.UNVERIFIED);
        expect((await reputationManager.getReputation(addr2)).tier).to.equal(ExecutorTier.UNVERIFIED);

        // Upgrade one
        await reputationManager.setExecutorTier(addr1, ExecutorTier.ELITE);

        // Should not affect the other
        expect((await reputationManager.getReputation(addr1)).tier).to.equal(ExecutorTier.ELITE);
        expect((await reputationManager.getReputation(addr2)).tier).to.equal(ExecutorTier.UNVERIFIED);
      });

      it("should handle rapid settlement recording", async function () {
        const addr = await executor1.getAddress();

        // Record 100 settlements rapidly
        const settlementPromises = [];
        for (let i = 0; i < 20; i++) {
          settlementPromises.push(
            reputationManager.connect(settlementEngine).recordSettlement(
              addr,
              100n * 10n ** 6n,
              i % 3 === 0 ? -5n * 10n ** 6n : 10n * 10n ** 6n, // Mix of profits and losses
              0
            )
          );
        }

        await Promise.all(settlementPromises);

        const rep = await reputationManager.getReputation(addr);
        expect(rep.totalSettlements).to.equal(20n);
      });
    });

    describe("Profit Rate Edge Cases", function () {
      it("should handle exactly 50% profit rate at NOVICE boundary", async function () {
        const addr = await executor1.getAddress();

        // 2 profits, 2 losses = exactly 50%
        await reputationManager.connect(settlementEngine).recordSettlement(addr, 100n * 10n ** 6n, 10n * 10n ** 6n, 0);
        await reputationManager.connect(settlementEngine).recordSettlement(addr, 100n * 10n ** 6n, -10n * 10n ** 6n, 0);

        let profitRate = await reputationManager.calculateProfitRate(addr);
        expect(profitRate).to.equal(5000n); // Exactly 50%

        // One more profit = 66.67%, should upgrade on next profitable
        await reputationManager.connect(settlementEngine).recordSettlement(addr, 100n * 10n ** 6n, 10n * 10n ** 6n, 0);

        const rep = await reputationManager.getReputation(addr);
        expect(rep.tier).to.equal(ExecutorTier.NOVICE);
      });

      it("should handle exactly at threshold for each tier", async function () {
        // NOVICE requires 3 settlements, 50% profit, 0 volume
        // VERIFIED requires 10 settlements, 60% profit, $5000 volume
        // For NOVICE -> VERIFIED: need exactly 60% = 6/10

        const addr = await executor1.getAddress();
        await reputationManager.setExecutorTier(addr, ExecutorTier.NOVICE);

        // 6 profits out of 10 = exactly 60%
        for (let i = 0; i < 6; i++) {
          await reputationManager.connect(settlementEngine).recordSettlement(addr, 500n * 10n ** 6n, 50n * 10n ** 6n, 0);
        }
        for (let i = 0; i < 4; i++) {
          await reputationManager.connect(settlementEngine).recordSettlement(addr, 500n * 10n ** 6n, -50n * 10n ** 6n, 0);
        }

        // Should upgrade: 10 settlements, 60% profit, $5000 volume (10 * $500)
        const rep = await reputationManager.getReputation(addr);
        expect(rep.tier).to.equal(ExecutorTier.VERIFIED);
      });
    });

    describe("Concurrent Operations", function () {
      it("should handle ban during settlement recording", async function () {
        const addr = await executor1.getAddress();

        // Record some settlements
        await reputationManager.connect(settlementEngine).recordSettlement(addr, 100n * 10n ** 6n, 10n * 10n ** 6n, 0);
        await reputationManager.connect(settlementEngine).recordSettlement(addr, 100n * 10n ** 6n, 10n * 10n ** 6n, 0);

        // Ban in the middle
        await reputationManager.banExecutor(addr, "reason");

        // More settlements should still update stats but not trigger upgrade
        await reputationManager.connect(settlementEngine).recordSettlement(addr, 100n * 10n ** 6n, 10n * 10n ** 6n, 0);

        const rep = await reputationManager.getReputation(addr);
        expect(rep.totalSettlements).to.equal(3n);
        expect(rep.tier).to.equal(ExecutorTier.UNVERIFIED); // Didn't upgrade due to ban
        expect(rep.isBanned).to.be.true;
      });
    });
  });

  // =============================================================
  //                   ACCESS CONTROL TESTS
  // =============================================================

  describe("Access Control", function () {
    it("should reject non-owner from admin functions", async function () {
      await expect(
        reputationManager.connect(nonOwner).setSettlementEngine(await executor1.getAddress())
      ).to.be.revertedWithCustomError(reputationManager, "OwnableUnauthorizedAccount");

      await expect(
        reputationManager.connect(nonOwner).setExecutionController(await executor1.getAddress())
      ).to.be.revertedWithCustomError(reputationManager, "OwnableUnauthorizedAccount");

      await expect(
        reputationManager.connect(nonOwner).whitelistExecutor(await executor1.getAddress())
      ).to.be.revertedWithCustomError(reputationManager, "OwnableUnauthorizedAccount");

      await expect(
        reputationManager.connect(nonOwner).removeWhitelist(await executor1.getAddress())
      ).to.be.revertedWithCustomError(reputationManager, "OwnableUnauthorizedAccount");

      await expect(
        reputationManager.connect(nonOwner).banExecutor(await executor1.getAddress(), "reason")
      ).to.be.revertedWithCustomError(reputationManager, "OwnableUnauthorizedAccount");

      await expect(
        reputationManager.connect(nonOwner).unbanExecutor(await executor1.getAddress())
      ).to.be.revertedWithCustomError(reputationManager, "OwnableUnauthorizedAccount");

      await expect(
        reputationManager.connect(nonOwner).setExecutorTier(await executor1.getAddress(), ExecutorTier.NOVICE)
      ).to.be.revertedWithCustomError(reputationManager, "OwnableUnauthorizedAccount");
    });

    it("should allow owner for all admin functions", async function () {
      const addr = await executor1.getAddress();

      await reputationManager.setSettlementEngine(addr);
      expect(await reputationManager.settlementEngine()).to.equal(addr);

      await reputationManager.setExecutionController(addr);
      expect(await reputationManager.executionController()).to.equal(addr);

      await reputationManager.whitelistExecutor(await executor2.getAddress());
      const rep1 = await reputationManager.getReputation(await executor2.getAddress());
      expect(rep1.isWhitelisted).to.be.true;

      await reputationManager.removeWhitelist(await executor2.getAddress());
      const rep2 = await reputationManager.getReputation(await executor2.getAddress());
      expect(rep2.isWhitelisted).to.be.false;

      await reputationManager.banExecutor(await executor2.getAddress(), "test");
      const rep3 = await reputationManager.getReputation(await executor2.getAddress());
      expect(rep3.isBanned).to.be.true;

      await reputationManager.unbanExecutor(await executor2.getAddress());
      const rep4 = await reputationManager.getReputation(await executor2.getAddress());
      expect(rep4.isBanned).to.be.false;

      await reputationManager.setExecutorTier(await executor2.getAddress(), ExecutorTier.NOVICE);
      expect(await reputationManager.getExecutorTier(await executor2.getAddress())).to.equal(ExecutorTier.NOVICE);
    });
  });
});
