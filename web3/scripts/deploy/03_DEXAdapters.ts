/**
 * DEX Adapters Deployment Script
 *
 * Deploys:
 * 1. SwapRouter (DEX Aggregator)
 * 2. SparkDEXAdapter (if addresses configured)
 * 3. BlazeSwapAdapter (if addresses configured)
 * 4. EnosysAdapter (if addresses configured)
 *
 * Then registers all adapters with the SwapRouter.
 *
 * Usage:
 *   npx hardhat run scripts/deploy/03_DEXAdapters.ts --network coston2
 *   npx hardhat run scripts/deploy/03_DEXAdapters.ts --network flare
 */

import { network } from "hardhat";
import {
  SPARKDEX_FLARE,
  BLAZESWAP_FLARE,
  TOKENS_FLARE,
} from "../helpers/dexAddresses.js";

const { ethers } = await network.connect();

async function main() {
  console.log("=".repeat(60));
  console.log("DEX ADAPTERS DEPLOYMENT");
  console.log("=".repeat(60));

  // Get network info
  const networkInfo = await ethers.provider.getNetwork();
  const chainId = Number(networkInfo.chainId);
  console.log(`Network: ${network.name} (chainId: ${chainId})`);

  // Get deployer
  const [deployer] = await ethers.getSigners();
  const deployerAddress = await deployer.getAddress();
  const balance = await ethers.provider.getBalance(deployerAddress);

  console.log(`Deployer: ${deployerAddress}`);
  console.log(`Balance: ${ethers.formatEther(balance)} native tokens`);
  console.log("-".repeat(60));

  // Determine which DEX addresses to use based on network
  let sparkdexConfig = { router: "", quoter: "", factory: "" };
  let blazeswapConfig = { router: "", factory: "", wflr: "" };

  if (chainId === 14) {
    // Flare mainnet
    sparkdexConfig = {
      router: SPARKDEX_FLARE.swapRouter,
      quoter: SPARKDEX_FLARE.quoterV2,
      factory: SPARKDEX_FLARE.factory,
    };
    blazeswapConfig = {
      router: BLAZESWAP_FLARE.router,
      factory: BLAZESWAP_FLARE.factory,
      wflr: TOKENS_FLARE.WFLR,
    };
  } else if (chainId === 114) {
    // Coston2 testnet - addresses may not be available
    console.log("Note: DEX addresses for Coston2 may not be available");
    console.log("SwapRouter will be deployed but adapters may be skipped");
  }

  // Track deployed contracts
  const deployedContracts: { name: string; address: string }[] = [];
  const registeredAdapters: string[] = [];

  // 1. Deploy SwapRouter
  console.log("\n1. Deploying SwapRouter...");
  const SwapRouter = await ethers.getContractFactory("SwapRouter");
  const swapRouter = await SwapRouter.deploy();
  await swapRouter.waitForDeployment();
  const swapRouterAddress = await swapRouter.getAddress();
  console.log(`   SwapRouter deployed to: ${swapRouterAddress}`);
  deployedContracts.push({ name: "SwapRouter", address: swapRouterAddress });

  // 2. Deploy SparkDEXAdapter if addresses are available
  if (sparkdexConfig.router && sparkdexConfig.quoter && sparkdexConfig.factory) {
    console.log("\n2. Deploying SparkDEXAdapter...");
    try {
      const SparkDEXAdapter = await ethers.getContractFactory("SparkDEXAdapter");
      const sparkDexAdapter = await SparkDEXAdapter.deploy(
        sparkdexConfig.router,
        sparkdexConfig.quoter,
        sparkdexConfig.factory
      );
      await sparkDexAdapter.waitForDeployment();
      const sparkDexAddress = await sparkDexAdapter.getAddress();
      console.log(`   SparkDEXAdapter deployed to: ${sparkDexAddress}`);
      deployedContracts.push({ name: "SparkDEXAdapter", address: sparkDexAddress });
      registeredAdapters.push(sparkDexAddress);
    } catch (error: any) {
      console.log(`   Failed to deploy SparkDEXAdapter: ${error.message}`);
    }
  } else {
    console.log("\n2. Skipping SparkDEXAdapter - addresses not configured");
  }

  // 3. Deploy BlazeSwapAdapter if addresses are available
  if (blazeswapConfig.router && blazeswapConfig.factory && blazeswapConfig.wflr) {
    console.log("\n3. Deploying BlazeSwapAdapter...");
    try {
      const BlazeSwapAdapter = await ethers.getContractFactory("BlazeSwapAdapter");
      const blazeSwapAdapter = await BlazeSwapAdapter.deploy(
        blazeswapConfig.router,
        blazeswapConfig.factory,
        blazeswapConfig.wflr
      );
      await blazeSwapAdapter.waitForDeployment();
      const blazeSwapAddress = await blazeSwapAdapter.getAddress();
      console.log(`   BlazeSwapAdapter deployed to: ${blazeSwapAddress}`);
      deployedContracts.push({ name: "BlazeSwapAdapter", address: blazeSwapAddress });
      registeredAdapters.push(blazeSwapAddress);
    } catch (error: any) {
      console.log(`   Failed to deploy BlazeSwapAdapter: ${error.message}`);
    }
  } else {
    console.log("\n3. Skipping BlazeSwapAdapter - addresses not configured");
  }

  // 4. Register adapters with SwapRouter
  if (registeredAdapters.length > 0) {
    console.log("\n4. Registering adapters with SwapRouter...");
    for (const adapterAddress of registeredAdapters) {
      try {
        const tx = await swapRouter.addAdapter(adapterAddress);
        await tx.wait();
        console.log(`   Registered: ${adapterAddress}`);
      } catch (error: any) {
        console.log(`   Failed to register ${adapterAddress}: ${error.message}`);
      }
    }
  }

  // Summary
  console.log("\n" + "=".repeat(60));
  console.log("DEPLOYMENT SUMMARY");
  console.log("=".repeat(60));
  console.log("\nDeployed Contracts:");
  for (const contract of deployedContracts) {
    console.log(`  ${contract.name}: ${contract.address}`);
  }
  console.log(`\nRegistered Adapters: ${registeredAdapters.length}`);

  // Verification instructions
  console.log("\n" + "=".repeat(60));
  console.log("VERIFICATION INSTRUCTIONS");
  console.log("=".repeat(60));
  console.log("\nTo verify contracts on Flarescan, run:");
  for (const contract of deployedContracts) {
    const args = getConstructorArgs(contract.name, sparkdexConfig, blazeswapConfig);
    const argsStr = args.length > 0 ? ` --constructor-args ${args.join(" ")}` : "";
    console.log(`  npx hardhat verify ${contract.address}${argsStr} --network ${network.name}`);
  }

  console.log("\nDone!");

  return deployedContracts;
}

function getConstructorArgs(
  contractName: string,
  sparkdexConfig: { router: string; quoter: string; factory: string },
  blazeswapConfig: { router: string; factory: string; wflr: string }
): string[] {
  switch (contractName) {
    case "SwapRouter":
      return [];
    case "SparkDEXAdapter":
      return [sparkdexConfig.router, sparkdexConfig.quoter, sparkdexConfig.factory];
    case "BlazeSwapAdapter":
      return [blazeswapConfig.router, blazeswapConfig.factory, blazeswapConfig.wflr];
    default:
      return [];
  }
}

main()
  .then((contracts) => {
    console.log("\nDeployment successful!");
    process.exit(0);
  })
  .catch((error) => {
    console.error("Deployment failed:", error);
    process.exit(1);
  });
