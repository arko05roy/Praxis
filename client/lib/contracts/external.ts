// External Protocol Addresses and Configuration
// Coston2 Testnet with Mock Protocols

// =============================================================
//                  FLARE SYSTEM CONTRACTS
// =============================================================
// These are the REAL Flare infrastructure contracts on Coston2

export const FLARE_SYSTEM_ADDRESSES = {
  114: {
    ftsoV2: '0x3d893C53D9e8056135C26C8c638B76C8b60Df726' as `0x${string}`,
    contractRegistry: '0xaD67FE66660Fb8dFE9d6b1b4240d8650e30F6019' as `0x${string}`,
    fdcHub: '0x56e51fF5B73067b27781c58e533A6bfB07C26F2C' as `0x${string}`,
  },
} as const;

// =============================================================
//                    FTSO FEED IDs
// =============================================================
// Real FTSO feeds that work on Coston2

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
  'USDC/USD': '0x01555344432f555344000000000000000000000000',
  'USDT/USD': '0x01555344542f555344000000000000000000000000',
} as const;

// FAsset FTSO Feed IDs (used for mock FAsset pricing)
export const FASSET_FEED_IDS = {
  FXRP: FTSO_FEED_IDS['XRP/USD'],
  FBTC: FTSO_FEED_IDS['BTC/USD'],
  FDOGE: FTSO_FEED_IDS['DOGE/USD'],
} as const;

// =============================================================
//                   MOCK PROTOCOL CONFIG
// =============================================================
// Mock protocol configuration for Coston2 testnet demo

export const MOCK_DEX_CONFIG = {
  // Default fee tier (0.3%)
  defaultFeeBps: 30,
  // Supported trading pairs (will be seeded with liquidity)
  pairs: [
    { tokenA: 'MockUSDC', tokenB: 'MockWFLR' },
    { tokenA: 'MockUSDC', tokenB: 'MockFXRP' },
    { tokenA: 'MockUSDC', tokenB: 'MockFBTC' },
    { tokenA: 'MockWFLR', tokenB: 'MockFXRP' },
  ],
} as const;

export const MOCK_SCEPTRE_CONFIG = {
  // Exchange rate: 1 sFLR = 1.05 FLR (simulating 5% yield)
  initialExchangeRate: 1050000000000000000n, // 1.05e18
  // No cooldown for testnet demo
  cooldownPeriod: 0,
} as const;

export const MOCK_KINETIC_CONFIG = {
  // Simulated APY display (8%)
  displayAPY: 800, // basis points
  // Collateral factor (80%)
  collateralFactor: 8000, // basis points (80%)
} as const;

// =============================================================
//                    TOKEN DECIMALS
// =============================================================

export const TOKEN_DECIMALS = {
  MockUSDC: 6,
  MockWFLR: 18,
  MockFXRP: 6,
  MockFBTC: 8,
  MockFDOGE: 8,
  MockSFLR: 18,
} as const;

// =============================================================
//                  COSTON2 TESTNET TOKENS
// =============================================================
// Deployed mock token addresses for Coston2 testnet demo

export const COSTON2_TOKENS = {
  MockUSDC: '0x9401FCe40Cb84b051215d96e85BecD733043a33D' as `0x${string}`,
  MockWFLR: '0x0a22b6e2f0ac6cDA83C04B1Ba33aAc8e9Df6aed7' as `0x${string}`,
  MockFXRP: '0x2859b97217cF2599D5F1e1c56735D283ec2144e3' as `0x${string}`,
  MockFBTC: '0x2E124DEaeD3Ba3b063356F9b45617d862e4b9dB5' as `0x${string}`,
  MockFDOGE: '0xeAD29cBfAb93ed51808D65954Dd1b3cDDaDA1348' as `0x${string}`,
  MockSFLR: '0x8C6057145c1C523e08D3D1dCbaC77925Ee25f46D' as `0x${string}`,
} as const;

// =============================================================
//                    HELPER FUNCTIONS
// =============================================================

export function getFlareSystemAddresses(chainId: number) {
  if (chainId === 114) {
    return FLARE_SYSTEM_ADDRESSES[114];
  }
  throw new Error(`Flare system contracts not configured for chain ${chainId}`);
}

// Check if mock protocols are available (always true for Coston2)
export function areMockProtocolsAvailable(chainId: number): boolean {
  return chainId === 114;
}

// Check if this is a testnet deployment
export function isTestnet(chainId: number): boolean {
  return chainId === 114;
}

// =============================================================
//                  V3 DEX FEE TIERS
// =============================================================

export const V3_FEE_TIERS = {
  LOWEST: 100,      // 0.01%
  LOW: 500,         // 0.05%
  MEDIUM: 3000,     // 0.3%
  HIGH: 10000,      // 1%
} as const;

// =============================================================
//                  SPARKDEX V3 ADDRESSES
// =============================================================

export interface SparkDEXAddresses {
  factory: `0x${string}`;
  swapRouter: `0x${string}`;
  quoter: `0x${string}`;
  positionManager: `0x${string}`;
}

const SPARKDEX_ADDRESSES: Record<number, SparkDEXAddresses> = {
  // Flare mainnet (Chain ID: 14)
  14: {
    factory: '0x0000000000000000000000000000000000000000' as `0x${string}`,
    swapRouter: '0x0000000000000000000000000000000000000000' as `0x${string}`,
    quoter: '0x0000000000000000000000000000000000000000' as `0x${string}`,
    positionManager: '0x0000000000000000000000000000000000000000' as `0x${string}`,
  },
};

export function getSparkDEXAddresses(chainId: number): SparkDEXAddresses | null {
  return SPARKDEX_ADDRESSES[chainId] || null;
}

// =============================================================
//                  SCEPTRE (sFLR) ADDRESSES
// =============================================================

export interface SceptreAddresses {
  sFLR: `0x${string}`;
  staking: `0x${string}`;
}

const SCEPTRE_ADDRESSES: Record<number, SceptreAddresses> = {
  // Flare mainnet (Chain ID: 14)
  14: {
    sFLR: '0x0000000000000000000000000000000000000000' as `0x${string}`,
    staking: '0x0000000000000000000000000000000000000000' as `0x${string}`,
  },
  // Coston2 testnet (Chain ID: 114) - uses MockSceptre
  114: {
    sFLR: '0x8C6057145c1C523e08D3D1dCbaC77925Ee25f46D' as `0x${string}`, // MockSceptre
    staking: '0x8C6057145c1C523e08D3D1dCbaC77925Ee25f46D' as `0x${string}`,
  },
};

export function getSceptreAddresses(chainId: number): SceptreAddresses | null {
  return SCEPTRE_ADDRESSES[chainId] || null;
}

// =============================================================
//                  KINETIC (LENDING) ADDRESSES
// =============================================================

export interface KineticAddresses {
  comptroller: `0x${string}`;
  kUSDC: `0x${string}`;
  kWFLR: `0x${string}`;
}

const KINETIC_ADDRESSES: Record<number, KineticAddresses> = {
  // Flare mainnet (Chain ID: 14)
  14: {
    comptroller: '0x0000000000000000000000000000000000000000' as `0x${string}`,
    kUSDC: '0x0000000000000000000000000000000000000000' as `0x${string}`,
    kWFLR: '0x0000000000000000000000000000000000000000' as `0x${string}`,
  },
  // Coston2 testnet (Chain ID: 114) - uses MockKinetic
  114: {
    comptroller: '0xf59C5d72cAA0875788fD9461488b4daC7d5EdA1f' as `0x${string}`, // MockKinetic
    kUSDC: '0xf59C5d72cAA0875788fD9461488b4daC7d5EdA1f' as `0x${string}`,
    kWFLR: '0xf59C5d72cAA0875788fD9461488b4daC7d5EdA1f' as `0x${string}`,
  },
};

export function getKineticAddresses(chainId: number): KineticAddresses | null {
  return KINETIC_ADDRESSES[chainId] || null;
}

// =============================================================
//                  BLAZESWAP V2 ADDRESSES
// =============================================================

export interface BlazeSwapAddresses {
  factory: `0x${string}`;
  router: `0x${string}`;
}

const BLAZESWAP_ADDRESSES: Record<number, BlazeSwapAddresses> = {
  // Flare mainnet (Chain ID: 14)
  14: {
    factory: '0x0000000000000000000000000000000000000000' as `0x${string}`,
    router: '0x0000000000000000000000000000000000000000' as `0x${string}`,
  },
  // Coston2 testnet (Chain ID: 114) - uses MockSimpleDEX
  114: {
    factory: '0x5F2577675beD125794FDfc44940b62D60BF00F81' as `0x${string}`, // MockSimpleDEX
    router: '0x5F2577675beD125794FDfc44940b62D60BF00F81' as `0x${string}`,
  },
};

export function getBlazeSwapAddresses(chainId: number): BlazeSwapAddresses | null {
  return BLAZESWAP_ADDRESSES[chainId] || null;
}

// =============================================================
//                  ENOSYS V3 ADDRESSES
// =============================================================

export interface EnosysAddresses {
  factory: `0x${string}`;
  swapRouter: `0x${string}`;
  quoter: `0x${string}`;
}

const ENOSYS_ADDRESSES: Record<number, EnosysAddresses> = {
  // Flare mainnet (Chain ID: 14)
  14: {
    factory: '0x0000000000000000000000000000000000000000' as `0x${string}`,
    swapRouter: '0x0000000000000000000000000000000000000000' as `0x${string}`,
    quoter: '0x0000000000000000000000000000000000000000' as `0x${string}`,
  },
};

export function getEnosysAddresses(chainId: number): EnosysAddresses | null {
  return ENOSYS_ADDRESSES[chainId] || null;
}

// =============================================================
//                  TOKEN ADDRESSES
// =============================================================

export interface TokenAddresses {
  WFLR: `0x${string}`;
  USDC: `0x${string}`;
  USDT: `0x${string}`;
}

const TOKEN_ADDRESSES: Record<number, TokenAddresses> = {
  // Flare mainnet (Chain ID: 14)
  14: {
    WFLR: '0x0000000000000000000000000000000000000000' as `0x${string}`,
    USDC: '0x0000000000000000000000000000000000000000' as `0x${string}`,
    USDT: '0x0000000000000000000000000000000000000000' as `0x${string}`,
  },
};

export function getTokenAddresses(chainId: number): TokenAddresses | null {
  return TOKEN_ADDRESSES[chainId] || null;
}

// =============================================================
//                  FASSET ADDRESSES
// =============================================================

export interface FAssetAddresses {
  assetManager: `0x${string}`;
  fxrp: `0x${string}`;
  fbtc: `0x${string}`;
  fdoge: `0x${string}`;
}

const FASSET_ADDRESSES: Record<number, FAssetAddresses> = {
  // Coston2 testnet uses our mock FAssets from PRAXIS_ADDRESSES
  // For mainnet, these would be the actual FAsset contract addresses
  14: {
    assetManager: '0x0000000000000000000000000000000000000000' as `0x${string}`,
    fxrp: '0x0000000000000000000000000000000000000000' as `0x${string}`,
    fbtc: '0x0000000000000000000000000000000000000000' as `0x${string}`,
    fdoge: '0x0000000000000000000000000000000000000000' as `0x${string}`,
  },
  // Coston2 testnet uses our mock FAssets
  114: {
    assetManager: '0x0000000000000000000000000000000000000000' as `0x${string}`, // Not used for basic balances
    fxrp: COSTON2_TOKENS.MockFXRP,
    fbtc: COSTON2_TOKENS.MockFBTC,
    fdoge: COSTON2_TOKENS.MockFDOGE,
  },
};

export function getFAssetAddresses(chainId: number): FAssetAddresses | null {
  return FASSET_ADDRESSES[chainId] || null;
}
// Encode feed name to bytes21 feed ID
export function encodeFeedId(feedName: string): string {
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

// Get feed ID for a token symbol
export function getFeedIdForToken(tokenSymbol: string): string | null {
  const feedMap: Record<string, string> = {
    'MockFXRP': FTSO_FEED_IDS['XRP/USD'],
    'MockFBTC': FTSO_FEED_IDS['BTC/USD'],
    'MockFDOGE': FTSO_FEED_IDS['DOGE/USD'],
    'MockWFLR': FTSO_FEED_IDS['FLR/USD'],
    'MockUSDC': FTSO_FEED_IDS['USDC/USD'],
    'FXRP': FTSO_FEED_IDS['XRP/USD'],
    'FBTC': FTSO_FEED_IDS['BTC/USD'],
    'FDOGE': FTSO_FEED_IDS['DOGE/USD'],
    'WFLR': FTSO_FEED_IDS['FLR/USD'],
    'FLR': FTSO_FEED_IDS['FLR/USD'],
  };
  return feedMap[tokenSymbol] || null;
}

// =============================================================
//                  SPARKDEX ETERNAL (PERPETUALS)
// =============================================================
// Note: SparkDEX Eternal is mainnet only. For testnet, we provide mock data
// that allows the UI to render without errors while showing "not available"

// SparkDEX Eternal market IDs (bytes10 encoded)
export const SPARKDEX_ETERNAL_MARKETS = {
  'ETH-USD': '0x4554482d55534400000000' as `0x${string}`,
  'BTC-USD': '0x4254432d55534400000000' as `0x${string}`,
  'FLR-USD': '0x464c522d55534400000000' as `0x${string}`,
  'XRP-USD': '0x5852502d55534400000000' as `0x${string}`,
} as const;

// Encode market name to bytes10 market ID
export function encodeMarketId(marketName: string): `0x${string}` {
  if (marketName in SPARKDEX_ETERNAL_MARKETS) {
    return SPARKDEX_ETERNAL_MARKETS[marketName as keyof typeof SPARKDEX_ETERNAL_MARKETS];
  }

  // Encode manually: market name padded to 10 bytes
  const encoder = new TextEncoder();
  const bytes = encoder.encode(marketName);
  const padded = new Uint8Array(10);
  padded.set(bytes.slice(0, 10), 0);
  return ('0x' + Array.from(padded).map(b => b.toString(16).padStart(2, '0')).join('')) as `0x${string}`;
}

// SparkDEX Eternal addresses (mainnet only - empty for testnet)
export interface SparkDEXEternalAddresses {
  orderBook: `0x${string}`;
  store: `0x${string}`;
  positionManager: `0x${string}`;
  feeReceiver: `0x${string}`;
}

const SPARKDEX_ETERNAL_ADDRESSES: Record<number, SparkDEXEternalAddresses> = {
  // Flare mainnet (Chain ID: 14)
  14: {
    orderBook: '0x0000000000000000000000000000000000000000' as `0x${string}`,
    store: '0x0000000000000000000000000000000000000000' as `0x${string}`,
    positionManager: '0x0000000000000000000000000000000000000000' as `0x${string}`,
    feeReceiver: '0x0000000000000000000000000000000000000000' as `0x${string}`,
  },
};

export function getSparkDEXEternalAddresses(chainId: number): SparkDEXEternalAddresses | null {
  return SPARKDEX_ETERNAL_ADDRESSES[chainId] || null;
}

// Check if external protocols are available
export function areExternalProtocolsAvailable(chainId: number): boolean {
  // Support both Flare mainnet and Coston2 testnet (with mocks)
  return chainId === 14 || chainId === 114;
}
