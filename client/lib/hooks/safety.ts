'use client';

import { useReadContract, useChainId } from 'wagmi';
import { CircuitBreakerABI, InsuranceFundABI, UtilizationControllerABI } from '../contracts/abis';
import { getAddresses } from '../contracts/addresses';

// =============================================================
//                 CIRCUIT BREAKER STATUS HOOK
// =============================================================

export interface CircuitBreakerStatus {
  isTripped: boolean;
  canExecute: boolean;
  cooldownEndTime: bigint;
  dailyLoss: bigint;
  dailyLossLimit: bigint;
  remainingCooldown: number; // in seconds
  lossPercentage: number; // daily loss as % of limit
}

export function useCircuitBreakerStatus() {
  const chainId = useChainId();
  const addresses = getAddresses(chainId);

  const { data: isTripped, isLoading: trippedLoading } = useReadContract({
    address: addresses.CircuitBreaker,
    abi: CircuitBreakerABI,
    functionName: 'isTripped',
  });

  const { data: canExecute, isLoading: executeLoading } = useReadContract({
    address: addresses.CircuitBreaker,
    abi: CircuitBreakerABI,
    functionName: 'canExecute',
  });

  const { data: cooldownEndTime, isLoading: cooldownLoading } = useReadContract({
    address: addresses.CircuitBreaker,
    abi: CircuitBreakerABI,
    functionName: 'cooldownEndTime',
  });

  const { data: dailyLoss, isLoading: lossLoading } = useReadContract({
    address: addresses.CircuitBreaker,
    abi: CircuitBreakerABI,
    functionName: 'dailyLoss',
  });

  const { data: dailyLossLimit, isLoading: limitLoading } = useReadContract({
    address: addresses.CircuitBreaker,
    abi: CircuitBreakerABI,
    functionName: 'dailyLossLimit',
  });

  const isLoading = trippedLoading || executeLoading || cooldownLoading || lossLoading || limitLoading;

  const now = Math.floor(Date.now() / 1000);

  const status: CircuitBreakerStatus | undefined =
    isTripped !== undefined &&
    canExecute !== undefined &&
    cooldownEndTime !== undefined &&
    dailyLoss !== undefined &&
    dailyLossLimit !== undefined
      ? {
          isTripped,
          canExecute,
          cooldownEndTime,
          dailyLoss,
          dailyLossLimit,
          remainingCooldown: Math.max(0, Number(cooldownEndTime) - now),
          lossPercentage: dailyLossLimit > 0n ? Number((dailyLoss * 10000n) / dailyLossLimit) / 100 : 0,
        }
      : undefined;

  return {
    data: status,
    isLoading,
  };
}

// =============================================================
//                 INSURANCE FUND STATUS HOOK
// =============================================================

export interface InsuranceFundStatus {
  totalFunds: bigint;
  targetSize: bigint;
  isFunded: boolean;
  fundingPercentage: number; // current funds as % of target
}

export function useInsuranceFundStatus() {
  const chainId = useChainId();
  const addresses = getAddresses(chainId);

  const { data: totalFunds, isLoading: fundsLoading } = useReadContract({
    address: addresses.InsuranceFund,
    abi: InsuranceFundABI,
    functionName: 'totalFunds',
  });

  const { data: targetSize, isLoading: targetLoading } = useReadContract({
    address: addresses.InsuranceFund,
    abi: InsuranceFundABI,
    functionName: 'targetSize',
  });

  const { data: isFunded, isLoading: fundedLoading } = useReadContract({
    address: addresses.InsuranceFund,
    abi: InsuranceFundABI,
    functionName: 'isFunded',
  });

  const isLoading = fundsLoading || targetLoading || fundedLoading;

  const status: InsuranceFundStatus | undefined =
    totalFunds !== undefined && targetSize !== undefined && isFunded !== undefined
      ? {
          totalFunds,
          targetSize,
          isFunded,
          fundingPercentage: targetSize > 0n ? Number((totalFunds * 10000n) / targetSize) / 100 : 0,
        }
      : undefined;

  return {
    data: status,
    isLoading,
  };
}

// =============================================================
//               CLAIMABLE INSURANCE AMOUNT HOOK
// =============================================================

export function useClaimableInsurance(amount: bigint | undefined) {
  const chainId = useChainId();
  const addresses = getAddresses(chainId);

  const { data: claimable, isLoading, error, refetch } = useReadContract({
    address: addresses.InsuranceFund,
    abi: InsuranceFundABI,
    functionName: 'claimableAmount',
    args: amount ? [amount] : undefined,
    query: {
      enabled: amount !== undefined && amount > 0n,
    },
  });

  return {
    data: claimable,
    isLoading,
    error,
    refetch,
  };
}

// =============================================================
//                UTILIZATION LIMITS HOOK
// =============================================================

export interface UtilizationStatus {
  currentUtilization: bigint;
  maxUtilizationBps: bigint;
  availableForAllocation: bigint;
  utilizationPercentage: number; // current as % (0-100)
  maxUtilizationPercentage: number; // max as % (0-100)
  canAllocate: boolean;
}

export function useUtilizationLimits() {
  const chainId = useChainId();
  const addresses = getAddresses(chainId);

  const { data: currentUtilization, isLoading: utilizationLoading } = useReadContract({
    address: addresses.UtilizationController,
    abi: UtilizationControllerABI,
    functionName: 'currentUtilization',
  });

  const { data: maxUtilizationBps, isLoading: maxLoading } = useReadContract({
    address: addresses.UtilizationController,
    abi: UtilizationControllerABI,
    functionName: 'maxUtilizationBps',
  });

  const { data: availableForAllocation, isLoading: availableLoading } = useReadContract({
    address: addresses.UtilizationController,
    abi: UtilizationControllerABI,
    functionName: 'availableForAllocation',
  });

  const isLoading = utilizationLoading || maxLoading || availableLoading;

  const status: UtilizationStatus | undefined =
    currentUtilization !== undefined && maxUtilizationBps !== undefined && availableForAllocation !== undefined
      ? {
          currentUtilization,
          maxUtilizationBps,
          availableForAllocation,
          utilizationPercentage: Number(currentUtilization) / 100, // Convert BPS to percentage
          maxUtilizationPercentage: Number(maxUtilizationBps) / 100,
          canAllocate: currentUtilization < maxUtilizationBps,
        }
      : undefined;

  return {
    data: status,
    isLoading,
  };
}

// =============================================================
//                 CAN ALLOCATE CHECK HOOK
// =============================================================

export function useCanAllocate(amount: bigint | undefined) {
  const chainId = useChainId();
  const addresses = getAddresses(chainId);

  const { data: canAllocate, isLoading, error, refetch } = useReadContract({
    address: addresses.UtilizationController,
    abi: UtilizationControllerABI,
    functionName: 'canAllocate',
    args: amount ? [amount] : undefined,
    query: {
      enabled: amount !== undefined && amount > 0n,
    },
  });

  return {
    data: canAllocate,
    isLoading,
    error,
    refetch,
  };
}
