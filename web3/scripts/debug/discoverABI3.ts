/**
 * Selector-based ABI Discovery for SparkDEX Eternal
 * Try common function selectors directly
 */

import { network } from "hardhat";
import { SPARKDEX_ETERNAL_FLARE, SPARKDEX_ETERNAL_COLLATERAL } from "../helpers/perpetualAddresses.js";

const { ethers } = await network.connect();

const STORE = SPARKDEX_ETERNAL_FLARE.store;
const POSITION_MANAGER = SPARKDEX_ETERNAL_FLARE.positionManager;
const FUNDING_TRACKER = SPARKDEX_ETERNAL_FLARE.fundingTracker;
const ORDER_BOOK = SPARKDEX_ETERNAL_FLARE.orderBook;

const ETH_USD = "0x4554482d555344000000"; // bytes10 "ETH-USD"

console.log("=".repeat(70));
console.log("SELECTOR-BASED ABI DISCOVERY");
console.log("=".repeat(70));

// Common selector names to try with no args
const noArgSelectors: [string, string][] = [
  // ERC20-like
  ["name()", "0x06fdde03"],
  ["symbol()", "0x95d89b41"],
  ["decimals()", "0x313ce567"],
  ["totalSupply()", "0x18160ddd"],

  // Ownership
  ["owner()", "0x8da5cb5b"],
  ["gov()", "0x12d43a51"],
  ["governance()", "0x5aa6e675"],
  ["admin()", "0xf851a440"],

  // Currency/collateral
  ["currency()", "0xe5a6b10f"],
  ["collateral()", "0xd8dfeb45"],
  ["collateralToken()", "0xb2016bd4"],
  ["token()", "0xfc0c546a"],
  ["asset()", "0x38d52e0f"],
  ["underlying()", "0x6f307dc3"],
  ["CURRENCY()", "0x0de88fba"],
  ["COLLATERAL()", "0x1bfba595"],

  // Pool/vault
  ["poolBalance()", "0x26b16e06"],
  ["vaultBalance()", "0xb18e7f9e"],
  ["totalDeposits()", "0x7d882097"],
  ["bufferBalance()", "0xb22d9b79"],
  ["reserves()", "0xd63a8e11"],
  ["balance()", "0xb69ef8a8"],
  ["getBalance()", "0x12065fe0"],

  // Fee
  ["feePool()", "0x40e3c97a"],
  ["accruedFees()", "0xb35278b7"],
  ["fees()", "0x9af1d35a"],

  // Position
  ["positionCount()", "0x6bcf2b60"],
  ["getPositionCount()", "0x56ede431"],
  ["nextPositionId()", "0x0e0e64a6"],

  // Order
  ["orderCount()", "0xc7c40fbb"],
  ["nextOrderId()", "0x6cae6290"],
  ["orderId()", "0xca3e8f7d"],

  // Funding
  ["fundingInterval()", "0x01f91cc7"],
  ["fundingRate()", "0x13f5d35e"],

  // Execution fee
  ["minExecutionFee()", "0x63ae2103"],
  ["executionFee()", "0x9b60d69c"],

  // Contract refs
  ["store()", "0x975057e7"],
  ["positionManager()", "0x791b98bc"],
  ["fundingTracker()", "0x9ddb9ed2"],
  ["orderBook()", "0x6a4dfb08"],
  ["priceFeed()", "0x741bef1a"],
  ["oracle()", "0x7dc0d1d0"],
  ["ftso()", "0x424e3d14"],
  ["chainlinkFeed()", "0x9ec5a894"],
];

async function trySelector(contract: string, selector: string, data: string = ""): Promise<string | null> {
  try {
    const calldata = selector + data;
    const result = await ethers.provider.call({ to: contract, data: calldata });
    if (result && result.length > 2) {
      return result;
    }
    return null;
  } catch {
    return null;
  }
}

console.log("\n" + "=".repeat(70));
console.log("STORE CONTRACT: " + STORE);
console.log("=".repeat(70));

for (const [name, selector] of noArgSelectors) {
  const result = await trySelector(STORE, selector);
  if (result) {
    const words = (result.length - 2) / 64;
    if (words === 1) {
      const val = BigInt(result);
      // Check if it's an address
      if (val < 2n ** 160n && val > 0n) {
        const addr = "0x" + result.slice(-40);
        console.log(`✓ ${name.padEnd(25)} => ${addr}`);
      } else if (val < 1000000n) {
        console.log(`✓ ${name.padEnd(25)} => ${val.toString()}`);
      } else {
        console.log(`✓ ${name.padEnd(25)} => ${val.toString()} (${ethers.formatEther(val)} in 18 dec)`);
      }
    } else {
      console.log(`✓ ${name.padEnd(25)} => ${words} words`);
    }
  }
}

// Try market-related selectors with bytes10 arg
console.log("\n--- With market ID (ETH-USD) ---");
const marketArg = ETH_USD.slice(2).padEnd(64, '0');
const marketSelectors: [string, string][] = [
  ["getMarket(bytes10)", "0x7061696b"],
  ["markets(bytes10)", "0x8b8f33d3"],
  ["getOI(bytes10)", "0xc0b92418"],
  ["getOILong(bytes10)", "0x7c32faa0"],
  ["getOIShort(bytes10)", "0x9a0eed37"],
  ["oiLong(bytes10)", "0x09a4e5f7"],
  ["oiShort(bytes10)", "0x4e8ed6aa"],
  ["openInterest(bytes10)", "0x5a3e251c"],
  ["maxLeverage(bytes10)", "0x2e4903a1"],
  ["fundingRate(bytes10)", "0x4b9f5c14"],
  ["accumulatedFunding(bytes10)", "0x3f9a8e1d"],
  ["lastFundingTime(bytes10)", "0x7b8c1a4f"],
  ["lastUpdates(bytes10)", "0x2d8a5fe1"],
];

for (const [name, selector] of marketSelectors) {
  const result = await trySelector(STORE, selector, marketArg);
  if (result) {
    const words = (result.length - 2) / 64;
    if (words === 1) {
      const val = BigInt(result);
      console.log(`✓ ${name.padEnd(30)} => ${val.toString()}`);
    } else if (words === 2) {
      const val1 = BigInt("0x" + result.slice(2, 66));
      const val2 = BigInt("0x" + result.slice(66, 130));
      console.log(`✓ ${name.padEnd(30)} => ${val1.toString()}, ${val2.toString()}`);
    } else {
      console.log(`✓ ${name.padEnd(30)} => ${words} words`);
    }
  }
}

// Check funding tracker selectors
console.log("\n" + "=".repeat(70));
console.log("FUNDING TRACKER: " + FUNDING_TRACKER);
console.log("=".repeat(70));

for (const [name, selector] of noArgSelectors) {
  const result = await trySelector(FUNDING_TRACKER, selector);
  if (result) {
    const words = (result.length - 2) / 64;
    if (words === 1) {
      const val = BigInt(result);
      if (val < 2n ** 160n && val > 0n) {
        const addr = "0x" + result.slice(-40);
        console.log(`✓ ${name.padEnd(25)} => ${addr}`);
      } else {
        console.log(`✓ ${name.padEnd(25)} => ${val.toString()}`);
      }
    } else {
      console.log(`✓ ${name.padEnd(25)} => ${words} words`);
    }
  }
}

console.log("\n--- With market ID ---");
for (const [name, selector] of marketSelectors) {
  const result = await trySelector(FUNDING_TRACKER, selector, marketArg);
  if (result) {
    const words = (result.length - 2) / 64;
    if (words === 1) {
      const val = BigInt(result);
      const valSigned = val > 2n ** 255n ? val - 2n ** 256n : val;
      console.log(`✓ ${name.padEnd(30)} => ${valSigned.toString()}`);
    } else if (words === 2) {
      const val1 = BigInt("0x" + result.slice(2, 66));
      const val2 = BigInt("0x" + result.slice(66, 130));
      console.log(`✓ ${name.padEnd(30)} => ${val1.toString()}, ${val2.toString()}`);
    } else {
      console.log(`✓ ${name.padEnd(30)} => ${words} words`);
    }
  }
}

// Position Manager
console.log("\n" + "=".repeat(70));
console.log("POSITION MANAGER: " + POSITION_MANAGER);
console.log("=".repeat(70));

for (const [name, selector] of noArgSelectors) {
  const result = await trySelector(POSITION_MANAGER, selector);
  if (result) {
    const words = (result.length - 2) / 64;
    if (words === 1) {
      const val = BigInt(result);
      if (val < 2n ** 160n && val > 0n) {
        const addr = "0x" + result.slice(-40);
        console.log(`✓ ${name.padEnd(25)} => ${addr}`);
      } else {
        console.log(`✓ ${name.padEnd(25)} => ${val.toString()}`);
      }
    } else {
      console.log(`✓ ${name.padEnd(25)} => ${words} words`);
    }
  }
}

// Order Book
console.log("\n" + "=".repeat(70));
console.log("ORDER BOOK: " + ORDER_BOOK);
console.log("=".repeat(70));

for (const [name, selector] of noArgSelectors) {
  const result = await trySelector(ORDER_BOOK, selector);
  if (result) {
    const words = (result.length - 2) / 64;
    if (words === 1) {
      const val = BigInt(result);
      if (val < 2n ** 160n && val > 0n) {
        const addr = "0x" + result.slice(-40);
        console.log(`✓ ${name.padEnd(25)} => ${addr}`);
      } else if (val < 1000000000000000000n) {
        console.log(`✓ ${name.padEnd(25)} => ${val.toString()}`);
      } else {
        console.log(`✓ ${name.padEnd(25)} => ${ethers.formatEther(val)} FLR`);
      }
    } else {
      console.log(`✓ ${name.padEnd(25)} => ${words} words`);
    }
  }
}

// Let's try some function signature hashing to find the actual currency function
console.log("\n" + "=".repeat(70));
console.log("SEARCHING FOR CURRENCY/COLLATERAL FUNCTION");
console.log("=".repeat(70));

const currencyVariants = [
  "currency()",
  "collateral()",
  "collateralToken()",
  "CURRENCY()",
  "COLLATERAL()",
  "getCollateral()",
  "getCurrency()",
  "usdt()",
  "USDT()",
  "token()",
  "baseToken()",
  "quoteToken()",
  "stableToken()",
];

for (const sig of currencyVariants) {
  const selector = ethers.id(sig).slice(0, 10);
  const result = await trySelector(STORE, selector);
  if (result) {
    const val = BigInt(result);
    if (val < 2n ** 160n && val > 0n) {
      const addr = "0x" + result.slice(-40);
      console.log(`✓ Store.${sig.padEnd(25)} [${selector}] => ${addr}`);
    }
  }
}

console.log("\n" + "=".repeat(70));
console.log("DISCOVERY COMPLETE");
console.log("=".repeat(70));
