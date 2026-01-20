# PRAXIS UI Components & Pages Plan

This document outlines the UI components and pages needed to showcase all features of the PRAXIS Execution Rights Protocol, mapping each component to the React hooks it will use.

---

## Table of Contents

1. [Pages Overview](#pages-overview)
2. [Page 1: Dashboard](#page-1-dashboard)
3. [Page 2: LP Portal](#page-2-lp-portal)
4. [Page 3: Executor Portal](#page-3-executor-portal)
5. [Page 4: ERT Management](#page-4-ert-management)
6. [Page 5: Trading Terminal](#page-5-trading-terminal)
7. [Page 6: Swap Aggregator](#page-6-swap-aggregator)
8. [Page 7: Yield Hub](#page-7-yield-hub)
9. [Page 8: Perpetuals Trading](#page-8-perpetuals-trading)
10. [Page 9: FAssets Portfolio](#page-9-fassets-portfolio)
11. [Page 10: System Health](#page-10-system-health)
12. [Shared Components](#shared-components)

---

## Pages Overview

| Page | Primary User | Purpose |
|------|--------------|---------|
| Dashboard | All | Overview of protocol stats and user positions |
| LP Portal | Liquidity Providers | Deposit/withdraw capital, view earnings |
| Executor Portal | Executors | Request ERTs, view reputation, manage strategies |
| ERT Management | Executors | View/manage active execution rights |
| Trading Terminal | Executors | Execute trades with ERT capital |
| Swap Aggregator | Executors | Find best swap rates across DEXs |
| Yield Hub | Executors | Deploy capital to yield strategies |
| Perpetuals Trading | Executors | Open/manage perpetual positions |
| FAssets Portfolio | All | View and manage FAsset holdings |
| System Health | All | Protocol safety metrics and status |

---

## Page 1: Dashboard

**Purpose:** High-level overview of the protocol and user's positions.

### Components

#### 1.1 ProtocolStatsCard
Displays key protocol metrics at a glance.

**Hooks Used:**
- `useVaultInfo()` - Total TVL, utilization rate
- `useExposureSummary()` - Total exposure, asset diversity
- `useInsuranceFundStatus()` - Insurance fund health

**UI Elements:**
- Total Value Locked (TVL)
- Capital Utilization Gauge
- Insurance Fund Status Bar
- Active ERTs Count

---

#### 1.2 UserPositionSummary
Shows the connected user's overall position.

**Hooks Used:**
- `useLPBalance()` - Vault shares and asset value
- `useMyERTs()` - Count of owned ERTs
- `useExecutorStatus()` - Executor authorization and tier
- `useNativeBalance()` - FLR balance

**UI Elements:**
- LP Position Value
- Active ERTs Badge
- Executor Tier Badge
- Wallet Balance

---

#### 1.3 PriceTickerBar
Live prices from Flare FTSO.

**Hooks Used:**
- `useCommonPrices()` - FLR, BTC, ETH, XRP, DOGE prices
- `usePriceStaleness()` - Check if prices are fresh

**UI Elements:**
- Horizontal scrolling price ticker
- Price change indicators (24h)
- Staleness warning icons

---

#### 1.4 RecentActivityFeed
Recent protocol activity.

**Hooks Used:**
- Event listeners (wagmi useWatchContractEvent)

**UI Elements:**
- List of recent deposits, withdrawals, ERT mints, settlements
- Timestamps and transaction links

---

#### 1.5 QuickActionsPanel
Fast access to common actions.

**Hooks Used:**
- `useExecutorStatus()` - Determines which actions to show
- `useLPBalance()` - Shows LP-specific actions if user has shares

**UI Elements:**
- "Deposit" button (for LPs)
- "Request ERT" button (for Executors)
- "View My ERTs" button
- "Swap" quick link

---

## Page 2: LP Portal

**Purpose:** Complete LP management - deposit, withdraw, track earnings.

### Components

#### 2.1 VaultInfoPanel
Current vault state and metrics.

**Hooks Used:**
- `useVaultInfo()` - Total assets, shares, utilization
- `useUtilizationLimits()` - Max allocation, available capacity

**UI Elements:**
- Total Assets Display
- Total Shares Display
- Utilization Progress Bar (current vs max)
- Available Capital for Allocation

---

#### 2.2 DepositForm
Form for depositing assets into the vault.

**Hooks Used:**
- `useTokenBalance()` - User's token balance
- `useAllowance()` - Current approval amount
- `useApproveVault()` - Approve tokens for deposit
- `useLPDeposit()` - Execute deposit
- `usePreviewDeposit()` - Preview shares to receive

**UI Elements:**
- Token Amount Input
- Max Button
- Approval Button (if needed)
- Deposit Button
- Preview: "You will receive X shares"
- Transaction Status Indicator

---

#### 2.3 WithdrawForm
Form for withdrawing from the vault.

**Hooks Used:**
- `useLPBalance()` - User's current shares
- `useLPWithdraw()` - Execute withdrawal
- `usePreviewRedeem()` - Preview assets to receive

**UI Elements:**
- Shares Amount Input (or percentage slider)
- Max Button
- Withdraw Button
- Preview: "You will receive X USDC"
- Transaction Status Indicator

---

#### 2.4 LPBalanceCard
Displays LP's current position.

**Hooks Used:**
- `useLPBalance()` - Shares and asset value
- `useVaultInfo()` - For calculating share of pool

**UI Elements:**
- Shares Balance (large number)
- USD Value Equivalent
- % of Pool Ownership
- Earnings Since Deposit (if trackable)

---

#### 2.5 YieldProjectionChart
Visual representation of potential yield.

**Hooks Used:**
- `useVaultInfo()` - Current vault metrics
- (Static data for projections)

**UI Elements:**
- Line chart showing projected earnings
- Toggle between Conservative/Moderate/Optimistic scenarios
- Comparison with other yield sources (Kinetic, earnXRP)

---

## Page 3: Executor Portal

**Purpose:** Executor onboarding, reputation viewing, ERT requests.

### Components

#### 3.1 ExecutorStatusCard
Current executor status and tier.

**Hooks Used:**
- `useExecutorStatus()` - Authorization and tier
- `useExecutorReputation()` - Full reputation data

**UI Elements:**
- Authorization Status Badge
- Current Tier (UNVERIFIED → ELITE)
- Tier Progress Bar
- Tier Benefits Preview

---

#### 3.2 ReputationDashboard
Detailed reputation metrics.

**Hooks Used:**
- `useExecutorReputation()` - All reputation fields
- `useTierConfig()` - Current tier configuration

**UI Elements:**
- Total Settlements Counter
- Profitable Settlements Counter
- Profit Rate Gauge
- Total Volume Traded
- Largest Loss Indicator
- Consecutive Wins/Losses Streak
- Whitelisted/Banned Status

---

#### 3.3 TierProgressTracker
Shows what's needed to reach next tier.

**Hooks Used:**
- `useExecutorReputation()` - Current stats
- `useTierConfig()` - Requirements for next tier

**UI Elements:**
- Current Tier Badge
- Progress bars for each requirement:
  - Settlements needed
  - Profit rate needed
  - Volume needed
- Next Tier Preview (unlocks at next tier)

---

#### 3.4 RequestERTForm
Form to request new Execution Rights.

**Hooks Used:**
- `useExecutorStatus()` - Check if authorized
- `useTierConfig()` - Get max capital limit for tier
- `useRequiredStake()` - Calculate required stake
- `useMintERT()` - Submit ERT request
- `useRegisteredAdapters()` - Available adapters for whitelist

**UI Elements:**
- Capital Amount Input (with tier max shown)
- Duration Selector (days)
- Leverage Limit Slider
- Max Drawdown Slider
- Adapter Whitelist Checkboxes
- Asset Whitelist Checkboxes
- Stake Amount Display (calculated)
- Request Button
- Transaction Status

---

#### 3.5 StakeCalculator
Preview stake requirements.

**Hooks Used:**
- `useRequiredStake()` - Calculate stake for given capital

**UI Elements:**
- Capital Input
- Calculated Stake Display
- Stake as % of Capital
- Native Token Balance Check

---

## Page 4: ERT Management

**Purpose:** View and manage active Execution Rights NFTs.

### Components

#### 4.1 ERTListView
Grid/list of all owned ERTs.

**Hooks Used:**
- `useMyERTs()` - Get all owned ERTs
- `useERTByIndex()` - Get token ID at each index
- `useExecutionRights()` - Get details for each ERT

**UI Elements:**
- Grid of ERT Cards
- Filter by Status (Active, Expired, Settled)
- Sort by Expiry/Capital/Created

---

#### 4.2 ERTCard
Individual ERT summary card.

**Hooks Used:**
- `useExecutionRights()` - Full ERT data
- `useERTValidity()` - Is valid, is expired
- `useERTTimeRemaining()` - Time until expiry
- `useERTDrawdownStatus()` - Current drawdown level

**UI Elements:**
- Token ID
- Status Badge (Active/Expired/Settled)
- Capital Limit
- Time Remaining Countdown
- Drawdown Progress Bar
- Quick Actions: View Details, Settle

---

#### 4.3 ERTDetailModal
Full ERT details in a modal.

**Hooks Used:**
- `useExecutionRights()` - Full ERT data
- `usePositions()` - All open positions for this ERT
- `useEstimatePnl()` - Current PnL estimate
- `useEstimateSettlement()` - Settlement preview
- `useERTCapitalUtilization()` - Capital deployed vs limit

**UI Elements:**
- Token ID & Status Header
- Executor Address
- Vault Address
- Capital Section:
  - Capital Limit
  - Capital Deployed
  - Available Capital
  - Utilization Bar
- Constraints Section:
  - Max Leverage
  - Max Drawdown
  - Allowed Adapters List
  - Allowed Assets List
- Fees Section:
  - Base Fee APR
  - Profit Share %
  - Staked Amount
- Status Section:
  - Realized PnL
  - Unrealized PnL
  - High Water Mark
  - Max Drawdown Hit
- Time Section:
  - Start Time
  - Expiry Time
  - Remaining Time
- Actions:
  - Execute Trade Button (if active)
  - Settle Button (if can settle)

---

#### 4.4 PositionsTable
Table of open positions for an ERT.

**Hooks Used:**
- `usePositions()` - All tracked positions

**UI Elements:**
- Table with columns:
  - Position ID
  - Adapter
  - Asset
  - Size
  - Entry Value
  - Current Value
  - PnL
  - Timestamp
- Position Type Badge (Long/Short/LP/etc.)

---

#### 4.5 SettlementPreview
Preview settlement outcome.

**Hooks Used:**
- `useEstimateSettlement()` - Full settlement breakdown
- `useCanSettle()` - Can settle and reason
- `useCanForceSettle()` - Can force settle

**UI Elements:**
- PnL Display (green/red)
- Fee Breakdown:
  - LP Base Fee
  - LP Profit Share
  - Insurance Fee
  - Executor Profit
- Stake Return/Slash Preview
- Capital Return Amount
- Settle Button
- Force Settle Button (if applicable)

---

## Page 5: Trading Terminal

**Purpose:** Execute trades using ERT capital.

### Components

#### 5.1 ERTSelector
Select which ERT to trade with.

**Hooks Used:**
- `useMyERTs()` - List of owned ERTs
- `useExecutionRights()` - Details for selection

**UI Elements:**
- Dropdown/Carousel of Active ERTs
- ERT ID, Capital Available, Time Remaining
- Current PnL for each

---

#### 5.2 ActionBuilder
Build execution actions.

**Hooks Used:**
- `useExecutionRights()` - Get allowed adapters/assets
- `useRegisteredAdapters()` - All available adapters
- `useExecuteWithRights()` - Submit actions

**UI Elements:**
- Add Action Button
- For each action:
  - Adapter Selector (filtered by ERT whitelist)
  - Action Type Selector
  - Parameters (varies by adapter)
  - Remove Action Button
- Total Actions Summary
- Execute All Button

---

#### 5.3 ConstraintChecker
Real-time constraint validation.

**Hooks Used:**
- `useExecutionRights()` - Get constraints
- `useERTDrawdownStatus()` - Current drawdown
- `useERTCapitalUtilization()` - Capital usage

**UI Elements:**
- Capital Limit: X / Y (progress bar)
- Leverage: Current vs Max
- Drawdown: Current vs Max (warning colors)
- Assets Used: List with check/x
- Adapters Used: List with check/x

---

#### 5.4 QuickTradePanel
Simplified trading for common operations.

**Hooks Used:**
- `useBestSwapRoute()` - Find best swap
- `useExecuteWithRights()` - Execute trade

**UI Elements:**
- From Token Selector
- To Token Selector
- Amount Input
- Best Route Preview
- One-Click Execute Button

---

## Page 6: Swap Aggregator

**Purpose:** Find best swap rates across Flare DEXs.

### Components

#### 6.1 SwapInterface
Main swap input interface.

**Hooks Used:**
- `useSupportsPair()` - Check if pair is supported
- `useTokenPriceUSD()` - Get token USD values

**UI Elements:**
- From Token Selector + Balance
- To Token Selector
- Amount Input
- Swap Direction Toggle

---

#### 6.2 QuotesComparison
Compare quotes from all DEXs.

**Hooks Used:**
- `useAllSwapQuotes()` - All adapter quotes
- `useBlazeSwapQuote()` - Direct BlazeSwap quote
- `useSparkDEXQuote()` - Direct SparkDEX quote

**UI Elements:**
- Ranked list of quotes:
  - DEX Name
  - Output Amount
  - Gas Estimate
  - Difference from Best
- "Best" badge on top result

---

#### 6.3 SwapExecutor
Execute the selected swap.

**Hooks Used:**
- `useAggregatedSwap()` - Use best route
- `useSwapViaAdapter()` - Use specific adapter
- `useBlazeSwapSwap()` - Direct BlazeSwap
- `useSparkDEXSwap()` - Direct SparkDEX
- `useEnosysSwap()` - Direct Enosys

**UI Elements:**
- Selected Route Display
- Slippage Setting
- Price Impact Warning
- Swap Button
- Transaction Status

---

#### 6.4 PriceImpactIndicator
Show price impact and warnings.

**Hooks Used:**
- `usePriceImpact()` - Calculate price impact

**UI Elements:**
- Price Impact Percentage
- Color coding: Green (<1%), Yellow (1-5%), Red (>5%)
- Warning message for high impact

---

## Page 7: Yield Hub

**Purpose:** Deploy capital to yield-generating strategies.

### Components

#### 7.1 SceptreStakingCard
Stake FLR for sFLR.

**Hooks Used:**
- `useSceptreStats()` - Pool stats, exchange rate, APY
- `useSceptreBalance()` - User's sFLR balance
- `useSceptreStake()` - Stake FLR
- `useSceptreUnstake()` - Request unstake

**UI Elements:**
- sFLR APY Display
- Exchange Rate Display
- Your sFLR Balance
- Stake Form:
  - FLR Amount Input
  - Preview sFLR Output
  - Stake Button
- Unstake Form:
  - sFLR Amount Input
  - Request Unstake Button

---

#### 7.2 KineticLendingCard
Supply to Kinetic lending.

**Hooks Used:**
- `useKineticMarkets()` - Available markets
- `useKineticBalance()` - User's kToken balance
- `useKineticSupplyAPY()` - Current supply rate
- `useKineticMarketInfo()` - Market utilization
- `useKineticSupply()` - Supply tokens
- `useKineticWithdraw()` - Withdraw tokens

**UI Elements:**
- Market Selector
- Supply APY Display
- Your Supply Balance
- Supply Form
- Withdraw Form

---

#### 7.3 KineticBorrowCard
Borrow from Kinetic.

**Hooks Used:**
- `useKineticAccountHealth()` - Account liquidity
- `useKineticBorrowBalance()` - Current borrow
- `useKineticBorrowAPY()` - Borrow rate
- `useKineticCollateralStatus()` - Collateral enabled
- `useKineticBorrow()` - Execute borrow
- `useKineticRepay()` - Repay debt
- `useKineticEnterMarket()` - Enable as collateral

**UI Elements:**
- Account Health Indicator
- Borrow Limit
- Current Borrow
- Borrow APY
- Enter Market Toggle
- Borrow Form
- Repay Form

---

#### 7.4 YieldComparisonTable
Compare yield across protocols.

**Hooks Used:**
- `useSceptreStats()` - Sceptre APY
- `useKineticSupplyAPY()` - Kinetic supply rates
- (Static data for comparison with earnXRP, etc.)

**UI Elements:**
- Table:
  - Protocol
  - Asset
  - APY
  - TVL
  - Risk Level
- Sort by APY

---

## Page 8: Perpetuals Trading

**Purpose:** Trade perpetual futures on SparkDEX Eternal.

### Components

#### 8.1 MarketSelector
Select perpetual market.

**Hooks Used:**
- `usePerpMarkets()` - List all markets

**UI Elements:**
- Market Dropdown (ETH-USD, BTC-USD, etc.)
- Market Badges (24h change, volume)

---

#### 8.2 MarketInfoPanel
Current market data.

**Hooks Used:**
- `usePerpMarketInfo()` - Full market data
- `useMarkPrice()` - Current mark price
- `useIndexPrice()` - Index/oracle price
- `useFundingRate()` - Current funding

**UI Elements:**
- Mark Price (large)
- Index Price
- Funding Rate (with direction)
- Max Leverage
- Total Open Interest (Long/Short)
- 24h Volume

---

#### 8.3 PositionPanel
User's current position.

**Hooks Used:**
- `usePerpPosition()` - Position data
- `usePositionPnl()` - Current PnL
- `useLiquidationPrice()` - Liq price

**UI Elements:**
- Position Direction (Long/Short badge)
- Entry Price
- Size
- Margin
- Leverage
- Unrealized PnL (green/red)
- Liquidation Price (warning if close)

---

#### 8.4 OrderForm
Place new orders.

**Hooks Used:**
- `useOpenPerpPosition()` - Open position
- `usePerpMarketInfo()` - Min size, max leverage

**UI Elements:**
- Long/Short Toggle
- Size Input
- Leverage Slider
- Margin Display (calculated)
- Acceptable Price (for slippage)
- Referrer Input (optional)
- Submit Order Button

---

#### 8.5 PositionManagement
Manage existing position.

**Hooks Used:**
- `useClosePerpPosition()` - Close position
- `useAddMargin()` - Add margin
- `useRemoveMargin()` - Remove margin

**UI Elements:**
- Close Position Form (partial or full)
- Add Margin Form
- Remove Margin Form
- Position Actions Tabs

---

## Page 9: FAssets Portfolio

**Purpose:** View and manage FAsset holdings (FXRP, FBTC, FDOGE).

### Components

#### 9.1 FAssetBalanceCards
Balance for each FAsset.

**Hooks Used:**
- `useAllFAssetBalances()` - All FAsset balances
- `useTokenPriceUSD()` - USD values

**UI Elements:**
- Card for each FAsset:
  - Token Icon
  - Balance
  - USD Value
  - 24h Change

---

#### 9.2 FAssetInfoPanel
Detailed FAsset information.

**Hooks Used:**
- `useFAssetInfo()` - Name, symbol, supply
- `useFAssetTotalSupply()` - Total supply

**UI Elements:**
- Token Details
- Total Supply
- Your % of Supply
- Associated Pools

---

#### 9.3 FAssetTransferForm
Transfer FAssets.

**Hooks Used:**
- `useFAssetBalance()` - Check balance
- `useFAssetTransfer()` - Execute transfer

**UI Elements:**
- Recipient Address Input
- Amount Input
- Max Button
- Transfer Button

---

#### 9.4 FAssetApprovalManager
Manage FAsset approvals.

**Hooks Used:**
- `useFAssetAllowance()` - Current allowance
- `useFAssetApprove()` - Set approval

**UI Elements:**
- Spender Address Input
- Current Allowance Display
- Approve Amount Input
- Approve / Approve Max Buttons

---

## Page 10: System Health

**Purpose:** Protocol safety metrics and monitoring.

### Components

#### 10.1 CircuitBreakerStatus
Circuit breaker state.

**Hooks Used:**
- `useCircuitBreakerStatus()` - Full CB status

**UI Elements:**
- Status Badge (Active/Tripped)
- Can Execute Indicator
- Daily Loss Progress Bar
- Cooldown Timer (if tripped)
- Loss % of Limit

---

#### 10.2 InsuranceFundPanel
Insurance fund health.

**Hooks Used:**
- `useInsuranceFundStatus()` - Fund status

**UI Elements:**
- Total Funds Display
- Target Size Display
- Funding Progress Bar
- Is Funded Badge
- Claimable Preview

---

#### 10.3 UtilizationGauge
Capital utilization visualization.

**Hooks Used:**
- `useUtilizationLimits()` - Utilization data

**UI Elements:**
- Gauge Chart (current vs max)
- Available for Allocation
- Can Allocate Badge
- Warning if near limit

---

#### 10.4 ExposureBreakdown
Asset exposure distribution.

**Hooks Used:**
- `useAllExposures()` - All asset exposures
- `useExposureSummary()` - Summary stats
- `useDiversificationScore()` - Diversification rating

**UI Elements:**
- Pie/Bar Chart of Exposure by Asset
- Assets at Limit (red)
- Assets Near Limit (yellow)
- Diversification Score Card
- Recommendations

---

#### 10.5 AssetExposureTable
Detailed exposure per asset.

**Hooks Used:**
- `useAllExposures()` - All exposures
- `useAssetExposure()` - Per-asset drill-down
- `useRemainingCapacity()` - Capacity left

**UI Elements:**
- Table:
  - Asset
  - Current Exposure
  - Max Allowed
  - Utilization %
  - Remaining Capacity
  - Status (OK/Near Limit/At Limit)

---

## Shared Components

### S1. WalletConnector
Wallet connection UI.

**Hooks Used:**
- wagmi `useAccount`, `useConnect`, `useDisconnect`
- `useNativeBalance()` - Show balance

**UI Elements:**
- Connect Button
- Connected Address Display
- Balance Display
- Disconnect Button

---

### S2. TransactionStatusModal
Shows transaction progress.

**Hooks Used:**
- `useWaitForTransactionReceipt()` - Transaction status

**UI Elements:**
- Pending Spinner
- Confirming Status
- Success with Link
- Error Message

---

### S3. TokenSelector
Reusable token selection dropdown.

**Hooks Used:**
- `useTokenPriceUSD()` - Price display
- `useTokenBalance()` - Balance display
- `useAllFAssets()` - Include FAssets

**UI Elements:**
- Token List with Search
- Token Icon, Name, Symbol
- Balance Display
- Price Display

---

### S4. PriceDisplay
Formatted price with FTSO data.

**Hooks Used:**
- `useFTSOPrice()` or `useFlareOraclePrice()` - Get price
- `usePriceStaleness()` - Check freshness

**UI Elements:**
- Price Value
- Decimals Formatted
- Staleness Warning
- Last Updated Time

---

### S5. AmountInput
Standardized amount input with formatting.

**Hooks Used:**
- Associated token balance hooks

**UI Elements:**
- Number Input
- Token Symbol Display
- USD Value Below
- Max Button
- Clear Button

---

### S6. TierBadge
Executor tier display.

**Hooks Used:**
- `useExecutorStatus()` or passed tier prop

**UI Elements:**
- Tier Name (UNVERIFIED → ELITE)
- Color coding per tier
- Icon per tier

---

### S7. CountdownTimer
Time remaining display.

**Hooks Used:**
- `useERTTimeRemaining()` or passed timestamp

**UI Elements:**
- Days, Hours, Minutes, Seconds
- Auto-updating
- Expired state

---

### S8. AddressDisplay
Formatted address with copy.

**UI Elements:**
- Truncated Address
- Copy Button
- Etherscan/Flarescan Link

---

### S9. NetworkIndicator
Current network status.

**Hooks Used:**
- wagmi `useChainId`, `useSwitchChain`
- `useExternalProtocolsAvailable()` - Protocol availability

**UI Elements:**
- Network Name Badge
- Switch Network Button
- Protocol Availability Indicators

---

## Hook-to-Component Matrix

| Hook | Components Using It |
|------|-------------------|
| `useVaultInfo()` | ProtocolStatsCard, VaultInfoPanel |
| `useLPBalance()` | UserPositionSummary, LPBalanceCard, WithdrawForm |
| `useLPDeposit()` | DepositForm |
| `useLPWithdraw()` | WithdrawForm |
| `useApproveVault()` | DepositForm |
| `useAllowance()` | DepositForm |
| `usePreviewDeposit()` | DepositForm |
| `usePreviewRedeem()` | WithdrawForm |
| `useTokenBalance()` | DepositForm, TokenSelector |
| `useExecutorStatus()` | UserPositionSummary, ExecutorStatusCard, RequestERTForm |
| `useExecutorReputation()` | ReputationDashboard, TierProgressTracker |
| `useTierConfig()` | TierProgressTracker, RequestERTForm |
| `useRequiredStake()` | RequestERTForm, StakeCalculator |
| `useMintERT()` | RequestERTForm |
| `useMyERTs()` | UserPositionSummary, ERTListView, ERTSelector |
| `useERTByIndex()` | ERTListView |
| `useExecutionRights()` | ERTCard, ERTDetailModal, ERTSelector, ActionBuilder |
| `usePositions()` | PositionsTable, ERTDetailModal |
| `useERTValidity()` | ERTCard |
| `useERTTimeRemaining()` | ERTCard, CountdownTimer |
| `useERTDrawdownStatus()` | ERTCard, ConstraintChecker |
| `useERTCapitalUtilization()` | ERTDetailModal, ConstraintChecker |
| `useExecuteWithRights()` | ActionBuilder, QuickTradePanel |
| `useEstimateSettlement()` | ERTDetailModal, SettlementPreview |
| `useEstimatePnl()` | ERTDetailModal |
| `useFeeBreakdown()` | SettlementPreview |
| `useCanSettle()` | SettlementPreview |
| `useCanForceSettle()` | SettlementPreview |
| `useSettleERT()` | SettlementPreview |
| `useForceSettleERT()` | SettlementPreview |
| `useCircuitBreakerStatus()` | CircuitBreakerStatus |
| `useInsuranceFundStatus()` | ProtocolStatsCard, InsuranceFundPanel |
| `useUtilizationLimits()` | VaultInfoPanel, UtilizationGauge |
| `useCanAllocate()` | UtilizationGauge |
| `useAllExposures()` | ExposureBreakdown, AssetExposureTable |
| `useAssetExposure()` | AssetExposureTable |
| `useExposureSummary()` | ProtocolStatsCard, ExposureBreakdown |
| `useDiversificationScore()` | ExposureBreakdown |
| `useRemainingCapacity()` | AssetExposureTable |
| `useFTSOPrice()` | PriceDisplay, PriceTickerBar |
| `useFlareOraclePrice()` | PriceDisplay |
| `useTokenPriceUSD()` | SwapInterface, FAssetBalanceCards, TokenSelector |
| `useCommonPrices()` | PriceTickerBar |
| `usePriceStaleness()` | PriceTickerBar, PriceDisplay |
| `useMultiplePrices()` | (Dashboard charts) |
| `useAllSwapQuotes()` | QuotesComparison |
| `useBestSwapRoute()` | QuickTradePanel |
| `useAggregatedSwap()` | SwapExecutor |
| `useSwapViaAdapter()` | SwapExecutor |
| `useBlazeSwapQuote()` | QuotesComparison |
| `useBlazeSwapSwap()` | SwapExecutor |
| `useSparkDEXQuote()` | QuotesComparison |
| `useSparkDEXSwap()` | SwapExecutor |
| `useEnosysSwap()` | SwapExecutor |
| `usePriceImpact()` | PriceImpactIndicator |
| `useSupportsPair()` | SwapInterface |
| `useRegisteredAdapters()` | ActionBuilder, RequestERTForm |
| `useSceptreStats()` | SceptreStakingCard, YieldComparisonTable |
| `useSceptreBalance()` | SceptreStakingCard |
| `useSceptreStake()` | SceptreStakingCard |
| `useSceptreUnstake()` | SceptreStakingCard |
| `useKineticMarkets()` | KineticLendingCard |
| `useKineticBalance()` | KineticLendingCard |
| `useKineticSupply()` | KineticLendingCard |
| `useKineticWithdraw()` | KineticLendingCard |
| `useKineticSupplyAPY()` | KineticLendingCard, YieldComparisonTable |
| `useKineticBorrowAPY()` | KineticBorrowCard |
| `useKineticBorrow()` | KineticBorrowCard |
| `useKineticRepay()` | KineticBorrowCard |
| `useKineticAccountHealth()` | KineticBorrowCard |
| `useKineticBorrowBalance()` | KineticBorrowCard |
| `useKineticCollateralStatus()` | KineticBorrowCard |
| `useKineticEnterMarket()` | KineticBorrowCard |
| `useKineticMarketInfo()` | KineticLendingCard |
| `usePerpMarkets()` | MarketSelector |
| `usePerpMarketInfo()` | MarketInfoPanel, OrderForm |
| `usePerpPosition()` | PositionPanel |
| `useMarkPrice()` | MarketInfoPanel |
| `useIndexPrice()` | MarketInfoPanel |
| `useFundingRate()` | MarketInfoPanel |
| `usePositionPnl()` | PositionPanel |
| `useLiquidationPrice()` | PositionPanel |
| `useOpenPerpPosition()` | OrderForm |
| `useClosePerpPosition()` | PositionManagement |
| `useAddMargin()` | PositionManagement |
| `useRemoveMargin()` | PositionManagement |
| `useFAssetInfo()` | FAssetInfoPanel |
| `useFAssetBalance()` | FAssetInfoPanel, FAssetTransferForm |
| `useAllFAssetBalances()` | FAssetBalanceCards |
| `useFAssetAllowance()` | FAssetApprovalManager |
| `useFAssetApprove()` | FAssetApprovalManager |
| `useFAssetTransfer()` | FAssetTransferForm |
| `useFAssetTotalSupply()` | FAssetInfoPanel |
| `useAllFAssets()` | TokenSelector |
| `useNativeBalance()` | UserPositionSummary, WalletConnector |
| `useExternalProtocolsAvailable()` | NetworkIndicator |

---

## Implementation Priority

### Phase 1: Core LP Experience
1. Dashboard (basic version)
2. LP Portal (full)
3. Shared Components (WalletConnector, TransactionStatusModal)

### Phase 2: Executor Basics
4. Executor Portal
5. ERT Management
6. System Health

### Phase 3: Trading Features
7. Swap Aggregator
8. Trading Terminal
9. Yield Hub

### Phase 4: Advanced Features
10. Perpetuals Trading
11. FAssets Portfolio
12. Dashboard (enhanced)

---

## Technology Recommendations

- **Framework:** Next.js 14+ (App Router)
- **Styling:** Tailwind CSS + shadcn/ui
- **State:** React Query (via wagmi) + Zustand for UI state
- **Charts:** Recharts or Tremor
- **Forms:** React Hook Form + Zod validation
- **Animations:** Framer Motion
- **Icons:** Lucide Icons

---

## File Structure Suggestion

```
client/
├── app/
│   ├── page.tsx                    # Dashboard
│   ├── lp/
│   │   └── page.tsx                # LP Portal
│   ├── executor/
│   │   └── page.tsx                # Executor Portal
│   ├── erts/
│   │   ├── page.tsx                # ERT List
│   │   └── [id]/page.tsx           # ERT Detail
│   ├── trade/
│   │   └── page.tsx                # Trading Terminal
│   ├── swap/
│   │   └── page.tsx                # Swap Aggregator
│   ├── yield/
│   │   └── page.tsx                # Yield Hub
│   ├── perps/
│   │   └── page.tsx                # Perpetuals
│   ├── fassets/
│   │   └── page.tsx                # FAssets Portfolio
│   └── health/
│       └── page.tsx                # System Health
├── components/
│   ├── dashboard/
│   ├── lp/
│   ├── executor/
│   ├── erts/
│   ├── trading/
│   ├── swap/
│   ├── yield/
│   ├── perps/
│   ├── fassets/
│   ├── health/
│   └── shared/
└── lib/
    ├── hooks/                      # (Already created)
    └── contracts/                  # (Already created)
```
