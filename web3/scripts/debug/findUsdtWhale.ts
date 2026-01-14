/**
 * Find USDT whale addresses on Flare mainnet
 */

import { network } from "hardhat";
import { SPARKDEX_ETERNAL_COLLATERAL, SPARKDEX_ETERNAL_FLARE } from "../helpers/perpetualAddresses.js";

const { ethers } = await network.connect();

const USDT = SPARKDEX_ETERNAL_COLLATERAL.USDT0;

const erc20Abi = [
  "function balanceOf(address) view returns (uint256)",
  "function symbol() view returns (string)",
  "function decimals() view returns (uint8)",
  "function totalSupply() view returns (uint256)",
];

const usdt = await ethers.getContractAt(erc20Abi, USDT);
const decimals = await usdt.decimals();
const symbol = await usdt.symbol();
const totalSupply = await usdt.totalSupply();

console.log(`\nSearching for ${symbol} whales on Flare...`);
console.log(`Total Supply: ${ethers.formatUnits(totalSupply, decimals)} ${symbol}`);

// Known addresses to check
const addressesToCheck = [
  { name: "Store", addr: SPARKDEX_ETERNAL_FLARE.store },
  { name: "OrderBook", addr: SPARKDEX_ETERNAL_FLARE.orderBook },
  { name: "PositionManager", addr: SPARKDEX_ETERNAL_FLARE.positionManager },
  { name: "Governance", addr: "0xC4E793690aF58F54C467122f94c288BCFBE74Ec1" },
  // Common exchange addresses
  { name: "Address 1", addr: "0x0000000000000000000000000000000000000001" },
  // USDT0 bridge
  { name: "USDT0 Contract", addr: USDT },
];

console.log("\nChecking known addresses:");
for (const { name, addr } of addressesToCheck) {
  try {
    const balance = await usdt.balanceOf(addr);
    if (balance > 0n) {
      console.log(`  ${name.padEnd(20)}: ${ethers.formatUnits(balance, decimals)} ${symbol}`);
    }
  } catch (e) {
    // skip
  }
}

// Try to get top holders by checking recent Transfer events
console.log("\nLooking for Transfer events to find whales...");

const transferEventSig = ethers.id("Transfer(address,address,uint256)");
const currentBlock = await ethers.provider.getBlockNumber();
const fromBlock = currentBlock - 25; // Look at last 25 blocks (Anvil limit is 30)

try {
  const logs = await ethers.provider.getLogs({
    address: USDT,
    topics: [transferEventSig],
    fromBlock,
    toBlock: currentBlock,
  });

  console.log(`Found ${logs.length} transfer events`);

  // Track unique addresses
  const addresses = new Set<string>();
  for (const log of logs) {
    if (log.topics[1]) {
      addresses.add("0x" + log.topics[1].slice(-40));
    }
    if (log.topics[2]) {
      addresses.add("0x" + log.topics[2].slice(-40));
    }
  }

  console.log(`Found ${addresses.size} unique addresses`);

  // Check balances of unique addresses
  const balances: { addr: string; balance: bigint }[] = [];
  for (const addr of addresses) {
    try {
      const balance = await usdt.balanceOf(addr);
      if (balance > ethers.parseUnits("100", decimals)) {
        balances.push({ addr, balance });
      }
    } catch (e) {
      // skip
    }
  }

  // Sort by balance and show top 10
  balances.sort((a, b) => (b.balance > a.balance ? 1 : -1));
  console.log("\nTop USDT holders found:");
  for (let i = 0; i < Math.min(10, balances.length); i++) {
    const { addr, balance } = balances[i];
    console.log(`  ${i + 1}. ${addr}: ${ethers.formatUnits(balance, decimals)} ${symbol}`);
  }

  if (balances.length > 0) {
    console.log(`\nUse this whale address in tests: ${balances[0].addr}`);
  }
} catch (e: any) {
  console.log(`Error fetching events: ${e.message?.slice(0, 100)}`);
}
