// PRAXIS Contract Addresses
// These will be updated after deployment
//
// For LOCAL FORK DEMO:
// After running `npx hardhat run scripts/deploy/warm-state-seed.ts --network anvilFork`
// Copy addresses from `web3/deployed-addresses.json` to the 31337 section below

// USDC address on Flare mainnet (used by both mainnet and fork)
const USDC_FLARE = '0xFbDa5F676cB37624f28265A144A48B0d6e87d3b6' as `0x${string}`;

export const PRAXIS_ADDRESSES = {
  // Local Fork (Chain ID: 31337) - DEMO ENVIRONMENT
  // Addresses from warm-state-seed.ts deployment
  31337: {
    // Core Protocol
    PraxisGateway: '0x0E801D84Fa97b50751Dbf25036d067dCf18858bF' as `0x${string}`,
    ExecutionVault: '0xa82fF9aFd8f496c3d6ac40E2a0F282E47488CFc9' as `0x${string}`,
    ExecutionRightsNFT: '0x70e0bA845a1A0F2DA3359C97E0285013525FFC49' as `0x${string}`,
    SettlementEngine: '0x99bbA657f2BbC93c02D617f8bA121cB8Fc104Acf' as `0x${string}`,
    ReputationManager: '0x9E545E3C0baAB3E08CdfD552C960A1050f373042' as `0x${string}`,

    // Safety & Risk Management
    CircuitBreaker: '0x851356ae760d987E095750cCeb3bC6014560891C' as `0x${string}`,
    InsuranceFund: '0x95401dc811bb5740090279Ba06cfA8fcF6113778' as `0x${string}`,
    UtilizationController: '0x1613beB3B2C4f22Ee086B2b38C1476A3cE7f78E8' as `0x${string}`,
    ExposureManager: '0xf5059a5D33d5853360D16C683c16e67980206f36' as `0x${string}`,

    // Oracle & Routing
    FlareOracle: '0xB7f8BC63BbcaD18155201308C8f3540b07f84F5e' as `0x${string}`,
    SwapRouter: '0x3Aa5ebB10DC797CAC828524e59A333d0A371443c' as `0x${string}`,

    // Asset token (MockUSDC for demo)
    Asset: '0x610178dA211FEF7D417bC0e6FeD39F05609AD788' as `0x${string}`,
  },
  // Flare Mainnet (Chain ID: 14)
  14: {
    // Core Protocol
    PraxisGateway: '0x0000000000000000000000000000000000000000' as `0x${string}`,
    ExecutionVault: '0x0000000000000000000000000000000000000000' as `0x${string}`,
    ExecutionRightsNFT: '0x0000000000000000000000000000000000000000' as `0x${string}`,
    SettlementEngine: '0x0000000000000000000000000000000000000000' as `0x${string}`,
    ReputationManager: '0x0000000000000000000000000000000000000000' as `0x${string}`,

    // Safety & Risk Management
    CircuitBreaker: '0x0000000000000000000000000000000000000000' as `0x${string}`,
    InsuranceFund: '0x0000000000000000000000000000000000000000' as `0x${string}`,
    UtilizationController: '0x0000000000000000000000000000000000000000' as `0x${string}`,
    ExposureManager: '0x0000000000000000000000000000000000000000' as `0x${string}`,

    // Oracle & Routing
    FlareOracle: '0x0000000000000000000000000000000000000000' as `0x${string}`,
    SwapRouter: '0x0000000000000000000000000000000000000000' as `0x${string}`,

    // Asset token (USDC on Flare)
    Asset: USDC_FLARE,
  },
  // Coston2 Testnet (Chain ID: 114)
  114: {
    // Core Protocol
    PraxisGateway: '0x0000000000000000000000000000000000000000' as `0x${string}`,
    ExecutionVault: '0x0000000000000000000000000000000000000000' as `0x${string}`,
    ExecutionRightsNFT: '0x0000000000000000000000000000000000000000' as `0x${string}`,
    SettlementEngine: '0x0000000000000000000000000000000000000000' as `0x${string}`,
    ReputationManager: '0x0000000000000000000000000000000000000000' as `0x${string}`,

    // Safety & Risk Management
    CircuitBreaker: '0x0000000000000000000000000000000000000000' as `0x${string}`,
    InsuranceFund: '0x0000000000000000000000000000000000000000' as `0x${string}`,
    UtilizationController: '0x0000000000000000000000000000000000000000' as `0x${string}`,
    ExposureManager: '0x0000000000000000000000000000000000000000' as `0x${string}`,

    // Oracle & Routing
    FlareOracle: '0x0000000000000000000000000000000000000000' as `0x${string}`,
    SwapRouter: '0x0000000000000000000000000000000000000000' as `0x${string}`,

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
