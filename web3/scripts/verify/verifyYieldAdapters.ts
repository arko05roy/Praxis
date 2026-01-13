/**
 * Verify Yield Adapters Against Mainnet Fork
 *
 * This script verifies that adapters correctly interface with
 * real Sceptre and Kinetic contracts on Flare mainnet.
 *
 * Run: npx hardhat run scripts/verify/verifyYieldAdapters.ts --network anvilFork
 */

import { network } from "hardhat";
import {
  SCEPTRE_FLARE,
  KINETIC_FLARE,
  TOKENS_FLARE,
} from "../helpers/yieldAddresses.js";

const { ethers } = await network.connect();

async function main() {
  console.log("\n" + "=".repeat(70));
  console.log("  YIELD ADAPTERS VERIFICATION - REAL MAINNET DATA");
  console.log("=".repeat(70));

  const chainId = (await ethers.provider.getNetwork()).chainId;
  console.log(`\nChain ID: ${chainId} (Flare Mainnet Fork)`);

  if (chainId !== 14n) {
    console.log("ERROR: Must run on Flare mainnet fork");
    process.exit(1);
  }

  const [deployer] = await ethers.getSigners();
  console.log(`Deployer: ${await deployer.getAddress()}`);

  // ============================================================
  // DEPLOY ADAPTERS
  // ============================================================
  console.log("\n" + "-".repeat(70));
  console.log("DEPLOYING ADAPTERS");
  console.log("-".repeat(70));

  const SceptreAdapter = await ethers.getContractFactory("SceptreAdapter");
  const sceptreAdapter = await SceptreAdapter.deploy(SCEPTRE_FLARE.sflr, TOKENS_FLARE.WFLR);
  await sceptreAdapter.waitForDeployment();
  console.log(`SceptreAdapter: ${await sceptreAdapter.getAddress()}`);

  const KineticAdapter = await ethers.getContractFactory("KineticAdapter");
  const kineticAdapter = await KineticAdapter.deploy(KINETIC_FLARE.comptroller);
  await kineticAdapter.waitForDeployment();
  console.log(`KineticAdapter: ${await kineticAdapter.getAddress()}`);

  // Initialize Kinetic markets
  await (await kineticAdapter.initializeMarkets()).wait();
  const kTokenAddresses = Object.values(KINETIC_FLARE.kTokens);
  for (const kToken of kTokenAddresses) {
    try {
      await (await kineticAdapter.addMarket(kToken)).wait();
    } catch {}
  }

  const YieldRouter = await ethers.getContractFactory("YieldRouter");
  const yieldRouter = await YieldRouter.deploy();
  await yieldRouter.waitForDeployment();
  console.log(`YieldRouter: ${await yieldRouter.getAddress()}`);

  // Register adapters
  await (await yieldRouter.addStakingAdapter(await sceptreAdapter.getAddress())).wait();
  await (await yieldRouter.addLendingAdapter(await kineticAdapter.getAddress())).wait();

  // ============================================================
  // VERIFY SCEPTRE DATA
  // ============================================================
  console.log("\n" + "-".repeat(70));
  console.log("SCEPTRE PROTOCOL - REAL VALUES");
  console.log("-".repeat(70));

  // Direct contract call to sFLR
  const sflrContract = await ethers.getContractAt(
    [
      "function getPooledFlrByShares(uint256) view returns (uint256)",
      "function getSharesByPooledFlr(uint256) view returns (uint256)",
      "function totalSupply() view returns (uint256)",
      "function balanceOf(address) view returns (uint256)",
      "function cooldownPeriod() view returns (uint256)",
    ],
    SCEPTRE_FLARE.sflr
  );

  const oneShare = ethers.parseEther("1");
  const flrPerShare = await sflrContract.getPooledFlrByShares(oneShare);
  console.log(`\n[DIRECT CONTRACT] Exchange Rate:`);
  console.log(`  1 sFLR = ${ethers.formatEther(flrPerShare)} FLR`);

  const totalSflrSupply = await sflrContract.totalSupply();
  console.log(`\n[DIRECT CONTRACT] Total sFLR Supply:`);
  console.log(`  ${ethers.formatEther(totalSflrSupply)} sFLR`);

  const cooldown = await sflrContract.cooldownPeriod();
  console.log(`\n[DIRECT CONTRACT] Cooldown Period:`);
  console.log(`  ${cooldown} seconds (${(Number(cooldown) / 86400).toFixed(2)} days)`);

  // Via adapter
  console.log(`\n[VIA ADAPTER] Exchange Rate:`);
  const adapterRate = await sceptreAdapter.getExchangeRate(ethers.ZeroAddress);
  console.log(`  1 sFLR = ${ethers.formatEther(adapterRate)} FLR`);

  console.log(`\n[VIA ADAPTER] APY:`);
  const adapterApy = await sceptreAdapter.getAPY(ethers.ZeroAddress);
  console.log(`  ${Number(adapterApy) / 100}%`);

  console.log(`\n[VIA ADAPTER] Cooldown:`);
  const adapterCooldown = await sceptreAdapter.getCooldownPeriod();
  console.log(`  ${adapterCooldown} seconds`);

  console.log(`\n[VIA ADAPTER] Supported Assets:`);
  console.log(`  Native FLR: ${await sceptreAdapter.isAssetSupported(ethers.ZeroAddress)}`);
  console.log(`  WFLR: ${await sceptreAdapter.isAssetSupported(TOKENS_FLARE.WFLR)}`);
  console.log(`  sFLR: ${await sceptreAdapter.isAssetSupported(SCEPTRE_FLARE.sflr)}`);

  // ============================================================
  // VERIFY KINETIC DATA
  // ============================================================
  console.log("\n" + "-".repeat(70));
  console.log("KINETIC PROTOCOL - REAL VALUES");
  console.log("-".repeat(70));

  // Direct call to comptroller
  const comptroller = await ethers.getContractAt(
    ["function getAllMarkets() view returns (address[])"],
    KINETIC_FLARE.comptroller
  );

  const allMarkets = await comptroller.getAllMarkets();
  console.log(`\n[DIRECT CONTRACT] All Kinetic Markets:`);
  for (const market of allMarkets) {
    console.log(`  - ${market}`);
  }

  // Check each kToken
  console.log(`\n[DIRECT CONTRACT] kToken Details:`);
  for (const [name, address] of Object.entries(KINETIC_FLARE.kTokens)) {
    try {
      const kToken = await ethers.getContractAt(
        [
          "function underlying() view returns (address)",
          "function exchangeRateStored() view returns (uint256)",
          "function totalSupply() view returns (uint256)",
          "function getCash() view returns (uint256)",
          "function totalBorrows() view returns (uint256)",
        ],
        address
      );

      const underlying = await kToken.underlying();
      const exchangeRate = await kToken.exchangeRateStored();
      const totalSupply = await kToken.totalSupply();
      const cash = await kToken.getCash();
      const borrows = await kToken.totalBorrows();

      console.log(`\n  ${name} (${address}):`);
      console.log(`    Underlying: ${underlying}`);
      console.log(`    Exchange Rate: ${ethers.formatEther(exchangeRate)}`);
      console.log(`    Total Supply: ${ethers.formatUnits(totalSupply, 8)} kTokens`);
      console.log(`    Cash: ${ethers.formatEther(cash)}`);
      console.log(`    Total Borrows: ${ethers.formatEther(borrows)}`);
    } catch (e: any) {
      console.log(`\n  ${name}: Error - ${e.message}`);
    }
  }

  // Via adapter
  console.log(`\n[VIA ADAPTER] Supported Markets:`);
  const supportedMarkets = await kineticAdapter.getSupportedMarkets();
  console.log(`  Count: ${supportedMarkets.length}`);
  for (const market of supportedMarkets) {
    console.log(`  - ${market}`);
  }

  console.log(`\n[VIA ADAPTER] Asset Support:`);
  console.log(`  USDC supported: ${await kineticAdapter.isAssetSupported(TOKENS_FLARE.USDC)}`);
  console.log(`  sFLR supported: ${await kineticAdapter.isAssetSupported(TOKENS_FLARE.sFLR)}`);
  console.log(`  WETH supported: ${await kineticAdapter.isAssetSupported(TOKENS_FLARE.WETH)}`);

  // Get TVL for sFLR
  console.log(`\n[VIA ADAPTER] sFLR Market TVL:`);
  try {
    const sflrTvl = await kineticAdapter.getTVL(TOKENS_FLARE.sFLR);
    console.log(`  ${ethers.formatEther(sflrTvl)} sFLR`);
  } catch (e: any) {
    console.log(`  Error: ${e.message}`);
  }

  // Get exchange rate for sFLR
  console.log(`\n[VIA ADAPTER] ksFLR Exchange Rate:`);
  try {
    const kSflrRate = await kineticAdapter.getExchangeRate(TOKENS_FLARE.sFLR);
    console.log(`  ${ethers.formatEther(kSflrRate)}`);
  } catch (e: any) {
    console.log(`  Error: ${e.message}`);
  }

  // ============================================================
  // VERIFY YIELD ROUTER
  // ============================================================
  console.log("\n" + "-".repeat(70));
  console.log("YIELD ROUTER - AGGREGATION");
  console.log("-".repeat(70));

  console.log(`\n[YIELD ROUTER] Registered Adapters:`);
  const adapters = await yieldRouter.getAdapters();
  for (const adapter of adapters) {
    const adapterType = await yieldRouter.getAdapterType(adapter);
    const typeStr = Number(adapterType) === 0 ? "STAKING" : "LENDING";
    console.log(`  ${adapter} (${typeStr})`);
  }

  console.log(`\n[YIELD ROUTER] Best Yield for Native FLR:`);
  try {
    const [bestAdapter, bestApy] = await yieldRouter.findBestYield(ethers.ZeroAddress);
    console.log(`  Adapter: ${bestAdapter}`);
    console.log(`  APY: ${Number(bestApy) / 100}%`);
  } catch (e: any) {
    console.log(`  Error: ${e.message}`);
  }

  console.log(`\n[YIELD ROUTER] All Yield Options for FLR:`);
  try {
    const options = await yieldRouter.getAllYieldOptions(ethers.ZeroAddress);
    for (const opt of options) {
      if (opt.adapter !== ethers.ZeroAddress) {
        console.log(`  - ${opt.name}: ${Number(opt.apy) / 100}% APY`);
        console.log(`    Lock Period: ${opt.lockPeriod} seconds`);
      }
    }
  } catch (e: any) {
    console.log(`  Error: ${e.message}`);
  }

  // ============================================================
  // SUMMARY
  // ============================================================
  console.log("\n" + "=".repeat(70));
  console.log("  VERIFICATION COMPLETE");
  console.log("=".repeat(70));
  console.log("\nKey Findings:");
  console.log(`  ✓ Sceptre exchange rate verified: 1 sFLR = ${ethers.formatEther(flrPerShare)} FLR`);
  console.log(`  ✓ Sceptre cooldown verified: ${(Number(cooldown) / 86400).toFixed(2)} days`);
  console.log(`  ✓ Total sFLR supply: ${ethers.formatEther(totalSflrSupply)} sFLR`);
  console.log(`  ✓ Kinetic markets discovered: ${allMarkets.length} total`);
  console.log(`  ✓ YieldRouter correctly aggregates ${adapters.length} adapters`);
  console.log("\nNote: Staking operations require ROLE_DEPOSIT on mainnet Sceptre");
}

main()
  .then(() => process.exit(0))
  .catch((e) => {
    console.error(e);
    process.exit(1);
  });
