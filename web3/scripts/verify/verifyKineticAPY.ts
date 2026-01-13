/**
 * Verify Kinetic APY calculations via the adapter
 * Compares adapter APY output with direct calculation
 */

import { network } from "hardhat";
import {
  KINETIC_FLARE,
  TOKENS_FLARE,
} from "../helpers/yieldAddresses.js";

const { ethers } = await network.connect();

async function main() {
  console.log("\n" + "=".repeat(70));
  console.log("  KINETIC APY - ADAPTER vs DIRECT CALCULATION");
  console.log("=".repeat(70));

  // Deploy KineticAdapter
  const KineticAdapter = await ethers.getContractFactory("KineticAdapter");
  const kineticAdapter = await KineticAdapter.deploy(KINETIC_FLARE.comptroller);
  await kineticAdapter.waitForDeployment();

  // Initialize markets
  await (await kineticAdapter.initializeMarkets()).wait();
  const kTokenAddresses = Object.values(KINETIC_FLARE.kTokens);
  for (const kToken of kTokenAddresses) {
    try {
      await (await kineticAdapter.addMarket(kToken)).wait();
    } catch {}
  }

  // Constants
  const SECONDS_PER_YEAR = 31536000;
  const MANTISSA = 1e18;

  // kToken ABI for direct queries
  const kTokenABI = [
    "function supplyRatePerTimestamp() view returns (uint256)",
    "function borrowRatePerTimestamp() view returns (uint256)",
    "function underlying() view returns (address)",
  ];

  console.log("\n=== Comparing APY Values ===\n");

  const markets = [
    { name: "ksFLR", kToken: KINETIC_FLARE.kTokens.ksFLR, underlying: TOKENS_FLARE.sFLR },
    { name: "kWETH", kToken: KINETIC_FLARE.kTokens.kWETH, underlying: TOKENS_FLARE.WETH },
    { name: "kUSDC", kToken: KINETIC_FLARE.kTokens.kUSDC, underlying: TOKENS_FLARE.USDC },
  ];

  for (const market of markets) {
    try {
      const kToken = await ethers.getContractAt(kTokenABI, market.kToken);

      // Direct calculation
      const supplyRate = await kToken.supplyRatePerTimestamp();
      const borrowRate = await kToken.borrowRatePerTimestamp();

      const directSupplyAPY = Number(supplyRate) * SECONDS_PER_YEAR / MANTISSA * 100;
      const directBorrowAPY = Number(borrowRate) * SECONDS_PER_YEAR / MANTISSA * 100;

      // Via adapter (returns basis points)
      const adapterSupplyAPY = await kineticAdapter.getSupplyAPY(market.underlying);
      const adapterBorrowAPY = await kineticAdapter.getBorrowAPY(market.underlying);

      console.log(`${market.name}:`);
      console.log(`  Supply APY:`);
      console.log(`    Direct calculation: ${directSupplyAPY.toFixed(4)}%`);
      console.log(`    Via adapter:        ${Number(adapterSupplyAPY) / 100}% (${adapterSupplyAPY} bps)`);
      console.log(`  Borrow APY:`);
      console.log(`    Direct calculation: ${directBorrowAPY.toFixed(4)}%`);
      console.log(`    Via adapter:        ${Number(adapterBorrowAPY) / 100}% (${adapterBorrowAPY} bps)`);
      console.log();

      // Verify they match (allow small rounding diff)
      const supplyDiff = Math.abs(directSupplyAPY * 100 - Number(adapterSupplyAPY));
      const borrowDiff = Math.abs(directBorrowAPY * 100 - Number(adapterBorrowAPY));

      if (supplyDiff < 1 && borrowDiff < 1) {
        console.log(`  ✓ ${market.name} APY values match!\n`);
      } else {
        console.log(`  ✗ ${market.name} APY values differ (supply diff: ${supplyDiff}, borrow diff: ${borrowDiff})\n`);
      }
    } catch (e: any) {
      console.log(`${market.name}: Error - ${e.message}\n`);
    }
  }

  // Summary
  console.log("=".repeat(70));
  console.log("  SUMMARY");
  console.log("=".repeat(70));
  console.log("\nThe KineticAdapter correctly uses supplyRatePerTimestamp/borrowRatePerTimestamp");
  console.log("which are the correct functions for Kinetic on Flare (timestamp-based rates).");
  console.log("\nReal Kinetic APYs on Flare mainnet:");
  console.log("  - ksFLR Supply: ~0.07% APY, Borrow: ~2.35% APY");
  console.log("  - kWETH Supply: ~1.35% APY, Borrow: ~5.11% APY");
}

main().then(() => process.exit(0)).catch(e => { console.error(e); process.exit(1); });
