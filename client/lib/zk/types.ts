// ZK Proof Types for PRAXIS Private Execution Layer

/**
 * Base ZK proof structure using Groth16 protocol
 */
export interface ZKProof {
  protocol: "groth16";
  proof: {
    pi_a: string[];
    pi_b: string[][];
    pi_c: string[];
  };
  publicSignals: string[];
  proofHash: string;
}

/**
 * Attestation results proving compliance without revealing details
 */
export interface SwapAttestations {
  ertOwnership: boolean;
  adapterAllowed: boolean;
  assetsAllowed: boolean;
  amountWithinLimit: boolean;
}

export interface YieldAttestations {
  ertOwnership: boolean;
  adapterAllowed: boolean;
  assetAllowed: boolean;
  amountWithinLimit: boolean;
}

export interface PerpAttestations {
  ertOwnership: boolean;
  leverageWithinLimit: boolean;
  sizeWithinLimit: boolean;
  marketAllowed: boolean;
}

export interface SettlementAttestations {
  pnlCalculatedCorrectly: boolean;
  ftsoPricesUsed: boolean;
  allTradesWithinConstraints: boolean;
  feeDistributionCorrect: boolean;
}

/**
 * Private Swap Proof - proves swap compliance without revealing trade details
 */
export interface PrivateSwapProof extends ZKProof {
  actionType: "swap";
  publicInputs: {
    ertId: number;
    timestamp: number;
    resultingBalance?: bigint;
  };
  privateInputs: {
    tokenIn: string;
    tokenOut: string;
    amountIn: bigint;
    minAmountOut: bigint;
    adapter: string;
  };
  attestations: SwapAttestations;
}

/**
 * Private Yield Proof - proves yield action compliance
 */
export interface PrivateYieldProof extends ZKProof {
  actionType: "yield";
  publicInputs: {
    ertId: number;
    timestamp: number;
    protocol: "staking" | "lending";
  };
  privateInputs: {
    adapter: string;
    asset: string;
    amount: bigint;
    action: "stake" | "unstake" | "supply" | "withdraw";
  };
  attestations: YieldAttestations;
}

/**
 * Private Perp Proof - proves perpetual position compliance
 */
export interface PrivatePerpProof extends ZKProof {
  actionType: "perp";
  publicInputs: {
    ertId: number;
    timestamp: number;
    hasPosition: boolean;
  };
  privateInputs: {
    market: string;
    size: bigint;
    leverage: number;
    isLong: boolean;
    collateral: bigint;
  };
  attestations: PerpAttestations;
}

/**
 * Private Settlement Proof - proves PnL calculation without revealing trade history
 */
export interface PrivateSettlementProof extends ZKProof {
  actionType: "settlement";
  publicInputs: {
    ertId: number;
    startingCapital: bigint;
    endingCapital: bigint;
    pnl: bigint;
    ftsoPriceBlock: number;
    lpShare: bigint;
    executorShare: bigint;
  };
  privateInputs: {
    tradeHistory: TradeRecord[];
    positionHistory: PositionRecord[];
  };
  attestations: SettlementAttestations;
}

/**
 * Trade record for settlement proof (hidden)
 */
export interface TradeRecord {
  timestamp: number;
  tokenIn: string;
  tokenOut: string;
  amountIn: bigint;
  amountOut: bigint;
  adapter: string;
}

/**
 * Position record for settlement proof (hidden)
 */
export interface PositionRecord {
  openTimestamp: number;
  closeTimestamp: number;
  market: string;
  size: bigint;
  leverage: number;
  isLong: boolean;
  entryPrice: bigint;
  exitPrice: bigint;
  pnl: bigint;
}

/**
 * Union type for all proof types
 */
export type PrivateProof =
  | PrivateSwapProof
  | PrivateYieldProof
  | PrivatePerpProof
  | PrivateSettlementProof;

/**
 * Proof verification result
 */
export interface ProofVerificationResult {
  valid: boolean;
  verificationTime: number;
  details: string[];
  proofHash: string;
}

/**
 * Private execution status
 */
export type ExecutionStatus =
  | "idle"
  | "generating_proof"
  | "verifying"
  | "executing"
  | "completed"
  | "failed";

/**
 * Private execution result
 */
export interface PrivateExecutionResult {
  success: boolean;
  txHash?: string;
  proofHash: string;
  executionTime: number;
  error?: string;
}

/**
 * ERT data for private execution
 */
export interface ERTForPrivateExecution {
  id: number;
  capital: bigint;
  capitalUsed: bigint;
  availableCapital: bigint;
  allowedAdapters: string[];
  allowedAssets: string[];
  maxPositionSize: bigint;
  maxLeverage: number;
  status: "active" | "expired" | "settled";
  expiresAt: number;
}

/**
 * Supported tokens for private execution
 */
export interface SupportedToken {
  symbol: string;
  address: string;
  name: string;
  decimals: number;
  icon?: string;
}

/**
 * Private execution history entry
 */
export interface PrivateExecutionHistoryEntry {
  id: string;
  ertId: number;
  actionType: "swap" | "yield" | "perp" | "settlement";
  timestamp: number;
  proofHash: string;
  txHash?: string;
  status: "pending" | "completed" | "failed";
  // Public info only - actual details are hidden
  publicDescription: string;
}

/**
 * Proof generation stages for UI
 */
export interface ProofGenerationStage {
  progress: number;
  label: string;
}

export const PROOF_GENERATION_STAGES: ProofGenerationStage[] = [
  { progress: 10, label: "Loading circuit..." },
  { progress: 25, label: "Computing witness..." },
  { progress: 50, label: "Generating proof..." },
  { progress: 75, label: "Optimizing proof size..." },
  { progress: 90, label: "Finalizing..." },
  { progress: 100, label: "Proof ready!" },
];
