import { ethers } from "hardhat";

/**
 * Combined Phase 6 + Phase 7 Deployment Script
 *
 * This script deploys the complete Execution Rights System including:
 * - All Phase 6 contracts (vault, ERT NFT, controllers, safety systems)
 * - All Phase 7 contracts (settlement engine, gateway)
 * - Full wiring between all components
 *
 * Use this for:
 * - Fresh testnet deployments
 * - Integration testing on Flare mainnet fork
 * - Complete protocol deployment
 */

// Flare Mainnet addresses
const FLARE_ORACLE = process.env.FLARE_ORACLE || "0x0979854b028210Cf492a3bCB990B6a1D45d89eCc";
const USDC_ADDRESS = process.env.USDC_ADDRESS || "0xFbDa5F676cB37624f28265A144A48B0d6e87d3b6";

// Optional adapter addresses (set these if deploying with adapters)
const ADAPTERS = {
    sparkDEXAdapter: process.env.SPARKDEX_ADAPTER || "",
    blazeSwapAdapter: process.env.BLAZESWAP_ADAPTER || "",
    enosysAdapter: process.env.ENOSYS_ADAPTER || "",
    kineticAdapter: process.env.KINETIC_ADAPTER || "",
    sceptreAdapter: process.env.SCEPTRE_ADAPTER || "",
    sparkDEXEternalAdapter: process.env.SPARKDEX_ETERNAL_ADAPTER || "",
    fAssetsAdapter: process.env.FASSETS_ADAPTER || "",
};

enum AdapterType {
    NONE = 0,
    DEX = 1,
    YIELD = 2,
    PERPETUAL = 3,
}

interface DeployedContracts {
    // Phase 1
    flareOracle: string;
    // Phase 6
    reputationManager: string;
    executionVault: string;
    utilizationController: string;
    circuitBreaker: string;
    exposureManager: string;
    insuranceFund: string;
    positionManager: string;
    executionRightsNFT: string;
    executionController: string;
    // Phase 7
    settlementEngine: string;
    praxisGateway: string;
}

async function main(): Promise<DeployedContracts> {
    const [deployer] = await ethers.getSigners();
    const balance = await ethers.provider.getBalance(deployer.address);

    console.log("=".repeat(70));
    console.log("PRAXIS Complete Deployment - Phase 6 + Phase 7");
    console.log("=".repeat(70));
    console.log(`Deployer: ${deployer.address}`);
    console.log(`Balance:  ${ethers.formatEther(balance)} FLR`);
    console.log(`Network:  ${(await ethers.provider.getNetwork()).name}`);
    console.log("");

    const deployed: DeployedContracts = {
        flareOracle: FLARE_ORACLE,
        reputationManager: "",
        executionVault: "",
        utilizationController: "",
        circuitBreaker: "",
        exposureManager: "",
        insuranceFund: "",
        positionManager: "",
        executionRightsNFT: "",
        executionController: "",
        settlementEngine: "",
        praxisGateway: "",
    };

    // ======================================================================
    //                          PHASE 6 DEPLOYMENT
    // ======================================================================
    console.log("=" .repeat(70));
    console.log("PHASE 6: Execution Rights System");
    console.log("=".repeat(70));

    // 1. ReputationManager
    console.log("\n1. Deploying ReputationManager...");
    const ReputationManager = await ethers.getContractFactory("ReputationManager");
    const reputationManager = await ReputationManager.deploy();
    await reputationManager.waitForDeployment();
    deployed.reputationManager = await reputationManager.getAddress();
    console.log(`   Deployed: ${deployed.reputationManager}`);

    // 2. ExecutionVault
    console.log("\n2. Deploying ExecutionVault...");
    const ExecutionVault = await ethers.getContractFactory("ExecutionVault");
    const executionVault = await ExecutionVault.deploy(
        USDC_ADDRESS,
        "PRAXIS Vault Shares",
        "pxUSDC"
    );
    await executionVault.waitForDeployment();
    deployed.executionVault = await executionVault.getAddress();
    console.log(`   Deployed: ${deployed.executionVault}`);

    // 3. UtilizationController
    console.log("\n3. Deploying UtilizationController...");
    const UtilizationController = await ethers.getContractFactory("UtilizationController");
    const utilizationController = await UtilizationController.deploy(deployed.executionVault);
    await utilizationController.waitForDeployment();
    deployed.utilizationController = await utilizationController.getAddress();
    console.log(`   Deployed: ${deployed.utilizationController}`);

    // 4. CircuitBreaker
    console.log("\n4. Deploying CircuitBreaker...");
    const CircuitBreaker = await ethers.getContractFactory("CircuitBreaker");
    const circuitBreaker = await CircuitBreaker.deploy(deployed.executionVault, 0);
    await circuitBreaker.waitForDeployment();
    deployed.circuitBreaker = await circuitBreaker.getAddress();
    console.log(`   Deployed: ${deployed.circuitBreaker}`);

    // 5. ExposureManager
    console.log("\n5. Deploying ExposureManager...");
    const ExposureManager = await ethers.getContractFactory("ExposureManager");
    const exposureManager = await ExposureManager.deploy(deployed.executionVault);
    await exposureManager.waitForDeployment();
    deployed.exposureManager = await exposureManager.getAddress();
    console.log(`   Deployed: ${deployed.exposureManager}`);

    // 6. InsuranceFund
    console.log("\n6. Deploying InsuranceFund...");
    const InsuranceFund = await ethers.getContractFactory("InsuranceFund");
    const insuranceFund = await InsuranceFund.deploy(deployed.executionVault, USDC_ADDRESS);
    await insuranceFund.waitForDeployment();
    deployed.insuranceFund = await insuranceFund.getAddress();
    console.log(`   Deployed: ${deployed.insuranceFund}`);

    // 7. PositionManager
    console.log("\n7. Deploying PositionManager...");
    const PositionManager = await ethers.getContractFactory("PositionManager");
    const positionManager = await PositionManager.deploy(FLARE_ORACLE);
    await positionManager.waitForDeployment();
    deployed.positionManager = await positionManager.getAddress();
    console.log(`   Deployed: ${deployed.positionManager}`);

    // 8. ExecutionRightsNFT
    console.log("\n8. Deploying ExecutionRightsNFT...");
    const ExecutionRightsNFT = await ethers.getContractFactory("ExecutionRightsNFT");
    const executionRightsNFT = await ExecutionRightsNFT.deploy(
        deployed.reputationManager,
        deployed.executionVault
    );
    await executionRightsNFT.waitForDeployment();
    deployed.executionRightsNFT = await executionRightsNFT.getAddress();
    console.log(`   Deployed: ${deployed.executionRightsNFT}`);

    // 9. ExecutionController
    console.log("\n9. Deploying ExecutionController...");
    const ExecutionController = await ethers.getContractFactory("ExecutionController");
    const executionController = await ExecutionController.deploy(
        deployed.executionRightsNFT,
        deployed.executionVault,
        deployed.positionManager,
        deployed.exposureManager,
        FLARE_ORACLE
    );
    await executionController.waitForDeployment();
    deployed.executionController = await executionController.getAddress();
    console.log(`   Deployed: ${deployed.executionController}`);

    // ======================================================================
    //                          PHASE 7 DEPLOYMENT
    // ======================================================================
    console.log("\n" + "=".repeat(70));
    console.log("PHASE 7: Settlement Engine & Gateway");
    console.log("=".repeat(70));

    // 10. SettlementEngine
    console.log("\n10. Deploying SettlementEngine...");
    const SettlementEngine = await ethers.getContractFactory("SettlementEngine");
    const settlementEngine = await SettlementEngine.deploy(
        deployed.executionRightsNFT,
        deployed.executionVault,
        deployed.positionManager,
        deployed.reputationManager,
        deployed.circuitBreaker,
        deployed.insuranceFund,
        FLARE_ORACLE
    );
    await settlementEngine.waitForDeployment();
    deployed.settlementEngine = await settlementEngine.getAddress();
    console.log(`   Deployed: ${deployed.settlementEngine}`);

    // 11. PraxisGateway
    console.log("\n11. Deploying PraxisGateway...");
    const PraxisGateway = await ethers.getContractFactory("PraxisGateway");
    const praxisGateway = await PraxisGateway.deploy(
        deployed.executionVault,
        deployed.executionRightsNFT,
        deployed.settlementEngine,
        deployed.executionController,
        deployed.reputationManager,
        deployed.positionManager
    );
    await praxisGateway.waitForDeployment();
    deployed.praxisGateway = await praxisGateway.getAddress();
    console.log(`   Deployed: ${deployed.praxisGateway}`);

    // ======================================================================
    //                           WIRING
    // ======================================================================
    console.log("\n" + "=".repeat(70));
    console.log("WIRING: Connecting Components");
    console.log("=".repeat(70));

    // Phase 6 wiring
    console.log("\nPhase 6 Wiring:");

    console.log("  - ExecutionVault.setExecutionController...");
    await executionVault.setExecutionController(deployed.executionController);

    console.log("  - ExecutionVault.setUtilizationController...");
    await executionVault.setUtilizationController(deployed.utilizationController);

    console.log("  - ExecutionVault.setCircuitBreaker...");
    await executionVault.setCircuitBreaker(deployed.circuitBreaker);

    console.log("  - ExecutionRightsNFT.setExecutionController...");
    await executionRightsNFT.setExecutionController(deployed.executionController);

    console.log("  - ExecutionRightsNFT.setCircuitBreaker...");
    await executionRightsNFT.setCircuitBreaker(deployed.circuitBreaker);

    console.log("  - PositionManager.setExecutionController...");
    await positionManager.setExecutionController(deployed.executionController);

    console.log("  - ExposureManager.setExecutionController...");
    await exposureManager.setExecutionController(deployed.executionController);

    console.log("  - ExecutionController.setCircuitBreaker...");
    await executionController.setCircuitBreaker(deployed.circuitBreaker);

    // Phase 7 wiring
    console.log("\nPhase 7 Wiring:");

    console.log("  - ExecutionVault.setSettlementEngine...");
    await executionVault.setSettlementEngine(deployed.settlementEngine);

    console.log("  - ExecutionRightsNFT.setSettlementEngine...");
    await executionRightsNFT.setSettlementEngine(deployed.settlementEngine);

    console.log("  - SettlementEngine.setGateway...");
    await settlementEngine.setGateway(deployed.praxisGateway);

    // ======================================================================
    //                    ADAPTER TYPE CONFIGURATION
    // ======================================================================
    console.log("\n" + "=".repeat(70));
    console.log("ADAPTERS: Configuring Types");
    console.log("=".repeat(70));

    const adapterConfigs: { name: string; address: string; type: AdapterType }[] = [];

    // Collect configured adapters
    if (ADAPTERS.sparkDEXAdapter) {
        adapterConfigs.push({ name: "SparkDEX", address: ADAPTERS.sparkDEXAdapter, type: AdapterType.DEX });
    }
    if (ADAPTERS.blazeSwapAdapter) {
        adapterConfigs.push({ name: "BlazeSwap", address: ADAPTERS.blazeSwapAdapter, type: AdapterType.DEX });
    }
    if (ADAPTERS.enosysAdapter) {
        adapterConfigs.push({ name: "Enosys", address: ADAPTERS.enosysAdapter, type: AdapterType.DEX });
    }
    if (ADAPTERS.kineticAdapter) {
        adapterConfigs.push({ name: "Kinetic", address: ADAPTERS.kineticAdapter, type: AdapterType.YIELD });
    }
    if (ADAPTERS.sceptreAdapter) {
        adapterConfigs.push({ name: "Sceptre", address: ADAPTERS.sceptreAdapter, type: AdapterType.YIELD });
    }
    if (ADAPTERS.sparkDEXEternalAdapter) {
        adapterConfigs.push({ name: "SparkDEX Eternal", address: ADAPTERS.sparkDEXEternalAdapter, type: AdapterType.PERPETUAL });
    }
    if (ADAPTERS.fAssetsAdapter) {
        adapterConfigs.push({ name: "FAssets", address: ADAPTERS.fAssetsAdapter, type: AdapterType.DEX });
    }

    if (adapterConfigs.length > 0) {
        console.log("\nConfiguring adapter types on SettlementEngine:");
        const typeNames = ["NONE", "DEX", "YIELD", "PERPETUAL"];
        for (const config of adapterConfigs) {
            console.log(`  - ${config.name}: ${typeNames[config.type]} (${config.address.slice(0, 10)}...)`);
        }

        await settlementEngine.setAdapterTypes(
            adapterConfigs.map((c) => c.address),
            adapterConfigs.map((c) => c.type)
        );
        console.log("  Adapter types configured!");
    } else {
        console.log("\n  [SKIP] No adapter addresses provided");
        console.log("  Configure adapters manually using:");
        console.log("    settlementEngine.setAdapterType(address, type)");
    }

    // ======================================================================
    //                           SUMMARY
    // ======================================================================
    console.log("\n" + "=".repeat(70));
    console.log("DEPLOYMENT COMPLETE");
    console.log("=".repeat(70));

    console.log("\nAll Deployed Contracts:");
    console.log("-".repeat(60));
    console.log(`FlareOracle:          ${deployed.flareOracle}`);
    console.log("-".repeat(60));
    console.log(`ReputationManager:    ${deployed.reputationManager}`);
    console.log(`ExecutionVault:       ${deployed.executionVault}`);
    console.log(`UtilizationController: ${deployed.utilizationController}`);
    console.log(`CircuitBreaker:       ${deployed.circuitBreaker}`);
    console.log(`ExposureManager:      ${deployed.exposureManager}`);
    console.log(`InsuranceFund:        ${deployed.insuranceFund}`);
    console.log(`PositionManager:      ${deployed.positionManager}`);
    console.log(`ExecutionRightsNFT:   ${deployed.executionRightsNFT}`);
    console.log(`ExecutionController:  ${deployed.executionController}`);
    console.log("-".repeat(60));
    console.log(`SettlementEngine:     ${deployed.settlementEngine}`);
    console.log(`PraxisGateway:        ${deployed.praxisGateway}`);
    console.log("-".repeat(60));

    console.log("\nEntry Points:");
    console.log(`  Gateway (user interactions): ${deployed.praxisGateway}`);
    console.log(`  Vault (LP deposits):        ${deployed.executionVault}`);

    console.log("\nEnvironment Variables (copy to .env):");
    console.log("```");
    console.log(`FLARE_ORACLE=${deployed.flareOracle}`);
    console.log(`REPUTATION_MANAGER=${deployed.reputationManager}`);
    console.log(`EXECUTION_VAULT=${deployed.executionVault}`);
    console.log(`UTILIZATION_CONTROLLER=${deployed.utilizationController}`);
    console.log(`CIRCUIT_BREAKER=${deployed.circuitBreaker}`);
    console.log(`EXPOSURE_MANAGER=${deployed.exposureManager}`);
    console.log(`INSURANCE_FUND=${deployed.insuranceFund}`);
    console.log(`POSITION_MANAGER=${deployed.positionManager}`);
    console.log(`EXECUTION_RIGHTS_NFT=${deployed.executionRightsNFT}`);
    console.log(`EXECUTION_CONTROLLER=${deployed.executionController}`);
    console.log(`SETTLEMENT_ENGINE=${deployed.settlementEngine}`);
    console.log(`PRAXIS_GATEWAY=${deployed.praxisGateway}`);
    console.log("```");

    console.log("\nNext Steps:");
    console.log("  1. Register adapters on ExecutionVault");
    console.log("  2. Configure token feeds on FlareOracle");
    console.log("  3. Verify contracts on Flarescan");
    console.log("  4. Test E2E flow via PraxisGateway");
    console.log("  5. Transfer ownership to multisig");

    return deployed;
}

main()
    .then((contracts) => {
        console.log("\n[SUCCESS] Full deployment completed!");
        process.exit(0);
    })
    .catch((error) => {
        console.error("\n[ERROR] Deployment failed:", error);
        process.exit(1);
    });

export { main, DeployedContracts };
