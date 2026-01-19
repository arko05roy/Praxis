# PRAXIS Frontend Hooks Documentation

> React hooks for interacting with the PRAXIS Protocol using wagmi v2

## Table of Contents

1. [Setup & Configuration](#setup--configuration)
2. [Contract ABIs & Addresses](#contract-abis--addresses)
3. [LP Hooks](#lp-hooks)
4. [Executor Hooks](#executor-hooks)
5. [Gateway Hooks](#gateway-hooks)
6. [Settlement Hooks](#settlement-hooks)
7. [Safety System Hooks](#safety-system-hooks)
8. [Utility Hooks](#utility-hooks)

---

## Setup & Configuration

### Install Dependencies

```bash
npm install wagmi viem @tanstack/react-query
```

### Contract Configuration

```typescript
// src/config/contracts.ts

export const PRAXIS_CONTRACTS = {
  // Core Contracts (deploy addresses from Phase1to7Complete test)
  PraxisGateway: "0x...", // Main entry point
  ExecutionVault: "0x...",
  ExecutionRightsNFT: "0x...",
  ExecutionController: "0x...",
  PositionManager: "0x...",
  ReputationManager: "0x...",
  SettlementEngine: "0x...",

  // Safety Contracts
  UtilizationController: "0x...",
  CircuitBreaker: "0x...",
  ExposureManager: "0x...",
  InsuranceFund: "0x...",

  // Oracle
  FlareOracle: "0x...",

  // Tokens
  VaultAsset: "0x...", // USDC or MockUSDC
} as const;

export const CHAIN_ID = 14; // Flare Mainnet (or 114 for Coston2)
```

### Wagmi Config

```typescript
// src/config/wagmi.ts

import { createConfig, http } from 'wagmi';
import { flare } from 'wagmi/chains';

export const config = createConfig({
  chains: [flare],
  transports: {
    [flare.id]: http(),
  },
});
```

---

## Contract ABIs & Addresses

### Import ABIs from artifacts

```typescript
// src/config/abis.ts

// Import ABIs from compiled artifacts
import PraxisGatewayABI from '../artifacts/contracts/core/PraxisGateway.sol/PraxisGateway.json';
import ExecutionVaultABI from '../artifacts/contracts/core/ExecutionVault.sol/ExecutionVault.json';
import ExecutionRightsNFTABI from '../artifacts/contracts/core/ExecutionRightsNFT.sol/ExecutionRightsNFT.json';
import ReputationManagerABI from '../artifacts/contracts/core/ReputationManager.sol/ReputationManager.json';
import SettlementEngineABI from '../artifacts/contracts/core/SettlementEngine.sol/SettlementEngine.json';
import UtilizationControllerABI from '../artifacts/contracts/core/UtilizationController.sol/UtilizationController.json';
import CircuitBreakerABI from '../artifacts/contracts/core/CircuitBreaker.sol/CircuitBreaker.json';
import InsuranceFundABI from '../artifacts/contracts/core/InsuranceFund.sol/InsuranceFund.json';

export const ABIS = {
  PraxisGateway: PraxisGatewayABI.abi,
  ExecutionVault: ExecutionVaultABI.abi,
  ExecutionRightsNFT: ExecutionRightsNFTABI.abi,
  ReputationManager: ReputationManagerABI.abi,
  SettlementEngine: SettlementEngineABI.abi,
  UtilizationController: UtilizationControllerABI.abi,
  CircuitBreaker: CircuitBreakerABI.abi,
  InsuranceFund: InsuranceFundABI.abi,
};
```

---

## LP Hooks

### useVaultInfo

Get current vault state including total assets, shares, and utilization.

```typescript
// src/hooks/useVaultInfo.ts

import { useReadContract } from 'wagmi';
import { PRAXIS_CONTRACTS, ABIS } from '../config';

export interface VaultInfo {
  totalAssets: bigint;
  totalShares: bigint;
  allocatedCapital: bigint;
  availableCapital: bigint;
  utilizationRate: bigint; // in bps (10000 = 100%)
}

export function useVaultInfo() {
  const { data, isLoading, error, refetch } = useReadContract({
    address: PRAXIS_CONTRACTS.PraxisGateway as `0x${string}`,
    abi: ABIS.PraxisGateway,
    functionName: 'getVaultInfo',
  });

  const vaultInfo: VaultInfo | undefined = data ? {
    totalAssets: data[0],
    totalShares: data[1],
    allocatedCapital: data[2],
    availableCapital: data[3],
    utilizationRate: data[4],
  } : undefined;

  return {
    vaultInfo,
    isLoading,
    error,
    refetch,
  };
}
```

### useLPDeposit

Deposit assets into the vault and receive shares.

```typescript
// src/hooks/useLPDeposit.ts

import { useWriteContract, useWaitForTransactionReceipt } from 'wagmi';
import { parseUnits } from 'viem';
import { PRAXIS_CONTRACTS, ABIS } from '../config';

export function useLPDeposit() {
  const {
    data: hash,
    writeContract,
    isPending,
    error: writeError
  } = useWriteContract();

  const {
    isLoading: isConfirming,
    isSuccess,
    error: txError
  } = useWaitForTransactionReceipt({ hash });

  const deposit = async (amount: string, decimals: number = 6) => {
    const amountBigInt = parseUnits(amount, decimals);

    writeContract({
      address: PRAXIS_CONTRACTS.PraxisGateway as `0x${string}`,
      abi: ABIS.PraxisGateway,
      functionName: 'deposit',
      args: [amountBigInt],
    });
  };

  return {
    deposit,
    hash,
    isPending,
    isConfirming,
    isSuccess,
    error: writeError || txError,
  };
}
```

### useLPWithdraw

Withdraw assets from the vault by burning shares.

```typescript
// src/hooks/useLPWithdraw.ts

import { useWriteContract, useWaitForTransactionReceipt } from 'wagmi';
import { parseUnits } from 'viem';
import { PRAXIS_CONTRACTS, ABIS } from '../config';

export function useLPWithdraw() {
  const {
    data: hash,
    writeContract,
    isPending,
    error: writeError
  } = useWriteContract();

  const {
    isLoading: isConfirming,
    isSuccess,
    error: txError
  } = useWaitForTransactionReceipt({ hash });

  const withdraw = async (shares: string, decimals: number = 6) => {
    const sharesBigInt = parseUnits(shares, decimals);

    writeContract({
      address: PRAXIS_CONTRACTS.PraxisGateway as `0x${string}`,
      abi: ABIS.PraxisGateway,
      functionName: 'withdraw',
      args: [sharesBigInt],
    });
  };

  return {
    withdraw,
    hash,
    isPending,
    isConfirming,
    isSuccess,
    error: writeError || txError,
  };
}
```

### useLPBalance

Get LP's vault shares and corresponding asset value.

```typescript
// src/hooks/useLPBalance.ts

import { useReadContract, useAccount } from 'wagmi';
import { PRAXIS_CONTRACTS, ABIS } from '../config';

export function useLPBalance() {
  const { address } = useAccount();

  const { data: shares, isLoading: sharesLoading } = useReadContract({
    address: PRAXIS_CONTRACTS.ExecutionVault as `0x${string}`,
    abi: ABIS.ExecutionVault,
    functionName: 'balanceOf',
    args: [address!],
    query: { enabled: !!address },
  });

  const { data: assets, isLoading: assetsLoading } = useReadContract({
    address: PRAXIS_CONTRACTS.ExecutionVault as `0x${string}`,
    abi: ABIS.ExecutionVault,
    functionName: 'convertToAssets',
    args: [shares || 0n],
    query: { enabled: !!shares },
  });

  return {
    shares: shares || 0n,
    assets: assets || 0n,
    isLoading: sharesLoading || assetsLoading,
  };
}
```

### useApproveVault

Approve the gateway to spend LP's tokens for deposit.

```typescript
// src/hooks/useApproveVault.ts

import { useWriteContract, useWaitForTransactionReceipt, useReadContract, useAccount } from 'wagmi';
import { parseUnits, erc20Abi } from 'viem';
import { PRAXIS_CONTRACTS } from '../config';

export function useApproveVault() {
  const { address } = useAccount();

  const {
    data: hash,
    writeContract,
    isPending
  } = useWriteContract();

  const { isLoading: isConfirming, isSuccess } = useWaitForTransactionReceipt({ hash });

  // Check current allowance
  const { data: allowance, refetch: refetchAllowance } = useReadContract({
    address: PRAXIS_CONTRACTS.VaultAsset as `0x${string}`,
    abi: erc20Abi,
    functionName: 'allowance',
    args: [address!, PRAXIS_CONTRACTS.PraxisGateway as `0x${string}`],
    query: { enabled: !!address },
  });

  const approve = async (amount: string, decimals: number = 6) => {
    const amountBigInt = parseUnits(amount, decimals);

    writeContract({
      address: PRAXIS_CONTRACTS.VaultAsset as `0x${string}`,
      abi: erc20Abi,
      functionName: 'approve',
      args: [PRAXIS_CONTRACTS.PraxisGateway as `0x${string}`, amountBigInt],
    });
  };

  return {
    approve,
    allowance: allowance || 0n,
    isPending,
    isConfirming,
    isSuccess,
    refetchAllowance,
  };
}
```

---

## Executor Hooks

### useExecutorStatus

Check if an address is authorized to execute and their tier.

```typescript
// src/hooks/useExecutorStatus.ts

import { useReadContract, useAccount } from 'wagmi';
import { PRAXIS_CONTRACTS, ABIS } from '../config';

export const TIER_NAMES = ['UNVERIFIED', 'NOVICE', 'VERIFIED', 'ESTABLISHED', 'ELITE'] as const;

export interface ExecutorStatus {
  isAuthorized: boolean;
  tier: number;
  tierName: string;
}

export function useExecutorStatus(executorAddress?: `0x${string}`) {
  const { address: connectedAddress } = useAccount();
  const address = executorAddress || connectedAddress;

  const { data, isLoading, error, refetch } = useReadContract({
    address: PRAXIS_CONTRACTS.PraxisGateway as `0x${string}`,
    abi: ABIS.PraxisGateway,
    functionName: 'checkExecutor',
    args: [address!],
    query: { enabled: !!address },
  });

  const status: ExecutorStatus | undefined = data ? {
    isAuthorized: data[0],
    tier: Number(data[1]),
    tierName: TIER_NAMES[Number(data[1])] || 'UNKNOWN',
  } : undefined;

  return {
    status,
    isLoading,
    error,
    refetch,
  };
}
```

### useRequiredStake

Get the required stake for a given capital amount based on executor's tier.

```typescript
// src/hooks/useRequiredStake.ts

import { useReadContract, useAccount } from 'wagmi';
import { parseUnits } from 'viem';
import { PRAXIS_CONTRACTS, ABIS } from '../config';

export function useRequiredStake(capitalAmount: string, decimals: number = 6) {
  const { address } = useAccount();
  const capitalBigInt = parseUnits(capitalAmount || '0', decimals);

  const { data: requiredStake, isLoading, error } = useReadContract({
    address: PRAXIS_CONTRACTS.PraxisGateway as `0x${string}`,
    abi: ABIS.PraxisGateway,
    functionName: 'getRequiredStake',
    args: [address!, capitalBigInt],
    query: { enabled: !!address && capitalBigInt > 0n },
  });

  return {
    requiredStake: requiredStake || 0n,
    isLoading,
    error,
  };
}
```

### useTierConfig

Get configuration for a specific tier.

```typescript
// src/hooks/useTierConfig.ts

import { useReadContract } from 'wagmi';
import { PRAXIS_CONTRACTS, ABIS } from '../config';

export interface TierConfig {
  maxCapital: bigint;
  stakeRequiredBps: bigint;
  maxDrawdownBps: bigint;
  allowedRiskLevel: number;
  settlementsRequired: bigint;
  profitRateBps: bigint;
  volumeRequired: bigint;
}

export function useTierConfig(tier: number) {
  const { data, isLoading, error } = useReadContract({
    address: PRAXIS_CONTRACTS.ReputationManager as `0x${string}`,
    abi: ABIS.ReputationManager,
    functionName: 'getTierConfig',
    args: [tier],
  });

  const config: TierConfig | undefined = data ? {
    maxCapital: data.maxCapital,
    stakeRequiredBps: data.stakeRequiredBps,
    maxDrawdownBps: data.maxDrawdownBps,
    allowedRiskLevel: data.allowedRiskLevel,
    settlementsRequired: data.settlementsRequired,
    profitRateBps: data.profitRateBps,
    volumeRequired: data.volumeRequired,
  } : undefined;

  return {
    config,
    isLoading,
    error,
  };
}
```

### useAllTierConfigs

Get all tier configurations at once.

```typescript
// src/hooks/useAllTierConfigs.ts

import { useReadContracts } from 'wagmi';
import { PRAXIS_CONTRACTS, ABIS } from '../config';
import { TierConfig, TIER_NAMES } from './useTierConfig';

export function useAllTierConfigs() {
  const contracts = TIER_NAMES.map((_, index) => ({
    address: PRAXIS_CONTRACTS.ReputationManager as `0x${string}`,
    abi: ABIS.ReputationManager,
    functionName: 'getTierConfig',
    args: [index],
  }));

  const { data, isLoading, error } = useReadContracts({ contracts });

  const configs = data?.map((result, index) => ({
    tier: index,
    name: TIER_NAMES[index],
    config: result.result as TierConfig | undefined,
  }));

  return {
    configs,
    isLoading,
    error,
  };
}
```

### useMintERT

Mint an Execution Rights Token (ERT).

```typescript
// src/hooks/useMintERT.ts

import { useWriteContract, useWaitForTransactionReceipt, useAccount } from 'wagmi';
import { parseUnits, parseEther } from 'viem';
import { PRAXIS_CONTRACTS, ABIS } from '../config';

export interface RiskConstraints {
  maxLeverage: number;
  maxDrawdownBps: number;
  maxPositionSizeBps: number;
  allowedAdapters: `0x${string}`[];
  allowedAssets: `0x${string}`[];
}

export interface FeeStructure {
  baseFeeAprBps: bigint;
  profitShareBps: bigint;
  stakedAmount: bigint;
}

export interface MintERTParams {
  capitalLimit: string; // In USDC units (e.g., "10000" for $10,000)
  durationDays: number;
  constraints: RiskConstraints;
  fees: {
    baseFeeAprBps: number; // 200 = 2%
    profitShareBps: number; // 2000 = 20%
  };
  stakeAmount: string; // In ETH/FLR units
}

export function useMintERT() {
  const { address } = useAccount();

  const {
    data: hash,
    writeContract,
    isPending,
    error: writeError
  } = useWriteContract();

  const {
    isLoading: isConfirming,
    isSuccess,
    data: receipt,
    error: txError
  } = useWaitForTransactionReceipt({ hash });

  const mintERT = async (params: MintERTParams) => {
    const capitalLimitBigInt = parseUnits(params.capitalLimit, 6);
    const durationSeconds = BigInt(params.durationDays * 24 * 60 * 60);
    const stakeAmountBigInt = parseEther(params.stakeAmount);

    const constraints = {
      maxLeverage: params.constraints.maxLeverage,
      maxDrawdownBps: params.constraints.maxDrawdownBps,
      maxPositionSizeBps: params.constraints.maxPositionSizeBps,
      allowedAdapters: params.constraints.allowedAdapters,
      allowedAssets: params.constraints.allowedAssets,
    };

    const fees = {
      baseFeeAprBps: BigInt(params.fees.baseFeeAprBps),
      profitShareBps: BigInt(params.fees.profitShareBps),
      stakedAmount: stakeAmountBigInt,
    };

    writeContract({
      address: PRAXIS_CONTRACTS.ExecutionRightsNFT as `0x${string}`,
      abi: ABIS.ExecutionRightsNFT,
      functionName: 'mint',
      args: [address!, capitalLimitBigInt, durationSeconds, constraints, fees],
      value: stakeAmountBigInt,
    });
  };

  // Extract ERT ID from receipt logs if available
  const ertId = receipt?.logs?.[0]?.topics?.[1]
    ? BigInt(receipt.logs[0].topics[1])
    : undefined;

  return {
    mintERT,
    hash,
    ertId,
    isPending,
    isConfirming,
    isSuccess,
    error: writeError || txError,
  };
}
```

### useExecutionRights

Get details of a specific ERT.

```typescript
// src/hooks/useExecutionRights.ts

import { useReadContract } from 'wagmi';
import { PRAXIS_CONTRACTS, ABIS } from '../config';

export interface ExecutionRights {
  tokenId: bigint;
  executor: `0x${string}`;
  vault: `0x${string}`;
  capitalLimit: bigint;
  startTime: bigint;
  expiryTime: bigint;
  constraints: {
    maxLeverage: number;
    maxDrawdownBps: number;
    maxPositionSizeBps: number;
    allowedAdapters: `0x${string}`[];
    allowedAssets: `0x${string}`[];
  };
  fees: {
    baseFeeAprBps: bigint;
    profitShareBps: bigint;
    stakedAmount: bigint;
  };
  status: {
    capitalDeployed: bigint;
    realizedPnl: bigint;
    unrealizedPnl: bigint;
    highWaterMark: bigint;
    isActive: boolean;
  };
  ertStatus: number;
}

export function useExecutionRights(ertId: bigint | undefined) {
  const { data, isLoading, error, refetch } = useReadContract({
    address: PRAXIS_CONTRACTS.PraxisGateway as `0x${string}`,
    abi: ABIS.PraxisGateway,
    functionName: 'getExecutionRights',
    args: [ertId!],
    query: { enabled: !!ertId },
  });

  return {
    rights: data as ExecutionRights | undefined,
    isLoading,
    error,
    refetch,
  };
}
```

### useMyERTs

Get all ERTs owned by the connected wallet.

```typescript
// src/hooks/useMyERTs.ts

import { useReadContract, useAccount } from 'wagmi';
import { PRAXIS_CONTRACTS, ABIS } from '../config';

export function useMyERTs() {
  const { address } = useAccount();

  // Get balance of ERTs
  const { data: balance } = useReadContract({
    address: PRAXIS_CONTRACTS.ExecutionRightsNFT as `0x${string}`,
    abi: ABIS.ExecutionRightsNFT,
    functionName: 'balanceOf',
    args: [address!],
    query: { enabled: !!address },
  });

  // Get token IDs by index (requires iterating)
  // Note: This is a simplified version - in production, use events or indexer
  const { data: tokenIds, isLoading, error } = useReadContract({
    address: PRAXIS_CONTRACTS.ExecutionRightsNFT as `0x${string}`,
    abi: ABIS.ExecutionRightsNFT,
    functionName: 'getExecutorERTs',
    args: [address!],
    query: { enabled: !!address },
  });

  return {
    balance: balance || 0n,
    tokenIds: tokenIds as bigint[] | undefined,
    isLoading,
    error,
  };
}
```

---

## Settlement Hooks

### useEstimateSettlement

Get estimated settlement values for an ERT.

```typescript
// src/hooks/useEstimateSettlement.ts

import { useReadContract } from 'wagmi';
import { PRAXIS_CONTRACTS, ABIS } from '../config';

export interface SettlementEstimate {
  ertId: bigint;
  totalPnl: bigint;
  lpBaseFee: bigint;
  lpProfitShare: bigint;
  executorProfit: bigint;
  insuranceFee: bigint;
  stakeSlashed: bigint;
  stakeReturned: bigint;
}

export function useEstimateSettlement(ertId: bigint | undefined) {
  const { data, isLoading, error, refetch } = useReadContract({
    address: PRAXIS_CONTRACTS.PraxisGateway as `0x${string}`,
    abi: ABIS.PraxisGateway,
    functionName: 'estimateSettlement',
    args: [ertId!],
    query: { enabled: !!ertId },
  });

  return {
    estimate: data as SettlementEstimate | undefined,
    isLoading,
    error,
    refetch,
  };
}
```

### useEstimatePnL

Get current PnL estimate for an ERT.

```typescript
// src/hooks/useEstimatePnL.ts

import { useReadContract } from 'wagmi';
import { PRAXIS_CONTRACTS, ABIS } from '../config';

export function useEstimatePnL(ertId: bigint | undefined) {
  const { data: pnl, isLoading, error, refetch } = useReadContract({
    address: PRAXIS_CONTRACTS.PraxisGateway as `0x${string}`,
    abi: ABIS.PraxisGateway,
    functionName: 'estimatePnl',
    args: [ertId!],
    query: { enabled: !!ertId },
  });

  return {
    pnl: pnl as bigint | undefined,
    isLoading,
    error,
    refetch,
  };
}
```

### useSettleERT

Settle an ERT and receive stake back.

```typescript
// src/hooks/useSettleERT.ts

import { useWriteContract, useWaitForTransactionReceipt } from 'wagmi';
import { PRAXIS_CONTRACTS, ABIS } from '../config';

export function useSettleERT() {
  const {
    data: hash,
    writeContract,
    isPending,
    error: writeError
  } = useWriteContract();

  const {
    isLoading: isConfirming,
    isSuccess,
    data: receipt,
    error: txError
  } = useWaitForTransactionReceipt({ hash });

  const settle = async (ertId: bigint) => {
    writeContract({
      address: PRAXIS_CONTRACTS.PraxisGateway as `0x${string}`,
      abi: ABIS.PraxisGateway,
      functionName: 'settleRights',
      args: [ertId],
    });
  };

  return {
    settle,
    hash,
    receipt,
    isPending,
    isConfirming,
    isSuccess,
    error: writeError || txError,
  };
}
```

### useFeeBreakdown

Calculate fee breakdown for a given PnL scenario.

```typescript
// src/hooks/useFeeBreakdown.ts

import { useReadContract } from 'wagmi';
import { parseUnits } from 'viem';
import { PRAXIS_CONTRACTS, ABIS } from '../config';

export interface FeeBreakdown {
  lpBaseFee: bigint;
  lpProfitShare: bigint;
  executorProfit: bigint;
  insuranceFee: bigint;
  stakeSlashed: bigint;
}

export function useFeeBreakdown(ertId: bigint | undefined, pnl: string) {
  const pnlBigInt = parseUnits(pnl || '0', 6);

  const { data, isLoading, error } = useReadContract({
    address: PRAXIS_CONTRACTS.SettlementEngine as `0x${string}`,
    abi: ABIS.SettlementEngine,
    functionName: 'calculateFeeBreakdown',
    args: [ertId!, pnlBigInt],
    query: { enabled: !!ertId },
  });

  const breakdown: FeeBreakdown | undefined = data ? {
    lpBaseFee: data[0],
    lpProfitShare: data[1],
    executorProfit: data[2],
    insuranceFee: data[3],
    stakeSlashed: data[4],
  } : undefined;

  return {
    breakdown,
    isLoading,
    error,
  };
}
```

---

## Safety System Hooks

### useCircuitBreakerStatus

Check if circuit breaker is active.

```typescript
// src/hooks/useCircuitBreakerStatus.ts

import { useReadContract } from 'wagmi';
import { PRAXIS_CONTRACTS, ABIS } from '../config';

export interface CircuitBreakerStatus {
  isPaused: boolean;
  dailyLossAccumulated: bigint;
  maxDailyLossBps: bigint;
  lastResetTimestamp: bigint;
}

export function useCircuitBreakerStatus() {
  const { data: isPaused } = useReadContract({
    address: PRAXIS_CONTRACTS.CircuitBreaker as `0x${string}`,
    abi: ABIS.CircuitBreaker,
    functionName: 'isPaused',
  });

  const { data: dailyLoss } = useReadContract({
    address: PRAXIS_CONTRACTS.CircuitBreaker as `0x${string}`,
    abi: ABIS.CircuitBreaker,
    functionName: 'dailyLossAccumulated',
  });

  const { data: maxLoss } = useReadContract({
    address: PRAXIS_CONTRACTS.CircuitBreaker as `0x${string}`,
    abi: ABIS.CircuitBreaker,
    functionName: 'maxDailyLossBps',
  });

  return {
    isPaused: isPaused || false,
    dailyLossAccumulated: dailyLoss || 0n,
    maxDailyLossBps: maxLoss || 500n,
  };
}
```

### useInsuranceFundStatus

Get insurance fund balance and coverage ratio.

```typescript
// src/hooks/useInsuranceFundStatus.ts

import { useReadContract } from 'wagmi';
import { PRAXIS_CONTRACTS, ABIS } from '../config';
import { useVaultInfo } from './useVaultInfo';

export interface InsuranceFundStatus {
  balance: bigint;
  coverageRatioBps: bigint;
}

export function useInsuranceFundStatus() {
  const { vaultInfo } = useVaultInfo();

  const { data, isLoading, error } = useReadContract({
    address: PRAXIS_CONTRACTS.InsuranceFund as `0x${string}`,
    abi: ABIS.InsuranceFund,
    functionName: 'fundStatus',
    args: [vaultInfo?.totalAssets || 0n],
    query: { enabled: !!vaultInfo },
  });

  return {
    balance: data?.[0] || 0n,
    coverageRatioBps: data?.[1] || 0n,
    isLoading,
    error,
  };
}
```

### useUtilizationLimits

Get utilization limits and current state.

```typescript
// src/hooks/useUtilizationLimits.ts

import { useReadContract } from 'wagmi';
import { PRAXIS_CONTRACTS, ABIS } from '../config';
import { useVaultInfo } from './useVaultInfo';

export function useUtilizationLimits() {
  const { vaultInfo } = useVaultInfo();

  const { data: maxUtilBps } = useReadContract({
    address: PRAXIS_CONTRACTS.UtilizationController as `0x${string}`,
    abi: ABIS.UtilizationController,
    functionName: 'maxUtilizationBps',
  });

  const { data: availableForAllocation } = useReadContract({
    address: PRAXIS_CONTRACTS.UtilizationController as `0x${string}`,
    abi: ABIS.UtilizationController,
    functionName: 'availableForAllocation',
    args: [vaultInfo?.totalAssets || 0n, vaultInfo?.allocatedCapital || 0n],
    query: { enabled: !!vaultInfo },
  });

  return {
    maxUtilizationBps: maxUtilBps || 7000n,
    currentUtilizationBps: vaultInfo?.utilizationRate || 0n,
    availableForAllocation: availableForAllocation || 0n,
  };
}
```

---

## Utility Hooks

### useTokenBalance

Get user's balance of a specific token.

```typescript
// src/hooks/useTokenBalance.ts

import { useReadContract, useAccount } from 'wagmi';
import { erc20Abi } from 'viem';

export function useTokenBalance(tokenAddress: `0x${string}`) {
  const { address } = useAccount();

  const { data: balance, isLoading, error, refetch } = useReadContract({
    address: tokenAddress,
    abi: erc20Abi,
    functionName: 'balanceOf',
    args: [address!],
    query: { enabled: !!address },
  });

  const { data: decimals } = useReadContract({
    address: tokenAddress,
    abi: erc20Abi,
    functionName: 'decimals',
  });

  const { data: symbol } = useReadContract({
    address: tokenAddress,
    abi: erc20Abi,
    functionName: 'symbol',
  });

  return {
    balance: balance || 0n,
    decimals: decimals || 18,
    symbol: symbol || '',
    isLoading,
    error,
    refetch,
  };
}
```

### useFormatCurrency

Format bigint values for display.

```typescript
// src/hooks/useFormatCurrency.ts

import { formatUnits } from 'viem';

export function useFormatCurrency() {
  const formatUSD = (value: bigint, decimals: number = 6): string => {
    const formatted = formatUnits(value, decimals);
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(Number(formatted));
  };

  const formatBps = (bps: bigint): string => {
    return `${(Number(bps) / 100).toFixed(2)}%`;
  };

  const formatShares = (shares: bigint, decimals: number = 6): string => {
    return formatUnits(shares, decimals);
  };

  const formatDuration = (seconds: bigint): string => {
    const days = Number(seconds) / (24 * 60 * 60);
    if (days >= 1) return `${days.toFixed(0)} days`;
    const hours = Number(seconds) / (60 * 60);
    return `${hours.toFixed(0)} hours`;
  };

  return {
    formatUSD,
    formatBps,
    formatShares,
    formatDuration,
  };
}
```

### useBlockTimestamp

Get current block timestamp for time calculations.

```typescript
// src/hooks/useBlockTimestamp.ts

import { useBlockNumber, useBlock } from 'wagmi';

export function useBlockTimestamp() {
  const { data: blockNumber } = useBlockNumber({ watch: true });
  const { data: block } = useBlock({ blockNumber });

  return {
    timestamp: block?.timestamp || 0n,
    blockNumber: blockNumber || 0n,
  };
}
```

---

## Combined Hooks for Common Use Cases

### usePraxisDashboard

Combined hook for dashboard overview.

```typescript
// src/hooks/usePraxisDashboard.ts

import { useVaultInfo } from './useVaultInfo';
import { useLPBalance } from './useLPBalance';
import { useExecutorStatus } from './useExecutorStatus';
import { useCircuitBreakerStatus } from './useCircuitBreakerStatus';
import { useInsuranceFundStatus } from './useInsuranceFundStatus';

export function usePraxisDashboard() {
  const vaultInfo = useVaultInfo();
  const lpBalance = useLPBalance();
  const executorStatus = useExecutorStatus();
  const circuitBreaker = useCircuitBreakerStatus();
  const insuranceFund = useInsuranceFundStatus();

  const isLoading =
    vaultInfo.isLoading ||
    lpBalance.isLoading ||
    executorStatus.isLoading;

  return {
    vault: vaultInfo.vaultInfo,
    lp: {
      shares: lpBalance.shares,
      assets: lpBalance.assets,
    },
    executor: executorStatus.status,
    safety: {
      circuitBreakerActive: circuitBreaker.isPaused,
      insuranceFundBalance: insuranceFund.balance,
    },
    isLoading,
    refetch: () => {
      vaultInfo.refetch();
      executorStatus.refetch();
    },
  };
}
```

---

## Example Usage in Components

### LP Deposit Component

```tsx
// src/components/LPDeposit.tsx

import { useState } from 'react';
import { useApproveVault } from '../hooks/useApproveVault';
import { useLPDeposit } from '../hooks/useLPDeposit';
import { useTokenBalance } from '../hooks/useTokenBalance';
import { PRAXIS_CONTRACTS } from '../config';
import { parseUnits } from 'viem';

export function LPDeposit() {
  const [amount, setAmount] = useState('');
  const { balance } = useTokenBalance(PRAXIS_CONTRACTS.VaultAsset as `0x${string}`);
  const { approve, allowance, isPending: approving } = useApproveVault();
  const { deposit, isPending: depositing, isSuccess } = useLPDeposit();

  const amountBigInt = parseUnits(amount || '0', 6);
  const needsApproval = allowance < amountBigInt;

  const handleSubmit = async () => {
    if (needsApproval) {
      await approve(amount);
    } else {
      await deposit(amount);
    }
  };

  return (
    <div>
      <input
        type="number"
        value={amount}
        onChange={(e) => setAmount(e.target.value)}
        placeholder="Amount (USDC)"
      />
      <p>Balance: {formatUnits(balance, 6)} USDC</p>

      <button
        onClick={handleSubmit}
        disabled={approving || depositing}
      >
        {needsApproval ? 'Approve' : 'Deposit'}
      </button>

      {isSuccess && <p>Deposit successful!</p>}
    </div>
  );
}
```

### Executor Dashboard Component

```tsx
// src/components/ExecutorDashboard.tsx

import { useExecutorStatus } from '../hooks/useExecutorStatus';
import { useMyERTs } from '../hooks/useMyERTs';
import { useAllTierConfigs } from '../hooks/useAllTierConfigs';
import { useFormatCurrency } from '../hooks/useFormatCurrency';

export function ExecutorDashboard() {
  const { status } = useExecutorStatus();
  const { tokenIds } = useMyERTs();
  const { configs } = useAllTierConfigs();
  const { formatUSD, formatBps } = useFormatCurrency();

  if (!status) return <div>Loading...</div>;

  const currentTierConfig = configs?.find(c => c.tier === status.tier)?.config;

  return (
    <div>
      <h2>Executor Status</h2>
      <p>Tier: {status.tierName}</p>
      <p>Authorized: {status.isAuthorized ? 'Yes' : 'No'}</p>

      {currentTierConfig && (
        <div>
          <h3>Tier Limits</h3>
          <p>Max Capital: {formatUSD(currentTierConfig.maxCapital)}</p>
          <p>Required Stake: {formatBps(currentTierConfig.stakeRequiredBps)}</p>
          <p>Max Drawdown: {formatBps(currentTierConfig.maxDrawdownBps)}</p>
        </div>
      )}

      <h3>My ERTs ({tokenIds?.length || 0})</h3>
      {tokenIds?.map(id => (
        <ERTCard key={id.toString()} ertId={id} />
      ))}
    </div>
  );
}
```

---

## Notes for Implementation

1. **Error Handling**: Add proper error boundaries and user-friendly error messages
2. **Loading States**: Implement skeleton loaders for better UX
3. **Caching**: Wagmi handles caching, but consider stale time for different queries
4. **Real-time Updates**: Use `watch: true` for values that change frequently
5. **Gas Estimation**: Add gas estimation before transactions
6. **Notifications**: Integrate with a toast library for transaction status

---

## Contract Events to Watch

```typescript
// Key events to subscribe to for real-time updates

// ExecutionVault
'Deposit(address indexed sender, address indexed owner, uint256 assets, uint256 shares)'
'Withdraw(address indexed sender, address indexed receiver, address indexed owner, uint256 assets, uint256 shares)'

// ExecutionRightsNFT
'RightsMinted(uint256 indexed tokenId, address indexed executor, uint256 capitalLimit)'
'RightsSettled(uint256 indexed tokenId, int256 finalPnl)'

// SettlementEngine
'SettlementComplete(uint256 indexed ertId, int256 totalPnl, uint256 lpBaseFee, uint256 lpProfitShare)'

// CircuitBreaker
'CircuitBreakerTriggered(uint256 totalLoss, uint256 lossBps)'
'CircuitBreakerReset()'
```
