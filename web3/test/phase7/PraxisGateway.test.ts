import { expect } from "chai";
import { network } from "hardhat";
import { SignerWithAddress } from "@nomicfoundation/hardhat-ethers/signers";

const { ethers } = await network.connect();

/**
 * PraxisGateway Comprehensive Test Suite
 *
 * This test suite validates the PraxisGateway contract which:
 * - Provides a unified entry point for all PRAXIS interactions
 * - Forwards calls to underlying contracts (thin facade)
 * - Handles LP deposits/withdrawals
 * - Handles executor ERT requests and settlements
 * - Provides convenience functions for self-execution
 */
describe("PraxisGateway", function () {
  this.timeout(120000);

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
  let executionController: any;
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

  before(async function () {
    const chainId = (await ethers.provider.getNetwork()).chainId;
    // Accept both Flare mainnet (14) and Hardhat default (31337)
    if (chainId !== 14n && chainId !== 31337n) {
      console.log(`Skipping - not on supported chain (chainId: ${chainId})`);
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

    // Use owner as execution controller for testing
    executionController = owner;

    // Deploy PraxisGateway
    const PraxisGateway = await ethers.getContractFactory("PraxisGateway");
    praxisGateway = await PraxisGateway.deploy(
      await executionVault.getAddress(),
      await executionRightsNFT.getAddress(),
      await settlementEngine.getAddress(),
      await executionController.getAddress(),
      await reputationManager.getAddress(),
      await positionManager.getAddress()
    );
    await praxisGateway.waitForDeployment();

    // Wire up contracts
    await executionRightsNFT.setSettlementEngine(await settlementEngine.getAddress());
    await reputationManager.setSettlementEngine(await settlementEngine.getAddress());
    await circuitBreaker.setSettlementEngine(await settlementEngine.getAddress());
    await insuranceFund.setSettlementEngine(await settlementEngine.getAddress());

    // Configure vault
    await executionVault.setExecutionController(await owner.getAddress());

    console.log(`PraxisGateway deployed at: ${await praxisGateway.getAddress()}`);
  });

  // =============================================================
  //                    DEPLOYMENT TESTS
  // =============================================================

  describe("Deployment and Initialization", function () {
    it("should deploy with correct vault address", async function () {
      expect(await praxisGateway.vault()).to.equal(await executionVault.getAddress());
    });

    it("should deploy with correct ERT NFT address", async function () {
      expect(await praxisGateway.ertNFT()).to.equal(await executionRightsNFT.getAddress());
    });

    it("should deploy with correct settlement engine", async function () {
      expect(await praxisGateway.settlementEngine()).to.equal(await settlementEngine.getAddress());
    });

    it("should deploy with correct execution controller", async function () {
      expect(await praxisGateway.executionController()).to.equal(await owner.getAddress());
    });

    it("should deploy with correct reputation manager", async function () {
      expect(await praxisGateway.reputationManager()).to.equal(await reputationManager.getAddress());
    });

    it("should deploy with correct position manager", async function () {
      expect(await praxisGateway.positionManager()).to.equal(await positionManager.getAddress());
    });

    it("should deploy with correct base asset", async function () {
      expect(await praxisGateway.baseAsset()).to.equal(await usdc.getAddress());
    });

    it("should have correct BPS constant", async function () {
      expect(await praxisGateway.BPS()).to.equal(10000n);
    });
  });

  // =============================================================
  //                  CONSTRUCTOR VALIDATION
  // =============================================================

  describe("Constructor Validation", function () {
    it("should revert if vault is zero address", async function () {
      const PraxisGateway = await ethers.getContractFactory("PraxisGateway");
      await expect(
        PraxisGateway.deploy(
          ethers.ZeroAddress,
          await executionRightsNFT.getAddress(),
          await settlementEngine.getAddress(),
          await owner.getAddress(),
          await reputationManager.getAddress(),
          await positionManager.getAddress()
        )
      ).to.be.revertedWithCustomError(praxisGateway, "ZeroAddress");
    });

    it("should revert if ERT NFT is zero address", async function () {
      const PraxisGateway = await ethers.getContractFactory("PraxisGateway");
      await expect(
        PraxisGateway.deploy(
          await executionVault.getAddress(),
          ethers.ZeroAddress,
          await settlementEngine.getAddress(),
          await owner.getAddress(),
          await reputationManager.getAddress(),
          await positionManager.getAddress()
        )
      ).to.be.revertedWithCustomError(praxisGateway, "ZeroAddress");
    });

    it("should allow zero addresses for optional components", async function () {
      const PraxisGateway = await ethers.getContractFactory("PraxisGateway");
      const gateway = await PraxisGateway.deploy(
        await executionVault.getAddress(),
        await executionRightsNFT.getAddress(),
        ethers.ZeroAddress, // settlement engine
        ethers.ZeroAddress, // controller
        ethers.ZeroAddress, // reputation manager
        ethers.ZeroAddress  // position manager
      );
      await gateway.waitForDeployment();
      expect(await gateway.settlementEngine()).to.equal(ethers.ZeroAddress);
    });
  });

  // =============================================================
  //                       LP FUNCTION TESTS
  // =============================================================

  describe("LP Functions", function () {
    const depositAmount = 10000n * ONE_USDC; // $10,000

    it("should allow LP to deposit through gateway", async function () {
      // Approve gateway to spend USDC
      await usdc.connect(lp).approve(await praxisGateway.getAddress(), depositAmount);

      // Deposit through gateway
      const tx = await praxisGateway.connect(lp).deposit(depositAmount);
      const receipt = await tx.wait();

      // Check LP received shares
      const lpShares = await executionVault.balanceOf(await lp.getAddress());
      expect(lpShares).to.be.gt(0n);

      console.log(`LP deposited: $${ethers.formatUnits(depositAmount, 6)}`);
      console.log(`LP received shares: ${ethers.formatUnits(lpShares, 6)}`);
    });

    it("should emit LPDeposit event", async function () {
      await usdc.connect(lp).approve(await praxisGateway.getAddress(), depositAmount);

      await expect(praxisGateway.connect(lp).deposit(depositAmount))
        .to.emit(praxisGateway, "LPDeposit")
        .withArgs(await lp.getAddress(), depositAmount, depositAmount); // 1:1 ratio initially
    });

    it("should revert deposit with zero amount", async function () {
      await expect(praxisGateway.connect(lp).deposit(0n))
        .to.be.revertedWithCustomError(praxisGateway, "ZeroAmount");
    });

    it("should allow LP to withdraw through gateway", async function () {
      // First deposit
      await usdc.connect(lp).approve(await praxisGateway.getAddress(), depositAmount);
      await praxisGateway.connect(lp).deposit(depositAmount);

      const lpShares = await executionVault.balanceOf(await lp.getAddress());
      const initialBalance = await usdc.balanceOf(await lp.getAddress());

      // Approve gateway to spend shares (gateway calls vault.redeem on behalf of LP)
      await executionVault.connect(lp).approve(await praxisGateway.getAddress(), lpShares);

      // Withdraw through gateway
      await praxisGateway.connect(lp).withdraw(lpShares);

      const finalBalance = await usdc.balanceOf(await lp.getAddress());
      expect(finalBalance).to.be.gt(initialBalance);

      console.log(`LP withdrew: ${ethers.formatUnits(lpShares, 6)} shares`);
      console.log(`LP received: $${ethers.formatUnits(finalBalance - initialBalance, 6)}`);
    });

    it("should emit LPWithdraw event", async function () {
      await usdc.connect(lp).approve(await praxisGateway.getAddress(), depositAmount);
      await praxisGateway.connect(lp).deposit(depositAmount);

      const lpShares = await executionVault.balanceOf(await lp.getAddress());
      await executionVault.connect(lp).approve(await praxisGateway.getAddress(), lpShares);

      await expect(praxisGateway.connect(lp).withdraw(lpShares))
        .to.emit(praxisGateway, "LPWithdraw")
        .withArgs(await lp.getAddress(), lpShares, depositAmount);
    });

    it("should revert withdraw with zero shares", async function () {
      await expect(praxisGateway.connect(lp).withdraw(0n))
        .to.be.revertedWithCustomError(praxisGateway, "ZeroAmount");
    });

    it("should return correct vault info", async function () {
      // Deposit first
      await usdc.connect(lp).approve(await praxisGateway.getAddress(), depositAmount);
      await praxisGateway.connect(lp).deposit(depositAmount);

      const info = await praxisGateway.getVaultInfo();

      expect(info.totalAssets).to.equal(depositAmount);
      expect(info.totalShares).to.equal(depositAmount); // 1:1 initially
      expect(info.allocatedCapital).to.equal(0n);
      expect(info.availableCapital).to.equal(depositAmount);
      expect(info.utilizationRate).to.equal(0);

      console.log(`Vault Info:`);
      console.log(`  Total Assets: $${ethers.formatUnits(info.totalAssets, 6)}`);
      console.log(`  Utilization: ${Number(info.utilizationRate) / 100}%`);
    });
  });

  // =============================================================
  //                    VIEW FUNCTION TESTS
  // =============================================================

  describe("View Functions", function () {
    it("should return correct executor check result", async function () {
      const [isAuthorized, tier] = await praxisGateway.checkExecutor(await executor.getAddress());

      expect(isAuthorized).to.be.true; // Not banned
      expect(tier).to.equal(0); // UNVERIFIED tier

      console.log(`Executor authorized: ${isAuthorized}, tier: ${tier}`);
    });

    it("should return correct required stake for executor", async function () {
      const capitalNeeded = 100n * ONE_USDC; // $100 (within UNVERIFIED tier limit)
      const requiredStake = await praxisGateway.getRequiredStake(
        await executor.getAddress(),
        capitalNeeded
      );

      // UNVERIFIED tier requires 50% stake
      const expectedStake = (capitalNeeded * 5000n) / BPS;
      expect(requiredStake).to.equal(expectedStake);

      console.log(`Capital: $${ethers.formatUnits(capitalNeeded, 6)}`);
      console.log(`Required stake: $${ethers.formatUnits(requiredStake, 6)}`);
    });

    it("should return banned status for banned executor", async function () {
      // Ban executor
      await reputationManager.banExecutor(await executor.getAddress(), "test ban");

      const [isAuthorized, tier] = await praxisGateway.checkExecutor(await executor.getAddress());
      expect(isAuthorized).to.be.false;
    });
  });

  // =============================================================
  //                    ADMIN FUNCTION TESTS
  // =============================================================

  describe("Admin Functions", function () {
    it("should allow owner to update settlement engine", async function () {
      const newEngine = await anyone.getAddress();
      await praxisGateway.setSettlementEngine(newEngine);
      expect(await praxisGateway.settlementEngine()).to.equal(newEngine);
    });

    it("should allow owner to update execution controller", async function () {
      const newController = await anyone.getAddress();
      await praxisGateway.setExecutionController(newController);
      expect(await praxisGateway.executionController()).to.equal(newController);
    });

    it("should revert setSettlementEngine with zero address", async function () {
      await expect(praxisGateway.setSettlementEngine(ethers.ZeroAddress))
        .to.be.revertedWithCustomError(praxisGateway, "ZeroAddress");
    });

    it("should revert setExecutionController with zero address", async function () {
      await expect(praxisGateway.setExecutionController(ethers.ZeroAddress))
        .to.be.revertedWithCustomError(praxisGateway, "ZeroAddress");
    });

    it("should allow owner to pause gateway", async function () {
      await praxisGateway.pause();
      expect(await praxisGateway.paused()).to.be.true;
    });

    it("should allow owner to unpause gateway", async function () {
      await praxisGateway.pause();
      await praxisGateway.unpause();
      expect(await praxisGateway.paused()).to.be.false;
    });

    it("should prevent deposits when paused", async function () {
      await praxisGateway.pause();
      await usdc.connect(lp).approve(await praxisGateway.getAddress(), 1000n * ONE_USDC);

      await expect(praxisGateway.connect(lp).deposit(1000n * ONE_USDC))
        .to.be.revertedWithCustomError(praxisGateway, "EnforcedPause");
    });

    it("should prevent withdrawals when paused", async function () {
      await praxisGateway.pause();
      await expect(praxisGateway.connect(lp).withdraw(100n * ONE_USDC))
        .to.be.revertedWithCustomError(praxisGateway, "EnforcedPause");
    });
  });

  // =============================================================
  //                    ACCESS CONTROL TESTS
  // =============================================================

  describe("Access Control", function () {
    it("should prevent non-owner from setting settlement engine", async function () {
      await expect(
        praxisGateway.connect(anyone).setSettlementEngine(await anyone.getAddress())
      ).to.be.revertedWithCustomError(praxisGateway, "OwnableUnauthorizedAccount");
    });

    it("should prevent non-owner from setting execution controller", async function () {
      await expect(
        praxisGateway.connect(anyone).setExecutionController(await anyone.getAddress())
      ).to.be.revertedWithCustomError(praxisGateway, "OwnableUnauthorizedAccount");
    });

    it("should prevent non-owner from pausing", async function () {
      await expect(
        praxisGateway.connect(anyone).pause()
      ).to.be.revertedWithCustomError(praxisGateway, "OwnableUnauthorizedAccount");
    });

    it("should prevent non-owner from unpausing", async function () {
      await praxisGateway.pause();
      await expect(
        praxisGateway.connect(anyone).unpause()
      ).to.be.revertedWithCustomError(praxisGateway, "OwnableUnauthorizedAccount");
    });
  });

  // =============================================================
  //                    RECEIVE ETH TEST
  // =============================================================

  describe("Receive ETH", function () {
    it("should accept ETH transfers", async function () {
      const amount = ethers.parseEther("1.0");
      await owner.sendTransaction({
        to: await praxisGateway.getAddress(),
        value: amount
      });

      const balance = await ethers.provider.getBalance(await praxisGateway.getAddress());
      expect(balance).to.equal(amount);
    });
  });
});
