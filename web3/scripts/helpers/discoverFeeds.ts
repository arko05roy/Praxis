import { network } from "hardhat";
import { CRYPTO_FEEDS, decodeFeedId } from "./feedIds.js";

const { ethers } = await network.connect();

/**
 * Feed Discovery Script for FTSO v2 on Coston2
 *
 * This script queries the real Coston2 network to discover available feeds
 * and validate price data. No mock values - all data comes from live FTSO v2.
 *
 * Usage:
 *   npx hardhat run scripts/helpers/discoverFeeds.ts --network coston2
 */

// Flare Contract Registry ABI (minimal for getFtsoV2)
const FLARE_CONTRACT_REGISTRY_ABI = [
  "function getContractAddressByName(string calldata _name) external view returns (address)",
];

// FTSO v2 Interface ABI (minimal for our needs)
const FTSO_V2_ABI = [
  "function getSupportedFeedIds() external view returns (bytes21[] memory)",
  "function getFeedById(bytes21 _feedId) external payable returns (uint256 _value, int8 _decimals, uint64 _timestamp)",
  "function getFeedByIdInWei(bytes21 _feedId) external payable returns (uint256 _value, uint64 _timestamp)",
  "function calculateFeeById(bytes21 _feedId) external view returns (uint256)",
  "function calculateFeeByIds(bytes21[] calldata _feedIds) external view returns (uint256)",
];

// Flare Contract Registry address (same on all Flare networks)
const FLARE_CONTRACT_REGISTRY = "0xaD67FE66660Fb8dFE9d6b1b4240d8650e30F6019";

async function main() {
  console.log("=".repeat(60));
  console.log("FTSO v2 Feed Discovery on", network.name);
  console.log("=".repeat(60));

  // Get signer
  const [signer] = await ethers.getSigners();
  const signerAddress = await signer.getAddress();
  console.log("\nSigner address:", signerAddress);

  const balance = await ethers.provider.getBalance(signerAddress);
  console.log("Balance:", ethers.formatEther(balance), "FLR");

  // Connect to Flare Contract Registry
  console.log("\n--- Connecting to Flare Contract Registry ---");
  console.log("Registry address:", FLARE_CONTRACT_REGISTRY);

  const registry = new ethers.Contract(
    FLARE_CONTRACT_REGISTRY,
    FLARE_CONTRACT_REGISTRY_ABI,
    signer
  );

  // Get FtsoV2 address
  const ftsoV2Address = await registry.getContractAddressByName("FtsoV2");
  console.log("FtsoV2 address:", ftsoV2Address);

  // Connect to FTSO v2
  const ftsoV2 = new ethers.Contract(ftsoV2Address, FTSO_V2_ABI, signer);

  // Get supported feed IDs
  console.log("\n--- Discovering Supported Feeds ---");
  const supportedFeeds = await ftsoV2.getSupportedFeedIds();
  console.log("Total supported feeds:", supportedFeeds.length);

  // Display first 10 feeds
  console.log("\nFirst 10 supported feed IDs:");
  for (let i = 0; i < Math.min(10, supportedFeeds.length); i++) {
    const feedId = supportedFeeds[i];
    try {
      const name = decodeFeedId(feedId);
      console.log(`  ${i + 1}. ${feedId} -> ${name}`);
    } catch {
      console.log(`  ${i + 1}. ${feedId}`);
    }
  }

  // Query specific feeds we care about
  console.log("\n--- Querying Specific Feed Prices ---");
  const feedsToQuery = [
    { name: "FLR/USD", id: CRYPTO_FEEDS.FLR_USD },
    { name: "BTC/USD", id: CRYPTO_FEEDS.BTC_USD },
    { name: "ETH/USD", id: CRYPTO_FEEDS.ETH_USD },
    { name: "XRP/USD", id: CRYPTO_FEEDS.XRP_USD },
    { name: "DOGE/USD", id: CRYPTO_FEEDS.DOGE_USD },
  ];

  for (const feed of feedsToQuery) {
    console.log(`\n${feed.name} (${feed.id}):`);
    try {
      // Calculate fee
      const fee = await ftsoV2.calculateFeeById(feed.id);
      console.log(`  Fee: ${ethers.formatEther(fee)} FLR`);

      // Get price using staticCall to get return values from payable function
      const result = await ftsoV2.getFeedById.staticCall(feed.id, {
        value: fee,
      });

      // Result is an array with [value, decimals, timestamp]
      const value = result[0];
      const decimals = result[1];
      const timestamp = result[2];

      const adjustedPrice =
        Number(value) / Math.pow(10, Math.abs(Number(decimals)));
      const priceDate = new Date(Number(timestamp) * 1000);
      const ageSeconds = Math.floor(Date.now() / 1000) - Number(timestamp);

      console.log(`  Raw value: ${value}`);
      console.log(`  Decimals: ${decimals}`);
      console.log(`  Price: $${adjustedPrice.toFixed(6)}`);
      console.log(`  Timestamp: ${priceDate.toISOString()}`);
      console.log(`  Age: ${ageSeconds} seconds`);

      // Also get price in wei (18 decimals) using staticCall
      const weiResult = await ftsoV2.getFeedByIdInWei.staticCall(feed.id, {
        value: fee,
      });
      const valueInWei = weiResult[0];
      console.log(`  Price in Wei (18 decimals): ${valueInWei}`);
    } catch (error: any) {
      console.log(`  Error: ${error.message || error}`);
    }
  }

  // Verify our feed IDs match supported feeds
  console.log("\n--- Validating Our Feed ID Definitions ---");
  let allValid = true;
  for (const feed of feedsToQuery) {
    const isSupported = supportedFeeds.some(
      (f: string) => f.toLowerCase() === feed.id.toLowerCase()
    );
    const status = isSupported ? "✓" : "✗";
    console.log(`  ${status} ${feed.name}: ${isSupported ? "Valid" : "NOT FOUND"}`);
    if (!isSupported) allValid = false;
  }

  if (allValid) {
    console.log("\n✓ All our feed definitions are valid and supported by FTSO v2!");
  } else {
    console.log(
      "\n⚠ Some feed IDs don't match. Check the feed ID encoding."
    );
  }

  // Calculate fee for batch query
  console.log("\n--- Batch Fee Calculation ---");
  const batchFeedIds = feedsToQuery.map((f) => f.id);
  const batchFee = await ftsoV2.calculateFeeByIds(batchFeedIds);
  console.log(
    `Fee for ${batchFeedIds.length} feeds: ${ethers.formatEther(batchFee)} FLR`
  );

  console.log("\n" + "=".repeat(60));
  console.log("Feed Discovery Complete!");
  console.log("=".repeat(60));
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error("Error:", error);
    process.exit(1);
  });
