import type {
  PrivateSwapProof,
  PrivateYieldProof,
  PrivatePerpProof,
  PrivateSettlementProof,
  PrivateExecutionResult,
  PrivateExecutionHistoryEntry,
} from "./types";
import { PRAXIS_ADDRESSES } from "../contracts/addresses";

// Get addresses from the main addresses file (Coston2)
const addresses = PRAXIS_ADDRESSES[114];

// Export addresses for use in components
export const MOCK_ADDRESSES = {
  MockSimpleDEX: addresses.MockSimpleDEX,
  MockSceptre: addresses.MockSceptre,
  MockKinetic: addresses.MockKinetic,
  MockWFLR: addresses.MockWFLR,
  MockUSDC: addresses.MockUSDC,
  MockSFLR: addresses.MockSFLR,
  MockFXRP: addresses.MockFXRP,
  MockFBTC: addresses.MockFBTC,
  MockFDOGE: addresses.MockFDOGE,
  SwapRouter: addresses.SwapRouter,
  PraxisGateway: addresses.PraxisGateway,
} as const;

// In-memory execution history for demo
let executionHistory: PrivateExecutionHistoryEntry[] = [];

/**
 * Generate a random transaction hash for demo
 */
function generateMockTxHash(): string {
  let hash = "0x";
  for (let i = 0; i < 64; i++) {
    hash += Math.floor(Math.random() * 16).toString(16);
  }
  return hash;
}

/**
 * Simulate execution delay
 */
async function simulateExecution(minDelay = 1000, maxDelay = 2000): Promise<void> {
  const delay = Math.random() * (maxDelay - minDelay) + minDelay;
  await new Promise((resolve) => setTimeout(resolve, delay));
}

/**
 * Execute a private swap
 * In production: would submit proof to ZK-enabled contract
 * For demo: simulates successful execution against MockSimpleDEX
 */
export async function executePrivateSwap(
  proof: PrivateSwapProof
): Promise<PrivateExecutionResult> {
  const startTime = Date.now();

  try {
    // Simulate blockchain execution
    await simulateExecution();

    // Generate mock transaction hash
    const txHash = generateMockTxHash();

    // Add to history
    const historyEntry: PrivateExecutionHistoryEntry = {
      id: `swap-${Date.now()}-${Math.random().toString(36).substring(7)}`,
      ertId: proof.publicInputs.ertId,
      actionType: "swap",
      timestamp: Math.floor(Date.now() / 1000),
      proofHash: proof.proofHash,
      txHash,
      status: "completed",
      publicDescription: `ERT #${proof.publicInputs.ertId} executed private swap`,
    };
    executionHistory.unshift(historyEntry);

    return {
      success: true,
      txHash,
      proofHash: proof.proofHash,
      executionTime: Date.now() - startTime,
    };
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : "Unknown error";

    // Add failed entry to history
    const historyEntry: PrivateExecutionHistoryEntry = {
      id: `swap-${Date.now()}-${Math.random().toString(36).substring(7)}`,
      ertId: proof.publicInputs.ertId,
      actionType: "swap",
      timestamp: Math.floor(Date.now() / 1000),
      proofHash: proof.proofHash,
      status: "failed",
      publicDescription: `ERT #${proof.publicInputs.ertId} swap failed`,
    };
    executionHistory.unshift(historyEntry);

    return {
      success: false,
      proofHash: proof.proofHash,
      executionTime: Date.now() - startTime,
      error: errorMessage,
    };
  }
}

/**
 * Execute a private yield action
 * In production: would submit proof to ZK-enabled contract
 * For demo: simulates successful execution against MockSceptre/MockKinetic
 */
export async function executePrivateYield(
  proof: PrivateYieldProof
): Promise<PrivateExecutionResult> {
  const startTime = Date.now();

  try {
    // Simulate blockchain execution
    await simulateExecution();

    const txHash = generateMockTxHash();

    const actionLabel =
      proof.privateInputs.action === "stake" || proof.privateInputs.action === "unstake"
        ? "staking"
        : "lending";

    const historyEntry: PrivateExecutionHistoryEntry = {
      id: `yield-${Date.now()}-${Math.random().toString(36).substring(7)}`,
      ertId: proof.publicInputs.ertId,
      actionType: "yield",
      timestamp: Math.floor(Date.now() / 1000),
      proofHash: proof.proofHash,
      txHash,
      status: "completed",
      publicDescription: `ERT #${proof.publicInputs.ertId} deployed to ${actionLabel}`,
    };
    executionHistory.unshift(historyEntry);

    return {
      success: true,
      txHash,
      proofHash: proof.proofHash,
      executionTime: Date.now() - startTime,
    };
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : "Unknown error";

    const historyEntry: PrivateExecutionHistoryEntry = {
      id: `yield-${Date.now()}-${Math.random().toString(36).substring(7)}`,
      ertId: proof.publicInputs.ertId,
      actionType: "yield",
      timestamp: Math.floor(Date.now() / 1000),
      proofHash: proof.proofHash,
      status: "failed",
      publicDescription: `ERT #${proof.publicInputs.ertId} yield action failed`,
    };
    executionHistory.unshift(historyEntry);

    return {
      success: false,
      proofHash: proof.proofHash,
      executionTime: Date.now() - startTime,
      error: errorMessage,
    };
  }
}

/**
 * Execute a private perpetual position
 * In production: would submit proof to ZK-enabled contract
 * For demo: simulates successful execution
 */
export async function executePrivatePerp(
  proof: PrivatePerpProof
): Promise<PrivateExecutionResult> {
  const startTime = Date.now();

  try {
    // Simulate blockchain execution
    await simulateExecution();

    const txHash = generateMockTxHash();

    const positionAction = proof.publicInputs.hasPosition ? "opened position" : "closed position";

    const historyEntry: PrivateExecutionHistoryEntry = {
      id: `perp-${Date.now()}-${Math.random().toString(36).substring(7)}`,
      ertId: proof.publicInputs.ertId,
      actionType: "perp",
      timestamp: Math.floor(Date.now() / 1000),
      proofHash: proof.proofHash,
      txHash,
      status: "completed",
      publicDescription: `ERT #${proof.publicInputs.ertId} ${positionAction}`,
    };
    executionHistory.unshift(historyEntry);

    return {
      success: true,
      txHash,
      proofHash: proof.proofHash,
      executionTime: Date.now() - startTime,
    };
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : "Unknown error";

    const historyEntry: PrivateExecutionHistoryEntry = {
      id: `perp-${Date.now()}-${Math.random().toString(36).substring(7)}`,
      ertId: proof.publicInputs.ertId,
      actionType: "perp",
      timestamp: Math.floor(Date.now() / 1000),
      proofHash: proof.proofHash,
      status: "failed",
      publicDescription: `ERT #${proof.publicInputs.ertId} perp action failed`,
    };
    executionHistory.unshift(historyEntry);

    return {
      success: false,
      proofHash: proof.proofHash,
      executionTime: Date.now() - startTime,
      error: errorMessage,
    };
  }
}

/**
 * Execute a private settlement
 * In production: would submit proof to ZK-enabled contract
 * For demo: simulates successful settlement
 */
export async function executePrivateSettlement(
  proof: PrivateSettlementProof
): Promise<PrivateExecutionResult> {
  const startTime = Date.now();

  try {
    // Settlement takes longer
    await simulateExecution(2000, 3000);

    const txHash = generateMockTxHash();

    const pnlFormatted = formatPnL(proof.publicInputs.pnl);

    const historyEntry: PrivateExecutionHistoryEntry = {
      id: `settlement-${Date.now()}-${Math.random().toString(36).substring(7)}`,
      ertId: proof.publicInputs.ertId,
      actionType: "settlement",
      timestamp: Math.floor(Date.now() / 1000),
      proofHash: proof.proofHash,
      txHash,
      status: "completed",
      publicDescription: `ERT #${proof.publicInputs.ertId} settled (PnL: ${pnlFormatted})`,
    };
    executionHistory.unshift(historyEntry);

    return {
      success: true,
      txHash,
      proofHash: proof.proofHash,
      executionTime: Date.now() - startTime,
    };
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : "Unknown error";

    const historyEntry: PrivateExecutionHistoryEntry = {
      id: `settlement-${Date.now()}-${Math.random().toString(36).substring(7)}`,
      ertId: proof.publicInputs.ertId,
      actionType: "settlement",
      timestamp: Math.floor(Date.now() / 1000),
      proofHash: proof.proofHash,
      status: "failed",
      publicDescription: `ERT #${proof.publicInputs.ertId} settlement failed`,
    };
    executionHistory.unshift(historyEntry);

    return {
      success: false,
      proofHash: proof.proofHash,
      executionTime: Date.now() - startTime,
      error: errorMessage,
    };
  }
}

/**
 * Get execution history
 */
export function getExecutionHistory(limit = 10): PrivateExecutionHistoryEntry[] {
  return executionHistory.slice(0, limit);
}

/**
 * Clear execution history
 */
export function clearExecutionHistory(): void {
  executionHistory = [];
}

/**
 * Format PnL for display
 */
function formatPnL(pnl: bigint): string {
  const sign = pnl >= BigInt(0) ? "+" : "";
  const value = Number(pnl) / 1e6; // Assuming 6 decimals (USDC)
  return `${sign}$${value.toFixed(2)}`;
}

/**
 * Get supported tokens for private execution
 */
export function getSupportedTokens() {
  return [
    {
      symbol: "WFLR",
      address: MOCK_ADDRESSES.MockWFLR,
      name: "Wrapped Flare",
      decimals: 18,
    },
    {
      symbol: "USDC",
      address: MOCK_ADDRESSES.MockUSDC,
      name: "USD Coin",
      decimals: 6,
    },
    {
      symbol: "FXRP",
      address: MOCK_ADDRESSES.MockFXRP,
      name: "Flare XRP",
      decimals: 18,
    },
    {
      symbol: "FBTC",
      address: MOCK_ADDRESSES.MockFBTC,
      name: "Flare BTC",
      decimals: 18,
    },
    {
      symbol: "FDOGE",
      address: MOCK_ADDRESSES.MockFDOGE,
      name: "Flare DOGE",
      decimals: 18,
    },
    {
      symbol: "SFLR",
      address: MOCK_ADDRESSES.MockSFLR,
      name: "Staked FLR",
      decimals: 18,
    },
  ];
}

/**
 * Get supported adapters for private execution
 */
export function getSupportedAdapters() {
  return [
    {
      name: "MockSimpleDEX",
      address: MOCK_ADDRESSES.MockSimpleDEX,
      type: "swap" as const,
      description: "Mock DEX for swapping tokens",
    },
    {
      name: "MockSceptre",
      address: MOCK_ADDRESSES.MockSceptre,
      type: "staking" as const,
      description: "Mock Sceptre for liquid staking",
    },
    {
      name: "MockKinetic",
      address: MOCK_ADDRESSES.MockKinetic,
      type: "lending" as const,
      description: "Mock Kinetic for lending/borrowing",
    },
  ];
}

/**
 * Get supported perpetual markets
 */
export function getSupportedPerpMarkets() {
  return [
    {
      symbol: "FLR-USD",
      name: "Flare / USD",
      maxLeverage: 10,
    },
    {
      symbol: "BTC-USD",
      name: "Bitcoin / USD",
      maxLeverage: 20,
    },
    {
      symbol: "ETH-USD",
      name: "Ethereum / USD",
      maxLeverage: 15,
    },
  ];
}
