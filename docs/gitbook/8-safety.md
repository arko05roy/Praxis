# 8. Safety

Six layers of "try me." Let's break down how each one works.

---

## The Defense Stack

```
┌─────────────────────────────────────────────────────────────────────────────────┐
│                            THE DEFENSE STACK                                    │
└─────────────────────────────────────────────────────────────────────────────────┘

                        ┌─────────────────────────────┐
                        │   Potential Attack/Loss     │
                        └──────────────┬──────────────┘
                                       │
                                       ▼
┌─────────────────────────────────────────────────────────────────────────────────┐
│  LAYER 1: REPUTATION GATING                                                     │
│  • Must build track record                                                      │
│  • Limits scale with trust                                                      │
└─────────────────────────────────────────┬───────────────────────────────────────┘
                                          │
                                          ▼
┌─────────────────────────────────────────────────────────────────────────────────┐
│  LAYER 2: STAKE REQUIREMENTS                                                    │
│  • Skin in the game                                                             │
│  • Stake >= max drawdown                                                        │
└─────────────────────────────────────────┬───────────────────────────────────────┘
                                          │
                                          ▼
┌─────────────────────────────────────────────────────────────────────────────────┐
│  LAYER 3: UTILIZATION CAP                                                       │
│  • Max 70% utilized                                                             │
│  • 30% always liquid                                                            │
└─────────────────────────────────────────┬───────────────────────────────────────┘
                                          │
                                          ▼
┌─────────────────────────────────────────────────────────────────────────────────┐
│  LAYER 4: CIRCUIT BREAKER                                                       │
│  • 5% daily loss = pause                                                        │
│  • All trading stops                                                            │
└─────────────────────────────────────────┬───────────────────────────────────────┘
                                          │
                                          ▼
┌─────────────────────────────────────────────────────────────────────────────────┐
│  LAYER 5: EXPOSURE LIMITS                                                       │
│  • Max 30% per asset                                                            │
│  • Diversification enforced                                                     │
└─────────────────────────────────────────┬───────────────────────────────────────┘
                                          │
                                          ▼
┌─────────────────────────────────────────────────────────────────────────────────┐
│  LAYER 6: INSURANCE FUND                                                        │
│  • 2% of all profits                                                            │
│  • Covers gaps                                                                  │
└─────────────────────────────────────────┬───────────────────────────────────────┘
                                          │
                                          ▼
                        ┌─────────────────────────────┐
                        │       LP PROTECTED          │
                        └─────────────────────────────┘
```

---

## Layer 1: Reputation Gating

**Problem:** Random anon shows up wanting $1M in execution rights.

**Solution:** Make them prove themselves first.

```
┌─────────────────────────────────────────────────────────────────────────────────┐
│                           REPUTATION JOURNEY                                    │
└─────────────────────────────────────────────────────────────────────────────────┘

┌───────────────┐     ┌───────────────┐     ┌───────────────┐     ┌───────────────┐     ┌───────────────┐
│   TIER 0      │     │   TIER 1      │     │   TIER 2      │     │   TIER 3      │     │   TIER 4      │
│               │     │               │     │               │     │               │     │               │
│ $100 max      │     │ $10k max      │     │ $100k max     │     │ $500k max     │     │ $1M+ max      │
│ 50% stake     │────►│ 30% stake     │────►│ 15% stake     │────►│ 10% stake     │────►│ 5% stake      │
│ required      │     │ required      │     │ required      │     │ required      │     │ required      │
│               │     │               │     │               │     │               │     │               │
│ Prove you're  │     │ Show basic    │     │ Demonstrate   │     │ Prove you're  │     │ Governance    │
│ not an idiot  │     │ competence    │     │ consistency   │     │ actually good │     │ trusts you    │
└───────────────┘     └───────────────┘     └───────────────┘     └───────────────┘     └───────────────┘
```

### Why This Works

To grief at scale, an attacker needs:
1. Months of profitable trading (building reputation)
2. Significant stake ($$$ locked up)
3. To burn everything they've built

The ROI on griefing is negative at every tier.

### Tier Requirements

| From | To | Requirements |
|------|-----|--------------|
| New | T0 | None |
| T0 | T1 | 10 profitable trades |
| T1 | T2 | 50 trades, 60% win rate |
| T2 | T3 | 200 trades, Sharpe > 1.5, 6 months |
| T3 | T4 | Governance vote |

### Demotion Rules

Bad performance demotes you:
- Win rate drops below threshold
- Sharpe ratio drops below threshold
- Max drawdown exceeded
- 30 days of inactivity

---

## Layer 2: Stake Requirements

**Problem:** Executor makes bad trades, LP loses money.

**Solution:** Executor's money gets slashed first.

```
┌─────────────────────────────────────────────────────────────────────────────────┐
│                            STAKE MECHANICS                                      │
└─────────────────────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────┐
│        STAKE PROCESS            │
├─────────────────────────────────┤
│                                 │
│ Request $100k ERT at Tier 3    │
│              │                  │
│              ▼                  │
│ Required: 10% = $10k stake     │
│              │                  │
│              ▼                  │
│ $10k locked in contract        │
│                                 │
└─────────────────────────────────┘
         │
         ├─────────────────────────────────────┐
         │                                     │
         ▼                                     ▼
┌─────────────────────────────────┐  ┌─────────────────────────────────┐
│        LOSS SCENARIO            │  │      CATASTROPHIC LOSS          │
├─────────────────────────────────┤  ├─────────────────────────────────┤
│                                 │  │                                 │
│ Trade loses $8k                 │  │ Trade loses $15k                │
│         │                       │  │         │                       │
│         ▼                       │  │         ▼                       │
│ Slash $8k from stake           │  │ Slash entire $10k stake         │
│         │                       │  │         │                       │
│         ▼                       │  │         ▼                       │
│ $2k stake remains              │  │ $5k gap                         │
│         │                       │  │         │                       │
│         ▼                       │  │         ▼                       │
│ LP loss: $0                    │  │ Insurance covers gap            │
│                                 │  │                                 │
└─────────────────────────────────┘  └─────────────────────────────────┘
```

### Stake Calculation

```
Required Stake = Capital Requested × Stake Percentage for Tier

Tier 0: 50% → $100 capital needs $50 stake
Tier 1: 30% → $10k capital needs $3k stake
Tier 2: 15% → $100k capital needs $15k stake
Tier 3: 10% → $500k capital needs $50k stake
Tier 4: 5%  → $1M capital needs $50k stake
```

### Why Stake >= Max Drawdown

The max drawdown for any ERT is capped at 10%. If stake is 10%, then:
- Worst case loss = 10% of capital = stake amount
- LP can always be made whole from stake

---

## Layer 3: Utilization Cap

**Problem:** All capital deployed, LP can't withdraw.

**Solution:** Always keep 30% liquid.

```
┌─────────────────────────────────────────────────────────────────────────────────┐
│                           UTILIZATION CAP                                       │
└─────────────────────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────┐
│              VAULT: $1M                     │
├─────────────────────────────────────────────┤
│                                             │
│  ┌───────────────────────────────────────┐  │
│  │   ACTIVE: $700k (70%)                 │  │
│  └───────────────────────────────────────┘  │
│                                             │
│  ┌───────────────────────────────────────┐  │
│  │   RESERVE: $300k (30%)                │  │
│  └───────────────────────────────────────┘  │
│                                             │
└─────────────────────────────────────────────┘

┌─────────────────────────────────────────────┐
│              NEW REQUEST                    │
├─────────────────────────────────────────────┤
│                                             │
│  Executor wants $50k                        │
│              │                              │
│              ▼                              │
│  70% + 5% = 75% > 70%                       │
│              │                              │
│              ▼                              │
│  REQUEST DENIED                             │
│                                             │
└─────────────────────────────────────────────┘
```

### Utilization Rules

| Current Utilization | Can Request More? |
|---------------------|-------------------|
| < 70% | Yes, up to 70% total |
| = 70% | No |
| > 70% (shouldn't happen) | All new requests blocked |

### LP Withdrawal Impact

```
Scenario: LP wants to withdraw $100k from $1M vault
─────────────────────────────────────────────────────
Current utilization: 65%
Active capital: $650k
Available: $350k

Can withdraw $100k? Yes.
New vault size: $900k
New available: $250k
New utilization: 72% → Triggers rebalancing
```

When utilization exceeds 70% due to withdrawals:
1. No new ERTs issued
2. Existing positions can still be managed
3. Closed positions return capital to liquid pool
4. System naturally rebalances

---

## Layer 4: Circuit Breaker

**Problem:** Black swan event, everything's crashing.

**Solution:** Automatic pause.

```
┌─────────────────────────────────────────────────────────────────────────────────┐
│                          CIRCUIT BREAKER FLOW                                   │
└─────────────────────────────────────────────────────────────────────────────────┘

┌────────────────────┐
│ Monitor daily P&L  │
└─────────┬──────────┘
          │
          ▼
┌────────────────────┐
│ Vault loss > 5%?   │
└─────────┬──────────┘
          │
          ├──────────────────────────────────────┐
          │ No                                   │ Yes
          ▼                                      ▼
┌────────────────────┐              ┌────────────────────────────────┐
│ Continue trading   │              │  TRIGGER CIRCUIT BREAKER       │
└────────────────────┘              └────────────────┬───────────────┘
                                                     │
                              ┌──────────────────────┼──────────────────────┐
                              ▼                      ▼                      ▼
                   ┌────────────────────┐ ┌────────────────────┐ ┌────────────────────┐
                   │ Pause all new      │ │ Allow position     │ │ Alert governance   │
                   │ trades             │ │ closes only        │ │                    │
                   └─────────┬──────────┘ └────────────────────┘ └────────────────────┘
                             │
                             ▼
             ┌───────────────────────────────────────────┐
             │           RECOVERY PROCESS                │
             ├───────────────────────────────────────────┤
             │  1. Wait 24 hours                         │
             │  2. Governance reviews                    │
             │  3. Adjust parameters if needed           │
             │  4. Resume trading                        │
             └───────────────────────────────────────────┘
```

### Circuit Breaker Parameters

| Parameter | Value | Purpose |
|-----------|-------|---------|
| Daily loss threshold | 5% | Main trigger |
| Cooldown period | 24 hours | Recovery time |
| Manual override | Governance | Emergency control |
| Partial resume | Yes | Can reopen gradually |

### What Happens When Triggered

1. **Immediately:**
   - All `openPosition` calls revert
   - All `increasePosition` calls revert
   - New ERT requests blocked

2. **Still Allowed:**
   - `closePosition` (executors can close)
   - `withdraw` (LPs can withdraw available)
   - `decreasePosition` (de-risk positions)

3. **After Cooldown:**
   - Governance reviews cause
   - Parameters adjusted if needed
   - Trading resumes

---

## Layer 5: Exposure Limits

**Problem:** Everyone bets on WFLR, WFLR dumps, vault rekt.

**Solution:** Force diversification.

```
┌─────────────────────────────────────────────────────────────────────────────────┐
│                          EXPOSURE LIMITS                                        │
└─────────────────────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────┐
│            VAULT EXPOSURE                   │
├─────────────────────────────────────────────┤
│                                             │
│  WFLR:      ████████████████████████  25%   │
│  FXRP:      ████████████████████      20%   │
│  FBTC:      ████████████████          15%   │
│  Other:     ██████████                10%   │
│  Available: ██████████████████████████ 30%  │
│                                             │
└─────────────────────────────────────────────┘

┌─────────────────────────────────────────────┐
│            NEW TRADE REQUEST                │
├─────────────────────────────────────────────┤
│                                             │
│  Buy $100k WFLR                             │
│              │                              │
│              ▼                              │
│  25% + 10% = 35% > 30%                      │
│              │                              │
│              ▼                              │
│  REJECTED: Max 30% per asset                │
│                                             │
└─────────────────────────────────────────────┘
```

### Exposure Rules

| Rule | Limit | Purpose |
|------|-------|---------|
| Single asset max | 30% of vault | Prevent concentration |
| Single executor max | 10% of vault | Prevent dominance |
| Single position max | 5% of vault | Limit single-trade impact |

### Example Calculation

```
Vault size: $1M
Max WFLR exposure: 30% = $300k
Current WFLR exposure: $250k

Executor requests: Buy $100k WFLR
New exposure would be: $350k = 35%
Result: Rejected (exceeds 30% limit)

Alternative: Executor can buy up to $50k more WFLR
```

---

## Layer 6: Insurance Fund

**Problem:** Stake wasn't enough to cover loss.

**Solution:** Pooled insurance from all profits.

```
┌─────────────────────────────────────────────────────────────────────────────────┐
│                          INSURANCE FUND                                         │
└─────────────────────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────┐
│          INSURANCE COLLECTION               │
├─────────────────────────────────────────────┤
│                                             │
│  All executor profits                       │
│              │                              │
│              ▼                              │
│  2% contribution                            │
│              │                              │
│              ▼                              │
│  Insurance Fund                             │
│                                             │
└─────────────────────────────────────────────┘

┌─────────────────────────────────────────────┐
│            INSURANCE USAGE                  │
├─────────────────────────────────────────────┤
│                                             │
│  Loss exceeds stake                         │
│              │                              │
│              ▼                              │
│  Calculate gap                              │
│              │                              │
│              ▼                              │
│  Cover from fund                            │
│                                             │
└─────────────────────────────────────────────┘
```

### How It Works

**On Profit:**
```
Executor profit: $10,000
LP share (20%): $2,000
Insurance contribution (2%): $200
Executor receives: $7,800
```

**On Loss Exceeding Stake:**
```
Position loss: $15,000
Executor stake: $10,000
Gap: $5,000

Insurance fund balance: $50,000
Coverage: min($5,000, $50,000) = $5,000

LP loss: $0
```

### Fund Health

| Metric | Target | Action if Below |
|--------|--------|-----------------|
| Fund balance | > 5% of TVL | Increase contribution rate |
| Usage rate | < 1% monthly | Normal operations |
| Depletion | > 50% | Pause new ERTs, increase rates |

---

## Attack Scenario Analysis

### Scenario 1: Malicious Executor

```
Attack: Open max position, intentionally lose
─────────────────────────────────────────────
Executor tier: 2 (took 3 months to reach)
Capital access: $100k
Stake required: $15k (15%)
Max drawdown: 10% = $10k

Execution:
1. Stakes $15k
2. Opens max position
3. Intentionally loses 10%
4. Triggers max drawdown
5. Position auto-closed
6. $10k slashed from stake

Result:
- Executor loss: $10k
- LP loss: $0 (covered by slash)
- Net damage: Executor hurt themselves
```

### Scenario 2: Coordinated Attack

```
Attack: Multiple executors collude to drain vault
─────────────────────────────────────────────────
Setup: 10 executors at Tier 2
Combined access: $1M
Combined stake: $150k

Execution:
1. All open correlated positions
2. Wait for black swan (or create one?)
3. All positions lose 10%

But wait:
- Exposure limit: 30% per asset
- Can't all bet on same thing
- Circuit breaker at 5% daily loss
- Triggers after $50k loss to vault

Result:
- Trading pauses at $50k loss
- $50k in stakes slashed
- Insurance covers any gap
- Attackers lost $50k minimum
- LP loss: minimal to zero
```

### Scenario 3: Flash Loan Attack

```
Attack: Use flash loan to game the system
────────────────────────────────────────────
Attempt:
1. Flash loan $1M
2. Stake to get huge ERT
3. Manipulate prices
4. Profit
5. Return flash loan

But:
- Staking requires holding across blocks
- Flash loans are single-transaction
- Can't stake with borrowed funds

Result: Attack vector impossible
```

---

## Summary: Why Attacks Don't Pay

```
┌─────────────────────────────────────────────────────────────┐
│                                                             │
│  To cause $X damage to LPs, attacker must:                  │
│                                                             │
│  1. Build reputation (months of profitable trading)         │
│  2. Stake at least $X                                       │
│  3. Lose their entire stake ($X)                            │
│  4. Burn their reputation (start over)                      │
│  5. Probably still not hurt LPs (insurance)                 │
│                                                             │
│  Net result: Attacker loses >= victim's loss                │
│                                                             │
│  This is economically irrational.                           │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

---

## Next Up

Want to know why we built on Flare? Check [Why Flare](9-why-flare.md).
