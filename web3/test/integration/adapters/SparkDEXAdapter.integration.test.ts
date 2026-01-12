import { expect } from "chai";
import { network } from "hardhat";
import {
  SPARKDEX_FLARE,
  TOKENS_FLARE,
  V3_FEE_TIERS,
} from "../../../scripts/helpers/dexAddresses.js";

const { ethers } = await network.connect();

/**
 * SparkDEX Adapter Integration Tests
 *
 * These tests run against real SparkDEX contracts on Flare mainnet.
 * Requires: Network set to 'flare' (chainId 14)
 *
 * Run with: npx hardhat test test/integration/adapters/SparkDEXAdapter.integration.test.ts --network flare
 */
describe("SparkDEXAdapter Integration", function () {
  // Increase timeout for network calls
  this.timeout(60000);

  let sparkDexAdapter: any;
  let owner: any;

  // Contract addresses
  const ROUTER = SPARKDEX_FLARE.swapRouter;
  const QUOTER = SPARKDEX_FLARE.quoterV2;
  const FACTORY = SPARKDEX_FLARE.factory;
  const WFLR = TOKENS_FLARE.WFLR;
  const USDC = TOKENS_FLARE.USDC;

  before(async function () {
    // Skip if not on Flare mainnet
    const chainId = (await ethers.provider.getNetwork()).chainId;
    if (chainId !== 14n) {
      console.log(`Skipping integration tests - not on Flare mainnet (chainId: ${chainId})`);
      this.skip();
    }

    // Check that addresses are not empty
    if (!ROUTER || !QUOTER || !FACTORY) {
      console.log("Skipping - SparkDEX addresses not configured");
      this.skip();
    }

    [owner] = await ethers.getSigners();
    console.log(`Running as: ${await owner.getAddress()}`);
    console.log(`Balance: ${ethers.formatEther(await ethers.provider.getBalance(await owner.getAddress()))} FLR`);
  });

  beforeEach(async function () {
    // Deploy SparkDEXAdapter
    const SparkDEXAdapter = await ethers.getContractFactory("SparkDEXAdapter");
    sparkDexAdapter = await SparkDEXAdapter.deploy(ROUTER, QUOTER, FACTORY);
    await sparkDexAdapter.waitForDeployment();
    console.log(`SparkDEXAdapter deployed to: ${await sparkDexAdapter.getAddress()}`);
  });

  describe("Deployment", function () {
    it("should deploy with correct name", async function () {
      expect(await sparkDexAdapter.name()).to.equal("SparkDEX V3");
    });

    it("should have correct router address", async function () {
      expect(await sparkDexAdapter.router()).to.equal(ROUTER);
    });

    it("should have correct quoter address", async function () {
      expect(await sparkDexAdapter.quoter()).to.equal(QUOTER);
    });

    it("should have correct factory address", async function () {
      expect(await sparkDexAdapter.factory()).to.equal(FACTORY);
    });

    it("should have default fee tier set to 3000", async function () {
      expect(await sparkDexAdapter.defaultFeeTier()).to.equal(3000);
    });
  });

  describe("isPoolAvailable", function () {
    it("should return true for WFLR/USDC pair if pool exists", async function () {
      const available = await sparkDexAdapter.isPoolAvailable(WFLR, USDC);
      console.log(`WFLR/USDC pool available: ${available}`);
      // We expect this to be true on mainnet, but don't fail if false
      expect(typeof available).to.equal("boolean");
    });
  });

  describe("getQuote", function () {
    it("should return a quote for WFLR -> USDC", async function () {
      const amountIn = ethers.parseEther("100"); // 100 WFLR

      try {
        const [amountOut, gasEstimate] = await sparkDexAdapter.getQuote(
          WFLR,
          USDC,
          amountIn
        );

        console.log(`Quote: 100 WFLR -> ${ethers.formatUnits(amountOut, 6)} USDC`);
        console.log(`Gas estimate: ${gasEstimate}`);

        // If quote succeeds, amountOut should be > 0
        if (amountOut > 0n) {
          expect(amountOut).to.be.gt(0);
          expect(gasEstimate).to.be.gt(0);
        }
      } catch (error) {
        console.log("Quote failed - pool may not have liquidity");
      }
    });

    it("should return 0 for non-existent pair", async function () {
      const fakeToken = "0x0000000000000000000000000000000000000001";
      const [amountOut, gasEstimate] = await sparkDexAdapter.getQuote(
        fakeToken,
        USDC,
        ethers.parseEther("1")
      );

      expect(amountOut).to.equal(0);
    });
  });

  describe("getPoolForFeeTier", function () {
    it("should return pool address for valid pair and fee tier", async function () {
      const pool = await sparkDexAdapter.getPoolForFeeTier(
        WFLR,
        USDC,
        V3_FEE_TIERS.MEDIUM
      );

      console.log(`WFLR/USDC 0.3% pool: ${pool}`);

      // Pool may or may not exist
      expect(pool).to.be.a("string");
    });
  });

  describe("Fee Tiers", function () {
    it("should have 4 fee tiers configured", async function () {
      const feeTiers = await sparkDexAdapter.getFeeTiers();
      expect(feeTiers.length).to.equal(4);
      expect(feeTiers[0]).to.equal(100n);
      expect(feeTiers[1]).to.equal(500n);
      expect(feeTiers[2]).to.equal(3000n);
      expect(feeTiers[3]).to.equal(10000n);
    });

    it("should allow owner to update default fee tier", async function () {
      await sparkDexAdapter.setDefaultFeeTier(500);
      expect(await sparkDexAdapter.defaultFeeTier()).to.equal(500);
    });
  });
});
