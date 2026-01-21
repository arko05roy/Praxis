import { network } from "hardhat";
const { ethers } = await network.connect();

/**
 * PRAXIS Mega Fork Deployment Script
 *
 * Deploys the COMPLETE PRAXIS protocol to a Flare mainnet fork including:
 * - Mock Oracle (for testing)
 * - All DEX Adapters
 * - All Yield Adapters
 * - All Perpetual Adapters
 * - Complete Execution Rights System
 * - Settlement Engine & Gateway
 *
 * Usage:
 *   # Start Anvil fork first:
 *   anvil --fork-url https://flare-api.flare.network/ext/C/rpc --port 8546 --chain-id 14
 *
 *   # Then run this script:
 *   npx hardhat run scripts/deploy/mega-fork-deploy.ts --network anvilFork
 */

// =============================================================================
//                            EXTERNAL ADDRESSES
// =============================================================================

const EXTERNAL = {
  // Tokens
  USDC: "0xFbDa5F676cB37624f28265A144A48B0d6e87d3b6",
  USDT: "0x0B38e83B86d491735fEaa0a791F65c2B99535396",
  WFLR: "0x1D80c49BbBCd1C0911346656B529DF9E5c2F783d",
  WETH: "0x1502FA4be69d526124D453619276FacCab275d3D",
  sFLR: "0x12e605bc104e93B45e1aD99F9e555f659051c2BB",
  FXRP: "0xad552a648c74d49e10027ab8a618a3ad4901c5be",

  // SparkDEX V3 (Spot)
  SPARKDEX: {
    router: "0x8a1E35F5c98C4E85B36B7B253222eE17773b2781",
    quoter: "0x2DcABbB3a5Fe9DBb1F43edf48449aA7254Ef3a80",
    factory: "0x8A2578d23d4C532cC9A98FaD91C0523f5efDE652",
  },

  // SparkDEX Eternal (Perpetuals)
  SPARKDEX_ETERNAL: {
    orderBook: "0xf76DC0d42A40E53021162521E5ac916AAe2500B9",
    store: "0x74DA11B3Bb05277CF1cd3572a74d626949183e58",
    positionManager: "0x0d59962e4fC41a09B73283d1a0bf305dB1237c48",
    fundingTracker: "0x96Adda2A49E910d8A1def86D45dAD59F80E7A9C6",
  },

  // BlazeSwap V2
  BLAZESWAP: {
    router: "0xe3A1b355ca63abCBC9589334B5e609583C7BAa06",
    factory: "0x3ad13e1bDD283e4F8d8196b002b80D1BADF39884",
  },

  // Sceptre Liquid Staking
  SCEPTRE: {
    sFLR: "0x12e605bc104e93B45e1aD99F9e555f659051c2BB",
  },

  // Kinetic Lending
  KINETIC: {
    comptroller: "0x8041680Fb73E1Fe5F851e76233DCDfA0f2D2D7c8",
  },

  // FTSO v2
  FTSO: {
    ftsoV2: "0x3d893C53D9e8056135C26C8c638B76C8b60Df726",
  },
};

// =============================================================================
//                            DEPLOYED ADDRESSES
// =============================================================================

interface DeployedAddresses {
  // Mock Tokens (for demo)
  mockUsdc: string;

  // Oracle
  mockFlareOracle: string;

  // DEX
  swapRouter: string;
  sparkDEXAdapter: string;
  blazeSwapAdapter: string;

  // Yield
  yieldRouter: string;
  sceptreAdapter: string;
  kineticAdapter: string;

  // Perpetuals
  perpetualRouter: string;
  sparkDEXEternalAdapter: string;

  // Core Protocol
  reputationManager: string;
  executionVault: string;
  utilizationController: string;
  circuitBreaker: string;
  exposureManager: string;
  insuranceFund: string;
  positionManager: string;
  executionRightsNFT: string;
  executionController: string;
  settlementEngine: string;
  praxisGateway: string;
}

// =============================================================================
//                            HELPER FUNCTIONS
// =============================================================================

function logPhase(phase: string, title: string) {
  console.log("\n" + "═".repeat(70));
  console.log(`${phase}: ${title}`);
  console.log("═".repeat(70));
}

function logStep(step: string) {
  console.log(`\n→ ${step}`);
}

function logSuccess(message: string) {
  console.log(`  ✓ ${message}`);
}

// =============================================================================
//                               MAIN DEPLOY
// =============================================================================

async function main(): Promise<DeployedAddresses> {
  const [deployer] = await ethers.getSigners();
  const balance = await ethers.provider.getBalance(deployer.address);

  console.log("╔════════════════════════════════════════════════════════════════╗");
  console.log("║         PRAXIS MEGA FORK DEPLOYMENT                            ║");
  console.log("╚════════════════════════════════════════════════════════════════╝");
  console.log(`Deployer: ${deployer.address}`);
  console.log(`Balance:  ${ethers.formatEther(balance)} FLR`);
  console.log(`Network:  ${network.name}`);
  console.log("");

  const deployed: DeployedAddresses = {
    mockUsdc: "",
    mockFlareOracle: "",
    swapRouter: "",
    sparkDEXAdapter: "",
    blazeSwapAdapter: "",
    yieldRouter: "",
    sceptreAdapter: "",
    kineticAdapter: "",
    perpetualRouter: "",
    sparkDEXEternalAdapter: "",
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

  // =========================================================================
  //                         PHASE 1: MOCK ORACLE
  // =========================================================================
  logPhase("PHASE 1", "Mock Oracle Deployment");

  // Deploy MockUSDC for demo (mintable ERC20)
  logStep("Deploying MockUSDC (demo token)...");
  const MockERC20 = await ethers.getContractFactory("MockERC20");
  const mockUsdc = await MockERC20.deploy("Mock USDC", "mUSDC", 6);
  await mockUsdc.waitForDeployment();
  deployed.mockUsdc = await mockUsdc.getAddress();
  logSuccess(`MockUSDC: ${deployed.mockUsdc}`);

  logStep("Deploying MockFlareOracle...");
  const MockFlareOracle = await ethers.getContractFactory("MockFlareOracle");
  const mockOracle = await MockFlareOracle.deploy();
  await mockOracle.waitForDeployment();
  deployed.mockFlareOracle = await mockOracle.getAddress();
  logSuccess(`MockFlareOracle: ${deployed.mockFlareOracle}`);

  // Set initial prices
  logStep("Setting initial token prices...");
  const tokens = [
    { addr: deployed.mockUsdc, price: ethers.parseEther("1"), name: "MockUSDC" },
    { addr: EXTERNAL.USDT, price: ethers.parseEther("1"), name: "USDT" },
    { addr: EXTERNAL.WFLR, price: ethers.parseEther("0.015"), name: "WFLR" },
    { addr: EXTERNAL.WETH, price: ethers.parseEther("3500"), name: "WETH" },
    { addr: EXTERNAL.sFLR, price: ethers.parseEther("0.016"), name: "sFLR" },
    { addr: EXTERNAL.FXRP, price: ethers.parseEther("0.50"), name: "FXRP" },
    { addr: ethers.ZeroAddress, price: ethers.parseEther("0.015"), name: "FLR (native)" },
  ];

  for (const token of tokens) {
    await mockOracle.setTokenPrice(token.addr, token.price);
    logSuccess(`${token.name}: $${ethers.formatEther(token.price)}`);
  }

  // =========================================================================
  //                         PHASE 2: DEX ADAPTERS
  // =========================================================================
  logPhase("PHASE 2", "DEX Adapters Deployment");

  // SwapRouter
  logStep("Deploying SwapRouter...");
  const SwapRouter = await ethers.getContractFactory("SwapRouter");
  const swapRouter = await SwapRouter.deploy();
  await swapRouter.waitForDeployment();
  deployed.swapRouter = await swapRouter.getAddress();
  logSuccess(`SwapRouter: ${deployed.swapRouter}`);

  // SparkDEXAdapter
  logStep("Deploying SparkDEXAdapter...");
  const SparkDEXAdapter = await ethers.getContractFactory("SparkDEXAdapter");
  const sparkDEXAdapter = await SparkDEXAdapter.deploy(
    EXTERNAL.SPARKDEX.router,
    EXTERNAL.SPARKDEX.quoter,
    EXTERNAL.SPARKDEX.factory
  );
  await sparkDEXAdapter.waitForDeployment();
  deployed.sparkDEXAdapter = await sparkDEXAdapter.getAddress();
  logSuccess(`SparkDEXAdapter: ${deployed.sparkDEXAdapter}`);

  // BlazeSwapAdapter
  logStep("Deploying BlazeSwapAdapter...");
  const BlazeSwapAdapter = await ethers.getContractFactory("BlazeSwapAdapter");
  const blazeSwapAdapter = await BlazeSwapAdapter.deploy(
    EXTERNAL.BLAZESWAP.router,
    EXTERNAL.BLAZESWAP.factory,
    EXTERNAL.WFLR
  );
  await blazeSwapAdapter.waitForDeployment();
  deployed.blazeSwapAdapter = await blazeSwapAdapter.getAddress();
  logSuccess(`BlazeSwapAdapter: ${deployed.blazeSwapAdapter}`);

  // Register DEX adapters
  logStep("Registering DEX adapters with SwapRouter...");
  await swapRouter.addAdapter(deployed.sparkDEXAdapter);
  await swapRouter.addAdapter(deployed.blazeSwapAdapter);
  logSuccess("Adapters registered");

  // =========================================================================
  //                         PHASE 3: YIELD ADAPTERS
  // =========================================================================
  logPhase("PHASE 3", "Yield Adapters Deployment");

  // YieldRouter
  logStep("Deploying YieldRouter...");
  const YieldRouter = await ethers.getContractFactory("YieldRouter");
  const yieldRouter = await YieldRouter.deploy();
  await yieldRouter.waitForDeployment();
  deployed.yieldRouter = await yieldRouter.getAddress();
  logSuccess(`YieldRouter: ${deployed.yieldRouter}`);

  // SceptreAdapter
  logStep("Deploying SceptreAdapter...");
  const SceptreAdapter = await ethers.getContractFactory("SceptreAdapter");
  const sceptreAdapter = await SceptreAdapter.deploy(EXTERNAL.SCEPTRE.sFLR, EXTERNAL.WFLR);
  await sceptreAdapter.waitForDeployment();
  deployed.sceptreAdapter = await sceptreAdapter.getAddress();
  logSuccess(`SceptreAdapter: ${deployed.sceptreAdapter}`);

  // KineticAdapter
  logStep("Deploying KineticAdapter...");
  const KineticAdapter = await ethers.getContractFactory("KineticAdapter");
  const kineticAdapter = await KineticAdapter.deploy(EXTERNAL.KINETIC.comptroller);
  await kineticAdapter.waitForDeployment();
  deployed.kineticAdapter = await kineticAdapter.getAddress();
  logSuccess(`KineticAdapter: ${deployed.kineticAdapter}`);

  // Initialize Kinetic markets
  logStep("Initializing Kinetic markets...");
  await kineticAdapter.initializeMarkets();
  const markets = await kineticAdapter.getSupportedMarkets();
  logSuccess(`Found ${markets.length} Kinetic markets`);

  // Register yield adapters
  logStep("Registering yield adapters...");
  await yieldRouter.addStakingAdapter(deployed.sceptreAdapter);
  await yieldRouter.addLendingAdapter(deployed.kineticAdapter);
  logSuccess("Yield adapters registered");

  // =========================================================================
  //                       PHASE 4: PERPETUAL ADAPTERS
  // =========================================================================
  logPhase("PHASE 4", "Perpetual Adapters Deployment");

  // PerpetualRouter
  logStep("Deploying PerpetualRouter...");
  const PerpetualRouter = await ethers.getContractFactory("PerpetualRouter");
  const perpetualRouter = await PerpetualRouter.deploy();
  await perpetualRouter.waitForDeployment();
  deployed.perpetualRouter = await perpetualRouter.getAddress();
  logSuccess(`PerpetualRouter: ${deployed.perpetualRouter}`);

  // SparkDEXEternalAdapter
  // Constructor requires: address[5] addresses_, address primaryCollateral_
  // addresses_[0] = orderBook, [1] = store, [2] = positionManager, [3] = fundingTracker, [4] = tradingValidator
  logStep("Deploying SparkDEXEternalAdapter...");
  const SparkDEXEternalAdapter = await ethers.getContractFactory("SparkDEXEternalAdapter");
  const perpetualAddresses: [string, string, string, string, string] = [
    EXTERNAL.SPARKDEX_ETERNAL.orderBook,
    EXTERNAL.SPARKDEX_ETERNAL.store,
    EXTERNAL.SPARKDEX_ETERNAL.positionManager,
    EXTERNAL.SPARKDEX_ETERNAL.fundingTracker,
    "0x7c6F8Db7C4Cb32F9540478264b15637933E443A4", // tradingValidator
  ];
  const sparkDEXEternalAdapter = await SparkDEXEternalAdapter.deploy(
    perpetualAddresses,
    EXTERNAL.WFLR // primaryCollateral
  );
  await sparkDEXEternalAdapter.waitForDeployment();
  deployed.sparkDEXEternalAdapter = await sparkDEXEternalAdapter.getAddress();
  logSuccess(`SparkDEXEternalAdapter: ${deployed.sparkDEXEternalAdapter}`);

  // Register perpetual adapter
  logStep("Registering perpetual adapter...");
  await perpetualRouter.addAdapter(deployed.sparkDEXEternalAdapter);
  logSuccess("Perpetual adapter registered");

  // =========================================================================
  //                    PHASE 5: EXECUTION RIGHTS SYSTEM
  // =========================================================================
  logPhase("PHASE 5", "Execution Rights System");

  // ReputationManager
  logStep("Deploying ReputationManager...");
  const ReputationManager = await ethers.getContractFactory("ReputationManager");
  const reputationManager = await ReputationManager.deploy();
  await reputationManager.waitForDeployment();
  deployed.reputationManager = await reputationManager.getAddress();
  logSuccess(`ReputationManager: ${deployed.reputationManager}`);

  // ExecutionVault (uses MockUSDC for demo)
  logStep("Deploying ExecutionVault...");
  const ExecutionVault = await ethers.getContractFactory("ExecutionVault");
  const executionVault = await ExecutionVault.deploy(
    deployed.mockUsdc, // Use MockUSDC so we can mint for demo
    "PRAXIS Vault Shares",
    "pxUSDC"
  );
  await executionVault.waitForDeployment();
  deployed.executionVault = await executionVault.getAddress();
  logSuccess(`ExecutionVault: ${deployed.executionVault}`);

  // UtilizationController
  logStep("Deploying UtilizationController...");
  const UtilizationController = await ethers.getContractFactory("UtilizationController");
  const utilizationController = await UtilizationController.deploy(deployed.executionVault);
  await utilizationController.waitForDeployment();
  deployed.utilizationController = await utilizationController.getAddress();
  logSuccess(`UtilizationController: ${deployed.utilizationController}`);

  // CircuitBreaker
  logStep("Deploying CircuitBreaker...");
  const CircuitBreaker = await ethers.getContractFactory("CircuitBreaker");
  const circuitBreaker = await CircuitBreaker.deploy(deployed.executionVault, 0);
  await circuitBreaker.waitForDeployment();
  deployed.circuitBreaker = await circuitBreaker.getAddress();
  logSuccess(`CircuitBreaker: ${deployed.circuitBreaker}`);

  // ExposureManager
  logStep("Deploying ExposureManager...");
  const ExposureManager = await ethers.getContractFactory("ExposureManager");
  const exposureManager = await ExposureManager.deploy(deployed.executionVault);
  await exposureManager.waitForDeployment();
  deployed.exposureManager = await exposureManager.getAddress();
  logSuccess(`ExposureManager: ${deployed.exposureManager}`);

  // InsuranceFund
  logStep("Deploying InsuranceFund...");
  const InsuranceFund = await ethers.getContractFactory("InsuranceFund");
  const insuranceFund = await InsuranceFund.deploy(deployed.executionVault, deployed.mockUsdc);
  await insuranceFund.waitForDeployment();
  deployed.insuranceFund = await insuranceFund.getAddress();
  logSuccess(`InsuranceFund: ${deployed.insuranceFund}`);

  // PositionManager
  logStep("Deploying PositionManager...");
  const PositionManager = await ethers.getContractFactory("PositionManager");
  const positionManager = await PositionManager.deploy(deployed.mockFlareOracle);
  await positionManager.waitForDeployment();
  deployed.positionManager = await positionManager.getAddress();
  logSuccess(`PositionManager: ${deployed.positionManager}`);

  // ExecutionRightsNFT
  logStep("Deploying ExecutionRightsNFT...");
  const ExecutionRightsNFT = await ethers.getContractFactory("ExecutionRightsNFT");
  const executionRightsNFT = await ExecutionRightsNFT.deploy(
    deployed.reputationManager,
    deployed.executionVault
  );
  await executionRightsNFT.waitForDeployment();
  deployed.executionRightsNFT = await executionRightsNFT.getAddress();
  logSuccess(`ExecutionRightsNFT: ${deployed.executionRightsNFT}`);

  // ExecutionController
  logStep("Deploying ExecutionController...");
  const ExecutionController = await ethers.getContractFactory("ExecutionController");
  const executionController = await ExecutionController.deploy(
    deployed.executionRightsNFT,
    deployed.executionVault,
    deployed.positionManager,
    deployed.exposureManager,
    deployed.mockFlareOracle
  );
  await executionController.waitForDeployment();
  deployed.executionController = await executionController.getAddress();
  logSuccess(`ExecutionController: ${deployed.executionController}`);

  // =========================================================================
  //                    PHASE 6: SETTLEMENT & GATEWAY
  // =========================================================================
  logPhase("PHASE 6", "Settlement & Gateway");

  // SettlementEngine
  logStep("Deploying SettlementEngine...");
  const SettlementEngine = await ethers.getContractFactory("SettlementEngine");
  const settlementEngine = await SettlementEngine.deploy(
    deployed.executionRightsNFT,
    deployed.executionVault,
    deployed.positionManager,
    deployed.reputationManager,
    deployed.circuitBreaker,
    deployed.insuranceFund,
    deployed.mockFlareOracle
  );
  await settlementEngine.waitForDeployment();
  deployed.settlementEngine = await settlementEngine.getAddress();
  logSuccess(`SettlementEngine: ${deployed.settlementEngine}`);

  // PraxisGateway
  logStep("Deploying PraxisGateway...");
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
  logSuccess(`PraxisGateway: ${deployed.praxisGateway}`);

  // =========================================================================
  //                         PHASE 7: WIRING
  // =========================================================================
  logPhase("PHASE 7", "Wiring Components");

  logStep("Wiring ExecutionVault...");
  await executionVault.setExecutionController(deployed.executionController);
  await executionVault.setUtilizationController(deployed.utilizationController);
  await executionVault.setCircuitBreaker(deployed.circuitBreaker);
  await executionVault.setSettlementEngine(deployed.settlementEngine);
  logSuccess("ExecutionVault wired");

  logStep("Wiring ExecutionRightsNFT...");
  await executionRightsNFT.setExecutionController(deployed.executionController);
  await executionRightsNFT.setCircuitBreaker(deployed.circuitBreaker);
  await executionRightsNFT.setSettlementEngine(deployed.settlementEngine);
  logSuccess("ExecutionRightsNFT wired");

  logStep("Wiring PositionManager...");
  await positionManager.setExecutionController(deployed.executionController);
  logSuccess("PositionManager wired");

  logStep("Wiring ExposureManager...");
  await exposureManager.setExecutionController(deployed.executionController);
  logSuccess("ExposureManager wired");

  logStep("Wiring ExecutionController...");
  await executionController.setCircuitBreaker(deployed.circuitBreaker);
  logSuccess("ExecutionController wired");

  logStep("Wiring SettlementEngine...");
  await settlementEngine.setGateway(deployed.praxisGateway);
  logSuccess("SettlementEngine wired");

  // =========================================================================
  //                    PHASE 8: ADAPTER TYPE CONFIG
  // =========================================================================
  logPhase("PHASE 8", "Adapter Type Configuration");

  logStep("Configuring adapter types on SettlementEngine...");
  const AdapterType = { NONE: 0, DEX: 1, YIELD: 2, PERPETUAL: 3 };

  await settlementEngine.setAdapterTypes(
    [
      deployed.sparkDEXAdapter,
      deployed.blazeSwapAdapter,
      deployed.sceptreAdapter,
      deployed.kineticAdapter,
      deployed.sparkDEXEternalAdapter,
    ],
    [
      AdapterType.DEX,
      AdapterType.DEX,
      AdapterType.YIELD,
      AdapterType.YIELD,
      AdapterType.PERPETUAL,
    ]
  );
  logSuccess("Adapter types configured");

  // =========================================================================
  //                           SUMMARY
  // =========================================================================
  console.log("\n" + "═".repeat(70));
  console.log("╔════════════════════════════════════════════════════════════════╗");
  console.log("║              DEPLOYMENT COMPLETE                               ║");
  console.log("╚════════════════════════════════════════════════════════════════╝");
  console.log("═".repeat(70));

  console.log("\n📋 DEPLOYED CONTRACTS:\n");
  console.log("Oracle:");
  console.log(`  MockFlareOracle:        ${deployed.mockFlareOracle}`);

  console.log("\nDEX Layer:");
  console.log(`  SwapRouter:             ${deployed.swapRouter}`);
  console.log(`  SparkDEXAdapter:        ${deployed.sparkDEXAdapter}`);
  console.log(`  BlazeSwapAdapter:       ${deployed.blazeSwapAdapter}`);

  console.log("\nYield Layer:");
  console.log(`  YieldRouter:            ${deployed.yieldRouter}`);
  console.log(`  SceptreAdapter:         ${deployed.sceptreAdapter}`);
  console.log(`  KineticAdapter:         ${deployed.kineticAdapter}`);

  console.log("\nPerpetual Layer:");
  console.log(`  PerpetualRouter:        ${deployed.perpetualRouter}`);
  console.log(`  SparkDEXEternalAdapter: ${deployed.sparkDEXEternalAdapter}`);

  console.log("\nCore Protocol:");
  console.log(`  ReputationManager:      ${deployed.reputationManager}`);
  console.log(`  ExecutionVault:         ${deployed.executionVault}`);
  console.log(`  UtilizationController:  ${deployed.utilizationController}`);
  console.log(`  CircuitBreaker:         ${deployed.circuitBreaker}`);
  console.log(`  ExposureManager:        ${deployed.exposureManager}`);
  console.log(`  InsuranceFund:          ${deployed.insuranceFund}`);
  console.log(`  PositionManager:        ${deployed.positionManager}`);
  console.log(`  ExecutionRightsNFT:     ${deployed.executionRightsNFT}`);
  console.log(`  ExecutionController:    ${deployed.executionController}`);
  console.log(`  SettlementEngine:       ${deployed.settlementEngine}`);
  console.log(`  PraxisGateway:          ${deployed.praxisGateway}`);

  // Output JSON for easy parsing
  console.log("\n📄 JSON OUTPUT (copy to client/lib/contracts/addresses.ts):\n");
  console.log(JSON.stringify(deployed, null, 2));

  // Environment variables
  console.log("\n🔧 ENVIRONMENT VARIABLES:\n");
  console.log("```");
  Object.entries(deployed).forEach(([key, value]) => {
    const envKey = key.replace(/([A-Z])/g, "_$1").toUpperCase();
    console.log(`${envKey}=${value}`);
  });
  console.log("```");

  // Write addresses to file
  const fs = await import("fs");
  const path = await import("path");
  const { fileURLToPath } = await import("url");
  const __filename = fileURLToPath(import.meta.url);
  const __dirname = path.dirname(__filename);
  const outputPath = path.join(__dirname, "../../deployed-addresses.json");
  fs.writeFileSync(outputPath, JSON.stringify(deployed, null, 2));
  console.log(`\n📁 Addresses saved to: ${outputPath}`);

  return deployed;
}

// =============================================================================
//                               EXECUTE
// =============================================================================

// Only run main() if this script is executed directly (not imported)
const isMainModule = import.meta.url === `file://${process.argv[1]}` ||
                     process.argv[1]?.endsWith('mega-fork-deploy.ts');

if (isMainModule) {
  main()
    .then((addresses) => {
      console.log("\n✅ Mega deployment successful!");
      process.exit(0);
    })
    .catch((error) => {
      console.error("\n❌ Deployment failed:", error);
      process.exit(1);
    });
}

export { main, DeployedAddresses };
