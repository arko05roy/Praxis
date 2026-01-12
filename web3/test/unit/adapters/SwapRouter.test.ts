import { expect } from "chai";
import { network } from "hardhat";

const { ethers } = await network.connect();

/**
 * SwapRouter Unit Tests
 *
 * Tests the DEX aggregator functionality including adapter registry
 * and quote/swap routing.
 */
describe("SwapRouter", function () {
  // Contract instances
  let swapRouter: any;
  let mockAdapter: any;
  let mockAdapter2: any;
  let mockToken: any;
  let mockToken2: any;
  let owner: any;
  let user: any;

  // Test constants
  const ZERO_ADDRESS = "0x0000000000000000000000000000000000000000";

  beforeEach(async function () {
    // Get signers
    [owner, user] = await ethers.getSigners();

    // Deploy SwapRouter
    const SwapRouter = await ethers.getContractFactory("SwapRouter");
    swapRouter = await SwapRouter.deploy();
    await swapRouter.waitForDeployment();

    // Deploy mock ERC20 tokens
    const MockToken = await ethers.getContractFactory("MockERC20");
    mockToken = await MockToken.deploy("Mock Token", "MOCK", 18);
    await mockToken.waitForDeployment();

    mockToken2 = await MockToken.deploy("Mock Token 2", "MOCK2", 18);
    await mockToken2.waitForDeployment();

    // Deploy mock adapters
    const MockAdapter = await ethers.getContractFactory("MockAdapter");
    mockAdapter = await MockAdapter.deploy("Mock DEX 1");
    await mockAdapter.waitForDeployment();

    mockAdapter2 = await MockAdapter.deploy("Mock DEX 2");
    await mockAdapter2.waitForDeployment();
  });

  describe("Deployment", function () {
    it("should set correct owner", async function () {
      expect(await swapRouter.owner()).to.equal(await owner.getAddress());
    });

    it("should start with no adapters", async function () {
      expect(await swapRouter.getAdapterCount()).to.equal(0);
    });

    it("should have correct MAX_ADAPTERS constant", async function () {
      expect(await swapRouter.MAX_ADAPTERS()).to.equal(20);
    });
  });

  describe("addAdapter", function () {
    it("should allow owner to add adapter", async function () {
      const adapterAddress = await mockAdapter.getAddress();
      await swapRouter.addAdapter(adapterAddress);

      expect(await swapRouter.getAdapterCount()).to.equal(1);
      expect(await swapRouter.isRegisteredAdapter(adapterAddress)).to.be.true;
    });

    it("should emit AdapterAdded event", async function () {
      const adapterAddress = await mockAdapter.getAddress();
      await expect(swapRouter.addAdapter(adapterAddress))
        .to.emit(swapRouter, "AdapterAdded")
        .withArgs(adapterAddress, "Mock DEX 1");
    });

    it("should revert for non-owner", async function () {
      const adapterAddress = await mockAdapter.getAddress();
      await expect(
        swapRouter.connect(user).addAdapter(adapterAddress)
      ).to.be.revertedWithCustomError(swapRouter, "OwnableUnauthorizedAccount");
    });

    it("should revert for zero address", async function () {
      await expect(
        swapRouter.addAdapter(ZERO_ADDRESS)
      ).to.be.revertedWithCustomError(swapRouter, "ZeroAddress");
    });

    it("should revert for already registered adapter", async function () {
      const adapterAddress = await mockAdapter.getAddress();
      await swapRouter.addAdapter(adapterAddress);

      await expect(
        swapRouter.addAdapter(adapterAddress)
      ).to.be.revertedWithCustomError(swapRouter, "InvalidAdapter");
    });
  });

  describe("removeAdapter", function () {
    beforeEach(async function () {
      // Add adapter first
      const adapterAddress = await mockAdapter.getAddress();
      await swapRouter.addAdapter(adapterAddress);
    });

    it("should allow owner to remove adapter", async function () {
      const adapterAddress = await mockAdapter.getAddress();
      await swapRouter.removeAdapter(adapterAddress);

      expect(await swapRouter.getAdapterCount()).to.equal(0);
      expect(await swapRouter.isRegisteredAdapter(adapterAddress)).to.be.false;
    });

    it("should emit AdapterRemoved event", async function () {
      const adapterAddress = await mockAdapter.getAddress();
      await expect(swapRouter.removeAdapter(adapterAddress))
        .to.emit(swapRouter, "AdapterRemoved")
        .withArgs(adapterAddress);
    });

    it("should revert for non-owner", async function () {
      const adapterAddress = await mockAdapter.getAddress();
      await expect(
        swapRouter.connect(user).removeAdapter(adapterAddress)
      ).to.be.revertedWithCustomError(swapRouter, "OwnableUnauthorizedAccount");
    });

    it("should revert for unregistered adapter", async function () {
      const adapter2Address = await mockAdapter2.getAddress();
      await expect(
        swapRouter.removeAdapter(adapter2Address)
      ).to.be.revertedWithCustomError(swapRouter, "InvalidAdapter");
    });
  });

  describe("getAdapters", function () {
    it("should return empty array when no adapters", async function () {
      const adapters = await swapRouter.getAdapters();
      expect(adapters.length).to.equal(0);
    });

    it("should return all registered adapters", async function () {
      const adapter1Address = await mockAdapter.getAddress();
      const adapter2Address = await mockAdapter2.getAddress();

      await swapRouter.addAdapter(adapter1Address);
      await swapRouter.addAdapter(adapter2Address);

      const adapters = await swapRouter.getAdapters();
      expect(adapters.length).to.equal(2);
      expect(adapters).to.include(adapter1Address);
      expect(adapters).to.include(adapter2Address);
    });
  });

  describe("getAllQuotes", function () {
    beforeEach(async function () {
      const adapterAddress = await mockAdapter.getAddress();
      await swapRouter.addAdapter(adapterAddress);

      // Set mock quote
      await mockAdapter.setQuote(ethers.parseEther("100"), 150000);
    });

    it("should return quotes from all adapters", async function () {
      const tokenIn = await mockToken.getAddress();
      const tokenOut = await mockToken2.getAddress();
      const amountIn = ethers.parseEther("1");

      const quotes = await swapRouter.getAllQuotes(tokenIn, tokenOut, amountIn);

      expect(quotes.length).to.equal(1);
      expect(quotes[0].amountOut).to.equal(ethers.parseEther("100"));
      expect(quotes[0].gasEstimate).to.equal(150000);
    });
  });

  describe("findBestRoute", function () {
    beforeEach(async function () {
      const adapter1Address = await mockAdapter.getAddress();
      const adapter2Address = await mockAdapter2.getAddress();

      await swapRouter.addAdapter(adapter1Address);
      await swapRouter.addAdapter(adapter2Address);

      // Set different quotes
      await mockAdapter.setQuote(ethers.parseEther("100"), 150000);
      await mockAdapter2.setQuote(ethers.parseEther("110"), 200000);
    });

    it("should return the adapter with best output", async function () {
      const tokenIn = await mockToken.getAddress();
      const tokenOut = await mockToken2.getAddress();
      const amountIn = ethers.parseEther("1");

      const [bestAdapter, bestAmountOut] = await swapRouter.findBestRoute(
        tokenIn,
        tokenOut,
        amountIn
      );

      // mockAdapter2 returns higher output
      expect(bestAdapter).to.equal(await mockAdapter2.getAddress());
      expect(bestAmountOut).to.equal(ethers.parseEther("110"));
    });
  });

  describe("isPairSupported", function () {
    beforeEach(async function () {
      const adapterAddress = await mockAdapter.getAddress();
      await swapRouter.addAdapter(adapterAddress);
    });

    it("should return true when adapter supports pair", async function () {
      const tokenIn = await mockToken.getAddress();
      const tokenOut = await mockToken2.getAddress();

      // Mock adapter returns true by default
      await mockAdapter.setPoolAvailable(true);

      expect(await swapRouter.isPairSupported(tokenIn, tokenOut)).to.be.true;
    });

    it("should return false when no adapter supports pair", async function () {
      const tokenIn = await mockToken.getAddress();
      const tokenOut = await mockToken2.getAddress();

      await mockAdapter.setPoolAvailable(false);

      expect(await swapRouter.isPairSupported(tokenIn, tokenOut)).to.be.false;
    });
  });

  describe("rescueTokens", function () {
    it("should allow owner to rescue tokens", async function () {
      const routerAddress = await swapRouter.getAddress();
      const ownerAddress = await owner.getAddress();
      const amount = ethers.parseEther("100");

      // Mint tokens to router
      await mockToken.mint(routerAddress, amount);

      // Rescue tokens
      await swapRouter.rescueTokens(
        await mockToken.getAddress(),
        ownerAddress,
        amount
      );

      expect(await mockToken.balanceOf(ownerAddress)).to.equal(amount);
    });

    it("should revert for non-owner", async function () {
      await expect(
        swapRouter
          .connect(user)
          .rescueTokens(
            await mockToken.getAddress(),
            await user.getAddress(),
            100
          )
      ).to.be.revertedWithCustomError(swapRouter, "OwnableUnauthorizedAccount");
    });

    it("should revert for zero address recipient", async function () {
      await expect(
        swapRouter.rescueTokens(await mockToken.getAddress(), ZERO_ADDRESS, 100)
      ).to.be.revertedWithCustomError(swapRouter, "ZeroAddress");
    });
  });

  describe("Receive Function", function () {
    it("should accept native token", async function () {
      const amount = ethers.parseEther("1");
      const routerAddress = await swapRouter.getAddress();

      await owner.sendTransaction({
        to: routerAddress,
        value: amount,
      });

      expect(await ethers.provider.getBalance(routerAddress)).to.equal(amount);
    });
  });
});
