'use client';

import { useReadContract, useChainId } from 'wagmi';
import { formatUnits } from 'viem';
import { getAddresses } from '../contracts/addresses';

// =============================================================
//                    EXPOSURE MANAGER ABI
// =============================================================

const ExposureManagerABI = [
  {
    name: 'getExposure',
    type: 'function',
    stateMutability: 'view',
    inputs: [{ name: 'asset', type: 'address' }],
    outputs: [
      { name: 'exposure', type: 'uint256' },
      { name: 'maxAllowed', type: 'uint256' },
      { name: 'utilizationBps', type: 'uint256' },
    ],
  },
  {
    name: 'canAddExposure',
    type: 'function',
    stateMutability: 'view',
    inputs: [
      { name: 'asset', type: 'address' },
      { name: 'usdAmount', type: 'uint256' },
    ],
    outputs: [{ name: '', type: 'bool' }],
  },
  {
    name: 'assetExposure',
    type: 'function',
    stateMutability: 'view',
    inputs: [{ name: 'asset', type: 'address' }],
    outputs: [{ name: '', type: 'uint256' }],
  },
  {
    name: 'MAX_SINGLE_ASSET_BPS',
    type: 'function',
    stateMutability: 'view',
    inputs: [],
    outputs: [{ name: '', type: 'uint256' }],
  },
  {
    name: 'getTotalExposure',
    type: 'function',
    stateMutability: 'view',
    inputs: [],
    outputs: [{ name: '', type: 'uint256' }],
  },
  {
    name: 'getAssetList',
    type: 'function',
    stateMutability: 'view',
    inputs: [],
    outputs: [{ name: '', type: 'address[]' }],
  },
  {
    name: 'getAllExposures',
    type: 'function',
    stateMutability: 'view',
    inputs: [],
    outputs: [
      {
        name: 'exposures',
        type: 'tuple[]',
        components: [
          { name: 'asset', type: 'address' },
          { name: 'exposure', type: 'uint256' },
          { name: 'maxAllowed', type: 'uint256' },
          { name: 'utilizationBps', type: 'uint256' },
        ],
      },
    ],
  },
  {
    name: 'getRemainingCapacity',
    type: 'function',
    stateMutability: 'view',
    inputs: [{ name: 'asset', type: 'address' }],
    outputs: [{ name: '', type: 'uint256' }],
  },
] as const;

// =============================================================
//                         TYPES
// =============================================================

export interface AssetExposure {
  asset: `0x${string}`;
  exposure: bigint;
  maxAllowed: bigint;
  utilizationBps: bigint;
  utilizationPercentage: number;
  remainingCapacity: bigint;
  isAtLimit: boolean;
  isNearLimit: boolean; // > 80% utilized
}

export interface ExposureSummary {
  totalExposure: bigint;
  maxSingleAssetBps: bigint;
  maxSingleAssetPercentage: number;
  assetCount: number;
}

// =============================================================
//                  ASSET EXPOSURE HOOK
// =============================================================

export function useAssetExposure(assetAddress: `0x${string}` | undefined) {
  const chainId = useChainId();
  const addresses = getAddresses(chainId);

  const { data, isLoading, error, refetch } = useReadContract({
    address: addresses.ExposureManager || '0x0000000000000000000000000000000000000000',
    abi: ExposureManagerABI,
    functionName: 'getExposure',
    args: assetAddress ? [assetAddress] : undefined,
    query: { enabled: !!addresses.ExposureManager && !!assetAddress },
  });

  const { data: remainingCapacity } = useReadContract({
    address: addresses.ExposureManager || '0x0000000000000000000000000000000000000000',
    abi: ExposureManagerABI,
    functionName: 'getRemainingCapacity',
    args: assetAddress ? [assetAddress] : undefined,
    query: { enabled: !!addresses.ExposureManager && !!assetAddress },
  });

  const exposure: AssetExposure | undefined = data && assetAddress
    ? {
        asset: assetAddress,
        exposure: data[0],
        maxAllowed: data[1],
        utilizationBps: data[2],
        utilizationPercentage: Number(data[2]) / 100,
        remainingCapacity: remainingCapacity || 0n,
        isAtLimit: data[2] >= 10000n,
        isNearLimit: data[2] >= 8000n && data[2] < 10000n,
      }
    : undefined;

  return {
    data: exposure,
    isLoading,
    error,
    refetch,
  };
}

// =============================================================
//                  CAN ADD EXPOSURE HOOK
// =============================================================

export function useCanAddExposure(
  assetAddress: `0x${string}` | undefined,
  usdAmount: bigint | undefined
) {
  const chainId = useChainId();
  const addresses = getAddresses(chainId);

  const { data: canAdd, isLoading, error, refetch } = useReadContract({
    address: addresses.ExposureManager || '0x0000000000000000000000000000000000000000',
    abi: ExposureManagerABI,
    functionName: 'canAddExposure',
    args: assetAddress && usdAmount ? [assetAddress, usdAmount] : undefined,
    query: { enabled: !!addresses.ExposureManager && !!assetAddress && !!usdAmount && usdAmount > 0n },
  });

  return {
    data: canAdd,
    isLoading,
    error,
    refetch,
  };
}

// =============================================================
//                  ALL EXPOSURES HOOK
// =============================================================

export function useAllExposures() {
  const chainId = useChainId();
  const addresses = getAddresses(chainId);

  const { data, isLoading, error, refetch } = useReadContract({
    address: addresses.ExposureManager || '0x0000000000000000000000000000000000000000',
    abi: ExposureManagerABI,
    functionName: 'getAllExposures',
    query: { enabled: !!addresses.ExposureManager },
  });

  const exposures: AssetExposure[] | undefined = data
    ? data.map(exp => ({
        asset: exp.asset as `0x${string}`,
        exposure: exp.exposure,
        maxAllowed: exp.maxAllowed,
        utilizationBps: exp.utilizationBps,
        utilizationPercentage: Number(exp.utilizationBps) / 100,
        remainingCapacity: exp.maxAllowed - exp.exposure,
        isAtLimit: exp.utilizationBps >= 10000n,
        isNearLimit: exp.utilizationBps >= 8000n && exp.utilizationBps < 10000n,
      }))
    : undefined;

  // Sort by utilization (highest first)
  const sortedExposures = exposures?.sort(
    (a, b) => Number(b.utilizationBps) - Number(a.utilizationBps)
  );

  return {
    data: sortedExposures,
    assetsAtLimit: sortedExposures?.filter(e => e.isAtLimit),
    assetsNearLimit: sortedExposures?.filter(e => e.isNearLimit),
    isLoading,
    error,
    refetch,
  };
}

// =============================================================
//                  EXPOSURE SUMMARY HOOK
// =============================================================

export function useExposureSummary() {
  const chainId = useChainId();
  const addresses = getAddresses(chainId);

  const { data: totalExposure, isLoading: totalLoading } = useReadContract({
    address: addresses.ExposureManager || '0x0000000000000000000000000000000000000000',
    abi: ExposureManagerABI,
    functionName: 'getTotalExposure',
    query: { enabled: !!addresses.ExposureManager },
  });

  const { data: maxSingleAssetBps, isLoading: maxLoading } = useReadContract({
    address: addresses.ExposureManager || '0x0000000000000000000000000000000000000000',
    abi: ExposureManagerABI,
    functionName: 'MAX_SINGLE_ASSET_BPS',
    query: { enabled: !!addresses.ExposureManager },
  });

  const { data: assetList, isLoading: listLoading } = useReadContract({
    address: addresses.ExposureManager || '0x0000000000000000000000000000000000000000',
    abi: ExposureManagerABI,
    functionName: 'getAssetList',
    query: { enabled: !!addresses.ExposureManager },
  });

  const isLoading = totalLoading || maxLoading || listLoading;

  const summary: ExposureSummary | undefined =
    totalExposure !== undefined && maxSingleAssetBps !== undefined
      ? {
          totalExposure,
          maxSingleAssetBps,
          maxSingleAssetPercentage: Number(maxSingleAssetBps) / 100,
          assetCount: assetList?.length || 0,
        }
      : undefined;

  return {
    data: summary,
    isLoading,
  };
}

// =============================================================
//                  REMAINING CAPACITY HOOK
// =============================================================

export function useRemainingCapacity(assetAddress: `0x${string}` | undefined) {
  const chainId = useChainId();
  const addresses = getAddresses(chainId);

  const { data: capacity, isLoading, error, refetch } = useReadContract({
    address: addresses.ExposureManager || '0x0000000000000000000000000000000000000000',
    abi: ExposureManagerABI,
    functionName: 'getRemainingCapacity',
    args: assetAddress ? [assetAddress] : undefined,
    query: { enabled: !!addresses.ExposureManager && !!assetAddress },
  });

  return {
    data: capacity,
    formatted: capacity !== undefined ? formatUnits(capacity, 6) : undefined, // Assuming 6 decimals for USD
    isLoading,
    error,
    refetch,
  };
}

// =============================================================
//                  EXPOSURE LIMIT CHECK HOOK
// =============================================================

export function useExposureLimitCheck(
  assetAddress: `0x${string}` | undefined,
  proposedAmount: bigint | undefined
) {
  const { data: currentExposure } = useAssetExposure(assetAddress);
  const { data: canAdd } = useCanAddExposure(assetAddress, proposedAmount);

  if (!currentExposure || proposedAmount === undefined) {
    return {
      canProceed: undefined,
      currentExposure: undefined,
      proposedTotal: undefined,
      remainingAfter: undefined,
      wouldExceedLimit: undefined,
    };
  }

  const proposedTotal = currentExposure.exposure + proposedAmount;
  const remainingAfter = currentExposure.maxAllowed > proposedTotal
    ? currentExposure.maxAllowed - proposedTotal
    : 0n;
  const wouldExceedLimit = proposedTotal > currentExposure.maxAllowed;

  return {
    canProceed: canAdd,
    currentExposure: currentExposure.exposure,
    proposedTotal,
    remainingAfter,
    wouldExceedLimit,
    currentUtilization: currentExposure.utilizationPercentage,
    proposedUtilization: currentExposure.maxAllowed > 0n
      ? Number((proposedTotal * 10000n) / currentExposure.maxAllowed) / 100
      : 0,
  };
}

// =============================================================
//               DIVERSIFICATION SCORE HOOK
// =============================================================

export function useDiversificationScore() {
  const { data: exposures } = useAllExposures();
  const { data: summary } = useExposureSummary();

  if (!exposures || !summary || exposures.length === 0) {
    return {
      score: undefined,
      rating: undefined,
      recommendation: undefined,
    };
  }

  // Calculate diversification score based on:
  // 1. Number of assets with exposure
  // 2. How evenly distributed the exposure is
  // 3. Whether any assets are at/near limits

  const totalExposure = exposures.reduce((sum, e) => sum + e.exposure, 0n);
  if (totalExposure === 0n) {
    return {
      score: 100,
      rating: 'Excellent',
      recommendation: 'No exposure - fully diversified by default',
    };
  }

  // Calculate Herfindahl-Hirschman Index (HHI) for concentration
  let hhi = 0;
  for (const exp of exposures) {
    const share = Number(exp.exposure * 10000n / totalExposure) / 100;
    hhi += share * share;
  }

  // HHI ranges from 0 (perfect diversification) to 10000 (single asset)
  // Convert to a 0-100 score where higher is better
  const diversificationScore = Math.max(0, 100 - (hhi / 100));

  // Penalize for assets at/near limits
  const atLimitPenalty = (exposures.filter(e => e.isAtLimit).length * 10);
  const nearLimitPenalty = (exposures.filter(e => e.isNearLimit).length * 5);

  const finalScore = Math.max(0, diversificationScore - atLimitPenalty - nearLimitPenalty);

  let rating: string;
  let recommendation: string;

  if (finalScore >= 80) {
    rating = 'Excellent';
    recommendation = 'Well diversified across multiple assets';
  } else if (finalScore >= 60) {
    rating = 'Good';
    recommendation = 'Consider spreading exposure more evenly';
  } else if (finalScore >= 40) {
    rating = 'Moderate';
    recommendation = 'Concentration risk - diversify into more assets';
  } else {
    rating = 'Poor';
    recommendation = 'High concentration risk - urgent diversification needed';
  }

  return {
    score: Math.round(finalScore),
    rating,
    recommendation,
    hhi: Math.round(hhi),
    assetCount: exposures.length,
    assetsAtLimit: exposures.filter(e => e.isAtLimit).length,
    assetsNearLimit: exposures.filter(e => e.isNearLimit).length,
  };
}
