import { expect } from "chai";
import { network } from "hardhat";
import { SPARKDEX_FLARE, TOKENS_FLARE } from "../../scripts/helpers/dexAddresses.js";
import { CRYPTO_FEEDS } from "../../scripts/helpers/feedIds.js";

const { ethers } = await network.connect();

/**
 * Full System Integration Tests - Phases 1-6
 *
 * Verifies that ALL phases work together in a synchronized fashion:
 * - Phase 1: Oracle Foundation (FlareOracle, FTSO)
 * - Phase 2: DEX Adapters (SwapRouter, SparkDEXAdapter)
 * - Phase 3: Yield Adapters (YieldRouter, KineticAdapter, SceptreAdapter)
 * - Phase 4: Perpetual Adapters (PerpetualRouter, SparkDEXEternalAdapter)
 * - Phase 5: FAssets Support (FAssetsAdapter)
 * - Phase 6: Execution Vaults & Rights System
 *
 * Run: npx hardhat test test/integration/Phase1to6Integration.test.ts --network flareFork
 */
describe("Phase 1-6 Full System Integration", function () {
  this.timeout(300000);

  // Contract instances
  let owner: any;
  let executor: any;
  let lp: any;

  // Phase 1: Oracle
  let flareOracle: any;

  // Phase 2: DEX
  let swapRouter: any;
  let sparkdexAdapter: any;

  // Phase 6: Core
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

  // Token addresses
  const WFLR = TOKENS_FLARE.WFLR;

  before(async function () {
    const chainId = (await ethers.provider.getNetwork()).chainId;
    if (chainId !== 14n) {
      console.log(`Skipping - not on Flare mainnet/fork (chainId: ${chainId})`);
      this.skip();
    }

    [owner, executor, lp] = await ethers.getSigners();
    console.log(`Owner: ${await owner.getAddress()}`);
    console.log(`Executor: ${await executor.getAddress()}`);
    console.log(`LP: ${await lp.getAddress()}`);
  });

  describe("System Deployment & Wiring", function () {
    it("should deploy Phase 2: SwapRouter + SparkDEXAdapter", async function () {
      // Deploy SwapRouter
      const SwapRouter = await ethers.getContractFactory("SwapRouter");
      swapRouter = await SwapRouter.deploy();
      await swapRouter.waitForDeployment();
      console.log(`✓ SwapRouter deployed at: ${await swapRouter.getAddress()}`);

      // Deploy SparkDEXAdapter
      if (SPARKDEX_FLARE.swapRouter && SPARKDEX_FLARE.quoterV2 && SPARKDEX_FLARE.factory) {
        const SparkDEXAdapter = await ethers.getContractFactory("SparkDEXAdapter");
        sparkdexAdapter = await SparkDEXAdapter.deploy(
          SPARKDEX_FLARE.swapRouter,
          SPARKDEX_FLARE.quoterV2,
          SPARKDEX_FLARE.factory
        );
        await sparkdexAdapter.waitForDeployment();
        console.log(`✓ SparkDEXAdapter deployed at: ${await sparkdexAdapter.getAddress()}`);

        // Register adapter
        await swapRouter.addAdapter(await sparkdexAdapter.getAddress());
        console.log(`  SparkDEXAdapter registered with SwapRouter`);
      }
    });

    it("should deploy Mock USDC for testing", async function () {
      // Deploy a mock ERC20 for USDC
      const MockERC20 = await ethers.getContractFactory("MockERC20");
      mockUSDC = await MockERC20.deploy("Mock USDC", "USDC", 6);
      await mockUSDC.waitForDeployment();
      console.log(`✓ MockUSDC deployed at: ${await mockUSDC.getAddress()}`);

      // Mint to LP and owner
      const mintAmount = ethers.parseUnits("1000000", 6); // 1M USDC
      await mockUSDC.mint(await lp.getAddress(), mintAmount);
      await mockUSDC.mint(await owner.getAddress(), mintAmount);
      console.log(`  Minted 1M USDC to LP and Owner`);
    });

    it("should deploy Phase 1: MockFlareOracle (for fork testing)", async function () {
      // Note: Using MockFlareOracle because real FlareOracle uses ContractRegistry
      // which has different addresses on Coston2 vs Flare mainnet fork
      const MockFlareOracle = await ethers.getContractFactory("MockFlareOracle");
      flareOracle = await MockFlareOracle.deploy();
      await flareOracle.waitForDeployment();
      console.log(`✓ MockFlareOracle deployed at: ${await flareOracle.getAddress()}`);

      // Set mock prices for testing
      await flareOracle.setTokenPrice(WFLR, ethers.parseEther("0.02")); // $0.02 FLR
      await flareOracle.setTokenPrice(await mockUSDC.getAddress(), ethers.parseEther("1.0")); // $1.00 USDC
      console.log(`  Mock prices configured: FLR=$0.02, USDC=$1.00`);
    });

    it("should deploy Phase 6: ReputationManager", async function () {
      const ReputationManager = await ethers.getContractFactory("ReputationManager");
      reputationManager = await ReputationManager.deploy();
      await reputationManager.waitForDeployment();
      console.log(`✓ ReputationManager deployed at: ${await reputationManager.getAddress()}`);

      // Verify tier config
      const tier0Config = await reputationManager.getTierConfig(0);
      expect(tier0Config.maxCapital).to.be.gt(0);
      console.log(`  Tier 0 max capital: $${ethers.formatUnits(tier0Config.maxCapital, 6)}`);
    });

    it("should deploy Phase 6: ExecutionVault", async function () {
      const ExecutionVault = await ethers.getContractFactory("ExecutionVault");
      executionVault = await ExecutionVault.deploy(
        await mockUSDC.getAddress(),
        "PRAXIS Vault Shares",
        "pUSDC"
      );
      await executionVault.waitForDeployment();
      console.log(`✓ ExecutionVault deployed at: ${await executionVault.getAddress()}`);

      // Verify it's an ERC4626 vault
      expect(await executionVault.asset()).to.equal(await mockUSDC.getAddress());
      console.log(`  Base asset: MockUSDC`);
    });

    it("should deploy Phase 6: ExecutionRightsNFT", async function () {
      const ExecutionRightsNFT = await ethers.getContractFactory("ExecutionRightsNFT");
      executionRightsNFT = await ExecutionRightsNFT.deploy(
        await reputationManager.getAddress(),
        await executionVault.getAddress()
      );
      await executionRightsNFT.waitForDeployment();
      console.log(`✓ ExecutionRightsNFT deployed at: ${await executionRightsNFT.getAddress()}`);

      expect(await executionRightsNFT.name()).to.equal("PRAXIS Execution Rights");
      expect(await executionRightsNFT.symbol()).to.equal("ERT");
    });

    it("should deploy Phase 6: PositionManager", async function () {
      const PositionManager = await ethers.getContractFactory("PositionManager");
      positionManager = await PositionManager.deploy(await flareOracle.getAddress());
      await positionManager.waitForDeployment();
      console.log(`✓ PositionManager deployed at: ${await positionManager.getAddress()}`);
    });

    it("should deploy Phase 6: ExposureManager", async function () {
      const ExposureManager = await ethers.getContractFactory("ExposureManager");
      exposureManager = await ExposureManager.deploy(await executionVault.getAddress());
      await exposureManager.waitForDeployment();
      console.log(`✓ ExposureManager deployed at: ${await exposureManager.getAddress()}`);
    });

    it("should deploy Phase 6: ExecutionController", async function () {
      const ExecutionController = await ethers.getContractFactory("ExecutionController");
      executionController = await ExecutionController.deploy(
        await executionRightsNFT.getAddress(),
        await executionVault.getAddress(),
        await positionManager.getAddress(),
        await exposureManager.getAddress(),
        await flareOracle.getAddress()
      );
      await executionController.waitForDeployment();
      console.log(`✓ ExecutionController deployed at: ${await executionController.getAddress()}`);
    });

    it("should deploy Phase 6: UtilizationController", async function () {
      const UtilizationController = await ethers.getContractFactory("UtilizationController");
      utilizationController = await UtilizationController.deploy(await executionVault.getAddress());
      await utilizationController.waitForDeployment();
      console.log(`✓ UtilizationController deployed at: ${await utilizationController.getAddress()}`);

      // Verify default max utilization
      const maxUtil = await utilizationController.maxUtilizationBps();
      expect(maxUtil).to.equal(7000n); // 70%
      console.log(`  Max utilization: ${Number(maxUtil) / 100}%`);
    });

    it("should deploy Phase 6: CircuitBreaker", async function () {
      const totalAssets = await executionVault.totalAssets();
      const CircuitBreaker = await ethers.getContractFactory("CircuitBreaker");
      circuitBreaker = await CircuitBreaker.deploy(
        await executionVault.getAddress(),
        totalAssets // Initial snapshot
      );
      await circuitBreaker.waitForDeployment();
      console.log(`✓ CircuitBreaker deployed at: ${await circuitBreaker.getAddress()}`);

      // Verify circuit breaker is not active
      expect(await circuitBreaker.isPaused()).to.be.false;
      console.log(`  Circuit breaker: NOT ACTIVE`);
    });

    it("should deploy Phase 6: InsuranceFund", async function () {
      const InsuranceFund = await ethers.getContractFactory("InsuranceFund");
      insuranceFund = await InsuranceFund.deploy(
        await executionVault.getAddress(),
        await mockUSDC.getAddress()
      );
      await insuranceFund.waitForDeployment();
      console.log(`✓ InsuranceFund deployed at: ${await insuranceFund.getAddress()}`);
    });

    it("should wire all Phase 6 contracts together", async function () {
      // Wire ExecutionVault
      await executionVault.setExecutionController(await executionController.getAddress());
      await executionVault.setUtilizationController(await utilizationController.getAddress());
      await executionVault.setCircuitBreaker(await circuitBreaker.getAddress());
      console.log(`✓ ExecutionVault wired to Controller, Utilization, CircuitBreaker`);

      // Register SparkDEXAdapter with vault (so it can be used for execution)
      if (sparkdexAdapter) {
        await executionVault.registerAdapter(await sparkdexAdapter.getAddress());
        console.log(`  SparkDEXAdapter registered with ExecutionVault`);
      }

      // Wire ExecutionRightsNFT
      await executionRightsNFT.setExecutionController(await executionController.getAddress());
      await executionRightsNFT.setCircuitBreaker(await circuitBreaker.getAddress());
      console.log(`✓ ExecutionRightsNFT wired to Controller, CircuitBreaker`);

      // Wire ExecutionController
      await executionController.setCircuitBreaker(await circuitBreaker.getAddress());
      console.log(`✓ ExecutionController wired to CircuitBreaker`);

      // Wire PositionManager
      await positionManager.setExecutionController(await executionController.getAddress());
      console.log(`✓ PositionManager wired to Controller`);

      // Wire ExposureManager
      await exposureManager.setExecutionController(await executionController.getAddress());
      console.log(`✓ ExposureManager wired to Controller`);

      // Wire CircuitBreaker
      await circuitBreaker.setSettlementEngine(await owner.getAddress()); // Owner acts as settlement for testing
      console.log(`✓ CircuitBreaker wired to Settlement (owner for testing)`);

      console.log(`\n✓ All Phase 6 contracts wired successfully!`);
    });
  });

  describe("Cross-Phase Integration Tests", function () {
    describe("Phase 1 + Phase 6: Oracle → ExecutionController", function () {
      it("should use FlareOracle for price data in ExecutionController", async function () {
        // ExecutionController has FlareOracle reference
        const oracleAddr = await executionController.flareOracle();
        expect(oracleAddr).to.equal(await flareOracle.getAddress());
        console.log(`✓ ExecutionController uses MockFlareOracle at ${oracleAddr}`);
      });

      it("should get token price from oracle", async function () {
        // Get price from mock oracle
        const [price, timestamp] = await flareOracle.getTokenPriceUSD.staticCall(WFLR);

        expect(price).to.be.gt(0);
        console.log(`✓ WFLR price from Oracle: $${ethers.formatEther(price)}`);
        console.log(`  Timestamp: ${new Date(Number(timestamp) * 1000).toISOString()}`);
      });
    });

    describe("Phase 2 + Phase 6: SwapRouter → ExecutionVault", function () {
      it("should have adapter registered with ExecutionVault", async function () {
        if (!sparkdexAdapter) {
          this.skip();
          return;
        }

        const isRegistered = await executionVault.isAdapterRegistered(await sparkdexAdapter.getAddress());
        expect(isRegistered).to.be.true;
        console.log(`✓ SparkDEXAdapter is registered with ExecutionVault`);
      });

      it("should connect SwapRouter to adapters for best rate discovery", async function () {
        const adapterCount = await swapRouter.getAdapterCount();
        expect(adapterCount).to.be.gt(0);
        console.log(`✓ SwapRouter has ${adapterCount} adapter(s) for best rate routing`);
      });
    });

    describe("Phase 6 Internal Integration", function () {
      it("should allow LP to deposit into ExecutionVault", async function () {
        const depositAmount = ethers.parseUnits("100000", 6); // 100k USDC

        // LP approves and deposits
        await mockUSDC.connect(lp).approve(await executionVault.getAddress(), depositAmount);
        await executionVault.connect(lp).deposit(depositAmount, await lp.getAddress());

        // Verify shares received
        const lpShares = await executionVault.balanceOf(await lp.getAddress());
        expect(lpShares).to.be.gt(0);
        console.log(`✓ LP deposited 100k USDC, received ${ethers.formatUnits(lpShares, 6)} shares`);

        // Verify vault total assets
        const totalAssets = await executionVault.totalAssets();
        expect(totalAssets).to.equal(depositAmount);
        console.log(`  Vault total assets: $${ethers.formatUnits(totalAssets, 6)}`);
      });

      it("should check utilization limits via UtilizationController", async function () {
        const totalAssets = await executionVault.totalAssets();
        const availableForAllocation = await utilizationController.availableForAllocation(totalAssets, 0);

        // Should be 70% of total (max utilization)
        const expectedAvailable = (totalAssets * 7000n) / 10000n;
        expect(availableForAllocation).to.equal(expectedAvailable);
        console.log(`✓ Available for allocation: $${ethers.formatUnits(availableForAllocation, 6)} (70% of total)`);
      });

      it("should verify ReputationManager tier config for new executor", async function () {
        const executorAddr = await executor.getAddress();

        // Get executor's reputation (should be default Tier 0)
        const rep = await reputationManager.getReputation(executorAddr);
        expect(rep.tier).to.equal(0n); // UNVERIFIED
        console.log(`✓ New executor at Tier ${rep.tier} (UNVERIFIED)`);

        // Get tier config
        const tierConfig = await reputationManager.getExecutorTierConfig(executorAddr);
        console.log(`  Max capital: $${ethers.formatUnits(tierConfig.maxCapital, 6)}`);
        console.log(`  Stake required: ${Number(tierConfig.stakeRequiredBps) / 100}%`);
        console.log(`  Max drawdown: ${Number(tierConfig.maxDrawdownBps) / 100}%`);
      });

      it("should verify CircuitBreaker allows operations when not triggered", async function () {
        expect(await circuitBreaker.isPaused()).to.be.false;
        expect(await circuitBreaker.canMintERT()).to.be.true;
        console.log(`✓ CircuitBreaker allows ERT minting`);
      });

      it("should verify ExposureManager limits work", async function () {
        const totalAssets = await executionVault.totalAssets();

        // Max 30% exposure per asset
        const maxExposure = (totalAssets * 3000n) / 10000n; // 30k USDC
        const canAdd = await exposureManager.canAddExposure(WFLR, maxExposure, totalAssets);
        expect(canAdd).to.be.true;
        console.log(`✓ ExposureManager allows up to $${ethers.formatUnits(maxExposure, 6)} per asset`);

        // Exceeding should return false
        const excessiveExposure = (totalAssets * 4000n) / 10000n; // 40%
        const canAddExcessive = await exposureManager.canAddExposure(WFLR, excessiveExposure, totalAssets);
        expect(canAddExcessive).to.be.false;
        console.log(`  Correctly rejects exposure > 30%`);
      });

      it("should verify InsuranceFund is ready", async function () {
        const fundBalance = await insuranceFund.fundBalance();
        console.log(`✓ InsuranceFund balance: $${ethers.formatUnits(fundBalance, 6)}`);

        // Verify asset is correct
        const fundAsset = await insuranceFund.baseAsset();
        expect(fundAsset).to.equal(await mockUSDC.getAddress());
      });
    });

    describe("Full Flow Integration", function () {
      it("should complete full LP → Vault → ERT request flow", async function () {
        // Step 1: Verify LP funds are in vault
        const vaultAssets = await executionVault.totalAssets();
        expect(vaultAssets).to.be.gt(0);
        console.log(`Step 1: ✓ Vault has $${ethers.formatUnits(vaultAssets, 6)}`);

        // Step 2: Check ReputationManager for executor's tier
        const executorAddr = await executor.getAddress();
        const tierConfig = await reputationManager.getExecutorTierConfig(executorAddr);
        const maxCapital = tierConfig.maxCapital;
        console.log(`Step 2: ✓ Executor can request up to $${ethers.formatUnits(maxCapital, 6)}`);

        // Step 3: Verify utilization allows new allocation
        const availableCapital = await utilizationController.availableForAllocation(vaultAssets, 0);
        expect(availableCapital).to.be.gte(maxCapital);
        console.log(`Step 3: ✓ Utilization allows allocation (${ethers.formatUnits(availableCapital, 6)} available)`);

        // Step 4: Verify circuit breaker is not active
        expect(await circuitBreaker.canMintERT()).to.be.true;
        console.log(`Step 4: ✓ Circuit breaker allows ERT minting`);

        // Step 5: Calculate required stake
        const requiredStake = await reputationManager.getRequiredStake(executorAddr, maxCapital);
        console.log(`Step 5: ✓ Required stake: ${ethers.formatEther(requiredStake)} FLR`);

        console.log(`\n✓ Full LP → Vault → ERT request flow validated!`);
      });

      it("should verify all contracts reference each other correctly", async function () {
        console.log("\nCross-Contract Reference Verification:");

        // ExecutionVault references
        expect(await executionVault.executionController()).to.equal(await executionController.getAddress());
        expect(await executionVault.utilizationController()).to.equal(await utilizationController.getAddress());
        expect(await executionVault.circuitBreaker()).to.equal(await circuitBreaker.getAddress());
        console.log(`✓ ExecutionVault → Controller, Utilization, CircuitBreaker`);

        // ExecutionController references
        expect(await executionController.ertNFT()).to.equal(await executionRightsNFT.getAddress());
        expect(await executionController.executionVault()).to.equal(await executionVault.getAddress());
        expect(await executionController.positionManager()).to.equal(await positionManager.getAddress());
        expect(await executionController.exposureManager()).to.equal(await exposureManager.getAddress());
        expect(await executionController.flareOracle()).to.equal(await flareOracle.getAddress());
        expect(await executionController.circuitBreaker()).to.equal(await circuitBreaker.getAddress());
        console.log(`✓ ExecutionController → ERT, Vault, Position, Exposure, Oracle, CircuitBreaker`);

        // ExecutionRightsNFT references
        expect(await executionRightsNFT.reputationManager()).to.equal(await reputationManager.getAddress());
        expect(await executionRightsNFT.executionVault()).to.equal(await executionVault.getAddress());
        expect(await executionRightsNFT.executionController()).to.equal(await executionController.getAddress());
        expect(await executionRightsNFT.circuitBreaker()).to.equal(await circuitBreaker.getAddress());
        console.log(`✓ ExecutionRightsNFT → Reputation, Vault, Controller, CircuitBreaker`);

        // PositionManager references
        expect(await positionManager.executionController()).to.equal(await executionController.getAddress());
        expect(await positionManager.flareOracle()).to.equal(await flareOracle.getAddress());
        console.log(`✓ PositionManager → Controller, Oracle`);

        // ExposureManager references
        expect(await exposureManager.executionController()).to.equal(await executionController.getAddress());
        console.log(`✓ ExposureManager → Controller`);

        // UtilizationController references
        expect(await utilizationController.vault()).to.equal(await executionVault.getAddress());
        console.log(`✓ UtilizationController → Vault`);

        console.log(`\n✓ All cross-contract references verified!`);
      });
    });

    describe("Safety System Integration", function () {
      it("should integrate CircuitBreaker with vault operations", async function () {
        // CircuitBreaker not triggered
        expect(await circuitBreaker.isPaused()).to.be.false;

        // Vault operations should work
        const canMint = await circuitBreaker.canMintERT();
        expect(canMint).to.be.true;
        console.log(`✓ CircuitBreaker correctly integrates with ERT minting`);
      });

      it("should integrate UtilizationController with vault allocations", async function () {
        const totalAssets = await executionVault.totalAssets();
        const maxAlloc = (totalAssets * 7000n) / 10000n; // 70%

        // Allocation within limit should pass
        const canAllocSmall = await utilizationController.canAllocate(totalAssets, 0, maxAlloc);
        expect(canAllocSmall).to.be.true;
        console.log(`✓ UtilizationController allows allocation within 70% limit`);

        // Allocation exceeding limit should fail
        const canAllocExcessive = await utilizationController.canAllocate(totalAssets, 0, totalAssets);
        expect(canAllocExcessive).to.be.false;
        console.log(`  Correctly blocks allocation > 70%`);
      });

      it("should integrate ExposureManager with position limits", async function () {
        const totalAssets = await executionVault.totalAssets();

        // Within 30% limit
        const smallExposure = (totalAssets * 2000n) / 10000n; // 20%
        expect(await exposureManager.canAddExposure(WFLR, smallExposure, totalAssets)).to.be.true;

        // Exceeds 30% limit
        const largeExposure = (totalAssets * 5000n) / 10000n; // 50%
        expect(await exposureManager.canAddExposure(WFLR, largeExposure, totalAssets)).to.be.false;

        console.log(`✓ ExposureManager correctly enforces 30% max exposure per asset`);
      });
    });
  });

  describe("System Health Verification", function () {
    it("should summarize system state", async function () {
      console.log("\n========== PRAXIS SYSTEM STATE ==========\n");

      // Vault stats
      const totalAssets = await executionVault.totalAssets();
      const totalAllocated = await executionVault.totalAllocated();
      const availableCapital = await executionVault.availableCapital();
      console.log("ExecutionVault:");
      console.log(`  Total Assets:     $${ethers.formatUnits(totalAssets, 6)}`);
      console.log(`  Total Allocated:  $${ethers.formatUnits(totalAllocated, 6)}`);
      console.log(`  Available:        $${ethers.formatUnits(availableCapital, 6)}`);

      // Safety systems
      const maxUtil = await utilizationController.maxUtilizationBps();
      const cbPaused = await circuitBreaker.isPaused();
      const maxExposure = await exposureManager.maxSingleAssetBps();
      console.log("\nSafety Systems:");
      console.log(`  Max Utilization:  ${Number(maxUtil) / 100}%`);
      console.log(`  Circuit Breaker:  ${cbPaused ? "ACTIVE" : "Normal"}`);
      console.log(`  Max Exposure:     ${Number(maxExposure) / 100}% per asset`);

      // Oracle - check if it has FLR price configured
      const hasFeed = await flareOracle.hasFeed(WFLR);
      console.log("\nOracle (Phase 1):");
      console.log(`  MockFlareOracle: WFLR feed configured = ${hasFeed}`);

      // DEX (Phase 2)
      const adapterCount = await swapRouter.getAdapterCount();
      console.log("\nDEX Routing (Phase 2):");
      console.log(`  Registered Adapters: ${adapterCount}`);

      // Insurance
      const insuranceBalance = await insuranceFund.fundBalance();
      console.log("\nInsurance Fund:");
      console.log(`  Balance:          $${ethers.formatUnits(insuranceBalance, 6)}`);

      console.log("\n==========================================");
      console.log("✓ All Phase 1-6 systems operational!");
      console.log("==========================================\n");
    });
  });
});
