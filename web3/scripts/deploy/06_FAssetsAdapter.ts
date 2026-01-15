/**
 * FAssetsAdapter Deployment Script
 *
 * Deploys the FAssetsAdapter for Phase 5 (FAssets Support).
 * This adapter enables integration of FAssets (FXRP, FBTC, FDOGE) into PRAXIS.
 *
 * Requires:
 * - SwapRouter to be deployed (from 03_DEXAdapters.ts)
 *
 * Deploys:
 * 1. FAssetsAdapter (connected to SwapRouter)
 *
 * Then:
 * - Registers available FAssets (FXRP on mainnet)
 * - Adds known liquidity pools for each FAsset
 *
 * Usage:
 *   npx hardhat run scripts/deploy/06_FAssetsAdapter.ts --network flare
 *   npx hardhat run scripts/deploy/06_FAssetsAdapter.ts --network anvilFork
 */

import { network } from "hardhat";
import {
  FXRP_FLARE,
  FXRP_POOLS_FLARE,
  FASSET_PAIRED_TOKENS_FLARE,
  getDeployedFAssets,
} from "../helpers/fassetAddresses.js";
import { CRYPTO_FEEDS } from "../helpers/feedIds.js";
import { SPARKDEX_FLARE, TOKENS_FLARE } from "../helpers/dexAddresses.js";

const { ethers } = await network.connect();

// Configuration - Update these addresses after deploying 03_DEXAdapters.ts
// You can get these from deployment output or contract verification
const SWAP_ROUTER_ADDRESS = process.env.SWAP_ROUTER_ADDRESS || "";

interface DeployedContract {
  name: string;
  address: string;
}

interface FAssetConfig {
  address: string;
  underlying: string;
  feedId: string;
  pools: string[];
}

async function main() {
  console.log("=".repeat(60));
  console.log("FASSETS ADAPTER DEPLOYMENT (Phase 5)");
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

  // Track deployed contracts
  const deployedContracts: DeployedContract[] = [];

  // Determine SwapRouter address
  let swapRouterAddress = SWAP_ROUTER_ADDRESS;

  // If no SwapRouter provided, try to deploy one
  if (!swapRouterAddress) {
    console.log("\nNo SwapRouter address provided, deploying a new one...");
    console.log("(For production, use the SwapRouter from 03_DEXAdapters.ts)");

    const SwapRouter = await ethers.getContractFactory("SwapRouter");
    const swapRouter = await SwapRouter.deploy();
    await swapRouter.waitForDeployment();
    swapRouterAddress = await swapRouter.getAddress();
    console.log(`SwapRouter deployed to: ${swapRouterAddress}`);
    deployedContracts.push({ name: "SwapRouter", address: swapRouterAddress });

    // Also deploy SparkDEXAdapter for DEX integration
    if (chainId === 14) {
      console.log("\nDeploying SparkDEXAdapter for mainnet...");
      const SparkDEXAdapter = await ethers.getContractFactory("SparkDEXAdapter");
      const sparkDexAdapter = await SparkDEXAdapter.deploy(
        SPARKDEX_FLARE.swapRouter,
        SPARKDEX_FLARE.quoterV2,
        SPARKDEX_FLARE.factory
      );
      await sparkDexAdapter.waitForDeployment();
      const sparkDexAddress = await sparkDexAdapter.getAddress();
      console.log(`SparkDEXAdapter deployed to: ${sparkDexAddress}`);
      deployedContracts.push({ name: "SparkDEXAdapter", address: sparkDexAddress });

      // Register SparkDEXAdapter with SwapRouter
      const swapRouter = await ethers.getContractAt("SwapRouter", swapRouterAddress);
      const registerTx = await swapRouter.addAdapter(sparkDexAddress);
      await registerTx.wait();
      console.log("SparkDEXAdapter registered with SwapRouter");
    }
  } else {
    console.log(`Using existing SwapRouter: ${swapRouterAddress}`);
  }

  // 1. Deploy FAssetsAdapter
  console.log("\n1. Deploying FAssetsAdapter...");
  const FAssetsAdapter = await ethers.getContractFactory("FAssetsAdapter");
  const fAssetsAdapter = await FAssetsAdapter.deploy(swapRouterAddress);
  await fAssetsAdapter.waitForDeployment();
  const fAssetsAdapterAddress = await fAssetsAdapter.getAddress();
  console.log(`   FAssetsAdapter deployed to: ${fAssetsAdapterAddress}`);
  deployedContracts.push({ name: "FAssetsAdapter", address: fAssetsAdapterAddress });

  // 2. Configure FAssets based on network
  const fAssetConfigs: FAssetConfig[] = [];

  if (chainId === 14) {
    // Flare mainnet - FXRP is deployed
    console.log("\n2. Configuring FAssets for Flare mainnet...");

    // Check if FXRP is deployed
    const fxrpCode = await ethers.provider.getCode(FXRP_FLARE.token);
    if (fxrpCode.length > 2) {
      fAssetConfigs.push({
        address: FXRP_FLARE.token,
        underlying: "XRP",
        feedId: CRYPTO_FEEDS.XRP_USD,
        pools: [FXRP_POOLS_FLARE.sparkdexV2_FXRP_WFLR].filter(Boolean),
      });
      console.log(`   FXRP found at: ${FXRP_FLARE.token}`);
    } else {
      console.log("   FXRP not deployed on this fork/network");
    }

    // FBTC and FDOGE can be added here when deployed
    // Example:
    // if (FBTC_FLARE.token && await checkContractDeployed(FBTC_FLARE.token)) {
    //   fAssetConfigs.push({
    //     address: FBTC_FLARE.token,
    //     underlying: "BTC",
    //     feedId: CRYPTO_FEEDS.BTC_USD,
    //     pools: [FBTC_POOLS_FLARE.sparkdexV3_FBTC_WFLR],
    //   });
    // }
  } else {
    console.log("\n2. Not on Flare mainnet - skipping FAsset configuration");
  }

  // 3. Register FAssets
  if (fAssetConfigs.length > 0) {
    console.log("\n3. Registering FAssets...");
    for (const config of fAssetConfigs) {
      try {
        console.log(`   Registering ${config.underlying} FAsset...`);
        const tx = await fAssetsAdapter.registerFAsset(
          config.address,
          config.underlying,
          config.feedId
        );
        await tx.wait();
        console.log(`   ✓ Registered: ${config.underlying} -> ${config.address}`);
      } catch (error: any) {
        console.log(`   ✗ Failed to register ${config.underlying}: ${error.message}`);
      }
    }
  }

  // 4. Add liquidity pools
  console.log("\n4. Adding liquidity pools...");
  for (const config of fAssetConfigs) {
    for (const pool of config.pools) {
      try {
        console.log(`   Adding pool ${pool} for ${config.underlying}...`);
        const tx = await fAssetsAdapter.addPool(config.address, pool);
        await tx.wait();
        console.log(`   ✓ Pool added: ${pool}`);
      } catch (error: any) {
        console.log(`   ✗ Failed to add pool: ${error.message}`);
      }
    }
  }

  // 5. Verify deployment
  console.log("\n5. Verifying deployment...");
  const fAssetCount = await fAssetsAdapter.getFAssetCount();
  console.log(`   Registered FAssets: ${fAssetCount}`);

  if (fAssetCount > 0) {
    const allFAssets = await fAssetsAdapter.getAllFAssets();
    for (const fAsset of allFAssets) {
      const info = await fAssetsAdapter.getFAssetInfo(fAsset);
      console.log(`   - ${info.symbol}: ${fAsset}`);
      console.log(`     Underlying: ${info.underlying}`);
      console.log(`     Total Supply: ${ethers.formatUnits(info.totalMinted, 6)}`);
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
  console.log(`\nFAssets Registered: ${fAssetCount}`);

  // Verification instructions
  console.log("\n" + "=".repeat(60));
  console.log("VERIFICATION INSTRUCTIONS");
  console.log("=".repeat(60));
  console.log("\nTo verify contracts on Flarescan, run:");
  for (const contract of deployedContracts) {
    const args = getConstructorArgs(contract.name, swapRouterAddress);
    const argsStr = args.length > 0 ? ` --constructor-args ${args.join(" ")}` : "";
    console.log(`  npx hardhat verify ${contract.address}${argsStr} --network ${network.name}`);
  }

  // Environment variable export
  console.log("\n" + "=".repeat(60));
  console.log("ENVIRONMENT VARIABLES");
  console.log("=".repeat(60));
  console.log("\nAdd these to your .env file:");
  for (const contract of deployedContracts) {
    const envKey = contract.name.replace(/([A-Z])/g, "_$1").toUpperCase().slice(1) + "_ADDRESS";
    console.log(`${envKey}=${contract.address}`);
  }

  console.log("\nDone!");

  return deployedContracts;
}

function getConstructorArgs(contractName: string, swapRouterAddress: string): string[] {
  switch (contractName) {
    case "SwapRouter":
      return [];
    case "SparkDEXAdapter":
      return [SPARKDEX_FLARE.swapRouter, SPARKDEX_FLARE.quoterV2, SPARKDEX_FLARE.factory];
    case "FAssetsAdapter":
      return [swapRouterAddress];
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
