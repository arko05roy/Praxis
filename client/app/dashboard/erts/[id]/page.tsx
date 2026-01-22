"use client";

import { useParams, useRouter } from "next/navigation";
import { useExecutionRights, useERTTimeRemaining, useERTDrawdownStatus, usePositions, useERTCapitalUtilization } from "@/lib/hooks";
import { formatUnits } from "viem";
import {
  ArrowLeft, Clock, TrendingDown, TrendingUp, Shield, AlertTriangle,
  CheckCircle2, XCircle, Copy, ExternalLink, Wallet, Activity,
  Lock, Unlock, Settings, History, Loader2
} from "lucide-react";
import Link from "next/link";
import { useState } from "react";
import { cn } from "@/lib/utils";

// Token name mapping
const TOKEN_NAMES: Record<string, string> = {
  "0x9401fce40cb84b051215d96e85becd733043a33d": "USDC",
  "0x0a22b6e2f0ac6cda83c04b1ba33aac8e9df6aed7": "WFLR",
  "0x2859b97217cf2599d5f1e1c56735d283ec2144e3": "FXRP",
  "0x2e124deaed3ba3b063356f9b45617d862e4b9db5": "FBTC",
  "0xead29cbfab93ed51808d65954dd1b3cddada1348": "FDOGE",
  "0x8c6057145c1c523e08d3d1dcbac77925ee25f46d": "SFLR/Sceptre",
};

const ADAPTER_NAMES: Record<string, string> = {
  "0x5f2577675bed125794fdfc44940b62d60bf00f81": "MockSimpleDEX",
  "0x8c6057145c1c523e08d3d1dcbac77925ee25f46d": "MockSceptre",
  "0xf59c5d72caa0875788fd9461488b4dac7d5eda1f": "MockKinetic",
};

function getTokenName(address: string): string {
  return TOKEN_NAMES[address.toLowerCase()] || `${address.slice(0, 6)}...${address.slice(-4)}`;
}

function getAdapterName(address: string): string {
  return ADAPTER_NAMES[address.toLowerCase()] || `${address.slice(0, 6)}...${address.slice(-4)}`;
}

export default function ERTDetailPage() {
  const params = useParams();
  const router = useRouter();
  const ertId = BigInt(params.id as string);

  const [copiedAddress, setCopiedAddress] = useState<string | null>(null);

  const { data: rights, isLoading } = useExecutionRights(ertId);
  const { remainingFormatted, remainingSeconds, isExpired, percentRemaining } = useERTTimeRemaining(ertId);
  const { drawdownPercentage, maxDrawdownPercentage, currentDrawdownBps, headroom } = useERTDrawdownStatus(ertId);
  const { data: positions } = usePositions(ertId);
  const { deployed, limit, available, utilizationPercentage } = useERTCapitalUtilization(ertId);

  const copyToClipboard = (text: string, label: string) => {
    navigator.clipboard.writeText(text);
    setCopiedAddress(label);
    setTimeout(() => setCopiedAddress(null), 2000);
  };

  if (isLoading) {
    return (
      <div className="max-w-6xl mx-auto flex items-center justify-center h-96">
        <Loader2 className="w-8 h-8 animate-spin text-accent" />
      </div>
    );
  }

  if (!rights) {
    return (
      <div className="max-w-6xl mx-auto">
        <div className="glass-panel rounded-2xl p-12 text-center">
          <AlertTriangle className="w-12 h-12 text-yellow-500 mx-auto mb-4" />
          <h2 className="text-xl font-bold text-white mb-2">ERT Not Found</h2>
          <p className="text-text-muted mb-6">This Execution Rights Token doesn't exist or you don't have access.</p>
          <Link href="/dashboard/erts" className="text-accent hover:underline">
            Back to My ERTs
          </Link>
        </div>
      </div>
    );
  }

  const capital = formatUnits(rights.capitalLimit, 6);
  const pnl = rights.status.realizedPnl + rights.status.unrealizedPnl;
  const isPositive = pnl >= 0n;
  const pnlFormatted = formatUnits(pnl < 0n ? -pnl : pnl, 6);

  const statusColors = {
    ACTIVE: "bg-accent/20 text-accent",
    PENDING: "bg-yellow-500/20 text-yellow-500",
    SETTLED: "bg-blue-500/20 text-blue-500",
    EXPIRED: "bg-red-500/20 text-red-500",
    LIQUIDATED: "bg-red-500/20 text-red-500",
  };

  const statusLabel = isExpired && rights.ertStatusName === 'ACTIVE' ? "EXPIRED" : rights.ertStatusName;
  const statusStyle = statusColors[statusLabel as keyof typeof statusColors] || "bg-white/10 text-white";

  return (
    <div className="max-w-6xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <button
          onClick={() => router.back()}
          className="p-2 hover:bg-white/5 rounded-lg transition-colors"
        >
          <ArrowLeft className="w-5 h-5 text-text-muted" />
        </button>
        <div className="flex-1">
          <div className="flex items-center gap-3">
            <h1 className="text-2xl font-bold text-white">ERT #{ertId.toString()}</h1>
            <span className={cn("px-3 py-1 rounded-full text-sm font-medium", statusStyle)}>
              {statusLabel}
            </span>
          </div>
          <p className="text-text-muted text-sm mt-1">
            Detailed view of your Execution Rights Token
          </p>
        </div>
        <Link
          href="/dashboard/private-execution"
          className="bg-accent hover:bg-accent-hover text-black font-bold py-2 px-4 rounded-xl transition-all flex items-center gap-2"
        >
          <Shield className="w-4 h-4" />
          Private Execute
        </Link>
      </div>

      {/* Main Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="glass-panel p-5 rounded-xl">
          <div className="flex items-center gap-2 text-text-muted text-xs mb-2">
            <Wallet className="w-3.5 h-3.5" />
            Capital Limit
          </div>
          <p className="text-2xl font-bold text-white">${Number(capital).toLocaleString()}</p>
        </div>
        <div className="glass-panel p-5 rounded-xl">
          <div className="flex items-center gap-2 text-text-muted text-xs mb-2">
            {isPositive ? <TrendingUp className="w-3.5 h-3.5" /> : <TrendingDown className="w-3.5 h-3.5" />}
            Total PnL
          </div>
          <p className={cn("text-2xl font-bold", isPositive ? "text-accent" : "text-red-400")}>
            {isPositive ? "+" : "-"}${Number(pnlFormatted).toLocaleString()}
          </p>
        </div>
        <div className="glass-panel p-5 rounded-xl">
          <div className="flex items-center gap-2 text-text-muted text-xs mb-2">
            <Clock className="w-3.5 h-3.5" />
            Time Remaining
          </div>
          <p className={cn("text-2xl font-bold", isExpired ? "text-red-400" : "text-white")}>
            {remainingFormatted}
          </p>
        </div>
        <div className="glass-panel p-5 rounded-xl">
          <div className="flex items-center gap-2 text-text-muted text-xs mb-2">
            <Activity className="w-3.5 h-3.5" />
            Utilization
          </div>
          <p className="text-2xl font-bold text-white">{utilizationPercentage?.toFixed(1)}%</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Whitelisted Assets */}
        <div className="glass-panel rounded-2xl p-6">
          <h3 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
            <CheckCircle2 className="w-5 h-5 text-accent" />
            Whitelisted Assets ({rights.constraints.allowedAssets.length})
          </h3>
          {rights.constraints.allowedAssets.length === 0 ? (
            <div className="text-center py-8 text-text-muted">
              <XCircle className="w-8 h-8 mx-auto mb-2 opacity-50" />
              <p>No assets whitelisted</p>
              <p className="text-xs mt-1">This ERT cannot trade any tokens</p>
            </div>
          ) : (
            <div className="space-y-2">
              {rights.constraints.allowedAssets.map((asset, i) => (
                <div key={i} className="flex items-center justify-between bg-black/20 rounded-lg p-3">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-full bg-accent/20 flex items-center justify-center">
                      <span className="text-accent text-xs font-bold">
                        {getTokenName(asset).slice(0, 2)}
                      </span>
                    </div>
                    <div>
                      <p className="text-white font-medium">{getTokenName(asset)}</p>
                      <p className="text-text-muted text-xs font-mono">
                        {asset.slice(0, 10)}...{asset.slice(-6)}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => copyToClipboard(asset, `asset-${i}`)}
                      className="p-1.5 hover:bg-white/10 rounded transition-colors"
                    >
                      {copiedAddress === `asset-${i}` ? (
                        <CheckCircle2 className="w-4 h-4 text-accent" />
                      ) : (
                        <Copy className="w-4 h-4 text-text-muted" />
                      )}
                    </button>
                    <a
                      href={`https://coston2-explorer.flare.network/address/${asset}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="p-1.5 hover:bg-white/10 rounded transition-colors"
                    >
                      <ExternalLink className="w-4 h-4 text-text-muted" />
                    </a>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Whitelisted Adapters */}
        <div className="glass-panel rounded-2xl p-6">
          <h3 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
            <Settings className="w-5 h-5 text-accent" />
            Whitelisted Adapters ({rights.constraints.allowedAdapters.length})
          </h3>
          {rights.constraints.allowedAdapters.length === 0 ? (
            <div className="text-center py-8 text-text-muted">
              <XCircle className="w-8 h-8 mx-auto mb-2 opacity-50" />
              <p>No adapters whitelisted</p>
              <p className="text-xs mt-1">This ERT cannot interact with any protocols</p>
            </div>
          ) : (
            <div className="space-y-2">
              {rights.constraints.allowedAdapters.map((adapter, i) => (
                <div key={i} className="flex items-center justify-between bg-black/20 rounded-lg p-3">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-full bg-blue-500/20 flex items-center justify-center">
                      <Activity className="w-4 h-4 text-blue-400" />
                    </div>
                    <div>
                      <p className="text-white font-medium">{getAdapterName(adapter)}</p>
                      <p className="text-text-muted text-xs font-mono">
                        {adapter.slice(0, 10)}...{adapter.slice(-6)}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => copyToClipboard(adapter, `adapter-${i}`)}
                      className="p-1.5 hover:bg-white/10 rounded transition-colors"
                    >
                      {copiedAddress === `adapter-${i}` ? (
                        <CheckCircle2 className="w-4 h-4 text-accent" />
                      ) : (
                        <Copy className="w-4 h-4 text-text-muted" />
                      )}
                    </button>
                    <a
                      href={`https://coston2-explorer.flare.network/address/${adapter}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="p-1.5 hover:bg-white/10 rounded transition-colors"
                    >
                      <ExternalLink className="w-4 h-4 text-text-muted" />
                    </a>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Constraints */}
        <div className="glass-panel rounded-2xl p-6">
          <h3 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
            <Lock className="w-5 h-5 text-yellow-500" />
            Risk Constraints
          </h3>
          <div className="space-y-4">
            <div className="flex justify-between items-center">
              <span className="text-text-muted">Max Leverage</span>
              <span className="text-white font-mono">{rights.constraints.maxLeverage}x</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-text-muted">Max Drawdown</span>
              <span className="text-white font-mono">{(rights.constraints.maxDrawdownBps / 100).toFixed(1)}%</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-text-muted">Max Position Size</span>
              <span className="text-white font-mono">{(rights.constraints.maxPositionSizeBps / 100).toFixed(0)}%</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-text-muted">Current Drawdown</span>
              <span className={cn("font-mono", (drawdownPercentage || 0) > 5 ? "text-red-400" : "text-accent")}>
                {(drawdownPercentage || 0).toFixed(2)}%
              </span>
            </div>

            {/* Drawdown Progress Bar */}
            <div className="mt-2">
              <div className="h-2 bg-black/40 rounded-full overflow-hidden">
                <div
                  className={cn(
                    "h-full rounded-full transition-all",
                    (drawdownPercentage || 0) > (maxDrawdownPercentage || 10) * 0.8 ? "bg-red-500" : "bg-accent"
                  )}
                  style={{ width: `${Math.min(((drawdownPercentage || 0) / (maxDrawdownPercentage || 10)) * 100, 100)}%` }}
                />
              </div>
            </div>
          </div>
        </div>

        {/* Capital Status */}
        <div className="glass-panel rounded-2xl p-6">
          <h3 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
            <Wallet className="w-5 h-5 text-accent" />
            Capital Breakdown
          </h3>
          <div className="space-y-4">
            <div className="flex justify-between items-center">
              <span className="text-text-muted">Total Limit</span>
              <span className="text-white font-mono">${limit ? Number(formatUnits(limit, 6)).toLocaleString() : '0'}</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-text-muted">Deployed</span>
              <span className="text-yellow-500 font-mono">${deployed ? Number(formatUnits(deployed, 6)).toLocaleString() : '0'}</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-text-muted">Available</span>
              <span className="text-accent font-mono">${available ? Number(formatUnits(available, 6)).toLocaleString() : '0'}</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-text-muted">Staked (FLR)</span>
              <span className="text-white font-mono">{Number(formatUnits(rights.fees.stakedAmount, 18)).toFixed(2)}</span>
            </div>

            {/* Utilization Bar */}
            <div className="mt-2">
              <div className="h-2 bg-black/40 rounded-full overflow-hidden">
                <div
                  className="h-full bg-accent rounded-full transition-all"
                  style={{ width: `${utilizationPercentage || 0}%` }}
                />
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Positions */}
      <div className="glass-panel rounded-2xl p-6">
        <h3 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
          <History className="w-5 h-5 text-accent" />
          Active Positions
        </h3>
        {!positions || positions.length === 0 ? (
          <div className="text-center py-12 text-text-muted">
            <Activity className="w-10 h-10 mx-auto mb-3 opacity-50" />
            <p>No active positions</p>
            <p className="text-xs mt-1">Use Private Execution to open positions</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-white/10">
                  <th className="text-left text-xs text-text-muted font-medium py-3 px-4">Adapter</th>
                  <th className="text-left text-xs text-text-muted font-medium py-3 px-4">Asset</th>
                  <th className="text-right text-xs text-text-muted font-medium py-3 px-4">Size</th>
                  <th className="text-right text-xs text-text-muted font-medium py-3 px-4">Entry Value</th>
                  <th className="text-right text-xs text-text-muted font-medium py-3 px-4">Timestamp</th>
                </tr>
              </thead>
              <tbody>
                {positions.map((pos, i) => (
                  <tr key={i} className="border-b border-white/5 hover:bg-white/5">
                    <td className="py-3 px-4 text-white">{getAdapterName(pos.adapter)}</td>
                    <td className="py-3 px-4 text-white">{getTokenName(pos.asset)}</td>
                    <td className="py-3 px-4 text-right font-mono text-white">
                      {Number(formatUnits(pos.size, 18)).toFixed(4)}
                    </td>
                    <td className="py-3 px-4 text-right font-mono text-white">
                      ${Number(formatUnits(pos.entryValueUsd, 6)).toLocaleString()}
                    </td>
                    <td className="py-3 px-4 text-right text-text-muted text-sm">
                      {new Date(Number(pos.timestamp) * 1000).toLocaleDateString()}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Contract Info */}
      <div className="glass-panel rounded-2xl p-6">
        <h3 className="text-lg font-semibold text-white mb-4">Contract Details</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
          <div className="flex justify-between items-center bg-black/20 rounded-lg p-3">
            <span className="text-text-muted">Executor</span>
            <div className="flex items-center gap-2">
              <span className="text-white font-mono">{rights.executor.slice(0, 10)}...{rights.executor.slice(-6)}</span>
              <a
                href={`https://coston2-explorer.flare.network/address/${rights.executor}`}
                target="_blank"
                rel="noopener noreferrer"
                className="text-text-muted hover:text-white"
              >
                <ExternalLink className="w-3.5 h-3.5" />
              </a>
            </div>
          </div>
          <div className="flex justify-between items-center bg-black/20 rounded-lg p-3">
            <span className="text-text-muted">Vault</span>
            <div className="flex items-center gap-2">
              <span className="text-white font-mono">{rights.vault.slice(0, 10)}...{rights.vault.slice(-6)}</span>
              <a
                href={`https://coston2-explorer.flare.network/address/${rights.vault}`}
                target="_blank"
                rel="noopener noreferrer"
                className="text-text-muted hover:text-white"
              >
                <ExternalLink className="w-3.5 h-3.5" />
              </a>
            </div>
          </div>
          <div className="flex justify-between items-center bg-black/20 rounded-lg p-3">
            <span className="text-text-muted">Start Time</span>
            <span className="text-white">{new Date(Number(rights.startTime) * 1000).toLocaleString()}</span>
          </div>
          <div className="flex justify-between items-center bg-black/20 rounded-lg p-3">
            <span className="text-text-muted">Expiry Time</span>
            <span className={cn("", isExpired ? "text-red-400" : "text-white")}>
              {new Date(Number(rights.expiryTime) * 1000).toLocaleString()}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}
