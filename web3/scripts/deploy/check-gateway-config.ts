import { network } from "hardhat";
import * as fs from "fs";
import * as path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const { ethers } = await network.connect();

async function main() {
    console.log("Checking Gateway <-> Engine <-> NFT consistency...");

    // Load addresses
    const addressesPath = path.join(__dirname, "..", "..", "deployed-addresses-coston2.json");
    const addresses = JSON.parse(fs.readFileSync(addressesPath, "utf8"));

    const gateway = await ethers.getContractAt("PraxisGateway", addresses.PraxisGateway);
    const nft = await ethers.getContractAt("ExecutionRightsNFT", addresses.ExecutionRightsNFT);
    const engine = await ethers.getContractAt("SettlementEngine", addresses.SettlementEngine);

    const gatewayEngine = await gateway.settlementEngine();
    const nftEngine = await nft.settlementEngine();
    const engineNFT = await engine.ertNFT();

    console.log("\n--- SETTLEMENT ENGINE ADDRESSES ---");
    console.log("JSON (Expected):     ", addresses.SettlementEngine);
    console.log("Gateway calls:       ", gatewayEngine);
    console.log("NFT authorizes:      ", nftEngine);

    console.log("\n--- NFT ADDRESSES ---");
    console.log("JSON (Expected):     ", addresses.ExecutionRightsNFT);
    console.log("Engine calls:        ", engineNFT);

    let clean = true;

    if (engineNFT.toLowerCase() !== addresses.ExecutionRightsNFT.toLowerCase()) {
        console.error("CRITICAL MISMATCH: SettlementEngine calling WRONG NFT!");
        clean = false;
    }

    if (gatewayEngine.toLowerCase() !== addresses.SettlementEngine.toLowerCase()) {
        console.error("MISMATCH: Gateway pointing to wrong engine.");
        clean = false;
    }

    if (nftEngine.toLowerCase() !== addresses.SettlementEngine.toLowerCase()) {
        console.error("MISMATCH: NFT authorizing wrong engine.");
        clean = false;
    }

    if (clean) {
        console.log("\nConfiguration looks consistent.");
    }
}

main()
    .then(() => process.exit(0))
    .catch((error) => {
        console.error(error);
        process.exit(1);
    });
