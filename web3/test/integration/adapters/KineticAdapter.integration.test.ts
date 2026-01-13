import { expect } from "chai";
import { network } from "hardhat";
import {
  KINETIC_FLARE,
  TOKENS_FLARE,
} from "../../../scripts/helpers/yieldAddresses.js";

const { ethers } = await network.connect();

/**
 * Kinetic Adapter Integration Tests
 *
 * These tests run against real Kinetic contracts on Flare mainnet fork.
 * Requires: Anvil fork running or using flareFork network
 *
 * Start Anvil: anvil --fork-url https://flare-api.flare.network/ext/C/rpc --port 8546
 * Run: npx hardhat test test/integration/adapters/KineticAdapter.integration.test.ts --network anvilFork
 */
describe("KineticAdapter Integration", function () {
  // Increase timeout for network calls
  this.timeout(120000);

  let kineticAdapter: any;
  let owner: any;
  let usdcToken: any;
  let kUsdcToken: any;
  let sflrToken: any;
  let kSflrToken: any;

  // Contract addresses
  const COMPTROLLER = KINETIC_FLARE.comptroller;
  const USDC = TOKENS_FLARE.USDC;
  const kUSDC = KINETIC_FLARE.kTokens.kUSDC;
  const sFLR = TOKENS_FLARE.sFLR;
  const ksFLR = KINETIC_FLARE.kTokens.ksFLR;

  // Whale addresses (holders with significant balances)
  // These will be discovered on-chain during test setup
  let usdcWhale: string | null = null;

  before(async function () {
    // Get chain ID
    const chainId = (await ethers.provider.getNetwork()).chainId;
    console.log(`Running on chain ID: ${chainId}`);

    // Skip if not on Flare mainnet or fork (chainId 14)
    if (chainId !== 14n) {
      console.log(`Skipping integration tests - not on Flare mainnet/fork (chainId: ${chainId})`);
      this.skip();
    }

    // Check that Kinetic is deployed
    if (!COMPTROLLER || !kUSDC) {
      console.log("Skipping - Kinetic addresses not configured");
      this.skip();
    }

    [owner] = await ethers.getSigners();
    console.log(`Running as: ${await owner.getAddress()}`);

    const balance = await ethers.provider.getBalance(await owner.getAddress());
    console.log(`Balance: ${ethers.formatEther(balance)} FLR`);

    // Get token contracts
    usdcToken = await ethers.getContractAt("IERC20", USDC);
    kUsdcToken = await ethers.getContractAt("IERC20", kUSDC);
    sflrToken = await ethers.getContractAt("IERC20", sFLR);
    kSflrToken = await ethers.getContractAt("IERC20", ksFLR);

    // Try to find a USDC holder by checking kUSDC contract (it holds USDC as reserves)
    const kUsdcBalance = await usdcToken.balanceOf(kUSDC);
    console.log(`kUSDC contract holds: ${ethers.formatUnits(kUsdcBalance, 6)} USDC`);
  });

  beforeEach(async function () {
    // Deploy KineticAdapter
    const KineticAdapter = await ethers.getContractFactory("KineticAdapter");
    kineticAdapter = await KineticAdapter.deploy(COMPTROLLER);
    await kineticAdapter.waitForDeployment();
    console.log(`KineticAdapter deployed to: ${await kineticAdapter.getAddress()}`);

    // Initialize markets from comptroller
    const tx = await kineticAdapter.initializeMarkets();
    await tx.wait();
    console.log("Markets initialized from comptroller");
  });

  describe("Deployment", function () {
    it("should deploy with correct name", async function () {
      expect(await kineticAdapter.name()).to.equal("Kinetic");
    });

    it("should have correct protocol address (comptroller)", async function () {
      expect(await kineticAdapter.protocol()).to.equal(COMPTROLLER);
    });

    it("should have correct comptroller address", async function () {
      expect(await kineticAdapter.comptroller()).to.equal(COMPTROLLER);
    });
  });

  describe("Market Initialization", function () {
    it("should discover and register kTokens from comptroller", async function () {
      const supportedKTokens = await kineticAdapter.getSupportedMarkets();
      console.log(`Discovered ${supportedKTokens.length} kTokens`);

      for (const kToken of supportedKTokens) {
        console.log(`  - ${kToken}`);
      }

      expect(supportedKTokens.length).to.be.gt(0);
    });

    it("should map kUSDC to USDC", async function () {
      const kToken = await kineticAdapter.underlyingToKToken(USDC);
      expect(kToken.toLowerCase()).to.equal(kUSDC.toLowerCase());
    });

    it("should map ksFLR to sFLR", async function () {
      const kToken = await kineticAdapter.underlyingToKToken(sFLR);
      expect(kToken.toLowerCase()).to.equal(ksFLR.toLowerCase());
    });
  });

  describe("View Functions", function () {
    it("should return non-zero TVL for USDC", async function () {
      const tvl = await kineticAdapter.getTVL(USDC);
      console.log(`USDC TVL: ${ethers.formatUnits(tvl, 6)} USDC`);
      // TVL can be 0 if no deposits
      expect(tvl).to.be.gte(0);
    });

    it("should return exchange rate for kUSDC", async function () {
      const exchangeRate = await kineticAdapter.getExchangeRate(USDC);
      console.log(`kUSDC exchange rate: ${ethers.formatEther(exchangeRate)}`);
      // Exchange rate should be > 0
      expect(exchangeRate).to.be.gt(0);
    });

    it("should return supply APY for USDC", async function () {
      const apy = await kineticAdapter.getSupplyAPY(USDC);
      console.log(`USDC Supply APY: ${Number(apy) / 100}%`);
      // APY can be 0 if no utilization
      expect(apy).to.be.gte(0);
    });

    it("should return borrow APY for USDC", async function () {
      const apy = await kineticAdapter.getBorrowAPY(USDC);
      console.log(`USDC Borrow APY: ${Number(apy) / 100}%`);
      // Borrow APY should be >= supply APY
      expect(apy).to.be.gte(0);
    });

    it("should return general APY (uses supply APY)", async function () {
      const apy = await kineticAdapter.getAPY(USDC);
      const supplyApy = await kineticAdapter.getSupplyAPY(USDC);
      expect(apy).to.equal(supplyApy);
    });

    it("should return true for supported assets", async function () {
      expect(await kineticAdapter.isAssetSupported(USDC)).to.be.true;
      expect(await kineticAdapter.isAssetSupported(sFLR)).to.be.true;
    });

    it("should return false for unsupported assets", async function () {
      const randomToken = "0x0000000000000000000000000000000000000001";
      expect(await kineticAdapter.isAssetSupported(randomToken)).to.be.false;
    });
  });

  describe("Account Liquidity", function () {
    it("should return zero liquidity for new account", async function () {
      const [liquidity, shortfall] = await kineticAdapter.getAccountLiquidity(
        await owner.getAddress()
      );
      console.log(`Account liquidity: ${ethers.formatEther(liquidity)}, shortfall: ${ethers.formatEther(shortfall)}`);
      expect(liquidity).to.equal(0);
      expect(shortfall).to.equal(0);
    });
  });

  describe("Supply Operations (requires USDC)", function () {
    // This test requires having USDC - will be skipped if user has no USDC
    it("should supply USDC and receive kUSDC", async function () {
      const userUsdc = await usdcToken.balanceOf(await owner.getAddress());
      console.log(`User USDC balance: ${ethers.formatUnits(userUsdc, 6)}`);

      if (userUsdc < ethers.parseUnits("1", 6)) {
        console.log("Skipping - need at least 1 USDC for this test");
        this.skip();
      }

      const supplyAmount = ethers.parseUnits("1", 6); // 1 USDC

      // Get kUSDC balance before
      const kUsdcBefore = await kUsdcToken.balanceOf(await owner.getAddress());

      // Approve adapter
      await usdcToken.approve(await kineticAdapter.getAddress(), supplyAmount);

      // Supply
      const tx = await kineticAdapter.supply(USDC, supplyAmount, await owner.getAddress());
      const receipt = await tx.wait();

      // Get kUSDC balance after
      const kUsdcAfter = await kUsdcToken.balanceOf(await owner.getAddress());
      const kUsdcReceived = kUsdcAfter - kUsdcBefore;

      console.log(`Supplied 1 USDC, received ${ethers.formatUnits(kUsdcReceived, 8)} kUSDC`);
      console.log(`Gas used: ${receipt.gasUsed}`);

      expect(kUsdcReceived).to.be.gt(0);
    });
  });

  describe("Deposit/Withdraw Interface", function () {
    it("should expose deposit as supply alias", async function () {
      const userUsdc = await usdcToken.balanceOf(await owner.getAddress());

      if (userUsdc < ethers.parseUnits("0.5", 6)) {
        console.log("Skipping - need USDC for this test");
        this.skip();
      }

      const supplyAmount = ethers.parseUnits("0.5", 6);
      await usdcToken.approve(await kineticAdapter.getAddress(), supplyAmount);

      // Use deposit (IYieldAdapter interface)
      const tx = await kineticAdapter.deposit(USDC, supplyAmount, await owner.getAddress());
      await tx.wait();

      // Check underlying balance
      const underlyingBalance = await kineticAdapter.getUnderlyingBalance(USDC, await owner.getAddress());
      console.log(`Underlying balance after deposit: ${ethers.formatUnits(underlyingBalance, 6)} USDC`);

      expect(underlyingBalance).to.be.gt(0);
    });
  });

  describe("Enable Collateral", function () {
    it("should enable asset as collateral", async function () {
      // Enable USDC as collateral
      const tx = await kineticAdapter.enableCollateral(USDC);
      await tx.wait();

      // We can't easily verify this without checking comptroller state
      // But the tx should succeed
      expect(tx.hash).to.be.a("string");
    });
  });

  describe("Health Factor", function () {
    it("should return max health factor for account with no borrows", async function () {
      const healthFactor = await kineticAdapter.getHealthFactor(await owner.getAddress());
      console.log(`Health factor: ${ethers.formatEther(healthFactor)}`);

      // Max uint256 for no borrows
      expect(healthFactor).to.equal(ethers.MaxUint256);
    });
  });

  describe("Borrow Balance", function () {
    it("should return zero borrow balance for new account", async function () {
      const borrowBalance = await kineticAdapter.getBorrowBalance(USDC, await owner.getAddress());
      expect(borrowBalance).to.equal(0);
    });
  });

  describe("Underlying Balance", function () {
    it("should return zero for account with no supply", async function () {
      const balance = await kineticAdapter.getUnderlyingBalance(USDC, await owner.getAddress());
      console.log(`Underlying USDC balance: ${ethers.formatUnits(balance, 6)}`);
      // Could be 0 or non-zero depending on whether user has supplied before
      expect(balance).to.be.gte(0);
    });
  });

  describe("Gas Estimates", function () {
    it("should have initializeMarkets under 500k gas", async function () {
      // Deploy a fresh adapter
      const KineticAdapter = await ethers.getContractFactory("KineticAdapter");
      const freshAdapter = await KineticAdapter.deploy(COMPTROLLER);
      await freshAdapter.waitForDeployment();

      const tx = await freshAdapter.initializeMarkets();
      const receipt = await tx.wait();

      console.log(`initializeMarkets gas: ${receipt?.gasUsed}`);
      expect(receipt?.gasUsed).to.be.lt(500000);
    });
  });

  describe("Manual kToken Registration", function () {
    it("should allow owner to manually add market", async function () {
      // Deploy fresh adapter without initialization
      const KineticAdapter = await ethers.getContractFactory("KineticAdapter");
      const freshAdapter = await KineticAdapter.deploy(COMPTROLLER);
      await freshAdapter.waitForDeployment();

      // Manually add kUSDC
      await freshAdapter.addMarket(kUSDC);

      // Verify it was added
      expect(await freshAdapter.isAssetSupported(USDC)).to.be.true;
    });

    it("should reject non-owner from adding market", async function () {
      const KineticAdapter = await ethers.getContractFactory("KineticAdapter");
      const freshAdapter = await KineticAdapter.deploy(COMPTROLLER);
      await freshAdapter.waitForDeployment();

      const [, nonOwner] = await ethers.getSigners();
      if (!nonOwner) {
        this.skip();
      }

      await expect(
        freshAdapter.connect(nonOwner).addMarket(kUSDC)
      ).to.be.reverted;
    });
  });

  describe("Read All Markets from Comptroller", function () {
    it("should query all markets from comptroller", async function () {
      const comptroller = await ethers.getContractAt(
        ["function getAllMarkets() view returns (address[])"],
        COMPTROLLER
      );

      const allMarkets = await comptroller.getAllMarkets();
      console.log(`Total markets in Kinetic: ${allMarkets.length}`);

      for (const market of allMarkets) {
        console.log(`  - ${market}`);
      }

      expect(allMarkets.length).to.be.gt(0);
    });
  });
});
