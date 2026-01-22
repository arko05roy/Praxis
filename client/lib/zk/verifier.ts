import type {
  ZKProof,
  PrivateSwapProof,
  PrivateYieldProof,
  PrivatePerpProof,
  PrivateSettlementProof,
  PrivateProof,
  ProofVerificationResult,
} from "./types";

/**
 * Format attestation key for display
 */
export function formatAttestationKey(key: string): string {
  return key
    .replace(/([A-Z])/g, " $1")
    .replace(/^./, (str) => str.toUpperCase())
    .trim();
}

/**
 * Simulate verification delay
 * In production, this would be actual cryptographic verification
 */
async function simulateVerification(minDelay = 300, maxDelay = 700): Promise<void> {
  const delay = Math.random() * (maxDelay - minDelay) + minDelay;
  await new Promise((resolve) => setTimeout(resolve, delay));
}

/**
 * Verify a ZK proof
 * For demo, this performs client-side "verification" that validates attestations
 * In production, this would use snarkjs with real verification keys
 */
export async function verifyProof(proof: PrivateProof): Promise<ProofVerificationResult> {
  const start = Date.now();

  // Simulate verification time
  await simulateVerification();

  const verificationTime = Date.now() - start;

  // Check all attestations
  const attestations = proof.attestations as Record<string, boolean>;
  const details = Object.entries(attestations).map(
    ([key, value]) => `${formatAttestationKey(key)}: ${value ? "PASS" : "FAIL"}`
  );

  // Verify proof structure
  const hasValidProtocol = proof.protocol === "groth16";
  const hasValidProofHash =
    proof.proofHash && proof.proofHash.startsWith("0x") && proof.proofHash.length === 66;
  const hasValidPublicSignals =
    Array.isArray(proof.publicSignals) && proof.publicSignals.length > 0;

  if (!hasValidProtocol) {
    details.push("Protocol: FAIL (expected groth16)");
  }
  if (!hasValidProofHash) {
    details.push("Proof Hash: FAIL (invalid format)");
  }
  if (!hasValidPublicSignals) {
    details.push("Public Signals: FAIL (empty or invalid)");
  }

  // All attestations must pass
  const allAttestationsPass = Object.values(attestations).every((v) => v === true);
  const valid = allAttestationsPass && hasValidProtocol && hasValidProofHash && hasValidPublicSignals;

  return {
    valid,
    verificationTime,
    details,
    proofHash: proof.proofHash,
  };
}

/**
 * Verify a swap proof specifically
 */
export async function verifySwapProof(
  proof: PrivateSwapProof
): Promise<ProofVerificationResult & { attestations: typeof proof.attestations }> {
  const baseResult = await verifyProof(proof);

  return {
    ...baseResult,
    attestations: proof.attestations,
  };
}

/**
 * Verify a yield proof specifically
 */
export async function verifyYieldProof(
  proof: PrivateYieldProof
): Promise<ProofVerificationResult & { attestations: typeof proof.attestations }> {
  const baseResult = await verifyProof(proof);

  return {
    ...baseResult,
    attestations: proof.attestations,
  };
}

/**
 * Verify a perpetual proof specifically
 */
export async function verifyPerpProof(
  proof: PrivatePerpProof
): Promise<ProofVerificationResult & { attestations: typeof proof.attestations }> {
  const baseResult = await verifyProof(proof);

  return {
    ...baseResult,
    attestations: proof.attestations,
  };
}

/**
 * Verify a settlement proof specifically
 */
export async function verifySettlementProof(
  proof: PrivateSettlementProof
): Promise<ProofVerificationResult & { attestations: typeof proof.attestations }> {
  const baseResult = await verifyProof(proof);

  // Additional settlement-specific checks
  const pnlValid =
    proof.publicInputs.endingCapital - proof.publicInputs.startingCapital ===
    proof.publicInputs.pnl;

  if (!pnlValid) {
    baseResult.details.push("PnL Calculation: FAIL (mismatch)");
    baseResult.valid = false;
  }

  return {
    ...baseResult,
    attestations: proof.attestations,
  };
}

/**
 * Get a human-readable summary of what a proof proves
 */
export function getProofSummary(proof: PrivateProof): string {
  switch (proof.actionType) {
    case "swap":
      return `Private swap executed by ERT #${proof.publicInputs.ertId}. ` +
        `Compliance verified: adapter allowed, assets allowed, amount within limits.`;

    case "yield":
      const yieldProof = proof as PrivateYieldProof;
      return `Private ${yieldProof.publicInputs.protocol} action by ERT #${proof.publicInputs.ertId}. ` +
        `Compliance verified: adapter allowed, asset allowed, amount within limits.`;

    case "perp":
      const perpProof = proof as PrivatePerpProof;
      return `Private position ${perpProof.publicInputs.hasPosition ? "opened" : "closed"} by ERT #${proof.publicInputs.ertId}. ` +
        `Compliance verified: leverage within limit, size within limit, market allowed.`;

    case "settlement":
      const settlementProof = proof as PrivateSettlementProof;
      const pnlSign = settlementProof.publicInputs.pnl >= BigInt(0) ? "+" : "";
      return `Settlement completed for ERT #${proof.publicInputs.ertId}. ` +
        `PnL: ${pnlSign}${formatBigInt(settlementProof.publicInputs.pnl, 6)} USDC. ` +
        `All trades verified within constraints using FTSO prices at block ${settlementProof.publicInputs.ftsoPriceBlock}.`;

    default:
      return `Proof verified for ERT #${(proof as PrivateProof).publicInputs.ertId}`;
  }
}

/**
 * Format a bigint as a decimal string
 */
function formatBigInt(value: bigint, decimals: number): string {
  const str = value.toString();
  if (str.length <= decimals) {
    return "0." + str.padStart(decimals, "0");
  }
  const intPart = str.slice(0, str.length - decimals);
  const decPart = str.slice(str.length - decimals);
  return `${intPart}.${decPart}`;
}

/**
 * Get the privacy level description for a proof
 */
export function getPrivacyDescription(proof: PrivateProof): {
  hidden: string[];
  revealed: string[];
} {
  switch (proof.actionType) {
    case "swap":
      return {
        hidden: [
          "Token pair (input/output)",
          "Swap amount",
          "DEX/adapter used",
          "Slippage settings",
        ],
        revealed: [
          "ERT ID",
          "Timestamp",
          "Compliance status",
        ],
      };

    case "yield":
      return {
        hidden: [
          "Protocol used",
          "Asset deposited",
          "Deposit amount",
          "Action type (stake/supply/withdraw)",
        ],
        revealed: [
          "ERT ID",
          "Timestamp",
          "Protocol category (staking/lending)",
          "Compliance status",
        ],
      };

    case "perp":
      return {
        hidden: [
          "Position direction (long/short)",
          "Position size",
          "Leverage used",
          "Entry price target",
          "Collateral amount",
        ],
        revealed: [
          "ERT ID",
          "Timestamp",
          "Has active position (yes/no)",
          "Compliance status",
        ],
      };

    case "settlement":
      return {
        hidden: [
          "Complete trade history",
          "Individual entry/exit prices",
          "Strategy details",
          "Position timing",
        ],
        revealed: [
          "ERT ID",
          "Starting capital",
          "Ending capital",
          "Total PnL",
          "LP share",
          "Executor share",
          "FTSO price block used",
        ],
      };

    default:
      return {
        hidden: ["Trade details"],
        revealed: ["Compliance status"],
      };
  }
}
