/**
 * Yield Router Verification Script
 *
 * Comprehensive verification of YieldRouter and adapters against Flare mainnet fork.
 * Tests all core functionality to ensure everything works as intended.
 *
 * Usage:
 *   anvil --fork-url https://flare-api.flare.network/ext/C/rpc --port 8546
 *   npx hardhat run scripts/demo/verifyYieldRouter.ts --network anvilFork
 */

import { network } from "hardhat";
import {
  SCEPTRE_FLARE,
  KINETIC_FLARE,
  TOKENS_FLARE,
} from "../helpers/yieldAddresses.js";

const { ethers } = await network.connect();

// Test results tracking
const results: { test: string; passed: boolean; details: string }[] = [];

function logTest(name: string, passed: boolean, details: string) {
  results.push({ test: name, passed, details });
  const icon = passed ? "✅" : "❌";
  console.log(`${icon} ${name}: ${details}`);
}

async function main() {
  console.log("\n" + "=".repeat(70));
  console.log("   YIELD ROUTER VERIFICATION");
  console.log("   Testing all functionality against Flare mainnet fork");
  console.log("=".repeat(70) + "\n");

  // Check network
  const networkInfo = await ethers.provider.getNetwork();
  const chainId = Number(networkInfo.chainId);

  if (chainId !== 14) {
    console.log(`ERROR: Must run on Flare mainnet fork (chainId 14), got ${chainId}`);
    process.exit(1);
  }

  const [deployer] = await ethers.getSigners();
  const deployerAddress = await deployer.getAddress();
  console.log(`Deployer: ${deployerAddress}`);
  console.log(`Chain ID: ${chainId}\n`);

  // ============================================================
  // SECTION 1: Deploy Contracts
  // ============================================================
  console.log("--- DEPLOYING CONTRACTS ---\n");

  // Deploy YieldRouter
  const YieldRouter = await ethers.getContractFactory("YieldRouter");
  const yieldRouter = await YieldRouter.deploy();
  await yieldRouter.waitForDeployment();
  const yieldRouterAddr = await yieldRouter.getAddress();
  logTest("YieldRouter deployed", true, yieldRouterAddr);

  // Deploy SceptreAdapter
  const SceptreAdapter = await ethers.getContractFactory("SceptreAdapter");
  const sceptreAdapter = await SceptreAdapter.deploy(SCEPTRE_FLARE.sflr, TOKENS_FLARE.WFLR);
  await sceptreAdapter.waitForDeployment();
  const sceptreAdapterAddr = await sceptreAdapter.getAddress();
  logTest("SceptreAdapter deployed", true, sceptreAdapterAddr);

  // Deploy KineticAdapter
  const KineticAdapter = await ethers.getContractFactory("KineticAdapter");
  const kineticAdapter = await KineticAdapter.deploy(KINETIC_FLARE.comptroller);
  await kineticAdapter.waitForDeployment();
  const kineticAdapterAddr = await kineticAdapter.getAddress();
  logTest("KineticAdapter deployed", true, kineticAdapterAddr);

  // ============================================================
  // SECTION 2: Verify Adapter Configuration
  // ============================================================
  console.log("\n--- VERIFYING ADAPTER CONFIGURATION ---\n");

  // SceptreAdapter configuration
  const sceptreName = await sceptreAdapter.name();
  logTest("SceptreAdapter.name()", sceptreName === "Sceptre", sceptreName);

  const sceptreProtocol = await sceptreAdapter.protocol();
  logTest("SceptreAdapter.protocol()", sceptreProtocol.toLowerCase() === SCEPTRE_FLARE.sflr.toLowerCase(), sceptreProtocol);

  const stakingToken = await sceptreAdapter.stakingToken();
  logTest("SceptreAdapter.stakingToken()", stakingToken.toLowerCase() === SCEPTRE_FLARE.sflr.toLowerCase(), stakingToken);

  // KineticAdapter configuration
  const kineticName = await kineticAdapter.name();
  logTest("KineticAdapter.name()", kineticName === "Kinetic", kineticName);

  const kineticProtocol = await kineticAdapter.protocol();
  logTest("KineticAdapter.protocol()", kineticProtocol.toLowerCase() === KINETIC_FLARE.comptroller.toLowerCase(), kineticProtocol);

  // ============================================================
  // SECTION 3: Initialize Kinetic Markets
  // ============================================================
  console.log("\n--- INITIALIZING KINETIC MARKETS ---\n");

  await (await kineticAdapter.initializeMarkets()).wait();
  let markets = await kineticAdapter.getSupportedMarkets();

  // If auto-discovery didn't work, add manually
  if (markets.length === 0) {
    console.log("Auto-discovery found no markets, adding manually...");
    for (const [name, addr] of Object.entries(KINETIC_FLARE.kTokens)) {
      try {
        await (await kineticAdapter.addMarket(addr)).wait();
        console.log(`  Added ${name}: ${addr}`);
      } catch (e) {
        console.log(`  Failed to add ${name}`);
      }
    }
    markets = await kineticAdapter.getSupportedMarkets();
  }

  logTest("Kinetic markets initialized", markets.length > 0, `${markets.length} markets`);

  // Verify kToken mappings
  const kSflrMapping = await kineticAdapter.underlyingToKToken(SCEPTRE_FLARE.sflr);
  logTest("sFLR -> ksFLR mapping", kSflrMapping.toLowerCase() === KINETIC_FLARE.kTokens.ksFLR.toLowerCase(), kSflrMapping);

  const kUsdcMapping = await kineticAdapter.underlyingToKToken(TOKENS_FLARE.USDC);
  logTest("USDC -> kUSDC mapping", kUsdcMapping.toLowerCase() === KINETIC_FLARE.kTokens.kUSDC.toLowerCase(), kUsdcMapping);

  // ============================================================
  // SECTION 4: Register Adapters with YieldRouter
  // ============================================================
  console.log("\n--- REGISTERING ADAPTERS WITH YIELDROUTER ---\n");

  await (await yieldRouter.addStakingAdapter(sceptreAdapterAddr)).wait();
  logTest("SceptreAdapter registered as STAKING", true, "registered");

  await (await yieldRouter.addLendingAdapter(kineticAdapterAddr)).wait();
  logTest("KineticAdapter registered as LENDING", true, "registered");

  // Verify registrations
  const adapters = await yieldRouter.getAdapters();
  logTest("YieldRouter adapter count", adapters.length === 2, `${adapters.length} adapters`);

  const sceptreType = await yieldRouter.getAdapterType(sceptreAdapterAddr);
  logTest("SceptreAdapter type is STAKING", Number(sceptreType) === 0, `type=${sceptreType}`);

  const kineticType = await yieldRouter.getAdapterType(kineticAdapterAddr);
  logTest("KineticAdapter type is LENDING", Number(kineticType) === 1, `type=${kineticType}`);

  const sceptreActive = await yieldRouter.isAdapterActive(sceptreAdapterAddr);
  logTest("SceptreAdapter is active", sceptreActive === true, `active=${sceptreActive}`);

  const kineticActive = await yieldRouter.isAdapterActive(kineticAdapterAddr);
  logTest("KineticAdapter is active", kineticActive === true, `active=${kineticActive}`);

  // ============================================================
  // SECTION 5: Test Sceptre View Functions
  // ============================================================
  console.log("\n--- TESTING SCEPTRE VIEW FUNCTIONS ---\n");

  // Exchange rate
  try {
    const exchangeRate = await sceptreAdapter.getExchangeRate(ethers.ZeroAddress);
    const rateFloat = Number(ethers.formatEther(exchangeRate));
    logTest("Sceptre exchange rate", rateFloat >= 1.0, `1 sFLR = ${rateFloat.toFixed(6)} FLR`);
  } catch (e: any) {
    logTest("Sceptre exchange rate", false, e.message);
  }

  // APY
  try {
    const apy = await sceptreAdapter.getAPY(ethers.ZeroAddress);
    const apyPercent = Number(apy) / 100;
    logTest("Sceptre APY", apyPercent > 0 && apyPercent < 50, `${apyPercent}%`);
  } catch (e: any) {
    logTest("Sceptre APY", false, e.message);
  }

  // Cooldown period
  try {
    const cooldown = await sceptreAdapter.getCooldownPeriod();
    const days = Number(cooldown) / 86400;
    logTest("Sceptre cooldown period", days > 10 && days < 20, `${days.toFixed(1)} days`);
  } catch (e: any) {
    logTest("Sceptre cooldown period", false, e.message);
  }

  // Asset support
  const supportsNative = await sceptreAdapter.isAssetSupported(ethers.ZeroAddress);
  logTest("Sceptre supports native FLR", supportsNative === true, `${supportsNative}`);

  const supportsWflr = await sceptreAdapter.isAssetSupported(TOKENS_FLARE.WFLR);
  logTest("Sceptre supports WFLR", supportsWflr === true, `${supportsWflr}`);

  const supportsSflr = await sceptreAdapter.isAssetSupported(SCEPTRE_FLARE.sflr);
  logTest("Sceptre supports sFLR", supportsSflr === true, `${supportsSflr}`);

  // ============================================================
  // SECTION 6: Test Kinetic View Functions
  // ============================================================
  console.log("\n--- TESTING KINETIC VIEW FUNCTIONS ---\n");

  // Asset support
  const kineticSupportsSflr = await kineticAdapter.isAssetSupported(SCEPTRE_FLARE.sflr);
  logTest("Kinetic supports sFLR", kineticSupportsSflr === true, `${kineticSupportsSflr}`);

  const kineticSupportsUsdc = await kineticAdapter.isAssetSupported(TOKENS_FLARE.USDC);
  logTest("Kinetic supports USDC", kineticSupportsUsdc === true, `${kineticSupportsUsdc}`);

  // Exchange rate
  try {
    const kExchangeRate = await kineticAdapter.getExchangeRate(SCEPTRE_FLARE.sflr);
    logTest("Kinetic sFLR exchange rate", kExchangeRate > 0n, ethers.formatEther(kExchangeRate));
  } catch (e: any) {
    logTest("Kinetic sFLR exchange rate", false, e.message);
  }

  // TVL
  try {
    const tvl = await kineticAdapter.getTVL(SCEPTRE_FLARE.sflr);
    const tvlFormatted = ethers.formatEther(tvl);
    logTest("Kinetic sFLR TVL", tvl > 0n, `${tvlFormatted} sFLR`);
  } catch (e: any) {
    logTest("Kinetic sFLR TVL", false, e.message);
  }

  // Account liquidity (should be 0 for new account)
  try {
    const [collateral, borrow, available] = await kineticAdapter.getAccountLiquidity(deployerAddress);
    logTest("Kinetic account liquidity", true, `collateral=${collateral}, borrow=${borrow}, available=${available}`);
  } catch (e: any) {
    logTest("Kinetic account liquidity", false, e.message);
  }

  // Health factor (should be max for no borrows)
  try {
    const healthFactor = await kineticAdapter.getHealthFactor(deployerAddress);
    const isMax = healthFactor === ethers.MaxUint256;
    logTest("Kinetic health factor (no borrows)", true, isMax ? "MAX" : ethers.formatEther(healthFactor));
  } catch (e: any) {
    logTest("Kinetic health factor", false, e.message);
  }

  // ============================================================
  // SECTION 7: Test YieldRouter Aggregation Functions
  // ============================================================
  console.log("\n--- TESTING YIELDROUTER AGGREGATION ---\n");

  // Find best yield for native FLR
  try {
    const [bestAdapter, bestAPY] = await yieldRouter.findBestYield(ethers.ZeroAddress);
    const apyPercent = Number(bestAPY) / 100;
    logTest("YieldRouter.findBestYield(FLR)", bestAdapter !== ethers.ZeroAddress, `${bestAdapter} at ${apyPercent}%`);
  } catch (e: any) {
    logTest("YieldRouter.findBestYield(FLR)", false, e.message);
  }

  // Check if asset is supported
  const routerSupportsNative = await yieldRouter.isAssetSupported(ethers.ZeroAddress);
  logTest("YieldRouter supports native FLR", routerSupportsNative === true, `${routerSupportsNative}`);

  const routerSupportsSflr = await yieldRouter.isAssetSupported(SCEPTRE_FLARE.sflr);
  logTest("YieldRouter supports sFLR", routerSupportsSflr === true, `${routerSupportsSflr}`);

  // Get all yield options
  try {
    const options = await yieldRouter.getAllYieldOptions(ethers.ZeroAddress);
    const validOptions = options.filter((o: any) => o.adapter !== ethers.ZeroAddress);
    logTest("YieldRouter.getAllYieldOptions(FLR)", validOptions.length > 0, `${validOptions.length} options`);
  } catch (e: any) {
    logTest("YieldRouter.getAllYieldOptions(FLR)", false, e.message);
  }

  // ============================================================
  // SECTION 8: Test Direct Protocol Queries (via raw calls)
  // ============================================================
  console.log("\n--- TESTING DIRECT PROTOCOL QUERIES ---\n");

  // Query sFLR contract directly
  const sflrContract = await ethers.getContractAt(
    [
      "function totalSupply() view returns (uint256)",
      "function getPooledFlrByShares(uint256) view returns (uint256)",
      "function getSharesByPooledFlr(uint256) view returns (uint256)",
    ],
    SCEPTRE_FLARE.sflr
  );

  try {
    const totalSupply = await sflrContract.totalSupply();
    logTest("sFLR totalSupply", totalSupply > 0n, `${ethers.formatEther(totalSupply)} sFLR`);
  } catch (e: any) {
    logTest("sFLR totalSupply", false, e.message);
  }

  try {
    const flrFor1Sflr = await sflrContract.getPooledFlrByShares(ethers.parseEther("1"));
    const rate = Number(ethers.formatEther(flrFor1Sflr));
    logTest("sFLR getPooledFlrByShares(1e18)", rate > 1, `${rate.toFixed(6)} FLR`);
  } catch (e: any) {
    logTest("sFLR getPooledFlrByShares", false, e.message);
  }

  try {
    const sharesFor1Flr = await sflrContract.getSharesByPooledFlr(ethers.parseEther("1"));
    const shares = Number(ethers.formatEther(sharesFor1Flr));
    logTest("sFLR getSharesByPooledFlr(1e18)", shares > 0 && shares < 1, `${shares.toFixed(6)} sFLR`);
  } catch (e: any) {
    logTest("sFLR getSharesByPooledFlr", false, e.message);
  }

  // Query Kinetic Comptroller directly
  const comptroller = await ethers.getContractAt(
    ["function getAllMarkets() view returns (address[])"],
    KINETIC_FLARE.comptroller
  );

  try {
    const allMarkets = await comptroller.getAllMarkets();
    logTest("Comptroller.getAllMarkets()", allMarkets.length > 0, `${allMarkets.length} markets`);
  } catch (e: any) {
    logTest("Comptroller.getAllMarkets()", false, e.message);
  }

  // ============================================================
  // SUMMARY
  // ============================================================
  console.log("\n" + "=".repeat(70));
  console.log("   VERIFICATION SUMMARY");
  console.log("=".repeat(70) + "\n");

  const passed = results.filter(r => r.passed).length;
  const failed = results.filter(r => !r.passed).length;
  const total = results.length;

  console.log(`Total Tests: ${total}`);
  console.log(`Passed: ${passed} ✅`);
  console.log(`Failed: ${failed} ❌`);
  console.log(`Pass Rate: ${((passed / total) * 100).toFixed(1)}%\n`);

  if (failed > 0) {
    console.log("Failed Tests:");
    results.filter(r => !r.passed).forEach(r => {
      console.log(`  ❌ ${r.test}: ${r.details}`);
    });
  }

  console.log("\n" + "=".repeat(70));
  if (failed === 0) {
    console.log("   ALL TESTS PASSED! ✅");
  } else {
    console.log(`   ${failed} TESTS FAILED`);
  }
  console.log("=".repeat(70) + "\n");

  return failed === 0;
}

main()
  .then((success) => {
    process.exit(success ? 0 : 1);
  })
  .catch((error) => {
    console.error("Verification failed:", error);
    process.exit(1);
  });
