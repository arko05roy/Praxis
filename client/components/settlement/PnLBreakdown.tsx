"use client";

import { useEnhancedPrice } from "@/lib/hooks";
import { formatUnits } from "viem";
import { Info } from "lucide-react";
import { PriceFreshnessIndicator, FTSOSourceBadge, StalenessWarningBadge } from "@/components/ui/PriceFeedIndicators";
import { TrustlessBadgeInline } from "@/components/ui/TrustlessPriceBadge";

interface PnLBreakdownProps {
    entryPrice: bigint;
    entryPriceDecimals: number;
    entryTimestamp?: Date;
    feedName: string;
    className?: string;
}

export function PnLBreakdown({
    entryPrice,
    entryPriceDecimals,
    entryTimestamp,
    feedName,
    className,
}: PnLBreakdownProps) {
    const { enhanced: currentPrice } = useEnhancedPrice(feedName);

    const formattedEntryPrice = Number(formatUnits(entryPrice, entryPriceDecimals)).toLocaleString(undefined, {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
    });

    const formattedCurrentPrice = currentPrice
        ? Number(currentPrice.formatted).toLocaleString(undefined, {
            minimumFractionDigits: 2,
            maximumFractionDigits: 2,
        })
        : '-';

    const formattedEntryDate = entryTimestamp
        ? entryTimestamp.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
        : undefined;

    return (
        <div className={className}>
            <div className="glass-panel p-4 rounded-xl space-y-3">
                <h3 className="text-sm font-semibold text-white flex items-center gap-2">
                    <Info className="w-4 h-4 text-accent" />
                    Price Verification
                </h3>

                <div className="space-y-3 text-sm">
                    {/* Entry Price Row */}
                    <div className="flex justify-between items-start">
                        <span className="text-text-muted">Entry Price</span>
                        <div className="text-right">
                            <span className="text-white font-mono">${formattedEntryPrice}</span>
                            {formattedEntryDate && (
                                <p className="text-[10px] text-text-muted mt-0.5">{formattedEntryDate}</p>
                            )}
                        </div>
                    </div>

                    {/* Current FTSO Price Row */}
                    <div className="flex justify-between items-start">
                        <span className="text-text-muted">Current FTSO</span>
                        <div className="text-right">
                            <div className="flex items-center gap-2 justify-end">
                                <span className="text-white font-mono">${formattedCurrentPrice}</span>
                                {currentPrice && (
                                    <>
                                        <PriceFreshnessIndicator freshness={currentPrice.freshness} />
                                        <FTSOSourceBadge source={currentPrice.source} size="sm" />
                                    </>
                                )}
                            </div>
                            {currentPrice?.freshness === 'stale' ? (
                                <div className="mt-1 flex justify-end">
                                    <StalenessWarningBadge />
                                </div>
                            ) : currentPrice ? (
                                <span className="text-[10px] text-text-muted">{currentPrice.ageFormatted}</span>
                            ) : null}
                        </div>
                    </div>
                </div>

                {/* Info notice */}
                <div className="border-t border-white/5 pt-3 mt-3">
                    <div className="flex items-start gap-2 bg-accent/5 rounded-lg p-2">
                        <Info className="w-3.5 h-3.5 text-accent flex-shrink-0 mt-0.5" />
                        <p className="text-[11px] text-accent/80">
                            Settlement uses trustless FTSO prices from Flare's decentralized oracle network.
                        </p>
                    </div>
                </div>
            </div>
        </div>
    );
}

// Compact version for inline display in settlement modal
interface PnLPriceVerificationProps {
    entryPrice: string;
    currentPrice: string;
    feedName: string;
}

export function PnLPriceVerification({ entryPrice, currentPrice, feedName }: PnLPriceVerificationProps) {
    const { enhanced } = useEnhancedPrice(feedName);

    return (
        <div className="bg-white/5 rounded-lg p-3 space-y-2 text-xs">
            <div className="flex justify-between">
                <span className="text-text-muted">Entry</span>
                <span className="text-white font-mono">${entryPrice}</span>
            </div>
            <div className="flex justify-between items-center">
                <span className="text-text-muted">Current</span>
                <div className="flex items-center gap-1.5">
                    <span className="text-white font-mono">${currentPrice}</span>
                    {enhanced && (
                        <>
                            <PriceFreshnessIndicator freshness={enhanced.freshness} />
                            <TrustlessBadgeInline />
                        </>
                    )}
                </div>
            </div>
        </div>
    );
}
