# PRAXIS - Execution Rights Protocol

**Trade with capital you don't own. Never default. Never get liquidated.**

Built for Flare. Powered by FTSO. Routes to SparkDEX, Kinetic, Sceptre, Eternal.

---

## Overview

PRAXIS is an **Execution Rights Protocol** that enables collateral-free access to DeFi capital. Instead of lending assets (where borrowers take custody and can default), PRAXIS **leases execution power** over capital.

```
Traditional DeFi Lending:
  LP deposits → Borrower takes custody → Risk of default → Requires overcollateralization

PRAXIS Execution Rights:
  LP deposits → Capital stays in vault → Executor gets time-bound rights → Smart contracts enforce limits
```

**Key Principle:** You use money. You never own it.

---

## Why Flare?

PRAXIS is built specifically for Flare because of its unique infrastructure:

| Feature | Purpose in PRAXIS |
|---------|-------------------|
| **FTSO** | Trustless price feeds for PnL calculation at settlement |
| **FDC** | Cross-chain event triggers for execution (BTC payment → auto-stake) |
| **FAssets** | FXRP/FBTC/FDOGE as tradeable assets without bridges |

---

## How It Works

### For LPs (Capital Providers)

1. **Deposit** funds into PRAXIS Vault → Receive vault shares
2. **Capital becomes available** for executors (but NEVER leaves the vault)
3. **Earn** from executor activity: 2% base fee + 20% of profits
4. **Withdraw** anytime (subject to utilization, 30% always in reserve)

### For Executors (Traders/Bots)

1. **Request** Execution Rights → Specify capital, duration, strategy type
2. **Receive ERT** (Execution Rights Token) → NFT encoding permissions & limits
3. **Execute** your strategy within approved limits via smart contracts
4. **Settlement** at expiry → PnL calculated using FTSO, profits split 80/20

---

## Architecture

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
          │  SparkDEX | Kinetic | Sceptre | Eternal
          └─────────────────────────────┘
                        │
                        ▼
          ┌─────────────────────────────┐
          │       Oracle Layer          │
          │  FlareOracle (FTSO prices)  │
          │  FDCVerifier (cross-chain)  │
          └─────────────────────────────┘
```

---

## Safety Architecture

PRAXIS implements multi-layer protection:

| Layer | Protection | Mechanism |
|-------|------------|-----------|
| 1 | **Reputation Tiers** | New users start small ($100), must earn access to larger capital |
| 2 | **Stake Requirements** | Stake % always > Max Drawdown % (LP never loses) |
| 3 | **Utilization Cap** | Max 70% allocated, 30% always in reserve |
| 4 | **Circuit Breaker** | 5% daily loss triggers pause + force settle |
| 5 | **Exposure Limits** | Max 30% of vault in any single asset |
| 6 | **Insurance Fund** | 2% of profits collected to cover losses |

---

## Deployed Contracts

### Coston2 Testnet

| Contract | Address |
|----------|---------|
| **FlareOracle** | `0x0979854b028210Cf492a3bCB990B6a1D45d89eCc` |
| **FDCVerifier** | `0xe667bEf52f1EAD93Cb0375639a4eA36001d4edf3` |
| **SwapRouter** | `0x65e72849DD87978023Fef664a39b1FE0576c5C9D` |
| **ReputationManager** | `0xE1bad1a7971BD540A243806002f978863B528a73` |
| **ExecutionVault** | `0xaDd37200a615516a703Af67ED77AB6d9AB7f6a25` |
| **UtilizationController** | `0xdf08ab2Fed1046d383f2d8A7a6cE067b6b37EBC9` |
| **CircuitBreaker** | `0x556a3C56014F3469cA2603015d360e8Db09EBF7e` |
| **ExposureManager** | `0x217b9226cf843497BcC09ee442fC77600026dbFe` |
| **InsuranceFund** | `0xDe0724bE704F3c889596D03D52aFc2688B5FF645` |
| **PositionManager** | `0xD762Cc16f44eCC0Dbc11D49Df8431cbe04527648` |
| **ExecutionRightsNFT** | `0x67a1bD7abFe97B0B40Da7dd74712e106F80e4017` |
| **ExecutionController** | `0xab40B51AF279Fd4Fa6031a7C9548Cf8463da3017` |
| **SettlementEngine** | `0x348C5E5e26fba7086d863B708142e7f48c0cBe84` |
| **PraxisGateway** | `0xbF96360cEB79235AB26b83c60c2588a109f4F7b0` |

#### Mock Tokens (Coston2)

| Token | Address |
|-------|---------|
| MockUSDC | `0x9401FCe40Cb84b051215d96e85BecD733043a33D` |
| MockWFLR | `0x0a22b6e2f0ac6cDA83C04B1Ba33aAc8e9Df6aed7` |
| MockFXRP | `0x2859b97217cF2599D5F1e1c56735D283ec2144e3` |
| MockFBTC | `0x2E124DEaeD3Ba3b063356F9b45617d862e4b9dB5` |
| MockFDOGE | `0xeAD29cBfAb93ed51808D65954Dd1b3cDDaDA1348` |
| MockSFLR | `0x8C6057145c1C523e08D3D1dCbaC77925Ee25f46D` |

---

## Project Structure

```
praxis/
├── web3/                    # Smart contracts (Hardhat 3)
│   ├── contracts/
│   │   ├── core/            # Core protocol contracts
│   │   │   ├── ExecutionVault.sol
│   │   │   ├── ExecutionRightsNFT.sol
│   │   │   ├── ExecutionController.sol
│   │   │   ├── SettlementEngine.sol
│   │   │   ├── PraxisGateway.sol
│   │   │   ├── PositionManager.sol
│   │   │   ├── ReputationManager.sol
│   │   │   ├── UtilizationController.sol
│   │   │   ├── CircuitBreaker.sol
│   │   │   ├── ExposureManager.sol
│   │   │   ├── InsuranceFund.sol
│   │   │   ├── SwapRouter.sol
│   │   │   ├── YieldRouter.sol
│   │   │   └── PerpetualRouter.sol
│   │   ├── oracles/         # Oracle integrations
│   │   │   ├── FlareOracle.sol
│   │   │   └── FDCVerifier.sol
│   │   ├── adapters/        # Protocol adapters
│   │   ├── interfaces/      # Contract interfaces
│   │   ├── lib/             # Shared libraries
│   │   └── mocks/           # Test mocks
│   ├── scripts/             # Deployment scripts
│   └── test/                # Test suites
├── client/                  # Frontend (Next.js)
│   ├── app/                 # App router pages
│   ├── components/          # React components
│   └── lib/                 # Utilities
└── docs/                    # Documentation
    ├── implementation_plan.md
    └── whitepaper.md
```

---

## Development Status

### Phase Status

| Phase | Name | Status |
|-------|------|--------|
| 1 | Oracle Foundation (FTSO & FDC) | ✅ Complete |
| 2 | DEX Adapters (SparkDEX, Enosys, BlazeSwap) | ✅ Complete |
| 3 | Yield Adapters (Kinetic, Sceptre) | ✅ Complete |
| 4 | Perpetual Adapters (SparkDEX Eternal) | ✅ Complete |
| 5 | FAssets Support (FXRP, FBTC, FDOGE) | ✅ Complete |
| 6 | Vault & Rights System | ✅ Complete |
| 7 | Settlement Engine & Gateway | 🟡 95% Complete |
| 8 | Security & Audit | ⬜ Not Started |
| 9 | Mainnet Deployment | ⬜ Not Started |

### Test Results

| Test Suite | Tests | Status |
|------------|-------|--------|
| Unit Tests (Phases 1-6) | 1216 | ✅ Passing |
| Phase 6 Unit Tests | 1061 | ✅ Passing |
| Phase 1-6 Integration (Flare Mainnet Fork) | 29 | ✅ Passing |

---

## Getting Started

### Prerequisites

- Node.js >= 18
- npm or yarn

### Smart Contracts

```bash
cd web3
npm install
npx hardhat compile
npx hardhat test
```

### Frontend

```bash
cd client
npm install
npm run dev
```

### Deploy to Coston2

```bash
cd web3
npx hardhat keystore set COSTON2_PRIVATE_KEY
npx hardhat run scripts/deploy/deployAll.ts --network coston2
```

---

## Ecosystem Integration

PRAXIS doesn't compete with existing Flare DeFi protocols — it **drives volume to them**:

| Protocol | Integration |
|----------|-------------|
| **SparkDEX** | Swap routing for best rates |
| **Enosys** | Alternative DEX routing |
| **BlazeSwap** | V2-style swap routing |
| **Kinetic** | Lending/borrowing strategies |
| **Sceptre** | sFLR staking strategies |
| **SparkDEX Eternal** | Perpetual trading (up to 100x) |
| **FAssets** | FXRP/FBTC/FDOGE trading |

Every PRAXIS executor action generates fees for existing protocols.

---

## Key Differentiators

| Traditional DeFi | PRAXIS |
|------------------|--------|
| Borrower takes custody | Capital never leaves vault |
| Can default | Default impossible |
| Requires collateral | Based on reputation + stake |
| Fixed interest | Profit sharing |
| LP earns fixed yield | LP gets alpha exposure |

---

## Documentation

- [Whitepaper](docs/whitepaper.md) - Full protocol design
- [Implementation Plan](docs/implementation_plan.md) - Technical roadmap

---

## License

MIT

---

## Links

- [Flare Network](https://flare.network/)
- [FTSO Documentation](https://docs.flare.network/tech/ftso/)
- [FDC Documentation](https://docs.flare.network/tech/fdc/)
