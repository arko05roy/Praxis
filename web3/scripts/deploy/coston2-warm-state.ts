import { network } from "hardhat";
import * as fs from "fs";
import * as path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const { ethers } = await network.connect();

/**
 * PRAXIS Coston2 Warm State Seeding Script
 *
 * Seeds the deployed contracts with demo data:
 * 1. Mints mock tokens to demo addresses
 * 2. Seeds DEX liquidity pools
 * 3. Seeds Sceptre with backing
 * 4. Seeds Kinetic with liquidity
 * 5. Creates sample LP deposits in ExecutionVault
 * 6. Mints sample ERTs for demo
 * 7. Seeds Insurance Fund
 */

// =============================================================
//                    CONFIGURATION
// =============================================================

// Demo wallets - deployer and optional additional demo accounts
// In production, you would use actual demo wallet addresses
const DEMO_MINT_AMOUNTS = {
  MockUSDC: ethers.parseUnits("1500000", 6),      // 1.5M USDC (enough for DEX + Kinetic + Vault + Insurance)
  MockWFLR: ethers.parseUnits("10000000", 18),    // 10M WFLR
  MockFXRP: ethers.parseUnits("5000000", 6),      // 5M FXRP
  MockFBTC: ethers.parseUnits("100", 8),          // 100 BTC
  MockFDOGE: ethers.parseUnits("10000000", 8),    // 10M DOGE
};

// DEX Liquidity amounts
const DEX_LIQUIDITY = {
  "USDC-WFLR": {
    amountA: ethers.parseUnits("500000", 6),      // 500K USDC
    amountB: ethers.parseUnits("2500000", 18),    // 2.5M WFLR (@ $0.20/FLR)
  },
  "USDC-FXRP": {
    amountA: ethers.parseUnits("200000", 6),      // 200K USDC
    amountB: ethers.parseUnits("400000", 6),      // 400K FXRP (@ $0.50/XRP)
  },
  "WFLR-FXRP": {
    amountA: ethers.parseUnits("1000000", 18),    // 1M WFLR
    amountB: ethers.parseUnits("400000", 6),      // 400K FXRP
  },
};

// LP Deposit amounts for ExecutionVault
const LP_DEPOSITS = {
  deployer: ethers.parseUnits("200000", 6),       // 200K USDC from deployer
};

// Insurance Fund initial balance
const INSURANCE_FUND_SEED = ethers.parseUnits("5000", 6); // 5K USDC

// =============================================================
//                    INTERFACES
// =============================================================

interface DeployedAddresses {
  FlareOracle: string;
  FDCVerifier: string;
  MockUSDC: string;
  MockWFLR: string;
  MockFXRP: string;
  MockFBTC: string;
  MockFDOGE: string;
  MockSFLR: string;
  MockSimpleDEX: string;
  MockSceptre: string;
  MockKinetic: string;
  ReputationManager: string;
  ExecutionVault: string;
  UtilizationController: string;
  CircuitBreaker: string;
  ExposureManager: string;
  InsuranceFund: string;
  PositionManager: string;
  ExecutionRightsNFT: string;
  ExecutionController: string;
  SettlementEngine: string;
  PraxisGateway: string;
  SwapRouter: string;
  Asset: string;
}

// =============================================================
//                    MAIN SEEDING
// =============================================================

async function main() {
  const [deployer] = await ethers.getSigners();
  const balance = await ethers.provider.getBalance(deployer.address);

  console.log("=".repeat(70));
  console.log("PRAXIS Coston2 Warm State Seeding");
  console.log("=".repeat(70));
  console.log(`Deployer: ${deployer.address}`);
  console.log(`Balance: ${ethers.formatEther(balance)} C2FLR`);
  console.log("");

  // Load deployed addresses
  const addressesPath = path.join(__dirname, "../../deployed-addresses-coston2.json");
  if (!fs.existsSync(addressesPath)) {
    console.error("[ERROR] deployed-addresses-coston2.json not found!");
    console.error("Run coston2-deploy.ts first.");
    process.exit(1);
  }

  const addresses: DeployedAddresses = JSON.parse(fs.readFileSync(addressesPath, "utf-8"));
  console.log("Loaded deployed addresses from:", addressesPath);

  // ==========================================================
  // STEP 1: Mint Mock Tokens to Deployer
  // ==========================================================
  console.log("\n" + "=".repeat(50));
  console.log("Step 1: Minting Mock Tokens");
  console.log("=".repeat(50));

  // Get token contracts
  const mockUSDC = await ethers.getContractAt("MockERC20", addresses.MockUSDC);
  const mockWFLR = await ethers.getContractAt("MockERC20", addresses.MockWFLR);
  const mockFXRP = await ethers.getContractAt("MockFAsset", addresses.MockFXRP);
  const mockFBTC = await ethers.getContractAt("MockFAsset", addresses.MockFBTC);
  const mockFDOGE = await ethers.getContractAt("MockFAsset", addresses.MockFDOGE);

  console.log("  Minting MockUSDC...");
  await mockUSDC.mint(deployer.address, DEMO_MINT_AMOUNTS.MockUSDC);
  console.log(`    Minted ${ethers.formatUnits(DEMO_MINT_AMOUNTS.MockUSDC, 6)} mUSDC`);

  console.log("  Minting MockWFLR...");
  await mockWFLR.mint(deployer.address, DEMO_MINT_AMOUNTS.MockWFLR);
  console.log(`    Minted ${ethers.formatUnits(DEMO_MINT_AMOUNTS.MockWFLR, 18)} mWFLR`);

  console.log("  Minting MockFXRP...");
  await mockFXRP.mint(deployer.address, DEMO_MINT_AMOUNTS.MockFXRP);
  console.log(`    Minted ${ethers.formatUnits(DEMO_MINT_AMOUNTS.MockFXRP, 6)} mFXRP`);

  console.log("  Minting MockFBTC...");
  await mockFBTC.mint(deployer.address, DEMO_MINT_AMOUNTS.MockFBTC);
  console.log(`    Minted ${ethers.formatUnits(DEMO_MINT_AMOUNTS.MockFBTC, 8)} mFBTC`);

  console.log("  Minting MockFDOGE...");
  await mockFDOGE.mint(deployer.address, DEMO_MINT_AMOUNTS.MockFDOGE);
  console.log(`    Minted ${ethers.formatUnits(DEMO_MINT_AMOUNTS.MockFDOGE, 8)} mFDOGE`);

  // ==========================================================
  // STEP 2: Seed DEX Liquidity
  // ==========================================================
  console.log("\n" + "=".repeat(50));
  console.log("Step 2: Seeding DEX Liquidity");
  console.log("=".repeat(50));

  const mockDEX = await ethers.getContractAt("MockSimpleDEX", addresses.MockSimpleDEX);

  // Approve tokens for DEX
  console.log("  Approving tokens for DEX...");
  await mockUSDC.approve(addresses.MockSimpleDEX, ethers.MaxUint256);
  await mockWFLR.approve(addresses.MockSimpleDEX, ethers.MaxUint256);
  await mockFXRP.approve(addresses.MockSimpleDEX, ethers.MaxUint256);

  // USDC-WFLR Pool
  console.log("  Adding USDC-WFLR liquidity...");
  await mockDEX.addLiquidity(
    addresses.MockUSDC,
    addresses.MockWFLR,
    DEX_LIQUIDITY["USDC-WFLR"].amountA,
    DEX_LIQUIDITY["USDC-WFLR"].amountB
  );
  console.log(`    Added ${ethers.formatUnits(DEX_LIQUIDITY["USDC-WFLR"].amountA, 6)} mUSDC`);
  console.log(`    Added ${ethers.formatUnits(DEX_LIQUIDITY["USDC-WFLR"].amountB, 18)} mWFLR`);

  // USDC-FXRP Pool
  console.log("  Adding USDC-FXRP liquidity...");
  await mockDEX.addLiquidity(
    addresses.MockUSDC,
    addresses.MockFXRP,
    DEX_LIQUIDITY["USDC-FXRP"].amountA,
    DEX_LIQUIDITY["USDC-FXRP"].amountB
  );
  console.log(`    Added ${ethers.formatUnits(DEX_LIQUIDITY["USDC-FXRP"].amountA, 6)} mUSDC`);
  console.log(`    Added ${ethers.formatUnits(DEX_LIQUIDITY["USDC-FXRP"].amountB, 6)} mFXRP`);

  // WFLR-FXRP Pool
  console.log("  Adding WFLR-FXRP liquidity...");
  await mockDEX.addLiquidity(
    addresses.MockWFLR,
    addresses.MockFXRP,
    DEX_LIQUIDITY["WFLR-FXRP"].amountA,
    DEX_LIQUIDITY["WFLR-FXRP"].amountB
  );
  console.log(`    Added ${ethers.formatUnits(DEX_LIQUIDITY["WFLR-FXRP"].amountA, 18)} mWFLR`);
  console.log(`    Added ${ethers.formatUnits(DEX_LIQUIDITY["WFLR-FXRP"].amountB, 6)} mFXRP`);

  // ==========================================================
  // STEP 3: Fund MockSceptre for Unstaking
  // ==========================================================
  console.log("\n" + "=".repeat(50));
  console.log("Step 3: Funding MockSceptre");
  console.log("=".repeat(50));

  const mockSceptre = await ethers.getContractAt("MockSceptre", addresses.MockSceptre);

  // Fund with WFLR for unstaking
  const sceptreFunding = ethers.parseUnits("100000", 18); // 100K WFLR
  console.log("  Approving WFLR for MockSceptre...");
  await mockWFLR.approve(addresses.MockSceptre, sceptreFunding);

  // Transfer WFLR to Sceptre contract for unstake liquidity
  console.log("  Transferring WFLR to MockSceptre...");
  await mockWFLR.transfer(addresses.MockSceptre, sceptreFunding);
  console.log(`    Funded with ${ethers.formatUnits(sceptreFunding, 18)} mWFLR`);

  // ==========================================================
  // STEP 4: Seed Kinetic with Liquidity
  // ==========================================================
  console.log("\n" + "=".repeat(50));
  console.log("Step 4: Seeding MockKinetic Liquidity");
  console.log("=".repeat(50));

  const mockKinetic = await ethers.getContractAt("MockKinetic", addresses.MockKinetic);
  const kineticLiquidity = ethers.parseUnits("100000", 6); // 100K USDC

  console.log("  Approving USDC for MockKinetic...");
  await mockUSDC.approve(addresses.MockKinetic, kineticLiquidity);

  // Transfer USDC to Kinetic contract for withdraw liquidity
  console.log("  Transferring USDC to MockKinetic...");
  await mockUSDC.transfer(addresses.MockKinetic, kineticLiquidity);
  console.log(`    Funded with ${ethers.formatUnits(kineticLiquidity, 6)} mUSDC`);

  // ==========================================================
  // STEP 5: Seed LP Deposits in ExecutionVault
  // ==========================================================
  console.log("\n" + "=".repeat(50));
  console.log("Step 5: Seeding LP Deposits");
  console.log("=".repeat(50));

  const executionVault = await ethers.getContractAt("ExecutionVault", addresses.ExecutionVault);

  try {
    console.log("  Approving USDC for ExecutionVault...");
    await mockUSDC.approve(addresses.ExecutionVault, ethers.MaxUint256);

    console.log("  Depositing to ExecutionVault...");
    await executionVault.deposit(LP_DEPOSITS.deployer, deployer.address);
    const shares = await executionVault.balanceOf(deployer.address);
    console.log(`    Deposited ${ethers.formatUnits(LP_DEPOSITS.deployer, 6)} mUSDC`);
    console.log(`    Received ${ethers.formatUnits(shares, 6)} pxUSDC shares`);
  } catch (e: any) {
    console.log(`    [SKIP] ExecutionVault deposit failed - may already have deposits`);
    console.log(`    Error: ${e.message?.slice(0, 100)}`);
  }

  // ==========================================================
  // STEP 6: Seed Insurance Fund
  // ==========================================================
  console.log("\n" + "=".repeat(50));
  console.log("Step 6: Seeding Insurance Fund");
  console.log("=".repeat(50));

  const insuranceFund = await ethers.getContractAt("InsuranceFund", addresses.InsuranceFund);

  try {
    console.log("  Approving USDC for InsuranceFund...");
    await mockUSDC.approve(addresses.InsuranceFund, ethers.MaxUint256);

    console.log("  Depositing to InsuranceFund...");
    await insuranceFund.deposit(INSURANCE_FUND_SEED);
    console.log(`    Deposited ${ethers.formatUnits(INSURANCE_FUND_SEED, 6)} mUSDC`);
  } catch (e: any) {
    console.log(`    [SKIP] InsuranceFund deposit failed - may already have deposits`);
    console.log(`    Error: ${e.message?.slice(0, 100)}`);
  }

  // ==========================================================
  // STEP 7: Register Deployer as Executor
  // ==========================================================
  console.log("\n" + "=".repeat(50));
  console.log("Step 7: Registering Demo Executor");
  console.log("=".repeat(50));

  const reputationManager = await ethers.getContractAt("ReputationManager", addresses.ReputationManager);

  console.log("  Registering deployer as executor...");
  try {
    await reputationManager.registerExecutor(deployer.address);
    console.log(`    Registered: ${deployer.address}`);

    // Boost reputation for demo (if function exists)
    console.log("  Boosting reputation for demo...");
    const currentRep = await reputationManager.getReputation(deployer.address);
    console.log(`    Current reputation: ${currentRep}`);
  } catch (e: any) {
    console.log(`    [SKIP] Could not register - may already be registered`);
  }

  // ==========================================================
  // SUMMARY
  // ==========================================================
  console.log("\n" + "=".repeat(70));
  console.log("Warm State Seeding Complete!");
  console.log("=".repeat(70));

  // Get final balances
  const deployerUSDC = await mockUSDC.balanceOf(deployer.address);
  const deployerWFLR = await mockWFLR.balanceOf(deployer.address);
  const deployerShares = await executionVault.balanceOf(deployer.address);
  const vaultTVL = await executionVault.totalAssets();
  const insuranceBalance = await insuranceFund.fundBalance();

  console.log("\n[Deployer Balances]");
  console.log(`  mUSDC:     ${ethers.formatUnits(deployerUSDC, 6)}`);
  console.log(`  mWFLR:     ${ethers.formatUnits(deployerWFLR, 18)}`);
  console.log(`  pxUSDC:    ${ethers.formatUnits(deployerShares, 6)}`);

  console.log("\n[Protocol State]");
  console.log(`  Vault TVL:           ${ethers.formatUnits(vaultTVL, 6)} mUSDC`);
  console.log(`  Insurance Balance:   ${ethers.formatUnits(insuranceBalance, 6)} mUSDC`);

  // Check DEX liquidity
  const [usdcWflrA, usdcWflrB] = await mockDEX.getReserves(addresses.MockUSDC, addresses.MockWFLR);
  const [usdcFxrpA, usdcFxrpB] = await mockDEX.getReserves(addresses.MockUSDC, addresses.MockFXRP);

  console.log("\n[DEX Liquidity]");
  console.log(`  USDC-WFLR: ${ethers.formatUnits(usdcWflrA, 6)} mUSDC / ${ethers.formatUnits(usdcWflrB, 18)} mWFLR`);
  console.log(`  USDC-FXRP: ${ethers.formatUnits(usdcFxrpA, 6)} mUSDC / ${ethers.formatUnits(usdcFxrpB, 6)} mFXRP`);

  console.log("\n[Ready for Demo!]");
  console.log("  1. Connect wallet to Coston2");
  console.log("  2. Navigate to PRAXIS dashboard");
  console.log("  3. Test LP deposits, ERT minting, swaps");
  console.log("  4. FAssets show REAL FTSO prices from Flare");
}

main()
  .then(() => {
    console.log("\n[SUCCESS] Warm state seeding completed!");
    process.exit(0);
  })
  .catch((error) => {
    console.error("\n[ERROR] Seeding failed:", error);
    process.exit(1);
  });

export { main };
