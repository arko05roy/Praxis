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

export type SupportedChainId = 14 | 114;

export function getSparkDEXAddresses(chainId: number) {
  if (chainId === 14 || chainId === 114) {
    return SPARKDEX_ADDRESSES[chainId as SupportedChainId];
  }
  throw new Error(`SparkDEX not available on chain ${chainId}`);
}

export function getSceptreAddresses(chainId: number) {
  if (chainId === 14 || chainId === 114) {
    return SCEPTRE_ADDRESSES[chainId as SupportedChainId];
  }
  throw new Error(`Sceptre not available on chain ${chainId}`);
}

export function getKineticAddresses(chainId: number) {
  if (chainId === 14 || chainId === 114) {
    return KINETIC_ADDRESSES[chainId as SupportedChainId];
  }
  throw new Error(`Kinetic not available on chain ${chainId}`);
}

export function getTokenAddresses(chainId: number) {
  if (chainId === 14 || chainId === 114) {
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
