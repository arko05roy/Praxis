"use client";

import { useEnhancedPrice } from "@/lib/hooks";
import { ArrowUpRight, ArrowDownRight } from "lucide-react";
import { PriceFreshnessIndicator, FTSOHeaderBadge, StalenessWarningBadge } from "@/components/ui/PriceFeedIndicators";

// Asset metadata configuration
const ASSETS = [
    { symbol: "BTC", name: "Bitcoin", color: "#f7931a", feedId: "BTC/USD" },
    { symbol: "ETH", name: "Ethereum", color: "#627eea", feedId: "ETH/USD" },
    { symbol: "FLR", name: "Flare", color: "#e6007a", feedId: "FLR/USD" },
    { symbol: "USDC", name: "USD Coin", color: "#2775ca", feedId: "USDC/USD" },
];

// Mock change data since common prices might not have 24h change yet
const CHANGES: Record<string, number> = {
    BTC: 0.23,
    ETH: -1.45,
    FLR: 5.23,
    USDC: 0.01
};

function AssetRow({ asset }: { asset: typeof ASSETS[0] }) {
    const { enhanced, isLoading } = useEnhancedPrice(asset.feedId);

    const priceVal = enhanced ? Number(enhanced.formatted) : 0;
    const change = CHANGES[asset.symbol] || 0;
    const isPositive = change >= 0;

    return (
        <div className="flex items-center justify-between p-3 rounded-xl bg-white/5 hover:bg-white/10 transition-colors cursor-pointer group">
            <div className="flex items-center gap-3">
                <div
                    className="w-10 h-10 rounded-full flex items-center justify-center font-bold text-white text-xs"
                    style={{ backgroundColor: asset.color }}
                >
                    {asset.symbol[0]}
                </div>
                <div>
                    <h4 className="text-white font-medium text-sm">{asset.name}</h4>
                    <span className="text-text-muted text-xs">
                        {asset.symbol} • ${priceVal.toLocaleString(undefined, { maximumFractionDigits: 2 })}
                    </span>
                </div>
            </div>

            <div className="text-right">
                <div className="flex items-center justify-end gap-2 mb-1">
                    <p className="text-white font-mono font-medium text-sm">
                        {isLoading ? '...' : priceVal.toFixed(asset.symbol === 'USDC' ? 4 : 2)}
                    </p>
                    {enhanced && (
                        <PriceFreshnessIndicator freshness={enhanced.freshness} />
                    )}
                </div>
                <div className="flex items-center justify-end gap-2">
                    {enhanced?.freshness === 'stale' ? (
                        <StalenessWarningBadge />
                    ) : enhanced ? (
                        <span className="text-[10px] text-text-muted">{enhanced.ageFormatted}</span>
                    ) : null}
                    <p className={`text-xs font-medium flex items-center gap-1 ${isPositive ? 'text-accent' : 'text-error'}`}>
                        {isPositive ? '+' : ''}{change}%
                        {isPositive ? <ArrowUpRight className="w-3 h-3" /> : <ArrowDownRight className="w-3 h-3" />}
                    </p>
                </div>
            </div>
        </div>
    );
}

export function AssetList() {
    // Check if any asset has FTSO data by checking the first asset
    const { enhanced: btcPrice } = useEnhancedPrice("BTC/USD");
    const hasFTSOConnection = btcPrice?.source === 'ftso_v2';

    return (
        <div className="glass-panel rounded-2xl p-6 h-full">
            <div className="flex items-center justify-between mb-6">
                <div className="flex items-center gap-2">
                    <h3 className="text-text-secondary text-sm font-medium">Top Assets</h3>
                    <FTSOHeaderBadge isConnected={hasFTSOConnection} />
                </div>
                <button className="text-xs text-text-muted hover:text-white transition-colors">See all</button>
            </div>

            <div className="space-y-3">
                {ASSETS.map((asset) => (
                    <AssetRow key={asset.symbol} asset={asset} />
                ))}
            </div>
        </div>
    );
}
