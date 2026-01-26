# 3. How Money Moves

Spoiler alert: **It doesn't.**

That's the whole point. But let's trace the flow anyway.

---

## Traditional Lending Flow (The Old Way)

```
TRADITIONAL LENDING SEQUENCE:
═══════════════════════════════════════════════════════════════════

  LP                    Protocol               Borrower              DEX
   │                       │                      │                   │
   │── Deposit $100k ─────►│                      │                   │
   │                       │◄─ Deposit $150k ─────│                   │
   │                       │   collateral         │                   │
   │                       │                      │                   │
   │                       │── Here's $100k, ────►│                   │
   │                       │   bye                │                   │
   │                       │                      │                   │
   │                       │          [Borrower has custody now]      │
   │                       │                      │                   │
   │                       │                      │── Trade $100k ───►│
   │                       │                      │◄─ Returns $130k ──│
   │                       │                      │   (profit!)       │
   │                       │                      │                   │
   │                       │      [Could return it... or not]         │
   │                       │                      │                   │
   │                       │◄─ Fine, $104k ───────│                   │
   │◄─ Here's 4% APY ──────│                      │                   │
   │                       │                      │                   │
   │        [Never saw that $30k profit]          │                   │
```

The lender took the risk. The borrower kept the alpha. Tale as old as time.

---

## PRAXIS Flow (The New Way)

```
PRAXIS SEQUENCE:
═══════════════════════════════════════════════════════════════════

  LP       Vault      Executor    PositionMgr   Adapter      DEX
   │         │           │            │           │           │
   │─ $100k ►│           │            │           │           │
   │◄ shares─│           │            │           │           │
   │         │           │            │           │           │
   │    [Capital stays in vault forever]          │           │
   │         │           │            │           │           │
   │         │◄─ Request ERT ─────────│           │           │
   │         │◄─ Stake $5k ───────────│           │           │
   │         │── Permission NFT ─────►│           │           │
   │         │           │            │           │           │
   │         │    [Executor has permission, NOT money]        │
   │         │           │            │           │           │
   │         │           │─ Buy WFLR ►│           │           │
   │         │           │            │─ Validate │           │
   │         │           │            │─ Route ──►│           │
   │         │           │            │           │─ Request ►│
   │         │◄───────────────────────────────────│◄─ Swap ───│
   │         │                        │           │           │
   │    [Vault still has all tokens]  │           │           │
   │         │           │            │─ Track ───│           │
```

Notice something? The executor never touched the actual tokens. They just gave instructions.

---

## The Permission Slip Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                     EXECUTOR'S WORLD                            │
├─────────────────────────────────────────────────────────────────┤
│  • Has ERT NFT                                                  │
│  • Can submit instructions                                      │
│  • Cannot access tokens directly                                │
└─────────────────────────────────────────────────────────────────┘
                              │
                              │ Submit trade
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│                     CONTRACT LAYER                              │
├─────────────────────────────────────────────────────────────────┤
│  PositionManager ──► Validate limits ──► Protocol Adapter      │
└─────────────────────────────────────────────────────────────────┘
                              │
                              │ If valid, call with vault's tokens
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│                     VAULT'S WORLD                               │
├─────────────────────────────────────────────────────────────────┤
│  • Holds all capital                                            │
│  • Executes approved trades via adapters                        │
│  • Receives all results back                                    │
└─────────────────────────────────────────────────────────────────┘
```

---

## What Actually Happens in a Trade

Let's trace a real trade. Executor wants to long WFLR with 3x leverage.

### Step 1: Instruction Submission

```solidity
// Executor calls this (they don't send any tokens)
positionManager.openPosition({
    adapter: sparkDexAdapter,
    asset: WFLR,
    size: 30000e18,      // $30k position
    leverage: 3,          // 3x
    direction: LONG
});
```

### Step 2: Validation

```
Trade Validation Flow:
═══════════════════════════════════════════════════════════════════

  Trade Request
       │
       ▼
  ┌─────────────┐
  │ ERT Valid?  │──── No ────► Revert: Invalid ERT
  └─────────────┘
       │ Yes
       ▼
  ┌─────────────────────┐
  │ Within Capital Limit?│──── No ────► Revert: Exceeds limit
  └─────────────────────┘
       │ Yes
       ▼
  ┌─────────────────────┐
  │ Within Leverage Limit?│──── No ────► Revert: Too much leverage
  └─────────────────────┘
       │ Yes
       ▼
  ┌─────────────────────┐
  │ Allowed Adapter?    │──── No ────► Revert: Adapter not allowed
  └─────────────────────┘
       │ Yes
       ▼
  ┌─────────────────────┐
  │ Allowed Asset?      │──── No ────► Revert: Asset not allowed
  └─────────────────────┘
       │ Yes
       ▼
  Proceed to execution
```

### Step 3: Execution

```
Execution Sequence:
═══════════════════════════════════════════════════════════════════

  PositionMgr      Adapter          Vault           DEX
       │              │               │              │
       │─ execute() ─►│               │              │
       │              │─ requestFunds►│              │
       │              │  ($10k USDC)  │              │
       │              │               │─ Check util  │
       │              │               │  < 70%       │
       │              │◄─ $10k USDC ──│              │
       │              │               │              │
       │              │─── swap() ────────────────► │
       │              │               │◄─ WFLR ─────│
       │              │               │  (direct    │
       │              │               │   return)   │
       │◄─ confirmed ─│               │              │
       │─ record ────►│               │              │
```

### Step 4: Position Tracking

```solidity
Position {
    executor: 0x123...,
    adapter: SparkDEX,
    asset: WFLR,
    entryPrice: $0.025,
    size: 30000e18,
    leverage: 3,
    direction: LONG,
    margin: 10000e6,    // $10k
    openTime: block.timestamp
}
```

---

## Closing a Position

Same flow, reverse direction.

```
Close Position Sequence:
═══════════════════════════════════════════════════════════════════

  Executor    PositionMgr    Adapter     Vault      DEX
     │            │            │           │         │
     │─ close() ─►│            │           │         │
     │            │─ close() ─►│           │         │
     │            │            │─ Get WFLR►│         │
     │            │            │           │─ Swap ─►│
     │            │            │           │◄─ $13k ─│
     │            │            │           │  USDC   │
     │            │◄───────────│           │         │
     │            │                        │         │
     │            │    [Calculate P&L: +$3k profit]  │
     │            │                        │         │
     │            │─── Update accounting ─►│         │
     │            │                        │         │
     │            │    [$3k profit: 80% executor, 20% LP]
```

---

## The Key Insight

```
┌─────────────────────────────────────────────────────┐
│                                                     │
│   Tokens flow: Vault → DEX → Vault                  │
│                                                     │
│   Instructions flow: Executor → PM → Adapter        │
│                                                     │
│   These two paths NEVER cross.                      │
│                                                     │
└─────────────────────────────────────────────────────┘
```

The executor can tell the system *what* to do. The executor cannot take the tokens and *do it themselves*. That's the difference between a trading terminal and a bank account.

---

## "But What About..."

**"What if the adapter is malicious?"**

Adapters are whitelisted by governance. Each adapter is audited to only interact with specific protocols (SparkDEX, Kinetic, etc.) and always return tokens to the vault.

**"What if the DEX is malicious?"**

Then everyone using that DEX is screwed, not just PRAXIS users. Same risk as trading directly.

**"What if the executor makes trades that grief the vault?"**

Their stake is slashed first. They lose money before LPs do.

---

## Next Up

Now that you understand the flow, let's see what it looks like from [The LP's Perspective](4-lp-guide.md).
