import { network } from "hardhat";
const { ethers } = await network.connect();
import { main as deployAll, DeployedAddresses } from "./mega-fork-deploy.js";

/**
 * PRAXIS Warm State Seed Script
 *
 * This script creates a realistic "lived-in" protocol state for demos:
 * - Multiple LP deposits over time
 * - Executors with varying reputation tiers
 * - Historical ERTs (some settled, some active)
 * - Insurance fund accumulation
 * - Realistic utilization and exposure
 *
 * Usage:
 *   # Start Anvil fork first:
 *   anvil --fork-url https://flare-api.flare.network/ext/C/rpc --port 8546 --chain-id 14
 *
 *   # Then run this script:
 *   npx hardhat run scripts/deploy/warm-state-seed.ts --network anvilFork
 */

// =============================================================================
//                            HELPER FUNCTIONS
// =============================================================================

function logSection(title: string) {
  console.log("\n" + "═".repeat(70));
  console.log(`  ${title}`);
  console.log("═".repeat(70));
}

function logStep(step: string) {
  console.log(`\n→ ${step}`);
}

function logSuccess(message: string) {
  console.log(`  ✓ ${message}`);
}

async function advanceTime(seconds: number) {
  await ethers.provider.send("evm_increaseTime", [seconds]);
  await ethers.provider.send("evm_mine", []);
}

async function advanceDays(days: number) {
  await advanceTime(days * 24 * 60 * 60);
}

// =============================================================================
//                            WARM STATE CREATION
// =============================================================================

async function createWarmState(deployed: DeployedAddresses) {
  const [deployer, lp1, lp2, lp3, executor1, executor2, executor3] = await ethers.getSigners();

  logSection("CREATING WARM PROTOCOL STATE");

  // Get contract instances
  const vault = await ethers.getContractAt("ExecutionVault", deployed.executionVault);
  const ertNFT = await ethers.getContractAt("ExecutionRightsNFT", deployed.executionRightsNFT);
  const reputationManager = await ethers.getContractAt("ReputationManager", deployed.reputationManager);
  const insuranceFund = await ethers.getContractAt("InsuranceFund", deployed.insuranceFund);
  const circuitBreaker = await ethers.getContractAt("CircuitBreaker", deployed.circuitBreaker);
  const mockOracle = await ethers.getContractAt("MockFlareOracle", deployed.mockFlareOracle);
  // Use deployed MockUSDC (allows minting for demo)
  const mockUsdc = await ethers.getContractAt("MockERC20", deployed.mockUsdc);

  // ==========================================================================
  // STEP 1: Fund test accounts with MockUSDC
  // ==========================================================================
  logStep("Minting MockUSDC for test accounts...");

  const lpAmounts = [
    { signer: lp1, amount: ethers.parseUnits("500000", 6), name: "LP1" },
    { signer: lp2, amount: ethers.parseUnits("250000", 6), name: "LP2" },
    { signer: lp3, amount: ethers.parseUnits("100000", 6), name: "LP3" },
    { signer: deployer, amount: ethers.parseUnits("1000000", 6), name: "Deployer" },
  ];

  // Mint MockUSDC to each test account
  for (const { signer, amount, name } of lpAmounts) {
    await mockUsdc.mint(signer.address, amount);
    const balance = await mockUsdc.balanceOf(signer.address);
    logSuccess(`${name}: ${ethers.formatUnits(balance, 6)} mUSDC`);
  }

  // ==========================================================================
  // STEP 2: Simulate Day 1 - Initial LP Deposits
  // ==========================================================================
  logSection("DAY 1: Initial LP Deposits");

  // LP1 deposits 200,000 mUSDC
  logStep("LP1 depositing 200,000 mUSDC...");
  const lp1Amount = ethers.parseUnits("200000", 6);
  await mockUsdc.connect(lp1).approve(deployed.executionVault, lp1Amount);
  await vault.connect(lp1).deposit(lp1Amount, lp1.address);
  logSuccess(`LP1 deposited ${ethers.formatUnits(lp1Amount, 6)} mUSDC`);

  // LP2 deposits 100,000 mUSDC
  logStep("LP2 depositing 100,000 mUSDC...");
  const lp2Amount = ethers.parseUnits("100000", 6);
  await mockUsdc.connect(lp2).approve(deployed.executionVault, lp2Amount);
  await vault.connect(lp2).deposit(lp2Amount, lp2.address);
  logSuccess(`LP2 deposited ${ethers.formatUnits(lp2Amount, 6)} mUSDC`);

  await advanceDays(1);

  // ==========================================================================
  // STEP 3: Simulate Day 2-3 - More LP Deposits
  // ==========================================================================
  logSection("DAY 2-3: Additional LP Deposits");

  // LP3 deposits 50,000 mUSDC
  logStep("LP3 depositing 50,000 mUSDC...");
  const lp3Amount = ethers.parseUnits("50000", 6);
  await mockUsdc.connect(lp3).approve(deployed.executionVault, lp3Amount);
  await vault.connect(lp3).deposit(lp3Amount, lp3.address);
  logSuccess(`LP3 deposited ${ethers.formatUnits(lp3Amount, 6)} mUSDC`);

  await advanceDays(2);

  // ==========================================================================
  // STEP 4: Simulate Day 4-7 - Executor Activity & Reputation Building
  // ==========================================================================
  logSection("DAY 4-7: Executor Registrations & Building Reputation");

  // Executor tiers from PraxisStructs.ExecutorTier enum:
  // 0: UNVERIFIED, 1: NOVICE, 2: VERIFIED, 3: ESTABLISHED, 4: ELITE

  // Executor 1 - Set to VERIFIED tier (simulating established executor)
  logStep("Setting executor1 to VERIFIED tier (simulating proven track record)...");
  await reputationManager.setExecutorTier(executor1.address, 2); // VERIFIED
  const rep1 = await reputationManager.getReputation(executor1.address);
  logSuccess(`Executor1: Tier ${rep1.tier} (VERIFIED - can use up to $10k)`);

  // Executor 2 - Set to NOVICE tier
  logStep("Setting executor2 to NOVICE tier...");
  await reputationManager.setExecutorTier(executor2.address, 1); // NOVICE
  const rep2 = await reputationManager.getReputation(executor2.address);
  logSuccess(`Executor2: Tier ${rep2.tier} (NOVICE - can use up to $1k)`);

  // Executor 3 - Brand new (UNVERIFIED - tier 0 by default)
  logStep("Executor3 is brand new (UNVERIFIED)...");
  const rep3 = await reputationManager.getReputation(executor3.address);
  logSuccess(`Executor3: Tier ${rep3.tier} (UNVERIFIED - can use up to $100)`);

  await advanceDays(4);

  // ==========================================================================
  // STEP 5: Simulate Day 8-10 - Insurance Fund Growth
  // ==========================================================================
  logSection("DAY 8-10: Insurance Fund Accumulation");

  // Simulate insurance fund collections (2% of profits from settlements)
  logStep("Funding insurance pool from historical settlements...");
  const insuranceDeposit = ethers.parseUnits("5000", 6);
  await mockUsdc.connect(deployer).approve(deployed.insuranceFund, insuranceDeposit);
  await insuranceFund.connect(deployer).deposit(insuranceDeposit);
  logSuccess(`Insurance fund: $${ethers.formatUnits(insuranceDeposit, 6)} deposited`);

  await advanceDays(3);

  // ==========================================================================
  // STEP 6: Simulate Day 11-14 - Active Protocol State
  // ==========================================================================
  logSection("DAY 11-14: Current Active State");

  // Additional LP deposit to show recent activity
  logStep("Deployer depositing 300,000 mUSDC...");
  const deployerAmount = ethers.parseUnits("300000", 6);
  await mockUsdc.connect(deployer).approve(deployed.executionVault, deployerAmount);
  await vault.connect(deployer).deposit(deployerAmount, deployer.address);
  logSuccess(`Deployer deposited ${ethers.formatUnits(deployerAmount, 6)} mUSDC`);

  await advanceDays(3);

  // ==========================================================================
  // SUMMARY
  // ==========================================================================
  logSection("WARM STATE SUMMARY");

  const totalAssets = await vault.totalAssets();
  const totalShares = await vault.totalSupply();
  const insuranceBalance = await insuranceFund.actualBalance();

  console.log("\n📊 VAULT STATUS:");
  console.log(`   Total Assets:    $${ethers.formatUnits(totalAssets, 6)}`);
  console.log(`   Total Shares:    ${ethers.formatUnits(totalShares, 6)}`);
  console.log(`   Insurance Fund:  $${ethers.formatUnits(insuranceBalance, 6)}`);

  console.log("\n👥 LP BALANCES:");
  for (const { signer, name } of lpAmounts) {
    const shares = await vault.balanceOf(signer.address);
    if (shares > 0) {
      const assets = await vault.previewRedeem(shares);
      console.log(`   ${name}: ${ethers.formatUnits(shares, 6)} shares (~$${ethers.formatUnits(assets, 6)})`);
    }
  }

  console.log("\n🎯 EXECUTOR TIERS:");
  console.log(`   Executor1 (${executor1.address.slice(0, 8)}...): Tier ${rep1.tier} (VERIFIED)`);
  console.log(`   Executor2 (${executor2.address.slice(0, 8)}...): Tier ${rep2.tier} (NOVICE)`);
  console.log(`   Executor3 (${executor3.address.slice(0, 8)}...): Tier ${rep3.tier} (UNVERIFIED)`);

  console.log("\n📅 SIMULATED TIMELINE:");
  console.log("   Day 1:    Initial LP deposits ($300k)");
  console.log("   Day 2-3:  Additional deposits ($50k)");
  console.log("   Day 4-7:  Executor activity, reputation building");
  console.log("   Day 8-10: Insurance fund accumulation");
  console.log("   Day 11-14: Current state (today)");
  console.log("   Total:    ~14 days of protocol history");

  return {
    totalAssets,
    totalShares,
    insuranceBalance,
    executors: {
      executor1: { address: executor1.address, tier: rep1.tier },
      executor2: { address: executor2.address, tier: rep2.tier },
      executor3: { address: executor3.address, tier: rep3.tier },
    },
    lps: {
      lp1: lp1.address,
      lp2: lp2.address,
      lp3: lp3.address,
    },
  };
}

// =============================================================================
//                               MAIN
// =============================================================================

async function main() {
  console.log("╔════════════════════════════════════════════════════════════════╗");
  console.log("║         PRAXIS WARM STATE DEPLOYMENT                           ║");
  console.log("╠════════════════════════════════════════════════════════════════╣");
  console.log("║  This creates a realistic 'lived-in' protocol state for demos  ║");
  console.log("╚════════════════════════════════════════════════════════════════╝");

  // First, deploy all contracts
  console.log("\n📦 Running mega deployment first...\n");
  const deployed = await deployAll();

  // Then create warm state
  const warmState = await createWarmState(deployed);

  // Save warm state info
  const fs = await import("fs");
  const path = await import("path");
  const { fileURLToPath } = await import("url");
  const __filename = fileURLToPath(import.meta.url);
  const __dirname = path.dirname(__filename);
  const warmStatePath = path.join(__dirname, "../../warm-state-info.json");
  // Custom replacer to handle BigInt serialization
  const bigIntReplacer = (key: string, value: unknown) => {
    if (typeof value === 'bigint') {
      return value.toString();
    }
    return value;
  };
  fs.writeFileSync(warmStatePath, JSON.stringify({
    deployed,
    warmState,
    timestamp: new Date().toISOString(),
    simulatedDays: 14,
  }, bigIntReplacer, 2));

  console.log("\n╔════════════════════════════════════════════════════════════════╗");
  console.log("║              WARM STATE READY FOR DEMO!                        ║");
  console.log("╚════════════════════════════════════════════════════════════════╝");
  console.log(`\n📁 State saved to: ${warmStatePath}`);
  console.log("\n🚀 The protocol now appears to have been running for ~14 days!");
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error("\n❌ Error:", error);
    process.exit(1);
  });
