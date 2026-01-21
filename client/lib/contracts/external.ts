// External Protocol Addresses on Flare Mainnet
// These are the REAL protocol addresses - NOT PRAXIS contracts

// =============================================================
//                       SPARKDEX V3 (DEX)
// =============================================================

export const SPARKDEX_ADDRESSES = {
  14: {
    swapRouter: '0x8a1E35F5c98C4E85B36B7B253222eE17773b2781' as `0x${string}`,
    quoterV2: '0x2DcABbB3a5Fe9DBb1F43edf48449aA7254Ef3a80' as `0x${string}`,
    factory: '0x8A2578d23d4C532cC9A98FaD91C0523f5efDE652' as `0x${string}`,
    nonfungiblePositionManager: '0xEE5FF5Bc5F852764b5584d92A4d592A53DC527da' as `0x${string}`,
  },
  114: {
    swapRouter: '' as `0x${string}`, // Not deployed on Coston2
    quoterV2: '' as `0x${string}`,
    factory: '' as `0x${string}`,
    nonfungiblePositionManager: '' as `0x${string}`,
  },
  31337: {
    swapRouter: '' as `0x${string}`,
    quoterV2: '' as `0x${string}`,
    factory: '' as `0x${string}`,
    nonfungiblePositionManager: '' as `0x${string}`,
  },
} as const;

// =============================================================
//                 SPARKDEX ETERNAL (PERPETUALS)
// =============================================================
// Verified from: https://docs.sparkdex.ai/additional-information/smart-contract-overview/perps-exchange

export const SPARKDEX_ETERNAL_ADDRESSES = {
  14: {
    // Core Trading Contracts
    orderBook: '0xf76DC0d42A40E53021162521E5ac916AAe2500B9' as `0x${string}`,
    store: '0x74DA11B3Bb05277CF1cd3572a74d626949183e58' as `0x${string}`,
    positionManager: '0x0d59962e4fC41a09B73283d1a0bf305dB1237c48' as `0x${string}`,
    fundingTracker: '0x96Adda2A49E910d8A1def86D45dAD59F80E7A9C6' as `0x${string}`,
    executor: '0x7c224027d3188a6d97186604234c6BFa5CE6CD8E' as `0x${string}`,
    // Validation & Support
    tradingValidator: '0x7c6F8Db7C4Cb32F9540478264b15637933E443A4' as `0x${string}`,
    referralStorage: '0x7c45e1b4CF81581927a854d7d47c79e3F7211309' as `0x${string}`,
    referralReader: '0x5D99C306370477893b34848C39Db38E04C4cECB5' as `0x${string}`,
    addressStorage: '0x6098bF06bB653626Fa25c44CB232eC4A2bDc659D' as `0x${string}`,
    // Oracle
    ftsoV2: '0x586F35597D0F0f16c46EaDBffB08a3b439ff17ee' as `0x${string}`,
    // Admin
    timelock: '0xB0739F8e71E20B384d29e4597602C89FB7E0A808' as `0x${string}`,
  },
  114: {
    orderBook: '' as `0x${string}`,
    store: '' as `0x${string}`,
    positionManager: '' as `0x${string}`,
    fundingTracker: '' as `0x${string}`,
    executor: '' as `0x${string}`,
    tradingValidator: '' as `0x${string}`,
    referralStorage: '' as `0x${string}`,
    referralReader: '' as `0x${string}`,
    addressStorage: '' as `0x${string}`,
    ftsoV2: '' as `0x${string}`,
    timelock: '' as `0x${string}`,
  },
  31337: {
    orderBook: '' as `0x${string}`,
    store: '' as `0x${string}`,
    positionManager: '' as `0x${string}`,
    fundingTracker: '' as `0x${string}`,
    executor: '' as `0x${string}`,
    tradingValidator: '' as `0x${string}`,
    referralStorage: '' as `0x${string}`,
    referralReader: '' as `0x${string}`,
    addressStorage: '' as `0x${string}`,
    ftsoV2: '' as `0x${string}`,
    timelock: '' as `0x${string}`,
  },
} as const;

// SparkDEX Eternal Market IDs (bytes10 encoded)
export const SPARKDEX_ETERNAL_MARKETS = {
  'ETH-USD': '0x4554482d555344000000',
  'BTC-USD': '0x4254432d555344000000',
  'XRP-USD': '0x5852502d555344000000',
  'FLR-USD': '0x464c522d555344000000',
  'DOGE-USD': '0x444f47452d5553440000',
  'SOL-USD': '0x534f4c2d555344000000',
  'AVAX-USD': '0x415641582d5553440000',
  'LINK-USD': '0x4c494e4b2d5553440000',
  'MATIC-USD': '0x4d415449432d55534400',
  'ARB-USD': '0x4152422d555344000000',
} as const;

// =============================================================
//                   BLAZESWAP (V2 DEX)
// =============================================================
// Verified from: https://mainnet.flarescan.com

export const BLAZESWAP_ADDRESSES = {
  14: {
    router: '0xe3A1b355ca63abCBC9589334B5e609583C7BAa06' as `0x${string}`,
    factory: '0x3ad13e1bDD283e4F8d8196b002b80D1BADF39884' as `0x${string}`,
  },
  114: {
    router: '' as `0x${string}`,
    factory: '' as `0x${string}`,
  },
  31337: {
    router: '' as `0x${string}`,
    factory: '' as `0x${string}`,
  },
} as const;

// =============================================================
//                     ENOSYS (V3 DEX)
// =============================================================
// Partially verified from: https://mainnet.flarescan.com
// TODO: Verify swapRouter and quoterV2 addresses from Enosys team

export const ENOSYS_ADDRESSES = {
  14: {
    // V3 Concentrated Liquidity (Uniswap V3 fork)
    nonfungiblePositionManager: '0xD9770b1C7A6ccd33C75b5bcB1c0078f46bE46657' as `0x${string}`,
    // V2 AMM
    v2Factory: '0x28b70f6Ed97429E40FE9a9CD3EB8E86BCBA11dd4' as `0x${string}`,
    // TODO: These need verification from Enosys documentation
    swapRouter: '0x0000000000000000000000000000000000000000' as `0x${string}`, // UNVERIFIED
    quoterV2: '0x0000000000000000000000000000000000000000' as `0x${string}`, // UNVERIFIED
    factory: '0x0000000000000000000000000000000000000000' as `0x${string}`, // UNVERIFIED (V3 factory)
  },
  114: {
    nonfungiblePositionManager: '' as `0x${string}`,
    v2Factory: '' as `0x${string}`,
    swapRouter: '' as `0x${string}`,
    quoterV2: '' as `0x${string}`,
    factory: '' as `0x${string}`,
  },
  31337: {
    nonfungiblePositionManager: '' as `0x${string}`,
    v2Factory: '' as `0x${string}`,
    swapRouter: '' as `0x${string}`,
    quoterV2: '' as `0x${string}`,
    factory: '' as `0x${string}`,
  },
} as const;

// =============================================================
//                     FASSETS
// =============================================================

export const FASSET_ADDRESSES = {
  14: {
    FXRP: '0xad552a648c74d49e10027ab8a618a3ad4901c5be' as `0x${string}`,
    FBTC: '0x0000000000000000000000000000000000000000' as `0x${string}`, // TBD
    FDOGE: '0x0000000000000000000000000000000000000000' as `0x${string}`, // TBD
    // Pools for swapping
    pools: {
      FXRP: [
        { pair: 'FXRP/WFLR', address: '0xa76a120567ed3ab3065759d3ad3ab2acd79530bf' as `0x${string}`, dex: 'SparkDEX' },
      ],
      FBTC: [],
      FDOGE: [],
    },
  },
  114: {
    FXRP: '' as `0x${string}`,
    FBTC: '' as `0x${string}`,
    FDOGE: '' as `0x${string}`,
    pools: {
      FXRP: [],
      FBTC: [],
      FDOGE: [],
    },
  },
  31337: {
    FXRP: '' as `0x${string}`,
    FBTC: '' as `0x${string}`,
    FDOGE: '' as `0x${string}`,
    pools: {
      FXRP: [],
      FBTC: [],
      FDOGE: [],
    },
  },
} as const;

// FAsset FTSO Feed IDs
export const FASSET_FEED_IDS = {
  FXRP: '0x015852502f55534400000000000000000000000000', // XRP/USD
  FBTC: '0x014254432f55534400000000000000000000000000', // BTC/USD
  FDOGE: '0x01444f47452f5553440000000000000000000000', // DOGE/USD
} as const;

// =============================================================
//                  FLARE SYSTEM CONTRACTS
// =============================================================

export const FLARE_SYSTEM_ADDRESSES = {
  14: {
    ftsoV2: '0x3d893C53D9e8056135C26C8c638B76C8b60Df726' as `0x${string}`,
    contractRegistry: '0xaD67FE66660Fb8dFE9d6b1b4240d8650e30F6019' as `0x${string}`,
    fdcHub: '0x0000000000000000000000000000000000000000' as `0x${string}`, // TBD
  },
  114: {
    ftsoV2: '0x3d893C53D9e8056135C26C8c638B76C8b60Df726' as `0x${string}`, // Same on testnet
    contractRegistry: '0xaD67FE66660Fb8dFE9d6b1b4240d8650e30F6019' as `0x${string}`,
    fdcHub: '0x0000000000000000000000000000000000000000' as `0x${string}`,
  },
  31337: {
    ftsoV2: '0x3d893C53D9e8056135C26C8c638B76C8b60Df726' as `0x${string}`,
    contractRegistry: '0xaD67FE66660Fb8dFE9d6b1b4240d8650e30F6019' as `0x${string}`,
    fdcHub: '0x0000000000000000000000000000000000000000' as `0x${string}`,
  },
} as const;

// Common FTSO Feed IDs
export const FTSO_FEED_IDS = {
  'FLR/USD': '0x01464c522f555344000000000000000000000000',
  'BTC/USD': '0x014254432f55534400000000000000000000000000',
  'ETH/USD': '0x014554482f55534400000000000000000000000000',
  'XRP/USD': '0x015852502f55534400000000000000000000000000',
  'DOGE/USD': '0x01444f47452f5553440000000000000000000000',
  'LTC/USD': '0x014c54432f55534400000000000000000000000000',
  'XLM/USD': '0x01584c4d2f55534400000000000000000000000000',
  'ADA/USD': '0x014144412f55534400000000000000000000000000',
  'ALGO/USD': '0x01414c474f2f555344000000000000000000000000',
  'AVAX/USD': '0x01415641582f5553440000000000000000000000',
  'SOL/USD': '0x01534f4c2f55534400000000000000000000000000',
  'MATIC/USD': '0x014d415449432f555344000000000000000000',
} as const;

// =============================================================
//                    SCEPTRE (LIQUID STAKING)
// =============================================================

export const SCEPTRE_ADDRESSES = {
  14: {
    sFLR: '0x12e605bc104e93B45e1aD99F9e555f659051c2BB' as `0x${string}`,
  },
  114: {
    sFLR: '' as `0x${string}`, // Not deployed on Coston2
  },
  31337: {
    sFLR: '' as `0x${string}`,
  },
} as const;

// =============================================================
//                      KINETIC (LENDING)
// =============================================================

export const KINETIC_ADDRESSES = {
  14: {
    comptroller: '0x8041680Fb73E1Fe5F851e76233DCDfA0f2D2D7c8' as `0x${string}`,
    kTokens: {
      kWETH: '0x5C2400019017AE61F811D517D088Df732642DbD0' as `0x${string}`,
      ksFLR: '0x291487beC339c2fE5D83DD45F0a15EFC9Ac45656' as `0x${string}`,
      kUSDC: '0xDEeBaBe05BDA7e8C1740873abF715f16164C29B8' as `0x${string}`,
      kUSDT: '0x1e5bBC19E0B17D7d38F318C79401B3D16F2b93bb' as `0x${string}`,
      kflrETH: '0x40eE5dfe1D4a957cA8AC4DD4ADaf8A8fA76b1C16' as `0x${string}`,
    },
  },
  114: {
    comptroller: '' as `0x${string}`, // Not deployed on Coston2
    kTokens: {},
  },
  31337: {
    comptroller: '' as `0x${string}`, // Not deployed on Coston2
    kTokens: {},
  },
} as const;

// =============================================================
//                     COMMON TOKENS
// =============================================================

export const TOKEN_ADDRESSES = {
  14: {
    WFLR: '0x1D80c49BbBCd1C0911346656B529DF9E5c2F783d' as `0x${string}`,
    sFLR: '0x12e605bc104e93B45e1aD99F9e555f659051c2BB' as `0x${string}`,
    USDC: '0xFbDa5F676cB37624f28265A144A48B0d6e87d3b6' as `0x${string}`,
    USDT: '0x0B38e83B86d491735fEaa0a791F65c2B99535396' as `0x${string}`,
    WETH: '0x1502FA4be69d526124D453619276FacCab275d3D' as `0x${string}`,
  },
  114: {
    WFLR: '0xC67DCE33D7A8efA5FfEB961899C73fe01bCe9273' as `0x${string}`,
    sFLR: '' as `0x${string}`,
    USDC: '' as `0x${string}`,
    USDT: '' as `0x${string}`,
    WETH: '' as `0x${string}`,
  },
  31337: {
    WFLR: '0xC67DCE33D7A8efA5FfEB961899C73fe01bCe9273' as `0x${string}`,
    sFLR: '' as `0x${string}`,
    USDC: '' as `0x${string}`,
    USDT: '' as `0x${string}`,
    WETH: '' as `0x${string}`,
  },
} as const;

// =============================================================
//                     V3 FEE TIERS
// =============================================================

export const V3_FEE_TIERS = {
  LOWEST: 100,   // 0.01%
  LOW: 500,      // 0.05%
  MEDIUM: 3000,  // 0.3%
  HIGH: 10000,   // 1%
} as const;

// =============================================================
//                    HELPER FUNCTIONS
// =============================================================

export type SupportedChainId = 14 | 114 | 31337;

export function getSparkDEXAddresses(chainId: number) {
  if (chainId === 14 || chainId === 114 || chainId === 31337) {
    return SPARKDEX_ADDRESSES[chainId as SupportedChainId];
  }
  throw new Error(`SparkDEX not available on chain ${chainId}`);
}

export function getSceptreAddresses(chainId: number) {
  if (chainId === 14 || chainId === 114 || chainId === 31337) {
    return SCEPTRE_ADDRESSES[chainId as SupportedChainId];
  }
  throw new Error(`Sceptre not available on chain ${chainId}`);
}

export function getKineticAddresses(chainId: number) {
  if (chainId === 14 || chainId === 114 || chainId === 31337) {
    return KINETIC_ADDRESSES[chainId as SupportedChainId];
  }
  throw new Error(`Kinetic not available on chain ${chainId}`);
}

export function getTokenAddresses(chainId: number) {
  if (chainId === 14 || chainId === 114 || chainId === 31337) {
    return TOKEN_ADDRESSES[chainId as SupportedChainId];
  }
  throw new Error(`Tokens not configured for chain ${chainId}`);
}

export function isMainnet(chainId: number): boolean {
  return chainId === 14;
}

export function areExternalProtocolsAvailable(chainId: number): boolean {
  return chainId === 14; // Only on Flare mainnet
}

export function getSparkDEXEternalAddresses(chainId: number) {
  if (chainId === 14 || chainId === 114 || chainId === 31337) {
    return SPARKDEX_ETERNAL_ADDRESSES[chainId as SupportedChainId];
  }
  throw new Error(`SparkDEX Eternal not available on chain ${chainId}`);
}

export function getBlazeSwapAddresses(chainId: number) {
  if (chainId === 14 || chainId === 114 || chainId === 31337) {
    return BLAZESWAP_ADDRESSES[chainId as SupportedChainId];
  }
  throw new Error(`BlazeSwap not available on chain ${chainId}`);
}

export function getEnosysAddresses(chainId: number) {
  if (chainId === 14 || chainId === 114 || chainId === 31337) {
    return ENOSYS_ADDRESSES[chainId as SupportedChainId];
  }
  throw new Error(`Enosys not available on chain ${chainId}`);
}

export function getFAssetAddresses(chainId: number) {
  if (chainId === 14 || chainId === 114 || chainId === 31337) {
    return FASSET_ADDRESSES[chainId as SupportedChainId];
  }
  throw new Error(`FAssets not available on chain ${chainId}`);
}

export function getFlareSystemAddresses(chainId: number) {
  if (chainId === 14 || chainId === 114 || chainId === 31337) {
    return FLARE_SYSTEM_ADDRESSES[chainId as SupportedChainId];
  }
  throw new Error(`Flare system contracts not available on chain ${chainId}`);
}

// =============================================================
//                    HELPER FUNCTIONS
// =============================================================

// Encode market name to bytes10 market ID
export function encodeMarketId(marketName: string): string {
  // Check if already in our mapping
  if (marketName in SPARKDEX_ETERNAL_MARKETS) {
    return SPARKDEX_ETERNAL_MARKETS[marketName as keyof typeof SPARKDEX_ETERNAL_MARKETS];
  }

  // Encode manually: pad to 10 bytes
  const encoder = new TextEncoder();
  const bytes = encoder.encode(marketName);
  const padded = new Uint8Array(10);
  padded.set(bytes.slice(0, 10));
  return '0x' + Array.from(padded).map(b => b.toString(16).padStart(2, '0')).join('');
}

// Decode bytes10 market ID to name
export function decodeMarketId(marketId: string): string {
  // Remove 0x prefix
  const hex = marketId.startsWith('0x') ? marketId.slice(2) : marketId;
  const bytes = new Uint8Array(hex.match(/.{2}/g)?.map(byte => parseInt(byte, 16)) || []);
  const decoder = new TextDecoder();
  return decoder.decode(bytes).replace(/\0+$/, ''); // Remove null padding
}

// Encode feed name to bytes21 feed ID
export function encodeFeedId(feedName: string): string {
  // Check if already in our mapping
  if (feedName in FTSO_FEED_IDS) {
    return FTSO_FEED_IDS[feedName as keyof typeof FTSO_FEED_IDS];
  }

  // Encode manually: 0x01 + padded feed name
  const encoder = new TextEncoder();
  const bytes = encoder.encode(feedName);
  const padded = new Uint8Array(21);
  padded[0] = 0x01; // Category for crypto
  padded.set(bytes.slice(0, 20), 1);
  return '0x' + Array.from(padded).map(b => b.toString(16).padStart(2, '0')).join('');
}
