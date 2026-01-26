import { ethers, ContractFactory } from "ethers";
import * as fs from "fs";
import * as path from "path";
import { fileURLToPath } from "url";
import dotenv from "dotenv";

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

/**
 * PRAXIS Full Coston2 Testnet Deployment Script
 *
 * Deploys ALL contracts including ZK verifiers:
 * 1. Uses existing FlareOracle and FDCVerifier
 * 2. Deploys Mock Tokens
 * 3. Deploys Mock Protocols
 * 4. Deploys Core Protocol (Phase 6)
 * 5. Deploys Settlement & Gateway (Phase 7)
 * 6. Deploys ZK Verifiers & Executor
 * 7. Wires everything together
 */

// =============================================================
//                    CONFIG
// =============================================================

const RPC_URL = process.env.COSTON2_RPC_URL || "https://coston2-api.flare.network/ext/C/rpc";
const PRIVATE_KEY = process.env.PRIVATE_KEY;

if (!PRIVATE_KEY) {
  throw new Error("PRIVATE_KEY not found in .env");
}

// Existing Flare infrastructure on Coston2
const FLARE_ORACLE = "0x0979854b028210Cf492a3bCB990B6a1D45d89eCc";
const FDC_VERIFIER = "0xe667bEf52f1EAD93Cb0375639a4eA36001d4edf3";

// FTSO Feed IDs (from feedIds.ts)
const FEED_IDS = {
  "FLR/USD": "0x01464c522f55534400000000000000000000000000",
  "BTC/USD": "0x014254432f55534400000000000000000000000000",
  "ETH/USD": "0x014554482f55534400000000000000000000000000",
  "XRP/USD": "0x015852502f55534400000000000000000000000000",
  "DOGE/USD": "0x01444f47452f555344000000000000000000000000",
  "USDC/USD": "0x01555344432f555344000000000000000000000000",
};

// =============================================================
//                    HELPERS
// =============================================================

function loadArtifact(contractPath: string): { abi: any; bytecode: string } {
  const artifactPath = path.resolve(__dirname, `../../artifacts/contracts/${contractPath}.json`);
  if (!fs.existsSync(artifactPath)) {
    throw new Error(`Artifact not found: ${artifactPath}. Run 'npx hardhat compile' first.`);
  }
  return JSON.parse(fs.readFileSync(artifactPath, "utf8"));
}

async function deployContract(
  wallet: ethers.Wallet,
  contractPath: string,
  args: any[] = [],
  name: string
): Promise<ethers.Contract> {
  const artifact = loadArtifact(contractPath);
  const factory = new ContractFactory(artifact.abi, artifact.bytecode, wallet);

  console.log(`  Deploying ${name}...`);
  const contract = await factory.deploy(...args);
  await contract.waitForDeployment();
  const address = await contract.getAddress();
  console.log(`    ${name}: ${address}`);
  return contract as ethers.Contract;
}

async function getContractAt(wallet: ethers.Wallet, contractPath: string, address: string): Promise<ethers.Contract> {
  const artifact = loadArtifact(contractPath);
  return new ethers.Contract(address, artifact.abi, wallet);
}

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

  // ZK Contracts
  Groth16Verifier: string;
  PrivateSwapVerifier: string;
  PrivatePerpVerifier: string;
  PrivateYieldVerifier: string;
  PrivateSettlementVerifier: string;
  ZKExecutionController: string;
  ZKExecutor: string;
}

// =============================================================
//                    MAIN DEPLOYMENT
// =============================================================

async function main(): Promise<DeployedAddresses> {
  const provider = new ethers.JsonRpcProvider(RPC_URL);
  const wallet = new ethers.Wallet(PRIVATE_KEY!, provider);
  const balance = await provider.getBalance(wallet.address);

  console.log("=".repeat(70));
  console.log("PRAXIS Full Coston2 Testnet Deployment");
  console.log("=".repeat(70));
  console.log(`Deployer: ${wallet.address}`);
  console.log(`Balance: ${ethers.formatEther(balance)} C2FLR`);
  console.log(`Network: Coston2 (Chain ID: 114)`);
  console.log("");

  if (balance < ethers.parseEther("1")) {
    throw new Error("Insufficient balance. Need at least 1 C2FLR for deployment.");
  }

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
    Groth16Verifier: "",
    PrivateSwapVerifier: "",
    PrivatePerpVerifier: "",
    PrivateYieldVerifier: "",
    PrivateSettlementVerifier: "",
    ZKExecutionController: "",
    ZKExecutor: "",
  };

  // ==========================================================
  // STEP 1: Deploy Mock Tokens
  // ==========================================================
  console.log("\n" + "=".repeat(50));
  console.log("Step 1: Deploying Mock Tokens");
  console.log("=".repeat(50));

  // MockUSDC (6 decimals)
  const mockUSDC = await deployContract(wallet, "mocks/MockERC20.sol/MockERC20", ["Mock USDC", "mUSDC", 6], "MockUSDC");
  addresses.MockUSDC = await mockUSDC.getAddress();

  // MockWFLR (18 decimals)
  const mockWFLR = await deployContract(wallet, "mocks/MockERC20.sol/MockERC20", ["Mock Wrapped FLR", "mWFLR", 18], "MockWFLR");
  addresses.MockWFLR = await mockWFLR.getAddress();

  // Mock FAssets
  const mockFXRP = await deployContract(wallet, "mocks/MockFAsset.sol/MockFAsset",
    ["Mock FAsset XRP", "mFXRP", 6, FEED_IDS["XRP/USD"], "XRP"], "MockFXRP");
  addresses.MockFXRP = await mockFXRP.getAddress();

  const mockFBTC = await deployContract(wallet, "mocks/MockFAsset.sol/MockFAsset",
    ["Mock FAsset BTC", "mFBTC", 8, FEED_IDS["BTC/USD"], "BTC"], "MockFBTC");
  addresses.MockFBTC = await mockFBTC.getAddress();

  const mockFDOGE = await deployContract(wallet, "mocks/MockFAsset.sol/MockFAsset",
    ["Mock FAsset DOGE", "mFDOGE", 8, FEED_IDS["DOGE/USD"], "DOGE"], "MockFDOGE");
  addresses.MockFDOGE = await mockFDOGE.getAddress();

  // ==========================================================
  // STEP 2: Deploy Mock Protocols
  // ==========================================================
  console.log("\n" + "=".repeat(50));
  console.log("Step 2: Deploying Mock Protocols");
  console.log("=".repeat(50));

  const mockDEX = await deployContract(wallet, "mocks/MockSimpleDEX.sol/MockSimpleDEX", [], "MockSimpleDEX");
  addresses.MockSimpleDEX = await mockDEX.getAddress();

  const mockSceptre = await deployContract(wallet, "mocks/MockSceptre.sol/MockSceptre",
    [addresses.MockWFLR, ethers.parseEther("1.05")], "MockSceptre");
  addresses.MockSceptre = await mockSceptre.getAddress();
  addresses.MockSFLR = addresses.MockSceptre;

  const mockKinetic = await deployContract(wallet, "mocks/MockKinetic.sol/MockKinetic", [], "MockKinetic");
  addresses.MockKinetic = await mockKinetic.getAddress();

  // Create USDC market on MockKinetic
  console.log("  Creating USDC market on MockKinetic...");
  await mockKinetic.listMarket(addresses.MockUSDC, "Kinetic mUSDC", "kmUSDC", ethers.parseEther("1"), 800);

  // ==========================================================
  // STEP 3: Deploy SwapRouter
  // ==========================================================
  console.log("\n" + "=".repeat(50));
  console.log("Step 3: Deploying SwapRouter");
  console.log("=".repeat(50));

  const swapRouter = await deployContract(wallet, "core/SwapRouter.sol/SwapRouter", [], "SwapRouter");
  addresses.SwapRouter = await swapRouter.getAddress();

  // Register MockSimpleDEX as adapter
  console.log("  Registering MockSimpleDEX adapter...");
  await swapRouter.addAdapter(addresses.MockSimpleDEX);

  // ==========================================================
  // STEP 4: Deploy Phase 6 Contracts
  // ==========================================================
  console.log("\n" + "=".repeat(50));
  console.log("Step 4: Deploying Phase 6 - Execution Rights System");
  console.log("=".repeat(50));

  const reputationManager = await deployContract(wallet, "core/ReputationManager.sol/ReputationManager", [], "ReputationManager");
  addresses.ReputationManager = await reputationManager.getAddress();

  const executionVault = await deployContract(wallet, "core/ExecutionVault.sol/ExecutionVault",
    [addresses.MockUSDC, "PRAXIS Vault Shares", "pxUSDC"], "ExecutionVault");
  addresses.ExecutionVault = await executionVault.getAddress();

  const utilizationController = await deployContract(wallet, "core/UtilizationController.sol/UtilizationController",
    [addresses.ExecutionVault], "UtilizationController");
  addresses.UtilizationController = await utilizationController.getAddress();

  const circuitBreaker = await deployContract(wallet, "core/CircuitBreaker.sol/CircuitBreaker",
    [addresses.ExecutionVault, 0], "CircuitBreaker");
  addresses.CircuitBreaker = await circuitBreaker.getAddress();

  const exposureManager = await deployContract(wallet, "core/ExposureManager.sol/ExposureManager",
    [addresses.ExecutionVault], "ExposureManager");
  addresses.ExposureManager = await exposureManager.getAddress();

  const insuranceFund = await deployContract(wallet, "core/InsuranceFund.sol/InsuranceFund",
    [addresses.ExecutionVault, addresses.MockUSDC], "InsuranceFund");
  addresses.InsuranceFund = await insuranceFund.getAddress();

  const positionManager = await deployContract(wallet, "core/PositionManager.sol/PositionManager",
    [FLARE_ORACLE], "PositionManager");
  addresses.PositionManager = await positionManager.getAddress();

  const executionRightsNFT = await deployContract(wallet, "core/ExecutionRightsNFT.sol/ExecutionRightsNFT",
    [addresses.ReputationManager, addresses.ExecutionVault], "ExecutionRightsNFT");
  addresses.ExecutionRightsNFT = await executionRightsNFT.getAddress();

  const executionController = await deployContract(wallet, "core/ExecutionController.sol/ExecutionController",
    [addresses.ExecutionRightsNFT, addresses.ExecutionVault, addresses.PositionManager, addresses.ExposureManager, FLARE_ORACLE],
    "ExecutionController");
  addresses.ExecutionController = await executionController.getAddress();

  // ==========================================================
  // STEP 5: Deploy Phase 7 Contracts
  // ==========================================================
  console.log("\n" + "=".repeat(50));
  console.log("Step 5: Deploying Phase 7 - Settlement & Gateway");
  console.log("=".repeat(50));

  const settlementEngine = await deployContract(wallet, "core/SettlementEngine.sol/SettlementEngine",
    [addresses.ExecutionRightsNFT, addresses.ExecutionVault, addresses.PositionManager,
     addresses.ReputationManager, addresses.CircuitBreaker, addresses.InsuranceFund, FLARE_ORACLE],
    "SettlementEngine");
  addresses.SettlementEngine = await settlementEngine.getAddress();

  const praxisGateway = await deployContract(wallet, "core/PraxisGateway.sol/PraxisGateway",
    [addresses.ExecutionVault, addresses.ExecutionRightsNFT, addresses.SettlementEngine,
     addresses.ExecutionController, addresses.ReputationManager, addresses.PositionManager],
    "PraxisGateway");
  addresses.PraxisGateway = await praxisGateway.getAddress();

  // ==========================================================
  // STEP 6: Deploy ZK Contracts
  // ==========================================================
  console.log("\n" + "=".repeat(50));
  console.log("Step 6: Deploying ZK Contracts");
  console.log("=".repeat(50));

  const groth16Verifier = await deployContract(wallet, "zk/Groth16Verifier.sol/Groth16Verifier", [], "Groth16Verifier");
  addresses.Groth16Verifier = await groth16Verifier.getAddress();

  const privateSwapVerifier = await deployContract(wallet, "zk/PrivateSwapVerifier.sol/PrivateSwapVerifier", [], "PrivateSwapVerifier");
  addresses.PrivateSwapVerifier = await privateSwapVerifier.getAddress();

  const privatePerpVerifier = await deployContract(wallet, "zk/PrivatePerpVerifier.sol/PrivatePerpVerifier", [], "PrivatePerpVerifier");
  addresses.PrivatePerpVerifier = await privatePerpVerifier.getAddress();

  const privateYieldVerifier = await deployContract(wallet, "zk/PrivateYieldVerifier.sol/PrivateYieldVerifier", [], "PrivateYieldVerifier");
  addresses.PrivateYieldVerifier = await privateYieldVerifier.getAddress();

  const privateSettlementVerifier = await deployContract(wallet, "zk/PrivateSettlementVerifier.sol/PrivateSettlementVerifier", [], "PrivateSettlementVerifier");
  addresses.PrivateSettlementVerifier = await privateSettlementVerifier.getAddress();

  const zkExecutionController = await deployContract(wallet, "zk/ZKExecutionController.sol/ZKExecutionController",
    [addresses.PrivateSwapVerifier, addresses.PrivateYieldVerifier, addresses.PrivatePerpVerifier,
     addresses.PrivateSettlementVerifier, addresses.PraxisGateway], "ZKExecutionController");
  addresses.ZKExecutionController = await zkExecutionController.getAddress();

  const zkExecutor = await deployContract(wallet, "zk/ZKExecutor.sol/ZKExecutor",
    [addresses.PrivateSwapVerifier, addresses.MockSimpleDEX], "ZKExecutor");
  addresses.ZKExecutor = await zkExecutor.getAddress();

  // ==========================================================
  // STEP 7: Wire Up All Contracts
  // ==========================================================
  console.log("\n" + "=".repeat(50));
  console.log("Step 7: Wiring Up Contracts");
  console.log("=".repeat(50));

  // Get contract instances for wiring
  console.log("  Configuring ExecutionVault...");
  await executionVault.setExecutionController(addresses.ExecutionController);
  await executionVault.setUtilizationController(addresses.UtilizationController);
  await executionVault.setCircuitBreaker(addresses.CircuitBreaker);
  await executionVault.setSettlementEngine(addresses.SettlementEngine);

  console.log("  Configuring ExecutionRightsNFT...");
  await executionRightsNFT.setExecutionController(addresses.ExecutionController);
  await executionRightsNFT.setCircuitBreaker(addresses.CircuitBreaker);
  await executionRightsNFT.setSettlementEngine(addresses.SettlementEngine);

  console.log("  Configuring PositionManager...");
  await positionManager.setExecutionController(addresses.ExecutionController);

  console.log("  Configuring ExposureManager...");
  await exposureManager.setExecutionController(addresses.ExecutionController);

  console.log("  Configuring ExecutionController...");
  await executionController.setCircuitBreaker(addresses.CircuitBreaker);

  console.log("  Configuring SettlementEngine...");
  await settlementEngine.setGateway(addresses.PraxisGateway);

  console.log("  Configuring permissions for SettlementEngine...");
  await positionManager.setSettlementEngine(addresses.SettlementEngine);
  await reputationManager.setSettlementEngine(addresses.SettlementEngine);
  await insuranceFund.setSettlementEngine(addresses.SettlementEngine);
  await circuitBreaker.setSettlementEngine(addresses.SettlementEngine);

  console.log("  Configuring adapter types...");
  await settlementEngine.setAdapterTypes([addresses.MockSimpleDEX], [1]); // AdapterType.DEX = 1

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
  console.log("PRAXIS Full Coston2 Deployment Complete!");
  console.log("=".repeat(70));

  console.log("\n[Flare Infrastructure - Already Deployed]");
  console.log(`  FlareOracle:              ${addresses.FlareOracle}`);
  console.log(`  FDCVerifier:              ${addresses.FDCVerifier}`);

  console.log("\n[Mock Tokens]");
  console.log(`  MockUSDC:                 ${addresses.MockUSDC}`);
  console.log(`  MockWFLR:                 ${addresses.MockWFLR}`);
  console.log(`  MockFXRP:                 ${addresses.MockFXRP}`);
  console.log(`  MockFBTC:                 ${addresses.MockFBTC}`);
  console.log(`  MockFDOGE:                ${addresses.MockFDOGE}`);

  console.log("\n[Mock Protocols]");
  console.log(`  MockSimpleDEX:            ${addresses.MockSimpleDEX}`);
  console.log(`  MockSceptre:              ${addresses.MockSceptre}`);
  console.log(`  MockKinetic:              ${addresses.MockKinetic}`);

  console.log("\n[Core Protocol - Phase 6]");
  console.log(`  ReputationManager:        ${addresses.ReputationManager}`);
  console.log(`  ExecutionVault:           ${addresses.ExecutionVault}`);
  console.log(`  UtilizationController:    ${addresses.UtilizationController}`);
  console.log(`  CircuitBreaker:           ${addresses.CircuitBreaker}`);
  console.log(`  ExposureManager:          ${addresses.ExposureManager}`);
  console.log(`  InsuranceFund:            ${addresses.InsuranceFund}`);
  console.log(`  PositionManager:          ${addresses.PositionManager}`);
  console.log(`  ExecutionRightsNFT:       ${addresses.ExecutionRightsNFT}`);
  console.log(`  ExecutionController:      ${addresses.ExecutionController}`);

  console.log("\n[Settlement & Gateway - Phase 7]");
  console.log(`  SettlementEngine:         ${addresses.SettlementEngine}`);
  console.log(`  PraxisGateway:            ${addresses.PraxisGateway}`);

  console.log("\n[Routers]");
  console.log(`  SwapRouter:               ${addresses.SwapRouter}`);

  console.log("\n[ZK Contracts]");
  console.log(`  Groth16Verifier:          ${addresses.Groth16Verifier}`);
  console.log(`  PrivateSwapVerifier:      ${addresses.PrivateSwapVerifier}`);
  console.log(`  PrivatePerpVerifier:      ${addresses.PrivatePerpVerifier}`);
  console.log(`  PrivateYieldVerifier:     ${addresses.PrivateYieldVerifier}`);
  console.log(`  PrivateSettlementVerifier: ${addresses.PrivateSettlementVerifier}`);
  console.log(`  ZKExecutionController:    ${addresses.ZKExecutionController}`);
  console.log(`  ZKExecutor:               ${addresses.ZKExecutor}`);

  return addresses;
}

main()
  .then((addresses) => {
    console.log("\n[SUCCESS] Full deployment completed!");
    process.exit(0);
  })
  .catch((error) => {
    console.error("\n[ERROR] Deployment failed:", error);
    process.exit(1);
  });
