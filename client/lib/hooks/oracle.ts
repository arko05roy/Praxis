'use client';

import { useReadContract, useChainId } from 'wagmi';
import { formatUnits } from 'viem';
import { getAddresses } from '../contracts/addresses';
import { getFlareSystemAddresses, FTSO_FEED_IDS, encodeFeedId } from '../contracts/external';

// =============================================================
//                    FLARE ORACLE ABI
// =============================================================

const FlareOracleABI = [
  {
    name: 'getPrice',
    type: 'function',
    stateMutability: 'view',
    inputs: [{ name: 'feedId', type: 'bytes21' }],
    outputs: [
      { name: 'price', type: 'uint256' },
      { name: 'decimals', type: 'uint8' },
      { name: 'timestamp', type: 'uint64' },
    ],
  },
  {
    name: 'getPriceWithCheck',
    type: 'function',
    stateMutability: 'view',
    inputs: [
      { name: 'feedId', type: 'bytes21' },
      { name: 'maxAge', type: 'uint256' },
    ],
    outputs: [
      { name: 'price', type: 'uint256' },
      { name: 'decimals', type: 'uint8' },
      { name: 'timestamp', type: 'uint64' },
    ],
  },
  {
    name: 'getMultiplePrices',
    type: 'function',
    stateMutability: 'view',
    inputs: [{ name: 'feedIds', type: 'bytes21[]' }],
    outputs: [
      {
        name: 'prices',
        type: 'tuple[]',
        components: [
          { name: 'price', type: 'uint256' },
          { name: 'decimals', type: 'uint8' },
          { name: 'timestamp', type: 'uint64' },
        ],
      },
    ],
  },
  {
    name: 'getTokenPriceUSD',
    type: 'function',
    stateMutability: 'view',
    inputs: [{ name: 'token', type: 'address' }],
    outputs: [
      { name: 'priceUsd', type: 'uint256' },
      { name: 'decimals', type: 'uint8' },
    ],
  },
  {
    name: 'tokenFeeds',
    type: 'function',
    stateMutability: 'view',
    inputs: [{ name: 'token', type: 'address' }],
    outputs: [{ name: 'feedId', type: 'bytes21' }],
  },
  {
    name: 'MAX_PRICE_AGE',
    type: 'function',
    stateMutability: 'view',
    inputs: [],
    outputs: [{ name: '', type: 'uint256' }],
  },
] as const;

// FTSO V2 Fast Updates ABI (direct Flare system)
const FtsoV2ABI = [
  {
    name: 'getFeedById',
    type: 'function',
    stateMutability: 'payable',
    inputs: [{ name: '_feedId', type: 'bytes21' }],
    outputs: [
      { name: '_value', type: 'uint256' },
      { name: '_decimals', type: 'int8' },
      { name: '_timestamp', type: 'uint64' },
    ],
  },
  {
    name: 'getFeedByIdInWei',
    type: 'function',
    stateMutability: 'payable',
    inputs: [{ name: '_feedId', type: 'bytes21' }],
    outputs: [
      { name: '_value', type: 'uint256' },
      { name: '_timestamp', type: 'uint64' },
    ],
  },
  {
    name: 'getFeedsById',
    type: 'function',
    stateMutability: 'payable',
    inputs: [{ name: '_feedIds', type: 'bytes21[]' }],
    outputs: [
      { name: '_values', type: 'uint256[]' },
      { name: '_decimals', type: 'int8[]' },
      { name: '_timestamp', type: 'uint64' },
    ],
  },
] as const;

// =============================================================
//                         TYPES
// =============================================================

export interface PriceData {
  feedId: string;
  feedName: string;
  price: bigint;
  decimals: number;
  timestamp: bigint;
  formatted: string;
  isStale: boolean;
}

export interface EnhancedPriceData extends PriceData {
  ageSeconds: number;
  ageFormatted: string;      // "30s ago", "2m ago"
  freshness: 'fresh' | 'recent' | 'stale';  // green/yellow/red
  source: 'ftso_v2' | 'mock';
  isTrustless: boolean;
}

export interface TokenPrice {
  token: `0x${string}`;
  priceUsd: bigint;
  decimals: number;
  formatted: string;
}

// =============================================================
//                  FTSO PRICE HOOK
// =============================================================

export function useFTSOPrice(feedName: string | undefined) {
  const chainId = useChainId();
  const addresses = getFlareSystemAddresses(chainId);

  const feedId = feedName ? encodeFeedId(feedName) : undefined;

  const { data, isLoading, error, refetch } = useReadContract({
    address: addresses?.ftsoV2 || '0x0000000000000000000000000000000000000000',
    abi: FtsoV2ABI,
    functionName: 'getFeedById',
    args: feedId ? [feedId as `0x${string}`] : undefined,
    query: { enabled: !!addresses?.ftsoV2 && !!feedId },
  });

  const now = BigInt(Math.floor(Date.now() / 1000));
  const maxAge = 300n; // 5 minutes

  const priceData: PriceData | undefined = data && feedName && feedId
    ? {
      feedId,
      feedName,
      price: data[0],
      decimals: Number(data[1]),
      timestamp: data[2],
      formatted: formatUnits(data[0], Number(data[1])),
      isStale: now - data[2] > maxAge,
    }
    : undefined;

  return {
    data: priceData,
    isLoading,
    error,
    refetch,
  };
}

// =============================================================
//              FLARE ORACLE PRICE HOOK
// =============================================================

// Fallback prices for testnet demo safety
const MOCK_PRICES: Record<string, string> = {
  'FLR/USD': '0.03',
  'BTC/USD': '65000',
  'ETH/USD': '3500',
  'XRP/USD': '0.60',
  'DOGE/USD': '0.12',
  'USDC/USD': '1.00',
};

export function useFlareOraclePrice(feedName: string | undefined) {
  const chainId = useChainId();
  const praxisAddresses = getAddresses(chainId);

  const feedId = feedName ? encodeFeedId(feedName) : undefined;

  const { data, isLoading, error, refetch } = useReadContract({
    address: praxisAddresses.FlareOracle || '0x0000000000000000000000000000000000000000',
    abi: FlareOracleABI,
    functionName: 'getPrice',
    args: feedId ? [feedId as `0x${string}`] : undefined,
    query: { enabled: !!praxisAddresses.FlareOracle && !!feedId },
  });

  const now = BigInt(Math.floor(Date.now() / 1000));
  const maxAge = 300n;

  // Logic: Use Contract Data if available, otherwise try Fallback
  let priceData: PriceData | undefined;

  if (data && feedName && feedId) {
    priceData = {
      feedId,
      feedName,
      price: data[0],
      decimals: Number(data[1]),
      timestamp: data[2],
      formatted: formatUnits(data[0], Number(data[1])),
      isStale: now - data[2] > maxAge,
    };
  } else if ((!data || error) && feedName && MOCK_PRICES[feedName]) {
    // Fallback logic
    const mockVal = MOCK_PRICES[feedName];
    // Mock decimals usually 18 or 6? Oracle usually returns specific decimals.
    // We'll assume standard decimals logic or parse mockVal.
    // Actually simpler: just construct formatted.
    // But other components need 'price' bigint.
    // Let's assume 18 decimals for fallback sim.
    const decimals = 18;
    const price = BigInt(Math.floor(Number(mockVal) * (10 ** decimals)));

    priceData = {
      feedId: feedId || '0x00',
      feedName,
      price,
      decimals,
      timestamp: now,
      formatted: mockVal,
      isStale: false, // Start fresh
    };
  }

  return {
    data: priceData,
    isLoading: isLoading && !priceData, // If we have fallback, we aren't "loading" (UX wise)
    error,
    refetch,
  };
}

// =============================================================
//              ENHANCED PRICE HOOK
// =============================================================

// Helper function for formatting age
function formatAge(seconds: number): string {
  if (seconds < 60) return `${seconds}s ago`;
  if (seconds < 3600) return `${Math.floor(seconds / 60)}m ago`;
  return `${Math.floor(seconds / 3600)}h ago`;
}

export function useEnhancedPrice(feedName: string | undefined) {
  const result = useFlareOraclePrice(feedName);

  if (!result.data) return { ...result, enhanced: undefined };

  const now = BigInt(Math.floor(Date.now() / 1000));
  const ageSeconds = Number(now - result.data.timestamp);
  // Mock data has current timestamp (age ~0)
  const isMock = ageSeconds <= 1;

  const enhanced: EnhancedPriceData = {
    ...result.data,
    ageSeconds,
    ageFormatted: formatAge(ageSeconds),
    freshness: ageSeconds < 60 ? 'fresh' : ageSeconds < 300 ? 'recent' : 'stale',
    source: isMock ? 'mock' : 'ftso_v2',
    isTrustless: !isMock,
  };

  return { ...result, enhanced };
}

// =============================================================
//              TOKEN PRICE USD HOOK
// =============================================================

export function useTokenPriceUSD(tokenAddress: `0x${string}` | undefined) {
  const chainId = useChainId();
  const praxisAddresses = getAddresses(chainId);

  const { data, isLoading, error, refetch } = useReadContract({
    address: praxisAddresses.FlareOracle || '0x0000000000000000000000000000000000000000',
    abi: FlareOracleABI,
    functionName: 'getTokenPriceUSD',
    args: tokenAddress ? [tokenAddress] : undefined,
    query: { enabled: !!praxisAddresses.FlareOracle && !!tokenAddress },
  });

  const tokenPrice: TokenPrice | undefined = data && tokenAddress
    ? {
      token: tokenAddress,
      priceUsd: data[0],
      decimals: Number(data[1]),
      formatted: formatUnits(data[0], Number(data[1])),
    }
    : undefined;

  return {
    data: tokenPrice,
    isLoading,
    error,
    refetch,
  };
}

// =============================================================
//              MULTIPLE PRICES HOOK
// =============================================================

export function useMultiplePrices(feedNames: string[]) {
  const chainId = useChainId();
  const praxisAddresses = getAddresses(chainId);

  const feedIds = feedNames.map(name => encodeFeedId(name));

  const { data, isLoading, error, refetch } = useReadContract({
    address: praxisAddresses.FlareOracle || '0x0000000000000000000000000000000000000000',
    abi: FlareOracleABI,
    functionName: 'getMultiplePrices',
    args: feedIds.length > 0 ? [feedIds as `0x${string}`[]] : undefined,
    query: { enabled: !!praxisAddresses.FlareOracle && feedIds.length > 0 },
  });

  const now = BigInt(Math.floor(Date.now() / 1000));
  const maxAge = 300n;

  const prices: PriceData[] | undefined = data
    ? data.map((priceData, index) => ({
      feedId: feedIds[index],
      feedName: feedNames[index],
      price: priceData.price,
      decimals: Number(priceData.decimals),
      timestamp: priceData.timestamp,
      formatted: formatUnits(priceData.price, Number(priceData.decimals)),
      isStale: now - priceData.timestamp > maxAge,
    }))
    : undefined;

  return {
    data: prices,
    isLoading,
    error,
    refetch,
  };
}

// =============================================================
//              COMMON ASSET PRICES HOOK
// =============================================================

export interface CommonPrices {
  FLR: PriceData | undefined;
  BTC: PriceData | undefined;
  ETH: PriceData | undefined;
  XRP: PriceData | undefined;
  DOGE: PriceData | undefined;
  USDC: PriceData | undefined;
  isLoading: boolean;
  refetch: () => void;
}

export function useCommonPrices(): CommonPrices {
  const flr = useFlareOraclePrice('FLR/USD');
  const btc = useFlareOraclePrice('BTC/USD');
  const eth = useFlareOraclePrice('ETH/USD');
  const xrp = useFlareOraclePrice('XRP/USD');
  const doge = useFlareOraclePrice('DOGE/USD');
  const usdc = useFlareOraclePrice('USDC/USD');

  return {
    FLR: flr.data,
    BTC: btc.data,
    ETH: eth.data,
    XRP: xrp.data,
    DOGE: doge.data,
    USDC: usdc.data,
    isLoading: flr.isLoading || btc.isLoading || eth.isLoading || xrp.isLoading || doge.isLoading || usdc.isLoading,
    refetch: () => {
      flr.refetch();
      btc.refetch();
      eth.refetch();
      xrp.refetch();
      doge.refetch();
      usdc.refetch();
    },
  };
}

// =============================================================
//              PRICE STALENESS CHECK HOOK
// =============================================================

export function usePriceStaleness(feedName: string | undefined, maxAgeSeconds: number = 300) {
  const { data: priceData, isLoading } = useFTSOPrice(feedName);

  if (!priceData) {
    return {
      isStale: undefined,
      age: undefined,
      isLoading,
    };
  }

  const now = BigInt(Math.floor(Date.now() / 1000));
  const age = Number(now - priceData.timestamp);
  const isStale = age > maxAgeSeconds;

  return {
    isStale,
    age,
    maxAge: maxAgeSeconds,
    timestamp: priceData.timestamp,
    isLoading,
  };
}

// =============================================================
//              AVAILABLE FEEDS HOOK
// =============================================================

export function useAvailableFeeds() {
  // Return pre-defined list of available FTSO feeds
  const feeds = Object.entries(FTSO_FEED_IDS).map(([name, id]) => ({
    name,
    feedId: id,
  }));

  return {
    data: feeds,
  };
}

// =============================================================
//              PRICE WITH VALIDATION HOOK
// =============================================================

export function usePriceWithValidation(feedName: string | undefined, maxAgeSeconds: number = 300) {
  const chainId = useChainId();
  const praxisAddresses = getAddresses(chainId);

  const feedId = feedName ? encodeFeedId(feedName) : undefined;

  const { data, isLoading, error, refetch } = useReadContract({
    address: praxisAddresses.FlareOracle || '0x0000000000000000000000000000000000000000',
    abi: FlareOracleABI,
    functionName: 'getPriceWithCheck',
    args: feedId ? [feedId as `0x${string}`, BigInt(maxAgeSeconds)] : undefined,
    query: { enabled: !!praxisAddresses.FlareOracle && !!feedId },
  });

  const priceData: PriceData | undefined = data && feedName && feedId
    ? {
      feedId,
      feedName,
      price: data[0],
      decimals: Number(data[1]),
      timestamp: data[2],
      formatted: formatUnits(data[0], Number(data[1])),
      isStale: false, // Already validated by contract
    }
    : undefined;

  return {
    data: priceData,
    isLoading,
    error: error?.message?.includes('stale') ? new Error('Price is stale') : error,
    refetch,
  };
}

// =============================================================
//              CALCULATE VALUE USD HOOK
// =============================================================

export function useCalculateValueUSD(
  tokenAddress: `0x${string}` | undefined,
  amount: bigint | undefined,
  tokenDecimals: number = 18
) {
  const { data: tokenPrice, isLoading } = useTokenPriceUSD(tokenAddress);

  if (!tokenPrice || !amount) {
    return {
      valueUsd: undefined,
      formatted: undefined,
      isLoading,
    };
  }

  // Calculate USD value: (amount * priceUsd) / (10^tokenDecimals)
  const valueUsd = (amount * tokenPrice.priceUsd) / BigInt(10 ** tokenDecimals);
  const formatted = formatUnits(valueUsd, tokenPrice.decimals);

  return {
    valueUsd,
    formatted,
    pricePerToken: tokenPrice.formatted,
    isLoading,
  };
}

// =============================================================
//              MAX PRICE AGE HOOK
// =============================================================

export function useMaxPriceAge() {
  const chainId = useChainId();
  const praxisAddresses = getAddresses(chainId);

  const { data: maxAge, isLoading } = useReadContract({
    address: praxisAddresses.FlareOracle || '0x0000000000000000000000000000000000000000',
    abi: FlareOracleABI,
    functionName: 'MAX_PRICE_AGE',
    query: { enabled: !!praxisAddresses.FlareOracle },
  });

  return {
    data: maxAge,
    formatted: maxAge ? `${Number(maxAge)} seconds` : undefined,
    isLoading,
  };
}
