import { ethers } from "hardhat";

/**
 * Phase 6 Deployment Script
 * Deploys the Execution Rights System contracts:
 * 1. ReputationManager
 * 2. ExecutionVault (ERC-4626)
 * 3. UtilizationController
 * 4. CircuitBreaker
 * 5. ExposureManager
 * 6. InsuranceFund
 * 7. PositionManager
 * 8. ExecutionRightsNFT (ERC-721)
 * 9. ExecutionController
 */

interface DeployedContracts {
    reputationManager: string;
    executionVault: string;
    utilizationController: string;
    circuitBreaker: string;
    exposureManager: string;
    insuranceFund: string;
    positionManager: string;
    executionRightsNFT: string;
    executionController: string;
}

// Flare Mainnet addresses (from previous phases)
const FLARE_ORACLE = process.env.FLARE_ORACLE || "";
const USDC_ADDRESS = "0xFbDa5F676cB37624f28265A144A48B0d6e87d3b6"; // USDC on Flare

async function main(): Promise<DeployedContracts> {
    const [deployer] = await ethers.getSigners();
    const balance = await ethers.provider.getBalance(deployer.address);

    console.log("=".repeat(60));
    console.log("PRAXIS Phase 6 Deployment - Execution Rights System");
    console.log("=".repeat(60));
    console.log(`Deployer: ${deployer.address}`);
    console.log(`Balance: ${ethers.formatEther(balance)} FLR`);
    console.log("");

    const deployed: DeployedContracts = {
        reputationManager: "",
        executionVault: "",
        utilizationController: "",
        circuitBreaker: "",
        exposureManager: "",
        insuranceFund: "",
        positionManager: "",
        executionRightsNFT: "",
        executionController: "",
    };

    // 1. Deploy ReputationManager
    console.log("1. Deploying ReputationManager...");
    const ReputationManager = await ethers.getContractFactory("ReputationManager");
    const reputationManager = await ReputationManager.deploy();
    await reputationManager.waitForDeployment();
    deployed.reputationManager = await reputationManager.getAddress();
    console.log(`   ReputationManager deployed to: ${deployed.reputationManager}`);

    // 2. Deploy ExecutionVault
    console.log("2. Deploying ExecutionVault...");
    const usdc = await ethers.getContractAt("IERC20", USDC_ADDRESS);
    const ExecutionVault = await ethers.getContractFactory("ExecutionVault");
    const executionVault = await ExecutionVault.deploy(
        USDC_ADDRESS,
        "PRAXIS Vault Shares",
        "pxUSDC"
    );
    await executionVault.waitForDeployment();
    deployed.executionVault = await executionVault.getAddress();
    console.log(`   ExecutionVault deployed to: ${deployed.executionVault}`);

    // 3. Deploy UtilizationController
    console.log("3. Deploying UtilizationController...");
    const UtilizationController = await ethers.getContractFactory("UtilizationController");
    const utilizationController = await UtilizationController.deploy(deployed.executionVault);
    await utilizationController.waitForDeployment();
    deployed.utilizationController = await utilizationController.getAddress();
    console.log(`   UtilizationController deployed to: ${deployed.utilizationController}`);

    // 4. Deploy CircuitBreaker
    console.log("4. Deploying CircuitBreaker...");
    const CircuitBreaker = await ethers.getContractFactory("CircuitBreaker");
    const circuitBreaker = await CircuitBreaker.deploy(
        deployed.executionVault,
        0 // Initial snapshot (will be updated)
    );
    await circuitBreaker.waitForDeployment();
    deployed.circuitBreaker = await circuitBreaker.getAddress();
    console.log(`   CircuitBreaker deployed to: ${deployed.circuitBreaker}`);

    // 5. Deploy ExposureManager
    console.log("5. Deploying ExposureManager...");
    const ExposureManager = await ethers.getContractFactory("ExposureManager");
    const exposureManager = await ExposureManager.deploy(deployed.executionVault);
    await exposureManager.waitForDeployment();
    deployed.exposureManager = await exposureManager.getAddress();
    console.log(`   ExposureManager deployed to: ${deployed.exposureManager}`);

    // 6. Deploy InsuranceFund
    console.log("6. Deploying InsuranceFund...");
    const InsuranceFund = await ethers.getContractFactory("InsuranceFund");
    const insuranceFund = await InsuranceFund.deploy(
        deployed.executionVault,
        USDC_ADDRESS
    );
    await insuranceFund.waitForDeployment();
    deployed.insuranceFund = await insuranceFund.getAddress();
    console.log(`   InsuranceFund deployed to: ${deployed.insuranceFund}`);

    // 7. Deploy PositionManager
    console.log("7. Deploying PositionManager...");
    const flareOracleAddress = FLARE_ORACLE || deployer.address; // Fallback for testing
    const PositionManager = await ethers.getContractFactory("PositionManager");
    const positionManager = await PositionManager.deploy(flareOracleAddress);
    await positionManager.waitForDeployment();
    deployed.positionManager = await positionManager.getAddress();
    console.log(`   PositionManager deployed to: ${deployed.positionManager}`);

    // 8. Deploy ExecutionRightsNFT
    console.log("8. Deploying ExecutionRightsNFT...");
    const ExecutionRightsNFT = await ethers.getContractFactory("ExecutionRightsNFT");
    const executionRightsNFT = await ExecutionRightsNFT.deploy(
        deployed.reputationManager,
        deployed.executionVault
    );
    await executionRightsNFT.waitForDeployment();
    deployed.executionRightsNFT = await executionRightsNFT.getAddress();
    console.log(`   ExecutionRightsNFT deployed to: ${deployed.executionRightsNFT}`);

    // 9. Deploy ExecutionController
    console.log("9. Deploying ExecutionController...");
    const ExecutionController = await ethers.getContractFactory("ExecutionController");
    const executionController = await ExecutionController.deploy(
        deployed.executionRightsNFT,
        deployed.executionVault,
        deployed.positionManager,
        deployed.exposureManager,
        flareOracleAddress
    );
    await executionController.waitForDeployment();
    deployed.executionController = await executionController.getAddress();
    console.log(`   ExecutionController deployed to: ${deployed.executionController}`);

    // Wire up contracts
    console.log("\n10. Wiring up contracts...");

    // Set ExecutionController on vault
    console.log("    - Setting ExecutionController on ExecutionVault...");
    await executionVault.setExecutionController(deployed.executionController);

    // Set UtilizationController on vault
    console.log("    - Setting UtilizationController on ExecutionVault...");
    await executionVault.setUtilizationController(deployed.utilizationController);

    // Set CircuitBreaker on vault
    console.log("    - Setting CircuitBreaker on ExecutionVault...");
    await executionVault.setCircuitBreaker(deployed.circuitBreaker);

    // Set ExecutionController on ExecutionRightsNFT
    console.log("    - Setting ExecutionController on ExecutionRightsNFT...");
    await executionRightsNFT.setExecutionController(deployed.executionController);

    // Set CircuitBreaker on ExecutionRightsNFT
    console.log("    - Setting CircuitBreaker on ExecutionRightsNFT...");
    await executionRightsNFT.setCircuitBreaker(deployed.circuitBreaker);

    // Set ExecutionController on PositionManager
    console.log("    - Setting ExecutionController on PositionManager...");
    await positionManager.setExecutionController(deployed.executionController);

    // Set ExecutionController on ExposureManager
    console.log("    - Setting ExecutionController on ExposureManager...");
    await exposureManager.setExecutionController(deployed.executionController);

    // Set CircuitBreaker on ExecutionController
    console.log("    - Setting CircuitBreaker on ExecutionController...");
    await executionController.setCircuitBreaker(deployed.circuitBreaker);

    console.log("\n" + "=".repeat(60));
    console.log("Phase 6 Deployment Complete!");
    console.log("=".repeat(60));
    console.log("\nDeployed Contracts:");
    console.log(`  ReputationManager:    ${deployed.reputationManager}`);
    console.log(`  ExecutionVault:       ${deployed.executionVault}`);
    console.log(`  UtilizationController: ${deployed.utilizationController}`);
    console.log(`  CircuitBreaker:       ${deployed.circuitBreaker}`);
    console.log(`  ExposureManager:      ${deployed.exposureManager}`);
    console.log(`  InsuranceFund:        ${deployed.insuranceFund}`);
    console.log(`  PositionManager:      ${deployed.positionManager}`);
    console.log(`  ExecutionRightsNFT:   ${deployed.executionRightsNFT}`);
    console.log(`  ExecutionController:  ${deployed.executionController}`);

    console.log("\nNext Steps:");
    console.log("  1. Register adapters on ExecutionVault");
    console.log("  2. Configure token feeds on FlareOracle");
    console.log("  3. Set SettlementEngine addresses (Phase 7)");
    console.log("  4. Transfer ownership to multisig");

    return deployed;
}

main()
    .then((deployed) => {
        console.log("\nDeployment successful!");
        process.exit(0);
    })
    .catch((error) => {
        console.error("Deployment failed:", error);
        process.exit(1);
    });

export { main, DeployedContracts };
