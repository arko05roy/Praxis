import { network } from "hardhat";
import * as fs from "fs";
import * as path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const { ethers } = await network.connect();

async function main() {
    const [deployer] = await ethers.getSigners();
    console.log("Upgrading tier for:", deployer.address);

    // Load deployed addresses
    const addressesPath = path.join(__dirname, "..", "..", "deployed-addresses-coston2.json");
    const addresses = JSON.parse(fs.readFileSync(addressesPath, "utf8"));

    // Connect to ReputationManager
    const reputationManager = await ethers.getContractAt(
        "ReputationManager",
        addresses.ReputationManager
    );

    // Check current tier
    const currentTier = await reputationManager.getExecutorTier(deployer.address);
    console.log("Current tier:", currentTier);

    // ExecutorTier enum: UNVERIFIED=0, NOVICE=1, VERIFIED=2, ESTABLISHED=3, ELITE=4
    const ESTABLISHED = 3;

    // Upgrade to ESTABLISHED tier (allows $100k capital)
    console.log("Upgrading to ESTABLISHED tier...");
    const tx = await reputationManager.setExecutorTier(deployer.address, ESTABLISHED);
    await tx.wait();

    // Verify new tier
    const newTier = await reputationManager.getExecutorTier(deployer.address);
    console.log("New tier:", newTier);

    // Get tier config
    const tierConfig = await reputationManager.getExecutorTierConfig(deployer.address);
    console.log("\nTier Config:");
    console.log("  Max Capital:", ethers.formatUnits(tierConfig.maxCapital, 6), "USD");
    console.log("  Stake Required:", tierConfig.stakeRequiredBps / 100n, "%");
    console.log("  Max Drawdown:", tierConfig.maxDrawdownBps / 100n, "%");

    console.log("\n✅ Tier upgraded! You can now request up to $100,000 capital.");
}

main()
    .then(() => process.exit(0))
    .catch((error) => {
        console.error(error);
        process.exit(1);
    });
