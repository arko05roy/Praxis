/**
 * FAssets Contract Addresses on Flare Networks
 *
 * FAssets is Flare's trustless, over-collateralized bridge connecting
 * non-smart contract networks (XRP, BTC, DOGE) to Flare DeFi.
 *
 * Addresses verified from official documentation and block explorers.
 * https://dev.flare.network/fassets/overview
 */

// =============================================================
//                       FXRP (XRP on Flare)
// =============================================================

/**
 * FXRP Token and Related Addresses (Flare Mainnet)
 * FXRP is a 1:1, overcollateralized ERC-20 representation of XRP
 */
export const FXRP_FLARE = {
  // FXRP token contract (ERC-20)
  token: "0xad552a648c74d49e10027ab8a618a3ad4901c5be",
  // Decimals: 6 (same as XRP)
  decimals: 6,
  // Symbol
  symbol: "FXRP",
  // Underlying asset
  underlying: "XRP",
};

// =============================================================
//                    FXRP DEX LIQUIDITY POOLS
// =============================================================

/**
 * FXRP Liquidity Pools on Flare DEXes
 * These pools provide trading liquidity for FXRP
 */
export const FXRP_POOLS_FLARE = {
  // SparkDEX V2 FXRP/WFLR pool
  sparkdexV2_FXRP_WFLR: "0xa76a120567ed3ab3065759d3ad3ab2acd79530bf",
  // SparkDEX V3.1 stXRP/FXRP pool (0.05% fee)
  sparkdexV3_stXRP_FXRP_005: "0xffed33d28ca65e52e927849f456d8e820b324508",
  // SparkDEX V3.1 stXRP/FXRP pool (0.01% fee)
  sparkdexV3_stXRP_FXRP_001: "0x24ba60f015f98cf5e13f10e2073742ebd515e8a8",
};

// =============================================================
//                       FBTC (Bitcoin on Flare)
// =============================================================

/**
 * FBTC Token Addresses (Flare Mainnet)
 * Note: FBTC is planned for Q1 2026, addresses TBD
 */
export const FBTC_FLARE = {
  token: "", // Not yet deployed
  decimals: 8, // Expected to match BTC
  symbol: "FBTC",
  underlying: "BTC",
};

// =============================================================
//                       FDOGE (Dogecoin on Flare)
// =============================================================

/**
 * FDOGE Token Addresses (Flare Mainnet)
 * Note: FDOGE is planned for Q1 2026, addresses TBD
 */
export const FDOGE_FLARE = {
  token: "", // Not yet deployed
  decimals: 8, // Expected to match DOGE
  symbol: "FDOGE",
  underlying: "DOGE",
};

// =============================================================
//                    RELATED TOKEN ADDRESSES
// =============================================================

/**
 * stXRP - Staked XRP token (liquid staking derivative)
 * Used in various FXRP trading pairs
 */
export const STXRP_FLARE = {
  token: "0x5795377c85e0fdf6370fae1b74fe03b930b2de24", // Firelight stXRP
  decimals: 6,
  symbol: "stXRP",
};

/**
 * Common tokens used in FAsset pairs
 */
export const FASSET_PAIRED_TOKENS_FLARE = {
  WFLR: "0x1D80c49BbBCd1C0911346656B529DF9E5c2F783d",
  USDT0: "0x96B41289D90444B8adD57e6F265DB5aE8651DF29",
  USDC: "0xFbDa5F676cB37624f28265A144A48B0d6e87d3b6",
  WETH: "0x1502FA4be69d526124D453619276FacCab275d3D",
};

// =============================================================
//                       ALL FASSETS COMBINED
// =============================================================

/**
 * All FAsset tokens on Flare mainnet
 */
export const ALL_FASSETS_FLARE = {
  FXRP: FXRP_FLARE,
  FBTC: FBTC_FLARE,
  FDOGE: FDOGE_FLARE,
};

// =============================================================
//                       COSTON2 TESTNET
// =============================================================

/**
 * FAssets on Coston2 Testnet
 * Note: FAssets are only available on mainnet currently
 */
export const FXRP_COSTON2 = {
  token: "", // Not deployed on testnet
  decimals: 6,
  symbol: "FXRP",
  underlying: "XRP",
};

export const FBTC_COSTON2 = {
  token: "", // Not deployed on testnet
  decimals: 8,
  symbol: "FBTC",
  underlying: "BTC",
};

export const FDOGE_COSTON2 = {
  token: "", // Not deployed on testnet
  decimals: 8,
  symbol: "FDOGE",
  underlying: "DOGE",
};

// =============================================================
//                       HELPER FUNCTIONS
// =============================================================

/**
 * Get FAsset addresses for a given network
 * @param chainId Network chain ID
 */
export function getFAssetAddresses(chainId: number) {
  switch (chainId) {
    case 14: // Flare Mainnet
      return {
        fxrp: FXRP_FLARE,
        fbtc: FBTC_FLARE,
        fdoge: FDOGE_FLARE,
        pools: FXRP_POOLS_FLARE,
        pairedTokens: FASSET_PAIRED_TOKENS_FLARE,
        stxrp: STXRP_FLARE,
      };
    case 114: // Coston2 Testnet
      return {
        fxrp: FXRP_COSTON2,
        fbtc: FBTC_COSTON2,
        fdoge: FDOGE_COSTON2,
        pools: {},
        pairedTokens: {},
        stxrp: { token: "", decimals: 6, symbol: "stXRP" },
      };
    default:
      throw new Error(`Unsupported chain ID for FAssets: ${chainId}`);
  }
}

/**
 * Check if FAssets are available on a network
 * @param chainId Network chain ID
 */
export function areFAssetsAvailable(chainId: number): boolean {
  return chainId === 14; // Only available on Flare mainnet
}

/**
 * Check if an address is a known FAsset token
 * @param address Token address to check
 * @param chainId Network chain ID
 */
export function isFAssetToken(address: string, chainId: number): boolean {
  if (chainId !== 14) return false;

  const lowerAddress = address.toLowerCase();
  return (
    lowerAddress === FXRP_FLARE.token.toLowerCase() ||
    (FBTC_FLARE.token && lowerAddress === FBTC_FLARE.token.toLowerCase()) ||
    (FDOGE_FLARE.token && lowerAddress === FDOGE_FLARE.token.toLowerCase())
  );
}

/**
 * Get FAsset info by address
 * @param address Token address
 * @param chainId Network chain ID
 */
export function getFAssetByAddress(address: string, chainId: number) {
  if (chainId !== 14) return undefined;

  const lowerAddress = address.toLowerCase();

  if (lowerAddress === FXRP_FLARE.token.toLowerCase()) {
    return FXRP_FLARE;
  }
  if (FBTC_FLARE.token && lowerAddress === FBTC_FLARE.token.toLowerCase()) {
    return FBTC_FLARE;
  }
  if (FDOGE_FLARE.token && lowerAddress === FDOGE_FLARE.token.toLowerCase()) {
    return FDOGE_FLARE;
  }

  return undefined;
}

/**
 * Get all deployed FAsset token addresses
 * @param chainId Network chain ID
 */
export function getDeployedFAssets(chainId: number): string[] {
  if (chainId !== 14) return [];

  const addresses: string[] = [];

  if (FXRP_FLARE.token) addresses.push(FXRP_FLARE.token);
  if (FBTC_FLARE.token) addresses.push(FBTC_FLARE.token);
  if (FDOGE_FLARE.token) addresses.push(FDOGE_FLARE.token);

  return addresses;
}

/**
 * FAsset symbols to addresses mapping
 */
export const FASSET_SYMBOL_TO_ADDRESS: Record<string, string> = {
  FXRP: FXRP_FLARE.token,
  FBTC: FBTC_FLARE.token,
  FDOGE: FDOGE_FLARE.token,
};
