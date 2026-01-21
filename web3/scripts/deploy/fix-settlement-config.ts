import { network } from "hardhat";
import * as fs from "fs";
import * as path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const { ethers } = await network.connect();

async function main() {
    const [deployer] = await ethers.getSigners();
    console.log("Fixing Settlement Configuration for User:", deployer.address);

    // Load deployed addresses
    const addressesPath = path.join(__dirname, "..", "..", "deployed-addresses-coston2.json");
    const addresses = JSON.parse(fs.readFileSync(addressesPath, "utf8"));

    const positionManager = await ethers.getContractAt("PositionManager", addresses.PositionManager);
    console.log(`PositionManager at: ${addresses.PositionManager}`);

    // Check current settlement engine
    const currentEngine = await positionManager.settlementEngine();
    console.log(`Current SettlementEngine in PositionManager: ${currentEngine}`);
    console.log(`Expected SettlementEngine: ${addresses.SettlementEngine}`);

    if (currentEngine.toLowerCase() !== addresses.SettlementEngine.toLowerCase()) {
        console.log("Mismatch detected! Updating SettlementEngine...");
        const tx = await positionManager.setSettlementEngine(addresses.SettlementEngine);
        await tx.wait();
        console.log("Updated SettlementEngine on PositionManager.");
    } else {
        console.log("SettlementEngine is correctly configured.");
    }

    // Also check Permissions on ExecutionRightsNFT for safety
    const nft = await ethers.getContractAt("ExecutionRightsNFT", addresses.ExecutionRightsNFT);
    console.log(`\nExecutionRightsNFT at: ${addresses.ExecutionRightsNFT}`);
    const nftEngine = await nft.settlementEngine();
    console.log(`Current SettlementEngine in NFT: ${nftEngine}`);

    if (nftEngine.toLowerCase() !== addresses.SettlementEngine.toLowerCase()) {
        console.log("Mismatch detected in NFT! Updating...");
        const tx = await nft.setSettlementEngine(addresses.SettlementEngine);
        await tx.wait();
        console.log("Updated SettlementEngine on NFT.");
    } else {
        console.log("NFT SettlementEngine configuration is correct.");
    }
}

main()
    .then(() => process.exit(0))
    .catch((error) => {
        console.error(error);
        process.exit(1);
    });
