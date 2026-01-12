import { expect } from "chai";
import { network } from "hardhat";
import {
  SPARKDEX_FLARE,
  BLAZESWAP_FLARE,
  TOKENS_FLARE,
} from "../../../scripts/helpers/dexAddresses.js";

const { ethers } = await network.connect();

/**
 * SwapRouter Integration Tests
 *
 * Tests the DEX aggregator against real DEX contracts on Flare mainnet.
 * Requires: Network set to 'flare' (chainId 14)
 *
 * Run with: npx hardhat test test/integration/adapters/SwapRouter.integration.test.ts --network flare
 */
describe("SwapRouter Integration", function () {
  // Increase timeout for network calls
  this.timeout(120000);

  let swapRouter: any;
  let sparkDexAdapter: any;
  let blazeSwapAdapter: any;
  let owner: any;

  // Token addresses
  const WFLR = TOKENS_FLARE.WFLR;
  const USDC = TOKENS_FLARE.USDC;

  before(async function () {
    // Skip if not on Flare mainnet
    const chainId = (await ethers.provider.getNetwork()).chainId;
    if (chainId !== 14n) {
      console.log(`Skipping integration tests - not on Flare mainnet (chainId: ${chainId})`);
      this.skip();
    }

    [owner] = await ethers.getSigners();
    console.log(`Running as: ${await owner.getAddress()}`);
    console.log(`Balance: ${ethers.formatEther(await ethers.provider.getBalance(await owner.getAddress()))} FLR`);
  });

  beforeEach(async function () {
    // Deploy SwapRouter
    const SwapRouter = await ethers.getContractFactory("SwapRouter");
    swapRouter = await SwapRouter.deploy();
    await swapRouter.waitForDeployment();
    console.log(`SwapRouter deployed to: ${await swapRouter.getAddress()}`);

    // Deploy SparkDEXAdapter if addresses are configured
    if (SPARKDEX_FLARE.swapRouter && SPARKDEX_FLARE.quoterV2 && SPARKDEX_FLARE.factory) {
      const SparkDEXAdapter = await ethers.getContractFactory("SparkDEXAdapter");
      sparkDexAdapter = await SparkDEXAdapter.deploy(
        SPARKDEX_FLARE.swapRouter,
        SPARKDEX_FLARE.quoterV2,
        SPARKDEX_FLARE.factory
      );
      await sparkDexAdapter.waitForDeployment();
      console.log(`SparkDEXAdapter deployed to: ${await sparkDexAdapter.getAddress()}`);

      // Register adapter
      await swapRouter.addAdapter(await sparkDexAdapter.getAddress());
    }

    // Deploy BlazeSwapAdapter if addresses are configured
    if (BLAZESWAP_FLARE.router && BLAZESWAP_FLARE.factory) {
      const BlazeSwapAdapter = await ethers.getContractFactory("BlazeSwapAdapter");
      blazeSwapAdapter = await BlazeSwapAdapter.deploy(
        BLAZESWAP_FLARE.router,
        BLAZESWAP_FLARE.factory
      );
      await blazeSwapAdapter.waitForDeployment();
      console.log(`BlazeSwapAdapter deployed to: ${await blazeSwapAdapter.getAddress()}`);

      // Register adapter
      await swapRouter.addAdapter(await blazeSwapAdapter.getAddress());
    }
  });

  describe("Adapter Registration", function () {
    it("should have registered adapters", async function () {
      const adapterCount = await swapRouter.getAdapterCount();
      console.log(`Registered adapters: ${adapterCount}`);
      expect(adapterCount).to.be.gte(1);
    });

    it("should list all adapters", async function () {
      const adapters = await swapRouter.getAdapters();
      console.log("Registered adapter addresses:", adapters);
      expect(adapters.length).to.be.gte(1);
    });
  });

  describe("getAllQuotes", function () {
    it("should return quotes from all adapters for WFLR -> USDC", async function () {
      const amountIn = ethers.parseEther("100"); // 100 WFLR
      const quotes = await swapRouter.getAllQuotes(WFLR, USDC, amountIn);

      console.log("\nQuotes for 100 WFLR -> USDC:");
      for (const quote of quotes) {
        if (quote.amountOut > 0n) {
          console.log(`  ${quote.name}: ${ethers.formatUnits(quote.amountOut, 6)} USDC`);
        } else {
          console.log(`  ${quote.name}: No liquidity or route`);
        }
      }

      expect(quotes.length).to.be.gte(1);
    });
  });

  describe("findBestRoute", function () {
    it("should find the best route for WFLR -> USDC", async function () {
      const amountIn = ethers.parseEther("100"); // 100 WFLR

      const [bestAdapter, bestAmountOut] = await swapRouter.findBestRoute(
        WFLR,
        USDC,
        amountIn
      );

      if (bestAmountOut > 0n) {
        console.log(`\nBest route for 100 WFLR -> USDC:`);
        console.log(`  Adapter: ${bestAdapter}`);
        console.log(`  Output: ${ethers.formatUnits(bestAmountOut, 6)} USDC`);
        expect(bestAmountOut).to.be.gt(0);
      } else {
        console.log("No route found with liquidity");
      }
    });
  });

  describe("isPairSupported", function () {
    it("should check if WFLR/USDC pair is supported", async function () {
      const supported = await swapRouter.isPairSupported(WFLR, USDC);
      console.log(`WFLR/USDC supported: ${supported}`);
      expect(typeof supported).to.equal("boolean");
    });
  });
});
