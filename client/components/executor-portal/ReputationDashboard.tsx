"use client";

import { useExecutorReputation } from "@/lib/hooks";
import { formatUnits } from "viem";
import { Scroll, Trophy, TrendingUp, AlertTriangle } from "lucide-react";

export function ReputationDashboard() {
    const { data: reputation, isLoading } = useExecutorReputation();

    if (isLoading) {
        return <div className="animate-pulse h-48 bg-white/5 rounded-2xl"></div>;
    }

    const volume = reputation ? formatUnits(reputation.totalVolumeUsd, 6) : "0";
    const profitRate = reputation ? reputation.profitRate : 0;
    const settlements = reputation ? reputation.totalSettlements.toString() : "0";
    const wins = reputation ? reputation.profitableSettlements.toString() : "0";

    return (
        <div className="glass-panel rounded-2xl p-6">
            <h3 className="text-lg font-semibold text-white mb-6">Reputation Metrics</h3>

            <div className="grid grid-cols-2 lg:grid-cols-4 gap-6">
                <div className="space-y-1">
                    <div className="text-xs text-text-muted flex items-center gap-1">
                        <Scroll className="w-3 h-3" /> Total Settlements
                    </div>
                    <div className="text-2xl font-bold text-white">{settlements}</div>
                </div>

                <div className="space-y-1">
                    <div className="text-xs text-text-muted flex items-center gap-1">
                        <Trophy className="w-3 h-3 text-yellow-500" /> Profitable
                    </div>
                    <div className="text-2xl font-bold text-white">{wins}</div>
                </div>

                <div className="space-y-1">
                    <div className="text-xs text-text-muted flex items-center gap-1">
                        <TrendingUp className="w-3 h-3 text-accent" /> Profit Rate
                    </div>
                    <div className={`text-2xl font-bold ${profitRate >= 50 ? 'text-accent' : 'text-text-muted'}`}>
                        {profitRate.toFixed(1)}%
                    </div>
                </div>

                <div className="space-y-1">
                    <div className="text-xs text-text-muted flex items-center gap-1">
                        Volume (USD)
                    </div>
                    <div className="text-2xl font-bold text-white">${Number(volume).toLocaleString()}</div>
                </div>
            </div>

            {reputation && reputation.largestLossBps > 500n && (
                <div className="mt-6 p-3 bg-red-500/10 border border-red-500/20 rounded-xl flex items-center gap-3">
                    <AlertTriangle className="w-5 h-5 text-red-500" />
                    <p className="text-xs text-red-400">
                        Warning: A significant loss event has impacted your risk score. Maintain consistent profits to recover your tier eligibility.
                    </p>
                </div>
            )}
        </div>
    );
}
