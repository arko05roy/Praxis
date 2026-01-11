# PRAXIS - The Unified Gateway to Digital Asset Finance on Flare

**Version:** v3.0
**Target Chain:** Flare (Coston2 Testnet -> Mainnet)

## The Vision

> **"Seamless access to digital asset finance. Any asset. Any protocol. One interface."**
>
> Flare is building the seamless platform for all digital asset business - a TAM in the hundreds of trillions.
> PRAXIS is the unified gateway that makes this vision accessible to everyone.

---

## Narrative Alignment with Flare

**Flare's Promise:**
- "Seamless platform for all digital asset business"
- Hundreds of trillions in TAM
- Starting with XRP, expanding to all digital assets
- Both retail and institutional

**PRAXIS's Role:**
- The interface layer that makes Flare's infrastructure accessible
- First true gateway for FAssets (FXRP, FBTC, FDOGE) into DeFi
- One-click access to swap, lend, stake, and yield
- Simple UI for retail, robust contracts for integrations

---

## Table of Contents

1. [Why PRAXIS Matters](#1-why-praxis-matters)
2. [Core Pillars](#2-core-pillars)
3. [Architecture](#3-architecture)
4. [Smart Contract Specification](#4-smart-contract-specification)
5. [Implementation Phases](#5-implementation-phases)
6. [Testing Strategy](#6-testing-strategy)
7. [Deployment Strategy](#7-deployment-strategy)
8. [Contract Addresses](#8-contract-addresses)

---

## 1. Why PRAXIS Matters

### Without PRAXIS:
```
User has FXRP and wants to earn yield...

1. Research which DEX has FXRP liquidity
2. Find best swap rate manually
3. Execute swap (pay gas)
4. Research lending options
5. Supply to Kinetic (pay gas)
6. Research staking options
7. Stake on Sceptre (pay gas)
8. Track positions across 3 UIs

Result: 8 steps, multiple gas fees, fragmented experience
```

### With PRAXIS:
```
User has FXRP and wants to earn yield...

1. Connect wallet
2. Select: "FXRP -> Yield Strategy"
3. Choose: Conservative (Kinetic) or Aggressive (LP + Stake)
4. Click execute

Result: 1 interface, optimized gas, unified tracking
```

---

## 2. Core Pillars

### 2.1 FAssets First

FAssets (FXRP, FBTC, FDOGE) are the entry point to Flare for hundreds of trillions in non-smart-contract assets.

| FAsset | Underlying | Why It Matters |
|--------|------------|----------------|
| FXRP | XRP | $25B+ market cap, massive community |
| FBTC | BTC | $800B+ market cap, biggest crypto asset |
| FDOGE | DOGE | $10B+ market cap, retail favorite |

**PRAXIS makes FAssets useful:**
- Instant swap to any Flare asset
- Supply as collateral to earn yield
- Stake via liquid staking derivatives
- Provide liquidity with one click

### 2.2 Unified DeFi Access

One interface for all DeFi actions across all Flare protocols.

| Action | Protocol(s) | PRAXIS Flow |
|--------|-------------|-------------|
| **Swap** | SparkDEX, Enosys, BlazeSwap | Best rate auto-routing |
| **Lend** | Kinetic | Supply -> earn interest |
| **Borrow** | Kinetic | Collateralize -> borrow |
| **Stake** | Sceptre (sFLR) | FLR -> sFLR + rewards |
| **LP** | SparkDEX, Enosys | Provide liquidity |
| **Perpetuals** | SparkDEX Eternal | Long/short with up to 100x leverage |
| **Yield** | All | Optimized yield strategies |

### 2.3 FTSO + FDC: The Data Advantage

Flare's native infrastructure gives PRAXIS unfair advantages:

| Flare Native | What It Does | PRAXIS Use |
|--------------|--------------|------------|
| **FTSO v2** | Decentralized price feeds | Real-time quotes, no external oracle |
| **FDC** | Verifiable cross-chain data | FAsset price verification |
| **State Connector** | Cross-chain proofs | Future: direct bridge integration |

---

## 3. Architecture

### 3.1 System Diagram

```
+-----------------------------------------------------------------------------+
|                              USERS                                           |
|                    (Wallet + Frontend / Direct Contract)                     |
+-----------------------------------------------------------------------------+
                                       |
                                       v
+-----------------------------------------------------------------------------+
|                         PRAXIS CORE CONTRACTS                                |
+-----------------------------------------------------------------------------+
|                                                                              |
|  +---------------------------------------------------------------------+    |
|  |                         PraxisGateway.sol                            |    |
|  |   - Unified entry point for all actions                              |    |
|  |   - FAsset-aware routing                                             |    |
|  |   - Strategy execution engine                                         |    |
|  |   - Gas optimization (batching)                                       |    |
|  +---------------------------------------------------------------------+    |
|                                       |                                      |
|           +---------------------------+---------------------------+          |
|           |                           |                           |          |
|           v                           v                           v          |
|  +-----------------+      +-----------------+      +-----------------+       |
|  |   SwapRouter    |      |   YieldRouter   |      | StrategyEngine  |       |
|  | - Best rate     |      | - Optimal yield |      | - Multi-step    |       |
|  | - Multi-DEX     |      | - Risk-adjusted |      | - Conditional   |       |
|  | - Split routes  |      | - Auto-compound |      | - Preset flows  |       |
|  +--------+--------+      +--------+--------+      +--------+--------+       |
|           |                        |                        |                |
|           +------------------------+------------------------+                |
|                                    |                                         |
|                                    v                                         |
|  +---------------------------------------------------------------------+    |
|  |                       Protocol Adapters                              |    |
|  +----------+----------+----------+----------+----------+--------------+    |
|  | SparkDEX |  Enosys  | BlazeSwap| Kinetic  | Sceptre  |  FAssets     |    |
|  | Adapter  | Adapter  | Adapter  | Adapter  | Adapter  |  Handler     |    |
|  +----------+----------+----------+----------+----------+--------------+    |
|  |                    SparkDEX Eternal Adapter                          |    |
|  |                    (Perpetuals: Long/Short/Margin)                   |    |
|  +---------------------------------------------------------------------+    |
|                                    |                                         |
|                                    v                                         |
|  +---------------------------------------------------------------------+    |
|  |                         Flare Native Layer                           |    |
|  +----------------------------------+----------------------------------+    |
|  |      FlareOracle (FTSO v2)       |      FAssetsHandler (FDC)        |    |
|  +----------------------------------+----------------------------------+    |
+-----------------------------------------------------------------------------+
                                       |
                                       v
+-----------------------------------------------------------------------------+
|                          FLARE DEFI PROTOCOLS                                |
+----------+----------+----------+----------+----------+---------------------+
| SparkDEX |  Enosys  | BlazeSwap| Kinetic  | Sceptre  |   FAsset Contracts  |
|  (DEX)   |  (DEX)   |  (DEX)   | (Lending)| (Stake)  |   (FXRP,FBTC,FDOGE) |
+----------+----------+----------+----------+----------+---------------------+
|                     SparkDEX Eternal (Perpetuals)                           |
+-----------------------------------------------------------------------------+
```

### 3.2 Directory Structure

```
praxis/web3/
├── contracts/
│   ├── core/
│   │   ├── PraxisGateway.sol       # Main entry point
│   │   ├── SwapRouter.sol          # DEX aggregation
│   │   ├── YieldRouter.sol         # Yield optimization
│   │   ├── StrategyEngine.sol      # Multi-step strategies
│   │   └── Batcher.sol             # Gas optimization
│   │
│   ├── adapters/
│   │   ├── IAdapter.sol            # Common interface
│   │   ├── ILendingAdapter.sol     # Lending interface
│   │   ├── IStakingAdapter.sol     # Staking interface
│   │   ├── IPerpetualAdapter.sol   # Perpetuals interface
│   │   ├── BaseAdapter.sol         # Abstract base
│   │   ├── SparkDEXAdapter.sol     # SparkDEX V3
│   │   ├── SparkDEXEternalAdapter.sol # SparkDEX Eternal (perps)
│   │   ├── EnosysAdapter.sol       # Enosys
│   │   ├── BlazeSwapAdapter.sol    # BlazeSwap
│   │   ├── KineticAdapter.sol      # Kinetic lending
│   │   ├── SceptreAdapter.sol      # Sceptre staking
│   │   └── FAssetsAdapter.sol      # FAsset handling
│   │
│   ├── oracles/
│   │   ├── FlareOracle.sol         # FTSO v2 wrapper
│   │   └── FDCVerifier.sol         # FDC price verification
│   │
│   ├── strategies/
│   │   ├── IStrategy.sol           # Strategy interface
│   │   ├── ConservativeYield.sol   # Low-risk yield
│   │   ├── AggressiveYield.sol     # Higher yield, more risk
│   │   └── FAssetOptimizer.sol     # FAsset-specific
│   │
│   ├── interfaces/
│   │   └── external/
│   │       ├── ISparkDEXRouter.sol
│   │       ├── ISparkDEXEternal.sol    # Perpetuals interface
│   │       ├── IEnosysRouter.sol
│   │       ├── IBlazeSwapRouter.sol
│   │       ├── IKToken.sol
│   │       ├── IKineticComptroller.sol
│   │       ├── ISceptre.sol
│   │       └── IFAssetManager.sol
│   │
│   └── lib/
│       ├── PraxisStructs.sol       # Data structures
│       ├── PraxisErrors.sol        # Custom errors
│       └── PraxisEvents.sol        # Events
│
├── test/
│   ├── unit/
│   │   ├── FlareOracle.t.sol
│   │   ├── SparkDEXAdapter.t.sol
│   │   ├── SparkDEXEternalAdapter.t.sol  # Perpetuals tests
│   │   ├── EnosysAdapter.t.sol
│   │   ├── BlazeSwapAdapter.t.sol
│   │   ├── KineticAdapter.t.sol
│   │   ├── SceptreAdapter.t.sol
│   │   └── PraxisGateway.t.sol
│   │
│   ├── integration/
│   │   ├── Aggregation.t.sol       # Best route selection
│   │   ├── CrossProtocol.t.sol     # Swap + Lend + Stake
│   │   ├── Perpetuals.t.sol        # Perp position workflows
│   │   ├── FAssetFlows.t.sol       # FAsset workflows
│   │   └── GasOptimization.t.sol   # Batching tests
│   │
│   └── fork/
│       ├── Coston2Fork.t.sol       # Fork Coston2
│       └── MainnetFork.t.sol       # Fork Flare mainnet
│
├── scripts/
│   ├── deploy/
│   │   ├── 01_FlareOracle.ts
│   │   ├── 02_Adapters.ts
│   │   ├── 03_Routers.ts
│   │   ├── 04_Gateway.ts
│   │   └── 05_Verify.ts
│   │
│   └── helpers/
│       ├── addresses.ts            # Network-specific addresses
│       └── testTokens.ts           # Testnet token helpers
│
└── hardhat.config.ts
```

---

## 4. Smart Contract Specification

### 4.1 Data Structures (`contracts/lib/PraxisStructs.sol`)

```solidity
// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

library PraxisStructs {
    // Risk levels for yield strategies
    enum RiskLevel {
        CONSERVATIVE,   // Staking, simple lending
        MODERATE,       // LP with stable pairs
        AGGRESSIVE      // LP with volatile pairs, leveraged
    }

    // Action types for strategies
    enum ActionType {
        SWAP,
        SUPPLY,
        WITHDRAW,
        BORROW,
        REPAY,
        STAKE,
        UNSTAKE,
        ADD_LIQUIDITY,
        REMOVE_LIQUIDITY,
        OPEN_LONG,
        OPEN_SHORT,
        CLOSE_POSITION,
        ADJUST_MARGIN
    }

    // Perpetual position side
    enum PositionSide {
        LONG,
        SHORT
    }

    /// @dev Single action in a strategy
    struct Action {
        ActionType actionType;
        address adapter;
        address tokenIn;
        address tokenOut;
        uint256 amountIn;      // 0 = use all from previous step
        uint256 minAmountOut;
        bytes extraData;
    }

    /// @dev Quote from a DEX
    struct Quote {
        address adapter;
        string name;
        uint256 amountOut;
        uint256 gasEstimate;
        uint256 priceImpact;    // basis points
    }

    /// @dev Yield opportunity
    struct YieldOption {
        address protocol;
        string name;
        uint256 apy;            // basis points (500 = 5%)
        RiskLevel risk;
        uint256 tvl;
        bool requiresLock;
        uint256 lockPeriod;     // seconds
    }

    /// @dev User position
    struct Position {
        address protocol;
        address asset;
        uint256 balance;
        uint256 value;          // in USD
        uint256 apy;
        uint256 earnedRewards;
    }

    /// @dev FAsset info
    struct FAssetInfo {
        address fAsset;
        string symbol;
        address underlying;     // e.g., XRP for FXRP
        uint256 totalMinted;
        uint256 collateralRatio;
    }

    /// @dev Perpetual position
    struct PerpPosition {
        bytes32 positionId;
        address market;         // e.g., BTC/USD, ETH/USD
        PositionSide side;      // LONG or SHORT
        uint256 size;           // Position size
        uint256 collateral;     // Margin deposited
        uint256 entryPrice;     // Average entry price
        uint256 leverage;       // Current leverage (e.g., 10 = 10x)
        int256 unrealizedPnl;   // Current unrealized P&L
        uint256 liquidationPrice;
    }

    /// @dev Perpetual market info
    struct PerpMarket {
        address market;
        string symbol;          // e.g., "BTC/USD"
        uint256 maxLeverage;    // e.g., 100 for 100x
        uint256 fundingRate;    // Current funding rate (basis points)
        uint256 openInterest;
        uint256 indexPrice;     // From FTSO
        uint256 markPrice;
    }

    /// @dev Swap parameters
    struct SwapParams {
        address tokenIn;
        address tokenOut;
        uint256 amountIn;
        uint256 minAmountOut;
        address recipient;
        uint256 deadline;
    }

    /// @dev Route hop
    struct Hop {
        address adapter;
        address tokenIn;
        address tokenOut;
        bytes extraData;
    }

    /// @dev Complete route
    struct Route {
        Hop[] hops;
        uint256 expectedOutput;
    }
}
```

### 4.2 Adapter Interface (`contracts/adapters/IAdapter.sol`)

```solidity
// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

interface IAdapter {
    /// @notice Get adapter name for identification
    function name() external view returns (string memory);

    /// @notice Get quote for a swap (view function, no state change)
    /// @param tokenIn Input token address
    /// @param tokenOut Output token address
    /// @param amountIn Amount of input token
    /// @return amountOut Expected output amount
    /// @return gasEstimate Estimated gas for this swap
    function getQuote(
        address tokenIn,
        address tokenOut,
        uint256 amountIn
    ) external view returns (uint256 amountOut, uint256 gasEstimate);

    /// @notice Execute a swap
    /// @param tokenIn Input token address
    /// @param tokenOut Output token address
    /// @param amountIn Amount of input token
    /// @param minAmountOut Minimum acceptable output
    /// @param to Recipient address
    /// @param extraData Adapter-specific data
    /// @return amountOut Actual output amount
    function swap(
        address tokenIn,
        address tokenOut,
        uint256 amountIn,
        uint256 minAmountOut,
        address to,
        bytes calldata extraData
    ) external returns (uint256 amountOut);
}
```

### 4.3 Lending Adapter Interface (`contracts/adapters/ILendingAdapter.sol`)

```solidity
// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

interface ILendingAdapter {
    /// @notice Get adapter name
    function name() external view returns (string memory);

    /// @notice Supply assets to earn yield
    function supply(address asset, uint256 amount, address onBehalfOf)
        external returns (uint256 shares);

    /// @notice Withdraw assets
    function withdraw(address asset, uint256 shares, address to)
        external returns (uint256 amount);

    /// @notice Borrow assets
    function borrow(address asset, uint256 amount, address onBehalfOf)
        external returns (uint256 borrowed);

    /// @notice Repay borrowed assets
    function repay(address asset, uint256 amount, address onBehalfOf)
        external returns (uint256 repaid);

    /// @notice Get current supply APY (in basis points)
    function getSupplyAPY(address asset) external view returns (uint256);

    /// @notice Get current borrow APY (in basis points)
    function getBorrowAPY(address asset) external view returns (uint256);

    /// @notice Get user's supply balance
    function getSupplyBalance(address user, address asset) external view returns (uint256);
}
```

### 4.4 Staking Adapter Interface (`contracts/adapters/IStakingAdapter.sol`)

```solidity
// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

interface IStakingAdapter {
    /// @notice Get adapter name
    function name() external view returns (string memory);

    /// @notice Stake assets
    function stake(uint256 amount, address onBehalfOf)
        external payable returns (uint256 shares);

    /// @notice Request unstake (may have cooldown)
    function requestUnstake(uint256 shares, address onBehalfOf)
        external returns (uint256 requestId);

    /// @notice Complete unstake after cooldown
    function completeUnstake(uint256 requestId, address to)
        external returns (uint256 amount);

    /// @notice Get staking APY (in basis points)
    function getStakingAPY() external view returns (uint256);

    /// @notice Get cooldown period in seconds
    function getCooldownPeriod() external view returns (uint256);

    /// @notice Get user's staked balance
    function getStakedBalance(address user) external view returns (uint256);
}
```

### 4.5 Perpetual Adapter Interface (`contracts/adapters/IPerpetualAdapter.sol`)

```solidity
// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

import {PraxisStructs} from "../lib/PraxisStructs.sol";

interface IPerpetualAdapter {
    /// @notice Get adapter name
    function name() external view returns (string memory);

    /// @notice Open a perpetual position
    /// @param market The market address (e.g., BTC/USD)
    /// @param collateral Amount of collateral to deposit
    /// @param size Position size
    /// @param leverage Leverage multiplier (e.g., 10 for 10x)
    /// @param isLong True for long, false for short
    /// @param onBehalfOf Position owner
    /// @return positionId Unique position identifier
    function openPosition(
        address market,
        uint256 collateral,
        uint256 size,
        uint256 leverage,
        bool isLong,
        address onBehalfOf
    ) external returns (bytes32 positionId);

    /// @notice Close a perpetual position
    /// @param positionId The position to close
    /// @param to Address to receive proceeds
    /// @return pnl Realized profit/loss
    function closePosition(bytes32 positionId, address to)
        external returns (int256 pnl);

    /// @notice Add margin to an existing position
    /// @param positionId The position to modify
    /// @param amount Additional collateral to add
    function addMargin(bytes32 positionId, uint256 amount) external;

    /// @notice Remove margin from an existing position
    /// @param positionId The position to modify
    /// @param amount Collateral to remove
    /// @param to Address to receive removed collateral
    function removeMargin(bytes32 positionId, uint256 amount, address to) external;

    /// @notice Get position details
    /// @param positionId The position to query
    /// @return position The position details
    function getPosition(bytes32 positionId)
        external view returns (PraxisStructs.PerpPosition memory position);

    /// @notice Get market info
    /// @param market The market address
    /// @return info Market details including funding rate, open interest
    function getMarketInfo(address market)
        external view returns (PraxisStructs.PerpMarket memory info);

    /// @notice Get current funding rate for a market
    /// @param market The market address
    /// @return fundingRate Current funding rate in basis points (positive = longs pay shorts)
    function getFundingRate(address market) external view returns (int256 fundingRate);

    /// @notice Get available markets
    /// @return markets Array of supported market addresses
    function getMarkets() external view returns (address[] memory markets);

    /// @notice Get user's all open positions
    /// @param user The user address
    /// @return positions Array of user's open positions
    function getUserPositions(address user)
        external view returns (PraxisStructs.PerpPosition[] memory positions);
}
```

### 4.7 FlareOracle (`contracts/oracles/FlareOracle.sol`)

```solidity
// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

import {ContractRegistry} from "@flarenetwork/flare-periphery-contracts/coston2/ContractRegistry.sol";
import {IFtsoV2} from "@flarenetwork/flare-periphery-contracts/coston2/IFtsoV2.sol";

contract FlareOracle {
    // Maximum acceptable price age (5 minutes)
    uint256 public constant MAX_PRICE_AGE = 300;

    // Feed IDs (Crypto = 0x01 prefix)
    bytes21 public constant FLR_USD = 0x01464c522f55534400000000000000000000000000;
    bytes21 public constant ETH_USD = 0x014554482f55534400000000000000000000000000;
    bytes21 public constant BTC_USD = 0x014254432f55534400000000000000000000000000;
    bytes21 public constant XRP_USD = 0x015852502f55534400000000000000000000000000;
    bytes21 public constant DOGE_USD = 0x01444f47452f555344000000000000000000000000;

    // Token address to feed ID mapping
    mapping(address => bytes21) public tokenFeeds;

    // Owner for configuration
    address public owner;

    error PriceStale(uint256 age, uint256 maxAge);
    error FeedNotConfigured(address token);
    error Unauthorized();

    event FeedConfigured(address indexed token, bytes21 feedId);

    constructor() {
        owner = msg.sender;
    }

    /// @notice Get price from FTSO v2
    function getPrice(bytes21 feedId) public view returns (
        uint256 value,
        int8 decimals,
        uint64 timestamp
    ) {
        IFtsoV2 ftso = ContractRegistry.getFtsoV2();
        return ftso.getFeedById(feedId);
    }

    /// @notice Get price with staleness check
    function getPriceWithCheck(bytes21 feedId) public view returns (uint256) {
        (uint256 value, , uint64 timestamp) = getPrice(feedId);
        uint256 age = block.timestamp - timestamp;
        if (age > MAX_PRICE_AGE) revert PriceStale(age, MAX_PRICE_AGE);
        return value;
    }

    /// @notice Get token price in USD
    function getTokenPriceUSD(address token) external view returns (uint256) {
        bytes21 feedId = tokenFeeds[token];
        if (feedId == bytes21(0)) revert FeedNotConfigured(token);
        return getPriceWithCheck(feedId);
    }

    /// @notice Configure feed for a token
    function setTokenFeed(address token, bytes21 feedId) external {
        if (msg.sender != owner) revert Unauthorized();
        tokenFeeds[token] = feedId;
        emit FeedConfigured(token, feedId);
    }

    /// @notice Transfer ownership
    function transferOwnership(address newOwner) external {
        if (msg.sender != owner) revert Unauthorized();
        owner = newOwner;
    }
}
```

### 4.8 SwapRouter (`contracts/core/SwapRouter.sol`)

```solidity
// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

import {IERC20} from "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import {SafeERC20} from "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import {ReentrancyGuard} from "@openzeppelin/contracts/security/ReentrancyGuard.sol";
import {IAdapter} from "../adapters/IAdapter.sol";
import {PraxisStructs} from "../lib/PraxisStructs.sol";

contract SwapRouter is ReentrancyGuard {
    using SafeERC20 for IERC20;

    // Registered adapters
    address[] public adapters;
    mapping(address => bool) public isAdapter;

    // Owner
    address public owner;

    // Events
    event AdapterAdded(address indexed adapter, string name);
    event AdapterRemoved(address indexed adapter);
    event SwapExecuted(
        address indexed tokenIn,
        address indexed tokenOut,
        uint256 amountIn,
        uint256 amountOut,
        address indexed adapter
    );

    // Errors
    error InvalidAdapter();
    error InsufficientOutput(uint256 actual, uint256 minimum);
    error DeadlineExpired();
    error Unauthorized();
    error NoRouteFound();

    constructor() {
        owner = msg.sender;
    }

    // ============ ADAPTER MANAGEMENT ============

    function addAdapter(address adapter) external {
        if (msg.sender != owner) revert Unauthorized();
        if (isAdapter[adapter]) revert InvalidAdapter();

        adapters.push(adapter);
        isAdapter[adapter] = true;

        emit AdapterAdded(adapter, IAdapter(adapter).name());
    }

    function removeAdapter(address adapter) external {
        if (msg.sender != owner) revert Unauthorized();
        if (!isAdapter[adapter]) revert InvalidAdapter();

        isAdapter[adapter] = false;

        for (uint256 i = 0; i < adapters.length; i++) {
            if (adapters[i] == adapter) {
                adapters[i] = adapters[adapters.length - 1];
                adapters.pop();
                break;
            }
        }

        emit AdapterRemoved(adapter);
    }

    // ============ QUOTING ============

    /// @notice Get quotes from all adapters for a swap
    function getAllQuotes(
        address tokenIn,
        address tokenOut,
        uint256 amountIn
    ) external view returns (PraxisStructs.Quote[] memory quotes) {
        quotes = new PraxisStructs.Quote[](adapters.length);

        for (uint256 i = 0; i < adapters.length; i++) {
            try IAdapter(adapters[i]).getQuote(tokenIn, tokenOut, amountIn)
                returns (uint256 amountOut, uint256 gasEstimate)
            {
                quotes[i] = PraxisStructs.Quote({
                    adapter: adapters[i],
                    name: IAdapter(adapters[i]).name(),
                    amountOut: amountOut,
                    gasEstimate: gasEstimate,
                    priceImpact: 0 // TODO: Calculate price impact
                });
            } catch {
                quotes[i] = PraxisStructs.Quote({
                    adapter: adapters[i],
                    name: IAdapter(adapters[i]).name(),
                    amountOut: 0,
                    gasEstimate: 0,
                    priceImpact: 0
                });
            }
        }
    }

    /// @notice Find the best route (highest output)
    function findBestRoute(
        address tokenIn,
        address tokenOut,
        uint256 amountIn
    ) public view returns (address bestAdapter, uint256 bestAmountOut) {
        for (uint256 i = 0; i < adapters.length; i++) {
            try IAdapter(adapters[i]).getQuote(tokenIn, tokenOut, amountIn)
                returns (uint256 amountOut, uint256)
            {
                if (amountOut > bestAmountOut) {
                    bestAmountOut = amountOut;
                    bestAdapter = adapters[i];
                }
            } catch {
                continue;
            }
        }
    }

    // ============ SWAPPING ============

    /// @notice Execute a swap through the best route
    function swap(
        address tokenIn,
        address tokenOut,
        uint256 amountIn,
        uint256 minAmountOut,
        address recipient,
        uint256 deadline
    ) external nonReentrant returns (uint256 amountOut) {
        if (block.timestamp > deadline) revert DeadlineExpired();

        (address bestAdapter, ) = findBestRoute(tokenIn, tokenOut, amountIn);
        if (bestAdapter == address(0)) revert NoRouteFound();

        IERC20(tokenIn).safeTransferFrom(msg.sender, address(this), amountIn);
        IERC20(tokenIn).safeIncreaseAllowance(bestAdapter, amountIn);

        amountOut = IAdapter(bestAdapter).swap(
            tokenIn,
            tokenOut,
            amountIn,
            minAmountOut,
            recipient,
            ""
        );

        if (amountOut < minAmountOut) revert InsufficientOutput(amountOut, minAmountOut);

        emit SwapExecuted(tokenIn, tokenOut, amountIn, amountOut, bestAdapter);
    }

    /// @notice Execute a swap through a specific adapter
    function swapVia(
        address adapter,
        address tokenIn,
        address tokenOut,
        uint256 amountIn,
        uint256 minAmountOut,
        address recipient,
        uint256 deadline
    ) external nonReentrant returns (uint256 amountOut) {
        if (block.timestamp > deadline) revert DeadlineExpired();
        if (!isAdapter[adapter]) revert InvalidAdapter();

        IERC20(tokenIn).safeTransferFrom(msg.sender, address(this), amountIn);
        IERC20(tokenIn).safeIncreaseAllowance(adapter, amountIn);

        amountOut = IAdapter(adapter).swap(
            tokenIn,
            tokenOut,
            amountIn,
            minAmountOut,
            recipient,
            ""
        );

        if (amountOut < minAmountOut) revert InsufficientOutput(amountOut, minAmountOut);

        emit SwapExecuted(tokenIn, tokenOut, amountIn, amountOut, adapter);
    }

    // ============ VIEW FUNCTIONS ============

    function getAdapters() external view returns (address[] memory) {
        return adapters;
    }

    function getAdapterCount() external view returns (uint256) {
        return adapters.length;
    }
}
```

### 4.9 PraxisGateway (`contracts/core/PraxisGateway.sol`)

```solidity
// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

import {IERC20} from "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import {SafeERC20} from "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import {ReentrancyGuard} from "@openzeppelin/contracts/security/ReentrancyGuard.sol";
import {PraxisStructs} from "../lib/PraxisStructs.sol";

interface ISwapRouter {
    function swap(address tokenIn, address tokenOut, uint256 amountIn, uint256 minAmountOut, address recipient, uint256 deadline) external returns (uint256);
    function findBestRoute(address tokenIn, address tokenOut, uint256 amountIn) external view returns (address, uint256);
    function getAllQuotes(address tokenIn, address tokenOut, uint256 amountIn) external view returns (PraxisStructs.Quote[] memory);
}

interface IYieldRouter {
    function deposit(address asset, uint256 amount, PraxisStructs.RiskLevel risk, address onBehalfOf) external returns (uint256);
    function withdraw(address asset, uint256 shares, address to) external returns (uint256);
    function getOptions(address asset, uint256 amount) external view returns (PraxisStructs.YieldOption[] memory);
}

interface IStrategyEngine {
    function execute(PraxisStructs.Action[] calldata actions, address user) external returns (bytes32);
    function executePreset(bytes32 presetId, address tokenIn, uint256 amountIn, address user) external returns (bytes32);
}

/// @title PraxisGateway - Unified entry point for Flare DeFi
/// @notice The gateway to digital asset finance on Flare
contract PraxisGateway is ReentrancyGuard {
    using SafeERC20 for IERC20;

    // Core components
    address public swapRouter;
    address public yieldRouter;
    address public strategyEngine;
    address public oracle;

    // FAsset registry
    mapping(address => bool) public isFAsset;
    address[] public supportedFAssets;

    // Owner
    address public owner;

    // Events
    event SwapExecuted(address indexed user, address tokenIn, address tokenOut, uint256 amountIn, uint256 amountOut);
    event StrategyExecuted(address indexed user, bytes32 strategyId, uint256 totalValue);
    event YieldDeposited(address indexed user, address protocol, address asset, uint256 amount);
    event FAssetAdded(address indexed fAsset);

    // Errors
    error Unauthorized();
    error DeadlineExpired();
    error ZeroAddress();

    constructor(
        address _swapRouter,
        address _yieldRouter,
        address _strategyEngine,
        address _oracle
    ) {
        if (_swapRouter == address(0)) revert ZeroAddress();
        swapRouter = _swapRouter;
        yieldRouter = _yieldRouter;
        strategyEngine = _strategyEngine;
        oracle = _oracle;
        owner = msg.sender;
    }

    // ============ SWAP FUNCTIONS ============

    /// @notice Swap any token for any token with best rate
    function swap(
        address tokenIn,
        address tokenOut,
        uint256 amountIn,
        uint256 minAmountOut,
        address recipient,
        uint256 deadline
    ) external nonReentrant returns (uint256 amountOut) {
        if (block.timestamp > deadline) revert DeadlineExpired();

        IERC20(tokenIn).safeTransferFrom(msg.sender, address(this), amountIn);
        IERC20(tokenIn).safeIncreaseAllowance(swapRouter, amountIn);

        amountOut = ISwapRouter(swapRouter).swap(
            tokenIn, tokenOut, amountIn, minAmountOut, recipient, deadline
        );

        emit SwapExecuted(msg.sender, tokenIn, tokenOut, amountIn, amountOut);
    }

    /// @notice Get best quote across all DEXs
    function getQuote(
        address tokenIn,
        address tokenOut,
        uint256 amountIn
    ) external view returns (address bestAdapter, uint256 bestAmountOut) {
        return ISwapRouter(swapRouter).findBestRoute(tokenIn, tokenOut, amountIn);
    }

    /// @notice Get all quotes from all DEXs
    function getAllQuotes(
        address tokenIn,
        address tokenOut,
        uint256 amountIn
    ) external view returns (PraxisStructs.Quote[] memory) {
        return ISwapRouter(swapRouter).getAllQuotes(tokenIn, tokenOut, amountIn);
    }

    // ============ YIELD FUNCTIONS ============

    /// @notice Deposit to earn yield (auto-routes to best opportunity)
    function deposit(
        address asset,
        uint256 amount,
        PraxisStructs.RiskLevel risk
    ) external nonReentrant returns (uint256 shares) {
        IERC20(asset).safeTransferFrom(msg.sender, address(this), amount);
        IERC20(asset).safeIncreaseAllowance(yieldRouter, amount);

        shares = IYieldRouter(yieldRouter).deposit(asset, amount, risk, msg.sender);

        emit YieldDeposited(msg.sender, yieldRouter, asset, amount);
    }

    /// @notice Get current best yield opportunities
    function getYieldOptions(
        address asset,
        uint256 amount
    ) external view returns (PraxisStructs.YieldOption[] memory) {
        return IYieldRouter(yieldRouter).getOptions(asset, amount);
    }

    // ============ STRATEGY FUNCTIONS ============

    /// @notice Execute a multi-step strategy
    function executeStrategy(
        PraxisStructs.Action[] calldata actions,
        uint256 deadline
    ) external nonReentrant returns (bytes32 strategyId) {
        if (block.timestamp > deadline) revert DeadlineExpired();

        strategyId = IStrategyEngine(strategyEngine).execute(actions, msg.sender);

        emit StrategyExecuted(msg.sender, strategyId, 0);
    }

    /// @notice Execute preset strategy (e.g., "FAsset -> Max Yield")
    function executePreset(
        bytes32 presetId,
        address tokenIn,
        uint256 amountIn,
        uint256 deadline
    ) external nonReentrant returns (bytes32 strategyId) {
        if (block.timestamp > deadline) revert DeadlineExpired();

        IERC20(tokenIn).safeTransferFrom(msg.sender, address(this), amountIn);
        IERC20(tokenIn).safeIncreaseAllowance(strategyEngine, amountIn);

        strategyId = IStrategyEngine(strategyEngine).executePreset(
            presetId, tokenIn, amountIn, msg.sender
        );

        emit StrategyExecuted(msg.sender, strategyId, amountIn);
    }

    // ============ FASSET FUNCTIONS ============

    /// @notice Add a supported FAsset
    function addFAsset(address fAsset) external {
        if (msg.sender != owner) revert Unauthorized();
        if (!isFAsset[fAsset]) {
            isFAsset[fAsset] = true;
            supportedFAssets.push(fAsset);
            emit FAssetAdded(fAsset);
        }
    }

    /// @notice Check if token is a supported FAsset
    function isSupportedFAsset(address token) external view returns (bool) {
        return isFAsset[token];
    }

    /// @notice Get all supported FAssets
    function getSupportedFAssets() external view returns (address[] memory) {
        return supportedFAssets;
    }

    // ============ ADMIN ============

    function transferOwnership(address newOwner) external {
        if (msg.sender != owner) revert Unauthorized();
        owner = newOwner;
    }
}
```

---

## 5. Implementation Phases

### Phase 1: Foundation

**Goal:** Project setup + FTSO integration

| Task | Description | Deliverable |
|------|-------------|-------------|
| 1.1 | Initialize Hardhat + Foundry hybrid setup | Compiling project |
| 1.2 | Configure Coston2 + Flare networks | Working RPC connections |
| 1.3 | Install Flare periphery contracts | FTSO v2 access |
| 1.4 | Implement FlareOracle.sol | Price feeds working |
| 1.5 | Write oracle unit tests | 100% coverage |
| 1.6 | Deploy oracle to Coston2 | Verified contract |

**Test Checkpoint 1:**
```bash
forge test --match-contract FlareOracleTest -vvv
# All tests pass
```

---

### Phase 2: DEX Aggregation

**Goal:** Best-rate swapping across all DEXs

| Task | Description | Deliverable |
|------|-------------|-------------|
| 2.1 | Create IAdapter interface | Standard adapter API |
| 2.2 | Create BaseAdapter abstract | Common functionality |
| 2.3 | Research SparkDEX V3 interface | ISparkDEXRouter.sol |
| 2.4 | Implement SparkDEXAdapter | V3 swap support |
| 2.5 | Research Enosys interface | IEnosysRouter.sol |
| 2.6 | Implement EnosysAdapter | Enosys swap support |
| 2.7 | Research BlazeSwap interface | V2-style router |
| 2.8 | Implement BlazeSwapAdapter | V2 swap support |
| 2.9 | Implement SwapRouter | Best-rate aggregation |
| 2.10 | Write adapter unit tests | All adapters tested |
| 2.11 | Write router integration tests | Aggregation tested |
| 2.12 | Deploy all to Coston2 | Swaps working |

**Test Checkpoint 2:**
```bash
forge test --match-contract SparkDEXAdapterTest -vvv
forge test --match-contract SwapRouterTest -vvv
# Verify: WFLR -> USDC routes through best DEX
```

---

### Phase 3: Yield Integration

**Goal:** Lending and staking with one click

| Task | Description | Deliverable |
|------|-------------|-------------|
| 3.1 | Create ILendingAdapter interface | Lending standard |
| 3.2 | Create IStakingAdapter interface | Staking standard |
| 3.3 | Research Kinetic (Compound-fork) | IKToken, IComptroller |
| 3.4 | Implement KineticAdapter | Supply/withdraw/borrow |
| 3.5 | Research Sceptre (sFLR) | ISceptre interface |
| 3.6 | Implement SceptreAdapter | Stake/unstake with cooldown |
| 3.7 | Implement YieldRouter | Best yield selection |
| 3.8 | Add risk-level filtering | Conservative/Moderate/Aggressive |
| 3.9 | Write integration tests | Cross-protocol tested |
| 3.10 | Deploy to Coston2 | Yield working |

**Test Checkpoint 3:**
```bash
forge test --match-contract KineticAdapterTest -vvv
forge test --match-contract SceptreAdapterTest -vvv
# Verify: Deposit WFLR -> routes to best yield option
```

---

### Phase 4: Perpetuals Integration

**Goal:** Leverage trading via SparkDEX Eternal

| Task | Description | Deliverable |
|------|-------------|-------------|
| 4.1 | Research SparkDEX Eternal interface | ISparkDEXEternal.sol |
| 4.2 | Create IPerpetualAdapter interface | Perpetuals standard |
| 4.3 | Implement SparkDEXEternalAdapter | Open/close/adjust positions |
| 4.4 | Add position management to Gateway | openPosition(), closePosition() |
| 4.5 | Implement funding rate queries | getFundingRate() |
| 4.6 | Add liquidation price calculation | getLiquidationPrice() |
| 4.7 | Write perpetual unit tests | All perp actions tested |
| 4.8 | Write integration tests | Perp + swap combos tested |
| 4.9 | Deploy to Coston2 | Perpetuals working |

**Test Checkpoint 4:**
```bash
forge test --match-contract SparkDEXEternalAdapterTest -vvv
forge test --match-contract Perpetuals -vvv
# Verify: Open 10x long BTC, close position, check P&L
```

---

### Phase 5: FAssets Support

**Goal:** First-class FAsset support

| Task | Description | Deliverable |
|------|-------------|-------------|
| 5.1 | Research FAsset contracts on Flare | IFAssetManager interface |
| 5.2 | Implement FAssetsAdapter | FAsset-aware handling |
| 5.3 | Add FXRP swap routing | FXRP -> any token |
| 5.4 | Add FBTC swap routing | FBTC -> any token |
| 5.5 | Add FDOGE swap routing | FDOGE -> any token |
| 5.6 | Create FAsset-optimized strategies | Preset yield strategies |
| 5.7 | Write FAsset flow tests | Full journey tested |
| 5.8 | Deploy to Coston2 | FAssets working |

**Test Checkpoint 5:**
```bash
forge test --match-contract FAssetsAdapterTest -vvv
# Verify: FXRP -> swap -> yield in one transaction
```

---

### Phase 6: Strategy Engine

**Goal:** Multi-step strategy execution

| Task | Description | Deliverable |
|------|-------------|-------------|
| 6.1 | Implement StrategyEngine.sol | Multi-action execution |
| 6.2 | Create Action parser | ActionType -> execution |
| 6.3 | Implement output chaining | Step N output -> Step N+1 input |
| 6.4 | Create preset strategies | "FXRP -> Max Yield" etc |
| 6.5 | Implement Batcher.sol | Gas optimization |
| 6.6 | Write strategy tests | All presets tested |
| 6.7 | Deploy to Coston2 | Strategies working |

**Preset Strategies:**
- `FXRP_MAX_YIELD`: FXRP -> swap to WFLR -> stake on Sceptre
- `FBTC_CONSERVATIVE`: FBTC -> swap to USDC -> supply to Kinetic
- `WFLR_LEVERAGE`: WFLR -> supply to Kinetic -> borrow USDC -> swap to WFLR -> repeat
- `DELTA_NEUTRAL`: Deposit to Kinetic + hedge with short perp on Eternal

**Test Checkpoint 6:**
```bash
forge test --match-contract StrategyEngineTest -vvv
# Verify: Multi-step strategy executes atomically
```

---

### Phase 7: PraxisGateway

**Goal:** Unified entry point

| Task | Description | Deliverable |
|------|-------------|-------------|
| 7.1 | Implement PraxisGateway.sol | Single entry point |
| 7.2 | Wire up SwapRouter | swap(), getQuote() |
| 7.3 | Wire up YieldRouter | deposit(), getYieldOptions() |
| 7.4 | Wire up StrategyEngine | executeStrategy(), executePreset() |
| 7.5 | Wire up PerpetualAdapter | openPosition(), closePosition() |
| 7.6 | Add FAsset registry | isFAsset(), getSupportedFAssets() |
| 7.7 | Security hardening | Reentrancy, access control |
| 7.8 | Full integration tests | End-to-end tested |
| 7.9 | Deploy to Coston2 | Gateway live |

**Test Checkpoint 7:**
```bash
forge test --match-contract PraxisGatewayTest -vvv
# Verify: All actions work through single gateway
```

---

### Phase 8: Security & Audit

**Goal:** Production-ready security

| Task | Description | Deliverable |
|------|-------------|-------------|
| 8.1 | Slither static analysis | No high/medium issues |
| 8.2 | Mythril symbolic analysis | No vulnerabilities |
| 8.3 | Fork testing against mainnet | Real liquidity tests |
| 8.4 | Flash loan attack testing | Economic security |
| 8.5 | Reentrancy testing | All paths safe |
| 8.6 | Access control audit | Ownership secure |
| 8.7 | Perpetual liquidation testing | Margin calls safe |
| 8.8 | External audit (optional) | Third-party review |
| 8.9 | Fix all findings | Issues resolved |

**Test Checkpoint 8:**
```bash
slither contracts/ --print human-summary
# No high or medium severity issues
```

---

### Phase 9: Mainnet Launch

**Goal:** Production deployment

| Task | Description | Deliverable |
|------|-------------|-------------|
| 9.1 | Pre-deployment checklist | All tests pass |
| 9.2 | Deploy FlareOracle | Mainnet oracle |
| 9.3 | Deploy all adapters | 6 adapters live (including Eternal) |
| 9.4 | Deploy SwapRouter | Aggregation live |
| 9.5 | Deploy YieldRouter | Yield live |
| 9.6 | Deploy StrategyEngine | Strategies live |
| 9.7 | Deploy PraxisGateway | Gateway live |
| 9.8 | Transfer to multisig | Secure ownership |
| 9.9 | Verify all contracts | Explorer verified |
| 9.10 | Small-scale testing | Real transactions |
| 9.11 | Monitoring setup | Alerts configured |
| 9.12 | Launch announcement | Public launch |

**Test Checkpoint 9:**
```bash
npx hardhat run scripts/validate/mainnetCheck.ts --network flare
# All contracts responding correctly
```

---

## 6. Testing Strategy

### 6.1 Test Levels

```
                    +-------------+
                    |    E2E      |  Manual mainnet testing
                   -+-------------+-
                +---------------------+
                |    Fork Tests       |  Real liquidity, forked state
               -+---------------------+-
            +---------------------------+
            |   Integration Tests       |  Contract interactions
           -+---------------------------+-
        +---------------------------------+
        |        Unit Tests               |  Individual functions
       -+---------------------------------+-
```

### 6.2 Test Coverage Requirements

| Contract | Min Coverage |
|----------|-------------|
| FlareOracle | 95% |
| All Adapters | 90% |
| SparkDEXEternalAdapter | 95% |
| SwapRouter | 95% |
| YieldRouter | 90% |
| StrategyEngine | 90% |
| PraxisGateway | 95% |

### 6.3 Test Commands

```bash
# Run all unit tests
forge test --match-path test/unit/

# Run integration tests
forge test --match-path test/integration/

# Run fork tests (Coston2)
forge test --fork-url https://coston2-api.flare.network/ext/C/rpc

# Run with coverage
forge coverage

# Run with gas report
forge test --gas-report
```

---

## 7. Deployment Strategy

### 7.1 Network Progression

```
+------------------+     +------------------+     +------------------+
|   Local Tests    | --> |     Coston2      | --> |  Flare Mainnet   |
|   (Foundry)      |     |   (Testnet)      |     |   (Production)   |
+------------------+     +------------------+     +------------------+
        |                        |                        |
        v                        v                        v
   Unit tests              Integration             Audited +
   Fork tests              Real protocols          Battle-tested
   Gas analysis            48h monitoring          Multisig owned
```

### 7.2 Deployment Order

1. FlareOracle (no dependencies)
2. DEX Adapters (SparkDEX, Enosys, BlazeSwap)
3. Yield Adapters (Kinetic, Sceptre)
4. Perpetual Adapter (SparkDEX Eternal)
5. SwapRouter (depends on DEX adapters)
6. YieldRouter (depends on yield adapters)
7. StrategyEngine (depends on routers + perp adapter)
8. PraxisGateway (depends on all)

### 7.3 Pre-Mainnet Checklist

- [ ] All Coston2 tests passing
- [ ] 48 hours stable on testnet
- [ ] Slither clean (no high/medium)
- [ ] Fork tests against mainnet pass
- [ ] Multisig wallet configured
- [ ] Emergency pause tested
- [ ] Monitoring configured

---

## 8. Contract Addresses

### 8.1 Flare Mainnet (TBD after deployment)

| Contract | Address | Verified |
|----------|---------|----------|
| FlareOracle | TBD | [ ] |
| SparkDEXAdapter | TBD | [ ] |
| SparkDEXEternalAdapter | TBD | [ ] |
| EnosysAdapter | TBD | [ ] |
| BlazeSwapAdapter | TBD | [ ] |
| KineticAdapter | TBD | [ ] |
| SceptreAdapter | TBD | [ ] |
| SwapRouter | TBD | [ ] |
| YieldRouter | TBD | [ ] |
| StrategyEngine | TBD | [ ] |
| PraxisGateway | TBD | [ ] |

### 8.2 Coston2 Testnet (TBD after deployment)

| Contract | Address | Verified |
|----------|---------|----------|
| FlareOracle | TBD | [ ] |
| SwapRouter | TBD | [ ] |
| PraxisGateway | TBD | [ ] |

### 8.3 External Protocol Addresses (Flare Mainnet)

| Protocol | Contract | Address |
|----------|----------|---------|
| SparkDEX | Router | `0x4a1E5A90e9943467FAd1acea1E7F0e5e88472a1e` |
| SparkDEX Eternal | Perpetuals | TBD (research required) |
| Kinetic | Comptroller | `0x15F69897E6aEBE0463401345543C26d1Fd994abB` |
| Sceptre | sFLR | `0x12e605bc104e93b45e1ad99f9e555f659051c2bb` |
| - | WFLR | `0x1d80c49bbbcd1c0911346656b529df9e5c2f783d` |
| - | USDC | `0xFbDa5F676cB37624f28265A144A48B0d6e87d3b6` |
| FAssets | FXRP | TBD |
| FAssets | FBTC | TBD |
| FAssets | FDOGE | TBD |

---

## Revenue Model

| Source | How It Works | Target |
|--------|--------------|--------|
| Swap Fee | 0.05% on aggregated swaps | Competitive with 1inch |
| Strategy Fee | 0.1% on strategy execution | Value-add for complexity |
| Yield Fee | 5% of earned yield | Performance-based |
| Perp Fee | 0.02% on position open/close | Competitive with GMX |

**Note:** All fees optional. Users can always go direct to protocols.

---

## Success Metrics

| Metric | Target (6 months) |
|--------|-------------------|
| Total Value Routed | $10M+ |
| Unique Users | 1,000+ |
| FAsset Volume | $1M+ |
| DEX Market Share | 20%+ of Flare DEX volume |
| Perp Volume | $5M+ |
| Open Interest | $500K+ |

---

## The Pitch

**For Retail Users:**
> "Your gateway to Flare DeFi. Swap, earn, stake - all in one place. Best rates guaranteed. No complexity."

**For Flare Ecosystem:**
> "PRAXIS brings users to Flare. More volume for DEXs. More TVL for lending/staking. More FAsset adoption. Rising tide lifts all boats."

**For Investors:**
> "PRAXIS is the interface layer for Flare's vision of seamless digital asset finance. Hundreds of trillions TAM, starting with XRP's $25B+ community."

---

## Verification Plan

### Unit Tests
- Each adapter tested in isolation
- Each router tested in isolation
- Gateway tested with mocked routers

### Integration Tests
- Swap aggregation finds correct best route
- Yield routing selects optimal protocol
- Strategy execution chains correctly

### Fork Tests
- Against Coston2 testnet
- Against Flare mainnet (forked)
- Real liquidity, real protocol responses

### Manual Test Scenarios
1. User with FXRP swaps to WFLR (verify best rate used)
2. User deposits USDC to earn yield (verify optimal protocol selected)
3. User executes "FXRP -> Max Yield" strategy (verify all steps execute)
4. User withdraws from yield position (verify correct amounts)
5. User opens 10x long BTC perp (verify position created correctly)
6. User adds margin to existing position (verify leverage decreases)
7. User closes perp position (verify P&L calculated correctly)
8. User executes delta-neutral strategy (verify hedge + yield in one tx)
