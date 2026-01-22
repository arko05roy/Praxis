// Simulate what the ZKExecutor does
import { ethers } from "ethers";
import fs from "fs";
import path from "path";
import dotenv from "dotenv";
import { fileURLToPath } from "url";

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function main() {
    console.log("Verifying proof locally against deployed contract...");

    const rpcUrl = process.env.COSTON2_RPC_URL || "https://coston2-api.flare.network/ext/C/rpc";
    const privateKey = process.env.PRIVATE_KEY;

    if (!privateKey) {
        throw new Error("PRIVATE_KEY not found in .env");
    }

    const provider = new ethers.JsonRpcProvider(rpcUrl);
    const wallet = new ethers.Wallet(privateKey, provider);

    // 1. Get Deployed Verifier Address
    const addressesPath = path.resolve(__dirname, "../../client/lib/contracts/addresses.ts");
    // Was: "../../../client..." which went up one level too many from web3/scripts/verify-proof-local.ts ? 
    // Wait. Script is in web3/scripts/verify-proof-local.ts (no, I wrote it to web3/scripts/verify-proof-local.ts)
    // Actually, I wrote it to `web3/scripts/verify-proof-local.ts`.
    // The previous path was `path.resolve(__dirname, "../../../client/lib/contracts/addresses.ts")`
    // __dirname is `web3/scripts` (if executed via ts-node) or `web3/scripts`? 
    // If identifying as module, __dirname is directory of file.
    // File: /Users/arkoroy/Desktop/praxis/web3/scripts/verify-proof-local.ts
    // Dir: /Users/arkoroy/Desktop/praxis/web3/scripts
    // ../../client -> /Users/arkoroy/Desktop/praxis/client. Correct.

    // The error said: `/Users/arkoroy/Desktop/client/lib/contracts/addresses.ts` 
    // This implies it went up to Desktop/client.
    // So `web3/scripts` -> `..` (web3) -> `..` (praxis) -> `..` (Desktop). 
    // That's 3 levels up.
    // So `../../../` is indeed wrong. It should be `../../`.

    // Correct path: `path.resolve(__dirname, "../../client/lib/contracts/addresses.ts")`
    const content = fs.readFileSync(addressesPath, "utf8");
    const verifierMatch = content.match(/PrivateSwapVerifier:\s*['"](0x[a-fA-F0-9]{40})['"]/);

    if (!verifierMatch) throw new Error("Verifier address not found");
    const verifierAddress = verifierMatch[1];

    console.log("Verifier:", verifierAddress);

    // 2. Mock Proof and Inputs (matching what frontend sends)
    // The frontend sends "0x00" for proofBytes and 4 public inputs.
    // ZKExecutor decodes: (bytes proof, uint256[] publicInputs)

    // Let's call verify() directly on the Verifier contract
    const verifierAbi = [
        "function verify(bytes calldata proof, uint256[] calldata publicInputs) external view returns (bool)"
    ];

    const verifier = new ethers.Contract(verifierAddress, verifierAbi, wallet);

    // Construct inputs exactly as front-end does
    const proofBytes = "0x00";

    // Front-end inputs: [ertId, 0, timestamp, actionCommitment]
    const ertId = 123n;
    const timestamp = BigInt(Math.floor(Date.now() / 1000));
    const actionCommitment = 99999n;

    const publicInputs = [ertId, 0n, timestamp, actionCommitment];

    try {
        console.log("Calling verify(proofBytes, publicInputs)...");
        console.log("Inputs:", { proofBytes, publicInputs });
        const isValid = await verifier.verify(proofBytes, publicInputs);
        console.log("Verification Result:", isValid);
    } catch (e: any) {
        console.error("Verification Failed:", e.reason || e.message);
        // Decode custom error if possible
        if (e.data) {
            console.log("Revert Data:", e.data);
        }
    }
}

main().catch((error) => {
    console.error(error);
    process.exit(1);
});
