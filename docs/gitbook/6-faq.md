# 6. FAQ

Every objection you have. Answered. Sarcastically.

---

## The "This Won't Work" Questions

### "Someone will find a way to exploit this."

Cool theory. Let's trace the attack vectors:

```
┌──────────────────────────────────────────────────────────────────────────────┐
│                           ATTACK VECTOR ANALYSIS                             │
└──────────────────────────────────────────────────────────────────────────────┘
                                    │
                           ┌────────┴────────┐
                           │  Attack Vector  │
                           └────────┬────────┘
                                    │
        ┌───────────────┬───────────┼───────────┬───────────────┐
        ▼               ▼           ▼           ▼               ▼
┌───────────────┐ ┌───────────────┐ ┌───────────────┐ ┌───────────────┐
│ Steal tokens  │ │ Make bad      │ │ Manipulate    │ │ Collude with  │
│ directly?     │ │ trades on     │ │ prices?       │ │ other         │
│               │ │ purpose?      │ │               │ │ executors?    │
└───────┬───────┘ └───────┬───────┘ └───────┬───────┘ └───────┬───────┘
        ▼                 ▼                 ▼                 ▼
┌───────────────┐ ┌───────────────┐ ┌───────────────┐ ┌───────────────┐
│ Tokens never  │ │ Your stake    │ │ 30% max       │ │ Need months   │
│ leave vault.  │ │ gets slashed. │ │ exposure per  │ │ of reputation.│
│ Executor has  │ │ You lose      │ │ asset.        │ │ Significant   │
│ permission    │ │ money to      │ │ Circuit       │ │ stake         │
│ slip, not     │ │ grief         │ │ breaker at 5% │ │ required.     │
│ custody.      │ │ someone.      │ │ daily loss.   │ │ Still hit     │
│               │ │               │ │               │ │ circuit       │
│ X Not possible│ │ X Econ.       │ │ X Limited     │ │ breaker.      │
│               │ │   irrational  │ │   impact      │ │ X Not worth   │
│               │ │               │ │               │ │   the squeeze │
└───────────────┘ └───────────────┘ └───────────────┘ └───────────────┘
```

### "What if a whale LP rugs?"

They can't. They can only withdraw their share. They can't access other LP funds or executor stakes.

### "What if ALL executors are malicious?"

```
Scenario: All executors coordinate to grief
───────────────────────────────────────────
Step 1: Each executor stakes their required amount
Step 2: They execute losing trades
Step 3: Circuit breaker triggers at 5% daily vault loss
Step 4: All executor stakes get slashed
Step 5: LP loss: 5% (covered by slashed stakes + insurance)
Step 6: Executor loss: 100% of their stakes

Result: Attackers lost more than LPs.
Congratulations, you played yourself.
```

### "What about flash loan attacks?"

ERTs require staking. Staking requires holding tokens across blocks. Flash loans are single-transaction. Can't stake with flash loan. Attack vector closed.

---

## The "I Don't Understand" Questions

### "Why would anyone stake if they can just trade with their own money?"

Let's math it:

```
Your capital: $10k
Your alpha: 50% annual return

Option A: Trade your own money
├── Position size: $10k
├── Return: 50%
├── Profit: $5k
└── Total: $15k

Option B: Use PRAXIS
├── Stake: $10k (at Tier 3)
├── ERT capital: $100k
├── Return: 50%
├── Gross profit: $50k
├── Your share (80%): $40k
└── Total: $50k

Option B wins by $35k.
```

The 20% fee is worth it when you get 10x the capital.

### "Why would an LP use this instead of just trading themselves?"

Because LPs are different from executors:

| LP Mindset | Executor Mindset |
|------------|------------------|
| Has capital | Has skill |
| Wants passive income | Wants active returns |
| Doesn't have time to trade | Trades all day |
| Risk-averse | Risk-managed |
| Wants 8-15% APY | Wants 50%+ returns |

LPs aren't giving up trading profits. They're accessing a return stream they couldn't generate themselves.

### "How is this different from copy trading?"

```
┌─────────────────────────────────────┐    ┌─────────────────────────────────────┐
│           COPY TRADING              │    │             PRAXIS                  │
├─────────────────────────────────────┤    ├─────────────────────────────────────┤
│                                     │    │                                     │
│  • You give money to trader         │    │  • Money stays in vault             │
│                                     │    │                                     │
│  • Trader has custody               │    │  • Trader has permission only       │
│                                     │    │                                     │
│  • Trust required                   │    │  • Code enforces limits             │
│                                     │    │                                     │
│  • Trader can rug                   │    │  • Rug = lose own stake             │
│                                     │    │                                     │
└─────────────────────────────────────┘    └─────────────────────────────────────┘
```

Copy trading: "Here's my money, please don't run away."
PRAXIS: "Here's permission to trade my money that you can't touch."

---

## The Technical Questions

### "What chains does this work on?"

Flare only. Here's why:

1. **FTSO**: Decentralized price feeds without Chainlink dependencies
2. **FDC**: Cross-chain data for multi-chain strategy info
3. **FAssets**: FXRP, FBTC, FDOGE as native collateral

More in [Why Flare](9-why-flare.md).

### "What protocols can executors use?"

Currently whitelisted:
- **SparkDEX**: DEX adapter for spot trades
- **Kinetic**: Lending/borrowing adapter
- **More coming**: As adapters are audited and approved

### "How are prices determined?"

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                            PRICE DETERMINATION                              │
└─────────────────────────────────────────────────────────────────────────────┘

┌─────────────────────┐      ┌─────────────────────────────────────────────┐
│   PRICE SOURCES     │      │          PRICE ORACLE CONTRACT              │
├─────────────────────┤      ├─────────────────────────────────────────────┤
│                     │      │                                             │
│  ┌───────────────┐  │      │  ┌─────────────────────────────────────┐   │
│  │  Flare FTSO   │──┼──────┼─►│  Aggregate & Validate               │   │
│  └───────────────┘  │      │  └──────────────┬──────────────────────┘   │
│                     │      │                 │                          │
│  ┌───────────────┐  │      │                 ▼                          │
│  │   DEX Price   │──┼──────┼─►┌─────────────────────────────────────┐   │
│  └───────────────┘  │      │  │  Check Deviation                    │   │
│                     │      │  └──────────────┬──────────────────────┘   │
│  ┌───────────────┐  │      │                 │                          │
│  │     TWAP      │──┼──────┼─►               ▼                          │
│  └───────────────┘  │      │  ┌─────────────────────────────────────┐   │
│                     │      │  │  Final Price                        │───┼──►
└─────────────────────┘      │  └─────────────────────────────────────┘   │
                             └─────────────────────────────────────────────┘
```

FTSO is primary. DEX price as sanity check. TWAP for manipulation resistance.

### "What happens during high volatility?"

Circuit breaker parameters tighten:
- Normal: 5% daily vault loss triggers pause
- High vol: Can be adjusted to 3% by governance
- Positions can still be closed during pause
- New positions blocked until cooldown

---

## The "What If" Questions

### "What if the smart contracts have a bug?"

Same risk as any DeFi protocol. Mitigated by:
- Multiple audits (Code4rena, Sherlock)
- Bug bounty program
- Gradual TVL increase
- Insurance fund

### "What if Flare goes down?"

Then all Flare dApps go down. Standard L1 risk. Not PRAXIS-specific.

### "What if executors just stop trading?"

Then LP yield comes only from base fees. No profit share. LPs can withdraw anytime.

### "What if more people want to withdraw than liquidity allows?"

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                          WITHDRAWAL FLOW                                    │
└─────────────────────────────────────────────────────────────────────────────┘

┌────────────────────┐
│ Withdrawal Request │
└─────────┬──────────┘
          │
          ▼
┌────────────────────┐
│  Check Liquidity   │
└─────────┬──────────┘
          │
          ├──────────────────────────────────────────┐
          │ Available > Request                      │ Available < Request
          ▼                                          ▼
┌────────────────────┐                    ┌────────────────────┐
│ Instant Withdrawal │                    │ Join Withdrawal    │
└────────────────────┘                    │      Queue         │
                                          └─────────┬──────────┘
                                                    │
                                                    ▼
                                          ┌────────────────────┐
                                          │ Wait for Positions │
                                          │     to Close       │
                                          └─────────┬──────────┘
                                                    │
                                                    ▼
                                          ┌────────────────────┐
                                          │ Request Fulfilled  │
                                          └────────────────────┘
```

30% of vault is always liquid. Beyond that, withdrawals queue.

---

## The Economic Questions

### "What are the fees?"

| Fee | Amount | Goes To |
|-----|--------|---------|
| Base fee | 2% annual | LPs |
| Profit share | 20% of profits | LPs |
| Slashing | 100% of stake (up to loss) | LP insurance |
| Insurance contribution | 2% of profits | Insurance fund |

### "Who sets the profit split?"

Currently fixed at 80/20. Governance can adjust.

### "What's the minimum stake?"

Depends on tier and capital requested:
- Tier 0: 50% stake ($50 for $100 ERT)
- Tier 3: 10% stake ($10k for $100k ERT)

### "Can I lose more than I stake?"

No. Max loss = your stake. Positions auto-close before exceeding drawdown limit.

---

## The Skeptic's Corner

### "This is just lending with extra steps."

No. Lending = custody transfer. PRAXIS = execution delegation.

```
Lending:
1. Borrower receives tokens
2. Borrower has custody
3. Protocol hopes borrower returns tokens

PRAXIS:
1. Executor receives permission
2. Vault keeps custody
3. Protocol ensures tokens never leave
```

Different primitive. Different risk profile. Different returns.

### "Nobody will use this."

Prop trading firms exist. Hedge funds exist. They've been doing this with legal contracts for decades. We're just encoding it in smart contracts.

### "The regulatory status is unclear."

Welcome to DeFi.

---

## Still Have Questions?

Read the [Architecture](7-architecture.md) for technical deep-dive.
Read the [Safety](8-safety.md) for security details.

Or just deploy on testnet and try to break it.
