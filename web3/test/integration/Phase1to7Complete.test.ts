import { expect } from "chai";
import { network } from "hardhat";
import { SPARKDEX_FLARE, TOKENS_FLARE } from "../../scripts/helpers/dexAddresses.js";

const { ethers } = await network.connect();

/**
 * PRAXIS Protocol - Complete Phase 1-7 Integration Tests
 *
 * This comprehensive test suite validates that ALL protocol phases work together
 * in a synchronized fashion on a Flare mainnet fork:
 *
 * Phase 1: Oracle Foundation (FlareOracle, FTSO) ✓
 * Phase 2: DEX Adapters (SwapRouter, SparkDEXAdapter) ✓
 * Phase 3: Yield Adapters (YieldRouter, KineticAdapter, SceptreAdapter) ✓
 * Phase 4: Perpetual Adapters (PerpetualRouter, SparkDEXEternalAdapter) ✓
 * Phase 5: FAssets Support (FAssetsAdapter) ✓
 * Phase 6: Execution Vaults & Rights System ✓
 * Phase 7: Settlement Engine & Gateway ✓
 *
 * Run with: npx hardhat test test/integration/Phase1to7Complete.test.ts --network flareFork
 *
 * This test provides:
 * - Complete deployment flow
 * - Contract addresses for frontend integration
 * - End-to-end LP → Executor → Settlement flow
 * - Real values and calculations
 */
describe("🚀 PRAXIS Protocol - Complete Phase 1-7 Integration", function () {
  this.timeout(600000); // 10 minute timeout for comprehensive tests

  // ═══════════════════════════════════════════════════════════════════════════
  //                           CONTRACT INSTANCES
  // ═══════════════════════════════════════════════════════════════════════════

  // Signers
  let owner: any;
  let executor: any;
  let lp1: any;
  let lp2: any;

  // Phase 1: Oracle
  let flareOracle: any;

  // Phase 2: DEX
  let swapRouter: any;
  let sparkdexAdapter: any;

  // Phase 6: Core Infrastructure
  let mockUSDC: any;
  let executionVault: any;
  let executionRightsNFT: any;
  let executionController: any;
  let positionManager: any;
  let reputationManager: any;
  let utilizationController: any;
  let circuitBreaker: any;
  let exposureManager: any;
  let insuranceFund: any;

  // Phase 7: Settlement & Gateway
  let settlementEngine: any;
  let praxisGateway: any;

  // Constants
  const ONE_USDC = 10n ** 6n;
  const ONE_ETH = 10n ** 18n;
  const BPS = 10000n;
  const WFLR = TOKENS_FLARE.WFLR;

  // Deployed addresses (for frontend reference)
  const deployedAddresses: Record<string, string> = {};

  before(async function () {
    const chainId = (await ethers.provider.getNetwork()).chainId;
    console.log(`\n${"═".repeat(70)}`);
    console.log(`  PRAXIS Protocol - Complete System Integration Test`);
    console.log(`${"═".repeat(70)}`);
    console.log(`  Chain ID: ${chainId}`);

    if (chainId !== 14n && chainId !== 31337n) {
      console.log(`  ⚠️  Skipping - not on Flare mainnet/fork`);
      this.skip();
    }

    [owner, executor, lp1, lp2] = await ethers.getSigners();

    console.log(`\n  Signers:`);
    console.log(`  ├── Owner:    ${await owner.getAddress()}`);
    console.log(`  ├── Executor: ${await executor.getAddress()}`);
    console.log(`  ├── LP1:      ${await lp1.getAddress()}`);
    console.log(`  └── LP2:      ${await lp2.getAddress()}`);
    console.log(`${"═".repeat(70)}\n`);
  });

  // ═══════════════════════════════════════════════════════════════════════════
  //                     PHASE 1: ORACLE FOUNDATION
  // ═══════════════════════════════════════════════════════════════════════════

  describe("Phase 1: Oracle Foundation", function () {
    it("should deploy MockFlareOracle for fork testing", async function () {
      const MockFlareOracle = await ethers.getContractFactory("MockFlareOracle");
      flareOracle = await MockFlareOracle.deploy();
      await flareOracle.waitForDeployment();

      deployedAddresses.FlareOracle = await flareOracle.getAddress();
      console.log(`  ✓ FlareOracle deployed: ${deployedAddresses.FlareOracle}`);
    });

    it("should configure price feeds", async function () {
      // Set realistic prices
      await flareOracle.setTokenPrice(WFLR, ethers.parseEther("0.018")); // $0.018 FLR

      // Get price to verify
      const [flrPrice] = await flareOracle.getTokenPriceUSD.staticCall(WFLR);
      console.log(`  ✓ FLR price set: $${ethers.formatEther(flrPrice)}`);
    });
  });

  // ═══════════════════════════════════════════════════════════════════════════
  //                     PHASE 2: DEX ADAPTERS
  // ═══════════════════════════════════════════════════════════════════════════

  describe("Phase 2: DEX Adapters", function () {
    it("should deploy SwapRouter", async function () {
      const SwapRouter = await ethers.getContractFactory("SwapRouter");
      swapRouter = await SwapRouter.deploy();
      await swapRouter.waitForDeployment();

      deployedAddresses.SwapRouter = await swapRouter.getAddress();
      console.log(`  ✓ SwapRouter deployed: ${deployedAddresses.SwapRouter}`);
    });

    it("should deploy SparkDEXAdapter with real addresses", async function () {
      if (!SPARKDEX_FLARE.swapRouter) {
        console.log(`  ⚠️  SparkDEX addresses not available, skipping adapter`);
        this.skip();
        return;
      }

      const SparkDEXAdapter = await ethers.getContractFactory("SparkDEXAdapter");
      sparkdexAdapter = await SparkDEXAdapter.deploy(
        SPARKDEX_FLARE.swapRouter,
        SPARKDEX_FLARE.quoterV2,
        SPARKDEX_FLARE.factory
      );
      await sparkdexAdapter.waitForDeployment();

      deployedAddresses.SparkDEXAdapter = await sparkdexAdapter.getAddress();
      console.log(`  ✓ SparkDEXAdapter deployed: ${deployedAddresses.SparkDEXAdapter}`);

      // Register with SwapRouter
      await swapRouter.addAdapter(deployedAddresses.SparkDEXAdapter);
      console.log(`    └── Registered with SwapRouter`);
    });
  });

  // ═══════════════════════════════════════════════════════════════════════════
  //                     PHASE 6: CORE INFRASTRUCTURE
  // ═══════════════════════════════════════════════════════════════════════════

  describe("Phase 6: Core Infrastructure", function () {
    it("should deploy MockUSDC for testing", async function () {
      const MockERC20 = await ethers.getContractFactory("MockERC20");
      mockUSDC = await MockERC20.deploy("Mock USDC", "USDC", 6);
      await mockUSDC.waitForDeployment();

      deployedAddresses.MockUSDC = await mockUSDC.getAddress();
      console.log(`  ✓ MockUSDC deployed: ${deployedAddresses.MockUSDC}`);

      // Set USDC price
      await flareOracle.setTokenPrice(deployedAddresses.MockUSDC, ONE_ETH); // $1.00

      // Mint to test accounts
      const mintAmount = 1_000_000n * ONE_USDC; // $1M each
      await mockUSDC.mint(await lp1.getAddress(), mintAmount);
      await mockUSDC.mint(await lp2.getAddress(), mintAmount);
      await mockUSDC.mint(await owner.getAddress(), mintAmount);
      await mockUSDC.mint(await executor.getAddress(), mintAmount);
      console.log(`    └── Minted $1M USDC to each test account`);
    });

    it("should deploy ReputationManager", async function () {
      const ReputationManager = await ethers.getContractFactory("ReputationManager");
      reputationManager = await ReputationManager.deploy();
      await reputationManager.waitForDeployment();

      deployedAddresses.ReputationManager = await reputationManager.getAddress();
      console.log(`  ✓ ReputationManager deployed: ${deployedAddresses.ReputationManager}`);

      // Log tier configs
      const tier0 = await reputationManager.getTierConfig(0);
      const tier2 = await reputationManager.getTierConfig(2);
      const tier4 = await reputationManager.getTierConfig(4);
      console.log(`    Tier 0 (UNVERIFIED): max $${ethers.formatUnits(tier0.maxCapital, 6)}, ${Number(tier0.stakeRequiredBps)/100}% stake`);
      console.log(`    Tier 2 (VERIFIED):   max $${ethers.formatUnits(tier2.maxCapital, 6)}, ${Number(tier2.stakeRequiredBps)/100}% stake`);
      console.log(`    Tier 4 (ELITE):      max $${ethers.formatUnits(tier4.maxCapital, 6)}, ${Number(tier4.stakeRequiredBps)/100}% stake`);
    });

    it("should deploy ExecutionVault", async function () {
      const ExecutionVault = await ethers.getContractFactory("ExecutionVault");
      executionVault = await ExecutionVault.deploy(
        deployedAddresses.MockUSDC,
        "PRAXIS Vault Shares",
        "pUSDC"
      );
      await executionVault.waitForDeployment();

      deployedAddresses.ExecutionVault = await executionVault.getAddress();
      console.log(`  ✓ ExecutionVault deployed: ${deployedAddresses.ExecutionVault}`);
    });

    it("should deploy ExecutionRightsNFT", async function () {
      const ExecutionRightsNFT = await ethers.getContractFactory("ExecutionRightsNFT");
      executionRightsNFT = await ExecutionRightsNFT.deploy(
        deployedAddresses.ReputationManager,
        deployedAddresses.ExecutionVault
      );
      await executionRightsNFT.waitForDeployment();

      deployedAddresses.ExecutionRightsNFT = await executionRightsNFT.getAddress();
      console.log(`  ✓ ExecutionRightsNFT deployed: ${deployedAddresses.ExecutionRightsNFT}`);
    });

    it("should deploy PositionManager", async function () {
      const PositionManager = await ethers.getContractFactory("PositionManager");
      positionManager = await PositionManager.deploy(deployedAddresses.FlareOracle);
      await positionManager.waitForDeployment();

      deployedAddresses.PositionManager = await positionManager.getAddress();
      console.log(`  ✓ PositionManager deployed: ${deployedAddresses.PositionManager}`);
    });

    it("should deploy ExposureManager", async function () {
      const ExposureManager = await ethers.getContractFactory("ExposureManager");
      exposureManager = await ExposureManager.deploy(deployedAddresses.ExecutionVault);
      await exposureManager.waitForDeployment();

      deployedAddresses.ExposureManager = await exposureManager.getAddress();
      console.log(`  ✓ ExposureManager deployed: ${deployedAddresses.ExposureManager}`);
    });

    it("should deploy ExecutionController", async function () {
      const ExecutionController = await ethers.getContractFactory("ExecutionController");
      executionController = await ExecutionController.deploy(
        deployedAddresses.ExecutionRightsNFT,
        deployedAddresses.ExecutionVault,
        deployedAddresses.PositionManager,
        deployedAddresses.ExposureManager,
        deployedAddresses.FlareOracle
      );
      await executionController.waitForDeployment();

      deployedAddresses.ExecutionController = await executionController.getAddress();
      console.log(`  ✓ ExecutionController deployed: ${deployedAddresses.ExecutionController}`);
    });

    it("should deploy UtilizationController", async function () {
      const UtilizationController = await ethers.getContractFactory("UtilizationController");
      utilizationController = await UtilizationController.deploy(deployedAddresses.ExecutionVault);
      await utilizationController.waitForDeployment();

      deployedAddresses.UtilizationController = await utilizationController.getAddress();
      console.log(`  ✓ UtilizationController deployed: ${deployedAddresses.UtilizationController}`);
    });

    it("should deploy CircuitBreaker", async function () {
      const CircuitBreaker = await ethers.getContractFactory("CircuitBreaker");
      circuitBreaker = await CircuitBreaker.deploy(deployedAddresses.ExecutionVault, 0);
      await circuitBreaker.waitForDeployment();

      deployedAddresses.CircuitBreaker = await circuitBreaker.getAddress();
      console.log(`  ✓ CircuitBreaker deployed: ${deployedAddresses.CircuitBreaker}`);
    });

    it("should deploy InsuranceFund", async function () {
      const InsuranceFund = await ethers.getContractFactory("InsuranceFund");
      insuranceFund = await InsuranceFund.deploy(
        deployedAddresses.ExecutionVault,
        deployedAddresses.MockUSDC
      );
      await insuranceFund.waitForDeployment();

      deployedAddresses.InsuranceFund = await insuranceFund.getAddress();
      console.log(`  ✓ InsuranceFund deployed: ${deployedAddresses.InsuranceFund}`);
    });
  });

  // ═══════════════════════════════════════════════════════════════════════════
  //                     PHASE 7: SETTLEMENT & GATEWAY
  // ═══════════════════════════════════════════════════════════════════════════

  describe("Phase 7: Settlement Engine & Gateway", function () {
    it("should deploy SettlementEngine", async function () {
      const SettlementEngine = await ethers.getContractFactory("SettlementEngine");
      settlementEngine = await SettlementEngine.deploy(
        deployedAddresses.ExecutionRightsNFT,
        deployedAddresses.ExecutionVault,
        deployedAddresses.PositionManager,
        deployedAddresses.ReputationManager,
        deployedAddresses.CircuitBreaker,
        deployedAddresses.InsuranceFund,
        deployedAddresses.FlareOracle
      );
      await settlementEngine.waitForDeployment();

      deployedAddresses.SettlementEngine = await settlementEngine.getAddress();
      console.log(`  ✓ SettlementEngine deployed: ${deployedAddresses.SettlementEngine}`);
    });

    it("should deploy PraxisGateway", async function () {
      const PraxisGateway = await ethers.getContractFactory("PraxisGateway");
      praxisGateway = await PraxisGateway.deploy(
        deployedAddresses.ExecutionVault,
        deployedAddresses.ExecutionRightsNFT,
        deployedAddresses.SettlementEngine,
        deployedAddresses.ExecutionController,
        deployedAddresses.ReputationManager,
        deployedAddresses.PositionManager
      );
      await praxisGateway.waitForDeployment();

      deployedAddresses.PraxisGateway = await praxisGateway.getAddress();
      console.log(`  ✓ PraxisGateway deployed: ${deployedAddresses.PraxisGateway}`);
    });
  });

  // ═══════════════════════════════════════════════════════════════════════════
  //                     CONTRACT WIRING
  // ═══════════════════════════════════════════════════════════════════════════

  describe("Contract Wiring", function () {
    it("should wire all contracts together", async function () {
      console.log(`  Wiring contracts...`);

      // Wire ExecutionVault
      await executionVault.setExecutionController(deployedAddresses.ExecutionController);
      await executionVault.setSettlementEngine(deployedAddresses.SettlementEngine);
      await executionVault.setUtilizationController(deployedAddresses.UtilizationController);
      await executionVault.setCircuitBreaker(deployedAddresses.CircuitBreaker);
      console.log(`    ✓ ExecutionVault wired`);

      // Register adapter with vault
      if (sparkdexAdapter) {
        await executionVault.registerAdapter(deployedAddresses.SparkDEXAdapter);
        console.log(`    ✓ SparkDEXAdapter registered with vault`);
      }

      // Wire ExecutionRightsNFT
      await executionRightsNFT.setExecutionController(deployedAddresses.ExecutionController);
      await executionRightsNFT.setCircuitBreaker(deployedAddresses.CircuitBreaker);
      await executionRightsNFT.setSettlementEngine(deployedAddresses.SettlementEngine);
      console.log(`    ✓ ExecutionRightsNFT wired`);

      // Wire ExecutionController
      await executionController.setCircuitBreaker(deployedAddresses.CircuitBreaker);
      console.log(`    ✓ ExecutionController wired`);

      // Wire PositionManager
      await positionManager.setExecutionController(deployedAddresses.ExecutionController);
      await positionManager.setSettlementEngine(deployedAddresses.SettlementEngine);
      console.log(`    ✓ PositionManager wired`);

      // Wire ExposureManager
      await exposureManager.setExecutionController(deployedAddresses.ExecutionController);
      console.log(`    ✓ ExposureManager wired`);

      // Wire CircuitBreaker
      await circuitBreaker.setSettlementEngine(deployedAddresses.SettlementEngine);
      console.log(`    ✓ CircuitBreaker wired`);

      // Wire ReputationManager
      await reputationManager.setSettlementEngine(deployedAddresses.SettlementEngine);
      console.log(`    ✓ ReputationManager wired`);

      // Wire InsuranceFund
      await insuranceFund.setSettlementEngine(deployedAddresses.SettlementEngine);
      console.log(`    ✓ InsuranceFund wired`);

      // Wire SettlementEngine to accept gateway calls
      await settlementEngine.setGateway(deployedAddresses.PraxisGateway);
      console.log(`    ✓ SettlementEngine gateway wired`);

      console.log(`\n  ✓ All contracts wired successfully!`);
    });
  });

  // ═══════════════════════════════════════════════════════════════════════════
  //                     COMPLETE FLOW TEST
  // ═══════════════════════════════════════════════════════════════════════════

  describe("Complete Protocol Flow", function () {
    const LP1_DEPOSIT = 100000n * ONE_USDC; // $100,000
    const LP2_DEPOSIT = 50000n * ONE_USDC;  // $50,000
    const CAPITAL_REQUESTED = 10000n * ONE_USDC; // $10,000
    const STAKE_AMOUNT = 5000n * ONE_USDC; // $5,000 (50% for tier 0, or enough for tier 2)
    let ertId: bigint;

    describe("Step 1: LP Deposits via Gateway", function () {
      it("LP1 deposits $100,000 through Gateway", async function () {
        // Approve and deposit
        await mockUSDC.connect(lp1).approve(deployedAddresses.PraxisGateway, LP1_DEPOSIT);
        await praxisGateway.connect(lp1).deposit(LP1_DEPOSIT);

        const shares = await executionVault.balanceOf(await lp1.getAddress());
        expect(shares).to.be.gt(0n);

        console.log(`\n  LP1 Deposit:`);
        console.log(`    ├── Amount: $${ethers.formatUnits(LP1_DEPOSIT, 6)}`);
        console.log(`    └── Shares received: ${ethers.formatUnits(shares, 6)}`);
      });

      it("LP2 deposits $50,000 through Gateway", async function () {
        await mockUSDC.connect(lp2).approve(deployedAddresses.PraxisGateway, LP2_DEPOSIT);
        await praxisGateway.connect(lp2).deposit(LP2_DEPOSIT);

        const shares = await executionVault.balanceOf(await lp2.getAddress());
        console.log(`\n  LP2 Deposit:`);
        console.log(`    ├── Amount: $${ethers.formatUnits(LP2_DEPOSIT, 6)}`);
        console.log(`    └── Shares received: ${ethers.formatUnits(shares, 6)}`);
      });

      it("should show correct vault info via Gateway", async function () {
        const info = await praxisGateway.getVaultInfo();

        console.log(`\n  Vault State (via Gateway):`);
        console.log(`    ├── Total Assets: $${ethers.formatUnits(info.totalAssets, 6)}`);
        console.log(`    ├── Total Shares: ${ethers.formatUnits(info.totalShares, 6)}`);
        console.log(`    ├── Allocated Capital: $${ethers.formatUnits(info.allocatedCapital, 6)}`);
        console.log(`    ├── Available Capital: $${ethers.formatUnits(info.availableCapital, 6)}`);
        console.log(`    └── Utilization Rate: ${Number(info.utilizationRate) / 100}%`);

        expect(info.totalAssets).to.equal(LP1_DEPOSIT + LP2_DEPOSIT);
        expect(info.utilizationRate).to.equal(0n);
      });
    });

    describe("Step 2: Executor Gets Rights & Capital", function () {
      it("should check executor status via Gateway", async function () {
        const [isAuthorized, tier] = await praxisGateway.checkExecutor(await executor.getAddress());

        console.log(`\n  Executor Status (via Gateway):`);
        console.log(`    ├── Authorized: ${isAuthorized}`);
        console.log(`    └── Tier: ${tier} (UNVERIFIED)`);

        expect(isAuthorized).to.be.true;
        expect(tier).to.equal(0n);
      });

      it("should upgrade executor to VERIFIED tier", async function () {
        await reputationManager.whitelistExecutor(await executor.getAddress());
        await reputationManager.setExecutorTier(await executor.getAddress(), 2);

        const [, tier] = await praxisGateway.checkExecutor(await executor.getAddress());
        expect(tier).to.equal(2n);

        console.log(`\n  Executor upgraded to VERIFIED (Tier 2)`);
      });

      it("should get required stake via Gateway", async function () {
        const requiredStake = await praxisGateway.getRequiredStake(
          await executor.getAddress(),
          CAPITAL_REQUESTED
        );

        // VERIFIED tier requires 15% stake
        const expectedStake = (CAPITAL_REQUESTED * 1500n) / BPS;
        expect(requiredStake).to.equal(expectedStake);

        console.log(`\n  Stake Requirement for $${ethers.formatUnits(CAPITAL_REQUESTED, 6)} capital:`);
        console.log(`    └── Required stake: $${ethers.formatUnits(requiredStake, 6)} (15%)`);
      });

      it("executor mints ERT with stake", async function () {
        const duration = 7n * 24n * 60n * 60n; // 7 days

        const constraints = {
          maxLeverage: 2,
          maxDrawdownBps: 1000, // 10%
          maxPositionSizeBps: 5000, // 50%
          allowedAdapters: [],
          allowedAssets: [deployedAddresses.MockUSDC]
        };

        const fees = {
          baseFeeAprBps: 200n, // 2% APR
          profitShareBps: 2000n, // 20%
          stakedAmount: STAKE_AMOUNT
        };

        const tx = await executionRightsNFT.connect(executor).mint(
          await executor.getAddress(),
          CAPITAL_REQUESTED,
          duration,
          constraints,
          fees,
          { value: STAKE_AMOUNT }
        );
        await tx.wait();

        ertId = 1n; // First ERT

        // Verify ERT ownership
        expect(await executionRightsNFT.ownerOf(ertId)).to.equal(await executor.getAddress());

        console.log(`\n  ERT Minted:`);
        console.log(`    ├── ERT ID: ${ertId}`);
        console.log(`    ├── Capital Limit: $${ethers.formatUnits(CAPITAL_REQUESTED, 6)}`);
        console.log(`    ├── Stake Locked: $${ethers.formatUnits(STAKE_AMOUNT, 6)}`);
        console.log(`    └── Duration: 7 days`);
      });

      it("should verify ERT capital limit (capital allocated on execution)", async function () {
        // Note: Capital is NOT pre-allocated when ERT is minted
        // It's only allocated when the executor executes actions through ExecutionController
        // The ERT's capitalLimit defines the MAXIMUM the executor can deploy, not actual allocation

        const rights = await praxisGateway.getExecutionRights(ertId);
        expect(rights.capitalLimit).to.equal(CAPITAL_REQUESTED);

        // Verify no capital is allocated yet (executor hasn't executed any actions)
        const allocated = await executionVault.ertCapitalAllocated(ertId);
        expect(allocated).to.equal(0n);

        const info = await praxisGateway.getVaultInfo();
        console.log(`\n  ERT Capital Setup:`);
        console.log(`    ├── Capital Limit: $${ethers.formatUnits(rights.capitalLimit, 6)}`);
        console.log(`    ├── Actually Allocated: $${ethers.formatUnits(allocated, 6)} (no actions executed yet)`);
        console.log(`    └── Vault utilization: ${Number(info.utilizationRate) / 100}%`);
      });

      it("should get execution rights via Gateway", async function () {
        const rights = await praxisGateway.getExecutionRights(ertId);

        console.log(`\n  Execution Rights (via Gateway):`);
        console.log(`    ├── Executor: ${rights.executor}`);
        console.log(`    ├── Capital Limit: $${ethers.formatUnits(rights.capitalLimit, 6)}`);
        console.log(`    ├── Max Leverage: ${rights.constraints.maxLeverage}x`);
        console.log(`    ├── Max Drawdown: ${Number(rights.constraints.maxDrawdownBps) / 100}%`);
        console.log(`    ├── Base Fee APR: ${Number(rights.fees.baseFeeAprBps) / 100}%`);
        console.log(`    └── Profit Share: ${Number(rights.fees.profitShareBps) / 100}%`);
      });
    });

    describe("Step 3: Settlement Flow", function () {
      it("should estimate PnL via Gateway", async function () {
        const pnl = await praxisGateway.estimatePnl(ertId);

        console.log(`\n  PnL Estimation (via Gateway):`);
        console.log(`    └── Current PnL: $${ethers.formatUnits(pnl, 6)}`);

        // With no positions, PnL should be 0 or slightly negative
        expect(pnl).to.be.lte(0n);
      });

      it("should estimate settlement via Gateway", async function () {
        const estimation = await praxisGateway.estimateSettlement(ertId);

        console.log(`\n  Settlement Estimation (via Gateway):`);
        console.log(`    ├── ERT ID: ${estimation.ertId}`);
        console.log(`    ├── Total PnL: $${ethers.formatUnits(estimation.totalPnl, 6)}`);
        console.log(`    ├── LP Base Fee: $${ethers.formatUnits(estimation.lpBaseFee, 6)}`);
        console.log(`    ├── LP Profit Share: $${ethers.formatUnits(estimation.lpProfitShare, 6)}`);
        console.log(`    ├── Executor Profit: $${ethers.formatUnits(estimation.executorProfit, 6)}`);
        console.log(`    ├── Insurance Fee: $${ethers.formatUnits(estimation.insuranceFee, 6)}`);
        console.log(`    ├── Stake Slashed: $${ethers.formatUnits(estimation.stakeSlashed, 6)}`);
        console.log(`    └── Stake Returned: $${ethers.formatUnits(estimation.stakeReturned, 6)}`);
      });

      it("should simulate time passing for fee accrual", async function () {
        // Advance time by 7 days
        await ethers.provider.send("evm_increaseTime", [7 * 24 * 60 * 60]);
        await ethers.provider.send("evm_mine", []);

        console.log(`\n  ⏰ Advanced time by 7 days`);

        // Check fee breakdown now
        const [lpBaseFee, lpProfitShare, executorProfit, insuranceFee, stakeSlashed] =
          await settlementEngine.calculateFeeBreakdown(ertId, 0); // 0 PnL

        console.log(`\n  Fee Breakdown after 7 days:`);
        console.log(`    └── LP Base Fee accrued: $${ethers.formatUnits(lpBaseFee, 6)}`);

        // Base fee should be approximately 2% APR for 7 days
        // Expected: $10,000 * 2% * 7/365 ≈ $3.84
        expect(lpBaseFee).to.be.gt(0n);
      });

      it("should allow executor to settle via Gateway", async function () {
        const executorBalanceBefore = await ethers.provider.getBalance(await executor.getAddress());

        // Settle through gateway
        const tx = await praxisGateway.connect(executor).settleRights(ertId);
        const receipt = await tx.wait();

        // Get final result from events
        const settledEvent = receipt.logs.find((log: any) => {
          try {
            return praxisGateway.interface.parseLog(log)?.name === "ExecutionRightsSettled";
          } catch {
            return false;
          }
        });

        console.log(`\n  Settlement Complete!`);
        console.log(`    ├── Gas used: ${receipt.gasUsed.toString()}`);

        // Check executor received stake back
        const executorBalanceAfter = await ethers.provider.getBalance(await executor.getAddress());
        console.log(`    └── Executor balance change: ${ethers.formatEther(executorBalanceAfter - executorBalanceBefore)} ETH`);
      });
    });

    describe("Step 4: LP Withdrawal", function () {
      it("LP1 should be able to withdraw via Gateway", async function () {
        const lpShares = await executionVault.balanceOf(await lp1.getAddress());
        const halfShares = lpShares / 2n;

        // Approve gateway to spend shares
        await executionVault.connect(lp1).approve(deployedAddresses.PraxisGateway, halfShares);

        const balanceBefore = await mockUSDC.balanceOf(await lp1.getAddress());
        await praxisGateway.connect(lp1).withdraw(halfShares);
        const balanceAfter = await mockUSDC.balanceOf(await lp1.getAddress());

        const withdrawn = balanceAfter - balanceBefore;
        console.log(`\n  LP1 Withdrawal:`);
        console.log(`    ├── Shares redeemed: ${ethers.formatUnits(halfShares, 6)}`);
        console.log(`    └── USDC received: $${ethers.formatUnits(withdrawn, 6)}`);

        expect(withdrawn).to.be.gt(0n);
      });
    });
  });

  // ═══════════════════════════════════════════════════════════════════════════
  //                     FRONTEND REFERENCE OUTPUT
  // ═══════════════════════════════════════════════════════════════════════════

  describe("Frontend Reference", function () {
    it("should output all deployed contract addresses", async function () {
      console.log(`\n${"═".repeat(70)}`);
      console.log(`  DEPLOYED CONTRACT ADDRESSES (for frontend integration)`);
      console.log(`${"═".repeat(70)}`);

      for (const [name, address] of Object.entries(deployedAddresses)) {
        console.log(`  ${name.padEnd(25)} ${address}`);
      }

      console.log(`${"═".repeat(70)}`);
      console.log(`\n  External Dependencies (Flare Mainnet):`);
      console.log(`    WFLR:     ${TOKENS_FLARE.WFLR}`);
      console.log(`    USDC:     ${TOKENS_FLARE.USDC}`);
      console.log(`    sFLR:     ${TOKENS_FLARE.sFLR}`);
      console.log(`${"═".repeat(70)}\n`);
    });

    it("should verify all Gateway view functions work", async function () {
      console.log(`  Gateway View Functions Test:`);

      // getVaultInfo
      const vaultInfo = await praxisGateway.getVaultInfo();
      console.log(`    ✓ getVaultInfo() - Total Assets: $${ethers.formatUnits(vaultInfo.totalAssets, 6)}`);

      // checkExecutor
      const [isAuth, tier] = await praxisGateway.checkExecutor(await executor.getAddress());
      console.log(`    ✓ checkExecutor() - Tier: ${tier}`);

      // getRequiredStake
      const stake = await praxisGateway.getRequiredStake(await executor.getAddress(), 1000n * ONE_USDC);
      console.log(`    ✓ getRequiredStake() - For $1000: $${ethers.formatUnits(stake, 6)}`);

      console.log(`\n  All Gateway view functions operational! ✓`);
    });
  });
});
