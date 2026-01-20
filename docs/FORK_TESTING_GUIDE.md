# PRAXIS Fork Testing Guide

This guide details how to run PRAXIS against a Flare mainnet fork for development and testing purposes.

## Table of Contents

1. [Prerequisites](#prerequisites)
2. [Starting the Fork](#starting-the-fork)
3. [Understanding What Works](#understanding-what-works)
4. [Deployment Process](#deployment-process)
5. [Mocking FTSO Oracle](#mocking-ftso-oracle)
6. [Mega Deploy Script](#mega-deploy-script)
7. [Testing Workflows](#testing-workflows)
8. [Troubleshooting](#troubleshooting)

---

## Prerequisites

### Required Software

```bash
# Install Foundry (includes Anvil)
curl -L https://foundry.paradigm.xyz | bash
foundryup

# Verify installation
anvil --version

# Install Node dependencies
cd web3
npm install
```

### Environment Setup

Create a `.env` file in the `web3` directory:

```bash
# .env
PRIVATE_KEY=0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80
FLARE_RPC_URL=https://flare-api.flare.network/ext/C/rpc
```

---

## Starting the Fork

### Option 1: Basic Anvil Fork

```bash
# Start Anvil forking Flare mainnet
anvil \
  --fork-url https://flare-api.flare.network/ext/C/rpc \
  --port 8546 \
  --chain-id 14 \
  --block-time 1
```

### Option 2: Fork with Auto-Impersonation

```bash
# Fork with USDC whale impersonation for testing
anvil \
  --fork-url https://flare-api.flare.network/ext/C/rpc \
  --port 8546 \
  --chain-id 14 \
  --block-time 1 \
  --accounts 10 \
  --balance 10000
```

### Option 3: Fork at Specific Block (Reproducible)

```bash
# Fork at a specific block for reproducible tests
anvil \
  --fork-url https://flare-api.flare.network/ext/C/rpc \
  --fork-block-number 35000000 \
  --port 8546 \
  --chain-id 14
```

### Verify Fork is Running

```bash
# Check block number
cast block-number --rpc-url http://127.0.0.1:8546

# Check chain ID
cast chain-id --rpc-url http://127.0.0.1:8546
# Should return: 14
```

---

## Understanding What Works

### External Protocols Status

| Protocol | Works on Fork? | Notes |
|----------|----------------|-------|
| **SparkDEX V3** | ✅ Yes | Spot swaps work with existing liquidity |
| **SparkDEX Eternal** | ✅ Yes | Perp trading (positions frozen at fork time) |
| **BlazeSwap** | ✅ Yes | V2 swaps work |
| **Sceptre (sFLR)** | ✅ Yes | Staking/unstaking works |
| **Kinetic** | ✅ Yes | Supply/borrow works |
| **FTSO v2** | ❌ Stale | Prices frozen at fork time |
| **Enosys V3** | ⚠️ Partial | Some addresses unverified |

### What Needs Mocking

1. **FTSO Oracle Prices** - Prices are frozen at fork block time
2. **Block Timestamps** - May need `vm.warp()` for time-dependent logic
3. **PRAXIS Contracts** - Must be deployed fresh

---

## Deployment Process

### Deployment Order

```
Phase 1: Oracle & Verification
├── FlareOracle (or use MockFlareOracle)
└── FDCVerifier

Phase 2-3: DEX Adapters
├── SwapRouter
├── SparkDEXAdapter
├── BlazeSwapAdapter
└── EnosysAdapter (if addresses available)

Phase 4: Yield Adapters
├── YieldRouter
├── SceptreAdapter
└── KineticAdapter

Phase 5: Perpetual Adapters
├── PerpetualRouter
└── SparkDEXEternalAdapter

Phase 6: Execution Rights System
├── ReputationManager
├── ExecutionVault
├── UtilizationController
├── CircuitBreaker
├── ExposureManager
├── InsuranceFund
├── PositionManager
├── ExecutionRightsNFT
└── ExecutionController

Phase 7: Settlement & Gateway
├── SettlementEngine
└── PraxisGateway
```

---

## Mocking FTSO Oracle

### Why Mocking is Needed

On a fork, FTSO prices are frozen at the block you forked from. For testing scenarios that depend on price movements or fresh prices, you need to mock the oracle.

### Option 1: Deploy MockFlareOracle

```solidity
// Deploy mock oracle instead of using real FTSO
MockFlareOracle mockOracle = new MockFlareOracle();

// Set prices for tokens (18 decimals)
mockOracle.setTokenPrice(USDC_ADDRESS, 1e18);      // $1.00
mockOracle.setTokenPrice(WFLR_ADDRESS, 0.015e18); // $0.015
mockOracle.setTokenPrice(WETH_ADDRESS, 3500e18);  // $3500
```

### Option 2: Use Anvil's `vm.mockCall`

```solidity
// In your test setup
bytes memory mockReturn = abi.encode(
    uint256(1e18),           // price
    uint64(block.timestamp)  // fresh timestamp
);

vm.mockCall(
    FTSO_V2_ADDRESS,
    abi.encodeWithSignature("getFeedById(bytes21)"),
    mockReturn
);
```

### Option 3: Storage Manipulation

```bash
# Set price directly in FTSO storage using cast
cast send $FTSO_ADDRESS \
  --rpc-url http://127.0.0.1:8546 \
  --unlocked \
  --from $ADMIN_ADDRESS \
  "setPrice(bytes21,uint256)" \
  $FEED_ID \
  $PRICE
```

---

## Mega Deploy Script

Save this as `scripts/deploy/mega-fork-deploy.ts`:

```typescript
import { ethers, network } from "hardhat";

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
  console.log("\n" + "═".repeat(70));
  console.log("PHASE 1: Mock Oracle Deployment");
  console.log("═".repeat(70));

  console.log("\n→ Deploying MockFlareOracle...");
  const MockFlareOracle = await ethers.getContractFactory("MockFlareOracle");
  const mockOracle = await MockFlareOracle.deploy();
  await mockOracle.waitForDeployment();
  deployed.mockFlareOracle = await mockOracle.getAddress();
  console.log(`  ✓ MockFlareOracle: ${deployed.mockFlareOracle}`);

  // Set initial prices
  console.log("\n→ Setting initial token prices...");
  const tokens = [
    { addr: EXTERNAL.USDC, price: ethers.parseEther("1"), name: "USDC" },
    { addr: EXTERNAL.USDT, price: ethers.parseEther("1"), name: "USDT" },
    { addr: EXTERNAL.WFLR, price: ethers.parseEther("0.015"), name: "WFLR" },
    { addr: EXTERNAL.WETH, price: ethers.parseEther("3500"), name: "WETH" },
    { addr: EXTERNAL.sFLR, price: ethers.parseEther("0.016"), name: "sFLR" },
    { addr: EXTERNAL.FXRP, price: ethers.parseEther("0.50"), name: "FXRP" },
    { addr: ethers.ZeroAddress, price: ethers.parseEther("0.015"), name: "FLR (native)" },
  ];

  for (const token of tokens) {
    await mockOracle.setTokenPrice(token.addr, token.price);
    console.log(`  ✓ ${token.name}: $${ethers.formatEther(token.price)}`);
  }

  // =========================================================================
  //                         PHASE 2: DEX ADAPTERS
  // =========================================================================
  console.log("\n" + "═".repeat(70));
  console.log("PHASE 2: DEX Adapters Deployment");
  console.log("═".repeat(70));

  // SwapRouter
  console.log("\n→ Deploying SwapRouter...");
  const SwapRouter = await ethers.getContractFactory("SwapRouter");
  const swapRouter = await SwapRouter.deploy();
  await swapRouter.waitForDeployment();
  deployed.swapRouter = await swapRouter.getAddress();
  console.log(`  ✓ SwapRouter: ${deployed.swapRouter}`);

  // SparkDEXAdapter
  console.log("\n→ Deploying SparkDEXAdapter...");
  const SparkDEXAdapter = await ethers.getContractFactory("SparkDEXAdapter");
  const sparkDEXAdapter = await SparkDEXAdapter.deploy(
    EXTERNAL.SPARKDEX.router,
    EXTERNAL.SPARKDEX.quoter,
    EXTERNAL.SPARKDEX.factory
  );
  await sparkDEXAdapter.waitForDeployment();
  deployed.sparkDEXAdapter = await sparkDEXAdapter.getAddress();
  console.log(`  ✓ SparkDEXAdapter: ${deployed.sparkDEXAdapter}`);

  // BlazeSwapAdapter
  console.log("\n→ Deploying BlazeSwapAdapter...");
  const BlazeSwapAdapter = await ethers.getContractFactory("BlazeSwapAdapter");
  const blazeSwapAdapter = await BlazeSwapAdapter.deploy(
    EXTERNAL.BLAZESWAP.router,
    EXTERNAL.BLAZESWAP.factory,
    EXTERNAL.WFLR
  );
  await blazeSwapAdapter.waitForDeployment();
  deployed.blazeSwapAdapter = await blazeSwapAdapter.getAddress();
  console.log(`  ✓ BlazeSwapAdapter: ${deployed.blazeSwapAdapter}`);

  // Register DEX adapters
  console.log("\n→ Registering DEX adapters with SwapRouter...");
  await swapRouter.addAdapter(deployed.sparkDEXAdapter);
  await swapRouter.addAdapter(deployed.blazeSwapAdapter);
  console.log("  ✓ Adapters registered");

  // =========================================================================
  //                         PHASE 3: YIELD ADAPTERS
  // =========================================================================
  console.log("\n" + "═".repeat(70));
  console.log("PHASE 3: Yield Adapters Deployment");
  console.log("═".repeat(70));

  // YieldRouter
  console.log("\n→ Deploying YieldRouter...");
  const YieldRouter = await ethers.getContractFactory("YieldRouter");
  const yieldRouter = await YieldRouter.deploy();
  await yieldRouter.waitForDeployment();
  deployed.yieldRouter = await yieldRouter.getAddress();
  console.log(`  ✓ YieldRouter: ${deployed.yieldRouter}`);

  // SceptreAdapter
  console.log("\n→ Deploying SceptreAdapter...");
  const SceptreAdapter = await ethers.getContractFactory("SceptreAdapter");
  const sceptreAdapter = await SceptreAdapter.deploy(EXTERNAL.SCEPTRE.sFLR, EXTERNAL.WFLR);
  await sceptreAdapter.waitForDeployment();
  deployed.sceptreAdapter = await sceptreAdapter.getAddress();
  console.log(`  ✓ SceptreAdapter: ${deployed.sceptreAdapter}`);

  // KineticAdapter
  console.log("\n→ Deploying KineticAdapter...");
  const KineticAdapter = await ethers.getContractFactory("KineticAdapter");
  const kineticAdapter = await KineticAdapter.deploy(EXTERNAL.KINETIC.comptroller);
  await kineticAdapter.waitForDeployment();
  deployed.kineticAdapter = await kineticAdapter.getAddress();
  console.log(`  ✓ KineticAdapter: ${deployed.kineticAdapter}`);

  // Initialize Kinetic markets
  console.log("\n→ Initializing Kinetic markets...");
  await kineticAdapter.initializeMarkets();
  const markets = await kineticAdapter.getSupportedMarkets();
  console.log(`  ✓ Found ${markets.length} Kinetic markets`);

  // Register yield adapters
  console.log("\n→ Registering yield adapters...");
  await yieldRouter.addStakingAdapter(deployed.sceptreAdapter);
  await yieldRouter.addLendingAdapter(deployed.kineticAdapter);
  console.log("  ✓ Yield adapters registered");

  // =========================================================================
  //                       PHASE 4: PERPETUAL ADAPTERS
  // =========================================================================
  console.log("\n" + "═".repeat(70));
  console.log("PHASE 4: Perpetual Adapters Deployment");
  console.log("═".repeat(70));

  // PerpetualRouter
  console.log("\n→ Deploying PerpetualRouter...");
  const PerpetualRouter = await ethers.getContractFactory("PerpetualRouter");
  const perpetualRouter = await PerpetualRouter.deploy();
  await perpetualRouter.waitForDeployment();
  deployed.perpetualRouter = await perpetualRouter.getAddress();
  console.log(`  ✓ PerpetualRouter: ${deployed.perpetualRouter}`);

  // SparkDEXEternalAdapter
  console.log("\n→ Deploying SparkDEXEternalAdapter...");
  const SparkDEXEternalAdapter = await ethers.getContractFactory("SparkDEXEternalAdapter");
  const sparkDEXEternalAdapter = await SparkDEXEternalAdapter.deploy(
    EXTERNAL.SPARKDEX_ETERNAL.orderBook,
    EXTERNAL.SPARKDEX_ETERNAL.store,
    EXTERNAL.SPARKDEX_ETERNAL.positionManager
  );
  await sparkDEXEternalAdapter.waitForDeployment();
  deployed.sparkDEXEternalAdapter = await sparkDEXEternalAdapter.getAddress();
  console.log(`  ✓ SparkDEXEternalAdapter: ${deployed.sparkDEXEternalAdapter}`);

  // Register perpetual adapter
  console.log("\n→ Registering perpetual adapter...");
  await perpetualRouter.addAdapter(deployed.sparkDEXEternalAdapter);
  console.log("  ✓ Perpetual adapter registered");

  // =========================================================================
  //                    PHASE 5: EXECUTION RIGHTS SYSTEM
  // =========================================================================
  console.log("\n" + "═".repeat(70));
  console.log("PHASE 5: Execution Rights System");
  console.log("═".repeat(70));

  // ReputationManager
  console.log("\n→ Deploying ReputationManager...");
  const ReputationManager = await ethers.getContractFactory("ReputationManager");
  const reputationManager = await ReputationManager.deploy();
  await reputationManager.waitForDeployment();
  deployed.reputationManager = await reputationManager.getAddress();
  console.log(`  ✓ ReputationManager: ${deployed.reputationManager}`);

  // ExecutionVault
  console.log("\n→ Deploying ExecutionVault...");
  const ExecutionVault = await ethers.getContractFactory("ExecutionVault");
  const executionVault = await ExecutionVault.deploy(
    EXTERNAL.USDC,
    "PRAXIS Vault Shares",
    "pxUSDC"
  );
  await executionVault.waitForDeployment();
  deployed.executionVault = await executionVault.getAddress();
  console.log(`  ✓ ExecutionVault: ${deployed.executionVault}`);

  // UtilizationController
  console.log("\n→ Deploying UtilizationController...");
  const UtilizationController = await ethers.getContractFactory("UtilizationController");
  const utilizationController = await UtilizationController.deploy(deployed.executionVault);
  await utilizationController.waitForDeployment();
  deployed.utilizationController = await utilizationController.getAddress();
  console.log(`  ✓ UtilizationController: ${deployed.utilizationController}`);

  // CircuitBreaker
  console.log("\n→ Deploying CircuitBreaker...");
  const CircuitBreaker = await ethers.getContractFactory("CircuitBreaker");
  const circuitBreaker = await CircuitBreaker.deploy(deployed.executionVault, 0);
  await circuitBreaker.waitForDeployment();
  deployed.circuitBreaker = await circuitBreaker.getAddress();
  console.log(`  ✓ CircuitBreaker: ${deployed.circuitBreaker}`);

  // ExposureManager
  console.log("\n→ Deploying ExposureManager...");
  const ExposureManager = await ethers.getContractFactory("ExposureManager");
  const exposureManager = await ExposureManager.deploy(deployed.executionVault);
  await exposureManager.waitForDeployment();
  deployed.exposureManager = await exposureManager.getAddress();
  console.log(`  ✓ ExposureManager: ${deployed.exposureManager}`);

  // InsuranceFund
  console.log("\n→ Deploying InsuranceFund...");
  const InsuranceFund = await ethers.getContractFactory("InsuranceFund");
  const insuranceFund = await InsuranceFund.deploy(deployed.executionVault, EXTERNAL.USDC);
  await insuranceFund.waitForDeployment();
  deployed.insuranceFund = await insuranceFund.getAddress();
  console.log(`  ✓ InsuranceFund: ${deployed.insuranceFund}`);

  // PositionManager
  console.log("\n→ Deploying PositionManager...");
  const PositionManager = await ethers.getContractFactory("PositionManager");
  const positionManager = await PositionManager.deploy(deployed.mockFlareOracle);
  await positionManager.waitForDeployment();
  deployed.positionManager = await positionManager.getAddress();
  console.log(`  ✓ PositionManager: ${deployed.positionManager}`);

  // ExecutionRightsNFT
  console.log("\n→ Deploying ExecutionRightsNFT...");
  const ExecutionRightsNFT = await ethers.getContractFactory("ExecutionRightsNFT");
  const executionRightsNFT = await ExecutionRightsNFT.deploy(
    deployed.reputationManager,
    deployed.executionVault
  );
  await executionRightsNFT.waitForDeployment();
  deployed.executionRightsNFT = await executionRightsNFT.getAddress();
  console.log(`  ✓ ExecutionRightsNFT: ${deployed.executionRightsNFT}`);

  // ExecutionController
  console.log("\n→ Deploying ExecutionController...");
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
  console.log(`  ✓ ExecutionController: ${deployed.executionController}`);

  // =========================================================================
  //                    PHASE 6: SETTLEMENT & GATEWAY
  // =========================================================================
  console.log("\n" + "═".repeat(70));
  console.log("PHASE 6: Settlement & Gateway");
  console.log("═".repeat(70));

  // SettlementEngine
  console.log("\n→ Deploying SettlementEngine...");
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
  console.log(`  ✓ SettlementEngine: ${deployed.settlementEngine}`);

  // PraxisGateway
  console.log("\n→ Deploying PraxisGateway...");
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
  console.log(`  ✓ PraxisGateway: ${deployed.praxisGateway}`);

  // =========================================================================
  //                         PHASE 7: WIRING
  // =========================================================================
  console.log("\n" + "═".repeat(70));
  console.log("PHASE 7: Wiring Components");
  console.log("═".repeat(70));

  console.log("\n→ Wiring ExecutionVault...");
  await executionVault.setExecutionController(deployed.executionController);
  await executionVault.setUtilizationController(deployed.utilizationController);
  await executionVault.setCircuitBreaker(deployed.circuitBreaker);
  await executionVault.setSettlementEngine(deployed.settlementEngine);
  console.log("  ✓ ExecutionVault wired");

  console.log("\n→ Wiring ExecutionRightsNFT...");
  await executionRightsNFT.setExecutionController(deployed.executionController);
  await executionRightsNFT.setCircuitBreaker(deployed.circuitBreaker);
  await executionRightsNFT.setSettlementEngine(deployed.settlementEngine);
  console.log("  ✓ ExecutionRightsNFT wired");

  console.log("\n→ Wiring PositionManager...");
  await positionManager.setExecutionController(deployed.executionController);
  console.log("  ✓ PositionManager wired");

  console.log("\n→ Wiring ExposureManager...");
  await exposureManager.setExecutionController(deployed.executionController);
  console.log("  ✓ ExposureManager wired");

  console.log("\n→ Wiring ExecutionController...");
  await executionController.setCircuitBreaker(deployed.circuitBreaker);
  console.log("  ✓ ExecutionController wired");

  console.log("\n→ Wiring SettlementEngine...");
  await settlementEngine.setGateway(deployed.praxisGateway);
  console.log("  ✓ SettlementEngine wired");

  // =========================================================================
  //                    PHASE 8: ADAPTER TYPE CONFIG
  // =========================================================================
  console.log("\n" + "═".repeat(70));
  console.log("PHASE 8: Adapter Type Configuration");
  console.log("═".repeat(70));

  console.log("\n→ Configuring adapter types on SettlementEngine...");
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
  console.log("  ✓ Adapter types configured");

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
    const envKey = key.replace(/([A-Z])/g, '_$1').toUpperCase();
    console.log(`${envKey}=${value}`);
  });
  console.log("```");

  return deployed;
}

// =============================================================================
//                               EXECUTE
// =============================================================================

main()
  .then((addresses) => {
    console.log("\n✅ Mega deployment successful!");
    process.exit(0);
  })
  .catch((error) => {
    console.error("\n❌ Deployment failed:", error);
    process.exit(1);
  });

export { main, DeployedAddresses };
```

---

## Testing Workflows

### Test 1: LP Deposit Flow

```bash
# After deployment, test LP deposit
cast send $USDC_ADDRESS \
  "approve(address,uint256)" \
  $EXECUTION_VAULT \
  1000000000 \
  --rpc-url http://127.0.0.1:8546 \
  --private-key $PRIVATE_KEY

cast send $EXECUTION_VAULT \
  "deposit(uint256,address)" \
  1000000000 \
  $DEPLOYER_ADDRESS \
  --rpc-url http://127.0.0.1:8546 \
  --private-key $PRIVATE_KEY
```

### Test 2: Mint ERT

```bash
# Mint execution rights token
cast send $PRAXIS_GATEWAY \
  "mintERT(uint256,uint256)" \
  1000000 \        # maxDrawdown (1 USDC)
  604800 \         # duration (7 days)
  --rpc-url http://127.0.0.1:8546 \
  --private-key $PRIVATE_KEY
```

### Test 3: Execute Swap via Adapter

```bash
# Execute a swap using allocated capital
cast send $EXECUTION_CONTROLLER \
  "execute(uint256,address,bytes)" \
  1 \              # tokenId
  $SPARKDEX_ADAPTER \
  $SWAP_CALLDATA \
  --rpc-url http://127.0.0.1:8546 \
  --private-key $PRIVATE_KEY
```

---

## Troubleshooting

### Problem: "Insufficient balance"

The deployer account needs FLR for gas. On Anvil fork, accounts start with 10,000 ETH equivalent:

```bash
# Check balance
cast balance $DEPLOYER_ADDRESS --rpc-url http://127.0.0.1:8546
```

### Problem: "FTSO prices stale"

Mock oracle prices need to be set:

```bash
# Update mock oracle timestamp
cast send $MOCK_ORACLE \
  "setTimestamp(uint64)" \
  $(date +%s) \
  --rpc-url http://127.0.0.1:8546 \
  --unlocked --from $DEPLOYER
```

### Problem: "Contract size too large"

SparkDEXEternalAdapter may exceed size limits. Ensure optimizer is enabled:

```javascript
// hardhat.config.ts
optimizer: {
  enabled: true,
  runs: 50  // Low runs for size optimization
}
```

### Problem: "Transaction reverted"

Check if external protocol has liquidity:

```bash
# Check BlazeSwap pair reserves
cast call $BLAZESWAP_FACTORY \
  "getPair(address,address)" \
  $TOKEN_A \
  $TOKEN_B \
  --rpc-url http://127.0.0.1:8546
```

---

## Quick Start Commands

```bash
# 1. Start Anvil fork
anvil --fork-url https://flare-api.flare.network/ext/C/rpc --port 8546 --chain-id 14

# 2. In another terminal, deploy everything
cd web3
npx hardhat run scripts/deploy/mega-fork-deploy.ts --network anvilFork

# 3. Run tests against fork
npx hardhat test --network anvilFork
```

---

## Shell Script: One-Command Setup

Save as `scripts/start-fork-env.sh`:

```bash
#!/bin/bash
set -e

echo "╔════════════════════════════════════════════════════════════════╗"
echo "║         PRAXIS Fork Environment Setup                          ║"
echo "╚════════════════════════════════════════════════════════════════╝"

# Configuration
FORK_RPC="https://flare-api.flare.network/ext/C/rpc"
LOCAL_PORT=8546
CHAIN_ID=14

# Colors
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m'

# Check if Anvil is installed
if ! command -v anvil &> /dev/null; then
    echo "❌ Anvil not found. Installing Foundry..."
    curl -L https://foundry.paradigm.xyz | bash
    source ~/.bashrc
    foundryup
fi

# Kill any existing Anvil process on the port
if lsof -i :$LOCAL_PORT > /dev/null 2>&1; then
    echo -e "${YELLOW}⚠️  Killing existing process on port $LOCAL_PORT${NC}"
    kill $(lsof -t -i :$LOCAL_PORT) 2>/dev/null || true
    sleep 2
fi

# Start Anvil in background
echo -e "${GREEN}🚀 Starting Anvil fork...${NC}"
anvil \
    --fork-url $FORK_RPC \
    --port $LOCAL_PORT \
    --chain-id $CHAIN_ID \
    --block-time 1 \
    --accounts 10 \
    --balance 10000 \
    > /tmp/anvil.log 2>&1 &

ANVIL_PID=$!
echo "   Anvil PID: $ANVIL_PID"

# Wait for Anvil to start
echo "   Waiting for Anvil to initialize..."
sleep 5

# Verify fork is running
BLOCK=$(cast block-number --rpc-url http://127.0.0.1:$LOCAL_PORT 2>/dev/null || echo "0")
if [ "$BLOCK" = "0" ]; then
    echo "❌ Anvil failed to start. Check /tmp/anvil.log"
    exit 1
fi

echo -e "${GREEN}✓ Fork running at block $BLOCK${NC}"

# Deploy contracts
echo -e "\n${GREEN}📦 Deploying PRAXIS contracts...${NC}"
cd "$(dirname "$0")/.."

npx hardhat run scripts/deploy/mega-fork-deploy.ts --network anvilFork

echo -e "\n${GREEN}╔════════════════════════════════════════════════════════════════╗${NC}"
echo -e "${GREEN}║         Environment Ready!                                     ║${NC}"
echo -e "${GREEN}╚════════════════════════════════════════════════════════════════╝${NC}"
echo ""
echo "Anvil RPC: http://127.0.0.1:$LOCAL_PORT"
echo "Chain ID:  $CHAIN_ID"
echo ""
echo "To stop: kill $ANVIL_PID"
```

Make it executable:

```bash
chmod +x scripts/start-fork-env.sh
./scripts/start-fork-env.sh
```

---

## Updating Client Addresses

After deployment, update `client/lib/contracts/addresses.ts`:

```typescript
export const PRAXIS_ADDRESSES = {
  14: {
    // Paste deployed addresses from script output
    PraxisGateway: '0x...',
    ExecutionVault: '0x...',
    ExecutionRightsNFT: '0x...',
    // ... etc
  },
  // For fork testing, use same addresses since chainId is 14
};
```
