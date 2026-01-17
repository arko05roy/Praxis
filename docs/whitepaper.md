  # PRAXIS: The Execution Rights Protocol

  **Trade with capital you don't own. Never default. Never get liquidated.**

  ---

  ## Table of Contents

  1. [The Problem](#the-problem)
  2. [The Solution](#the-solution)
  3. [How It Works](#how-it-works)
  4. [Why Flare](#why-flare)
  5. [How PRAXIS Complements Flare DeFi](#how-praxis-complements-flare-defi)
  6. [Liquidity Routing: The Core of PRAXIS](#liquidity-routing-the-core-of-praxis)
  7. [The Economic Model](#the-economic-model)
  8. [Safety Architecture](#safety-architecture)
  9. [Technical Overview](#technical-overview)
  10. [Roadmap](#roadmap)
  11. [Addressing Common Concerns](#addressing-common-concerns)

  ---

  ## The Problem

  ### DeFi Lending is Broken

  Today's DeFi lending has a fundamental issue: **borrowers take custody of assets**.

  When someone borrows from a lending protocol like Aave or Compound, they walk away with the tokens. The protocol hopes they'll return them (plus interest), but has no guarantee. To protect against default, protocols require **overcollateralization** — you must deposit $150 worth of assets to borrow $100.

  This creates several problems:

  | Problem | Impact |
  |---------|--------|
  | **Capital inefficiency** | Only people who already have money can borrow |
  | **Liquidation risk** | Market volatility can wipe out your collateral |
  | **Limited access** | Skilled traders without capital can't participate |
  | **No alpha sharing** | LPs earn fixed rates, miss out on trading profits |

  ### The Missed Opportunity

  Imagine a skilled trader who can consistently make 15% returns. Today, they have two options:

  1. **Trade their own capital** — Limited by personal wealth
  2. **Borrow with collateral** — Need existing assets, risk liquidation

  What they *can't* do is access capital based purely on their skill. There's no way for capital providers to say: "Here's $100k, show me what you can do, and we'll split the profits."

  **Until now.**

  ---

  ## The Solution

  ### Introducing Execution Rights

  PRAXIS doesn't lend you money. It **leases you the right to use money**.

  Here's the key insight: **You can use capital without owning it.**

  ```
  Traditional Lending:
    You borrow $100k → Money leaves the vault → You control it → Risk of default

  PRAXIS Execution Rights:
    You get rights to $100k → Money stays in vault → Smart contracts execute for you → No default possible
  ```

  ### The Core Innovation

  When you get Execution Rights in PRAXIS:

  1. **Capital never leaves the vault** — It stays locked, safe
  2. **You get a permission token (ERT)** — An NFT encoding what you can do
  3. **Smart contracts execute on your behalf** — Within strict limits
  4. **Profits are split fairly** — You keep 80%, LP gets 20%

  It's like being given a company credit card with spending limits, rather than being handed cash.

  ---

  ## How It Works

  ### For LPs (Capital Providers)

  ```
  Step 1: Deposit funds into PRAXIS Vault
          └─ Receive vault shares (like any yield protocol)

  Step 2: Your capital becomes available for executors
          └─ But it NEVER leaves the vault

  Step 3: Earn from executor activity
          └─ 2% base fee (guaranteed)
          └─ 20% of any profits (alpha sharing)

  Step 4: Withdraw anytime (subject to utilization)
          └─ 30% of vault always in reserve
  ```

  ### For Executors (Traders/Bots)

  ```
  Step 1: Request Execution Rights
          └─ Specify: capital needed, duration, strategy type
          └─ Stake collateral based on reputation tier

  Step 2: Receive ERT (Execution Rights Token)
          └─ NFT encoding your permissions & limits

  Step 3: Execute your strategy
          └─ Call approved protocols (SparkDEX, Kinetic, etc.)
          └─ Within your approved limits
          └─ Smart contracts enforce constraints

  Step 4: Settlement at expiry
          └─ All positions unwound
          └─ PnL calculated using FTSO prices
          └─ Profits split: You 80%, LP 20%
  ```

  ### A Real Example

  **Scenario:** Alice is a skilled trader. Bob has capital but no trading skills.

  ```
  Without PRAXIS:
    - Alice can't access Bob's capital (no collateral)
    - Bob's capital sits in a 5% yield farm
    - Both miss out

  With PRAXIS:
    - Alice requests $10,000 execution rights for 7 days
    - Alice stakes $1,500 (15% at Tier 2)
    - Alice runs a profitable strategy, makes $600 profit

    Settlement:
      - LP (Bob) gets: $1.92 base fee + $120 (20% of profit) = $121.92
      - Executor (Alice) gets: $480 (80% of profit)
      - Alice's stake returned in full
      - Capital returned to vault

    Result:
      - Bob earned 12%+ APY on his capital (vs 5% in yield farm)
      - Alice made $480 with only $1,500 of her own money
      - Both win
  ```

  ---

  ## Why Flare

  PRAXIS is built specifically for Flare because Flare has infrastructure no other chain provides.

  ### FTSO (Flare Time Series Oracle)

  **What it does:** Provides trustless, decentralized price feeds for 63+ assets.

  **Why PRAXIS needs it:** Settlement requires calculating profit/loss. We need prices that:
  - Can't be manipulated by executors
  - Update frequently (every 90 seconds)
  - Are available for all assets traded

  FTSO gives us this. On other chains, we'd need to trust a centralized oracle — a critical security risk.

  ```
  At settlement:
    1. Query FTSO for all asset prices
    2. Calculate PnL = (final value) - (initial capital)
    3. Distribute fees trustlessly

  No one can manipulate their reported profits.
  ```

  ### FDC (Flare Data Connector)

  **What it does:** Brings verified external data (Bitcoin transactions, Ethereum events) on-chain.

  **Why PRAXIS needs it:** Enables cross-chain triggered execution.

  ```
  Example use case:
    "When my BTC payment confirms on Bitcoin mainnet,
    automatically swap to FXRP and stake for yield"

  How it works:
    1. User sets up ERT with FDC trigger condition
    2. BTC payment happens on Bitcoin
    3. Anyone submits FDC proof to PRAXIS
    4. FDCVerifier confirms the proof
    5. Strategy executes automatically
  ```

  ### FAssets (FXRP, FBTC, FDOGE)

  **What they are:** Trustless representations of BTC, XRP, DOGE on Flare.

  **Why PRAXIS needs them:** They're the most liquid non-FLR assets on Flare. PRAXIS enables strategies like:
  - FXRP yield farming
  - BTC-backed trading strategies
  - Cross-chain arbitrage

  ---

  ## How PRAXIS Complements Flare DeFi

  ### What We Don't Do (Avoiding Overlap)

  | Existing Protocol | Their Focus | What PRAXIS Doesn't Do |
  |-------------------|-------------|------------------------|
  | earnXRP | Yield aggregation | Compete on yield strategies |
  | Kinetic | Lending/borrowing | Provide lending services |
  | SparkDEX | DEX trading | Run our own liquidity pools |
  | Sceptre | Liquid staking | Offer staking products |

  ### What We Do (Driving Volume)

  PRAXIS is an **execution layer** that uses existing protocols. Every executor action generates:

  ```
  SparkDEX/Enosys/BlazeSwap → Swap volume
  Kinetic                    → Lending TVL
  Sceptre                    → Staking TVL
  SparkDEX Eternal           → Perpetual trading volume
  FAssets                    → FXRP/FBTC utility
  ```

  We don't compete with these protocols. **We drive business to them.**

  ### The Ecosystem Multiplier Effect

  ```
  ┌─────────────────────────────────────────────────────────────────┐
  │                    PRAXIS ECOSYSTEM IMPACT                       │
  ├─────────────────────────────────────────────────────────────────┤
  │                                                                  │
  │  Traditional Model:                                              │
  │    User deposits → Protocol takes fees → That's it              │
  │                                                                  │
  │  PRAXIS Model:                                                   │
  │    User deposits → Executor gets rights → Executor trades:       │
  │      → Swap on SparkDEX (SparkDEX earns fees)                   │
  │      → Stake on Sceptre (Sceptre gains TVL)                     │
  │      → Lend on Kinetic (Kinetic earns interest)                 │
  │      → Trade perps on Eternal (Eternal earns fees)              │
  │                                                                  │
  │    Every $1 in PRAXIS generates activity across the ecosystem.  │
  │                                                                  │
  └─────────────────────────────────────────────────────────────────┘
  ```

  ---

  ## Liquidity Routing: The Core of PRAXIS

  ### We Don't Bootstrap Liquidity — We Route It

  This is critical: **PRAXIS doesn't need its own liquidity pools.**

  Traditional DeFi protocols face the "cold start" problem — they need to attract liquidity providers before they can offer any service. A new DEX needs LP deposits. A new lending protocol needs lenders.

  PRAXIS is different. We tap into **existing liquidity** across the Flare ecosystem:

  ```
  ┌─────────────────────────────────────────────────────────────────┐
  │              PRAXIS LIQUIDITY ROUTING ARCHITECTURE               │
  ├─────────────────────────────────────────────────────────────────┤
  │                                                                  │
  │                      PRAXIS VAULT                                │
  │                    (Holds executor capital)                      │
  │                            │                                     │
  │                            ▼                                     │
  │                      SWAP ROUTER                                 │
  │              ┌───────────┬┴┬───────────┐                        │
  │              │           │ │           │                        │
  │              ▼           ▼ ▼           ▼                        │
  │         ┌────────┐  ┌────────┐  ┌────────────┐                  │
  │         │SparkDEX│  │ Enosys │  │ BlazeSwap  │                  │
  │         │   V3   │  │   V3   │  │    V2      │                  │
  │         └────────┘  └────────┘  └────────────┘                  │
  │              │           │           │                          │
  │              └───────────┴───────────┘                          │
  │                          │                                       │
  │                          ▼                                       │
  │              EXISTING LIQUIDITY POOLS                            │
  │              (Already bootstrapped by each DEX)                  │
  │                                                                  │
  │  The SwapRouter queries ALL DEXs and routes to the best price.  │
  │  PRAXIS benefits from liquidity we didn't have to bootstrap.    │
  │                                                                  │
  └─────────────────────────────────────────────────────────────────┘
  ```

  ### How the SwapRouter Works

  When an executor wants to swap 10,000 USDC → FLR:

  ```
  Step 1: SwapRouter.getAllQuotes(USDC, FLR, 10000)

    SparkDEX V3:  10,000 USDC → 495,000 FLR (0.3% fee tier)
    Enosys V3:    10,000 USDC → 493,500 FLR (0.3% fee tier)
    BlazeSwap V2: 10,000 USDC → 491,000 FLR (0.3% fee)

  Step 2: SwapRouter.findBestRoute() → SparkDEX wins

  Step 3: Execute swap through SparkDEX adapter

  Result:
    - Executor gets best rate (495,000 FLR)
    - SparkDEX earns $30 in fees
    - SparkDEX LPs earn their share
    - Everyone wins
  ```

  ### Multi-Hop Routing for Deep Liquidity

  Sometimes the best path isn't direct. The SwapRouter handles multi-hop routes:

  ```
  Example: Swap 50,000 FXRP → sFLR

  Direct route might have high slippage.

  Multi-hop route:
    FXRP → USDC (SparkDEX, deep liquidity)
    USDC → WFLR (Enosys, best rate)
    WFLR → sFLR (Sceptre, native staking)

  The SwapRouter finds this path automatically.
  Each protocol along the way earns fees.
  ```

  ### Perpetual Trading Through SparkDEX Eternal

  SparkDEX Eternal is Flare's perpetual futures exchange, offering up to 100x leverage. PRAXIS integrates directly:

  ```
  ┌─────────────────────────────────────────────────────────────────┐
  │              PERPETUAL TRADING VIA PRAXIS                        │
  ├─────────────────────────────────────────────────────────────────┤
  │                                                                  │
  │  What SparkDEX Eternal offers:                                   │
  │    • Perpetual futures on FLR, BTC, ETH, XRP                    │
  │    • Up to 100x leverage                                        │
  │    • Deep liquidity from their LP pools                         │
  │                                                                  │
  │  What PRAXIS enables:                                            │
  │    • Executors can open perp positions using vault capital      │
  │    • Leverage is capped by ERT constraints (e.g., max 5x)       │
  │    • Margin management through our adapter                      │
  │    • All fees go to SparkDEX Eternal LPs                        │
  │                                                                  │
  │  Example executor strategy:                                      │
  │    1. Get $50,000 execution rights                              │
  │    2. Open 3x long FLR/USD on Eternal ($150k notional)          │
  │    3. Manage position over 7 days                               │
  │    4. Close at profit, settle with LP                           │
  │                                                                  │
  │  Volume generated:                                               │
  │    • $150k notional open                                        │
  │    • $150k notional close                                       │
  │    • Funding fees paid during hold                              │
  │    • Liquidation fees if position managed poorly                │
  │                                                                  │
  │  All of this volume flows to SparkDEX Eternal.                  │
  │                                                                  │
  └─────────────────────────────────────────────────────────────────┘
  ```

  ### Volume Multiplier Effect

  Here's why PRAXIS is valuable to the ecosystem. A single executor strategy can generate massive volume:

  ```
  Example: $10,000 execution rights for 7 days

  Day 1:
    • Swap $10,000 USDC → FLR (SparkDEX)         → $10k volume
    • Stake FLR → sFLR (Sceptre)                 → $10k TVL

  Day 3:
    • Unstake sFLR → FLR (Sceptre)               → $10k volume
    • Open 3x long FLR perp (Eternal)            → $30k notional

  Day 5:
    • Close perp position (Eternal)              → $30k notional
    • Swap FLR → FXRP (Enosys)                   → $11k volume

  Day 7:
    • Swap FXRP → USDC for settlement (SparkDEX) → $12k volume

  TOTAL VOLUME FROM $10k CAPITAL:
    • DEX swaps: ~$43,000
    • Perp volume: ~$60,000
    • Staking TVL-days: ~$20,000

  That's 10x+ volume multiplication.
  ```

  ### Why This Matters for Flare Ecosystem

  ```
  ┌─────────────────────────────────────────────────────────────────┐
  │              PRAXIS VALUE TO FLARE PROTOCOLS                     │
  ├─────────────────────────────────────────────────────────────────┤
  │                                                                  │
  │  FOR SparkDEX:                                                   │
  │    • Every PRAXIS swap = trading fees                           │
  │    • More volume = more LP rewards = more liquidity             │
  │    • PRAXIS executors become power users                        │
  │                                                                  │
  │  FOR SparkDEX Eternal:                                           │
  │    • Professional traders with capital = serious volume         │
  │    • Funding rate arbitrage strategies = market efficiency      │
  │    • Hedging strategies = two-sided orderbook                   │
  │                                                                  │
  │  FOR Kinetic:                                                    │
  │    • Executors borrowing/lending = utilization                  │
  │    • Higher utilization = better rates for lenders              │
  │    • Leverage strategies need Kinetic                           │
  │                                                                  │
  │  FOR Sceptre:                                                    │
  │    • sFLR is a core yield-bearing asset                         │
  │    • Executors stake → more sFLR demand                         │
  │    • More staking = more network security                       │
  │                                                                  │
  │  FOR Enosys/BlazeSwap:                                           │
  │    • SwapRouter includes them in quotes                         │
  │    • Best rate wins, keeping them competitive                   │
  │    • Niche pairs might route through them                       │
  │                                                                  │
  │  PRAXIS success = Flare DeFi success                            │
  │                                                                  │
  └─────────────────────────────────────────────────────────────────┘
  ```

  ### The No-Liquidity-Bootstrap Advantage

  Traditional new protocol launch:

  ```
  1. Launch protocol
  2. Incentivize LPs with token emissions (expensive)
  3. Hope liquidity comes (often doesn't)
  4. Chicken-and-egg: no users without liquidity, no liquidity without users
  5. Many protocols die here
  ```

  PRAXIS launch:

  ```
  1. Launch protocol
  2. Connect adapters to existing DEXs/protocols
  3. Liquidity already exists (SparkDEX, Kinetic, etc.)
  4. Executors can trade immediately
  5. No bootstrapping needed — we tap existing infrastructure
  ```

  This is why PRAXIS is **realistic and practical** — we don't need to solve the liquidity problem because we use liquidity that already exists.

  ---

  ## The Economic Model

  ### Alpha Sharing: Why LPs Would Deposit

  **The question:** Why deposit in PRAXIS vs earnXRP (5% fixed) or Kinetic (4% lending)?

  **The answer:** PRAXIS offers something no one else does — **exposure to skilled trading**.

  ```
  ┌─────────────────────────────────────────────────────────────────┐
  │                    LP YIELD COMPARISON                           │
  ├─────────────────────────────────────────────────────────────────┤
  │                                                                  │
  │  earnXRP:     Fixed 5% APY (vault manager decides strategy)     │
  │  Kinetic:     Fixed 4% APY (lending interest)                   │
  │  Sceptre:     Fixed 6% APY (staking rewards)                    │
  │                                                                  │
  │  PRAXIS:      2% base fee + 20% of executor profits             │
  │               │                                                  │
  │               ├─ If executor makes 0%:  LP gets 2% (floor)      │
  │               ├─ If executor makes 15%: LP gets 2% + 3% = 5%    │
  │               ├─ If executor makes 30%: LP gets 2% + 6% = 8%    │
  │               └─ If executor makes 50%: LP gets 2% + 10% = 12%  │
  │                                                                  │
  │  KEY INSIGHT: LPs get UPSIDE EXPOSURE to skilled trading        │
  │               without doing the trading themselves.              │
  │                                                                  │
  └─────────────────────────────────────────────────────────────────┘
  ```

  ### The Math for Executors

  ```
  Executor requests $10,000 for 30 days:

    Upfront cost: $10,000 × 2% × (30/365) = $16.44

    If they make 5% profit ($500):
      LP share (20%): $100
      Executor keeps (80%): $400
      Net to executor: $400 - $16.44 = $383.56

    Effective return on stake (at Tier 2, 15% = $1,500):
      $383.56 / $1,500 = 25.6% in 30 days

  This is why skilled traders want execution rights.
  ```

  ### Fee Flow Summary

  ```
  Profitable Settlement:
    Gross Profit: $1,000
      → Insurance Fund: $20 (2%)
      → LP Base Fee: ~$5 (2% APR pro-rated)
      → LP Profit Share: $196 (20% of remaining)
      → Executor: $779 (80% of remaining)

  Loss Settlement (Loss = $500):
    → Deduct from executor's stake first
    → If stake covers it: LP loses nothing
    → If stake insufficient: Insurance fund covers remainder
    → LP absorbs only what insurance can't cover
  ```

  ---

  ## Safety Architecture

  ### The Problem We're Solving

  Without protection, a market crash could cause:
  - All executors lose simultaneously
  - Vault bleeds capital rapidly
  - LPs lose trust and withdraw
  - Protocol death spiral

  ### Multi-Layer Protection

  ```
  ┌─────────────────────────────────────────────────────────────────┐
  │                    VAULT SAFETY SYSTEM                           │
  ├─────────────────────────────────────────────────────────────────┤
  │                                                                  │
  │  Layer 1: REPUTATION TIERS                                       │
  │     └─ New users start small ($100 max)                         │
  │     └─ Must prove themselves to access more capital             │
  │     └─ Griefing becomes economically irrational                 │
  │                                                                  │
  │  Layer 2: STAKE REQUIREMENTS                                     │
  │     └─ Stake % always > Max Drawdown %                          │
  │     └─ Executor stake covers any losses first                   │
  │     └─ LP protected up to stake amount                          │
  │                                                                  │
  │  Layer 3: UTILIZATION CAP (70%)                                 │
  │     └─ Max 70% of vault can be allocated                        │
  │     └─ 30% always in reserve, untouchable                       │
  │                                                                  │
  │  Layer 4: CIRCUIT BREAKER (5% daily loss)                       │
  │     └─ If daily vault loss > 5%, pause everything               │
  │     └─ Force settle all active ERTs                             │
  │     └─ Prevents cascading losses                                │
  │                                                                  │
  │  Layer 5: EXPOSURE LIMITS (30% per asset)                       │
  │     └─ No more than 30% of vault in any single asset            │
  │     └─ Forces diversification                                   │
  │     └─ Prevents concentrated losses                             │
  │                                                                  │
  │  Layer 6: INSURANCE FUND (2% of profits)                        │
  │     └─ 2% of all profits go to insurance                        │
  │     └─ Covers losses before LPs absorb                          │
  │     └─ Safety net for black swan events                         │
  │                                                                  │
  └─────────────────────────────────────────────────────────────────┘
  ```

  ### Reputation Tier System

  New executors can't request $100k on day one. They must earn trust:

  | Tier | Name | Max Capital | Stake Required | Max Drawdown |
  |------|------|-------------|----------------|--------------|
  | 0 | Unverified | $100 | 50% | 20% |
  | 1 | Novice | $1,000 | 25% | 15% |
  | 2 | Verified | $10,000 | 15% | 10% |
  | 3 | Established | $100,000 | 10% | 10% |
  | 4 | Elite | $500,000+ | 5% | 15% |

  **Key Invariant:** Stake % ≥ Max Drawdown % at every tier.

  This means: **The executor's stake always covers the maximum possible loss.**

  ### Why Griefing Doesn't Work

  ```
  Attack attempt: "I'll grief $100k from the vault"

  Without reputation:
    - Request $100k
    - Intentionally lose 10% = $10k
    - Walk away
    - Cost to attacker: $0
    - LP loss: $10k

  With reputation:
    - Must start at Tier 0 ($100 max)
    - Work through 3 months of profitable trading
    - Finally reach Tier 3 ($100k)
    - Stake $10k (10%)
    - Intentionally lose 10% = $10k
    - Executor loses their $10k stake
    - LP loss: $0

  Result: Attacker spent 3 months and lost $10k to grief $0.
  This is economically irrational.
  ```

  ---

  ## Technical Overview

  ### Contract Architecture

  ```
                      PraxisGateway (User Entry Point)
                                │
            ┌───────────────────┼───────────────────┐
            │                   │                   │
            ▼                   ▼                   ▼
      ExecutionVault     ExecutionController   SettlementEngine
      (Holds LP capital)  (Enforces rules)     (Calculates PnL)
            │                   │                   │
            │                   ▼                   │
            │         ExecutionRightsNFT           │
            │         (Permission tokens)           │
            │                   │                   │
            └─────────┬─────────┼───────────────────┘
                      │         │
                      ▼         ▼
            ┌─────────────────────────────┐
            │      Protocol Adapters       │
            │                             │
            │  SparkDEXAdapter (swaps)    │
            │  KineticAdapter (lending)   │
            │  SceptreAdapter (staking)   │
            │  EternalAdapter (perps)     │
            └─────────────────────────────┘
                          │
                          ▼
            ┌─────────────────────────────┐
            │       Oracle Layer          │
            │                             │
            │  FlareOracle (FTSO prices)  │
            │  FDCVerifier (cross-chain)  │
            └─────────────────────────────┘
  ```

  ### What Gets Enforced On-Chain

  Every executor action is validated against their ERT:

  - Is the ERT valid and not expired?
  - Is the caller the ERT holder?
  - Is the protocol/adapter on the whitelist?
  - Are the assets on the whitelist?
  - Is the position size within limits?
  - Is leverage within limits?
  - Is current drawdown within limits?

  **If any check fails, the transaction reverts.** There's no way to bypass constraints.

  ### Deployed Contracts (Coston2 Testnet)

  | Contract | Address | Purpose |
  |----------|---------|---------|
  | FlareOracle | `0x0979854b028210Cf492a3bCB990B6a1D45d89eCc` | FTSO price feeds |
  | FDCVerifier | `0xe667bEf52f1EAD93Cb0375639a4eA36001d4edf3` | Cross-chain proofs |
  | SwapRouter | `0x5886E78c68E1B65f255f27272eaD3B0d20161918` | DEX aggregation |

  ---

  ## Roadmap

  ### Phased Implementation

  ```
  Phase A: Self-Execution (Proving the System)
    └─ Users deposit AND execute their own strategies
    └─ Use cases: Auto-DCA, one-click yield, sFLR staking
    └─ No third-party trust needed
    └─ Proves: Vault works, constraints work, settlement works

  Phase B: Whitelisted Executors (Controlled Trust)
    └─ Vetted traders can access LP capital
    └─ Requires: Reputation score + staked collateral
    └─ Use cases: Professional trading strategies
    └─ Proves: Third-party execution works safely

  Phase C: Open Marketplace (Full Vision)
    └─ Permissionless execution rights
    └─ LPs choose risk parameters
    └─ Market determines fees
    └─ Full alpha marketplace
  ```

  ### Milestones

  | # | Milestone | Status | Description |
  |---|-----------|--------|-------------|
  | 1 | Oracle Foundation | ✅ Complete | FTSO + FDC integration |
  | 2 | DEX Adapters | ✅ Complete | SparkDEX, Enosys, BlazeSwap |
  | 3 | Yield Adapters | In Progress | Kinetic, Sceptre |
  | 4 | Perp Adapters | Planned | SparkDEX Eternal |
  | 5 | FAssets Support | Planned | FXRP, FBTC, FDOGE integration |
  | 6 | Vault & Rights System | Planned | Core innovation |
  | 7 | Settlement Engine | Planned | PnL + fee distribution |
  | 8 | Security Audit | Planned | Slither, Mythril, manual review |
  | 9 | Mainnet Launch | Planned | Full deployment |

  ---

  ## Addressing Common Concerns

  ### "Isn't this just lending with extra steps?"

  No. The fundamental difference:

  | Lending | PRAXIS |
  |---------|--------|
  | Borrower takes custody | Capital never leaves vault |
  | Can default | Default impossible |
  | Requires collateral | Based on reputation + stake |
  | Fixed interest | Profit sharing |

  Lending gives you money and hopes you return it. PRAXIS gives you permission to use money that stays locked.

  ### "Why would LPs risk their capital?"

  1. **Downside is capped** — Max drawdown enforced by smart contracts
  2. **Executor stake covers losses** — At every tier, stake > max drawdown
  3. **Insurance fund backup** — 2% of profits create safety net
  4. **Diversification** — Capital spread across many executors
  5. **Upside exposure** — 20% of profits is significant alpha sharing

  ### "What if executors collude?"

  1. **Reputation system** — Takes months to reach high tiers
  2. **Exposure limits** — Can't all bet the same direction
  3. **Circuit breaker** — Pauses at 5% daily loss
  4. **Stake economics** — Collusion costs more than it gains

  ### "Why build on Flare specifically?"

  1. **FTSO** — Trustless prices for settlement (no oracle trust)
  2. **FDC** — Cross-chain triggers (no bridge trust)
  3. **FAssets** — Native BTC/XRP/DOGE exposure (no wrapped token trust)
  4. **Ecosystem gap** — No alpha-sharing primitive exists on Flare

  ### "How does this not compete with existing protocols?"

  PRAXIS **uses** existing protocols, it doesn't compete:

  - We route swaps through SparkDEX/Enosys/BlazeSwap
  - We stake through Sceptre
  - We lend through Kinetic
  - We trade perps through Eternal

  Every dollar of TVL in PRAXIS generates volume for the ecosystem.

  ---

  ## Summary

  ### What PRAXIS Is

  - An **Execution Rights Protocol** — permission to use capital, not custody of it
  - An **Alpha Sharing Platform** — LPs earn from skilled trading, not just fixed yields
  - A **Liquidity Router** — routes all trades through SparkDEX, Enosys, BlazeSwap, Kinetic, Sceptre, and Eternal
  - A **Flare Infrastructure Showcase** — built on FTSO, FDC, and FAssets
  - An **Ecosystem Multiplier** — drives volume to all Flare DeFi protocols

  ### What PRAXIS Isn't

  - A lending protocol (no custody transfer)
  - A yield aggregator (strategies are custom per executor)
  - A competitor to existing protocols (we route to them)
  - A trust-based system (smart contracts enforce everything)
  - A liquidity bootstrapper (we use existing liquidity)

  ### The One-Liner

  **PRAXIS lets skilled traders use other people's capital through smart contract enforced permissions, routing all execution through existing Flare DeFi protocols, creating a marketplace where LPs share in trading profits without doing the trading themselves.**

  ### The Ecosystem Value Proposition

  ```
  ┌─────────────────────────────────────────────────────────────────┐
  │                    PROJECTED VOLUME IMPACT                       │
  ├─────────────────────────────────────────────────────────────────┤
  │                                                                  │
  │  If PRAXIS reaches $1M TVL with active executors:               │
  │                                                                  │
  │    Assuming 70% utilization, 10x volume multiplier:             │
  │                                                                  │
  │    Monthly volume routed to Flare DeFi:                         │
  │      • SparkDEX spot:     ~$2-3M                                │
  │      • SparkDEX Eternal:  ~$3-5M (leveraged)                    │
  │      • Enosys/BlazeSwap:  ~$500k-1M                             │
  │      • Kinetic:           ~$500k TVL utilization                │
  │      • Sceptre:           ~$300k staking flow                   │
  │                                                                  │
  │    That's $7-10M monthly volume from $1M TVL.                   │
  │    Every PRAXIS dollar works 10x harder for Flare.              │
  │                                                                  │
  └─────────────────────────────────────────────────────────────────┘
  ```

  ### Key Takeaways for the Flare Ecosystem

  1. **No Overlap** — We don't compete with SparkDEX, Kinetic, Sceptre, or anyone else
  2. **Pure Volume Driver** — Every executor action generates fees for existing protocols
  3. **No Liquidity Bootstrap Needed** — We tap into existing DEX/lending liquidity
  4. **Showcases Flare Infrastructure** — FTSO for settlement, FDC for cross-chain, FAssets for trading
  5. **Novel Primitive** — Execution rights don't exist anywhere else; this is new DeFi infrastructure
  6. **Realistic Path** — Phased rollout from self-execution to open marketplace


  ---

  *Built for Flare. Powered by FTSO. Routes to SparkDEX, Kinetic, Sceptre, Eternal.*
