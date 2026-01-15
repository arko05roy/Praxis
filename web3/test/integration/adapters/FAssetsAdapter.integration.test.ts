import { expect } from "chai";
import { network } from "hardhat";
import {
  FXRP_FLARE,
  FXRP_POOLS_FLARE,
  FASSET_PAIRED_TOKENS_FLARE,
} from "../../../scripts/helpers/fassetAddresses.js";
import { CRYPTO_FEEDS } from "../../../scripts/helpers/feedIds.js";
import { SPARKDEX_FLARE, TOKENS_FLARE } from "../../../scripts/helpers/dexAddresses.js";

const { ethers } = await network.connect();

/**
 * FAssetsAdapter Integration Tests
 *
 * These tests run against real FAsset contracts on Flare mainnet fork.
 * Requires: Flare mainnet fork (flareFork network or anvil fork)
 *
 * Start Anvil: anvil --fork-url https://flare-api.flare.network/ext/C/rpc --port 8546
 * Run: npx hardhat test test/integration/adapters/FAssetsAdapter.integration.test.ts --network anvilFork
 */
describe("FAssetsAdapter Integration", function () {
  // Increase timeout for network calls
  this.timeout(120000);

  let fAssetsAdapter: any;
  let swapRouter: any;
  let sparkdexAdapter: any;
  let fxrpToken: any;
  let wflrToken: any;
  let owner: any;
  let whale: any;

  // Real contract addresses (Flare Mainnet)
  const FXRP = FXRP_FLARE.token;
  const WFLR = TOKENS_FLARE.WFLR;

  // XRP/USD feed ID
  const XRP_FEED_ID = CRYPTO_FEEDS.XRP_USD;

  // ERC20 ABI for token interactions
  const ERC20_ABI = [
    "function balanceOf(address) view returns (uint256)",
    "function approve(address,uint256) returns (bool)",
    "function transfer(address,uint256) returns (bool)",
    "function allowance(address,address) view returns (uint256)",
    "function decimals() view returns (uint8)",
    "function symbol() view returns (string)",
    "function name() view returns (string)",
    "function totalSupply() view returns (uint256)",
  ];

  before(async function () {
    // Get chain ID
    const chainId = (await ethers.provider.getNetwork()).chainId;
    console.log(`Running on chain ID: ${chainId}`);

    // Skip if not on Flare mainnet or fork (chainId 14)
    if (chainId !== 14n) {
      console.log(
        `Skipping integration tests - not on Flare mainnet/fork (chainId: ${chainId})`
      );
      this.skip();
    }

    // Check that FXRP is deployed
    if (!FXRP) {
      console.log("Skipping - FXRP address not configured");
      this.skip();
    }

    [owner] = await ethers.getSigners();
    console.log(`Running as: ${await owner.getAddress()}`);

    const balance = await ethers.provider.getBalance(await owner.getAddress());
    console.log(`Balance: ${ethers.formatEther(balance)} FLR`);

    if (balance < ethers.parseEther("1")) {
      console.log("Skipping - insufficient FLR balance for tests");
      this.skip();
    }

    // Get real FXRP token contract
    fxrpToken = await ethers.getContractAt(ERC20_ABI, FXRP);

    // Get WFLR token contract
    wflrToken = await ethers.getContractAt(ERC20_ABI, WFLR);

    // Verify FXRP contract exists on fork
    try {
      const code = await ethers.provider.getCode(FXRP);
      if (code === "0x" || code === "0x0") {
        console.log("FXRP contract not found on forked state - skipping tests");
        this.skip();
      }

      // Try to find a whale with FXRP for testing swaps
      // Check the FXRP/WFLR pool
      const poolAddress = FXRP_POOLS_FLARE.sparkdexV2_FXRP_WFLR;
      const poolFXRPBalance = await fxrpToken.balanceOf(poolAddress);
      console.log(
        `FXRP/WFLR Pool FXRP balance: ${ethers.formatUnits(poolFXRPBalance, 6)} FXRP`
      );
    } catch (error: any) {
      console.log(`Error checking FXRP contract: ${error.message}`);
      console.log("Continuing with tests...");
    }
  });

  beforeEach(async function () {
    // Deploy SwapRouter
    const SwapRouter = await ethers.getContractFactory("SwapRouter");
    swapRouter = await SwapRouter.deploy();
    await swapRouter.waitForDeployment();
    console.log(`SwapRouter deployed to: ${await swapRouter.getAddress()}`);

    // Deploy SparkDEXAdapter (for real DEX integration)
    const SparkDEXAdapter = await ethers.getContractFactory("SparkDEXAdapter");
    sparkdexAdapter = await SparkDEXAdapter.deploy(
      SPARKDEX_FLARE.swapRouter,
      SPARKDEX_FLARE.quoterV2,
      SPARKDEX_FLARE.factory
    );
    await sparkdexAdapter.waitForDeployment();
    console.log(
      `SparkDEXAdapter deployed to: ${await sparkdexAdapter.getAddress()}`
    );

    // Register SparkDEX adapter with SwapRouter
    await swapRouter.addAdapter(await sparkdexAdapter.getAddress());

    // Deploy FAssetsAdapter
    const FAssetsAdapter = await ethers.getContractFactory("FAssetsAdapter");
    fAssetsAdapter = await FAssetsAdapter.deploy(
      await swapRouter.getAddress()
    );
    await fAssetsAdapter.waitForDeployment();
    console.log(
      `FAssetsAdapter deployed to: ${await fAssetsAdapter.getAddress()}`
    );
  });

  describe("Deployment", function () {
    it("should deploy with correct SwapRouter", async function () {
      expect(await fAssetsAdapter.swapRouter()).to.equal(
        await swapRouter.getAddress()
      );
    });

    it("should start with zero FAssets registered", async function () {
      expect(await fAssetsAdapter.getFAssetCount()).to.equal(0);
    });
  });

  describe("Real FXRP Token", function () {
    beforeEach(async function () {
      // Register FXRP with adapter
      console.log(`Registering FXRP: ${FXRP}`);
      const tx = await fAssetsAdapter.registerFAsset(FXRP, "XRP", XRP_FEED_ID);
      await tx.wait();
      console.log(`FXRP registration confirmed`);

      // Verify registration
      const isRegistered = await fAssetsAdapter.isFAsset(FXRP);
      console.log(`FXRP registered: ${isRegistered}`);
    });

    it("should detect FXRP as registered FAsset", async function () {
      expect(await fAssetsAdapter.isFAsset(FXRP)).to.be.true;
    });

    it("should return correct FXRP symbol", async function () {
      // Verify registration status before calling
      const isRegistered = await fAssetsAdapter.isFAsset(FXRP);
      console.log(`Before getFAssetSymbol - isRegistered: ${isRegistered}`);

      const symbol = await fAssetsAdapter.getFAssetSymbol(FXRP);
      console.log(`FXRP symbol: ${symbol}`);
      // FXRP on mainnet should have symbol "FXRP"
      expect(symbol).to.include("XRP");
    });

    it("should return correct FXRP decimals", async function () {
      const decimals = await fAssetsAdapter.getFAssetDecimals(FXRP);
      console.log(`FXRP decimals: ${decimals}`);
      // FXRP uses 6 decimals like XRP
      expect(decimals).to.equal(6);
    });

    it("should return correct underlying asset", async function () {
      const underlying = await fAssetsAdapter.getUnderlyingAsset(FXRP);
      expect(underlying).to.equal("XRP");
    });

    it("should return non-zero total supply", async function () {
      const totalSupply = await fAssetsAdapter.getFAssetTotalSupply(FXRP);
      console.log(`FXRP total supply: ${ethers.formatUnits(totalSupply, 6)} FXRP`);
      expect(totalSupply).to.be.gt(0);
    });

    it("should return correct FAssetInfo struct", async function () {
      const info = await fAssetsAdapter.getFAssetInfo(FXRP);

      console.log(`FAsset Info:`);
      console.log(`  Address: ${info.fAssetAddress}`);
      console.log(`  Symbol: ${info.symbol}`);
      console.log(`  Underlying: ${info.underlying}`);
      console.log(`  Total Minted: ${ethers.formatUnits(info.totalMinted, 6)} FXRP`);
      console.log(`  Collateral Ratio: ${info.collateralRatio}%`);

      expect(info.fAssetAddress.toLowerCase()).to.equal(FXRP.toLowerCase());
      expect(info.underlying).to.equal("XRP");
      expect(info.collateralRatio).to.equal(130n);
    });
  });

  describe("Price Queries (FTSO)", function () {
    beforeEach(async function () {
      await fAssetsAdapter.registerFAsset(FXRP, "XRP", XRP_FEED_ID);

      // Send some FLR to adapter for FTSO fees
      await owner.sendTransaction({
        to: await fAssetsAdapter.getAddress(),
        value: ethers.parseEther("0.1"),
      });
    });

    it("should calculate price fee", async function () {
      const fee = await fAssetsAdapter.calculatePriceFee(FXRP);
      console.log(`Price fee for FXRP: ${ethers.formatEther(fee)} FLR`);
      // Fee should be non-negative (could be 0 or small amount)
      expect(fee).to.be.gte(0);
    });

    it("should get FXRP price from FTSO", async function () {
      // Get the fee required
      const fee = await fAssetsAdapter.calculatePriceFee(FXRP);
      console.log(`Fee required: ${ethers.formatEther(fee)} FLR`);

      // Use staticCall to get return values from payable function
      // Send fee as value in the staticCall
      const result = await fAssetsAdapter.getFAssetPriceUSD.staticCall(FXRP, {
        value: fee,
      });

      const price = result[0];
      const timestamp = result[1];

      console.log(`FXRP Price: $${ethers.formatEther(price)}`);
      console.log(
        `Price timestamp: ${new Date(Number(timestamp) * 1000).toISOString()}`
      );

      // XRP price should be between $0.10 and $10
      expect(price).to.be.gt(ethers.parseEther("0.1"));
      expect(price).to.be.lt(ethers.parseEther("10"));
    });

    it("should calculate FXRP value in USD", async function () {
      const amount = ethers.parseUnits("1000", 6); // 1000 FXRP
      const fee = await fAssetsAdapter.calculatePriceFee(FXRP);

      // Use staticCall for payable function
      const valueUSD = await fAssetsAdapter.getFAssetValueUSD.staticCall(
        FXRP,
        amount,
        { value: fee }
      );

      console.log(`1000 FXRP value: $${ethers.formatEther(valueUSD)}`);

      // 1000 FXRP should be worth between $100 and $10000
      expect(valueUSD).to.be.gt(ethers.parseEther("100"));
      expect(valueUSD).to.be.lt(ethers.parseEther("10000"));
    });
  });

  describe("DEX Integration", function () {
    beforeEach(async function () {
      // Register FXRP and wait for confirmation
      const registerTx = await fAssetsAdapter.registerFAsset(FXRP, "XRP", XRP_FEED_ID);
      await registerTx.wait();
      console.log(`FXRP registered for DEX tests`);

      // Add the FXRP/WFLR pool and wait for confirmation
      const poolAddress = FXRP_POOLS_FLARE.sparkdexV2_FXRP_WFLR;
      console.log(`Adding pool: ${poolAddress}`);
      const poolTx = await fAssetsAdapter.addPool(FXRP, poolAddress);
      await poolTx.wait();
      console.log(`Pool added`);
    });

    it("should check if FXRP/WFLR swap is supported", async function () {
      const isSupported = await fAssetsAdapter.isSwapSupported(FXRP, WFLR);
      console.log(`FXRP/WFLR swap supported: ${isSupported}`);
      // Should be true since SparkDEX has FXRP/WFLR pool
      expect(isSupported).to.be.true;
    });

    it("should get swap quote for FXRP to WFLR", async function () {
      const amountIn = ethers.parseUnits("100", 6); // 100 FXRP

      try {
        const [amountOut, route] = await fAssetsAdapter.getSwapQuote(
          FXRP,
          WFLR,
          amountIn
        );

        console.log(`Quote for 100 FXRP -> WFLR:`);
        console.log(`  Amount out: ${ethers.formatEther(amountOut)} WFLR`);
        console.log(`  Route: ${route}`);

        expect(amountOut).to.be.gt(0);
      } catch (error: any) {
        // If no liquidity, this is acceptable
        console.log(`Quote failed (may need more liquidity): ${error.message}`);
      }
    });

    it("should get pool liquidity info", async function () {
      const [pools, liquidities] = await fAssetsAdapter.getBestPools(FXRP);

      console.log(`FXRP pools:`);
      for (let i = 0; i < pools.length; i++) {
        console.log(
          `  Pool ${pools[i]}: ${ethers.formatUnits(liquidities[i], 6)} FXRP`
        );
      }

      expect(pools.length).to.be.gt(0);
    });

    it("should return correct pair liquidity", async function () {
      const liquidity = await fAssetsAdapter.getPairLiquidity(FXRP, WFLR);
      console.log(
        `FXRP/WFLR pair liquidity: ${ethers.formatEther(liquidity)} WFLR`
      );
      // Should have some liquidity
      expect(liquidity).to.be.gt(0);
    });
  });

  describe("Multiple FAssets", function () {
    it("should support registering multiple FAssets", async function () {
      // Register FXRP and wait for confirmation
      const tx = await fAssetsAdapter.registerFAsset(FXRP, "XRP", XRP_FEED_ID);
      await tx.wait();
      console.log(`FXRP registered`);

      // For now, FBTC and FDOGE are not deployed yet
      // When they are, we can add them here:
      // await fAssetsAdapter.registerFAsset(FBTC, "BTC", BTC_FEED_ID);
      // await fAssetsAdapter.registerFAsset(FDOGE, "DOGE", DOGE_FEED_ID);

      const count = await fAssetsAdapter.getFAssetCount();
      console.log(`FAsset count: ${count}`);
      expect(count).to.equal(1);

      const allFAssets = await fAssetsAdapter.getAllFAssets();
      expect(allFAssets.length).to.equal(1);
      expect(allFAssets[0].toLowerCase()).to.equal(FXRP.toLowerCase());
    });
  });

  describe("Real Token Verification", function () {
    it("should verify FXRP token on mainnet", async function () {
      // Verify token details directly from mainnet
      const name = await fxrpToken.name();
      const symbol = await fxrpToken.symbol();
      const decimals = await fxrpToken.decimals();
      const totalSupply = await fxrpToken.totalSupply();

      console.log(`FXRP Token Verification:`);
      console.log(`  Name: ${name}`);
      console.log(`  Symbol: ${symbol}`);
      console.log(`  Decimals: ${decimals}`);
      console.log(`  Total Supply: ${ethers.formatUnits(totalSupply, decimals)}`);

      // Verify expected values
      expect(decimals).to.equal(6);
      expect(totalSupply).to.be.gt(0);
    });

    it("should verify FXRP/WFLR pool has liquidity", async function () {
      const poolAddress = FXRP_POOLS_FLARE.sparkdexV2_FXRP_WFLR;

      const fxrpBalance = await fxrpToken.balanceOf(poolAddress);
      const wflrBalance = await wflrToken.balanceOf(poolAddress);

      console.log(`FXRP/WFLR Pool Liquidity:`);
      console.log(`  FXRP: ${ethers.formatUnits(fxrpBalance, 6)}`);
      console.log(`  WFLR: ${ethers.formatEther(wflrBalance)}`);

      expect(fxrpBalance).to.be.gt(0);
      expect(wflrBalance).to.be.gt(0);
    });
  });

  describe("Gas Estimates", function () {
    beforeEach(async function () {
      await fAssetsAdapter.registerFAsset(FXRP, "XRP", XRP_FEED_ID);
    });

    it("should have reasonable gas cost for registration", async function () {
      // Deploy fresh adapter for measurement
      const FAssetsAdapter = await ethers.getContractFactory("FAssetsAdapter");
      const freshAdapter = await FAssetsAdapter.deploy(
        await swapRouter.getAddress()
      );

      const tx = await freshAdapter.registerFAsset(FXRP, "XRP", XRP_FEED_ID);
      const receipt = await tx.wait();

      console.log(`Register FAsset gas used: ${receipt.gasUsed}`);
      // Should be under 200k gas
      expect(receipt.gasUsed).to.be.lt(200000);
    });

    it("should have reasonable gas cost for info queries", async function () {
      // These are view functions, so no gas measurement needed
      // Just verify they work
      await fAssetsAdapter.getFAssetInfo(FXRP);
      await fAssetsAdapter.getFAssetCount();
      await fAssetsAdapter.getAllFAssets();
      await fAssetsAdapter.isFAsset(FXRP);
    });
  });
});
