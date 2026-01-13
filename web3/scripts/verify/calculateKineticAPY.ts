import { network } from "hardhat";
const { ethers } = await network.connect();

async function main() {
  console.log("\n" + "=".repeat(70));
  console.log("  KINETIC PROTOCOL - ACTUAL APY CALCULATIONS");
  console.log("=".repeat(70));

  const kSFLR = "0x291487beC339c2fE5D83DD45F0a15EFC9Ac45656";
  const kWETH = "0x5C2400019017AE61F811D517D088Df732642DbD0";

  const kTokenABI = [
    "function supplyRatePerTimestamp() view returns (uint256)",
    "function borrowRatePerTimestamp() view returns (uint256)",
    "function getCash() view returns (uint256)",
    "function totalBorrows() view returns (uint256)",
    "function totalReserves() view returns (uint256)",
    "function exchangeRateStored() view returns (uint256)",
    "function totalSupply() view returns (uint256)",
    "function underlying() view returns (address)",
  ];

  // Constants
  const SECONDS_PER_YEAR = 31536000;
  const MANTISSA = 1e18;

  // ksFLR Market
  console.log("\n=== ksFLR Market (Real Mainnet Data) ===\n");
  const ksFLR = await ethers.getContractAt(kTokenABI, kSFLR);

  const sflrSupplyRate = await ksFLR.supplyRatePerTimestamp();
  const sflrBorrowRate = await ksFLR.borrowRatePerTimestamp();
  const sflrCash = await ksFLR.getCash();
  const sflrBorrows = await ksFLR.totalBorrows();
  const sflrReserves = await ksFLR.totalReserves();
  const sflrExchangeRate = await ksFLR.exchangeRateStored();
  const sflrTotalSupply = await ksFLR.totalSupply();

  // Calculate APYs
  // APY = rate per second * seconds per year * 100 / 1e18
  const sflrSupplyAPY = Number(sflrSupplyRate) * SECONDS_PER_YEAR / MANTISSA * 100;
  const sflrBorrowAPY = Number(sflrBorrowRate) * SECONDS_PER_YEAR / MANTISSA * 100;

  // Calculate utilization
  const sflrUtilization = Number(sflrBorrows) / (Number(sflrCash) + Number(sflrBorrows)) * 100;

  // Calculate TVL
  const sflrTVL = Number(sflrCash) + Number(sflrBorrows) - Number(sflrReserves);

  console.log(`Supply Rate Per Second: ${sflrSupplyRate}`);
  console.log(`Supply APY: ${sflrSupplyAPY.toFixed(4)}%`);
  console.log(`Borrow Rate Per Second: ${sflrBorrowRate}`);
  console.log(`Borrow APY: ${sflrBorrowAPY.toFixed(4)}%`);
  console.log(`\nCash: ${ethers.formatEther(sflrCash)} sFLR`);
  console.log(`Total Borrows: ${ethers.formatEther(sflrBorrows)} sFLR`);
  console.log(`Total Reserves: ${ethers.formatEther(sflrReserves)} sFLR`);
  console.log(`TVL: ${(sflrTVL / 1e18).toFixed(2)} sFLR`);
  console.log(`Utilization: ${sflrUtilization.toFixed(2)}%`);
  console.log(`Exchange Rate: ${ethers.formatEther(sflrExchangeRate)}`);
  console.log(`Total ksFLR Supply: ${ethers.formatUnits(sflrTotalSupply, 8)} ksFLR`);

  // kWETH Market
  console.log("\n=== kWETH Market (Real Mainnet Data) ===\n");
  const kWeth = await ethers.getContractAt(kTokenABI, kWETH);

  const wethSupplyRate = await kWeth.supplyRatePerTimestamp();
  const wethBorrowRate = await kWeth.borrowRatePerTimestamp();
  const wethCash = await kWeth.getCash();
  const wethBorrows = await kWeth.totalBorrows();

  const wethSupplyAPY = Number(wethSupplyRate) * SECONDS_PER_YEAR / MANTISSA * 100;
  const wethBorrowAPY = Number(wethBorrowRate) * SECONDS_PER_YEAR / MANTISSA * 100;
  const wethUtilization = Number(wethBorrows) / (Number(wethCash) + Number(wethBorrows)) * 100;

  console.log(`Supply APY: ${wethSupplyAPY.toFixed(4)}%`);
  console.log(`Borrow APY: ${wethBorrowAPY.toFixed(4)}%`);
  console.log(`Cash: ${ethers.formatEther(wethCash)} WETH`);
  console.log(`Total Borrows: ${ethers.formatEther(wethBorrows)} WETH`);
  console.log(`Utilization: ${wethUtilization.toFixed(2)}%`);

  // Summary
  console.log("\n" + "=".repeat(70));
  console.log("  VERIFIED DATA SUMMARY");
  console.log("=".repeat(70));
  console.log(`\nksFLR Market:`);
  console.log(`  Supply APY: ${sflrSupplyAPY.toFixed(4)}%`);
  console.log(`  Borrow APY: ${sflrBorrowAPY.toFixed(4)}%`);
  console.log(`  TVL: ${(sflrTVL / 1e18).toFixed(0)} sFLR`);
  console.log(`  Utilization: ${sflrUtilization.toFixed(2)}%`);
  console.log(`\nkWETH Market:`);
  console.log(`  Supply APY: ${wethSupplyAPY.toFixed(4)}%`);
  console.log(`  Borrow APY: ${wethBorrowAPY.toFixed(4)}%`);
  console.log(`  TVL: ${(Number(wethCash) + Number(wethBorrows)) / 1e18} WETH`);
  console.log(`  Utilization: ${wethUtilization.toFixed(2)}%`);
}

main().then(() => process.exit(0)).catch(e => { console.error(e); process.exit(1); });
