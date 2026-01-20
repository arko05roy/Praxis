"use client";

import { useAllFAssetBalances } from "@/lib/hooks";
import { formatUnits } from "viem";
import { Copy, ArrowUpRight, TrendingUp } from "lucide-react";
import { cn } from "@/lib/utils";

export function FAssetBalanceCards() {
    const { data: balances, isLoading } = useAllFAssetBalances();

    // Mock data for UI if hook data is not ready
    const assets = [
        { symbol: "FXRP", name: "FAsset XRP", balance: "1,500.00", value: "$930.00", change: "+1.2%", color: "text-blue-500", iconBg: "bg-blue-500/20" },
        { symbol: "FBTC", name: "FAsset BTC", balance: "0.045", value: "$2,850.00", change: "+0.8%", color: "text-orange-500", iconBg: "bg-orange-500/20" },
        { symbol: "FDOGE", name: "FAsset DOGE", balance: "0.00", value: "$0.00", change: "0.0%", color: "text-yellow-500", iconBg: "bg-yellow-500/20" },
    ];

    return (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {assets.map((asset) => (
                <div key={asset.symbol} className="glass-panel p-6 rounded-2xl relative overflow-hidden group">
                    <div className="flex justify-between items-start mb-4">
                        <div className={cn("w-10 h-10 rounded-full flex items-center justify-center font-bold text-sm", asset.iconBg, asset.color)}>
                            {asset.symbol[1]}
                        </div>
                        <div className="flex items-center gap-1 text-[10px] bg-white/5 px-2 py-1 rounded text-text-muted">
                            <span className={cn(asset.change.startsWith("+") ? "text-green-500" : "text-text-muted")}>
                                {asset.change}
                            </span>
                            <ArrowUpRight className="w-3 h-3" />
                        </div>
                    </div>

                    <div className="space-y-1">
                        <p className="text-3xl font-bold text-white tracking-tight">{asset.balance}</p>
                        <p className="text-sm text-text-muted flex items-center gap-2">
                            {asset.value}
                            <span className="w-1 h-1 rounded-full bg-text-muted" />
                            {asset.symbol}
                        </p>
                    </div>

                    {/* Hover Action */}
                    <div className="absolute inset-x-0 bottom-0 p-4 translate-y-full group-hover:translate-y-0 transition-transform duration-300 bg-black/80 backdrop-blur-md flex gap-2">
                        <button className="flex-1 bg-white/10 hover:bg-white/20 text-white text-xs font-bold py-2 rounded-lg transition-colors">
                            Mint
                        </button>
                        <button className="flex-1 bg-white/10 hover:bg-white/20 text-white text-xs font-bold py-2 rounded-lg transition-colors">
                            Redeem
                        </button>
                    </div>
                </div>
            ))}
        </div>
    );
}
