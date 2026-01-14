/**
 * Map selectors to function signatures by hashing
 */

import { network } from "hardhat";

const { ethers } = await network.connect();

// Unknown selectors we discovered
const unknownSelectors = [
  "0x266b895a",
  "0x2769c28f",
  "0x3765c0b8",
  "0x3d4db043",
  "0x5636acaa",
  "0x565f129f",
  "0x59bca667",
  "0x612e1488",
  "0x7c4283bc",
  "0x8f12ec71",
  "0x9409d870",
  "0x9849e412",
  "0x9cda6b35",
  "0x9d8e2177",
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

// Common function name patterns to try
const patterns = [
  // Config
  "maxLeverage", "minLeverage", "maxMargin", "minMargin",
  "maxPositionSize", "minPositionSize", "maxCollateral", "minCollateral",
  "liquidationFee", "liquidationThreshold", "maintenanceMargin",
  "borrowingRate", "fundingRate", "tradingFee", "openFee", "closeFee",

  // OI
  "openInterest", "globalOpenInterest", "longOpenInterest", "shortOpenInterest",
  "oiLong", "oiShort", "totalOI", "marketOI",

  // Addresses
  "addressStorage", "store", "positionManager", "fundingTracker",
  "orderBook", "executor", "oracle", "priceFeed", "ftso",
  "collateralToken", "currency", "vault", "pool",

  // Time
  "fundingInterval", "lastUpdate", "cooldown", "delay",
  "maxTimeToExecution", "minTimeToExecution",

  // Pool
  "poolBalance", "vaultBalance", "totalDeposits", "bufferBalance",
  "reserves", "liquidity", "availableLiquidity",

  // Position
  "positionCount", "getPositionCount", "totalPositions",

  // Fees
  "feePool", "accruedFees", "protocolFees",

  // Limits
  "maxUtilization", "targetUtilization", "utilizationThreshold",
];

// Suffixes to try
const suffixes = ["", "()"];
const prefixes = ["", "get", "Get", "max", "min", "total"];

console.log("=".repeat(70));
console.log("MAPPING SELECTORS TO FUNCTION NAMES");
console.log("=".repeat(70));

// Build mapping
const mapping: Map<string, string> = new Map();

for (const pattern of patterns) {
  for (const prefix of prefixes) {
    // No args version
    const funcName = prefix + pattern.charAt(0).toUpperCase() + pattern.slice(1);
    const selector = ethers.id(funcName + "()").slice(0, 10);
    if (unknownSelectors.includes(selector)) {
      mapping.set(selector, funcName + "()");
    }

    // bytes10 arg version
    const selectorB10 = ethers.id(funcName + "(bytes10)").slice(0, 10);
    if (unknownSelectors.includes(selectorB10)) {
      mapping.set(selectorB10, funcName + "(bytes10)");
    }
  }
}

// Try specific known function names
const specificFunctions = [
  "addressStorage()",
  "getAddressStorage()",
  "executor()",
  "getExecutor()",
  "orderBook()",
  "getOrderBook()",
  "fundingInterval()",
  "getFundingInterval()",
  "maxFundingRate()",
  "minFundingRate()",
  "maxFundingVelocity()",
  "fundingFactor()",
  "fundingExponent()",

  // Market config
  "interestRate(bytes10)",
  "borrowingFee(bytes10)",
  "fundingFee(bytes10)",
  "spreadFactor(bytes10)",
  "reserveFactor(bytes10)",

  // OI specific
  "globalLongs(bytes10)",
  "globalShorts(bytes10)",
  "guaranteedUsd(bytes10)",
  "reservedAmounts(bytes10)",

  // Collateral
  "getCollateralTokens()",
  "collateralTokens()",
  "supportedCollaterals()",
  "getCollateralCount()",
  "collateralCount()",
  "currencies(uint256)",
  "collaterals(uint256)",
  "getCollateral(uint256)",

  // Rates
  "interestRatePerSecond()",
  "interestRatePrecision()",
  "utilizationPrecision()",
  "maxInterestRate()",
  "baseInterestRate()",

  // Time
  "expirationTime()",
  "maxExpirationTime()",
  "minBlockDelayKeeper()",
  "minTimeDelayPublic()",
  "maxTimeDelay()",
];

for (const func of specificFunctions) {
  const selector = ethers.id(func).slice(0, 10);
  if (unknownSelectors.includes(selector)) {
    mapping.set(selector, func);
  }
}

// Print found mappings
console.log("\nFound mappings:");
for (const [selector, funcName] of mapping) {
  console.log(`  ${selector} => ${funcName}`);
}

// Print remaining unknown
console.log("\nStill unknown:");
for (const selector of unknownSelectors) {
  if (!mapping.has(selector)) {
    console.log(`  ${selector}`);
  }
}

// Let me also compute common function selectors
console.log("\n" + "=".repeat(70));
console.log("COMMON FUNCTION SELECTORS REFERENCE");
console.log("=".repeat(70));

const commonFuncs = [
  // Standard
  "gov()",
  "owner()",
  "store()",
  "positionManager()",
  "fundingTracker()",
  "orderBook()",
  "executor()",
  "addressStorage()",

  // Market
  "getMarketList()",
  "getMarketCount()",
  "getMarket(bytes10)",
  "markets(bytes10)",

  // Position
  "getPositionCount()",
  "getUserPositions(address)",
  "getPosition(address,bytes10)",
  "positions(address,bytes10)",

  // Funding
  "fundingInterval()",
  "getFundingRate(bytes10)",
  "getAccumulatedFunding(bytes10,bool)",
  "lastFundingTime(bytes10)",

  // Order
  "getUserOrderCount(address)",
  "getUserOrders(address)",
  "minExecutionFee()",

  // OI
  "getOI(bytes10)",
  "oiLong(bytes10)",
  "oiShort(bytes10)",
];

console.log("\n");
for (const func of commonFuncs) {
  const selector = ethers.id(func).slice(0, 10);
  console.log(`${func.padEnd(40)} => ${selector}`);
}

console.log("\n" + "=".repeat(70));
console.log("DONE");
console.log("=".repeat(70));
