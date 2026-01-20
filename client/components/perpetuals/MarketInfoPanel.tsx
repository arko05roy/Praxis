"use client";

import { usePerpMarketInfo, useMarkPrice, useFundingRate, useIndexPrice } from "@/lib/hooks";
import { Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { formatUnits } from "viem";

interface MarketInfoPanelProps {
    marketId: string;
}

export function MarketInfoPanel({ marketId }: MarketInfoPanelProps) {
    // Real hooks for market data
    const { data: marketInfo, isLoading: marketLoading, isAvailable } = usePerpMarketInfo(marketId);
    const { data: markPrice, isLoading: priceLoading } = useMarkPrice(marketId);
    const { data: indexPrice, isLoading: indexLoading } = useIndexPrice(marketId);
    const { data: fundingRateData, fundingRateApr, isLoading: fundingLoading } = useFundingRate(marketId);

    const isLoading = marketLoading || priceLoading;

    // Format price from 8 decimals
    const formatPrice = (price: bigint | undefined) => {
        if (!price) return "-";
        return Number(formatUnits(price, 8)).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 });
    };

    // Format funding rate (per 8 hours)
    const formatFundingRate = (rate: bigint | undefined) => {
        if (!rate) return "-";
        // Funding rate is typically in 18 decimals, convert to percentage
        const rateNum = Number(formatUnits(rate, 18)) * 100;
        return rateNum.toFixed(4);
    };

    // Format open interest
    const formatOI = (value: bigint | undefined) => {
        if (!value) return "-";
        const num = Number(formatUnits(value, 18)); // WFLR decimals
        if (num >= 1000000) return `$${(num / 1000000).toFixed(2)}M`;
        if (num >= 1000) return `$${(num / 1000).toFixed(1)}k`;
        return `$${num.toFixed(2)}`;
    };

    // Calculate total OI from long + short
    const totalOI = marketInfo?.longOI && marketInfo?.shortOI
        ? marketInfo.longOI + marketInfo.shortOI
        : undefined;

    // Determine funding rate direction
    const fundingIsPositive = fundingRateData !== undefined && fundingRateData >= 0n;

    return (
        <div className="glass-panel p-6 rounded-2xl">
            <div className="flex justify-between items-start mb-6">
                <div>
                    <h2 className="text-2xl font-bold text-white flex items-center gap-2">
                        {marketId}
                        <span className="text-sm font-normal text-text-muted bg-white/5 px-2 py-0.5 rounded">Perp</span>
                        {marketInfo?.isActive !== undefined && (
                            <span className={cn(
                                "text-xs px-2 py-0.5 rounded",
                                marketInfo.isActive
                                    ? "bg-green-500/10 text-green-500"
                                    : "bg-red-500/10 text-red-500"
                            )}>
                                {marketInfo.isActive ? "Active" : "Inactive"}
                            </span>
                        )}
                    </h2>
                    {!isAvailable && (
                        <p className="text-xs text-yellow-400 mt-1">SparkDEX Eternal - Mainnet Only</p>
                    )}
                </div>
                <div className="text-right">
                    {priceLoading ? (
                        <Loader2 className="w-6 h-6 animate-spin text-accent ml-auto" />
                    ) : (
                        <>
                            <p className="text-3xl font-bold text-white tracking-tight">${formatPrice(markPrice)}</p>
                            <p className="text-xs text-text-muted">Mark Price</p>
                        </>
                    )}
                </div>
            </div>

            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div className="bg-white/5 rounded-xl p-3 border border-white/5">
                    <p className="text-[10px] text-text-muted mb-1">Index Price</p>
                    <p className="font-mono text-white">
                        {indexLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : `$${formatPrice(indexPrice)}`}
                    </p>
                </div>

                <div className="bg-white/5 rounded-xl p-3 border border-white/5">
                    <p className="text-[10px] text-text-muted mb-1">Funding / 8h</p>
                    <p className={cn("font-mono", fundingIsPositive ? "text-yellow-500" : "text-green-500")}>
                        {fundingLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : `${formatFundingRate(fundingRateData)}%`}
                    </p>
                </div>

                <div className="bg-white/5 rounded-xl p-3 border border-white/5">
                    <p className="text-[10px] text-text-muted mb-1">Max Leverage</p>
                    <p className="font-mono text-white">
                        {marketInfo?.maxLeverage ? `${marketInfo.maxLeverage}x` : "-"}
                    </p>
                </div>

                <div className="bg-white/5 rounded-xl p-3 border border-white/5">
                    <p className="text-[10px] text-text-muted mb-1">Open Interest</p>
                    <p className="font-mono text-white">
                        {formatOI(totalOI)}
                    </p>
                </div>
            </div>

            {/* Long/Short OI breakdown */}
            {marketInfo?.longOI && marketInfo?.shortOI && (
                <div className="mt-4 flex items-center gap-2">
                    <div className="flex-1 bg-green-500/20 rounded-l-full h-2" style={{
                        width: `${Number(marketInfo.longOI) / (Number(marketInfo.longOI) + Number(marketInfo.shortOI)) * 100}%`
                    }} />
                    <div className="flex-1 bg-red-500/20 rounded-r-full h-2" style={{
                        width: `${Number(marketInfo.shortOI) / (Number(marketInfo.longOI) + Number(marketInfo.shortOI)) * 100}%`
                    }} />
                </div>
            )}
            {marketInfo?.longOI && marketInfo?.shortOI && (
                <div className="mt-1 flex justify-between text-[10px] text-text-muted">
                    <span className="text-green-500">Long {formatOI(marketInfo.longOI)}</span>
                    <span className="text-red-500">Short {formatOI(marketInfo.shortOI)}</span>
                </div>
            )}
        </div>
    );
}
