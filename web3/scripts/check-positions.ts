import { ethers } from "ethers";
import fs from "fs";
import path from "path";
import dotenv from "dotenv";
import { fileURLToPath } from "url";

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function main() {
    console.log("Checking Positions for ERT 7...");

    const rpcUrl = process.env.COSTON2_RPC_URL || "https://coston2-api.flare.network/ext/C/rpc";
    const provider = new ethers.JsonRpcProvider(rpcUrl);

    // 1. Get Gateway Address
    const addressesPath = path.resolve(__dirname, "../../client/lib/contracts/addresses.ts");
    const content = fs.readFileSync(addressesPath, "utf8");
    const praxisGatewayMatch = content.match(/PraxisGateway:\s*['"](0x[a-fA-F0-9]{40})['"]/);

    if (!praxisGatewayMatch) throw new Error("Gateway address not found");
    const praxisGatewayAddress = praxisGatewayMatch[1];

    console.log("Gateway:", praxisGatewayAddress);

    // 2. ABI
    const abi = [
        "function getPositions(uint256 ertId) external view returns (tuple(uint256 ertId, address adapter, bytes32 positionId, address asset, uint256 size, uint256 entryValueUsd, uint256 timestamp, uint8 positionType)[])"
    ];

    const gateway = new ethers.Contract(praxisGatewayAddress, abi, provider);

    // 3. Call
    const ertId = 7;
    const positions = await gateway.getPositions(ertId);

    console.log(`ERT ${ertId} Positions:`);
    if (positions.length === 0) {
        console.log("No positions found.");
    } else {
        positions.forEach((p: any, i: number) => {
            console.log(`\n[${i}] Asset: ${p.asset}`);
            console.log(`    Size: ${p.size.toString()}`);
            console.log(`    Entry Value: ${p.entryValueUsd.toString()}`);
            console.log(`    Adapter: ${p.adapter}`);
        });
    }
}

main().catch((error) => {
    console.error(error);
    process.exit(1);
});
