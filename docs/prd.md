# PRAXIS

## Product Requirements & Technical Design Document

**Version:** v1.0
**Status:** Implementation-ready
**Target Chain:** Flare (native usage of FTSO, FDC, FAssets)

---

## 1. Product Definition

### 1.1 One-line Definition

**PRAXIS is a protocol for leasing execution rights over capital without transferring asset ownership, enabling trustless capital access, risk underwriting, and objective performance settlement.**

---

### 1.2 What PRAXIS Is

* A **capital execution protocol**
* A **new LP primitive** (execution risk underwriting)
* A **replacement for collateral-less lending attempts**
* Infrastructure for:

  * prop trading
  * AI agents
  * DAO execution
  * NFT strategies
  * cross-chain execution (via FAssets)

---

### 1.3 What PRAXIS Is NOT

* ❌ Lending protocol
* ❌ Borrowing protocol
* ❌ AMM
* ❌ Yield farm
* ❌ Governance-heavy DAO
* ❌ Asset custody service

---

## 2. Core Problem

### 2.1 Structural Impossibility

On public blockchains:

> Giving users custody over capital without collateral allows irreversible exit.

Therefore:

* collateral-less lending **cannot** be enforced
* repayment logic **cannot** be trusted
* liquidation-based systems introduce systemic risk

---

### 2.2 Market Gap

There exists **massive unmet demand** for:

* skilled operators without capital
* AI agents without custody
* execution without trust
* LPs who want **bounded, priced risk**

TradFi solves this via:

* prime brokers
* prop desks
* managed accounts
* legal enforcement

PRAXIS provides the **onchain primitive equivalent**.

---

## 3. Core Design Principle (Non-Negotiable)

> **Capital is never lent.
> Execution is leased.
> Ownership transfers only at settlement.**

Any implementation that violates this is invalid.

---

## 4. System Architecture

```
Vault (capital owner)
│
├── Execution Liquidity Pools (ELPs)
│     ├── Own strategy assets
│     ├── Hold LP capital
│     ├── Enforce execution bounds
│
└── Executors
      ├── Humans
      ├── Bots
      └── AI agents
```

---

## 5. Roles

### 5.1 Vault

* Owns capital only (ETH, stablecoins, FAssets)
* Issues execution rights
* Routes funds to pools
* Settles outcomes
* Distributes payouts

### 5.2 Execution Liquidity Pools (ELPs)

* Own strategy assets (NFTs, LP tokens, positions)
* Enforce risk bounds
* Accept LP liquidity permissionlessly
* Absorb bounded losses
* Return value to Vault at settlement

### 5.3 LPs

* Deposit capital into ELPs
* Underwrite execution risk
* Earn:

  * execution fees
  * risk premium
  * idle yield

### 5.4 Executors

* Receive **execution rights**
* Never receive custody
* Trigger execution logic
* Paid only at settlement

---

## 6. Asset Ownership Model

| Phase      | Capital | Strategy Assets | Executor           |
| ---------- | ------- | --------------- | ------------------ |
| Execution  | Vault   | Pool            | Owns nothing       |
| Settlement | Vault   | Liquidated      | Paid (if eligible) |

Ownership **never** transfers mid-execution.

---

## 7. Execution Rights

### 7.1 Definition

```solidity
struct ExecutionRight {
  address executor;
  address pool;
  uint64  startTime;
  uint64  expiryTime;
  bool    active;
}
```

* Non-transferable
* Time-bounded
* Auto-revoked
* Pool-specific

---

## 8. Vault Contract (Detailed)

### 8.1 Responsibilities

* Trust pools
* Grant/revoke execution rights
* Fund pools
* Settle outcomes

---

### 8.2 Storage

```solidity
mapping(bytes32 => ExecutionRight) executionRights;
mapping(address => bool) trustedPools;

address settlementAuthority;
IERC20 settlementAsset;
```

---

### 8.3 Core Functions

#### Register Pool

```solidity
function registerPool(address pool) external onlyAuthority;
```

---

#### Grant Execution Rights

```solidity
function grantExecutionRight(
  address executor,
  address pool,
  uint64 expiry
) external onlyAuthority;
```

---

#### Execute

```solidity
function execute(
  address pool,
  bytes calldata action
) external;
```

* Vault does not inspect calldata
* Forwards execution to pool

---

#### Settle

```solidity
function settle(address pool) external;
```

Settlement sequence:

1. Revoke execution rights
2. Call pool liquidation
3. Fetch FTSO baseline
4. Compute alpha
5. Distribute funds

---

## 9. Execution Liquidity Pool (ELP)

### 9.1 Pool Characteristics

* Long-lived contract
* LP-joinable
* Strategy-specific
* Permissionless liquidity

---

### 9.2 Pool Storage (Base)

```solidity
uint256 totalCapital;
uint256 totalShares;

mapping(address => uint256) lpShares;

uint256 accruedExecutionFees;

struct Bounds {
  uint256 maxDrawdown;
  uint256 maxExposure;
  uint256 maxPositionSize;
}
Bounds bounds;
```

---

### 9.3 LP Lifecycle

#### Add Liquidity (Permissionless)

```solidity
function addLiquidity(uint256 amount) external;
```

* Mints LP shares pro-rata
* Identical to AMM LP logic

---

#### Remove Liquidity

```solidity
function removeLiquidity(uint256 shares) external;
```

* Can be immediate or epoch-based
* Withdrawals may be paused during execution

---

### 9.4 Execution Entry Point

```solidity
function execute(bytes calldata action) external;
```

Must enforce:

* execution bounds
* exposure limits
* price sanity checks (via FTSO)

---

### 9.5 Liquidation

```solidity
function liquidate() external returns (uint256 finalValue);
```

* Converts strategy assets to settlement asset
* Or reports NAV via oracle pricing

---

## 10. Example Pool: NFT Execution Pool

### 10.1 Additional Storage

```solidity
address marketplace;
mapping(address => bool) allowedCollections;

uint256 maxNFTPrice;
uint256 maxPremiumBps;
```

---

### 10.2 Execution Logic

```solidity
execute(
  collection,
  tokenId,
  price
)
```

Checks:

* collection allowed
* price ≤ maxNFTPrice
* price within floor premium (FTSO)

NFT owned by pool.

---

## 11. Incentive Model

### 11.1 LP Revenue Streams

1. **Execution Access Fees**

   * Paid per execution or per day
   * Guaranteed

2. **Risk Premium**

   * Senior profit share
   * Paid before executors

3. **Idle Capital Yield**

   * Optional passive yield
   * Benchmarking via FTSO

---

### 11.2 Executor Compensation

* Paid **only on alpha**
* No profit → no payout
* Disappearing executor earns nothing

---

## 12. Objective Performance (FTSO)

Used for:

* Asset pricing
* Floor prices
* NAV computation
* Alpha vs baseline

```text
alpha = finalValue − baselineValue
```

Executor payout based on alpha only.

---

## 13. Real-World Triggers (FDC)

Used for:

* execution gating
* forced settlement
* emergency halts

```solidity
if (FDC.proves(event)) {
  triggerSettlement();
}
```

No governance required.

---

## 14. Cross-Chain Exposure (FAssets)

* Vault holds FAssets
* No bridges
* No custody
* Pools operate on economic exposure only

Enables BTC/XRP/DOGE execution safely.

---

## 15. Frontend Requirements

### 15.1 LP Interface

* View pools
* Risk parameters
* Historical PnL
* Deposit / withdraw

---

### 15.2 Executor Interface

* Browse pools
* View constraints
* Request execution rights
* Execute actions
* Track alpha

---

### 15.3 Vault Interface

* Pool management
* Settlement dashboard
* Capital routing

---

## 16. Security Model

### 16.1 Impossible Attacks

* Executor rug
* Capital disappearance
* Unauthorized withdrawals
* RPC bypass
* Protocol spoofing

---

### 16.2 Explicit Risks

* Strategy loss (bounded)
* Oracle delays
* Pool-specific bugs

Risk is isolated per pool.

---

## 17. Non-Negotiable Invariants

1. Executors never custody assets
2. Ownership transfers only at settlement
3. Pools constrain effects, not protocols
4. LPs are paid before executors
5. Reality > governance

---

## 18. Final Summary

**PRAXIS introduces execution leasing as a first-class primitive, replacing uncollateralized lending with bounded, objective, and trustless capital execution. LPs underwrite execution risk via permissionless pools, executors contribute skill without custody, and Flare’s native primitives enable objective settlement, real-world control, and cross-chain exposure.**
