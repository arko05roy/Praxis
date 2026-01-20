"use client";

import { SwapInterface } from "@/components/swap-aggregator/SwapInterface";
import { QuotesComparison } from "@/components/swap-aggregator/QuotesComparison";
import { useState } from "react";

export default function SwapAggregatorPage() {
    const [quotes, setQuotes] = useState<any[]>([]);

    const handleQuoteUpdate = (amount: string, from: string, to: string) => {
        // Simulation of aggregated quotes
        // In production, this would call `useAllSwapQuotes` or an API
        const numAmount = Number(amount);
        if (!numAmount) return;

        const baseOut = numAmount * (from === 'FLR' ? 0.032 : 1); // Mock rate

        setQuotes([
            {
                dex: 'SparkDEX',
                amountOut: (baseOut * 1).toFixed(4),
                fee: '0.01',
                isBest: true
            },
            {
                dex: 'BlazeSwap',
                amountOut: (baseOut * 0.992).toFixed(4),
                fee: '0.02',
                isBest: false,
                diff: 0.8
            },
            {
                dex: 'Enosys',
                amountOut: (baseOut * 0.985).toFixed(4),
                fee: '0.04',
                isBest: false,
                diff: 1.5
            },
        ]);
    };

    return (
        <div className="max-w-5xl mx-auto">
            <div className="text-center mb-10">
                <h1 className="text-3xl font-bold text-white mb-2">DEX Aggregator</h1>
                <p className="text-text-secondary">Get the best price across all major liquidity sources on Flare Network.</p>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
                <div className="lg:col-span-5">
                    <SwapInterface onQuoteUpdate={handleQuoteUpdate} />

                    <div className="mt-6 flex justify-between text-xs text-text-muted px-4">
                        <span>Slippage Tolerance</span>
                        <span className="text-white">0.5% (Auto)</span>
                    </div>
                </div>

                <div className="hidden lg:flex lg:col-span-1 justify-center pt-20 text-white/10">
                    →
                </div>

                <div className="lg:col-span-6">
                    <QuotesComparison quotes={quotes} />
                </div>
            </div>
        </div>
    );
}
