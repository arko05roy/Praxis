# 7. Architecture

Time to look under the hood. This is where we prove it's not just diagrams and promises.

---

## Contract Overview

```
┌─────────────────────────────────────────────────────────────────────────────────┐
│                            PRAXIS ARCHITECTURE                                  │
└─────────────────────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────────────────────┐
│                              ENTRY LAYER                                        │
│  ┌─────────────────────────────────────────────────────────────────────────┐   │
│  │                         PraxisGateway                                    │   │
│  └─────────────────────────────────────────────────────────────────────────┘   │
└───────────────────────────────────────┬─────────────────────────────────────────┘
                                        │
                                        ▼
┌─────────────────────────────────────────────────────────────────────────────────┐
│                               CORE LAYER                                        │
│  ┌─────────────────┐ ┌─────────────────┐ ┌─────────────────┐ ┌──────────────┐  │
│  │ ExecutionVault  │ │ PositionManager │ │ExecutionRightsNFT│ │Execution    │  │
│  │                 │ │                 │ │                 │ │Controller   │  │
│  └─────────────────┘ └─────────────────┘ └─────────────────┘ └──────────────┘  │
└───────────────────────────────────────┬─────────────────────────────────────────┘
                                        │
                    ┌───────────────────┼───────────────────┐
                    ▼                   ▼                   ▼
┌───────────────────────────┐ ┌───────────────────────────┐ ┌─────────────────────┐
│      SAFETY LAYER         │ │   INTEGRATION LAYER       │ │     ZK LAYER        │
│ ┌───────────────────────┐ │ │ ┌───────────────────────┐ │ │ ┌─────────────────┐ │
│ │  ReputationManager    │ │ │ │     SwapRouter        │ │ │ │ZKExecution      │ │
│ ├───────────────────────┤ │ │ ├───────────────────────┤ │ │ │Controller       │ │
│ │  CircuitBreaker       │ │ │ │     YieldRouter       │ │ │ ├─────────────────┤ │
│ ├───────────────────────┤ │ │ ├───────────────────────┤ │ │ │  ZKExecutor     │ │
│ │  UtilizationController│ │ │ │   PerpetualRouter     │ │ │ ├─────────────────┤ │
│ ├───────────────────────┤ │ │ ├───────────────────────┤ │ │ │Groth16Verifiers │ │
│ │  ExposureManager      │ │ │ │   SettlementEngine    │ │ │ └─────────────────┘ │
│ ├───────────────────────┤ │ └───────────────┬─────────┘ │ └─────────────────────┘
│ │  InsuranceFund        │ │                 │           │
│ └───────────────────────┘ │                 ▼           │
└───────────────────────────┘ ┌───────────────────────────┐
                              │      ORACLE LAYER         │
                              │ ┌───────────────────────┐ │
                              │ │    FlareOracle        │ │
                              │ ├───────────────────────┤ │
                              │ │    FDCVerifier        │ │
                              │ └───────────────────────┘ │
                              └───────────────────────────┘
```

---

## Core Contracts

### PraxisGateway

The front door. All user interactions start here.

```solidity
contract PraxisGateway {
    function requestERT(
        uint256 capitalLimit,
        uint256 maxLeverage,
        address[] allowedAdapters,
        address[] allowedAssets
    ) external returns (uint256 tokenId);

    function stake(uint256 amount) external;
    function unstake(uint256 tokenId) external;

    function deposit(uint256 amount) external returns (uint256 shares);
    function withdraw(uint256 shares) external returns (uint256 amount);
}
```

**Key responsibilities:**
- User-facing interface
- Route requests to appropriate contracts
- Handle staking/unstaking
- Manage deposits/withdrawals

### ExecutionVault

The treasury. Holds all LP capital. Never lets it go.

```
┌─────────────────────────────────────────────────────────────────────────────────┐
│                     ExecutionVault (ERC-4626)                                   │
├─────────────────────────────────────────────────────────────────────────────────┤
│                                                                                 │
│  ┌─────────────────┐  ┌─────────────────┐  ┌─────────────────────────────────┐ │
│  │  Total Assets   │  │  Total Shares   │  │     Utilization Tracking        │ │
│  └─────────────────┘  └─────────────────┘  └─────────────────────────────────┘ │
│                                                                                 │
└─────────────────────────────────────────────────────────────────────────────────┘
         ▲                                                      │
         │ deposit                                              │ execute trades
         │                                                      ▼
    ┌────┴────┐                                          ┌───────────┐
    │   LP    │◄─────────────── shares ──────────────────│  Routers  │
    └─────────┘                                          └─────┬─────┘
                                                               │
                                                      returns  │
                                                               ▼
                                                    ┌─────────────────┐
                                                    │ ExecutionVault  │
                                                    └─────────────────┘
```

```solidity
contract ExecutionVault is ERC4626 {
    // ERC-4626 standard functions
    function deposit(uint256 assets, address receiver) external returns (uint256 shares);
    function withdraw(uint256 assets, address receiver, address owner) external returns (uint256 shares);

    // PRAXIS-specific
    function requestFunds(address adapter, uint256 amount) external onlyController;
    function returnFunds(address adapter, uint256 amount) external onlyController;
    function recordProfit(uint256 profit, address executor) external onlySettlement;
    function recordLoss(uint256 loss, address executor) external onlySettlement;
}
```

**Key properties:**
- ERC-4626 compliant (composable with other DeFi)
- Only authorized contracts can request funds
- Tracks utilization (max 70%)
- Records P&L per executor

### ExecutionRightsNFT

The permission slip. Encodes everything an executor can and cannot do.

```solidity
contract ExecutionRightsNFT is ERC721 {
    struct ExecutionRights {
        uint256 capitalLimit;
        uint256 maxLeverage;
        uint256 maxDrawdownBps;
        address[] allowedAdapters;
        address[] allowedAssets;
        uint256 stakedAmount;
        uint256 expiryTime;
        bool active;
    }

    mapping(uint256 => ExecutionRights) public rights;

    function mint(address executor, ExecutionRights memory params) external onlyGateway returns (uint256);
    function burn(uint256 tokenId) external onlyGateway;
    function validate(uint256 tokenId, TradeParams memory trade) external view returns (bool);
}
```

**Key properties:**
- Non-transferable (soulbound)
- Encodes all execution limits
- Validated on every trade
- Expires after inactivity

### PositionManager

The bookkeeper. Tracks every position across every executor.

```
┌─────────────────────────────────────────────────────────────────────────────────┐
│                            PositionManager                                      │
├─────────────────────────────────────────────────────────────────────────────────┤
│  ┌─────────────────────┐ ┌─────────────────────┐ ┌───────────────────────────┐ │
│  │ Position Registry   │ │  Trade Validation   │ │    Router Selection       │ │
│  └─────────────────────┘ └─────────────────────┘ └───────────────────────────┘ │
└─────────────────────────────────────────────────────────────────────────────────┘
          ▲                          │                          │
          │                          │ validate                 │ route
          │ openPosition             ▼                          ▼
┌─────────┴─────────┐        ┌───────────────┐          ┌───────────────┐
│     Executor      │        │     ERT       │          │    Routers    │
└───────────────────┘        └───────────────┘          └───────┬───────┘
                                                                │
                                                       confirm  │
                                                                ▼
                                                        ┌───────────────┐
                                                        │   Positions   │
                                                        │   (recorded)  │
                                                        └───────────────┘
```

```solidity
contract PositionManager {
    struct Position {
        address executor;
        address adapter;
        address asset;
        uint256 size;
        uint256 leverage;
        Direction direction;
        uint256 entryPrice;
        uint256 margin;
        uint256 openTime;
        PositionStatus status;
    }

    function openPosition(TradeParams memory params) external returns (uint256 positionId);
    function closePosition(uint256 positionId) external returns (int256 pnl);
    function liquidatePosition(uint256 positionId) external returns (int256 pnl);
    function getPositionValue(uint256 positionId) external view returns (uint256);
}
```

---

## Safety Contracts

### ReputationManager

The gatekeeper. Determines who gets what access.

```solidity
contract ReputationManager {
    enum Tier { NEWBIE, PROVING, TRUSTED, ELITE, WHALE }

    struct ReputationData {
        Tier tier;
        uint256 totalTrades;
        uint256 winningTrades;
        uint256 totalVolume;
        int256 totalPnL;
        uint256 maxDrawdown;
        uint256 lastTradeTime;
    }

    function getTier(address executor) external view returns (Tier);
    function getMaxCapital(address executor) external view returns (uint256);
    function getRequiredStake(address executor, uint256 capitalRequest) external view returns (uint256);
    function recordTrade(address executor, int256 pnl, uint256 volume) external;
}
```

**Tier progression:**

```
┌─────────────────────────────────────────────────────────────────────────────────┐
│                          REPUTATION TIER PROGRESSION                            │
└─────────────────────────────────────────────────────────────────────────────────┘

    ┌─────────┐  First ERT    ┌─────────┐  10 profitable   ┌─────────┐
    │  START  │──────────────►│ NEWBIE  │─────trades──────►│ PROVING │
    └─────────┘   request     └─────────┘                  └────┬────┘
                                                                │
                                                   50 trades,   │
                                                   60% win rate │
                                                                ▼
    ┌─────────┐  Governance   ┌─────────┐   200 trades,    ┌─────────┐
    │  WHALE  │◄──approval────│  ELITE  │◄──Sharpe > 1.5───│ TRUSTED │
    └─────────┘               └────┬────┘                  └────┬────┘
                                   │                            │
                         Bad       │                            │       Bad
                    performance    │                            │  performance
                                   ▼                            ▼
                              ┌─────────┐                  ┌─────────┐
                              │ TRUSTED │                  │ PROVING │
                              └─────────┘                  └─────────┘
```

### CircuitBreaker

The panic button. Stops everything when things go wrong.

```solidity
contract CircuitBreaker {
    uint256 public dailyLossThreshold = 500; // 5% in bps

    function checkAndTrigger(uint256 currentLoss) external returns (bool triggered);
    function pause() external onlyOwner;
    function unpause() external onlyOwner;
    function emergencyPause() external; // Anyone can call if threshold exceeded
}
```

**Trigger conditions:**
- Daily vault loss > 5%
- Manual governance trigger
- Anomaly detection (future)

### UtilizationController

The limit enforcer. Ensures 30% always stays liquid.

```solidity
contract UtilizationController {
    uint256 public maxUtilization = 7000; // 70% in bps

    function canUtilize(uint256 amount) external view returns (bool);
    function recordUtilization(uint256 amount) external;
    function recordReturn(uint256 amount) external;
    function getAvailableCapital() external view returns (uint256);
}
```

### ExposureManager

The diversifier. Prevents overexposure to any single asset.

```solidity
contract ExposureManager {
    uint256 public maxAssetExposure = 3000; // 30% in bps

    mapping(address => uint256) public assetExposure;

    function canAddExposure(address asset, uint256 amount) external view returns (bool);
    function addExposure(address asset, uint256 amount) external;
    function removeExposure(address asset, uint256 amount) external;
}
```

### InsuranceFund

The safety net. Covers gaps when stakes aren't enough.

```solidity
contract InsuranceFund {
    uint256 public contributionRate = 200; // 2% of profits in bps

    function contribute(uint256 profitAmount) external;
    function cover(uint256 lossAmount) external returns (uint256 covered);
    function getBalance() external view returns (uint256);
}
```

---

## Integration Layer

### SwapRouter

Routes spot trades to appropriate DEX.

```
┌─────────────────────────────────────────────────────────────────────────────────┐
│                              SWAP ROUTING                                       │
└─────────────────────────────────────────────────────────────────────────────────┘

┌─────────────────┐    swap request    ┌─────────────────┐
│ PositionManager │───────────────────►│   SwapRouter    │
└─────────────────┘                    └────────┬────────┘
                                                │
                            ┌───────────────────┼───────────────────┐
                            ▼                   ▼                   ▼
                     ┌───────────┐       ┌───────────┐       ┌───────────┐
                     │ SparkDEX  │       │ BlazeSwap │       │  Enosys   │
                     └─────┬─────┘       └───────────┘       └───────────┘
                           │
                     best price
                           │
                           ▼
                    ┌─────────────┐
                    │   Execute   │
                    │   Winner    │
                    └─────────────┘
```

```solidity
contract SwapRouter {
    function swap(
        address tokenIn,
        address tokenOut,
        uint256 amountIn,
        uint256 minAmountOut
    ) external returns (uint256 amountOut);

    function getQuote(
        address tokenIn,
        address tokenOut,
        uint256 amountIn
    ) external view returns (uint256 amountOut, address bestDex);
}
```

### YieldRouter

Handles lending/staking positions.

```solidity
contract YieldRouter {
    function supply(address asset, uint256 amount) external returns (uint256 shares);
    function withdraw(address asset, uint256 shares) external returns (uint256 amount);
    function getYield(address asset) external view returns (uint256 apy);
}
```

### PerpetualRouter

Handles perpetual/leveraged positions.

```solidity
contract PerpetualRouter {
    function openPerp(
        address asset,
        uint256 size,
        uint256 leverage,
        Direction direction
    ) external returns (uint256 positionId);

    function closePerp(uint256 positionId) external returns (int256 pnl);
}
```

### SettlementEngine

The accountant. Calculates and distributes P&L.

```
┌─────────────────────────────────────────────────────────────────────────────────┐
│                           SETTLEMENT FLOW                                       │
└─────────────────────────────────────────────────────────────────────────────────┘

┌─────────────────┐
│ Position Closed │
└────────┬────────┘
         │
         ▼
┌─────────────────────┐
│  SettlementEngine   │
└────────┬────────────┘
         │
         ▼
┌─────────────────────┐
│   Calculate P&L     │
└────────┬────────────┘
         │
         ├────────────────────────────────────┐
         │ Profit                             │ Loss
         ▼                                    ▼
┌─────────────────────┐              ┌─────────────────────┐
│   Split 80/20       │              │   Slash Stake       │
└────────┬────────────┘              └────────┬────────────┘
         │                                    │
    ┌────┼────┬────────────┐                  ▼
    │    │    │            │         ┌─────────────────────┐
    ▼    ▼    ▼            ▼         │   Cover LP Loss     │
┌──────┐ ┌──────┐ ┌──────────────┐   └─────────────────────┘
│Exec. │ │Vault │ │  Insurance   │
│ 80%  │ │ 20%  │ │     2%       │
└──────┘ └──────┘ └──────────────┘
```

```solidity
contract SettlementEngine {
    function settlePnL(
        uint256 positionId,
        int256 pnl,
        address executor
    ) external returns (SettlementResult memory);

    struct SettlementResult {
        int256 executorPnL;
        int256 lpPnL;
        uint256 insuranceContribution;
        uint256 stakeSlashed;
    }
}
```

---

## Oracle Layer

### FlareOracle

Wraps Flare's FTSO for price data.

```solidity
contract FlareOracle {
    function getPrice(address asset) external view returns (uint256 price, uint256 timestamp);
    function getPriceWithProof(address asset) external view returns (uint256 price, bytes memory proof);
}
```

### FDCVerifier

Validates cross-chain data from Flare Data Connector.

```solidity
contract FDCVerifier {
    function verifyData(bytes memory attestation) external view returns (bool valid, bytes memory data);
}
```

---

## ZK Layer

### ZKExecutionController

Orchestrates private execution.

```
┌─────────────────────────────────────────────────────────────────────────────────┐
│                        PUBLIC vs ZK EXECUTION PATHS                             │
└─────────────────────────────────────────────────────────────────────────────────┘

┌───────────────────────────────────┐    ┌───────────────────────────────────────┐
│          PUBLIC PATH              │    │             ZK PATH                   │
├───────────────────────────────────┤    ├───────────────────────────────────────┤
│                                   │    │                                       │
│  ┌───────────┐                    │    │  ┌───────────┐                        │
│  │   Trade   │                    │    │  │   Trade   │                        │
│  └─────┬─────┘                    │    │  └─────┬─────┘                        │
│        │                          │    │        │                              │
│        ▼                          │    │        ▼                              │
│  ┌───────────────────┐            │    │  ┌───────────────────┐                │
│  │ Visible on-chain  │            │    │  │  Generate proof   │                │
│  └───────────────────┘            │    │  └─────────┬─────────┘                │
│                                   │    │            │                          │
│                                   │    │            ▼                          │
│                                   │    │  ┌───────────────────┐                │
│                                   │    │  │ Verify on-chain   │                │
│                                   │    │  └─────────┬─────────┘                │
│                                   │    │            │                          │
│                                   │    │            ▼                          │
│                                   │    │  ┌───────────────────┐                │
│                                   │    │  │Execute privately  │                │
│                                   │    │  └───────────────────┘                │
└───────────────────────────────────┘    └───────────────────────────────────────┘
```

```solidity
contract ZKExecutionController {
    function executePrivate(
        bytes calldata proof,
        bytes32 publicInputHash
    ) external returns (bool);
}
```

### Verifiers

Groth16 verifiers for different operation types:
- `PrivateSwapVerifier` - Private spot trades
- `PrivatePerpVerifier` - Private perpetual positions
- `PrivateYieldVerifier` - Private yield farming
- `PrivateSettlementVerifier` - Private P&L settlement

---

## Data Flow Summary

```
┌─────────────────────────────────────────────────────────────────────────────────┐
│                         COMPLETE DATA FLOW                                      │
└─────────────────────────────────────────────────────────────────────────────────┘

  User          Gateway         ERT           PM          Safety       Router
   │               │             │             │             │            │
   │  requestERT   │             │             │             │            │
   │   + stake     │             │             │             │            │
   │──────────────►│             │             │             │            │
   │               │  mint NFT   │             │             │            │
   │               │────────────►│             │             │            │
   │               │             │             │             │            │
   │◄──────────────┼─────────────┼─────────────┼─────────────┼────────────│
   │   ERT #123    │             │             │             │            │
   │               │             │             │             │            │
   │               │             │             │             │            │
   │  openPosition(params)       │             │             │            │
   │──────────────────────────────────────────►│             │            │
   │               │             │  validate   │             │            │
   │               │             │◄────────────│             │            │
   │               │             │             │ checkLimits │            │
   │               │             │             │────────────►│            │
   │               │             │             │      OK     │            │
   │               │             │             │◄────────────│            │
   │               │             │             │             │            │
   │               │             │             │   execute(trade)         │
   │               │             │             │────────────────────────►│
   │               │             │             │             │            │
   │               │             │             │             │   Vault    │   DEX
   │               │             │             │             │     │       │    │
   │               │             │             │             │     │requestFunds│
   │               │             │             │             │     │◄──────│    │
   │               │             │             │             │     │  swap │    │
   │               │             │             │             │     │───────┼───►│
   │               │             │             │             │     │tokens │    │
   │               │             │             │             │     │◄──────┼────│
   │               │             │             │             │            │
   │               │             │             │◄────────────────────────│
   │               │             │             │   position opened       │
   │               │             │             │             │            │
   │                                                                      │
   │                        ... Later ...                                 │
   │                                                                      │
   │  closePosition              │             │             │            │
   │──────────────────────────────────────────►│             │            │
   │               │             │             │    close    │            │
   │               │             │             │────────────────────────►│
   │               │             │             │             │            │
   │               │             │             │   Settlement             │
   │               │             │             │       │      │            │
   │               │             │             │settlePnL    │            │
   │               │             │             │──────►│      │            │
   │               │             │             │       │record profit/loss│
   │               │             │             │       │─────►│            │
   │               │             │             │       │      │            │
   │◄──────────────┼─────────────┼─────────────┼──────────────┼────────────│
   │  P&L settled  │             │             │             │            │
   │               │             │             │             │            │
```

---

## Upgrade & Governance

All contracts are upgradeable via transparent proxy pattern. Governance controls:

- Adding/removing adapters
- Adjusting tier requirements
- Changing fee structures
- Emergency pauses
- Insurance fund management

---

## Next Up

Want to see all the safety mechanisms in detail? Check [Safety](8-safety.md).
