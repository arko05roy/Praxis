'use client';

import { useReadContract, useWriteContract, useWaitForTransactionReceipt, useAccount, useChainId } from 'wagmi';
import { encodeFunctionData } from 'viem';
import {
  getSparkDEXEternalAddresses,
  areExternalProtocolsAvailable,
  SPARKDEX_ETERNAL_MARKETS,
  encodeMarketId,
} from '../contracts/external';

// =============================================================
//                 SPARKDEX ETERNAL ABIS
// =============================================================

// OrderBook ABI (for opening/closing positions)
const OrderBookABI = [
  {
    name: 'submitOrder',
    type: 'function',
    stateMutability: 'payable',
    inputs: [
      { name: 'market', type: 'bytes10' },
      { name: 'isLong', type: 'bool' },
      { name: 'margin', type: 'uint256' },
      { name: 'size', type: 'uint256' },
      { name: 'acceptablePrice', type: 'uint256' },
      { name: 'referrer', type: 'address' },
    ],
    outputs: [{ name: 'orderId', type: 'bytes32' }],
  },
  {
    name: 'submitCloseOrder',
    type: 'function',
    stateMutability: 'payable',
    inputs: [
      { name: 'market', type: 'bytes10' },
      { name: 'isLong', type: 'bool' },
      { name: 'size', type: 'uint256' },
      { name: 'acceptablePrice', type: 'uint256' },
    ],
    outputs: [{ name: 'orderId', type: 'bytes32' }],
  },
  {
    name: 'getOrder',
    type: 'function',
    stateMutability: 'view',
    inputs: [{ name: 'orderId', type: 'bytes32' }],
    outputs: [
      {
        name: 'order',
        type: 'tuple',
        components: [
          { name: 'user', type: 'address' },
          { name: 'market', type: 'bytes10' },
          { name: 'isLong', type: 'bool' },
          { name: 'orderType', type: 'uint8' },
          { name: 'margin', type: 'uint256' },
          { name: 'size', type: 'uint256' },
          { name: 'price', type: 'uint256' },
          { name: 'timestamp', type: 'uint256' },
        ],
      },
    ],
  },
] as const;

// Store ABI (for reading positions and market data)
const StoreABI = [
  {
    name: 'getPosition',
    type: 'function',
    stateMutability: 'view',
    inputs: [
      { name: 'user', type: 'address' },
      { name: 'market', type: 'bytes10' },
      { name: 'isLong', type: 'bool' },
    ],
    outputs: [
      {
        name: 'position',
        type: 'tuple',
        components: [
          { name: 'size', type: 'uint256' },
          { name: 'margin', type: 'uint256' },
          { name: 'price', type: 'uint256' },
          { name: 'funding', type: 'int256' },
          { name: 'timestamp', type: 'uint256' },
        ],
      },
    ],
  },
  {
    name: 'getMarket',
    type: 'function',
    stateMutability: 'view',
    inputs: [{ name: 'market', type: 'bytes10' }],
    outputs: [
      {
        name: 'marketData',
        type: 'tuple',
        components: [
          { name: 'maxLeverage', type: 'uint256' },
          { name: 'maxOI', type: 'uint256' },
          { name: 'fee', type: 'uint256' },
          { name: 'fundingFactor', type: 'uint256' },
          { name: 'minSize', type: 'uint256' },
          { name: 'isActive', type: 'bool' },
        ],
      },
    ],
  },
  {
    name: 'getOI',
    type: 'function',
    stateMutability: 'view',
    inputs: [
      { name: 'market', type: 'bytes10' },
      { name: 'isLong', type: 'bool' },
    ],
    outputs: [{ name: 'oi', type: 'uint256' }],
  },
  {
    name: 'getFundingRate',
    type: 'function',
    stateMutability: 'view',
    inputs: [{ name: 'market', type: 'bytes10' }],
    outputs: [{ name: 'fundingRate', type: 'int256' }],
  },
  {
    name: 'getMarkPrice',
    type: 'function',
    stateMutability: 'view',
    inputs: [{ name: 'market', type: 'bytes10' }],
    outputs: [{ name: 'price', type: 'uint256' }],
  },
  {
    name: 'getIndexPrice',
    type: 'function',
    stateMutability: 'view',
    inputs: [{ name: 'market', type: 'bytes10' }],
    outputs: [{ name: 'price', type: 'uint256' }],
  },
] as const;

// PositionManager ABI
const PerpPositionManagerABI = [
  {
    name: 'addMargin',
    type: 'function',
    stateMutability: 'payable',
    inputs: [
      { name: 'market', type: 'bytes10' },
      { name: 'isLong', type: 'bool' },
      { name: 'margin', type: 'uint256' },
    ],
    outputs: [],
  },
  {
    name: 'removeMargin',
    type: 'function',
    stateMutability: 'nonpayable',
    inputs: [
      { name: 'market', type: 'bytes10' },
      { name: 'isLong', type: 'bool' },
      { name: 'margin', type: 'uint256' },
    ],
    outputs: [],
  },
  {
    name: 'getLiquidationPrice',
    type: 'function',
    stateMutability: 'view',
    inputs: [
      { name: 'user', type: 'address' },
      { name: 'market', type: 'bytes10' },
      { name: 'isLong', type: 'bool' },
    ],
    outputs: [{ name: 'liquidationPrice', type: 'uint256' }],
  },
  {
    name: 'getPositionPnl',
    type: 'function',
    stateMutability: 'view',
    inputs: [
      { name: 'user', type: 'address' },
      { name: 'market', type: 'bytes10' },
      { name: 'isLong', type: 'bool' },
    ],
    outputs: [{ name: 'pnl', type: 'int256' }],
  },
] as const;

// =============================================================
//                         TYPES
// =============================================================

export interface PerpPosition {
  market: string;
  marketId: `0x${string}`;
  isLong: boolean;
  size: bigint;
  margin: bigint;
  entryPrice: bigint;
  funding: bigint;
  timestamp: bigint;
  leverage: number;
  pnl?: bigint;
  liquidationPrice?: bigint;
}

export interface PerpMarket {
  marketId: `0x${string}`;
  name: string;
  maxLeverage: bigint;
  maxOI: bigint;
  fee: bigint;
  fundingFactor: bigint;
  minSize: bigint;
  isActive: boolean;
  longOI?: bigint;
  shortOI?: bigint;
  fundingRate?: bigint;
  markPrice?: bigint;
  indexPrice?: bigint;
}

export interface OpenPositionParams {
  market: string; // e.g., 'ETH-USD'
  isLong: boolean;
  margin: bigint;
  size: bigint;
  acceptablePrice: bigint;
  referrer?: `0x${string}`;
}

export interface ClosePositionParams {
  market: string;
  isLong: boolean;
  size: bigint; // Amount to close (use max uint for full close)
  acceptablePrice: bigint;
}

// =============================================================
//                   PERP MARKETS HOOK
// =============================================================

export function usePerpMarkets() {
  const chainId = useChainId();
  const isAvailable = areExternalProtocolsAvailable(chainId);

  // Return pre-defined markets list
  const markets = Object.entries(SPARKDEX_ETERNAL_MARKETS).map(([name, id]) => ({
    name,
    marketId: id as `0x${string}`,
  }));

  return {
    data: markets,
    isAvailable,
  };
}

// =============================================================
//                   PERP MARKET INFO HOOK
// =============================================================

export function usePerpMarketInfo(marketName: string | undefined) {
  const chainId = useChainId();
  const isAvailable = areExternalProtocolsAvailable(chainId);
  const addresses = isAvailable ? getSparkDEXEternalAddresses(chainId) : null;

  const marketId = marketName ? encodeMarketId(marketName) : undefined;

  const { data: marketData, isLoading: marketLoading } = useReadContract({
    address: addresses?.store || '0x0000000000000000000000000000000000000000',
    abi: StoreABI,
    functionName: 'getMarket',
    args: marketId ? [marketId as `0x${string}`] : undefined,
    query: { enabled: isAvailable && !!marketId },
  });

  const { data: longOI } = useReadContract({
    address: addresses?.store || '0x0000000000000000000000000000000000000000',
    abi: StoreABI,
    functionName: 'getOI',
    args: marketId ? [marketId as `0x${string}`, true] : undefined,
    query: { enabled: isAvailable && !!marketId },
  });

  const { data: shortOI } = useReadContract({
    address: addresses?.store || '0x0000000000000000000000000000000000000000',
    abi: StoreABI,
    functionName: 'getOI',
    args: marketId ? [marketId as `0x${string}`, false] : undefined,
    query: { enabled: isAvailable && !!marketId },
  });

  const { data: fundingRate } = useReadContract({
    address: addresses?.store || '0x0000000000000000000000000000000000000000',
    abi: StoreABI,
    functionName: 'getFundingRate',
    args: marketId ? [marketId as `0x${string}`] : undefined,
    query: { enabled: isAvailable && !!marketId },
  });

  const { data: markPrice } = useReadContract({
    address: addresses?.store || '0x0000000000000000000000000000000000000000',
    abi: StoreABI,
    functionName: 'getMarkPrice',
    args: marketId ? [marketId as `0x${string}`] : undefined,
    query: { enabled: isAvailable && !!marketId },
  });

  const { data: indexPrice } = useReadContract({
    address: addresses?.store || '0x0000000000000000000000000000000000000000',
    abi: StoreABI,
    functionName: 'getIndexPrice',
    args: marketId ? [marketId as `0x${string}`] : undefined,
    query: { enabled: isAvailable && !!marketId },
  });

  const market: PerpMarket | undefined = marketData && marketName && marketId
    ? {
        marketId: marketId as `0x${string}`,
        name: marketName,
        maxLeverage: marketData.maxLeverage,
        maxOI: marketData.maxOI,
        fee: marketData.fee,
        fundingFactor: marketData.fundingFactor,
        minSize: marketData.minSize,
        isActive: marketData.isActive,
        longOI,
        shortOI,
        fundingRate,
        markPrice,
        indexPrice,
      }
    : undefined;

  return {
    data: market,
    isLoading: marketLoading,
    isAvailable,
  };
}

// =============================================================
//                   PERP POSITION HOOK
// =============================================================

export function usePerpPosition(marketName: string | undefined, isLong: boolean = true) {
  const { address } = useAccount();
  const chainId = useChainId();
  const isAvailable = areExternalProtocolsAvailable(chainId);
  const addresses = isAvailable ? getSparkDEXEternalAddresses(chainId) : null;

  const marketId = marketName ? encodeMarketId(marketName) : undefined;

  const { data: positionData, isLoading, refetch } = useReadContract({
    address: addresses?.store || '0x0000000000000000000000000000000000000000',
    abi: StoreABI,
    functionName: 'getPosition',
    args: address && marketId ? [address, marketId as `0x${string}`, isLong] : undefined,
    query: { enabled: isAvailable && !!address && !!marketId },
  });

  const { data: pnl } = useReadContract({
    address: addresses?.positionManager || '0x0000000000000000000000000000000000000000',
    abi: PerpPositionManagerABI,
    functionName: 'getPositionPnl',
    args: address && marketId ? [address, marketId as `0x${string}`, isLong] : undefined,
    query: { enabled: isAvailable && !!address && !!marketId && positionData?.size > 0n },
  });

  const { data: liquidationPrice } = useReadContract({
    address: addresses?.positionManager || '0x0000000000000000000000000000000000000000',
    abi: PerpPositionManagerABI,
    functionName: 'getLiquidationPrice',
    args: address && marketId ? [address, marketId as `0x${string}`, isLong] : undefined,
    query: { enabled: isAvailable && !!address && !!marketId && positionData?.size > 0n },
  });

  const position: PerpPosition | undefined = positionData && marketName && marketId && positionData.size > 0n
    ? {
        market: marketName,
        marketId: marketId as `0x${string}`,
        isLong,
        size: positionData.size,
        margin: positionData.margin,
        entryPrice: positionData.price,
        funding: positionData.funding,
        timestamp: positionData.timestamp,
        leverage: positionData.margin > 0n
          ? Number(positionData.size) / Number(positionData.margin)
          : 0,
        pnl,
        liquidationPrice,
      }
    : undefined;

  return {
    data: position,
    isLoading,
    refetch,
    isAvailable,
  };
}

// =============================================================
//                  USER PERP POSITIONS HOOK
// =============================================================

export function useUserPerpPositions() {
  const { address } = useAccount();
  const chainId = useChainId();
  const isAvailable = areExternalProtocolsAvailable(chainId);
  const addresses = isAvailable ? getSparkDEXEternalAddresses(chainId) : null;

  // Get all available markets
  const markets = Object.entries(SPARKDEX_ETERNAL_MARKETS);

  // This hook returns market list - individual position queries should be done per market
  // Due to wagmi limitations, we return market info for UI to query individually
  return {
    markets: markets.map(([name, id]) => ({ name, marketId: id })),
    storeAddress: addresses?.store,
    positionManagerAddress: addresses?.positionManager,
    userAddress: address,
    isAvailable,
  };
}

// =============================================================
//                   OPEN PERP POSITION HOOK
// =============================================================

export function useOpenPerpPosition() {
  const chainId = useChainId();
  const isAvailable = areExternalProtocolsAvailable(chainId);
  const addresses = isAvailable ? getSparkDEXEternalAddresses(chainId) : null;

  const { writeContract, data: hash, isPending, error } = useWriteContract();

  const { isLoading: isConfirming, isSuccess, data: receipt } = useWaitForTransactionReceipt({
    hash,
  });

  const openPosition = async (params: OpenPositionParams) => {
    if (!addresses?.orderBook) return;

    const marketId = encodeMarketId(params.market);
    const referrer = params.referrer || '0x0000000000000000000000000000000000000000';

    writeContract({
      address: addresses.orderBook,
      abi: OrderBookABI,
      functionName: 'submitOrder',
      args: [
        marketId as `0x${string}`,
        params.isLong,
        params.margin,
        params.size,
        params.acceptablePrice,
        referrer,
      ],
      value: params.margin, // WFLR margin sent as value
    });
  };

  return {
    openPosition,
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
//                  CLOSE PERP POSITION HOOK
// =============================================================

export function useClosePerpPosition() {
  const chainId = useChainId();
  const isAvailable = areExternalProtocolsAvailable(chainId);
  const addresses = isAvailable ? getSparkDEXEternalAddresses(chainId) : null;

  const { writeContract, data: hash, isPending, error } = useWriteContract();

  const { isLoading: isConfirming, isSuccess, data: receipt } = useWaitForTransactionReceipt({
    hash,
  });

  const closePosition = async (params: ClosePositionParams) => {
    if (!addresses?.orderBook) return;

    const marketId = encodeMarketId(params.market);

    writeContract({
      address: addresses.orderBook,
      abi: OrderBookABI,
      functionName: 'submitCloseOrder',
      args: [
        marketId as `0x${string}`,
        params.isLong,
        params.size,
        params.acceptablePrice,
      ],
    });
  };

  // Helper to close full position
  const closeFullPosition = async (market: string, isLong: boolean, acceptablePrice: bigint) => {
    const maxUint256 = 2n ** 256n - 1n;
    await closePosition({
      market,
      isLong,
      size: maxUint256,
      acceptablePrice,
    });
  };

  return {
    closePosition,
    closeFullPosition,
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
//                   ADD MARGIN HOOK
// =============================================================

export function useAddMargin() {
  const chainId = useChainId();
  const isAvailable = areExternalProtocolsAvailable(chainId);
  const addresses = isAvailable ? getSparkDEXEternalAddresses(chainId) : null;

  const { writeContract, data: hash, isPending, error } = useWriteContract();

  const { isLoading: isConfirming, isSuccess, data: receipt } = useWaitForTransactionReceipt({
    hash,
  });

  const addMargin = async (market: string, isLong: boolean, marginAmount: bigint) => {
    if (!addresses?.positionManager) return;

    const marketId = encodeMarketId(market);

    writeContract({
      address: addresses.positionManager,
      abi: PerpPositionManagerABI,
      functionName: 'addMargin',
      args: [marketId as `0x${string}`, isLong, marginAmount],
      value: marginAmount,
    });
  };

  return {
    addMargin,
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
//                  REMOVE MARGIN HOOK
// =============================================================

export function useRemoveMargin() {
  const chainId = useChainId();
  const isAvailable = areExternalProtocolsAvailable(chainId);
  const addresses = isAvailable ? getSparkDEXEternalAddresses(chainId) : null;

  const { writeContract, data: hash, isPending, error } = useWriteContract();

  const { isLoading: isConfirming, isSuccess, data: receipt } = useWaitForTransactionReceipt({
    hash,
  });

  const removeMargin = async (market: string, isLong: boolean, marginAmount: bigint) => {
    if (!addresses?.positionManager) return;

    const marketId = encodeMarketId(market);

    writeContract({
      address: addresses.positionManager,
      abi: PerpPositionManagerABI,
      functionName: 'removeMargin',
      args: [marketId as `0x${string}`, isLong, marginAmount],
    });
  };

  return {
    removeMargin,
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
//                  FUNDING RATE HOOK
// =============================================================

export function useFundingRate(marketName: string | undefined) {
  const chainId = useChainId();
  const isAvailable = areExternalProtocolsAvailable(chainId);
  const addresses = isAvailable ? getSparkDEXEternalAddresses(chainId) : null;

  const marketId = marketName ? encodeMarketId(marketName) : undefined;

  const { data: fundingRate, isLoading, refetch } = useReadContract({
    address: addresses?.store || '0x0000000000000000000000000000000000000000',
    abi: StoreABI,
    functionName: 'getFundingRate',
    args: marketId ? [marketId as `0x${string}`] : undefined,
    query: { enabled: isAvailable && !!marketId },
  });

  // Calculate APR from funding rate (funding rate is per 8 hours typically)
  const fundingRateApr = fundingRate
    ? Number(fundingRate) * 3 * 365 / 1e18 * 100 // Convert to annual percentage
    : undefined;

  return {
    data: fundingRate,
    fundingRateApr,
    isLoading,
    refetch,
    isAvailable,
  };
}

// =============================================================
//                  LIQUIDATION PRICE HOOK
// =============================================================

export function useLiquidationPrice(marketName: string | undefined, isLong: boolean = true) {
  const { address } = useAccount();
  const chainId = useChainId();
  const isAvailable = areExternalProtocolsAvailable(chainId);
  const addresses = isAvailable ? getSparkDEXEternalAddresses(chainId) : null;

  const marketId = marketName ? encodeMarketId(marketName) : undefined;

  const { data: liquidationPrice, isLoading, refetch } = useReadContract({
    address: addresses?.positionManager || '0x0000000000000000000000000000000000000000',
    abi: PerpPositionManagerABI,
    functionName: 'getLiquidationPrice',
    args: address && marketId ? [address, marketId as `0x${string}`, isLong] : undefined,
    query: { enabled: isAvailable && !!address && !!marketId },
  });

  return {
    data: liquidationPrice,
    isLoading,
    refetch,
    isAvailable,
  };
}

// =============================================================
//                  POSITION PNL HOOK
// =============================================================

export function usePositionPnl(marketName: string | undefined, isLong: boolean = true) {
  const { address } = useAccount();
  const chainId = useChainId();
  const isAvailable = areExternalProtocolsAvailable(chainId);
  const addresses = isAvailable ? getSparkDEXEternalAddresses(chainId) : null;

  const marketId = marketName ? encodeMarketId(marketName) : undefined;

  const { data: pnl, isLoading, refetch } = useReadContract({
    address: addresses?.positionManager || '0x0000000000000000000000000000000000000000',
    abi: PerpPositionManagerABI,
    functionName: 'getPositionPnl',
    args: address && marketId ? [address, marketId as `0x${string}`, isLong] : undefined,
    query: { enabled: isAvailable && !!address && !!marketId },
  });

  return {
    data: pnl,
    isProfitable: pnl !== undefined ? pnl > 0n : undefined,
    isLoading,
    refetch,
    isAvailable,
  };
}

// =============================================================
//                   MARK PRICE HOOK
// =============================================================

export function useMarkPrice(marketName: string | undefined) {
  const chainId = useChainId();
  const isAvailable = areExternalProtocolsAvailable(chainId);
  const addresses = isAvailable ? getSparkDEXEternalAddresses(chainId) : null;

  const marketId = marketName ? encodeMarketId(marketName) : undefined;

  const { data: markPrice, isLoading, refetch } = useReadContract({
    address: addresses?.store || '0x0000000000000000000000000000000000000000',
    abi: StoreABI,
    functionName: 'getMarkPrice',
    args: marketId ? [marketId as `0x${string}`] : undefined,
    query: { enabled: isAvailable && !!marketId },
  });

  return {
    data: markPrice,
    isLoading,
    refetch,
    isAvailable,
  };
}

// =============================================================
//                   INDEX PRICE HOOK
// =============================================================

export function useIndexPrice(marketName: string | undefined) {
  const chainId = useChainId();
  const isAvailable = areExternalProtocolsAvailable(chainId);
  const addresses = isAvailable ? getSparkDEXEternalAddresses(chainId) : null;

  const marketId = marketName ? encodeMarketId(marketName) : undefined;

  const { data: indexPrice, isLoading, refetch } = useReadContract({
    address: addresses?.store || '0x0000000000000000000000000000000000000000',
    abi: StoreABI,
    functionName: 'getIndexPrice',
    args: marketId ? [marketId as `0x${string}`] : undefined,
    query: { enabled: isAvailable && !!marketId },
  });

  return {
    data: indexPrice,
    isLoading,
    refetch,
    isAvailable,
  };
}
