import { network } from "hardhat";
const { ethers } = await network.connect();

async function main() {
  // Direct call to ksFLR to get rates
  const kSFLR = "0x291487beC339c2fE5D83DD45F0a15EFC9Ac45656";
  const kToken = await ethers.getContractAt([
    "function supplyRatePerBlock() view returns (uint256)",
    "function borrowRatePerBlock() view returns (uint256)",
    "function exchangeRateStored() view returns (uint256)",
    "function getCash() view returns (uint256)",
    "function totalBorrows() view returns (uint256)",
    "function totalReserves() view returns (uint256)",
  ], kSFLR);

  console.log("\n=== ksFLR Market Data (DIRECT FROM CONTRACT) ===");

  try {
    const supplyRate = await kToken.supplyRatePerBlock();
    const borrowRate = await kToken.borrowRatePerBlock();
    const exchangeRate = await kToken.exchangeRateStored();
    const cash = await kToken.getCash();
    const borrows = await kToken.totalBorrows();
    const reserves = await kToken.totalReserves();

    // Convert to APY (rate per block * blocks per year)
    const blocksPerYear = 31536000n; // 1 block per second on Flare
    const supplyAPY = Number(supplyRate * blocksPerYear) / 1e16;
    const borrowAPY = Number(borrowRate * blocksPerYear) / 1e16;

    console.log(`Supply Rate Per Block: ${supplyRate}`);
    console.log(`Supply APY: ${supplyAPY.toFixed(4)}%`);
    console.log(`Borrow Rate Per Block: ${borrowRate}`);
    console.log(`Borrow APY: ${borrowAPY.toFixed(4)}%`);
    console.log(`Exchange Rate: ${ethers.formatEther(exchangeRate)}`);
    console.log(`Cash: ${ethers.formatEther(cash)} sFLR`);
    console.log(`Total Borrows: ${ethers.formatEther(borrows)} sFLR`);
    console.log(`Total Reserves: ${ethers.formatEther(reserves)} sFLR`);
    const util = Number(borrows) / (Number(cash) + Number(borrows)) * 100;
    console.log(`Utilization: ${util.toFixed(2)}%`);
  } catch (e: any) {
    console.log("Error:", e.message);
  }

  // Also check kWETH market
  const kWETH = "0x5C2400019017AE61F811D517D088Df732642DbD0";
  const kWethToken = await ethers.getContractAt([
    "function supplyRatePerBlock() view returns (uint256)",
    "function borrowRatePerBlock() view returns (uint256)",
    "function getCash() view returns (uint256)",
    "function totalBorrows() view returns (uint256)",
  ], kWETH);

  console.log("\n=== kWETH Market Data (DIRECT FROM CONTRACT) ===");
  try {
    const supplyRate = await kWethToken.supplyRatePerBlock();
    const borrowRate = await kWethToken.borrowRatePerBlock();
    const cash = await kWethToken.getCash();
    const borrows = await kWethToken.totalBorrows();

    const blocksPerYear = 31536000n;
    const supplyAPY = Number(supplyRate * blocksPerYear) / 1e16;
    const borrowAPY = Number(borrowRate * blocksPerYear) / 1e16;

    console.log(`Supply Rate Per Block: ${supplyRate}`);
    console.log(`Supply APY: ${supplyAPY.toFixed(4)}%`);
    console.log(`Borrow Rate Per Block: ${borrowRate}`);
    console.log(`Borrow APY: ${borrowAPY.toFixed(4)}%`);
    console.log(`Cash: ${ethers.formatEther(cash)} WETH`);
    console.log(`Total Borrows: ${ethers.formatEther(borrows)} WETH`);
    const util = Number(borrows) / (Number(cash) + Number(borrows)) * 100;
    console.log(`Utilization: ${util.toFixed(2)}%`);
  } catch (e: any) {
    console.log("Error:", e.message);
  }

  // Sceptre exchange rate over time verification
  console.log("\n=== Sceptre sFLR Exchange Rate Verification ===");
  const sflr = await ethers.getContractAt([
    "function getPooledFlrByShares(uint256) view returns (uint256)",
    "function totalSupply() view returns (uint256)",
  ], "0x12e605bc104e93B45e1aD99F9e555f659051c2BB");

  const onesFLR = ethers.parseEther("1");
  const flrValue = await sflr.getPooledFlrByShares(onesFLR);
  const totalSupply = await sflr.totalSupply();
  const totalFLRStaked = await sflr.getPooledFlrByShares(totalSupply);

  console.log(`1 sFLR = ${ethers.formatEther(flrValue)} FLR`);
  console.log(`Total sFLR Supply: ${ethers.formatEther(totalSupply)} sFLR`);
  console.log(`Total FLR Staked: ${ethers.formatEther(totalFLRStaked)} FLR`);
  console.log(`Appreciation since launch: ${((Number(flrValue) / 1e18 - 1) * 100).toFixed(2)}%`);
}

main().then(() => process.exit(0)).catch(e => { console.error(e); process.exit(1); });
