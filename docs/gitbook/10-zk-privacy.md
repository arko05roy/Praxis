# 10. ZK Privacy

For the paranoid. And honestly, you should be paranoid.

---

## The Problem with Public Trading

Every trade you make on-chain is visible. Forever.

```
┌─────────────────────────────────────────────────────────────────────────────────┐
│                      THE PUBLIC TRADING PROBLEM                                 │
└─────────────────────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────┐
│            PUBLIC EXECUTION                 │
├─────────────────────────────────────────────┤
│                                             │
│  You trade                                  │
│      │                                      │
│      ▼                                      │
│  On-chain                                   │
│      │                                      │
│      ▼                                      │
│  Everyone sees:                             │
│   • What you bought                         │
│   • When you bought                         │
│   • How much                                │
│   • Your address                            │
│                                             │
└──────────────────────┬──────────────────────┘
                       │
                       ▼
┌─────────────────────────────────────────────┐
│              PROBLEMS                       │
├─────────────────────────────────────────────┤
│                                             │
│  ┌─────────────┐  ┌─────────────┐           │
│  │Front-running│  │Copy trading │           │
│  └─────────────┘  └─────────────┘           │
│                                             │
│  ┌─────────────┐  ┌─────────────┐           │
│  │Competitive  │  │ No privacy  │           │
│  │  analysis   │  │             │           │
│  └─────────────┘  └─────────────┘           │
│                                             │
└─────────────────────────────────────────────┘
```

Your competitors can:
- See your strategy
- Front-run your orders
- Copy your alpha
- Analyze your patterns

---

## The PRAXIS Solution: ZK Execution

Trade privately. Prove compliance. Reveal nothing else.

```
┌─────────────────────────────────────────────────────────────────────────────────┐
│                           ZK EXECUTION FLOW                                     │
└─────────────────────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────┐     ┌─────────────────────────────┐
│              ZK EXECUTION                   │     │       WHAT'S VISIBLE        │
├─────────────────────────────────────────────┤     ├─────────────────────────────┤
│                                             │     │                             │
│  Your trade                                 │     │  [x] Proof is valid         │
│      │                                      │     │                             │
│      ▼                                      │     │  [ ] Trade details          │
│  Noir circuit                               │     │      (encrypted)            │
│      │                                      │     │                             │
│      ▼                                      │     └─────────────────────────────┘
│  Generate proof                             │
│      │                                      │
│      ▼                                      │
│  On-chain verification                      │
│      │                                      │
│      ▼                                      │
│  Private execution                          │
│                                             │
└─────────────────────────────────────────────┘
```

The chain knows you made a valid trade. The chain doesn't know what trade.

---

## How It Works

### Step 1: Off-Chain Computation

You generate a proof locally (in your browser or wallet).

```
Input (private):
- Trade details (asset, amount, direction)
- Your ERT parameters
- Current position state

Input (public):
- Proof commitment
- Encrypted trade data
```

### Step 2: Circuit Validation

The Noir circuit proves:

```
1. You own a valid ERT
2. Trade is within your capital limit
3. Trade is within your leverage limit
4. Asset is in your allowed list
5. Adapter is in your allowed list
6. You won't exceed max drawdown

Without revealing:
- The actual trade
- Your position
- Your strategy
```

### Step 3: On-Chain Verification

```
┌─────────────────────────────────────────────────────────────────────────────────┐
│                      ON-CHAIN VERIFICATION SEQUENCE                             │
└─────────────────────────────────────────────────────────────────────────────────┘

  You        Your Browser      ZKExecutionController    Groth16Verifier    PositionManager
   │              │                    │                      │                  │
   │ Submit trade │                    │                      │                  │
   │─────────────►│                    │                      │                  │
   │              │                    │                      │                  │
   │              │ Generate ZK proof  │                      │                  │
   │              │───────────────────►│                      │                  │
   │              │                    │                      │                  │
   │              │  proof + encrypted │                      │                  │
   │              │  data              │                      │                  │
   │              │───────────────────►│                      │                  │
   │              │                    │                      │                  │
   │              │                    │    Verify proof      │                  │
   │              │                    │─────────────────────►│                  │
   │              │                    │                      │                  │
   │              │                    │       Valid          │                  │
   │              │                    │◄─────────────────────│                  │
   │              │                    │                      │                  │
   │              │                    │  ┌───────────────────────────────────┐  │
   │              │                    │  │ Proof valid, trade is compliant   │  │
   │              │                    │  └───────────────────────────────────┘  │
   │              │                    │                      │                  │
   │              │                    │        Execute (privately)              │
   │              │                    │─────────────────────────────────────────►│
   │              │                    │                      │                  │
   │              │                    │        Position ID (encrypted)          │
   │              │                    │◄─────────────────────────────────────────│
   │              │                    │                      │                  │
   │   Success    │                    │                      │                  │
   │◄─────────────┼────────────────────│                      │                  │
   │              │                    │                      │                  │
```

### Step 4: Private Settlement

When you close the position, the same process:
1. Generate proof of valid close
2. Verify on-chain
3. Settle P&L privately
4. Only final balance change is visible

---

## What's Private vs Public

| Data | Public Mode | ZK Mode |
|------|-------------|---------|
| Trade asset | Visible | Hidden |
| Trade size | Visible | Hidden |
| Trade direction | Visible | Hidden |
| Entry price | Visible | Hidden |
| Exit price | Visible | Hidden |
| P&L | Visible | Hidden |
| That you traded | Visible | Visible |
| Proof is valid | N/A | Visible |
| Final balance change | Visible | Visible |

---

## The Circuits

PRAXIS uses Noir (by Aztec) for ZK circuits.

### PrivateSwapVerifier

Proves a spot trade is valid without revealing details.

```noir
// Simplified circuit logic
fn main(
    // Private inputs
    trade_amount: Field,
    trade_asset: Field,
    ert_capital_limit: Field,
    ert_allowed_assets: [Field; 10],

    // Public inputs
    commitment: pub Field,
) {
    // Prove trade_amount <= ert_capital_limit
    assert(trade_amount <= ert_capital_limit);

    // Prove asset is allowed
    let mut asset_allowed = false;
    for i in 0..10 {
        if ert_allowed_assets[i] == trade_asset {
            asset_allowed = true;
        }
    }
    assert(asset_allowed);

    // Verify commitment matches
    let computed_commitment = pedersen([trade_amount, trade_asset]);
    assert(commitment == computed_commitment);
}
```

### PrivatePerpVerifier

Proves a leveraged position is valid.

```noir
fn main(
    // Private inputs
    position_size: Field,
    leverage: Field,
    ert_max_leverage: Field,
    current_exposure: Field,
    max_exposure: Field,

    // Public inputs
    commitment: pub Field,
) {
    // Prove leverage is within limit
    assert(leverage <= ert_max_leverage);

    // Prove won't exceed max exposure
    let new_exposure = current_exposure + position_size;
    assert(new_exposure <= max_exposure);

    // Verify commitment
    let computed = pedersen([position_size, leverage]);
    assert(commitment == computed);
}
```

### PrivateSettlementVerifier

Proves P&L calculation is correct without revealing amounts.

```noir
fn main(
    // Private inputs
    entry_price: Field,
    exit_price: Field,
    position_size: Field,
    direction: Field, // 0 = long, 1 = short

    // Public inputs
    pnl_commitment: pub Field,
    is_profit: pub bool,
) {
    // Calculate P&L
    let pnl = if direction == 0 {
        (exit_price - entry_price) * position_size
    } else {
        (entry_price - exit_price) * position_size
    };

    // Verify P&L sign matches
    assert((pnl >= 0) == is_profit);

    // Verify commitment
    let computed = pedersen([pnl]);
    assert(pnl_commitment == computed);
}
```

---

## Proof Generation

Proofs are generated client-side using WebAssembly.

```
┌─────────────────────────────────────────────────────────────────────────────────┐
│                         PROOF GENERATION FLOW                                   │
└─────────────────────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────┐     ┌─────────────────────────────┐
│            YOUR BROWSER                     │     │          ON-CHAIN           │
├─────────────────────────────────────────────┤     ├─────────────────────────────┤
│                                             │     │                             │
│  Trade params                               │     │                             │
│      │                                      │     │                             │
│      ▼                                      │     │                             │
│  Noir WASM                                  │     │  Groth16Verifier            │
│      │                                      │     │         │                   │
│      ▼                                      │     │         ▼                   │
│  Groth16 proof ─────────────────────────────┼────►│  Execute trade              │
│                                             │     │                             │
└─────────────────────────────────────────────┘     └─────────────────────────────┘
```

### Performance

| Operation | Time |
|-----------|------|
| Proof generation | 2-5 seconds |
| On-chain verification | ~50k gas |
| Total latency | < 10 seconds |

---

## When to Use ZK Mode

### Use ZK When:
- You have alpha you want to protect
- You're trading significant size
- You don't want competitors copying
- You value privacy

### Don't Use ZK When:
- Speed is critical (adds latency)
- Gas optimization matters (more expensive)
- You're debugging (harder to trace)
- You're building reputation publicly

---

## Trade-offs

```
┌─────────────────────────────────────┐    ┌─────────────────────────────────────┐
│          PUBLIC MODE                │    │            ZK MODE                  │
├─────────────────────────────────────┤    ├─────────────────────────────────────┤
│                                     │    │                                     │
│  [+] Faster                         │    │  [+] Private trades                 │
│                                     │    │                                     │
│  [+] Cheaper gas                    │    │  [+] Hidden strategy                │
│                                     │    │                                     │
│  [+] Easier debugging               │    │  [-] Higher gas                     │
│                                     │    │                                     │
│  [+] Public reputation              │    │  [-] More latency                   │
│                                     │    │                                     │
└─────────────────────────────────────┘    └─────────────────────────────────────┘
```

| Factor | Public | ZK |
|--------|--------|-----|
| Latency | ~3s | ~10s |
| Gas cost | ~100k | ~200k |
| Privacy | None | Full |
| Complexity | Low | Medium |

---

## Security Considerations

### What ZK Proves

The ZK proof guarantees:
1. You have a valid ERT
2. Trade complies with all limits
3. Math is correct

### What ZK Doesn't Hide

- That you made a trade (transaction is visible)
- Your address (on-chain interaction)
- Balance changes (vault accounting)

### Metadata Leakage

Even with ZK, patterns can be analyzed:
- Transaction timing
- Gas usage patterns
- Balance change sizes

For maximum privacy, combine ZK with:
- Multiple addresses
- Irregular timing
- Size obfuscation

---

## Implementation Status

| Circuit | Status | Gas Cost |
|---------|--------|----------|
| PrivateSwapVerifier | Live | ~150k |
| PrivatePerpVerifier | Live | ~180k |
| PrivateYieldVerifier | Live | ~160k |
| PrivateSettlementVerifier | Live | ~170k |

---

## Example Usage

### Enable ZK Mode

```typescript
// In the PRAXIS SDK
const executor = new PraxisExecutor({
    signer: wallet,
    zkMode: true, // Enable ZK
});

// All trades are now private
await executor.openPosition({
    asset: 'WFLR',
    size: 10000,
    leverage: 3,
    direction: 'LONG',
});
// Proof generated automatically
// Trade details hidden on-chain
```

### Manual Proof Generation

```typescript
// For advanced users
import { generateProof } from '@praxis/zk';

const proof = await generateProof({
    circuit: 'private_swap',
    privateInputs: {
        tradeAmount: 10000,
        tradeAsset: WFLR_ADDRESS,
        ertCapitalLimit: 100000,
        ertAllowedAssets: [...],
    },
    publicInputs: {
        commitment: computeCommitment(...),
    },
});

// Submit proof manually
await zkController.executePrivate(proof, commitment);
```

---

## Next Up

Ready to interact with the contracts? See [Contracts](11-contracts.md).
