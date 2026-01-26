// LP Hooks
export {
  useVaultInfo,
  useLPBalance,
  useApproveVault,
  useAllowance,
  useLPDeposit,
  useLPWithdraw,
  usePreviewDeposit,
  usePreviewRedeem,
  useTokenBalance,
  useVaultRedeem, // Direct ERC-4626 redeem fallback
  type VaultInfo,
  type LPBalance,
  type DepositResult,
} from './lp';

// Executor Hooks
export {
  useExecutorStatus,
  useExecutorReputation,
  useTierConfig,
  useRequiredStake,
  useMintERT,
  useMyERTCount,
  useExecutionRights,
  usePositions,
  useExecuteWithRights,
  // ERT Management
  useMyERTs,
  useERTByIndex,
  useERTValidity,
  useActiveERTsCount,
  useERTTimeRemaining,
  useERTDrawdownStatus,
  useERTCapitalUtilization,
  // Types
  type ExecutorStatus,
  type ExecutorReputation,
  type TierConfig,
  type MintERTParams,
  type ExecutionRights,
  type TrackedPosition,
  type ExecuteAction,
} from './executor';

// Settlement Hooks
export {
  useEstimateSettlement,
  useEstimatePnl,
  useFeeBreakdown,
  useCanSettle,
  useCanForceSettle,
  useSettleERT,
  useForceSettleERT,
  type SettlementResult,
  type FeeBreakdown,
  type CanSettleResult,
} from './settlement';

// Safety Hooks
export {
  useCircuitBreakerStatus,
  useInsuranceFundStatus,
  useClaimableInsurance,
  useUtilizationLimits,
  useCanAllocate,
  type CircuitBreakerStatus,
  type InsuranceFundStatus,
  type UtilizationStatus,
} from './safety';

// External Adapter Hooks (SparkDEX, Sceptre, Kinetic)
export {
  // SparkDEX (DEX)
  useSparkDEXQuote,
  useSparkDEXSwap,
  // Sceptre (Liquid Staking)
  useSceptreStats,
  useSceptreBalance,
  useSceptreStake,
  useSceptreUnstake,
  // Kinetic (Lending - Supply)
  useKineticBalance,
  useKineticSupply,
  useKineticWithdraw,
  useKineticMarkets,
  // Kinetic (Lending - Borrow)
  useKineticBorrowBalance,
  useKineticBorrowAPY,
  useKineticSupplyAPY,
  useKineticBorrow,
  useKineticRepay,
  useKineticEnterMarket,
  useKineticExitMarket,
  useKineticAccountHealth,
  useKineticCollateralStatus,
  useKineticMarketInfo,
  // Utilities
  useNativeBalance,
  useExternalProtocolsAvailable,
  // Types
  type SwapQuote,
  type SceptreStats,
  type KineticMarketData,
} from './adapters';

// =============================================================
//                    PERPETUALS (SparkDEX Eternal)
// =============================================================

export {
  // Market Data
  usePerpMarkets,
  usePerpMarketInfo,
  // Position Management
  usePerpPosition,
  useOpenPerpPosition,
  useClosePerpPosition,
  useAddMargin,
  useRemoveMargin,
  // Calculations
  useFundingRate,
  useLiquidationPrice,
  usePositionPnl,
  useMarkPrice,
  useIndexPrice,
  // User Positions
  useUserPerpPositions,
  // Types
  type PerpMarket,
  type PerpPosition,
  type OpenPositionParams,
  type ClosePositionParams,
} from './perpetuals';

// =============================================================
//                         FASSETS
// =============================================================

export {
  // FAsset Info
  useFAssetInfo,
  useFAssetBalance,
  useAllFAssetBalances,
  useFAssetAllowance,
  useFAssetApprove,
  useFAssetTransfer,
  useFAssetTotalSupply,
  // FAsset Discovery
  useIsFAsset,
  useAllFAssets,
  useFAssetPools,
  // Types
  type FAssetInfo,
  type FAssetBalance,
  type FAssetType,
} from './fassets';

// =============================================================
//                    ORACLE / PRICE FEEDS
// =============================================================

export {
  // FTSO v2 Price Feeds
  useFTSOPrice,
  useFlareOraclePrice,
  useEnhancedPrice,
  useTokenPriceUSD,
  useMultiplePrices,
  useCommonPrices,
  // Price Validation
  usePriceStaleness,
  useAvailableFeeds,
  usePriceWithValidation,
  // Utilities
  useCalculateValueUSD,
  useMaxPriceAge,
  // Types
  type PriceData,
  type EnhancedPriceData,
  type CommonPrices,
} from './oracle';

// =============================================================
//                    SWAP ROUTER / DEX AGGREGATION
// =============================================================

export {
  // Aggregated Routing
  useAllSwapQuotes,
  useBestSwapRoute,
  useAggregatedSwap,
  useSwapViaAdapter,
  useSupportsPair,
  useRegisteredAdapters,
  // BlazeSwap (V2)
  useBlazeSwapQuote,
  useBlazeSwapSwap,
  // Enosys (V3)
  useEnosysSwap,
  // Comparison & Analysis
  useCompareAllDEXQuotes,
  usePriceImpact,
  // Token Approval for SwapRouter
  useTokenAllowance,
  useSwapRouterAllowance,
  useApproveToken,
  useApproveForSwapRouter,
  // Types
  type SwapQuote as DEXQuote,
  type BestRoute,
  type SwapParams,
} from './swapRouter';

// =============================================================
//                    EXPOSURE MANAGEMENT
// =============================================================

export {
  // Single Asset Exposure
  useAssetExposure,
  useCanAddExposure,
  useRemainingCapacity,
  useExposureLimitCheck,
  // Portfolio Exposure
  useAllExposures,
  useExposureSummary,
  useDiversificationScore,
  // Types
  type AssetExposure,
  type ExposureSummary,
} from './exposure';
