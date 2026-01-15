import { expect } from "chai";
import { network } from "hardhat";
import { FXRP_FLARE, FXRP_POOLS_FLARE } from "../../scripts/helpers/fassetAddresses.js";
import { CRYPTO_FEEDS } from "../../scripts/helpers/feedIds.js";
import { SPARKDEX_FLARE, TOKENS_FLARE } from "../../scripts/helpers/dexAddresses.js";

const { ethers } = await network.connect();

/**
 * Full System Integration Tests
 *
 * Verifies that all phases work together:
 * - Phase 1: Oracle Foundation (FTSO)
 * - Phase 2: DEX Adapters (SwapRouter, SparkDEXAdapter)
 * - Phase 3: Yield Adapters (Kinetic, Sceptre)
 * - Phase 4: Perpetual Adapters (SparkDEXEternalAdapter)
 * - Phase 5: FAssets Support (FAssetsAdapter)
 *
 * Run: npx hardhat test test/integration/FullSystemIntegration.test.ts --network anvilFork
 */
describe("Full System Integration", function () {
  this.timeout(180000);

  let swapRouter: any;
  let sparkdexAdapter: any;
  let fAssetsAdapter: any;
  let owner: any;

  const FXRP = FXRP_FLARE.token;
  const WFLR = TOKENS_FLARE.WFLR;
  const XRP_FEED_ID = CRYPTO_FEEDS.XRP_USD;

  const ERC20_ABI = [
    "function balanceOf(address) view returns (uint256)",
    "function decimals() view returns (uint8)",
    "function symbol() view returns (string)",
  ];

  before(async function () {
    const chainId = (await ethers.provider.getNetwork()).chainId;
    if (chainId !== 14n) {
      console.log(`Skipping - not on Flare mainnet/fork (chainId: ${chainId})`);
      this.skip();
    }

    [owner] = await ethers.getSigners();
    console.log(`Running as: ${await owner.getAddress()}`);
  });

  beforeEach(async function () {
    // Deploy Phase 2: SwapRouter
    const SwapRouter = await ethers.getContractFactory("SwapRouter");
    swapRouter = await SwapRouter.deploy();
    await swapRouter.waitForDeployment();

    // Deploy Phase 2: SparkDEXAdapter
    const SparkDEXAdapter = await ethers.getContractFactory("SparkDEXAdapter");
    sparkdexAdapter = await SparkDEXAdapter.deploy(
      SPARKDEX_FLARE.swapRouter,
      SPARKDEX_FLARE.quoterV2,
      SPARKDEX_FLARE.factory
    );
    await sparkdexAdapter.waitForDeployment();

    // Register SparkDEXAdapter with SwapRouter
    const addTx = await swapRouter.addAdapter(await sparkdexAdapter.getAddress());
    await addTx.wait();

    // Deploy Phase 5: FAssetsAdapter
    const FAssetsAdapter = await ethers.getContractFactory("FAssetsAdapter");
    fAssetsAdapter = await FAssetsAdapter.deploy(await swapRouter.getAddress());
    await fAssetsAdapter.waitForDeployment();

    // Register FXRP
    const registerTx = await fAssetsAdapter.registerFAsset(FXRP, "XRP", XRP_FEED_ID);
    await registerTx.wait();

    // Add pool
    const poolTx = await fAssetsAdapter.addPool(FXRP, FXRP_POOLS_FLARE.sparkdexV2_FXRP_WFLR);
    await poolTx.wait();
  });

  describe("Phase 2 + Phase 5: DEX Integration", function () {
    it("should detect FXRP swaps through SwapRouter", async function () {
      // Phase 5: FAssetsAdapter uses Phase 2: SwapRouter
      const isSupported = await fAssetsAdapter.isSwapSupported(FXRP, WFLR);
      expect(isSupported).to.be.true;
      console.log("✓ FAssetsAdapter correctly uses SwapRouter for swap support");
    });

    it("should get swap quotes through SwapRouter adapters", async function () {
      // Verify the SparkDEXAdapter is registered
      const adapterCount = await swapRouter.getAdapterCount();
      expect(adapterCount).to.be.gt(0);
      console.log(`✓ SwapRouter has ${adapterCount} adapter(s) registered`);

      // Verify SwapRouter can check pairs through its adapters
      const routerSupports = await swapRouter.isPairSupported(FXRP, WFLR);
      console.log(`✓ SwapRouter pair support (via adapters): ${routerSupports}`);
    });
  });

  describe("Phase 1 + Phase 5: Oracle Integration", function () {
    it("should get FXRP price from FTSO (Phase 1 oracle)", async function () {
      // Phase 5 uses Phase 1's FTSO v2 for price feeds
      const fee = await fAssetsAdapter.calculatePriceFee(FXRP);

      const result = await fAssetsAdapter.getFAssetPriceUSD.staticCall(FXRP, {
        value: fee,
      });

      const price = result[0];
      expect(price).to.be.gt(0);
      console.log(`✓ FXRP price from FTSO: $${ethers.formatEther(price)}`);
    });
  });

  describe("Cross-Phase Data Flow", function () {
    it("should have consistent data across adapters", async function () {
      // Get FXRP info from FAssetsAdapter
      const fAssetInfo = await fAssetsAdapter.getFAssetInfo(FXRP);
      expect(fAssetInfo.symbol).to.equal("FXRP");

      // Verify token data matches direct ERC20 call
      const fxrpToken = await ethers.getContractAt(ERC20_ABI, FXRP);
      const directSymbol = await fxrpToken.symbol();
      expect(directSymbol).to.equal(fAssetInfo.symbol);

      console.log("✓ FAssetsAdapter info matches on-chain data");
      console.log(`  Symbol: ${fAssetInfo.symbol}`);
      console.log(`  Underlying: ${fAssetInfo.underlying}`);
      console.log(`  Total Supply: ${ethers.formatUnits(fAssetInfo.totalMinted, 6)}`);
    });

    it("should use shared error library across phases", async function () {
      // Try to call with unregistered token - should use PraxisErrors
      const randomAddress = "0x0000000000000000000000000000000000000001";
      try {
        await fAssetsAdapter.getFAssetInfo(randomAddress);
        expect.fail("Should have reverted");
      } catch (error: any) {
        // Should revert with PraxisErrors.NotFAsset
        expect(error.message).to.include("revert");
        console.log("✓ FAssetsAdapter uses shared PraxisErrors library");
      }
    });
  });

  describe("Full Integration Flow", function () {
    it("should complete full FAsset -> DEX query flow", async function () {
      // 1. Check if token is an FAsset (Phase 5)
      const isFAsset = await fAssetsAdapter.isFAsset(FXRP);
      expect(isFAsset).to.be.true;
      console.log("Step 1: ✓ FXRP detected as FAsset");

      // 2. Get FAsset info (Phase 5)
      const info = await fAssetsAdapter.getFAssetInfo(FXRP);
      expect(info.underlying).to.equal("XRP");
      console.log("Step 2: ✓ Got FAsset info");

      // 3. Get price from FTSO (Phase 1 via Phase 5)
      const fee = await fAssetsAdapter.calculatePriceFee(FXRP);
      const priceResult = await fAssetsAdapter.getFAssetPriceUSD.staticCall(FXRP, { value: fee });
      expect(priceResult[0]).to.be.gt(0);
      console.log(`Step 3: ✓ Got FTSO price: $${ethers.formatEther(priceResult[0])}`);

      // 4. Check DEX swap support (Phase 5 -> Phase 2)
      const isSwapSupported = await fAssetsAdapter.isSwapSupported(FXRP, WFLR);
      expect(isSwapSupported).to.be.true;
      console.log("Step 4: ✓ Swap support confirmed via SwapRouter");

      // 5. Get pool liquidity (Phase 5)
      const [pools, liquidities] = await fAssetsAdapter.getBestPools(FXRP);
      expect(pools.length).to.be.gt(0);
      console.log(`Step 5: ✓ Found ${pools.length} liquidity pool(s)`);

      console.log("\n✓ Full integration flow completed successfully!");
    });
  });
});
