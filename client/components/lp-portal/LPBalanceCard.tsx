"use client";

import { useLPBalance, useVaultInfo } from "@/lib/hooks";
import { formatUnits } from "viem";
import { PieChart, TrendingUp, Activity, DollarSign } from "lucide-react";

// ERC-4626 vault shares typically have same decimals as underlying asset (USDC = 6)
const SHARE_DECIMALS = 6;

export function LPBalanceCard() {
    const { data: balance, isLoading } = useLPBalance();
    const { data: vaultInfo } = useVaultInfo();

    const shares = balance ? formatUnits(balance.shares, SHARE_DECIMALS) : "0";
    const assetsValue = balance ? formatUnits(balance.assetsValue, SHARE_DECIMALS) : "0";

    // Calculate pool share percentage
    const poolSharePercent = vaultInfo && balance?.shares && vaultInfo.totalShares > 0n
        ? Number(balance.shares * 10000n / vaultInfo.totalShares) / 100
        : 0;

    // Calculate share price (assets per share)
    const sharePrice = vaultInfo && vaultInfo.totalShares > 0n
        ? Number(vaultInfo.totalAssets) / Number(vaultInfo.totalShares)
        : 1;

    // Calculate capital at work based on utilization rate
    const capitalAtWork = balance?.assetsValue && vaultInfo
        ? Number(formatUnits(balance.assetsValue, SHARE_DECIMALS)) * (vaultInfo.utilizationRate / 100)
        : 0;

    // Calculate projected APY and estimated earnings
    const projectedAPY = vaultInfo ? 2.0 + (vaultInfo.utilizationRate / 100 * 15.0) : 2.0;
    const estimatedEarnings = balance?.assetsValue
        ? Number(formatUnits(balance.assetsValue, SHARE_DECIMALS)) * (projectedAPY / 100)
        : 0;

    return (
        <div className="glass-panel rounded-2xl p-6 relative overflow-hidden group">
            <div className="absolute top-0 right-0 w-32 h-32 bg-accent/5 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2" />

            {/* Header */}
            <div className="flex items-start justify-between mb-4 relative z-10">
                <div>
                    <h3 className="text-text-secondary text-sm font-medium mb-1">Your LP Position</h3>
                    <div className="flex items-baseline gap-2">
                        <span className="text-3xl font-bold text-white tracking-tight">${Number(assetsValue).toLocaleString()}</span>
                    </div>
                </div>
                <div className="p-3 rounded-xl bg-white/5 border border-white/5">
                    <PieChart className="w-5 h-5 text-accent" />
                </div>
            </div>

            {/* Vault Shares Row */}
            <div className="bg-black/20 rounded-xl p-3 border border-white/5 flex justify-between items-center relative z-10 mb-3">
                <div className="flex items-center gap-2">
                    <div className="w-8 h-8 rounded-full bg-accent/10 flex items-center justify-center text-accent">
                        <span className="text-xs font-bold">LP</span>
                    </div>
                    <div className="flex flex-col">
                        <span className="text-xs text-text-muted">Vault Shares</span>
                        <span className="text-sm font-medium text-white">{Number(shares).toFixed(4)}</span>
                    </div>
                </div>
                <div className="text-right">
                    <span className="text-xs text-text-muted">Pool Share</span>
                    <div className="text-sm font-medium text-accent">{poolSharePercent.toFixed(2)}%</div>
                </div>
            </div>

            {/* Metrics Grid */}
            <div className="grid grid-cols-2 gap-3 relative z-10">
                {/* Share Price */}
                <div className="bg-black/20 rounded-xl p-3 border border-white/5">
                    <div className="flex items-center gap-2 mb-1">
                        <DollarSign className="w-3.5 h-3.5 text-text-muted" />
                        <span className="text-xs text-text-muted">Share Price</span>
                    </div>
                    <span className="text-sm font-medium text-white">
                        ${sharePrice.toFixed(4)}
                    </span>
                </div>

                {/* Capital at Work */}
                <div className="bg-black/20 rounded-xl p-3 border border-white/5">
                    <div className="flex items-center gap-2 mb-1">
                        <Activity className="w-3.5 h-3.5 text-text-muted" />
                        <span className="text-xs text-text-muted">Capital at Work</span>
                    </div>
                    <div className="flex items-baseline gap-1">
                        <span className="text-sm font-medium text-white">
                            ${capitalAtWork.toLocaleString(undefined, { maximumFractionDigits: 2 })}
                        </span>
                        <span className="text-xs text-text-muted">
                            ({vaultInfo?.utilizationRate.toFixed(0) ?? 0}%)
                        </span>
                    </div>
                </div>

                {/* Estimated Earnings */}
                <div className="bg-black/20 rounded-xl p-3 border border-white/5 col-span-2">
                    <div className="flex items-center gap-2 mb-1">
                        <TrendingUp className="w-3.5 h-3.5 text-green-400" />
                        <span className="text-xs text-text-muted">Est. Annual Earnings</span>
                        <span className="text-xs text-green-400 ml-auto">{projectedAPY.toFixed(1)}% APY</span>
                    </div>
                    <span className="text-sm font-medium text-green-400">
                        ${estimatedEarnings.toLocaleString(undefined, { maximumFractionDigits: 2 })}/yr
                    </span>
                </div>
            </div>
        </div>
    );
}
