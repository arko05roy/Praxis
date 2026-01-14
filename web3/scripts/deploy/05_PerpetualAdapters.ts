/**
 * Perpetual Adapters Deployment Script
 *
 * Deploys:
 * 1. PerpetualRouter (Perpetual Aggregator)
 * 2. SparkDEXEternalAdapter (100x Leverage Perps)
 *
 * Then registers all adapters with the PerpetualRouter.
 *
 * Usage:
 *   npx hardhat run scripts/deploy/05_PerpetualAdapters.ts --network flare
 *   npx hardhat run scripts/deploy/05_PerpetualAdapters.ts --network anvilFork
 *
 * Note: SparkDEX Eternal is only deployed on Flare mainnet.
 *       This script will skip adapter deployment on testnet.
 */

import { network } from "hardhat";
import {
  SPARKDEX_ETERNAL_FLARE,
  arePerpProtocolsAvailable,
  getAdapterConfig,
} from "../helpers/perpetualAddresses.js";

const { ethers } = await network.connect();

async function main() {
  console.log("=".repeat(60));
  console.log("PERPETUAL ADAPTERS DEPLOYMENT");
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

  // Check if perpetual protocols are available on this network
  const perpAvailable = arePerpProtocolsAvailable(chainId);
  if (!perpAvailable) {
    console.log(
      "\nWARNING: Perpetual protocols (SparkDEX Eternal) are not available on this network."
    );
    console.log(
      "Only PerpetualRouter will be deployed. Adapters will be skipped."
    );
  }

  // Track deployed contracts
  const deployedContracts: { name: string; address: string }[] = [];
  let sparkdexEternalAdapterAddress = "";

  // 1. Deploy PerpetualRouter
  console.log("\n1. Deploying PerpetualRouter...");
  const PerpetualRouter = await ethers.getContractFactory("PerpetualRouter");
  const perpetualRouter = await PerpetualRouter.deploy();
  await perpetualRouter.waitForDeployment();
  const perpetualRouterAddress = await perpetualRouter.getAddress();
  console.log(`   PerpetualRouter deployed to: ${perpetualRouterAddress}`);
  deployedContracts.push({
    name: "PerpetualRouter",
    address: perpetualRouterAddress,
  });

  // Only deploy adapters if on Flare mainnet
  if (perpAvailable) {
    const config = getAdapterConfig(chainId);
    if (!config) {
      console.log("   Failed to get adapter configuration");
      return;
    }

    // 2. Deploy SparkDEXEternalAdapter
    console.log("\n2. Deploying SparkDEXEternalAdapter...");
    try {
      // Verify SparkDEX Eternal contracts are accessible
      console.log(`   OrderBook: ${config.addresses[0]}`);
      console.log(`   Store: ${config.addresses[1]}`);
      console.log(`   PositionManager: ${config.addresses[2]}`);
      console.log(`   FundingTracker: ${config.addresses[3]}`);
      console.log(`   TradingValidator: ${config.addresses[4]}`);
      console.log(`   Primary Collateral: ${config.primaryCollateral}`);

      // Check if Store is a valid contract
      const storeCode = await ethers.provider.getCode(config.addresses[1]);
      if (storeCode === "0x") {
        throw new Error("Store contract not found at specified address");
      }

      const SparkDEXEternalAdapter = await ethers.getContractFactory(
        "SparkDEXEternalAdapter"
      );
      const sparkdexEternalAdapter = await SparkDEXEternalAdapter.deploy(
        config.addresses,
        config.primaryCollateral
      );
      await sparkdexEternalAdapter.waitForDeployment();
      sparkdexEternalAdapterAddress = await sparkdexEternalAdapter.getAddress();
      console.log(
        `   SparkDEXEternalAdapter deployed to: ${sparkdexEternalAdapterAddress}`
      );
      deployedContracts.push({
        name: "SparkDEXEternalAdapter",
        address: sparkdexEternalAdapterAddress,
      });

      // Verify connection to SparkDEX Eternal
      const adapterName = await sparkdexEternalAdapter.name();
      const protocol = await sparkdexEternalAdapter.protocol();
      const collateralToken = await sparkdexEternalAdapter.collateralToken();
      console.log(`   Connected to: ${adapterName}`);
      console.log(`   Protocol address: ${protocol}`);
      console.log(`   Collateral token: ${collateralToken}`);

      // Try to get available markets
      try {
        const markets = await sparkdexEternalAdapter.getAvailableMarkets();
        console.log(`   Available markets: ${markets.length}`);
        for (let i = 0; i < Math.min(markets.length, 5); i++) {
          const marketInfo = await sparkdexEternalAdapter.getMarketInfo(
            markets[i]
          );
          console.log(
            `     - ${marketInfo.name}: max ${marketInfo.maxLeverage}x leverage`
          );
        }
        if (markets.length > 5) {
          console.log(`     ... and ${markets.length - 5} more`);
        }
      } catch (error: unknown) {
        const errorMessage = error instanceof Error ? error.message : String(error);
        console.log(`   Could not fetch markets: ${errorMessage}`);
      }
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      console.log(`   Failed to deploy SparkDEXEternalAdapter: ${errorMessage}`);
    }

    // 3. Register adapters with PerpetualRouter
    console.log("\n3. Registering adapters with PerpetualRouter...");

    if (sparkdexEternalAdapterAddress) {
      try {
        const tx = await perpetualRouter.addAdapter(
          sparkdexEternalAdapterAddress
        );
        await tx.wait();
        console.log(`   Registered SparkDEXEternalAdapter`);
      } catch (error: unknown) {
        const errorMessage = error instanceof Error ? error.message : String(error);
        console.log(`   Failed to register SparkDEXEternalAdapter: ${errorMessage}`);
      }
    }

    // 4. Verify registrations
    console.log("\n4. Verifying adapter registrations...");
    const registeredAdapters = await perpetualRouter.getAdapters();
    console.log(`   Total registered adapters: ${registeredAdapters.length}`);

    for (const adapterAddr of registeredAdapters) {
      const info = await perpetualRouter.getAdapterInfo(adapterAddr);
      console.log(`   - ${adapterAddr}`);
      console.log(`     Name: ${info.name}`);
      console.log(`     Max Leverage: ${info.maxLeverage}x`);
      console.log(`     Active: ${info.active}`);
    }
  } else {
    console.log(
      "\n2-4. Skipping adapter deployment - not on Flare mainnet"
    );
  }

  // Summary
  console.log("\n" + "=".repeat(60));
  console.log("DEPLOYMENT SUMMARY");
  console.log("=".repeat(60));
  console.log("\nDeployed Contracts:");
  for (const contract of deployedContracts) {
    console.log(`  ${contract.name}: ${contract.address}`);
  }

  // Test perpetual queries if adapters were deployed
  if (perpAvailable && sparkdexEternalAdapterAddress) {
    console.log("\n" + "-".repeat(60));
    console.log("TESTING PERPETUAL QUERIES");
    console.log("-".repeat(60));

    // Test market support
    try {
      // Encode BTC/USD market
      const btcUsdMarket = ethers.encodeBytes32String("BTC/USD").slice(0, 22); // bytes10

      const isSupported = await perpetualRouter.isMarketSupported(
        ethers.encodeBytes32String("BTC/USD")
      );
      console.log(`\nBTC/USD market supported: ${isSupported}`);

      if (isSupported) {
        const [adapter, marketInfo] = await perpetualRouter.getMarketInfo(
          ethers.encodeBytes32String("BTC/USD")
        );
        console.log(`  Adapter: ${adapter}`);
        console.log(`  Name: ${marketInfo.name}`);
        console.log(`  Max Leverage: ${marketInfo.maxLeverage}x`);
        console.log(`  Funding Rate: ${marketInfo.fundingRate}`);
      }
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      console.log(`Failed to query market info: ${errorMessage}`);
    }

    // Test getAllMarkets
    try {
      const allMarkets = await perpetualRouter.getAllMarkets();
      console.log(`\nTotal available markets: ${allMarkets.length}`);
      for (let i = 0; i < Math.min(allMarkets.length, 5); i++) {
        console.log(`  - ${allMarkets[i].name}: ${allMarkets[i].maxLeverage}x`);
      }
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      console.log(`Failed to get all markets: ${errorMessage}`);
    }
  }

  // Verification instructions
  console.log("\n" + "=".repeat(60));
  console.log("VERIFICATION INSTRUCTIONS");
  console.log("=".repeat(60));
  console.log("\nTo verify contracts on Flarescan, run:");
  for (const contract of deployedContracts) {
    const args = getConstructorArgs(contract.name, chainId);
    const argsStr = args.length > 0 ? ` "${args.join('" "')}"` : "";
    console.log(
      `  npx hardhat verify ${contract.address}${argsStr} --network flare`
    );
  }

  console.log("\nDone!");

  return deployedContracts;
}

function getConstructorArgs(contractName: string, chainId: number): string[] {
  switch (contractName) {
    case "PerpetualRouter":
      return [];
    case "SparkDEXEternalAdapter":
      if (chainId === 14) {
        const config = getAdapterConfig(chainId);
        if (config) {
          // For verification, we need the flattened args
          return [...config.addresses, config.primaryCollateral];
        }
      }
      return [];
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
