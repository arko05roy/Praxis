// PRAXIS Contract Addresses
// These will be updated after deployment

export const PRAXIS_ADDRESSES = {
  // Flare Mainnet (Chain ID: 14)
  14: {
    PraxisGateway: '0x0000000000000000000000000000000000000000' as `0x${string}`,
    ExecutionVault: '0x0000000000000000000000000000000000000000' as `0x${string}`,
    ExecutionRightsNFT: '0x0000000000000000000000000000000000000000' as `0x${string}`,
    SettlementEngine: '0x0000000000000000000000000000000000000000' as `0x${string}`,
    ReputationManager: '0x0000000000000000000000000000000000000000' as `0x${string}`,
    CircuitBreaker: '0x0000000000000000000000000000000000000000' as `0x${string}`,
    InsuranceFund: '0x0000000000000000000000000000000000000000' as `0x${string}`,
    UtilizationController: '0x0000000000000000000000000000000000000000' as `0x${string}`,
    // Asset token (usually USDC or wrapped stablecoin)
    Asset: '0x0000000000000000000000000000000000000000' as `0x${string}`,
  },
  // Coston2 Testnet (Chain ID: 114)
  114: {
    PraxisGateway: '0x0000000000000000000000000000000000000000' as `0x${string}`,
    ExecutionVault: '0x0000000000000000000000000000000000000000' as `0x${string}`,
    ExecutionRightsNFT: '0x0000000000000000000000000000000000000000' as `0x${string}`,
    SettlementEngine: '0x0000000000000000000000000000000000000000' as `0x${string}`,
    ReputationManager: '0x0000000000000000000000000000000000000000' as `0x${string}`,
    CircuitBreaker: '0x0000000000000000000000000000000000000000' as `0x${string}`,
    InsuranceFund: '0x0000000000000000000000000000000000000000' as `0x${string}`,
    UtilizationController: '0x0000000000000000000000000000000000000000' as `0x${string}`,
    // Asset token (usually USDC or wrapped stablecoin)
    Asset: '0x0000000000000000000000000000000000000000' as `0x${string}`,
  },
} as const;

export type SupportedChainId = keyof typeof PRAXIS_ADDRESSES;

export function getAddresses(chainId: number) {
  if (chainId in PRAXIS_ADDRESSES) {
    return PRAXIS_ADDRESSES[chainId as SupportedChainId];
  }
  throw new Error(`Unsupported chain ID: ${chainId}`);
}
