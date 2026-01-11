import { network } from "hardhat";

const { ethers } = await network.connect();

/**
 * Deployment script for FDCVerifier contract
 *
 * Usage:
 *   npx hardhat run scripts/deploy/02_FDCVerifier.ts --network coston2
 */
async function main() {
  console.log("Deploying FDCVerifier to", network.name);

  // Get deployer account
  const [deployer] = await ethers.getSigners();
  console.log("Deployer address:", await deployer.getAddress());

  const balance = await ethers.provider.getBalance(deployer.address);
  console.log("Deployer balance:", ethers.formatEther(balance), "FLR");

  // Deploy FDCVerifier
  console.log("\nDeploying FDCVerifier...");

  const FDCVerifier = await ethers.getContractFactory("FDCVerifier");
  const fdcVerifier = await FDCVerifier.deploy();

  await fdcVerifier.waitForDeployment();

  const verifierAddress = await fdcVerifier.getAddress();
  console.log("FDCVerifier deployed to:", verifierAddress);

  // Verify deployment
  const deployedOwner = await fdcVerifier.owner();
  console.log("Verified owner:", deployedOwner);

  // Try to get FDC protocol ID
  console.log("\n=== Checking FDC Connection ===");
  try {
    const protocolId = await fdcVerifier.getFdcProtocolId();
    console.log("FDC Protocol ID:", protocolId.toString());
  } catch (error) {
    console.log("Could not fetch FDC protocol ID (expected on non-Flare networks)");
  }

  // Log attestation types
  console.log("\n=== Supported Attestation Types ===");
  const evmTxType = await fdcVerifier.EVM_TRANSACTION_TYPE();
  const paymentType = await fdcVerifier.PAYMENT_TYPE();
  const addressValidityType = await fdcVerifier.ADDRESS_VALIDITY_TYPE();

  console.log("EVM Transaction Type:", evmTxType);
  console.log("Payment Type:", paymentType);
  console.log("Address Validity Type:", addressValidityType);

  // Log deployment info
  console.log("\n=== Deployment Summary ===");
  console.log("Network:", network.name);
  console.log("Contract: FDCVerifier");
  console.log("Address:", verifierAddress);
  console.log("Owner:", deployedOwner);

  console.log("\n=== Next Steps ===");
  console.log("1. Verify contract on block explorer");
  console.log("2. Save address to scripts/helpers/addresses.ts");
  console.log("3. Test verification with real attestation proofs");

  return verifierAddress;
}

main()
  .then((address) => {
    console.log("\nDeployment successful!");
    process.exit(0);
  })
  .catch((error) => {
    console.error("Deployment failed:", error);
    process.exit(1);
  });
