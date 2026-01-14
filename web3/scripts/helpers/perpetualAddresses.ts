/**
 * Perpetual Protocol Contract Addresses on Flare Networks
 *
 * These addresses are for perpetual trading protocols (SparkDEX Eternal) deployed on Flare.
 * Addresses are verified from official documentation and block explorers.
 *
 * @see https://docs.sparkdex.ai/additional-information/smart-contract-overview/perps-exchange
 * @see https://flarescan.com
 */

// =============================================================
//                    SPARKDEX ETERNAL (FLARE MAINNET)
// =============================================================

/**
 * SparkDEX Eternal Perpetual Exchange Addresses (Flare Mainnet)
 * Supports leveraged trading up to 100x using FTSO price feeds
 */
export const SPARKDEX_ETERNAL_FLARE = {
  // Core infrastructure
  addressStorage: "0x6098bF06bB653626Fa25c44CB232eC4A2bDc659D",
  ftsoV2: "0x586F35597D0F0f16c46EaDBffB08a3b439ff17ee",
  timelock: "0xB0739F8e71E20B384d29e4597602C89FB7E0A808",

  // Trading contracts
  orderBook: "0xf76DC0d42A40E53021162521E5ac916AAe2500B9",
  store: "0x74DA11B3Bb05277CF1cd3572a74d626949183e58",
  positionManager: "0x0d59962e4fC41a09B73283d1a0bf305dB1237c48",
  executor: "0x7c224027d3188a6d97186604234c6BFa5CE6CD8E",
  fundingTracker: "0x96Adda2A49E910d8A1def86D45dAD59F80E7A9C6",
  tradingValidator: "0x7c6F8Db7C4Cb32F9540478264b15637933E443A4",

  // Supporting contracts
  referralStorage: "0x7c45e1b4CF81581927a854d7d47c79e3F7211309",
  referralReader: "0x5D99C306370477893b34848C39Db38E04C4cECB5",
  batchSender: "0xD4Da357D85d50A353A1203FC39f286dfedff3f35",
  discountChecker: "0xE33A95A41F726F0BC3Aa533086ad65C84Ec05524",
};

/**
 * SparkDEX Eternal Supported Markets
 * Market IDs are bytes10 encoded market names using "-" separator (e.g., "ETH-USD")
 */
export const SPARKDEX_ETERNAL_MARKETS: Record<string, string> = {
  // Major pairs (using "-" format as per SparkDEX)
  "BTC-USD": "0x4254432d555344000000", // bytes10("BTC-USD")
  "ETH-USD": "0x4554482d555344000000", // bytes10("ETH-USD")
  "FLR-USD": "0x464c522d555344000000", // bytes10("FLR-USD")
  "XRP-USD": "0x5852502d555344000000", // bytes10("XRP-USD")
  "LTC-USD": "0x4c54432d555344000000", // bytes10("LTC-USD")

  // Alt pairs
  "SOL-USD": "0x534f4c2d555344000000", // bytes10("SOL-USD")
  "DOGE-USD": "0x444f47452d5553440000", // bytes10("DOGE-USD")
  "AVAX-USD": "0x415641582d5553440000", // bytes10("AVAX-USD")
  "LINK-USD": "0x4c494e4b2d5553440000", // bytes10("LINK-USD")
  "ATOM-USD": "0x41544f4d2d5553440000", // bytes10("ATOM-USD")
  "DOT-USD": "0x444f542d555344000000", // bytes10("DOT-USD")
  "UNI-USD": "0x554e492d555344000000", // bytes10("UNI-USD")
  "HBAR-USD": "0x484241522d5553440000", // bytes10("HBAR-USD")
  "OP-USD": "0x4f502d5553440000000000", // bytes10("OP-USD")
  "XLM-USD": "0x584c4d2d555344000000", // bytes10("XLM-USD")
};

/**
 * Supported collateral tokens on SparkDEX Eternal
 */
export const SPARKDEX_ETERNAL_COLLATERAL = {
  // Primary collateral
  USDT0: "0x0B38e83B86d491735fEaa0a791F65c2B99535396",
  WFLR: "0x1D80c49BbBCd1C0911346656B529DF9E5c2F783d",
  sFLR: "0x12e605bc104e93B45e1aD99F9e555f659051c2BB",
  FXRP: "0x00000000000000000000000000000000000000000", // FAsset - TBD
};

// =============================================================
//                    COSTON2 TESTNET
// =============================================================

/**
 * SparkDEX Eternal Addresses on Coston2 Testnet
 * Note: SparkDEX Eternal is not deployed on Coston2
 */
export const SPARKDEX_ETERNAL_COSTON2 = {
  addressStorage: "",
  ftsoV2: "",
  timelock: "",
  orderBook: "",
  store: "",
  positionManager: "",
  executor: "",
  fundingTracker: "",
  tradingValidator: "",
  referralStorage: "",
  referralReader: "",
  batchSender: "",
  discountChecker: "",
};

// =============================================================
//                    COMMON TOKENS
// =============================================================

/**
 * Common Token Addresses used across perpetual protocols
 */
export const PERP_TOKENS_FLARE = {
  WFLR: "0x1D80c49BbBCd1C0911346656B529DF9E5c2F783d",
  sFLR: "0x12e605bc104e93B45e1aD99F9e555f659051c2BB",
  USDC: "0xFbDa5F676cB37624f28265A144A48B0d6e87d3b6",
  USDT: "0x0B38e83B86d491735fEaa0a791F65c2B99535396",
  WETH: "0x1502FA4be69d526124D453619276FacCab275d3D",
};

export const PERP_TOKENS_COSTON2 = {
  WFLR: "0xC67DCE33D7A8efA5FfEB961899C73fe01bCe9273", // WNAT on Coston2
};

// =============================================================
//                       HELPER FUNCTIONS
// =============================================================

/**
 * Get perpetual protocol addresses for a given network
 * @param chainId Network chain ID
 */
export function getPerpetualAddresses(chainId: number) {
  switch (chainId) {
    case 14: // Flare Mainnet
      return {
        sparkdexEternal: SPARKDEX_ETERNAL_FLARE,
        markets: SPARKDEX_ETERNAL_MARKETS,
        collateral: SPARKDEX_ETERNAL_COLLATERAL,
        tokens: PERP_TOKENS_FLARE,
      };
    case 114: // Coston2 Testnet
      return {
        sparkdexEternal: SPARKDEX_ETERNAL_COSTON2,
        markets: {},
        collateral: {},
        tokens: PERP_TOKENS_COSTON2,
      };
    default:
      throw new Error(
        `Unsupported chain ID for perpetual protocols: ${chainId}`
      );
  }
}

/**
 * Get SparkDEX Eternal addresses for a network
 * @param chainId Network chain ID
 */
export function getSparkDEXEternalAddresses(chainId: number) {
  if (chainId === 14) return SPARKDEX_ETERNAL_FLARE;
  if (chainId === 114) return SPARKDEX_ETERNAL_COSTON2;
  throw new Error(`SparkDEX Eternal not available on chain ${chainId}`);
}

/**
 * Check if perpetual protocols are available on a network
 * @param chainId Network chain ID
 */
export function arePerpProtocolsAvailable(chainId: number): boolean {
  return chainId === 14; // Only available on Flare mainnet
}

/**
 * Get primary collateral token for perpetual trading
 * @param chainId Network chain ID
 * @returns Primary collateral token address
 */
export function getPrimaryCollateral(chainId: number): string {
  if (chainId === 14) return SPARKDEX_ETERNAL_COLLATERAL.USDT0;
  throw new Error(`No collateral configured for chain ${chainId}`);
}

/**
 * Convert market name to bytes10 market ID
 * @param marketName Market name (e.g., "BTC/USD")
 * @returns bytes10 encoded market ID
 */
export function encodeMarketId(marketName: string): string {
  // Pad to 10 bytes and convert to hex
  const padded = marketName.padEnd(10, "\0");
  const bytes = Buffer.from(padded, "utf-8").subarray(0, 10);
  return "0x" + bytes.toString("hex");
}

/**
 * Decode bytes10 market ID to market name
 * @param marketId bytes10 market ID
 * @returns Market name
 */
export function decodeMarketId(marketId: string): string {
  // Remove 0x prefix and convert from hex
  const hex = marketId.startsWith("0x") ? marketId.slice(2) : marketId;
  const bytes = Buffer.from(hex, "hex");
  return bytes.toString("utf-8").replace(/\0/g, "").trim();
}

/**
 * Get all supported markets for a chain
 * @param chainId Network chain ID
 * @returns Object mapping market names to market IDs
 */
export function getSupportedMarkets(
  chainId: number
): Record<string, string> {
  if (chainId === 14) return SPARKDEX_ETERNAL_MARKETS;
  return {};
}

/**
 * Check if a market is supported
 * @param chainId Network chain ID
 * @param marketName Market name (e.g., "BTC/USD")
 */
export function isMarketSupported(
  chainId: number,
  marketName: string
): boolean {
  const markets = getSupportedMarkets(chainId);
  return Object.hasOwn(markets, marketName);
}

/**
 * Get market ID for a market name
 * @param chainId Network chain ID
 * @param marketName Market name
 * @returns Market ID or undefined if not supported
 */
export function getMarketId(
  chainId: number,
  marketName: string
): string | undefined {
  const markets = getSupportedMarkets(chainId);
  return (markets as Record<string, string>)[marketName];
}

/**
 * Configuration for adapter deployment
 */
export interface PerpAdapterConfig {
  addresses: [string, string, string, string, string]; // [orderBook, store, positionManager, fundingTracker, tradingValidator]
  primaryCollateral: string;
}

/**
 * Get adapter deployment configuration for a chain
 * @param chainId Network chain ID
 */
export function getAdapterConfig(chainId: number): PerpAdapterConfig | null {
  if (chainId !== 14) return null;

  return {
    addresses: [
      SPARKDEX_ETERNAL_FLARE.orderBook,
      SPARKDEX_ETERNAL_FLARE.store,
      SPARKDEX_ETERNAL_FLARE.positionManager,
      SPARKDEX_ETERNAL_FLARE.fundingTracker,
      SPARKDEX_ETERNAL_FLARE.tradingValidator,
    ],
    // SparkDEX Eternal uses WFLR as primary collateral (Store has ~56M WFLR)
    primaryCollateral: SPARKDEX_ETERNAL_COLLATERAL.WFLR,
  };
}
