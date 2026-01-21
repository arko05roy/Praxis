import hre from "hardhat";

async function main() {
    const ethers = (hre as any).ethers;
    if (!ethers) {
        console.error("Ethers object not found in Runtime Environment. Plugins might be missing.");
        // Try standard require fallback
        // const { ethers } = require("hardhat");
        return;
    }

    const [deployer] = await ethers.getSigners();
    console.log("Checking Required Stake logic...");

    // Addresses from Coston2 (Deployed 2026-01-21)
    const PRAXIS_GATEWAY = "0xbF96360cEB79235AB26b83c60c2588a109f4F7b0";
    const REPUTATION_MANAGER = "0xE1bad1a7971BD540A243806002f978863B528a73";

    // Check Gateway
    const gateway = await ethers.getContractAt("PraxisGateway", PRAXIS_GATEWAY);
    const repManager = await ethers.getContractAt("ReputationManager", REPUTATION_MANAGER);

    // Test Inputs
    const testAddress = deployer.address;
    const capitalAmount = ethers.parseUnits("7", 6); // $7 USD

    console.log(`Checking for Address: ${testAddress}`);
    console.log(`Capital Request: $7 (${capitalAmount.toString()} wei)`);

    try {
        // Check Tier
        const tier = await repManager.getExecutorTier(testAddress);
        console.log(`Current Tier: ${tier.toString()} (0=Unverified, 1=Novice, etc)`);

        // Check Config
        const config = await repManager.getTierConfig(tier);
        console.log(`Tier Config Stake BPS: ${config.stakeRequiredBps.toString()}`);

        // Check Required Stake
        const requiredStake = await gateway.getRequiredStake(testAddress, capitalAmount);
        console.log(`Required Stake (via Gateway): ${requiredStake.toString()}`);

        // Check Conversion Expected
        const expected = (capitalAmount * config.stakeRequiredBps) / 10000n;
        console.log(`Expected Calculation (USD): ${expected.toString()}`);

    } catch (e) {
        console.error("Error reading contract:", e);
    }
}

main().catch((error) => {
    console.error(error);
    process.exitCode = 1;
});
