"use client";

import { Check, Flame, Zap, Layers } from "lucide-react";
import { cn } from "@/lib/utils";

interface Quote {
    dex: string;
    amountOut: string;
    fee: string;
    isBest?: boolean;
    diff?: number;
}

export function QuotesComparison({ quotes }: { quotes: Quote[] }) {
    if (!quotes || quotes.length === 0) {
        return (
            <div className="glass-panel p-8 rounded-2xl flex flex-col items-center justify-center text-center h-full min-h-[300px] border-dashed border-white/10">
                <Layers className="w-12 h-12 text-white/10 mb-4" />
                <p className="text-text-muted text-sm">Enter an amount to see<br />aggregated quotes from all DEXs.</p>
            </div>
        );
    }

    return (
        <div className="space-y-4">
            <h3 className="text-sm font-semibold text-text-secondary pl-1">Route Selection</h3>

            {quotes.map((quote) => (
                <div
                    key={quote.dex}
                    className={cn(
                        "glass-panel p-4 rounded-xl border transition-all cursor-pointer relative overflow-hidden group",
                        quote.isBest
                            ? "border-accent/50 bg-accent/5 hover:bg-accent/10"
                            : "border-white/5 hover:border-white/20 hover:bg-white/5"
                    )}
                >
                    {quote.isBest && (
                        <div className="absolute top-0 right-0 bg-accent text-black text-[10px] font-bold px-2 py-0.5 rounded-bl-lg">
                            BEST PRICE
                        </div>
                    )}

                    <div className="flex justify-between items-center">
                        <div className="flex items-center gap-3">
                            <div className={cn(
                                "w-10 h-10 rounded-full flex items-center justify-center",
                                quote.dex === 'BlazeSwap' ? "bg-orange-500/10 text-orange-500" :
                                    quote.dex === 'SparkDEX' ? "bg-purple-500/10 text-purple-500" :
                                        "bg-blue-500/10 text-blue-500"
                            )}>
                                {quote.dex === 'BlazeSwap' ? <Flame className="w-5 h-5" /> :
                                    quote.dex === 'SparkDEX' ? <Zap className="w-5 h-5" /> :
                                        <Layers className="w-5 h-5" />}
                            </div>
                            <div>
                                <p className="text-white font-medium">{quote.dex}</p>
                                <p className="text-xs text-text-muted">Gas: ${quote.fee}</p>
                            </div>
                        </div>

                        <div className="text-right">
                            <p className="text-lg font-bold text-white">{quote.amountOut}</p>
                            {!quote.isBest && (
                                <p className="text-xs text-red-400">-{quote.diff?.toFixed(2)}%</p>
                            )}
                            {quote.isBest && (
                                <p className="text-xs text-accent flex items-center justify-end gap-1">
                                    <Check className="w-3 h-3" /> Best Route
                                </p>
                            )}
                        </div>
                    </div>
                </div>
            ))}

            <button className="w-full mt-6 bg-accent hover:bg-accent-hover text-black font-bold py-4 rounded-xl transition-all shadow-[0_4px_20px_rgba(143,212,96,0.3)] hover:translate-y-[-1px]">
                Swap via {quotes.find(q => q.isBest)?.dex || 'Best Route'}
            </button>
        </div>
    );
}
