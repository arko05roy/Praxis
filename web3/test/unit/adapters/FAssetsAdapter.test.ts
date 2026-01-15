import { expect } from "chai";
import { network } from "hardhat";

const { ethers } = await network.connect();

/**
 * FAssetsAdapter Unit Tests
 *
 * Tests the FAssets adapter functionality including detection,
 * info queries, and DEX integration.
 */
describe("FAssetsAdapter", function () {
  // Contract instances
  let fAssetsAdapter: any;
  let mockSwapRouter: any;
  let mockFXRP: any;
  let mockFBTC: any;
  let mockWFLR: any;
  let owner: any;
  let user: any;

  // Test constants
  const ZERO_ADDRESS = "0x0000000000000000000000000000000000000000";

  // Feed IDs for FTSO (XRP/USD and BTC/USD)
  // Format: 0x01 + "XRP/USD" padded to 20 bytes
  const XRP_FEED_ID = "0x015852502f55534400000000000000000000000000";
  const BTC_FEED_ID = "0x014254432f55534400000000000000000000000000";

  beforeEach(async function () {
    // Get signers
    [owner, user] = await ethers.getSigners();

    // Deploy mock SwapRouter
    const MockSwapRouter = await ethers.getContractFactory("MockSwapRouter");
    mockSwapRouter = await MockSwapRouter.deploy();
    await mockSwapRouter.waitForDeployment();

    // Deploy mock ERC20 tokens (simulating FAssets)
    const MockToken = await ethers.getContractFactory("MockERC20");

    // FXRP: 6 decimals (like XRP)
    mockFXRP = await MockToken.deploy("FAsset XRP", "FXRP", 6);
    await mockFXRP.waitForDeployment();

    // FBTC: 8 decimals (like BTC)
    mockFBTC = await MockToken.deploy("FAsset BTC", "FBTC", 8);
    await mockFBTC.waitForDeployment();

    // WFLR: 18 decimals
    mockWFLR = await MockToken.deploy("Wrapped FLR", "WFLR", 18);
    await mockWFLR.waitForDeployment();

    // Deploy FAssetsAdapter
    const FAssetsAdapter = await ethers.getContractFactory("FAssetsAdapter");
    fAssetsAdapter = await FAssetsAdapter.deploy(
      await mockSwapRouter.getAddress()
    );
    await fAssetsAdapter.waitForDeployment();
  });

  describe("Deployment", function () {
    it("should set correct owner", async function () {
      expect(await fAssetsAdapter.owner()).to.equal(await owner.getAddress());
    });

    it("should set correct SwapRouter", async function () {
      expect(await fAssetsAdapter.swapRouter()).to.equal(
        await mockSwapRouter.getAddress()
      );
    });

    it("should start with no registered FAssets", async function () {
      expect(await fAssetsAdapter.getFAssetCount()).to.equal(0);
    });

    it("should have correct MAX_FASSETS constant", async function () {
      expect(await fAssetsAdapter.MAX_FASSETS()).to.equal(10);
    });

    it("should revert deployment with zero SwapRouter address", async function () {
      const FAssetsAdapter = await ethers.getContractFactory("FAssetsAdapter");
      await expect(
        FAssetsAdapter.deploy(ZERO_ADDRESS)
      ).to.be.revertedWithCustomError(fAssetsAdapter, "ZeroAddress");
    });
  });

  describe("registerFAsset", function () {
    it("should allow owner to register FAsset", async function () {
      const fxrpAddress = await mockFXRP.getAddress();

      await fAssetsAdapter.registerFAsset(fxrpAddress, "XRP", XRP_FEED_ID);

      expect(await fAssetsAdapter.getFAssetCount()).to.equal(1);
      expect(await fAssetsAdapter.isFAssetRegistered(fxrpAddress)).to.be.true;
      expect(await fAssetsAdapter.fAssetToUnderlying(fxrpAddress)).to.equal(
        "XRP"
      );
    });

    it("should emit FAssetRegistered event", async function () {
      const fxrpAddress = await mockFXRP.getAddress();

      await expect(
        fAssetsAdapter.registerFAsset(fxrpAddress, "XRP", XRP_FEED_ID)
      )
        .to.emit(fAssetsAdapter, "FAssetRegistered")
        .withArgs(fxrpAddress, "FXRP", "XRP");
    });

    it("should revert for non-owner", async function () {
      const fxrpAddress = await mockFXRP.getAddress();

      await expect(
        fAssetsAdapter
          .connect(user)
          .registerFAsset(fxrpAddress, "XRP", XRP_FEED_ID)
      ).to.be.revertedWithCustomError(fAssetsAdapter, "OwnableUnauthorizedAccount");
    });

    it("should revert for zero address", async function () {
      await expect(
        fAssetsAdapter.registerFAsset(ZERO_ADDRESS, "XRP", XRP_FEED_ID)
      ).to.be.revertedWithCustomError(fAssetsAdapter, "ZeroAddress");
    });

    it("should revert for already registered FAsset", async function () {
      const fxrpAddress = await mockFXRP.getAddress();

      await fAssetsAdapter.registerFAsset(fxrpAddress, "XRP", XRP_FEED_ID);

      await expect(
        fAssetsAdapter.registerFAsset(fxrpAddress, "XRP", XRP_FEED_ID)
      ).to.be.revertedWithCustomError(fAssetsAdapter, "FAssetAlreadyRegistered");
    });
  });

  describe("removeFAsset", function () {
    beforeEach(async function () {
      const fxrpAddress = await mockFXRP.getAddress();
      await fAssetsAdapter.registerFAsset(fxrpAddress, "XRP", XRP_FEED_ID);
    });

    it("should allow owner to remove FAsset", async function () {
      const fxrpAddress = await mockFXRP.getAddress();

      await fAssetsAdapter.removeFAsset(fxrpAddress);

      expect(await fAssetsAdapter.getFAssetCount()).to.equal(0);
      expect(await fAssetsAdapter.isFAssetRegistered(fxrpAddress)).to.be.false;
    });

    it("should emit FAssetRemoved event", async function () {
      const fxrpAddress = await mockFXRP.getAddress();

      await expect(fAssetsAdapter.removeFAsset(fxrpAddress)).to.emit(
        fAssetsAdapter,
        "FAssetRemoved"
      );
    });

    it("should revert for non-owner", async function () {
      const fxrpAddress = await mockFXRP.getAddress();

      await expect(
        fAssetsAdapter.connect(user).removeFAsset(fxrpAddress)
      ).to.be.revertedWithCustomError(fAssetsAdapter, "OwnableUnauthorizedAccount");
    });

    it("should revert for unregistered FAsset", async function () {
      const fbtcAddress = await mockFBTC.getAddress();

      await expect(
        fAssetsAdapter.removeFAsset(fbtcAddress)
      ).to.be.revertedWithCustomError(fAssetsAdapter, "NotFAsset");
    });
  });

  describe("Detection Functions", function () {
    beforeEach(async function () {
      const fxrpAddress = await mockFXRP.getAddress();
      const fbtcAddress = await mockFBTC.getAddress();

      await fAssetsAdapter.registerFAsset(fxrpAddress, "XRP", XRP_FEED_ID);
      await fAssetsAdapter.registerFAsset(fbtcAddress, "BTC", BTC_FEED_ID);
    });

    describe("isFAsset", function () {
      it("should return true for registered FAsset", async function () {
        const fxrpAddress = await mockFXRP.getAddress();
        expect(await fAssetsAdapter.isFAsset(fxrpAddress)).to.be.true;
      });

      it("should return false for non-FAsset", async function () {
        const wflrAddress = await mockWFLR.getAddress();
        expect(await fAssetsAdapter.isFAsset(wflrAddress)).to.be.false;
      });
    });

    describe("getAllFAssets", function () {
      it("should return all registered FAssets", async function () {
        const fAssets = await fAssetsAdapter.getAllFAssets();

        expect(fAssets.length).to.equal(2);
        expect(fAssets).to.include(await mockFXRP.getAddress());
        expect(fAssets).to.include(await mockFBTC.getAddress());
      });
    });

    describe("getFAssetCount", function () {
      it("should return correct count", async function () {
        expect(await fAssetsAdapter.getFAssetCount()).to.equal(2);
      });
    });
  });

  describe("Info Functions", function () {
    beforeEach(async function () {
      const fxrpAddress = await mockFXRP.getAddress();
      await fAssetsAdapter.registerFAsset(fxrpAddress, "XRP", XRP_FEED_ID);

      // Mint some FXRP to simulate existing supply
      await mockFXRP.mint(await user.getAddress(), 1000000000); // 1000 FXRP
    });

    describe("getFAssetInfo", function () {
      it("should return correct info struct", async function () {
        const fxrpAddress = await mockFXRP.getAddress();
        const info = await fAssetsAdapter.getFAssetInfo(fxrpAddress);

        expect(info.fAssetAddress).to.equal(fxrpAddress);
        expect(info.symbol).to.equal("FXRP");
        expect(info.underlying).to.equal("XRP");
        expect(info.totalMinted).to.equal(1000000000n);
        expect(info.collateralRatio).to.equal(130n);
      });

      it("should revert for non-FAsset", async function () {
        const wflrAddress = await mockWFLR.getAddress();

        await expect(
          fAssetsAdapter.getFAssetInfo(wflrAddress)
        ).to.be.revertedWithCustomError(fAssetsAdapter, "NotFAsset");
      });
    });

    describe("getUnderlyingAsset", function () {
      it("should return correct underlying", async function () {
        const fxrpAddress = await mockFXRP.getAddress();
        expect(await fAssetsAdapter.getUnderlyingAsset(fxrpAddress)).to.equal(
          "XRP"
        );
      });
    });

    describe("getFAssetSymbol", function () {
      it("should return correct symbol", async function () {
        const fxrpAddress = await mockFXRP.getAddress();
        expect(await fAssetsAdapter.getFAssetSymbol(fxrpAddress)).to.equal(
          "FXRP"
        );
      });
    });

    describe("getFAssetDecimals", function () {
      it("should return correct decimals", async function () {
        const fxrpAddress = await mockFXRP.getAddress();
        expect(await fAssetsAdapter.getFAssetDecimals(fxrpAddress)).to.equal(6);
      });
    });

    describe("getFAssetTotalSupply", function () {
      it("should return correct total supply", async function () {
        const fxrpAddress = await mockFXRP.getAddress();
        expect(await fAssetsAdapter.getFAssetTotalSupply(fxrpAddress)).to.equal(
          1000000000n
        );
      });
    });

    describe("getFAssetBalance", function () {
      it("should return correct balance", async function () {
        const fxrpAddress = await mockFXRP.getAddress();
        expect(
          await fAssetsAdapter.getFAssetBalance(
            fxrpAddress,
            await user.getAddress()
          )
        ).to.equal(1000000000n);
      });

      it("should return zero for address with no balance", async function () {
        const fxrpAddress = await mockFXRP.getAddress();
        expect(
          await fAssetsAdapter.getFAssetBalance(
            fxrpAddress,
            await owner.getAddress()
          )
        ).to.equal(0);
      });
    });
  });

  describe("DEX Integration", function () {
    beforeEach(async function () {
      const fxrpAddress = await mockFXRP.getAddress();
      await fAssetsAdapter.registerFAsset(fxrpAddress, "XRP", XRP_FEED_ID);
    });

    describe("isSwapSupported", function () {
      it("should return true when SwapRouter supports pair and involves FAsset", async function () {
        const fxrpAddress = await mockFXRP.getAddress();
        const wflrAddress = await mockWFLR.getAddress();

        await mockSwapRouter.setPairSupported(true);

        expect(
          await fAssetsAdapter.isSwapSupported(fxrpAddress, wflrAddress)
        ).to.be.true;
      });

      it("should return false when neither token is FAsset", async function () {
        const wflrAddress = await mockWFLR.getAddress();
        const randomAddress = await user.getAddress();

        expect(
          await fAssetsAdapter.isSwapSupported(wflrAddress, randomAddress)
        ).to.be.false;
      });

      it("should return false when SwapRouter doesn't support pair", async function () {
        const fxrpAddress = await mockFXRP.getAddress();
        const wflrAddress = await mockWFLR.getAddress();

        await mockSwapRouter.setPairSupported(false);

        expect(
          await fAssetsAdapter.isSwapSupported(fxrpAddress, wflrAddress)
        ).to.be.false;
      });
    });

    describe("getSwapQuote", function () {
      it("should return quote from SwapRouter", async function () {
        const fxrpAddress = await mockFXRP.getAddress();
        const wflrAddress = await mockWFLR.getAddress();
        const amountIn = ethers.parseUnits("100", 6); // 100 FXRP

        await mockSwapRouter.setBestRoute(
          await mockSwapRouter.getAddress(),
          ethers.parseEther("1000")
        );

        const [amountOut, route] = await fAssetsAdapter.getSwapQuote(
          fxrpAddress,
          wflrAddress,
          amountIn
        );

        expect(amountOut).to.equal(ethers.parseEther("1000"));
        expect(route).to.equal("MockSwapRouter");
      });

      it("should revert when no route available", async function () {
        const fxrpAddress = await mockFXRP.getAddress();
        const wflrAddress = await mockWFLR.getAddress();
        const amountIn = ethers.parseUnits("100", 6);

        // Set no best adapter
        await mockSwapRouter.setBestRoute(ZERO_ADDRESS, 0);

        await expect(
          fAssetsAdapter.getSwapQuote(fxrpAddress, wflrAddress, amountIn)
        ).to.be.revertedWithCustomError(fAssetsAdapter, "SwapNotSupported");
      });
    });
  });

  describe("Liquidity Info", function () {
    beforeEach(async function () {
      const fxrpAddress = await mockFXRP.getAddress();
      await fAssetsAdapter.registerFAsset(fxrpAddress, "XRP", XRP_FEED_ID);
    });

    describe("addPool", function () {
      it("should allow owner to add pool", async function () {
        const fxrpAddress = await mockFXRP.getAddress();
        const poolAddress = await user.getAddress(); // Using user address as mock pool

        await fAssetsAdapter.addPool(fxrpAddress, poolAddress);

        const [pools] = await fAssetsAdapter.getBestPools(fxrpAddress);
        expect(pools.length).to.equal(1);
        expect(pools[0]).to.equal(poolAddress);
      });

      it("should revert for non-FAsset", async function () {
        const wflrAddress = await mockWFLR.getAddress();
        const poolAddress = await user.getAddress();

        await expect(
          fAssetsAdapter.addPool(wflrAddress, poolAddress)
        ).to.be.revertedWithCustomError(fAssetsAdapter, "NotFAsset");
      });
    });

    describe("getBestPools", function () {
      it("should return pools with liquidity estimates", async function () {
        const fxrpAddress = await mockFXRP.getAddress();
        const poolAddress = await user.getAddress();

        // Add pool
        await fAssetsAdapter.addPool(fxrpAddress, poolAddress);

        // Mint FXRP to "pool"
        await mockFXRP.mint(poolAddress, ethers.parseUnits("10000", 6));

        const [pools, liquidities] = await fAssetsAdapter.getBestPools(
          fxrpAddress
        );

        expect(pools.length).to.equal(1);
        expect(liquidities[0]).to.equal(ethers.parseUnits("10000", 6));
      });
    });
  });

  describe("Admin Functions", function () {
    describe("setSwapRouter", function () {
      it("should allow owner to update SwapRouter", async function () {
        const newRouter = await user.getAddress();

        await fAssetsAdapter.setSwapRouter(newRouter);

        expect(await fAssetsAdapter.swapRouter()).to.equal(newRouter);
      });

      it("should revert for non-owner", async function () {
        const newRouter = await user.getAddress();

        await expect(
          fAssetsAdapter.connect(user).setSwapRouter(newRouter)
        ).to.be.revertedWithCustomError(fAssetsAdapter, "OwnableUnauthorizedAccount");
      });

      it("should revert for zero address", async function () {
        await expect(
          fAssetsAdapter.setSwapRouter(ZERO_ADDRESS)
        ).to.be.revertedWithCustomError(fAssetsAdapter, "ZeroAddress");
      });
    });

    describe("setFeedId", function () {
      beforeEach(async function () {
        const fxrpAddress = await mockFXRP.getAddress();
        await fAssetsAdapter.registerFAsset(fxrpAddress, "XRP", XRP_FEED_ID);
      });

      it("should allow owner to update feed ID", async function () {
        const fxrpAddress = await mockFXRP.getAddress();
        // bytes21: 21 bytes = 42 hex chars after 0x, so total 44 chars
        const newFeedId =
          "0x015852502f55534432000000000000000000000000"; // XRP/USD2

        await fAssetsAdapter.setFeedId(fxrpAddress, newFeedId);

        expect(await fAssetsAdapter.fAssetToFeedId(fxrpAddress)).to.equal(
          newFeedId
        );
      });

      it("should revert for non-FAsset", async function () {
        const wflrAddress = await mockWFLR.getAddress();

        await expect(
          fAssetsAdapter.setFeedId(wflrAddress, XRP_FEED_ID)
        ).to.be.revertedWithCustomError(fAssetsAdapter, "NotFAsset");
      });
    });

    describe("rescueTokens", function () {
      it("should allow owner to rescue tokens", async function () {
        const adapterAddress = await fAssetsAdapter.getAddress();
        const ownerAddress = await owner.getAddress();
        const amount = ethers.parseUnits("100", 6);

        // Mint tokens to adapter
        await mockFXRP.mint(adapterAddress, amount);

        // Rescue tokens
        await fAssetsAdapter.rescueTokens(
          await mockFXRP.getAddress(),
          ownerAddress,
          amount
        );

        expect(await mockFXRP.balanceOf(ownerAddress)).to.equal(amount);
      });

      it("should revert for non-owner", async function () {
        await expect(
          fAssetsAdapter
            .connect(user)
            .rescueTokens(
              await mockFXRP.getAddress(),
              await user.getAddress(),
              100
            )
        ).to.be.revertedWithCustomError(fAssetsAdapter, "OwnableUnauthorizedAccount");
      });
    });
  });

  describe("Receive Function", function () {
    it("should accept native token for FTSO fees", async function () {
      const amount = ethers.parseEther("1");
      const adapterAddress = await fAssetsAdapter.getAddress();

      await owner.sendTransaction({
        to: adapterAddress,
        value: amount,
      });

      expect(await ethers.provider.getBalance(adapterAddress)).to.equal(amount);
    });
  });
});
