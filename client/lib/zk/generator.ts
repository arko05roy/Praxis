import type {
  PrivateSwapProof,
  PrivateYieldProof,
  PrivatePerpProof,
  PrivateSettlementProof,
  ERTForPrivateExecution,
} from "./types";
import {
  generateSwapProof,
  generateYieldProof,
  generatePerpProof,
  generateSettlementProof,
  serializeProof,
  generateProofHash,
} from "./proof-engine";

/**
 * Generate a private swap proof using real cryptographic operations
 * @param ert - The ERT being used
 * @param tokenIn - Input token address
 * @param tokenOut - Output token address
 * @param amountIn - Amount of tokenIn to swap
 * @param minAmountOut - Minimum amount of tokenOut expected
 * @param adapter - DEX adapter address
 */
export async function generatePrivateSwapProof(
  ert: ERTForPrivateExecution,
  tokenIn: string,
  tokenOut: string,
  amountIn: bigint,
  minAmountOut: bigint,
  adapter: string
): Promise<PrivateSwapProof> {
  // Generate real cryptographic proof
  const result = await generateSwapProof({
    ert,
    tokenIn,
    tokenOut,
    amountIn,
    minAmountOut,
    adapter,
  });

  // Serialize proof for storage/display
  const serializedProof = serializeProof(result.proof);
  const proofHash = await generateProofHash(result.proof);

  return {
    protocol: "groth16",
    actionType: "swap",
    proof: {
      pi_a: serializedProof.pi_a,
      pi_b: serializedProof.pi_b,
      pi_c: serializedProof.pi_c,
    },
    publicSignals: serializedProof.publicSignals,
    proofHash,
    publicInputs: {
      ertId: result.publicInputs.ertId,
      timestamp: result.publicInputs.timestamp,
    },
    privateInputs: {
      tokenIn,
      tokenOut,
      amountIn,
      minAmountOut,
      adapter,
    },
    attestations: result.attestations,
  };
}

/**
 * Generate a private yield proof using real cryptographic operations
 * @param ert - The ERT being used
 * @param action - stake, unstake, supply, or withdraw
 * @param adapter - Yield protocol adapter address
 * @param asset - Asset being staked/supplied
 * @param amount - Amount of asset
 */
export async function generatePrivateYieldProof(
  ert: ERTForPrivateExecution,
  action: "stake" | "unstake" | "supply" | "withdraw",
  adapter: string,
  asset: string,
  amount: bigint
): Promise<PrivateYieldProof> {
  const result = await generateYieldProof({
    ert,
    action,
    adapter,
    asset,
    amount,
  });

  const serializedProof = serializeProof(result.proof);
  const proofHash = await generateProofHash(result.proof);

  return {
    protocol: "groth16",
    actionType: "yield",
    proof: {
      pi_a: serializedProof.pi_a,
      pi_b: serializedProof.pi_b,
      pi_c: serializedProof.pi_c,
    },
    publicSignals: serializedProof.publicSignals,
    proofHash,
    publicInputs: {
      ertId: result.publicInputs.ertId,
      timestamp: result.publicInputs.timestamp,
      protocol: result.publicInputs.protocol,
    },
    privateInputs: {
      adapter,
      asset,
      amount,
      action,
    },
    attestations: result.attestations,
  };
}

/**
 * Generate a private perpetual position proof
 * @param ert - The ERT being used
 * @param market - Market symbol (e.g., "FLR-USD")
 * @param size - Position size in USD
 * @param leverage - Leverage multiplier
 * @param isLong - True for long, false for short
 * @param collateral - Collateral amount
 */
export async function generatePrivatePerpProof(
  ert: ERTForPrivateExecution,
  market: string,
  size: bigint,
  leverage: number,
  isLong: boolean,
  collateral: bigint
): Promise<PrivatePerpProof> {
  const result = await generatePerpProof({
    ert,
    market,
    size,
    leverage,
    isLong,
    collateral,
  });

  const serializedProof = serializeProof(result.proof);
  const proofHash = await generateProofHash(result.proof);

  return {
    protocol: "groth16",
    actionType: "perp",
    proof: {
      pi_a: serializedProof.pi_a,
      pi_b: serializedProof.pi_b,
      pi_c: serializedProof.pi_c,
    },
    publicSignals: serializedProof.publicSignals,
    proofHash,
    publicInputs: {
      ertId: result.publicInputs.ertId,
      timestamp: result.publicInputs.timestamp,
      hasPosition: result.publicInputs.hasPosition,
    },
    privateInputs: {
      market,
      size,
      leverage,
      isLong,
      collateral,
    },
    attestations: result.attestations,
  };
}

/**
 * Generate a private settlement proof
 * @param ert - The ERT being settled
 * @param startingCapital - Capital at ERT creation
 * @param endingCapital - Current capital value
 * @param ftsoPriceBlock - Block number for FTSO price reference
 */
export async function generatePrivateSettlementProof(
  ert: ERTForPrivateExecution,
  startingCapital: bigint,
  endingCapital: bigint,
  ftsoPriceBlock: number
): Promise<PrivateSettlementProof> {
  const result = await generateSettlementProof({
    ert,
    startingCapital,
    endingCapital,
    ftsoPriceBlock,
  });

  const serializedProof = serializeProof(result.proof);
  const proofHash = await generateProofHash(result.proof);

  return {
    protocol: "groth16",
    actionType: "settlement",
    proof: {
      pi_a: serializedProof.pi_a,
      pi_b: serializedProof.pi_b,
      pi_c: serializedProof.pi_c,
    },
    publicSignals: serializedProof.publicSignals,
    proofHash,
    publicInputs: {
      ertId: result.publicInputs.ertId,
      startingCapital: result.publicInputs.startingCapital,
      endingCapital: result.publicInputs.endingCapital,
      pnl: result.publicInputs.pnl,
      ftsoPriceBlock: result.publicInputs.ftsoPriceBlock,
      lpShare: result.publicInputs.lpShare,
      executorShare: result.publicInputs.executorShare,
    },
    privateInputs: {
      tradeHistory: [],
      positionHistory: [],
    },
    attestations: result.attestations,
  };
}
