/**
 * Final ABI Discovery - Extract selectors from bytecode and brute force common patterns
 */

import { network } from "hardhat";
import { SPARKDEX_ETERNAL_FLARE } from "../helpers/perpetualAddresses.js";

const { ethers } = await network.connect();

const STORE = SPARKDEX_ETERNAL_FLARE.store;
const FUNDING_TRACKER = SPARKDEX_ETERNAL_FLARE.fundingTracker;

const ETH_USD = "0x4554482d555344000000"; // bytes10 "ETH-USD"

console.log("=".repeat(70));
console.log("FINAL ABI DISCOVERY");
console.log("=".repeat(70));

// Extract 4-byte selectors from contract bytecode
async function extractSelectors(address: string, name: string): Promise<string[]> {
  const code = await ethers.provider.getCode(address);
  const selectors: Set<string> = new Set();

  // Look for PUSH4 opcodes (0x63) followed by 4 bytes - these are often function selectors
  for (let i = 0; i < code.length - 10; i += 2) {
    const byte = code.slice(i, i + 2);
    // Look for patterns that look like function dispatch (PUSH4 followed by selector comparison)
    if (byte === "63") {
      const potential = code.slice(i + 2, i + 10);
      if (potential.length === 8) {
        selectors.add("0x" + potential);
      }
    }
  }

  console.log(`\n${name}: Found ${selectors.size} potential selectors`);
  return Array.from(selectors);
}

// Test each selector with no args
async function testSelector(address: string, selector: string): Promise<{ success: boolean; words: number; result?: string }> {
  try {
    const result = await ethers.provider.call({ to: address, data: selector });
    if (result && result.length > 2) {
      return { success: true, words: (result.length - 2) / 64, result };
    }
    return { success: false, words: 0 };
  } catch {
    return { success: false, words: 0 };
  }
}

// Known function signatures for reverse lookup
const knownSignatures: Record<string, string> = {
  // Standard
  "0x8da5cb5b": "owner()",
  "0x12d43a51": "gov()",
  "0x975057e7": "store()",
  "0x791b98bc": "positionManager()",
  "0x56ede431": "getPositionCount()",

  // Market functions
  "0x5b9907a4": "getMarketList()",
  "0xfd69f3c2": "getMarketCount()",
  "0x7061696b": "getMarket(bytes10)",

  // Common view functions
  "0x01f91cc7": "fundingInterval()",
  "0x06fdde03": "name()",
  "0x95d89b41": "symbol()",
  "0x313ce567": "decimals()",
  "0x18160ddd": "totalSupply()",

  // Funding
  "0x13f5d35e": "fundingRate()",

  // Collateral candidates
  "0xfc0c546a": "token()",
  "0x38d52e0f": "asset()",
  "0x6f307dc3": "underlying()",
  "0xe5a6b10f": "currency()",
  "0xd8dfeb45": "collateral()",
  "0xb2016bd4": "collateralToken()",
};

// Test Store contract
console.log("\n" + "=".repeat(70));
console.log("TESTING STORE SELECTORS");
console.log("=".repeat(70));

const storeSelectors = await extractSelectors(STORE, "Store");

// Test each selector
const workingStore: { selector: string; words: number; name?: string }[] = [];
for (const selector of storeSelectors.slice(0, 100)) {
  const result = await testSelector(STORE, selector);
  if (result.success) {
    const name = knownSignatures[selector] || "unknown";
    workingStore.push({ selector, words: result.words, name });
  }
}

console.log(`\nWorking selectors (no args):`);
for (const { selector, words, name } of workingStore) {
  console.log(`  ${selector} => ${words} words ${name !== "unknown" ? `(${name})` : ""}`);
}

// Test FundingTracker
console.log("\n" + "=".repeat(70));
console.log("TESTING FUNDING TRACKER SELECTORS");
console.log("=".repeat(70));

const ftSelectors = await extractSelectors(FUNDING_TRACKER, "FundingTracker");

const workingFT: { selector: string; words: number; name?: string }[] = [];
for (const selector of ftSelectors.slice(0, 100)) {
  const result = await testSelector(FUNDING_TRACKER, selector);
  if (result.success) {
    const name = knownSignatures[selector] || "unknown";
    workingFT.push({ selector, words: result.words, name });
  }
}

console.log(`\nWorking selectors (no args):`);
for (const { selector, words, name } of workingFT) {
  console.log(`  ${selector} => ${words} words ${name !== "unknown" ? `(${name})` : ""}`);
}

// Now let's try to find OI and funding functions by probing with bytes10 arg
console.log("\n" + "=".repeat(70));
console.log("PROBING STORE WITH BYTES10 ARG (ETH-USD)");
console.log("=".repeat(70));

const marketArg = ETH_USD.slice(2).padEnd(64, '0');

// Hash common OI/funding function names
const oiFunctionNames = [
  "getOI(bytes10)",
  "getOpenInterest(bytes10)",
  "openInterest(bytes10)",
  "OI(bytes10)",
  "oi(bytes10)",
  "getOILong(bytes10)",
  "getOIShort(bytes10)",
  "oiLong(bytes10)",
  "oiShort(bytes10)",
  "openInterestLong(bytes10)",
  "openInterestShort(bytes10)",
  "longOI(bytes10)",
  "shortOI(bytes10)",
  "getLongOI(bytes10)",
  "getShortOI(bytes10)",
  "marketOI(bytes10)",
  "getMarketOI(bytes10)",
];

for (const funcName of oiFunctionNames) {
  const selector = ethers.id(funcName).slice(0, 10);
  try {
    const result = await ethers.provider.call({ to: STORE, data: selector + marketArg });
    if (result && result.length > 2) {
      const words = (result.length - 2) / 64;
      if (words === 1) {
        const val = BigInt(result);
        console.log(`✓ ${funcName.padEnd(30)} [${selector}] => ${val.toString()}`);
      } else if (words === 2) {
        const val1 = BigInt("0x" + result.slice(2, 66));
        const val2 = BigInt("0x" + result.slice(66, 130));
        console.log(`✓ ${funcName.padEnd(30)} [${selector}] => long: ${val1}, short: ${val2}`);
      } else {
        console.log(`✓ ${funcName.padEnd(30)} [${selector}] => ${words} words`);
      }
    }
  } catch {
    // skip
  }
}

// Probe FundingTracker with market arg
console.log("\n" + "=".repeat(70));
console.log("PROBING FUNDING TRACKER WITH BYTES10 ARG");
console.log("=".repeat(70));

const fundingFunctionNames = [
  "getFunding(bytes10)",
  "getFundingRate(bytes10)",
  "fundingRate(bytes10)",
  "currentFundingRate(bytes10)",
  "accumulatedFunding(bytes10)",
  "getAccumulatedFunding(bytes10)",
  "fundingFactor(bytes10)",
  "getFundingFactor(bytes10)",
  "lastFundingTime(bytes10)",
  "getLastFundingTime(bytes10)",
  "lastUpdate(bytes10)",
  "lastUpdates(bytes10)",
  "fundingTracker(bytes10)",
  "getFundingTracker(bytes10)",
  "marketFunding(bytes10)",
];

for (const funcName of fundingFunctionNames) {
  const selector = ethers.id(funcName).slice(0, 10);
  try {
    const result = await ethers.provider.call({ to: FUNDING_TRACKER, data: selector + marketArg });
    if (result && result.length > 2) {
      const words = (result.length - 2) / 64;
      if (words === 1) {
        const val = BigInt(result);
        // Handle signed values
        const valSigned = val > 2n ** 255n ? val - 2n ** 256n : val;
        console.log(`✓ ${funcName.padEnd(35)} [${selector}] => ${valSigned.toString()}`);
      } else {
        console.log(`✓ ${funcName.padEnd(35)} [${selector}] => ${words} words`);
      }
    }
  } catch {
    // skip
  }
}

// Let's decode the full getMarket response again with better interpretation
console.log("\n" + "=".repeat(70));
console.log("DECODING getMarket(ETH-USD) RESPONSE");
console.log("=".repeat(70));

const selector = "0x7061696b";
const result = await ethers.provider.call({ to: STORE, data: selector + marketArg });
const words = (result.length - 2) / 64;

console.log(`\nResponse has ${words} 32-byte words:\n`);

for (let i = 0; i < words; i++) {
  const word = result.slice(2 + i * 64, 2 + (i + 1) * 64);
  const asBigInt = BigInt("0x" + word);

  // Try to interpret
  let interpretation = "";

  // Check if it's ASCII text (first 16 bytes might be string)
  const firstHalf = Buffer.from(word.slice(0, 32), 'hex').toString('utf-8').replace(/[^\x20-\x7E]/g, '');
  if (firstHalf.length > 3) {
    interpretation = `"${firstHalf}"`;
  } else if (asBigInt === 0n) {
    interpretation = "(zero)";
  } else if (asBigInt === 1n) {
    interpretation = "(true/1)";
  } else if (asBigInt < 1000n) {
    interpretation = `(small number: ${asBigInt})`;
  } else if (asBigInt >= 1000n && asBigInt <= 100000n) {
    interpretation = `(basis points? ${Number(asBigInt) / 100}%)`;
  } else if (asBigInt > 2n ** 150n && asBigInt < 2n ** 160n) {
    interpretation = `(address? 0x${word.slice(24)})`;
  }

  console.log(`  Word ${i.toString().padStart(2)}: 0x${word.slice(0, 16)}... = ${asBigInt.toString().padStart(10)} ${interpretation}`);
}

// Market struct interpretation based on discovery:
console.log(`\n--- MARKET STRUCT INTERPRETATION ---`);
console.log(`
Based on analysis, the Market struct appears to be:

struct Market {
    bytes32 name;           // Word 0: "Ethereum / USD"
    bytes32 category;       // Word 1: "crypto"
    bool isActive;          // Word 2: 1 (true)
    uint256 maxLeverage;    // Word 3: 100 (100x)
    uint256 liquidationFee; // Word 4: 500 (0.5% = 500 basis points)
    uint256 ???;            // Word 5: 8
    uint256 ???;            // Word 6: 9500 (95%?)
    uint256 ???;            // Word 7: 5000 (50%?)
    uint256 ???;            // Word 8: 0
    uint256 ???;            // Word 9: 30
    uint256 ???;            // Word 10: 0
    uint256 ???;            // Word 11: 7
    bytes10 marketId;       // Word 12: ETH/USD bytes10
}
`);

console.log("\n" + "=".repeat(70));
console.log("DISCOVERY COMPLETE");
console.log("=".repeat(70));
