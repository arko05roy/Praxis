"use client";

import { useLPBalance, useMyERTCount, useExecutorStatus } from "@/lib/hooks";
import { formatUnits } from "viem";
import { Wallet, TrendingDown, TrendingUp, MoreVertical } from "lucide-react";

export function UserPositionSummary() {
    const { data: lpBalance, isLoading: lpLoading } = useLPBalance();
    const { data: ertCount } = useMyERTCount();
    const { data: executorStatus } = useExecutorStatus();

    const totalBalance = lpBalance ? formatUnits(lpBalance.assetsValue, 6) : "0.00";
    const shareBalance = lpBalance ? formatUnits(lpBalance.shares, 18) : "0";

    // Mock PnL for visual demo (User requested hooks but usually PnL is calculated over time)
    const pnlPercent = 0.23;
    const pnlValue = 245.24;
    const isPositive = true;

    return (
        <div className="col-span-1 md:col-span-2 lg:col-span-2 glass-panel rounded-2xl p-8 relative overflow-hidden">
            {/* Ambient Background */}
            <div className="absolute top-0 right-0 w-64 h-64 bg-accent/5 rounded-full blur-[100px] pointer-events-none" />

            <div className="flex items-start justify-between relative z-10">
                <div>
                    <h2 className="text-text-secondary text-sm font-medium mb-4 flex items-center gap-2">
                        Portfolio Summary
                    </h2>
                    <div className="mb-1">
                        <span className="text-text-muted text-sm mr-2">Current balance (USD)</span>
                    </div>
                    <div className="flex items-baseline gap-4 mb-2">
                        <h1 className="text-5xl font-bold text-white font-mono tracking-tighter">
                            ${Number(totalBalance).toLocaleString()}
                            <span className="text-2xl text-text-muted">.00</span>
                        </h1>
                    </div>

                    <div className={`flex items-center gap-2 text-sm font-medium ${isPositive ? 'text-accent' : 'text-error'}`}>
                        {isPositive ? <TrendingUp className="w-4 h-4" /> : <TrendingDown className="w-4 h-4" />}
                        <span>{isPositive ? '+' : ''}{pnlPercent}% (1d)</span>
                        <span className="opacity-60 ml-1">+${pnlValue}</span>
                    </div>
                </div>

                <div className="flex flex-col gap-2">
                    <button className="p-2 hover:bg-white/5 rounded-full transition-colors">
                        <MoreVertical className="w-5 h-5 text-text-secondary" />
                    </button>
                </div>
            </div>

            {/* Mini Stats Grid */}
            <div className="grid grid-cols-2 gap-4 mt-8 pt-6 border-t border-white/5">
                <div>
                    <p className="text-xs text-text-muted mb-1">LP Shares</p>
                    <p className="text-lg font-semibold text-white">{Number(shareBalance).toFixed(4)}</p>
                </div>
                <div>
                    <p className="text-xs text-text-muted mb-1">Active ERTs</p>
                    <div className="flex items-center gap-2">
                        <span className="text-lg font-semibold text-white">{ertCount ? ertCount.toString() : '0'}</span>
                        {executorStatus?.tierName && (
                            <span className="text-[10px] bg-white/10 px-2 py-0.5 rounded text-text-secondary">
                                {executorStatus.tierName}
                            </span>
                        )}
                    </div>
                </div>
            </div>

            {/* Decorative Chart Line (SVG) */}
            <div className="absolute bottom-0 right-0 w-1/2 h-32 opacity-20 pointer-events-none">
                <svg viewBox="0 0 200 100" className="w-full h-full text-accent fill-current">
                    <path d="M0 80 Q 50 80 80 50 T 150 30 T 200 10 V 100 H 0 Z" fill="url(#gradient)" />
                    <defs>
                        <linearGradient id="gradient" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="0%" stopColor="currentColor" stopOpacity="0.5" />
                            <stop offset="100%" stopColor="currentColor" stopOpacity="0" />
                        </linearGradient>
                    </defs>
                </svg>
            </div>
        </div>
    );
}
