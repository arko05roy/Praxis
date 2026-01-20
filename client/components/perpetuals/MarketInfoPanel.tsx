"use client";

import { usePerpMarketInfo, useMarkPrice, useFundingRate } from "@/lib/hooks";
import { TrendingUp, TrendingDown, Clock, Activity } from "lucide-react";
import { cn } from "@/lib/utils";

interface MarketInfoPanelProps {
    marketId: string;
}

export function MarketInfoPanel({ marketId }: MarketInfoPanelProps) {
    // Mocking hooks for display as they might not have full data yet
    const markPrice = 3450.25;
    const indexPrice = 3448.10;
    const fundingRate = 0.015;
    const change24h = 2.45;

    return (
        <div className="glass-panel p-6 rounded-2xl">
            <div className="flex justify-between items-start mb-6">
                <div>
                    <h2 className="text-2xl font-bold text-white flex items-center gap-2">
                        {marketId} <span className="text-sm font-normal text-text-muted bg-white/5 px-2 py-0.5 rounded">Perp</span>
                    </h2>
                    <p className={cn("text-sm font-medium flex items-center gap-1", change24h >= 0 ? "text-green-500" : "text-red-500")}>
                        {change24h >= 0 ? "+" : ""}{change24h}% (24h)
                    </p>
                </div>
                <div className="text-right">
                    <p className="text-3xl font-bold text-white tracking-tight">${markPrice.toLocaleString()}</p>
                    <p className="text-xs text-text-muted">Mark Price</p>
                </div>
            </div>

            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div className="bg-white/5 rounded-xl p-3 border border-white/5">
                    <p className="text-[10px] text-text-muted mb-1">Index Price</p>
                    <p className="font-mono text-white">${indexPrice.toLocaleString()}</p>
                </div>

                <div className="bg-white/5 rounded-xl p-3 border border-white/5">
                    <p className="text-[10px] text-text-muted mb-1">Funding / 8h</p>
                    <p className={cn("font-mono", fundingRate >= 0 ? "text-yellow-500" : "text-green-500")}>
                        {fundingRate.toFixed(4)}%
                    </p>
                </div>

                <div className="bg-white/5 rounded-xl p-3 border border-white/5">
                    <p className="text-[10px] text-text-muted mb-1">24h Volume</p>
                    <p className="font-mono text-white">$14.2M</p>
                </div>

                <div className="bg-white/5 rounded-xl p-3 border border-white/5">
                    <p className="text-[10px] text-text-muted mb-1">Open Interest</p>
                    <p className="font-mono text-white">$45.8M</p>
                </div>
            </div>
        </div>
    );
}
