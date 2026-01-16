import { expect } from "chai";
import { network } from "hardhat";
import { SignerWithAddress } from "@nomicfoundation/hardhat-ethers/signers";

const { ethers } = await network.connect();

/**
 * ExecutionRightsNFT Comprehensive Test Suite
 *
 * This test suite exhaustively validates the ExecutionRightsNFT contract which:
 * - Mints ERC-721 tokens representing execution rights
 * - Validates minting against tier configurations from ReputationManager
 * - Tracks execution status and PnL per ERT
 * - Enforces time-bound execution windows
 * - Handles stake collection and return
 * - Supports settlement and expiry lifecycle
 *
 * Tests run against Flare mainnet fork to ensure realistic environment.
 */
describe("ExecutionRightsNFT", function () {
  this.timeout(120000);

  // Contract instances
  let executionRightsNFT: any;
  let reputationManager: any;
  let executionVault: any;
  let circuitBreaker: any;

  // Signers
  let owner: SignerWithAddress;
  let controller: SignerWithAddress;
  let settlementEngine: SignerWithAddress;
  let executor1: SignerWithAddress;
  let executor2: SignerWithAddress;
  let nonOwner: SignerWithAddress;

  // Real USDC on Flare
  const USDC_ADDRESS = "0xFbDa5F676cB37624f28265A144A48B0d6e87d3b6";

  // Constants matching contract
  const BPS = 10000n;
  const MIN_DURATION = 3600n; // 1 hour in seconds
  const MAX_DURATION = 30n * 24n * 3600n; // 30 days in seconds
  const ONE_HOUR = 3600n;
  const ONE_DAY = 86400n;

  // Tier enum values
  const ExecutorTier = {
    UNVERIFIED: 0,
    NOVICE: 1,
    VERIFIED: 2,
    ESTABLISHED: 3,
    ELITE: 4
  };

  // ERT Status enum
  const ERTStatus = {
    PENDING: 0,
    ACTIVE: 1,
    SETTLED: 2,
    EXPIRED: 3,
    LIQUIDATED: 4
  };

  before(async function () {
    const chainId = (await ethers.provider.getNetwork()).chainId;
    if (chainId !== 14n) {
      console.log(`Skipping - not on Flare fork (chainId: ${chainId})`);
      this.skip();
    }

    [owner, controller, settlementEngine, executor1, executor2, nonOwner] = await ethers.getSigners();
    console.log(`Test owner: ${await owner.getAddress()}`);
  });

  beforeEach(async function () {
    // Deploy ReputationManager first (dependency)
    const ReputationManager = await ethers.getContractFactory("ReputationManager");
    reputationManager = await ReputationManager.deploy();
    await reputationManager.waitForDeployment();
    await reputationManager.setSettlementEngine(await settlementEngine.getAddress());

    // Deploy ExecutionVault (dependency)
    const ExecutionVault = await ethers.getContractFactory("ExecutionVault");
    executionVault = await ExecutionVault.deploy(
      USDC_ADDRESS,
      "PRAXIS LP Token",
      "pxLP"
    );
    await executionVault.waitForDeployment();

    // Deploy CircuitBreaker
    const CircuitBreaker = await ethers.getContractFactory("CircuitBreaker");
    circuitBreaker = await CircuitBreaker.deploy(await executionVault.getAddress(), 0);
    await circuitBreaker.waitForDeployment();

    // Deploy ExecutionRightsNFT
    const ExecutionRightsNFT = await ethers.getContractFactory("ExecutionRightsNFT");
    executionRightsNFT = await ExecutionRightsNFT.deploy(
      await reputationManager.getAddress(),
      await executionVault.getAddress()
    );
    await executionRightsNFT.waitForDeployment();

    // Configure contracts
    await executionRightsNFT.setExecutionController(await controller.getAddress());
    await executionRightsNFT.setSettlementEngine(await settlementEngine.getAddress());
    await executionRightsNFT.setCircuitBreaker(await circuitBreaker.getAddress());
  });

  // Helper function to create valid constraints
  function createValidConstraints(adapters: string[] = [], assets: string[] = []) {
    return {
      maxLeverage: 1,
      maxDrawdownBps: 2000, // 20% - within UNVERIFIED tier limit
      maxPositionSizeBps: 5000, // 50%
      allowedAdapters: adapters,
      allowedAssets: assets
    };
  }

  // Helper function to create valid fees
  function createValidFees(stakedAmount: bigint) {
    return {
      baseFeeAprBps: 200, // 2%
      profitShareBps: 2000, // 20%
      stakedAmount: stakedAmount
    };
  }

  // =============================================================
  //                    DEPLOYMENT TESTS
  // =============================================================

  describe("Deployment and Initialization", function () {
    it("should deploy with correct name", async function () {
      expect(await executionRightsNFT.name()).to.equal("PRAXIS Execution Rights");
    });

    it("should deploy with correct symbol", async function () {
      expect(await executionRightsNFT.symbol()).to.equal("ERT");
    });

    it("should have correct reputation manager", async function () {
      expect(await executionRightsNFT.reputationManager()).to.equal(await reputationManager.getAddress());
    });

    it("should have correct execution vault", async function () {
      expect(await executionRightsNFT.executionVault()).to.equal(await executionVault.getAddress());
    });

    it("should have transfers disabled by default", async function () {
      expect(await executionRightsNFT.transfersEnabled()).to.be.false;
    });

    it("should start with token ID 1", async function () {
      expect(await executionRightsNFT.nextTokenId()).to.equal(1n);
    });

    it("should reject zero address for reputation manager in constructor", async function () {
      const ExecutionRightsNFT = await ethers.getContractFactory("ExecutionRightsNFT");
      await expect(
        ExecutionRightsNFT.deploy(ethers.ZeroAddress, await executionVault.getAddress())
      ).to.be.revertedWithCustomError(executionRightsNFT, "ZeroAddress");
    });

    it("should reject zero address for vault in constructor", async function () {
      const ExecutionRightsNFT = await ethers.getContractFactory("ExecutionRightsNFT");
      await expect(
        ExecutionRightsNFT.deploy(await reputationManager.getAddress(), ethers.ZeroAddress)
      ).to.be.revertedWithCustomError(executionRightsNFT, "ZeroAddress");
    });
  });

  // =============================================================
  //                      MINTING TESTS
  // =============================================================

  describe("Minting Execution Rights", function () {
    const capitalLimit = 50n * 10n ** 6n; // $50 (within $100 UNVERIFIED limit)
    const duration = ONE_DAY; // 1 day
    const stakeAmount = 25n * 10n ** 6n; // 50% of $50 = $25

    describe("Basic Minting", function () {
      it("should mint ERT with valid parameters", async function () {
        const constraints = createValidConstraints();
        const fees = createValidFees(stakeAmount);

        await executionRightsNFT.connect(executor1).mint(
          await executor1.getAddress(),
          capitalLimit,
          duration,
          constraints,
          fees,
          { value: stakeAmount }
        );

        expect(await executionRightsNFT.balanceOf(await executor1.getAddress())).to.equal(1n);
        expect(await executionRightsNFT.ownerOf(1)).to.equal(await executor1.getAddress());
      });

      it("should increment token ID", async function () {
        const constraints = createValidConstraints();
        const fees = createValidFees(stakeAmount);

        await executionRightsNFT.connect(executor1).mint(
          await executor1.getAddress(),
          capitalLimit,
          duration,
          constraints,
          fees,
          { value: stakeAmount }
        );

        expect(await executionRightsNFT.nextTokenId()).to.equal(2n);
      });

      it("should store execution rights correctly", async function () {
        const constraints = createValidConstraints([await owner.getAddress()], [USDC_ADDRESS]);
        const fees = createValidFees(stakeAmount);

        await executionRightsNFT.connect(executor1).mint(
          await executor1.getAddress(),
          capitalLimit,
          duration,
          constraints,
          fees,
          { value: stakeAmount }
        );

        const rights = await executionRightsNFT.getRights(1);

        expect(rights.tokenId).to.equal(1n);
        expect(rights.executor).to.equal(await executor1.getAddress());
        expect(rights.vault).to.equal(await executionVault.getAddress());
        expect(rights.capitalLimit).to.equal(capitalLimit);
        expect(rights.ertStatus).to.equal(ERTStatus.ACTIVE);
      });

      it("should set correct start and expiry times", async function () {
        const constraints = createValidConstraints();
        const fees = createValidFees(stakeAmount);

        const tx = await executionRightsNFT.connect(executor1).mint(
          await executor1.getAddress(),
          capitalLimit,
          duration,
          constraints,
          fees,
          { value: stakeAmount }
        );

        const block = await ethers.provider.getBlock(tx.blockNumber);
        const rights = await executionRightsNFT.getRights(1);

        expect(rights.startTime).to.equal(block?.timestamp);
        expect(rights.expiryTime).to.equal(BigInt(block?.timestamp || 0) + duration);
      });

      it("should emit RightsMinted event", async function () {
        const constraints = createValidConstraints();
        const fees = createValidFees(stakeAmount);

        await expect(
          executionRightsNFT.connect(executor1).mint(
            await executor1.getAddress(),
            capitalLimit,
            duration,
            constraints,
            fees,
            { value: stakeAmount }
          )
        ).to.emit(executionRightsNFT, "RightsMinted");
      });

      it("should use msg.value as staked amount in storage", async function () {
        const constraints = createValidConstraints();
        const fees = createValidFees(stakeAmount);

        // Send more ETH than stakedAmount in fees
        const sentValue = stakeAmount + ethers.parseEther("0.1");

        await executionRightsNFT.connect(executor1).mint(
          await executor1.getAddress(),
          capitalLimit,
          duration,
          constraints,
          fees,
          { value: sentValue }
        );

        const rights = await executionRightsNFT.getRights(1);
        expect(rights.fees.stakedAmount).to.equal(sentValue);
      });
    });

    describe("Tier Validation", function () {
      it("should reject capital exceeding tier limit", async function () {
        const excessiveCapital = 200n * 10n ** 6n; // $200 > $100 UNVERIFIED limit
        const constraints = createValidConstraints();
        const fees = createValidFees(100n * 10n ** 6n); // 50% stake

        await expect(
          executionRightsNFT.connect(executor1).mint(
            await executor1.getAddress(),
            excessiveCapital,
            duration,
            constraints,
            fees,
            { value: 100n * 10n ** 6n }
          )
        ).to.be.revertedWithCustomError(executionRightsNFT, "CapitalExceedsTierLimit");
      });

      it("should reject drawdown exceeding tier limit", async function () {
        const badConstraints = {
          maxLeverage: 1,
          maxDrawdownBps: 2500, // 25% > 20% UNVERIFIED limit
          maxPositionSizeBps: 5000,
          allowedAdapters: [],
          allowedAssets: []
        };
        const fees = createValidFees(stakeAmount);

        await expect(
          executionRightsNFT.connect(executor1).mint(
            await executor1.getAddress(),
            capitalLimit,
            duration,
            badConstraints,
            fees,
            { value: stakeAmount }
          )
        ).to.be.revertedWithCustomError(executionRightsNFT, "DrawdownExceedsTierLimit");
      });

      it("should reject risk level exceeding tier limit", async function () {
        // UNVERIFIED only allows risk level 0 (conservative), which means leverage <= 1
        const aggressiveConstraints = {
          maxLeverage: 3, // Risk level 2 (aggressive) > tier 0 allowance
          maxDrawdownBps: 2000,
          maxPositionSizeBps: 5000,
          allowedAdapters: [],
          allowedAssets: []
        };
        const fees = createValidFees(stakeAmount);

        await expect(
          executionRightsNFT.connect(executor1).mint(
            await executor1.getAddress(),
            capitalLimit,
            duration,
            aggressiveConstraints,
            fees,
            { value: stakeAmount }
          )
        ).to.be.revertedWithCustomError(executionRightsNFT, "RiskLevelExceedsTierLimit");
      });

      it("should allow higher capital for higher tier", async function () {
        // Upgrade executor to NOVICE (max $1000)
        await reputationManager.setExecutorTier(await executor1.getAddress(), ExecutorTier.NOVICE);

        const higherCapital = 500n * 10n ** 6n; // $500
        const higherStake = 125n * 10n ** 6n; // 25% for NOVICE

        const constraints = {
          maxLeverage: 2, // Moderate risk level allowed for NOVICE
          maxDrawdownBps: 1500, // 15% - within NOVICE limit
          maxPositionSizeBps: 5000,
          allowedAdapters: [],
          allowedAssets: []
        };
        const fees = createValidFees(higherStake);

        // Should succeed without reverting
        await executionRightsNFT.connect(executor1).mint(
          await executor1.getAddress(),
          higherCapital,
          duration,
          constraints,
          fees,
          { value: higherStake }
        );

        // Verify the mint succeeded
        expect(await executionRightsNFT.balanceOf(await executor1.getAddress())).to.equal(1n);
      });
    });

    describe("Stake Validation", function () {
      it("should reject insufficient stake in fees struct", async function () {
        const constraints = createValidConstraints();
        const insufficientFees = {
          baseFeeAprBps: 200,
          profitShareBps: 2000,
          stakedAmount: stakeAmount - 1n // Just under required
        };

        await expect(
          executionRightsNFT.connect(executor1).mint(
            await executor1.getAddress(),
            capitalLimit,
            duration,
            constraints,
            insufficientFees,
            { value: stakeAmount }
          )
        ).to.be.revertedWithCustomError(executionRightsNFT, "InsufficientStake");
      });

      it("should reject insufficient msg.value", async function () {
        const constraints = createValidConstraints();
        const fees = createValidFees(stakeAmount);

        await expect(
          executionRightsNFT.connect(executor1).mint(
            await executor1.getAddress(),
            capitalLimit,
            duration,
            constraints,
            fees,
            { value: stakeAmount - 1n }
          )
        ).to.be.revertedWithCustomError(executionRightsNFT, "InsufficientStake");
      });

      it("should accept exact required stake", async function () {
        const constraints = createValidConstraints();
        const fees = createValidFees(stakeAmount);

        await executionRightsNFT.connect(executor1).mint(
          await executor1.getAddress(),
          capitalLimit,
          duration,
          constraints,
          fees,
          { value: stakeAmount }
        );

        expect(await executionRightsNFT.balanceOf(await executor1.getAddress())).to.equal(1n);
      });

      it("should accept excess stake", async function () {
        const constraints = createValidConstraints();
        const fees = createValidFees(stakeAmount * 2n);

        await executionRightsNFT.connect(executor1).mint(
          await executor1.getAddress(),
          capitalLimit,
          duration,
          constraints,
          fees,
          { value: stakeAmount * 2n }
        );

        expect(await executionRightsNFT.balanceOf(await executor1.getAddress())).to.equal(1n);
      });
    });

    describe("Duration Validation", function () {
      it("should reject duration below minimum", async function () {
        const constraints = createValidConstraints();
        const fees = createValidFees(stakeAmount);
        const shortDuration = MIN_DURATION - 1n;

        await expect(
          executionRightsNFT.connect(executor1).mint(
            await executor1.getAddress(),
            capitalLimit,
            shortDuration,
            constraints,
            fees,
            { value: stakeAmount }
          )
        ).to.be.revertedWithCustomError(executionRightsNFT, "DurationTooShort");
      });

      it("should accept exactly minimum duration", async function () {
        const constraints = createValidConstraints();
        const fees = createValidFees(stakeAmount);

        await executionRightsNFT.connect(executor1).mint(
          await executor1.getAddress(),
          capitalLimit,
          MIN_DURATION,
          constraints,
          fees,
          { value: stakeAmount }
        );

        expect(await executionRightsNFT.balanceOf(await executor1.getAddress())).to.equal(1n);
      });

      it("should reject duration above maximum", async function () {
        const constraints = createValidConstraints();
        const fees = createValidFees(stakeAmount);
        const longDuration = MAX_DURATION + 1n;

        await expect(
          executionRightsNFT.connect(executor1).mint(
            await executor1.getAddress(),
            capitalLimit,
            longDuration,
            constraints,
            fees,
            { value: stakeAmount }
          )
        ).to.be.revertedWithCustomError(executionRightsNFT, "DurationTooLong");
      });

      it("should accept exactly maximum duration", async function () {
        const constraints = createValidConstraints();
        const fees = createValidFees(stakeAmount);

        await executionRightsNFT.connect(executor1).mint(
          await executor1.getAddress(),
          capitalLimit,
          MAX_DURATION,
          constraints,
          fees,
          { value: stakeAmount }
        );

        expect(await executionRightsNFT.balanceOf(await executor1.getAddress())).to.equal(1n);
      });
    });

    describe("Banned Executor", function () {
      it("should reject minting for banned executor", async function () {
        await reputationManager.banExecutor(await executor1.getAddress(), "Test ban");

        const constraints = createValidConstraints();
        const fees = createValidFees(stakeAmount);

        await expect(
          executionRightsNFT.connect(executor1).mint(
            await executor1.getAddress(),
            capitalLimit,
            duration,
            constraints,
            fees,
            { value: stakeAmount }
          )
        ).to.be.revertedWithCustomError(executionRightsNFT, "ExecutorBanned");
      });
    });

    describe("Circuit Breaker", function () {
      it("should reject minting when circuit breaker active", async function () {
        await circuitBreaker.emergencyPause();

        const constraints = createValidConstraints();
        const fees = createValidFees(stakeAmount);

        await expect(
          executionRightsNFT.connect(executor1).mint(
            await executor1.getAddress(),
            capitalLimit,
            duration,
            constraints,
            fees,
            { value: stakeAmount }
          )
        ).to.be.revertedWithCustomError(executionRightsNFT, "CircuitBreakerActive");
      });

      it("should allow minting when no circuit breaker set", async function () {
        await executionRightsNFT.setCircuitBreaker(ethers.ZeroAddress);

        const constraints = createValidConstraints();
        const fees = createValidFees(stakeAmount);

        await executionRightsNFT.connect(executor1).mint(
          await executor1.getAddress(),
          capitalLimit,
          duration,
          constraints,
          fees,
          { value: stakeAmount }
        );

        expect(await executionRightsNFT.balanceOf(await executor1.getAddress())).to.equal(1n);
      });
    });

    describe("Daily Expiry Tracking", function () {
      it("should track daily expiry amounts", async function () {
        const constraints = createValidConstraints();
        const fees = createValidFees(stakeAmount);

        const tx = await executionRightsNFT.connect(executor1).mint(
          await executor1.getAddress(),
          capitalLimit,
          duration,
          constraints,
          fees,
          { value: stakeAmount }
        );

        const block = await ethers.provider.getBlock(tx.blockNumber);
        const expiryDay = ((BigInt(block?.timestamp || 0) + duration) / ONE_DAY) * ONE_DAY;

        expect(await executionRightsNFT.dailyExpiryAmount(expiryDay)).to.equal(capitalLimit);
      });

      it("should accumulate daily expiry for multiple ERTs", async function () {
        const constraints = createValidConstraints();
        const fees = createValidFees(stakeAmount);

        // Mint two ERTs with same expiry day
        await executionRightsNFT.connect(executor1).mint(
          await executor1.getAddress(),
          capitalLimit,
          duration,
          constraints,
          fees,
          { value: stakeAmount }
        );

        await executionRightsNFT.connect(executor1).mint(
          await executor1.getAddress(),
          capitalLimit,
          duration,
          constraints,
          fees,
          { value: stakeAmount }
        );

        // Get expiry day
        const rights = await executionRightsNFT.getRights(1);
        const expiryDay = (rights.expiryTime / ONE_DAY) * ONE_DAY;

        expect(await executionRightsNFT.dailyExpiryAmount(expiryDay)).to.equal(capitalLimit * 2n);
      });
    });
  });

  // =============================================================
  //                   STATUS UPDATE TESTS
  // =============================================================

  describe("Status Updates", function () {
    const capitalLimit = 50n * 10n ** 6n;
    const duration = ONE_DAY;
    const stakeAmount = 25n * 10n ** 6n;

    beforeEach(async function () {
      // Mint an ERT first
      const constraints = createValidConstraints();
      const fees = createValidFees(stakeAmount);

      await executionRightsNFT.connect(executor1).mint(
        await executor1.getAddress(),
        capitalLimit,
        duration,
        constraints,
        fees,
        { value: stakeAmount }
      );
    });

    describe("updateStatus()", function () {
      it("should allow controller to update status", async function () {
        await executionRightsNFT.connect(controller).updateStatus(1, 10000n, 1000n, 500n);

        const rights = await executionRightsNFT.getRights(1);
        expect(rights.status.capitalDeployed).to.equal(10000n);
      });

      it("should update capital deployed", async function () {
        await executionRightsNFT.connect(controller).updateStatus(1, 20_000n * 10n ** 6n, 0, 0);

        const rights = await executionRightsNFT.getRights(1);
        expect(rights.status.capitalDeployed).to.equal(20_000n * 10n ** 6n);
      });

      it("should update realized PnL", async function () {
        await executionRightsNFT.connect(controller).updateStatus(1, 0, 5_000n * 10n ** 6n, 0);

        const rights = await executionRightsNFT.getRights(1);
        expect(rights.status.realizedPnl).to.equal(5_000n * 10n ** 6n);
      });

      it("should update unrealized PnL", async function () {
        await executionRightsNFT.connect(controller).updateStatus(1, 0, 0, 3_000n * 10n ** 6n);

        const rights = await executionRightsNFT.getRights(1);
        expect(rights.status.unrealizedPnl).to.equal(3_000n * 10n ** 6n);
      });

      it("should update high water mark when total value increases", async function () {
        // Initial HWM = capitalLimit = 50M
        const initialRights = await executionRightsNFT.getRights(1);
        expect(initialRights.status.highWaterMark).to.equal(capitalLimit);

        // Update with profit - total value = capitalLimit + PnL = 50 + 10 = 60M
        await executionRightsNFT.connect(controller).updateStatus(1, 0, 10n * 10n ** 6n, 0);

        const rights = await executionRightsNFT.getRights(1);
        expect(rights.status.highWaterMark).to.equal(60n * 10n ** 6n);
      });

      it("should NOT update high water mark when total value decreases", async function () {
        // Set HWM high first
        await executionRightsNFT.connect(controller).updateStatus(1, 0, 10n * 10n ** 6n, 0);

        const hwmBefore = (await executionRightsNFT.getRights(1)).status.highWaterMark;

        // Now decrease value
        await executionRightsNFT.connect(controller).updateStatus(1, 0, -5n * 10n ** 6n, 0);

        const hwmAfter = (await executionRightsNFT.getRights(1)).status.highWaterMark;
        expect(hwmAfter).to.equal(hwmBefore);
      });

      it("should track max drawdown", async function () {
        // Record a loss
        const loss = -10n * 10n ** 6n; // -$10 on $50 capital = 20%
        await executionRightsNFT.connect(controller).updateStatus(1, 0, loss, 0);

        const rights = await executionRightsNFT.getRights(1);
        expect(rights.status.maxDrawdownHit).to.equal(2000n); // 20% in bps
      });

      it("should track increasing max drawdown", async function () {
        // First loss: 10%
        await executionRightsNFT.connect(controller).updateStatus(1, 0, -5n * 10n ** 6n, 0);

        let rights = await executionRightsNFT.getRights(1);
        expect(rights.status.maxDrawdownHit).to.equal(1000n); // 10%

        // Bigger loss: 20%
        await executionRightsNFT.connect(controller).updateStatus(1, 0, -10n * 10n ** 6n, 0);

        rights = await executionRightsNFT.getRights(1);
        expect(rights.status.maxDrawdownHit).to.equal(2000n); // 20%
      });

      it("should reject non-controller", async function () {
        await expect(
          executionRightsNFT.connect(nonOwner).updateStatus(1, 0, 0, 0)
        ).to.be.revertedWithCustomError(executionRightsNFT, "OnlyController");
      });
    });
  });

  // =============================================================
  //                   SETTLEMENT TESTS
  // =============================================================

  describe("Settlement", function () {
    const capitalLimit = 50n * 10n ** 6n;
    const duration = ONE_DAY;
    const stakeAmount = 25n * 10n ** 6n;

    beforeEach(async function () {
      const constraints = createValidConstraints();
      const fees = createValidFees(stakeAmount);

      await executionRightsNFT.connect(executor1).mint(
        await executor1.getAddress(),
        capitalLimit,
        duration,
        constraints,
        fees,
        { value: stakeAmount }
      );
    });

    describe("settle()", function () {
      it("should allow settlement engine to settle", async function () {
        await executionRightsNFT.connect(settlementEngine).settle(1, 5n * 10n ** 6n);

        const rights = await executionRightsNFT.getRights(1);
        expect(rights.ertStatus).to.equal(ERTStatus.SETTLED);
      });

      it("should update ERT status to SETTLED", async function () {
        await executionRightsNFT.connect(settlementEngine).settle(1, 5n * 10n ** 6n);

        const rights = await executionRightsNFT.getRights(1);
        expect(rights.ertStatus).to.equal(ERTStatus.SETTLED);
      });

      it("should set final PnL", async function () {
        const finalPnl = 5n * 10n ** 6n;
        await executionRightsNFT.connect(settlementEngine).settle(1, finalPnl);

        const rights = await executionRightsNFT.getRights(1);
        expect(rights.status.realizedPnl).to.equal(finalPnl);
        expect(rights.status.unrealizedPnl).to.equal(0n);
      });

      it("should handle negative final PnL", async function () {
        const finalPnl = -10n * 10n ** 6n;
        await executionRightsNFT.connect(settlementEngine).settle(1, finalPnl);

        const rights = await executionRightsNFT.getRights(1);
        expect(rights.status.realizedPnl).to.equal(finalPnl);
      });

      it("should emit RightsSettled event", async function () {
        const finalPnl = 5n * 10n ** 6n;

        await expect(
          executionRightsNFT.connect(settlementEngine).settle(1, finalPnl)
        ).to.emit(executionRightsNFT, "RightsSettled")
          .withArgs(1, finalPnl, capitalLimit);
      });

      it("should reject non-settlement engine", async function () {
        await expect(
          executionRightsNFT.connect(nonOwner).settle(1, 0)
        ).to.be.revertedWithCustomError(executionRightsNFT, "OnlySettlement");
      });

      it("should reject settling already settled ERT", async function () {
        await executionRightsNFT.connect(settlementEngine).settle(1, 0);

        await expect(
          executionRightsNFT.connect(settlementEngine).settle(1, 0)
        ).to.be.revertedWithCustomError(executionRightsNFT, "ERTNotActive");
      });

      it("should reject settling expired ERT", async function () {
        // Fast forward past expiry
        await ethers.provider.send("evm_increaseTime", [Number(duration) + 1]);
        await ethers.provider.send("evm_mine", []);

        // Mark as expired first
        await executionRightsNFT.markExpired(1);

        await expect(
          executionRightsNFT.connect(settlementEngine).settle(1, 0)
        ).to.be.revertedWithCustomError(executionRightsNFT, "ERTNotActive");
      });
    });

    describe("markExpired()", function () {
      it("should allow anyone to mark expired ERT", async function () {
        // Fast forward past expiry
        await ethers.provider.send("evm_increaseTime", [Number(duration) + 1]);
        await ethers.provider.send("evm_mine", []);

        await executionRightsNFT.connect(nonOwner).markExpired(1);

        const rights = await executionRightsNFT.getRights(1);
        expect(rights.ertStatus).to.equal(ERTStatus.EXPIRED);
      });

      it("should update status to EXPIRED", async function () {
        await ethers.provider.send("evm_increaseTime", [Number(duration) + 1]);
        await ethers.provider.send("evm_mine", []);

        await executionRightsNFT.markExpired(1);

        const rights = await executionRightsNFT.getRights(1);
        expect(rights.ertStatus).to.equal(ERTStatus.EXPIRED);
      });

      it("should emit RightsExpired event", async function () {
        await ethers.provider.send("evm_increaseTime", [Number(duration) + 1]);
        await ethers.provider.send("evm_mine", []);

        const rights = await executionRightsNFT.getRights(1);

        await expect(executionRightsNFT.markExpired(1))
          .to.emit(executionRightsNFT, "RightsExpired")
          .withArgs(1, rights.expiryTime);
      });

      it("should reject marking non-expired ERT", async function () {
        await expect(
          executionRightsNFT.markExpired(1)
        ).to.be.revertedWithCustomError(executionRightsNFT, "ERTNotActive");
      });

      it("should be idempotent (no error on re-marking)", async function () {
        await ethers.provider.send("evm_increaseTime", [Number(duration) + 1]);
        await ethers.provider.send("evm_mine", []);

        await executionRightsNFT.markExpired(1);

        // Second call should not revert but also not change anything
        await executionRightsNFT.markExpired(1);
        const rights = await executionRightsNFT.getRights(1);
        expect(rights.ertStatus).to.equal(ERTStatus.EXPIRED);
      });
    });

    describe("markLiquidated()", function () {
      it("should allow controller to mark as liquidated", async function () {
        await executionRightsNFT.connect(controller).markLiquidated(1);

        const rights = await executionRightsNFT.getRights(1);
        expect(rights.ertStatus).to.equal(ERTStatus.LIQUIDATED);
      });

      it("should update status to LIQUIDATED", async function () {
        await executionRightsNFT.connect(controller).markLiquidated(1);

        const rights = await executionRightsNFT.getRights(1);
        expect(rights.ertStatus).to.equal(ERTStatus.LIQUIDATED);
      });

      it("should reject non-controller", async function () {
        await expect(
          executionRightsNFT.connect(nonOwner).markLiquidated(1)
        ).to.be.revertedWithCustomError(executionRightsNFT, "OnlyController");
      });
    });
  });

  // =============================================================
  //                    VIEW FUNCTION TESTS
  // =============================================================

  describe("View Functions", function () {
    const capitalLimit = 50n * 10n ** 6n;
    const duration = ONE_DAY;
    const stakeAmount = 25n * 10n ** 6n;

    beforeEach(async function () {
      const constraints = createValidConstraints([await owner.getAddress()], [USDC_ADDRESS]);
      const fees = createValidFees(stakeAmount);

      await executionRightsNFT.connect(executor1).mint(
        await executor1.getAddress(),
        capitalLimit,
        duration,
        constraints,
        fees,
        { value: stakeAmount }
      );
    });

    describe("getRights()", function () {
      it("should return complete rights data", async function () {
        const rights = await executionRightsNFT.getRights(1);

        expect(rights.tokenId).to.equal(1n);
        expect(rights.executor).to.equal(await executor1.getAddress());
        expect(rights.capitalLimit).to.equal(capitalLimit);
      });

      it("should revert for non-existent token", async function () {
        await expect(
          executionRightsNFT.getRights(999)
        ).to.be.revertedWithCustomError(executionRightsNFT, "ERTNotFound");
      });
    });

    describe("isValid()", function () {
      it("should return true for active, non-expired ERT", async function () {
        expect(await executionRightsNFT.isValid(1)).to.be.true;
      });

      it("should return false for non-existent ERT", async function () {
        expect(await executionRightsNFT.isValid(999)).to.be.false;
      });

      it("should return false for expired ERT", async function () {
        await ethers.provider.send("evm_increaseTime", [Number(duration) + 1]);
        await ethers.provider.send("evm_mine", []);

        expect(await executionRightsNFT.isValid(1)).to.be.false;
      });

      it("should return false for settled ERT", async function () {
        await executionRightsNFT.connect(settlementEngine).settle(1, 0);

        expect(await executionRightsNFT.isValid(1)).to.be.false;
      });

      it("should return false for liquidated ERT", async function () {
        await executionRightsNFT.connect(controller).markLiquidated(1);

        expect(await executionRightsNFT.isValid(1)).to.be.false;
      });
    });

    describe("isExpired()", function () {
      it("should return false before expiry", async function () {
        expect(await executionRightsNFT.isExpired(1)).to.be.false;
      });

      it("should return true at exactly expiry", async function () {
        await ethers.provider.send("evm_increaseTime", [Number(duration)]);
        await ethers.provider.send("evm_mine", []);

        expect(await executionRightsNFT.isExpired(1)).to.be.true;
      });

      it("should return true after expiry", async function () {
        await ethers.provider.send("evm_increaseTime", [Number(duration) + 3600]);
        await ethers.provider.send("evm_mine", []);

        expect(await executionRightsNFT.isExpired(1)).to.be.true;
      });
    });

    describe("getExecutor()", function () {
      it("should return correct executor", async function () {
        expect(await executionRightsNFT.getExecutor(1)).to.equal(await executor1.getAddress());
      });
    });

    describe("getConstraints()", function () {
      it("should return correct constraints", async function () {
        const constraints = await executionRightsNFT.getConstraints(1);

        expect(constraints.maxLeverage).to.equal(1n);
        expect(constraints.maxDrawdownBps).to.equal(2000n);
        expect(constraints.allowedAdapters).to.include(await owner.getAddress());
        expect(constraints.allowedAssets).to.include(USDC_ADDRESS);
      });
    });

    describe("getFees()", function () {
      it("should return correct fees", async function () {
        const fees = await executionRightsNFT.getFees(1);

        expect(fees.baseFeeAprBps).to.equal(200n);
        expect(fees.profitShareBps).to.equal(2000n);
        expect(fees.stakedAmount).to.equal(stakeAmount);
      });
    });

    describe("getStatus()", function () {
      it("should return initial status", async function () {
        const status = await executionRightsNFT.getStatus(1);

        expect(status.capitalDeployed).to.equal(0n);
        expect(status.realizedPnl).to.equal(0n);
        expect(status.unrealizedPnl).to.equal(0n);
        expect(status.highWaterMark).to.equal(capitalLimit);
        expect(status.maxDrawdownHit).to.equal(0n);
      });
    });

    describe("getActiveERTs()", function () {
      it("should return active ERTs for executor", async function () {
        const activeERTs = await executionRightsNFT.getActiveERTs(await executor1.getAddress());

        expect(activeERTs.length).to.equal(1);
        expect(activeERTs[0]).to.equal(1n);
      });

      it("should return empty array for executor with no ERTs", async function () {
        const activeERTs = await executionRightsNFT.getActiveERTs(await executor2.getAddress());
        expect(activeERTs.length).to.equal(0);
      });

      it("should not include expired ERTs", async function () {
        await ethers.provider.send("evm_increaseTime", [Number(duration) + 1]);
        await ethers.provider.send("evm_mine", []);

        const activeERTs = await executionRightsNFT.getActiveERTs(await executor1.getAddress());
        expect(activeERTs.length).to.equal(0);
      });

      it("should not include settled ERTs", async function () {
        await executionRightsNFT.connect(settlementEngine).settle(1, 0);

        const activeERTs = await executionRightsNFT.getActiveERTs(await executor1.getAddress());
        expect(activeERTs.length).to.equal(0);
      });

      it("should return multiple active ERTs", async function () {
        const constraints = createValidConstraints();
        const fees = createValidFees(stakeAmount);

        // Mint two more ERTs
        await executionRightsNFT.connect(executor1).mint(
          await executor1.getAddress(),
          capitalLimit,
          duration,
          constraints,
          fees,
          { value: stakeAmount }
        );

        await executionRightsNFT.connect(executor1).mint(
          await executor1.getAddress(),
          capitalLimit,
          duration,
          constraints,
          fees,
          { value: stakeAmount }
        );

        const activeERTs = await executionRightsNFT.getActiveERTs(await executor1.getAddress());
        expect(activeERTs.length).to.equal(3);
      });
    });
  });

  // =============================================================
  //                    TRANSFER TESTS
  // =============================================================

  describe("Transfer Restrictions", function () {
    const capitalLimit = 50n * 10n ** 6n;
    const duration = ONE_DAY;
    const stakeAmount = 25n * 10n ** 6n;

    beforeEach(async function () {
      const constraints = createValidConstraints();
      const fees = createValidFees(stakeAmount);

      await executionRightsNFT.connect(executor1).mint(
        await executor1.getAddress(),
        capitalLimit,
        duration,
        constraints,
        fees,
        { value: stakeAmount }
      );
    });

    it("should block transfers by default", async function () {
      await expect(
        executionRightsNFT.connect(executor1).transferFrom(
          await executor1.getAddress(),
          await executor2.getAddress(),
          1
        )
      ).to.be.revertedWithCustomError(executionRightsNFT, "Unauthorized");
    });

    it("should allow transfers when enabled", async function () {
      await executionRightsNFT.setTransfersEnabled(true);

      await executionRightsNFT.connect(executor1).transferFrom(
        await executor1.getAddress(),
        await executor2.getAddress(),
        1
      );

      expect(await executionRightsNFT.ownerOf(1)).to.equal(await executor2.getAddress());
    });

    it("should emit TransfersToggled event", async function () {
      await expect(executionRightsNFT.setTransfersEnabled(true))
        .to.emit(executionRightsNFT, "TransfersToggled")
        .withArgs(true);
    });

    it("should allow minting regardless of transfer setting", async function () {
      // Minting is always allowed
      const constraints = createValidConstraints();
      const fees = createValidFees(stakeAmount);

      await executionRightsNFT.connect(executor1).mint(
        await executor1.getAddress(),
        capitalLimit,
        duration,
        constraints,
        fees,
        { value: stakeAmount }
      );

      expect(await executionRightsNFT.balanceOf(await executor1.getAddress())).to.equal(2n);
    });
  });

  // =============================================================
  //                    ADMIN FUNCTION TESTS
  // =============================================================

  describe("Admin Functions", function () {
    describe("setExecutionController()", function () {
      it("should allow owner to set controller", async function () {
        const newController = await nonOwner.getAddress();
        await executionRightsNFT.setExecutionController(newController);
        expect(await executionRightsNFT.executionController()).to.equal(newController);
      });

      it("should reject zero address", async function () {
        await expect(
          executionRightsNFT.setExecutionController(ethers.ZeroAddress)
        ).to.be.revertedWithCustomError(executionRightsNFT, "ZeroAddress");
      });

      it("should reject non-owner", async function () {
        await expect(
          executionRightsNFT.connect(nonOwner).setExecutionController(await nonOwner.getAddress())
        ).to.be.revertedWithCustomError(executionRightsNFT, "OwnableUnauthorizedAccount");
      });
    });

    describe("setSettlementEngine()", function () {
      it("should allow owner to set settlement engine", async function () {
        const newEngine = await nonOwner.getAddress();
        await executionRightsNFT.setSettlementEngine(newEngine);
        expect(await executionRightsNFT.settlementEngine()).to.equal(newEngine);
      });

      it("should reject zero address", async function () {
        await expect(
          executionRightsNFT.setSettlementEngine(ethers.ZeroAddress)
        ).to.be.revertedWithCustomError(executionRightsNFT, "ZeroAddress");
      });
    });

    describe("setCircuitBreaker()", function () {
      it("should allow owner to set circuit breaker", async function () {
        await executionRightsNFT.setCircuitBreaker(await nonOwner.getAddress());
        expect(await executionRightsNFT.circuitBreaker()).to.equal(await nonOwner.getAddress());
      });

      it("should allow setting to zero address (disables checks)", async function () {
        await executionRightsNFT.setCircuitBreaker(ethers.ZeroAddress);
        expect(await executionRightsNFT.circuitBreaker()).to.equal(ethers.ZeroAddress);
      });
    });

    describe("setReputationManager()", function () {
      it("should allow owner to set reputation manager", async function () {
        const newManager = await nonOwner.getAddress();
        await executionRightsNFT.setReputationManager(newManager);
        expect(await executionRightsNFT.reputationManager()).to.equal(newManager);
      });

      it("should reject zero address", async function () {
        await expect(
          executionRightsNFT.setReputationManager(ethers.ZeroAddress)
        ).to.be.revertedWithCustomError(executionRightsNFT, "ZeroAddress");
      });
    });

    describe("withdrawStakes()", function () {
      const capitalLimit = 50n * 10n ** 6n;
      const duration = ONE_DAY;
      const stakeAmount = ethers.parseEther("1");

      beforeEach(async function () {
        const constraints = createValidConstraints();
        const fees = createValidFees(stakeAmount);

        await executionRightsNFT.connect(executor1).mint(
          await executor1.getAddress(),
          capitalLimit,
          duration,
          constraints,
          fees,
          { value: stakeAmount }
        );
      });

      it("should allow owner to withdraw collected stakes", async function () {
        const balanceBefore = await ethers.provider.getBalance(await owner.getAddress());

        await executionRightsNFT.withdrawStakes(await owner.getAddress(), stakeAmount);

        const balanceAfter = await ethers.provider.getBalance(await owner.getAddress());
        expect(balanceAfter).to.be.gt(balanceBefore);
      });

      it("should reject zero address recipient", async function () {
        await expect(
          executionRightsNFT.withdrawStakes(ethers.ZeroAddress, stakeAmount)
        ).to.be.revertedWithCustomError(executionRightsNFT, "ZeroAddress");
      });
    });

    describe("returnStake()", function () {
      const capitalLimit = 50n * 10n ** 6n;
      const duration = ONE_DAY;
      const stakeAmount = ethers.parseEther("1");

      beforeEach(async function () {
        const constraints = createValidConstraints();
        const fees = createValidFees(stakeAmount);

        await executionRightsNFT.connect(executor1).mint(
          await executor1.getAddress(),
          capitalLimit,
          duration,
          constraints,
          fees,
          { value: stakeAmount }
        );
      });

      it("should allow settlement engine to return stake", async function () {
        const balanceBefore = await ethers.provider.getBalance(await executor1.getAddress());

        await executionRightsNFT.connect(settlementEngine).returnStake(
          await executor1.getAddress(),
          stakeAmount
        );

        const balanceAfter = await ethers.provider.getBalance(await executor1.getAddress());
        expect(balanceAfter - balanceBefore).to.equal(stakeAmount);
      });

      it("should reject non-settlement engine", async function () {
        await expect(
          executionRightsNFT.connect(nonOwner).returnStake(await executor1.getAddress(), stakeAmount)
        ).to.be.revertedWithCustomError(executionRightsNFT, "OnlySettlement");
      });

      it("should handle zero amount gracefully", async function () {
        // Zero amount return should complete without error
        await executionRightsNFT.connect(settlementEngine).returnStake(await executor1.getAddress(), 0);
        // If we get here without error, test passes
      });
    });
  });

  // =============================================================
  //                    EDGE CASES TESTS
  // =============================================================

  describe("Edge Cases and Boundary Conditions", function () {
    const capitalLimit = 50n * 10n ** 6n;
    const stakeAmount = 25n * 10n ** 6n;

    describe("Multiple ERTs per Executor", function () {
      it("should allow executor to hold multiple ERTs", async function () {
        const constraints = createValidConstraints();
        const fees = createValidFees(stakeAmount);

        for (let i = 0; i < 5; i++) {
          await executionRightsNFT.connect(executor1).mint(
            await executor1.getAddress(),
            capitalLimit,
            ONE_DAY,
            constraints,
            fees,
            { value: stakeAmount }
          );
        }

        expect(await executionRightsNFT.balanceOf(await executor1.getAddress())).to.equal(5n);
      });
    });

    describe("Constraints Edge Cases", function () {
      it("should accept empty allowed adapters array", async function () {
        const constraints = createValidConstraints([], [USDC_ADDRESS]);
        const fees = createValidFees(stakeAmount);

        // Should succeed with empty adapters array
        await executionRightsNFT.connect(executor1).mint(
          await executor1.getAddress(),
          capitalLimit,
          ONE_DAY,
          constraints,
          fees,
          { value: stakeAmount }
        );
        // Verify token was minted
        expect(await executionRightsNFT.totalSupply()).to.equal(1n);
      });

      it("should accept empty allowed assets array", async function () {
        const constraints = createValidConstraints([await owner.getAddress()], []);
        const fees = createValidFees(stakeAmount);

        // Should succeed with empty assets array
        await executionRightsNFT.connect(executor1).mint(
          await executor1.getAddress(),
          capitalLimit,
          ONE_DAY,
          constraints,
          fees,
          { value: stakeAmount }
        );
        // Verify token was minted
        expect(await executionRightsNFT.totalSupply()).to.equal(1n);
      });

      it("should handle large number of allowed adapters", async function () {
        const adapters: string[] = [];
        for (let i = 0; i < 20; i++) {
          adapters.push(ethers.Wallet.createRandom().address);
        }

        const constraints = createValidConstraints(adapters, []);
        const fees = createValidFees(stakeAmount);

        // Should succeed with many adapters
        await executionRightsNFT.connect(executor1).mint(
          await executor1.getAddress(),
          capitalLimit,
          ONE_DAY,
          constraints,
          fees,
          { value: stakeAmount }
        );
        // Verify token was minted
        expect(await executionRightsNFT.totalSupply()).to.equal(1n);
      });
    });

    describe("Zero Capital Edge Case", function () {
      it("should handle zero capital limit (requires 0 stake)", async function () {
        const constraints = createValidConstraints();
        const fees = createValidFees(0n);

        // Zero capital = zero stake required
        await executionRightsNFT.connect(executor1).mint(
          await executor1.getAddress(),
          0n,
          ONE_DAY,
          constraints,
          fees,
          { value: 0n }
        );
        // Verify token was minted
        expect(await executionRightsNFT.totalSupply()).to.equal(1n);
      });
    });

    describe("Receive Function", function () {
      it("should accept direct ETH transfers", async function () {
        const balanceBefore = await ethers.provider.getBalance(await executionRightsNFT.getAddress());
        await owner.sendTransaction({
          to: await executionRightsNFT.getAddress(),
          value: ethers.parseEther("1")
        });
        const balanceAfter = await ethers.provider.getBalance(await executionRightsNFT.getAddress());
        expect(balanceAfter - balanceBefore).to.equal(ethers.parseEther("1"));
      });
    });
  });

  // =============================================================
  //                 ERC-721 ENUMERABLE TESTS
  // =============================================================

  describe("ERC-721 Enumerable", function () {
    const capitalLimit = 50n * 10n ** 6n;
    const duration = ONE_DAY;
    const stakeAmount = 25n * 10n ** 6n;

    beforeEach(async function () {
      const constraints = createValidConstraints();
      const fees = createValidFees(stakeAmount);

      // Mint 3 ERTs for executor1
      for (let i = 0; i < 3; i++) {
        await executionRightsNFT.connect(executor1).mint(
          await executor1.getAddress(),
          capitalLimit,
          duration,
          constraints,
          fees,
          { value: stakeAmount }
        );
      }
    });

    it("should return correct total supply", async function () {
      expect(await executionRightsNFT.totalSupply()).to.equal(3n);
    });

    it("should return correct token by index", async function () {
      expect(await executionRightsNFT.tokenByIndex(0)).to.equal(1n);
      expect(await executionRightsNFT.tokenByIndex(1)).to.equal(2n);
      expect(await executionRightsNFT.tokenByIndex(2)).to.equal(3n);
    });

    it("should return correct token of owner by index", async function () {
      expect(await executionRightsNFT.tokenOfOwnerByIndex(await executor1.getAddress(), 0)).to.equal(1n);
      expect(await executionRightsNFT.tokenOfOwnerByIndex(await executor1.getAddress(), 1)).to.equal(2n);
      expect(await executionRightsNFT.tokenOfOwnerByIndex(await executor1.getAddress(), 2)).to.equal(3n);
    });
  });
});
