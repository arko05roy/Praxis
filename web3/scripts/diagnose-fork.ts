import { network } from "hardhat";

const { ethers } = await network.connect();

async function main() {
  // First check fork state
  const blockNumber = await ethers.provider.getBlockNumber();
  const network = await ethers.provider.getNetwork();
  console.log("Network chainId:", network.chainId.toString());
  console.log("Block number:", blockNumber);

  const block = await ethers.provider.getBlock(blockNumber);
  if (block) {
    console.log("Block timestamp:", new Date(Number(block.timestamp) * 1000).toISOString());
  }
  console.log();

  const FACTORY = "0x8A2578d23d4C532cC9A98FaD91C0523f5efDE652";
  const QUOTER = "0x2DcABbB3a5Fe9DBb1F43edf48449aA7254Ef3a80";
  const WFLR = "0x1D80c49BbBCd1C0911346656B529DF9E5c2F783d";
  const USDC = "0xFbDa5F676cB37624f28265A144A48B0d6e87d3b6";
  const FXRP = "0xad552a648c74d49e10027ab8a618a3ad4901c5be";

  console.log("=== Diagnosing Flare Fork ===\n");

  // Check factory contract
  console.log("1. Checking V3 Factory at:", FACTORY);
  const factoryCode = await ethers.provider.getCode(FACTORY);
  console.log("   Code exists:", factoryCode.length > 2);
  console.log("   Code length:", factoryCode.length, "bytes");

  // Try to call getPool
  const factoryAbi = ["function getPool(address,address,uint24) external view returns (address)"];
  const factory = new ethers.Contract(FACTORY, factoryAbi, ethers.provider);
  try {
    const pool = await factory.getPool(WFLR, USDC, 3000);
    console.log("   getPool(WFLR, USDC, 3000):", pool);
  } catch (error: any) {
    console.log("   getPool error:", error.message.slice(0, 200));
  }

  // Check quoter contract
  console.log("\n2. Checking QuoterV2 at:", QUOTER);
  const quoterCode = await ethers.provider.getCode(QUOTER);
  console.log("   Code exists:", quoterCode.length > 2);
  console.log("   Code length:", quoterCode.length, "bytes");

  // Check FXRP token
  console.log("\n3. Checking FXRP at:", FXRP);
  const fxrpCode = await ethers.provider.getCode(FXRP);
  console.log("   Code exists:", fxrpCode.length > 2);
  console.log("   Code length:", fxrpCode.length, "bytes");

  if (fxrpCode.length > 2) {
    const erc20Abi = [
      "function symbol() external view returns (string)",
      "function decimals() external view returns (uint8)",
      "function totalSupply() external view returns (uint256)",
    ];
    const fxrp = new ethers.Contract(FXRP, erc20Abi, ethers.provider);
    try {
      const symbol = await fxrp.symbol();
      console.log("   Symbol:", symbol);
      const decimals = await fxrp.decimals();
      console.log("   Decimals:", decimals);
      const supply = await fxrp.totalSupply();
      console.log("   Total Supply:", ethers.formatUnits(supply, decimals));
    } catch (error: any) {
      console.log("   ERC20 call error:", error.message.slice(0, 200));
    }
  }

  // Check WFLR token
  console.log("\n4. Checking WFLR at:", WFLR);
  const wflrCode = await ethers.provider.getCode(WFLR);
  console.log("   Code exists:", wflrCode.length > 2);

  // Check USDC token
  console.log("\n5. Checking USDC at:", USDC);
  const usdcCode = await ethers.provider.getCode(USDC);
  console.log("   Code exists:", usdcCode.length > 2);

  console.log("\n=== Diagnosis Complete ===");
}

main().catch(console.error);
