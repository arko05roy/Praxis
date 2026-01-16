import { network } from "hardhat";

const { ethers } = await network.connect();

async function main() {
  console.log("Network:", network.name);
  console.log("Network config:", JSON.stringify(network.config, null, 2));

  const [owner] = await ethers.getSigners();
  console.log("Owner:", await owner.getAddress());
  console.log("Balance:", ethers.formatEther(await ethers.provider.getBalance(await owner.getAddress())));

  try {
    // Try to deploy MockERC20
    const MockERC20 = await ethers.getContractFactory("MockERC20");
    console.log("MockERC20 factory obtained");

    const usdc = await MockERC20.deploy("Mock USDC", "mUSDC", 6);
    console.log("Deploy transaction sent");

    await usdc.waitForDeployment();
    console.log("MockERC20 deployed at:", await usdc.getAddress());

    // Test a function call
    const symbol = await usdc.symbol();
    console.log("Symbol:", symbol);
  } catch (error: any) {
    console.error("Error:", error.message);
    if (error.stack) {
      console.error("Stack:", error.stack.slice(0, 500));
    }
  }
}

main().catch(console.error);
