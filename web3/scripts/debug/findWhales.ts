/**
 * Find token whales on Flare mainnet
 */

import { network } from "hardhat";
import { SPARKDEX_ETERNAL_COLLATERAL, SPARKDEX_ETERNAL_FLARE } from "../helpers/perpetualAddresses.js";

const { ethers } = await network.connect();

const USDT = SPARKDEX_ETERNAL_COLLATERAL.USDT0;
const WFLR = SPARKDEX_ETERNAL_COLLATERAL.WFLR;
const SFLR = SPARKDEX_ETERNAL_COLLATERAL.sFLR;

const erc20Abi = [
  "function balanceOf(address) view returns (uint256)",
  "function symbol() view returns (string)",
  "function decimals() view returns (uint8)",
  "function totalSupply() view returns (uint256)",
];

console.log("=".repeat(70));
console.log("FINDING TOKEN WHALES ON FLARE MAINNET");
console.log("=".repeat(70));

// Known DeFi addresses and liquidity pools on Flare
const knownAddresses = [
  // SparkDEX Eternal
  { name: "SparkDEX Store", addr: SPARKDEX_ETERNAL_FLARE.store },
  { name: "SparkDEX OrderBook", addr: SPARKDEX_ETERNAL_FLARE.orderBook },
  { name: "SparkDEX PM", addr: SPARKDEX_ETERNAL_FLARE.positionManager },

  // Governance
  { name: "Governance", addr: "0xC4E793690aF58F54C467122f94c288BCFBE74Ec1" },

  // SparkDEX V3 pools (common liquidity)
  { name: "SparkDEX Router", addr: "0x7a93F1635a5Eee1F920F0E5cB7e7a89aE58f63F3" },

  // Sceptre
  { name: "Sceptre sFLR", addr: SFLR },

  // Wrapped FLR
  { name: "WFLR Contract", addr: WFLR },

  // USDT0 Bridge/Minter
  { name: "USDT0 Contract", addr: USDT },

  // Common addresses that might have tokens
  { name: "AddressStorage", addr: SPARKDEX_ETERNAL_FLARE.addressStorage },
  { name: "Executor", addr: SPARKDEX_ETERNAL_FLARE.executor },
];

async function checkBalances(tokenAddr: string, tokenName: string) {
  const token = await ethers.getContractAt(erc20Abi, tokenAddr);
  const decimals = await token.decimals();
  const symbol = await token.symbol();
  const totalSupply = await token.totalSupply();

  console.log(`\n${tokenName} (${symbol}):`);
  console.log(`Total Supply: ${ethers.formatUnits(totalSupply, decimals)} ${symbol}`);
  console.log("Balances:");

  const whales: { name: string; addr: string; balance: bigint }[] = [];

  for (const { name, addr } of knownAddresses) {
    try {
      const balance = await token.balanceOf(addr);
      if (balance > 0n) {
        whales.push({ name, addr, balance });
      }
    } catch (e) {
      // skip
    }
  }

  whales.sort((a, b) => (b.balance > a.balance ? 1 : -1));
  for (const { name, addr, balance } of whales) {
    console.log(`  ${name.padEnd(25)}: ${ethers.formatUnits(balance, decimals)} ${symbol}`);
  }

  if (whales.length > 0 && whales[0].balance > 0n) {
    return { addr: whales[0].addr, name: whales[0].name, balance: whales[0].balance };
  }
  return null;
}

// Check each token
const usdtWhale = await checkBalances(USDT, "USDT0");
const wflrWhale = await checkBalances(WFLR, "WFLR");
const sflrWhale = await checkBalances(SFLR, "sFLR");

console.log("\n" + "=".repeat(70));
console.log("WHALE SUMMARY");
console.log("=".repeat(70));

if (usdtWhale) {
  console.log(`USDT Whale: ${usdtWhale.name} (${usdtWhale.addr})`);
}
if (wflrWhale) {
  console.log(`WFLR Whale: ${wflrWhale.name} (${wflrWhale.addr})`);
}
if (sflrWhale) {
  console.log(`sFLR Whale: ${sflrWhale.name} (${sflrWhale.addr})`);
}

// The Store contract has WFLR and sFLR - we can use that!
console.log(`\nRECOMMENDATION: Use WFLR or sFLR as collateral since Store has:`);
const wflr = await ethers.getContractAt(erc20Abi, WFLR);
const sflr = await ethers.getContractAt(erc20Abi, SFLR);
const storeWflr = await wflr.balanceOf(SPARKDEX_ETERNAL_FLARE.store);
const storeSflr = await sflr.balanceOf(SPARKDEX_ETERNAL_FLARE.store);
console.log(`  WFLR: ${ethers.formatEther(storeWflr)}`);
console.log(`  sFLR: ${ethers.formatEther(storeSflr)}`);
