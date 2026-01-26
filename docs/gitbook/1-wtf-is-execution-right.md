# 1. WTF is an Execution Right?

Let's start with what it's **not**.

---

## It's Not a Loan

When you borrow from Aave or Compound:
1. You deposit collateral
2. You receive tokens
3. You walk away with those tokens
4. The protocol *hopes* you come back

```
Traditional Lending Flow:
═══════════════════════════════════════════════════════════

  You ──── Deposit $150 ────► Lending Protocol
   ▲                              │
   │                              │
   └──── Here's $100, bye ◄───────┘
   │
   │     Maybe returns it? ───────► Protocol
   │                                   │
   └─────────────────────────────── Prays
```

The problem? You have custody. You could:
- Lose it all in a bad trade
- Get liquidated
- Just... not come back (we've all thought about it)

That's why lending requires **overcollateralization**. You put up $150 to borrow $100. Capital efficiency? Never heard of her.

---

## An Execution Right is Different

With PRAXIS:
1. You request permission to execute strategies
2. You receive an NFT (the "ERT") that encodes your permissions
3. The money **never leaves the vault**
4. Smart contracts execute trades on your behalf, within your limits

```
PRAXIS Flow:
═══════════════════════════════════════════════════════════

  You ──── Request $100k ERT ────► PRAXIS
   ▲                                  │
   │                                  │
   └──── Here's permission NFT ◄──────┘
   │
   └──── Execute trade ──────────► PRAXIS
                                      │
                                      ▼
                                  SparkDEX
                                      │
                           Returns result
                                      │
                                      ▼
                               Position tracked
```

The money? Still in the vault. You? Just holding a permission slip.

---

## The Company Credit Card Analogy

You know how corporate cards work?

| Corporate Card | PRAXIS ERT |
|----------------|------------|
| Company owns the money | Vault owns the capital |
| Card has spending limits | ERT has capital limits |
| Can only buy approved things | Can only use approved protocols |
| HR tracks everything | PositionManager tracks everything |
| Overspend = declined | Exceed limits = reverted |
| Abuse it = fired | Abuse it = lose your stake |

Except PRAXIS doesn't have an HR department. Just cold, unfeeling smart contracts that don't care about your excuses.

---

## What the ERT Actually Contains

When you get an Execution Rights Token, it's an NFT with encoded parameters:

```solidity
struct ExecutionRights {
    uint256 capitalLimit;        // Max capital you can use
    uint256 maxLeverage;         // e.g., 5x max
    uint256 maxDrawdownBps;      // e.g., 1000 = 10%
    address[] allowedAdapters;   // SparkDEX, Kinetic, etc.
    address[] allowedAssets;     // USDC, WFLR, FXRP, etc.
    uint256 stakedAmount;        // Your skin in the game
    uint256 expiryTime;          // When this expires
}
```

Every single trade you make gets validated against these parameters. Exceed any limit? Transaction reverts. No exceptions. No "but I was about to close the position." Just `revert()`.

---

## Quick Comparison

| Aspect | Traditional Lending | PRAXIS |
|--------|--------------------| -------|
| Custody | Borrower takes it | Vault keeps it |
| Default risk | High | Impossible |
| Collateral required | 150%+ | 5-50% stake |
| Who controls funds | Borrower | Smart contracts |
| What if you rug | Protocol loses | You lose your stake |

---

## The "But Actually" Section

**"But the vault is still giving money to trades!"**

Yes. Through adapters that the vault controls. The vault calls SparkDEX. SparkDEX returns tokens to the vault. At no point does the executor have custody.

**"But what if the executor makes a bad trade?"**

Then they lose their stake. The stake is always >= max drawdown. LP can't lose more than the executor already put up.

**"But what if they make REALLY bad trades?"**

Circuit breaker pauses everything at 5% daily vault loss. [More on that in Section 8](8-safety.md).

---

## Next Up

Now that you understand what an ERT is, let's talk about [The "Aha!" Moment](2-the-aha-moment.md) - why this model actually makes more sense than lending.
