# PRAXIS - Execution Rights Protocol

**Version:** v5.0
**Target Chain:** Flare (Coston2 Testnet -> Mainnet)
**Code Locations:** `web3/` for smart contracts, `client/` for frontend

---

## What is PRAXIS?

PRAXIS is an **Execution Rights Protocol** that enables collateral-free access to DeFi capital. Instead of lending assets (where borrowers take custody and can default), PRAXIS **leases execution power** over capital.

### Core Innovation

```
Traditional DeFi Lending:
  LP deposits → Borrower takes custody → Risk of default → Requires overcollateralization

PRAXIS Execution Rights:
  LP deposits → Capital stays in vault → Executor gets time-bound rights → Smart contracts enforce limits
```

**Key Principle:** You use money. You never own it.

### How It's Different from Existing Flare DeFi

| Protocol | What It Does | PRAXIS Difference |
|----------|--------------|-------------------|
| earnXRP | Yield vault with fixed strategies | PRAXIS enables **custom strategies** with third-party capital |
| Kinetic | Lending with collateral | PRAXIS requires **zero collateral** - risk is bounded by smart contracts |
| SparkDEX | Trading your own assets | PRAXIS lets you trade with **other people's capital** |

### Why Flare is Perfect for This

1. **FTSO** - Trustless price feeds for PnL calculation (already integrated in Phase 1)
2. **FDC** - Cross-chain event triggers for execution (already integrated in Phase 1)
3. **FAssets** - FXRP/FBTC/FDOGE as tradeable assets without bridges

---

## Addressing Flare Team Feedback

> "Check DeFi Tracker and avoid overlapping. Think how to complement something that is already present. Liquidity sourcing might be a blocker. Needs realistic practical implementation."

### 1. Avoiding Overlap - What We DON'T Do

| Existing Protocol | What They Do | PRAXIS Does NOT |
|-------------------|--------------|-----------------|
| earnXRP | Yield aggregation with fixed strategies | Compete on yield aggregation |
| Kinetic | Lending/borrowing | Provide lending services |
| SparkDEX | DEX trading | Run our own liquidity pools |
| Sceptre | Liquid staking | Offer staking services |

**PRAXIS is an execution layer ON TOP of these protocols, not a competitor.**

### 2. Complementing the Ecosystem - We DRIVE Volume to Existing Protocols

```
Every executor using PRAXIS generates:
  → Swap volume for SparkDEX/Enosys/BlazeSwap
  → Lending TVL for Kinetic
  → Staking TVL for Sceptre
  → FAsset utility for FXRP/FBTC/FDOGE

PRAXIS earns from execution fees, not from stealing liquidity.
```

### 3. Liquidity Sourcing - Why LPs Would Deposit (Alpha Sharing Model)

**The Problem:** Why deposit in PRAXIS vs earnXRP (5% fixed) or Kinetic (4% lending)?

**The Solution:** PRAXIS offers **alpha exposure** - LPs earn from skilled executors' profits.

```
┌─────────────────────────────────────────────────────────────────────────┐
│                    LP YIELD COMPARISON                                   │
├─────────────────────────────────────────────────────────────────────────┤
│                                                                          │
│  earnXRP:     Fixed 5% APY (vault manager decides strategy)             │
│  Kinetic:     Fixed 4% APY (lending interest)                           │
│  Sceptre:     Fixed 6% APY (staking rewards)                            │
│                                                                          │
│  PRAXIS:      2% base fee + 20% of executor profits                     │
│               │                                                          │
│               ├─ If executor makes 0%:  LP gets 2% (floor)              │
│               ├─ If executor makes 15%: LP gets 2% + 3% = 5%            │
│               ├─ If executor makes 30%: LP gets 2% + 6% = 8%            │
│               └─ If executor makes 50%: LP gets 2% + 10% = 12%          │
│                                                                          │
│  KEY INSIGHT: LPs get UPSIDE EXPOSURE to skilled trading without        │
│               doing the trading themselves. This doesn't exist          │
│               anywhere else on Flare.                                    │
│                                                                          │
└─────────────────────────────────────────────────────────────────────────┘
```

**Risk Protection for LPs:**
- Capital never leaves vault (no custody risk)
- Max drawdown enforced by smart contracts (e.g., 10% max loss)
- Executors can optionally stake collateral to cover losses
- Diversification across multiple executors reduces single-executor risk

### 4. Realistic Practical Implementation - Phased Rollout

```
Phase A: Self-Execution (Immediate utility, no trust needed)
  └─ User deposits AND executes their own strategies
  └─ Use case: "Auto-DCA into sFLR" or "One-click FAsset yield"
  └─ Proves: Vault works, constraints work, settlement works

Phase B: Whitelisted Executors (Controlled trust)
  └─ Vetted traders can access LP capital
  └─ Requires: Reputation score or staked collateral
  └─ Proves: Third-party execution works safely

Phase C: Open Marketplace (Full vision)
  └─ Permissionless execution rights
  └─ LPs choose risk parameters
  └─ Market determines fees
```

---

## Project Milestones

```
M1 ✅ ━━━━━━━━━━ M2 ━━━━━━━━━━ M3 ━━━━━━━━━━ M4 ━━━━━━━━━━ M5
Oracle         Adapters       Vault &        Settlement     Testnet
Foundation     (DEX, Lend,    Execution      & Gateway      Launch
(Done)         Stake, Perps)  Rights NFT                    & Audit
```

### Milestone 1: Oracle Foundation ✅ COMPLETE

**Deliverable:** FTSO and FDC integration for trustless price feeds and cross-chain verification

| Component | Status | Address |
|-----------|--------|---------|
| FlareOracle (FTSO v2) | ✅ Deployed | `0x0979854b028210Cf492a3bCB990B6a1D45d89eCc` |
| FDCVerifier | ✅ Deployed | `0xe667bEf52f1EAD93Cb0375639a4eA36001d4edf3` |

**Completed:**
- 63 price feeds validated on Coston2
- Price staleness checks (MAX_PRICE_AGE = 300s)
- Cross-chain proof verification for EVMTransaction, Payment, AddressValidity
- 52 unit tests + 15 integration tests passing

**Why it matters:** Settlement requires trustless prices. Executors can't manipulate PnL calculations.

---

### Milestone 2: Execution Infrastructure

**Deliverable:** Adapters that let the vault interact with Flare DeFi protocols

| Adapter | Protocol | Functionality |
|---------|----------|---------------|
| SparkDEXAdapter | SparkDEX V3 | Swaps, quotes, multi-hop routing |
| EnosysAdapter | Enosys | Swaps (V3 concentrated liquidity) |
| BlazeSwapAdapter | BlazeSwap | Swaps (V2 style) |
| KineticAdapter | Kinetic | Supply, withdraw, borrow, repay |
| SceptreAdapter | Sceptre | Stake FLR → sFLR, unstake |
| SparkDEXEternalAdapter | SparkDEX Eternal | Open/close perp positions, margin management |

**Key Contracts:**
- `IAdapter.sol` - Standard interface for all adapters
- `SwapRouter.sol` - Aggregates quotes, finds best rates
- `YieldRouter.sol` - Routes to best yield opportunities

**Why it matters:** Without adapters, the vault can't do anything. These are the "arms and legs" of the system.

---

### Milestone 3: Vault & Execution Rights System

**Deliverable:** Core innovation - capital custody, permission tokens, and safety mechanisms

| Contract | Purpose |
|----------|---------|
| `ExecutionVault.sol` | ERC-4626 vault holding LP capital. Money never leaves. |
| `ExecutionRightsNFT.sol` | ERC-721 encoding executor permissions & constraints |
| `ExecutionController.sol` | Validates every action against ERT constraints |
| `PositionManager.sol` | Tracks open positions per ERT for PnL calculation |
| `ReputationManager.sol` | Tracks executor tiers, enforces stake requirements, upgrades/downgrades |
| `UtilizationController.sol` | Enforces 70% max allocation cap - 30% always in reserve |
| `CircuitBreaker.sol` | Triggers at 5% daily loss - pauses system, force settles |
| `ExposureManager.sol` | Limits 30% max exposure per asset - forces diversification |
| `InsuranceFund.sol` | Collects 2% of profits - covers losses before LPs absorb |

**What gets enforced:**
- Reputation tier limits (new users start small, earn access to larger capital)
- Stake requirements (50% for Tier 0 down to 5% for Tier 4)
- Capital limits per tier (e.g., Tier 0 = $100, Tier 3 = $100k)
- Time bounds (e.g., 7 days)
- Leverage limits (e.g., max 3x)
- Drawdown limits (e.g., max 10% loss, always < stake %)
- Adapter whitelist (e.g., only SparkDEX + Kinetic)
- Asset whitelist (e.g., only USDC, WFLR, FXRP)
- Strategy risk level (Conservative/Moderate/Aggressive by tier)

**Why it matters:** This is what makes PRAXIS unique. Money stays in vault, executor only gets permission to direct it.

---

### Milestone 4: Settlement Engine & Gateway

**Deliverable:** Trustless PnL calculation and unified user entry point

| Contract | Purpose |
|----------|---------|
| `SettlementEngine.sol` | Calculates PnL using FlareOracle (FTSO), distributes fees |
| `PraxisGateway.sol` | Single entry point for all LP and executor interactions |

**Settlement Flow:**
```
1. Unwind all positions (convert back to base asset)
2. Query FlareOracle for current prices
3. Calculate PnL = final value - initial capital
4. Distribute: LP gets base fee + 20% profit, Executor gets 80% profit
5. Return capital to vault, burn ERT
```

**Gateway Functions:**
- LP: `deposit()`, `withdraw()`, `getVaultInfo()`
- Executor: `requestExecutionRights()`, `executeWithRights()`, `settleRights()`

**Why it matters:** Without fair settlement, there's no way to split profits. FTSO makes it trustless.

---

### Milestone 5: Testnet Launch & Security

**Deliverable:** Public testnet with audited contracts, ready for mainnet

| Task | Description |
|------|-------------|
| Full Coston2 Deployment | All contracts deployed and wired together |
| Security Audit | Slither analysis, Mythril symbolic execution, manual review |
| Public Testnet | Open to users with documentation and guides |
| Bug Bounty | Incentivized vulnerability discovery |
| Mainnet Plan | Deployment script, multisig setup, monitoring |

**Security Checklist:**
- [ ] Reentrancy protection on all vault operations
- [ ] Constraint bypass testing (all should fail)
- [ ] Flash loan resistance (FTSO prices not manipulable)
- [ ] Access control audit
- [ ] Economic attack simulations

**Why it matters:** Real users, real testing, battle-tested before mainnet.

---

### Milestone Summary

| # | Milestone | Status | One-Liner |
|---|-----------|--------|-----------|
| 1 | Oracle Foundation | ✅ Complete | Trustless prices via FTSO, cross-chain via FDC |
| 2 | Execution Infrastructure | ⬜ Not Started | Vault can talk to SparkDEX, Kinetic, Sceptre, Eternal |
| 3 | Vault & Rights System | ⬜ Not Started | Money stays locked, permissions are NFTs, reputation tiers + stake protect LPs |
| 4 | Settlement & Gateway | ⬜ Not Started | Fair profit split, single entry point |
| 5 | Testnet & Security | ⬜ Not Started | Audited, public testnet, mainnet ready |

---

## System Architecture

```
┌────────────────────────────────────────────────────────────────────────────┐
│                           PRAXIS PROTOCOL                                   │
├────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│  ┌─────────────────┐                          ┌─────────────────┐          │
│  │  LIQUIDITY      │                          │  EXECUTORS      │          │
│  │  PROVIDERS      │                          │  (Traders/Bots) │          │
│  │                 │                          │                 │          │
│  │  Deposit FLR,   │                          │  Request ERTs,  │          │
│  │  FXRP, USDC     │                          │  Execute        │          │
│  │  into Vaults    │                          │  Strategies     │          │
│  └────────┬────────┘                          └────────┬────────┘          │
│           │                                            │                    │
│           ▼                                            ▼                    │
│  ┌─────────────────────────────────────────────────────────────────┐       │
│  │                    EXECUTION VAULTS                              │       │
│  │  • Hold LP capital (never transferred to executors)              │       │
│  │  • Issue vault shares to LPs                                     │       │
│  │  • Track capital utilization per ERT                            │       │
│  └─────────────────────────────────────────────────────────────────┘       │
│                                    │                                        │
│                                    ▼                                        │
│  ┌─────────────────────────────────────────────────────────────────┐       │
│  │              EXECUTION RIGHTS NFT (ERT)                          │       │
│  │                                                                   │       │
│  │  ERC-721 token encoding:                                         │       │
│  │  • Executor address (who can use these rights)                   │       │
│  │  • Capital limit (max amount deployable)                         │       │
│  │  • Time bounds (start time, expiry time)                         │       │
│  │  • Protocol whitelist (only SparkDEX, Kinetic, etc.)            │       │
│  │  • Asset whitelist (only FLR, USDC, FXRP, etc.)                 │       │
│  │  • Risk constraints (max leverage, max drawdown)                 │       │
│  │  • Fee structure (base fee to LP, performance split)             │       │
│  └─────────────────────────────────────────────────────────────────┘       │
│                                    │                                        │
│                                    ▼                                        │
│  ┌─────────────────────────────────────────────────────────────────┐       │
│  │              EXECUTION CONTROLLER                                │       │
│  │                                                                   │       │
│  │  Before every action, validates:                                 │       │
│  │  • ERT is valid and not expired                                  │       │
│  │  • Caller is the ERT holder                                      │       │
│  │  • Action uses allowed protocol/adapter                          │       │
│  │  • Action uses allowed assets                                    │       │
│  │  • Position size within capital limit                            │       │
│  │  • Leverage within max allowed                                   │       │
│  │  • Current drawdown within limits                                │       │
│  └─────────────────────────────────────────────────────────────────┘       │
│                                    │                                        │
│                                    ▼                                        │
│  ┌─────────────────────────────────────────────────────────────────┐       │
│  │              EXECUTION LAYER (Phases 2-5)                        │       │
│  │                                                                   │       │
│  │  ┌───────────┐ ┌───────────┐ ┌───────────┐ ┌───────────┐        │       │
│  │  │ SparkDEX  │ │  Kinetic  │ │  Sceptre  │ │  Eternal  │        │       │
│  │  │  Adapter  │ │  Adapter  │ │  Adapter  │ │  Adapter  │        │       │
│  │  └───────────┘ └───────────┘ └───────────┘ └───────────┘        │       │
│  │                                                                   │       │
│  │  Adapters execute actions on external protocols using            │       │
│  │  capital from vaults (not from executor's wallet)                │       │
│  └─────────────────────────────────────────────────────────────────┘       │
│                                    │                                        │
│                                    ▼                                        │
│  ┌─────────────────────────────────────────────────────────────────┐       │
│  │              SETTLEMENT ENGINE                                   │       │
│  │                                                                   │       │
│  │  At ERT expiry or position close:                                │       │
│  │  1. Query FlareOracle (FTSO) for current prices                  │       │
│  │  2. Calculate realized + unrealized PnL                          │       │
│  │  3. Distribute fees:                                             │       │
│  │     • LP gets: Base fee (e.g., 2% APR) + Profit share (20%)     │       │
│  │     • Executor gets: Remaining profit (80%)                      │       │
│  │     • Losses deducted from executor's future earnings/deposit   │       │
│  │  4. Return capital to vault                                      │       │
│  │  5. Burn ERT                                                     │       │
│  └─────────────────────────────────────────────────────────────────┘       │
│                                                                             │
└────────────────────────────────────────────────────────────────────────────┘
```

---

## User Flows

### Flow 1: LP Deposits Capital

```
1. LP approves USDC to ExecutionVault
2. LP calls vault.deposit(10000 USDC)
3. Vault mints proportional shares to LP
4. Capital sits in vault, earning base yield from executor fees
5. LP can withdraw anytime (subject to utilization limits)
```

### Flow 2: Executor Requests Execution Rights

```
1. Executor specifies desired parameters:
   - Capital needed: 5000 USDC
   - Duration: 7 days
   - Protocols: SparkDEX, Kinetic
   - Max leverage: 3x
   - Willing to pay: 2% base + 20% profit share

2. ExecutionRightsNFT.mint() creates ERT with constraints
3. Executor pays upfront base fee (or stakes collateral for losses)
4. ERT is now active until expiry
```

### Flow 3: Executor Runs Strategy

```
1. Executor calls gateway.executeWithRights(ertId, actions[])

2. For each action, ExecutionController validates:
   - Is ERT valid and caller is holder? ✓
   - Is adapter in whitelist? ✓
   - Are assets in whitelist? ✓
   - Is position size within limit? ✓
   - Is leverage within limit? ✓
   - Is drawdown within limit? ✓

3. If all pass, execute through adapter using vault capital
4. Track position in PositionManager

Example strategy (3 actions):
  Action 1: SWAP 5000 USDC → 250,000 FLR via SparkDEX
  Action 2: STAKE 250,000 FLR → sFLR via Sceptre
  Action 3: SUPPLY sFLR to Kinetic as collateral
```

### Flow 4: Settlement at Expiry

```
1. ERT expires (or executor calls settle early)

2. SettlementEngine:
   a. Unwinds all positions (withdraw, unstake, swap back)
   b. Queries FlareOracle for all asset prices
   c. Calculates final PnL:
      - Started with: 5000 USDC equivalent
      - Ended with: 5400 USDC equivalent
      - Gross profit: 400 USDC

3. Fee distribution:
   - LP base fee: 5000 × 2% × (7/365) = 1.92 USDC
   - LP profit share: 400 × 20% = 80 USDC
   - Total to LP: 81.92 USDC
   - Executor profit: 400 × 80% = 320 USDC

4. Capital (5000 USDC) returned to vault
5. ERT burned
```

### Flow 5: FDC-Triggered Execution (Cross-Chain)

```
1. User wants to execute strategy when BTC payment confirms on Bitcoin

2. Setup:
   - User creates ERT with trigger condition
   - FDCVerifier monitors for Payment attestation

3. When BTC payment confirms:
   a. Anyone can submit FDC proof to PRAXIS
   b. FDCVerifier.verifyPayment() confirms the proof
   c. Triggers automatic strategy execution
   d. E.g., Mint FBTC equivalent and deploy to yield

4. Use case: "When my BTC arrives, automatically stake it for yield"
```

---

## 📊 Implementation Progress

**Last Updated:** January 11, 2026

### Phase Status Overview

| Phase | Name | Status | Progress |
|-------|------|--------|----------|
| 1 | Foundation - FTSO & FDC Integration | ✅ **COMPLETE** | 100% |
| 2 | Execution Infrastructure - DEX Adapters | ⬜ Not Started | 0% |
| 3 | Execution Infrastructure - Yield Adapters | ⬜ Not Started | 0% |
| 4 | Execution Infrastructure - Perpetual Adapters | ⬜ Not Started | 0% |
| 5 | Execution Infrastructure - FAssets Support | ⬜ Not Started | 0% |
| 6 | Execution Vaults & Rights System | ⬜ Not Started | 0% |
| 7 | Settlement Engine & Gateway | ⬜ Not Started | 0% |
| 8 | Security & Audit | ⬜ Not Started | 0% |
| 9 | Mainnet Deployment | ⬜ Not Started | 0% |

### Deployed Contracts (Coston2 Testnet)

| Contract | Address | Verified | Purpose |
|----------|---------|----------|---------|
| FlareOracle | `0x0979854b028210Cf492a3bCB990B6a1D45d89eCc` | ⬜ | FTSO price feeds for settlement |
| FDCVerifier | `0xe667bEf52f1EAD93Cb0375639a4eA36001d4edf3` | ⬜ | Cross-chain proof verification |

### Test Results Summary

| Test Suite | Tests | Status |
|------------|-------|--------|
| Unit Tests (Local) | 52 | ✅ All Passing |
| Integration Tests (Coston2) | 15 | ✅ All Passing |

---

## Implementation Philosophy

### Core Principles

1. **No Custody Transfer**: Capital NEVER leaves vaults to executor wallets
2. **Constraint Enforcement**: Every action validated against ERT parameters
3. **Trustless Settlement**: PnL calculated using FTSO prices (not self-reported)
4. **Composability**: Works with existing Flare DeFi (SparkDEX, Kinetic, Sceptre)

### Testing Principles

- **No Mock Data**: All tests run against live Coston2 testnet protocols
- **No Hardcoded Values**: All addresses discovered dynamically via ContractRegistry
- **End-to-End Verification**: Each step validated with verbose tests
- **Adversarial Testing**: Attempt to bypass constraints, expect reverts

### Address Discovery Pattern

```solidity
// CORRECT - Dynamic discovery via Flare's ContractRegistry
IFtsoV2 ftso = ContractRegistry.getFtsoV2();

// INCORRECT - Hardcoded address
IFtsoV2 ftso = IFtsoV2(0x1234...);
```

---

## Phase 1: Foundation - FTSO & FDC Integration ✅ COMPLETE

### 1.1 Project Infrastructure Setup ✅

#### 1.1.1 Initialize Hardhat Project Structure ✅
**Status:** COMPLETE

- Hardhat 3 configured with Solidity 0.8.28 (EVM: cancun)
- All Flare networks configured (Coston2, Flare, Coston, Songbird)
- Flare periphery contracts installed (`@flarenetwork/flare-periphery-contracts`)

#### 1.1.2 Create Contracts Directory Structure ✅
**Status:** COMPLETE

- `contracts/{core,adapters,oracles,strategies,interfaces/external,lib}`
- `test/{unit,integration,fork,security}`
- `scripts/{deploy,helpers}`

#### 1.1.3 Create Library Contracts ✅
**Status:** COMPLETE

- `PraxisStructs.sol` - All data structures
- `PraxisErrors.sol` - Custom error definitions
- `PraxisEvents.sol` - Event definitions

### 1.2 FTSO v2 Oracle Integration ✅

**Purpose for PRAXIS:** Settlement Engine uses FTSO for trustless PnL calculation

#### 1.2.1 Research FTSO v2 Feed IDs ✅
- Created `scripts/helpers/feedIds.ts` with encoding functions
- Validated 63 supported feeds on Coston2
- Documented feed ID format (0x01 + ASCII name)

#### 1.2.2 Implement FlareOracle Contract ✅
- Dynamic ContractRegistry discovery
- Price queries: `getPrice()`, `getPriceInWei()`, `getPriceWithCheck()`
- Batch queries: `getMultiplePrices()`
- Token-to-feed mappings: `setTokenFeed()`, `getTokenPriceUSD()`
- Staleness checks (MAX_PRICE_AGE = 300 seconds)

#### 1.2.3 Deploy FlareOracle to Coston2 ✅
- Deployed to: `0x0979854b028210Cf492a3bCB990B6a1D45d89eCc`
- FTSO v2 connection verified (63 feeds discovered)

### 1.3 FDC Integration ✅

**Purpose for PRAXIS:** Enables cross-chain triggered execution (e.g., BTC payment → auto-stake)

#### 1.3.1 Research FDC Attestation Types ✅
- EVMTransaction, Payment, AddressValidity documented
- FDC Protocol ID: 200

#### 1.3.2 Implement FDCVerifier Contract ✅
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

## Phase 2: Execution Infrastructure - DEX Adapters

**Purpose:** Build the swap execution layer that ERTs can access

### 2.1 Adapter Interface Design

#### 2.1.1 Create Base Adapter Interfaces
**Deliverable:** Standard interfaces for all DEX adapters

**Tasks:**
- 2.1.1.1 Create `contracts/adapters/IAdapter.sol`:
  ```solidity
  interface IAdapter {
      function name() external view returns (string memory);
      function getQuote(address tokenIn, address tokenOut, uint256 amountIn)
          external view returns (uint256 amountOut, uint256 gasEstimate);
      function swap(
          address tokenIn,
          address tokenOut,
          uint256 amountIn,
          uint256 minAmountOut,
          address to,
          bytes calldata extraData
      ) external returns (uint256 amountOut);
  }
  ```
- 2.1.1.2 Create `contracts/adapters/BaseAdapter.sol` abstract contract
- 2.1.1.3 Add `executeFromVault()` function for vault-based execution

**Test 2.1.1-T1:** Interface Compilation
```bash
npx hardhat compile
```

### 2.2 SparkDEX V3 Adapter

#### 2.2.1 Research SparkDEX V3 Interface
**Deliverable:** Complete interface documentation

**Tasks:**
- 2.2.1.1 Find SparkDEX Router address on Coston2
- 2.2.1.2 Document swap/quote function signatures
- 2.2.1.3 Document pool fee tiers (100, 500, 3000, 10000 bps)
- 2.2.1.4 Create `contracts/interfaces/external/ISparkDEXRouter.sol`
- 2.2.1.5 Create `contracts/interfaces/external/ISparkDEXQuoter.sol`

#### 2.2.2 Implement SparkDEXAdapter
**Deliverable:** Working adapter for SparkDEX V3 swaps

**Tasks:**
- 2.2.2.1 Create `contracts/adapters/SparkDEXAdapter.sol`
- 2.2.2.2 Implement `getQuote()` using SparkDEX quoter
- 2.2.2.3 Implement `swap()` with exact input swap
- 2.2.2.4 Implement `swapFromVault()` for ERT-based execution
- 2.2.2.5 Handle fee tier selection in extraData

**Test 2.2.2-T1:** SparkDEXAdapter Quote Tests
```typescript
describe("SparkDEXAdapter", () => {
  it("should return valid quote for WFLR -> USDC", async () => {
    const [amountOut, gasEstimate] = await adapter.getQuote(
      wflrAddress,
      usdcAddress,
      ethers.parseEther("100")
    );
    expect(amountOut).to.be.gt(0);
    console.log(`Quote: 100 WFLR -> ${ethers.formatUnits(amountOut, 6)} USDC`);
  });
});
```

### 2.3 Enosys Adapter

#### 2.3.1 Research Enosys Interface
- Find Enosys Router address
- Document V3 interface (concentrated liquidity)
- Create `contracts/interfaces/external/IEnosysRouter.sol`

#### 2.3.2 Implement EnosysAdapter
- Same pattern as SparkDEXAdapter

### 2.4 BlazeSwap Adapter

#### 2.4.1 Research BlazeSwap Interface
- V2-style router (simpler interface)
- Create `contracts/interfaces/external/IBlazeSwapRouter.sol`

#### 2.4.2 Implement BlazeSwapAdapter
- Implement V2 getAmountsOut / swapExactTokensForTokens

### 2.5 SwapRouter Implementation

#### 2.5.1 Implement SwapRouter Core
**Deliverable:** DEX aggregator for best-rate finding

**Tasks:**
- 2.5.1.1 Create `contracts/core/SwapRouter.sol`
- 2.5.1.2 Adapter registry: `addAdapter()`, `removeAdapter()`
- 2.5.1.3 `getAllQuotes()` - queries all adapters
- 2.5.1.4 `findBestRoute()` - returns best adapter
- 2.5.1.5 `swap()` - executes through best route
- 2.5.1.6 `swapFromVault()` - executes using vault capital (for ERTs)
- 2.5.1.7 ReentrancyGuard, deadline validation, events

#### 2.5.2 Deploy to Coston2
- Deploy all adapters
- Deploy SwapRouter
- Register adapters
- Verify contracts

---

## Phase 3: Execution Infrastructure - Yield Adapters

**Purpose:** Build the yield execution layer for lending/staking

### 3.1 Lending Adapter Interface

#### 3.1.1 Create ILendingAdapter Interface
```solidity
interface ILendingAdapter {
    function supply(address asset, uint256 amount, address onBehalfOf) external returns (uint256 shares);
    function withdraw(address asset, uint256 shares, address to) external returns (uint256 amount);
    function borrow(address asset, uint256 amount, address onBehalfOf) external;
    function repay(address asset, uint256 amount, address onBehalfOf) external returns (uint256 repaid);
    function getSupplyAPY(address asset) external view returns (uint256 apyBps);
    function getBorrowAPY(address asset) external view returns (uint256 apyBps);
    function getSupplyBalance(address user, address asset) external view returns (uint256);
}
```

### 3.2 Kinetic Adapter

#### 3.2.1 Research Kinetic Protocol
- Compound-fork (kTokens)
- Find Comptroller address
- Document interest rate models

#### 3.2.2 Implement KineticAdapter
- `supply()` using kToken.mint()
- `withdraw()` using kToken.redeem()
- `borrow()` / `repay()` for leveraged strategies
- `getSupplyAPY()` from supply rate

### 3.3 Staking Adapter Interface

#### 3.3.1 Create IStakingAdapter Interface
```solidity
interface IStakingAdapter {
    function stake(uint256 amount, address onBehalfOf) external payable returns (uint256 shares);
    function requestUnstake(uint256 shares, address onBehalfOf) external returns (uint256 requestId);
    function completeUnstake(uint256 requestId, address to) external returns (uint256 amount);
    function getStakingAPY() external view returns (uint256 apyBps);
    function getCooldownPeriod() external view returns (uint256 seconds_);
}
```

### 3.4 Sceptre Adapter

#### 3.4.1 Research Sceptre Protocol
- sFLR liquid staking token
- Document stake/unstake functions
- Document cooldown mechanism

#### 3.4.2 Implement SceptreAdapter
- `stake()` - deposits FLR, receives sFLR
- `requestUnstake()` / `completeUnstake()` with cooldown
- Track staking positions

### 3.5 YieldRouter Implementation

- Registry of lending + staking adapters
- `getYieldOptions()` - returns all yield opportunities with APYs
- `deposit()` / `withdraw()` through adapters
- Risk level filtering (Conservative/Moderate/Aggressive)

---

## Phase 4: Execution Infrastructure - Perpetual Adapters

**Purpose:** Enable leveraged trading through ERTs

### 4.1 Perpetual Adapter Interface

#### 4.1.1 Create IPerpetualAdapter Interface
```solidity
interface IPerpetualAdapter {
    function openPosition(
        bytes32 market,
        uint256 collateral,
        uint256 size,
        uint8 leverage,
        bool isLong,
        address onBehalfOf
    ) external returns (bytes32 positionId);

    function closePosition(bytes32 positionId, address to) external returns (int256 pnl);
    function addMargin(bytes32 positionId, uint256 amount) external;
    function removeMargin(bytes32 positionId, uint256 amount, address to) external;
    function getPosition(bytes32 positionId) external view returns (PerpPosition memory);
    function getMarketInfo(bytes32 market) external view returns (PerpMarket memory);
    function getFundingRate(bytes32 market) external view returns (int256);
}
```

### 4.2 SparkDEX Eternal Adapter

#### 4.2.1 Research SparkDEX Eternal
- Perpetuals up to 100x leverage
- Document position management
- Document liquidation mechanics

#### 4.2.2 Implement SparkDEXEternalAdapter
- Position opening with leverage validation
- Position closing with PnL calculation
- Margin management
- Liquidation price calculation

**Critical for ERTs:** Leverage must be validated against ERT's maxLeverage constraint

---

## Phase 5: Execution Infrastructure - FAssets Support

**Purpose:** Enable FXRP, FBTC, FDOGE as tradeable assets

### 5.1 FAssets Adapter

#### 5.1.1 Research FAssets System
- FAssetManager contracts
- Minting/redemption process
- Available DEX liquidity

#### 5.1.2 Implement FAssetsAdapter
- `isFAsset()` detection
- `getFAssetInfo()` queries
- Integration with SwapRouter for FAsset pairs

### 5.2 FAsset-Specific Strategies

- FXRP → swap to FLR → stake for sFLR
- Carry trades (borrow against FXRP)
- Cross-chain triggered execution via FDC

---

## Phase 6: Execution Vaults & Rights System

**Purpose:** Core innovation - capital custody and execution rights

### 6.1 New Data Structures

#### 6.1.1 Add Execution Structs to PraxisStructs.sol

```solidity
/// @notice Execution Rights parameters embedded in ERT NFT
struct ExecutionRights {
    uint256 tokenId;              // ERT NFT ID
    address executor;             // Who holds the rights
    address vault;                // Source vault
    uint256 capitalLimit;         // Max capital to deploy
    uint256 startTime;            // When rights become active
    uint256 expiryTime;           // When rights expire
    RiskConstraints constraints;  // Risk limits
    FeeStructure fees;            // Fee parameters
    ExecutionStatus status;       // Current state
}

/// @notice Risk constraints enforced by ExecutionController
struct RiskConstraints {
    uint8 maxLeverage;            // Max leverage (e.g., 5 = 5x)
    uint16 maxDrawdownBps;        // Max drawdown in bps (1000 = 10%)
    uint16 maxPositionSizeBps;    // Max single position as % of capital
    address[] allowedAdapters;    // Whitelist of protocol adapters
    address[] allowedAssets;      // Whitelist of tradeable assets
}

/// @notice Fee structure for LP/Executor split
struct FeeStructure {
    uint16 baseFeeAprBps;         // Annual base fee to LP (200 = 2%)
    uint16 profitShareBps;        // LP's share of profits (2000 = 20%)
    uint256 performanceFeeEscrowed; // Executor's escrowed stake for losses
}

/// @notice Current execution status
struct ExecutionStatus {
    uint256 capitalDeployed;      // Currently deployed capital
    int256 realizedPnl;           // Closed position PnL
    int256 unrealizedPnl;         // Open position PnL (mark-to-market)
    uint256 highWaterMark;        // For performance fee calculation
    bool isActive;                // Whether ERT is currently active
}

/// @notice Vault share information
struct VaultShare {
    uint256 shares;               // LP's share tokens
    uint256 depositedAmount;      // Original deposit
    uint256 depositTime;          // For time-weighted calculations
}
```

### 6.2 ExecutionVault Contract

#### 6.2.1 Implement ExecutionVault
**Deliverable:** Vault that holds LP capital

```solidity
contract ExecutionVault is ERC4626, ReentrancyGuard, Ownable {
    // State
    mapping(uint256 => uint256) public ertCapitalAllocated; // ERT ID -> allocated capital
    uint256 public totalAllocated;

    // LP Functions
    function deposit(uint256 assets, address receiver) external returns (uint256 shares);
    function withdraw(uint256 assets, address receiver, address owner) external returns (uint256 shares);

    // ERT Functions (only callable by ExecutionController)
    function allocateCapital(uint256 ertId, uint256 amount) external onlyController;
    function executeAction(uint256 ertId, Action calldata action) external onlyController returns (bytes memory result);
    function returnCapital(uint256 ertId, uint256 amount, int256 pnl) external onlyController;

    // View Functions
    function availableCapital() external view returns (uint256);
    function utilizationRate() external view returns (uint256 bps);
}
```

**Tasks:**
- 6.2.1.1 Create `contracts/core/ExecutionVault.sol`
- 6.2.1.2 Implement ERC4626 vault standard for LP shares
- 6.2.1.3 Implement capital allocation tracking per ERT
- 6.2.1.4 Implement `executeAction()` that calls adapters with vault funds
- 6.2.1.5 Implement withdrawal limits based on utilization
- 6.2.1.6 Add events: `CapitalAllocated`, `CapitalReturned`, `ActionExecuted`

**Test 6.2.1-T1:** Vault LP Tests
```typescript
describe("ExecutionVault", () => {
  it("LP can deposit and receive shares", async () => {
    await usdc.approve(vault.address, parseUnits("10000", 6));
    const shares = await vault.deposit(parseUnits("10000", 6), lp.address);
    expect(shares).to.be.gt(0);
  });

  it("LP cannot withdraw more than available (respects utilization)", async () => {
    // Allocate 80% to an ERT
    // Try to withdraw 50%
    // Should revert with InsufficientAvailable
  });
});
```

### 6.3 ExecutionRightsNFT Contract

#### 6.3.1 Implement ERT NFT
**Deliverable:** ERC-721 that encodes execution permissions

```solidity
contract ExecutionRightsNFT is ERC721, ReentrancyGuard {
    mapping(uint256 => ExecutionRights) public rights;
    uint256 public nextTokenId;

    function mint(
        address executor,
        address vault,
        uint256 capitalLimit,
        uint256 duration,
        RiskConstraints calldata constraints,
        FeeStructure calldata fees
    ) external returns (uint256 tokenId);

    function getRights(uint256 tokenId) external view returns (ExecutionRights memory);
    function isValid(uint256 tokenId) external view returns (bool);
    function isExpired(uint256 tokenId) external view returns (bool);

    // Called by SettlementEngine
    function settle(uint256 tokenId) external onlySettlement;
}
```

**Tasks:**
- 6.3.1.1 Create `contracts/core/ExecutionRightsNFT.sol`
- 6.3.1.2 Implement ERC-721 with embedded ExecutionRights
- 6.3.1.3 Implement constraint validation on mint
- 6.3.1.4 Implement expiry checking
- 6.3.1.5 Implement transfer restrictions (can/cannot transfer ERTs)
- 6.3.1.6 Add events: `RightsMinted`, `RightsSettled`, `RightsExpired`

**Test 6.3.1-T1:** ERT Minting Tests
```typescript
describe("ExecutionRightsNFT", () => {
  it("should mint ERT with correct constraints", async () => {
    const tokenId = await ertNFT.mint(
      executor.address,
      vault.address,
      parseUnits("5000", 6), // 5000 USDC capital
      7 * 24 * 3600,         // 7 days
      {
        maxLeverage: 3,
        maxDrawdownBps: 1000, // 10%
        maxPositionSizeBps: 5000, // 50%
        allowedAdapters: [sparkdex.address, kinetic.address],
        allowedAssets: [usdc.address, wflr.address]
      },
      {
        baseFeeAprBps: 200,   // 2% APR
        profitShareBps: 2000, // 20% to LP
        performanceFeeEscrowed: 0
      }
    );

    const rights = await ertNFT.getRights(tokenId);
    expect(rights.executor).to.equal(executor.address);
    expect(rights.constraints.maxLeverage).to.equal(3);
  });
});
```

### 6.4 ExecutionController Contract

#### 6.4.1 Implement Constraint Enforcement
**Deliverable:** Validates every action against ERT constraints

```solidity
contract ExecutionController is ReentrancyGuard {
    ExecutionRightsNFT public ertNFT;
    mapping(address => bool) public registeredVaults;
    mapping(address => bool) public registeredAdapters;

    function validateAndExecute(
        uint256 ertId,
        Action[] calldata actions
    ) external returns (bytes[] memory results);

    // Internal validation
    function _validateERT(uint256 ertId, address caller) internal view;
    function _validateAction(ExecutionRights memory rights, Action calldata action) internal view;
    function _checkDrawdown(uint256 ertId) internal view;
    function _checkPositionSize(uint256 ertId, uint256 actionSize) internal view;
    function _checkLeverage(uint256 ertId, uint8 leverage) internal view;
}
```

**Validation Checks:**
1. ERT is valid and not expired
2. Caller is the ERT holder (or authorized delegate)
3. Adapter is in ERT's whitelist
4. Assets are in ERT's whitelist
5. Total deployed capital within limit
6. Leverage within maxLeverage
7. Current drawdown within maxDrawdownBps
8. Position size within maxPositionSizeBps

**Tasks:**
- 6.4.1.1 Create `contracts/core/ExecutionController.sol`
- 6.4.1.2 Implement ERT validation
- 6.4.1.3 Implement adapter whitelist checking
- 6.4.1.4 Implement asset whitelist checking
- 6.4.1.5 Implement leverage checking
- 6.4.1.6 Implement drawdown checking (requires position tracking)
- 6.4.1.7 Implement position size checking
- 6.4.1.8 Add events: `ActionValidated`, `ActionRejected`

**Test 6.4.1-T1:** Constraint Enforcement Tests
```typescript
describe("ExecutionController", () => {
  it("should reject action with non-whitelisted adapter", async () => {
    const actions = [{
      actionType: ActionType.SWAP,
      adapter: nonWhitelistedDex.address, // Not in ERT whitelist
      // ...
    }];

    await expect(
      controller.validateAndExecute(ertId, actions)
    ).to.be.revertedWithCustomError(controller, "AdapterNotAllowed");
  });

  it("should reject action exceeding max leverage", async () => {
    // ERT has maxLeverage = 3
    const actions = [{
      actionType: ActionType.OPEN_POSITION,
      // leverage: 5 encoded in extraData
    }];

    await expect(
      controller.validateAndExecute(ertId, actions)
    ).to.be.revertedWithCustomError(controller, "ExcessiveLeverage");
  });

  it("should reject if drawdown exceeds limit", async () => {
    // Setup: ERT has 10% max drawdown, current PnL is -12%
    // Any new action should be rejected
  });
});
```

### 6.5 PositionManager Contract

#### 6.5.1 Implement Position Tracking
**Deliverable:** Tracks all open positions per ERT

```solidity
contract PositionManager {
    struct TrackedPosition {
        uint256 ertId;
        address adapter;
        bytes32 positionId;      // From perp adapter or internal ID
        address asset;
        uint256 size;
        uint256 entryValue;      // USD value at entry (via FTSO)
        uint256 timestamp;
    }

    mapping(uint256 => TrackedPosition[]) public ertPositions;

    function recordPosition(uint256 ertId, TrackedPosition calldata pos) external onlyController;
    function closePosition(uint256 ertId, bytes32 positionId) external onlyController;
    function getPositions(uint256 ertId) external view returns (TrackedPosition[] memory);
    function calculateUnrealizedPnl(uint256 ertId) external view returns (int256);
}
```

### 6.6 Vault Safety System

**Purpose:** Prevent catastrophic losses from correlated executor failures

#### The Risk We're Protecting Against

```
Nightmare Scenario:
  - All executors go long FLR
  - FLR crashes 40%
  - All executors hit max drawdown simultaneously
  - Vault bleeds 10%+ in one day
  - LPs lose trust, bank run, PRAXIS dies
```

**Without protections, this WILL eventually happen. Markets crash.**

#### 6.6.1 Safety Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                    VAULT SAFETY SYSTEM                           │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│  Layer 1: UTILIZATION CAP                                       │
│     └─ Max 70% of vault can be allocated to ERTs                │
│     └─ 30% always in reserve, untouchable                       │
│                                                                  │
│  Layer 2: CIRCUIT BREAKER                                       │
│     └─ If daily vault loss > 5%, pause all new ERTs             │
│     └─ Force settle existing ERTs                               │
│     └─ Prevents cascading losses                                │
│                                                                  │
│  Layer 3: EXPOSURE LIMITS                                       │
│     └─ Max 30% of vault in any single asset                     │
│     └─ Forces diversification                                   │
│     └─ Not everyone can bet same direction                      │
│                                                                  │
│  Layer 4: INSURANCE RESERVE                                     │
│     └─ 2% of all profits go to insurance fund                   │
│     └─ Covers losses during black swan events                   │
│     └─ LPs protected up to fund size                            │
│                                                                  │
│  Layer 5: STAGGERED EXPIRY                                      │
│     └─ ERTs must have varied expiry dates                       │
│     └─ No more than 20% of capital in ERTs expiring same day    │
│     └─ Reduces settlement concentration risk                    │
│                                                                  │
└─────────────────────────────────────────────────────────────────┘
```

#### 6.6.2 UtilizationController Contract

```solidity
contract UtilizationController {
    uint256 public constant MAX_UTILIZATION_BPS = 7000; // 70%

    ExecutionVault public vault;

    function canAllocate(uint256 amount) external view returns (bool) {
        uint256 totalAssets = vault.totalAssets();
        uint256 currentAllocated = vault.totalAllocated();
        uint256 newUtilization = (currentAllocated + amount) * 10000 / totalAssets;

        return newUtilization <= MAX_UTILIZATION_BPS;
    }

    function availableForAllocation() external view returns (uint256) {
        uint256 totalAssets = vault.totalAssets();
        uint256 maxAllocatable = totalAssets * MAX_UTILIZATION_BPS / 10000;
        uint256 currentAllocated = vault.totalAllocated();

        if (currentAllocated >= maxAllocatable) return 0;
        return maxAllocatable - currentAllocated;
    }
}
```

**Tasks:**
- 6.6.2.1 Create `contracts/core/UtilizationController.sol`
- 6.6.2.2 Integrate with ExecutionVault for allocation checks
- 6.6.2.3 Add admin functions to adjust utilization cap in emergencies

#### 6.6.3 CircuitBreaker Contract

```solidity
contract CircuitBreaker {
    uint256 public constant MAX_DAILY_LOSS_BPS = 500; // 5%

    uint256 public dailyLossAccumulated;
    uint256 public lastResetTimestamp;
    bool public isPaused;

    ExecutionVault public vault;
    uint256 public snapshotTotalAssets; // Snapshot at day start

    function recordLoss(uint256 lossAmount) external onlySettlement {
        _resetIfNewDay();
        dailyLossAccumulated += lossAmount;
        _checkAndTrigger();
    }

    function _checkAndTrigger() internal {
        uint256 lossBps = dailyLossAccumulated * 10000 / snapshotTotalAssets;

        if (lossBps >= MAX_DAILY_LOSS_BPS) {
            isPaused = true;
            emit CircuitBreakerTriggered(dailyLossAccumulated, lossBps);
            // Force settle all active ERTs
            _forceSettleAll();
        }
    }

    function _resetIfNewDay() internal {
        if (block.timestamp >= lastResetTimestamp + 1 days) {
            dailyLossAccumulated = 0;
            lastResetTimestamp = block.timestamp;
            snapshotTotalAssets = vault.totalAssets();
            isPaused = false; // Auto-unpause on new day
        }
    }

    function _forceSettleAll() internal {
        // Iterate through active ERTs and force settlement
    }

    modifier whenNotPaused() {
        require(!isPaused, "Circuit breaker active");
        _;
    }
}
```

**Tasks:**
- 6.6.3.1 Create `contracts/core/CircuitBreaker.sol`
- 6.6.3.2 Track daily PnL across all settlements
- 6.6.3.3 Implement force-settle mechanism
- 6.6.3.4 Add manual unpause for admin (with timelock)

**Test 6.6.3-T1:** Circuit Breaker Tests
```typescript
describe("CircuitBreaker", () => {
  it("should trigger when daily loss exceeds 5%", async () => {
    // Vault has $100,000
    // Settle ERTs with total loss of $6,000 (6%)
    // Circuit breaker should trigger
    // New ERT minting should revert
  });

  it("should auto-reset on new day", async () => {
    // Trigger circuit breaker
    // Advance time by 1 day
    // Circuit breaker should be inactive
    // New ERTs should be allowed
  });

  it("should force settle all active ERTs on trigger", async () => {
    // Create 5 active ERTs
    // Trigger circuit breaker
    // All 5 should be settled
  });
});
```

#### 6.6.4 ExposureManager Contract

```solidity
contract ExposureManager {
    uint256 public constant MAX_SINGLE_ASSET_BPS = 3000; // 30%

    mapping(address => uint256) public assetExposure; // asset => total USD exposure
    ExecutionVault public vault;
    FlareOracle public oracle;

    function canAddExposure(address asset, uint256 usdAmount) external view returns (bool) {
        uint256 totalAssets = vault.totalAssets();
        uint256 maxExposure = totalAssets * MAX_SINGLE_ASSET_BPS / 10000;
        uint256 newExposure = assetExposure[asset] + usdAmount;

        return newExposure <= maxExposure;
    }

    function recordExposure(address asset, uint256 usdAmount) external onlyController {
        assetExposure[asset] += usdAmount;
        emit ExposureAdded(asset, usdAmount, assetExposure[asset]);
    }

    function removeExposure(address asset, uint256 usdAmount) external onlyController {
        if (assetExposure[asset] >= usdAmount) {
            assetExposure[asset] -= usdAmount;
        } else {
            assetExposure[asset] = 0;
        }
        emit ExposureRemoved(asset, usdAmount, assetExposure[asset]);
    }

    function getExposure(address asset) external view returns (uint256 exposure, uint256 maxAllowed, uint256 utilizationBps) {
        uint256 totalAssets = vault.totalAssets();
        maxAllowed = totalAssets * MAX_SINGLE_ASSET_BPS / 10000;
        exposure = assetExposure[asset];
        utilizationBps = exposure * 10000 / maxAllowed;
    }
}
```

**Tasks:**
- 6.6.4.1 Create `contracts/core/ExposureManager.sol`
- 6.6.4.2 Track exposure per asset in USD terms (via FlareOracle)
- 6.6.4.3 Reject ERT actions that would exceed asset exposure limits
- 6.6.4.4 Update exposure on position open/close

**Test 6.6.4-T1:** Exposure Limit Tests
```typescript
describe("ExposureManager", () => {
  it("should reject action exceeding asset exposure limit", async () => {
    // Vault has $100,000
    // Max FLR exposure: $30,000
    // ERT #1 has $25,000 in FLR
    // ERT #2 tries to add $10,000 in FLR
    // Should revert: would exceed 30% limit
  });

  it("should allow action within exposure limit", async () => {
    // Same setup but ERT #2 tries $4,000 in FLR
    // Should succeed: total $29,000 < $30,000
  });
});
```

#### 6.6.5 InsuranceFund Contract

```solidity
contract InsuranceFund {
    uint256 public constant INSURANCE_FEE_BPS = 200; // 2% of profits

    uint256 public fundBalance;
    ExecutionVault public vault;

    function collectFromProfit(uint256 profit) external onlySettlement returns (uint256 collected) {
        collected = profit * INSURANCE_FEE_BPS / 10000;
        fundBalance += collected;
        emit InsuranceCollected(collected, fundBalance);
    }

    function coverLoss(uint256 lossAmount) external onlySettlement returns (uint256 covered) {
        covered = lossAmount > fundBalance ? fundBalance : lossAmount;
        fundBalance -= covered;

        // Transfer covered amount back to vault
        IERC20(vault.asset()).transfer(address(vault), covered);

        emit LossCovered(lossAmount, covered, fundBalance);
    }

    function fundStatus() external view returns (uint256 balance, uint256 coverageRatio) {
        balance = fundBalance;
        coverageRatio = fundBalance * 10000 / vault.totalAssets(); // bps
    }
}
```

**Tasks:**
- 6.6.5.1 Create `contracts/core/InsuranceFund.sol`
- 6.6.5.2 Deduct 2% from profitable settlements
- 6.6.5.3 Use fund to cover losses before LP absorbs
- 6.6.5.4 Add emergency withdrawal (with timelock + multisig)

**Fee Flow Update:**
```
Before Insurance:
  Profit $600 → LP gets $120 (20%) → Executor gets $480 (80%)

After Insurance:
  Profit $600 → Insurance gets $12 (2%) → LP gets $118 (19.6%) → Executor gets $470 (78.4%)

On Loss:
  Loss $500 → Insurance covers first $500 (if available) → LP absorbs remainder
```

#### 6.6.6 Staggered Expiry Enforcement

```solidity
// In ExecutionRightsNFT.sol

mapping(uint256 => uint256) public dailyExpiryAmount; // day timestamp => total capital expiring

uint256 public constant MAX_DAILY_EXPIRY_BPS = 2000; // 20%

function mint(...) external returns (uint256 tokenId) {
    // ... existing validation ...

    // Check expiry concentration
    uint256 expiryDay = (block.timestamp + duration) / 1 days * 1 days;
    uint256 totalAssets = vault.totalAssets();
    uint256 maxDailyExpiry = totalAssets * MAX_DAILY_EXPIRY_BPS / 10000;

    require(
        dailyExpiryAmount[expiryDay] + capitalLimit <= maxDailyExpiry,
        "Too much capital expiring on this day"
    );

    dailyExpiryAmount[expiryDay] += capitalLimit;

    // ... rest of mint logic ...
}
```

**Tasks:**
- 6.6.6.1 Add expiry concentration tracking to ExecutionRightsNFT
- 6.6.6.2 Reject ERTs that would concentrate too much on one expiry day
- 6.6.6.3 Suggest alternative expiry dates to executors

#### 6.6.7 Safety System Summary

| Protection | Trigger | Action | Effect |
|------------|---------|--------|--------|
| Reputation Tiers | New executor | Start at Tier 0 ($100 max) | Griefing economically irrational |
| Stake Requirement | ERT mint | Collect stake > max drawdown | LP loss covered by stake |
| Utilization Cap | Allocation > 70% | Block new ERTs | 30% always safe |
| Circuit Breaker | Daily loss > 5% | Pause + force settle | Stop bleeding |
| Exposure Limits | Asset > 30% | Block action | Force diversification |
| Insurance Fund | Any loss | Cover from fund | LP protected |
| Staggered Expiry | Day expiry > 20% | Block ERT | Spread risk |

**Test 6.6.7-T1:** Full Safety System Integration Test
```typescript
describe("Safety System Integration", () => {
  it("should survive simulated market crash", async () => {
    // Setup: Vault with $100,000, 70% allocated across 10 ERTs
    // Simulate: FLR drops 40%
    // Expected:
    //   - Circuit breaker triggers at 5% loss
    //   - Remaining ERTs force settled
    //   - Insurance fund covers some losses
    //   - Vault loses ~5-7%, not 10%+
    //   - System recovers next day
  });
});
```

### 6.7 Reputation-Based Tier System

**Purpose:** Solve the "free option" problem — executors must have skin in the game, earned through track record

#### The Problem We're Solving

```
Without reputation system:
  - Anyone can request $100k with minimal stake
  - Lose intentionally, walk away
  - Create new wallet, repeat

With reputation system:
  - New users start small, must prove themselves
  - Lower collateral is EARNED, not requested
  - Griefing becomes economically irrational
```

#### 6.7.1 Tier Structure

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                    EXECUTOR REPUTATION TIERS                                 │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                              │
│  TIER 0 - Unverified (brand new wallet)                                     │
│    Max capital: $100                                                        │
│    Stake required: 50%                                                      │
│    Max drawdown: 20%                                                        │
│    Allowed strategies: Conservative only (staking, lending)                 │
│    Requirement: None                                                        │
│                                                                              │
│  TIER 1 - Novice (some history)                                             │
│    Max capital: $1,000                                                      │
│    Stake required: 25%                                                      │
│    Max drawdown: 15%                                                        │
│    Allowed strategies: Conservative + Moderate                              │
│    Requirement: 3+ profitable settlements at Tier 0                         │
│                                                                              │
│  TIER 2 - Verified (proven track record)                                    │
│    Max capital: $10,000                                                     │
│    Stake required: 15%                                                      │
│    Max drawdown: 10%                                                        │
│    Allowed strategies: All except high-leverage perps                       │
│    Requirement: 10+ settlements, >60% profitable, at Tier 1                 │
│                                                                              │
│  TIER 3 - Established (consistent performer)                                │
│    Max capital: $100,000                                                    │
│    Stake required: 10%                                                      │
│    Max drawdown: 10%                                                        │
│    Allowed strategies: All strategies                                       │
│    Requirement: 25+ settlements, >65% profitable, >$50k volume              │
│                                                                              │
│  TIER 4 - Elite (top performers / whitelisted)                              │
│    Max capital: $500,000+                                                   │
│    Stake required: 5%                                                       │
│    Max drawdown: 15%                                                        │
│    Allowed strategies: All + custom limits                                  │
│    Requirement: 50+ settlements, >70% profitable, DAO approval OR           │
│                 KYC'd institutional entity                                  │
│                                                                              │
│  GOLDEN RULE: Stake % always > Max Drawdown % → LP never loses             │
│                                                                              │
└─────────────────────────────────────────────────────────────────────────────┘
```

#### 6.7.2 Reputation Data Structures

```solidity
// Add to PraxisStructs.sol

/// @notice Executor reputation tier
enum ExecutorTier {
    UNVERIFIED,  // Tier 0 - New wallet
    NOVICE,      // Tier 1 - Some history
    VERIFIED,    // Tier 2 - Proven track record
    ESTABLISHED, // Tier 3 - Consistent performer
    ELITE        // Tier 4 - Top performer / whitelisted
}

/// @notice Tier configuration
struct TierConfig {
    uint256 maxCapital;          // Max capital in USD (6 decimals)
    uint16 stakeRequiredBps;     // Stake as % of capital (2500 = 25%)
    uint16 maxDrawdownBps;       // Max loss allowed (1500 = 15%)
    uint8 allowedRiskLevel;      // 0=Conservative, 1=Moderate, 2=Aggressive
    uint256 settlementsRequired; // Settlements needed to reach this tier
    uint256 profitRateBps;       // Required profitable % (6500 = 65%)
    uint256 volumeRequired;      // Total volume in USD required
}

/// @notice Executor's reputation record
struct ExecutorReputation {
    ExecutorTier tier;
    uint256 totalSettlements;    // Total ERTs settled
    uint256 profitableSettlements; // ERTs that made profit
    uint256 totalVolumeUsd;      // Cumulative capital used
    int256 totalPnlUsd;          // Lifetime PnL
    uint256 largestLossBps;      // Worst single loss (for risk assessment)
    uint256 consecutiveProfits;  // Current streak
    uint256 consecutiveLosses;   // Current loss streak
    uint256 lastSettlementTime;  // For activity tracking
    bool isWhitelisted;          // DAO/admin approved
    bool isBanned;               // Banned for malicious behavior
}
```

#### 6.7.3 ReputationManager Contract

```solidity
contract ReputationManager {
    // Tier configurations
    mapping(ExecutorTier => TierConfig) public tierConfigs;

    // Executor reputations
    mapping(address => ExecutorReputation) public reputations;

    // Events
    event TierUpgrade(address indexed executor, ExecutorTier oldTier, ExecutorTier newTier);
    event TierDowngrade(address indexed executor, ExecutorTier oldTier, ExecutorTier newTier);
    event ReputationUpdated(address indexed executor, uint256 settlements, int256 totalPnl);
    event ExecutorBanned(address indexed executor, string reason);
    event ExecutorWhitelisted(address indexed executor);

    constructor() {
        // Initialize tier configs
        tierConfigs[ExecutorTier.UNVERIFIED] = TierConfig({
            maxCapital: 100e6,        // $100
            stakeRequiredBps: 5000,   // 50%
            maxDrawdownBps: 2000,     // 20%
            allowedRiskLevel: 0,      // Conservative only
            settlementsRequired: 0,
            profitRateBps: 0,
            volumeRequired: 0
        });

        tierConfigs[ExecutorTier.NOVICE] = TierConfig({
            maxCapital: 1000e6,       // $1,000
            stakeRequiredBps: 2500,   // 25%
            maxDrawdownBps: 1500,     // 15%
            allowedRiskLevel: 1,      // Conservative + Moderate
            settlementsRequired: 3,
            profitRateBps: 5000,      // 50% profitable
            volumeRequired: 0
        });

        tierConfigs[ExecutorTier.VERIFIED] = TierConfig({
            maxCapital: 10000e6,      // $10,000
            stakeRequiredBps: 1500,   // 15%
            maxDrawdownBps: 1000,     // 10%
            allowedRiskLevel: 1,      // Up to Moderate
            settlementsRequired: 10,
            profitRateBps: 6000,      // 60% profitable
            volumeRequired: 5000e6   // $5k volume
        });

        tierConfigs[ExecutorTier.ESTABLISHED] = TierConfig({
            maxCapital: 100000e6,     // $100,000
            stakeRequiredBps: 1000,   // 10%
            maxDrawdownBps: 1000,     // 10%
            allowedRiskLevel: 2,      // All strategies
            settlementsRequired: 25,
            profitRateBps: 6500,      // 65% profitable
            volumeRequired: 50000e6  // $50k volume
        });

        tierConfigs[ExecutorTier.ELITE] = TierConfig({
            maxCapital: 500000e6,     // $500,000
            stakeRequiredBps: 500,    // 5%
            maxDrawdownBps: 1500,     // 15%
            allowedRiskLevel: 2,      // All strategies
            settlementsRequired: 50,
            profitRateBps: 7000,      // 70% profitable
            volumeRequired: 500000e6 // $500k volume
        });
    }

    /// @notice Get executor's current tier config
    function getExecutorTierConfig(address executor) external view returns (TierConfig memory) {
        return tierConfigs[reputations[executor].tier];
    }

    /// @notice Check if executor can request given capital amount
    function canRequestCapital(address executor, uint256 capitalUsd) external view returns (bool) {
        ExecutorReputation memory rep = reputations[executor];
        if (rep.isBanned) return false;

        TierConfig memory config = tierConfigs[rep.tier];
        return capitalUsd <= config.maxCapital;
    }

    /// @notice Get required stake for executor and capital amount
    function getRequiredStake(address executor, uint256 capitalUsd) external view returns (uint256) {
        TierConfig memory config = tierConfigs[reputations[executor].tier];
        return capitalUsd * config.stakeRequiredBps / 10000;
    }

    /// @notice Record settlement and update reputation (called by SettlementEngine)
    function recordSettlement(
        address executor,
        uint256 capitalUsed,
        int256 pnl,
        uint256 maxDrawdownHit // Actual max drawdown during ERT lifetime
    ) external onlySettlement {
        ExecutorReputation storage rep = reputations[executor];

        rep.totalSettlements++;
        rep.totalVolumeUsd += capitalUsed;
        rep.totalPnlUsd += pnl;
        rep.lastSettlementTime = block.timestamp;

        if (pnl > 0) {
            rep.profitableSettlements++;
            rep.consecutiveProfits++;
            rep.consecutiveLosses = 0;
        } else {
            rep.consecutiveLosses++;
            rep.consecutiveProfits = 0;

            // Track worst loss
            uint256 lossBps = uint256(-pnl) * 10000 / capitalUsed;
            if (lossBps > rep.largestLossBps) {
                rep.largestLossBps = lossBps;
            }
        }

        // Check for tier upgrade
        _checkTierUpgrade(executor);

        // Check for tier downgrade (consecutive losses)
        _checkTierDowngrade(executor);

        emit ReputationUpdated(executor, rep.totalSettlements, rep.totalPnlUsd);
    }

    /// @notice Check if executor qualifies for tier upgrade
    function _checkTierUpgrade(address executor) internal {
        ExecutorReputation storage rep = reputations[executor];

        // Can't upgrade if banned or already elite
        if (rep.isBanned || rep.tier == ExecutorTier.ELITE) return;

        // Check next tier requirements
        ExecutorTier nextTier = ExecutorTier(uint8(rep.tier) + 1);
        TierConfig memory nextConfig = tierConfigs[nextTier];

        uint256 profitRate = rep.totalSettlements > 0
            ? rep.profitableSettlements * 10000 / rep.totalSettlements
            : 0;

        bool meetsSettlements = rep.totalSettlements >= nextConfig.settlementsRequired;
        bool meetsProfitRate = profitRate >= nextConfig.profitRateBps;
        bool meetsVolume = rep.totalVolumeUsd >= nextConfig.volumeRequired;

        // Elite tier requires whitelist OR meeting all requirements
        if (nextTier == ExecutorTier.ELITE) {
            if (rep.isWhitelisted || (meetsSettlements && meetsProfitRate && meetsVolume)) {
                emit TierUpgrade(executor, rep.tier, nextTier);
                rep.tier = nextTier;
            }
        } else if (meetsSettlements && meetsProfitRate && meetsVolume) {
            emit TierUpgrade(executor, rep.tier, nextTier);
            rep.tier = nextTier;
        }
    }

    /// @notice Downgrade tier on consecutive losses
    function _checkTierDowngrade(address executor) internal {
        ExecutorReputation storage rep = reputations[executor];

        // 5 consecutive losses = drop one tier
        if (rep.consecutiveLosses >= 5 && rep.tier != ExecutorTier.UNVERIFIED) {
            ExecutorTier oldTier = rep.tier;
            rep.tier = ExecutorTier(uint8(rep.tier) - 1);
            rep.consecutiveLosses = 0; // Reset after downgrade
            emit TierDowngrade(executor, oldTier, rep.tier);
        }
    }

    /// @notice Admin: Whitelist executor for Elite tier
    function whitelistExecutor(address executor) external onlyOwner {
        reputations[executor].isWhitelisted = true;
        emit ExecutorWhitelisted(executor);
        _checkTierUpgrade(executor);
    }

    /// @notice Admin: Ban malicious executor
    function banExecutor(address executor, string calldata reason) external onlyOwner {
        reputations[executor].isBanned = true;
        emit ExecutorBanned(executor, reason);
    }

    /// @notice Admin: Update tier config
    function setTierConfig(ExecutorTier tier, TierConfig calldata config) external onlyOwner {
        // Validate: stake must be > max drawdown
        require(config.stakeRequiredBps > config.maxDrawdownBps, "Stake must exceed max drawdown");
        tierConfigs[tier] = config;
    }
}
```

**Tasks:**
- 6.7.3.1 Create `contracts/core/ReputationManager.sol`
- 6.7.3.2 Initialize tier configurations
- 6.7.3.3 Implement reputation tracking on settlement
- 6.7.3.4 Implement tier upgrade logic
- 6.7.3.5 Implement tier downgrade on consecutive losses
- 6.7.3.6 Add admin functions for whitelist/ban

#### 6.7.4 Integration with ExecutionRightsNFT

```solidity
// In ExecutionRightsNFT.sol

ReputationManager public reputationManager;

function mint(
    address executor,
    address vault,
    uint256 capitalLimit,
    uint256 duration,
    RiskConstraints calldata constraints,
    FeeStructure calldata fees
) external payable returns (uint256 tokenId) {
    // Get executor's tier config
    TierConfig memory tierConfig = reputationManager.getExecutorTierConfig(executor);
    ExecutorReputation memory rep = reputationManager.reputations(executor);

    // Validate against tier limits
    require(!rep.isBanned, "Executor is banned");
    require(capitalLimit <= tierConfig.maxCapital, "Capital exceeds tier limit");
    require(
        constraints.maxDrawdownBps <= tierConfig.maxDrawdownBps,
        "Drawdown exceeds tier limit"
    );
    require(
        _getRiskLevel(constraints) <= tierConfig.allowedRiskLevel,
        "Strategy risk exceeds tier allowance"
    );

    // Calculate and collect required stake
    uint256 requiredStake = capitalLimit * tierConfig.stakeRequiredBps / 10000;
    require(msg.value >= requiredStake, "Insufficient stake");

    // Store stake with ERT
    fees.performanceFeeEscrowed = msg.value;

    // ... rest of mint logic
}

function _getRiskLevel(RiskConstraints calldata constraints) internal pure returns (uint8) {
    // Conservative: No leverage, only staking/lending adapters
    // Moderate: Up to 2x leverage, includes DEX swaps
    // Aggressive: Any leverage, includes perps

    if (constraints.maxLeverage > 2) return 2; // Aggressive

    // Check if perp adapter is in whitelist
    for (uint i = 0; i < constraints.allowedAdapters.length; i++) {
        if (_isPerpAdapter(constraints.allowedAdapters[i])) return 2;
    }

    if (constraints.maxLeverage > 1) return 1; // Moderate
    return 0; // Conservative
}
```

#### 6.7.5 Stake Handling in Settlement

```solidity
// In SettlementEngine.sol

function _distributeFees(uint256 ertId, int256 pnl) internal returns (SettlementResult memory result) {
    ExecutionRights memory rights = ertNFT.getRights(ertId);
    uint256 stake = rights.fees.performanceFeeEscrowed;

    if (pnl >= 0) {
        // PROFITABLE: Return stake + distribute profits
        uint256 profit = uint256(pnl);

        // Insurance takes 2% of profit
        uint256 insuranceCut = profit * 200 / 10000;
        insuranceFund.collectFromProfit(insuranceCut);
        profit -= insuranceCut;

        // LP gets base fee + 20% of remaining profit
        result.lpBaseFee = _calculateBaseFee(rights);
        result.lpProfitShare = profit * rights.fees.profitShareBps / 10000;

        // Executor gets 80% of profit + full stake back
        result.executorProfit = profit - result.lpProfitShare;

        // Return stake to executor
        payable(rights.executor).transfer(stake);

    } else {
        // LOSS: Deduct from stake first
        uint256 loss = uint256(-pnl);

        if (loss <= stake) {
            // Stake covers entire loss
            uint256 stakeReturned = stake - loss;
            payable(rights.executor).transfer(stakeReturned);
            // LP loses nothing
            result.lpProfitShare = 0;
        } else {
            // Loss exceeds stake
            uint256 lpLoss = loss - stake;

            // Try to cover from insurance fund
            uint256 covered = insuranceFund.coverLoss(lpLoss);
            uint256 remainingLoss = lpLoss - covered;

            // LP absorbs only what insurance couldn't cover
            // This should be rare if stake > max drawdown
            result.lpProfitShare = 0; // Actually negative, tracked separately

            // Executor loses entire stake
            // Stake stays in contract (goes to vault to offset loss)
        }
    }

    // Update reputation
    reputationManager.recordSettlement(
        rights.executor,
        rights.capitalLimit,
        pnl,
        rights.status.maxDrawdownHit
    );

    return result;
}
```

#### 6.7.6 Griefing Analysis

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                    GRIEFING COST ANALYSIS                                    │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                              │
│  SCENARIO: Attacker wants to grief $100k from vault                         │
│                                                                              │
│  WITHOUT Reputation System:                                                 │
│    - Request $100k with minimal stake                                       │
│    - Intentionally lose 10% = $10k                                          │
│    - Walk away, create new wallet                                           │
│    - Cost to attacker: ~$0                                                  │
│    - LP loss: $10k                                                          │
│                                                                              │
│  WITH Reputation System:                                                    │
│    Path to $100k access (Tier 3):                                          │
│                                                                              │
│    Tier 0 ($100, 50% stake = $50):                                         │
│      - 3 profitable settlements needed                                      │
│      - Each: stake $50, profit or lose small amount                        │
│      - Min cost: $150 in stakes (returned if profitable)                   │
│      - Time: ~1-2 weeks                                                     │
│                                                                              │
│    Tier 1 ($1k, 25% stake = $250):                                         │
│      - 7 more settlements needed (10 total)                                │
│      - Each: stake $250                                                     │
│      - Min cost: $1,750 in stakes                                          │
│      - Time: ~2-3 weeks                                                     │
│                                                                              │
│    Tier 2 ($10k, 15% stake = $1.5k):                                       │
│      - 15 more settlements needed (25 total)                               │
│      - Each: stake $1,500                                                   │
│      - Min cost: $22,500 in stakes                                         │
│      - Time: ~1-2 months                                                    │
│                                                                              │
│    Tier 3 ($100k, 10% stake = $10k):                                       │
│      - Finally can request $100k                                           │
│      - Must stake $10k                                                      │
│      - Max loss (10%): $10k                                                │
│      - Attacker's stake: COVERS THE LOSS                                   │
│                                                                              │
│    TOTAL COST TO GRIEF:                                                     │
│      - Time: 2-3 months of active trading                                  │
│      - Capital at risk: $24k+ in stakes along the way                      │
│      - Final attack: Lose $10k stake                                       │
│      - LP loss: $0 (stake covered it)                                      │
│                                                                              │
│    VERDICT: Economically irrational to grief                               │
│                                                                              │
└─────────────────────────────────────────────────────────────────────────────┘
```

#### 6.7.7 Reputation System Summary

| Tier | Max Capital | Stake | Max Drawdown | LP Protected? |
|------|-------------|-------|--------------|---------------|
| 0 - Unverified | $100 | 50% | 20% | ✅ Yes (50% > 20%) |
| 1 - Novice | $1,000 | 25% | 15% | ✅ Yes (25% > 15%) |
| 2 - Verified | $10,000 | 15% | 10% | ✅ Yes (15% > 10%) |
| 3 - Established | $100,000 | 10% | 10% | ✅ Yes (10% = 10%, insurance backup) |
| 4 - Elite | $500,000 | 5% | 15% | ⚠️ Partial (requires insurance + reputation) |

**Key Invariant:** `Stake % ≥ Max Drawdown %` at every tier (except Elite, which requires reputation)

**Test 6.7.7-T1:** Reputation System Tests
```typescript
describe("ReputationManager", () => {
  it("new executor starts at Tier 0", async () => {
    const rep = await reputationManager.reputations(newExecutor.address);
    expect(rep.tier).to.equal(0); // UNVERIFIED
  });

  it("executor upgrades to Tier 1 after 3 profitable settlements", async () => {
    // Simulate 3 profitable settlements
    for (let i = 0; i < 3; i++) {
      await settlement.settle(ertIds[i]); // All profitable
    }

    const rep = await reputationManager.reputations(executor.address);
    expect(rep.tier).to.equal(1); // NOVICE
  });

  it("executor downgrades after 5 consecutive losses", async () => {
    // Get to Tier 2 first
    // Then simulate 5 losses
    for (let i = 0; i < 5; i++) {
      await settlement.settle(losingErtIds[i]);
    }

    const rep = await reputationManager.reputations(executor.address);
    expect(rep.tier).to.equal(1); // Dropped from VERIFIED to NOVICE
  });

  it("cannot request capital above tier limit", async () => {
    // Tier 0 executor tries to request $1000
    await expect(
      gateway.requestExecutionRights(parseUnits("1000", 6), ...)
    ).to.be.revertedWith("Capital exceeds tier limit");
  });

  it("stake covers max drawdown loss completely", async () => {
    // Tier 1: $1000 capital, 25% stake = $250, 15% max drawdown = $150
    // Executor loses full 15% = $150
    // Stake returned: $250 - $150 = $100
    // LP loss: $0

    const lpBalanceBefore = await vault.totalAssets();
    await settlement.settle(losingErt);
    const lpBalanceAfter = await vault.totalAssets();

    expect(lpBalanceAfter).to.equal(lpBalanceBefore); // LP didn't lose
  });
});
```

---

## Phase 7: Settlement Engine & Gateway

**Purpose:** Trustless PnL calculation and unified entry point

### 7.1 SettlementEngine Contract

#### 7.1.1 Implement FTSO-Based Settlement
**Deliverable:** Calculates PnL using FlareOracle prices

```solidity
contract SettlementEngine {
    FlareOracle public oracle;
    ExecutionRightsNFT public ertNFT;
    PositionManager public positionManager;

    struct SettlementResult {
        uint256 ertId;
        int256 totalPnl;
        uint256 lpBaseFee;
        uint256 lpProfitShare;
        uint256 executorProfit;
        uint256 capitalReturned;
    }

    function settle(uint256 ertId) external returns (SettlementResult memory);
    function settleEarly(uint256 ertId) external; // Executor can settle before expiry
    function forceSettle(uint256 ertId) external; // Anyone can settle expired ERTs

    // Internal
    function _unwindPositions(uint256 ertId) internal returns (uint256 capitalRecovered);
    function _calculatePnl(uint256 ertId) internal view returns (int256);
    function _distributeFees(uint256 ertId, int256 pnl) internal returns (SettlementResult memory);
}
```

**Settlement Logic:**
```
1. Unwind all open positions (close perps, withdraw from lending, etc.)
2. Query FlareOracle for all asset prices
3. Calculate total PnL = (final value) - (initial capital)
4. If profit > 0:
   - LP base fee = capital × baseFeeApr × duration
   - LP profit share = profit × profitShareBps / 10000
   - Executor profit = profit - LP profit share
5. If loss:
   - Deduct from executor's escrowed stake (if any)
   - LP absorbs remaining loss (capped by ERT constraints)
6. Return capital to vault
7. Mark ERT as settled
```

**Tasks:**
- 7.1.1.1 Create `contracts/core/SettlementEngine.sol`
- 7.1.1.2 Implement position unwinding via adapters
- 7.1.1.3 Implement PnL calculation using FlareOracle
- 7.1.1.4 Implement fee distribution logic
- 7.1.1.5 Implement early settlement
- 7.1.1.6 Implement force settlement for expired ERTs
- 7.1.1.7 Add events: `Settled`, `FeesDistributed`

**Test 7.1.1-T1:** Settlement Tests
```typescript
describe("SettlementEngine", () => {
  it("should correctly calculate profitable settlement", async () => {
    // Setup: ERT deployed 5000 USDC, now worth 5500 USDC
    // Base fee: 2% APR for 7 days = ~1.92 USDC
    // Profit: 500 USDC
    // LP profit share (20%): 100 USDC
    // Executor profit (80%): 400 USDC

    const result = await settlement.settle(ertId);

    expect(result.totalPnl).to.equal(parseUnits("500", 6));
    expect(result.lpProfitShare).to.be.closeTo(parseUnits("100", 6), parseUnits("1", 6));
    expect(result.executorProfit).to.be.closeTo(parseUnits("400", 6), parseUnits("1", 6));
  });

  it("should handle losses correctly", async () => {
    // Setup: ERT deployed 5000 USDC, now worth 4500 USDC
    // Loss: 500 USDC
    // Executor escrowed 200 USDC
    // Executor loses escrow, LP absorbs 300 USDC
  });
});
```

### 7.2 PraxisGateway Contract

#### 7.2.1 Implement Unified Entry Point
**Deliverable:** Single contract for all PRAXIS interactions

```solidity
contract PraxisGateway is ReentrancyGuard, Pausable, Ownable {
    ExecutionVault public vault;
    ExecutionRightsNFT public ertNFT;
    ExecutionController public controller;
    SettlementEngine public settlement;
    SwapRouter public swapRouter;
    YieldRouter public yieldRouter;

    // ==================== LP Functions ====================

    function deposit(uint256 amount) external returns (uint256 shares);
    function withdraw(uint256 shares) external returns (uint256 amount);
    function getVaultInfo() external view returns (VaultInfo memory);

    // ==================== Executor Functions ====================

    function requestExecutionRights(
        uint256 capitalNeeded,
        uint256 duration,
        RiskConstraints calldata constraints
    ) external payable returns (uint256 ertId);

    function executeWithRights(
        uint256 ertId,
        Action[] calldata actions
    ) external returns (bytes[] memory results);

    function settleRights(uint256 ertId) external returns (SettlementResult memory);

    // ==================== View Functions ====================

    function getExecutionRights(uint256 ertId) external view returns (ExecutionRights memory);
    function getPositions(uint256 ertId) external view returns (TrackedPosition[] memory);
    function estimatePnl(uint256 ertId) external view returns (int256);

    // ==================== Convenience Functions ====================

    // For self-execution (user is both LP and executor)
    function depositAndExecute(
        uint256 depositAmount,
        Action[] calldata actions,
        RiskConstraints calldata constraints
    ) external returns (uint256 ertId);
}
```

**Tasks:**
- 7.2.1.1 Create `contracts/core/PraxisGateway.sol`
- 7.2.1.2 Wire up all sub-components
- 7.2.1.3 Implement LP functions
- 7.2.1.4 Implement executor functions
- 7.2.1.5 Implement convenience functions
- 7.2.1.6 Add pause functionality for emergencies
- 7.2.1.7 Add events for all operations

### 7.3 Deploy Complete System

#### 7.3.1 Deployment Script
```typescript
// scripts/deploy/deployAll.ts
async function main() {
  // 1. Deploy Oracle (already done)
  // 2. Deploy Adapters
  // 3. Deploy SwapRouter, YieldRouter
  // 4. Deploy ExecutionVault
  // 5. Deploy ExecutionRightsNFT
  // 6. Deploy ExecutionController
  // 7. Deploy PositionManager
  // 8. Deploy SettlementEngine
  // 9. Deploy PraxisGateway
  // 10. Wire up all permissions
  // 11. Verify all contracts
}
```

**Test 7.3.1-T1:** End-to-End Integration Test
```typescript
describe("PRAXIS E2E", () => {
  it("Complete flow: LP deposit -> Executor request -> Execute -> Settle", async () => {
    // 1. LP deposits 10,000 USDC
    await gateway.connect(lp).deposit(parseUnits("10000", 6));

    // 2. Executor requests rights for 5,000 USDC for 7 days
    const ertId = await gateway.connect(executor).requestExecutionRights(
      parseUnits("5000", 6),
      7 * 24 * 3600,
      { maxLeverage: 3, maxDrawdownBps: 1000, ... }
    );

    // 3. Executor runs strategy
    await gateway.connect(executor).executeWithRights(ertId, [
      { actionType: SWAP, adapter: sparkdex, tokenIn: usdc, tokenOut: wflr, ... },
      { actionType: STAKE, adapter: sceptre, tokenIn: wflr, ... }
    ]);

    // 4. Time passes, yield accrues
    await time.increase(7 * 24 * 3600);

    // 5. Settlement
    const result = await gateway.settle(ertId);

    console.log(`Total PnL: ${formatUnits(result.totalPnl, 6)} USDC`);
    console.log(`LP earned: ${formatUnits(result.lpBaseFee + result.lpProfitShare, 6)} USDC`);
    console.log(`Executor earned: ${formatUnits(result.executorProfit, 6)} USDC`);
  });
});
```

---

## Phase 8: Security & Audit

### 8.1 Static Analysis
- Slither analysis
- Mythril symbolic execution
- All high/medium issues resolved

### 8.2 Security Testing
- Reentrancy testing on all vault operations
- Constraint bypass attempts (should all fail)
- Flash loan resistance (FTSO prices not manipulable)
- Access control audit

### 8.3 Economic Security
- Drawdown limit effectiveness
- Liquidation edge cases
- Fee calculation accuracy

---

## Phase 9: Mainnet Deployment

### 9.1 Pre-Deployment Checklist
- All Coston2 tests passing
- 48 hours stable operation
- Slither clean
- Fork tests pass
- Multisig configured
- Monitoring set up

### 9.2 Deployment Order
1. FlareOracle (already deployed)
2. FDCVerifier (already deployed)
3. All Adapters
4. SwapRouter, YieldRouter
5. ExecutionVault
6. ExecutionRightsNFT
7. ExecutionController
8. PositionManager
9. SettlementEngine
10. PraxisGateway
11. Transfer ownership to multisig

---

## Contract Dependency Graph

```
                    PraxisGateway
                         │
         ┌───────────────┼───────────────┐
         │               │               │
         ▼               ▼               ▼
   ExecutionVault  ExecutionController  SettlementEngine
         │               │               │
         │               ▼               │
         │      ExecutionRightsNFT       │
         │               │               │
         │               ▼               │
         │       PositionManager ◄───────┘
         │               │
         └───────┬───────┘
                 │
                 ▼
    ┌────────────────────────┐
    │    Execution Layer     │
    │                        │
    │  SwapRouter            │
    │    ├─ SparkDEXAdapter  │
    │    ├─ EnosysAdapter    │
    │    └─ BlazeSwapAdapter │
    │                        │
    │  YieldRouter           │
    │    ├─ KineticAdapter   │
    │    └─ SceptreAdapter   │
    │                        │
    │  PerpRouter            │
    │    └─ EternalAdapter   │
    └────────────────────────┘
                 │
                 ▼
    ┌────────────────────────┐
    │    Oracle Layer        │
    │                        │
    │  FlareOracle (FTSO)    │
    │  FDCVerifier           │
    └────────────────────────┘
```

---

## Test Commands Reference

```bash
# Unit tests
npx hardhat test test/unit/**/*.test.ts

# Integration tests (requires Coston2 connection)
npx hardhat test test/integration/**/*.test.ts --network coston2

# E2E tests
npx hardhat test test/e2e/**/*.test.ts --network coston2

# Security tests
npx hardhat test test/security/**/*.test.ts

# Coverage report
npx hardhat coverage

# Gas report
REPORT_GAS=true npx hardhat test

# Slither analysis
slither contracts/ --print human-summary
```

---

## Appendix: Key Differentiators

### Why PRAXIS vs Existing Flare DeFi

| Feature | earnXRP | Kinetic | PRAXIS |
|---------|---------|---------|--------|
| Capital custody | Vault managers | Borrower | **Never leaves vault** |
| Strategy flexibility | Fixed | N/A | **Custom per executor** |
| Collateral required | N/A | Overcollateralized | **Zero collateral** |
| Risk management | Trust vault manager | Liquidation | **Smart contract constraints** |
| Who profits from alpha | Vault | Borrower | **Executor (80%) + LP (20%)** |

### The Alpha Sharing Economic Model

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                         PRAXIS ECONOMICS                                     │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                              │
│  FOR LPs (Capital Providers):                                               │
│  ┌────────────────────────────────────────────────────────────────────────┐ │
│  │  Guaranteed: 2% APR base fee (paid by executors upfront)               │ │
│  │  Upside:     20% of executor profits (alpha sharing)                   │ │
│  │  Downside:   Capped by max drawdown constraint (e.g., 10%)            │ │
│  │                                                                        │ │
│  │  Example with 10,000 USDC deposited:                                   │ │
│  │    Base case (executor breaks even):  +200 USDC/year                  │ │
│  │    Good case (executor makes 20%):    +200 + 400 = +600 USDC/year     │ │
│  │    Great case (executor makes 50%):   +200 + 1000 = +1200 USDC/year   │ │
│  │    Bad case (executor loses 10%):     +200 - 1000 = -800 USDC/year    │ │
│  │                                        (but loss capped at 10%)        │ │
│  └────────────────────────────────────────────────────────────────────────┘ │
│                                                                              │
│  FOR EXECUTORS (Traders/Strategists):                                       │
│  ┌────────────────────────────────────────────────────────────────────────┐ │
│  │  Access: Capital without collateral                                    │ │
│  │  Cost:   2% APR base fee + 20% profit share                           │ │
│  │  Keep:   80% of profits                                                │ │
│  │                                                                        │ │
│  │  Example with 10,000 USDC execution rights for 30 days:               │ │
│  │    Cost: 10000 × 2% × (30/365) = 16.44 USDC upfront                   │ │
│  │    If profit 5% (500 USDC):                                           │ │
│  │      LP share: 100 USDC                                                │ │
│  │      Executor keeps: 400 USDC                                          │ │
│  │      Net to executor: 400 - 16.44 = 383.56 USDC profit                │ │
│  └────────────────────────────────────────────────────────────────────────┘ │
│                                                                              │
│  FOR FLARE ECOSYSTEM:                                                       │
│  ┌────────────────────────────────────────────────────────────────────────┐ │
│  │  • Increased volume on SparkDEX, Enosys, BlazeSwap                    │ │
│  │  • Increased TVL on Kinetic, Sceptre                                  │ │
│  │  • Increased FAsset (FXRP) utility and demand                         │ │
│  │  • Novel primitive that attracts skilled traders to Flare             │ │
│  │  • Uses FTSO/FDC in production (showcases Flare infrastructure)       │ │
│  └────────────────────────────────────────────────────────────────────────┘ │
│                                                                              │
└─────────────────────────────────────────────────────────────────────────────┘
```

### Addressing Flare Feedback - Summary Checklist

| Concern | Solution | Status |
|---------|----------|--------|
| "Avoid overlapping" | Execution layer, not competing protocol | ✅ Addressed |
| "Complement existing" | Routes volume TO SparkDEX/Kinetic/Sceptre | ✅ Addressed |
| "Liquidity sourcing blocker" | Alpha sharing model - LPs earn from executor profits | ✅ Addressed |
| "Realistic implementation" | Phased: Self-execution → Whitelisted → Open | ✅ Addressed |

### Why Alpha Sharing Solves the Liquidity Problem

Traditional problem: "Why would LPs deposit in a new protocol?"

**PRAXIS answer:** Because nowhere else on Flare can LPs get **exposure to skilled trading alpha** without:
- Doing the trading themselves
- Trusting a centralized fund manager
- Risking unlimited downside

PRAXIS offers:
1. **Upside exposure** - 20% of profits from ANY executor using your capital
2. **Downside protection** - Smart contract enforced max loss (e.g., 10%)
3. **Capital safety** - Money never leaves vault, just gets deployed through adapters
4. **Diversification** - Capital spread across multiple executors automatically

This is essentially **"index fund for DeFi alpha on Flare"** - a product that doesn't exist.

### Realistic MVP Path

1. **Start with self-execution**: Users deposit and execute their own strategies
   - No third-party trust needed
   - Proves the constraint system works

2. **Add simple strategies**: DCA, auto-stake, yield optimization
   - Uses existing DEX/lending liquidity
   - No bootstrapping needed

3. **Enable third-party execution**: Let skilled traders use LP capital
   - Require executor staking/reputation
   - Start with whitelisted executors

4. **Open marketplace**: Permissionless execution rights
   - Full vision realized
   - LP chooses risk parameters
