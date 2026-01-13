/**
 * Yield Adapters Deployment Script
 *
 * Deploys:
 * 1. YieldRouter (Yield Aggregator)
 * 2. SceptreAdapter (Liquid Staking)
 * 3. KineticAdapter (Lending Protocol)
 *
 * Then registers all adapters with the YieldRouter.
 *
 * Usage:
 *   npx hardhat run scripts/deploy/04_YieldAdapters.ts --network flare
 *   npx hardhat run scripts/deploy/04_YieldAdapters.ts --network anvilFork
 *
 * Note: Sceptre and Kinetic are only deployed on Flare mainnet.
 *       This script will skip adapter deployment on testnet.
 */

import { network } from "hardhat";
import {
  SCEPTRE_FLARE,
  KINETIC_FLARE,
  TOKENS_FLARE,
  areYieldProtocolsAvailable,
} from "../helpers/yieldAddresses.js";

const { ethers } = await network.connect();

async function main() {
  console.log("=".repeat(60));
  console.log("YIELD ADAPTERS DEPLOYMENT");
  console.log("=".repeat(60));

  // Get network info
  const networkInfo = await ethers.provider.getNetwork();
  const chainId = Number(networkInfo.chainId);
  console.log(`Chain ID: ${chainId}`);

  // Get deployer
  const [deployer] = await ethers.getSigners();
  const deployerAddress = await deployer.getAddress();
  const balance = await ethers.provider.getBalance(deployerAddress);

  console.log(`Deployer: ${deployerAddress}`);
  console.log(`Balance: ${ethers.formatEther(balance)} native tokens`);
  console.log("-".repeat(60));

  // Check if yield protocols are available on this network
  const yieldAvailable = areYieldProtocolsAvailable(chainId);
  if (!yieldAvailable) {
    console.log("\nWARNING: Yield protocols (Sceptre, Kinetic) are not available on this network.");
    console.log("Only YieldRouter will be deployed. Adapters will be skipped.");
  }

  // Track deployed contracts
  const deployedContracts: { name: string; address: string }[] = [];
  let sceptreAdapterAddress = "";
  let kineticAdapterAddress = "";

  // 1. Deploy YieldRouter
  console.log("\n1. Deploying YieldRouter...");
  const YieldRouter = await ethers.getContractFactory("YieldRouter");
  const yieldRouter = await YieldRouter.deploy();
  await yieldRouter.waitForDeployment();
  const yieldRouterAddress = await yieldRouter.getAddress();
  console.log(`   YieldRouter deployed to: ${yieldRouterAddress}`);
  deployedContracts.push({ name: "YieldRouter", address: yieldRouterAddress });

  // Only deploy adapters if on Flare mainnet
  if (yieldAvailable) {
    // 2. Deploy SceptreAdapter
    console.log("\n2. Deploying SceptreAdapter...");
    try {
      const SceptreAdapter = await ethers.getContractFactory("SceptreAdapter");
      const sceptreAdapter = await SceptreAdapter.deploy(
        SCEPTRE_FLARE.sflr,
        TOKENS_FLARE.WFLR
      );
      await sceptreAdapter.waitForDeployment();
      sceptreAdapterAddress = await sceptreAdapter.getAddress();
      console.log(`   SceptreAdapter deployed to: ${sceptreAdapterAddress}`);
      deployedContracts.push({ name: "SceptreAdapter", address: sceptreAdapterAddress });

      // Verify connection to Sceptre
      const sceptreName = await sceptreAdapter.name();
      const sflrAddress = await sceptreAdapter.protocol();
      console.log(`   Connected to: ${sceptreName} (sFLR: ${sflrAddress})`);
    } catch (error: any) {
      console.log(`   Failed to deploy SceptreAdapter: ${error.message}`);
    }

    // 3. Deploy KineticAdapter
    console.log("\n3. Deploying KineticAdapter...");
    try {
      const KineticAdapter = await ethers.getContractFactory("KineticAdapter");
      const kineticAdapter = await KineticAdapter.deploy(KINETIC_FLARE.comptroller);
      await kineticAdapter.waitForDeployment();
      kineticAdapterAddress = await kineticAdapter.getAddress();
      console.log(`   KineticAdapter deployed to: ${kineticAdapterAddress}`);
      deployedContracts.push({ name: "KineticAdapter", address: kineticAdapterAddress });

      // Initialize markets from comptroller
      console.log("   Initializing markets from comptroller...");
      const initTx = await kineticAdapter.initializeMarkets();
      await initTx.wait();

      // Get supported kTokens
      const supportedMarkets = await kineticAdapter.getSupportedMarkets();
      console.log(`   Discovered ${supportedMarkets.length} kToken markets:`);
      for (const market of supportedMarkets) {
        console.log(`     - ${market}`);
      }
    } catch (error: any) {
      console.log(`   Failed to deploy KineticAdapter: ${error.message}`);
    }

    // 4. Register adapters with YieldRouter
    console.log("\n4. Registering adapters with YieldRouter...");

    if (sceptreAdapterAddress) {
      try {
        const tx = await yieldRouter.addStakingAdapter(sceptreAdapterAddress);
        await tx.wait();
        console.log(`   Registered SceptreAdapter as STAKING adapter`);
      } catch (error: any) {
        console.log(`   Failed to register SceptreAdapter: ${error.message}`);
      }
    }

    if (kineticAdapterAddress) {
      try {
        const tx = await yieldRouter.addLendingAdapter(kineticAdapterAddress);
        await tx.wait();
        console.log(`   Registered KineticAdapter as LENDING adapter`);
      } catch (error: any) {
        console.log(`   Failed to register KineticAdapter: ${error.message}`);
      }
    }

    // 5. Verify registrations
    console.log("\n5. Verifying adapter registrations...");
    const registeredAdapters = await yieldRouter.getAdapters();
    console.log(`   Total registered adapters: ${registeredAdapters.length}`);

    for (const adapterAddr of registeredAdapters) {
      const adapterType = await yieldRouter.getAdapterType(adapterAddr);
      const typeStr = Number(adapterType) === 0 ? "STAKING" : "LENDING";
      console.log(`   - ${adapterAddr} (${typeStr})`);
    }
  } else {
    console.log("\n2-4. Skipping adapter deployment - not on Flare mainnet");
  }

  // Summary
  console.log("\n" + "=".repeat(60));
  console.log("DEPLOYMENT SUMMARY");
  console.log("=".repeat(60));
  console.log("\nDeployed Contracts:");
  for (const contract of deployedContracts) {
    console.log(`  ${contract.name}: ${contract.address}`);
  }

  // Test yield queries if adapters were deployed
  if (yieldAvailable && sceptreAdapterAddress) {
    console.log("\n" + "-".repeat(60));
    console.log("TESTING YIELD QUERIES");
    console.log("-".repeat(60));

    // Test finding best yield for native FLR
    try {
      const [bestAdapter, bestAPY] = await yieldRouter.findBestYield(ethers.ZeroAddress);
      console.log(`\nBest yield for FLR:`);
      console.log(`  Adapter: ${bestAdapter}`);
      console.log(`  APY: ${Number(bestAPY) / 100}%`);
    } catch (error: any) {
      console.log(`Failed to query best yield: ${error.message}`);
    }

    // Test TVL
    try {
      if (sceptreAdapterAddress) {
        const sceptreAdapter = await ethers.getContractAt("SceptreAdapter", sceptreAdapterAddress);
        const tvl = await sceptreAdapter.getTVL(ethers.ZeroAddress);
        console.log(`\nSceptre TVL: ${ethers.formatEther(tvl)} FLR`);
      }
    } catch (error: any) {
      console.log(`Failed to query TVL: ${error.message}`);
    }
  }

  // Verification instructions
  console.log("\n" + "=".repeat(60));
  console.log("VERIFICATION INSTRUCTIONS");
  console.log("=".repeat(60));
  console.log("\nTo verify contracts on Flarescan, run:");
  for (const contract of deployedContracts) {
    const args = getConstructorArgs(contract.name);
    const argsStr = args.length > 0 ? ` "${args.join('" "')}"` : "";
    console.log(`  npx hardhat verify ${contract.address}${argsStr} --network flare`);
  }

  console.log("\nDone!");

  return deployedContracts;
}

function getConstructorArgs(contractName: string): string[] {
  switch (contractName) {
    case "YieldRouter":
      return [];
    case "SceptreAdapter":
      return [SCEPTRE_FLARE.sflr, TOKENS_FLARE.WFLR];
    case "KineticAdapter":
      return [KINETIC_FLARE.comptroller];
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
