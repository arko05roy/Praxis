'use client';

import { useReadContract, useWriteContract, useWaitForTransactionReceipt, useChainId } from 'wagmi';
import { PraxisGatewayABI, SettlementEngineABI } from '../contracts/abis';
import { getAddresses } from '../contracts/addresses';

// =============================================================
//                   SETTLEMENT RESULT TYPE
// =============================================================

export interface SettlementResult {
  ertId: bigint;
  totalPnl: bigint; // Can be negative
  lpBaseFee: bigint;
  lpProfitShare: bigint;
  insuranceFee: bigint;
  executorProfit: bigint;
  capitalReturned: bigint;
  stakeReturned: bigint;
  stakeSlashed: bigint;
  // Calculated fields
  isProfitable: boolean;
  totalLpFees: bigint;
}

// =============================================================
//                 ESTIMATE SETTLEMENT HOOK
// =============================================================

export function useEstimateSettlement(ertId: bigint | undefined) {
  const chainId = useChainId();
  const addresses = getAddresses(chainId);

  const { data, isLoading, error, refetch } = useReadContract({
    address: addresses.PraxisGateway,
    abi: PraxisGatewayABI,
    functionName: 'estimateSettlement',
    args: ertId !== undefined ? [ertId] : undefined,
    query: {
      enabled: ertId !== undefined,
    },
  });

  const result: SettlementResult | undefined = data
    ? {
        ertId: data.ertId,
        totalPnl: data.totalPnl,
        lpBaseFee: data.lpBaseFee,
        lpProfitShare: data.lpProfitShare,
        insuranceFee: data.insuranceFee,
        executorProfit: data.executorProfit,
        capitalReturned: data.capitalReturned,
        stakeReturned: data.stakeReturned,
        stakeSlashed: data.stakeSlashed,
        isProfitable: data.totalPnl > 0n,
        totalLpFees: data.lpBaseFee + data.lpProfitShare,
      }
    : undefined;

  return {
    data: result,
    isLoading,
    error,
    refetch,
  };
}

// =============================================================
//                    ESTIMATE PNL HOOK
// =============================================================

export function useEstimatePnl(ertId: bigint | undefined) {
  const chainId = useChainId();
  const addresses = getAddresses(chainId);

  const { data: pnl, isLoading, error, refetch } = useReadContract({
    address: addresses.PraxisGateway,
    abi: PraxisGatewayABI,
    functionName: 'estimatePnl',
    args: ertId !== undefined ? [ertId] : undefined,
    query: {
      enabled: ertId !== undefined,
    },
  });

  return {
    data: pnl,
    isProfitable: pnl !== undefined ? pnl > 0n : undefined,
    isLoading,
    error,
    refetch,
  };
}

// =============================================================
//                   FEE BREAKDOWN HOOK
// =============================================================

export interface FeeBreakdown {
  lpBaseFee: bigint;
  lpProfitShare: bigint;
  executorProfit: bigint;
  insuranceFee: bigint;
  stakeSlashed: bigint;
}

export function useFeeBreakdown(ertId: bigint | undefined, pnl: bigint | undefined) {
  const chainId = useChainId();
  const addresses = getAddresses(chainId);

  const { data, isLoading, error, refetch } = useReadContract({
    address: addresses.SettlementEngine,
    abi: SettlementEngineABI,
    functionName: 'calculateFeeBreakdown',
    args: ertId !== undefined && pnl !== undefined ? [ertId, pnl] : undefined,
    query: {
      enabled: ertId !== undefined && pnl !== undefined,
    },
  });

  const breakdown: FeeBreakdown | undefined = data
    ? {
        lpBaseFee: data[0],
        lpProfitShare: data[1],
        executorProfit: data[2],
        insuranceFee: data[3],
        stakeSlashed: data[4],
      }
    : undefined;

  return {
    data: breakdown,
    isLoading,
    error,
    refetch,
  };
}

// =============================================================
//                   CAN SETTLE HOOK
// =============================================================

export interface CanSettleResult {
  canSettle: boolean;
  reason: string;
}

export function useCanSettle(ertId: bigint | undefined) {
  const chainId = useChainId();
  const addresses = getAddresses(chainId);

  const { data, isLoading, error, refetch } = useReadContract({
    address: addresses.SettlementEngine,
    abi: SettlementEngineABI,
    functionName: 'canSettle',
    args: ertId !== undefined ? [ertId] : undefined,
    query: {
      enabled: ertId !== undefined,
    },
  });

  const result: CanSettleResult | undefined = data
    ? {
        canSettle: data[0],
        reason: data[1],
      }
    : undefined;

  return {
    data: result,
    isLoading,
    error,
    refetch,
  };
}

// =============================================================
//                 CAN FORCE SETTLE HOOK
// =============================================================

export function useCanForceSettle(ertId: bigint | undefined) {
  const chainId = useChainId();
  const addresses = getAddresses(chainId);

  const { data: canForceSettle, isLoading, error, refetch } = useReadContract({
    address: addresses.SettlementEngine,
    abi: SettlementEngineABI,
    functionName: 'canForceSettle',
    args: ertId !== undefined ? [ertId] : undefined,
    query: {
      enabled: ertId !== undefined,
    },
  });

  return {
    data: canForceSettle,
    isLoading,
    error,
    refetch,
  };
}

// =============================================================
//                    SETTLE ERT HOOK
// =============================================================

export function useSettleERT() {
  const chainId = useChainId();
  const addresses = getAddresses(chainId);

  const { writeContract, data: hash, isPending, error } = useWriteContract();

  const { isLoading: isConfirming, isSuccess, data: receipt } = useWaitForTransactionReceipt({
    hash,
  });

  const settle = async (ertId: bigint) => {
    writeContract({
      address: addresses.PraxisGateway,
      abi: PraxisGatewayABI,
      functionName: 'settleRights',
      args: [ertId],
    });
  };

  return {
    settle,
    hash,
    isPending,
    isConfirming,
    isSuccess,
    receipt,
    error,
  };
}

// =============================================================
//                  FORCE SETTLE HOOK
// =============================================================

export function useForceSettleERT() {
  const chainId = useChainId();
  const addresses = getAddresses(chainId);

  const { writeContract, data: hash, isPending, error } = useWriteContract();

  const { isLoading: isConfirming, isSuccess, data: receipt } = useWaitForTransactionReceipt({
    hash,
  });

  const forceSettle = async (ertId: bigint) => {
    writeContract({
      address: addresses.PraxisGateway,
      abi: PraxisGatewayABI,
      functionName: 'forceSettleRights',
      args: [ertId],
    });
  };

  return {
    forceSettle,
    hash,
    isPending,
    isConfirming,
    isSuccess,
    receipt,
    error,
  };
}
