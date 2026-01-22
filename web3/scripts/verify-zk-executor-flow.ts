// Simulate calling ZKExecutor.swap directly
import { ethers } from "ethers";
import fs from "fs";
import path from "path";
import dotenv from "dotenv";
import { fileURLToPath } from "url";

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function main() {
    console.log("Simulating ZKExecutor.swap() with REAL tokens...");

    const rpcUrl = process.env.COSTON2_RPC_URL || "https://coston2-api.flare.network/ext/C/rpc";
    const privateKey = process.env.PRIVATE_KEY;

    if (!privateKey) {
        throw new Error("PRIVATE_KEY not found in .env");
    }

    const provider = new ethers.JsonRpcProvider(rpcUrl);
    const wallet = new ethers.Wallet(privateKey, provider);

    // 1. Get Addresses
    const addressesPath = path.resolve(__dirname, "../../client/lib/contracts/addresses.ts");
    const content = fs.readFileSync(addressesPath, "utf8");
    const executorMatch = content.match(/ZKExecutor:\s*['"](0x[a-fA-F0-9]{40})['"]/);
    const mockUSDC_Match = content.match(/MockUSDC:\s*['"](0x[a-fA-F0-9]{40})['"]/);
    const mockWFLR_Match = content.match(/MockWFLR:\s*['"](0x[a-fA-F0-9]{40})['"]/);

    if (!executorMatch || !mockUSDC_Match || !mockWFLR_Match) throw new Error("Addresses not found");
    const zkExecutorAddress = executorMatch[1];
    const tokenIn = mockUSDC_Match[1];
    const tokenOut = mockWFLR_Match[1];

    console.log("ZKExecutor:", zkExecutorAddress);
    console.log("TokenIn (USDC):", tokenIn);
    console.log("TokenOut (WFLR):", tokenOut);

    // 2. Prepare Data
    const proofBytes = "0x00";
    const ertId = 123n;
    const timestamp = BigInt(Math.floor(Date.now() / 1000));
    const actionCommitment = 99999n;
    const publicInputs = [ertId, 0n, timestamp, actionCommitment];

    // Encode extraData: (bytes proof, uint256[] publicInputs)
    const abiCoder = new ethers.AbiCoder();
    const extraData = abiCoder.encode(
        ['bytes', 'uint256[]'],
        [proofBytes, publicInputs]
    );

    // 3. Mock ZKExecutor ABI
    const executorAbi = [
        "function swap(address tokenIn, address tokenOut, uint256 amountIn, uint256 minAmountOut, address to, bytes calldata extraData) external returns (uint256)"
    ];

    const executor = new ethers.Contract(zkExecutorAddress, executorAbi, wallet);

    // 4. Call swap (via callStatic to see if it reverts without sending tx)
    try {
        console.log("Calling swap() via callStatic...");

        await executor.swap.staticCall(
            tokenIn,
            tokenOut,
            100n, // amountIn (wei) - tiny amount
            0n,   // minAmountOut
            wallet.address, // to
            extraData
        );
        console.log("Swap simulation succeeded (unexpectedly, usually requires approval)");
    } catch (e: any) {
        console.log("Revert Reason:", e.reason);
        console.log("Error:", e.message);

        // Analyze revert
        if (e.message.includes("Invalid ZK Proof")) {
            console.error("FAILURE: logic failed at Verifier step.");
        } else if (e.message.includes("transfer")) {
            console.log("SUCCESS: logic passed Verification and failed at Transfer (expected).");
        } else if (e.message.includes("MockSimpleDEX: NO_LIQUIDITY")) {
            console.log("FAILURE: DEX Liquidity missing (confirmed).");
        } else {
            console.log("Unknown revert.");
        }
    }
}

main().catch((error) => {
    console.error(error);
    process.exit(1);
});
