'use client';

import { useState, useEffect } from 'react';

import { useReadContract, useWriteContract, useWaitForTransactionReceipt, useAccount, useChainId } from 'wagmi';
import { parseEther } from 'viem';
import { PraxisGatewayABI, ReputationManagerABI, ExecutionRightsNFTABI, ExecutorTier } from '../contracts/abis';
import { getAddresses } from '../contracts/addresses';

// =============================================================
//                    EXECUTOR STATUS HOOK
// =============================================================

export interface ExecutorStatus {
  isAuthorized: boolean;
  tier: number;
  tierName: string;
}

const TIER_NAMES = ['UNVERIFIED', 'NOVICE', 'VERIFIED', 'ESTABLISHED', 'ELITE'];

export function useExecutorStatus(executorAddress?: `0x${string}`) {
  const { address: connectedAddress } = useAccount();
  const chainId = useChainId();
  const addresses = getAddresses(chainId);

  const targetAddress = executorAddress ?? connectedAddress;

  const { data, isLoading, error, refetch } = useReadContract({
    address: addresses.PraxisGateway,
    abi: PraxisGatewayABI,
    functionName: 'checkExecutor',
    args: targetAddress ? [targetAddress] : undefined,
    query: {
      enabled: !!targetAddress,
    },
  });

  const status: ExecutorStatus | undefined = data
    ? {
      isAuthorized: data[0],
      tier: data[1],
      tierName: TIER_NAMES[data[1]] ?? 'UNKNOWN',
    }
    : undefined;

  return {
    data: status,
    isLoading,
    error,
    refetch,
  };
}

// =============================================================
//                    REPUTATION HOOK
// =============================================================

export interface ExecutorReputation {
  tier: number;
  tierName: string;
  totalSettlements: bigint;
  profitableSettlements: bigint;
  totalVolumeUsd: bigint;
  totalPnlUsd: bigint;
  largestLossBps: bigint;
  consecutiveProfits: bigint;
  consecutiveLosses: bigint;
  lastSettlementTime: bigint;
  isWhitelisted: boolean;
  isBanned: boolean;
  profitRate: number; // Calculated: profitableSettlements / totalSettlements * 100
}

export function useExecutorReputation(executorAddress?: `0x${string}`) {
  const { address: connectedAddress } = useAccount();
  const chainId = useChainId();
  const addresses = getAddresses(chainId);

  const targetAddress = executorAddress ?? connectedAddress;

  const { data, isLoading, error, refetch } = useReadContract({
    address: addresses.ReputationManager,
    abi: ReputationManagerABI,
    functionName: 'getReputation',
    args: targetAddress ? [targetAddress] : undefined,
    query: {
      enabled: !!targetAddress,
    },
  });

  const reputation: ExecutorReputation | undefined = data
    ? {
      tier: data.tier,
      tierName: TIER_NAMES[data.tier] ?? 'UNKNOWN',
      totalSettlements: data.totalSettlements,
      profitableSettlements: data.profitableSettlements,
      totalVolumeUsd: data.totalVolumeUsd,
      totalPnlUsd: data.totalPnlUsd,
      largestLossBps: data.largestLossBps,
      consecutiveProfits: data.consecutiveProfits,
      consecutiveLosses: data.consecutiveLosses,
      lastSettlementTime: data.lastSettlementTime,
      isWhitelisted: data.isWhitelisted,
      isBanned: data.isBanned,
      profitRate:
        data.totalSettlements > 0n
          ? Number((data.profitableSettlements * 10000n) / data.totalSettlements) / 100
          : 0,
    }
    : undefined;

  return {
    data: reputation,
    isLoading,
    error,
    refetch,
  };
}

// =============================================================
//                   TIER CONFIG HOOK
// =============================================================

export interface TierConfig {
  maxCapital: bigint;
  stakeRequiredBps: number;
  maxDrawdownBps: number;
  allowedRiskLevel: number;
  settlementsRequired: bigint;
  profitRateBps: number;
  volumeRequired: bigint;
}

export function useTierConfig(executorAddress?: `0x${string}`) {
  const { address: connectedAddress } = useAccount();
  const chainId = useChainId();
  const addresses = getAddresses(chainId);

  const targetAddress = executorAddress ?? connectedAddress;

  const { data, isLoading, error, refetch } = useReadContract({
    address: addresses.ReputationManager,
    abi: ReputationManagerABI,
    functionName: 'getExecutorTierConfig',
    args: targetAddress ? [targetAddress] : undefined,
    query: {
      enabled: !!targetAddress,
    },
  });

  const config: TierConfig | undefined = data
    ? {
      maxCapital: data.maxCapital,
      stakeRequiredBps: data.stakeRequiredBps,
      maxDrawdownBps: data.maxDrawdownBps,
      allowedRiskLevel: data.allowedRiskLevel,
      settlementsRequired: data.settlementsRequired,
      profitRateBps: data.profitRateBps,
      volumeRequired: data.volumeRequired,
    }
    : undefined;

  return {
    data: config,
    isLoading,
    error,
    refetch,
  };
}

// =============================================================
//                  REQUIRED STAKE HOOK
// =============================================================

export function useRequiredStake(capitalNeeded: bigint | undefined, executorAddress?: `0x${string}`) {
  const { address: connectedAddress } = useAccount();
  const chainId = useChainId();
  const addresses = getAddresses(chainId);

  const targetAddress = executorAddress ?? connectedAddress;

  const { data: requiredStake, isLoading, error, refetch } = useReadContract({
    address: addresses.PraxisGateway,
    abi: PraxisGatewayABI,
    functionName: 'getRequiredStake',
    args: targetAddress && capitalNeeded ? [targetAddress, capitalNeeded] : undefined,
    query: {
      enabled: !!targetAddress && !!capitalNeeded && capitalNeeded > 0n,
    },
  });

  return {
    data: requiredStake,
    isLoading,
    error,
    refetch,
  };
}

// =============================================================
//                     MINT ERT HOOK
// =============================================================

export interface MintERTParams {
  capitalNeeded: bigint;
  duration: bigint; // in seconds
  constraints: {
    maxLeverage: number;
    maxDrawdownBps: number;
    maxPositionSizeBps: number;
    allowedAdapters: `0x${string}`[];
    allowedAssets: `0x${string}`[];
  };
  fees: {
    baseFeeAprBps: number;
    profitShareBps: number;
  };
  stakeAmount: bigint; // in native token (FLR)
}

export function useMintERT() {
  const chainId = useChainId();
  const addresses = getAddresses(chainId);

  const { writeContract, data: hash, isPending, error } = useWriteContract();

  const { isLoading: isConfirming, isSuccess, data: receipt } = useWaitForTransactionReceipt({
    hash,
  });

  const mint = async (params: MintERTParams) => {
    writeContract({
      address: addresses.PraxisGateway,
      abi: PraxisGatewayABI,
      functionName: 'requestExecutionRights',
      args: [
        params.capitalNeeded,
        params.duration,
        {
          maxLeverage: params.constraints.maxLeverage,
          maxDrawdownBps: params.constraints.maxDrawdownBps,
          maxPositionSizeBps: params.constraints.maxPositionSizeBps,
          allowedAdapters: params.constraints.allowedAdapters,
          allowedAssets: params.constraints.allowedAssets,
        },
        {
          baseFeeAprBps: params.fees.baseFeeAprBps,
          profitShareBps: params.fees.profitShareBps,
        },
      ],
      value: params.stakeAmount,
    });
  };

  // Helper with default constraints
  const mintWithDefaults = async (
    capitalNeeded: bigint,
    durationDays: number,
    stakeAmount: bigint,
    allowedAdapters: `0x${string}`[] = [],
    allowedAssets: `0x${string}`[] = []
  ) => {
    const durationSeconds = BigInt(durationDays * 24 * 60 * 60);

    // Ensure ZKExecutor and other essential adapters are included
    const adapters = [...allowedAdapters];
    if (addresses.ZKExecutor && !adapters.includes(addresses.ZKExecutor)) {
      adapters.push(addresses.ZKExecutor);
    }
    if (addresses.SwapRouter && !adapters.includes(addresses.SwapRouter)) {
      adapters.push(addresses.SwapRouter);
    }
    if (addresses.MockSimpleDEX && !adapters.includes(addresses.MockSimpleDEX)) {
      adapters.push(addresses.MockSimpleDEX);
    }

    // Ensure assets are included (USDC, WFLR)
    const assets = [...allowedAssets];
    if (addresses.Asset && !assets.includes(addresses.Asset)) {
      assets.push(addresses.Asset);
    }
    if (addresses.MockWFLR && !assets.includes(addresses.MockWFLR)) {
      assets.push(addresses.MockWFLR);
    }

    mint({
      capitalNeeded,
      duration: durationSeconds,
      constraints: {
        maxLeverage: 2,
        maxDrawdownBps: 1000, // 10%
        maxPositionSizeBps: 5000, // 50%
        allowedAdapters: adapters,
        allowedAssets: assets,
      },
      fees: {
        baseFeeAprBps: 200, // 2%
        profitShareBps: 2000, // 20%
      },
      stakeAmount,
    });
  };

  return {
    mint,
    mintWithDefaults,
    hash,
    isPending,
    isConfirming,
    isSuccess,
    receipt,
    error,
  };
}

// =============================================================
//                    MY ERTS HOOK
// =============================================================

export function useMyERTCount() {
  const { address } = useAccount();
  const chainId = useChainId();
  const addresses = getAddresses(chainId);

  const { data: count, isLoading, error, refetch } = useReadContract({
    address: addresses.ExecutionRightsNFT,
    abi: ExecutionRightsNFTABI,
    functionName: 'balanceOf',
    args: address ? [address] : undefined,
    query: {
      enabled: !!address,
    },
  });

  return {
    data: count,
    isLoading,
    error,
    refetch,
  };
}

// =============================================================
//                  EXECUTION RIGHTS HOOK
// =============================================================

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
    allowedAdapters: readonly `0x${string}`[];
    allowedAssets: readonly `0x${string}`[];
  };
  fees: {
    baseFeeAprBps: number;
    profitShareBps: number;
    stakedAmount: bigint;
  };
  status: {
    capitalDeployed: bigint;
    realizedPnl: bigint;
    unrealizedPnl: bigint;
    highWaterMark: bigint;
    maxDrawdownHit: bigint;
  };
  ertStatus: number;
  ertStatusName: string;
  isExpired: boolean;
  remainingTime: number; // in seconds
}

const ERT_STATUS_NAMES = ['PENDING', 'ACTIVE', 'SETTLED', 'EXPIRED', 'LIQUIDATED'];

export function useExecutionRights(ertId: bigint | undefined) {
  const chainId = useChainId();
  const addresses = getAddresses(chainId);

  const { data, isLoading, error, refetch } = useReadContract({
    address: addresses.PraxisGateway,
    abi: PraxisGatewayABI,
    functionName: 'getExecutionRights',
    args: ertId !== undefined ? [ertId] : undefined,
    query: {
      enabled: ertId !== undefined,
    },
  });

  const [now, setNow] = useState<number>(0);
  useEffect(() => {
    // Update immediately after mount to match client time
    const initialTimer = setTimeout(() => setNow(Math.floor(Date.now() / 1000)), 0);
    const timer = setInterval(() => setNow(Math.floor(Date.now() / 1000)), 15000);
    return () => {
      clearTimeout(initialTimer);
      clearInterval(timer);
    };
  }, []);

  const rights: ExecutionRights | undefined = data
    ? {
      tokenId: data.tokenId,
      executor: data.executor as `0x${string}`,
      vault: data.vault as `0x${string}`,
      capitalLimit: data.capitalLimit,
      startTime: data.startTime,
      expiryTime: data.expiryTime,
      constraints: {
        maxLeverage: data.constraints.maxLeverage,
        maxDrawdownBps: data.constraints.maxDrawdownBps,
        maxPositionSizeBps: data.constraints.maxPositionSizeBps,
        allowedAdapters: data.constraints.allowedAdapters as readonly `0x${string}`[],
        allowedAssets: data.constraints.allowedAssets as readonly `0x${string}`[],
      },
      fees: {
        baseFeeAprBps: data.fees.baseFeeAprBps,
        profitShareBps: data.fees.profitShareBps,
        stakedAmount: data.fees.stakedAmount,
      },
      status: {
        capitalDeployed: data.status.capitalDeployed,
        realizedPnl: data.status.realizedPnl,
        unrealizedPnl: data.status.unrealizedPnl,
        highWaterMark: data.status.highWaterMark,
        maxDrawdownHit: data.status.maxDrawdownHit,
      },
      ertStatus: data.ertStatus,
      ertStatusName: ERT_STATUS_NAMES[data.ertStatus] ?? 'UNKNOWN',
      isExpired: Number(data.expiryTime) < now,
      remainingTime: Math.max(0, Number(data.expiryTime) - now),
    }
    : undefined;

  return {
    data: rights,
    isLoading,
    error,
    refetch,
  };
}

// =============================================================
//                    POSITIONS HOOK
// =============================================================

export interface TrackedPosition {
  ertId: bigint;
  adapter: `0x${string}`;
  positionId: `0x${string}`;
  asset: `0x${string}`;
  size: bigint;
  entryValueUsd: bigint;
  timestamp: bigint;
  positionType: number;
}

export function usePositions(ertId: bigint | undefined) {
  const chainId = useChainId();
  const addresses = getAddresses(chainId);

  const { data, isLoading, error, refetch } = useReadContract({
    address: addresses.PraxisGateway,
    abi: PraxisGatewayABI,
    functionName: 'getPositions',
    args: ertId !== undefined ? [ertId] : undefined,
    query: {
      enabled: ertId !== undefined,
    },
  });

  const positions: TrackedPosition[] | undefined = data
    ? data.map((p) => ({
      ertId: p.ertId,
      adapter: p.adapter as `0x${string}`,
      positionId: p.positionId as `0x${string}`,
      asset: p.asset as `0x${string}`,
      size: p.size,
      entryValueUsd: p.entryValueUsd,
      timestamp: p.timestamp,
      positionType: p.positionType,
    }))
    : undefined;

  return {
    data: positions,
    isLoading,
    error,
    refetch,
  };
}

// =============================================================
//                   EXECUTE ACTIONS HOOK
// =============================================================

export interface ExecuteAction {
  actionType: number;
  adapter: `0x${string}`;
  tokenIn: `0x${string}`;
  tokenOut: `0x${string}`;
  amountIn: bigint;
  minAmountOut: bigint;
  extraData: `0x${string}`;
}

export function useExecuteWithRights() {
  const chainId = useChainId();
  const addresses = getAddresses(chainId);

  const { writeContract, data: hash, isPending, error } = useWriteContract();

  const { isLoading: isConfirming, isSuccess, data: receipt } = useWaitForTransactionReceipt({
    hash,
  });

  const execute = async (ertId: bigint, actions: ExecuteAction[]) => {
    writeContract({
      address: addresses.PraxisGateway,
      abi: PraxisGatewayABI,
      functionName: 'executeWithRights',
      args: [ertId, actions],
    });
  };

  return {
    execute,
    hash,
    isPending,
    isConfirming,
    isSuccess,
    receipt,
    error,
  };
}

// =============================================================
//                    MY ERTS LIST HOOK
// =============================================================

export interface ERTListItem {
  tokenId: bigint;
  status: number;
  statusName: string;
  capitalLimit: bigint;
  expiryTime: bigint;
  isExpired: boolean;
  remainingTime: number;
}

// =============================================================
//                    MY ERTS LIST HOOK
// =============================================================

export interface ERTListItem {
  tokenId: bigint;
  status: number;
  statusName: string;
  capitalLimit: bigint;
  expiryTime: bigint;
  isExpired: boolean;
  remainingTime: number;
}

export function useMyERTs() {
  const { address } = useAccount();
  const chainId = useChainId();
  const addresses = getAddresses(chainId);
  const [ertIds, setErtIds] = useState<bigint[]>([]);
  const [isLoadingIds, setIsLoadingIds] = useState(false);

  // First get the count of ERTs owned
  const { data: ertCount, isLoading: countLoading, refetch: refetchCount } = useReadContract({
    address: addresses.ExecutionRightsNFT,
    abi: ExecutionRightsNFTABI,
    functionName: 'balanceOf',
    args: address ? [address] : undefined,
    query: { enabled: !!address },
  });

  // Effect to fetch all IDs when count changes - reset IDs when count changes
  useEffect(() => {
    if (!address || !ertCount || ertCount === 0n) {
      setErtIds([]);
    }
    // TODO: Implement batch fetching using useReadContracts when needed
  }, [address, ertCount]);

  // Using useReadContracts would be best but it requires importing it.
  // Let's modify the hook to just use index-based reading with individual hooks if count is small, 
  // or return a helper to fetch them.

  // Actually, the best way without adding new imports is to let the component handle index fetching 
  // OR add useReadContracts to the top imports. Let's add useReadContracts.

  return {
    count: ertCount || 0n,
    ertIds: [], // We will implement the fetching logic in a separate component or improve this later
    // For now, let's stick to the previous plan of components fetching indexes? 
    // No, the requirement is to fix useMyERTs.

    // Let's use the pattern of returning the contract info so components can map over indexes
    getTokenIdAt: (index: number) => ({
      address: addresses.ExecutionRightsNFT,
      abi: ExecutionRightsNFTABI,
      functionName: 'tokenOfOwnerByIndex',
      args: [address, BigInt(index)],
    }),

    isLoading: countLoading,
    refetch: refetchCount
  };
}

// =============================================================
//                  ERT TOKEN BY INDEX HOOK
// =============================================================

export function useERTByIndex(ownerAddress: `0x${string}` | undefined, index: bigint | undefined) {
  const chainId = useChainId();
  const addresses = getAddresses(chainId);

  const { data: tokenId, isLoading, error, refetch } = useReadContract({
    address: addresses.ExecutionRightsNFT,
    abi: ExecutionRightsNFTABI,
    functionName: 'tokenOfOwnerByIndex',
    args: ownerAddress !== undefined && index !== undefined ? [ownerAddress, index] : undefined,
    query: { enabled: !!ownerAddress && index !== undefined },
  });

  return {
    data: tokenId,
    isLoading,
    error,
    refetch,
  };
}

// =============================================================
//                  ERT VALIDITY HOOK
// =============================================================

export function useERTValidity(ertId: bigint | undefined) {
  const chainId = useChainId();
  const addresses = getAddresses(chainId);

  const { data: isValid, isLoading: validLoading } = useReadContract({
    address: addresses.ExecutionRightsNFT,
    abi: ExecutionRightsNFTABI,
    functionName: 'isValid',
    args: ertId !== undefined ? [ertId] : undefined,
    query: { enabled: ertId !== undefined },
  });

  const { data: isExpired, isLoading: expiredLoading } = useReadContract({
    address: addresses.ExecutionRightsNFT,
    abi: ExecutionRightsNFTABI,
    functionName: 'isExpired',
    args: ertId !== undefined ? [ertId] : undefined,
    query: { enabled: ertId !== undefined },
  });

  return {
    isValid,
    isExpired,
    isActive: isValid && !isExpired,
    isLoading: validLoading || expiredLoading,
  };
}

// =============================================================
//                  ACTIVE ERTS FILTER HOOK
// =============================================================

export function useActiveERTsCount() {
  const { address } = useAccount();
  const chainId = useChainId();
  const addresses = getAddresses(chainId);

  // Get total count - in production, filter on-chain or use subgraph
  const { data: totalCount, isLoading } = useReadContract({
    address: addresses.ExecutionRightsNFT,
    abi: ExecutionRightsNFTABI,
    functionName: 'balanceOf',
    args: address ? [address] : undefined,
    query: { enabled: !!address },
  });

  return {
    totalCount,
    // Note: Active count would require iterating through all tokens
    // In production, use events/subgraph for this
    isLoading,
  };
}

// =============================================================
//               ERT TIME REMAINING HOOK
// =============================================================

export function useERTTimeRemaining(ertId: bigint | undefined) {
  const { data: rights } = useExecutionRights(ertId);
  const [now, setNow] = useState<number>(0);

  useEffect(() => {
    // Update immediately after mount
    const initialTimer = setTimeout(() => setNow(Math.floor(Date.now() / 1000)), 0);
    const timer = setInterval(() => setNow(Math.floor(Date.now() / 1000)), 1000);
    return () => {
      clearTimeout(initialTimer);
      clearInterval(timer);
    };
  }, []);

  if (!rights) {
    return {
      remainingSeconds: undefined,
      remainingFormatted: undefined,
      isExpired: undefined,
      expiresAt: undefined,
    };
  }
  const expiryTime = Number(rights.expiryTime);
  const remainingSeconds = Math.max(0, expiryTime - now);

  // Format remaining time
  const days = Math.floor(remainingSeconds / 86400);
  const hours = Math.floor((remainingSeconds % 86400) / 3600);
  const minutes = Math.floor((remainingSeconds % 3600) / 60);

  let formatted: string;
  if (remainingSeconds === 0) {
    formatted = 'Expired';
  } else if (days > 0) {
    formatted = `${days}d ${hours}h`;
  } else if (hours > 0) {
    formatted = `${hours}h ${minutes}m`;
  } else {
    formatted = `${minutes}m`;
  }

  return {
    remainingSeconds,
    remainingFormatted: formatted,
    isExpired: remainingSeconds === 0,
    expiresAt: new Date(expiryTime * 1000),
    percentRemaining: rights.startTime
      ? (remainingSeconds / (expiryTime - Number(rights.startTime))) * 100
      : 0,
  };
}

// =============================================================
//               ERT DRAWDOWN STATUS HOOK
// =============================================================

export function useERTDrawdownStatus(ertId: bigint | undefined) {
  const { data: rights } = useExecutionRights(ertId);

  if (!rights) {
    return {
      currentDrawdown: undefined,
      maxDrawdown: undefined,
      drawdownPercentage: undefined,
      isNearLimit: undefined,
      isAtLimit: undefined,
    };
  }

  const capitalLimit = rights.capitalLimit;
  const realizedPnl = rights.status.realizedPnl;
  const unrealizedPnl = rights.status.unrealizedPnl;
  const totalPnl = realizedPnl + unrealizedPnl;

  // Calculate drawdown (negative PnL as percentage of capital)
  const currentDrawdownBps = totalPnl < 0n && capitalLimit > 0n
    ? Number((-totalPnl * 10000n) / capitalLimit)
    : 0;

  const maxDrawdownBps = rights.constraints.maxDrawdownBps;

  return {
    currentDrawdown: totalPnl < 0n ? -totalPnl : 0n,
    currentDrawdownBps,
    maxDrawdownBps,
    drawdownPercentage: currentDrawdownBps / 100,
    maxDrawdownPercentage: maxDrawdownBps / 100,
    isNearLimit: currentDrawdownBps >= maxDrawdownBps * 0.8,
    isAtLimit: currentDrawdownBps >= maxDrawdownBps,
    headroom: maxDrawdownBps - currentDrawdownBps,
  };
}

// =============================================================
//               ERT CAPITAL UTILIZATION HOOK
// =============================================================

export function useERTCapitalUtilization(ertId: bigint | undefined) {
  const { data: rights } = useExecutionRights(ertId);

  if (!rights) {
    return {
      deployed: undefined,
      limit: undefined,
      available: undefined,
      utilizationPercentage: undefined,
    };
  }

  const deployed = rights.status.capitalDeployed;
  const limit = rights.capitalLimit;
  const available = limit > deployed ? limit - deployed : 0n;
  const utilizationPercentage = limit > 0n
    ? Number((deployed * 10000n) / limit) / 100
    : 0;

  return {
    deployed,
    limit,
    available,
    utilizationPercentage,
    isFullyDeployed: deployed >= limit,
  };
}
