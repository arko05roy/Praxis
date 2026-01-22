// PRAXIS Contract Addresses
// Coston2 Testnet Deployment

export const PRAXIS_ADDRESSES = {
  // Coston2 Testnet (Chain ID: 114) - PRIMARY DEPLOYMENT
  // These addresses were populated by running coston2-deploy.ts on 2026-01-21
  114: {
    // Core Protocol
    PraxisGateway: '0xbF96360cEB79235AB26b83c60c2588a109f4F7b0' as `0x${string}`,
    ExecutionVault: '0xaDd37200a615516a703Af67ED77AB6d9AB7f6a25' as `0x${string}`,
    ExecutionRightsNFT: '0x67a1bD7abFe97B0B40Da7dd74712e106F80e4017' as `0x${string}`,
    SettlementEngine: '0x348C5E5e26fba7086d863B708142e7f48c0cBe84' as `0x${string}`,
    ReputationManager: '0xE1bad1a7971BD540A243806002f978863B528a73' as `0x${string}`,

    // Safety & Risk Management
    CircuitBreaker: '0x556a3C56014F3469cA2603015d360e8Db09EBF7e' as `0x${string}`,
    InsuranceFund: '0xDe0724bE704F3c889596D03D52aFc2688B5FF645' as `0x${string}`,
    UtilizationController: '0xdf08ab2Fed1046d383f2d8A7a6cE067b6b37EBC9' as `0x${string}`,
    ExposureManager: '0x217b9226cf843497BcC09ee442fC77600026dbFe' as `0x${string}`,

    // Oracle & Routing (Flare native - already deployed)
    FlareOracle: '0x0979854b028210Cf492a3bCB990B6a1D45d89eCc' as `0x${string}`,
    FDCVerifier: '0xe667bEf52f1EAD93Cb0375639a4eA36001d4edf3' as `0x${string}`,
    SwapRouter: '0x65e72849DD87978023Fef664a39b1FE0576c5C9D' as `0x${string}`,
    YieldRouter: '0x0000000000000000000000000000000000000000' as `0x${string}`,

    // ZK Verifiers
    PrivateSwapVerifier: '0x9510832286c35AeD7E4680c7E10128f7fa7970c5' as `0x${string}`,
    ZKExecutor: '0x933A2320d9BBc4Cf68eA67c3a016462C39148c44' as `0x${string}`,

    // Asset token (MockUSDC for testnet)
    Asset: '0x9401FCe40Cb84b051215d96e85BecD733043a33D' as `0x${string}`,

    // Mock Protocols
    MockSimpleDEX: '0x5F2577675beD125794FDfc44940b62D60BF00F81' as `0x${string}`,
    MockSceptre: '0x8C6057145c1C523e08D3D1dCbaC77925Ee25f46D' as `0x${string}`,
    MockKinetic: '0xf59C5d72cAA0875788fD9461488b4daC7d5EdA1f' as `0x${string}`,

    // Mock Tokens
    MockUSDC: '0x9401FCe40Cb84b051215d96e85BecD733043a33D' as `0x${string}`,
    MockWFLR: '0x0a22b6e2f0ac6cDA83C04B1Ba33aAc8e9Df6aed7' as `0x${string}`,
    MockFXRP: '0x2859b97217cF2599D5F1e1c56735D283ec2144e3' as `0x${string}`,
    MockFBTC: '0x2E124DEaeD3Ba3b063356F9b45617d862e4b9dB5' as `0x${string}`,
    MockFDOGE: '0xeAD29cBfAb93ed51808D65954Dd1b3cDDaDA1348' as `0x${string}`,
    MockSFLR: '0x8C6057145c1C523e08D3D1dCbaC77925Ee25f46D' as `0x${string}`,
  },
} as const;


export type SupportedChainId = keyof typeof PRAXIS_ADDRESSES;

export function getAddresses(chainId: number) {
  if (chainId in PRAXIS_ADDRESSES) {
    return PRAXIS_ADDRESSES[chainId as SupportedChainId];
  }
  throw new Error(`Unsupported chain ID: ${chainId}. Only Coston2 (114) is supported for testnet deployment.`);
}

// Check if the deployment is complete (addresses are populated)
export function isDeploymentComplete(chainId: number): boolean {
  try {
    const addresses = getAddresses(chainId);
    return addresses.PraxisGateway !== '0x0000000000000000000000000000000000000000';
  } catch {
    return false;
  }
}
