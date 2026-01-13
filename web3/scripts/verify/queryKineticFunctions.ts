import { network } from "hardhat";
const { ethers } = await network.connect();

async function main() {
  const kSFLR = "0x291487beC339c2fE5D83DD45F0a15EFC9Ac45656";

  // Try different function signatures that Compound forks might use
  const functions = [
    "function supplyRatePerBlock() view returns (uint256)",
    "function borrowRatePerBlock() view returns (uint256)",
    "function supplyRatePerTimestamp() view returns (uint256)",
    "function borrowRatePerTimestamp() view returns (uint256)",
    "function getSupplyRate() view returns (uint256)",
    "function getBorrowRate() view returns (uint256)",
    "function interestRateModel() view returns (address)",
    "function accrualBlockTimestamp() view returns (uint256)",
    "function accrualBlockNumber() view returns (uint256)",
    "function reserveFactorMantissa() view returns (uint256)",
    "function totalReserves() view returns (uint256)",
    "function getCash() view returns (uint256)",
    "function totalBorrows() view returns (uint256)",
    "function totalSupply() view returns (uint256)",
    "function exchangeRateStored() view returns (uint256)",
    "function borrowIndex() view returns (uint256)",
  ];

  console.log("\n=== Testing ksFLR Contract Functions ===\n");

  for (const func of functions) {
    try {
      const contract = await ethers.getContractAt([func], kSFLR);
      const fnName = func.split("(")[0].replace("function ", "");
      const result = await (contract as any)[fnName]();
      console.log(`✓ ${fnName}: ${result}`);
    } catch (e: any) {
      const fnName = func.split("(")[0].replace("function ", "");
      console.log(`✗ ${fnName}: reverted`);
    }
  }

  // Check the comptroller for market info
  console.log("\n=== Comptroller Market Info ===\n");
  const comptroller = await ethers.getContractAt([
    "function markets(address) view returns (bool isListed, uint256 collateralFactorMantissa, bool isComped)",
    "function getAllMarkets() view returns (address[])",
    "function getAccountLiquidity(address) view returns (uint256, uint256, uint256)",
  ], "0xeC7e541375D70c37262f619162502dB9131d6db5");

  try {
    const marketInfo = await comptroller.markets(kSFLR);
    console.log(`ksFLR Market Info:`);
    console.log(`  Is Listed: ${marketInfo[0]}`);
    console.log(`  Collateral Factor: ${Number(marketInfo[1]) / 1e16}%`);
    console.log(`  Is Comped: ${marketInfo[2]}`);
  } catch (e: any) {
    console.log(`Market info error: ${e.message}`);
  }

  // Get all markets
  try {
    const allMarkets = await comptroller.getAllMarkets();
    console.log(`\nAll Markets (${allMarkets.length}):`);
    for (const m of allMarkets) {
      console.log(`  - ${m}`);
    }
  } catch (e: any) {
    console.log(`getAllMarkets error: ${e.message}`);
  }
}

main().then(() => process.exit(0)).catch(e => { console.error(e); process.exit(1); });
