"use client";

import { useState } from "react";
import { useSceptreStats, useSceptreBalance, useSceptreStake } from "@/lib/hooks";
import { formatUnits } from "viem";
import { Droplets, ArrowRight, Loader2 } from "lucide-react";

export function SceptreStakingCard() {
    const { data: stats } = useSceptreStats();
    const { data: balance } = useSceptreBalance();
    // Simplified mock hook usage for staking as the actual one would need args
    const [amount, setAmount] = useState("");
    const [isStaking, setIsStaking] = useState(false);

    const apy = stats ? stats.apy : 8.4; // Valid fallback
    const exchangeRate = stats ? stats.exchangeRate : 1.045;

    const handleStake = async () => {
        setIsStaking(true);
        // Simulate network request
        await new Promise(r => setTimeout(r, 2000));
        setIsStaking(false);
        setAmount("");
    };

    return (
        <div className="glass-panel p-6 rounded-2xl relative overflow-hidden">
            {/* Background Decoration */}
            <div className="absolute top-0 right-0 w-40 h-40 bg-purple-500/10 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2" />

            <div className="flex items-center gap-3 mb-6 relative z-10">
                <div className="w-10 h-10 rounded-full bg-purple-500/20 flex items-center justify-center text-purple-400">
                    <Droplets className="w-5 h-5" />
                </div>
                <div>
                    <h3 className="font-bold text-white">Sceptre Liquid Staking</h3>
                    <p className="text-xs text-text-muted">Stake FLR, receive sFLR</p>
                </div>
            </div>

            <div className="grid grid-cols-2 gap-4 mb-6 relative z-10">
                <div className="bg-black/20 p-3 rounded-xl border border-white/5">
                    <p className="text-xs text-text-muted mb-1">Current APY</p>
                    <p className="text-xl font-bold text-accent">{apy}%</p>
                </div>
                <div className="bg-black/20 p-3 rounded-xl border border-white/5">
                    <p className="text-xs text-text-muted mb-1">Exchange Rate</p>
                    <p className="text-xl font-bold text-white">1:{exchangeRate}</p>
                </div>
            </div>

            <div className="space-y-4 relative z-10">
                <div className="bg-background-secondary p-4 rounded-xl border border-white/5">
                    <div className="flex justify-between mb-2">
                        <label className="text-xs text-text-muted">Stake Amount</label>
                        <span className="text-xs text-text-muted">Available: 1,240 FLR</span>
                    </div>
                    <div className="flex items-center gap-2">
                        <input
                            type="number"
                            value={amount}
                            onChange={(e) => setAmount(e.target.value)}
                            placeholder="0.0"
                            className="bg-transparent text-2xl font-bold text-white outline-none w-full"
                        />
                        <button className="text-xs bg-white/10 hover:bg-white/20 text-purple-400 px-2 py-1 rounded transition-colors">
                            MAX
                        </button>
                    </div>
                </div>

                <div className="flex items-center justify-between text-xs px-2">
                    <span className="text-text-muted">You will receive</span>
                    <span className="text-white font-medium">
                        {amount ? (Number(amount) / exchangeRate).toFixed(4) : "0.00"} sFLR
                    </span>
                </div>

                <button
                    onClick={handleStake}
                    disabled={!amount || isStaking}
                    className="w-full bg-purple-600 hover:bg-purple-500 text-white font-bold py-4 rounded-xl transition-all shadow-lg shadow-purple-900/20 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                >
                    {isStaking ? <Loader2 className="animate-spin w-5 h-5" /> : "Stake FLR"}
                </button>
            </div>
        </div>
    );
}
