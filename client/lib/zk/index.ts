// ZK Private Execution Layer - Main exports

// Types
export type {
  ZKProof,
  PrivateSwapProof,
  PrivateYieldProof,
  PrivatePerpProof,
  PrivateSettlementProof,
  PrivateProof,
  ProofVerificationResult,
  ExecutionStatus,
  PrivateExecutionResult,
  ERTForPrivateExecution,
  SupportedToken,
  PrivateExecutionHistoryEntry,
  ProofGenerationStage,
  SwapAttestations,
  YieldAttestations,
  PerpAttestations,
  SettlementAttestations,
  TradeRecord,
  PositionRecord,
} from "./types";

// Constants
export { PROOF_GENERATION_STAGES } from "./types";

// Proof generation (real cryptographic proofs)
export {
  generatePrivateSwapProof,
  generatePrivateYieldProof,
  generatePrivatePerpProof,
  generatePrivateSettlementProof,
} from "./generator";

// Proof verification
export {
  verifyProof,
  verifySwapProof,
  verifyYieldProof,
  verifyPerpProof,
  verifySettlementProof,
  formatAttestationKey,
  getProofSummary,
  getPrivacyDescription,
} from "./verifier";

// Private execution
export {
  executePrivateSwap,
  executePrivateYield,
  executePrivatePerp,
  executePrivateSettlement,
  getExecutionHistory,
  clearExecutionHistory,
  getSupportedTokens,
  getSupportedAdapters,
  getSupportedPerpMarkets,
  MOCK_ADDRESSES,
} from "./executor";

// Cryptographic utilities
export {
  poseidonHash,
  computeMerkleRoot,
  generateMerkleProof,
  verifyMerkleProof,
  addressToField,
  generateCommitment,
  randomFieldElement,
} from "./crypto";

// Proof engine (for advanced use)
export {
  generateSwapProof,
  generateYieldProof,
  generatePerpProof,
  generateSettlementProof,
  serializeProof,
  generateProofHash,
  checkAndProveInclusion,
  buildAdapterMerkleTree,
  buildAssetMerkleTree,
} from "./proof-engine";

// Legacy demo proofs (for backwards compatibility)
export {
  DEMO_SWAP_PROOFS,
  DEMO_YIELD_PROOFS,
  DEMO_PERP_PROOFS,
  DEMO_SETTLEMENT_PROOFS,
  getSwapProof,
  getYieldProof,
  getPerpProof,
  getSettlementProof,
} from "./proofs";
