"use client";

import { useCommonPrices, usePriceStaleness } from "@/lib/hooks";
import { ArrowUpRight, ArrowDownRight, MoreHorizontal } from "lucide-react";

// Mock asset metadata since the hook only returns prices
const ASSETS = [
    { symbol: "BTC", name: "Bitcoin", color: "#f7931a" },
    { symbol: "ETH", name: "Ethereum", color: "#627eea" },
    { symbol: "FLR", name: "Flare", color: "#e6007a" },
    { symbol: "USDC", name: "USD Coin", color: "#2775ca" },
];

export function AssetList() {
    const { data: prices, isLoading } = useCommonPrices();

    // Mock change data since common prices might not have 24h change yet
    const changes: Record<string, number> = {
        BTC: 0.23,
        ETH: -1.45,
        FLR: 5.23,
        USDC: 0.01
    };

    return (
        <div className="glass-panel rounded-2xl p-6 h-full">
            <div className="flex items-center justify-between mb-6">
                <h3 className="text-text-secondary text-sm font-medium">Top Assets</h3>
                <button className="text-xs text-text-muted hover:text-white transition-colors">See all</button>
            </div>

            <div className="space-y-3">
                {ASSETS.map((asset) => {
                    const price = prices?.[asset.symbol as keyof typeof prices] || 0;
                    const change = changes[asset.symbol] || 0;
                    const isPositive = change >= 0;

                    return (
                        <div key={asset.symbol} className="flex items-center justify-between p-3 rounded-xl bg-white/5 hover:bg-white/10 transition-colors cursor-pointer group">
                            <div className="flex items-center gap-3">
                                <div className="w-10 h-10 rounded-full flex items-center justify-center font-bold text-white text-xs" style={{ backgroundColor: asset.color }}>
                                    {asset.symbol[0]}
                                </div>
                                <div>
                                    <h4 className="text-white font-medium text-sm">{asset.name}</h4>
                                    <span className="text-text-muted text-xs">{asset.symbol} • ${Number(price).toLocaleString()}</span>
                                </div>
                            </div>

                            <div className="text-right">
                                <p className="text-white font-mono font-medium text-sm">
                                    {isLoading ? '...' : Number(price).toFixed(asset.symbol === 'USDC' ? 4 : 2)}
                                </p>
                                <p className={`text-xs font-medium flex items-center justify-end gap-1 ${isPositive ? 'text-accent' : 'text-error'}`}>
                                    {isPositive ? '+' : ''}{change}%
                                    {isPositive ? <ArrowUpRight className="w-3 h-3" /> : <ArrowDownRight className="w-3 h-3" />}
                                </p>
                            </div>
                        </div>
                    );
                })}
            </div>
        </div>
    );
}
