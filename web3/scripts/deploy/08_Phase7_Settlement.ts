import { ethers } from "hardhat";

/**
 * Phase 7 Deployment Script
 * Deploys the Settlement Engine and Gateway contracts:
 * 1. SettlementEngine - PnL calculation, position unwinding, fee distribution
 * 2. PraxisGateway - Unified entry point for all LP/executor interactions
 *
 * Prerequisites:
 * - Phase 6 contracts must be deployed first
 * - Set environment variables with Phase 6 contract addresses
 */

interface Phase6Contracts {
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

interface Phase7Contracts {
    settlementEngine: string;
    praxisGateway: string;
}

interface AllContracts extends Phase6Contracts, Phase7Contracts {
    flareOracle: string;
}

// Environment variables for Phase 6 addresses (set these before running)
const getPhase6Addresses = (): Phase6Contracts => {
    return {
        reputationManager: process.env.REPUTATION_MANAGER || "",
        executionVault: process.env.EXECUTION_VAULT || "",
        utilizationController: process.env.UTILIZATION_CONTROLLER || "",
        circuitBreaker: process.env.CIRCUIT_BREAKER || "",
        exposureManager: process.env.EXPOSURE_MANAGER || "",
        insuranceFund: process.env.INSURANCE_FUND || "",
        positionManager: process.env.POSITION_MANAGER || "",
        executionRightsNFT: process.env.EXECUTION_RIGHTS_NFT || "",
        executionController: process.env.EXECUTION_CONTROLLER || "",
    };
};

// Oracle address from Phase 1
const FLARE_ORACLE = process.env.FLARE_ORACLE || "0x0979854b028210Cf492a3bCB990B6a1D45d89eCc";

// Adapter addresses (Flare mainnet)
const ADAPTERS = {
    // DEX Adapters
    sparkDEXAdapter: process.env.SPARKDEX_ADAPTER || "",
    blazeSwapAdapter: process.env.BLAZESWAP_ADAPTER || "",
    enosysAdapter: process.env.ENOSYS_ADAPTER || "",
    // Yield Adapters
    kineticAdapter: process.env.KINETIC_ADAPTER || "",
    sceptreAdapter: process.env.SCEPTRE_ADAPTER || "",
    // Perpetual Adapters
    sparkDEXEternalAdapter: process.env.SPARKDEX_ETERNAL_ADAPTER || "",
    // FAssets Adapter
    fAssetsAdapter: process.env.FASSETS_ADAPTER || "",
};

// Adapter type enum (matches SettlementEngine.AdapterType)
enum AdapterType {
    NONE = 0,
    DEX = 1,
    YIELD = 2,
    PERPETUAL = 3,
}

async function main(): Promise<AllContracts> {
    const [deployer] = await ethers.getSigners();
    const balance = await ethers.provider.getBalance(deployer.address);

    console.log("=".repeat(70));
    console.log("PRAXIS Phase 7 Deployment - Settlement Engine & Gateway");
    console.log("=".repeat(70));
    console.log(`Deployer: ${deployer.address}`);
    console.log(`Balance: ${ethers.formatEther(balance)} FLR`);
    console.log("");

    // Get Phase 6 addresses
    const phase6 = getPhase6Addresses();

    // Validate required addresses
    console.log("Validating Phase 6 contract addresses...");
    const requiredAddresses: [string, string][] = [
        ["ExecutionVault", phase6.executionVault],
        ["ExecutionRightsNFT", phase6.executionRightsNFT],
        ["PositionManager", phase6.positionManager],
        ["ReputationManager", phase6.reputationManager],
        ["CircuitBreaker", phase6.circuitBreaker],
        ["InsuranceFund", phase6.insuranceFund],
        ["ExecutionController", phase6.executionController],
    ];

    let hasAllAddresses = true;
    for (const [name, address] of requiredAddresses) {
        if (!address || address === "") {
            console.log(`   [MISSING] ${name}`);
            hasAllAddresses = false;
        } else {
            console.log(`   [OK] ${name}: ${address}`);
        }
    }

    if (!hasAllAddresses) {
        console.log("\n[ERROR] Missing Phase 6 contract addresses!");
        console.log("Set the following environment variables:");
        console.log("  - EXECUTION_VAULT");
        console.log("  - EXECUTION_RIGHTS_NFT");
        console.log("  - POSITION_MANAGER");
        console.log("  - REPUTATION_MANAGER");
        console.log("  - CIRCUIT_BREAKER");
        console.log("  - INSURANCE_FUND");
        console.log("  - EXECUTION_CONTROLLER");
        console.log("\nOr import from Phase 6 deployment output.");
        process.exit(1);
    }

    console.log(`   [OK] FlareOracle: ${FLARE_ORACLE}`);
    console.log("");

    const deployed: Phase7Contracts = {
        settlementEngine: "",
        praxisGateway: "",
    };

    // ==========================================================
    // 1. Deploy SettlementEngine
    // ==========================================================
    console.log("1. Deploying SettlementEngine...");
    const SettlementEngine = await ethers.getContractFactory("SettlementEngine");
    const settlementEngine = await SettlementEngine.deploy(
        phase6.executionRightsNFT,     // _ertNFT
        phase6.executionVault,          // _vault
        phase6.positionManager,         // _positionManager
        phase6.reputationManager,       // _reputationManager
        phase6.circuitBreaker,          // _circuitBreaker
        phase6.insuranceFund,           // _insuranceFund
        FLARE_ORACLE                    // _flareOracle
    );
    await settlementEngine.waitForDeployment();
    deployed.settlementEngine = await settlementEngine.getAddress();
    console.log(`   SettlementEngine deployed to: ${deployed.settlementEngine}`);

    // ==========================================================
    // 2. Deploy PraxisGateway
    // ==========================================================
    console.log("\n2. Deploying PraxisGateway...");
    const PraxisGateway = await ethers.getContractFactory("PraxisGateway");
    const praxisGateway = await PraxisGateway.deploy(
        phase6.executionVault,          // _vault
        phase6.executionRightsNFT,      // _ertNFT
        deployed.settlementEngine,       // _settlementEngine
        phase6.executionController,     // _executionController
        phase6.reputationManager,       // _reputationManager
        phase6.positionManager          // _positionManager
    );
    await praxisGateway.waitForDeployment();
    deployed.praxisGateway = await praxisGateway.getAddress();
    console.log(`   PraxisGateway deployed to: ${deployed.praxisGateway}`);

    // ==========================================================
    // 3. Wire up contracts
    // ==========================================================
    console.log("\n3. Wiring up contracts...");

    // 3.1 Set SettlementEngine on ExecutionVault
    console.log("   - Setting SettlementEngine on ExecutionVault...");
    const executionVault = await ethers.getContractAt("ExecutionVault", phase6.executionVault);
    await executionVault.setSettlementEngine(deployed.settlementEngine);

    // 3.2 Set SettlementEngine on ExecutionRightsNFT
    console.log("   - Setting SettlementEngine on ExecutionRightsNFT...");
    const executionRightsNFT = await ethers.getContractAt("ExecutionRightsNFT", phase6.executionRightsNFT);
    await executionRightsNFT.setSettlementEngine(deployed.settlementEngine);

    // 3.3 Set Gateway on SettlementEngine
    console.log("   - Setting Gateway on SettlementEngine...");
    await settlementEngine.setGateway(deployed.praxisGateway);

    // ==========================================================
    // 4. Configure adapter types on SettlementEngine
    // ==========================================================
    console.log("\n4. Configuring adapter types on SettlementEngine...");

    const adapterConfigs: { name: string; address: string; type: AdapterType }[] = [];

    // DEX Adapters
    if (ADAPTERS.sparkDEXAdapter) {
        adapterConfigs.push({
            name: "SparkDEXAdapter",
            address: ADAPTERS.sparkDEXAdapter,
            type: AdapterType.DEX,
        });
    }
    if (ADAPTERS.blazeSwapAdapter) {
        adapterConfigs.push({
            name: "BlazeSwapAdapter",
            address: ADAPTERS.blazeSwapAdapter,
            type: AdapterType.DEX,
        });
    }
    if (ADAPTERS.enosysAdapter) {
        adapterConfigs.push({
            name: "EnosysAdapter",
            address: ADAPTERS.enosysAdapter,
            type: AdapterType.DEX,
        });
    }

    // Yield Adapters
    if (ADAPTERS.kineticAdapter) {
        adapterConfigs.push({
            name: "KineticAdapter",
            address: ADAPTERS.kineticAdapter,
            type: AdapterType.YIELD,
        });
    }
    if (ADAPTERS.sceptreAdapter) {
        adapterConfigs.push({
            name: "SceptreAdapter",
            address: ADAPTERS.sceptreAdapter,
            type: AdapterType.YIELD,
        });
    }

    // Perpetual Adapters
    if (ADAPTERS.sparkDEXEternalAdapter) {
        adapterConfigs.push({
            name: "SparkDEXEternalAdapter",
            address: ADAPTERS.sparkDEXEternalAdapter,
            type: AdapterType.PERPETUAL,
        });
    }

    // FAssets Adapter (treated as DEX for swap-like operations)
    if (ADAPTERS.fAssetsAdapter) {
        adapterConfigs.push({
            name: "FAssetsAdapter",
            address: ADAPTERS.fAssetsAdapter,
            type: AdapterType.DEX,
        });
    }

    if (adapterConfigs.length > 0) {
        const adapters = adapterConfigs.map((c) => c.address);
        const types = adapterConfigs.map((c) => c.type);

        console.log("   Setting adapter types:");
        for (const config of adapterConfigs) {
            const typeNames = ["NONE", "DEX", "YIELD", "PERPETUAL"];
            console.log(`     - ${config.name}: ${typeNames[config.type]}`);
        }

        await settlementEngine.setAdapterTypes(adapters, types);
        console.log("   Adapter types configured successfully");
    } else {
        console.log("   [SKIP] No adapter addresses provided - configure manually later");
    }

    // ==========================================================
    // 5. Summary
    // ==========================================================
    console.log("\n" + "=".repeat(70));
    console.log("Phase 7 Deployment Complete!");
    console.log("=".repeat(70));

    console.log("\nDeployed Contracts:");
    console.log(`  SettlementEngine: ${deployed.settlementEngine}`);
    console.log(`  PraxisGateway:    ${deployed.praxisGateway}`);

    console.log("\nWiring Completed:");
    console.log("  - ExecutionVault -> SettlementEngine");
    console.log("  - ExecutionRightsNFT -> SettlementEngine");
    console.log("  - SettlementEngine -> Gateway");

    console.log("\nFull Protocol Addresses:");
    console.log("  Phase 1:");
    console.log(`    FlareOracle:          ${FLARE_ORACLE}`);
    console.log("  Phase 6:");
    console.log(`    ReputationManager:    ${phase6.reputationManager}`);
    console.log(`    ExecutionVault:       ${phase6.executionVault}`);
    console.log(`    UtilizationController: ${phase6.utilizationController}`);
    console.log(`    CircuitBreaker:       ${phase6.circuitBreaker}`);
    console.log(`    ExposureManager:      ${phase6.exposureManager}`);
    console.log(`    InsuranceFund:        ${phase6.insuranceFund}`);
    console.log(`    PositionManager:      ${phase6.positionManager}`);
    console.log(`    ExecutionRightsNFT:   ${phase6.executionRightsNFT}`);
    console.log(`    ExecutionController:  ${phase6.executionController}`);
    console.log("  Phase 7:");
    console.log(`    SettlementEngine:     ${deployed.settlementEngine}`);
    console.log(`    PraxisGateway:        ${deployed.praxisGateway}`);

    console.log("\nNext Steps:");
    console.log("  1. Verify contracts on Flarescan");
    console.log("  2. Configure adapter types if not set above");
    console.log("  3. Test end-to-end flow via PraxisGateway");
    console.log("  4. Transfer ownership to multisig (Phase 8)");
    console.log("  5. Run security audit (Phase 8)");

    // Export environment variables for convenience
    console.log("\n[ENV] Export these for future scripts:");
    console.log(`export SETTLEMENT_ENGINE=${deployed.settlementEngine}`);
    console.log(`export PRAXIS_GATEWAY=${deployed.praxisGateway}`);

    return {
        ...phase6,
        ...deployed,
        flareOracle: FLARE_ORACLE,
    };
}

// Standalone verification function
async function verifyContracts(contracts: Phase7Contracts, phase6: Phase6Contracts) {
    console.log("\nVerifying contracts on explorer...");

    // SettlementEngine
    try {
        await (globalThis as any).hre.run("verify:verify", {
            address: contracts.settlementEngine,
            constructorArguments: [
                phase6.executionRightsNFT,
                phase6.executionVault,
                phase6.positionManager,
                phase6.reputationManager,
                phase6.circuitBreaker,
                phase6.insuranceFund,
                FLARE_ORACLE,
            ],
        });
        console.log("  SettlementEngine verified");
    } catch (e: any) {
        console.log(`  SettlementEngine verification failed: ${e.message}`);
    }

    // PraxisGateway
    try {
        await (globalThis as any).hre.run("verify:verify", {
            address: contracts.praxisGateway,
            constructorArguments: [
                phase6.executionVault,
                phase6.executionRightsNFT,
                contracts.settlementEngine,
                phase6.executionController,
                phase6.reputationManager,
                phase6.positionManager,
            ],
        });
        console.log("  PraxisGateway verified");
    } catch (e: any) {
        console.log(`  PraxisGateway verification failed: ${e.message}`);
    }
}

main()
    .then((contracts) => {
        console.log("\nDeployment successful!");
        process.exit(0);
    })
    .catch((error) => {
        console.error("\nDeployment failed:", error);
        process.exit(1);
    });

export { main, Phase6Contracts, Phase7Contracts, AllContracts, verifyContracts };
