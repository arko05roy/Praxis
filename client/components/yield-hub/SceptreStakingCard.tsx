"use client";

import { useState } from "react";
import { useSceptreStats, useSceptreBalance, useSceptreStake, useNativeBalance } from "@/lib/hooks";
import { formatUnits, parseEther } from "viem";
import { Droplets, ArrowRight, Loader2, CheckCircle2 } from "lucide-react";

export function SceptreStakingCard() {
    const { data: stats, isAvailable } = useSceptreStats();
    const { sFLRBalance, flrEquivalent } = useSceptreBalance();
    const { balance: nativeBalance } = useNativeBalance();
    const { stake, isPending, isConfirming, isSuccess, error } = useSceptreStake();
    const [amount, setAmount] = useState("");

    const apy = stats ? stats.apy : 4.0; // Valid fallback
    const exchangeRate = stats ? stats.exchangeRate : 1.0;

    const handleStake = async () => {
        if (!amount || Number(amount) <= 0) return;
        try {
            const amountWei = parseEther(amount);
            await stake(amountWei);
            setAmount("");
        } catch (e) {
            console.error("Stake failed:", e);
        }
    };

    const isStaking = isPending || isConfirming;

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
                        <span className="text-xs text-text-muted">
                            Available: {nativeBalance ? Number(formatUnits(nativeBalance, 18)).toFixed(2) : "0.00"} FLR
                        </span>
                    </div>
                    <div className="flex items-center gap-2">
                        <input
                            type="number"
                            value={amount}
                            onChange={(e) => setAmount(e.target.value)}
                            placeholder="0.0"
                            className="bg-transparent text-2xl font-bold text-white outline-none w-full"
                        />
                        <button
                            onClick={() => {
                                if (nativeBalance) {
                                    // Leave 0.1 FLR for gas
                                    const maxAmount = nativeBalance > parseEther("0.1")
                                        ? nativeBalance - parseEther("0.1")
                                        : 0n;
                                    setAmount(formatUnits(maxAmount, 18));
                                }
                            }}
                            className="text-xs bg-white/10 hover:bg-white/20 text-purple-400 px-2 py-1 rounded transition-colors"
                        >
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

                {isSuccess && (
                    <div className="flex items-center justify-center gap-2 text-green-400 text-sm py-2">
                        <CheckCircle2 className="w-4 h-4" />
                        Staking successful!
                    </div>
                )}

                {error && (
                    <div className="text-red-400 text-xs text-center py-2">
                        Error: {error.message?.slice(0, 50)}...
                    </div>
                )}

                <button
                    onClick={handleStake}
                    disabled={!amount || Number(amount) <= 0 || isStaking || !isAvailable}
                    className="w-full bg-purple-600 hover:bg-purple-500 text-white font-bold py-4 rounded-xl transition-all shadow-lg shadow-purple-900/20 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                >
                    {isStaking ? (
                        <>
                            <Loader2 className="animate-spin w-5 h-5" />
                            {isPending ? "Confirm in wallet..." : "Staking..."}
                        </>
                    ) : !isAvailable ? (
                        "Sceptre not available"
                    ) : (
                        "Stake FLR"
                    )}
                </button>
            </div>
        </div>
    );
}
