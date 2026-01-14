/**
 * Test the updated SparkDEX Eternal interfaces against mainnet fork
 */

import { network } from "hardhat";
import { SPARKDEX_ETERNAL_FLARE } from "../helpers/perpetualAddresses.js";

const { ethers } = await network.connect();

const STORE = SPARKDEX_ETERNAL_FLARE.store;
const POSITION_MANAGER = SPARKDEX_ETERNAL_FLARE.positionManager;
const FUNDING_TRACKER = SPARKDEX_ETERNAL_FLARE.fundingTracker;
const ORDER_BOOK = SPARKDEX_ETERNAL_FLARE.orderBook;
const TRADING_VALIDATOR = SPARKDEX_ETERNAL_FLARE.tradingValidator;

const ETH_USD = "0x4554482d555344000000"; // bytes10 "ETH-USD"

console.log("=".repeat(70));
console.log("TESTING UPDATED INTERFACE");
console.log("=".repeat(70));

// Test Store interface
console.log("\n--- STORE CONTRACT ---");
const storeAbi = [
  "function gov() external view returns (address)",
  "function positionManager() external view returns (address)",
  "function addressStorage() external view returns (address)",
  "function getMarketList() external view returns (bytes10[] memory)",
  "function getMarketCount() external view returns (uint256)",
  "function getMarket(bytes10) external view returns (bytes32,bytes32,bool,uint256,uint256,uint256,uint256,uint256,uint256,uint256,uint256,uint256,bytes10)",
];

const store = await ethers.getContractAt(storeAbi, STORE);

try {
  const gov = await store.gov();
  console.log(`✓ gov(): ${gov}`);
} catch (e) {
  console.log(`✗ gov() failed`);
}

try {
  const pm = await store.positionManager();
  console.log(`✓ positionManager(): ${pm}`);
} catch (e) {
  console.log(`✗ positionManager() failed`);
}

try {
  const addrStorage = await store.addressStorage();
  console.log(`✓ addressStorage(): ${addrStorage}`);
} catch (e) {
  console.log(`✗ addressStorage() failed`);
}

try {
  const count = await store.getMarketCount();
  console.log(`✓ getMarketCount(): ${count}`);
} catch (e) {
  console.log(`✗ getMarketCount() failed`);
}

try {
  const markets = await store.getMarketList();
  console.log(`✓ getMarketList(): ${markets.length} markets`);
} catch (e) {
  console.log(`✗ getMarketList() failed`);
}

try {
  const market = await store.getMarket(ETH_USD);
  const name = Buffer.from(market[0].slice(2), 'hex').toString('utf-8').replace(/\0/g, '');
  const category = Buffer.from(market[1].slice(2), 'hex').toString('utf-8').replace(/\0/g, '');
  console.log(`✓ getMarket(ETH-USD):`);
  console.log(`    name: "${name}"`);
  console.log(`    category: "${category}"`);
  console.log(`    isActive: ${market[2]}`);
  console.log(`    maxLeverage: ${market[3]}x`);
  console.log(`    liquidationFee: ${market[4]} bps (${Number(market[4]) / 100}%)`);
  console.log(`    openFee: ${market[7]} bps (${Number(market[7]) / 100}%)`);
} catch (e: any) {
  console.log(`✗ getMarket(ETH-USD) failed: ${e.message?.slice(0, 50)}`);
}

// Test FundingTracker interface
console.log("\n--- FUNDING TRACKER ---");
const ftAbi = [
  "function gov() external view returns (address)",
  "function store() external view returns (address)",
  "function positionManager() external view returns (address)",
  "function fundingInterval() external view returns (uint256)",
];

const ft = await ethers.getContractAt(ftAbi, FUNDING_TRACKER);

try {
  const interval = await ft.fundingInterval();
  console.log(`✓ fundingInterval(): ${interval} seconds (${Number(interval) / 3600} hours)`);
} catch (e) {
  console.log(`✗ fundingInterval() failed`);
}

try {
  const storeAddr = await ft.store();
  console.log(`✓ store(): ${storeAddr}`);
} catch (e) {
  console.log(`✗ store() failed`);
}

// Test PositionManager interface
console.log("\n--- POSITION MANAGER ---");
const pmAbi = [
  "function gov() external view returns (address)",
  "function store() external view returns (address)",
  "function getPositionCount() external view returns (uint256)",
  "function getUserPositions(address) external view returns (bytes32[] memory)",
];

const pm = await ethers.getContractAt(pmAbi, POSITION_MANAGER);

try {
  const count = await pm.getPositionCount();
  console.log(`✓ getPositionCount(): ${count} positions`);
} catch (e: any) {
  console.log(`✗ getPositionCount() failed: ${e.message?.slice(0, 50)}`);
}

try {
  const positions = await pm.getUserPositions(ethers.ZeroAddress);
  console.log(`✓ getUserPositions(0x0): ${positions.length} positions`);
} catch (e: any) {
  console.log(`✗ getUserPositions() failed: ${e.message?.slice(0, 50)}`);
}

// Test OrderBook interface
console.log("\n--- ORDER BOOK ---");
const obAbi = [
  "function gov() external view returns (address)",
  "function store() external view returns (address)",
  "function positionManager() external view returns (address)",
  "function getUserOrderCount(address) external view returns (uint256)",
  "function getUserOrders(address) external view returns (bytes32[] memory)",
];

const ob = await ethers.getContractAt(obAbi, ORDER_BOOK);

try {
  const count = await ob.getUserOrderCount(ethers.ZeroAddress);
  console.log(`✓ getUserOrderCount(0x0): ${count} orders`);
} catch (e: any) {
  console.log(`✗ getUserOrderCount() failed: ${e.message?.slice(0, 50)}`);
}

try {
  const orders = await ob.getUserOrders(ethers.ZeroAddress);
  console.log(`✓ getUserOrders(0x0): ${orders.length} orders`);
} catch (e: any) {
  console.log(`✗ getUserOrders() failed: ${e.message?.slice(0, 50)}`);
}

// Test TradingValidator interface
console.log("\n--- TRADING VALIDATOR ---");
const tvAbi = [
  "function store() external view returns (address)",
  "function positionManager() external view returns (address)",
];

const tv = await ethers.getContractAt(tvAbi, TRADING_VALIDATOR);

try {
  const storeAddr = await tv.store();
  console.log(`✓ store(): ${storeAddr}`);
} catch (e: any) {
  console.log(`✗ store() failed: ${e.message?.slice(0, 50)}`);
}

try {
  const pmAddr = await tv.positionManager();
  console.log(`✓ positionManager(): ${pmAddr}`);
} catch (e: any) {
  console.log(`✗ positionManager() failed: ${e.message?.slice(0, 50)}`);
}

console.log("\n" + "=".repeat(70));
console.log("INTERFACE TEST COMPLETE");
console.log("=".repeat(70));
