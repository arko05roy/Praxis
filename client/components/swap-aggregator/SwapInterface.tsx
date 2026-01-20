"use client";

import { useState, useEffect } from "react";
import { useTokenBalance } from "@/lib/hooks";
import { ArrowDown, Settings, RotateCw } from "lucide-react";
import { formatUnits } from "viem";

interface SwapInterfaceProps {
    onQuoteUpdate: (amount: string, fromToken: string, toToken: string) => void;
}

export function SwapInterface({ onQuoteUpdate }: SwapInterfaceProps) {
    const [amount, setAmount] = useState("");
    const [fromToken, setFromToken] = useState("FLR");
    const [toToken, setToToken] = useState("USDC");

    const { data: balance } = useTokenBalance(); // Simplification: assumes native/wrapped based on context

    // Debounce quote update
    useEffect(() => {
        const timeout = setTimeout(() => {
            if (amount && Number(amount) > 0) {
                onQuoteUpdate(amount, fromToken, toToken);
            }
        }, 500);
        return () => clearTimeout(timeout);
    }, [amount, fromToken, toToken, onQuoteUpdate]);

    return (
        <div className="glass-panel p-6 rounded-2xl relative">
            <div className="flex justify-between items-center mb-6">
                <h3 className="font-semibold text-white">Swap</h3>
                <button className="p-2 hover:bg-white/10 rounded-full text-text-muted transition-colors">
                    <Settings className="w-4 h-4" />
                </button>
            </div>

            <div className="space-y-2">
                {/* FROM */}
                <div className="bg-background-secondary p-4 rounded-xl border border-white/5 hover:border-white/10 transition-colors group">
                    <div className="flex justify-between mb-2">
                        <label className="text-xs text-text-muted group-focus-within:text-accent transition-colors">Sell</label>
                        <span className="text-xs text-text-muted">Balance: {balance ? formatUnits(balance, 18) : "0.00"}</span>
                    </div>
                    <div className="flex items-center gap-4">
                        <input
                            type="number"
                            value={amount}
                            onChange={(e) => setAmount(e.target.value)}
                            placeholder="0.0"
                            className="bg-transparent text-3xl font-bold text-white outline-none w-full placeholder-white/20"
                        />
                        <div className="flex items-center gap-2 bg-black/40 hover:bg-black/60 cursor-pointer px-3 py-1.5 rounded-full border border-white/10 transition-colors">
                            <div className="w-6 h-6 rounded-full bg-accent/20 flex items-center justify-center text-[10px] font-bold text-accent">F</div>
                            <span className="font-bold text-white">{fromToken}</span>
                            <ArrowDown className="w-3 h-3 text-text-muted" />
                        </div>
                    </div>
                </div>

                {/* SWAP ARROW */}
                <div className="flex justify-center -my-3 relative z-10">
                    <button
                        onClick={() => {
                            const temp = fromToken;
                            setFromToken(toToken);
                            setToToken(temp);
                        }}
                        className="bg-background-tertiary p-2 rounded-xl border border-white/10 hover:border-accent/50 hover:text-accent transition-all text-text-muted shadow-lg"
                    >
                        <ArrowDown className="w-4 h-4" />
                    </button>
                </div>

                {/* TO */}
                <div className="bg-background-secondary p-4 rounded-xl border border-white/5 hover:border-white/10 transition-colors">
                    <div className="flex justify-between mb-2">
                        <label className="text-xs text-text-muted">Buy</label>
                    </div>
                    <div className="flex items-center gap-4">
                        <input
                            type="number"
                            readOnly
                            placeholder="0.0"
                            className="bg-transparent text-3xl font-bold text-white/50 outline-none w-full cursor-default"
                        />
                        <div className="flex items-center gap-2 bg-black/40 hover:bg-black/60 cursor-pointer px-3 py-1.5 rounded-full border border-white/10 transition-colors">
                            <div className="w-6 h-6 rounded-full bg-blue-500/20 flex items-center justify-center text-[10px] font-bold text-blue-500">U</div>
                            <span className="font-bold text-white">{toToken}</span>
                            <ArrowDown className="w-3 h-3 text-text-muted" />
                        </div>
                    </div>
                </div>
            </div>

            {amount && (
                <div className="mt-4 p-3 bg-accent/5 rounded-xl border border-accent/10 flex items-center justify-between text-xs">
                    <span className="text-accent flex items-center gap-2">
                        <RotateCw className="w-3 h-3 animate-spin" /> Fetching best rates...
                    </span>
                </div>
            )}
        </div>
    );
}
