/**
 * Query SparkDEX Eternal Real Values on Flare Mainnet Fork
 *
 * Usage:
 *   anvil --fork-url https://flare-api.flare.network/ext/C/rpc --port 8546
 *   npx hardhat run scripts/demo/querySparkDEXEternal.ts --network anvilFork
 */

import { network } from "hardhat";
import { SPARKDEX_ETERNAL_FLARE, SPARKDEX_ETERNAL_COLLATERAL } from "../helpers/perpetualAddresses.js";

const { ethers } = await network.connect();

// Contract addresses
const STORE = SPARKDEX_ETERNAL_FLARE.store;
const ORDER_BOOK = SPARKDEX_ETERNAL_FLARE.orderBook;
const POSITION_MANAGER = SPARKDEX_ETERNAL_FLARE.positionManager;
const FUNDING_TRACKER = SPARKDEX_ETERNAL_FLARE.fundingTracker;
const USDT = SPARKDEX_ETERNAL_COLLATERAL.USDT0;

const COLORS = {
  reset: "\x1b[0m",
  bright: "\x1b[1m",
  green: "\x1b[32m",
  yellow: "\x1b[33m",
  cyan: "\x1b[36m",
  red: "\x1b[31m",
};

function log(msg: string, color = COLORS.reset) {
  console.log(`${color}${msg}${COLORS.reset}`);
}

function formatUSD(value: bigint, decimals = 6): string {
  const num = Number(ethers.formatUnits(value, decimals));
  return num.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

log("\n" + "═".repeat(70), COLORS.cyan);
log("   SPARKDEX ETERNAL - LIVE MAINNET DATA (FLARE)", COLORS.bright);
log("═".repeat(70), COLORS.cyan);

// Get chain info
const networkInfo = await ethers.provider.getNetwork();
const blockNumber = await ethers.provider.getBlockNumber();
const block = await ethers.provider.getBlock(blockNumber);

log(`\n Network Info:`, COLORS.yellow);
log(`   Chain ID: ${networkInfo.chainId}`);
log(`   Block: ${blockNumber.toLocaleString()}`);
log(`   Timestamp: ${new Date(Number(block?.timestamp) * 1000).toISOString()}`);

// ============================================================
// MARKETS
// ============================================================
log("\n" + "-".repeat(70), COLORS.cyan);
log(" AVAILABLE MARKETS", COLORS.bright);
log("-".repeat(70), COLORS.cyan);

const storeAbi = [
  "function getMarketList() external view returns (bytes10[] memory)",
  "function getMarketCount() external view returns (uint256)",
];

const store = await ethers.getContractAt(storeAbi, STORE);
const markets = await store.getMarketList();

log(`\n   Found ${markets.length} active markets:\n`, COLORS.green);

const marketNames: string[] = [];
for (let i = 0; i < markets.length; i++) {
  const hex = ethers.hexlify(markets[i]);
  const name = Buffer.from(hex.slice(2), 'hex').toString('utf-8').replace(/\0/g, '');
  marketNames.push(name);
  log(`   ${(i + 1).toString().padStart(2)}. ${name}`);
}

// ============================================================
// POSITION STATS
// ============================================================
log("\n" + "-".repeat(70), COLORS.cyan);
log(" POSITION STATISTICS", COLORS.bright);
log("-".repeat(70), COLORS.cyan);

try {
  const pmAbi = ["function getPositionCount() external view returns (uint256)"];
  const pm = await ethers.getContractAt(pmAbi, POSITION_MANAGER);
  const positionCount = await pm.getPositionCount();
  log(`\n   Total Positions Created: ${positionCount.toString()}`, COLORS.green);
} catch (e) {
  log(`\n   Could not fetch position count`, COLORS.red);
}

// ============================================================
// COLLATERAL TOKEN
// ============================================================
log("\n" + "-".repeat(70), COLORS.cyan);
log(" COLLATERAL TOKEN (USDT0)", COLORS.bright);
log("-".repeat(70), COLORS.cyan);

const erc20Abi = [
  "function totalSupply() external view returns (uint256)",
  "function balanceOf(address) external view returns (uint256)",
  "function decimals() external view returns (uint8)",
  "function symbol() external view returns (string)",
  "function name() external view returns (string)",
];

const usdt = await ethers.getContractAt(erc20Abi, USDT);
const symbol = await usdt.symbol();
const usdtName = await usdt.name();
const decimals = await usdt.decimals();
const totalSupply = await usdt.totalSupply();

log(`\n   Token: ${usdtName} (${symbol})`, COLORS.green);
log(`   Contract: ${USDT}`);
log(`   Decimals: ${decimals}`);
log(`   Total Supply: $${formatUSD(totalSupply, Number(decimals))}`);

// Check TVL in SparkDEX contracts
const vaultAddresses = [
  { name: "Store", addr: STORE },
  { name: "OrderBook", addr: ORDER_BOOK },
  { name: "PositionManager", addr: POSITION_MANAGER },
];

log(`\n   SparkDEX Contract Balances:`);
let totalTVL = 0n;
for (const vault of vaultAddresses) {
  const balance = await usdt.balanceOf(vault.addr);
  totalTVL += balance;
  log(`     ${vault.name.padEnd(20)} $${formatUSD(balance, Number(decimals))}`);
}

if (totalTVL > 0n) {
  log(`\n   Total Value Locked: $${formatUSD(totalTVL, Number(decimals))}`, COLORS.bright);
}

// ============================================================
// Try alternative collateral tokens
// ============================================================
log("\n" + "-".repeat(70), COLORS.cyan);
log(" OTHER SUPPORTED COLLATERALS", COLORS.bright);
log("-".repeat(70), COLORS.cyan);

const otherCollaterals = [
  { name: "WFLR", addr: SPARKDEX_ETERNAL_COLLATERAL.WFLR },
  { name: "sFLR", addr: SPARKDEX_ETERNAL_COLLATERAL.sFLR },
];

for (const coll of otherCollaterals) {
  if (coll.addr && coll.addr !== "0x00000000000000000000000000000000000000000") {
    try {
      const token = await ethers.getContractAt(erc20Abi, coll.addr);
      const sym = await token.symbol();
      const dec = await token.decimals();

      // Check balance in Store
      const storeBalance = await token.balanceOf(STORE);
      const pmBalance = await token.balanceOf(POSITION_MANAGER);

      log(`\n   ${sym} (${coll.addr})`);
      log(`     Store Balance: ${ethers.formatUnits(storeBalance, dec)} ${sym}`);
      log(`     PM Balance: ${ethers.formatUnits(pmBalance, dec)} ${sym}`);
    } catch (e) {
      log(`\n   ${coll.name}: Could not query`);
    }
  }
}

// ============================================================
// CONTRACT ADDRESSES SUMMARY
// ============================================================
log("\n" + "-".repeat(70), COLORS.cyan);
log(" SPARKDEX ETERNAL CONTRACT ADDRESSES", COLORS.bright);
log("-".repeat(70), COLORS.cyan);

const contracts = [
  { name: "Store", addr: STORE },
  { name: "OrderBook", addr: ORDER_BOOK },
  { name: "PositionManager", addr: POSITION_MANAGER },
  { name: "FundingTracker", addr: FUNDING_TRACKER },
  { name: "TradingValidator", addr: SPARKDEX_ETERNAL_FLARE.tradingValidator },
  { name: "Executor", addr: SPARKDEX_ETERNAL_FLARE.executor },
  { name: "AddressStorage", addr: SPARKDEX_ETERNAL_FLARE.addressStorage },
  { name: "FTSO V2", addr: SPARKDEX_ETERNAL_FLARE.ftsoV2 },
];

log("");
for (const c of contracts) {
  const code = await ethers.provider.getCode(c.addr);
  const codeSize = (code.length - 2) / 2; // bytes
  const status = code.length > 2 ? "[OK]" : "[--]";
  const color = code.length > 2 ? COLORS.green : COLORS.red;
  log(`   ${status} ${c.name.padEnd(18)} ${c.addr} (${codeSize} bytes)`, color);
}

log("\n" + "═".repeat(70), COLORS.cyan);
log("   QUERY COMPLETE", COLORS.bright);
log("═".repeat(70) + "\n", COLORS.cyan);
