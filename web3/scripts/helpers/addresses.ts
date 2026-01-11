/**
 * Deployed contract addresses for PRAXIS
 *
 * This file stores deployed contract addresses for each network.
 * Update these after each deployment.
 */

export interface NetworkAddresses {
  // Oracle contracts
  flareOracle?: string;
  fdcVerifier?: string;

  // DEX Adapters
  sparkDexAdapter?: string;
  enosysAdapter?: string;
  blazeSwapAdapter?: string;

  // Core routers
  swapRouter?: string;
  yieldRouter?: string;
  strategyEngine?: string;
  praxisGateway?: string;

  // Lending/Staking Adapters
  kineticAdapter?: string;
  sceptreAdapter?: string;

  // Perpetual Adapters
  sparkDexEternalAdapter?: string;

  // FAsset Adapters
  fAssetsAdapter?: string;
}

/**
 * Coston2 Testnet addresses
 */
export const COSTON2_ADDRESSES: NetworkAddresses = {
  // Deployed contracts
  flareOracle: "0x0979854b028210Cf492a3bCB990B6a1D45d89eCc",
  fdcVerifier: "0xe667bEf52f1EAD93Cb0375639a4eA36001d4edf3",
};

/**
 * Flare Mainnet addresses
 */
export const FLARE_ADDRESSES: NetworkAddresses = {
  // Production contracts - update after mainnet deployment
  flareOracle: undefined,
  fdcVerifier: undefined,
};

/**
 * Coston Testnet (Songbird testnet) addresses
 */
export const COSTON_ADDRESSES: NetworkAddresses = {
  // Update if deploying to Coston
};

/**
 * Songbird Mainnet addresses
 */
export const SONGBIRD_ADDRESSES: NetworkAddresses = {
  // Update if deploying to Songbird
};

/**
 * Get addresses for a specific network
 */
export function getNetworkAddresses(
  network: string
): NetworkAddresses | undefined {
  switch (network.toLowerCase()) {
    case "coston2":
      return COSTON2_ADDRESSES;
    case "flare":
      return FLARE_ADDRESSES;
    case "coston":
      return COSTON_ADDRESSES;
    case "songbird":
      return SONGBIRD_ADDRESSES;
    default:
      return undefined;
  }
}

/**
 * Flare Contract Registry address (same on all Flare networks)
 */
export const FLARE_CONTRACT_REGISTRY =
  "0xaD67FE66660Fb8dFE9d6b1b4240d8650e30F6019";

/**
 * Known external protocol addresses on Coston2
 * These should be discovered dynamically in production
 */
export const COSTON2_EXTERNAL_PROTOCOLS = {
  // SparkDEX
  sparkDexRouter: undefined as string | undefined,
  sparkDexQuoter: undefined as string | undefined,
  sparkDexFactory: undefined as string | undefined,

  // Enosys
  enosysRouter: undefined as string | undefined,

  // BlazeSwap
  blazeSwapRouter: undefined as string | undefined,

  // Kinetic (Compound-fork lending)
  kineticComptroller: undefined as string | undefined,

  // Sceptre (Liquid staking)
  sceptreSFLR: undefined as string | undefined,

  // SparkDEX Eternal (Perpetuals)
  sparkDexEternal: undefined as string | undefined,
};

/**
 * Known external protocol addresses on Flare Mainnet
 */
export const FLARE_EXTERNAL_PROTOCOLS = {
  // SparkDEX
  sparkDexRouter: undefined as string | undefined,
  sparkDexQuoter: undefined as string | undefined,
  sparkDexFactory: undefined as string | undefined,

  // Enosys
  enosysRouter: undefined as string | undefined,

  // BlazeSwap
  blazeSwapRouter: undefined as string | undefined,

  // Kinetic
  kineticComptroller: undefined as string | undefined,

  // Sceptre
  sceptreSFLR: undefined as string | undefined,

  // SparkDEX Eternal
  sparkDexEternal: undefined as string | undefined,
};
