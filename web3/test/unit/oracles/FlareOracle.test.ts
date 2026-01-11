import { expect } from "chai";
import { network } from "hardhat";
import { CRYPTO_FEEDS } from "../../../scripts/helpers/feedIds.js";

const { ethers } = await network.connect();

/**
 * FlareOracle Unit Tests
 *
 * These tests run on Hardhat local network and mock the FTSO where needed.
 * For integration tests against real Coston2, see test/integration/
 */
describe("FlareOracle", function () {
  // Contract instance
  let flareOracle: any;
  let owner: any;
  let user: any;

  // Test constants
  const MAX_PRICE_AGE = 300; // 5 minutes
  const ZERO_ADDRESS = "0x0000000000000000000000000000000000000000";
  const ZERO_FEED_ID =
    "0x000000000000000000000000000000000000000000";

  beforeEach(async function () {
    // Get signers
    [owner, user] = await ethers.getSigners();

    // Deploy FlareOracle
    const FlareOracle = await ethers.getContractFactory("FlareOracle");
    flareOracle = await FlareOracle.deploy(MAX_PRICE_AGE);
    await flareOracle.waitForDeployment();
  });

  describe("Deployment", function () {
    it("should set correct owner", async function () {
      expect(await flareOracle.owner()).to.equal(await owner.getAddress());
    });

    it("should set correct max price age", async function () {
      expect(await flareOracle.maxPriceAge()).to.equal(MAX_PRICE_AGE);
    });

    it("should use default max price age when 0 is passed", async function () {
      const FlareOracle = await ethers.getContractFactory("FlareOracle");
      const oracle = await FlareOracle.deploy(0);
      await oracle.waitForDeployment();

      // DEFAULT_MAX_PRICE_AGE = 300
      expect(await oracle.maxPriceAge()).to.equal(300);
    });
  });

  describe("setTokenFeed", function () {
    const mockToken = "0x1234567890123456789012345678901234567890";
    const mockFeedId = CRYPTO_FEEDS.FLR_USD;

    it("should allow owner to set token feed", async function () {
      await flareOracle.setTokenFeed(mockToken, mockFeedId);

      expect(await flareOracle.tokenFeeds(mockToken)).to.equal(mockFeedId);
      expect(await flareOracle.hasFeed(mockToken)).to.be.true;
    });

    it("should emit FeedConfigured event", async function () {
      await expect(flareOracle.setTokenFeed(mockToken, mockFeedId))
        .to.emit(flareOracle, "FeedConfigured")
        .withArgs(mockToken, mockFeedId);
    });

    it("should revert for non-owner", async function () {
      await expect(
        flareOracle.connect(user).setTokenFeed(mockToken, mockFeedId)
      ).to.be.revertedWithCustomError(flareOracle, "OnlyOwner");
    });

    it("should revert for zero address token", async function () {
      await expect(
        flareOracle.setTokenFeed(ZERO_ADDRESS, mockFeedId)
      ).to.be.revertedWithCustomError(flareOracle, "ZeroAddress");
    });

    it("should revert for zero feed ID", async function () {
      await expect(
        flareOracle.setTokenFeed(mockToken, ZERO_FEED_ID)
      ).to.be.revertedWithCustomError(flareOracle, "InvalidFeedId");
    });
  });

  describe("setTokenFeeds (batch)", function () {
    const mockTokens = [
      "0x1234567890123456789012345678901234567890",
      "0x2345678901234567890123456789012345678901",
      "0x3456789012345678901234567890123456789012",
    ];
    const mockFeedIds = [
      CRYPTO_FEEDS.FLR_USD,
      CRYPTO_FEEDS.BTC_USD,
      CRYPTO_FEEDS.ETH_USD,
    ];

    it("should allow owner to set multiple token feeds", async function () {
      await flareOracle.setTokenFeeds(mockTokens, mockFeedIds);

      for (let i = 0; i < mockTokens.length; i++) {
        expect(await flareOracle.tokenFeeds(mockTokens[i])).to.equal(
          mockFeedIds[i]
        );
        expect(await flareOracle.hasFeed(mockTokens[i])).to.be.true;
      }
    });

    it("should revert for array length mismatch", async function () {
      await expect(
        flareOracle.setTokenFeeds(mockTokens, [mockFeedIds[0]])
      ).to.be.revertedWithCustomError(flareOracle, "ArrayLengthMismatch");
    });

    it("should revert for non-owner", async function () {
      await expect(
        flareOracle.connect(user).setTokenFeeds(mockTokens, mockFeedIds)
      ).to.be.revertedWithCustomError(flareOracle, "OnlyOwner");
    });
  });

  describe("removeTokenFeed", function () {
    const mockToken = "0x1234567890123456789012345678901234567890";
    const mockFeedId = CRYPTO_FEEDS.FLR_USD;

    beforeEach(async function () {
      // Setup: Add a feed first
      await flareOracle.setTokenFeed(mockToken, mockFeedId);
    });

    it("should allow owner to remove token feed", async function () {
      await flareOracle.removeTokenFeed(mockToken);

      expect(await flareOracle.hasFeed(mockToken)).to.be.false;
    });

    it("should emit FeedRemoved event", async function () {
      await expect(flareOracle.removeTokenFeed(mockToken))
        .to.emit(flareOracle, "FeedRemoved")
        .withArgs(mockToken);
    });

    it("should revert for non-owner", async function () {
      await expect(
        flareOracle.connect(user).removeTokenFeed(mockToken)
      ).to.be.revertedWithCustomError(flareOracle, "OnlyOwner");
    });

    it("should revert if feed not configured", async function () {
      const unconfiguredToken =
        "0x9999999999999999999999999999999999999999";
      await expect(
        flareOracle.removeTokenFeed(unconfiguredToken)
      ).to.be.revertedWithCustomError(flareOracle, "FeedNotConfigured");
    });
  });

  describe("setMaxPriceAge", function () {
    const newMaxAge = 600; // 10 minutes

    it("should allow owner to update max price age", async function () {
      await flareOracle.setMaxPriceAge(newMaxAge);
      expect(await flareOracle.maxPriceAge()).to.equal(newMaxAge);
    });

    it("should emit MaxPriceAgeUpdated event", async function () {
      await expect(flareOracle.setMaxPriceAge(newMaxAge))
        .to.emit(flareOracle, "MaxPriceAgeUpdated")
        .withArgs(MAX_PRICE_AGE, newMaxAge);
    });

    it("should revert for non-owner", async function () {
      await expect(
        flareOracle.connect(user).setMaxPriceAge(newMaxAge)
      ).to.be.revertedWithCustomError(flareOracle, "OnlyOwner");
    });

    it("should revert for zero value", async function () {
      await expect(
        flareOracle.setMaxPriceAge(0)
      ).to.be.revertedWithCustomError(flareOracle, "ZeroAmount");
    });
  });

  describe("transferOwnership", function () {
    it("should allow owner to transfer ownership", async function () {
      const userAddress = await user.getAddress();
      await flareOracle.transferOwnership(userAddress);
      expect(await flareOracle.owner()).to.equal(userAddress);
    });

    it("should emit OwnershipTransferred event", async function () {
      const ownerAddress = await owner.getAddress();
      const userAddress = await user.getAddress();

      await expect(flareOracle.transferOwnership(userAddress))
        .to.emit(flareOracle, "OwnershipTransferred")
        .withArgs(ownerAddress, userAddress);
    });

    it("should revert for non-owner", async function () {
      const userAddress = await user.getAddress();
      await expect(
        flareOracle.connect(user).transferOwnership(userAddress)
      ).to.be.revertedWithCustomError(flareOracle, "OnlyOwner");
    });

    it("should revert for zero address", async function () {
      await expect(
        flareOracle.transferOwnership(ZERO_ADDRESS)
      ).to.be.revertedWithCustomError(flareOracle, "ZeroAddress");
    });
  });

  describe("View Functions", function () {
    const mockToken = "0x1234567890123456789012345678901234567890";
    const mockFeedId = CRYPTO_FEEDS.FLR_USD;

    beforeEach(async function () {
      await flareOracle.setTokenFeed(mockToken, mockFeedId);
    });

    it("getTokenFeed should return configured feed ID", async function () {
      expect(await flareOracle.getTokenFeed(mockToken)).to.equal(mockFeedId);
    });

    it("getTokenFeed should return zero for unconfigured token", async function () {
      const unconfiguredToken =
        "0x9999999999999999999999999999999999999999";
      expect(await flareOracle.getTokenFeed(unconfiguredToken)).to.equal(
        ZERO_FEED_ID
      );
    });

    it("isTokenConfigured should return true for configured token", async function () {
      expect(await flareOracle.isTokenConfigured(mockToken)).to.be.true;
    });

    it("isTokenConfigured should return false for unconfigured token", async function () {
      const unconfiguredToken =
        "0x9999999999999999999999999999999999999999";
      expect(await flareOracle.isTokenConfigured(unconfiguredToken)).to.be
        .false;
    });
  });

  describe("Constants", function () {
    it("should have correct DEFAULT_MAX_PRICE_AGE", async function () {
      expect(await flareOracle.DEFAULT_MAX_PRICE_AGE()).to.equal(300);
    });

    it("should have correct PRICE_PRECISION", async function () {
      expect(await flareOracle.PRICE_PRECISION()).to.equal(
        ethers.parseEther("1")
      );
    });
  });

  describe("Receive Function", function () {
    it("should accept native token", async function () {
      const amount = ethers.parseEther("1");
      const oracleAddress = await flareOracle.getAddress();

      await owner.sendTransaction({
        to: oracleAddress,
        value: amount,
      });

      expect(await ethers.provider.getBalance(oracleAddress)).to.equal(
        amount
      );
    });
  });
});
