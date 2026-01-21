import { network } from "hardhat";
import * as fs from "fs";
import * as path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const { ethers } = await network.connect();

async function main() {
    const [deployer] = await ethers.getSigners();
    console.log("Debugging settlement for user:", deployer.address);

    // Load deployed addresses
    const addressesPath = path.join(__dirname, "..", "..", "deployed-addresses-coston2.json");
    const addresses = JSON.parse(fs.readFileSync(addressesPath, "utf8"));

    // Connect to Contracts
    const gateway = await ethers.getContractAt("PraxisGateway", addresses.PraxisGateway);
    const nft = await ethers.getContractAt("ExecutionRightsNFT", addresses.ExecutionRightsNFT);

    // Get owned ERTs
    const balance = await nft.balanceOf(deployer.address);
    console.log(`User owns ${balance} ERTs`);

    if (balance === 0n) {
        console.log("No ERTs to check.");
        return;
    }

    for (let i = 0; i < Number(balance); i++) {
        const tokenId = await nft.tokenOfOwnerByIndex(deployer.address, i);
        console.log(`\nChecking ERT #${tokenId}`);

        try {
            const rights = await nft.getRights(tokenId);
            console.log("ERT Details:");
            console.log("  Capital Limit:", ethers.formatUnits(rights.capitalLimit, 6), "USDC");
            console.log("  Stake Amount (Raw):", rights.stakeAmount.toString());

            const est = await gateway.estimateSettlement(tokenId);
            console.log("Estimate Settlement Result:");
            console.log("  Total PnL:", ethers.formatUnits(est.totalPnl, 6), "USDC");
            console.log("  Capital Returned:", ethers.formatUnits(est.capitalReturned, 6), "USDC");
            console.log("  Stake Returned (Raw):", est.stakeReturned.toString());
            console.log("  Stake Returned (18 dec):", ethers.formatUnits(est.stakeReturned, 18), "WFLR");
            console.log("  Stake Returned (6 dec - Current UI Bug?):", ethers.formatUnits(est.stakeReturned, 6));

            console.log("  LP Fees:", ethers.formatUnits(est.lpBaseFee + est.lpProfitShare, 6), "USDC");
            console.log("  Executor Profit:", ethers.formatUnits(est.executorProfit, 6), "USDC");

        } catch (e) {
            console.log("  Error estimating settlement:", e.message);
        }
    }
}

main()
    .then(() => process.exit(0))
    .catch((error) => {
        console.error(error);
        process.exit(1);
    });
