import type {
  PrivateSwapProof,
  PrivateYieldProof,
  PrivatePerpProof,
  PrivateSettlementProof,
  ERTForPrivateExecution,
} from "./types";
import { getSwapProof } from "./proofs/swap-proofs";
import { getYieldProof } from "./proofs/yield-proofs";
import { getPerpProof } from "./proofs/perp-proofs";
import { getSettlementProof } from "./proofs/settlement-proofs";

/**
 * Simulate proof generation delay
 * In production, this would be actual ZK circuit computation
 */
async function simulateProofGeneration(minDelay = 1500, maxDelay = 2500): Promise<void> {
  const delay = Math.random() * (maxDelay - minDelay) + minDelay;
  await new Promise((resolve) => setTimeout(resolve, delay));
}

/**
 * Generate a hash for the proof based on inputs
 */
function generateProofHash(
  ertId: number,
  actionType: string,
  timestamp: number
): string {
  // Simple hash simulation - in production this would be a real cryptographic hash
  const input = `${ertId}-${actionType}-${timestamp}-${Math.random().toString(36).substring(7)}`;
  let hash = "0x";
  for (let i = 0; i < 64; i++) {
    hash += Math.floor(Math.random() * 16).toString(16);
  }
  return hash;
}

/**
 * Validate ERT constraints for a swap
 */
function validateSwapConstraints(
  ert: ERTForPrivateExecution,
  tokenIn: string,
  tokenOut: string,
  amountIn: bigint,
  adapter: string
): { valid: boolean; errors: string[] } {
  const errors: string[] = [];

  // Check adapter is allowed
  if (!ert.allowedAdapters.includes(adapter.toLowerCase())) {
    errors.push(`Adapter ${adapter} not in allowed adapters`);
  }

  // Check assets are allowed
  if (!ert.allowedAssets.includes(tokenIn.toLowerCase())) {
    errors.push(`Token ${tokenIn} not in allowed assets`);
  }
  if (!ert.allowedAssets.includes(tokenOut.toLowerCase())) {
    errors.push(`Token ${tokenOut} not in allowed assets`);
  }

  // Check amount within limits
  if (amountIn > ert.availableCapital) {
    errors.push(`Amount ${amountIn} exceeds available capital ${ert.availableCapital}`);
  }

  // Check ERT is active
  if (ert.status !== "active") {
    errors.push(`ERT status is ${ert.status}, must be active`);
  }

  return {
    valid: errors.length === 0,
    errors,
  };
}

/**
 * Generate a private swap proof
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
  // Simulate proof generation time
  await simulateProofGeneration();

  const timestamp = Math.floor(Date.now() / 1000);

  // Get base proof from hardcoded proofs
  const baseProof = getSwapProof("default");

  // Create proof with actual parameters
  const proof: PrivateSwapProof = {
    ...baseProof,
    proofHash: generateProofHash(ert.id, "swap", timestamp),
    publicInputs: {
      ertId: ert.id,
      timestamp,
    },
    privateInputs: {
      tokenIn,
      tokenOut,
      amountIn,
      minAmountOut,
      adapter,
    },
    attestations: {
      ertOwnership: true,
      adapterAllowed: ert.allowedAdapters.some(
        (a) => a.toLowerCase() === adapter.toLowerCase()
      ),
      assetsAllowed:
        ert.allowedAssets.some((a) => a.toLowerCase() === tokenIn.toLowerCase()) &&
        ert.allowedAssets.some((a) => a.toLowerCase() === tokenOut.toLowerCase()),
      amountWithinLimit: amountIn <= ert.maxPositionSize,
    },
  };

  return proof;
}

/**
 * Generate a private yield proof
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
  await simulateProofGeneration();

  const timestamp = Math.floor(Date.now() / 1000);
  const protocol: "staking" | "lending" =
    action === "stake" || action === "unstake" ? "staking" : "lending";

  const baseProof = getYieldProof("default");

  const proof: PrivateYieldProof = {
    ...baseProof,
    proofHash: generateProofHash(ert.id, "yield", timestamp),
    publicInputs: {
      ertId: ert.id,
      timestamp,
      protocol,
    },
    privateInputs: {
      adapter,
      asset,
      amount,
      action,
    },
    attestations: {
      ertOwnership: true,
      adapterAllowed: ert.allowedAdapters.some(
        (a) => a.toLowerCase() === adapter.toLowerCase()
      ),
      assetAllowed: ert.allowedAssets.some(
        (a) => a.toLowerCase() === asset.toLowerCase()
      ),
      amountWithinLimit: amount <= ert.maxPositionSize,
    },
  };

  return proof;
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
  await simulateProofGeneration();

  const timestamp = Math.floor(Date.now() / 1000);

  const baseProof = getPerpProof("default");

  const proof: PrivatePerpProof = {
    ...baseProof,
    proofHash: generateProofHash(ert.id, "perp", timestamp),
    publicInputs: {
      ertId: ert.id,
      timestamp,
      hasPosition: size > BigInt(0),
    },
    privateInputs: {
      market,
      size,
      leverage,
      isLong,
      collateral,
    },
    attestations: {
      ertOwnership: true,
      leverageWithinLimit: leverage <= ert.maxLeverage,
      sizeWithinLimit: size <= ert.maxPositionSize,
      marketAllowed: true, // Simplified for demo
    },
  };

  return proof;
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
  await simulateProofGeneration(2000, 3000); // Settlement proofs take longer

  const timestamp = Math.floor(Date.now() / 1000);
  const pnl = endingCapital - startingCapital;

  // Calculate fee distribution (20% to LP, 80% to executor on profits)
  let lpShare = BigInt(0);
  let executorShare = BigInt(0);

  if (pnl > BigInt(0)) {
    lpShare = (pnl * BigInt(20)) / BigInt(100); // 20% to LP
    executorShare = pnl - lpShare; // 80% to executor
  }

  const baseProof = getSettlementProof("default");

  const proof: PrivateSettlementProof = {
    ...baseProof,
    proofHash: generateProofHash(ert.id, "settlement", timestamp),
    publicInputs: {
      ertId: ert.id,
      startingCapital,
      endingCapital,
      pnl,
      ftsoPriceBlock,
      lpShare,
      executorShare,
    },
    privateInputs: {
      tradeHistory: [], // Hidden in demo
      positionHistory: [], // Hidden in demo
    },
    attestations: {
      pnlCalculatedCorrectly: true,
      ftsoPricesUsed: true,
      allTradesWithinConstraints: true,
      feeDistributionCorrect: true,
    },
  };

  return proof;
}
