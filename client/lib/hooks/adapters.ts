'use client';

import { useReadContract, useWriteContract, useWaitForTransactionReceipt, useAccount, useChainId, useBalance } from 'wagmi';
import { parseEther, formatEther, formatUnits } from 'viem';
import {
  getSparkDEXAddresses,
  getSceptreAddresses,
  getKineticAddresses,
  getTokenAddresses,
  V3_FEE_TIERS,
  areExternalProtocolsAvailable,
} from '../contracts/external';

// =============================================================
//                    SPARKDEX V3 HOOKS
// =============================================================

// SparkDEX Quoter ABI (minimal)
const QuoterV2ABI = [
  {
    name: 'quoteExactInputSingle',
    type: 'function',
    stateMutability: 'nonpayable',
    inputs: [
      {
        name: 'params',
        type: 'tuple',
        components: [
          { name: 'tokenIn', type: 'address' },
          { name: 'tokenOut', type: 'address' },
          { name: 'amountIn', type: 'uint256' },
          { name: 'fee', type: 'uint24' },
          { name: 'sqrtPriceLimitX96', type: 'uint160' },
        ],
      },
    ],
    outputs: [
      { name: 'amountOut', type: 'uint256' },
      { name: 'sqrtPriceX96After', type: 'uint160' },
      { name: 'initializedTicksCrossed', type: 'uint32' },
      { name: 'gasEstimate', type: 'uint256' },
    ],
  },
] as const;

// SparkDEX SwapRouter ABI (minimal)
const SwapRouterABI = [
  {
    name: 'exactInputSingle',
    type: 'function',
    stateMutability: 'payable',
    inputs: [
      {
        name: 'params',
        type: 'tuple',
        components: [
          { name: 'tokenIn', type: 'address' },
          { name: 'tokenOut', type: 'address' },
          { name: 'fee', type: 'uint24' },
          { name: 'recipient', type: 'address' },
          { name: 'deadline', type: 'uint256' },
          { name: 'amountIn', type: 'uint256' },
          { name: 'amountOutMinimum', type: 'uint256' },
          { name: 'sqrtPriceLimitX96', type: 'uint160' },
        ],
      },
    ],
    outputs: [{ name: 'amountOut', type: 'uint256' }],
  },
] as const;

export interface SwapQuote {
  amountOut: bigint;
  gasEstimate: bigint;
  priceImpact: number;
}

export function useSparkDEXQuote(
  tokenIn: `0x${string}` | undefined,
  tokenOut: `0x${string}` | undefined,
  amountIn: bigint | undefined,
  feeTier: number = V3_FEE_TIERS.MEDIUM
) {
  const chainId = useChainId();

  const isAvailable = areExternalProtocolsAvailable(chainId);
  const addresses = isAvailable ? getSparkDEXAddresses(chainId) : null;

  // Note: quoteExactInputSingle is not a view function, so we can't use useReadContract
  // In production, you'd use a multicall or static call simulation
  // For now, return undefined - actual quoting requires a transaction simulation

  return {
    data: undefined as SwapQuote | undefined,
    isLoading: false,
    error: !isAvailable ? new Error('SparkDEX not available on this network') : null,
    isAvailable,
  };
}

export function useSparkDEXSwap() {
  const chainId = useChainId();
  const { address } = useAccount();

  const isAvailable = areExternalProtocolsAvailable(chainId);
  const addresses = isAvailable ? getSparkDEXAddresses(chainId) : null;

  const { writeContract, data: hash, isPending, error } = useWriteContract();

  const { isLoading: isConfirming, isSuccess, data: receipt } = useWaitForTransactionReceipt({
    hash,
  });

  const swap = async (
    tokenIn: `0x${string}`,
    tokenOut: `0x${string}`,
    amountIn: bigint,
    amountOutMin: bigint,
    feeTier: number = V3_FEE_TIERS.MEDIUM
  ) => {
    if (!addresses || !address) return;

    const deadline = BigInt(Math.floor(Date.now() / 1000) + 1800); // 30 minutes

    writeContract({
      address: addresses.swapRouter,
      abi: SwapRouterABI,
      functionName: 'exactInputSingle',
      args: [
        {
          tokenIn,
          tokenOut,
          fee: feeTier,
          recipient: address,
          deadline,
          amountIn,
          amountOutMinimum: amountOutMin,
          sqrtPriceLimitX96: 0n,
        },
      ],
    });
  };

  return {
    swap,
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
//                    SCEPTRE HOOKS (sFLR)
// =============================================================

// Sceptre sFLR ABI (minimal)
const SceptreABI = [
  {
    name: 'submit',
    type: 'function',
    stateMutability: 'payable',
    inputs: [],
    outputs: [{ name: 'shares', type: 'uint256' }],
  },
  {
    name: 'totalPooledFlr',
    type: 'function',
    stateMutability: 'view',
    inputs: [],
    outputs: [{ name: '', type: 'uint256' }],
  },
  {
    name: 'totalShares',
    type: 'function',
    stateMutability: 'view',
    inputs: [],
    outputs: [{ name: '', type: 'uint256' }],
  },
  {
    name: 'getSharesByPooledFlr',
    type: 'function',
    stateMutability: 'view',
    inputs: [{ name: '_flrAmount', type: 'uint256' }],
    outputs: [{ name: '', type: 'uint256' }],
  },
  {
    name: 'getPooledFlrByShares',
    type: 'function',
    stateMutability: 'view',
    inputs: [{ name: '_sharesAmount', type: 'uint256' }],
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
    name: 'requestUnlock',
    type: 'function',
    stateMutability: 'nonpayable',
    inputs: [{ name: '_sharesAmount', type: 'uint256' }],
    outputs: [{ name: 'unlockIndex', type: 'uint256' }],
  },
  {
    name: 'redeem',
    type: 'function',
    stateMutability: 'nonpayable',
    inputs: [{ name: '_unlockIndex', type: 'uint256' }],
    outputs: [],
  },
] as const;

export interface SceptreStats {
  totalPooledFlr: bigint;
  totalShares: bigint;
  exchangeRate: number; // FLR per sFLR
  apy: number; // Estimated APY (hardcoded for now)
}

export function useSceptreStats() {
  const chainId = useChainId();

  const isAvailable = areExternalProtocolsAvailable(chainId);
  const addresses = isAvailable ? getSceptreAddresses(chainId) : null;

  const { data: totalPooledFlr, isLoading: flrLoading } = useReadContract({
    address: addresses?.sFLR || '0x0000000000000000000000000000000000000000',
    abi: SceptreABI,
    functionName: 'totalPooledFlr',
    query: { enabled: isAvailable && !!addresses?.sFLR },
  });

  const { data: totalShares, isLoading: sharesLoading } = useReadContract({
    address: addresses?.sFLR || '0x0000000000000000000000000000000000000000',
    abi: SceptreABI,
    functionName: 'totalShares',
    query: { enabled: isAvailable && !!addresses?.sFLR },
  });

  const isLoading = flrLoading || sharesLoading;

  const stats: SceptreStats | undefined =
    totalPooledFlr !== undefined && totalShares !== undefined && totalShares > 0n
      ? {
          totalPooledFlr,
          totalShares,
          exchangeRate: Number(totalPooledFlr) / Number(totalShares),
          apy: 4.0, // Approximate APY - in production, calculate from historical data
        }
      : undefined;

  return {
    data: stats,
    isLoading,
    isAvailable,
  };
}

export function useSceptreBalance() {
  const { address } = useAccount();
  const chainId = useChainId();

  const isAvailable = areExternalProtocolsAvailable(chainId);
  const addresses = isAvailable ? getSceptreAddresses(chainId) : null;

  const { data: sFLRBalance, isLoading, refetch } = useReadContract({
    address: addresses?.sFLR || '0x0000000000000000000000000000000000000000',
    abi: SceptreABI,
    functionName: 'balanceOf',
    args: address ? [address] : undefined,
    query: { enabled: isAvailable && !!addresses?.sFLR && !!address },
  });

  const { data: flrEquivalent } = useReadContract({
    address: addresses?.sFLR || '0x0000000000000000000000000000000000000000',
    abi: SceptreABI,
    functionName: 'getPooledFlrByShares',
    args: sFLRBalance ? [sFLRBalance] : undefined,
    query: { enabled: isAvailable && !!sFLRBalance && sFLRBalance > 0n },
  });

  return {
    sFLRBalance,
    flrEquivalent,
    isLoading,
    refetch,
    isAvailable,
  };
}

export function useSceptreStake() {
  const chainId = useChainId();

  const isAvailable = areExternalProtocolsAvailable(chainId);
  const addresses = isAvailable ? getSceptreAddresses(chainId) : null;

  const { writeContract, data: hash, isPending, error } = useWriteContract();

  const { isLoading: isConfirming, isSuccess, data: receipt } = useWaitForTransactionReceipt({
    hash,
  });

  const stake = async (amountFLR: bigint) => {
    if (!addresses?.sFLR) return;

    writeContract({
      address: addresses.sFLR,
      abi: SceptreABI,
      functionName: 'submit',
      value: amountFLR,
    });
  };

  return {
    stake,
    hash,
    isPending,
    isConfirming,
    isSuccess,
    receipt,
    error,
    isAvailable,
  };
}

export function useSceptreUnstake() {
  const chainId = useChainId();

  const isAvailable = areExternalProtocolsAvailable(chainId);
  const addresses = isAvailable ? getSceptreAddresses(chainId) : null;

  const { writeContract, data: hash, isPending, error } = useWriteContract();

  const { isLoading: isConfirming, isSuccess, data: receipt } = useWaitForTransactionReceipt({
    hash,
  });

  const requestUnstake = async (sharesAmount: bigint) => {
    if (!addresses?.sFLR) return;

    writeContract({
      address: addresses.sFLR,
      abi: SceptreABI,
      functionName: 'requestUnlock',
      args: [sharesAmount],
    });
  };

  const redeem = async (unlockIndex: bigint) => {
    if (!addresses?.sFLR) return;

    writeContract({
      address: addresses.sFLR,
      abi: SceptreABI,
      functionName: 'redeem',
      args: [unlockIndex],
    });
  };

  return {
    requestUnstake,
    redeem,
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
//                    KINETIC HOOKS (LENDING)
// =============================================================

// Kinetic kToken ABI (minimal - Compound V2 style)
const KTokenABI = [
  {
    name: 'mint',
    type: 'function',
    stateMutability: 'nonpayable',
    inputs: [{ name: 'mintAmount', type: 'uint256' }],
    outputs: [{ name: '', type: 'uint256' }],
  },
  {
    name: 'redeem',
    type: 'function',
    stateMutability: 'nonpayable',
    inputs: [{ name: 'redeemTokens', type: 'uint256' }],
    outputs: [{ name: '', type: 'uint256' }],
  },
  {
    name: 'redeemUnderlying',
    type: 'function',
    stateMutability: 'nonpayable',
    inputs: [{ name: 'redeemAmount', type: 'uint256' }],
    outputs: [{ name: '', type: 'uint256' }],
  },
  {
    name: 'balanceOf',
    type: 'function',
    stateMutability: 'view',
    inputs: [{ name: 'owner', type: 'address' }],
    outputs: [{ name: '', type: 'uint256' }],
  },
  {
    name: 'balanceOfUnderlying',
    type: 'function',
    stateMutability: 'nonpayable',
    inputs: [{ name: 'owner', type: 'address' }],
    outputs: [{ name: '', type: 'uint256' }],
  },
  {
    name: 'exchangeRateStored',
    type: 'function',
    stateMutability: 'view',
    inputs: [],
    outputs: [{ name: '', type: 'uint256' }],
  },
  {
    name: 'supplyRatePerBlock',
    type: 'function',
    stateMutability: 'view',
    inputs: [],
    outputs: [{ name: '', type: 'uint256' }],
  },
  {
    name: 'borrowRatePerBlock',
    type: 'function',
    stateMutability: 'view',
    inputs: [],
    outputs: [{ name: '', type: 'uint256' }],
  },
  {
    name: 'underlying',
    type: 'function',
    stateMutability: 'view',
    inputs: [],
    outputs: [{ name: '', type: 'address' }],
  },
] as const;

// Comptroller ABI (minimal)
const ComptrollerABI = [
  {
    name: 'getAllMarkets',
    type: 'function',
    stateMutability: 'view',
    inputs: [],
    outputs: [{ name: '', type: 'address[]' }],
  },
  {
    name: 'getAccountLiquidity',
    type: 'function',
    stateMutability: 'view',
    inputs: [{ name: 'account', type: 'address' }],
    outputs: [
      { name: '', type: 'uint256' },
      { name: '', type: 'uint256' },
      { name: '', type: 'uint256' },
    ],
  },
  {
    name: 'enterMarkets',
    type: 'function',
    stateMutability: 'nonpayable',
    inputs: [{ name: 'kTokens', type: 'address[]' }],
    outputs: [{ name: '', type: 'uint256[]' }],
  },
] as const;

export interface KineticMarketData {
  kToken: `0x${string}`;
  exchangeRate: bigint;
  supplyAPY: number;
  borrowAPY: number;
}

export function useKineticBalance(kTokenAddress: `0x${string}` | undefined) {
  const { address } = useAccount();
  const chainId = useChainId();

  const isAvailable = areExternalProtocolsAvailable(chainId);

  const { data: kTokenBalance, isLoading, refetch } = useReadContract({
    address: kTokenAddress || '0x0000000000000000000000000000000000000000',
    abi: KTokenABI,
    functionName: 'balanceOf',
    args: address ? [address] : undefined,
    query: { enabled: isAvailable && !!kTokenAddress && !!address },
  });

  const { data: exchangeRate } = useReadContract({
    address: kTokenAddress || '0x0000000000000000000000000000000000000000',
    abi: KTokenABI,
    functionName: 'exchangeRateStored',
    query: { enabled: isAvailable && !!kTokenAddress },
  });

  // Calculate underlying value
  const underlyingBalance =
    kTokenBalance !== undefined && exchangeRate !== undefined
      ? (kTokenBalance * exchangeRate) / 10n ** 18n
      : undefined;

  return {
    kTokenBalance,
    underlyingBalance,
    exchangeRate,
    isLoading,
    refetch,
    isAvailable,
  };
}

export function useKineticSupply() {
  const chainId = useChainId();
  const isAvailable = areExternalProtocolsAvailable(chainId);

  const { writeContract, data: hash, isPending, error } = useWriteContract();

  const { isLoading: isConfirming, isSuccess, data: receipt } = useWaitForTransactionReceipt({
    hash,
  });

  const supply = async (kTokenAddress: `0x${string}`, amount: bigint) => {
    writeContract({
      address: kTokenAddress,
      abi: KTokenABI,
      functionName: 'mint',
      args: [amount],
    });
  };

  return {
    supply,
    hash,
    isPending,
    isConfirming,
    isSuccess,
    receipt,
    error,
    isAvailable,
  };
}

export function useKineticWithdraw() {
  const chainId = useChainId();
  const isAvailable = areExternalProtocolsAvailable(chainId);

  const { writeContract, data: hash, isPending, error } = useWriteContract();

  const { isLoading: isConfirming, isSuccess, data: receipt } = useWaitForTransactionReceipt({
    hash,
  });

  const withdraw = async (kTokenAddress: `0x${string}`, kTokenAmount: bigint) => {
    writeContract({
      address: kTokenAddress,
      abi: KTokenABI,
      functionName: 'redeem',
      args: [kTokenAmount],
    });
  };

  const withdrawUnderlying = async (kTokenAddress: `0x${string}`, underlyingAmount: bigint) => {
    writeContract({
      address: kTokenAddress,
      abi: KTokenABI,
      functionName: 'redeemUnderlying',
      args: [underlyingAmount],
    });
  };

  return {
    withdraw,
    withdrawUnderlying,
    hash,
    isPending,
    isConfirming,
    isSuccess,
    receipt,
    error,
    isAvailable,
  };
}

export function useKineticMarkets() {
  const chainId = useChainId();

  const isAvailable = areExternalProtocolsAvailable(chainId);
  const addresses = isAvailable ? getKineticAddresses(chainId) : null;

  const { data: markets, isLoading, refetch } = useReadContract({
    address: addresses?.comptroller || '0x0000000000000000000000000000000000000000',
    abi: ComptrollerABI,
    functionName: 'getAllMarkets',
    query: { enabled: isAvailable && !!addresses?.comptroller },
  });

  return {
    markets,
    isLoading,
    refetch,
    isAvailable,
  };
}

// =============================================================
//                    UTILITY HOOKS
// =============================================================

export function useNativeBalance() {
  const { address } = useAccount();
  const { data, isLoading, refetch } = useBalance({
    address,
  });

  return {
    balance: data?.value,
    formatted: data?.formatted,
    symbol: data?.symbol,
    isLoading,
    refetch,
  };
}

export function useExternalProtocolsAvailable() {
  const chainId = useChainId();
  return areExternalProtocolsAvailable(chainId);
}
