// PRAXIS Contract ABIs
// Extracted from Solidity interfaces

// Enum values
export const ExecutorTier = {
  UNVERIFIED: 0,
  NOVICE: 1,
  VERIFIED: 2,
  ESTABLISHED: 3,
  ELITE: 4,
} as const;

export const ERTStatus = {
  PENDING: 0,
  ACTIVE: 1,
  SETTLED: 2,
  EXPIRED: 3,
  LIQUIDATED: 4,
} as const;

// PraxisGateway ABI
export const PraxisGatewayABI = [
  // LP Functions
  {
    name: 'deposit',
    type: 'function',
    stateMutability: 'nonpayable',
    inputs: [{ name: 'amount', type: 'uint256' }],
    outputs: [{ name: 'shares', type: 'uint256' }],
  },
  {
    name: 'depositWithPermit',
    type: 'function',
    stateMutability: 'nonpayable',
    inputs: [
      { name: 'amount', type: 'uint256' },
      { name: 'deadline', type: 'uint256' },
      { name: 'v', type: 'uint8' },
      { name: 'r', type: 'bytes32' },
      { name: 's', type: 'bytes32' },
    ],
    outputs: [{ name: 'shares', type: 'uint256' }],
  },
  {
    name: 'withdraw',
    type: 'function',
    stateMutability: 'nonpayable',
    inputs: [{ name: 'shares', type: 'uint256' }],
    outputs: [{ name: 'amount', type: 'uint256' }],
  },
  {
    name: 'getVaultInfo',
    type: 'function',
    stateMutability: 'view',
    inputs: [],
    outputs: [
      {
        name: 'info',
        type: 'tuple',
        components: [
          { name: 'totalAssets', type: 'uint256' },
          { name: 'totalShares', type: 'uint256' },
          { name: 'allocatedCapital', type: 'uint256' },
          { name: 'availableCapital', type: 'uint256' },
          { name: 'utilizationRate', type: 'uint16' },
        ],
      },
    ],
  },
  // Executor Functions
  {
    name: 'requestExecutionRights',
    type: 'function',
    stateMutability: 'payable',
    inputs: [
      { name: 'capitalNeeded', type: 'uint256' },
      { name: 'duration', type: 'uint256' },
      {
        name: 'constraints',
        type: 'tuple',
        components: [
          { name: 'maxLeverage', type: 'uint8' },
          { name: 'maxDrawdownBps', type: 'uint16' },
          { name: 'maxPositionSizeBps', type: 'uint16' },
          { name: 'allowedAdapters', type: 'address[]' },
          { name: 'allowedAssets', type: 'address[]' },
        ],
      },
      {
        name: 'fees',
        type: 'tuple',
        components: [
          { name: 'baseFeeAprBps', type: 'uint16' },
          { name: 'profitShareBps', type: 'uint16' },
        ],
      },
    ],
    outputs: [{ name: 'ertId', type: 'uint256' }],
  },
  {
    name: 'executeWithRights',
    type: 'function',
    stateMutability: 'nonpayable',
    inputs: [
      { name: 'ertId', type: 'uint256' },
      {
        name: 'actions',
        type: 'tuple[]',
        components: [
          { name: 'adapter', type: 'address' },
          { name: 'data', type: 'bytes' },
          { name: 'value', type: 'uint256' },
        ],
      },
    ],
    outputs: [{ name: 'results', type: 'bytes[]' }],
  },
  {
    name: 'settleRights',
    type: 'function',
    stateMutability: 'nonpayable',
    inputs: [{ name: 'ertId', type: 'uint256' }],
    outputs: [
      {
        name: 'result',
        type: 'tuple',
        components: [
          { name: 'ertId', type: 'uint256' },
          { name: 'totalPnl', type: 'int256' },
          { name: 'lpBaseFee', type: 'uint256' },
          { name: 'lpProfitShare', type: 'uint256' },
          { name: 'insuranceFee', type: 'uint256' },
          { name: 'executorProfit', type: 'uint256' },
          { name: 'capitalReturned', type: 'uint256' },
          { name: 'stakeReturned', type: 'uint256' },
          { name: 'stakeSlashed', type: 'uint256' },
        ],
      },
    ],
  },
  {
    name: 'forceSettleRights',
    type: 'function',
    stateMutability: 'nonpayable',
    inputs: [{ name: 'ertId', type: 'uint256' }],
    outputs: [
      {
        name: 'result',
        type: 'tuple',
        components: [
          { name: 'ertId', type: 'uint256' },
          { name: 'totalPnl', type: 'int256' },
          { name: 'lpBaseFee', type: 'uint256' },
          { name: 'lpProfitShare', type: 'uint256' },
          { name: 'insuranceFee', type: 'uint256' },
          { name: 'executorProfit', type: 'uint256' },
          { name: 'capitalReturned', type: 'uint256' },
          { name: 'stakeReturned', type: 'uint256' },
          { name: 'stakeSlashed', type: 'uint256' },
        ],
      },
    ],
  },
  // View Functions
  {
    name: 'getExecutionRights',
    type: 'function',
    stateMutability: 'view',
    inputs: [{ name: 'ertId', type: 'uint256' }],
    outputs: [
      {
        name: 'rights',
        type: 'tuple',
        components: [
          { name: 'tokenId', type: 'uint256' },
          { name: 'executor', type: 'address' },
          { name: 'vault', type: 'address' },
          { name: 'capitalLimit', type: 'uint256' },
          { name: 'startTime', type: 'uint256' },
          { name: 'expiryTime', type: 'uint256' },
          {
            name: 'constraints',
            type: 'tuple',
            components: [
              { name: 'maxLeverage', type: 'uint8' },
              { name: 'maxDrawdownBps', type: 'uint16' },
              { name: 'maxPositionSizeBps', type: 'uint16' },
              { name: 'allowedAdapters', type: 'address[]' },
              { name: 'allowedAssets', type: 'address[]' },
            ],
          },
          {
            name: 'fees',
            type: 'tuple',
            components: [
              { name: 'baseFeeAprBps', type: 'uint16' },
              { name: 'profitShareBps', type: 'uint16' },
              { name: 'stakedAmount', type: 'uint256' },
            ],
          },
          {
            name: 'status',
            type: 'tuple',
            components: [
              { name: 'capitalDeployed', type: 'uint256' },
              { name: 'realizedPnl', type: 'int256' },
              { name: 'unrealizedPnl', type: 'int256' },
              { name: 'highWaterMark', type: 'uint256' },
              { name: 'maxDrawdownHit', type: 'uint256' },
            ],
          },
          { name: 'ertStatus', type: 'uint8' },
        ],
      },
    ],
  },
  {
    name: 'getPositions',
    type: 'function',
    stateMutability: 'view',
    inputs: [{ name: 'ertId', type: 'uint256' }],
    outputs: [
      {
        name: 'positions',
        type: 'tuple[]',
        components: [
          { name: 'ertId', type: 'uint256' },
          { name: 'adapter', type: 'address' },
          { name: 'positionId', type: 'bytes32' },
          { name: 'asset', type: 'address' },
          { name: 'size', type: 'uint256' },
          { name: 'entryValueUsd', type: 'uint256' },
          { name: 'timestamp', type: 'uint256' },
          { name: 'positionType', type: 'uint8' },
        ],
      },
    ],
  },
  {
    name: 'estimatePnl',
    type: 'function',
    stateMutability: 'view',
    inputs: [{ name: 'ertId', type: 'uint256' }],
    outputs: [{ name: 'pnl', type: 'int256' }],
  },
  {
    name: 'estimateSettlement',
    type: 'function',
    stateMutability: 'view',
    inputs: [{ name: 'ertId', type: 'uint256' }],
    outputs: [
      {
        name: 'result',
        type: 'tuple',
        components: [
          { name: 'ertId', type: 'uint256' },
          { name: 'totalPnl', type: 'int256' },
          { name: 'lpBaseFee', type: 'uint256' },
          { name: 'lpProfitShare', type: 'uint256' },
          { name: 'insuranceFee', type: 'uint256' },
          { name: 'executorProfit', type: 'uint256' },
          { name: 'capitalReturned', type: 'uint256' },
          { name: 'stakeReturned', type: 'uint256' },
          { name: 'stakeSlashed', type: 'uint256' },
        ],
      },
    ],
  },
  {
    name: 'checkExecutor',
    type: 'function',
    stateMutability: 'view',
    inputs: [{ name: 'executor', type: 'address' }],
    outputs: [
      { name: 'isAuthorized', type: 'bool' },
      { name: 'tier', type: 'uint8' },
    ],
  },
  {
    name: 'getRequiredStake',
    type: 'function',
    stateMutability: 'view',
    inputs: [
      { name: 'executor', type: 'address' },
      { name: 'capitalNeeded', type: 'uint256' },
    ],
    outputs: [{ name: 'requiredStake', type: 'uint256' }],
  },
  // Events
  {
    name: 'LPDeposit',
    type: 'event',
    inputs: [
      { name: 'depositor', type: 'address', indexed: true },
      { name: 'amount', type: 'uint256', indexed: false },
      { name: 'shares', type: 'uint256', indexed: false },
    ],
  },
  {
    name: 'LPWithdraw',
    type: 'event',
    inputs: [
      { name: 'withdrawer', type: 'address', indexed: true },
      { name: 'shares', type: 'uint256', indexed: false },
      { name: 'amount', type: 'uint256', indexed: false },
    ],
  },
  {
    name: 'ExecutionRightsRequested',
    type: 'event',
    inputs: [
      { name: 'executor', type: 'address', indexed: true },
      { name: 'ertId', type: 'uint256', indexed: true },
      { name: 'capitalNeeded', type: 'uint256', indexed: false },
      { name: 'duration', type: 'uint256', indexed: false },
    ],
  },
  {
    name: 'ExecutionRightsSettled',
    type: 'event',
    inputs: [
      { name: 'executor', type: 'address', indexed: true },
      { name: 'ertId', type: 'uint256', indexed: true },
      { name: 'pnl', type: 'int256', indexed: false },
    ],
  },
] as const;

// ExecutionVault ABI (ERC-4626 + PRAXIS extensions)
export const ExecutionVaultABI = [
  // ERC-4626 Standard
  {
    name: 'asset',
    type: 'function',
    stateMutability: 'view',
    inputs: [],
    outputs: [{ name: '', type: 'address' }],
  },
  {
    name: 'totalAssets',
    type: 'function',
    stateMutability: 'view',
    inputs: [],
    outputs: [{ name: '', type: 'uint256' }],
  },
  {
    name: 'totalSupply',
    type: 'function',
    stateMutability: 'view',
    inputs: [],
    outputs: [{ name: '', type: 'uint256' }],
  },
  {
    name: 'balanceOf',
    type: 'function',
    stateMutability: 'view',
    inputs: [{ name: 'account', type: 'address' }],
    outputs: [{ name: '', type: 'uint256' }],
  },
  {
    name: 'convertToAssets',
    type: 'function',
    stateMutability: 'view',
    inputs: [{ name: 'shares', type: 'uint256' }],
    outputs: [{ name: '', type: 'uint256' }],
  },
  {
    name: 'convertToShares',
    type: 'function',
    stateMutability: 'view',
    inputs: [{ name: 'assets', type: 'uint256' }],
    outputs: [{ name: '', type: 'uint256' }],
  },
  {
    name: 'previewDeposit',
    type: 'function',
    stateMutability: 'view',
    inputs: [{ name: 'assets', type: 'uint256' }],
    outputs: [{ name: '', type: 'uint256' }],
  },
  {
    name: 'previewWithdraw',
    type: 'function',
    stateMutability: 'view',
    inputs: [{ name: 'assets', type: 'uint256' }],
    outputs: [{ name: '', type: 'uint256' }],
  },
  {
    name: 'previewRedeem',
    type: 'function',
    stateMutability: 'view',
    inputs: [{ name: 'shares', type: 'uint256' }],
    outputs: [{ name: '', type: 'uint256' }],
  },
  // PRAXIS Extensions
  {
    name: 'totalAllocated',
    type: 'function',
    stateMutability: 'view',
    inputs: [],
    outputs: [{ name: '', type: 'uint256' }],
  },
  {
    name: 'availableCapital',
    type: 'function',
    stateMutability: 'view',
    inputs: [],
    outputs: [{ name: '', type: 'uint256' }],
  },
  {
    name: 'ertCapitalAllocated',
    type: 'function',
    stateMutability: 'view',
    inputs: [{ name: 'ertId', type: 'uint256' }],
    outputs: [{ name: '', type: 'uint256' }],
  },
] as const;

// ExecutionRightsNFT ABI (ERC-721 + PRAXIS)
export const ExecutionRightsNFTABI = [
  // ERC-721 Standard
  {
    name: 'balanceOf',
    type: 'function',
    stateMutability: 'view',
    inputs: [{ name: 'owner', type: 'address' }],
    outputs: [{ name: '', type: 'uint256' }],
  },
  {
    name: 'ownerOf',
    type: 'function',
    stateMutability: 'view',
    inputs: [{ name: 'tokenId', type: 'uint256' }],
    outputs: [{ name: '', type: 'address' }],
  },
  {
    name: 'tokenOfOwnerByIndex',
    type: 'function',
    stateMutability: 'view',
    inputs: [
      { name: 'owner', type: 'address' },
      { name: 'index', type: 'uint256' },
    ],
    outputs: [{ name: '', type: 'uint256' }],
  },
  // PRAXIS Extensions
  {
    name: 'getRights',
    type: 'function',
    stateMutability: 'view',
    inputs: [{ name: 'tokenId', type: 'uint256' }],
    outputs: [
      {
        name: 'rights',
        type: 'tuple',
        components: [
          { name: 'tokenId', type: 'uint256' },
          { name: 'executor', type: 'address' },
          { name: 'vault', type: 'address' },
          { name: 'capitalLimit', type: 'uint256' },
          { name: 'startTime', type: 'uint256' },
          { name: 'expiryTime', type: 'uint256' },
          {
            name: 'constraints',
            type: 'tuple',
            components: [
              { name: 'maxLeverage', type: 'uint8' },
              { name: 'maxDrawdownBps', type: 'uint16' },
              { name: 'maxPositionSizeBps', type: 'uint16' },
              { name: 'allowedAdapters', type: 'address[]' },
              { name: 'allowedAssets', type: 'address[]' },
            ],
          },
          {
            name: 'fees',
            type: 'tuple',
            components: [
              { name: 'baseFeeAprBps', type: 'uint16' },
              { name: 'profitShareBps', type: 'uint16' },
              { name: 'stakedAmount', type: 'uint256' },
            ],
          },
          {
            name: 'status',
            type: 'tuple',
            components: [
              { name: 'capitalDeployed', type: 'uint256' },
              { name: 'realizedPnl', type: 'int256' },
              { name: 'unrealizedPnl', type: 'int256' },
              { name: 'highWaterMark', type: 'uint256' },
              { name: 'maxDrawdownHit', type: 'uint256' },
            ],
          },
          { name: 'ertStatus', type: 'uint8' },
        ],
      },
    ],
  },
  {
    name: 'isValid',
    type: 'function',
    stateMutability: 'view',
    inputs: [{ name: 'tokenId', type: 'uint256' }],
    outputs: [{ name: '', type: 'bool' }],
  },
  {
    name: 'isExpired',
    type: 'function',
    stateMutability: 'view',
    inputs: [{ name: 'tokenId', type: 'uint256' }],
    outputs: [{ name: '', type: 'bool' }],
  },
] as const;

// ReputationManager ABI
export const ReputationManagerABI = [
  {
    name: 'getReputation',
    type: 'function',
    stateMutability: 'view',
    inputs: [{ name: 'executor', type: 'address' }],
    outputs: [
      {
        name: 'reputation',
        type: 'tuple',
        components: [
          { name: 'tier', type: 'uint8' },
          { name: 'totalSettlements', type: 'uint256' },
          { name: 'profitableSettlements', type: 'uint256' },
          { name: 'totalVolumeUsd', type: 'uint256' },
          { name: 'totalPnlUsd', type: 'int256' },
          { name: 'largestLossBps', type: 'uint256' },
          { name: 'consecutiveProfits', type: 'uint256' },
          { name: 'consecutiveLosses', type: 'uint256' },
          { name: 'lastSettlementTime', type: 'uint256' },
          { name: 'isWhitelisted', type: 'bool' },
          { name: 'isBanned', type: 'bool' },
        ],
      },
    ],
  },
  {
    name: 'getExecutorTierConfig',
    type: 'function',
    stateMutability: 'view',
    inputs: [{ name: 'executor', type: 'address' }],
    outputs: [
      {
        name: 'config',
        type: 'tuple',
        components: [
          { name: 'maxCapital', type: 'uint256' },
          { name: 'stakeRequiredBps', type: 'uint16' },
          { name: 'maxDrawdownBps', type: 'uint16' },
          { name: 'allowedRiskLevel', type: 'uint8' },
          { name: 'settlementsRequired', type: 'uint256' },
          { name: 'profitRateBps', type: 'uint16' },
          { name: 'volumeRequired', type: 'uint256' },
        ],
      },
    ],
  },
  {
    name: 'getRequiredStake',
    type: 'function',
    stateMutability: 'view',
    inputs: [
      { name: 'executor', type: 'address' },
      { name: 'capitalUsd', type: 'uint256' },
    ],
    outputs: [{ name: 'stake', type: 'uint256' }],
  },
  {
    name: 'isBanned',
    type: 'function',
    stateMutability: 'view',
    inputs: [{ name: 'executor', type: 'address' }],
    outputs: [{ name: '', type: 'bool' }],
  },
  {
    name: 'isWhitelisted',
    type: 'function',
    stateMutability: 'view',
    inputs: [{ name: 'executor', type: 'address' }],
    outputs: [{ name: '', type: 'bool' }],
  },
  {
    name: 'getMaxDrawdown',
    type: 'function',
    stateMutability: 'view',
    inputs: [{ name: 'executor', type: 'address' }],
    outputs: [{ name: '', type: 'uint16' }],
  },
] as const;

// SettlementEngine ABI
export const SettlementEngineABI = [
  {
    name: 'settle',
    type: 'function',
    stateMutability: 'nonpayable',
    inputs: [{ name: 'ertId', type: 'uint256' }],
    outputs: [
      {
        name: 'result',
        type: 'tuple',
        components: [
          { name: 'ertId', type: 'uint256' },
          { name: 'totalPnl', type: 'int256' },
          { name: 'lpBaseFee', type: 'uint256' },
          { name: 'lpProfitShare', type: 'uint256' },
          { name: 'insuranceFee', type: 'uint256' },
          { name: 'executorProfit', type: 'uint256' },
          { name: 'capitalReturned', type: 'uint256' },
          { name: 'stakeReturned', type: 'uint256' },
          { name: 'stakeSlashed', type: 'uint256' },
        ],
      },
    ],
  },
  {
    name: 'forceSettle',
    type: 'function',
    stateMutability: 'nonpayable',
    inputs: [{ name: 'ertId', type: 'uint256' }],
    outputs: [
      {
        name: 'result',
        type: 'tuple',
        components: [
          { name: 'ertId', type: 'uint256' },
          { name: 'totalPnl', type: 'int256' },
          { name: 'lpBaseFee', type: 'uint256' },
          { name: 'lpProfitShare', type: 'uint256' },
          { name: 'insuranceFee', type: 'uint256' },
          { name: 'executorProfit', type: 'uint256' },
          { name: 'capitalReturned', type: 'uint256' },
          { name: 'stakeReturned', type: 'uint256' },
          { name: 'stakeSlashed', type: 'uint256' },
        ],
      },
    ],
  },
  {
    name: 'estimateSettlement',
    type: 'function',
    stateMutability: 'view',
    inputs: [{ name: 'ertId', type: 'uint256' }],
    outputs: [
      {
        name: 'result',
        type: 'tuple',
        components: [
          { name: 'ertId', type: 'uint256' },
          { name: 'totalPnl', type: 'int256' },
          { name: 'lpBaseFee', type: 'uint256' },
          { name: 'lpProfitShare', type: 'uint256' },
          { name: 'insuranceFee', type: 'uint256' },
          { name: 'executorProfit', type: 'uint256' },
          { name: 'capitalReturned', type: 'uint256' },
          { name: 'stakeReturned', type: 'uint256' },
          { name: 'stakeSlashed', type: 'uint256' },
        ],
      },
    ],
  },
  {
    name: 'calculatePnl',
    type: 'function',
    stateMutability: 'view',
    inputs: [{ name: 'ertId', type: 'uint256' }],
    outputs: [{ name: 'pnl', type: 'int256' }],
  },
  {
    name: 'canSettle',
    type: 'function',
    stateMutability: 'view',
    inputs: [{ name: 'ertId', type: 'uint256' }],
    outputs: [
      { name: 'canSettle', type: 'bool' },
      { name: 'reason', type: 'string' },
    ],
  },
  {
    name: 'canForceSettle',
    type: 'function',
    stateMutability: 'view',
    inputs: [{ name: 'ertId', type: 'uint256' }],
    outputs: [{ name: '', type: 'bool' }],
  },
  {
    name: 'calculateFeeBreakdown',
    type: 'function',
    stateMutability: 'view',
    inputs: [
      { name: 'ertId', type: 'uint256' },
      { name: 'pnl', type: 'int256' },
    ],
    outputs: [
      { name: 'lpBaseFee', type: 'uint256' },
      { name: 'lpProfitShare', type: 'uint256' },
      { name: 'executorProfit', type: 'uint256' },
      { name: 'insuranceFee', type: 'uint256' },
      { name: 'stakeSlashed', type: 'uint256' },
    ],
  },
  // Events
  {
    name: 'ERTSettled',
    type: 'event',
    inputs: [
      { name: 'ertId', type: 'uint256', indexed: true },
      { name: 'executor', type: 'address', indexed: true },
      { name: 'totalPnl', type: 'int256', indexed: false },
      { name: 'lpFees', type: 'uint256', indexed: false },
      { name: 'executorProfit', type: 'uint256', indexed: false },
      { name: 'insuranceCollected', type: 'uint256', indexed: false },
    ],
  },
] as const;

// CircuitBreaker ABI
export const CircuitBreakerABI = [
  {
    name: 'isTripped',
    type: 'function',
    stateMutability: 'view',
    inputs: [],
    outputs: [{ name: '', type: 'bool' }],
  },
  {
    name: 'cooldownEndTime',
    type: 'function',
    stateMutability: 'view',
    inputs: [],
    outputs: [{ name: '', type: 'uint256' }],
  },
  {
    name: 'dailyLoss',
    type: 'function',
    stateMutability: 'view',
    inputs: [],
    outputs: [{ name: '', type: 'uint256' }],
  },
  {
    name: 'dailyLossLimit',
    type: 'function',
    stateMutability: 'view',
    inputs: [],
    outputs: [{ name: '', type: 'uint256' }],
  },
  {
    name: 'canExecute',
    type: 'function',
    stateMutability: 'view',
    inputs: [],
    outputs: [{ name: '', type: 'bool' }],
  },
] as const;

// InsuranceFund ABI
export const InsuranceFundABI = [
  {
    name: 'totalFunds',
    type: 'function',
    stateMutability: 'view',
    inputs: [],
    outputs: [{ name: '', type: 'uint256' }],
  },
  {
    name: 'claimableAmount',
    type: 'function',
    stateMutability: 'view',
    inputs: [{ name: 'amount', type: 'uint256' }],
    outputs: [{ name: '', type: 'uint256' }],
  },
  {
    name: 'targetSize',
    type: 'function',
    stateMutability: 'view',
    inputs: [],
    outputs: [{ name: '', type: 'uint256' }],
  },
  {
    name: 'isFunded',
    type: 'function',
    stateMutability: 'view',
    inputs: [],
    outputs: [{ name: '', type: 'bool' }],
  },
] as const;

// UtilizationController ABI
export const UtilizationControllerABI = [
  {
    name: 'currentUtilization',
    type: 'function',
    stateMutability: 'view',
    inputs: [],
    outputs: [{ name: '', type: 'uint256' }],
  },
  {
    name: 'maxUtilizationBps',
    type: 'function',
    stateMutability: 'view',
    inputs: [],
    outputs: [{ name: '', type: 'uint256' }],
  },
  {
    name: 'canAllocate',
    type: 'function',
    stateMutability: 'view',
    inputs: [{ name: 'amount', type: 'uint256' }],
    outputs: [{ name: '', type: 'bool' }],
  },
  {
    name: 'availableForAllocation',
    type: 'function',
    stateMutability: 'view',
    inputs: [],
    outputs: [{ name: '', type: 'uint256' }],
  },
] as const;

// ERC20 ABI (for asset token)
export const ERC20ABI = [
  {
    name: 'name',
    type: 'function',
    stateMutability: 'view',
    inputs: [],
    outputs: [{ name: '', type: 'string' }],
  },
  {
    name: 'symbol',
    type: 'function',
    stateMutability: 'view',
    inputs: [],
    outputs: [{ name: '', type: 'string' }],
  },
  {
    name: 'decimals',
    type: 'function',
    stateMutability: 'view',
    inputs: [],
    outputs: [{ name: '', type: 'uint8' }],
  },
  {
    name: 'balanceOf',
    type: 'function',
    stateMutability: 'view',
    inputs: [{ name: 'account', type: 'address' }],
    outputs: [{ name: '', type: 'uint256' }],
  },
  {
    name: 'allowance',
    type: 'function',
    stateMutability: 'view',
    inputs: [
      { name: 'owner', type: 'address' },
      { name: 'spender', type: 'address' },
    ],
    outputs: [{ name: '', type: 'uint256' }],
  },
  {
    name: 'approve',
    type: 'function',
    stateMutability: 'nonpayable',
    inputs: [
      { name: 'spender', type: 'address' },
      { name: 'amount', type: 'uint256' },
    ],
    outputs: [{ name: '', type: 'bool' }],
  },
  {
    name: 'transfer',
    type: 'function',
    stateMutability: 'nonpayable',
    inputs: [
      { name: 'to', type: 'address' },
      { name: 'amount', type: 'uint256' },
    ],
    outputs: [{ name: '', type: 'bool' }],
  },
] as const;
