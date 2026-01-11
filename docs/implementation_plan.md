# PRAXIS - Detailed Implementation Plan with Micro-Steps

**Version:** v4.0
**Target Chain:** Flare (Coston2 Testnet -> Mainnet)
**Code Locations:** `web3/` for smart contracts, `client/` for frontend

---

## 📊 Implementation Progress

**Last Updated:** January 11, 2026

### Phase Status Overview

| Phase | Name | Status | Progress |
|-------|------|--------|----------|
| 1 | Foundation - Project Setup & FTSO Integration | ✅ **COMPLETE** | 100% |
| 2 | DEX Aggregation | ⬜ Not Started | 0% |
| 3 | Yield Integration | ⬜ Not Started | 0% |
| 4 | Perpetuals Integration | ⬜ Not Started | 0% |
| 5 | FAssets Support | ⬜ Not Started | 0% |
| 6 | Strategy Engine | ⬜ Not Started | 0% |
| 7 | PraxisGateway | ⬜ Not Started | 0% |
| 8 | Security & Audit | ⬜ Not Started | 0% |
| 9 | Mainnet Deployment | ⬜ Not Started | 0% |

### Deployed Contracts (Coston2 Testnet)

| Contract | Address | Verified |
|----------|---------|----------|
| FlareOracle | `0x0979854b028210Cf492a3bCB990B6a1D45d89eCc` | ⬜ |
| FDCVerifier | `0xe667bEf52f1EAD93Cb0375639a4eA36001d4edf3` | ⬜ |

### Test Results Summary

| Test Suite | Tests | Status |
|------------|-------|--------|
| Unit Tests (Local) | 52 | ✅ All Passing |
| Integration Tests (Coston2) | 15 | ✅ All Passing |

### Phase 1 Completion Details

#### 1.1 Project Infrastructure Setup ✅
- [x] 1.1.1 Initialize Hardhat Project Structure
  - Hardhat 3 configured with Solidity 0.8.28 (EVM: cancun)
  - All Flare networks configured (Coston2, Flare, Coston, Songbird)
  - Flare periphery contracts installed (`@flarenetwork/flare-periphery-contracts`)
- [x] 1.1.2 Create Contracts Directory Structure
  - `contracts/{core,adapters,oracles,strategies,interfaces/external,lib}`
  - `test/{unit,integration,fork,security}`
  - `scripts/{deploy,helpers}`
- [x] 1.1.3 Create Library Contracts
  - `PraxisStructs.sol` - All data structures
  - `PraxisErrors.sol` - Custom error definitions
  - `PraxisEvents.sol` - Event definitions

#### 1.2 FTSO v2 Oracle Integration ✅
- [x] 1.2.1 Research FTSO v2 Feed IDs
  - Created `scripts/helpers/feedIds.ts` with encoding functions
  - Validated 63 supported feeds on Coston2
  - Documented feed ID format (0x01 + ASCII name)
- [x] 1.2.2 Implement FlareOracle Contract
  - Dynamic ContractRegistry discovery
  - Price queries: `getPrice()`, `getPriceInWei()`, `getPriceWithCheck()`
  - Batch queries: `getMultiplePrices()`
  - Token-to-feed mappings: `setTokenFeed()`, `getTokenPriceUSD()`
  - Staleness checks (MAX_PRICE_AGE = 300 seconds)
- [x] 1.2.3 Deploy FlareOracle to Coston2
  - Deployed to: `0x0979854b028210Cf492a3bCB990B6a1D45d89eCc`
  - FTSO v2 connection verified (63 feeds discovered)

#### 1.3 FDC Integration ✅
- [x] 1.3.1 Research FDC Attestation Types
  - EVMTransaction, Payment, AddressValidity documented
  - FDC Protocol ID: 200
- [x] 1.3.2 Implement FDCVerifier Contract
  - `verifyEVMTransaction()`, `verifyPayment()`, `verifyAddressValidity()`
  - Proof data extraction helpers
  - Verified transaction/payment tracking
  - Deployed to: `0xe667bEf52f1EAD93Cb0375639a4eA36001d4edf3`

#### Live Price Data Verified (Coston2)
| Feed | Price | Decimals |
|------|-------|----------|
| FLR/USD | $0.0113 | 7 |
| BTC/USD | $90,728.50 | 2 |
| ETH/USD | $3,097.38 | 3 |
| XRP/USD | $2.09 | 6 |
| DOGE/USD | $0.14 | 6 |

---

## Implementation Philosophy

### Testing Principles
- **No Mock Data**: All tests run against live Coston2 testnet protocols
- **No Hardcoded Values**: All addresses, feed IDs, and configurations are dynamically discovered
- **End-to-End Verification**: Each micro-step includes verbose tests that validate the complete flow
- **Failure Detection**: Tests are designed to catch even minor discrepancies in returned values, gas usage, and state changes

### Address Discovery Pattern
All protocol addresses MUST be discovered dynamically:
```solidity
// CORRECT - Dynamic discovery via Flare's ContractRegistry
IFtsoV2 ftso = ContractRegistry.getFtsoV2();

// INCORRECT - Hardcoded address
IFtsoV2 ftso = IFtsoV2(0x1234...);
```

---

## Phase 1: Foundation - Project Setup & FTSO Integration ✅ COMPLETE

### 1.1 Project Infrastructure Setup ✅

#### 1.1.1 Initialize Hardhat Project Structure ✅
**Status:** COMPLETE
**Deliverable:** Properly configured Hardhat project with Flare network support

**Tasks:**
- 1.1.1.1 Verify existing hardhat.config.ts has correct Coston2 and Flare network configurations
- 1.1.1.2 Install Flare periphery contracts package: `@flarenetwork/flare-periphery-contracts`
- 1.1.1.3 Create the directory structure as specified in architecture
- 1.1.1.4 Configure TypeScript paths and compiler settings for Solidity 0.8.28

**Test 1.1.1-T1: Project Configuration Validation**
```bash
# Run from web3/
npx hardhat compile
```
**Expected:** Compilation succeeds with no errors
**Verbose Check:**
- Verify Solidity version is 0.8.28
- Verify EVM version is "cancun"
- Verify all networks (coston2, flare, coston, songbird) are accessible

**Test 1.1.1-T2: Flare Periphery Package Installation**
```typescript
// test/unit/setup/FlarePackage.test.ts
import { ContractRegistry } from "@flarenetwork/flare-periphery-contracts/coston2/ContractRegistry.sol";
// Should compile without errors
```
**Expected:** Import resolves correctly

---

#### 1.1.2 Create Contracts Directory Structure ✅
**Status:** COMPLETE
**Deliverable:** Complete folder structure for all contract types

**Tasks:**
- 1.1.2.1 Create `contracts/core/` directory
- 1.1.2.2 Create `contracts/adapters/` directory
- 1.1.2.3 Create `contracts/oracles/` directory
- 1.1.2.4 Create `contracts/strategies/` directory
- 1.1.2.5 Create `contracts/interfaces/external/` directory
- 1.1.2.6 Create `contracts/lib/` directory
- 1.1.2.7 Create test directories: `test/unit/`, `test/integration/`, `test/fork/`
- 1.1.2.8 Create deployment scripts directory: `scripts/deploy/`
- 1.1.2.9 Create helper scripts directory: `scripts/helpers/`

**Test 1.1.2-T1: Directory Structure Verification**
```bash
# Verify all directories exist
ls -la contracts/core contracts/adapters contracts/oracles contracts/strategies contracts/interfaces/external contracts/lib
ls -la test/unit test/integration test/fork
ls -la scripts/deploy scripts/helpers
```
**Expected:** All directories exist and are accessible

---

#### 1.1.3 Create Library Contracts ✅
**Status:** COMPLETE
**Deliverable:** Shared data structures, errors, and events

**Tasks:**
- 1.1.3.1 Create `contracts/lib/PraxisStructs.sol` with all data structures (RiskLevel, ActionType, PositionSide, Action, Quote, YieldOption, Position, FAssetInfo, PerpPosition, PerpMarket, SwapParams, Hop, Route)
- 1.1.3.2 Create `contracts/lib/PraxisErrors.sol` with custom error definitions
- 1.1.3.3 Create `contracts/lib/PraxisEvents.sol` with event definitions

**Test 1.1.3-T1: Library Compilation**
```bash
npx hardhat compile
```
**Expected:** All library contracts compile without errors

**Test 1.1.3-T2: Struct Size Validation**
```typescript
// test/unit/lib/PraxisStructs.test.ts
describe("PraxisStructs", () => {
  it("should have correct enum values", async () => {
    // Deploy a test contract that uses PraxisStructs
    // Verify RiskLevel.CONSERVATIVE = 0
    // Verify RiskLevel.MODERATE = 1
    // Verify RiskLevel.AGGRESSIVE = 2
    // Verify all ActionType values
    // Verify PositionSide values
  });
});
```

---

### 1.2 FTSO v2 Oracle Integration ✅

#### 1.2.1 Research FTSO v2 Feed IDs ✅
**Status:** COMPLETE
**Deliverable:** Documentation of all available feed IDs and their formats

**Tasks:**
- 1.2.1.1 Query Coston2 FTSO v2 contract for available feeds
- 1.2.1.2 Document the feed ID format (0x01 prefix for crypto assets)
- 1.2.1.3 Document decimal precision for each feed
- 1.2.1.4 Create a feed ID constants file in `scripts/helpers/feedIds.ts`

**Test 1.2.1-T1: Feed Discovery on Coston2**
```typescript
// scripts/helpers/discoverFeeds.ts
// Connect to Coston2
// Query ContractRegistry for FtsoV2 address
// Query for FLR/USD, BTC/USD, XRP/USD, ETH/USD, DOGE/USD
// Log feed values and timestamps
```
**Expected:** All feed IDs return valid price data with timestamps within last 5 minutes

---

#### 1.2.2 Implement FlareOracle Contract ✅
**Status:** COMPLETE
**Deliverable:** Working FlareOracle.sol that wraps FTSO v2

**Tasks:**
- 1.2.2.1 Create `contracts/oracles/FlareOracle.sol` with ContractRegistry import
- 1.2.2.2 Implement `getPrice(bytes21 feedId)` function using ContractRegistry.getFtsoV2()
- 1.2.2.3 Implement staleness check with MAX_PRICE_AGE constant (300 seconds)
- 1.2.2.4 Implement `getPriceWithCheck(bytes21 feedId)` with staleness validation
- 1.2.2.5 Implement token-to-feed mapping with `setTokenFeed()` admin function
- 1.2.2.6 Implement `getTokenPriceUSD(address token)` lookup function
- 1.2.2.7 Add owner-based access control for configuration
- 1.2.2.8 Add custom errors: `PriceStale`, `FeedNotConfigured`, `Unauthorized`
- 1.2.2.9 Add events: `FeedConfigured`

**Test 1.2.2-T1: FlareOracle Unit Tests**
```typescript
// test/unit/oracles/FlareOracle.test.ts
describe("FlareOracle", () => {
  describe("getPrice", () => {
    it("should return FLR/USD price from FTSO v2", async () => {
      // Deploy FlareOracle to Coston2 fork
      // Call getPrice with FLR_USD feed ID
      // Verify: value > 0
      // Verify: decimals is valid (typically 7 or 8)
      // Verify: timestamp is within last 5 minutes
    });

    it("should return BTC/USD price", async () => {
      // Similar test for BTC
    });

    it("should return XRP/USD price", async () => {
      // Similar test for XRP
    });

    it("should return DOGE/USD price", async () => {
      // Similar test for DOGE
    });

    it("should return ETH/USD price", async () => {
      // Similar test for ETH
    });
  });

  describe("getPriceWithCheck", () => {
    it("should revert PriceStale if price is older than MAX_PRICE_AGE", async () => {
      // This requires manipulating block.timestamp or using a stale feed
      // On testnet, verify the staleness check logic works
    });

    it("should return price if within MAX_PRICE_AGE", async () => {
      // Call with fresh feed
      // Verify price is returned
    });
  });

  describe("setTokenFeed", () => {
    it("should only allow owner to set feeds", async () => {
      // Call from non-owner, expect Unauthorized revert
    });

    it("should correctly map token to feed ID", async () => {
      // Set WFLR token address to FLR_USD feed
      // Call getTokenPriceUSD with WFLR address
      // Verify returns correct price
    });

    it("should emit FeedConfigured event", async () => {
      // Set feed
      // Verify event emission with correct parameters
    });
  });

  describe("getTokenPriceUSD", () => {
    it("should revert FeedNotConfigured for unknown token", async () => {
      // Call with unmapped token address
      // Expect FeedNotConfigured revert
    });
  });
});
```

---

#### 1.2.3 Deploy FlareOracle to Coston2 ✅
**Status:** COMPLETE - Deployed to `0x0979854b028210Cf492a3bCB990B6a1D45d89eCc`
**Deliverable:** Verified FlareOracle contract on Coston2 testnet

**Tasks:**
- 1.2.3.1 Create deployment script `scripts/deploy/01_FlareOracle.ts`
- 1.2.3.2 Deploy FlareOracle contract
- 1.2.3.3 Configure token feeds for known tokens (WFLR, USDC, etc.)
- 1.2.3.4 Verify contract on Coston2 block explorer
- 1.2.3.5 Save deployed address to `scripts/helpers/addresses.ts`

**Test 1.2.3-T1: Deployment Verification**
```typescript
// After deployment, run:
describe("FlareOracle Deployment", () => {
  it("should be deployed and verified on Coston2", async () => {
    // Load deployed address from addresses.ts
    // Connect to deployed contract
    // Call getPrice(FLR_USD)
    // Verify returns valid price
  });

  it("should have correct owner", async () => {
    // Verify owner is deployer address
  });

  it("should have feeds configured", async () => {
    // Check tokenFeeds mapping for WFLR
    // Verify it's mapped to FLR_USD
  });
});
```

---

### 1.3 FDC (Flare Data Connector) Integration ✅

#### 1.3.1 Research FDC Attestation Types ✅
**Status:** COMPLETE
**Deliverable:** Documentation of relevant attestation types for PRAXIS

**Tasks:**
- 1.3.1.1 Document EVMTransaction attestation type and use cases
- 1.3.1.2 Document Payment attestation type for BTC/DOGE/XRP
- 1.3.1.3 Document AddressValidity attestation type
- 1.3.1.4 Document BalanceDecreasingTransaction attestation type
- 1.3.1.5 Identify which attestation types are needed for FAsset price verification
- 1.3.1.6 Document FDC verifier endpoints for testnet and mainnet

**Test 1.3.1-T1: FDC Endpoint Accessibility**
```typescript
// scripts/helpers/testFdcEndpoints.ts
// Test that verifier endpoints respond
// https://fdc-verifiers-testnet.flare.network/
// Verify API documentation is accessible
```

---

#### 1.3.2 Implement FDCVerifier Contract ✅
**Status:** COMPLETE - Deployed to `0xe667bEf52f1EAD93Cb0375639a4eA36001d4edf3`
**Deliverable:** Contract that can verify FDC proofs on-chain

**Tasks:**
- 1.3.2.1 Create `contracts/oracles/FDCVerifier.sol`
- 1.3.2.2 Import IFdcVerification from Flare periphery contracts
- 1.3.2.3 Implement `verifyEVMTransaction(proof)` wrapper
- 1.3.2.4 Implement `verifyPayment(proof)` wrapper for cross-chain payments
- 1.3.2.5 Implement `verifyAddressValidity(proof)` wrapper
- 1.3.2.6 Add helper functions to decode response data

**Test 1.3.2-T1: FDCVerifier Unit Tests**
```typescript
// test/unit/oracles/FDCVerifier.test.ts
describe("FDCVerifier", () => {
  describe("verifyEVMTransaction", () => {
    it("should verify a valid EVMTransaction proof from Sepolia", async () => {
      // This is a complex integration test
      // 1. Use an existing transaction on Sepolia
      // 2. Request attestation via FDC verifier API
      // 3. Wait for round finalization
      // 4. Get proof from DA Layer
      // 5. Submit to FDCVerifier contract
      // 6. Verify it returns true
    });

    it("should reject an invalid proof", async () => {
      // Submit malformed proof
      // Verify returns false
    });
  });
});
```

---

## Phase 2: DEX Aggregation

### 2.1 Adapter Interface Design

#### 2.1.1 Create Base Adapter Interfaces
**Deliverable:** Standard interfaces for all DEX adapters

**Tasks:**
- 2.1.1.1 Create `contracts/adapters/IAdapter.sol` with:
  - `name()` - returns adapter name
  - `getQuote(tokenIn, tokenOut, amountIn)` - view function for quotes
  - `swap(tokenIn, tokenOut, amountIn, minAmountOut, to, extraData)` - execute swap
- 2.1.1.2 Create `contracts/adapters/BaseAdapter.sol` abstract contract with:
  - Common validation logic
  - Token approval helpers
  - Emergency withdrawal function
- 2.1.1.3 Document the extraData format for each adapter type

**Test 2.1.1-T1: Interface Compilation**
```bash
npx hardhat compile
```
**Expected:** IAdapter.sol and BaseAdapter.sol compile without errors

---

### 2.2 SparkDEX V3 Adapter

#### 2.2.1 Research SparkDEX V3 Interface
**Deliverable:** Complete interface documentation for SparkDEX

**Tasks:**
- 2.2.1.1 Find SparkDEX Router address on Coston2 (dynamically via their registry or docs)
- 2.2.1.2 Document the swap function signature
- 2.2.1.3 Document the quote function signature
- 2.2.1.4 Document pool fee tiers (100, 500, 3000, 10000 bps)
- 2.2.1.5 Create `contracts/interfaces/external/ISparkDEXRouter.sol`
- 2.2.1.6 Create `contracts/interfaces/external/ISparkDEXQuoter.sol`
- 2.2.1.7 Document path encoding format for multi-hop swaps

**Test 2.2.1-T1: SparkDEX Interface Verification**
```typescript
// test/integration/sparkdex/InterfaceTest.ts
describe("SparkDEX Interface", () => {
  it("should connect to SparkDEX Router on Coston2", async () => {
    // Get SparkDEX router address (from their docs or registry)
    // Verify the contract exists at that address
    // Call a view function to verify interface compatibility
  });

  it("should have liquidity for WFLR/USDC pair", async () => {
    // Query SparkDEX for pool
    // Verify liquidity exists
  });
});
```

---

#### 2.2.2 Implement SparkDEXAdapter
**Deliverable:** Working adapter for SparkDEX V3 swaps

**Tasks:**
- 2.2.2.1 Create `contracts/adapters/SparkDEXAdapter.sol` extending BaseAdapter
- 2.2.2.2 Implement constructor to set router address (passed in, not hardcoded)
- 2.2.2.3 Implement `name()` returning "SparkDEX"
- 2.2.2.4 Implement `getQuote()` using SparkDEX quoter
- 2.2.2.5 Implement `swap()` with exact input swap
- 2.2.2.6 Handle fee tier selection in extraData
- 2.2.2.7 Implement multi-hop path encoding
- 2.2.2.8 Add slippage protection

**Test 2.2.2-T1: SparkDEXAdapter Quote Tests**
```typescript
// test/unit/adapters/SparkDEXAdapter.test.ts
describe("SparkDEXAdapter", () => {
  // These tests run on Coston2 fork with real liquidity

  describe("getQuote", () => {
    it("should return valid quote for WFLR -> USDC", async () => {
      const adapter = await deploySparkDEXAdapter();
      const wflrAddress = await getWFLRAddress(); // Dynamic discovery
      const usdcAddress = await getUSDCAddress(); // Dynamic discovery

      const [amountOut, gasEstimate] = await adapter.getQuote(
        wflrAddress,
        usdcAddress,
        ethers.parseEther("100") // 100 WFLR
      );

      // Verify amountOut > 0
      expect(amountOut).to.be.gt(0);

      // Verify gas estimate is reasonable (100k - 300k)
      expect(gasEstimate).to.be.gt(100000);
      expect(gasEstimate).to.be.lt(500000);

      // Log for verbose output
      console.log(`Quote: 100 WFLR -> ${ethers.formatUnits(amountOut, 6)} USDC`);
      console.log(`Gas estimate: ${gasEstimate}`);
    });

    it("should return 0 for pairs without liquidity", async () => {
      // Query a pair that doesn't exist
      // Verify returns (0, 0)
    });

    it("should handle different fee tiers", async () => {
      // Test 0.01%, 0.05%, 0.3%, 1% fee tiers
      // Verify quotes differ based on fee tier
    });
  });

  describe("swap", () => {
    it("should execute WFLR -> USDC swap successfully", async () => {
      // Setup: Get test WFLR from faucet or wrap FLR
      // Approve adapter
      // Execute swap
      // Verify: USDC balance increased
      // Verify: WFLR balance decreased
      // Verify: Actual output >= minAmountOut
    });

    it("should revert if slippage exceeds minAmountOut", async () => {
      // Set minAmountOut very high
      // Expect revert
    });

    it("should send output to specified recipient", async () => {
      // Swap with different recipient
      // Verify recipient receives tokens
    });
  });
});
```

---

### 2.3 Enosys Adapter

#### 2.3.1 Research Enosys Interface
**Deliverable:** Complete interface documentation for Enosys DEX

**Tasks:**
- 2.3.1.1 Find Enosys Router address on Coston2/Flare
- 2.3.1.2 Document the router interface (likely UniswapV2-style)
- 2.3.1.3 Create `contracts/interfaces/external/IEnosysRouter.sol`
- 2.3.1.4 Document available trading pairs

**Test 2.3.1-T1: Enosys Interface Verification**
```typescript
// test/integration/enosys/InterfaceTest.ts
describe("Enosys Interface", () => {
  it("should connect to Enosys Router on Coston2", async () => {
    // Similar to SparkDEX test
  });
});
```

---

#### 2.3.2 Implement EnosysAdapter
**Deliverable:** Working adapter for Enosys swaps

**Tasks:**
- 2.3.2.1 Create `contracts/adapters/EnosysAdapter.sol`
- 2.3.2.2 Implement `getQuote()` using getAmountsOut
- 2.3.2.3 Implement `swap()` with swapExactTokensForTokens
- 2.3.2.4 Handle multi-hop paths

**Test 2.3.2-T1: EnosysAdapter Tests**
```typescript
// test/unit/adapters/EnosysAdapter.test.ts
// Similar comprehensive tests as SparkDEXAdapter
```

---

### 2.4 BlazeSwap Adapter

#### 2.4.1 Research BlazeSwap Interface
**Deliverable:** Complete interface documentation for BlazeSwap

**Tasks:**
- 2.4.1.1 Find BlazeSwap Router address (V2-style router)
- 2.4.1.2 Create `contracts/interfaces/external/IBlazeSwapRouter.sol`
- 2.4.1.3 Document available pairs and liquidity

**Test 2.4.1-T1: BlazeSwap Interface Verification**
```typescript
// Similar pattern
```

---

#### 2.4.2 Implement BlazeSwapAdapter
**Deliverable:** Working adapter for BlazeSwap

**Tasks:**
- 2.4.2.1 Create `contracts/adapters/BlazeSwapAdapter.sol`
- 2.4.2.2 Implement standard V2 router integration
- 2.4.2.3 Implement quote and swap functions

**Test 2.4.2-T1: BlazeSwapAdapter Tests**
```typescript
// Similar comprehensive tests
```

---

### 2.5 SwapRouter Implementation

#### 2.5.1 Implement SwapRouter Core
**Deliverable:** DEX aggregator that finds best rates

**Tasks:**
- 2.5.1.1 Create `contracts/core/SwapRouter.sol`
- 2.5.1.2 Implement adapter registry with `addAdapter()` and `removeAdapter()`
- 2.5.1.3 Implement `getAllQuotes()` - queries all adapters
- 2.5.1.4 Implement `findBestRoute()` - returns adapter with best output
- 2.5.1.5 Implement `swap()` - executes through best route
- 2.5.1.6 Implement `swapVia()` - executes through specific adapter
- 2.5.1.7 Add ReentrancyGuard protection
- 2.5.1.8 Add deadline validation
- 2.5.1.9 Add events for swap execution
- 2.5.1.10 Add custom errors

**Test 2.5.1-T1: SwapRouter Unit Tests**
```typescript
// test/unit/core/SwapRouter.test.ts
describe("SwapRouter", () => {
  describe("adapter management", () => {
    it("should allow owner to add adapter", async () => {
      // Add adapter
      // Verify isAdapter returns true
      // Verify adapters array includes it
    });

    it("should prevent non-owner from adding adapter", async () => {
      // Call from non-owner
      // Expect Unauthorized revert
    });

    it("should allow owner to remove adapter", async () => {
      // Add then remove adapter
      // Verify isAdapter returns false
    });

    it("should emit AdapterAdded event", async () => {
      // Add adapter
      // Check event emission
    });
  });

  describe("getAllQuotes", () => {
    it("should return quotes from all registered adapters", async () => {
      // Register 3 adapters (SparkDEX, Enosys, BlazeSwap)
      // Call getAllQuotes for WFLR -> USDC
      // Verify 3 quotes returned
      // Log all quotes for comparison
      console.log("SparkDEX quote:", quotes[0].amountOut);
      console.log("Enosys quote:", quotes[1].amountOut);
      console.log("BlazeSwap quote:", quotes[2].amountOut);
    });

    it("should handle adapters that fail gracefully", async () => {
      // Include a mock adapter that reverts
      // Verify other quotes still returned
      // Verify failed adapter returns 0
    });
  });

  describe("findBestRoute", () => {
    it("should return adapter with highest output", async () => {
      // Register multiple adapters
      // Get best route
      // Verify it matches the highest quote from getAllQuotes
    });

    it("should return zero address if no routes found", async () => {
      // Query pair with no liquidity
      // Verify returns (address(0), 0)
    });
  });

  describe("swap", () => {
    it("should execute swap through best route", async () => {
      // Get initial balances
      // Execute swap
      // Verify output matches or exceeds expected
      // Verify event emitted with correct adapter
    });

    it("should revert DeadlineExpired if deadline passed", async () => {
      // Set deadline to past timestamp
      // Expect revert
    });

    it("should revert InsufficientOutput if output below minimum", async () => {
      // Set very high minAmountOut
      // Expect revert
    });

    it("should revert NoRouteFound for unknown pairs", async () => {
      // Query pair with no liquidity
      // Expect revert
    });
  });

  describe("swapVia", () => {
    it("should execute swap through specified adapter", async () => {
      // Specify adapter
      // Execute swap
      // Verify event shows correct adapter
    });

    it("should revert InvalidAdapter for unregistered adapter", async () => {
      // Specify unregistered adapter
      // Expect revert
    });
  });
});
```

---

#### 2.5.2 Deploy SwapRouter and Adapters to Coston2
**Deliverable:** All DEX infrastructure deployed and tested on Coston2

**Tasks:**
- 2.5.2.1 Create `scripts/deploy/02_Adapters.ts`
- 2.5.2.2 Create `scripts/deploy/03_SwapRouter.ts`
- 2.5.2.3 Deploy all adapters
- 2.5.2.4 Deploy SwapRouter
- 2.5.2.5 Register adapters with SwapRouter
- 2.5.2.6 Verify all contracts
- 2.5.2.7 Save addresses to addresses.ts

**Test 2.5.2-T1: Deployment Integration Test**
```typescript
// test/integration/Aggregation.test.ts
describe("DEX Aggregation Integration", () => {
  it("should find and execute best swap across all DEXs", async () => {
    // Using deployed contracts on Coston2
    const swapRouter = await getDeployedSwapRouter();

    // Get quotes from all DEXs
    const quotes = await swapRouter.getAllQuotes(WFLR, USDC, parseEther("1000"));

    // Log all quotes
    for (const quote of quotes) {
      console.log(`${quote.name}: ${formatUnits(quote.amountOut, 6)} USDC`);
      console.log(`  Gas: ${quote.gasEstimate}`);
      console.log(`  Price impact: ${quote.priceImpact} bps`);
    }

    // Execute swap
    const tx = await swapRouter.swap(WFLR, USDC, parseEther("100"), 0, user.address, deadline);
    const receipt = await tx.wait();

    // Log execution details
    console.log(`Executed via: ${receipt.logs[0].args.adapter}`);
    console.log(`Gas used: ${receipt.gasUsed}`);
  });
});
```

---

## Phase 3: Yield Integration

### 3.1 Lending Adapter Interface

#### 3.1.1 Create ILendingAdapter Interface
**Deliverable:** Standard interface for lending protocols

**Tasks:**
- 3.1.1.1 Create `contracts/adapters/ILendingAdapter.sol` with:
  - `supply(asset, amount, onBehalfOf)` - deposit to earn yield
  - `withdraw(asset, shares, to)` - withdraw assets
  - `borrow(asset, amount, onBehalfOf)` - borrow against collateral
  - `repay(asset, amount, onBehalfOf)` - repay borrowed amount
  - `getSupplyAPY(asset)` - current supply APY in basis points
  - `getBorrowAPY(asset)` - current borrow APY
  - `getSupplyBalance(user, asset)` - user's supply position

**Test 3.1.1-T1: Interface Compilation**
```bash
npx hardhat compile
```

---

### 3.2 Kinetic Adapter

#### 3.2.1 Research Kinetic Protocol Interface
**Deliverable:** Complete interface documentation for Kinetic (Compound-fork)

**Tasks:**
- 3.2.1.1 Find Kinetic Comptroller address on Flare/Coston2
- 3.2.1.2 Document kToken interfaces (similar to cTokens)
- 3.2.1.3 Create `contracts/interfaces/external/IKToken.sol`
- 3.2.1.4 Create `contracts/interfaces/external/IKineticComptroller.sol`
- 3.2.1.5 Document supported assets and their kToken addresses
- 3.2.1.6 Document interest rate models

**Test 3.2.1-T1: Kinetic Interface Verification**
```typescript
describe("Kinetic Interface", () => {
  it("should connect to Kinetic Comptroller", async () => {
    // Verify comptroller at documented address
    // Query allMarkets()
    // Log all supported markets
  });

  it("should query kToken for USDC", async () => {
    // Get kUSDC address from comptroller
    // Query underlying(), exchangeRateCurrent(), supplyRatePerBlock()
    // Calculate APY
    console.log(`USDC Supply APY: ${calculatedAPY}%`);
  });
});
```

---

#### 3.2.2 Implement KineticAdapter
**Deliverable:** Working adapter for Kinetic lending/borrowing

**Tasks:**
- 3.2.2.1 Create `contracts/adapters/KineticAdapter.sol`
- 3.2.2.2 Implement `supply()` using kToken.mint()
- 3.2.2.3 Implement `withdraw()` using kToken.redeem() or redeemUnderlying()
- 3.2.2.4 Implement `borrow()` using kToken.borrow()
- 3.2.2.5 Implement `repay()` using kToken.repayBorrow()
- 3.2.2.6 Implement `getSupplyAPY()` from supply rate
- 3.2.2.7 Implement `getBorrowAPY()` from borrow rate
- 3.2.2.8 Implement `getSupplyBalance()` using balanceOfUnderlying()
- 3.2.2.9 Handle token approvals
- 3.2.2.10 Handle market entry (enterMarkets) for borrowing

**Test 3.2.2-T1: KineticAdapter Tests**
```typescript
// test/unit/adapters/KineticAdapter.test.ts
describe("KineticAdapter", () => {
  describe("supply", () => {
    it("should successfully supply USDC to Kinetic", async () => {
      const adapter = await deployKineticAdapter();
      const usdc = await getUSDCContract();
      const initialBalance = await usdc.balanceOf(user.address);

      // Approve and supply
      await usdc.approve(adapter.address, parseUnits("100", 6));
      const shares = await adapter.supply(usdc.address, parseUnits("100", 6), user.address);

      // Verify shares received > 0
      expect(shares).to.be.gt(0);

      // Verify USDC was transferred
      const finalBalance = await usdc.balanceOf(user.address);
      expect(initialBalance.sub(finalBalance)).to.equal(parseUnits("100", 6));

      // Verify supply balance on Kinetic
      const supplyBalance = await adapter.getSupplyBalance(user.address, usdc.address);
      expect(supplyBalance).to.be.gte(parseUnits("99.99", 6)); // Allow for rounding

      console.log(`Supplied: 100 USDC`);
      console.log(`Shares received: ${shares}`);
      console.log(`Supply balance: ${formatUnits(supplyBalance, 6)} USDC`);
    });

    it("should accrue interest over time", async () => {
      // Supply USDC
      // Advance time by 1 day
      // Check supplyBalance increased
    });
  });

  describe("withdraw", () => {
    it("should successfully withdraw USDC from Kinetic", async () => {
      // Setup: Supply first
      // Withdraw half
      // Verify USDC received
      // Verify supply balance decreased
    });

    it("should allow full withdrawal", async () => {
      // Supply then withdraw all
      // Verify supply balance is 0
    });
  });

  describe("borrow", () => {
    it("should allow borrowing against collateral", async () => {
      // Supply collateral (e.g., WFLR)
      // Enter market
      // Borrow USDC
      // Verify USDC received
    });

    it("should respect collateral factor limits", async () => {
      // Try to borrow more than allowed
      // Expect revert
    });
  });

  describe("repay", () => {
    it("should successfully repay borrowed amount", async () => {
      // Setup: Borrow first
      // Repay half
      // Verify borrow balance decreased
    });

    it("should handle repaying full amount with interest", async () => {
      // Borrow
      // Advance time
      // Repay full (use max uint for full repayment)
      // Verify borrow balance is 0
    });
  });

  describe("getSupplyAPY", () => {
    it("should return current APY in basis points", async () => {
      const apy = await adapter.getSupplyAPY(usdc.address);

      // APY should be reasonable (0.1% - 50%)
      expect(apy).to.be.gt(10); // > 0.1%
      expect(apy).to.be.lt(5000); // < 50%

      console.log(`USDC Supply APY: ${apy / 100}%`);
    });
  });
});
```

---

### 3.3 Staking Adapter Interface

#### 3.3.1 Create IStakingAdapter Interface
**Deliverable:** Standard interface for staking protocols

**Tasks:**
- 3.3.1.1 Create `contracts/adapters/IStakingAdapter.sol` with:
  - `stake(amount, onBehalfOf)` - stake assets
  - `requestUnstake(shares, onBehalfOf)` - request unstake (may have cooldown)
  - `completeUnstake(requestId, to)` - complete unstake after cooldown
  - `getStakingAPY()` - current staking APY
  - `getCooldownPeriod()` - cooldown duration in seconds
  - `getStakedBalance(user)` - user's staked position

**Test 3.3.1-T1: Interface Compilation**
```bash
npx hardhat compile
```

---

### 3.4 Sceptre Adapter

#### 3.4.1 Research Sceptre Protocol Interface
**Deliverable:** Complete interface for Sceptre (sFLR liquid staking)

**Tasks:**
- 3.4.1.1 Find Sceptre sFLR contract address
- 3.4.1.2 Document stake/unstake functions
- 3.4.1.3 Document cooldown mechanism
- 3.4.1.4 Create `contracts/interfaces/external/ISceptre.sol`
- 3.4.1.5 Document exchange rate (sFLR:FLR)

**Test 3.4.1-T1: Sceptre Interface Verification**
```typescript
describe("Sceptre Interface", () => {
  it("should connect to sFLR contract", async () => {
    // Verify sFLR contract exists
    // Query exchange rate
    // Query total staked
    console.log(`sFLR exchange rate: ${exchangeRate}`);
    console.log(`Total staked: ${formatEther(totalStaked)} FLR`);
  });
});
```

---

#### 3.4.2 Implement SceptreAdapter
**Deliverable:** Working adapter for Sceptre staking

**Tasks:**
- 3.4.2.1 Create `contracts/adapters/SceptreAdapter.sol`
- 3.4.2.2 Implement `stake()` - deposits FLR, receives sFLR
- 3.4.2.3 Implement `requestUnstake()` - initiates cooldown
- 3.4.2.4 Implement `completeUnstake()` - withdraws after cooldown
- 3.4.2.5 Implement `getStakingAPY()` from protocol
- 3.4.2.6 Implement `getCooldownPeriod()`
- 3.4.2.7 Implement `getStakedBalance()`
- 3.4.2.8 Handle native FLR deposits (payable functions)

**Test 3.4.2-T1: SceptreAdapter Tests**
```typescript
// test/unit/adapters/SceptreAdapter.test.ts
describe("SceptreAdapter", () => {
  describe("stake", () => {
    it("should stake FLR and receive sFLR", async () => {
      const adapter = await deploySceptreAdapter();

      const initialsFLR = await sFLR.balanceOf(user.address);

      // Stake 100 FLR
      const shares = await adapter.stake(parseEther("100"), user.address, {
        value: parseEther("100")
      });

      expect(shares).to.be.gt(0);

      const finalsFLR = await sFLR.balanceOf(user.address);
      expect(finalsFLR.sub(initialsFLR)).to.equal(shares);

      console.log(`Staked: 100 FLR`);
      console.log(`Received: ${formatEther(shares)} sFLR`);
    });
  });

  describe("requestUnstake", () => {
    it("should initiate unstake request", async () => {
      // Stake first
      // Request unstake
      // Verify requestId returned
      // Verify cooldown started
    });
  });

  describe("completeUnstake", () => {
    it("should complete unstake after cooldown", async () => {
      // Stake
      // Request unstake
      // Advance time by cooldown period
      // Complete unstake
      // Verify FLR received
    });

    it("should revert if cooldown not complete", async () => {
      // Request unstake
      // Immediately try to complete
      // Expect revert
    });
  });

  describe("getStakingAPY", () => {
    it("should return reasonable staking APY", async () => {
      const apy = await adapter.getStakingAPY();

      // Staking APY typically 3-15%
      expect(apy).to.be.gt(100); // > 1%
      expect(apy).to.be.lt(2000); // < 20%

      console.log(`sFLR Staking APY: ${apy / 100}%`);
    });
  });
});
```

---

### 3.5 YieldRouter Implementation

#### 3.5.1 Implement YieldRouter Core
**Deliverable:** Yield optimizer that routes to best opportunities

**Tasks:**
- 3.5.1.1 Create `contracts/core/YieldRouter.sol`
- 3.5.1.2 Implement lending adapter registry
- 3.5.1.3 Implement staking adapter registry
- 3.5.1.4 Implement `getOptions(asset, amount)` - returns all yield opportunities
- 3.5.1.5 Implement `deposit(asset, amount, risk, onBehalfOf)` - deposits to best option
- 3.5.1.6 Implement `withdraw(asset, shares, to)` - withdraws from protocol
- 3.5.1.7 Add risk level filtering (Conservative, Moderate, Aggressive)
- 3.5.1.8 Track user positions across protocols

**Test 3.5.1-T1: YieldRouter Tests**
```typescript
// test/unit/core/YieldRouter.test.ts
describe("YieldRouter", () => {
  describe("getOptions", () => {
    it("should return all yield options for USDC", async () => {
      const options = await yieldRouter.getOptions(usdc.address, parseUnits("1000", 6));

      expect(options.length).to.be.gt(0);

      for (const opt of options) {
        console.log(`Protocol: ${opt.name}`);
        console.log(`  APY: ${opt.apy / 100}%`);
        console.log(`  Risk: ${opt.risk}`);
        console.log(`  TVL: ${formatUnits(opt.tvl, 6)} USDC`);
        console.log(`  Requires Lock: ${opt.requiresLock}`);
      }
    });

    it("should return options for WFLR including staking", async () => {
      const options = await yieldRouter.getOptions(wflr.address, parseEther("1000"));

      // Should include Kinetic lending AND Sceptre staking
      const hasKinetic = options.some(o => o.name === "Kinetic");
      const hasSceptre = options.some(o => o.name === "Sceptre");

      expect(hasKinetic).to.be.true;
      expect(hasSceptre).to.be.true;
    });
  });

  describe("deposit with risk levels", () => {
    it("CONSERVATIVE should route to simple lending/staking", async () => {
      const shares = await yieldRouter.deposit(
        usdc.address,
        parseUnits("100", 6),
        0, // CONSERVATIVE
        user.address
      );

      // Verify routed to Kinetic (simple lending)
    });

    it("MODERATE should allow LP positions with stable pairs", async () => {
      // Similar test for moderate risk
    });

    it("AGGRESSIVE should allow volatile LP and leveraged positions", async () => {
      // Similar test for aggressive risk
    });
  });
});
```

---

## Phase 4: Perpetuals Integration

### 4.1 Perpetual Adapter Interface

#### 4.1.1 Create IPerpetualAdapter Interface
**Deliverable:** Standard interface for perpetual trading

**Tasks:**
- 4.1.1.1 Create `contracts/adapters/IPerpetualAdapter.sol` with:
  - `openPosition(market, collateral, size, leverage, isLong, onBehalfOf)`
  - `closePosition(positionId, to)`
  - `addMargin(positionId, amount)`
  - `removeMargin(positionId, amount, to)`
  - `getPosition(positionId)` - returns PerpPosition struct
  - `getMarketInfo(market)` - returns PerpMarket struct
  - `getFundingRate(market)` - current funding rate
  - `getMarkets()` - all supported markets
  - `getUserPositions(user)` - user's open positions

**Test 4.1.1-T1: Interface Compilation**
```bash
npx hardhat compile
```

---

### 4.2 SparkDEX Eternal Adapter

#### 4.2.1 Research SparkDEX Eternal Interface
**Deliverable:** Complete interface for perpetual trading

**Tasks:**
- 4.2.1.1 Find SparkDEX Eternal contract addresses
- 4.2.1.2 Document position opening/closing functions
- 4.2.1.3 Document margin management
- 4.2.1.4 Document liquidation mechanics
- 4.2.1.5 Create `contracts/interfaces/external/ISparkDEXEternal.sol`
- 4.2.1.6 Document supported markets (BTC/USD, ETH/USD, etc.)
- 4.2.1.7 Document max leverage per market

**Test 4.2.1-T1: SparkDEX Eternal Interface Verification**
```typescript
describe("SparkDEX Eternal Interface", () => {
  it("should connect to Eternal contracts", async () => {
    // Verify contracts exist
    // Query available markets
    console.log("Available markets:", markets);
  });

  it("should query BTC/USD market info", async () => {
    const info = await eternal.getMarketInfo(btcUsdMarket);
    console.log(`BTC/USD Max Leverage: ${info.maxLeverage}x`);
    console.log(`Open Interest: ${formatUnits(info.openInterest, 8)} BTC`);
    console.log(`Funding Rate: ${info.fundingRate} bps`);
  });
});
```

---

#### 4.2.2 Implement SparkDEXEternalAdapter
**Deliverable:** Working adapter for perpetual trading

**Tasks:**
- 4.2.2.1 Create `contracts/adapters/SparkDEXEternalAdapter.sol`
- 4.2.2.2 Implement `openPosition()` with leverage validation
- 4.2.2.3 Implement `closePosition()` with P&L calculation
- 4.2.2.4 Implement `addMargin()`
- 4.2.2.5 Implement `removeMargin()` with safety checks
- 4.2.2.6 Implement position queries
- 4.2.2.7 Implement market info queries
- 4.2.2.8 Calculate liquidation price
- 4.2.2.9 Handle collateral token approvals

**Test 4.2.2-T1: SparkDEXEternalAdapter Tests**
```typescript
// test/unit/adapters/SparkDEXEternalAdapter.test.ts
describe("SparkDEXEternalAdapter", () => {
  describe("openPosition", () => {
    it("should open 10x long BTC position", async () => {
      const adapter = await deploySparkDEXEternalAdapter();

      // Deposit 100 USDC as collateral, 10x leverage
      const positionId = await adapter.openPosition(
        btcUsdMarket,
        parseUnits("100", 6), // 100 USDC collateral
        parseUnits("0.01", 8), // 0.01 BTC size
        10, // 10x leverage
        true, // long
        user.address
      );

      expect(positionId).to.not.equal(ethers.ZeroHash);

      const position = await adapter.getPosition(positionId);
      expect(position.side).to.equal(0); // LONG
      expect(position.leverage).to.equal(10);

      console.log(`Opened position: ${positionId}`);
      console.log(`Entry price: ${formatUnits(position.entryPrice, 8)} USD`);
      console.log(`Liquidation price: ${formatUnits(position.liquidationPrice, 8)} USD`);
    });

    it("should open short position", async () => {
      // Similar test for short position
    });

    it("should revert if leverage exceeds max", async () => {
      // Try 200x leverage
      // Expect revert
    });
  });

  describe("closePosition", () => {
    it("should close position and realize profit", async () => {
      // Open long position
      // Advance price favorably (via oracle manipulation in fork)
      // Close position
      // Verify positive P&L
      // Verify collateral + profit returned
    });

    it("should close position and realize loss", async () => {
      // Open long position
      // Move price against position
      // Close position
      // Verify negative P&L
      // Verify collateral - loss returned
    });
  });

  describe("addMargin", () => {
    it("should add margin and decrease effective leverage", async () => {
      // Open position
      const initialPosition = await adapter.getPosition(positionId);

      // Add margin
      await adapter.addMargin(positionId, parseUnits("50", 6));

      const updatedPosition = await adapter.getPosition(positionId);

      // Verify collateral increased
      expect(updatedPosition.collateral).to.equal(
        initialPosition.collateral.add(parseUnits("50", 6))
      );

      // Verify leverage decreased
      expect(updatedPosition.leverage).to.be.lt(initialPosition.leverage);
    });
  });

  describe("removeMargin", () => {
    it("should remove margin while maintaining safe leverage", async () => {
      // Open position with extra margin
      // Remove some margin
      // Verify still within safe leverage limits
    });

    it("should revert if removal would cause liquidation", async () => {
      // Try to remove too much margin
      // Expect revert
    });
  });

  describe("getFundingRate", () => {
    it("should return current funding rate", async () => {
      const fundingRate = await adapter.getFundingRate(btcUsdMarket);

      // Funding rate typically -0.05% to +0.05% per hour
      expect(fundingRate).to.be.gte(-500);
      expect(fundingRate).to.be.lte(500);

      console.log(`BTC/USD Funding Rate: ${fundingRate / 100}% per hour`);
    });
  });

  describe("getUserPositions", () => {
    it("should return all user positions", async () => {
      // Open multiple positions
      const positions = await adapter.getUserPositions(user.address);

      expect(positions.length).to.be.gte(2);

      for (const pos of positions) {
        console.log(`Position ${pos.positionId}:`);
        console.log(`  Market: ${pos.market}`);
        console.log(`  Side: ${pos.side === 0 ? "LONG" : "SHORT"}`);
        console.log(`  Size: ${pos.size}`);
        console.log(`  Unrealized P&L: ${pos.unrealizedPnl}`);
      }
    });
  });
});
```

---

## Phase 5: FAssets Support

### 5.1 FAssets Adapter

#### 5.1.1 Research FAssets System
**Deliverable:** Complete understanding of FAssets on Flare

**Tasks:**
- 5.1.1.1 Find FAssetManager contract addresses (FXRP, FBTC, FDOGE)
- 5.1.1.2 Document FAsset minting/redemption process
- 5.1.1.3 Create `contracts/interfaces/external/IFAssetManager.sol`
- 5.1.1.4 Document collateral ratios and fees
- 5.1.1.5 Identify liquidity sources for FAssets on DEXs

**Test 5.1.1-T1: FAssets Discovery**
```typescript
describe("FAssets Discovery", () => {
  it("should find FXRP contract", async () => {
    // Query FAssetManager for FXRP
    // Log contract address
    // Query total supply
    console.log(`FXRP Address: ${fxrpAddress}`);
    console.log(`FXRP Total Supply: ${formatEther(totalSupply)}`);
  });

  it("should find liquidity for FXRP on DEXs", async () => {
    // Query SparkDEX for FXRP pools
    // Query Enosys for FXRP pairs
    // Log available liquidity
  });
});
```

---

#### 5.1.2 Implement FAssetsAdapter
**Deliverable:** Adapter for FAsset-specific operations

**Tasks:**
- 5.1.2.1 Create `contracts/adapters/FAssetsAdapter.sol`
- 5.1.2.2 Implement FAsset detection `isFAsset(address)`
- 5.1.2.3 Implement FAsset info queries
- 5.1.2.4 Implement routing for FAsset swaps
- 5.1.2.5 Implement FAsset-specific yield strategies
- 5.1.2.6 Handle FDC verification for cross-chain operations

**Test 5.1.2-T1: FAssetsAdapter Tests**
```typescript
// test/unit/adapters/FAssetsAdapter.test.ts
describe("FAssetsAdapter", () => {
  describe("isFAsset", () => {
    it("should identify FXRP as FAsset", async () => {
      expect(await adapter.isFAsset(fxrpAddress)).to.be.true;
    });

    it("should identify WFLR as non-FAsset", async () => {
      expect(await adapter.isFAsset(wflrAddress)).to.be.false;
    });
  });

  describe("getFAssetInfo", () => {
    it("should return FXRP info", async () => {
      const info = await adapter.getFAssetInfo(fxrpAddress);

      expect(info.symbol).to.equal("FXRP");
      expect(info.underlying).to.equal("XRP");

      console.log(`FXRP Total Minted: ${formatEther(info.totalMinted)}`);
      console.log(`Collateral Ratio: ${info.collateralRatio}%`);
    });
  });
});
```

---

### 5.2 FAsset Swap Routing

#### 5.2.1 Integrate FAssets with SwapRouter
**Deliverable:** Optimal swap routing for FAssets

**Tasks:**
- 5.2.1.1 Add FAsset awareness to SwapRouter
- 5.2.1.2 Implement multi-hop routing for FAssets (FXRP -> WFLR -> USDC)
- 5.2.1.3 Implement price impact calculation for FAsset swaps
- 5.2.1.4 Add FAsset-specific slippage protection

**Test 5.2.1-T1: FAsset Swap Integration Tests**
```typescript
// test/integration/FAssetFlows.test.ts
describe("FAsset Swap Flows", () => {
  it("should swap FXRP to USDC via best route", async () => {
    // Get FXRP (may need to acquire from testnet faucet or bridge)
    // Execute swap
    // Verify USDC received
    // Log the route taken
  });

  it("should compare direct vs multi-hop routes for FXRP", async () => {
    const directQuote = await swapRouter.getQuoteVia(sparkdex, fxrp, usdc, amount);
    const multiHopQuote = await swapRouter.getQuote(fxrp, usdc, amount);

    console.log(`Direct FXRP->USDC: ${formatUnits(directQuote, 6)}`);
    console.log(`Best Route FXRP->USDC: ${formatUnits(multiHopQuote, 6)}`);
  });
});
```

---

## Phase 6: Strategy Engine

### 6.1 Strategy Engine Core

#### 6.1.1 Implement StrategyEngine
**Deliverable:** Multi-step strategy execution engine

**Tasks:**
- 6.1.1.1 Create `contracts/core/StrategyEngine.sol`
- 6.1.1.2 Implement Action executor that dispatches to adapters
- 6.1.1.3 Implement output chaining (step N output -> step N+1 input)
- 6.1.1.4 Implement `execute(actions[], user)` for custom strategies
- 6.1.1.5 Implement `executePreset(presetId, tokenIn, amountIn, user)` for preset strategies
- 6.1.1.6 Add atomicity - all steps succeed or all revert
- 6.1.1.7 Add gas optimization for batched operations
- 6.1.1.8 Track strategy execution IDs

**Test 6.1.1-T1: StrategyEngine Tests**
```typescript
// test/unit/core/StrategyEngine.test.ts
describe("StrategyEngine", () => {
  describe("execute", () => {
    it("should execute swap + supply strategy", async () => {
      // Strategy: WFLR -> swap to USDC -> supply to Kinetic
      const actions = [
        {
          actionType: ActionType.SWAP,
          adapter: sparkdexAdapter.address,
          tokenIn: wflr.address,
          tokenOut: usdc.address,
          amountIn: parseEther("100"),
          minAmountOut: parseUnits("50", 6),
          extraData: "0x"
        },
        {
          actionType: ActionType.SUPPLY,
          adapter: kineticAdapter.address,
          tokenIn: usdc.address,
          tokenOut: kUsdc.address,
          amountIn: 0, // Use all from previous step
          minAmountOut: 0,
          extraData: "0x"
        }
      ];

      // Execute strategy
      const strategyId = await strategyEngine.execute(actions, user.address);

      // Verify: WFLR decreased
      // Verify: kUSDC balance increased
      // Verify: Strategy ID generated

      console.log(`Strategy executed: ${strategyId}`);
    });

    it("should chain outputs correctly", async () => {
      // Verify step N output is used as step N+1 input when amountIn = 0
    });

    it("should revert atomically on any step failure", async () => {
      // Include a step that will fail
      // Verify all state changes reverted
    });
  });
});
```

---

#### 6.1.2 Implement Preset Strategies
**Deliverable:** Pre-configured yield strategies

**Tasks:**
- 6.1.2.1 Create `contracts/strategies/IStrategy.sol` interface
- 6.1.2.2 Create `contracts/strategies/FAssetMaxYield.sol` - FXRP -> swap -> stake
- 6.1.2.3 Create `contracts/strategies/ConservativeYield.sol` - supply to lending
- 6.1.2.4 Create `contracts/strategies/AggressiveYield.sol` - LP + leveraged yield
- 6.1.2.5 Create `contracts/strategies/DeltaNeutral.sol` - supply + hedge with short perp
- 6.1.2.6 Register presets with StrategyEngine

**Test 6.1.2-T1: Preset Strategy Tests**
```typescript
// test/integration/PresetStrategies.test.ts
describe("Preset Strategies", () => {
  describe("FXRP_MAX_YIELD", () => {
    it("should execute FXRP -> swap -> stake flow", async () => {
      const initialFXRP = await fxrp.balanceOf(user.address);

      const strategyId = await gateway.executePreset(
        FXRP_MAX_YIELD,
        fxrp.address,
        parseEther("1000"), // 1000 FXRP
        deadline
      );

      // Verify FXRP spent
      const finalFXRP = await fxrp.balanceOf(user.address);
      expect(initialFXRP.sub(finalFXRP)).to.equal(parseEther("1000"));

      // Verify sFLR received (from staking)
      const sFLRBalance = await sFLR.balanceOf(user.address);
      expect(sFLRBalance).to.be.gt(0);

      console.log(`Strategy executed: ${strategyId}`);
      console.log(`FXRP spent: 1000`);
      console.log(`sFLR received: ${formatEther(sFLRBalance)}`);
    });
  });

  describe("DELTA_NEUTRAL", () => {
    it("should supply to Kinetic and open hedging short on Eternal", async () => {
      // Supply 1000 USDC to Kinetic
      // Open short position on BTC to hedge FLR price exposure
      // Verify both positions created
    });
  });
});
```

---

## Phase 7: PraxisGateway

### 7.1 Gateway Implementation

#### 7.1.1 Implement PraxisGateway Core
**Deliverable:** Unified entry point for all PRAXIS operations

**Tasks:**
- 7.1.1.1 Create `contracts/core/PraxisGateway.sol`
- 7.1.1.2 Wire up SwapRouter: `swap()`, `getQuote()`, `getAllQuotes()`
- 7.1.1.3 Wire up YieldRouter: `deposit()`, `getYieldOptions()`
- 7.1.1.4 Wire up StrategyEngine: `executeStrategy()`, `executePreset()`
- 7.1.1.5 Add perpetual functions: `openPosition()`, `closePosition()`, `adjustMargin()`
- 7.1.1.6 Add FAsset registry and detection
- 7.1.1.7 Add deadline validation for all operations
- 7.1.1.8 Add ReentrancyGuard to all state-changing functions
- 7.1.1.9 Add access control for admin functions
- 7.1.1.10 Add emergency pause functionality
- 7.1.1.11 Add events for all operations

**Test 7.1.1-T1: PraxisGateway Unit Tests**
```typescript
// test/unit/core/PraxisGateway.test.ts
describe("PraxisGateway", () => {
  describe("swap", () => {
    it("should route swaps through SwapRouter", async () => {
      const tx = await gateway.swap(
        wflr.address,
        usdc.address,
        parseEther("100"),
        parseUnits("50", 6),
        user.address,
        deadline
      );

      const receipt = await tx.wait();

      // Verify SwapExecuted event
      const event = receipt.events.find(e => e.event === "SwapExecuted");
      expect(event.args.user).to.equal(user.address);
      expect(event.args.amountOut).to.be.gte(parseUnits("50", 6));
    });
  });

  describe("deposit", () => {
    it("should route deposits through YieldRouter", async () => {
      const shares = await gateway.deposit(
        usdc.address,
        parseUnits("100", 6),
        0 // CONSERVATIVE
      );

      expect(shares).to.be.gt(0);

      // Verify YieldDeposited event
    });
  });

  describe("executeStrategy", () => {
    it("should execute custom strategy through StrategyEngine", async () => {
      const strategyId = await gateway.executeStrategy(actions, deadline);
      expect(strategyId).to.not.equal(ethers.ZeroHash);
    });
  });

  describe("perpetuals", () => {
    it("should open position through PerpetualAdapter", async () => {
      // Test perpetual operations
    });
  });

  describe("FAsset support", () => {
    it("should correctly identify FAssets", async () => {
      expect(await gateway.isSupportedFAsset(fxrp.address)).to.be.true;
      expect(await gateway.isSupportedFAsset(wflr.address)).to.be.false;
    });

    it("should return all supported FAssets", async () => {
      const fAssets = await gateway.getSupportedFAssets();
      expect(fAssets).to.include(fxrp.address);
    });
  });

  describe("access control", () => {
    it("should only allow owner to add FAssets", async () => {
      await expect(
        gateway.connect(nonOwner).addFAsset(randomToken.address)
      ).to.be.revertedWithCustomError(gateway, "Unauthorized");
    });
  });
});
```

---

#### 7.1.2 Deploy Complete System to Coston2
**Deliverable:** Full PRAXIS system deployed on testnet

**Tasks:**
- 7.1.2.1 Create `scripts/deploy/04_Gateway.ts`
- 7.1.2.2 Deploy PraxisGateway with all router addresses
- 7.1.2.3 Configure FAssets
- 7.1.2.4 Verify all contracts
- 7.1.2.5 Create comprehensive address registry

**Test 7.1.2-T1: End-to-End Integration Tests**
```typescript
// test/integration/E2E.test.ts
describe("End-to-End PRAXIS Tests", () => {
  it("User journey: FXRP to yield in one transaction", async () => {
    // Start with FXRP
    console.log(`Starting FXRP balance: ${formatEther(await fxrp.balanceOf(user.address))}`);

    // Execute strategy
    const tx = await gateway.executePreset(
      FXRP_MAX_YIELD,
      fxrp.address,
      parseEther("500"),
      deadline
    );

    const receipt = await tx.wait();
    console.log(`Gas used: ${receipt.gasUsed}`);

    // Verify final state
    console.log(`Final FXRP balance: ${formatEther(await fxrp.balanceOf(user.address))}`);
    console.log(`Final sFLR balance: ${formatEther(await sFLR.balanceOf(user.address))}`);
  });

  it("Compare gas cost: PRAXIS vs manual execution", async () => {
    // Measure PRAXIS gas
    const praxisTx = await gateway.executePreset(FXRP_MAX_YIELD, fxrp.address, amount, deadline);
    const praxisGas = (await praxisTx.wait()).gasUsed;

    // Measure manual execution gas (swap + approve + stake)
    const swapTx = await sparkdex.swap(...);
    const approveTx = await wflr.approve(...);
    const stakeTx = await sceptre.stake(...);
    const manualGas = (await swapTx.wait()).gasUsed
      .add((await approveTx.wait()).gasUsed)
      .add((await stakeTx.wait()).gasUsed);

    console.log(`PRAXIS gas: ${praxisGas}`);
    console.log(`Manual gas: ${manualGas}`);
    console.log(`Savings: ${manualGas.sub(praxisGas)} (${((manualGas.sub(praxisGas)).mul(100).div(manualGas))}%)`);
  });
});
```

---

## Phase 8: Security & Audit

### 8.1 Static Analysis

#### 8.1.1 Slither Analysis
**Deliverable:** Clean Slither report

**Tasks:**
- 8.1.1.1 Install Slither: `pip install slither-analyzer`
- 8.1.1.2 Run Slither on all contracts
- 8.1.1.3 Address all high severity findings
- 8.1.1.4 Address all medium severity findings
- 8.1.1.5 Document any accepted low severity findings

**Test 8.1.1-T1: Slither Analysis**
```bash
slither contracts/ --print human-summary
```
**Expected:** No high or medium severity issues

---

#### 8.1.2 Mythril Analysis
**Deliverable:** Clean Mythril report

**Tasks:**
- 8.1.2.1 Install Mythril
- 8.1.2.2 Run symbolic execution on core contracts
- 8.1.2.3 Address any vulnerabilities found

**Test 8.1.2-T1: Mythril Analysis**
```bash
myth analyze contracts/core/PraxisGateway.sol --max-depth 50
```

---

### 8.2 Security Testing

#### 8.2.1 Reentrancy Testing
**Deliverable:** Verified reentrancy protection

**Tasks:**
- 8.2.1.1 Create reentrancy attack contract
- 8.2.1.2 Test all external-calling functions
- 8.2.1.3 Verify ReentrancyGuard prevents attacks

**Test 8.2.1-T1: Reentrancy Tests**
```typescript
// test/security/Reentrancy.test.ts
describe("Reentrancy Protection", () => {
  it("should prevent reentrancy on swap", async () => {
    const attacker = await deployReentrancyAttacker();

    await expect(
      attacker.attackSwap(gateway.address, ...)
    ).to.be.reverted; // ReentrancyGuard blocks
  });

  it("should prevent reentrancy on deposit", async () => {
    // Similar test
  });
});
```

---

#### 8.2.2 Flash Loan Attack Testing
**Deliverable:** Verified flash loan resistance

**Tasks:**
- 8.2.2.1 Simulate flash loan attack scenarios
- 8.2.2.2 Test price manipulation resistance (FTSO prices cannot be manipulated)
- 8.2.2.3 Test slippage protection effectiveness

**Test 8.2.2-T1: Flash Loan Tests**
```typescript
// test/security/FlashLoan.test.ts
describe("Flash Loan Resistance", () => {
  it("should use FTSO prices resistant to flash loan manipulation", async () => {
    // Simulate flash loan
    // Attempt to manipulate swap price
    // Verify FTSO-based price remains stable
  });
});
```

---

#### 8.2.3 Access Control Audit
**Deliverable:** Verified ownership security

**Tasks:**
- 8.2.3.1 Map all admin functions across contracts
- 8.2.3.2 Verify all have proper access control
- 8.2.3.3 Test ownership transfer mechanism

**Test 8.2.3-T1: Access Control Tests**
```typescript
// test/security/AccessControl.test.ts
describe("Access Control", () => {
  it("should prevent non-owner from adding adapters", async () => {
    await expect(
      swapRouter.connect(attacker).addAdapter(maliciousAdapter.address)
    ).to.be.revertedWithCustomError(swapRouter, "Unauthorized");
  });

  it("should prevent non-owner from adding FAssets", async () => {
    // Similar test for gateway
  });

  it("should allow ownership transfer", async () => {
    await gateway.transferOwnership(newOwner.address);
    expect(await gateway.owner()).to.equal(newOwner.address);
  });
});
```

---

#### 8.2.4 Perpetual Liquidation Testing
**Deliverable:** Verified safe margin call handling

**Tasks:**
- 8.2.4.1 Test liquidation price calculation accuracy
- 8.2.4.2 Test margin addition prevents liquidation
- 8.2.4.3 Test position closes before liquidation when requested

**Test 8.2.4-T1: Liquidation Tests**
```typescript
// test/security/Liquidation.test.ts
describe("Perpetual Liquidation Safety", () => {
  it("should calculate accurate liquidation price", async () => {
    // Open 10x long at $50,000
    // Verify liquidation price is ~$45,000 (10% drop)
  });

  it("should prevent position opening if immediately liquidatable", async () => {
    // Try to open position with too little margin
    // Expect revert
  });

  it("should allow user to close before liquidation", async () => {
    // Open position
    // Move price toward liquidation
    // Close before liquidated
    // Verify funds returned (minus loss)
  });
});
```

---

## Phase 9: Mainnet Deployment

### 9.1 Pre-Deployment

#### 9.1.1 Pre-Deployment Checklist
**Deliverable:** Verified readiness for mainnet

**Tasks:**
- 9.1.1.1 All Coston2 tests passing
- 9.1.1.2 48 hours stable operation on testnet
- 9.1.1.3 Slither clean (no high/medium)
- 9.1.1.4 Fork tests against Flare mainnet pass
- 9.1.1.5 Multisig wallet configured
- 9.1.1.6 Emergency pause tested
- 9.1.1.7 Monitoring configured

**Test 9.1.1-T1: Mainnet Fork Test**
```typescript
// test/fork/MainnetFork.test.ts
describe("Mainnet Fork Tests", () => {
  // Fork Flare mainnet
  // Deploy all contracts to fork
  // Run all integration tests against real mainnet state
});
```

---

#### 9.1.2 Mainnet Deployment
**Deliverable:** Production contracts on Flare mainnet

**Tasks:**
- 9.1.2.1 Deploy FlareOracle
- 9.1.2.2 Deploy all adapters (SparkDEX, Enosys, BlazeSwap, Kinetic, Sceptre, SparkDEX Eternal)
- 9.1.2.3 Deploy SwapRouter and register adapters
- 9.1.2.4 Deploy YieldRouter and register adapters
- 9.1.2.5 Deploy StrategyEngine
- 9.1.2.6 Deploy PraxisGateway
- 9.1.2.7 Transfer ownership to multisig
- 9.1.2.8 Verify all contracts on explorer

**Test 9.1.2-T1: Post-Deployment Verification**
```typescript
// scripts/validate/mainnetCheck.ts
async function main() {
  // Load all deployed addresses
  // Verify each contract responds correctly
  // Test a small swap (1 FLR)
  // Test a small deposit
  // Verify all events emitted correctly
  console.log("All mainnet contracts verified successfully!");
}
```

---

## Appendix: Dynamic Address Discovery

### Protocol Addresses Discovery Script
```typescript
// scripts/helpers/discoverAddresses.ts
import { ContractRegistry } from "@flarenetwork/flare-periphery-contracts";

async function discoverFlareAddresses() {
  // FTSO
  const ftsoV2 = await ContractRegistry.getFtsoV2();
  console.log(`FtsoV2: ${ftsoV2}`);

  // FDC
  const fdcHub = await ContractRegistry.getFdcHub();
  console.log(`FdcHub: ${fdcHub}`);

  const fdcVerification = await ContractRegistry.getFdcVerification();
  console.log(`FdcVerification: ${fdcVerification}`);

  // Save to addresses.ts
}

// External protocols - query from their registries or docs
async function discoverProtocolAddresses() {
  // SparkDEX - query their factory
  // Enosys - query their router
  // BlazeSwap - query their router
  // Kinetic - comptroller.allMarkets()
  // Sceptre - sFLR contract
}
```

### Feed ID Reference
```typescript
// scripts/helpers/feedIds.ts
export const FTSO_FEEDS = {
  FLR_USD: "0x01464c522f55534400000000000000000000000000",
  ETH_USD: "0x014554482f55534400000000000000000000000000",
  BTC_USD: "0x014254432f55534400000000000000000000000000",
  XRP_USD: "0x015852502f55534400000000000000000000000000",
  DOGE_USD: "0x01444f47452f555344000000000000000000000000",
};
```

---

## Test Coverage Summary

| Phase | Contract | Target Coverage |
|-------|----------|-----------------|
| 1 | FlareOracle | 95% |
| 1 | FDCVerifier | 90% |
| 2 | SparkDEXAdapter | 90% |
| 2 | EnosysAdapter | 90% |
| 2 | BlazeSwapAdapter | 90% |
| 2 | SwapRouter | 95% |
| 3 | KineticAdapter | 90% |
| 3 | SceptreAdapter | 90% |
| 3 | YieldRouter | 90% |
| 4 | SparkDEXEternalAdapter | 95% |
| 5 | FAssetsAdapter | 90% |
| 6 | StrategyEngine | 95% |
| 7 | PraxisGateway | 95% |

---

## Test Commands Reference

```bash
# Unit tests
npx hardhat test test/unit/**/*.test.ts

# Integration tests (requires Coston2 connection)
npx hardhat test test/integration/**/*.test.ts --network coston2

# Fork tests
npx hardhat test test/fork/**/*.test.ts --network hardhatMainnet

# Security tests
npx hardhat test test/security/**/*.test.ts

# Coverage report
npx hardhat coverage

# Gas report
REPORT_GAS=true npx hardhat test

# Slither analysis
slither contracts/ --print human-summary

# All tests verbose
npx hardhat test --verbose
```
