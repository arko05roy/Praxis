# 4. LP Guide

You have capital. You want yield. You're tired of getting 4% while borrowers make 40%.

Welcome to the right place.

---

## What You're Actually Doing

When you deposit into PRAXIS, you're not lending. You're becoming a **capital provider** for execution rights.

```
YOU (LP)                              PRAXIS
───────────────────────────────────────────────────────────────
Have $100k USDC          ──────►    ExecutionVault
Want: Yield > 4%                          │
Don't want to: Trade actively             ▼
                                   Your capital works
                                          │
                                          ▼
                                   Executors trade
                                          │
                                          ▼
                                   You get base + profit share
                                          │
                           ◄──────────────┘
                              Yield
```

Your money sits in the vault. Executors request permission to trade with it. They make profits (or losses). You get a cut of the profits. Their stake covers the losses.

---

## The Math

### Traditional DeFi Lending
```
Deposit: $100,000
APY: 4% (if you're lucky)
Annual Return: $4,000
Your Risk: Borrower defaults, protocol hacks
```

### PRAXIS
```
Deposit: $100,000
Base Fee: 2% ($2,000)
Profit Share: 20% of executor profits

If executors make 30% average:
  - Profit share: 20% × $30,000 = $6,000
  - Total: $8,000 (8% APY)

If executors make 50% average:
  - Profit share: 20% × $50,000 = $10,000
  - Total: $12,000 (12% APY)

Your Risk: Mitigated by executor stakes
```

---

## How to Deposit

### Step 1: Connect Wallet
Go to app.praxis.finance, connect your Flare-compatible wallet.

### Step 2: Approve & Deposit

```
Deposit Flow:
═══════════════════════════════════════════════════════════════

  You          PRAXIS App       USDC Contract      Vault
   │               │                  │              │
   │─ Enter amt ──►│                  │              │
   │               │── approve() ───► │              │
   │               │◄─ Approved ──────│              │
   │               │                  │              │
   │               │─────── deposit(amount) ────────►│
   │◄─────────────────── Receive prxUSDC shares ────│
```

### Step 3: Receive Vault Shares
You get `prxUSDC` tokens representing your share of the vault. These are:
- **ERC-4626 compliant** (standard vault tokens)
- **Transferable** (you can sell your position)
- **Yield-bearing** (value increases as vault profits)

---

## Understanding Your Returns

Your vault shares represent a claim on the underlying assets **plus** accumulated profits.

```
┌─────────────────────────────────────────────────────────────────┐
│                      ExecutionVault                             │
├─────────────────────────────────────────────────────────────────┤
│  Principal:           $1,000,000 USDC                           │
│  Accumulated Profits:    $50,000                                │
│  ─────────────────────────────────                              │
│  Total:              $1,050,000 USDC                            │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│                    Share Calculation                            │
├─────────────────────────────────────────────────────────────────┤
│  Total Shares: 1,000,000 prxUSDC                                │
│  Share Price:  $1.05                                            │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│                     Your Position                               │
├─────────────────────────────────────────────────────────────────┤
│  Your Shares: 100,000 prxUSDC                                   │
│  Your Value:  $105,000                                          │
└─────────────────────────────────────────────────────────────────┘
```

### Share Price Over Time

```
Week 1:  1 prxUSDC = $1.00
Week 4:  1 prxUSDC = $1.02 (executors made 2%)
Week 8:  1 prxUSDC = $1.05 (executors made 5%)
Week 12: 1 prxUSDC = $1.08 (executors made 8%)
```

Your shares don't change. Their value does.

---

## Risk Profile

### What Can Go Wrong

| Risk | Probability | Impact | Mitigation |
|------|-------------|--------|------------|
| Executor losses exceed stake | Low | Partial | Insurance fund covers gap |
| Smart contract bug | Very Low | Total | Audits, bug bounty, gradual rollout |
| All executors lose at once | Very Low | Partial | 70% utilization cap, circuit breaker |
| Protocol hack | Very Low | Total | Standard DeFi risk |

### What Protects You

```
Your Protection Layers:
═══════════════════════════════════════════════════════════════

  Potential Loss
       │
       ▼
  ┌─────────────────────┐
  │ Layer 1:            │
  │ Executor Stake      │──── If stake covers it ────► LP Safe
  └─────────────────────┘
       │ If stake insufficient
       ▼
  ┌─────────────────────┐
  │ Layer 2:            │
  │ Insurance Fund      │──── If fund covers it ────► LP Safe
  └─────────────────────┘
       │ If fund insufficient
       ▼
  ┌─────────────────────┐
  │ Layer 3:            │
  │ 70% Utilization Cap │──── 30% always safe ────► LP Protected
  └─────────────────────┘

  [Layer 4: Circuit Breaker - Pauses at 5% daily loss]
  [Layer 5: Exposure Limits - Max 30% per asset]
```

---

## When to Deposit

**Good Time:**
- You have idle stables
- You want passive income
- You believe skilled traders exist
- You're comfortable with DeFi risks

**Bad Time:**
- You need instant liquidity
- You don't understand the risks
- You're not comfortable with smart contract risk

---

## When to Withdraw

### Standard Withdrawal

```
Withdrawal Flow:
═══════════════════════════════════════════════════════════════

  You                    Vault
   │                       │
   │── withdraw(shares) ──►│
   │                       │── Check liquidity
   │                       │
   │◄── USDC at current ───│
   │    share price        │
```

### Withdrawal Limits

The vault maintains a **30% liquidity buffer**. This means:
- Up to 30% of vault can be withdrawn instantly
- Beyond that, you may need to wait for positions to close
- Worst case: wait for circuit breaker to pause trading

---

## Tracking Your Returns

### Dashboard Metrics

| Metric | What It Means |
|--------|---------------|
| Share Price | Current value of 1 prxUSDC |
| Your Shares | How many prxUSDC you hold |
| Total Value | Share Price × Your Shares |
| Unrealized P&L | Value - Deposited Amount |
| APY (7d) | Annualized return over last 7 days |
| APY (30d) | Annualized return over last 30 days |

### Profit Breakdown

```
Your deposit: $100,000
Current value: $108,000
───────────────────────
Total profit: $8,000
├── Base fees: $2,000 (2%)
└── Profit share: $6,000 (20% of executor profits)
```

---

## FAQs for LPs

**Q: Can executors run away with my money?**
A: No. They never have custody. Your capital stays in the vault.

**Q: What if all executors lose money?**
A: Their stakes are slashed first. Insurance fund covers gaps. 30% of vault is always liquid.

**Q: Can I lose my principal?**
A: Theoretically yes, in extreme scenarios. Practically, executor stakes + insurance make this unlikely.

**Q: How liquid are my shares?**
A: prxUSDC is an ERC-20. Sell it anywhere. Or redeem from vault if liquidity is available.

**Q: What's the minimum deposit?**
A: No minimum. Gas fees make tiny deposits uneconomical.

---

## Next Up

Want to be on the other side? Check out the [Executor Guide](5-executor-guide.md).
