# 12. Glossary

TradFi terms translated. Web3 jargon decoded. No judgment.

---

## A

### Adapter
A smart contract that interfaces between PRAXIS and external protocols (DEXs, lending platforms). Adapters are whitelisted and audited. They execute trades on behalf of the vault without exposing raw capital.

### Alpha
Trading edge. The skill that lets you beat the market. What executors bring to the table.

### APY (Annual Percentage Yield)
Your return expressed as a yearly rate. If you make 1% per month, your APY is roughly 12.7% (compounded).

---

## B

### Base Fee
The fixed 2% annual fee LPs earn regardless of executor performance. Think of it as minimum rent for using your capital.

### bps (Basis Points)
1 bps = 0.01%. So 500 bps = 5%. Finance people love this because it sounds more precise than "half a percent."

---

## C

### Circuit Breaker
Emergency stop mechanism. Triggers when daily vault loss exceeds 5%. Pauses all new trading until governance reviews.

### Collateral
Assets pledged as security. In traditional lending, borrowers deposit collateral. In PRAXIS, executors stake collateral that covers their potential losses.

### Custody
Who controls the assets. Traditional lending = borrower custody. PRAXIS = vault custody (always).

---

## D

### Drawdown
Peak-to-trough decline. If your $100 portfolio drops to $85, that's a 15% drawdown. Max drawdown in PRAXIS is capped to protect LPs.

### DEX (Decentralized Exchange)
Automated market maker for trading tokens. SparkDEX, BlazeSwap, Uniswap are all DEXs.

---

## E

### ERC-20
Token standard on Ethereum-compatible chains. USDC, WFLR, and vault shares are all ERC-20 tokens.

### ERC-721
NFT standard. ERTs are ERC-721 tokens (but non-transferable).

### ERC-4626
Tokenized vault standard. The ExecutionVault follows this, making it composable with other DeFi protocols.

### ERT (Execution Rights Token)
The core primitive. An NFT that encodes permission to execute strategies with vault capital, without transferring custody. Think corporate credit card, encoded on-chain.

### Executor
Someone who trades using ERT permissions. They have alpha but need capital. Also called "trader" in casual conversation.

### Exposure
How much capital is allocated to a particular asset or position. PRAXIS caps exposure at 30% per asset.

---

## F

### FAsset
Flare's trustless representation of external chain assets. FBTC, FXRP, FDOGE are FAssets backed by actual BTC, XRP, DOGE via the FDC.

### FDC (Flare Data Connector)
Flare's system for fetching and verifying data from other blockchains. Enables trustless cross-chain data without bridges.

### FTSO (Flare Time Series Oracle)
Decentralized price oracle native to Flare. 100+ data providers submit prices, system uses median. No Chainlink dependency.

### Front-running
Seeing someone's pending transaction and getting yours executed first to profit. MEV bots do this constantly. ZK mode helps prevent it.

---

## G

### Gas
Transaction fees on blockchain. Paid in native token (FLR on Flare). ZK transactions use more gas than public ones.

### Governance
Decision-making process for protocol changes. Controls parameters, upgrades, emergency actions.

### Groth16
A type of ZK-SNARK proving system. Fast verification, small proofs. Used in PRAXIS ZK circuits.

---

## H

### Hedge Fund
Traditional finance structure where skilled managers trade with investor capital. PRAXIS is basically this, but trustless.

---

## I

### Insurance Fund
Pool of capital that covers losses when executor stakes aren't sufficient. Funded by 2% of all trading profits.

---

## L

### Leverage
Using borrowed capital to amplify positions. 3x leverage means a $10k margin controls $30k position. Amplifies gains AND losses.

### Liquidation
Forced position closure when losses approach margin. Prevents losses from exceeding collateral. PRAXIS has auto-liquidation at max drawdown.

### Liquidity
How easily assets can be converted to cash. PRAXIS maintains 30% liquidity buffer for LP withdrawals.

### LP (Liquidity Provider)
Someone who deposits capital into the vault. They earn base fees + profit share. Also called "capital provider."

---

## M

### Margin
Collateral posted for a leveraged position. With 5x leverage, $10k margin controls $50k position.

### Max Drawdown
Maximum allowed loss before position is force-closed. Set in ERT parameters. Protects vault from catastrophic executor losses.

### MEV (Maximal Extractable Value)
Profit extracted by reordering, inserting, or censoring transactions. Sandwich attacks, front-running, etc. ZK mode helps protect against this.

---

## N

### NFT (Non-Fungible Token)
Unique token, unlike fungible tokens (USDC) where each unit is identical. ERTs are NFTs because each has unique parameters.

### Noir
ZK circuit language by Aztec. Used to write PRAXIS privacy circuits. Compiles to Groth16 proofs.

---

## O

### Oracle
System that provides external data to smart contracts. PRAXIS uses Flare's FTSO for prices.

### Overcollateralization
Posting more collateral than you borrow. Aave requires ~150%. PRAXIS doesn't need this because executors never have custody.

---

## P

### P&L (Profit and Loss)
Net result of trading. Positive = profit. Negative = loss. PRAXIS splits P&L 80/20 between executor and LP.

### Position
An active trade. Long WFLR, short FXRP, etc. Tracked by PositionManager.

### Profit Share
The 20% of executor profits that goes to LPs. This is on top of the base fee.

### Proof
Cryptographic evidence that a computation was done correctly. ZK proofs prove trade validity without revealing trade details.

### Prop Trading
Proprietary trading. Firms that trade with their own/investor capital. What PRAXIS enables, but trustless.

---

## R

### Revert
Transaction failure on blockchain. When validation fails (exceeds limits, invalid ERT), transaction reverts and nothing happens.

### Reputation
Track record score that determines executor tier and access limits. Built over time through profitable trading.

---

## S

### Settlement
Process of calculating and distributing P&L when a position closes. SettlementEngine handles this.

### Sharpe Ratio
Risk-adjusted return metric. Return divided by volatility. Higher = better. Tier 3 requires Sharpe > 1.5.

### Slashing
Penalty for bad behavior. When executor loses money, their stake gets slashed to cover LP losses.

### Slippage
Difference between expected and actual trade price. Usually due to market movement during execution.

### Soulbound
Non-transferable token. ERTs are soulbound to prevent reputation gaming (can't sell a high-tier ERT).

### Stake
Capital locked as collateral. Executors stake to activate ERTs. Stake is slashed on losses, returned on profits.

### Strategy
Trading approach. Momentum, mean reversion, arbitrage, etc. What executors execute with vault capital.

---

## T

### Tier
Reputation level determining access limits. Tier 0 ($100 max) to Tier 4 ($1M+ max). Progress through profitable trading.

### TVL (Total Value Locked)
Total capital deposited in a protocol. Vault TVL = how much LP capital is available.

### TWAP (Time-Weighted Average Price)
Average price over a time period. Used to prevent manipulation.

---

## U

### Utilization
Percentage of vault capital currently deployed in active trades. Capped at 70% to ensure liquidity.

---

## V

### Vault
Smart contract holding LP deposits. In PRAXIS, the ExecutionVault follows ERC-4626 standard.

### Vault Shares
Tokens representing LP ownership of the vault. Value increases as vault profits grow.

---

## W

### Wallet
Software that holds your private keys. MetaMask, Rainbow, etc. Connects to PRAXIS dApp.

### WFLR (Wrapped FLR)
ERC-20 version of native FLR token. Required for DeFi interactions since native tokens aren't ERC-20.

### Win Rate
Percentage of trades that are profitable. Tier 2 requires 60% win rate.

---

## Z

### ZK (Zero Knowledge)
Cryptographic technique to prove something without revealing it. "I prove I can do this trade legally without showing you the trade."

### ZK-SNARK
"Zero-Knowledge Succinct Non-Interactive Argument of Knowledge." Small proofs that verify quickly. What PRAXIS uses for privacy.

---

## Common Phrases

| Phrase | Meaning |
|--------|---------|
| "Ape in" | Invest without research |
| "Rekt" | Suffered major losses |
| "DYOR" | Do Your Own Research |
| "NFA" | Not Financial Advice |
| "WAGMI" | We're All Gonna Make It |
| "NGMI" | Not Gonna Make It |
| "Diamond hands" | Holding through volatility |
| "Paper hands" | Selling at first sign of trouble |
| "Rug pull" | Project steals user funds |
| "Yield farming" | Providing liquidity for rewards |

---

## Still Confused?

Join the Discord. We're nice. Mostly.

---

**That's it. You made it to the end.**

Now go deploy on testnet and try to break something. We'll be watching.

```
PraxisGateway: 0x2417159FB72e6F21e033E7C0491D37eF10BCDb88
```

Good luck.
