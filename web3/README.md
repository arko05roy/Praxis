# PRAXIS Smart Contracts

Solidity smart contracts for the PRAXIS Execution Rights Protocol.

---

## Tech Stack

- **Hardhat 3** with Solidity 0.8.28 (EVM: cancun)
- **TypeScript** for scripts and tests
- **ethers.js** for Ethereum interactions
- **Flare Periphery Contracts** for FTSO and FDC integration

---

## Contracts Overview

### Core Contracts

| Contract | Purpose |
|----------|---------|
| `ExecutionVault.sol` | ERC-4626 vault holding LP capital |
| `ExecutionRightsNFT.sol` | ERC-721 encoding executor permissions |
| `ExecutionController.sol` | Validates actions against ERT constraints |
| `SettlementEngine.sol` | PnL calculation, position unwinding, fee distribution |
| `PraxisGateway.sol` | Unified entry point for all LP/executor interactions |
| `PositionManager.sol` | Tracks open positions per ERT |
| `ReputationManager.sol` | Executor tiers and stake requirements |

### Safety Contracts

| Contract | Purpose |
|----------|---------|
| `UtilizationController.sol` | Enforces 70% max allocation cap |
| `CircuitBreaker.sol` | Triggers at 5% daily loss - pauses system |
| `ExposureManager.sol` | Limits 30% max exposure per asset |
| `InsuranceFund.sol` | Collects 2% of profits for loss coverage |

### Routing Contracts

| Contract | Purpose |
|----------|---------|
| `SwapRouter.sol` | DEX aggregator for best-rate swaps |
| `YieldRouter.sol` | Routes to best yield opportunities |
| `PerpetualRouter.sol` | Routes perpetual trading to adapters |

### Oracle Contracts

| Contract | Purpose |
|----------|---------|
| `FlareOracle.sol` | FTSO v2 price feed integration |
| `FDCVerifier.sol` | Cross-chain proof verification |

---

## Deployed Addresses (Coston2 Testnet)

### Core Protocol

| Contract | Address |
|----------|---------|
| FlareOracle | `0x0979854b028210Cf492a3bCB990B6a1D45d89eCc` |
| FDCVerifier | `0xe667bEf52f1EAD93Cb0375639a4eA36001d4edf3` |
| SwapRouter | `0x65e72849DD87978023Fef664a39b1FE0576c5C9D` |
| ReputationManager | `0xE1bad1a7971BD540A243806002f978863B528a73` |
| ExecutionVault | `0xaDd37200a615516a703Af67ED77AB6d9AB7f6a25` |
| UtilizationController | `0xdf08ab2Fed1046d383f2d8A7a6cE067b6b37EBC9` |
| CircuitBreaker | `0x556a3C56014F3469cA2603015d360e8Db09EBF7e` |
| ExposureManager | `0x217b9226cf843497BcC09ee442fC77600026dbFe` |
| InsuranceFund | `0xDe0724bE704F3c889596D03D52aFc2688B5FF645` |
| PositionManager | `0xD762Cc16f44eCC0Dbc11D49Df8431cbe04527648` |
| ExecutionRightsNFT | `0x67a1bD7abFe97B0B40Da7dd74712e106F80e4017` |
| ExecutionController | `0xab40B51AF279Fd4Fa6031a7C9548Cf8463da3017` |
| SettlementEngine | `0x348C5E5e26fba7086d863B708142e7f48c0cBe84` |
| PraxisGateway | `0xbF96360cEB79235AB26b83c60c2588a109f4F7b0` |

### Mock Tokens

| Token | Address |
|-------|---------|
| MockUSDC | `0x9401FCe40Cb84b051215d96e85BecD733043a33D` |
| MockWFLR | `0x0a22b6e2f0ac6cDA83C04B1Ba33aAc8e9Df6aed7` |
| MockFXRP | `0x2859b97217cF2599D5F1e1c56735D283ec2144e3` |
| MockFBTC | `0x2E124DEaeD3Ba3b063356F9b45617d862e4b9dB5` |
| MockFDOGE | `0xeAD29cBfAb93ed51808D65954Dd1b3cDDaDA1348` |
| MockSFLR | `0x8C6057145c1C523e08D3D1dCbaC77925Ee25f46D` |

---

## Usage

### Install Dependencies

```bash
npm install
```

### Compile Contracts

```bash
npx hardhat compile
```

### Run Tests

```bash
# Run all tests
npx hardhat test

# Run specific test file
npx hardhat test test/unit/core/ExecutionVault.test.ts

# Run integration tests (requires mainnet fork)
npx hardhat test test/integration/
```

### Deploy

```bash
# Set private key
npx hardhat keystore set COSTON2_PRIVATE_KEY

# Deploy to Coston2
npx hardhat run scripts/deploy/deployAll.ts --network coston2

# Deploy specific phase
npx hardhat run scripts/deploy/01_Foundation.ts --network coston2
```

---

## Directory Structure

```
contracts/
├── core/                    # Core protocol logic
│   ├── ExecutionVault.sol
│   ├── ExecutionRightsNFT.sol
│   ├── ExecutionController.sol
│   ├── SettlementEngine.sol
│   ├── PraxisGateway.sol
│   ├── PositionManager.sol
│   ├── ReputationManager.sol
│   ├── UtilizationController.sol
│   ├── CircuitBreaker.sol
│   ├── ExposureManager.sol
│   ├── InsuranceFund.sol
│   ├── SwapRouter.sol
│   ├── YieldRouter.sol
│   └── PerpetualRouter.sol
├── oracles/                 # Flare oracle integrations
│   ├── FlareOracle.sol      # FTSO v2 wrapper
│   └── FDCVerifier.sol      # FDC proof verifier
├── adapters/                # Protocol adapters
│   ├── BaseAdapter.sol
│   └── IAdapter.sol
├── interfaces/              # Contract interfaces
│   ├── IExecutionVault.sol
│   ├── IExecutionRightsNFT.sol
│   ├── ISettlementEngine.sol
│   ├── IPraxisGateway.sol
│   ├── IPositionManager.sol
│   ├── IReputationManager.sol
│   ├── IYieldAdapter.sol
│   ├── ILendingAdapter.sol
│   ├── IStakingAdapter.sol
│   ├── IFAssetAdapter.sol
│   ├── IPerpetualAdapter.sol
│   └── external/            # External protocol interfaces
├── lib/                     # Shared libraries
│   ├── PraxisStructs.sol
│   ├── PraxisErrors.sol
│   └── PraxisEvents.sol
└── mocks/                   # Test mocks
    ├── MockERC20.sol
    ├── MockFlareOracle.sol
    ├── MockAdapter.sol
    └── ...
```

---

## Network Configuration

| Network | Chain ID | RPC |
|---------|----------|-----|
| Flare Mainnet | 14 | https://flare-api.flare.network/ext/C/rpc |
| Coston2 Testnet | 114 | https://coston2-api.flare.network/ext/C/rpc |

---

## Testing

### Unit Tests
Located in `test/unit/` - Test individual contract functions in isolation using mocks.

### Integration Tests
Located in `test/integration/` - Test contract interactions against Flare mainnet fork.

### Test Coverage
```bash
npx hardhat coverage
```

---

## Security Considerations

- All vault operations are protected with ReentrancyGuard
- FTSO prices cannot be manipulated by executors
- Constraint bypass testing ensures all validations work correctly
- Capital never leaves vault to executor wallets

---

## Key Flare Integrations

### FTSO v2
- 63+ price feeds available
- Price staleness check (MAX_PRICE_AGE = 300s)
- Dynamic discovery via ContractRegistry

### FDC
- EVMTransaction, Payment, AddressValidity attestations
- Cross-chain triggered execution support
- Protocol ID: 200
