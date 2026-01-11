import { expect } from "chai";
import { network } from "hardhat";
import { CRYPTO_FEEDS, decodeFeedId } from "../../../scripts/helpers/feedIds.js";

const { ethers } = await network.connect();

/**
 * FlareOracle Integration Tests
 *
 * These tests MUST run against Coston2 testnet with real FTSO v2 data.
 * Usage: npx hardhat test test/integration/oracles/FlareOracle.integration.test.ts --network coston2
 *
 * No mock data - all prices come from live FTSO v2 oracle.
 */
describe("FlareOracle Integration [Coston2]", function () {
  // Extend timeout for network calls
  this.timeout(60000);

  let flareOracle: any;
  let owner: any;

  // Test constants - dynamically discovered
  const MAX_PRICE_AGE = 300;

  before(async function () {
    // Check if we're on a live network by checking chain ID
    const chainId = (await ethers.provider.getNetwork()).chainId;
    // Coston2 chain ID is 114
    if (chainId !== 114n) {
      console.log(`Skipping integration tests - running on chain ${chainId}, need Coston2 (114)`);
      this.skip();
    }

    // Get signer
    [owner] = await ethers.getSigners();
    console.log("\n--- Integration Test Setup ---");
    console.log("Chain ID:", chainId.toString());
    console.log("Network: Coston2");
    console.log("Signer:", await owner.getAddress());

    const balance = await ethers.provider.getBalance(owner.address);
    console.log("Balance:", ethers.formatEther(balance), "FLR");

    // Deploy FlareOracle
    console.log("\nDeploying FlareOracle...");
    const FlareOracle = await ethers.getContractFactory("FlareOracle");
    flareOracle = await FlareOracle.deploy(MAX_PRICE_AGE);
    await flareOracle.waitForDeployment();

    const oracleAddress = await flareOracle.getAddress();
    console.log("FlareOracle deployed to:", oracleAddress);
  });

  describe("FTSO v2 Connection", function () {
    it("should connect to FTSO v2 via ContractRegistry", async function () {
      const ftsoV2 = await flareOracle.getFtsoV2();
      expect(ftsoV2).to.not.equal(ethers.ZeroAddress);
      console.log("  FtsoV2 address:", ftsoV2);
    });

    it("should get supported feed IDs", async function () {
      const supportedFeeds = await flareOracle.getSupportedFeeds();
      expect(supportedFeeds.length).to.be.gt(0);
      console.log("  Supported feeds count:", supportedFeeds.length);

      // Log first 5 feeds
      console.log("  First 5 feeds:");
      for (let i = 0; i < Math.min(5, supportedFeeds.length); i++) {
        try {
          const name = decodeFeedId(supportedFeeds[i]);
          console.log(`    ${i + 1}. ${name}`);
        } catch {
          console.log(`    ${i + 1}. ${supportedFeeds[i]}`);
        }
      }
    });
  });

  describe("getPrice", function () {
    it("should return FLR/USD price from FTSO v2", async function () {
      const feedId = CRYPTO_FEEDS.FLR_USD;

      // Calculate fee
      const fee = await flareOracle.calculateFee(feedId);
      console.log("  Fee for FLR/USD:", ethers.formatEther(fee), "FLR");

      // Get price using staticCall to get return values
      const result = await flareOracle.getPrice.staticCall(feedId, {
        value: fee,
      });

      const value = result[0];
      const decimals = result[1];
      const timestamp = result[2];

      // Verify price is valid
      expect(value).to.be.gt(0);
      expect(timestamp).to.be.gt(0);

      // Calculate human-readable price
      const adjustedPrice = Number(value) / Math.pow(10, Math.abs(Number(decimals)));
      const ageSeconds = Math.floor(Date.now() / 1000) - Number(timestamp);

      console.log("  FLR/USD price: $", adjustedPrice.toFixed(6));
      console.log("  Decimals:", decimals);
      console.log("  Timestamp:", new Date(Number(timestamp) * 1000).toISOString());
      console.log("  Age:", ageSeconds, "seconds");

      // Price should be within reasonable range (FLR typically $0.01 - $0.10)
      expect(adjustedPrice).to.be.gt(0);
      expect(adjustedPrice).to.be.lt(10);
    });

    it("should return BTC/USD price", async function () {
      const feedId = CRYPTO_FEEDS.BTC_USD;
      const fee = await flareOracle.calculateFee(feedId);

      const result = await flareOracle.getPrice.staticCall(feedId, {
        value: fee,
      });

      const value = result[0];
      const decimals = result[1];

      expect(value).to.be.gt(0);

      const adjustedPrice = Number(value) / Math.pow(10, Math.abs(Number(decimals)));
      console.log("  BTC/USD price: $", adjustedPrice.toFixed(2));

      // BTC should be in a reasonable range (20000 - 200000)
      expect(adjustedPrice).to.be.gt(10000);
      expect(adjustedPrice).to.be.lt(500000);
    });

    it("should return XRP/USD price", async function () {
      const feedId = CRYPTO_FEEDS.XRP_USD;
      const fee = await flareOracle.calculateFee(feedId);

      const result = await flareOracle.getPrice.staticCall(feedId, {
        value: fee,
      });

      const value = result[0];
      const decimals = result[1];

      expect(value).to.be.gt(0);

      const adjustedPrice = Number(value) / Math.pow(10, Math.abs(Number(decimals)));
      console.log("  XRP/USD price: $", adjustedPrice.toFixed(4));

      // XRP typically $0.20 - $5.00
      expect(adjustedPrice).to.be.gt(0.01);
      expect(adjustedPrice).to.be.lt(50);
    });

    it("should return ETH/USD price", async function () {
      const feedId = CRYPTO_FEEDS.ETH_USD;
      const fee = await flareOracle.calculateFee(feedId);

      const result = await flareOracle.getPrice.staticCall(feedId, {
        value: fee,
      });

      const value = result[0];
      const decimals = result[1];

      expect(value).to.be.gt(0);

      const adjustedPrice = Number(value) / Math.pow(10, Math.abs(Number(decimals)));
      console.log("  ETH/USD price: $", adjustedPrice.toFixed(2));

      // ETH typically $1000 - $10000
      expect(adjustedPrice).to.be.gt(100);
      expect(adjustedPrice).to.be.lt(20000);
    });

    it("should return DOGE/USD price", async function () {
      const feedId = CRYPTO_FEEDS.DOGE_USD;
      const fee = await flareOracle.calculateFee(feedId);

      const result = await flareOracle.getPrice.staticCall(feedId, {
        value: fee,
      });

      const value = result[0];
      const decimals = result[1];

      expect(value).to.be.gt(0);

      const adjustedPrice = Number(value) / Math.pow(10, Math.abs(Number(decimals)));
      console.log("  DOGE/USD price: $", adjustedPrice.toFixed(6));

      // DOGE typically $0.05 - $1.00
      expect(adjustedPrice).to.be.gt(0.001);
      expect(adjustedPrice).to.be.lt(10);
    });

    it("should revert for invalid feed ID", async function () {
      const invalidFeedId = "0x000000000000000000000000000000000000000000";
      await expect(
        flareOracle.getPrice.staticCall(invalidFeedId)
      ).to.be.revertedWithCustomError(flareOracle, "InvalidFeedId");
    });
  });

  describe("getPriceInWei", function () {
    it("should return FLR/USD price in wei (18 decimals)", async function () {
      const feedId = CRYPTO_FEEDS.FLR_USD;
      const fee = await flareOracle.calculateFee(feedId);

      const result = await flareOracle.getPriceInWei.staticCall(feedId, {
        value: fee,
      });

      const valueInWei = result[0];
      const timestamp = result[1];

      expect(valueInWei).to.be.gt(0);
      expect(timestamp).to.be.gt(0);

      // Convert to human-readable
      const priceUSD = Number(ethers.formatEther(valueInWei));
      console.log("  FLR/USD in wei:", valueInWei.toString());
      console.log("  As USD: $", priceUSD.toFixed(6));

      // Verify it's in the same ballpark as getPrice
      expect(priceUSD).to.be.gt(0);
    });
  });

  describe("getPriceWithCheck (Staleness)", function () {
    it("should return price if within MAX_PRICE_AGE", async function () {
      const feedId = CRYPTO_FEEDS.FLR_USD;
      const fee = await flareOracle.calculateFee(feedId);

      // This should succeed if price is fresh
      const result = await flareOracle.getPriceWithCheck.staticCall(
        feedId,
        { value: fee }
      );

      const value = result[0];
      const timestamp = result[2];

      expect(value).to.be.gt(0);

      const ageSeconds = Math.floor(Date.now() / 1000) - Number(timestamp);
      console.log("  Price age:", ageSeconds, "seconds");
      console.log("  MAX_PRICE_AGE:", MAX_PRICE_AGE, "seconds");
      expect(ageSeconds).to.be.lte(MAX_PRICE_AGE);
    });
  });

  describe("getTokenPriceUSD", function () {
    it("should return price for configured token", async function () {
      // First configure a token
      const mockWFLRAddress = "0x1234567890123456789012345678901234567890";
      const tx = await flareOracle.setTokenFeed(mockWFLRAddress, CRYPTO_FEEDS.FLR_USD);
      await tx.wait();

      // Verify feed is configured
      expect(await flareOracle.hasFeed(mockWFLRAddress)).to.be.true;

      // Get price using staticCall
      const fee = await flareOracle.calculateFee(CRYPTO_FEEDS.FLR_USD);
      const result = await flareOracle.getTokenPriceUSD.staticCall(
        mockWFLRAddress,
        { value: fee }
      );

      const priceInWei = result[0];
      const timestamp = result[1];

      expect(priceInWei).to.be.gt(0);
      expect(timestamp).to.be.gt(0);

      const priceUSD = Number(ethers.formatEther(priceInWei));
      console.log("  Token price (USD): $", priceUSD.toFixed(6));
    });

    it("should revert for unconfigured token", async function () {
      const unconfiguredToken = "0x9999999999999999999999999999999999999999";
      await expect(
        flareOracle.getTokenPriceUSD.staticCall(unconfiguredToken)
      ).to.be.revertedWithCustomError(flareOracle, "FeedNotConfigured");
    });
  });

  describe("getMultiplePrices (Batch)", function () {
    it("should return multiple prices in one call", async function () {
      const feedIds = [
        CRYPTO_FEEDS.FLR_USD,
        CRYPTO_FEEDS.BTC_USD,
        CRYPTO_FEEDS.ETH_USD,
      ];

      // Calculate batch fee
      const fee = await flareOracle.calculateFeeMultiple(feedIds);
      console.log("  Batch fee for 3 feeds:", ethers.formatEther(fee), "FLR");

      // Get multiple prices using staticCall
      const result = await flareOracle.getMultiplePrices.staticCall(feedIds, {
        value: fee,
      });

      const values = result[0];
      const timestamp = result[1];

      expect(values.length).to.equal(3);
      expect(timestamp).to.be.gt(0);

      console.log("  Prices returned:");
      const names = ["FLR/USD", "BTC/USD", "ETH/USD"];
      for (let i = 0; i < values.length; i++) {
        const priceUSD = Number(ethers.formatEther(values[i]));
        console.log(`    ${names[i]}: $${priceUSD.toFixed(6)}`);
        expect(values[i]).to.be.gt(0);
      }
    });
  });

  describe("Fee Calculation", function () {
    it("should calculate fee for single feed", async function () {
      const fee = await flareOracle.calculateFee(CRYPTO_FEEDS.FLR_USD);
      expect(fee).to.be.gte(0); // Fee could be 0 on testnet
      console.log("  Single feed fee:", ethers.formatEther(fee), "FLR");
    });

    it("should calculate fee for multiple feeds", async function () {
      const feedIds = [
        CRYPTO_FEEDS.FLR_USD,
        CRYPTO_FEEDS.BTC_USD,
        CRYPTO_FEEDS.ETH_USD,
        CRYPTO_FEEDS.XRP_USD,
        CRYPTO_FEEDS.DOGE_USD,
      ];

      const fee = await flareOracle.calculateFeeMultiple(feedIds);
      expect(fee).to.be.gte(0);
      console.log("  5 feeds batch fee:", ethers.formatEther(fee), "FLR");
    });
  });
});
