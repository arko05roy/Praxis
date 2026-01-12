/**
 * DEX Adapters Demo Script
 *
 * Demonstrates the DEX adapters working on a forked Flare mainnet.
 * Shows:
 * 1. Deploying SwapRouter and all DEX adapters
 * 2. Getting quotes from SparkDEX, BlazeSwap
 * 3. Finding the best route across all DEXes
 * 4. Executing a real swap
 *
 * Usage:
 *   npx hardhat run scripts/demo/dexAdaptersDemo.ts --network flareFork
 */

import { network } from "hardhat";
import {
  SPARKDEX_FLARE,
  BLAZESWAP_FLARE,
  TOKENS_FLARE,
} from "../helpers/dexAddresses.js";

const { ethers } = await network.connect();

// WFLR ABI for wrapping/unwrapping
const WFLR_ABI = [
  "function deposit() external payable",
  "function withdraw(uint256 amount) external",
  "function balanceOf(address account) external view returns (uint256)",
  "function approve(address spender, uint256 amount) external returns (bool)",
  "function transfer(address to, uint256 amount) external returns (bool)",
];

// ERC20 ABI for checking balances
const ERC20_ABI = [
  "function balanceOf(address account) external view returns (uint256)",
  "function decimals() external view returns (uint8)",
  "function symbol() external view returns (string)",
  "function approve(address spender, uint256 amount) external returns (bool)",
];

async function main() {
  console.log("\n" + "=".repeat(70));
  console.log("   PRAXIS DEX ADAPTERS DEMO - Forked Flare Mainnet");
  console.log("=".repeat(70));

  // Get network info
  const networkInfo = await ethers.provider.getNetwork();
  console.log(`\nNetwork Chain ID: ${networkInfo.chainId}`);

  // Get signer
  const [deployer] = await ethers.getSigners();
  const deployerAddress = await deployer.getAddress();
  console.log(`Demo Account: ${deployerAddress}`);

  // Check native balance
  const nativeBalance = await ethers.provider.getBalance(deployerAddress);
  console.log(`Native FLR Balance: ${ethers.formatEther(nativeBalance)} FLR`);

  // =========================================================================
  // STEP 1: Deploy Contracts
  // =========================================================================
  console.log("\n" + "-".repeat(70));
  console.log("STEP 1: Deploying Contracts");
  console.log("-".repeat(70));

  // Deploy SwapRouter
  console.log("\n1.1 Deploying SwapRouter...");
  const SwapRouter = await ethers.getContractFactory("SwapRouter");
  const swapRouter = await SwapRouter.deploy();
  await swapRouter.waitForDeployment();
  const swapRouterAddress = await swapRouter.getAddress();
  console.log(`    SwapRouter: ${swapRouterAddress}`);

  // Deploy SparkDEXAdapter
  console.log("\n1.2 Deploying SparkDEXAdapter...");
  const SparkDEXAdapter = await ethers.getContractFactory("SparkDEXAdapter");
  const sparkDexAdapter = await SparkDEXAdapter.deploy(
    SPARKDEX_FLARE.swapRouter,
    SPARKDEX_FLARE.quoterV2,
    SPARKDEX_FLARE.factory
  );
  await sparkDexAdapter.waitForDeployment();
  const sparkDexAddress = await sparkDexAdapter.getAddress();
  console.log(`    SparkDEXAdapter: ${sparkDexAddress}`);
  console.log(`      -> Router: ${SPARKDEX_FLARE.swapRouter}`);
  console.log(`      -> Quoter: ${SPARKDEX_FLARE.quoterV2}`);
  console.log(`      -> Factory: ${SPARKDEX_FLARE.factory}`);

  // Deploy BlazeSwapAdapter
  console.log("\n1.3 Deploying BlazeSwapAdapter...");
  const BlazeSwapAdapter = await ethers.getContractFactory("BlazeSwapAdapter");
  const blazeSwapAdapter = await BlazeSwapAdapter.deploy(
    BLAZESWAP_FLARE.router,
    BLAZESWAP_FLARE.factory,
    TOKENS_FLARE.WFLR
  );
  await blazeSwapAdapter.waitForDeployment();
  const blazeSwapAddress = await blazeSwapAdapter.getAddress();
  console.log(`    BlazeSwapAdapter: ${blazeSwapAddress}`);
  console.log(`      -> Router: ${BLAZESWAP_FLARE.router}`);
  console.log(`      -> Factory: ${BLAZESWAP_FLARE.factory}`);

  // Register adapters
  console.log("\n1.4 Registering adapters with SwapRouter...");
  await swapRouter.addAdapter(sparkDexAddress);
  console.log(`    Registered: SparkDEX V3`);
  await swapRouter.addAdapter(blazeSwapAddress);
  console.log(`    Registered: BlazeSwap`);

  const adapterCount = await swapRouter.getAdapterCount();
  console.log(`\n    Total Adapters: ${adapterCount}`);

  // =========================================================================
  // STEP 2: Wrap FLR to WFLR
  // =========================================================================
  console.log("\n" + "-".repeat(70));
  console.log("STEP 2: Wrapping FLR to WFLR");
  console.log("-".repeat(70));

  const wflr = new ethers.Contract(TOKENS_FLARE.WFLR, WFLR_ABI, deployer);
  const wrapAmount = ethers.parseEther("1000"); // Wrap 1000 FLR

  console.log(`\n    Wrapping ${ethers.formatEther(wrapAmount)} FLR to WFLR...`);
  const wrapTx = await wflr.deposit({ value: wrapAmount });
  await wrapTx.wait();

  const wflrBalance = await wflr.balanceOf(deployerAddress);
  console.log(`    WFLR Balance: ${ethers.formatEther(wflrBalance)} WFLR`);

  // =========================================================================
  // STEP 3: Get Quotes from All DEXes
  // =========================================================================
  console.log("\n" + "-".repeat(70));
  console.log("STEP 3: Getting Quotes from All DEXes");
  console.log("-".repeat(70));

  const quoteAmount = ethers.parseEther("100"); // Quote for 100 WFLR
  console.log(`\n    Quote Request: ${ethers.formatEther(quoteAmount)} WFLR -> USDC`);

  // Get quotes from SwapRouter (aggregates all adapters)
  const quotes = await swapRouter.getAllQuotes(
    TOKENS_FLARE.WFLR,
    TOKENS_FLARE.USDC,
    quoteAmount
  );

  console.log("\n    Quotes Received:");
  console.log("    " + "-".repeat(50));
  for (const quote of quotes) {
    if (quote.amountOut > 0n) {
      const usdcAmount = ethers.formatUnits(quote.amountOut, 6);
      console.log(`    ${quote.name.padEnd(15)} : ${usdcAmount} USDC`);
    } else {
      console.log(`    ${quote.name.padEnd(15)} : No liquidity / route`);
    }
  }

  // =========================================================================
  // STEP 4: Find Best Route
  // =========================================================================
  console.log("\n" + "-".repeat(70));
  console.log("STEP 4: Finding Best Route");
  console.log("-".repeat(70));

  const [bestAdapter, bestAmountOut] = await swapRouter.findBestRoute(
    TOKENS_FLARE.WFLR,
    TOKENS_FLARE.USDC,
    quoteAmount
  );

  if (bestAmountOut > 0n) {
    // Find adapter name
    let bestAdapterName = "Unknown";
    if (bestAdapter === sparkDexAddress) bestAdapterName = "SparkDEX V3";
    if (bestAdapter === blazeSwapAddress) bestAdapterName = "BlazeSwap";

    console.log(`\n    Best Route Found!`);
    console.log(`    DEX: ${bestAdapterName}`);
    console.log(`    Output: ${ethers.formatUnits(bestAmountOut, 6)} USDC`);
    console.log(`    Rate: 1 WFLR = ${(Number(ethers.formatUnits(bestAmountOut, 6)) / 100).toFixed(6)} USDC`);
  } else {
    console.log("\n    No route found with liquidity");
  }

  // =========================================================================
  // STEP 5: Execute Swap
  // =========================================================================
  console.log("\n" + "-".repeat(70));
  console.log("STEP 5: Executing Swap via Best Route");
  console.log("-".repeat(70));

  if (bestAmountOut > 0n) {
    const swapAmount = ethers.parseEther("10"); // Swap 10 WFLR

    // Get fresh quote for the actual swap amount
    const [, swapExpectedOut] = await swapRouter.findBestRoute(
      TOKENS_FLARE.WFLR,
      TOKENS_FLARE.USDC,
      swapAmount
    );
    const minAmountOut = (swapExpectedOut * 95n) / 100n; // 5% slippage
    const deadline = Math.floor(Date.now() / 1000) + 600; // 10 minutes

    // Check USDC balance before
    const usdc = new ethers.Contract(TOKENS_FLARE.USDC, ERC20_ABI, deployer);
    const usdcBalanceBefore = await usdc.balanceOf(deployerAddress);

    console.log(`\n    Swap Details:`);
    console.log(`    Input: ${ethers.formatEther(swapAmount)} WFLR`);
    console.log(`    Min Output: ${ethers.formatUnits(minAmountOut, 6)} USDC`);

    // Approve SwapRouter to spend WFLR
    console.log(`\n    Approving SwapRouter...`);
    const approveTx = await wflr.approve(swapRouterAddress, swapAmount);
    await approveTx.wait();

    // Execute swap via best adapter (more gas efficient than generic swap())
    console.log(`    Executing swap via ${bestAdapter === sparkDexAddress ? "SparkDEX" : "BlazeSwap"}...`);
    try {
      const swapTx = await swapRouter.swapViaAdapter(
        bestAdapter,
        TOKENS_FLARE.WFLR,
        TOKENS_FLARE.USDC,
        swapAmount,
        minAmountOut,
        deadline,
        "0x"
      );
      const receipt = await swapTx.wait();

      // Check USDC balance after
      const usdcBalanceAfter = await usdc.balanceOf(deployerAddress);
      const usdcReceived = usdcBalanceAfter - usdcBalanceBefore;

      console.log(`\n    Swap Successful!`);
      console.log(`    Transaction: ${receipt.hash}`);
      console.log(`    Gas Used: ${receipt.gasUsed.toString()}`);
      console.log(`    USDC Received: ${ethers.formatUnits(usdcReceived, 6)} USDC`);

      // Final balances
      const finalWflrBalance = await wflr.balanceOf(deployerAddress);
      const finalUsdcBalance = await usdc.balanceOf(deployerAddress);

      console.log(`\n    Final Balances:`);
      console.log(`    WFLR: ${ethers.formatEther(finalWflrBalance)}`);
      console.log(`    USDC: ${ethers.formatUnits(finalUsdcBalance, 6)}`);
    } catch (error: any) {
      console.log(`\n    Swap Failed: ${error.message}`);
      console.log(`    (This may happen if liquidity is insufficient)`);
    }
  }

  // =========================================================================
  // STEP 6: Test Individual Adapters
  // =========================================================================
  console.log("\n" + "-".repeat(70));
  console.log("STEP 6: Testing Individual Adapter Functions");
  console.log("-".repeat(70));

  // Test SparkDEX pool availability
  console.log("\n    SparkDEX V3:");
  const sparkPoolAvailable = await sparkDexAdapter.isPoolAvailable(
    TOKENS_FLARE.WFLR,
    TOKENS_FLARE.USDC
  );
  console.log(`      WFLR/USDC Pool Available: ${sparkPoolAvailable}`);

  const sparkFeeTiers = await sparkDexAdapter.getFeeTiers();
  console.log(`      Fee Tiers: ${sparkFeeTiers.map((f: bigint) => `${Number(f) / 100}%`).join(", ")}`);

  // Test BlazeSwap pool availability
  console.log("\n    BlazeSwap:");
  try {
    const blazePoolAvailable = await blazeSwapAdapter.isPoolAvailable(
      TOKENS_FLARE.WFLR,
      TOKENS_FLARE.USDC
    );
    console.log(`      WFLR/USDC Pool Available: ${blazePoolAvailable}`);

    const blazePair = await blazeSwapAdapter.getPair(
      TOKENS_FLARE.WFLR,
      TOKENS_FLARE.USDC
    );
    console.log(`      Pair Address: ${blazePair}`);
  } catch (error: any) {
    console.log(`      Error checking BlazeSwap: ${error.message}`);
  }

  // =========================================================================
  // Summary
  // =========================================================================
  console.log("\n" + "=".repeat(70));
  console.log("   DEMO COMPLETE");
  console.log("=".repeat(70));
  console.log(`
  Deployed Contracts:
    - SwapRouter:       ${swapRouterAddress}
    - SparkDEXAdapter:  ${sparkDexAddress}
    - BlazeSwapAdapter: ${blazeSwapAddress}

  Key Features Demonstrated:
    1. Multi-DEX adapter pattern (SparkDEX V3, BlazeSwap)
    2. Quote aggregation across all DEXes
    3. Automatic best-route finding
    4. Swap execution through aggregator
    5. Pool availability checking

  This infrastructure enables PRAXIS to:
    - Execute swaps using vault capital
    - Always find the best rates
    - Support multiple DEX protocols
  `);
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error("\nDemo failed:", error);
    process.exit(1);
  });
