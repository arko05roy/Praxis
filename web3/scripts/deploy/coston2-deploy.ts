import { ethers } from "hardhat";
import * as fs from "fs";
import * as path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

/**
 * PRAXIS Coston2 Testnet Deployment Script
 *
 * Deploys all contracts needed for demo:
 * 1. Uses existing FlareOracle (0x0979854b028210Cf492a3bCB990B6a1D45d89eCc)
 * 2. Uses existing FDCVerifier (0xe667bEf52f1EAD93Cb0375639a4eA36001d4edf3)
 * 3. Deploys Mock Tokens (MockUSDC, MockWFLR, MockFXRP, MockFBTC, MockFDOGE)
 * 4. Deploys Mock Protocols (MockSimpleDEX, MockSceptre, MockKinetic)
 * 5. Deploys Phase 6 contracts (Vault, ERT NFT, Controllers, etc.)
 * 6. Deploys Phase 7 contracts (SettlementEngine, PraxisGateway)
 * 7. Wires everything together
 */

// =============================================================
//                    EXISTING ADDRESSES
// =============================================================

// Flare infrastructure on Coston2 (already deployed)
const FLARE_ORACLE = "0x0979854b028210Cf492a3bCB990B6a1D45d89eCc";
const FDC_VERIFIER = "0xe667bEf52f1EAD93Cb0375639a4eA36001d4edf3";

// FTSO Feed IDs (real feeds on Coston2) - imported from helper
import { CRYPTO_FEEDS } from "../helpers/feedIds.js";

const FEED_IDS = {
  "FLR/USD": CRYPTO_FEEDS.FLR_USD as `0x${string}`,
  "BTC/USD": CRYPTO_FEEDS.BTC_USD as `0x${string}`,
  "ETH/USD": CRYPTO_FEEDS.ETH_USD as `0x${string}`,
  "XRP/USD": CRYPTO_FEEDS.XRP_USD as `0x${string}`,
  "DOGE/USD": CRYPTO_FEEDS.DOGE_USD as `0x${string}`,
  "USDC/USD": CRYPTO_FEEDS.USDC_USD as `0x${string}`,
};

// =============================================================
//                    INTERFACES
// =============================================================

interface DeployedAddresses {
  // Flare Infrastructure (existing)
  FlareOracle: string;
  FDCVerifier: string;

  // Mock Tokens
  MockUSDC: string;
  MockWFLR: string;
  MockFXRP: string;
  MockFBTC: string;
  MockFDOGE: string;
  MockSFLR: string;

  // Mock Protocols
  MockSimpleDEX: string;
  MockSceptre: string;
  MockKinetic: string;

  // Core Protocol (Phase 6)
  ReputationManager: string;
  ExecutionVault: string;
  UtilizationController: string;
  CircuitBreaker: string;
  ExposureManager: string;
  InsuranceFund: string;
  PositionManager: string;
  ExecutionRightsNFT: string;
  ExecutionController: string;

  // Settlement & Gateway (Phase 7)
  SettlementEngine: string;
  PraxisGateway: string;

  // Routers
  SwapRouter: string;

  // Asset token alias
  Asset: string;
}

// =============================================================
//                    MAIN DEPLOYMENT
// =============================================================

async function main(): Promise<DeployedAddresses> {
  const [deployer] = await ethers.getSigners();
  const balance = await ethers.provider.getBalance(deployer.address);

  console.log("=".repeat(70));
  console.log("PRAXIS Coston2 Testnet Deployment");
  console.log("=".repeat(70));
  console.log(`Deployer: ${deployer.address}`);
  console.log(`Balance: ${ethers.formatEther(balance)} C2FLR`);
  console.log(`Network: Coston2 (Chain ID: 114)`);
  console.log("");

  const addresses: DeployedAddresses = {
    FlareOracle: FLARE_ORACLE,
    FDCVerifier: FDC_VERIFIER,
    MockUSDC: "",
    MockWFLR: "",
    MockFXRP: "",
    MockFBTC: "",
    MockFDOGE: "",
    MockSFLR: "",
    MockSimpleDEX: "",
    MockSceptre: "",
    MockKinetic: "",
    ReputationManager: "",
    ExecutionVault: "",
    UtilizationController: "",
    CircuitBreaker: "",
    ExposureManager: "",
    InsuranceFund: "",
    PositionManager: "",
    ExecutionRightsNFT: "",
    ExecutionController: "",
    SettlementEngine: "",
    PraxisGateway: "",
    SwapRouter: "",
    Asset: "",
  };

  // ==========================================================
  // STEP 1: Deploy Mock Tokens
  // ==========================================================
  console.log("\n" + "=".repeat(50));
  console.log("Step 1: Deploying Mock Tokens");
  console.log("=".repeat(50));

  const MockERC20 = await ethers.getContractFactory("MockERC20");

  // MockUSDC (6 decimals)
  console.log("  Deploying MockUSDC...");
  const mockUSDC = await MockERC20.deploy("Mock USDC", "mUSDC", 6);
  await mockUSDC.waitForDeployment();
  addresses.MockUSDC = await mockUSDC.getAddress();
  addresses.Asset = addresses.MockUSDC;
  console.log(`    MockUSDC: ${addresses.MockUSDC}`);

  // MockWFLR (18 decimals)
  console.log("  Deploying MockWFLR...");
  const mockWFLR = await MockERC20.deploy("Mock Wrapped FLR", "mWFLR", 18);
  await mockWFLR.waitForDeployment();
  addresses.MockWFLR = await mockWFLR.getAddress();
  console.log(`    MockWFLR: ${addresses.MockWFLR}`);

  // Mock FAssets
  const MockFAsset = await ethers.getContractFactory("MockFAsset");

  // MockFXRP (6 decimals)
  console.log("  Deploying MockFXRP...");
  const mockFXRP = await MockFAsset.deploy(
    "Mock FAsset XRP",
    "mFXRP",
    6,
    FEED_IDS["XRP/USD"],
    "XRP"
  );
  await mockFXRP.waitForDeployment();
  addresses.MockFXRP = await mockFXRP.getAddress();
  console.log(`    MockFXRP: ${addresses.MockFXRP}`);

  // MockFBTC (8 decimals)
  console.log("  Deploying MockFBTC...");
  const mockFBTC = await MockFAsset.deploy(
    "Mock FAsset BTC",
    "mFBTC",
    8,
    FEED_IDS["BTC/USD"],
    "BTC"
  );
  await mockFBTC.waitForDeployment();
  addresses.MockFBTC = await mockFBTC.getAddress();
  console.log(`    MockFBTC: ${addresses.MockFBTC}`);

  // MockFDOGE (8 decimals)
  console.log("  Deploying MockFDOGE...");
  const mockFDOGE = await MockFAsset.deploy(
    "Mock FAsset DOGE",
    "mFDOGE",
    8,
    FEED_IDS["DOGE/USD"],
    "DOGE"
  );
  await mockFDOGE.waitForDeployment();
  addresses.MockFDOGE = await mockFDOGE.getAddress();
  console.log(`    MockFDOGE: ${addresses.MockFDOGE}`);

  // ==========================================================
  // STEP 2: Deploy Mock Protocols
  // ==========================================================
  console.log("\n" + "=".repeat(50));
  console.log("Step 2: Deploying Mock Protocols");
  console.log("=".repeat(50));

  // MockSimpleDEX
  console.log("  Deploying MockSimpleDEX...");
  const MockSimpleDEX = await ethers.getContractFactory("MockSimpleDEX");
  const mockDEX = await MockSimpleDEX.deploy();
  await mockDEX.waitForDeployment();
  addresses.MockSimpleDEX = await mockDEX.getAddress();
  console.log(`    MockSimpleDEX: ${addresses.MockSimpleDEX}`);

  // MockSceptre (liquid staking)
  console.log("  Deploying MockSceptre...");
  const MockSceptre = await ethers.getContractFactory("MockSceptre");
  const mockSceptre = await MockSceptre.deploy(
    addresses.MockWFLR,  // WFLR token
    ethers.parseEther("1.05")  // 1.05 exchange rate (5% yield)
  );
  await mockSceptre.waitForDeployment();
  addresses.MockSceptre = await mockSceptre.getAddress();
  addresses.MockSFLR = addresses.MockSceptre; // MockSceptre is also the msFLR token
  console.log(`    MockSceptre: ${addresses.MockSceptre}`);

  // MockKinetic (lending)
  console.log("  Deploying MockKinetic...");
  const MockKinetic = await ethers.getContractFactory("MockKinetic");
  const mockKinetic = await MockKinetic.deploy();
  await mockKinetic.waitForDeployment();
  addresses.MockKinetic = await mockKinetic.getAddress();
  console.log(`    MockKinetic: ${addresses.MockKinetic}`);

  // List USDC market on MockKinetic
  console.log("  Creating USDC market on MockKinetic...");
  await mockKinetic.listMarket(
    addresses.MockUSDC,
    "Kinetic mUSDC",
    "kmUSDC",
    ethers.parseEther("1"), // 1:1 initial exchange rate
    800 // 8% APY
  );

  // ==========================================================
  // STEP 3: Deploy SwapRouter with MockSimpleDEX
  // ==========================================================
  console.log("\n" + "=".repeat(50));
  console.log("Step 3: Deploying SwapRouter");
  console.log("=".repeat(50));

  console.log("  Deploying SwapRouter...");
  const SwapRouter = await ethers.getContractFactory("SwapRouter");
  const swapRouter = await SwapRouter.deploy();
  await swapRouter.waitForDeployment();
  addresses.SwapRouter = await swapRouter.getAddress();
  console.log(`    SwapRouter: ${addresses.SwapRouter}`);

  // Register MockSimpleDEX as adapter
  console.log("  Registering MockSimpleDEX adapter...");
  await swapRouter.addAdapter(addresses.MockSimpleDEX);

  // ==========================================================
  // STEP 4: Deploy Phase 6 Contracts
  // ==========================================================
  console.log("\n" + "=".repeat(50));
  console.log("Step 4: Deploying Phase 6 - Execution Rights System");
  console.log("=".repeat(50));

  // 4.1 ReputationManager
  console.log("  Deploying ReputationManager...");
  const ReputationManager = await ethers.getContractFactory("ReputationManager");
  const reputationManager = await ReputationManager.deploy();
  await reputationManager.waitForDeployment();
  addresses.ReputationManager = await reputationManager.getAddress();
  console.log(`    ReputationManager: ${addresses.ReputationManager}`);

  // 4.2 ExecutionVault
  console.log("  Deploying ExecutionVault...");
  const ExecutionVault = await ethers.getContractFactory("ExecutionVault");
  const executionVault = await ExecutionVault.deploy(
    addresses.MockUSDC,
    "PRAXIS Vault Shares",
    "pxUSDC"
  );
  await executionVault.waitForDeployment();
  addresses.ExecutionVault = await executionVault.getAddress();
  console.log(`    ExecutionVault: ${addresses.ExecutionVault}`);

  // 4.3 UtilizationController
  console.log("  Deploying UtilizationController...");
  const UtilizationController = await ethers.getContractFactory("UtilizationController");
  const utilizationController = await UtilizationController.deploy(addresses.ExecutionVault);
  await utilizationController.waitForDeployment();
  addresses.UtilizationController = await utilizationController.getAddress();
  console.log(`    UtilizationController: ${addresses.UtilizationController}`);

  // 4.4 CircuitBreaker
  console.log("  Deploying CircuitBreaker...");
  const CircuitBreaker = await ethers.getContractFactory("CircuitBreaker");
  const circuitBreaker = await CircuitBreaker.deploy(
    addresses.ExecutionVault,
    0 // Initial snapshot
  );
  await circuitBreaker.waitForDeployment();
  addresses.CircuitBreaker = await circuitBreaker.getAddress();
  console.log(`    CircuitBreaker: ${addresses.CircuitBreaker}`);

  // 4.5 ExposureManager
  console.log("  Deploying ExposureManager...");
  const ExposureManager = await ethers.getContractFactory("ExposureManager");
  const exposureManager = await ExposureManager.deploy(addresses.ExecutionVault);
  await exposureManager.waitForDeployment();
  addresses.ExposureManager = await exposureManager.getAddress();
  console.log(`    ExposureManager: ${addresses.ExposureManager}`);

  // 4.6 InsuranceFund
  console.log("  Deploying InsuranceFund...");
  const InsuranceFund = await ethers.getContractFactory("InsuranceFund");
  const insuranceFund = await InsuranceFund.deploy(
    addresses.ExecutionVault,
    addresses.MockUSDC
  );
  await insuranceFund.waitForDeployment();
  addresses.InsuranceFund = await insuranceFund.getAddress();
  console.log(`    InsuranceFund: ${addresses.InsuranceFund}`);

  // 4.7 PositionManager
  console.log("  Deploying PositionManager...");
  const PositionManager = await ethers.getContractFactory("PositionManager");
  const positionManager = await PositionManager.deploy(FLARE_ORACLE);
  await positionManager.waitForDeployment();
  addresses.PositionManager = await positionManager.getAddress();
  console.log(`    PositionManager: ${addresses.PositionManager}`);

  // 4.8 ExecutionRightsNFT
  console.log("  Deploying ExecutionRightsNFT...");
  const ExecutionRightsNFT = await ethers.getContractFactory("ExecutionRightsNFT");
  const executionRightsNFT = await ExecutionRightsNFT.deploy(
    addresses.ReputationManager,
    addresses.ExecutionVault
  );
  await executionRightsNFT.waitForDeployment();
  addresses.ExecutionRightsNFT = await executionRightsNFT.getAddress();
  console.log(`    ExecutionRightsNFT: ${addresses.ExecutionRightsNFT}`);

  // 4.9 ExecutionController
  console.log("  Deploying ExecutionController...");
  const ExecutionController = await ethers.getContractFactory("ExecutionController");
  const executionController = await ExecutionController.deploy(
    addresses.ExecutionRightsNFT,
    addresses.ExecutionVault,
    addresses.PositionManager,
    addresses.ExposureManager,
    FLARE_ORACLE
  );
  await executionController.waitForDeployment();
  addresses.ExecutionController = await executionController.getAddress();
  console.log(`    ExecutionController: ${addresses.ExecutionController}`);

  // ==========================================================
  // STEP 5: Deploy Phase 7 Contracts
  // ==========================================================
  console.log("\n" + "=".repeat(50));
  console.log("Step 5: Deploying Phase 7 - Settlement & Gateway");
  console.log("=".repeat(50));

  // 5.1 SettlementEngine
  console.log("  Deploying SettlementEngine...");
  const SettlementEngine = await ethers.getContractFactory("SettlementEngine");
  const settlementEngine = await SettlementEngine.deploy(
    addresses.ExecutionRightsNFT,
    addresses.ExecutionVault,
    addresses.PositionManager,
    addresses.ReputationManager,
    addresses.CircuitBreaker,
    addresses.InsuranceFund,
    FLARE_ORACLE
  );
  await settlementEngine.waitForDeployment();
  addresses.SettlementEngine = await settlementEngine.getAddress();
  console.log(`    SettlementEngine: ${addresses.SettlementEngine}`);

  // 5.2 PraxisGateway
  console.log("  Deploying PraxisGateway...");
  const PraxisGateway = await ethers.getContractFactory("PraxisGateway");
  const praxisGateway = await PraxisGateway.deploy(
    addresses.ExecutionVault,
    addresses.ExecutionRightsNFT,
    addresses.SettlementEngine,
    addresses.ExecutionController,
    addresses.ReputationManager,
    addresses.PositionManager
  );
  await praxisGateway.waitForDeployment();
  addresses.PraxisGateway = await praxisGateway.getAddress();
  console.log(`    PraxisGateway: ${addresses.PraxisGateway}`);

  // ==========================================================
  // STEP 6: Wire Up All Contracts
  // ==========================================================
  console.log("\n" + "=".repeat(50));
  console.log("Step 6: Wiring Up Contracts");
  console.log("=".repeat(50));

  // ExecutionVault connections
  console.log("  Configuring ExecutionVault...");
  await executionVault.setExecutionController(addresses.ExecutionController);
  await executionVault.setUtilizationController(addresses.UtilizationController);
  await executionVault.setCircuitBreaker(addresses.CircuitBreaker);
  await executionVault.setSettlementEngine(addresses.SettlementEngine);

  // ExecutionRightsNFT connections
  console.log("  Configuring ExecutionRightsNFT...");
  await executionRightsNFT.setExecutionController(addresses.ExecutionController);
  await executionRightsNFT.setCircuitBreaker(addresses.CircuitBreaker);
  await executionRightsNFT.setSettlementEngine(addresses.SettlementEngine);

  // PositionManager connections
  console.log("  Configuring PositionManager...");
  await positionManager.setExecutionController(addresses.ExecutionController);

  // ExposureManager connections
  console.log("  Configuring ExposureManager...");
  await exposureManager.setExecutionController(addresses.ExecutionController);

  // ExecutionController connections
  console.log("  Configuring ExecutionController...");
  await executionController.setCircuitBreaker(addresses.CircuitBreaker);

  // SettlementEngine connections
  console.log("  Configuring SettlementEngine...");
  await settlementEngine.setGateway(addresses.PraxisGateway);

  // Configure SettlementEngine permission on other contracts
  console.log("  Configuring permissions for SettlementEngine...");
  await positionManager.setSettlementEngine(addresses.SettlementEngine);
  await reputationManager.setSettlementEngine(addresses.SettlementEngine);
  await insuranceFund.setSettlementEngine(addresses.SettlementEngine);
  await circuitBreaker.setSettlementEngine(addresses.SettlementEngine);

  // Configure MockSimpleDEX adapter type on SettlementEngine
  console.log("  Configuring adapter types...");
  await settlementEngine.setAdapterTypes(
    [addresses.MockSimpleDEX],
    [1] // AdapterType.DEX = 1
  );

  // ==========================================================
  // STEP 7: Configure Token Feeds on FlareOracle
  // ==========================================================
  console.log("\n" + "=".repeat(50));
  console.log("Step 7: Configuring Token Feeds");
  console.log("=".repeat(50));

  const flareOracle = await ethers.getContractAt("FlareOracle", FLARE_ORACLE);

  // Try to configure feeds - may fail if not owner
  try {
    console.log("  Setting token feeds on FlareOracle...");
    await flareOracle.setTokenFeeds(
      [
        addresses.MockUSDC,
        addresses.MockWFLR,
        addresses.MockFXRP,
        addresses.MockFBTC,
        addresses.MockFDOGE,
      ],
      [
        FEED_IDS["USDC/USD"],
        FEED_IDS["FLR/USD"],
        FEED_IDS["XRP/USD"],
        FEED_IDS["BTC/USD"],
        FEED_IDS["DOGE/USD"],
      ]
    );
    console.log("    Token feeds configured successfully");
  } catch (e: any) {
    console.log("    [SKIP] Could not configure feeds - may need to be done by FlareOracle owner");
    console.log(`    Error: ${e.message?.slice(0, 100)}`);
  }

  // ==========================================================
  // STEP 8: Save Deployed Addresses
  // ==========================================================
  console.log("\n" + "=".repeat(50));
  console.log("Step 8: Saving Deployed Addresses");
  console.log("=".repeat(50));

  const outputPath = path.join(__dirname, "../../deployed-addresses-coston2.json");
  fs.writeFileSync(outputPath, JSON.stringify(addresses, null, 2));
  console.log(`  Addresses saved to: ${outputPath}`);

  // ==========================================================
  // SUMMARY
  // ==========================================================
  console.log("\n" + "=".repeat(70));
  console.log("PRAXIS Coston2 Deployment Complete!");
  console.log("=".repeat(70));

  console.log("\n[Flare Infrastructure - Already Deployed]");
  console.log(`  FlareOracle:        ${addresses.FlareOracle}`);
  console.log(`  FDCVerifier:        ${addresses.FDCVerifier}`);

  console.log("\n[Mock Tokens]");
  console.log(`  MockUSDC:           ${addresses.MockUSDC}`);
  console.log(`  MockWFLR:           ${addresses.MockWFLR}`);
  console.log(`  MockFXRP:           ${addresses.MockFXRP}`);
  console.log(`  MockFBTC:           ${addresses.MockFBTC}`);
  console.log(`  MockFDOGE:          ${addresses.MockFDOGE}`);

  console.log("\n[Mock Protocols]");
  console.log(`  MockSimpleDEX:      ${addresses.MockSimpleDEX}`);
  console.log(`  MockSceptre:        ${addresses.MockSceptre}`);
  console.log(`  MockKinetic:        ${addresses.MockKinetic}`);

  console.log("\n[Core Protocol - Phase 6]");
  console.log(`  ReputationManager:  ${addresses.ReputationManager}`);
  console.log(`  ExecutionVault:     ${addresses.ExecutionVault}`);
  console.log(`  UtilizationCtrl:    ${addresses.UtilizationController}`);
  console.log(`  CircuitBreaker:     ${addresses.CircuitBreaker}`);
  console.log(`  ExposureManager:    ${addresses.ExposureManager}`);
  console.log(`  InsuranceFund:      ${addresses.InsuranceFund}`);
  console.log(`  PositionManager:    ${addresses.PositionManager}`);
  console.log(`  ExecutionRightsNFT: ${addresses.ExecutionRightsNFT}`);
  console.log(`  ExecutionController: ${addresses.ExecutionController}`);

  console.log("\n[Settlement & Gateway - Phase 7]");
  console.log(`  SettlementEngine:   ${addresses.SettlementEngine}`);
  console.log(`  PraxisGateway:      ${addresses.PraxisGateway}`);

  console.log("\n[Routers]");
  console.log(`  SwapRouter:         ${addresses.SwapRouter}`);

  console.log("\n[Next Steps]");
  console.log("  1. Run coston2-warm-state.ts to seed demo data");
  console.log("  2. Update client/lib/contracts/addresses.ts with these addresses");
  console.log("  3. Test the deployment via the client");

  return addresses;
}

main()
  .then((addresses) => {
    console.log("\n[SUCCESS] Deployment completed!");
    process.exit(0);
  })
  .catch((error) => {
    console.error("\n[ERROR] Deployment failed:", error);
    process.exit(1);
  });

export { main, DeployedAddresses };
