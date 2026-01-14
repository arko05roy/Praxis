/**
 * Identify unknown selectors by analyzing their return values
 */

import { network } from "hardhat";
import { SPARKDEX_ETERNAL_FLARE, SPARKDEX_ETERNAL_COLLATERAL } from "../helpers/perpetualAddresses.js";

const { ethers } = await network.connect();

const STORE = SPARKDEX_ETERNAL_FLARE.store;
const POSITION_MANAGER = SPARKDEX_ETERNAL_FLARE.positionManager;
const FUNDING_TRACKER = SPARKDEX_ETERNAL_FLARE.fundingTracker;
const ORDER_BOOK = SPARKDEX_ETERNAL_FLARE.orderBook;
const ETH_USD = "0x4554482d555344000000";
const marketArg = ETH_USD.slice(2).padEnd(64, '0');

// Known addresses for comparison
const KNOWN_ADDRESSES = {
  [STORE.toLowerCase()]: "Store",
  [POSITION_MANAGER.toLowerCase()]: "PositionManager",
  [FUNDING_TRACKER.toLowerCase()]: "FundingTracker",
  [ORDER_BOOK.toLowerCase()]: "OrderBook",
  [SPARKDEX_ETERNAL_COLLATERAL.USDT0.toLowerCase()]: "USDT0",
  [SPARKDEX_ETERNAL_COLLATERAL.WFLR.toLowerCase()]: "WFLR",
  [SPARKDEX_ETERNAL_COLLATERAL.sFLR.toLowerCase()]: "sFLR",
  ["0xc4e793690af58f54c467122f94c288bcfbe74ec1"]: "Governance",
};

console.log("=".repeat(70));
console.log("IDENTIFYING UNKNOWN SELECTORS");
console.log("=".repeat(70));

// Store selectors to identify
const storeSelectors = [
  "0x266b895a",
  "0x2769c28f",
  "0x3765c0b8", // 6 words
  "0x3d4db043",
  "0x5636acaa",
  "0x565f129f",
  "0x59bca667",
  "0x612e1488",
  "0x7c4283bc",
  "0x8f12ec71",
  "0x9409d870",
  "0x9cda6b35",
  "0xa0aead4d",
  "0xa8e9a539",
  "0xad123ed6",
  "0xb05f233a",
  "0xbc063e1a",
  "0xc5831b9e",
  "0xc8724f30",
  "0xe60f4e40",
  "0xe9ade90e",
];

console.log("\n" + "=".repeat(70));
console.log("STORE UNKNOWN SELECTORS");
console.log("=".repeat(70));

for (const selector of storeSelectors) {
  try {
    const result = await ethers.provider.call({ to: STORE, data: selector });
    const words = (result.length - 2) / 64;
    console.log(`\n${selector}:`);

    if (words === 1) {
      const val = BigInt(result);
      // Check if it's an address
      if (result.slice(0, 26) === "0x000000000000000000000000" && val > 0n) {
        const addr = "0x" + result.slice(-40).toLowerCase();
        const name = KNOWN_ADDRESSES[addr] || "unknown contract";
        console.log(`  => Address: ${addr} (${name})`);
      } else {
        console.log(`  => uint256: ${val.toString()}`);
        if (val < 1000n) console.log(`     Small number`);
        else if (val >= 1000n && val <= 100000n) console.log(`     Likely basis points: ${Number(val) / 100}%`);
        else if (val > 10n ** 15n) console.log(`     Likely token amount: ${ethers.formatEther(val)} (18 dec) or ${ethers.formatUnits(val, 6)} (6 dec)`);
      }
    } else {
      console.log(`  => ${words} words returned`);
      // Show first few values
      for (let i = 0; i < Math.min(words, 4); i++) {
        const word = result.slice(2 + i * 64, 2 + (i + 1) * 64);
        const val = BigInt("0x" + word);
        if (val > 0n && val < 2n ** 160n && result.slice(2 + i * 64, 2 + i * 64 + 24) === "000000000000000000000000") {
          console.log(`     Word ${i}: Address 0x${word.slice(-40)}`);
        } else if (val < 10000n) {
          console.log(`     Word ${i}: ${val.toString()}`);
        } else {
          console.log(`     Word ${i}: ${val.toString().slice(0, 15)}...`);
        }
      }
    }
  } catch (e) {
    console.log(`${selector}: Error`);
  }
}

// FundingTracker selectors
const ftSelectors = [
  "0x612e1488",
  "0x9849e412",
  "0x9d8e2177",
  "0xa8e9a539",
];

console.log("\n" + "=".repeat(70));
console.log("FUNDING TRACKER UNKNOWN SELECTORS");
console.log("=".repeat(70));

for (const selector of ftSelectors) {
  try {
    const result = await ethers.provider.call({ to: FUNDING_TRACKER, data: selector });
    const words = (result.length - 2) / 64;
    console.log(`\n${selector}:`);

    if (words === 1) {
      const val = BigInt(result);
      if (result.slice(0, 26) === "0x000000000000000000000000" && val > 0n) {
        const addr = "0x" + result.slice(-40).toLowerCase();
        const name = KNOWN_ADDRESSES[addr] || "unknown contract";
        console.log(`  => Address: ${addr} (${name})`);
      } else {
        console.log(`  => uint256: ${val.toString()}`);
      }
    }
  } catch (e) {
    console.log(`${selector}: Error`);
  }
}

// Test selectors with market argument
console.log("\n" + "=".repeat(70));
console.log("TESTING STORE SELECTORS WITH MARKET ARG");
console.log("=".repeat(70));

// All store selectors again but with market arg
for (const selector of storeSelectors.slice(0, 10)) {
  try {
    const result = await ethers.provider.call({ to: STORE, data: selector + marketArg });
    if (result && result.length > 2) {
      const words = (result.length - 2) / 64;
      const val = BigInt("0x" + result.slice(2, 66));
      console.log(`${selector}(bytes10) => ${words} words, first: ${val.toString()}`);
    }
  } catch {
    // skip
  }
}

// Try to find OI by looking at the Store's bytecode for specific function calls
console.log("\n" + "=".repeat(70));
console.log("LOOKING FOR OI-RELATED FUNCTIONS");
console.log("=".repeat(70));

// Hash more function names
const moreFunctions = [
  "getMarketOI(bytes10)",
  "marketOI(bytes10)",
  "totalOI(bytes10)",
  "getGlobalOI()",
  "globalOI()",
  "totalLongOI()",
  "totalShortOI()",
  "getTotalOI()",
  "getPool()",
  "pool()",
  "vault()",
  "getVault()",
  "collateralBalance()",
  "getCollateralBalance()",
  "marginBalance()",
  "getMarginBalance()",
  "globalLongOI(bytes10)",
  "globalShortOI(bytes10)",
  "getUserOI(address,bytes10)",
];

for (const func of moreFunctions) {
  const selector = ethers.id(func).slice(0, 10);
  let data = selector;
  if (func.includes("bytes10)")) data = selector + marketArg;
  else if (func.includes("address,bytes10")) data = selector + ethers.zeroPadValue("0x0000000000000000000000000000000000000001", 32).slice(2) + marketArg;

  try {
    const result = await ethers.provider.call({ to: STORE, data });
    if (result && result.length > 2) {
      const words = (result.length - 2) / 64;
      if (words === 1) {
        const val = BigInt(result);
        console.log(`✓ ${func.padEnd(35)} [${selector}] => ${val.toString()}`);
      } else if (words === 2) {
        const v1 = BigInt("0x" + result.slice(2, 66));
        const v2 = BigInt("0x" + result.slice(66, 130));
        console.log(`✓ ${func.padEnd(35)} [${selector}] => ${v1}, ${v2}`);
      } else {
        console.log(`✓ ${func.padEnd(35)} [${selector}] => ${words} words`);
      }
    }
  } catch {
    // skip
  }
}

// Let's look for position manager functions that work with address + bytes10
console.log("\n" + "=".repeat(70));
console.log("POSITION MANAGER - TRYING getPosition VARIANTS");
console.log("=".repeat(70));

const positionFunctions = [
  "getPosition(address,bytes10)",
  "positions(address,bytes10)",
  "getPositionInfo(address,bytes10)",
  "positionInfo(address,bytes10)",
  "getUserPosition(address,bytes10)",
  "userPosition(address,bytes10)",
  "getPositionData(address,bytes10)",
  "getPositionDetails(address,bytes10)",
];

const testAddr = "0x0000000000000000000000000000000000000001";
const addrArg = ethers.zeroPadValue(testAddr, 32).slice(2);

for (const func of positionFunctions) {
  const selector = ethers.id(func).slice(0, 10);
  try {
    const result = await ethers.provider.call({
      to: POSITION_MANAGER,
      data: selector + addrArg + marketArg
    });
    if (result && result.length > 2) {
      const words = (result.length - 2) / 64;
      console.log(`✓ ${func.padEnd(40)} [${selector}] => ${words} words`);
      // Show decoded values
      for (let i = 0; i < Math.min(words, 6); i++) {
        const val = BigInt("0x" + result.slice(2 + i * 64, 2 + (i + 1) * 64));
        console.log(`     Word ${i}: ${val.toString()}`);
      }
    }
  } catch {
    // skip
  }
}

// Try Position Manager with different argument patterns
console.log("\n" + "=".repeat(70));
console.log("POSITION MANAGER - ADDITIONAL SELECTORS");
console.log("=".repeat(70));

const pmSelectors = [
  "0x56ede431", // getPositionCount()
  "0x6bcf2b60", // positionCount() - alternative
];

for (const selector of pmSelectors) {
  try {
    const result = await ethers.provider.call({ to: POSITION_MANAGER, data: selector });
    if (result && result.length > 2) {
      const val = BigInt(result);
      console.log(`${selector} => ${val.toString()}`);
    }
  } catch (e) {
    console.log(`${selector} => Error`);
  }
}

// Now let's check Order Book
console.log("\n" + "=".repeat(70));
console.log("ORDER BOOK - ALL WORKING SELECTORS");
console.log("=".repeat(70));

const orderBookFunctions = [
  "minExecutionFee()",
  "executionFee()",
  "getMinExecutionFee()",
  "orderIndex()",
  "getOrderIndex()",
  "orders(uint256)",
  "getOrder(uint256)",
  "increaseOrders(uint256)",
  "decreaseOrders(uint256)",
  "increaseOrdersIndex(address)",
  "decreaseOrdersIndex(address)",
  "increasePositionRequests(bytes32)",
  "decreasePositionRequests(bytes32)",
];

for (const func of orderBookFunctions) {
  const selector = ethers.id(func).slice(0, 10);
  let data = selector;
  if (func.includes("uint256)")) data = selector + ethers.zeroPadValue("0x01", 32).slice(2);
  if (func.includes("address)")) data = selector + addrArg;
  if (func.includes("bytes32)")) data = selector + ethers.ZeroHash.slice(2);

  try {
    const result = await ethers.provider.call({ to: ORDER_BOOK, data });
    if (result && result.length > 2) {
      const words = (result.length - 2) / 64;
      if (words === 1) {
        const val = BigInt(result);
        if (val > 10n ** 15n) {
          console.log(`✓ ${func.padEnd(35)} [${selector}] => ${ethers.formatEther(val)} FLR`);
        } else {
          console.log(`✓ ${func.padEnd(35)} [${selector}] => ${val.toString()}`);
        }
      } else {
        console.log(`✓ ${func.padEnd(35)} [${selector}] => ${words} words`);
      }
    }
  } catch {
    // skip
  }
}

console.log("\n" + "=".repeat(70));
console.log("DONE");
console.log("=".repeat(70));
