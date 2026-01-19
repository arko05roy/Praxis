'use client';

import { useAccount, useConnect, useDisconnect, useChainId, useSwitchChain } from 'wagmi';
import { injected } from 'wagmi/connectors';
import {
  useVaultInfo,
  useLPBalance,
  useExecutorStatus,
  useExecutorReputation,
  useTierConfig,
  useCircuitBreakerStatus,
  useInsuranceFundStatus,
  useUtilizationLimits,
} from '@/lib/hooks';
import { flare, coston2 } from '@/lib/wagmi';
import { formatUnits } from 'viem';

// Format large numbers for display
function formatAmount(amount: bigint | undefined, decimals: number = 6): string {
  if (amount === undefined) return '...';
  return parseFloat(formatUnits(amount, decimals)).toLocaleString(undefined, {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}

// Format percentage
function formatPercent(value: number | undefined): string {
  if (value === undefined) return '...';
  return `${value.toFixed(2)}%`;
}

export default function AppPage() {
  const { address, isConnected } = useAccount();
  const { connect, isPending: isConnecting } = useConnect();
  const { disconnect } = useDisconnect();
  const chainId = useChainId();
  const { switchChain } = useSwitchChain();

  // Hooks for data
  const { data: vaultInfo, isLoading: vaultLoading } = useVaultInfo();
  const { data: lpBalance, isLoading: balanceLoading } = useLPBalance();
  const { data: executorStatus, isLoading: statusLoading } = useExecutorStatus();
  const { data: reputation, isLoading: reputationLoading } = useExecutorReputation();
  const { data: tierConfig, isLoading: tierLoading } = useTierConfig();
  const { data: circuitBreaker, isLoading: cbLoading } = useCircuitBreakerStatus();
  const { data: insurance, isLoading: insuranceLoading } = useInsuranceFundStatus();
  const { data: utilization, isLoading: utilizationLoading } = useUtilizationLimits();

  const isFlare = chainId === flare.id;
  const isCoston2 = chainId === coston2.id;
  const isValidChain = isFlare || isCoston2;

  return (
    <main className="min-h-screen bg-gradient-to-b from-slate-950 to-slate-900 text-white">
      <div className="container mx-auto px-4 py-8">
        {/* Header */}
        <header className="flex justify-between items-center mb-12">
          <h1 className="text-3xl font-bold bg-gradient-to-r from-amber-400 to-orange-500 bg-clip-text text-transparent">
            PRAXIS
          </h1>
          <div className="flex items-center gap-4">
            {isConnected && (
              <select
                value={chainId}
                onChange={(e) => switchChain?.({ chainId: Number(e.target.value) as 14 | 114 })}
                className="bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-sm"
              >
                <option value={flare.id}>Flare Mainnet</option>
                <option value={coston2.id}>Coston2 Testnet</option>
              </select>
            )}
            {isConnected ? (
              <button
                onClick={() => disconnect()}
                className="bg-red-600 hover:bg-red-700 px-4 py-2 rounded-lg font-medium transition-colors"
              >
                {address?.slice(0, 6)}...{address?.slice(-4)}
              </button>
            ) : (
              <button
                onClick={() => connect({ connector: injected() })}
                disabled={isConnecting}
                className="bg-amber-500 hover:bg-amber-600 px-6 py-2 rounded-lg font-medium transition-colors disabled:opacity-50"
              >
                {isConnecting ? 'Connecting...' : 'Connect Wallet'}
              </button>
            )}
          </div>
        </header>

        {!isConnected ? (
          <div className="text-center py-20">
            <h2 className="text-2xl font-semibold mb-4">Connect your wallet to get started</h2>
            <p className="text-slate-400 mb-8">
              Access DeFi capital through time-bound execution rights
            </p>
          </div>
        ) : !isValidChain ? (
          <div className="text-center py-20">
            <h2 className="text-2xl font-semibold mb-4">Switch to Flare Network</h2>
            <p className="text-slate-400 mb-8">
              PRAXIS is deployed on Flare Mainnet and Coston2 Testnet
            </p>
            <button
              onClick={() => switchChain?.({ chainId: flare.id })}
              className="bg-amber-500 hover:bg-amber-600 px-6 py-3 rounded-lg font-medium transition-colors"
            >
              Switch to Flare
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            {/* Vault Overview */}
            <div className="bg-slate-800/50 rounded-2xl p-6 border border-slate-700">
              <h2 className="text-xl font-semibold mb-6 flex items-center gap-2">
                <span className="w-3 h-3 rounded-full bg-green-500"></span>
                Vault Overview
              </h2>
              {vaultLoading ? (
                <div className="animate-pulse space-y-4">
                  <div className="h-6 bg-slate-700 rounded w-1/2"></div>
                  <div className="h-6 bg-slate-700 rounded w-2/3"></div>
                </div>
              ) : vaultInfo ? (
                <div className="space-y-4">
                  <div className="flex justify-between">
                    <span className="text-slate-400">Total Assets</span>
                    <span className="font-mono">${formatAmount(vaultInfo.totalAssets)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-400">Available Capital</span>
                    <span className="font-mono">${formatAmount(vaultInfo.availableCapital)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-400">Allocated Capital</span>
                    <span className="font-mono">${formatAmount(vaultInfo.allocatedCapital)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-400">Utilization Rate</span>
                    <span className="font-mono">{formatPercent(vaultInfo.utilizationRate)}</span>
                  </div>
                  <div className="mt-4 pt-4 border-t border-slate-700">
                    <div className="w-full bg-slate-700 rounded-full h-2">
                      <div
                        className="bg-amber-500 h-2 rounded-full transition-all"
                        style={{ width: `${Math.min(100, vaultInfo.utilizationRate)}%` }}
                      ></div>
                    </div>
                  </div>
                </div>
              ) : (
                <p className="text-slate-400">Unable to load vault data</p>
              )}
            </div>

            {/* Your LP Position */}
            <div className="bg-slate-800/50 rounded-2xl p-6 border border-slate-700">
              <h2 className="text-xl font-semibold mb-6 flex items-center gap-2">
                <span className="w-3 h-3 rounded-full bg-blue-500"></span>
                Your LP Position
              </h2>
              {balanceLoading ? (
                <div className="animate-pulse space-y-4">
                  <div className="h-6 bg-slate-700 rounded w-1/2"></div>
                </div>
              ) : lpBalance ? (
                <div className="space-y-4">
                  <div className="flex justify-between">
                    <span className="text-slate-400">Shares</span>
                    <span className="font-mono">{formatAmount(lpBalance.shares, 18)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-400">Value</span>
                    <span className="font-mono text-green-400">${formatAmount(lpBalance.assetsValue)}</span>
                  </div>
                  <div className="flex gap-3 mt-6">
                    <button className="flex-1 bg-green-600 hover:bg-green-700 px-4 py-3 rounded-lg font-medium transition-colors">
                      Deposit
                    </button>
                    <button className="flex-1 bg-slate-600 hover:bg-slate-500 px-4 py-3 rounded-lg font-medium transition-colors">
                      Withdraw
                    </button>
                  </div>
                </div>
              ) : (
                <div className="text-center py-8">
                  <p className="text-slate-400 mb-4">No LP position found</p>
                  <button className="bg-green-600 hover:bg-green-700 px-6 py-3 rounded-lg font-medium transition-colors">
                    Deposit Now
                  </button>
                </div>
              )}
            </div>

            {/* Executor Status */}
            <div className="bg-slate-800/50 rounded-2xl p-6 border border-slate-700">
              <h2 className="text-xl font-semibold mb-6 flex items-center gap-2">
                <span className="w-3 h-3 rounded-full bg-purple-500"></span>
                Executor Status
              </h2>
              {statusLoading || reputationLoading ? (
                <div className="animate-pulse space-y-4">
                  <div className="h-6 bg-slate-700 rounded w-1/2"></div>
                </div>
              ) : executorStatus && reputation ? (
                <div className="space-y-4">
                  <div className="flex justify-between">
                    <span className="text-slate-400">Tier</span>
                    <span className={`font-medium px-3 py-1 rounded-full text-sm ${
                      reputation.tier === 4 ? 'bg-amber-500/20 text-amber-400' :
                      reputation.tier === 3 ? 'bg-purple-500/20 text-purple-400' :
                      reputation.tier === 2 ? 'bg-blue-500/20 text-blue-400' :
                      reputation.tier === 1 ? 'bg-green-500/20 text-green-400' :
                      'bg-slate-500/20 text-slate-400'
                    }`}>
                      {reputation.tierName}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-400">Total Settlements</span>
                    <span className="font-mono">{reputation.totalSettlements.toString()}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-400">Profit Rate</span>
                    <span className="font-mono">{formatPercent(reputation.profitRate)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-400">Total Volume</span>
                    <span className="font-mono">${formatAmount(reputation.totalVolumeUsd)}</span>
                  </div>
                  {reputation.isBanned && (
                    <div className="bg-red-500/20 text-red-400 px-4 py-2 rounded-lg text-center">
                      Account Banned
                    </div>
                  )}
                  {reputation.isWhitelisted && (
                    <div className="bg-green-500/20 text-green-400 px-4 py-2 rounded-lg text-center">
                      Whitelisted
                    </div>
                  )}
                </div>
              ) : (
                <div className="text-center py-8">
                  <p className="text-slate-400 mb-4">New executor - Tier 0 (Unverified)</p>
                  <button className="bg-purple-600 hover:bg-purple-700 px-6 py-3 rounded-lg font-medium transition-colors">
                    Request Execution Rights
                  </button>
                </div>
              )}
            </div>

            {/* Tier Limits */}
            <div className="bg-slate-800/50 rounded-2xl p-6 border border-slate-700">
              <h2 className="text-xl font-semibold mb-6 flex items-center gap-2">
                <span className="w-3 h-3 rounded-full bg-orange-500"></span>
                Your Tier Limits
              </h2>
              {tierLoading ? (
                <div className="animate-pulse space-y-4">
                  <div className="h-6 bg-slate-700 rounded w-1/2"></div>
                </div>
              ) : tierConfig ? (
                <div className="space-y-4">
                  <div className="flex justify-between">
                    <span className="text-slate-400">Max Capital</span>
                    <span className="font-mono">${formatAmount(tierConfig.maxCapital)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-400">Stake Required</span>
                    <span className="font-mono">{tierConfig.stakeRequiredBps / 100}%</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-400">Max Drawdown</span>
                    <span className="font-mono">{tierConfig.maxDrawdownBps / 100}%</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-400">Risk Level</span>
                    <span className="font-mono">
                      {tierConfig.allowedRiskLevel === 0 ? 'Conservative' :
                       tierConfig.allowedRiskLevel === 1 ? 'Moderate' : 'Aggressive'}
                    </span>
                  </div>
                </div>
              ) : (
                <p className="text-slate-400">Unable to load tier data</p>
              )}
            </div>

            {/* Safety Systems */}
            <div className="bg-slate-800/50 rounded-2xl p-6 border border-slate-700 lg:col-span-2">
              <h2 className="text-xl font-semibold mb-6 flex items-center gap-2">
                <span className="w-3 h-3 rounded-full bg-red-500"></span>
                Safety Systems
              </h2>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                {/* Circuit Breaker */}
                <div className="bg-slate-900/50 rounded-xl p-4">
                  <h3 className="text-sm font-medium text-slate-400 mb-3">Circuit Breaker</h3>
                  {cbLoading ? (
                    <div className="animate-pulse h-6 bg-slate-700 rounded"></div>
                  ) : circuitBreaker ? (
                    <div className="space-y-2">
                      <div className="flex justify-between">
                        <span className="text-slate-500 text-sm">Status</span>
                        <span className={`font-medium ${circuitBreaker.isTripped ? 'text-red-400' : 'text-green-400'}`}>
                          {circuitBreaker.isTripped ? 'TRIPPED' : 'ACTIVE'}
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-slate-500 text-sm">Daily Loss</span>
                        <span className="font-mono text-sm">{formatPercent(circuitBreaker.lossPercentage)}</span>
                      </div>
                    </div>
                  ) : (
                    <p className="text-slate-500 text-sm">Unable to load</p>
                  )}
                </div>

                {/* Insurance Fund */}
                <div className="bg-slate-900/50 rounded-xl p-4">
                  <h3 className="text-sm font-medium text-slate-400 mb-3">Insurance Fund</h3>
                  {insuranceLoading ? (
                    <div className="animate-pulse h-6 bg-slate-700 rounded"></div>
                  ) : insurance ? (
                    <div className="space-y-2">
                      <div className="flex justify-between">
                        <span className="text-slate-500 text-sm">Status</span>
                        <span className={`font-medium ${insurance.isFunded ? 'text-green-400' : 'text-yellow-400'}`}>
                          {insurance.isFunded ? 'FUNDED' : 'UNDERFUNDED'}
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-slate-500 text-sm">Total</span>
                        <span className="font-mono text-sm">${formatAmount(insurance.totalFunds)}</span>
                      </div>
                    </div>
                  ) : (
                    <p className="text-slate-500 text-sm">Unable to load</p>
                  )}
                </div>

                {/* Utilization */}
                <div className="bg-slate-900/50 rounded-xl p-4">
                  <h3 className="text-sm font-medium text-slate-400 mb-3">Utilization Control</h3>
                  {utilizationLoading ? (
                    <div className="animate-pulse h-6 bg-slate-700 rounded"></div>
                  ) : utilization ? (
                    <div className="space-y-2">
                      <div className="flex justify-between">
                        <span className="text-slate-500 text-sm">Status</span>
                        <span className={`font-medium ${utilization.canAllocate ? 'text-green-400' : 'text-red-400'}`}>
                          {utilization.canAllocate ? 'AVAILABLE' : 'AT LIMIT'}
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-slate-500 text-sm">Current</span>
                        <span className="font-mono text-sm">
                          {formatPercent(utilization.utilizationPercentage)} / {formatPercent(utilization.maxUtilizationPercentage)}
                        </span>
                      </div>
                    </div>
                  ) : (
                    <p className="text-slate-500 text-sm">Unable to load</p>
                  )}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Footer */}
        <footer className="mt-16 pt-8 border-t border-slate-800 text-center text-slate-500 text-sm">
          <p>PRAXIS - Execution Rights Protocol on Flare Network</p>
          <p className="mt-2">Powered by FTSO Oracles | Built for DeFi</p>
        </footer>
      </div>
    </main>
  );
}
