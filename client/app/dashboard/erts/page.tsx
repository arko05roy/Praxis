"use client";

import { ERTListView } from "@/components/ert-management/ERTListView";
import { useMyERTs, useERTByIndex, useExecutionRights, useERTTimeRemaining } from "@/lib/hooks";
import { useAccount } from "wagmi";
import { formatUnits } from "viem";
import { useMemo } from "react";
import { Loader2 } from "lucide-react";

// Hook to get stats for a single ERT by index
function useERTStatsByIndex(index: number | undefined) {
    const { address } = useAccount();
    const { data: tokenId } = useERTByIndex(address, index !== undefined ? BigInt(index) : undefined);
    const { data: rights } = useExecutionRights(tokenId);
    const { remainingSeconds, isExpired } = useERTTimeRemaining(tokenId);

    return useMemo(() => {
        if (!rights) return null;

        const capitalLimit = rights.capitalLimit;
        const totalPnl = rights.status.realizedPnl + rights.status.unrealizedPnl;
        const isActive = rights.ertStatusName === 'ACTIVE' && !isExpired;

        return {
            capitalLimit,
            totalPnl,
            isActive,
            remainingSeconds: remainingSeconds ?? Infinity,
        };
    }, [rights, remainingSeconds, isExpired]);
}

// Hook to aggregate stats from multiple ERTs
function useAggregatedStats(ertCount: bigint) {
    const count = Number(ertCount);

    // Get stats for up to 10 ERTs
    const stats0 = useERTStatsByIndex(count > 0 ? 0 : undefined);
    const stats1 = useERTStatsByIndex(count > 1 ? 1 : undefined);
    const stats2 = useERTStatsByIndex(count > 2 ? 2 : undefined);
    const stats3 = useERTStatsByIndex(count > 3 ? 3 : undefined);
    const stats4 = useERTStatsByIndex(count > 4 ? 4 : undefined);
    const stats5 = useERTStatsByIndex(count > 5 ? 5 : undefined);
    const stats6 = useERTStatsByIndex(count > 6 ? 6 : undefined);
    const stats7 = useERTStatsByIndex(count > 7 ? 7 : undefined);
    const stats8 = useERTStatsByIndex(count > 8 ? 8 : undefined);
    const stats9 = useERTStatsByIndex(count > 9 ? 9 : undefined);

    return useMemo(() => {
        const allStats = [stats0, stats1, stats2, stats3, stats4, stats5, stats6, stats7, stats8, stats9]
            .slice(0, count)
            .filter((s): s is NonNullable<typeof s> => s !== null);

        let totalCapital = 0n;
        let totalPnl = 0n;
        let activeCount = 0;
        let nextExpirySeconds = Infinity;

        for (const stat of allStats) {
            totalCapital += stat.capitalLimit;
            totalPnl += stat.totalPnl;
            if (stat.isActive) {
                activeCount++;
                if (stat.remainingSeconds < nextExpirySeconds) {
                    nextExpirySeconds = stat.remainingSeconds;
                }
            }
        }

        const expectedCount = Math.min(count, 10);
        const isLoading = count > 0 && allStats.length < expectedCount;

        return {
            totalCapital,
            totalPnl,
            activeCount,
            nextExpirySeconds: nextExpirySeconds === Infinity ? null : nextExpirySeconds,
            isLoading,
        };
    }, [stats0, stats1, stats2, stats3, stats4, stats5, stats6, stats7, stats8, stats9, count]);
}

function formatTimeRemaining(seconds: number | null): string {
    if (seconds === null) return "-";
    if (seconds <= 0) return "Expired";

    const days = Math.floor(seconds / 86400);
    const hours = Math.floor((seconds % 86400) / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);

    if (days > 0) return `${days}d ${hours}h`;
    if (hours > 0) return `${hours}h ${minutes}m`;
    return `${minutes}m`;
}

export default function ERTManagementPage() {
    const { count, isLoading: countLoading } = useMyERTs();
    const ertCount = count || 0n;
    const { totalCapital, totalPnl, activeCount, nextExpirySeconds, isLoading: statsLoading } = useAggregatedStats(ertCount);

    const isLoading = countLoading || statsLoading;
    const isPnlPositive = totalPnl >= 0n;

    const formattedCapital = Number(formatUnits(totalCapital, 6)).toLocaleString(undefined, {
        minimumFractionDigits: 0,
        maximumFractionDigits: 0,
    });

    const formattedPnl = Number(formatUnits(totalPnl < 0n ? -totalPnl : totalPnl, 6)).toLocaleString(undefined, {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
    });

    return (
        <div className="max-w-7xl mx-auto space-y-8">
            <div className="flex items-end justify-between">
                <div>
                    <h1 className="text-3xl font-bold text-white mb-2">My Execution Rights</h1>
                    <p className="text-text-secondary">Monitor your active positions, manage risk, and settle expired contracts.</p>
                </div>
            </div>

            {/* Stats Strip */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div className="glass-panel p-4 rounded-xl flex flex-col">
                    <span className="text-xs text-text-muted mb-1">Total Allocated Capital</span>
                    {isLoading ? (
                        <Loader2 className="w-5 h-5 animate-spin text-text-muted" />
                    ) : (
                        <span className="text-xl font-bold text-white">${formattedCapital}</span>
                    )}
                </div>
                <div className="glass-panel p-4 rounded-xl flex flex-col">
                    <span className="text-xs text-text-muted mb-1">Active Contracts</span>
                    {isLoading ? (
                        <Loader2 className="w-5 h-5 animate-spin text-text-muted" />
                    ) : (
                        <span className="text-xl font-bold text-white">{activeCount}</span>
                    )}
                </div>
                <div className="glass-panel p-4 rounded-xl flex flex-col">
                    <span className="text-xs text-text-muted mb-1">Total PnL (Open)</span>
                    {isLoading ? (
                        <Loader2 className="w-5 h-5 animate-spin text-text-muted" />
                    ) : (
                        <span className={`text-xl font-bold ${isPnlPositive ? "text-accent" : "text-red-400"}`}>
                            {isPnlPositive ? "+" : "-"}${formattedPnl}
                        </span>
                    )}
                </div>
                <div className="glass-panel p-4 rounded-xl flex flex-col">
                    <span className="text-xs text-text-muted mb-1">Next Expiry</span>
                    {isLoading ? (
                        <Loader2 className="w-5 h-5 animate-spin text-text-muted" />
                    ) : (
                        <span className="text-xl font-bold text-white">{formatTimeRemaining(nextExpirySeconds)}</span>
                    )}
                </div>
            </div>

            <ERTListView />
        </div>
    );
}
