import { expect } from "chai";
import { network } from "hardhat";
import { SignerWithAddress } from "@nomicfoundation/hardhat-ethers/signers";

const { ethers } = await network.connect();

/**
 * Phase 7 Integration Test Suite
 *
 * This test suite validates the complete Phase 7 flow:
 * 1. LP deposits through Gateway
 * 2. Executor requests execution rights
 * 3. Settlement and PnL distribution
 *
 * Tests the integration between:
 * - PraxisGateway (unified entry point)
 * - SettlementEngine (PnL calculation and distribution)
 * - ExecutionVault (LP capital)
 * - ExecutionRightsNFT (ERT management)
 * - ReputationManager (executor tiers)
 * - InsuranceFund (loss coverage)
 */
describe("Phase 7 Integration", function () {
  this.timeout(180000);

  // Contract instances
  let praxisGateway: any;
  let executionVault: any;
  let executionRightsNFT: any;
  let positionManager: any;
  let reputationManager: any;
  let circuitBreaker: any;
  let insuranceFund: any;
  let settlementEngine: any;
  let flareOracle: any;
  let usdc: any;

  // Signers
  let owner: SignerWithAddress;
  let executor: SignerWithAddress;
  let lp: SignerWithAddress;
  let lp2: SignerWithAddress;

  // Constants
  const BPS = 10000n;
  const ONE_USDC = 10n ** 6n;
  const ONE_ETH = 10n ** 18n;

  before(async function () {
    const chainId = (await ethers.provider.getNetwork()).chainId;
    if (chainId !== 14n && chainId !== 31337n) {
      console.log(`Skipping - not on supported chain (chainId: ${chainId})`);
      this.skip();
    }

    [owner, executor, lp, lp2] = await ethers.getSigners();
    console.log(`\n=== Phase 7 Integration Tests ===`);
    console.log(`Owner: ${await owner.getAddress()}`);
    console.log(`Executor: ${await executor.getAddress()}`);
    console.log(`LP1: ${await lp.getAddress()}`);
    console.log(`LP2: ${await lp2.getAddress()}`);
  });

  beforeEach(async function () {
    // Deploy MockERC20 for USDC
    const MockERC20 = await ethers.getContractFactory("MockERC20");
    usdc = await MockERC20.deploy("Mock USDC", "mUSDC", 6);
    await usdc.waitForDeployment();

    // Mint USDC to test accounts
    const mintAmount = 1_000_000n * ONE_USDC;
    await usdc.mint(await lp.getAddress(), mintAmount);
    await usdc.mint(await lp2.getAddress(), mintAmount);
    await usdc.mint(await owner.getAddress(), mintAmount);
    await usdc.mint(await executor.getAddress(), mintAmount);

    // Deploy MockFlareOracle
    const MockFlareOracle = await ethers.getContractFactory("MockFlareOracle");
    flareOracle = await MockFlareOracle.deploy();
    await flareOracle.waitForDeployment();
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

    // Deploy PraxisGateway
    const PraxisGateway = await ethers.getContractFactory("PraxisGateway");
    praxisGateway = await PraxisGateway.deploy(
      await executionVault.getAddress(),
      await executionRightsNFT.getAddress(),
      await settlementEngine.getAddress(),
      await owner.getAddress(), // controller
      await reputationManager.getAddress(),
      await positionManager.getAddress()
    );
    await praxisGateway.waitForDeployment();

    // Wire up all contracts
    await executionRightsNFT.setSettlementEngine(await settlementEngine.getAddress());
    await reputationManager.setSettlementEngine(await settlementEngine.getAddress());
    await circuitBreaker.setSettlementEngine(await settlementEngine.getAddress());
    await insuranceFund.setSettlementEngine(await settlementEngine.getAddress());
    await executionVault.setExecutionController(await owner.getAddress());
  });

  describe("Complete LP Flow", function () {
    it("should handle multiple LP deposits and withdrawals", async function () {
      const depositAmount1 = 50000n * ONE_USDC; // $50,000
      const depositAmount2 = 30000n * ONE_USDC; // $30,000

      // LP1 deposits
      await usdc.connect(lp).approve(await praxisGateway.getAddress(), depositAmount1);
      await praxisGateway.connect(lp).deposit(depositAmount1);

      // LP2 deposits
      await usdc.connect(lp2).approve(await praxisGateway.getAddress(), depositAmount2);
      await praxisGateway.connect(lp2).deposit(depositAmount2);

      // Verify vault state
      const info = await praxisGateway.getVaultInfo();
      expect(info.totalAssets).to.equal(depositAmount1 + depositAmount2);
      expect(info.utilizationRate).to.equal(0);

      console.log(`\n  LP1 deposited: $${ethers.formatUnits(depositAmount1, 6)}`);
      console.log(`  LP2 deposited: $${ethers.formatUnits(depositAmount2, 6)}`);
      console.log(`  Total vault assets: $${ethers.formatUnits(info.totalAssets, 6)}`);

      // LP1 withdraws half
      const lp1Shares = await executionVault.balanceOf(await lp.getAddress());
      const withdrawShares = lp1Shares / 2n;

      await executionVault.connect(lp).approve(await praxisGateway.getAddress(), withdrawShares);
      await praxisGateway.connect(lp).withdraw(withdrawShares);

      const newInfo = await praxisGateway.getVaultInfo();
      console.log(`  After LP1 partial withdraw: $${ethers.formatUnits(newInfo.totalAssets, 6)}`);
    });
  });

  describe("Settlement Flow", function () {
    it("should calculate fee breakdown correctly", async function () {
      // Setup: LP deposits, executor gets VERIFIED tier
      const depositAmount = 100000n * ONE_USDC;
      await usdc.connect(lp).approve(await praxisGateway.getAddress(), depositAmount);
      await praxisGateway.connect(lp).deposit(depositAmount);

      // Set executor to VERIFIED tier
      await reputationManager.whitelistExecutor(await executor.getAddress());
      await reputationManager.setExecutorTier(await executor.getAddress(), 2);

      // Executor mints ERT through NFT directly (gateway would also work)
      const capitalLimit = 10000n * ONE_USDC;
      const duration = 7n * 24n * 60n * 60n;
      const stakeAmount = 5000n * ONE_USDC;

      const constraints = {
        maxLeverage: 2,
        maxDrawdownBps: 1000,
        maxPositionSizeBps: 5000,
        allowedAdapters: [],
        allowedAssets: [await usdc.getAddress()]
      };

      const fees = {
        baseFeeAprBps: 200n,
        profitShareBps: 2000n,
        stakedAmount: stakeAmount
      };

      await executionRightsNFT.connect(executor).mint(
        await executor.getAddress(),
        capitalLimit,
        duration,
        constraints,
        fees,
        { value: stakeAmount }
      );

      const ertId = 1n;

      // Allocate capital
      await executionVault.allocateCapital(ertId, capitalLimit);

      // Simulate 7 days passing
      await ethers.provider.send("evm_increaseTime", [7 * 24 * 60 * 60]);
      await ethers.provider.send("evm_mine", []);

      // Calculate fee breakdown for various PnL scenarios
      console.log(`\n  Fee Breakdown Analysis:`);

      // Scenario 1: Profitable
      const profit = 2000n * ONE_USDC;
      const [lpBaseFee1, lpProfitShare1, executorProfit1, insuranceFee1, stakeSlashed1] =
        await settlementEngine.calculateFeeBreakdown(ertId, profit);

      console.log(`\n  Profit scenario ($${ethers.formatUnits(profit, 6)}):`);
      console.log(`    LP Base Fee: $${ethers.formatUnits(lpBaseFee1, 6)}`);
      console.log(`    LP Profit Share: $${ethers.formatUnits(lpProfitShare1, 6)}`);
      console.log(`    Executor Profit: $${ethers.formatUnits(executorProfit1, 6)}`);
      console.log(`    Insurance Fee: $${ethers.formatUnits(insuranceFee1, 6)}`);
      console.log(`    Stake Slashed: $${ethers.formatUnits(stakeSlashed1, 6)}`);

      // Verify insurance fee is 2% of profit
      expect(insuranceFee1).to.equal((profit * 200n) / BPS);

      // Scenario 2: Loss within stake
      const loss = 3000n * ONE_USDC;
      const [, , , , stakeSlashed2] =
        await settlementEngine.calculateFeeBreakdown(ertId, -loss);

      console.log(`\n  Loss scenario ($${ethers.formatUnits(loss, 6)}):`);
      console.log(`    Stake Slashed: $${ethers.formatUnits(stakeSlashed2, 6)}`);
      expect(stakeSlashed2).to.equal(loss);

      // Scenario 3: Loss exceeding stake
      const bigLoss = 8000n * ONE_USDC;
      const [, , , , stakeSlashed3] =
        await settlementEngine.calculateFeeBreakdown(ertId, -bigLoss);

      console.log(`\n  Big loss scenario ($${ethers.formatUnits(bigLoss, 6)}):`);
      console.log(`    Stake Slashed (capped at stake): $${ethers.formatUnits(stakeSlashed3, 6)}`);
      expect(stakeSlashed3).to.equal(stakeAmount);
    });

    it("should estimate settlement correctly", async function () {
      // Setup
      const depositAmount = 100000n * ONE_USDC;
      await usdc.connect(lp).approve(await praxisGateway.getAddress(), depositAmount);
      await praxisGateway.connect(lp).deposit(depositAmount);

      await reputationManager.whitelistExecutor(await executor.getAddress());
      await reputationManager.setExecutorTier(await executor.getAddress(), 2);

      const capitalLimit = 10000n * ONE_USDC;
      const duration = 7n * 24n * 60n * 60n;
      const stakeAmount = 5000n * ONE_USDC;

      const constraints = {
        maxLeverage: 2,
        maxDrawdownBps: 1000,
        maxPositionSizeBps: 5000,
        allowedAdapters: [],
        allowedAssets: [await usdc.getAddress()]
      };

      const fees = {
        baseFeeAprBps: 200n,
        profitShareBps: 2000n,
        stakedAmount: stakeAmount
      };

      await executionRightsNFT.connect(executor).mint(
        await executor.getAddress(),
        capitalLimit,
        duration,
        constraints,
        fees,
        { value: stakeAmount }
      );

      const ertId = 1n;
      await executionVault.allocateCapital(ertId, capitalLimit);

      // Estimate settlement through gateway
      const estimation = await praxisGateway.estimateSettlement(ertId);

      console.log(`\n  Settlement Estimation:`);
      console.log(`    ERT ID: ${estimation.ertId}`);
      console.log(`    Total PnL: $${ethers.formatUnits(estimation.totalPnl, 6)}`);
      console.log(`    LP Base Fee: $${ethers.formatUnits(estimation.lpBaseFee, 6)}`);
      console.log(`    Stake Returned: $${ethers.formatUnits(estimation.stakeReturned, 6)}`);

      expect(estimation.ertId).to.equal(ertId);
    });
  });

  describe("Reputation Integration", function () {
    it("should check executor status through gateway", async function () {
      // New executor - should be UNVERIFIED and not banned
      const [isAuthorized, tier] = await praxisGateway.checkExecutor(await executor.getAddress());

      expect(isAuthorized).to.be.true;
      expect(tier).to.equal(0); // UNVERIFIED

      console.log(`\n  New Executor Status:`);
      console.log(`    Authorized: ${isAuthorized}`);
      console.log(`    Tier: ${tier} (UNVERIFIED)`);

      // Whitelist and upgrade tier
      await reputationManager.whitelistExecutor(await executor.getAddress());
      await reputationManager.setExecutorTier(await executor.getAddress(), 4); // ELITE

      const [isAuthorized2, tier2] = await praxisGateway.checkExecutor(await executor.getAddress());
      expect(tier2).to.equal(4); // ELITE

      console.log(`\n  After Whitelist + Tier Upgrade:`);
      console.log(`    Authorized: ${isAuthorized2}`);
      console.log(`    Tier: ${tier2} (ELITE)`);

      // Ban executor
      await reputationManager.banExecutor(await executor.getAddress(), "test ban");

      const [isAuthorized3, tier3] = await praxisGateway.checkExecutor(await executor.getAddress());
      expect(isAuthorized3).to.be.false;

      console.log(`\n  After Ban:`);
      console.log(`    Authorized: ${isAuthorized3}`);
    });

    it("should calculate required stake for different tiers", async function () {
      const capitalNeeded = 10000n * ONE_USDC;

      console.log(`\n  Required Stake for $${ethers.formatUnits(capitalNeeded, 6)} capital:`);

      // UNVERIFIED tier (50% stake)
      let stake = await praxisGateway.getRequiredStake(await executor.getAddress(), capitalNeeded);
      console.log(`    UNVERIFIED (Tier 0): $${ethers.formatUnits(stake, 6)} (50%)`);
      expect(stake).to.equal((capitalNeeded * 5000n) / BPS);

      // Upgrade to VERIFIED (15% stake)
      await reputationManager.setExecutorTier(await executor.getAddress(), 2);
      stake = await praxisGateway.getRequiredStake(await executor.getAddress(), capitalNeeded);
      console.log(`    VERIFIED (Tier 2): $${ethers.formatUnits(stake, 6)} (15%)`);
      expect(stake).to.equal((capitalNeeded * 1500n) / BPS);

      // Upgrade to ELITE (5% stake)
      await reputationManager.setExecutorTier(await executor.getAddress(), 4);
      stake = await praxisGateway.getRequiredStake(await executor.getAddress(), capitalNeeded);
      console.log(`    ELITE (Tier 4): $${ethers.formatUnits(stake, 6)} (5%)`);
      expect(stake).to.equal((capitalNeeded * 500n) / BPS);
    });
  });

  describe("Vault Utilization", function () {
    it("should track utilization correctly", async function () {
      // LP deposits
      const depositAmount = 100000n * ONE_USDC;
      await usdc.connect(lp).approve(await praxisGateway.getAddress(), depositAmount);
      await praxisGateway.connect(lp).deposit(depositAmount);

      // Check initial utilization
      let info = await praxisGateway.getVaultInfo();
      expect(info.utilizationRate).to.equal(0);

      console.log(`\n  Vault Utilization:`);
      console.log(`    Initial: ${Number(info.utilizationRate) / 100}%`);

      // Allocate 50% to an ERT (need ESTABLISHED tier for $50k)
      await reputationManager.setExecutorTier(await executor.getAddress(), 3); // ESTABLISHED tier allows $100k

      const capitalLimit = 50000n * ONE_USDC;
      const constraints = {
        maxLeverage: 2,
        maxDrawdownBps: 1000,
        maxPositionSizeBps: 5000,
        allowedAdapters: [],
        allowedAssets: [await usdc.getAddress()]
      };

      const fees = {
        baseFeeAprBps: 200n,
        profitShareBps: 2000n,
        stakedAmount: 25000n * ONE_USDC // 50% stake for large amount
      };

      await executionRightsNFT.connect(executor).mint(
        await executor.getAddress(),
        capitalLimit,
        7n * 24n * 60n * 60n,
        constraints,
        fees,
        { value: 25000n * ONE_USDC }
      );

      await executionVault.allocateCapital(1n, capitalLimit);

      // Check utilization after allocation
      info = await praxisGateway.getVaultInfo();
      console.log(`    After 50% allocation: ${Number(info.utilizationRate) / 100}%`);
      expect(info.utilizationRate).to.equal(5000); // 50%

      expect(info.allocatedCapital).to.equal(capitalLimit);
      expect(info.availableCapital).to.equal(depositAmount - capitalLimit);
    });
  });
});
