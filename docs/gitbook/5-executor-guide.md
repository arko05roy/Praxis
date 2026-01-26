# 5. Executor Guide

You're a trader. You have alpha. You don't have capital.

Let's fix that.

---

## The Deal

You stake a small amount. You get access to a large amount. You trade. You keep 80% of profits. Your stake covers losses.

```
YOU (Executor)                        PRAXIS
───────────────────────────────────────────────────────────────
Have $10k           ──── Stake $10k ────►  Get $100k ERT
Have alpha                                       │
Want leverage                                    ▼
                                          Trade with $100k
                                                 │
                                                 ▼
                                          Keep 80% of profits
```

If you make 50% on $100k:
- Total profit: $50k
- Your share (80%): $40k
- LP share (20%): $10k
- Your stake: Still $10k (returned if profitable)

Net result: You turned $10k into $50k. That's 5x, not 50%.

---

## The Reputation System

You don't start with access to $100k. You earn it.

```
REPUTATION TIERS
═══════════════════════════════════════════════════════════════

  ┌─────────────────────────────────────────────────────────┐
  │  TIER 0: NEWBIE                                         │
  │  Max Capital: $100  |  Stake: 50%  |  Leverage: 1x      │
  └─────────────────────────────────────────────────────────┘
                    │ Profitable trades
                    ▼
  ┌─────────────────────────────────────────────────────────┐
  │  TIER 1: PROVING                                        │
  │  Max Capital: $10k  |  Stake: 30%  |  Leverage: 2x      │
  └─────────────────────────────────────────────────────────┘
                    │ Consistent performance
                    ▼
  ┌─────────────────────────────────────────────────────────┐
  │  TIER 2: TRUSTED                                        │
  │  Max Capital: $100k  |  Stake: 15%  |  Leverage: 3x     │
  └─────────────────────────────────────────────────────────┘
                    │ Long track record
                    ▼
  ┌─────────────────────────────────────────────────────────┐
  │  TIER 3: ELITE                                          │
  │  Max Capital: $500k  |  Stake: 10%  |  Leverage: 5x     │
  └─────────────────────────────────────────────────────────┘
                    │ Governance approval
                    ▼
  ┌─────────────────────────────────────────────────────────┐
  │  TIER 4: WHALE                                          │
  │  Max Capital: $1M+  |  Stake: 5%  |  Leverage: 10x      │
  └─────────────────────────────────────────────────────────┘
```

### Tier Requirements

| Tier | Max Capital | Stake % | Max Leverage | Requirements |
|------|-------------|---------|--------------|--------------|
| 0 | $100 | 50% | 1x | None |
| 1 | $10k | 30% | 2x | 10 profitable trades |
| 2 | $100k | 15% | 3x | 50 trades, 60% win rate |
| 3 | $500k | 10% | 5x | 200 trades, Sharpe > 1.5 |
| 4 | $1M+ | 5% | 10x | Governance vote |

---

## Getting Started

### Step 1: Request Your First ERT

```
ERT Request Flow:
═══════════════════════════════════════════════════════════════

  You           Gateway          Vault           ERT NFT
   │               │               │               │
   │─ requestERT ─►│               │               │
   │               │─ Check tier ──│               │
   │               │─ Calc stake ──│               │
   │◄─ Need $50 ───│               │               │
   │               │               │               │
   │── stake $50 ─►│               │               │
   │               │─ Register ───►│               │
   │               │               │── Mint ──────►│
   │◄────────────────────────────────── ERT #1234 ─│
```

### Step 2: Understand Your ERT

Your ERT NFT contains these parameters:

```solidity
ExecutionRights {
    tokenId: 1234,
    executor: 0xYou,
    capitalLimit: 100e6,        // $100 (Tier 0)
    maxLeverage: 1,             // 1x only
    maxDrawdownBps: 1000,       // 10% max loss
    allowedAdapters: [SparkDEX],
    allowedAssets: [USDC, WFLR],
    stakedAmount: 50e6,         // $50
    expiryTime: block.timestamp + 30 days
}
```

Every trade you make is validated against these limits. Exceed any → transaction reverts.

### Step 3: Execute Your First Trade

```
Trade Execution Flow:
═══════════════════════════════════════════════════════════════

  You        PositionMgr       Adapter        Vault         DEX
   │              │               │             │            │
   │─ openPos ───►│               │             │            │
   │              │─ Validate ────│             │            │
   │              │               │             │            │
   │              │  [Checks:]                  │            │
   │              │  Capital: $100 ≤ $100 ✓     │            │
   │              │  Leverage: 1x ≤ 1x ✓        │            │
   │              │  Adapter: SparkDEX ✓        │            │
   │              │  Asset: WFLR ✓              │            │
   │              │               │             │            │
   │              │─ Execute ────►│             │            │
   │              │               │─ Request ──►│            │
   │              │               │             │── Swap ───►│
   │              │               │             │◄── WFLR ───│
   │              │◄─ Opened ─────│             │            │
   │◄─ Position #5678 ────────────│             │            │
```

---

## Trading Operations

### Opening Positions

```solidity
// Long WFLR with $100
positionManager.openPosition({
    adapter: SPARKDEX_ADAPTER,
    asset: WFLR,
    size: 100e6,
    leverage: 1,
    direction: LONG
});

// Short FXRP with 2x (if your tier allows)
positionManager.openPosition({
    adapter: SPARKDEX_ADAPTER,
    asset: FXRP,
    size: 50e6,
    leverage: 2,
    direction: SHORT
});
```

### Closing Positions

```solidity
// Close specific position
positionManager.closePosition(positionId);

// Close all positions
positionManager.closeAllPositions();
```

### Modifying Positions

```solidity
// Add to position
positionManager.increasePosition(positionId, additionalSize);

// Reduce position
positionManager.decreasePosition(positionId, reduceAmount);

// Set stop-loss
positionManager.setStopLoss(positionId, stopPrice);

// Set take-profit
positionManager.setTakeProfit(positionId, targetPrice);
```

---

## Understanding P&L

### Profit Scenario

```
YOUR TRADE (Profit):
═══════════════════════════════════════════════════════════════

  Open:  Buy $100 WFLR at $0.025
  Close: Sell $100 WFLR at $0.030
  ─────────────────────────────────
  Gross Profit: $20
         │
         ▼
  PROFIT SPLIT:
  ├── You (80%):  $16
  └── LP (20%):   $4
         │
         ▼
  YOUR NET:
  ├── Stake returned: $50
  ├── Earnings:       $16
  └── Total:          $66
```

### Loss Scenario

```
YOUR TRADE (Loss):
═══════════════════════════════════════════════════════════════

  Open:  Buy $100 WFLR at $0.025
  Close: Sell $100 WFLR at $0.020
  ─────────────────────────────────
  Loss: -$20
         │
         ▼
  STAKE SLASHING:
  ├── Your Stake:  $50
  ├── Slashed:     $20
  └── Remaining:   $30
         │
         ▼
  RESULT:
  ├── LP: Made whole (from your slash)
  └── You: Lost $20
```

---

## Risk Management

### What Can Get You Rekt

| Action | Consequence |
|--------|-------------|
| Exceed capital limit | Transaction reverts |
| Exceed leverage limit | Transaction reverts |
| Hit max drawdown | Positions auto-closed, stake slashed |
| Trigger circuit breaker | All trading paused |
| Consistent losses | Reputation decreased |

### What Protects You

| Protection | How It Works |
|------------|--------------|
| Max drawdown limit | Auto-closes before total loss |
| Position limits | Can't bet everything on one trade |
| Allowed assets only | Can't ape into random shitcoins |

---

## Leveling Up

### How Reputation Increases

```
METRICS WE TRACK:                    EVALUATION:
─────────────────                    ───────────
• Number of trades      ──────────►  Automatic tier-up
• Win rate                           (if criteria met)
• Sharpe ratio                              │
• Max drawdown                              │
• Total volume                              ▼
                                     Governance review
                                     (for Tier 4)
```

### Tier 0 → Tier 1 Requirements
- Complete 10 trades
- Net profitable
- No stake slashing events

### Tier 1 → Tier 2 Requirements
- Complete 50 trades
- Win rate > 60%
- Sharpe ratio > 1.0
- Max drawdown < 15%

### Tier 2 → Tier 3 Requirements
- Complete 200 trades
- Win rate > 55%
- Sharpe ratio > 1.5
- Max drawdown < 10%
- 6+ months track record

### Tier 3 → Tier 4 Requirements
- All of Tier 3
- Governance proposal and vote
- Additional KYC/reputation verification

---

## ZK Privacy (Optional)

Don't want others to see your trades? Use ZK mode.

```
PUBLIC MODE                          ZK MODE
────────────────────                 ────────────────────
• Everyone sees trades               • Trades are private
• Faster execution                   • Proof verification
• Lower gas                          • Higher gas

              Privacy concerns? ──────────►
```

More details in [ZK Privacy](10-zk-privacy.md).

---

## FAQs for Executors

**Q: What if I lose more than my stake?**
A: You can't. Max drawdown is enforced. Positions auto-close before that happens.

**Q: Can I withdraw my stake anytime?**
A: Only after closing all positions. Stake is locked while positions are open.

**Q: What happens to my ERT if I don't trade?**
A: It expires after 30 days of inactivity. Request a new one.

**Q: Can I transfer my ERT?**
A: No. ERTs are non-transferable (soulbound) to prevent reputation gaming.

**Q: How do I get to Tier 4?**
A: Be really good for a really long time, then convince governance you're not a liability.

---

## Next Up

Got questions? Check the [FAQ](6-faq.md).
