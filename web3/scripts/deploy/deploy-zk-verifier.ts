import { ethers } from "ethers";
import fs from "fs";
import path from "path";
import dotenv from "dotenv";
import { fileURLToPath } from "url";

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function main() {
    console.log("Starting manual deployment of PrivateSwapVerifier...");

    const rpcUrl = process.env.COSTON2_RPC_URL || "https://coston2-api.flare.network/ext/C/rpc";
    const privateKey = process.env.PRIVATE_KEY;

    if (!privateKey) {
        throw new Error("PRIVATE_KEY not found in .env");
    }

    const provider = new ethers.JsonRpcProvider(rpcUrl);
    const wallet = new ethers.Wallet(privateKey, provider);

    console.log(`Deploying with account: ${wallet.address}`);

    // Path to artifact
    const artifactPath = path.resolve(__dirname, "../../artifacts/contracts/zk/PrivateSwapVerifier.sol/PrivateSwapVerifier.json");

    if (!fs.existsSync(artifactPath)) {
        throw new Error(`Artifact not found at ${artifactPath}. Run 'npx hardhat compile' first.`);
    }

    const artifact = JSON.parse(fs.readFileSync(artifactPath, "utf8"));
    const factory = new ethers.ContractFactory(artifact.abi, artifact.bytecode, wallet);

    console.log("Deploying contract...");
    const contract = await factory.deploy();
    await contract.waitForDeployment();

    const address = await contract.getAddress();

    console.log("----------------------------------------------------");
    console.log(`PrivateSwapVerifier deployed to: ${address}`);
    console.log("----------------------------------------------------");
    console.log("Update this address in your frontend constants!");
}

main().catch((error) => {
    console.error(error);
    process.exit(1);
});
