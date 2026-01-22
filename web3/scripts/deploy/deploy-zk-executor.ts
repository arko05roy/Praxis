import { ethers } from "ethers";
import fs from "fs";
import path from "path";
import dotenv from "dotenv";
import { fileURLToPath } from "url";

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function main() {
    console.log("Starting manual deployment of ZKExecutor...");

    const rpcUrl = process.env.COSTON2_RPC_URL || "https://coston2-api.flare.network/ext/C/rpc";
    const privateKey = process.env.PRIVATE_KEY;

    if (!privateKey) {
        throw new Error("PRIVATE_KEY not found in .env");
    }

    const provider = new ethers.JsonRpcProvider(rpcUrl);
    const wallet = new ethers.Wallet(privateKey, provider);

    console.log(`Deploying with account: ${wallet.address}`);

    // Load addresses from client file
    const addressesPath = path.resolve(__dirname, "../../../client/lib/contracts/addresses.ts");
    if (!fs.existsSync(addressesPath)) {
        throw new Error("addresses.ts not found. Please ensure the client path is correct.");
    }
    const content = fs.readFileSync(addressesPath, "utf8");

    // Extract addresses using Regex (handling single or double quotes)
    const verifierMatch = content.match(/PrivateSwapVerifier:\s*['"](0x[a-fA-F0-9]{40})['"]/);
    const dexMatch = content.match(/MockSimpleDEX:\s*['"](0x[a-fA-F0-9]{40})['"]/);

    if (!verifierMatch || !dexMatch) {
        console.log("Full Content of addresses.ts:", content);
        throw new Error("Could not find dependencies in addresses.ts (PrivateSwapVerifier or MockSimpleDEX missing)");
    }

    const verifierAddress = verifierMatch[1];
    const dexAddress = dexMatch[1];

    console.log("Using Verifier:", verifierAddress);
    console.log("Using MockSimpleDEX:", dexAddress);

    // Path to artifact
    // Note: Assuming web3/contracts/zk/ZKExecutor.sol was compiled
    const artifactPath = path.resolve(__dirname, "../../artifacts/contracts/zk/ZKExecutor.sol/ZKExecutor.json");

    if (!fs.existsSync(artifactPath)) {
        throw new Error(`Artifact not found at ${artifactPath}. Run 'npx hardhat compile' first.`);
    }

    const artifact = JSON.parse(fs.readFileSync(artifactPath, "utf8"));
    const factory = new ethers.ContractFactory(artifact.abi, artifact.bytecode, wallet);

    console.log("Deploying contract...");
    const contract = await factory.deploy(verifierAddress, dexAddress);
    await contract.waitForDeployment();

    const address = await contract.getAddress();

    console.log("----------------------------------------------------");
    console.log(`ZKExecutor deployed to: ${address}`);
    console.log("----------------------------------------------------");
    console.log("Update this address in your frontend addresses.ts!");
}

main().catch((error) => {
    console.error(error);
    process.exit(1);
});
