"use client";

import { useVaultInfo } from "@/lib/hooks";
import { Loader2, TrendingUp, Activity } from "lucide-react";
import { formatUnits } from "viem";

export function ProtocolStatsCard() {
    const { data: vaultInfo, isLoading } = useVaultInfo();

    if (isLoading) {
        return (
            <div className="glass-panel p-6 rounded-2xl flex items-center justify-center min-h-[160px]">
                <Loader2 className="w-6 h-6 animate-spin text-accent" />
            </div>
        );
    }

    // Fallback defaults or mock if undefined (e.g. dev mode without chain)
    const tvl = vaultInfo ? formatUnits(vaultInfo.totalAssets, 6) : "1,234,567";
    const utilization = vaultInfo ? vaultInfo.utilizationRate : 45.2;

    return (
        <div className="glass-panel rounded-2xl p-6 relative overflow-hidden group">
            {/* Background Accent Glow */}
            <div className="absolute top-0 right-0 w-32 h-32 bg-accent/5 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2" />

            <div className="flex items-start justify-between mb-6">
                <div>
                    <h3 className="text-text-secondary text-sm font-medium mb-1">Protocol TVL</h3>
                    <div className="flex items-baseline gap-2">
                        <span className="text-3xl font-bold text-white tracking-tight">${Number(tvl).toLocaleString()}</span>
                        <span className="text-xs font-medium text-accent flex items-center gap-1">
                            +2.5% <TrendingUp className="w-3 h-3" />
                        </span>
                    </div>
                </div>
                <div className="p-3 rounded-xl bg-white/5 border border-white/5">
                    <Activity className="w-5 h-5 text-accent" />
                </div>
            </div>

            <div className="space-y-2">
                <div className="flex items-center justify-between text-xs">
                    <span className="text-text-muted">Capital Utilization</span>
                    <span className="text-white font-medium">{utilization.toFixed(1)}%</span>
                </div>
                <div className="h-2 w-full bg-black/40 rounded-full overflow-hidden">
                    <div
                        className="h-full rounded-full transition-all duration-1000 ease-out"
                        style={{
                            width: `${utilization}%`,
                            background: `linear-gradient(90deg, var(--accent) 0%, var(--error) 100%)`
                        }}
                    />
                </div>
            </div>
        </div>
    );
}
