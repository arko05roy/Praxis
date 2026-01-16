/**
 * DEX Contract Addresses on Flare Networks
 *
 * These addresses are for the major DEXes deployed on Flare.
 * Addresses are verified from official documentation and block explorers.
 */

// SparkDEX V3 Addresses (Flare Mainnet)
// Source: https://docs.sparkdex.ai/additional-information/smart-contract-overview/v2-and-v3.1-dex
export const SPARKDEX_FLARE = {
  swapRouter: "0x8a1E35F5c98C4E85B36B7B253222eE17773b2781",
  quoterV2: "0x2DcABbB3a5Fe9DBb1F43edf48449aA7254Ef3a80", // Updated from SparkDEX docs
  factory: "0x8A2578d23d4C532cC9A98FaD91C0523f5efDE652",
  v2Router: "0x4a1E5A90e9943467FAd1acea1E7F0e5e88472a1e",
  v2Factory: "0x16b619B04c961E8f4F06C10B42FDAbb328980A89",
  universalRouter: "0x0f3D8a38D4c74afBebc2c42695642f0e3acb15D3",
  nonfungiblePositionManager: "0xEE5FF5Bc5F852764b5584d92A4d592A53DC527da",
  permit2: "0xB952578f3520EE8Ea45b7914994dcf4702cEe578",
  tickLens: "0xdB5F2Ca65aAeB277E36be69553E0e7aA3585204d",
};

// BlazeSwap Addresses (Flare Mainnet)
export const BLAZESWAP_FLARE = {
  router: "0xe3A1b355ca63abCBC9589334B5e609583C7BAa06",
  factory: "0x440602f459D7Dd500a74528003e6A20A46d6e2A6", // From router.factory()
};

// Common Token Addresses (Flare Mainnet)
export const TOKENS_FLARE = {
  WFLR: "0x1D80c49BbBCd1C0911346656B529DF9E5c2F783d",
  USDC: "0xFbDa5F676cB37624f28265A144A48B0d6e87d3b6",
  USDT: "0x96B41289D90444B8adD57e6F265DB5aE8651DF29",
  WETH: "0xA76dCDDcD9c61C4a3E9cd1DcAEBD6bb75af6b69E",
  sFLR: "0x12e605bc104e93B45e1aD99F9e555f659051c2BB", // Sceptre staked FLR
};

// Coston2 Testnet Addresses (Need to be discovered/verified)
// Note: Many mainnet protocols may not be deployed on testnet
export const SPARKDEX_COSTON2 = {
  // These need verification - may use same addresses or different
  swapRouter: "", // To be discovered
  quoterV2: "", // To be discovered
  factory: "", // To be discovered
};

export const BLAZESWAP_COSTON2 = {
  router: "", // To be discovered
  factory: "", // To be discovered
};

export const TOKENS_COSTON2 = {
  WFLR: "0xC67DCE33D7A8efA5FfEB961899C73fe01bCe9273", // WNAT on Coston2
  // Test tokens can be deployed for testing
};

/**
 * Get DEX addresses for a given network
 */
export function getDEXAddresses(chainId: number) {
  switch (chainId) {
    case 14: // Flare Mainnet
      return {
        sparkdex: SPARKDEX_FLARE,
        blazeswap: BLAZESWAP_FLARE,
        tokens: TOKENS_FLARE,
      };
    case 114: // Coston2 Testnet
      return {
        sparkdex: SPARKDEX_COSTON2,
        blazeswap: BLAZESWAP_COSTON2,
        tokens: TOKENS_COSTON2,
      };
    default:
      throw new Error(`Unsupported chain ID: ${chainId}`);
  }
}

/**
 * V3 Fee Tiers (in hundredths of a bip)
 * 100 = 0.01%, 500 = 0.05%, 3000 = 0.3%, 10000 = 1%
 */
export const V3_FEE_TIERS = {
  LOWEST: 100,
  LOW: 500,
  MEDIUM: 3000,
  HIGH: 10000,
};
