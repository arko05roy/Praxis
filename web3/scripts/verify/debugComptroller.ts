/**
 * Debug Kinetic Comptroller to understand getAllMarkets behavior
 */

import { network } from "hardhat";
import { KINETIC_FLARE } from "../helpers/yieldAddresses.js";

const { ethers } = await network.connect();

async function main() {
  console.log("\n=== Debugging Kinetic Comptroller ===\n");

  // Try both Unitroller and Comptroller addresses
  const UNITROLLER = "0x8041680Fb73E1Fe5F851e76233DCDfA0f2D2D7c8";
  const COMPTROLLER_IMPL = KINETIC_FLARE.comptroller; // 0xeC7e541375D70c37262f619162502dB9131d6db5

  console.log(`Unitroller: ${UNITROLLER}`);
  console.log(`Comptroller (impl): ${COMPTROLLER_IMPL}`);

  const comptrollerABI = [
    "function getAllMarkets() view returns (address[])",
    "function markets(address) view returns (bool isListed, uint256 collateralFactorMantissa, bool isComped)",
  ];

  // Try Unitroller (proxy)
  console.log("\n--- Querying via Unitroller (proxy) ---");
  try {
    const unitroller = await ethers.getContractAt(comptrollerABI, UNITROLLER);
    const markets = await unitroller.getAllMarkets();
    console.log(`getAllMarkets returned ${markets.length} markets`);
    for (const m of markets) {
      console.log(`  - ${m}`);
    }

    // Check if ksFLR is listed
    const ksFLR = KINETIC_FLARE.kTokens.ksFLR;
    const marketInfo = await unitroller.markets(ksFLR);
    console.log(`\nksFLR market info via Unitroller:`);
    console.log(`  isListed: ${marketInfo[0]}`);
    console.log(`  collateralFactor: ${Number(marketInfo[1]) / 1e16}%`);
  } catch (e: any) {
    console.log(`Error: ${e.message}`);
  }

  // Try Comptroller impl directly
  console.log("\n--- Querying via Comptroller (impl) ---");
  try {
    const comptroller = await ethers.getContractAt(comptrollerABI, COMPTROLLER_IMPL);
    const markets = await comptroller.getAllMarkets();
    console.log(`getAllMarkets returned ${markets.length} markets`);
    for (const m of markets) {
      console.log(`  - ${m}`);
    }

    // Check if ksFLR is listed
    const ksFLR = KINETIC_FLARE.kTokens.ksFLR;
    const marketInfo = await comptroller.markets(ksFLR);
    console.log(`\nksFLR market info via Comptroller impl:`);
    console.log(`  isListed: ${marketInfo[0]}`);
    console.log(`  collateralFactor: ${Number(marketInfo[1]) / 1e16}%`);
  } catch (e: any) {
    console.log(`Error: ${e.message}`);
  }

  // Directly query kToken to verify it exists
  console.log("\n--- Direct kToken Queries ---");
  const ksFLR = KINETIC_FLARE.kTokens.ksFLR;
  const kTokenABI = [
    "function underlying() view returns (address)",
    "function comptroller() view returns (address)",
    "function getCash() view returns (uint256)",
  ];

  try {
    const kToken = await ethers.getContractAt(kTokenABI, ksFLR);
    const underlying = await kToken.underlying();
    const comptrollerAddr = await kToken.comptroller();
    const cash = await kToken.getCash();

    console.log(`ksFLR (${ksFLR}):`);
    console.log(`  underlying: ${underlying}`);
    console.log(`  comptroller: ${comptrollerAddr}`);
    console.log(`  cash: ${ethers.formatEther(cash)}`);
  } catch (e: any) {
    console.log(`Error: ${e.message}`);
  }
}

main().then(() => process.exit(0)).catch(e => { console.error(e); process.exit(1); });
