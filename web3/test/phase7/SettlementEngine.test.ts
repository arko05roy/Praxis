import { expect } from "chai";
import { network } from "hardhat";
import { SignerWithAddress } from "@nomicfoundation/hardhat-ethers/signers";

const { ethers } = await network.connect();

/**
 * SettlementEngine Comprehensive Test Suite
 *
 * This test suite validates the SettlementEngine contract which:
 * - Settles ERTs and calculates PnL
 * - Unwinds positions through adapters
 * - Distributes fees to LPs, executors, and insurance fund
 * - Handles stake slashing for losses
 * - Integrates with ReputationManager and CircuitBreaker
 *
 * Tests run against Flare mainnet fork to ensure realistic environment.
 */
describe("SettlementEngine", function () {
  this.timeout(120000);

  // Contract instances
  let settlementEngine: any;
  let executionVault: any;
  let executionRightsNFT: any;
  let positionManager: any;
  let reputationManager: any;
  let circuitBreaker: any;
  let insuranceFund: any;
  let flareOracle: any;
  let usdc: any;

  // Signers
  let owner: SignerWithAddress;
  let executor: SignerWithAddress;
  let lp: SignerWithAddress;
  let anyone: SignerWithAddress;

  // Constants
  const BPS = 10000n;
  const ONE_USDC = 10n ** 6n;
  const ONE_ETH = 10n ** 18n;
  const SECONDS_PER_YEAR = 365n * 24n * 60n * 60n;

  before(async function () {
    const chainId = (await ethers.provider.getNetwork()).chainId;
    // Accept both Flare mainnet (14) and Hardhat default (31337) for forked testing
    if (chainId !== 14n && chainId !== 31337n) {
      console.log(`Skipping - not on Flare fork (chainId: ${chainId})`);
      this.skip();
    }

    [owner, executor, lp, anyone] = await ethers.getSigners();
    console.log(`Test owner: ${await owner.getAddress()}`);
    console.log(`Executor: ${await executor.getAddress()}`);
    console.log(`LP: ${await lp.getAddress()}`);
  });

  beforeEach(async function () {
    // Deploy MockERC20 for USDC
    const MockERC20 = await ethers.getContractFactory("MockERC20");
    usdc = await MockERC20.deploy("Mock USDC", "mUSDC", 6);
    await usdc.waitForDeployment();

    // Mint USDC to test accounts
    const mintAmount = 1_000_000n * ONE_USDC;
    await usdc.mint(await lp.getAddress(), mintAmount);
    await usdc.mint(await owner.getAddress(), mintAmount);
    await usdc.mint(await executor.getAddress(), mintAmount);

    // Deploy MockFlareOracle
    const MockFlareOracle = await ethers.getContractFactory("MockFlareOracle");
    flareOracle = await MockFlareOracle.deploy();
    await flareOracle.waitForDeployment();

    // Set mock prices
    await flareOracle.setTokenPrice(await usdc.getAddress(), ONE_ETH); // $1.00

    // Deploy ReputationManager
    const ReputationManager = await ethers.getContractFactory("ReputationManager");
    reputationManager = await ReputationManager.deploy();
    await reputationManager.waitForDeployment();

    // Deploy ExecutionVault
    const ExecutionVault = await ethers.getContractFactory("ExecutionVault");
    executionVault = await ExecutionVault.deploy(
      await usdc.getAddress(),
      "PRAXIS LP Token",
      "pxLP"
    );
    await executionVault.waitForDeployment();

    // Deploy ExecutionRightsNFT
    const ExecutionRightsNFT = await ethers.getContractFactory("ExecutionRightsNFT");
    executionRightsNFT = await ExecutionRightsNFT.deploy(
      await reputationManager.getAddress(),
      await executionVault.getAddress()
    );
    await executionRightsNFT.waitForDeployment();

    // Deploy PositionManager
    const PositionManager = await ethers.getContractFactory("PositionManager");
    positionManager = await PositionManager.deploy(await flareOracle.getAddress());
    await positionManager.waitForDeployment();

    // Deploy CircuitBreaker
    const CircuitBreaker = await ethers.getContractFactory("CircuitBreaker");
    circuitBreaker = await CircuitBreaker.deploy(await executionVault.getAddress(), 0);
    await circuitBreaker.waitForDeployment();

    // Deploy InsuranceFund
    const InsuranceFund = await ethers.getContractFactory("InsuranceFund");
    insuranceFund = await InsuranceFund.deploy(
      await executionVault.getAddress(),
      await usdc.getAddress()
    );
    await insuranceFund.waitForDeployment();

    // Deploy SettlementEngine
    const SettlementEngine = await ethers.getContractFactory("SettlementEngine");
    settlementEngine = await SettlementEngine.deploy(
      await executionRightsNFT.getAddress(),
      await executionVault.getAddress(),
      await positionManager.getAddress(),
      await reputationManager.getAddress(),
      await circuitBreaker.getAddress(),
      await insuranceFund.getAddress(),
      await flareOracle.getAddress()
    );
    await settlementEngine.waitForDeployment();

    // Wire up contracts
    await executionRightsNFT.setSettlementEngine(await settlementEngine.getAddress());
    await reputationManager.setSettlementEngine(await settlementEngine.getAddress());
    await circuitBreaker.setSettlementEngine(await settlementEngine.getAddress());
    await insuranceFund.setSettlementEngine(await settlementEngine.getAddress());

    // Configure vault
    await executionVault.setExecutionController(await owner.getAddress()); // Owner acts as controller for testing

    console.log(`SettlementEngine deployed at: ${await settlementEngine.getAddress()}`);
  });

  // =============================================================
  //                    DEPLOYMENT TESTS
  // =============================================================

  describe("Deployment and Initialization", function () {
    it("should deploy with correct ERT NFT address", async function () {
      expect(await settlementEngine.ertNFT()).to.equal(await executionRightsNFT.getAddress());
    });

    it("should deploy with correct vault address", async function () {
      expect(await settlementEngine.vault()).to.equal(await executionVault.getAddress());
    });

    it("should deploy with correct position manager", async function () {
      expect(await settlementEngine.positionManager()).to.equal(await positionManager.getAddress());
    });

    it("should deploy with correct reputation manager", async function () {
      expect(await settlementEngine.reputationManager()).to.equal(await reputationManager.getAddress());
    });

    it("should deploy with correct circuit breaker", async function () {
      expect(await settlementEngine.circuitBreaker()).to.equal(await circuitBreaker.getAddress());
    });

    it("should deploy with correct insurance fund", async function () {
      expect(await settlementEngine.insuranceFund()).to.equal(await insuranceFund.getAddress());
    });

    it("should deploy with correct oracle", async function () {
      expect(await settlementEngine.flareOracle()).to.equal(await flareOracle.getAddress());
    });

    it("should deploy with correct base asset from vault", async function () {
      expect(await settlementEngine.baseAsset()).to.equal(await usdc.getAddress());
    });

    it("should have correct BPS constant", async function () {
      expect(await settlementEngine.BPS()).to.equal(10000n);
    });

    it("should have correct SECONDS_PER_YEAR constant", async function () {
      expect(await settlementEngine.SECONDS_PER_YEAR()).to.equal(365n * 24n * 60n * 60n);
    });

    it("should have correct INSURANCE_FEE_BPS constant (2%)", async function () {
      expect(await settlementEngine.INSURANCE_FEE_BPS()).to.equal(200n);
    });
  });

  // =============================================================
  //                    CONSTRUCTOR VALIDATION
  // =============================================================

  describe("Constructor Validation", function () {
    it("should revert if ERT NFT is zero address", async function () {
      const SettlementEngine = await ethers.getContractFactory("SettlementEngine");
      await expect(
        SettlementEngine.deploy(
          ethers.ZeroAddress,
          await executionVault.getAddress(),
          await positionManager.getAddress(),
          await reputationManager.getAddress(),
          await circuitBreaker.getAddress(),
          await insuranceFund.getAddress(),
          await flareOracle.getAddress()
        )
      ).to.be.revertedWithCustomError(settlementEngine, "ZeroAddress");
    });

    it("should revert if vault is zero address", async function () {
      const SettlementEngine = await ethers.getContractFactory("SettlementEngine");
      await expect(
        SettlementEngine.deploy(
          await executionRightsNFT.getAddress(),
          ethers.ZeroAddress,
          await positionManager.getAddress(),
          await reputationManager.getAddress(),
          await circuitBreaker.getAddress(),
          await insuranceFund.getAddress(),
          await flareOracle.getAddress()
        )
      ).to.be.revertedWithCustomError(settlementEngine, "ZeroAddress");
    });

    it("should revert if position manager is zero address", async function () {
      const SettlementEngine = await ethers.getContractFactory("SettlementEngine");
      await expect(
        SettlementEngine.deploy(
          await executionRightsNFT.getAddress(),
          await executionVault.getAddress(),
          ethers.ZeroAddress,
          await reputationManager.getAddress(),
          await circuitBreaker.getAddress(),
          await insuranceFund.getAddress(),
          await flareOracle.getAddress()
        )
      ).to.be.revertedWithCustomError(settlementEngine, "ZeroAddress");
    });

    it("should revert if oracle is zero address", async function () {
      const SettlementEngine = await ethers.getContractFactory("SettlementEngine");
      await expect(
        SettlementEngine.deploy(
          await executionRightsNFT.getAddress(),
          await executionVault.getAddress(),
          await positionManager.getAddress(),
          await reputationManager.getAddress(),
          await circuitBreaker.getAddress(),
          await insuranceFund.getAddress(),
          ethers.ZeroAddress
        )
      ).to.be.revertedWithCustomError(settlementEngine, "ZeroAddress");
    });

    it("should allow zero address for optional components (reputation, circuit breaker, insurance)", async function () {
      const SettlementEngine = await ethers.getContractFactory("SettlementEngine");
      const engine = await SettlementEngine.deploy(
        await executionRightsNFT.getAddress(),
        await executionVault.getAddress(),
        await positionManager.getAddress(),
        ethers.ZeroAddress, // reputation manager
        ethers.ZeroAddress, // circuit breaker
        ethers.ZeroAddress, // insurance fund
        await flareOracle.getAddress()
      );
      await engine.waitForDeployment();
      expect(await engine.reputationManager()).to.equal(ethers.ZeroAddress);
    });
  });

  // =============================================================
  //                    FEE CALCULATION TESTS
  // =============================================================

  describe("Fee Calculation", function () {
    let ertId: bigint;
    const capitalLimit = 10000n * ONE_USDC; // $10,000
    const duration = 7n * 24n * 60n * 60n; // 7 days
    const baseFeeAprBps = 200n; // 2% APR
    const profitShareBps = 2000n; // 20%
    const stakeAmount = 5000n * ONE_USDC; // $5,000 stake (50%)

    beforeEach(async function () {
      // LP deposits to vault
      await usdc.connect(lp).approve(await executionVault.getAddress(), capitalLimit);
      await executionVault.connect(lp).deposit(capitalLimit, await lp.getAddress());

      // Whitelist executor and set to VERIFIED tier (allows $10k capital)
      await reputationManager.whitelistExecutor(await executor.getAddress());
      await reputationManager.setExecutorTier(await executor.getAddress(), 2); // 2 = VERIFIED tier

      // Mint ERT
      const constraints = {
        maxLeverage: 2, // Moderate risk level (allowed for VERIFIED tier)
        maxDrawdownBps: 1000, // 10%
        maxPositionSizeBps: 5000, // 50%
        allowedAdapters: [],
        allowedAssets: [await usdc.getAddress()]
      };

      const fees = {
        baseFeeAprBps: baseFeeAprBps,
        profitShareBps: profitShareBps,
        stakedAmount: stakeAmount
      };

      // Executor mints ERT with stake
      const tx = await executionRightsNFT.connect(executor).mint(
        await executor.getAddress(),
        capitalLimit,
        duration,
        constraints,
        fees,
        { value: stakeAmount }
      );
      const receipt = await tx.wait();

      // Get ERT ID from event
      const mintEvent = receipt.logs.find((log: any) => {
        try {
          const parsed = executionRightsNFT.interface.parseLog(log);
          return parsed?.name === "RightsMinted";
        } catch {
          return false;
        }
      });

      if (mintEvent) {
        const parsed = executionRightsNFT.interface.parseLog(mintEvent);
        ertId = parsed?.args[0];
      } else {
        ertId = 1n;
      }

      console.log(`ERT ID: ${ertId}`);

      // Allocate capital to ERT (as controller)
      await executionVault.allocateCapital(ertId, capitalLimit);
    });

    it("should calculate correct base fee for 7 day duration", async function () {
      // Advance time by 7 days (base fee uses elapsed time, not total duration)
      await ethers.provider.send("evm_increaseTime", [7 * 24 * 60 * 60]); // 7 days
      await ethers.provider.send("evm_mine", []);

      // Base fee = capital * baseFeeAprBps * duration / (BPS * SECONDS_PER_YEAR)
      // = 10000 * 200 * (7 * 86400) / (10000 * 31536000)
      // = 2000000 * 604800 / 315360000000
      // ≈ 3.84 USDC
      const pnl = 0n;
      const [lpBaseFee, , , , ] = await settlementEngine.calculateFeeBreakdown(ertId, pnl);

      // Expected: ~3.84 USDC (due to integer math, will be close)
      const expectedBaseFee = (capitalLimit * baseFeeAprBps * duration) / (BPS * SECONDS_PER_YEAR);
      expect(lpBaseFee).to.be.closeTo(expectedBaseFee, ONE_USDC / 10n); // Within 0.1 USDC
    });

    it("should calculate correct fee breakdown for profitable ERT", async function () {
      const profit = 1000n * ONE_USDC; // $1000 profit
      const pnl = profit;

      const [lpBaseFee, lpProfitShare, executorProfit, insuranceFee, stakeSlashed] =
        await settlementEngine.calculateFeeBreakdown(ertId, pnl);

      // Insurance fee = 2% of profit = $20
      const expectedInsuranceFee = (profit * 200n) / BPS;
      expect(insuranceFee).to.equal(expectedInsuranceFee);

      // Profit after insurance = $980
      const profitAfterInsurance = profit - expectedInsuranceFee;

      // LP profit share = 20% of $980 = $196
      const expectedLpProfitShare = (profitAfterInsurance * profitShareBps) / BPS;
      expect(lpProfitShare).to.equal(expectedLpProfitShare);

      // Executor profit = $980 - $196 = $784
      const expectedExecutorProfit = profitAfterInsurance - expectedLpProfitShare;
      expect(executorProfit).to.equal(expectedExecutorProfit);

      // No stake slashed on profit
      expect(stakeSlashed).to.equal(0n);

      console.log(`Profit: $${ethers.formatUnits(profit, 6)}`);
      console.log(`Insurance Fee: $${ethers.formatUnits(insuranceFee, 6)}`);
      console.log(`LP Profit Share: $${ethers.formatUnits(lpProfitShare, 6)}`);
      console.log(`Executor Profit: $${ethers.formatUnits(executorProfit, 6)}`);
    });

    it("should calculate correct fee breakdown for loss within stake", async function () {
      const loss = 2000n * ONE_USDC; // $2000 loss (within $5000 stake)
      const pnl = -loss;

      const [lpBaseFee, lpProfitShare, executorProfit, insuranceFee, stakeSlashed] =
        await settlementEngine.calculateFeeBreakdown(ertId, pnl);

      // Loss should be covered by stake
      expect(stakeSlashed).to.equal(loss);
      expect(lpProfitShare).to.equal(0n);
      expect(executorProfit).to.equal(0n);
      expect(insuranceFee).to.equal(0n);

      console.log(`Loss: $${ethers.formatUnits(loss, 6)}`);
      console.log(`Stake Slashed: $${ethers.formatUnits(stakeSlashed, 6)}`);
    });

    it("should cap stake slashing at stake amount for loss exceeding stake", async function () {
      const loss = 8000n * ONE_USDC; // $8000 loss (exceeds $5000 stake)
      const pnl = -loss;

      const [, , , , stakeSlashed] = await settlementEngine.calculateFeeBreakdown(ertId, pnl);

      // Stake slashed should be capped at stake amount
      expect(stakeSlashed).to.equal(stakeAmount);

      console.log(`Loss: $${ethers.formatUnits(loss, 6)}`);
      console.log(`Stake (cap): $${ethers.formatUnits(stakeAmount, 6)}`);
      console.log(`Stake Slashed: $${ethers.formatUnits(stakeSlashed, 6)}`);
    });
  });

  // =============================================================
  //                    VIEW FUNCTION TESTS
  // =============================================================

  describe("View Functions", function () {
    let ertId: bigint;

    beforeEach(async function () {
      // Setup similar to fee calculation tests
      const capitalLimit = 10000n * ONE_USDC;
      const duration = 7n * 24n * 60n * 60n;

      await usdc.connect(lp).approve(await executionVault.getAddress(), capitalLimit);
      await executionVault.connect(lp).deposit(capitalLimit, await lp.getAddress());

      // Whitelist executor and set to VERIFIED tier (allows $10k capital)
      await reputationManager.whitelistExecutor(await executor.getAddress());
      await reputationManager.setExecutorTier(await executor.getAddress(), 2); // 2 = VERIFIED tier

      const constraints = {
        maxLeverage: 2, // Moderate risk level (allowed for VERIFIED tier)
        maxDrawdownBps: 1000,
        maxPositionSizeBps: 5000,
        allowedAdapters: [],
        allowedAssets: [await usdc.getAddress()]
      };

      const fees = {
        baseFeeAprBps: 200n,
        profitShareBps: 2000n,
        stakedAmount: 5000n * ONE_USDC
      };

      const tx = await executionRightsNFT.connect(executor).mint(
        await executor.getAddress(),
        capitalLimit,
        duration,
        constraints,
        fees,
        { value: 5000n * ONE_USDC }
      );
      await tx.wait();
      ertId = 1n;

      await executionVault.allocateCapital(ertId, capitalLimit);
    });

    it("should return true for canSettle on active ERT", async function () {
      const [canSettle, reason] = await settlementEngine.canSettle(ertId);
      expect(canSettle).to.be.true;
      expect(reason).to.equal("");
    });

    it("should return false for canForceSettle on non-expired ERT", async function () {
      const canForceSettle = await settlementEngine.canForceSettle(ertId);
      expect(canForceSettle).to.be.false;
    });

    it("should return true for canForceSettle on expired ERT", async function () {
      // Advance time past expiry
      await ethers.provider.send("evm_increaseTime", [8 * 24 * 60 * 60]); // 8 days
      await ethers.provider.send("evm_mine", []);

      const canForceSettle = await settlementEngine.canForceSettle(ertId);
      expect(canForceSettle).to.be.true;
    });

    it("should calculate PnL correctly", async function () {
      const pnl = await settlementEngine.calculatePnl(ertId);
      // With no positions, PnL should be 0 or based on entry value - allocated
      expect(pnl).to.be.lte(0n); // No positions means no gain
    });

    it("should estimate settlement result", async function () {
      const result = await settlementEngine.estimateSettlement(ertId);
      expect(result.ertId).to.equal(ertId);
      // Other fields depend on position state
    });
  });

  // =============================================================
  //                    ADMIN FUNCTION TESTS
  // =============================================================

  describe("Admin Functions", function () {
    it("should allow owner to set adapter type", async function () {
      const adapterAddress = await anyone.getAddress();
      await settlementEngine.setAdapterType(adapterAddress, 1); // DEX type

      expect(await settlementEngine.adapterTypes(adapterAddress)).to.equal(1);
    });

    it("should emit AdapterTypeSet event", async function () {
      const adapterAddress = await anyone.getAddress();
      await expect(settlementEngine.setAdapterType(adapterAddress, 2)) // YIELD type
        .to.emit(settlementEngine, "AdapterTypeSet")
        .withArgs(adapterAddress, 2);
    });

    it("should revert setAdapterType for zero address", async function () {
      await expect(settlementEngine.setAdapterType(ethers.ZeroAddress, 1))
        .to.be.revertedWithCustomError(settlementEngine, "ZeroAddress");
    });

    it("should allow owner to set multiple adapter types", async function () {
      const adapters = [await owner.getAddress(), await executor.getAddress()];
      const types = [1, 2]; // DEX, YIELD

      await settlementEngine.setAdapterTypes(adapters, types);

      expect(await settlementEngine.adapterTypes(adapters[0])).to.equal(1);
      expect(await settlementEngine.adapterTypes(adapters[1])).to.equal(2);
    });

    it("should revert setAdapterTypes with mismatched arrays", async function () {
      const adapters = [await owner.getAddress(), await executor.getAddress()];
      const types = [1]; // Only one type

      await expect(settlementEngine.setAdapterTypes(adapters, types))
        .to.be.revertedWithCustomError(settlementEngine, "ArrayLengthMismatch");
    });

    it("should allow owner to update reputation manager", async function () {
      const newAddress = await anyone.getAddress();
      await settlementEngine.setReputationManager(newAddress);
      expect(await settlementEngine.reputationManager()).to.equal(newAddress);
    });

    it("should allow owner to update circuit breaker", async function () {
      const newAddress = await anyone.getAddress();
      await settlementEngine.setCircuitBreaker(newAddress);
      expect(await settlementEngine.circuitBreaker()).to.equal(newAddress);
    });

    it("should allow owner to update insurance fund", async function () {
      const newAddress = await anyone.getAddress();
      await settlementEngine.setInsuranceFund(newAddress);
      expect(await settlementEngine.insuranceFund()).to.equal(newAddress);
    });

    it("should allow owner to update flare oracle", async function () {
      const MockFlareOracle = await ethers.getContractFactory("MockFlareOracle");
      const newOracle = await MockFlareOracle.deploy();
      await newOracle.waitForDeployment();

      await settlementEngine.setFlareOracle(await newOracle.getAddress());
      expect(await settlementEngine.flareOracle()).to.equal(await newOracle.getAddress());
    });

    it("should revert setFlareOracle with zero address", async function () {
      await expect(settlementEngine.setFlareOracle(ethers.ZeroAddress))
        .to.be.revertedWithCustomError(settlementEngine, "ZeroAddress");
    });

    it("should allow contract to receive ETH", async function () {
      const amount = ethers.parseEther("1.0");
      await owner.sendTransaction({
        to: await settlementEngine.getAddress(),
        value: amount
      });

      const balance = await ethers.provider.getBalance(await settlementEngine.getAddress());
      expect(balance).to.equal(amount);
    });
  });

  // =============================================================
  //                    ACCESS CONTROL TESTS
  // =============================================================

  describe("Access Control", function () {
    let ertId: bigint;

    beforeEach(async function () {
      // Setup ERT owned by executor
      const capitalLimit = 10000n * ONE_USDC;
      const duration = 7n * 24n * 60n * 60n;

      await usdc.connect(lp).approve(await executionVault.getAddress(), capitalLimit);
      await executionVault.connect(lp).deposit(capitalLimit, await lp.getAddress());

      // Whitelist executor and set to VERIFIED tier (allows $10k capital)
      await reputationManager.whitelistExecutor(await executor.getAddress());
      await reputationManager.setExecutorTier(await executor.getAddress(), 2); // 2 = VERIFIED tier

      const constraints = {
        maxLeverage: 2, // Moderate risk level (allowed for VERIFIED tier)
        maxDrawdownBps: 1000,
        maxPositionSizeBps: 5000,
        allowedAdapters: [],
        allowedAssets: [await usdc.getAddress()]
      };

      const fees = {
        baseFeeAprBps: 200n,
        profitShareBps: 2000n,
        stakedAmount: 5000n * ONE_USDC
      };

      await executionRightsNFT.connect(executor).mint(
        await executor.getAddress(),
        capitalLimit,
        duration,
        constraints,
        fees,
        { value: 5000n * ONE_USDC }
      );
      ertId = 1n;

      await executionVault.allocateCapital(ertId, capitalLimit);
    });

    it("should allow only ERT holder to settle", async function () {
      // Non-holder should fail
      await expect(settlementEngine.connect(anyone).settle(ertId))
        .to.be.revertedWithCustomError(settlementEngine, "Unauthorized");
    });

    it("should allow only ERT holder to settle early", async function () {
      await expect(settlementEngine.connect(anyone).settleEarly(ertId))
        .to.be.revertedWithCustomError(settlementEngine, "Unauthorized");
    });

    it("should allow anyone to force settle expired ERT", async function () {
      // Advance time past expiry
      await ethers.provider.send("evm_increaseTime", [8 * 24 * 60 * 60]);
      await ethers.provider.send("evm_mine", []);

      // Anyone should be able to force settle
      // Note: This might revert due to other reasons (positions, etc.) but not access control
      await expect(settlementEngine.connect(anyone).forceSettle(ertId))
        .to.not.be.revertedWithCustomError(settlementEngine, "Unauthorized");
    });

    it("should prevent non-owner from setting adapter type", async function () {
      await expect(
        settlementEngine.connect(anyone).setAdapterType(await anyone.getAddress(), 1)
      ).to.be.revertedWithCustomError(settlementEngine, "OwnableUnauthorizedAccount");
    });

    it("should prevent non-owner from setting reputation manager", async function () {
      await expect(
        settlementEngine.connect(anyone).setReputationManager(await anyone.getAddress())
      ).to.be.revertedWithCustomError(settlementEngine, "OwnableUnauthorizedAccount");
    });
  });
});
