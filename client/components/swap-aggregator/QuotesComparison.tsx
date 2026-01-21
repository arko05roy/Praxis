"use client";

import { Check, Flame, Zap, Layers, Loader2, RefreshCw, TestTube2 } from "lucide-react";
import { cn } from "@/lib/utils";

interface Quote {
    dex: string;
    amountOut: string;
    fee: string;
    isBest?: boolean;
    diff?: number;
    adapter?: `0x${string}`;
}

interface QuotesComparisonProps {
    quotes: Quote[];
    isLoading?: boolean;
    onSwap?: () => void;
    swapPending?: boolean;
}

const DEX_ICONS: Record<string, { icon: typeof Flame; bg: string; text: string }> = {
    'BlazeSwap': { icon: Flame, bg: 'bg-orange-500/10', text: 'text-orange-500' },
    'SparkDEX': { icon: Zap, bg: 'bg-purple-500/10', text: 'text-purple-500' },
    'SparkDEX V3': { icon: Zap, bg: 'bg-purple-500/10', text: 'text-purple-500' },
    'Enosys': { icon: Layers, bg: 'bg-blue-500/10', text: 'text-blue-500' },
    'Mock (Demo)': { icon: TestTube2, bg: 'bg-yellow-500/10', text: 'text-yellow-500' },
};

export function QuotesComparison({ quotes, isLoading, onSwap, swapPending }: QuotesComparisonProps) {
    if (isLoading) {
        return (
            <div className="glass-panel p-8 rounded-2xl flex flex-col items-center justify-center text-center h-full min-h-[300px]">
                <Loader2 className="w-8 h-8 text-accent animate-spin mb-4" />
                <p className="text-text-muted text-sm">Fetching quotes from DEXs...</p>
            </div>
        );
    }

    if (!quotes || quotes.length === 0) {
        return (
            <div className="glass-panel p-8 rounded-2xl flex flex-col items-center justify-center text-center h-full min-h-[300px] border-dashed border-white/10">
                <Layers className="w-12 h-12 text-white/10 mb-4" />
                <p className="text-text-muted text-sm">Enter an amount to see<br />aggregated quotes from all DEXs.</p>
            </div>
        );
    }

    const bestQuote = quotes.find(q => q.isBest);
    const savings = quotes.length > 1 && bestQuote
        ? (quotes.reduce((acc, q) => q.diff ? Math.max(acc, q.diff) : acc, 0)).toFixed(2)
        : null;

    return (
        <div className="space-y-4">
            <div className="flex items-center justify-between">
                <h3 className="text-sm font-semibold text-text-secondary pl-1">Route Selection</h3>
                {savings && Number(savings) > 0 && (
                    <span className="text-xs bg-accent/10 text-accent px-2 py-1 rounded-full">
                        Saving up to {savings}% vs worst route
                    </span>
                )}
            </div>

            {quotes.map((quote, idx) => {
                const dexConfig = DEX_ICONS[quote.dex] || { icon: Layers, bg: 'bg-blue-500/10', text: 'text-blue-500' };
                const Icon = dexConfig.icon;

                return (
                    <div
                        key={`${quote.dex}-${idx}`}
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
                        {quote.dex === 'Mock (Demo)' && (
                            <div className="absolute top-0 left-0 bg-yellow-500 text-black text-[10px] font-bold px-2 py-0.5 rounded-br-lg">
                                DEMO
                            </div>
                        )}

                        <div className="flex justify-between items-center">
                            <div className="flex items-center gap-3">
                                <div className={cn(
                                    "w-10 h-10 rounded-full flex items-center justify-center",
                                    dexConfig.bg, dexConfig.text
                                )}>
                                    <Icon className="w-5 h-5" />
                                </div>
                                <div>
                                    <p className="text-white font-medium">{quote.dex}</p>
                                    <p className="text-xs text-text-muted">
                                        Gas: ~{Number(quote.fee).toFixed(4)} FLR
                                    </p>
                                </div>
                            </div>

                            <div className="text-right">
                                <p className="text-lg font-bold text-white">
                                    {Number(quote.amountOut).toLocaleString(undefined, {
                                        maximumFractionDigits: 6,
                                        minimumFractionDigits: 2
                                    })}
                                </p>
                                {!quote.isBest && quote.diff !== undefined && quote.diff > 0 && (
                                    <p className="text-xs text-red-400">-{quote.diff.toFixed(2)}%</p>
                                )}
                                {quote.isBest && (
                                    <p className="text-xs text-accent flex items-center justify-end gap-1">
                                        <Check className="w-3 h-3" /> Best Route
                                    </p>
                                )}
                            </div>
                        </div>
                    </div>
                );
            })}

            <button
                onClick={onSwap}
                disabled={swapPending || !bestQuote}
                className={cn(
                    "w-full mt-6 bg-accent hover:bg-accent-hover text-black font-bold py-4 rounded-xl transition-all shadow-[0_4px_20px_rgba(143,212,96,0.3)] hover:translate-y-[-1px] flex items-center justify-center gap-2",
                    swapPending && "opacity-70 cursor-not-allowed",
                    !bestQuote && "opacity-50 cursor-not-allowed"
                )}
            >
                {swapPending ? (
                    <>
                        <Loader2 className="w-5 h-5 animate-spin" />
                        Processing...
                    </>
                ) : (
                    <>Swap via {bestQuote?.dex || 'Best Route'}</>
                )}
            </button>

            {quotes.length > 0 && (
                <p className="text-[10px] text-text-muted text-center">
                    Quotes refresh automatically every 15 seconds
                </p>
            )}
        </div>
    );
}
