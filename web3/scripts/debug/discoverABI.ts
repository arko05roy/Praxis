/**
 * Discover SparkDEX Eternal Contract ABIs by probing function selectors
 */

import { network } from "hardhat";
import { SPARKDEX_ETERNAL_FLARE } from "../helpers/perpetualAddresses.js";

const { ethers } = await network.connect();

const STORE = SPARKDEX_ETERNAL_FLARE.store;
const POSITION_MANAGER = SPARKDEX_ETERNAL_FLARE.positionManager;
const FUNDING_TRACKER = SPARKDEX_ETERNAL_FLARE.fundingTracker;
const ORDER_BOOK = SPARKDEX_ETERNAL_FLARE.orderBook;

// Known market for testing
const ETH_USD = "0x4554482d555344000000"; // bytes10

console.log("=".repeat(70));
console.log("SPARKDEX ETERNAL - ABI DISCOVERY");
console.log("=".repeat(70));

// Try different Market struct layouts
const marketStructVariants = [
  // All uint256
  "function getMarket(bytes10) view returns (bytes10,uint256,uint256,uint256,uint256,uint256,uint256,uint256,uint256,bool)",
  // With some smaller types
  "function getMarket(bytes10) view returns (bytes10,uint256,uint256,uint256,uint256,uint256,uint256,uint256,uint256,uint256)",
  // All uint256 no bool
  "function getMarket(bytes10) view returns (uint256,uint256,uint256,uint256,uint256,uint256,uint256,uint256,uint256,uint256)",
  // Try with bytes32
  "function getMarket(bytes10) view returns (bytes32,uint256,uint256,uint256,uint256,uint256,uint256,uint256,uint256,bool)",
];

console.log("\n" + "=".repeat(70));
console.log("STORE CONTRACT: " + STORE);
console.log("=".repeat(70));

// First, get raw data for getMarket
console.log("\n--- Raw getMarket response ---");
const selector = "0x7061696b"; // getMarket(bytes10)
const calldata = selector + ETH_USD.slice(2).padEnd(64, '0');
const rawResult = await ethers.provider.call({ to: STORE, data: calldata });
console.log("Raw response length:", rawResult.length);
console.log("Raw response (first 500 chars):", rawResult.slice(0, 500));

// Count the 32-byte words
const dataLen = (rawResult.length - 2) / 64;
console.log("Number of 32-byte words:", dataLen);

// Try to decode word by word
console.log("\n--- Word-by-word decode ---");
for (let i = 0; i < Math.min(dataLen, 15); i++) {
  const word = rawResult.slice(2 + i * 64, 2 + (i + 1) * 64);
  const asBigInt = BigInt("0x" + word);
  console.log(`Word ${i}: 0x${word}`);
  console.log(`  As uint256: ${asBigInt}`);
  if (asBigInt < 10000000000n) {
    console.log(`  Could be: leverage, fee, etc.`);
  }
}

// Try OI functions
console.log("\n--- Testing OI Functions ---");
const oiFunctions = [
  "function getOI(bytes10) view returns (uint256,uint256)",
  "function openInterestLong(bytes10) view returns (uint256)",
  "function openInterestShort(bytes10) view returns (uint256)",
  "function oi(bytes10) view returns (uint256,uint256)",
  "function getOILong(bytes10) view returns (uint256)",
  "function getOIShort(bytes10) view returns (uint256)",
];

for (const sig of oiFunctions) {
  try {
    const iface = new ethers.Interface([sig]);
    const funcName = sig.split("function ")[1].split("(")[0];
    const calldata = iface.encodeFunctionData(funcName, [ETH_USD]);
    const result = await ethers.provider.call({ to: STORE, data: calldata });
    if (result && result.length > 2) {
      const decoded = iface.decodeFunctionResult(funcName, result);
      console.log(`✓ ${funcName}: ${decoded.map((d: any) => d.toString())}`);
    }
  } catch (e) {
    // skip
  }
}

// Test FundingTracker
console.log("\n" + "=".repeat(70));
console.log("FUNDING TRACKER: " + FUNDING_TRACKER);
console.log("=".repeat(70));

const fundingFunctions = [
  "function getFundingRate(bytes10) view returns (int256)",
  "function fundingRate(bytes10) view returns (int256)",
  "function accumulatedFunding(bytes10) view returns (int256)",
  "function lastFundingTime(bytes10) view returns (uint256)",
  "function fundingInterval() view returns (uint256)",
  "function getAccumulatedFunding(bytes10,bool) view returns (int256)",
];

for (const sig of fundingFunctions) {
  try {
    const iface = new ethers.Interface([sig]);
    const funcName = sig.split("function ")[1].split("(")[0];
    let args: any[] = [];
    if (sig.includes("bytes10,bool")) {
      args = [ETH_USD, true];
    } else if (sig.includes("bytes10")) {
      args = [ETH_USD];
    }
    const calldata = iface.encodeFunctionData(funcName, args);
    const result = await ethers.provider.call({ to: FUNDING_TRACKER, data: calldata });
    if (result && result.length > 2) {
      const decoded = iface.decodeFunctionResult(funcName, result);
      console.log(`✓ ${funcName}: ${decoded.map((d: any) => d.toString())}`);
    }
  } catch (e) {
    // skip
  }
}

// Test PositionManager
console.log("\n" + "=".repeat(70));
console.log("POSITION MANAGER: " + POSITION_MANAGER);
console.log("=".repeat(70));

const pmFunctions = [
  "function getPositionCount() view returns (uint256)",
  "function getPosition(address,bytes10) view returns (uint256,uint256,uint256,int256,uint256)",
  "function getPosition(bytes32) view returns (uint256,uint256,uint256,int256,uint256)",
  "function positions(address,bytes10) view returns (uint256,uint256,uint256,int256,uint256)",
  "function getPositionKey(address,bytes10) view returns (bytes32)",
  "function getUserPositionCount(address) view returns (uint256)",
];

for (const sig of pmFunctions) {
  try {
    const iface = new ethers.Interface([sig]);
    const funcName = sig.split("function ")[1].split("(")[0];
    let args: any[] = [];
    if (sig.includes("address,bytes10")) {
      args = [ethers.ZeroAddress, ETH_USD];
    } else if (sig.includes("bytes32")) {
      args = [ethers.ZeroHash];
    } else if (sig.includes("address)")) {
      args = [ethers.ZeroAddress];
    }
    const calldata = iface.encodeFunctionData(funcName, args);
    const result = await ethers.provider.call({ to: POSITION_MANAGER, data: calldata });
    if (result && result.length > 2) {
      const decoded = iface.decodeFunctionResult(funcName, result);
      console.log(`✓ ${funcName}: ${decoded.map((d: any) => d.toString())}`);
    }
  } catch (e) {
    // skip
  }
}

// Try OrderBook
console.log("\n" + "=".repeat(70));
console.log("ORDER BOOK: " + ORDER_BOOK);
console.log("=".repeat(70));

const obFunctions = [
  "function minExecutionFee() view returns (uint256)",
  "function getExecutionFee() view returns (uint256)",
  "function executionFee() view returns (uint256)",
  "function getOrderCount() view returns (uint256)",
  "function orderCount() view returns (uint256)",
];

for (const sig of obFunctions) {
  try {
    const iface = new ethers.Interface([sig]);
    const funcName = sig.split("function ")[1].split("(")[0];
    const calldata = iface.encodeFunctionData(funcName, []);
    const result = await ethers.provider.call({ to: ORDER_BOOK, data: calldata });
    if (result && result.length > 2) {
      const decoded = iface.decodeFunctionResult(funcName, result);
      const value = decoded[0];
      if (funcName.toLowerCase().includes("fee")) {
        console.log(`✓ ${funcName}: ${ethers.formatEther(value)} FLR`);
      } else {
        console.log(`✓ ${funcName}: ${value.toString()}`);
      }
    }
  } catch (e) {
    // skip
  }
}

console.log("\n" + "=".repeat(70));
console.log("DISCOVERY COMPLETE");
console.log("=".repeat(70));
