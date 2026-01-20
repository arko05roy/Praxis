'use client';

import { useReadContract, useWriteContract, useWaitForTransactionReceipt, useAccount, useChainId } from 'wagmi';
import { formatUnits } from 'viem';
import {
  getFAssetAddresses,
  areExternalProtocolsAvailable,
  FASSET_FEED_IDS,
} from '../contracts/external';

// =============================================================
//                      FASSET ABIS
// =============================================================

// Standard ERC20 ABI for FAssets
const FAssetTokenABI = [
  {
    name: 'name',
    type: 'function',
    stateMutability: 'view',
    inputs: [],
    outputs: [{ name: '', type: 'string' }],
  },
  {
    name: 'symbol',
    type: 'function',
    stateMutability: 'view',
    inputs: [],
    outputs: [{ name: '', type: 'string' }],
  },
  {
    name: 'decimals',
    type: 'function',
    stateMutability: 'view',
    inputs: [],
    outputs: [{ name: '', type: 'uint8' }],
  },
  {
    name: 'totalSupply',
    type: 'function',
    stateMutability: 'view',
    inputs: [],
    outputs: [{ name: '', type: 'uint256' }],
  },
  {
    name: 'balanceOf',
    type: 'function',
    stateMutability: 'view',
    inputs: [{ name: 'account', type: 'address' }],
    outputs: [{ name: '', type: 'uint256' }],
  },
  {
    name: 'allowance',
    type: 'function',
    stateMutability: 'view',
    inputs: [
      { name: 'owner', type: 'address' },
      { name: 'spender', type: 'address' },
    ],
    outputs: [{ name: '', type: 'uint256' }],
  },
  {
    name: 'approve',
    type: 'function',
    stateMutability: 'nonpayable',
    inputs: [
      { name: 'spender', type: 'address' },
      { name: 'amount', type: 'uint256' },
    ],
    outputs: [{ name: '', type: 'bool' }],
  },
  {
    name: 'transfer',
    type: 'function',
    stateMutability: 'nonpayable',
    inputs: [
      { name: 'to', type: 'address' },
      { name: 'amount', type: 'uint256' },
    ],
    outputs: [{ name: '', type: 'bool' }],
  },
] as const;

// FAssetManager ABI (minimal for querying)
const FAssetManagerABI = [
  {
    name: 'assetManagerController',
    type: 'function',
    stateMutability: 'view',
    inputs: [],
    outputs: [{ name: '', type: 'address' }],
  },
  {
    name: 'getSettings',
    type: 'function',
    stateMutability: 'view',
    inputs: [],
    outputs: [
      {
        name: 'settings',
        type: 'tuple',
        components: [
          { name: 'assetToken', type: 'address' },
          { name: 'fAssetToken', type: 'address' },
          { name: 'collateralPoolToken', type: 'address' },
          { name: 'mintingFee', type: 'uint256' },
          { name: 'redemptionFee', type: 'uint256' },
        ],
      },
    ],
  },
  {
    name: 'totalMinted',
    type: 'function',
    stateMutability: 'view',
    inputs: [],
    outputs: [{ name: '', type: 'uint256' }],
  },
] as const;

// =============================================================
//                         TYPES
// =============================================================

export type FAssetType = 'FXRP' | 'FBTC' | 'FDOGE';

export interface FAssetInfo {
  type: FAssetType;
  address: `0x${string}`;
  name: string;
  symbol: string;
  decimals: number;
  totalSupply: bigint;
  feedId: `0x${string}`;
}

export interface FAssetBalance {
  type: FAssetType;
  balance: bigint;
  formatted: string;
  decimals: number;
  usdValue?: bigint;
}

export interface FAssetPrice {
  type: FAssetType;
  price: bigint;
  decimals: number;
  timestamp: bigint;
  formatted: string;
}

// =============================================================
//                 FASSET INFO HOOK
// =============================================================

export function useFAssetInfo(assetType: FAssetType) {
  const chainId = useChainId();
  const isAvailable = areExternalProtocolsAvailable(chainId);
  const addresses = isAvailable ? getFAssetAddresses(chainId) : null;

  const tokenAddress = addresses?.[assetType];

  const { data: name, isLoading: nameLoading } = useReadContract({
    address: tokenAddress || '0x0000000000000000000000000000000000000000',
    abi: FAssetTokenABI,
    functionName: 'name',
    query: { enabled: isAvailable && !!tokenAddress },
  });

  const { data: symbol, isLoading: symbolLoading } = useReadContract({
    address: tokenAddress || '0x0000000000000000000000000000000000000000',
    abi: FAssetTokenABI,
    functionName: 'symbol',
    query: { enabled: isAvailable && !!tokenAddress },
  });

  const { data: decimals, isLoading: decimalsLoading } = useReadContract({
    address: tokenAddress || '0x0000000000000000000000000000000000000000',
    abi: FAssetTokenABI,
    functionName: 'decimals',
    query: { enabled: isAvailable && !!tokenAddress },
  });

  const { data: totalSupply, isLoading: supplyLoading } = useReadContract({
    address: tokenAddress || '0x0000000000000000000000000000000000000000',
    abi: FAssetTokenABI,
    functionName: 'totalSupply',
    query: { enabled: isAvailable && !!tokenAddress },
  });

  const isLoading = nameLoading || symbolLoading || decimalsLoading || supplyLoading;

  const info: FAssetInfo | undefined =
    name && symbol && decimals !== undefined && totalSupply !== undefined && tokenAddress
      ? {
          type: assetType,
          address: tokenAddress,
          name,
          symbol,
          decimals,
          totalSupply,
          feedId: FASSET_FEED_IDS[assetType] as `0x${string}`,
        }
      : undefined;

  return {
    data: info,
    isLoading,
    isAvailable,
  };
}

// =============================================================
//                 FASSET BALANCE HOOK
// =============================================================

export function useFAssetBalance(assetType: FAssetType) {
  const { address } = useAccount();
  const chainId = useChainId();
  const isAvailable = areExternalProtocolsAvailable(chainId);
  const addresses = isAvailable ? getFAssetAddresses(chainId) : null;

  const tokenAddress = addresses?.[assetType];

  const { data: balance, isLoading, refetch } = useReadContract({
    address: tokenAddress || '0x0000000000000000000000000000000000000000',
    abi: FAssetTokenABI,
    functionName: 'balanceOf',
    args: address ? [address] : undefined,
    query: { enabled: isAvailable && !!tokenAddress && !!address },
  });

  const { data: decimals } = useReadContract({
    address: tokenAddress || '0x0000000000000000000000000000000000000000',
    abi: FAssetTokenABI,
    functionName: 'decimals',
    query: { enabled: isAvailable && !!tokenAddress },
  });

  const result: FAssetBalance | undefined =
    balance !== undefined && decimals !== undefined
      ? {
          type: assetType,
          balance,
          formatted: formatUnits(balance, decimals),
          decimals,
        }
      : undefined;

  return {
    data: result,
    isLoading,
    refetch,
    isAvailable,
  };
}

// =============================================================
//              FASSET ALL BALANCES HOOK
// =============================================================

export function useAllFAssetBalances() {
  const fxrp = useFAssetBalance('FXRP');
  const fbtc = useFAssetBalance('FBTC');
  const fdoge = useFAssetBalance('FDOGE');

  const balances = [fxrp.data, fbtc.data, fdoge.data].filter(Boolean) as FAssetBalance[];

  return {
    data: balances,
    fxrp: fxrp.data,
    fbtc: fbtc.data,
    fdoge: fdoge.data,
    isLoading: fxrp.isLoading || fbtc.isLoading || fdoge.isLoading,
    refetch: () => {
      fxrp.refetch();
      fbtc.refetch();
      fdoge.refetch();
    },
    isAvailable: fxrp.isAvailable,
  };
}

// =============================================================
//                 FASSET ALLOWANCE HOOK
// =============================================================

export function useFAssetAllowance(assetType: FAssetType, spender: `0x${string}` | undefined) {
  const { address } = useAccount();
  const chainId = useChainId();
  const isAvailable = areExternalProtocolsAvailable(chainId);
  const addresses = isAvailable ? getFAssetAddresses(chainId) : null;

  const tokenAddress = addresses?.[assetType];

  const { data: allowance, isLoading, refetch } = useReadContract({
    address: tokenAddress || '0x0000000000000000000000000000000000000000',
    abi: FAssetTokenABI,
    functionName: 'allowance',
    args: address && spender ? [address, spender] : undefined,
    query: { enabled: isAvailable && !!tokenAddress && !!address && !!spender },
  });

  return {
    data: allowance,
    isLoading,
    refetch,
    isAvailable,
  };
}

// =============================================================
//                 FASSET APPROVE HOOK
// =============================================================

export function useFAssetApprove(assetType: FAssetType) {
  const chainId = useChainId();
  const isAvailable = areExternalProtocolsAvailable(chainId);
  const addresses = isAvailable ? getFAssetAddresses(chainId) : null;

  const tokenAddress = addresses?.[assetType];

  const { writeContract, data: hash, isPending, error } = useWriteContract();

  const { isLoading: isConfirming, isSuccess, data: receipt } = useWaitForTransactionReceipt({
    hash,
  });

  const approve = async (spender: `0x${string}`, amount: bigint) => {
    if (!tokenAddress) return;

    writeContract({
      address: tokenAddress,
      abi: FAssetTokenABI,
      functionName: 'approve',
      args: [spender, amount],
    });
  };

  const approveMax = async (spender: `0x${string}`) => {
    const maxUint256 = 2n ** 256n - 1n;
    await approve(spender, maxUint256);
  };

  return {
    approve,
    approveMax,
    hash,
    isPending,
    isConfirming,
    isSuccess,
    receipt,
    error,
    isAvailable,
  };
}

// =============================================================
//                 FASSET TRANSFER HOOK
// =============================================================

export function useFAssetTransfer(assetType: FAssetType) {
  const chainId = useChainId();
  const isAvailable = areExternalProtocolsAvailable(chainId);
  const addresses = isAvailable ? getFAssetAddresses(chainId) : null;

  const tokenAddress = addresses?.[assetType];

  const { writeContract, data: hash, isPending, error } = useWriteContract();

  const { isLoading: isConfirming, isSuccess, data: receipt } = useWaitForTransactionReceipt({
    hash,
  });

  const transfer = async (to: `0x${string}`, amount: bigint) => {
    if (!tokenAddress) return;

    writeContract({
      address: tokenAddress,
      abi: FAssetTokenABI,
      functionName: 'transfer',
      args: [to, amount],
    });
  };

  return {
    transfer,
    hash,
    isPending,
    isConfirming,
    isSuccess,
    receipt,
    error,
    isAvailable,
  };
}

// =============================================================
//               FASSET TOTAL SUPPLY HOOK
// =============================================================

export function useFAssetTotalSupply(assetType: FAssetType) {
  const chainId = useChainId();
  const isAvailable = areExternalProtocolsAvailable(chainId);
  const addresses = isAvailable ? getFAssetAddresses(chainId) : null;

  const tokenAddress = addresses?.[assetType];

  const { data: totalSupply, isLoading, refetch } = useReadContract({
    address: tokenAddress || '0x0000000000000000000000000000000000000000',
    abi: FAssetTokenABI,
    functionName: 'totalSupply',
    query: { enabled: isAvailable && !!tokenAddress },
  });

  const { data: decimals } = useReadContract({
    address: tokenAddress || '0x0000000000000000000000000000000000000000',
    abi: FAssetTokenABI,
    functionName: 'decimals',
    query: { enabled: isAvailable && !!tokenAddress },
  });

  return {
    data: totalSupply,
    formatted: totalSupply !== undefined && decimals !== undefined
      ? formatUnits(totalSupply, decimals)
      : undefined,
    decimals,
    isLoading,
    refetch,
    isAvailable,
  };
}

// =============================================================
//              IS FASSET CHECK HOOK
// =============================================================

export function useIsFAsset(tokenAddress: `0x${string}` | undefined) {
  const chainId = useChainId();
  const isAvailable = areExternalProtocolsAvailable(chainId);
  const addresses = isAvailable ? getFAssetAddresses(chainId) : null;

  if (!tokenAddress || !addresses) {
    return { isFAsset: false, assetType: undefined, isAvailable };
  }

  const lowerAddress = tokenAddress.toLowerCase();

  if (addresses.FXRP?.toLowerCase() === lowerAddress) {
    return { isFAsset: true, assetType: 'FXRP' as FAssetType, isAvailable };
  }
  if (addresses.FBTC?.toLowerCase() === lowerAddress) {
    return { isFAsset: true, assetType: 'FBTC' as FAssetType, isAvailable };
  }
  if (addresses.FDOGE?.toLowerCase() === lowerAddress) {
    return { isFAsset: true, assetType: 'FDOGE' as FAssetType, isAvailable };
  }

  return { isFAsset: false, assetType: undefined, isAvailable };
}

// =============================================================
//              GET ALL FASSETS HOOK
// =============================================================

export function useAllFAssets() {
  const chainId = useChainId();
  const isAvailable = areExternalProtocolsAvailable(chainId);
  const addresses = isAvailable ? getFAssetAddresses(chainId) : null;

  const fAssets: Array<{ type: FAssetType; address: `0x${string}`; feedId: string }> = [];

  if (addresses) {
    if (addresses.FXRP) {
      fAssets.push({ type: 'FXRP', address: addresses.FXRP, feedId: FASSET_FEED_IDS.FXRP });
    }
    if (addresses.FBTC) {
      fAssets.push({ type: 'FBTC', address: addresses.FBTC, feedId: FASSET_FEED_IDS.FBTC });
    }
    if (addresses.FDOGE) {
      fAssets.push({ type: 'FDOGE', address: addresses.FDOGE, feedId: FASSET_FEED_IDS.FDOGE });
    }
  }

  return {
    data: fAssets,
    isAvailable,
  };
}

// =============================================================
//              FASSET POOLS HOOK (For swapping)
// =============================================================

export function useFAssetPools(assetType: FAssetType) {
  const chainId = useChainId();
  const isAvailable = areExternalProtocolsAvailable(chainId);
  const addresses = isAvailable ? getFAssetAddresses(chainId) : null;

  // Return known pool addresses for the FAsset
  const pools = addresses?.pools?.[assetType] || [];

  return {
    data: pools,
    isAvailable,
  };
}
