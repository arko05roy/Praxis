import { network } from "hardhat";
import { CRYPTO_FEEDS } from "../helpers/feedIds.js";

const { ethers } = await network.connect();

/**
 * Deployment script for FlareOracle contract
 *
 * Usage:
 *   npx hardhat run scripts/deploy/01_FlareOracle.ts --network coston2
 */
async function main() {
  console.log("Deploying FlareOracle to", network.name);

  // Get deployer account
  const [deployer] = await ethers.getSigners();
  console.log("Deployer address:", await deployer.getAddress());

  const balance = await ethers.provider.getBalance(deployer.address);
  console.log("Deployer balance:", ethers.formatEther(balance), "FLR");

  // Deploy FlareOracle
  // Using default max price age (300 seconds = 5 minutes)
  const maxPriceAge = 300;

  console.log("\nDeploying FlareOracle with max price age:", maxPriceAge);

  const FlareOracle = await ethers.getContractFactory("FlareOracle");
  const flareOracle = await FlareOracle.deploy(maxPriceAge);

  await flareOracle.waitForDeployment();

  const oracleAddress = await flareOracle.getAddress();
  console.log("FlareOracle deployed to:", oracleAddress);

  // Verify deployment
  const deployedMaxPriceAge = await flareOracle.maxPriceAge();
  console.log("Verified max price age:", deployedMaxPriceAge.toString());

  const deployedOwner = await flareOracle.owner();
  console.log("Verified owner:", deployedOwner);

  // Log deployment info
  console.log("\n=== Deployment Summary ===");
  console.log("Network:", network.name);
  console.log("Contract: FlareOracle");
  console.log("Address:", oracleAddress);
  console.log("Owner:", deployedOwner);
  console.log("Max Price Age:", deployedMaxPriceAge.toString(), "seconds");

  // Try to get supported feeds from FTSO
  console.log("\n=== Checking FTSO v2 Connection ===");
  try {
    const supportedFeeds = await flareOracle.getSupportedFeeds();
    console.log("Number of supported feeds:", supportedFeeds.length);

    if (supportedFeeds.length > 0) {
      console.log("First 5 supported feed IDs:");
      for (let i = 0; i < Math.min(5, supportedFeeds.length); i++) {
        console.log(`  ${i + 1}. ${supportedFeeds[i]}`);
      }
    }
  } catch (error) {
    console.log("Could not fetch supported feeds (expected on non-Flare networks)");
  }

  console.log("\n=== Available Feed IDs for Configuration ===");
  console.log("FLR/USD:", CRYPTO_FEEDS.FLR_USD);
  console.log("BTC/USD:", CRYPTO_FEEDS.BTC_USD);
  console.log("ETH/USD:", CRYPTO_FEEDS.ETH_USD);
  console.log("XRP/USD:", CRYPTO_FEEDS.XRP_USD);
  console.log("DOGE/USD:", CRYPTO_FEEDS.DOGE_USD);

  console.log("\n=== Next Steps ===");
  console.log("1. Configure token feeds using setTokenFeed()");
  console.log("2. Verify contract on block explorer");
  console.log("3. Save address to scripts/helpers/addresses.ts");

  return oracleAddress;
}

main()
  .then((address) => {
    console.log("\nDeployment successful!");
    process.exit(0);
  })
  .catch((error) => {
    console.error("Deployment failed:", error);
    process.exit(1);
  });
