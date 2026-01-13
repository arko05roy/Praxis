/**
 * Yield Protocol Contract Addresses on Flare Networks
 *
 * These addresses are for yield protocols (Sceptre, Kinetic) deployed on Flare.
 * Addresses are verified from official documentation and block explorers.
 */

// =============================================================
//                    SCEPTRE LIQUID STAKING
// =============================================================

/**
 * Sceptre sFLR Addresses (Flare Mainnet)
 * sFLR is the liquid staking token for staked FLR
 */
export const SCEPTRE_FLARE = {
  // sFLR token is also the staking contract (proxy)
  sflr: "0x12e605bc104e93B45e1aD99F9e555f659051c2BB",
  // Implementation contract (behind proxy)
  implementation: "0x4ed1beee9d4102ff7ff261e40f2db8a73cc8e940",
  // Proxy admin
  proxyAdmin: "0x1e3beaf840b96353a8be0a75b6dbb176dced66ce",
};

// =============================================================
//                       KINETIC LENDING
// =============================================================

/**
 * Kinetic Protocol Addresses (Flare Mainnet)
 * Compound V2 fork for lending/borrowing
 *
 * IMPORTANT: Use `comptroller` (Unitroller proxy) for all interactions.
 * The Unitroller is the proxy that holds state and delegates to the implementation.
 */
export const KINETIC_FLARE = {
  // Core contracts - Use comptroller (unitroller proxy) for all interactions
  comptroller: "0x8041680Fb73E1Fe5F851e76233DCDfA0f2D2D7c8", // Unitroller (proxy) - USE THIS
  comptrollerImpl: "0xeC7e541375D70c37262f619162502dB9131d6db5", // Implementation - do not use directly

  // kTokens (interest-bearing receipt tokens)
  kTokens: {
    kWETH: "0x5C2400019017AE61F811D517D088Df732642DbD0",
    ksFLR: "0x291487beC339c2fE5D83DD45F0a15EFC9Ac45656",
    kUSDC: "0xDEeBaBe05BDA7e8C1740873abF715f16164C29B8",
    kUSDT: "0x1e5bBC19E0B17D7d38F318C79401B3D16F2b93bb",
    kflrETH: "0x40eE5dfe1D4a957cA8AC4DD4ADaf8A8fA76b1C16",
  },

  // Underlying tokens for each kToken
  underlying: {
    USDC: "0xFbDa5F676cB37624f28265A144A48B0d6e87d3b6",
    USDT: "0x0B38e83B86d491735fEaa0a791F65c2B99535396",
    WETH: "0x1502FA4be69d526124D453619276FacCab275d3D",
    sFLR: "0x12e605bc104e93B45e1aD99F9e555f659051c2BB",
  },
};

// =============================================================
//                       COMMON TOKENS
// =============================================================

/**
 * Common Token Addresses (Flare Mainnet)
 */
export const TOKENS_FLARE = {
  WFLR: "0x1D80c49BbBCd1C0911346656B529DF9E5c2F783d",
  sFLR: "0x12e605bc104e93B45e1aD99F9e555f659051c2BB",
  USDC: "0xFbDa5F676cB37624f28265A144A48B0d6e87d3b6",
  USDT: "0x0B38e83B86d491735fEaa0a791F65c2B99535396",
  WETH: "0x1502FA4be69d526124D453619276FacCab275d3D",
};

// =============================================================
//                    COSTON2 TESTNET
// =============================================================

/**
 * Coston2 Testnet Addresses
 * Note: Sceptre and Kinetic are not deployed on Coston2
 */
export const SCEPTRE_COSTON2 = {
  sflr: "", // Not deployed on testnet
};

export const KINETIC_COSTON2 = {
  comptroller: "", // Not deployed on testnet
  kTokens: {},
};

export const TOKENS_COSTON2 = {
  WFLR: "0xC67DCE33D7A8efA5FfEB961899C73fe01bCe9273", // WNAT on Coston2
};

// =============================================================
//                       HELPER FUNCTIONS
// =============================================================

/**
 * Get yield protocol addresses for a given network
 * @param chainId Network chain ID
 */
export function getYieldAddresses(chainId: number) {
  switch (chainId) {
    case 14: // Flare Mainnet
      return {
        sceptre: SCEPTRE_FLARE,
        kinetic: KINETIC_FLARE,
        tokens: TOKENS_FLARE,
      };
    case 114: // Coston2 Testnet
      return {
        sceptre: SCEPTRE_COSTON2,
        kinetic: KINETIC_COSTON2,
        tokens: TOKENS_COSTON2,
      };
    default:
      throw new Error(`Unsupported chain ID for yield protocols: ${chainId}`);
  }
}

/**
 * Get Sceptre addresses for a network
 * @param chainId Network chain ID
 */
export function getSceptreAddresses(chainId: number) {
  if (chainId === 14) return SCEPTRE_FLARE;
  if (chainId === 114) return SCEPTRE_COSTON2;
  throw new Error(`Sceptre not available on chain ${chainId}`);
}

/**
 * Get Kinetic addresses for a network
 * @param chainId Network chain ID
 */
export function getKineticAddresses(chainId: number) {
  if (chainId === 14) return KINETIC_FLARE;
  if (chainId === 114) return KINETIC_COSTON2;
  throw new Error(`Kinetic not available on chain ${chainId}`);
}

/**
 * Check if yield protocols are available on a network
 * @param chainId Network chain ID
 */
export function areYieldProtocolsAvailable(chainId: number): boolean {
  return chainId === 14; // Only available on Flare mainnet
}

/**
 * Get kToken address for an underlying asset
 * @param underlying Underlying asset address
 * @param chainId Network chain ID
 */
export function getKTokenForUnderlying(
  underlying: string,
  chainId: number
): string | undefined {
  if (chainId !== 14) return undefined;

  const lowerUnderlying = underlying.toLowerCase();

  // Map underlying to kToken
  const kTokenMap: Record<string, string> = {
    [TOKENS_FLARE.USDC.toLowerCase()]: KINETIC_FLARE.kTokens.kUSDC,
    [TOKENS_FLARE.USDT.toLowerCase()]: KINETIC_FLARE.kTokens.kUSDT,
    [TOKENS_FLARE.sFLR.toLowerCase()]: KINETIC_FLARE.kTokens.ksFLR,
    [TOKENS_FLARE.WETH.toLowerCase()]: KINETIC_FLARE.kTokens.kWETH,
  };

  return kTokenMap[lowerUnderlying];
}

/**
 * Get all supported kTokens on a network
 * @param chainId Network chain ID
 */
export function getSupportedKTokens(chainId: number): string[] {
  if (chainId !== 14) return [];
  return Object.values(KINETIC_FLARE.kTokens);
}
