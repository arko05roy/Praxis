"use client";

import { useLPBalance } from "@/lib/hooks";
import { formatUnits } from "viem";
import { Wallet, PieChart } from "lucide-react";

export function LPBalanceCard() {
    const { data: balance, isLoading } = useLPBalance();

    const shares = balance ? formatUnits(balance.shares, 18) : "0";
    const assetsValue = balance ? formatUnits(balance.assetsValue, 6) : "0";

    return (
        <div className="glass-panel rounded-2xl p-6 relative overflow-hidden group">
            <div className="absolute top-0 right-0 w-32 h-32 bg-accent/5 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2" />

            <div className="flex items-start justify-between mb-6 relative z-10">
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

            <div className="bg-black/20 rounded-xl p-3 border border-white/5 flex justify-between items-center relative z-10">
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
                    <span className="text-xs text-accent">+0.00%</span>
                </div>
            </div>
        </div>
    );
}
