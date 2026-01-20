"use client";

import { useState } from "react";
import { Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";

export function OrderForm() {
    const [side, setSide] = useState<'long' | 'short'>('long');
    const [size, setSize] = useState("");
    const [leverage, setLeverage] = useState(5);
    const [isPending, setIsPending] = useState(false);

    const handleOrder = async () => {
        setIsPending(true);
        await new Promise(r => setTimeout(r, 1500));
        setIsPending(false);
        setSize("");
    };

    return (
        <div className="glass-panel p-6 rounded-2xl h-full">
            {/* Long/Short Toggle */}
            <div className="grid grid-cols-2 bg-black/20 p-1 rounded-xl mb-6">
                <button
                    onClick={() => setSide('long')}
                    className={cn(
                        "py-2 rounded-lg text-sm font-bold transition-all",
                        side === 'long' ? "bg-green-500/20 text-green-500 shadow-sm" : "text-text-muted hover:text-white"
                    )}
                >
                    Buy / Long
                </button>
                <button
                    onClick={() => setSide('short')}
                    className={cn(
                        "py-2 rounded-lg text-sm font-bold transition-all",
                        side === 'short' ? "bg-red-500/20 text-red-500 shadow-sm" : "text-text-muted hover:text-white"
                    )}
                >
                    Sell / Short
                </button>
            </div>

            <div className="space-y-6">
                {/* Size Input */}
                <div className="space-y-2">
                    <div className="flex justify-between text-xs">
                        <span className="text-text-muted">Size (USDC)</span>
                        <span className="text-text-muted">Max: 50,000</span>
                    </div>
                    <div className="bg-background-secondary p-3 rounded-xl border border-white/5 flex items-center justify-between">
                        <input
                            type="number"
                            value={size}
                            onChange={(e) => setSize(e.target.value)}
                            placeholder="0.00"
                            className="bg-transparent text-lg font-bold text-white outline-none w-full"
                        />
                        <span className="text-xs font-bold text-text-muted">USDC</span>
                    </div>
                </div>

                {/* Leverage Slider */}
                <div className="space-y-3">
                    <div className="flex justify-between text-xs">
                        <span className="text-text-muted">Leverage</span>
                        <span className="text-white font-bold">{leverage}x</span>
                    </div>
                    <input
                        type="range"
                        min="1"
                        max="20"
                        step="1"
                        value={leverage}
                        onChange={(e) => setLeverage(Number(e.target.value))}
                        className="w-full accent-accent h-1 bg-white/10 rounded-lg appearance-none cursor-pointer"
                    />
                    <div className="flex justify-between text-[10px] text-text-muted">
                        <span>1x</span>
                        <span>5x</span>
                        <span>10x</span>
                        <span>20x</span>
                    </div>
                </div>

                {/* Summary */}
                <div className="bg-white/5 rounded-xl p-4 space-y-2 text-xs">
                    <div className="flex justify-between">
                        <span className="text-text-muted">Entry Price</span>
                        <span className="text-white">$3,450.25</span>
                    </div>
                    <div className="flex justify-between">
                        <span className="text-text-muted">Liquidation Price</span>
                        <span className="text-error font-medium">
                            ${side === 'long' ? '2,890.50' : '4,120.00'}
                        </span>
                    </div>
                    <div className="flex justify-between border-t border-white/5 pt-2 mt-2">
                        <span className="text-text-muted">Total Margin</span>
                        <span className="text-white font-bold">
                            {size ? (Number(size) / leverage).toFixed(2) : "0.00"} USDC
                        </span>
                    </div>
                </div>

                {/* Submit Button */}
                <button
                    onClick={handleOrder}
                    disabled={!size || isPending}
                    className={cn(
                        "w-full font-bold py-4 rounded-xl transition-all shadow-lg flex items-center justify-center gap-2",
                        side === 'long'
                            ? "bg-green-500 hover:bg-green-600 text-white shadow-green-900/20"
                            : "bg-red-500 hover:bg-red-600 text-white shadow-red-900/20"
                    )}
                >
                    {isPending ? <Loader2 className="animate-spin w-5 h-5" /> : (
                        side === 'long' ? 'Place Long Order' : 'Place Short Order'
                    )}
                </button>
            </div>
        </div>
    );
}
