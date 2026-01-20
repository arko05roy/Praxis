"use client";

import { useState } from "react";
import { cn } from "@/lib/utils";
import { TrendingUp, TrendingDown, Loader2, AlertTriangle, X } from "lucide-react";
import { usePerpPosition, useClosePerpPosition, useMarkPrice, PerpPosition } from "@/lib/hooks";
import { formatUnits } from "viem";

interface PositionPanelProps {
    market?: string;
}

export function PositionPanel({ market = "ETH-USD" }: PositionPanelProps) {
    const [closingPosition, setClosingPosition] = useState<'long' | 'short' | null>(null);
    const [slippage, setSlippage] = useState(0.5);

    // Get both long and short positions for the market
    const { data: longPosition, isLoading: longLoading, refetch: refetchLong } = usePerpPosition(market, true);
    const { data: shortPosition, isLoading: shortLoading, refetch: refetchShort } = usePerpPosition(market, false);
    const { data: markPrice } = useMarkPrice(market);

    // Close position hook
    const {
        closeFullPosition,
        isPending,
        isConfirming,
        isSuccess,
        error,
        isAvailable
    } = useClosePerpPosition();

    const isLoading = longLoading || shortLoading;
    const positions: (PerpPosition & { side: 'long' | 'short' })[] = [];

    if (longPosition) positions.push({ ...longPosition, side: 'long' });
    if (shortPosition) positions.push({ ...shortPosition, side: 'short' });

    const formatPrice = (price: bigint | undefined) => {
        if (!price) return "-";
        return `$${Number(formatUnits(price, 8)).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
    };

    const formatSize = (size: bigint | undefined) => {
        if (!size) return "-";
        return Number(formatUnits(size, 18)).toFixed(4);
    };

    const formatPnl = (pnl: bigint | undefined) => {
        if (pnl === undefined) return { value: "-", isPositive: true };
        const isPositive = pnl >= 0n;
        const absValue = isPositive ? pnl : -pnl;
        return {
            value: `${isPositive ? "+" : "-"}$${Number(formatUnits(absValue, 6)).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`,
            isPositive
        };
    };

    const calculatePnlPercent = (pnl: bigint | undefined, margin: bigint | undefined) => {
        if (pnl === undefined || !margin || margin === 0n) return "-";
        const pnlNum = Number(formatUnits(pnl, 6));
        const marginNum = Number(formatUnits(margin, 18));
        if (marginNum === 0) return "-";
        const percent = (pnlNum / marginNum) * 100;
        return `${percent >= 0 ? "+" : ""}${percent.toFixed(2)}%`;
    };

    const handleClosePosition = async (position: PerpPosition & { side: 'long' | 'short' }) => {
        if (!markPrice) return;

        setClosingPosition(position.side);

        // Calculate acceptable price with slippage
        const acceptablePrice = position.side === 'long'
            ? markPrice * BigInt(Math.floor((100 - slippage) * 100)) / 10000n // Lower for closing longs
            : markPrice * BigInt(Math.floor((100 + slippage) * 100)) / 10000n; // Higher for closing shorts

        await closeFullPosition(position.market, position.isLong, acceptablePrice);

        // Refetch positions after closing
        if (isSuccess) {
            refetchLong();
            refetchShort();
            setClosingPosition(null);
        }
    };

    const isProcessing = isPending || isConfirming;

    if (isLoading) {
        return (
            <div className="glass-panel p-6 rounded-2xl flex items-center justify-center h-32">
                <Loader2 className="w-6 h-6 animate-spin text-accent" />
            </div>
        );
    }

    return (
        <div className="glass-panel p-6 rounded-2xl">
            <div className="flex items-center justify-between mb-4">
                <h3 className="text-sm font-semibold text-text-secondary">Open Positions</h3>
                {!isAvailable && (
                    <span className="text-xs bg-yellow-500/10 text-yellow-400 px-2 py-1 rounded border border-yellow-500/20">
                        Mainnet Only
                    </span>
                )}
            </div>

            {error && (
                <div className="bg-red-500/10 border border-red-500/20 rounded-lg p-3 mb-4 flex items-start gap-2">
                    <AlertTriangle className="w-4 h-4 text-red-500 flex-shrink-0 mt-0.5" />
                    <p className="text-xs text-red-400">{error.message?.slice(0, 100)}</p>
                </div>
            )}

            {positions.length > 0 ? (
                <div className="overflow-x-auto">
                    <table className="w-full text-left">
                        <thead className="text-[10px] text-text-muted uppercase tracking-wider border-b border-white/5">
                            <tr>
                                <th className="pb-3 pl-2">Pair</th>
                                <th className="pb-3">Size</th>
                                <th className="pb-3">Entry Price</th>
                                <th className="pb-3">Mark Price</th>
                                <th className="pb-3">Liq. Price</th>
                                <th className="pb-3">PnL</th>
                                <th className="pb-3 text-right pr-2">Action</th>
                            </tr>
                        </thead>
                        <tbody className="text-sm">
                            {positions.map((position) => {
                                const pnlData = formatPnl(position.pnl);
                                const pnlPercent = calculatePnlPercent(position.pnl, position.margin);
                                const isClosing = closingPosition === position.side && isProcessing;

                                return (
                                    <tr key={`${position.market}-${position.side}`} className="group hover:bg-white/5 transition-colors border-b border-white/5 last:border-0">
                                        <td className="py-4 pl-2">
                                            <div className="flex items-center gap-2">
                                                <span className={cn(
                                                    "text-[10px] px-1.5 py-0.5 rounded font-bold uppercase",
                                                    position.side === 'long' ? "bg-green-500/20 text-green-500" : "bg-red-500/20 text-red-500"
                                                )}>
                                                    {position.side} {position.leverage.toFixed(1)}x
                                                </span>
                                                <span className="font-bold text-white">{position.market}</span>
                                            </div>
                                        </td>
                                        <td className="py-4 font-mono text-text-secondary">
                                            {formatSize(position.size)}
                                        </td>
                                        <td className="py-4 font-mono text-text-secondary">
                                            {formatPrice(position.entryPrice)}
                                        </td>
                                        <td className="py-4 font-mono text-white">
                                            {formatPrice(markPrice)}
                                        </td>
                                        <td className="py-4 font-mono text-red-400">
                                            {formatPrice(position.liquidationPrice)}
                                        </td>
                                        <td className="py-4">
                                            <div className={cn("font-bold flex flex-col", pnlData.isPositive ? "text-green-500" : "text-red-500")}>
                                                <span className="flex items-center gap-1">
                                                    {pnlData.isPositive ? <TrendingUp className="w-3 h-3" /> : <TrendingDown className="w-3 h-3" />}
                                                    {pnlData.value}
                                                </span>
                                                <span className="text-[10px] opacity-80">{pnlPercent}</span>
                                            </div>
                                        </td>
                                        <td className="py-4 text-right pr-2">
                                            <button
                                                onClick={() => handleClosePosition(position)}
                                                disabled={isClosing || !isAvailable}
                                                className={cn(
                                                    "px-3 py-1.5 rounded text-xs font-medium transition-colors flex items-center gap-1 ml-auto",
                                                    isClosing
                                                        ? "bg-white/10 text-text-muted cursor-not-allowed"
                                                        : "bg-red-500/10 text-red-400 hover:bg-red-500/20 border border-red-500/20"
                                                )}
                                            >
                                                {isClosing ? (
                                                    <>
                                                        <Loader2 className="w-3 h-3 animate-spin" />
                                                        Closing...
                                                    </>
                                                ) : (
                                                    <>
                                                        <X className="w-3 h-3" />
                                                        Close
                                                    </>
                                                )}
                                            </button>
                                        </td>
                                    </tr>
                                );
                            })}
                        </tbody>
                    </table>
                </div>
            ) : (
                <div className="text-center py-8">
                    <div className="w-12 h-12 rounded-full bg-white/5 flex items-center justify-center mx-auto mb-3">
                        <TrendingUp className="w-6 h-6 text-white/20" />
                    </div>
                    <p className="text-text-muted text-sm">No open positions</p>
                    <p className="text-text-muted text-xs mt-1">Open a position using the order form</p>
                </div>
            )}
        </div>
    );
}
