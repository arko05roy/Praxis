"use client";

import { useVaultInfo } from "@/lib/hooks";
import { formatUnits } from "viem";
import { Loader2, Info } from "lucide-react";

export function VaultInfoPanel() {
    const { data: vaultInfo, isLoading } = useVaultInfo();

    if (isLoading) {
        return (
            <div className="glass-panel p-6 rounded-2xl flex items-center justify-center min-h-[160px]">
                <Loader2 className="w-6 h-6 animate-spin text-accent" />
            </div>
        );
    }

    const totalAssets = vaultInfo ? formatUnits(vaultInfo.totalAssets, 6) : "0";
    const utilization = vaultInfo ? vaultInfo.utilizationRate : 0;
    const availableCapital = vaultInfo ? formatUnits(vaultInfo.availableCapital, 6) : "0";

    return (
        <div className="glass-panel rounded-2xl p-6 relative overflow-hidden">
            <div className="flex items-center justify-between mb-6">
                <h3 className="text-lg font-semibold text-white">Execution Vault Status</h3>
                <Info className="w-4 h-4 text-text-muted cursor-help" />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                {/* Total Assets */}
                <div className="bg-white/5 rounded-xl p-4 border border-white/5">
                    <p className="text-xs text-text-muted mb-1">Total Assets (TVL)</p>
                    <p className="text-2xl font-bold text-white tracking-tight">${Number(totalAssets).toLocaleString()}</p>
                </div>

                {/* Utilization */}
                <div className="bg-white/5 rounded-xl p-4 border border-white/5">
                    <div className="flex justify-between items-center mb-1">
                        <p className="text-xs text-text-muted">Utilization</p>
                        <span className="text-xs font-bold text-accent">{utilization.toFixed(2)}%</span>
                    </div>
                    <div className="h-2 w-full bg-black/40 rounded-full overflow-hidden mt-2">
                        <div
                            className="h-full rounded-full transition-all duration-500"
                            style={{
                                width: `${utilization}%`,
                                background: `linear-gradient(90deg, var(--accent) 0%, var(--error) 100%)`
                            }}
                        />
                    </div>
                </div>

                {/* Available Capital */}
                <div className="bg-white/5 rounded-xl p-4 border border-white/5">
                    <p className="text-xs text-text-muted mb-1">Available to Deploy</p>
                    <p className="text-2xl font-bold text-white tracking-tight">${Number(availableCapital).toLocaleString()}</p>
                </div>
            </div>
        </div>
    );
}
