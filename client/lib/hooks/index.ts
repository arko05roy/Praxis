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
  // Kinetic (Lending)
  useKineticBalance,
  useKineticSupply,
  useKineticWithdraw,
  useKineticMarkets,
  // Utilities
  useNativeBalance,
  useExternalProtocolsAvailable,
  // Types
  type SwapQuote,
  type SceptreStats,
  type KineticMarketData,
} from './adapters';
