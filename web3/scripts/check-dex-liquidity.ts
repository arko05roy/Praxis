import { ethers } from "ethers";
import fs from "fs";
import path from "path";
import dotenv from "dotenv";
import { fileURLToPath } from "url";

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function main() {
    console.log("Checking Liquidity on MockSimpleDEX...");

    const rpcUrl = process.env.COSTON2_RPC_URL || "https://coston2-api.flare.network/ext/C/rpc";
    const privateKey = process.env.PRIVATE_KEY;

    if (!privateKey) throw new Error("PRIVATE_KEY not found in .env");

    const provider = new ethers.JsonRpcProvider(rpcUrl);
    const wallet = new ethers.Wallet(privateKey, provider);

    // 1. Get Addresses from client file
    const addressesPath = path.resolve(__dirname, "../../client/lib/contracts/addresses.ts");
    const content = fs.readFileSync(addressesPath, "utf8");

    const dexMatch = content.match(/MockSimpleDEX:\s*['"](0x[a-fA-F0-9]{40})['"]/);
    const mockUSDC_Match = content.match(/MockUSDC:\s*['"](0x[a-fA-F0-9]{40})['"]/);
    const mockWFLR_Match = content.match(/MockWFLR:\s*['"](0x[a-fA-F0-9]{40})['"]/);

    if (!dexMatch || !mockUSDC_Match || !mockWFLR_Match) {
        throw new Error("Could not find addresses (DEX, USDC, or WFLR)");
    }

    const dexAddress = dexMatch[1];
    const usdcAddress = mockUSDC_Match[1];
    const wflrAddress = mockWFLR_Match[1];

    console.log("DEX:", dexAddress);
    console.log("USDC:", usdcAddress);
    console.log("WFLR:", wflrAddress);

    const dexAbi = [
        "function getReserves(address tokenA, address tokenB) external view returns (uint256, uint256)",
        "function addLiquidity(address tokenA, address tokenB, uint256 amountA, uint256 amountB) external"
    ];

    const dex = new ethers.Contract(dexAddress, dexAbi, wallet);

    // Check Reserves
    const [resA, resB] = await dex.getReserves(usdcAddress, wflrAddress);
    console.log(`Reserves [USDC]: ${ethers.formatUnits(resA, 6)}`); // USDC 6 decimals
    console.log(`Reserves [WFLR]: ${ethers.formatEther(resB)}`);   // WFLR 18 decimals

    if (resA === 0n || resB === 0n) {
        console.log("warn: NO LIQUIDITY! Attempting to seed...");
        // Minting/Approving is needed. Assuming deployer has tokens.
        // For simplicity, we can't easily mint here without knowing if deployer has mint powers on these mocks.
        // But usually deployer owns them. 
        // Let's try to add liquidity if zero.

        // Load ERC20 ABI
        const erc20Abi = [
            "function approve(address spender, uint256 amount) public returns (bool)",
            "function balanceOf(address account) public view returns (uint256)",
            "function mint(address to, uint256 amount) public" // Assuming standard mock
        ];

        const usdc = new ethers.Contract(usdcAddress, erc20Abi, wallet);
        const wflr = new ethers.Contract(wflrAddress, erc20Abi, wallet);

        const amountUSDC = ethers.parseUnits("100000", 6); // 100k USDC
        const amountWFLR = ethers.parseEther("100000");    // 100k WFLR

        // Check balance
        const balUSDC = await usdc.balanceOf(wallet.address);
        const balWFLR = await wflr.balanceOf(wallet.address);

        if (balUSDC < amountUSDC) {
            console.log("Minting USDC...");
            try { await (await usdc.mint(wallet.address, amountUSDC)).wait(); } catch (e) { console.log("Mint failed", e); }
        }
        if (balWFLR < amountWFLR) {
            console.log("Minting WFLR...");
            try { await (await wflr.mint(wallet.address, amountWFLR)).wait(); } catch (e) { console.log("Mint failed", e); }
        }

        console.log("Approving DEX...");
        await (await usdc.approve(dexAddress, amountUSDC)).wait();
        await (await wflr.approve(dexAddress, amountWFLR)).wait();

        console.log("Adding Liquidity...");
        const tx = await dex.addLiquidity(usdcAddress, wflrAddress, amountUSDC, amountWFLR);
        await tx.wait();
        console.log("Liquidity Added!");
    }
}

main().catch((error) => {
    console.error(error);
    process.exit(1);
});
