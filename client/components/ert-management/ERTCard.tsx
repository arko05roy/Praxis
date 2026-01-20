"use client";

import { useExecutionRights, useERTTimeRemaining, useERTDrawdownStatus } from "@/lib/hooks";
import { formatUnits } from "viem";
import { Clock, TrendingDown, TrendingUp, AlertCircle, CheckCircle } from "lucide-react";
import { cn } from "@/lib/utils";

interface ERTCardProps {
    ertId: bigint;
    onClick?: () => void;
}

export function ERTCard({ ertId, onClick }: ERTCardProps) {
    const { data: rights, isLoading } = useExecutionRights(ertId);
    const { remainingFormatted, isExpired } = useERTTimeRemaining(ertId);
    const { drawdownPercentage, maxDrawdownPercentage } = useERTDrawdownStatus(ertId);

    if (isLoading || !rights) {
        return (
            <div className="glass-panel p-6 rounded-2xl h-[240px] animate-pulse flex items-center justify-center">
                <div className="w-8 h-8 bg-white/10 rounded-full" />
            </div>
        );
    }

    const capital = formatUnits(rights.capitalLimit, 6);
    const pnl = rights.status.realizedPnl + rights.status.unrealizedPnl;
    const isPositive = pnl >= 0n;
    const pnlFormatted = formatUnits(pnl < 0n ? -pnl : pnl, 6); // Absolute value for display

    const statusColors = {
        ACTIVE: "bg-accent/10 text-accent border-accent/20",
        PENDING: "bg-yellow-500/10 text-yellow-500 border-yellow-500/20",
        SETTLED: "bg-blue-500/10 text-blue-500 border-blue-500/20",
        expired: "bg-red-500/10 text-red-500 border-red-500/20", // Custom for isExpired
        LIQUIDATED: "bg-red-500/10 text-red-500 border-red-500/20",
    };

    const statusStyle = isExpired && rights.ertStatusName === 'ACTIVE'
        ? statusColors.expired
        : statusColors[rights.ertStatusName as keyof typeof statusColors] || "bg-white/5 text-text-muted";

    const statusLabel = isExpired && rights.ertStatusName === 'ACTIVE' ? "EXPIRED" : rights.ertStatusName;

    return (
        <div
            onClick={onClick}
            className="glass-panel rounded-2xl p-6 cursor-pointer hover:border-accent/30 transition-all hover:shadow-[0_0_20px_rgba(143,212,96,0.1)] group relative overflow-hidden"
        >
            <div className="flex justify-between items-start mb-6">
                <div>
                    <div className="flex items-center gap-2 mb-1">
                        <span className="text-text-muted text-xs">ERT ID</span>
                        <span className="text-white font-mono font-bold">#{rights.tokenId.toString()}</span>
                    </div>
                    <div className={cn("text-[10px] px-2 py-0.5 rounded border uppercase font-medium inline-block", statusStyle)}>
                        {statusLabel}
                    </div>
                </div>

                <div className="text-right">
                    <div className="text-xs text-text-muted mb-1 flex items-center justify-end gap-1">
                        <Clock className="w-3 h-3" /> Time Left
                    </div>
                    <div className={cn("font-mono font-medium", isExpired ? "text-red-400" : "text-white")}>
                        {remainingFormatted}
                    </div>
                </div>
            </div>

            <div className="space-y-4">
                <div>
                    <p className="text-xs text-text-muted mb-1">Capital Allocation</p>
                    <p className="text-2xl font-bold text-white tracking-tight">${Number(capital).toLocaleString()}</p>
                </div>

                <div className="grid grid-cols-2 gap-4">
                    <div className="bg-white/5 rounded-lg p-3">
                        <p className="text-[10px] text-text-muted mb-1">Net PnL</p>
                        <p className={cn("text-lg font-bold flex items-center gap-1", isPositive ? "text-accent" : "text-error")}>
                            {isPositive ? <TrendingUp className="w-4 h-4" /> : <TrendingDown className="w-4 h-4" />}
                            ${Number(pnlFormatted).toLocaleString()}
                        </p>
                    </div>
                    <div className="bg-white/5 rounded-lg p-3">
                        <p className="text-[10px] text-text-muted mb-1">Drawdown</p>
                        <div className="flex items-end justify-between">
                            <span className="text-sm font-medium text-white">{(drawdownPercentage! * 100).toFixed(2)}%</span>
                            <span className="text-[10px] text-text-muted">Max {(maxDrawdownPercentage! * 100).toFixed(0)}%</span>
                        </div>
                        <div className="h-1 w-full bg-black/40 rounded-full mt-1 overflow-hidden">
                            <div
                                className={cn("h-full rounded-full", drawdownPercentage! > maxDrawdownPercentage! * 0.8 ? "bg-red-500" : "bg-green-500")}
                                style={{ width: `${Math.min((drawdownPercentage! / maxDrawdownPercentage!) * 100, 100)}%` }}
                            />
                        </div>
                    </div>
                </div>
            </div>

            {/* Decorative */}
            <div className="absolute -bottom-10 -right-10 w-32 h-32 bg-white/5 rounded-full blur-2xl group-hover:bg-accent/10 transition-colors" />
        </div>
    );
}
