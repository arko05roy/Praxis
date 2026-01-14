import { expect } from "chai";
import { network } from "hardhat";

const { ethers } = await network.connect();

/**
 * PerpetualRouter Unit Tests
 *
 * Tests the perpetual aggregator functionality including adapter registry,
 * market queries, position management, and margin operations.
 */
describe("PerpetualRouter", function () {
  // Contract instances
  let perpetualRouter: any;
  let mockAdapter: any;
  let mockAdapter2: any;
  let mockToken: any;
  let owner: any;
  let user: any;

  // Test constants
  const ZERO_ADDRESS = "0x0000000000000000000000000000000000000000";
  const BTC_USD_MARKET = ethers.encodeBytes32String("BTC/USD");
  const ETH_USD_MARKET = ethers.encodeBytes32String("ETH/USD");

  beforeEach(async function () {
    // Get signers
    [owner, user] = await ethers.getSigners();

    // Deploy mock ERC20 token (collateral)
    const MockToken = await ethers.getContractFactory("MockERC20");
    mockToken = await MockToken.deploy("Mock USDT", "USDT", 6);
    await mockToken.waitForDeployment();
    const mockTokenAddress = await mockToken.getAddress();

    // Deploy PerpetualRouter
    const PerpetualRouter = await ethers.getContractFactory("PerpetualRouter");
    perpetualRouter = await PerpetualRouter.deploy();
    await perpetualRouter.waitForDeployment();

    // Deploy mock perpetual adapters
    const MockPerpAdapter = await ethers.getContractFactory(
      "MockPerpetualAdapter"
    );
    mockAdapter = await MockPerpAdapter.deploy("Mock Perp 1", mockTokenAddress);
    await mockAdapter.waitForDeployment();

    mockAdapter2 = await MockPerpAdapter.deploy("Mock Perp 2", mockTokenAddress);
    await mockAdapter2.waitForDeployment();

    // Add markets to mock adapters
    await mockAdapter.addMarket(BTC_USD_MARKET, "BTC/USD", 100);
    await mockAdapter.addMarket(ETH_USD_MARKET, "ETH/USD", 50);
    await mockAdapter2.addMarket(BTC_USD_MARKET, "BTC/USD", 100);

    // Mint tokens to user for testing
    const userAddress = await user.getAddress();
    await mockToken.mint(userAddress, ethers.parseUnits("100000", 6));
  });

  describe("Deployment", function () {
    it("should set correct owner", async function () {
      expect(await perpetualRouter.owner()).to.equal(await owner.getAddress());
    });

    it("should start with no adapters", async function () {
      expect(await perpetualRouter.getAdapterCount()).to.equal(0);
    });

    it("should have correct MAX_ADAPTERS constant", async function () {
      expect(await perpetualRouter.MAX_ADAPTERS()).to.equal(20);
    });
  });

  describe("addAdapter", function () {
    it("should allow owner to add adapter", async function () {
      const adapterAddress = await mockAdapter.getAddress();
      await perpetualRouter.addAdapter(adapterAddress);

      expect(await perpetualRouter.getAdapterCount()).to.equal(1);
      expect(await perpetualRouter.isAdapterActive(adapterAddress)).to.be.true;
    });

    it("should emit PerpAdapterAdded event", async function () {
      const adapterAddress = await mockAdapter.getAddress();
      await expect(perpetualRouter.addAdapter(adapterAddress))
        .to.emit(perpetualRouter, "PerpAdapterAdded")
        .withArgs(adapterAddress, "Mock Perp 1", 100n); // 100x leverage
    });

    it("should revert for non-owner", async function () {
      const adapterAddress = await mockAdapter.getAddress();
      await expect(
        perpetualRouter.connect(user).addAdapter(adapterAddress)
      ).to.be.revertedWithCustomError(
        perpetualRouter,
        "OwnableUnauthorizedAccount"
      );
    });

    it("should revert for zero address", async function () {
      await expect(
        perpetualRouter.addAdapter(ZERO_ADDRESS)
      ).to.be.revertedWithCustomError(perpetualRouter, "ZeroAddress");
    });

    it("should revert for already registered adapter", async function () {
      const adapterAddress = await mockAdapter.getAddress();
      await perpetualRouter.addAdapter(adapterAddress);

      await expect(
        perpetualRouter.addAdapter(adapterAddress)
      ).to.be.revertedWithCustomError(perpetualRouter, "InvalidAdapter");
    });
  });

  describe("removeAdapter", function () {
    beforeEach(async function () {
      const adapterAddress = await mockAdapter.getAddress();
      await perpetualRouter.addAdapter(adapterAddress);
    });

    it("should allow owner to remove adapter", async function () {
      const adapterAddress = await mockAdapter.getAddress();
      await perpetualRouter.removeAdapter(adapterAddress);

      expect(await perpetualRouter.getAdapterCount()).to.equal(0);
      expect(await perpetualRouter.isAdapterActive(adapterAddress)).to.be.false;
    });

    it("should emit PerpAdapterRemoved event", async function () {
      const adapterAddress = await mockAdapter.getAddress();
      await expect(perpetualRouter.removeAdapter(adapterAddress))
        .to.emit(perpetualRouter, "PerpAdapterRemoved")
        .withArgs(adapterAddress);
    });

    it("should revert for non-owner", async function () {
      const adapterAddress = await mockAdapter.getAddress();
      await expect(
        perpetualRouter.connect(user).removeAdapter(adapterAddress)
      ).to.be.revertedWithCustomError(
        perpetualRouter,
        "OwnableUnauthorizedAccount"
      );
    });

    it("should revert for unregistered adapter", async function () {
      const adapter2Address = await mockAdapter2.getAddress();
      await expect(
        perpetualRouter.removeAdapter(adapter2Address)
      ).to.be.revertedWithCustomError(perpetualRouter, "InvalidAdapter");
    });
  });

  describe("Market Queries", function () {
    beforeEach(async function () {
      const adapter1Address = await mockAdapter.getAddress();
      const adapter2Address = await mockAdapter2.getAddress();
      await perpetualRouter.addAdapter(adapter1Address);
      await perpetualRouter.addAdapter(adapter2Address);
    });

    it("should find adapter for market", async function () {
      const adapter = await perpetualRouter.findAdapterForMarket(BTC_USD_MARKET);
      // First adapter registered should be found first
      expect(adapter).to.equal(await mockAdapter.getAddress());
    });

    it("should return zero address for unsupported market", async function () {
      const unknownMarket = ethers.encodeBytes32String("UNKNOWN/USD");
      const adapter = await perpetualRouter.findAdapterForMarket(unknownMarket);
      expect(adapter).to.equal(ZERO_ADDRESS);
    });

    it("should check if market is supported", async function () {
      expect(await perpetualRouter.isMarketSupported(BTC_USD_MARKET)).to.be.true;
      expect(await perpetualRouter.isMarketSupported(ETH_USD_MARKET)).to.be.true;

      const unknownMarket = ethers.encodeBytes32String("UNKNOWN/USD");
      expect(await perpetualRouter.isMarketSupported(unknownMarket)).to.be
        .false;
    });

    it("should get market info", async function () {
      const [adapter, info] =
        await perpetualRouter.getMarketInfo(BTC_USD_MARKET);

      expect(adapter).to.equal(await mockAdapter.getAddress());
      expect(info.name).to.equal("BTC/USD");
      expect(info.maxLeverage).to.equal(100n);
    });

    it("should get funding rate", async function () {
      const [fundingRate, adapter] =
        await perpetualRouter.getFundingRate(BTC_USD_MARKET);

      expect(adapter).to.equal(await mockAdapter.getAddress());
      expect(fundingRate).to.equal(10n); // Mock value
    });

    it("should get all markets", async function () {
      const markets = await perpetualRouter.getAllMarkets();

      // 2 markets from adapter1, 1 from adapter2
      expect(markets.length).to.equal(3);
    });
  });

  describe("Position Management", function () {
    let adapterAddress: string;
    let mockTokenAddress: string;

    beforeEach(async function () {
      adapterAddress = await mockAdapter.getAddress();
      mockTokenAddress = await mockToken.getAddress();
      await perpetualRouter.addAdapter(adapterAddress);

      // Approve router to spend user's tokens
      const routerAddress = await perpetualRouter.getAddress();
      await mockToken
        .connect(user)
        .approve(routerAddress, ethers.parseUnits("100000", 6));
    });

    it("should open position through adapter", async function () {
      const collateral = ethers.parseUnits("1000", 6); // $1000
      const size = ethers.parseUnits("10000", 6); // $10000 (10x leverage)
      const leverage = 10n;

      const tx = await perpetualRouter
        .connect(user)
        .openPosition(
          adapterAddress,
          BTC_USD_MARKET,
          collateral,
          size,
          leverage,
          true
        );

      const receipt = await tx.wait();

      // Check event was emitted
      const event = receipt.logs.find(
        (log: any) =>
          log.fragment && log.fragment.name === "PositionOpenedViaRouter"
      );
      expect(event).to.not.be.undefined;
    });

    it("should emit PositionOpenedViaRouter event", async function () {
      const collateral = ethers.parseUnits("1000", 6);
      const size = ethers.parseUnits("10000", 6);

      await expect(
        perpetualRouter
          .connect(user)
          .openPosition(
            adapterAddress,
            BTC_USD_MARKET,
            collateral,
            size,
            10,
            true
          )
      ).to.emit(perpetualRouter, "PositionOpenedViaRouter");
    });

    it("should revert for inactive adapter", async function () {
      const collateral = ethers.parseUnits("1000", 6);
      const size = ethers.parseUnits("10000", 6);
      const adapter2Address = await mockAdapter2.getAddress();

      await expect(
        perpetualRouter
          .connect(user)
          .openPosition(
            adapter2Address,
            BTC_USD_MARKET,
            collateral,
            size,
            10,
            true
          )
      ).to.be.revertedWithCustomError(perpetualRouter, "InvalidAdapter");
    });

    it("should revert for zero collateral", async function () {
      await expect(
        perpetualRouter
          .connect(user)
          .openPosition(adapterAddress, BTC_USD_MARKET, 0, 10000, 10, true)
      ).to.be.revertedWithCustomError(perpetualRouter, "ZeroAmount");
    });

    it("should revert for zero size", async function () {
      const collateral = ethers.parseUnits("1000", 6);

      await expect(
        perpetualRouter
          .connect(user)
          .openPosition(
            adapterAddress,
            BTC_USD_MARKET,
            collateral,
            0,
            10,
            true
          )
      ).to.be.revertedWithCustomError(perpetualRouter, "ZeroAmount");
    });
  });

  describe("Margin Management", function () {
    let adapterAddress: string;
    let positionId: string;

    beforeEach(async function () {
      adapterAddress = await mockAdapter.getAddress();
      await perpetualRouter.addAdapter(adapterAddress);

      const routerAddress = await perpetualRouter.getAddress();
      await mockToken
        .connect(user)
        .approve(routerAddress, ethers.parseUnits("100000", 6));

      // Open a position first
      const collateral = ethers.parseUnits("1000", 6);
      const size = ethers.parseUnits("10000", 6);

      const tx = await perpetualRouter
        .connect(user)
        .openPosition(
          adapterAddress,
          BTC_USD_MARKET,
          collateral,
          size,
          10,
          true
        );

      const receipt = await tx.wait();
      // Get positionId from event
      const event = receipt.logs.find(
        (log: any) =>
          log.fragment && log.fragment.name === "PositionOpenedViaRouter"
      );
      positionId = event.args[2]; // positionId is 3rd argument
    });

    it("should add margin to position", async function () {
      const marginToAdd = ethers.parseUnits("500", 6);

      await expect(
        perpetualRouter.connect(user).addMargin(adapterAddress, positionId, marginToAdd)
      ).to.emit(perpetualRouter, "MarginAdjusted")
        .withArgs(await user.getAddress(), positionId, marginToAdd, true);
    });

    it("should revert add margin for zero amount", async function () {
      await expect(
        perpetualRouter.connect(user).addMargin(adapterAddress, positionId, 0)
      ).to.be.revertedWithCustomError(perpetualRouter, "ZeroAmount");
    });

    it("should revert add margin for inactive adapter", async function () {
      const adapter2Address = await mockAdapter2.getAddress();
      const marginToAdd = ethers.parseUnits("500", 6);

      await expect(
        perpetualRouter.connect(user).addMargin(adapter2Address, positionId, marginToAdd)
      ).to.be.revertedWithCustomError(perpetualRouter, "InvalidAdapter");
    });
  });

  describe("Position Queries", function () {
    let adapterAddress: string;
    let positionId: string;

    beforeEach(async function () {
      adapterAddress = await mockAdapter.getAddress();
      await perpetualRouter.addAdapter(adapterAddress);

      const routerAddress = await perpetualRouter.getAddress();
      await mockToken
        .connect(user)
        .approve(routerAddress, ethers.parseUnits("100000", 6));

      // Open a position
      const tx = await perpetualRouter
        .connect(user)
        .openPosition(
          adapterAddress,
          BTC_USD_MARKET,
          ethers.parseUnits("1000", 6),
          ethers.parseUnits("10000", 6),
          10,
          true
        );

      const receipt = await tx.wait();
      const event = receipt.logs.find(
        (log: any) =>
          log.fragment && log.fragment.name === "PositionOpenedViaRouter"
      );
      positionId = event.args[2];
    });

    it("should get position info", async function () {
      const position = await perpetualRouter.getPosition(
        adapterAddress,
        positionId
      );

      expect(position.positionId).to.equal(positionId);
      expect(position.market).to.equal(BTC_USD_MARKET);
      expect(position.collateral).to.equal(ethers.parseUnits("1000", 6));
      expect(position.leverage).to.equal(10n);
    });

    it("should get liquidation price", async function () {
      const liqPrice = await perpetualRouter.getLiquidationPrice(
        adapterAddress,
        positionId
      );

      // Mock adapter returns 45000e8
      expect(liqPrice).to.equal(45000n * 10n ** 8n);
    });

    it("should get position health factor", async function () {
      const healthFactor = await perpetualRouter.getPositionHealthFactor(
        adapterAddress,
        positionId
      );

      // Mock adapter returns 2e18
      expect(healthFactor).to.equal(2n * 10n ** 18n);
    });

    it("should get unrealized PnL", async function () {
      const pnl = await perpetualRouter.getUnrealizedPnl(
        adapterAddress,
        positionId
      );

      // Mock adapter returns 100e6
      expect(pnl).to.equal(100n * 10n ** 6n);
    });
  });

  describe("Estimates", function () {
    let adapterAddress: string;

    beforeEach(async function () {
      adapterAddress = await mockAdapter.getAddress();
      await perpetualRouter.addAdapter(adapterAddress);
    });

    it("should estimate entry price", async function () {
      const [entryPrice, priceImpact] = await perpetualRouter.estimateEntryPrice(
        adapterAddress,
        BTC_USD_MARKET,
        ethers.parseUnits("10000", 6),
        true
      );

      // Mock values
      expect(entryPrice).to.equal(50000n * 10n ** 8n);
      expect(priceImpact).to.equal(10n); // 0.1%
    });

    it("should calculate liquidation price", async function () {
      const liqPrice = await perpetualRouter.calculateLiquidationPrice(
        adapterAddress,
        BTC_USD_MARKET,
        ethers.parseUnits("1000", 6), // collateral
        ethers.parseUnits("10000", 6), // size
        10, // leverage
        true, // isLong
        50000n * 10n ** 8n // entryPrice
      );

      expect(liqPrice).to.equal(45000n * 10n ** 8n); // Mock value
    });
  });

  describe("getAdapters", function () {
    it("should return empty array when no adapters", async function () {
      const adapters = await perpetualRouter.getAdapters();
      expect(adapters.length).to.equal(0);
    });

    it("should return all registered adapters", async function () {
      const adapter1Address = await mockAdapter.getAddress();
      const adapter2Address = await mockAdapter2.getAddress();

      await perpetualRouter.addAdapter(adapter1Address);
      await perpetualRouter.addAdapter(adapter2Address);

      const adapters = await perpetualRouter.getAdapters();
      expect(adapters.length).to.equal(2);
      expect(adapters).to.include(adapter1Address);
      expect(adapters).to.include(adapter2Address);
    });
  });

  describe("getAdapterInfo", function () {
    it("should return adapter info", async function () {
      const adapterAddress = await mockAdapter.getAddress();
      await perpetualRouter.addAdapter(adapterAddress);

      const info = await perpetualRouter.getAdapterInfo(adapterAddress);

      expect(info.adapter).to.equal(adapterAddress);
      expect(info.name).to.equal("Mock Perp 1");
      expect(info.maxLeverage).to.equal(100n);
      expect(info.active).to.be.true;
    });
  });

  describe("rescueTokens", function () {
    it("should allow owner to rescue tokens", async function () {
      const routerAddress = await perpetualRouter.getAddress();
      const ownerAddress = await owner.getAddress();
      const amount = ethers.parseUnits("100", 6);
      const mockTokenAddress = await mockToken.getAddress();

      // Mint tokens to router
      await mockToken.mint(routerAddress, amount);

      // Rescue tokens
      await perpetualRouter.rescueTokens(mockTokenAddress, ownerAddress, amount);

      expect(await mockToken.balanceOf(ownerAddress)).to.equal(amount);
    });

    it("should revert for non-owner", async function () {
      const mockTokenAddress = await mockToken.getAddress();
      await expect(
        perpetualRouter
          .connect(user)
          .rescueTokens(mockTokenAddress, await user.getAddress(), 100)
      ).to.be.revertedWithCustomError(
        perpetualRouter,
        "OwnableUnauthorizedAccount"
      );
    });

    it("should revert for zero address recipient", async function () {
      const mockTokenAddress = await mockToken.getAddress();
      await expect(
        perpetualRouter.rescueTokens(mockTokenAddress, ZERO_ADDRESS, 100)
      ).to.be.revertedWithCustomError(perpetualRouter, "ZeroAddress");
    });
  });

  describe("Receive Function", function () {
    it("should accept native token", async function () {
      const amount = ethers.parseEther("1");
      const routerAddress = await perpetualRouter.getAddress();

      await owner.sendTransaction({
        to: routerAddress,
        value: amount,
      });

      expect(await ethers.provider.getBalance(routerAddress)).to.equal(amount);
    });
  });
});
