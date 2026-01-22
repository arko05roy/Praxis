import { ethers } from "ethers";
import fs from "fs";
import path from "path";
import dotenv from "dotenv";
import { fileURLToPath } from "url";

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function main() {
    console.log("Registering ZKExecutor in ExecutionVault...");

    const rpcUrl = process.env.COSTON2_RPC_URL || "https://coston2-api.flare.network/ext/C/rpc";
    const privateKey = process.env.PRIVATE_KEY;

    if (!privateKey) {
        throw new Error("PRIVATE_KEY not found in .env");
    }

    const provider = new ethers.JsonRpcProvider(rpcUrl);
    const wallet = new ethers.Wallet(privateKey, provider);
    console.log(`Using account: ${wallet.address}`);

    // Load addresses
    const addressesPath = path.resolve(__dirname, "../../../client/lib/contracts/addresses.ts");
    if (!fs.existsSync(addressesPath)) {
        throw new Error("addresses.ts not found.");
    }
    const content = fs.readFileSync(addressesPath, "utf8");

    // Extract addresses
    const vaultMatch = content.match(/ExecutionVault:\s*['"](0x[a-fA-F0-9]{40})['"]/);
    const executorMatch = content.match(/ZKExecutor:\s*['"](0x[a-fA-F0-9]{40})['"]/);

    if (!vaultMatch || !executorMatch) {
        throw new Error("Could not find ExecutionVault or ZKExecutor in addresses.ts");
    }

    const vaultAddress = vaultMatch[1];
    const zkExecutorAddress = executorMatch[1];

    console.log("Vault:", vaultAddress);
    console.log("ZKExecutor:", zkExecutorAddress);

    // Minimal Vault ABI
    const vaultAbi = [
        "function registerAdapter(address adapter) external",
        "function isAdapterRegistered(address adapter) external view returns (bool)"
    ];

    const vault = new ethers.Contract(vaultAddress, vaultAbi, wallet);

    // Check if already registered
    const isRegistered = await vault.isAdapterRegistered(zkExecutorAddress);
    if (isRegistered) {
        console.log("ZKExecutor is already registered!");
        return;
    }

    console.log("Registering adapter...");
    const tx = await vault.registerAdapter(zkExecutorAddress);
    console.log("Tx Hash:", tx.hash);
    await tx.wait();
    console.log("ZKExecutor registered successfully!");
}

main().catch((error) => {
    console.error(error);
    process.exit(1);
});
