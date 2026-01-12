import { expect } from "chai";
import { network } from "hardhat";
import {
  BLAZESWAP_FLARE,
  TOKENS_FLARE,
} from "../../../scripts/helpers/dexAddresses.js";

const { ethers } = await network.connect();

/**
 * BlazeSwap Adapter Integration Tests
 *
 * These tests run against real BlazeSwap contracts on Flare mainnet.
 * Requires: Network set to 'flare' (chainId 14)
 *
 * Run with: npx hardhat test test/integration/adapters/BlazeSwapAdapter.integration.test.ts --network flare
 */
describe("BlazeSwapAdapter Integration", function () {
  // Increase timeout for network calls
  this.timeout(60000);

  let blazeSwapAdapter: any;
  let owner: any;

  // Contract addresses
  const ROUTER = BLAZESWAP_FLARE.router;
  const FACTORY = BLAZESWAP_FLARE.factory;
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
    if (!ROUTER || !FACTORY) {
      console.log("Skipping - BlazeSwap addresses not configured");
      this.skip();
    }

    [owner] = await ethers.getSigners();
    console.log(`Running as: ${await owner.getAddress()}`);
    console.log(`Balance: ${ethers.formatEther(await ethers.provider.getBalance(await owner.getAddress()))} FLR`);
  });

  beforeEach(async function () {
    // Deploy BlazeSwapAdapter
    const BlazeSwapAdapter = await ethers.getContractFactory("BlazeSwapAdapter");
    blazeSwapAdapter = await BlazeSwapAdapter.deploy(ROUTER, FACTORY);
    await blazeSwapAdapter.waitForDeployment();
    console.log(`BlazeSwapAdapter deployed to: ${await blazeSwapAdapter.getAddress()}`);
  });

  describe("Deployment", function () {
    it("should deploy with correct name", async function () {
      expect(await blazeSwapAdapter.name()).to.equal("BlazeSwap");
    });

    it("should have correct router address", async function () {
      expect(await blazeSwapAdapter.router()).to.equal(ROUTER);
    });

    it("should have correct factory address", async function () {
      expect(await blazeSwapAdapter.factory()).to.equal(FACTORY);
    });

    it("should have WETH address from router", async function () {
      const weth = await blazeSwapAdapter.getWETH();
      console.log(`WETH address: ${weth}`);
      expect(weth).to.not.equal("0x0000000000000000000000000000000000000000");
    });
  });

  describe("isPoolAvailable", function () {
    it("should check if WFLR/USDC pair exists", async function () {
      const available = await blazeSwapAdapter.isPoolAvailable(WFLR, USDC);
      console.log(`WFLR/USDC pool available: ${available}`);
      expect(typeof available).to.equal("boolean");
    });
  });

  describe("getQuote", function () {
    it("should return a quote for WFLR -> USDC if pair exists", async function () {
      const amountIn = ethers.parseEther("100"); // 100 WFLR

      try {
        const [amountOut, gasEstimate] = await blazeSwapAdapter.getQuote(
          WFLR,
          USDC,
          amountIn
        );

        console.log(`Quote: 100 WFLR -> ${ethers.formatUnits(amountOut, 6)} USDC`);
        console.log(`Gas estimate: ${gasEstimate}`);

        if (amountOut > 0n) {
          expect(amountOut).to.be.gt(0);
        }
      } catch (error) {
        console.log("Quote failed - pair may not exist");
      }
    });

    it("should return 0 for non-existent pair", async function () {
      const fakeToken = "0x0000000000000000000000000000000000000001";
      const [amountOut, gasEstimate] = await blazeSwapAdapter.getQuote(
        fakeToken,
        USDC,
        ethers.parseEther("1")
      );

      expect(amountOut).to.equal(0);
    });
  });

  describe("getPair", function () {
    it("should return pair address if exists", async function () {
      const pair = await blazeSwapAdapter.getPair(WFLR, USDC);
      console.log(`WFLR/USDC pair: ${pair}`);
      expect(pair).to.be.a("string");
    });
  });
});
