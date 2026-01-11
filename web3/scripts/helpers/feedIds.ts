/**
 * FTSO v2 Feed ID Constants and Utilities for PRAXIS
 *
 * Feed IDs are 21-byte identifiers used by Flare's FTSO v2 oracle system.
 * Format: 0x01 + ASCII feed name padded to 20 bytes
 *
 * Category prefixes:
 * - 0x01: Crypto feeds (e.g., FLR/USD, BTC/USD)
 * - 0x02: Forex feeds
 * - 0x03: Commodity feeds
 * - 0x04: Stock feeds
 */

/**
 * Converts a feed name to its bytes21 feed ID format
 * @param category Category byte (e.g., 0x01 for crypto)
 * @param feedName Feed name (e.g., "FLR/USD")
 * @returns bytes21 feed ID as hex string
 */
export function encodeFeedId(category: number, feedName: string): string {
  // Convert feed name to bytes and pad to 20 bytes
  const nameBytes = Buffer.from(feedName, "utf8");
  if (nameBytes.length > 20) {
    throw new Error(`Feed name too long: ${feedName}`);
  }

  // Create 21-byte buffer: 1 byte category + 20 bytes feed name (padded)
  const feedId = Buffer.alloc(21, 0);
  feedId[0] = category;
  nameBytes.copy(feedId, 1);

  return "0x" + feedId.toString("hex");
}

/**
 * Crypto/Token Feed IDs (Category 0x01)
 * These are the primary feeds used for price data
 */
export const CRYPTO_FEEDS = {
  // Native Flare ecosystem tokens
  FLR_USD: encodeFeedId(0x01, "FLR/USD"),
  SGB_USD: encodeFeedId(0x01, "SGB/USD"),
  WFLR_USD: encodeFeedId(0x01, "FLR/USD"), // WFLR uses FLR feed

  // Major cryptocurrencies
  BTC_USD: encodeFeedId(0x01, "BTC/USD"),
  ETH_USD: encodeFeedId(0x01, "ETH/USD"),
  XRP_USD: encodeFeedId(0x01, "XRP/USD"),
  DOGE_USD: encodeFeedId(0x01, "DOGE/USD"),
  LTC_USD: encodeFeedId(0x01, "LTC/USD"),

  // Stablecoins
  USDC_USD: encodeFeedId(0x01, "USDC/USD"),
  USDT_USD: encodeFeedId(0x01, "USDT/USD"),

  // Additional popular tokens
  SOL_USD: encodeFeedId(0x01, "SOL/USD"),
  ADA_USD: encodeFeedId(0x01, "ADA/USD"),
  AVAX_USD: encodeFeedId(0x01, "AVAX/USD"),
  LINK_USD: encodeFeedId(0x01, "LINK/USD"),
  MATIC_USD: encodeFeedId(0x01, "MATIC/USD"),
  DOT_USD: encodeFeedId(0x01, "DOT/USD"),
  ATOM_USD: encodeFeedId(0x01, "ATOM/USD"),
  UNI_USD: encodeFeedId(0x01, "UNI/USD"),
  AAVE_USD: encodeFeedId(0x01, "AAVE/USD"),
} as const;

/**
 * All supported FTSO feeds with their IDs
 * Used for dynamic feed discovery and validation
 */
export const FTSO_FEEDS = {
  ...CRYPTO_FEEDS,
} as const;

/**
 * Feed ID to human-readable name mapping
 */
export const FEED_NAMES: Record<string, string> = Object.fromEntries(
  Object.entries(FTSO_FEEDS).map(([name, id]) => [id, name.replace("_", "/")])
);

/**
 * Common token addresses on Coston2 (testnet)
 * These should be discovered dynamically in production
 */
export const COSTON2_TOKENS = {
  WFLR: "0x", // To be filled after deployment or discovery
  USDC: "0x", // To be filled after deployment or discovery
  USDT: "0x", // To be filled after deployment or discovery
} as const;

/**
 * Common token addresses on Flare mainnet
 * These should be discovered dynamically in production
 */
export const FLARE_TOKENS = {
  WFLR: "0x", // To be filled after discovery
  USDC: "0x", // To be filled after discovery
  USDT: "0x", // To be filled after discovery
  SFLR: "0x", // Sceptre staked FLR
} as const;

/**
 * Validates if a feed ID is in the correct format
 * @param feedId Feed ID to validate
 * @returns true if valid bytes21 format
 */
export function isValidFeedId(feedId: string): boolean {
  // Must be hex string with 0x prefix, exactly 42 characters for bytes21
  if (!feedId.startsWith("0x") || feedId.length !== 44) {
    return false;
  }
  // Must have valid category prefix (01-04)
  const category = parseInt(feedId.slice(2, 4), 16);
  return category >= 1 && category <= 4;
}

/**
 * Decodes a feed ID back to its human-readable name
 * @param feedId The bytes21 feed ID
 * @returns Human-readable feed name
 */
export function decodeFeedId(feedId: string): string {
  if (!isValidFeedId(feedId)) {
    throw new Error(`Invalid feed ID: ${feedId}`);
  }

  // Skip 0x prefix and category byte (2 chars + 2 chars)
  const nameHex = feedId.slice(4);

  // Convert hex to string and trim null bytes
  const nameBytes = Buffer.from(nameHex, "hex");
  return nameBytes.toString("utf8").replace(/\0/g, "").trim();
}

/**
 * Gets the feed ID for a given symbol pair
 * @param base Base asset symbol (e.g., "BTC")
 * @param quote Quote asset symbol (e.g., "USD")
 * @returns bytes21 feed ID or undefined if not found
 */
export function getFeedIdForPair(
  base: string,
  quote: string
): string | undefined {
  const key = `${base.toUpperCase()}_${quote.toUpperCase()}`;
  return (FTSO_FEEDS as Record<string, string>)[key];
}

// Export type for feed ID keys
export type FeedIdKey = keyof typeof FTSO_FEEDS;
