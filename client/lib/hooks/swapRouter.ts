'use client';

import { useReadContract, useWriteContract, useWaitForTransactionReceipt, useAccount, useChainId } from 'wagmi';
import { formatUnits } from 'viem';
import { getAddresses } from '../contracts/addresses';
import {
  getSparkDEXAddresses,
  getBlazeSwapAddresses,
  getEnosysAddresses,
  areExternalProtocolsAvailable,
  V3_FEE_TIERS,
} from '../contracts/external';

// =============================================================
//                    PRAXIS SWAP ROUTER ABI
// =============================================================

const SwapRouterABI = [
  {
    name: 'getAllQuotes',
    type: 'function',
    stateMutability: 'view',
    inputs: [
      { name: 'tokenIn', type: 'address' },
      { name: 'tokenOut', type: 'address' },
      { name: 'amountIn', type: 'uint256' },
    ],
    outputs: [
      {
        name: 'quotes',
        type: 'tuple[]',
        components: [
          { name: 'adapter', type: 'address' },
          { name: 'adapterName', type: 'string' },
          { name: 'amountOut', type: 'uint256' },
          { name: 'gasEstimate', type: 'uint256' },
        ],
      },
    ],
  },
  {
    name: 'findBestRoute',
    type: 'function',
    stateMutability: 'view',
    inputs: [
      { name: 'tokenIn', type: 'address' },
      { name: 'tokenOut', type: 'address' },
      { name: 'amountIn', type: 'uint256' },
    ],
    outputs: [
      { name: 'bestAdapter', type: 'address' },
      { name: 'bestAmountOut', type: 'uint256' },
      { name: 'gasEstimate', type: 'uint256' },
    ],
  },
  {
    name: 'swap',
    type: 'function',
    stateMutability: 'nonpayable',
    inputs: [
      { name: 'tokenIn', type: 'address' },
      { name: 'tokenOut', type: 'address' },
      { name: 'amountIn', type: 'uint256' },
      { name: 'minAmountOut', type: 'uint256' },
      { name: 'to', type: 'address' },
      { name: 'deadline', type: 'uint256' },
    ],
    outputs: [{ name: 'amountOut', type: 'uint256' }],
  },
  {
    name: 'swapViaAdapter',
    type: 'function',
    stateMutability: 'nonpayable',
    inputs: [
      { name: 'adapter', type: 'address' },
      { name: 'tokenIn', type: 'address' },
      { name: 'tokenOut', type: 'address' },
      { name: 'amountIn', type: 'uint256' },
      { name: 'minAmountOut', type: 'uint256' },
      { name: 'to', type: 'address' },
      { name: 'deadline', type: 'uint256' },
      { name: 'extraData', type: 'bytes' },
    ],
    outputs: [{ name: 'amountOut', type: 'uint256' }],
  },
  {
    name: 'supportsPair',
    type: 'function',
    stateMutability: 'view',
    inputs: [
      { name: 'tokenIn', type: 'address' },
      { name: 'tokenOut', type: 'address' },
    ],
    outputs: [{ name: '', type: 'bool' }],
  },
  {
    name: 'getAdapters',
    type: 'function',
    stateMutability: 'view',
    inputs: [],
    outputs: [{ name: '', type: 'address[]' }],
  },
  {
    name: 'getAdapterCount',
    type: 'function',
    stateMutability: 'view',
    inputs: [],
    outputs: [{ name: '', type: 'uint256' }],
  },
] as const;

// =============================================================
//                    BLAZESWAP V2 ABI
// =============================================================

const BlazeSwapRouterABI = [
  {
    name: 'getAmountsOut',
    type: 'function',
    stateMutability: 'view',
    inputs: [
      { name: 'amountIn', type: 'uint256' },
      { name: 'path', type: 'address[]' },
    ],
    outputs: [{ name: 'amounts', type: 'uint256[]' }],
  },
  {
    name: 'swapExactTokensForTokens',
    type: 'function',
    stateMutability: 'nonpayable',
    inputs: [
      { name: 'amountIn', type: 'uint256' },
      { name: 'amountOutMin', type: 'uint256' },
      { name: 'path', type: 'address[]' },
      { name: 'to', type: 'address' },
      { name: 'deadline', type: 'uint256' },
    ],
    outputs: [{ name: 'amounts', type: 'uint256[]' }],
  },
  {
    name: 'swapExactETHForTokens',
    type: 'function',
    stateMutability: 'payable',
    inputs: [
      { name: 'amountOutMin', type: 'uint256' },
      { name: 'path', type: 'address[]' },
      { name: 'to', type: 'address' },
      { name: 'deadline', type: 'uint256' },
    ],
    outputs: [{ name: 'amounts', type: 'uint256[]' }],
  },
  {
    name: 'swapExactTokensForETH',
    type: 'function',
    stateMutability: 'nonpayable',
    inputs: [
      { name: 'amountIn', type: 'uint256' },
      { name: 'amountOutMin', type: 'uint256' },
      { name: 'path', type: 'address[]' },
      { name: 'to', type: 'address' },
      { name: 'deadline', type: 'uint256' },
    ],
    outputs: [{ name: 'amounts', type: 'uint256[]' }],
  },
  {
    name: 'factory',
    type: 'function',
    stateMutability: 'view',
    inputs: [],
    outputs: [{ name: '', type: 'address' }],
  },
  {
    name: 'WETH',
    type: 'function',
    stateMutability: 'view',
    inputs: [],
    outputs: [{ name: '', type: 'address' }],
  },
] as const;

// Enosys uses same V3 interface as SparkDEX
const EnosysRouterABI = [
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

const EnosysQuoterABI = [
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

// =============================================================
//                         TYPES
// =============================================================

export interface SwapQuote {
  adapter: `0x${string}`;
  adapterName: string;
  amountOut: bigint;
  gasEstimate: bigint;
  priceImpact?: number;
}

export interface BestRoute {
  adapter: `0x${string}`;
  amountOut: bigint;
  gasEstimate: bigint;
  savings?: bigint; // vs worst quote
}

export interface SwapParams {
  tokenIn: `0x${string}`;
  tokenOut: `0x${string}`;
  amountIn: bigint;
  minAmountOut: bigint;
  deadline?: bigint;
}

// =============================================================
//                  ALL QUOTES HOOK
// =============================================================

export function useAllSwapQuotes(
  tokenIn: `0x${string}` | undefined,
  tokenOut: `0x${string}` | undefined,
  amountIn: bigint | undefined
) {
  const chainId = useChainId();
  const praxisAddresses = getAddresses(chainId);

  const { data, isLoading, error, refetch } = useReadContract({
    address: praxisAddresses.SwapRouter || '0x0000000000000000000000000000000000000000',
    abi: SwapRouterABI,
    functionName: 'getAllQuotes',
    args: tokenIn && tokenOut && amountIn ? [tokenIn, tokenOut, amountIn] : undefined,
    query: { enabled: !!praxisAddresses.SwapRouter && !!tokenIn && !!tokenOut && !!amountIn && amountIn > 0n },
  });

  const quotes: SwapQuote[] | undefined = data
    ? data.map(q => ({
        adapter: q.adapter as `0x${string}`,
        adapterName: q.adapterName,
        amountOut: q.amountOut,
        gasEstimate: q.gasEstimate,
      }))
    : undefined;

  // Sort by best output
  const sortedQuotes = quotes?.sort((a, b) => (b.amountOut > a.amountOut ? 1 : -1));

  return {
    data: sortedQuotes,
    bestQuote: sortedQuotes?.[0],
    worstQuote: sortedQuotes?.[sortedQuotes.length - 1],
    isLoading,
    error,
    refetch,
  };
}

// =============================================================
//                  BEST ROUTE HOOK
// =============================================================

export function useBestSwapRoute(
  tokenIn: `0x${string}` | undefined,
  tokenOut: `0x${string}` | undefined,
  amountIn: bigint | undefined
) {
  const chainId = useChainId();
  const praxisAddresses = getAddresses(chainId);

  const { data, isLoading, error, refetch } = useReadContract({
    address: praxisAddresses.SwapRouter || '0x0000000000000000000000000000000000000000',
    abi: SwapRouterABI,
    functionName: 'findBestRoute',
    args: tokenIn && tokenOut && amountIn ? [tokenIn, tokenOut, amountIn] : undefined,
    query: { enabled: !!praxisAddresses.SwapRouter && !!tokenIn && !!tokenOut && !!amountIn && amountIn > 0n },
  });

  const bestRoute: BestRoute | undefined = data
    ? {
        adapter: data[0] as `0x${string}`,
        amountOut: data[1],
        gasEstimate: data[2],
      }
    : undefined;

  return {
    data: bestRoute,
    isLoading,
    error,
    refetch,
  };
}

// =============================================================
//                  AGGREGATED SWAP HOOK
// =============================================================

export function useAggregatedSwap() {
  const { address } = useAccount();
  const chainId = useChainId();
  const praxisAddresses = getAddresses(chainId);

  const { writeContract, data: hash, isPending, error } = useWriteContract();

  const { isLoading: isConfirming, isSuccess, data: receipt } = useWaitForTransactionReceipt({
    hash,
  });

  const swap = async (params: SwapParams) => {
    if (!praxisAddresses.SwapRouter || !address) return;

    const deadline = params.deadline || BigInt(Math.floor(Date.now() / 1000) + 1800);

    writeContract({
      address: praxisAddresses.SwapRouter,
      abi: SwapRouterABI,
      functionName: 'swap',
      args: [
        params.tokenIn,
        params.tokenOut,
        params.amountIn,
        params.minAmountOut,
        address,
        deadline,
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
  };
}

// =============================================================
//                  SWAP VIA SPECIFIC ADAPTER HOOK
// =============================================================

export function useSwapViaAdapter() {
  const { address } = useAccount();
  const chainId = useChainId();
  const praxisAddresses = getAddresses(chainId);

  const { writeContract, data: hash, isPending, error } = useWriteContract();

  const { isLoading: isConfirming, isSuccess, data: receipt } = useWaitForTransactionReceipt({
    hash,
  });

  const swapViaAdapter = async (
    adapter: `0x${string}`,
    params: SwapParams,
    extraData: `0x${string}` = '0x'
  ) => {
    if (!praxisAddresses.SwapRouter || !address) return;

    const deadline = params.deadline || BigInt(Math.floor(Date.now() / 1000) + 1800);

    writeContract({
      address: praxisAddresses.SwapRouter,
      abi: SwapRouterABI,
      functionName: 'swapViaAdapter',
      args: [
        adapter,
        params.tokenIn,
        params.tokenOut,
        params.amountIn,
        params.minAmountOut,
        address,
        deadline,
        extraData,
      ],
    });
  };

  return {
    swapViaAdapter,
    hash,
    isPending,
    isConfirming,
    isSuccess,
    receipt,
    error,
  };
}

// =============================================================
//                  SUPPORTS PAIR HOOK
// =============================================================

export function useSupportsPair(
  tokenIn: `0x${string}` | undefined,
  tokenOut: `0x${string}` | undefined
) {
  const chainId = useChainId();
  const praxisAddresses = getAddresses(chainId);

  const { data: supportsPair, isLoading, refetch } = useReadContract({
    address: praxisAddresses.SwapRouter || '0x0000000000000000000000000000000000000000',
    abi: SwapRouterABI,
    functionName: 'supportsPair',
    args: tokenIn && tokenOut ? [tokenIn, tokenOut] : undefined,
    query: { enabled: !!praxisAddresses.SwapRouter && !!tokenIn && !!tokenOut },
  });

  return {
    data: supportsPair,
    isLoading,
    refetch,
  };
}

// =============================================================
//                  REGISTERED ADAPTERS HOOK
// =============================================================

export function useRegisteredAdapters() {
  const chainId = useChainId();
  const praxisAddresses = getAddresses(chainId);

  const { data: adapters, isLoading, refetch } = useReadContract({
    address: praxisAddresses.SwapRouter || '0x0000000000000000000000000000000000000000',
    abi: SwapRouterABI,
    functionName: 'getAdapters',
    query: { enabled: !!praxisAddresses.SwapRouter },
  });

  return {
    data: adapters as `0x${string}`[] | undefined,
    count: adapters?.length || 0,
    isLoading,
    refetch,
  };
}

// =============================================================
//                  BLAZESWAP QUOTE HOOK
// =============================================================

export function useBlazeSwapQuote(
  tokenIn: `0x${string}` | undefined,
  tokenOut: `0x${string}` | undefined,
  amountIn: bigint | undefined
) {
  const chainId = useChainId();
  const isAvailable = areExternalProtocolsAvailable(chainId);
  const addresses = isAvailable ? getBlazeSwapAddresses(chainId) : null;

  const path = tokenIn && tokenOut ? [tokenIn, tokenOut] : undefined;

  const { data, isLoading, error, refetch } = useReadContract({
    address: addresses?.router || '0x0000000000000000000000000000000000000000',
    abi: BlazeSwapRouterABI,
    functionName: 'getAmountsOut',
    args: amountIn && path ? [amountIn, path] : undefined,
    query: { enabled: isAvailable && !!addresses?.router && !!amountIn && !!path },
  });

  const quote: SwapQuote | undefined = data && addresses
    ? {
        adapter: addresses.router,
        adapterName: 'BlazeSwap',
        amountOut: data[data.length - 1], // Last element is output amount
        gasEstimate: 150000n, // V2 swaps are cheaper
      }
    : undefined;

  return {
    data: quote,
    amounts: data,
    isLoading,
    error,
    refetch,
    isAvailable,
  };
}

// =============================================================
//                  BLAZESWAP SWAP HOOK
// =============================================================

export function useBlazeSwapSwap() {
  const { address } = useAccount();
  const chainId = useChainId();
  const isAvailable = areExternalProtocolsAvailable(chainId);
  const addresses = isAvailable ? getBlazeSwapAddresses(chainId) : null;

  const { writeContract, data: hash, isPending, error } = useWriteContract();

  const { isLoading: isConfirming, isSuccess, data: receipt } = useWaitForTransactionReceipt({
    hash,
  });

  const swap = async (
    tokenIn: `0x${string}`,
    tokenOut: `0x${string}`,
    amountIn: bigint,
    minAmountOut: bigint
  ) => {
    if (!addresses?.router || !address) return;

    const deadline = BigInt(Math.floor(Date.now() / 1000) + 1800);
    const path = [tokenIn, tokenOut];

    writeContract({
      address: addresses.router,
      abi: BlazeSwapRouterABI,
      functionName: 'swapExactTokensForTokens',
      args: [amountIn, minAmountOut, path, address, deadline],
    });
  };

  const swapWithPath = async (
    path: `0x${string}`[],
    amountIn: bigint,
    minAmountOut: bigint
  ) => {
    if (!addresses?.router || !address) return;

    const deadline = BigInt(Math.floor(Date.now() / 1000) + 1800);

    writeContract({
      address: addresses.router,
      abi: BlazeSwapRouterABI,
      functionName: 'swapExactTokensForTokens',
      args: [amountIn, minAmountOut, path, address, deadline],
    });
  };

  return {
    swap,
    swapWithPath,
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
//                  ENOSYS SWAP HOOK
// =============================================================

export function useEnosysSwap() {
  const { address } = useAccount();
  const chainId = useChainId();
  const isAvailable = areExternalProtocolsAvailable(chainId);
  const addresses = isAvailable ? getEnosysAddresses(chainId) : null;

  const { writeContract, data: hash, isPending, error } = useWriteContract();

  const { isLoading: isConfirming, isSuccess, data: receipt } = useWaitForTransactionReceipt({
    hash,
  });

  const swap = async (
    tokenIn: `0x${string}`,
    tokenOut: `0x${string}`,
    amountIn: bigint,
    minAmountOut: bigint,
    feeTier: number = V3_FEE_TIERS.MEDIUM
  ) => {
    if (!addresses?.swapRouter || !address) return;

    const deadline = BigInt(Math.floor(Date.now() / 1000) + 1800);

    writeContract({
      address: addresses.swapRouter,
      abi: EnosysRouterABI,
      functionName: 'exactInputSingle',
      args: [
        {
          tokenIn,
          tokenOut,
          fee: feeTier,
          recipient: address,
          deadline,
          amountIn,
          amountOutMinimum: minAmountOut,
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
//               COMPARE ALL DEX QUOTES HOOK
// =============================================================

export function useCompareAllDEXQuotes(
  tokenIn: `0x${string}` | undefined,
  tokenOut: `0x${string}` | undefined,
  amountIn: bigint | undefined
) {
  const blazeSwap = useBlazeSwapQuote(tokenIn, tokenOut, amountIn);

  // Note: SparkDEX and Enosys V3 quotes require simulation (not view functions)
  // In production, you'd use multicall or backend service

  const quotes: SwapQuote[] = [];

  if (blazeSwap.data) {
    quotes.push(blazeSwap.data);
  }

  // Sort by best output
  const sortedQuotes = quotes.sort((a, b) => (b.amountOut > a.amountOut ? 1 : -1));

  return {
    data: sortedQuotes,
    bestQuote: sortedQuotes[0],
    blazeSwap: blazeSwap.data,
    isLoading: blazeSwap.isLoading,
    refetch: () => {
      blazeSwap.refetch();
    },
  };
}

// =============================================================
//               PRICE IMPACT CALCULATION HOOK
// =============================================================

export function usePriceImpact(
  amountIn: bigint | undefined,
  amountOut: bigint | undefined,
  expectedRate: bigint | undefined, // Expected output for 1 unit of input
  inputDecimals: number = 18,
  outputDecimals: number = 18
) {
  if (!amountIn || !amountOut || !expectedRate || amountIn === 0n || expectedRate === 0n) {
    return { priceImpact: undefined };
  }

  // Calculate expected output based on rate
  const expectedOutput = (amountIn * expectedRate) / BigInt(10 ** inputDecimals);

  // Price impact = (expectedOutput - actualOutput) / expectedOutput * 100
  const impact = expectedOutput > 0n
    ? Number((expectedOutput - amountOut) * 10000n / expectedOutput) / 100
    : 0;

  return {
    priceImpact: impact,
    expectedOutput,
    actualOutput: amountOut,
    isSevere: impact > 5, // > 5% is severe
    isModerate: impact > 1 && impact <= 5,
    isLow: impact <= 1,
  };
}
