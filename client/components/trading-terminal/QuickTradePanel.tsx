"use client";

import { useState } from "react";
import { useExecutionRights, useExecuteWithRights } from "@/lib/hooks";
import { ArrowDown, Zap } from "lucide-react";
import { Loader2 } from "lucide-react";

interface QuickTradePanelProps {
    ertId: bigint | undefined;
}

export function QuickTradePanel({ ertId }: QuickTradePanelProps) {
    const { execute, isPending } = useExecuteWithRights();
    const [amount, setAmount] = useState("");

    const handleExecute = () => {
        if (!ertId) return;
        // Mock execution action
        // In reality, this would encode valid ABI data for the chosen adapter
        execute(ertId, [
            {
                adapter: "0x123...abc" as `0x${string}`, // Mock Adapter Address
                data: "0x", // Mock Encoded Data
                value: 0n
            }
        ]);
    };

    return (
        <div className="glass-panel p-6 rounded-2xl">
            <h3 className="text-sm font-semibold text-white mb-6 flex items-center gap-2">
                <Zap className="w-4 h-4 text-yellow-500" /> Quick Swap (Execution Rights)
            </h3>

            <div className="space-y-4">
                {/* From */}
                <div className="bg-background-secondary p-4 rounded-xl border border-white/5 hover:border-white/10 transition-colors">
                    <div className="flex justify-between mb-2">
                        <span className="text-xs text-text-muted">Sell</span>
                        <span className="text-xs text-text-muted">Balance: 50,000 USDC</span>
                    </div>
                    <div className="flex items-center justify-between gap-4">
                        <input
                            type="number"
                            value={amount}
                            onChange={(e) => setAmount(e.target.value)}
                            placeholder="0.00"
                            className="bg-transparent text-xl font-mono text-white outline-none w-full"
                        />
                        <div className="bg-black/20 px-3 py-1.5 rounded-full flex items-center gap-2 border border-white/5">
                            <div className="w-5 h-5 rounded-full bg-blue-500"></div>
                            <span className="font-bold text-sm text-white">USDC</span>
                        </div>
                    </div>
                </div>

                {/* Divider */}
                <div className="flex justify-center -my-2 relative z-10">
                    <div className="bg-background-tertiary p-1.5 rounded-full border border-white/10">
                        <ArrowDown className="w-4 h-4 text-text-muted" />
                    </div>
                </div>

                {/* To */}
                <div className="bg-background-secondary p-4 rounded-xl border border-white/5 hover:border-white/10 transition-colors">
                    <div className="flex justify-between mb-2">
                        <span className="text-xs text-text-muted">Buy</span>
                    </div>
                    <div className="flex items-center justify-between gap-4">
                        <input
                            type="text"
                            readOnly
                            value={amount ? (Number(amount) * 3200).toFixed(2) : ""}
                            placeholder="0.00"
                            className="bg-transparent text-xl font-mono text-white outline-none w-full"
                        />
                        <div className="bg-black/20 px-3 py-1.5 rounded-full flex items-center gap-2 border border-white/5">
                            <div className="w-5 h-5 rounded-full bg-orange-500"></div>
                            <span className="font-bold text-sm text-white">WETH</span>
                        </div>
                    </div>
                </div>

                <button
                    onClick={handleExecute}
                    disabled={!ertId || !amount || isPending}
                    className="w-full bg-accent hover:bg-accent-hover text-black font-bold py-4 rounded-xl transition-all shadow-lg shadow-accent/20 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                >
                    {isPending ? <Loader2 className="animate-spin w-5 h-5" /> : null}
                    {ertId ? "Execute Trade via ERT" : "Select ERT First"}
                </button>
            </div>
        </div>
    );
}
