# PRAXIS Protocol: Exhaustive Implementation Specification

**Version:** v1.0
**Target Chain:** Flare (Coston2 Testnet / Mainnet)
**Core Invariant:** *Capital is never lent. Execution is leased. Ownership transfers only at settlement.*

---

## 1. System Architecture (PRD §4)

```
Vault (capital owner)
│
├── Execution Liquidity Pools (ELPs)
│     ├── Own strategy assets
│     ├── Hold LP capital
│     ├── Enforce execution bounds
│
└── Executors (Humans, Bots, AI Agents)
```

---

## 2. Smart Contract Specification

### 2.1 Shared Data Structures (`contracts/lib/PraxisStructs.sol`)

From **PRD §7, §9.2**:

```solidity
// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

library PraxisStructs {
    /// @dev Core struct for tracking execution leases.
    /// PRD §7.1: Non-transferable, Time-bounded, Auto-revoked, Pool-specific.
    struct ExecutionRight {
        address executor;       // The actor allowed to execute
        address pool;           // The target ELP
        uint64 startTime;       // Vesting/Start time
        uint64 expiryTime;      // Expiration
        bool active;            // Revocation flag
    }

    /// @dev Risk bounds for a pool. PRD §9.2.
    struct Bounds {
        uint256 maxDrawdown;      // Max allowed loss (bps)
        uint256 maxExposure;      // Max % of pool capital in active positions
        uint256 maxPositionSize;  // Max capital per single action
    }

    /// @dev Result of an execution attempt for internal tracking.
    struct SimulationResult {
        bool success;
        uint256 startNAV;
        uint256 endNAV;
        int256 alpha;
    }
}
```

---

### 2.2 `PraxisVault.sol` (The Core)

From **PRD §5.1, §8**:

**Responsibilities:**
*   Trust pools (§8.1)
*   Grant/revoke execution rights (§8.1)
*   Fund pools (§8.1)
*   Settle outcomes (§8.1)
*   Distribute payouts (§5.1)

**State (PRD §8.2):**

```solidity
// --- Rights Management ---
mapping(bytes32 => PraxisStructs.ExecutionRight) public executionRights;

// --- Pool Registry ---
mapping(address => bool) public trustedPools;

// --- Settlement ---
address public settlementAuthority; // FDC Keeper or Governance
IERC20 public settlementAsset;      // e.g., USDC, WFLR
```

**Functions (PRD §8.3):**

1.  **`registerPool(address pool)`**
    *   *Access*: `onlyAuthority`.
    *   *Logic*: `trustedPools[pool] = true`. Emit `PoolRegistered(pool)`.

2.  **`unregisterPool(address pool)`**
    *   *Access*: `onlyAuthority`.
    *   *Logic*: `trustedPools[pool] = false`. Emit `PoolUnregistered(pool)`.

3.  **`grantExecutionRight(address executor, address pool, uint64 expiry)`**
    *   *Access*: `onlyAuthority`.
    *   *PRD §8.3*: Generates right, stores it, emits event.
    *   *Logic*:
        1.  `require(trustedPools[pool], "Pool not trusted")`.
        2.  `bytes32 rightId = keccak256(abi.encode(executor, pool, block.timestamp))`.
        3.  `executionRights[rightId] = ExecutionRight(executor, pool, block.timestamp, expiry, true)`.
        4.  Emit `RightGranted(rightId, executor, pool, expiry)`.

4.  **`revokeExecutionRight(bytes32 rightId)`**
    *   *Access*: `onlyAuthority` OR `right.executor`.
    *   *Logic*: `executionRights[rightId].active = false`. Emit `RightRevoked(rightId)`.

5.  **`execute(bytes32 rightId, bytes calldata action)`**
    *   *Access*: Public.
    *   *PRD §8.3*: Vault does not inspect calldata. Forwards execution to pool.
    *   *Logic*:
        1.  Load `right = executionRights[rightId]`.
        2.  `require(msg.sender == right.executor, "Not executor")`.
        3.  `require(block.timestamp >= right.startTime && block.timestamp < right.expiryTime, "Right not active")`.
        4.  `require(right.active, "Right revoked")`.
        5.  `(bool success, ) = right.pool.call(abi.encodeWithSignature("executeStrategy(bytes)", action))`.
        6.  `require(success, "Execution failed in pool")`.
        7.  Emit `ExecutionAttempted(rightId, action, success)`.

6.  **`settle(address pool, bytes32 rightId)`**
    *   *Access*: `onlySettlementAuthority` OR `right.executor`.
    *   *PRD §8.3 (Settlement Sequence)*:
        1.  **Revoke**: `executionRights[rightId].active = false`.
        2.  **Liquidate**: `uint256 finalNAV = IELP(pool).liquidate()`.
        3.  **Fetch Baseline (FTSO)**: `uint256 baseline = _getBaselineFromFTSO(pool)`.
        4.  **Compute Alpha**: `int256 alpha = int256(finalNAV) - int256(baseline)`.
        5.  **Distribute (PRD §11.2)**:
            *   If `alpha > 0`: Executor gets `(alpha * executorFeeBps) / 10000`. LPs get the rest.
            *   If `alpha <= 0`: LPs absorb the loss. Executor gets 0.
        6.  Emit `SettlementOccurred(pool, rightId, alpha)`.

7.  **`forceSettleByFDC(address pool, bytes32 rightId, IEVMTransaction.Proof calldata fdcProof)`**
    *   *Access*: Public.
    *   *PRD §13*: FDC triggers forced settlement. No governance required.
    *   *Logic*:
        1.  `require(praxisFDC.verifyEVMTransaction(fdcProof), "Invalid FDC proof")`.
        2.  Call internal `_settle(pool, rightId)`.

8.  **`emergencyHaltByFDC(IWeb2Json.Proof calldata fdcProof)`**
    *   *Access*: Public.
    *   *PRD §13*: FDC triggers emergency halt.
    *   *Logic*:
        1.  `require(praxisFDC.verifyWeb2Json(fdcProof), "Invalid FDC proof")`.
        2.  Set a global `paused = true` flag.
        3.  Emit `EmergencyHalt(reason)`.

---

### 2.3 `BaseELP.sol` (Abstract Pool Implementation)

From **PRD §5.2, §9**:

**Responsibilities:**
*   Own strategy assets (§5.2)
*   Enforce risk bounds (§5.2)
*   Accept LP liquidity permissionlessly (§5.2)
*   Absorb bounded losses (§5.2)
*   Return value to Vault at settlement (§5.2)

**State (PRD §9.2):**

```solidity
// --- LP Accounting ---
uint256 public totalCapital;
uint256 public totalShares;
mapping(address => uint256) public lpShares;

// --- Fee Accounting ---
uint256 public accruedExecutionFees;

// --- Risk Bounds ---
PraxisStructs.Bounds public bounds;

// --- References ---
address public vault;
address public asset; // The underlying asset (e.g., USDC)
```

**Functions (PRD §9.3, §9.4, §9.5):**

1.  **`addLiquidity(uint256 amount)` (PRD §9.3)**
    *   *Access*: Public, Permissionless.
    *   *Logic*:
        1.  `IERC20(asset).transferFrom(msg.sender, address(this), amount)`.
        2.  `uint256 sharesToMint = (totalShares == 0) ? amount : (amount * totalShares) / totalCapital`.
        3.  `lpShares[msg.sender] += sharesToMint`.
        4.  `totalShares += sharesToMint`. `totalCapital += amount`.
        5.  Emit `LiquidityAdded(msg.sender, amount, sharesToMint)`.

2.  **`removeLiquidity(uint256 shares)` (PRD §9.3)**
    *   *Access*: Public.
    *   *PRD Note*: "Withdrawals may be paused during execution".
    *   *Logic*:
        1.  `require(!_isExecutionActive(), "Withdrawal paused during execution")`.
        2.  `uint256 amountToReturn = (shares * totalCapital) / totalShares`.
        3.  `lpShares[msg.sender] -= shares`. `totalShares -= shares`. `totalCapital -= amountToReturn`.
        4.  `IERC20(asset).transfer(msg.sender, amountToReturn)`.
        5.  Emit `LiquidityRemoved(msg.sender, shares, amountToReturn)`.

3.  **`executeStrategy(bytes calldata action)` (PRD §9.4)**
    *   *Access*: `onlyVault`.
    *   *Logic*:
        1.  `uint256 startNAV = getNAV()`.
        2.  `_performStrategy(action)`. // Virtual, implemented by child
        3.  `uint256 endNAV = getNAV()`.
        4.  **Enforce Bounds**:
            *   `require((startNAV - endNAV) * 10000 / startNAV <= bounds.maxDrawdown, "Max drawdown exceeded")`.
        5.  Emit `StrategyExecuted(action, startNAV, endNAV)`.

4.  **`getNAV()` (PRD §9.5)**
    *   *Logic*: Returns `IERC20(asset).balanceOf(address(this)) + _getPositionValue()`. Uses FTSO for live pricing of positions.

5.  **`liquidate()` (PRD §9.5)**
    *   *Access*: `onlyVault`.
    *   *PRD §9.5*: Converts strategy assets to settlement asset.
    *   *Logic*:
        1.  `_closeAllPositions()`. // Virtual, sells all NFTs, closes all swaps, etc.
        2.  `return getNAV()`.

6.  **`_performStrategy(bytes calldata action)` - `virtual`**
    *   To be implemented by concrete pools (e.g., `NFTExecutionPool`).

7.  **`_getPositionValue()` - `virtual`**
    *   To be implemented by concrete pools. Returns value of non-liquid holdings using FTSO.

---

### 2.4 `NFTExecutionPool.sol` (Concrete Implementation)

From **PRD §10**:

**Additional State (PRD §10.1):**

```solidity
address public marketplace; // e.g., Blur, OpenSea adapter
mapping(address => bool) public allowedCollections;

uint256 public maxNFTPrice;
uint256 public maxPremiumBps; // Max premium over FTSO floor price
```

**Functions (PRD §10.2):**

1.  **`_performStrategy(bytes calldata action)` (override)**
    *   *Logic*:
        1.  Decode `action` into `(ActionType actionType, address collection, uint256 tokenId, uint256 price)`.
        2.  If `actionType == BUY`:
            *   `require(allowedCollections[collection], "Collection not allowed")`.
            *   `require(price <= maxNFTPrice, "Price exceeds max")`.
            *   `uint256 floorPrice = _getFTSOFloorPrice(collection)`.
            *   `require((price - floorPrice) * 10000 / floorPrice <= maxPremiumBps, "Premium too high")`.
            *   `IMarketplace(marketplace).buy{value: price}(collection, tokenId)`.
        3.  If `actionType == SELL`:
            *   `IMarketplace(marketplace).sell(collection, tokenId, price)`.

2.  **`_getPositionValue()` (override)**
    *   *Logic*: Loop through held NFTs and sum their FTSO floor prices.

3.  **`setAllowedCollection(address collection, bool allowed)`**
    *   *Access*: `onlyOwner`.
    *   *Logic*: `allowedCollections[collection] = allowed`.

---

### 2.5 `PraxisFDC.sol` (Flare Data Connector Integration)

From **PRD §13** and **FDC Docs (`docs/fdc/10.txt`, `docs/fdc/12.txt`, `docs/fdc/13.txt`)**:

**Responsibilities:**
*   Execution gating
*   Forced settlement
*   Emergency halts

**Imports:**

```solidity
import { ContractRegistry } from "@flarenetwork/flare-periphery-contracts/coston2/ContractRegistry.sol";
import { IEVMTransaction } from "@flarenetwork/flare-periphery-contracts/coston2/IEVMTransaction.sol";
import { IWeb2Json } from "@flarenetwork/flare-periphery-contracts/coston2/IWeb2Json.sol";
```

**Functions:**

1.  **`verifyEVMTransaction(IEVMTransaction.Proof calldata proof)`**
    *   Used for: Proving a transaction happened on another EVM chain (e.g., a liquidation event on Ethereum, a USDC transfer on Sepolia).
    *   *Logic*: `return ContractRegistry.getFdcVerification().verifyEVMTransaction(proof);`

2.  **`verifyWeb2Json(IWeb2Json.Proof calldata proof)`**
    *   Used for: Proving data from a Web2 API (e.g., a price feed from CoinGecko, reserve data from a stablecoin issuer).
    *   *Logic*: `return ContractRegistry.getFdcVerification().verifyWeb2Json(proof);`

3.  **`verifyPayment(IPayment.Proof calldata proof)`**
    *   Used for: Proving a native payment on BTC/DOGE/XRP.
    *   *Logic*: `return ContractRegistry.getFdcVerification().verifyPayment(proof);`

---

### 2.6 `PraxisFTSO.sol` (Flare Time Series Oracle Integration)

From **PRD §12**:

**Responsibilities:**
*   Asset pricing
*   Floor prices (for NFTs)
*   NAV computation
*   Alpha vs baseline

**Functions:**

1.  **`getPrice(string memory symbol)`**
    *   *Logic*: Returns (price, timestamp, decimals) from `FtsoRegistry.getCurrentPrice(symbol)`.

2.  **`getPriceWithCheck(string memory symbol, uint256 maxAge)`**
    *   *Logic*:
        1.  `(uint256 price, uint256 timestamp, ) = getPrice(symbol)`.
        2.  `require(block.timestamp - timestamp <= maxAge, "Price stale")`.
        3.  `return price`.

---

### 2.7 Interfaces (`contracts/interfaces/`)

*   **`IELP.sol`**: `executeStrategy(bytes)`, `liquidate()`, `getNAV()`, `addLiquidity(uint256)`, `removeLiquidity(uint256)`.
*   **`IVault.sol`**: `execute(bytes32, bytes)`, `settle(address, bytes32)`.
*   **`IMarketplace.sol`**: `buy(address, uint256)`, `sell(address, uint256, uint256)`.

---

## 3. Incentive Model (PRD §11)

### 3.1 LP Revenue Streams

| Stream                  | Description                                    | Implementation                                        |
| ----------------------- | ---------------------------------------------- | ----------------------------------------------------- |
| **Execution Access Fees** | Paid per execution or per day. Guaranteed.     | `accruedExecutionFees` in `BaseELP`. Charged in `executeStrategy`. |
| **Risk Premium**          | Senior profit share. Paid before executors.    | Calculated in `Vault.settle()` from `alpha`.          |
| **Idle Capital Yield**    | Optional passive yield. Benchmarking via FTSO. | Future: Integrate with Aave/Compound on Flare.        |

### 3.2 Executor Compensation (PRD §11.2)

*   Paid **only on alpha**.
*   `alpha = finalNAV - baselineNAV`.
*   No profit → No payout.
*   Disappearing executor earns nothing.

---

## 4. Cross-Chain Exposure via FAssets (PRD §14)

*   Vault can hold **FAssets** (FBTC, FXRP, FDOGE).
*   Pools operate on economic exposure only; they don't bridge.
*   **No custody risk** for the underlying BTC/XRP/DOGE.

---

## 5. Security Model (PRD §16, §17)

### 5.1 Impossible Attacks (PRD §16.1)

| Attack                    | Prevention Mechanism                                                                 |
| ------------------------- | ------------------------------------------------------------------------------------ |
| Executor rug              | Executor never has custody. Assets are in Pool.                                      |
| Capital disappearance     | Vault controls fund flow. Pool cannot send to arbitrary addresses.                   |
| Unauthorized withdrawals  | `removeLiquidity` checks `lpShares[msg.sender]`.                                     |
| RPC bypass                | All logic is on-chain. No off-chain dependencies for core operations.               |
| Protocol spoofing         | Only trusted pools can be called via `execute`. Pool verifies `msg.sender == vault`. |

### 5.2 Explicit Risks (PRD §16.2)

| Risk                 | Mitigation                                                              |
| -------------------- | ----------------------------------------------------------------------- |
| Strategy loss        | Bounded by `maxDrawdown`. LP accepts this risk.                         |
| Oracle delays (FTSO) | `getPriceWithCheck` reverts if price is stale.                          |
| Pool-specific bugs   | Risk is isolated per pool. One pool bug doesn't affect others.          |

### 5.3 Non-Negotiable Invariants (PRD §17)

1.  Executors never custody assets.
2.  Ownership transfers only at settlement.
3.  Pools constrain effects, not protocols.
4.  LPs are paid before executors.
5.  Reality > governance (FDC overrides votes).

---

## 6. Frontend Specification (PRD §15)

**Theme:** "Cyber-Renaissance". Dark mode, gold accents, technical serif fonts.

### 6.1 LP Interface (PRD §15.1)

*   **View pools**: Grid of ELPs with TVL, APY, Risk params.
*   **Risk parameters**: Display `Bounds` struct.
*   **Historical PnL**: Chart of NAV over time.
*   **Deposit / withdraw**: `addLiquidity` / `removeLiquidity` flows.

### 6.2 Executor Interface (PRD §15.2)

*   **Browse pools**: See available ELPs.
*   **View constraints**: Display `Bounds`, allowed collections, etc.
*   **Request execution rights**: Button to trigger `grantExecutionRight` (via authority).
*   **Execute actions**: Form builder for `actionData`.
*   **Track alpha**: Display `alpha` for current session.

### 6.3 Vault Interface (PRD §15.3)

*   **Pool management**: Register/unregister pools.
*   **Settlement dashboard**: List of pending/completed settlements.
*   **Capital routing**: Show where funds are allocated.

---

## 7. Deployment Strategy (Coston2 Testnet)

### 7.1 Directory Structure

```
praxis/
├── contracts/
│   ├── core/
│   │   ├── PraxisVault.sol
│   │   ├── PraxisFDC.sol
│   │   └── PraxisFTSO.sol
│   ├── pools/
│   │   ├── BaseELP.sol
│   │   └── NFTExecutionPool.sol
│   ├── interfaces/
│   │   ├── IELP.sol
│   │   ├── IVault.sol
│   │   └── IMarketplace.sol
│   └── lib/
│       └── PraxisStructs.sol
├── scripts/
│   ├── deploy_core.ts
│   └── helpers/
│       └── FdcHelpers.ts
├── test/
│   ├── VaultFlow.t.sol
│   └── FDCIntegration.t.sol
└── app/ (Next.js Frontend)
```

### 7.2 Deployment Script (`scripts/deploy_core.ts`)

1.  Deploy `PraxisStructs` library.
2.  Deploy `PraxisFTSO`.
3.  Deploy `PraxisFDC`.
4.  Deploy `PraxisVault` (linking FTSO, FDC).
5.  Deploy `NFTExecutionPool` (linking Vault, FTSO).
6.  Call `vault.registerPool(poolAddress)`.
7.  Verify all contracts on Coston2 Explorer.

### 7.3 End-to-End Test Scenario

1.  **LP**: Deposits 10,000 Mock USDC to `NFTExecutionPool`.
2.  **Authority**: Calls `vault.grantExecutionRight(executor, pool, 1 day)`.
3.  **Executor**: Calls `vault.execute(rightId, buyNftAction)`.
4.  **Pool**: Verifies FTSO price, executes buy. NAV updates.
5.  **Settlement**: After 1 day, `vault.settle(pool, rightId)` is called.
6.  **(FDC Test)**: Simulate `forceSettleByFDC` using a mock proof.

---

## 8. Next Steps

> [!IMPORTANT]
> This plan is awaiting user approval. Once approved, the next action is to scaffold the directory structure and begin implementing `contracts/lib/PraxisStructs.sol` and `contracts/core/PraxisVault.sol`.
