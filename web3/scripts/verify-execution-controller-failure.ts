// Simulate calling ExecutionController.validateAndExecute directly
import { ethers } from "ethers";
import fs from "fs";
import path from "path";
import dotenv from "dotenv";
import { fileURLToPath } from "url";

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function main() {
    console.log("Simulating ExecutionController.validateAndExecute()...");

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

    // We need ExecutionController. User failed at `0xab40...` but that wasn't in addresses.ts?
    // Wait, let's assume `0xab40...` IS the ExecutionController.
    // Or I can read it from PraxisGateway.
    const praxisGatewayMatch = content.match(/PraxisGateway:\s*['"](0x[a-fA-F0-9]{40})['"]/);
    const praxisGatewayAddress = praxisGatewayMatch![1];

    const gatewayAbi = ["function executionController() view returns (address)"];
    const gateway = new ethers.Contract(praxisGatewayAddress, gatewayAbi, provider);
    const controllerAddress = await gateway.executionController();
    console.log("ExecutionController (on-chain):", controllerAddress);

    // 2. Prepare Data (Match Frontend)
    const zkExecutorAddress = executorMatch![1];
    const tokenIn = mockUSDC_Match![1];
    const tokenOut = mockWFLR_Match![1];

    const proofBytes = "0x00";
    const ertId = 4n; // Assuming ertId based on "00...004" in revert data, or I should use 1 if user has 1. 
    // Let's iterate or check user proof.
    // User revert had "0000004" at the end. That is likely ertId.

    const timestamp = BigInt(Math.floor(Date.now() / 1000));
    const actionCommitment = 99999n;
    const publicInputs = [ertId, 0n, timestamp, actionCommitment];

    const abiCoder = new ethers.AbiCoder();
    const extraData = abiCoder.encode(
        ['bytes', 'uint256[]'],
        [proofBytes, publicInputs]
    );

    const action = {
        actionType: 0, // SWAP
        adapter: zkExecutorAddress,
        tokenIn: tokenIn,
        tokenOut: tokenOut,
        amountIn: 100n,
        minAmountOut: 0n,
        extraData: extraData
    };

    // 3. ABI
    const controllerAbi = [
        `function validateAndExecute(uint256 ertId, tuple(uint8 actionType, address adapter, address tokenIn, address tokenOut, uint256 amountIn, uint256 minAmountOut, bytes extraData)[] actions) external returns (bytes[])`
    ];

    const controller = new ethers.Contract(controllerAddress, controllerAbi, wallet);

    // 4. Call (simulate)
    try {
        console.log("Calling validateAndExecute() via callStatic...");
        await controller.validateAndExecute.staticCall(ertId, [action]);
        console.log("Validation succeeded!");
    } catch (e: any) {
        console.log("Revert Reason:", e.reason);
        console.log("Error Data:", e.data); // This should be 0x7768681d...

        // Decode custom error
        const iface = new ethers.Interface([
            "error AdapterNotAllowed(address adapter, uint256 ertId)",
            "error InvalidAdapter()"
        ]);

        try {
            const decoded = iface.parseError(e.data);
            console.log("Decoded Error Name:", decoded?.name);
            console.log("Decoded Error Args:", decoded?.args);
        } catch (d) {
            console.log("Could not decode error data");
        }
    }
}

main().catch((error) => {
    console.error(error);
    process.exit(1);
});
