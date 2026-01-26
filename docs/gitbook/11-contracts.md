# 11. Contracts

All the addresses. All the ABIs. Go break things.

---

## Testnet (Coston2)

Deployed on Coston2 testnet (Chain ID: 114). Mainnet coming after audit.

### Core Contracts

| Contract | Address | Description |
|----------|---------|-------------|
| PraxisGateway | `0x2417159FB72e6F21e033E7C0491D37eF10BCDb88` | Main entry point |
| ExecutionVault | `0x7a7D2633097cF80aDe393e3A8295D25A28E40254` | LP capital vault (ERC-4626) |
| ExecutionRightsNFT | `0xc00DEa0f4CEdDB35f692B84aCAB7302008fA8532` | ERT NFT contract |
| PositionManager | `0x64076786B67aec894E18019Bc4e17f662dcAa26c` | Position tracking |
| ExecutionController | `0xEf5469F99Af9a36d3BbD5F44b7d424D9D5582367` | Trade orchestration |
| SettlementEngine | `0xBB21fD102D6Fe9C1b87d664eF1CA7Cf10e99654A` | P&L settlement |

### Safety Contracts

| Contract | Address | Description |
|----------|---------|-------------|
| ReputationManager | `0xa1A4c125c967529b7Df11c9cdcDcbE397cf37274` | Reputation/tier tracking |
| CircuitBreaker | `0x53494eEa6403b8E6b44DB561CDFFD811D36f7349` | Emergency pause (5% daily) |
| UtilizationController | `0xd484756d3823fb273bE6fd37D50a8a05e30b8B3f` | 70% cap enforcement |
| ExposureManager | `0x420B3c932593613A96C317B761106D361cAD8146` | 30% per-asset limit |
| InsuranceFund | `0xe059f1E6ec8aB3eB7838d3331a7C7A18d00AD78B` | Loss coverage pool |

### Oracle Contracts

| Contract | Address | Description |
|----------|---------|-------------|
| FlareOracle | `0x0979854b028210Cf492a3bCB990B6a1D45d89eCc` | FTSO price wrapper |
| FDCVerifier | `0xe667bEf52f1EAD93Cb0375639a4eA36001d4edf3` | Cross-chain data verification |

### Routers

| Contract | Address | Description |
|----------|---------|-------------|
| SwapRouter | `0xFf6e30C981149b2c16664C7f89184cB0a3Ad52F2` | DEX routing |

### ZK Contracts

| Contract | Address | Description |
|----------|---------|-------------|
| Groth16Verifier | `0x66636dF917bb64cA387DcB3CbB5e707E06372bb3` | Core ZK verifier |
| PrivateSwapVerifier | `0x714178e4C5714c438FF07560f01Af22EdC0DFfF2` | Swap proof verification |
| PrivatePerpVerifier | `0xe4d9A773b3ef67371084173baEE2e79D2fA41032` | Perp proof verification |
| PrivateYieldVerifier | `0xcF87367DB8e663C9F405589a0371025B48f01503` | Yield proof verification |
| PrivateSettlementVerifier | `0x5aaa124258D252542c1A2F919b514643e298b5a6` | Settlement proof verification |
| ZKExecutionController | `0xb52124b3a7190f3d34DF666f263d3996336d7E2A` | ZK execution orchestrator |
| ZKExecutor | `0x975448Eda4068E67A6EF65CEfF545aa8f1c389Bb` | ZK trade executor |

### Mock Protocols (Testnet Only)

| Contract | Address | Description |
|----------|---------|-------------|
| MockSimpleDEX | `0xAF248bA04Cb99Df81D73618B62e59eD76D687b56` | Test DEX |
| MockSceptre | `0x0D9828a7BfD604D10E174C6C7F485f4122b4aD30` | Test liquid staking |
| MockKinetic | `0x3B7c43114154AD210399ADBf5a9B25Dd41E31b66` | Test lending |

### Test Tokens

| Token | Address | Decimals | Description |
|-------|---------|----------|-------------|
| MockUSDC | `0x9A1b3BC7500C31D95362d54Db4878A2ef1D35559` | 6 | Test stablecoin |
| MockWFLR | `0x5CEe84E380CDA3bdc27f908eE9b61c7462f0b435` | 18 | Test wrapped FLR |
| MockFXRP | `0x35Ce520d9b837A5c1541b11c6EF9dD80e66280bB` | 6 | Test FAsset XRP |
| MockFBTC | `0x0c17a2A0f3dfEec4c7eFf363e53808Bea3A6eFe0` | 8 | Test FAsset BTC |
| MockFDOGE | `0xBb22F84FFA472c84e0FC7c58994Dcb203C0b7CcB` | 8 | Test FAsset DOGE |
| MockSFLR | `0x0D9828a7BfD604D10E174C6C7F485f4122b4aD30` | 18 | Test staked FLR |

---

## Quick Reference

```
# Main Entry Point
PraxisGateway: 0x2417159FB72e6F21e033E7C0491D37eF10BCDb88

# For LPs
ExecutionVault: 0x7a7D2633097cF80aDe393e3A8295D25A28E40254

# For Executors
ExecutionRightsNFT: 0xc00DEa0f4CEdDB35f692B84aCAB7302008fA8532

# Test Token
MockUSDC: 0x9A1b3BC7500C31D95362d54Db4878A2ef1D35559
```

---

## Key Functions

### For LPs

```solidity
// Deposit USDC, get vault shares
function deposit(uint256 assets, address receiver) external returns (uint256 shares);

// Withdraw USDC by burning shares
function withdraw(uint256 assets, address receiver, address owner) external returns (uint256 shares);

// Check current share price
function convertToAssets(uint256 shares) external view returns (uint256 assets);
```

### For Executors

```solidity
// Request an ERT
function requestERT(
    uint256 capitalLimit,
    uint256 maxLeverage,
    address[] calldata allowedAdapters,
    address[] calldata allowedAssets
) external returns (uint256 tokenId);

// Stake to activate ERT
function stake(uint256 amount) external;

// Open a position
function openPosition(
    address adapter,
    address asset,
    uint256 size,
    uint256 leverage,
    uint8 direction  // 0 = LONG, 1 = SHORT
) external returns (uint256 positionId);

// Close a position
function closePosition(uint256 positionId) external returns (int256 pnl);

// Unstake after closing all positions
function unstake(uint256 tokenId) external;
```

### For ZK Execution

```solidity
// Execute privately with ZK proof
function executePrivateSwap(
    bytes calldata proof,
    uint256[] calldata publicInputs,
    bytes calldata executionData
) external;

// Settle privately with ZK proof
function executePrivateSettlement(
    bytes calldata proof,
    uint256[] calldata publicInputs
) external;
```

---

## ABIs

Full ABIs available at:

```
/web3/artifacts/contracts/core/PraxisGateway.sol/PraxisGateway.json
/web3/artifacts/contracts/core/ExecutionVault.sol/ExecutionVault.json
/web3/artifacts/contracts/core/PositionManager.sol/PositionManager.json
/web3/artifacts/contracts/core/ExecutionRightsNFT.sol/ExecutionRightsNFT.json
```

Or via npm:

```bash
npm install @praxis/contracts
```

```typescript
import { PraxisGateway__factory } from '@praxis/contracts';

const gateway = PraxisGateway__factory.connect(
  "0x2417159FB72e6F21e033E7C0491D37eF10BCDb88",
  signer
);
```

---

## Interacting via CLI

### Using Cast (Foundry)

```bash
# Check vault total assets
cast call 0x7a7D2633097cF80aDe393e3A8295D25A28E40254 "totalAssets()" --rpc-url https://coston2-api.flare.network/ext/C/rpc

# Get executor tier
cast call 0xa1A4c125c967529b7Df11c9cdcDcbE397cf37274 "getTier(address)" $EXECUTOR_ADDRESS --rpc-url https://coston2-api.flare.network/ext/C/rpc

# Check utilization
cast call 0xd484756d3823fb273bE6fd37D50a8a05e30b8B3f "getCurrentUtilization()" --rpc-url https://coston2-api.flare.network/ext/C/rpc
```

### Using Hardhat Console

```javascript
const gateway = await ethers.getContractAt(
  "PraxisGateway",
  "0x2417159FB72e6F21e033E7C0491D37eF10BCDb88"
);

// Deposit as LP
const usdc = await ethers.getContractAt("IERC20", "0x9A1b3BC7500C31D95362d54Db4878A2ef1D35559");
await usdc.approve(gateway.address, amount);
await gateway.deposit(amount);

// Request ERT as executor
const tx = await gateway.requestERT(
    ethers.utils.parseUnits("100", 6), // $100 capital limit
    1, // 1x leverage
    ["0xAF248bA04Cb99Df81D73618B62e59eD76D687b56"], // MockSimpleDEX
    ["0x5CEe84E380CDA3bdc27f908eE9b61c7462f0b435", "0x9A1b3BC7500C31D95362d54Db4878A2ef1D35559"] // WFLR, USDC
);
```

---

## Verification

All contracts are verified on:
- [Coston2 Explorer](https://coston2-explorer.flare.network/)

To verify yourself:

```bash
npx hardhat verify --network coston2 $CONTRACT_ADDRESS $CONSTRUCTOR_ARGS
```

---

## Network Configuration

```javascript
// Coston2 Testnet
{
  chainId: 114,
  chainName: "Coston2",
  rpcUrls: ["https://coston2-api.flare.network/ext/C/rpc"],
  nativeCurrency: {
    name: "Coston2 Flare",
    symbol: "C2FLR",
    decimals: 18
  },
  blockExplorerUrls: ["https://coston2-explorer.flare.network/"]
}
```

---

## Security

### Audits

| Auditor | Status | Report |
|---------|--------|--------|
| Code4rena | Pending | - |
| Sherlock | Pending | - |

### Bug Bounty

Found something? Report to security@praxis.finance

| Severity | Reward |
|----------|--------|
| Critical | Up to $50,000 |
| High | Up to $20,000 |
| Medium | Up to $5,000 |
| Low | Up to $1,000 |

---

## Getting Test Tokens

### Coston2 Faucet
- [Official Flare Faucet](https://faucet.flare.network/)
- Select "Coston2" network
- Get C2FLR (testnet FLR)

### Mint Mock Tokens

The mock tokens have public mint functions for testing:

```solidity
// Mint 1000 mock USDC to yourself
MockERC20(0x9A1b3BC7500C31D95362d54Db4878A2ef1D35559).mint(yourAddress, 1000e6);
```

---

## Local Development

### Clone & Build

```bash
git clone https://github.com/praxis-finance/praxis-protocol
cd praxis-protocol/web3
npm install
npx hardhat compile
```

### Run Tests

```bash
npx hardhat test
```

### Deploy Locally

```bash
npx hardhat node
npx tsx scripts/deploy/deploy-all-coston2.ts
```

---

## JSON Addresses File

Full deployed addresses available at:
```
/web3/deployed-addresses-coston2.json
```

```json
{
  "PraxisGateway": "0x2417159FB72e6F21e033E7C0491D37eF10BCDb88",
  "ExecutionVault": "0x7a7D2633097cF80aDe393e3A8295D25A28E40254",
  "ExecutionRightsNFT": "0xc00DEa0f4CEdDB35f692B84aCAB7302008fA8532",
  "PositionManager": "0x64076786B67aec894E18019Bc4e17f662dcAa26c",
  "ExecutionController": "0xEf5469F99Af9a36d3BbD5F44b7d424D9D5582367",
  "SettlementEngine": "0xBB21fD102D6Fe9C1b87d664eF1CA7Cf10e99654A",
  "ReputationManager": "0xa1A4c125c967529b7Df11c9cdcDcbE397cf37274",
  "CircuitBreaker": "0x53494eEa6403b8E6b44DB561CDFFD811D36f7349",
  "UtilizationController": "0xd484756d3823fb273bE6fd37D50a8a05e30b8B3f",
  "ExposureManager": "0x420B3c932593613A96C317B761106D361cAD8146",
  "InsuranceFund": "0xe059f1E6ec8aB3eB7838d3331a7C7A18d00AD78B",
  "SwapRouter": "0xFf6e30C981149b2c16664C7f89184cB0a3Ad52F2",
  "FlareOracle": "0x0979854b028210Cf492a3bCB990B6a1D45d89eCc",
  "FDCVerifier": "0xe667bEf52f1EAD93Cb0375639a4eA36001d4edf3",
  "Groth16Verifier": "0x66636dF917bb64cA387DcB3CbB5e707E06372bb3",
  "PrivateSwapVerifier": "0x714178e4C5714c438FF07560f01Af22EdC0DFfF2",
  "PrivatePerpVerifier": "0xe4d9A773b3ef67371084173baEE2e79D2fA41032",
  "PrivateYieldVerifier": "0xcF87367DB8e663C9F405589a0371025B48f01503",
  "PrivateSettlementVerifier": "0x5aaa124258D252542c1A2F919b514643e298b5a6",
  "ZKExecutionController": "0xb52124b3a7190f3d34DF666f263d3996336d7E2A",
  "ZKExecutor": "0x975448Eda4068E67A6EF65CEfF545aa8f1c389Bb",
  "MockUSDC": "0x9A1b3BC7500C31D95362d54Db4878A2ef1D35559",
  "MockWFLR": "0x5CEe84E380CDA3bdc27f908eE9b61c7462f0b435",
  "MockFXRP": "0x35Ce520d9b837A5c1541b11c6EF9dD80e66280bB",
  "MockFBTC": "0x0c17a2A0f3dfEec4c7eFf363e53808Bea3A6eFe0",
  "MockFDOGE": "0xBb22F84FFA472c84e0FC7c58994Dcb203C0b7CcB",
  "MockSimpleDEX": "0xAF248bA04Cb99Df81D73618B62e59eD76D687b56",
  "MockSceptre": "0x0D9828a7BfD604D10E174C6C7F485f4122b4aD30",
  "MockKinetic": "0x3B7c43114154AD210399ADBf5a9B25Dd41E31b66"
}
```

---

## Next Up

Need help understanding the jargon? Check the [Glossary](12-glossary.md).
