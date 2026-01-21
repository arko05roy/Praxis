import { network } from "hardhat";
import * as fs from "fs";
import * as path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const { ethers } = await network.connect();

async function main() {
    const [deployer] = await ethers.getSigners();
    console.log("Fixing Settlement Configuration (Comprehensive) for User:", deployer.address);

    // Load deployed addresses
    const addressesPath = path.join(__dirname, "..", "..", "deployed-addresses-coston2.json");
    const addresses = JSON.parse(fs.readFileSync(addressesPath, "utf8"));

    const engineAddr = addresses.SettlementEngine;
    console.log("Target SettlementEngine:", engineAddr);

    // 1. PositionManager (Previously Fixed)
    console.log("\nChecking PositionManager...");
    const pm = await ethers.getContractAt("PositionManager", addresses.PositionManager);
    const pmEngine = await pm.settlementEngine();
    if (pmEngine.toLowerCase() !== engineAddr.toLowerCase()) {
        console.log("Fixing PositionManager...");
        await (await pm.setSettlementEngine(engineAddr)).wait();
    } else {
        console.log("PositionManager OK.");
    }

    // 2. ExecutionRightsNFT (Checked)
    console.log("\nChecking ExecutionRightsNFT...");
    const nft = await ethers.getContractAt("ExecutionRightsNFT", addresses.ExecutionRightsNFT);
    const nftEngine = await nft.settlementEngine();
    if (nftEngine.toLowerCase() !== engineAddr.toLowerCase()) {
        console.log("Fixing ExecutionRightsNFT...");
        await (await nft.setSettlementEngine(engineAddr)).wait();
    } else {
        console.log("ExecutionRightsNFT OK.");
    }

    // 3. ReputationManager
    console.log("\nChecking ReputationManager...");
    // Check if it has setSettlementEngine
    const rm = await ethers.getContractAt("ReputationManager", addresses.ReputationManager);
    try {
        const rmEngine = await rm.settlementEngine();
        if (rmEngine.toLowerCase() !== engineAddr.toLowerCase()) {
            console.log("Fixing ReputationManager...");
            await (await rm.setSettlementEngine(engineAddr)).wait();
        } else {
            console.log("ReputationManager OK.");
        }
    } catch (e) {
        console.log("ReputationManager might not use SettlementEngine or different function signature.");
        // Try calling setSettlementEngine anyway if getter fails? Or check ABI.
        // Assuming standard pattern
    }

    // 4. InsuranceFund
    console.log("\nChecking InsuranceFund...");
    const inf = await ethers.getContractAt("InsuranceFund", addresses.InsuranceFund);
    try {
        const infEngine = await inf.settlementEngine();
        if (infEngine.toLowerCase() !== engineAddr.toLowerCase()) {
            console.log("Fixing InsuranceFund...");
            await (await inf.setSettlementEngine(engineAddr)).wait();
        } else {
            console.log("InsuranceFund OK.");
        }
    } catch (e) {
        console.log("InsuranceFund check failed, maybe no public getter?");
    }

    // 5. CircuitBreaker
    console.log("\nChecking CircuitBreaker...");
    const cb = await ethers.getContractAt("CircuitBreaker", addresses.CircuitBreaker);
    try {
        const cbEngine = await cb.settlementEngine();
        if (cbEngine.toLowerCase() !== engineAddr.toLowerCase()) {
            console.log("Fixing CircuitBreaker...");
            await (await cb.setSettlementEngine(engineAddr)).wait();
        } else {
            console.log("CircuitBreaker OK.");
        }
    } catch (e) {
        console.log("CircuitBreaker check failed, maybe no public getter?");
    }

    // 6. ExecutionVault (uses onlyController, check setSettlementEngine)
    console.log("\nChecking ExecutionVault...");
    const vault = await ethers.getContractAt("ExecutionVault", addresses.ExecutionVault);
    const vaultEngine = await vault.settlementEngine();
    if (vaultEngine.toLowerCase() !== engineAddr.toLowerCase()) {
        console.log("Fixing ExecutionVault...");
        await (await vault.setSettlementEngine(engineAddr)).wait();
    } else {
        console.log("ExecutionVault OK.");
    }
}

main()
    .then(() => process.exit(0))
    .catch((error) => {
        console.error(error);
        process.exit(1);
    });
