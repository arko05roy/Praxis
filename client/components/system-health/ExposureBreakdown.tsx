"use client";

import { useAllExposures, useExposureSummary, useDiversificationScore } from "@/lib/hooks";
import { PieChart, AlertTriangle, Loader2, Shield, TrendingUp } from "lucide-react";
import { formatUnits } from "viem";
import { cn } from "@/lib/utils";

// Token symbol mapping (addresses to readable names)
const TOKEN_SYMBOLS: Record<string, string> = {
    '0x1D80c49BbBCd1C0911346656B529DF9E5c2F783d': 'WFLR',
    '0xFbDa5F676cB37624f28265A144A48B0d6e87d3b6': 'USDC',
    '0x1502FA4be69d526124D453619276FacCab275d55': 'WETH',
    '0x12e605bc104e93B45e1aD99F9e555f659051c2BB': 'sFLR',
    '0xad552a648c74d49e10027ab8a618a3ad4901c5be': 'FXRP',
};

export function ExposureBreakdown() {
    const { data: exposures, assetsAtLimit, assetsNearLimit, isLoading: exposuresLoading } = useAllExposures();
    const { data: summary, isLoading: summaryLoading } = useExposureSummary();
    const { score, rating, recommendation, hhi, assetCount } = useDiversificationScore();

    const isLoading = exposuresLoading || summaryLoading;

    const formatUSD = (value: bigint) => {
        const num = Number(formatUnits(value, 6));
        if (num >= 1000000) return `$${(num / 1000000).toFixed(2)}M`;
        if (num >= 1000) return `$${(num / 1000).toFixed(1)}k`;
        return `$${num.toFixed(2)}`;
    };

    const getTokenSymbol = (address: string) => {
        return TOKEN_SYMBOLS[address] || `${address.slice(0, 6)}...${address.slice(-4)}`;
    };

    const getStatusInfo = (utilizationBps: bigint) => {
        const util = Number(utilizationBps);
        if (util >= 10000) return { label: 'AT LIMIT', style: 'bg-red-500/10 text-red-500 border-red-500/20' };
        if (util >= 8000) return { label: 'NEAR LIMIT', style: 'bg-yellow-500/10 text-yellow-500 border-yellow-500/20' };
        if (util >= 5000) return { label: 'MODERATE', style: 'bg-blue-500/10 text-blue-500 border-blue-500/20' };
        return { label: 'OK', style: 'bg-green-500/10 text-green-500 border-green-500/20' };
    };

    const getDiversificationColor = () => {
        if (!score) return 'text-text-muted';
        if (score >= 80) return 'text-green-500';
        if (score >= 60) return 'text-blue-500';
        if (score >= 40) return 'text-yellow-500';
        return 'text-red-500';
    };

    if (isLoading) {
        return (
            <div className="glass-panel p-6 rounded-2xl col-span-1 lg:col-span-2 flex items-center justify-center h-64">
                <Loader2 className="w-8 h-8 animate-spin text-accent" />
            </div>
        );
    }

    return (
        <div className="glass-panel p-6 rounded-2xl col-span-1 lg:col-span-2">
            <div className="flex items-center justify-between mb-6">
                <h3 className="font-semibold text-white flex items-center gap-2">
                    <PieChart className="w-4 h-4 text-accent" /> Asset Exposure
                </h3>
                <div className="flex items-center gap-3">
                    {(assetsAtLimit?.length || 0) > 0 && (
                        <span className="text-xs bg-red-500/10 text-red-400 px-2 py-1 rounded border border-red-500/20 flex items-center gap-1">
                            <AlertTriangle className="w-3 h-3" />
                            {assetsAtLimit?.length} at limit
                        </span>
                    )}
                    {(assetsNearLimit?.length || 0) > 0 && (
                        <span className="text-xs bg-yellow-500/10 text-yellow-400 px-2 py-1 rounded border border-yellow-500/20 flex items-center gap-1">
                            <AlertTriangle className="w-3 h-3" />
                            {assetsNearLimit?.length} near limit
                        </span>
                    )}
                    <span className={cn(
                        "text-xs px-2 py-1 rounded border border-white/10 flex items-center gap-1",
                        getDiversificationColor()
                    )}>
                        <Shield className="w-3 h-3" />
                        Diversification: {score ?? '-'}/100 ({rating || 'N/A'})
                    </span>
                </div>
            </div>

            {/* Summary Stats */}
            <div className="grid grid-cols-3 gap-4 mb-6">
                <div className="bg-white/5 rounded-lg p-3">
                    <p className="text-[10px] text-text-muted mb-1">Total Exposure</p>
                    <p className="text-lg font-bold text-white">
                        {summary?.totalExposure ? formatUSD(summary.totalExposure) : '-'}
                    </p>
                </div>
                <div className="bg-white/5 rounded-lg p-3">
                    <p className="text-[10px] text-text-muted mb-1">Max Per Asset</p>
                    <p className="text-lg font-bold text-white">
                        {summary?.maxSingleAssetPercentage ?? 30}%
                    </p>
                </div>
                <div className="bg-white/5 rounded-lg p-3">
                    <p className="text-[10px] text-text-muted mb-1">Active Assets</p>
                    <p className="text-lg font-bold text-white">
                        {assetCount ?? exposures?.length ?? 0}
                    </p>
                </div>
            </div>

            {/* Recommendation Banner */}
            {recommendation && (
                <div className="bg-accent/5 border border-accent/10 rounded-lg p-3 mb-4 flex items-center gap-3">
                    <TrendingUp className="w-5 h-5 text-accent flex-shrink-0" />
                    <p className="text-sm text-accent">{recommendation}</p>
                </div>
            )}

            {exposures && exposures.length > 0 ? (
                <div className="overflow-x-auto">
                    <table className="w-full text-left">
                        <thead className="text-[10px] text-text-muted uppercase tracking-wider border-b border-white/5">
                            <tr>
                                <th className="pb-3 pl-2">Asset</th>
                                <th className="pb-3">Exposure Value</th>
                                <th className="pb-3">Utilization</th>
                                <th className="pb-3">Remaining Capacity</th>
                                <th className="pb-3 text-right pr-2">Status</th>
                            </tr>
                        </thead>
                        <tbody className="text-sm">
                            {exposures.map((exp) => {
                                const status = getStatusInfo(exp.utilizationBps);
                                return (
                                    <tr key={exp.asset} className="hover:bg-white/5 transition-colors border-b border-white/5 last:border-0">
                                        <td className="py-4 pl-2">
                                            <div className="flex items-center gap-2">
                                                <div className="w-8 h-8 rounded-full bg-accent/10 flex items-center justify-center text-xs font-bold text-accent">
                                                    {getTokenSymbol(exp.asset).slice(0, 2)}
                                                </div>
                                                <span className="font-bold text-white">{getTokenSymbol(exp.asset)}</span>
                                            </div>
                                        </td>
                                        <td className="py-4 font-mono text-text-secondary">
                                            {formatUSD(exp.exposure)}
                                        </td>
                                        <td className="py-4">
                                            <div className="flex items-center gap-2">
                                                <div className="w-24 h-2 bg-black/40 rounded-full overflow-hidden">
                                                    <div
                                                        className={cn(
                                                            "h-full rounded-full transition-all",
                                                            exp.isAtLimit ? "bg-red-500" :
                                                            exp.isNearLimit ? "bg-yellow-500" : "bg-green-500"
                                                        )}
                                                        style={{ width: `${Math.min(exp.utilizationPercentage, 100)}%` }}
                                                    />
                                                </div>
                                                <span className="text-white font-mono text-xs">
                                                    {exp.utilizationPercentage.toFixed(1)}%
                                                </span>
                                            </div>
                                        </td>
                                        <td className="py-4 font-mono text-text-muted">
                                            {formatUSD(exp.remainingCapacity)}
                                        </td>
                                        <td className="py-4 text-right pr-2">
                                            <span className={cn("text-[10px] px-2 py-0.5 rounded border", status.style)}>
                                                {status.label}
                                            </span>
                                        </td>
                                    </tr>
                                );
                            })}
                        </tbody>
                    </table>
                </div>
            ) : (
                <div className="text-center py-8">
                    <PieChart className="w-12 h-12 text-white/10 mx-auto mb-3" />
                    <p className="text-text-muted">No asset exposures recorded yet</p>
                    <p className="text-xs text-text-muted mt-1">Exposures will appear here once ERTs deploy capital</p>
                </div>
            )}
        </div>
    );
}
