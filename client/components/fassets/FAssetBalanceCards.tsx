"use client";

import { useAllFAssetBalances, useFTSOPrice, useExternalProtocolsAvailable, FAssetBalance } from "@/lib/hooks";
import { Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";

// Asset styling configuration
const ASSET_CONFIG = {
    FXRP: { name: "FAsset XRP", color: "text-blue-500", iconBg: "bg-blue-500/20", feedId: 'XRP/USD' },
    FBTC: { name: "FAsset BTC", color: "text-orange-500", iconBg: "bg-orange-500/20", feedId: 'BTC/USD' },
    FDOGE: { name: "FAsset DOGE", color: "text-yellow-500", iconBg: "bg-yellow-500/20", feedId: 'DOGE/USD' },
} as const;

interface FAssetCardProps {
    type: 'FXRP' | 'FBTC' | 'FDOGE';
    balance?: FAssetBalance;
    isLoading: boolean;
}

function FAssetCard({ type, balance, isLoading }: FAssetCardProps) {
    const config = ASSET_CONFIG[type];
    const { data: priceData, isLoading: priceLoading } = useFTSOPrice(config.feedId);

    // Calculate USD value
    const usdValue = balance && priceData
        ? (Number(balance.formatted) * Number(priceData.price) / 10 ** priceData.decimals)
        : 0;

    const formatBalance = (val: string | undefined) => {
        if (!val) return "0.00";
        const num = Number(val);
        if (num > 1000) return num.toLocaleString(undefined, { maximumFractionDigits: 2 });
        return num.toFixed(num < 0.01 ? 6 : 4);
    };

    const formatUSD = (val: number) => {
        if (val >= 1000) return `$${(val / 1000).toFixed(2)}k`;
        return `$${val.toFixed(2)}`;
    };

    return (
        <div className="glass-panel p-6 rounded-2xl relative overflow-hidden group">
            <div className="flex justify-between items-start mb-4">
                <div className={cn("w-10 h-10 rounded-full flex items-center justify-center font-bold text-sm", config.iconBg, config.color)}>
                    {type[1]}
                </div>
                {priceData && (
                    <div className="flex items-center gap-1 text-[10px] bg-white/5 px-2 py-1 rounded text-text-muted">
                        <span className="text-white">
                            ${(Number(priceData.price) / 10 ** priceData.decimals).toFixed(4)}
                        </span>
                    </div>
                )}
            </div>

            <div className="space-y-1">
                {isLoading ? (
                    <Loader2 className="w-6 h-6 animate-spin text-text-muted" />
                ) : (
                    <>
                        <p className="text-3xl font-bold text-white tracking-tight">
                            {formatBalance(balance?.formatted)}
                        </p>
                        <p className="text-sm text-text-muted flex items-center gap-2">
                            {priceLoading ? '...' : formatUSD(usdValue)}
                            <span className="w-1 h-1 rounded-full bg-text-muted" />
                            {type}
                        </p>
                    </>
                )}
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
    );
}

export function FAssetBalanceCards() {
    const { fxrp, fbtc, fdoge, isLoading, isAvailable } = useAllFAssetBalances();

    return (
        <div className="space-y-4">
            {!isAvailable && (
                <div className="text-center py-2">
                    <span className="text-xs bg-yellow-500/10 text-yellow-400 px-3 py-1 rounded border border-yellow-500/20">
                        FAssets available on Flare Mainnet only
                    </span>
                </div>
            )}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <FAssetCard type="FXRP" balance={fxrp} isLoading={isLoading} />
                <FAssetCard type="FBTC" balance={fbtc} isLoading={isLoading} />
                <FAssetCard type="FDOGE" balance={fdoge} isLoading={isLoading} />
            </div>
        </div>
    );
}
