import { ethers } from "ethers";
import fs from "fs";
import path from "path";
import dotenv from "dotenv";
import { fileURLToPath } from "url";

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function main() {
    console.log("Verifying ZKExecutor return value...");

    const rpcUrl = process.env.COSTON2_RPC_URL || "https://coston2-api.flare.network/ext/C/rpc";
    const privateKey = process.env.PRIVATE_KEY;
    if (!privateKey) throw new Error("PRIVATE_KEY not found in .env");

    const provider = new ethers.JsonRpcProvider(rpcUrl);
    const wallet = new ethers.Wallet(privateKey, provider);

    // 1. Get Addresses
    const addressesPath = path.resolve(__dirname, "../../client/lib/contracts/addresses.ts");
    const content = fs.readFileSync(addressesPath, "utf8");
    const executorMatch = content.match(/ZKExecutor:\s*['"](0x[a-fA-F0-9]{40})['"]/);
    const mockUSDC_Match = content.match(/MockUSDC:\s*['"](0x[a-fA-F0-9]{40})['"]/);
    const mockWFLR_Match = content.match(/MockWFLR:\s*['"](0x[a-fA-F0-9]{40})['"]/);

    const zkExecutorAddress = executorMatch![1];
    const usdcAddress = mockUSDC_Match![1];
    const wflrAddress = mockWFLR_Match![1];

    console.log("ZKExecutor:", zkExecutorAddress);

    // 2. Prepare Data
    const proofBytes = "0x00";
    const ertId = 123n;
    const timestamp = BigInt(Math.floor(Date.now() / 1000));
    const actionCommitment = 99999n;
    const publicInputs = [ertId, 0n, timestamp, actionCommitment];

    const abiCoder = new ethers.AbiCoder();
    const extraData = abiCoder.encode(
        ['bytes', 'uint256[]'],
        [proofBytes, publicInputs]
    );

    // 3. Executor ABI
    const executorAbi = [
        "function swap(address tokenIn, address tokenOut, uint256 amountIn, uint256 minAmountOut, address to, bytes calldata extraData) external returns (uint256)"
    ];
    const executor = new ethers.Contract(zkExecutorAddress, executorAbi, wallet);

    // 4. Simulate Call
    // We expect it to fail if we don't have tokens/approve, but callStatic might give us the return value IF it succeeds or reverts with a value.
    // Actually, `callStatic` will Simulate execution.
    // If I don't have balance/allowance on the Executor (from msg.sender), it will revert transferFrom.
    // BUT the Executor calls transferFrom(msg.sender).
    // So I need to Approve Executor and Have Tokens.
    // I likely have tokens from previous script.

    // Approve
    const erc20Abi = ["function approve(address, uint256) public returns (bool)"];
    const usdc = new ethers.Contract(usdcAddress, erc20Abi, wallet);
    await (await usdc.approve(zkExecutorAddress, ethers.parseUnits("10", 6))).wait();

    try {
        const amountIn = ethers.parseUnits("1", 6); // 1 USDC
        const result = await executor.swap.staticCall(
            usdcAddress,
            wflrAddress,
            amountIn,
            0n,
            wallet.address,
            extraData
        );
        console.log("Swap Result (AmountOut):", result.toString());
    } catch (e: any) {
        console.log("Simulation failed:", e.reason || e.message);
    }
}

main().catch((error) => {
    console.error(error);
    process.exit(1);
});
