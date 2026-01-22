import { ethers } from "ethers";
import fs from "fs";
import path from "path";
import dotenv from "dotenv";
import { fileURLToPath } from "url";

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function main() {
    console.log("Checking MockWFLR Decimals...");

    const rpcUrl = process.env.COSTON2_RPC_URL || "https://coston2-api.flare.network/ext/C/rpc";
    const provider = new ethers.JsonRpcProvider(rpcUrl);

    // 1. Get WFLR Address
    const addressesPath = path.resolve(__dirname, "../../client/lib/contracts/addresses.ts");
    const content = fs.readFileSync(addressesPath, "utf8");
    const mockWFLR_Match = content.match(/MockWFLR:\s*['"](0x[a-fA-F0-9]{40})['"]/);

    if (!mockWFLR_Match) throw new Error("WFLR address not found");
    const wflrAddress = mockWFLR_Match[1];

    console.log("WFLR:", wflrAddress);

    // 2. ABI
    const abi = ["function decimals() view returns (uint8)", "function balanceOf(address) view returns (uint256)"];

    const wflr = new ethers.Contract(wflrAddress, abi, provider);

    // 3. Call
    const decimals = await wflr.decimals();
    console.log("Decimals:", decimals);

    // Check Vault Balance of WFLR (just to see if tokens are there)
    const vaultMatch = content.match(/ExecutionVault:\s*['"](0x[a-fA-F0-9]{40})['"]/);
    const vaultAddress = vaultMatch![1];
    const bal = await wflr.balanceOf(vaultAddress);
    console.log("Vault WFLR Balance:", ethers.formatUnits(bal, decimals));
}

main().catch((error) => {
    console.error(error);
    process.exit(1);
});
