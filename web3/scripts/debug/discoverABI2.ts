/**
 * Deep ABI Discovery for SparkDEX Eternal
 * Probe function selectors systematically
 */

import { network } from "hardhat";
import { SPARKDEX_ETERNAL_FLARE, SPARKDEX_ETERNAL_COLLATERAL } from "../helpers/perpetualAddresses.js";

const { ethers } = await network.connect();

const STORE = SPARKDEX_ETERNAL_FLARE.store;
const POSITION_MANAGER = SPARKDEX_ETERNAL_FLARE.positionManager;
const FUNDING_TRACKER = SPARKDEX_ETERNAL_FLARE.fundingTracker;
const ORDER_BOOK = SPARKDEX_ETERNAL_FLARE.orderBook;
const TRADING_VALIDATOR = SPARKDEX_ETERNAL_FLARE.tradingValidator;

const ETH_USD = "0x4554482d555344000000"; // bytes10 "ETH-USD"
const TEST_ADDRESS = "0x0000000000000000000000000000000000000001";

console.log("=".repeat(70));
console.log("DEEP ABI DISCOVERY - SparkDEX Eternal");
console.log("=".repeat(70));

async function tryCall(contract: string, sig: string, args: any[] = []): Promise<{ success: boolean; result?: any; error?: string }> {
  try {
    const iface = new ethers.Interface([sig]);
    const funcName = sig.split("function ")[1].split("(")[0];
    const calldata = iface.encodeFunctionData(funcName, args);
    const result = await ethers.provider.call({ to: contract, data: calldata });
    if (result && result.length > 2) {
      const decoded = iface.decodeFunctionResult(funcName, result);
      return { success: true, result: decoded };
    }
    return { success: false, error: "Empty result" };
  } catch (e: any) {
    return { success: false, error: e.message?.slice(0, 50) || "Unknown error" };
  }
}

// ============================================================
// STORE CONTRACT
// ============================================================
console.log("\n" + "=".repeat(70));
console.log("STORE CONTRACT: " + STORE);
console.log("=".repeat(70));

const storeFunctions = [
  // Market functions
  "function getMarketList() view returns (bytes10[])",
  "function getMarketCount() view returns (uint256)",
  "function markets(bytes10) view returns (bytes32,bytes32,bool,uint256,uint256,uint256,uint256,uint256,uint256,uint256,uint256,uint256,bytes10)",

  // OI functions
  "function getOI(bytes10) view returns (uint256,uint256)",
  "function getOILong(bytes10) view returns (uint256)",
  "function getOIShort(bytes10) view returns (uint256)",
  "function oiLong(bytes10) view returns (uint256)",
  "function oiShort(bytes10) view returns (uint256)",

  // Collateral/Pool functions
  "function poolBalance() view returns (uint256)",
  "function getPoolBalance() view returns (uint256)",
  "function getVaultBalance() view returns (uint256)",
  "function totalDeposits() view returns (uint256)",
  "function getTotalDeposits() view returns (uint256)",
  "function bufferBalance() view returns (uint256)",
  "function getBufferBalance() view returns (uint256)",

  // Fee functions
  "function feePool() view returns (uint256)",
  "function getFeePool() view returns (uint256)",
  "function accruedFees() view returns (uint256)",

  // Token functions
  "function collateralToken() view returns (address)",
  "function getCollateralToken() view returns (address)",
  "function currency() view returns (address)",
  "function getCurrency() view returns (address)",

  // Admin functions
  "function owner() view returns (address)",
  "function gov() view returns (address)",
  "function governance() view returns (address)",

  // Market params
  "function getMaxLeverage(bytes10) view returns (uint256)",
  "function maxLeverage(bytes10) view returns (uint256)",
  "function getLiquidationFee(bytes10) view returns (uint256)",
  "function liquidationFee(bytes10) view returns (uint256)",
  "function getMaintenanceMargin(bytes10) view returns (uint256)",
  "function maintenanceMargin(bytes10) view returns (uint256)",
];

for (const sig of storeFunctions) {
  const funcName = sig.split("function ")[1].split("(")[0];
  const hasBytes10 = sig.includes("bytes10)");
  const args = hasBytes10 ? [ETH_USD] : [];
  const result = await tryCall(STORE, sig, args);
  if (result.success) {
    const values = result.result!.map((r: any) => {
      if (typeof r === "bigint") return r.toString();
      if (Array.isArray(r)) return `[${r.length} items]`;
      return r;
    });
    console.log(`✓ ${funcName}: ${values.join(", ")}`);
  }
}

// ============================================================
// POSITION MANAGER
// ============================================================
console.log("\n" + "=".repeat(70));
console.log("POSITION MANAGER: " + POSITION_MANAGER);
console.log("=".repeat(70));

const pmFunctions = [
  // Count functions
  "function getPositionCount() view returns (uint256)",
  "function positionCount() view returns (uint256)",
  "function getUserPositionCount(address) view returns (uint256)",

  // Position getters
  "function getPosition(address,bytes10) view returns (uint256,uint256,int256,int256,uint256)",
  "function getPosition(bytes32) view returns (uint256,uint256,int256,int256,uint256)",
  "function positions(address,bytes10) view returns (uint256,uint256,int256,int256,uint256)",

  // Try different position struct variants
  "function getPosition(address,bytes10) view returns (uint256,int256,uint256,int256,uint256,uint256)",
  "function getPosition(address,bytes10) view returns (int256,int256,uint256,uint256,bool)",

  // Key functions
  "function getPositionKey(address,bytes10) view returns (bytes32)",
  "function getKey(address,bytes10) view returns (bytes32)",

  // User positions
  "function getUserPositions(address) view returns (bytes32[])",
  "function getPositionIds(address) view returns (bytes32[])",

  // Config
  "function owner() view returns (address)",
  "function store() view returns (address)",
  "function getStore() view returns (address)",
];

for (const sig of pmFunctions) {
  const funcName = sig.split("function ")[1].split("(")[0];
  let args: any[] = [];
  if (sig.includes("address,bytes10")) args = [TEST_ADDRESS, ETH_USD];
  else if (sig.includes("bytes32)")) args = [ethers.ZeroHash];
  else if (sig.includes("address)")) args = [TEST_ADDRESS];

  const result = await tryCall(POSITION_MANAGER, sig, args);
  if (result.success) {
    const values = result.result!.map((r: any) => {
      if (typeof r === "bigint") return r.toString();
      if (Array.isArray(r)) return `[${r.length} items]`;
      return r;
    });
    console.log(`✓ ${funcName}: ${values.join(", ")}`);
  }
}

// ============================================================
// FUNDING TRACKER
// ============================================================
console.log("\n" + "=".repeat(70));
console.log("FUNDING TRACKER: " + FUNDING_TRACKER);
console.log("=".repeat(70));

const ftFunctions = [
  // Interval
  "function fundingInterval() view returns (uint256)",
  "function getFundingInterval() view returns (uint256)",

  // Funding rate
  "function getFundingRate(bytes10) view returns (int256)",
  "function fundingRate(bytes10) view returns (int256)",
  "function getCurrentFundingRate(bytes10) view returns (int256)",
  "function getFundingFactor(bytes10) view returns (int256)",
  "function fundingFactor(bytes10) view returns (int256)",

  // Accumulated funding
  "function getAccumulatedFunding(bytes10,bool) view returns (int256)",
  "function accumulatedFunding(bytes10) view returns (int256)",
  "function getAccumulatedFundingLong(bytes10) view returns (int256)",
  "function getAccumulatedFundingShort(bytes10) view returns (int256)",
  "function accumulatedFundingLong(bytes10) view returns (int256)",
  "function accumulatedFundingShort(bytes10) view returns (int256)",

  // Last update
  "function lastFundingTime(bytes10) view returns (uint256)",
  "function getLastFundingTime(bytes10) view returns (uint256)",
  "function lastUpdate(bytes10) view returns (uint256)",
  "function lastUpdates(bytes10) view returns (uint256)",

  // Config
  "function owner() view returns (address)",
  "function store() view returns (address)",
];

for (const sig of ftFunctions) {
  const funcName = sig.split("function ")[1].split("(")[0];
  let args: any[] = [];
  if (sig.includes("bytes10,bool")) args = [ETH_USD, true];
  else if (sig.includes("bytes10)")) args = [ETH_USD];

  const result = await tryCall(FUNDING_TRACKER, sig, args);
  if (result.success) {
    const values = result.result!.map((r: any) => {
      if (typeof r === "bigint") return r.toString();
      return r;
    });
    console.log(`✓ ${funcName}: ${values.join(", ")}`);
  }
}

// ============================================================
// ORDER BOOK
// ============================================================
console.log("\n" + "=".repeat(70));
console.log("ORDER BOOK: " + ORDER_BOOK);
console.log("=".repeat(70));

const obFunctions = [
  // Execution fee
  "function minExecutionFee() view returns (uint256)",
  "function executionFee() view returns (uint256)",
  "function getExecutionFee() view returns (uint256)",
  "function getMinExecutionFee() view returns (uint256)",

  // Order count
  "function getOrderCount() view returns (uint256)",
  "function orderCount() view returns (uint256)",
  "function nextOrderId() view returns (uint256)",
  "function orderId() view returns (uint256)",

  // User orders
  "function getUserOrderCount(address) view returns (uint256)",
  "function getUserOrders(address) view returns (bytes32[])",
  "function getOrders(address) view returns (bytes32[])",

  // Config
  "function owner() view returns (address)",
  "function store() view returns (address)",
  "function positionManager() view returns (address)",
];

for (const sig of obFunctions) {
  const funcName = sig.split("function ")[1].split("(")[0];
  let args: any[] = [];
  if (sig.includes("address)")) args = [TEST_ADDRESS];

  const result = await tryCall(ORDER_BOOK, sig, args);
  if (result.success) {
    const values = result.result!.map((r: any) => {
      if (typeof r === "bigint") {
        // Format as ETH if it looks like an execution fee
        if (funcName.toLowerCase().includes("fee") && r > 10n ** 15n) {
          return `${ethers.formatEther(r)} FLR`;
        }
        return r.toString();
      }
      return r;
    });
    console.log(`✓ ${funcName}: ${values.join(", ")}`);
  }
}

// ============================================================
// TRADING VALIDATOR
// ============================================================
console.log("\n" + "=".repeat(70));
console.log("TRADING VALIDATOR: " + TRADING_VALIDATOR);
console.log("=".repeat(70));

const tvFunctions = [
  "function owner() view returns (address)",
  "function store() view returns (address)",
  "function positionManager() view returns (address)",
  "function fundingTracker() view returns (address)",
  "function orderBook() view returns (address)",
  "function minCollateral() view returns (uint256)",
  "function getMinCollateral() view returns (uint256)",
  "function maxPositionSize() view returns (uint256)",
  "function getMaxPositionSize() view returns (uint256)",
];

for (const sig of tvFunctions) {
  const funcName = sig.split("function ")[1].split("(")[0];
  const result = await tryCall(TRADING_VALIDATOR, sig, []);
  if (result.success) {
    const values = result.result!.map((r: any) => {
      if (typeof r === "bigint") return r.toString();
      return r;
    });
    console.log(`✓ ${funcName}: ${values.join(", ")}`);
  }
}

// ============================================================
// RAW POSITION DATA EXPLORATION
// ============================================================
console.log("\n" + "=".repeat(70));
console.log("EXPLORING RAW POSITION DATA");
console.log("=".repeat(70));

// Try to get a real position by looking for position opened events
// First, let's try calling getPosition on a known position
const positionKey = ethers.keccak256(
  ethers.AbiCoder.defaultAbiCoder().encode(
    ["address", "bytes10"],
    [TEST_ADDRESS, ETH_USD]
  )
);
console.log(`\nPosition key for test address: ${positionKey}`);

// Raw call to getPosition
const getPosSigs = [
  "0x4f8632ba", // getPosition(bytes32)
  "0xeb02c301", // getPosition(address,bytes10) - common
];

for (const selector of getPosSigs) {
  try {
    let calldata: string;
    if (selector === "0x4f8632ba") {
      calldata = selector + positionKey.slice(2);
    } else {
      // Encode address,bytes10
      calldata = selector +
        ethers.zeroPadValue(TEST_ADDRESS, 32).slice(2) +
        ETH_USD.slice(2).padEnd(64, '0');
    }
    const result = await ethers.provider.call({ to: POSITION_MANAGER, data: calldata });
    if (result && result.length > 2) {
      console.log(`\nSelector ${selector} returned ${(result.length - 2) / 64} words:`);
      const words = (result.length - 2) / 64;
      for (let i = 0; i < Math.min(words, 10); i++) {
        const word = result.slice(2 + i * 64, 2 + (i + 1) * 64);
        const asBigInt = BigInt("0x" + word);
        console.log(`  Word ${i}: ${asBigInt.toString()}`);
      }
    }
  } catch (e) {
    // skip
  }
}

console.log("\n" + "=".repeat(70));
console.log("DISCOVERY COMPLETE");
console.log("=".repeat(70));
