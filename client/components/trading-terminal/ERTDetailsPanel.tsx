"use client";

import { useExecutionRights, useERTDrawdownStatus, useERTCapitalUtilization, useERTTimeRemaining } from "@/lib/hooks";
import { formatUnits } from "viem";
import { Clock, DollarSign, TrendingDown, Activity, AlertTriangle } from "lucide-react";
import { cn } from "@/lib/utils";

interface ERTDetailsPanelProps {
    ertId: bigint | undefined;
}

export function ERTDetailsPanel({ ertId }: ERTDetailsPanelProps) {
    const { data: rights, isLoading } = useExecutionRights(ertId);
    const { currentDrawdownBps, maxDrawdownBps, isNearLimit } = useERTDrawdownStatus(ertId);
    const { deployed, limit, utilizationPercentage } = useERTCapitalUtilization(ertId);
    const { remainingSeconds, remainingFormatted, isExpired } = useERTTimeRemaining(ertId);

    if (!ertId) {
        return (
            <div className="glass-panel rounded-2xl p-5 h-full flex flex-col items-center justify-center text-center">
                <div className="w-12 h-12 rounded-full bg-white/5 flex items-center justify-center mb-3">
                    <DollarSign className="w-6 h-6 text-text-muted" />
                </div>
                <p className="text-sm text-text-muted">Select an ERT to view details</p>
            </div>
        );
    }

    if (isLoading) {
        return (
            <div className="glass-panel rounded-2xl p-5 h-full animate-pulse">
                <div className="h-4 bg-white/10 rounded w-1/3 mb-4"></div>
                <div className="space-y-3">
                    <div className="h-16 bg-white/5 rounded-xl"></div>
                    <div className="h-16 bg-white/5 rounded-xl"></div>
                </div>
            </div>
        );
    }

    const capitalLimit = rights ? Number(formatUnits(rights.capitalLimit, 6)) : 0;
    const deployedCapital = deployed ? Number(formatUnits(deployed, 6)) : 0;

    // Convert BPS to percentage for display (1000 bps = 10%)
    const maxDrawdownPercent = (maxDrawdownBps ?? 0) / 100;
    const currentDrawdownPercent = (currentDrawdownBps ?? 0) / 100;
    const utilization = utilizationPercentage ?? 0;

    // Check if expiring soon (less than 24 hours)
    const isExpiringSoon = remainingSeconds !== undefined && remainingSeconds > 0 && remainingSeconds < 86400;

    return (
        <div className="glass-panel rounded-2xl p-5 h-full">
            <div className="flex items-center justify-between mb-4">
                <h3 className="text-sm font-semibold text-white">ERT #{ertId.toString()}</h3>
                {isExpired ? (
                    <span className="text-xs px-2 py-0.5 rounded-full bg-error/20 text-error">Expired</span>
                ) : isExpiringSoon ? (
                    <span className="text-xs px-2 py-0.5 rounded-full bg-yellow-500/20 text-yellow-500">Expiring Soon</span>
                ) : (
                    <span className="text-xs px-2 py-0.5 rounded-full bg-green-500/20 text-green-500">Active</span>
                )}
            </div>

            <div className="space-y-3">
                {/* Capital Limit */}
                <div className="bg-black/20 rounded-xl p-3 border border-white/5">
                    <div className="flex items-center gap-2 mb-1">
                        <DollarSign className="w-3.5 h-3.5 text-text-muted" />
                        <span className="text-xs text-text-muted">Capital Limit</span>
                    </div>
                    <div className="flex items-baseline justify-between">
                        <span className="text-lg font-bold text-white">
                            ${capitalLimit.toLocaleString()}
                        </span>
                        <span className="text-xs text-text-muted">USDC</span>
                    </div>
                </div>

                {/* Time Remaining */}
                <div className="bg-black/20 rounded-xl p-3 border border-white/5">
                    <div className="flex items-center gap-2 mb-1">
                        <Clock className="w-3.5 h-3.5 text-text-muted" />
                        <span className="text-xs text-text-muted">Time Remaining</span>
                    </div>
                    <span className={cn(
                        "text-lg font-bold",
                        isExpired ? "text-error" : isExpiringSoon ? "text-yellow-500" : "text-white"
                    )}>
                        {remainingFormatted ?? "--"}
                    </span>
                </div>

                {/* Capital Utilization */}
                <div className="bg-black/20 rounded-xl p-3 border border-white/5">
                    <div className="flex items-center justify-between mb-2">
                        <div className="flex items-center gap-2">
                            <Activity className="w-3.5 h-3.5 text-text-muted" />
                            <span className="text-xs text-text-muted">Capital Used</span>
                        </div>
                        <span className="text-xs font-medium text-white">{utilization.toFixed(1)}%</span>
                    </div>
                    <div className="h-1.5 w-full bg-black/40 rounded-full overflow-hidden">
                        <div
                            className="h-full bg-accent rounded-full transition-all"
                            style={{ width: `${Math.min(utilization, 100)}%` }}
                        />
                    </div>
                    <div className="flex justify-between mt-1.5 text-[10px] text-text-muted">
                        <span>${deployedCapital.toLocaleString()}</span>
                        <span>${capitalLimit.toLocaleString()}</span>
                    </div>
                </div>

                {/* Drawdown Status */}
                <div className={cn(
                    "bg-black/20 rounded-xl p-3 border",
                    isNearLimit ? "border-error/50" : "border-white/5"
                )}>
                    <div className="flex items-center justify-between mb-2">
                        <div className="flex items-center gap-2">
                            <TrendingDown className={cn("w-3.5 h-3.5", isNearLimit ? "text-error" : "text-text-muted")} />
                            <span className="text-xs text-text-muted">Drawdown</span>
                        </div>
                        <span className={cn(
                            "text-xs font-medium",
                            isNearLimit ? "text-error" : "text-white"
                        )}>
                            {currentDrawdownPercent.toFixed(2)}% / {maxDrawdownPercent.toFixed(0)}%
                        </span>
                    </div>
                    <div className="h-1.5 w-full bg-black/40 rounded-full overflow-hidden">
                        <div
                            className={cn(
                                "h-full rounded-full transition-all",
                                isNearLimit ? "bg-error" : "bg-green-500"
                            )}
                            style={{ width: `${maxDrawdownPercent > 0 ? Math.min((currentDrawdownPercent / maxDrawdownPercent) * 100, 100) : 0}%` }}
                        />
                    </div>
                    {isNearLimit && (
                        <div className="flex items-center gap-1 mt-2 text-[10px] text-error">
                            <AlertTriangle className="w-3 h-3" />
                            <span>Approaching drawdown limit</span>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}
