# 9. Why Flare

"Why not Ethereum/Arbitrum/Solana/[insert chain here]?"

Fair question. Here's the answer.

---

## The TL;DR

Flare has three things other chains don't:
1. **FTSO** - Decentralized price feeds without Chainlink
2. **FDC** - Cross-chain data without bridges
3. **FAssets** - Bitcoin/XRP/Doge as native collateral

For a protocol that needs reliable prices, cross-chain info, and diverse collateral... Flare is the obvious choice.

---

## FTSO: Decentralized Oracles

### The Chainlink Problem

Every DeFi protocol on Ethereum uses Chainlink. Which means:
- Single point of failure for the entire ecosystem
- Chainlink can pause/delay feeds
- Oracle extractable value (OEV) to deal with
- Trust assumptions everywhere

### How FTSO Works

```
┌─────────────────────────────────────────────────────────────────────────────────┐
│                              FTSO SYSTEM                                        │
└─────────────────────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────┐
│           100+ DATA PROVIDERS               │
├─────────────────────────────────────────────┤
│                                             │
│  ┌──────────┐ ┌──────────┐ ┌──────────┐    │
│  │Provider 1│ │Provider 2│ │Provider 3│ ...│
│  └────┬─────┘ └────┬─────┘ └────┬─────┘    │
│       │            │            │           │
└───────┼────────────┼────────────┼───────────┘
        │            │            │
        └────────────┼────────────┘
                     │
                     ▼ Submit prices
┌─────────────────────────────────────────────┐
│               FTSO SYSTEM                   │
├─────────────────────────────────────────────┤
│                                             │
│  ┌───────────────────────────────────────┐  │
│  │         Calculate Median              │  │
│  └──────────────────┬────────────────────┘  │
│                     │                       │
│          ┌──────────┴──────────┐            │
│          ▼                     ▼            │
│  ┌───────────────┐    ┌───────────────┐     │
│  │    Reward     │    │    Punish     │     │
│  │   accurate    │    │   outliers    │     │
│  │   providers   │    │               │     │
│  └───────────────┘    └───────────────┘     │
│                                             │
└──────────────────────┬──────────────────────┘
                       │
                       ▼
┌─────────────────────────────────────────────┐
│                RESULT                       │
├─────────────────────────────────────────────┤
│  ┌───────────────────────────────────────┐  │
│  │       Decentralized Price             │  │
│  └───────────────────────────────────────┘  │
│  ┌───────────────────────────────────────┐  │
│  │       Cryptographic Proof             │  │
│  └───────────────────────────────────────┘  │
└─────────────────────────────────────────────┘
```

### Why This Matters for PRAXIS

```
Scenario: Executor opens $100k leveraged position
───────────────────────────────────────────────────
We need to:
1. Get entry price (to calculate position value)
2. Monitor price (for liquidation)
3. Get exit price (for P&L calculation)

With Chainlink:
- Trust that Chainlink hasn't been compromised
- Pay Chainlink fees indirectly
- Accept Chainlink's update frequency

With FTSO:
- Decentralized consensus on price
- Native to the chain (no external deps)
- Cryptographic proof of price
```

### FTSO in Practice

```solidity
// FlareOracle.sol
function getPrice(address asset) external view returns (uint256 price, uint256 timestamp) {
    // Fetch from FTSO
    (uint256 ftsoPrice, uint256 ftsoTimestamp, ) = ftso.getCurrentPriceWithDecimals(assetSymbol);

    // Validate freshness
    require(block.timestamp - ftsoTimestamp < MAX_PRICE_AGE, "Stale price");

    return (ftsoPrice, ftsoTimestamp);
}
```

---

## FDC: Cross-Chain Data

### The Bridge Problem

Want data from another chain? Traditional options:
1. **Bridge** - Trust bridge operators, pray they don't get hacked
2. **Oracle** - Trust oracle operators, same issue
3. **IBC** - Only works for Cosmos chains

### How FDC Works

Flare Data Connector fetches and verifies data from other chains natively.

```
┌─────────────────────────────────────────────────────────────────────────────────┐
│                        FLARE DATA CONNECTOR                                     │
└─────────────────────────────────────────────────────────────────────────────────┘

┌─────────────────────────────┐     ┌─────────────────────────────┐
│      EXTERNAL CHAINS        │     │    FLARE DATA CONNECTOR     │
├─────────────────────────────┤     ├─────────────────────────────┤
│                             │     │                             │
│  ┌─────────┐                │     │  ┌───────────────────────┐  │
│  │Ethereum │────────────────┼────►│  │    Fetch data         │  │
│  └─────────┘                │     │  └───────────┬───────────┘  │
│                             │     │              │              │
│  ┌─────────┐                │     │              ▼              │
│  │ Bitcoin │────────────────┼────►│  ┌───────────────────────┐  │
│  └─────────┘                │     │  │  Create attestation   │  │
│                             │     │  └───────────┬───────────┘  │
│  ┌─────────┐                │     │              │              │
│  │XRP Ledger│───────────────┼────►│              ▼              │
│  └─────────┘                │     │  ┌───────────────────────┐  │
│                             │     │  │Cryptographic verify   │  │
└─────────────────────────────┘     │  └───────────┬───────────┘  │
                                    │              │              │
                                    └──────────────┼──────────────┘
                                                   │
                                                   ▼
                                    ┌─────────────────────────────┐
                                    │        FLARE CHAIN          │
                                    ├─────────────────────────────┤
                                    │                             │
                                    │  Use in smart contracts     │
                                    │                             │
                                    └─────────────────────────────┘
```

### Why This Matters for PRAXIS

```
Scenario: Executor wants to trade based on Bitcoin mempool activity
─────────────────────────────────────────────────────────────────────
Traditional approach:
1. Run Bitcoin node
2. Centralized API to fetch mempool
3. Trust API provider
4. Hope data is accurate

With FDC:
1. FDC fetches Bitcoin data natively
2. Data is attested by Flare validators
3. Cryptographically verified on-chain
4. No trust assumptions
```

### Potential Use Cases

- **Cross-chain arbitrage signals**: See prices on other chains
- **Bitcoin-backed strategies**: React to BTC network activity
- **Multi-chain portfolio tracking**: Unified view across chains

---

## FAssets: Native Bitcoin/XRP/Doge

### The Wrapped Asset Problem

Want to use Bitcoin on Ethereum? Options:
1. **WBTC** - Trust BitGo (centralized)
2. **renBTC** - Trust Ren (compromised)
3. **tBTC** - Trust threshold signatures

All of these are "trust a small group of people" solutions.

### How FAssets Work

FAssets are trustless representations of external chain assets.

```
┌─────────────────────────────────────────────────────────────────────────────────┐
│                           FASSETS SYSTEM                                        │
└─────────────────────────────────────────────────────────────────────────────────┘

┌─────────────────────────────┐
│       ORIGINAL ASSET        │
├─────────────────────────────┤
│                             │
│  ┌─────────────────────┐    │
│  │ Bitcoin on Bitcoin  │    │
│  └─────────────────────┘    │
│                             │
│  ┌─────────────────────┐    │
│  │   XRP on XRPL       │    │
│  └─────────────────────┘    │
│                             │
│  ┌─────────────────────┐    │
│  │  Doge on Dogecoin   │    │
│  └─────────────────────┘    │
│                             │
└──────────────┬──────────────┘
               │
               ▼
┌─────────────────────────────────────────────────────────────────────────────────┐
│                          LOCKING PROCESS                                        │
├─────────────────────────────────────────────────────────────────────────────────┤
│                                                                                 │
│  ┌─────────────────────┐   ┌─────────────────────┐   ┌───────────────────────┐ │
│  │  FAsset Agent       │   │  User sends BTC     │   │  FDC verifies         │ │
│  │  locks collateral   │──►│  to agent           │──►│  transaction          │ │
│  └─────────────────────┘   └─────────────────────┘   └───────────┬───────────┘ │
│                                                                  │             │
│                                                                  ▼             │
│                                                      ┌───────────────────────┐ │
│                                                      │  Mint FBTC on Flare   │ │
│                                                      └───────────────────────┘ │
└─────────────────────────────────────────────────────────────────────────────────┘
               │
               ▼
┌─────────────────────────────┐
│         ON FLARE            │
├─────────────────────────────┤
│                             │
│  ┌─────────┐ ┌─────────┐    │
│  │  FBTC   │ │  FXRP   │    │
│  └─────────┘ └─────────┘    │
│                             │
│  ┌─────────┐                │
│  │ FDOGE   │                │
│  └─────────┘                │
│                             │
└─────────────────────────────┘
```

### Why This Matters for PRAXIS

```
Scenario: LP wants to deposit BTC as collateral
────────────────────────────────────────────────
Traditional approach:
1. Wrap BTC (trust the wrapper)
2. Bridge to destination chain (trust the bridge)
3. Deposit wrapped/bridged BTC
4. Multiple trust assumptions

With FAssets:
1. Convert BTC to FBTC (trustless via FDC)
2. Deposit FBTC directly
3. Single system, cryptographically verified
```

### Supported FAssets

| FAsset | Underlying | Use in PRAXIS |
|--------|------------|---------------|
| FBTC | Bitcoin | Collateral, trading |
| FXRP | XRP | Collateral, trading |
| FDOGE | Dogecoin | Trading |

---

## Flare's DeFi Ecosystem

PRAXIS doesn't exist in isolation. Here's what we integrate with:

```
┌─────────────────────────────────────────────────────────────────────────────────┐
│                         FLARE DEFI ECOSYSTEM                                    │
└─────────────────────────────────────────────────────────────────────────────────┘

                        ┌─────────────────────────────┐
                        │          PRAXIS             │
                        ├─────────────────────────────┤
                        │  ┌───────────────────────┐  │
                        │  │   ExecutionVault      │  │
                        │  ├───────────────────────┤  │
                        │  │   PositionManager     │  │
                        │  └───────────────────────┘  │
                        └──────────────┬──────────────┘
                                       │
               ┌───────────────────────┼───────────────────────┐
               │                       │                       │
               ▼                       ▼                       ▼
┌─────────────────────────┐ ┌─────────────────────────┐ ┌─────────────────────────┐
│          DEXs           │ │        LENDING          │ │    LIQUID STAKING       │
├─────────────────────────┤ ├─────────────────────────┤ ├─────────────────────────┤
│                         │ │                         │ │                         │
│  ┌───────────────────┐  │ │  ┌───────────────────┐  │ │  ┌───────────────────┐  │
│  │     SparkDEX      │  │ │  │     Kinetic       │  │ │  │     Sceptre       │  │
│  └───────────────────┘  │ │  └───────────────────┘  │ │  └───────────────────┘  │
│                         │ │                         │ │                         │
│  ┌───────────────────┐  │ └─────────────────────────┘ └─────────────────────────┘
│  │    BlazeSwap      │  │
│  └───────────────────┘  │
│                         │
│  ┌───────────────────┐  │
│  │      Enosys       │  │
│  └───────────────────┘  │
│                         │
└─────────────────────────┘
```

### SparkDEX

- Concentrated liquidity AMM (Uniswap V3 style)
- Primary DEX for spot trades
- Best liquidity for WFLR pairs

### BlazeSwap

- Classic AMM
- Good for stable pairs
- Lower gas for simple swaps

### Kinetic

- Lending/borrowing protocol
- Supply assets to earn yield
- Borrow against collateral

### Sceptre

- Liquid staking for FLR
- Stake FLR, get sFLR
- Earn staking rewards while using as collateral

---

## Performance Comparison

| Metric | Ethereum | Arbitrum | Flare |
|--------|----------|----------|-------|
| Block time | ~12s | ~0.25s | ~3s |
| Tx cost | $2-50 | $0.10-0.50 | $0.001-0.01 |
| Native oracles | No | No | Yes (FTSO) |
| Cross-chain data | Bridges only | Bridges only | Native (FDC) |
| Bitcoin collateral | Wrapped (trust) | Wrapped (trust) | Native (FAssets) |

---

## The Bottom Line

PRAXIS needs:

| Requirement | Other Chains | Flare |
|-------------|--------------|-------|
| Reliable prices | Trust Chainlink | Native FTSO |
| Fast execution | Varies | 3s blocks |
| Low fees | Varies | Sub-cent |
| BTC/XRP support | Trust wrappers | Native FAssets |
| Cross-chain data | Trust bridges | Native FDC |

Flare isn't just "another L1." It's the chain built for exactly what PRAXIS needs.

---

## "But Flare is Small"

Yes. TVL is lower than Ethereum. User count is lower. That's the opportunity.

- Less competition for executors
- Early mover advantage for LPs
- Protocol can shape the ecosystem

We're not competing for attention on Ethereum. We're building where we can win.

---

## Next Up

Want to keep your trades private? Check [ZK Privacy](10-zk-privacy.md).
