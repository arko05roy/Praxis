"use client";

import { useState, useEffect } from "react";
import { Loader2, AlertTriangle, CheckCircle, Info } from "lucide-react";
import { cn } from "@/lib/utils";
import {
    useOpenPerpPosition,
    usePerpMarketInfo,
    useMarkPrice,
    useLiquidationPrice,
    useNativeBalance,
    usePerpPosition,
} from "@/lib/hooks";
import { parseUnits, formatUnits } from "viem";

interface OrderFormProps {
    market?: string;
}

export function OrderForm({ market = "ETH-USD" }: OrderFormProps) {
    const [side, setSide] = useState<'long' | 'short'>('long');
    const [marginInput, setMarginInput] = useState("");
    const [leverage, setLeverage] = useState(5);
    const [slippage, setSlippage] = useState(0.5);

    // Hooks for market data
    const { data: marketInfo, isLoading: marketLoading } = usePerpMarketInfo(market);
    const { data: markPrice, isLoading: priceLoading } = useMarkPrice(market);
    const { data: nativeBalance } = useNativeBalance();
    const { data: existingPosition } = usePerpPosition(market, side === 'long');

    // Hook for opening positions
    const {
        openPosition,
        isPending,
        isConfirming,
        isSuccess,
        error,
        isAvailable
    } = useOpenPerpPosition();

    // Calculate position size from margin and leverage
    const margin = marginInput && Number(marginInput) > 0
        ? parseUnits(marginInput, 18) // WFLR has 18 decimals
        : 0n;
    const positionSize = margin * BigInt(leverage);

    // Calculate acceptable price with slippage
    const acceptablePrice = markPrice
        ? side === 'long'
            ? markPrice * BigInt(Math.floor((100 + slippage) * 100)) / 10000n // Higher for longs
            : markPrice * BigInt(Math.floor((100 - slippage) * 100)) / 10000n  // Lower for shorts
        : 0n;

    // Max leverage from market info
    const maxLeverage = marketInfo?.maxLeverage
        ? Math.min(Number(marketInfo.maxLeverage), 100)
        : 20;

    // Calculate estimated liquidation price
    const estimatedLiqPrice = markPrice && margin > 0n
        ? side === 'long'
            ? markPrice - (markPrice * 10000n / BigInt(leverage * 100)) // Simplified estimate
            : markPrice + (markPrice * 10000n / BigInt(leverage * 100))
        : undefined;

    const handleOrder = async () => {
        if (!margin || margin === 0n || !markPrice) return;

        await openPosition({
            market,
            isLong: side === 'long',
            margin,
            size: positionSize,
            acceptablePrice,
        });

        if (isSuccess) {
            setMarginInput("");
        }
    };

    const formatPrice = (price: bigint | undefined) => {
        if (!price) return "-";
        return `$${Number(formatUnits(price, 8)).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
    };

    const isProcessing = isPending || isConfirming;
    const canSubmit = margin > 0n && !isProcessing && isAvailable && marketInfo?.isActive;

    // Reset success message after 3 seconds
    useEffect(() => {
        if (isSuccess) {
            const timer = setTimeout(() => setMarginInput(""), 3000);
            return () => clearTimeout(timer);
        }
    }, [isSuccess]);

    return (
        <div className="glass-panel p-6 rounded-2xl h-full">
            {/* Long/Short Toggle */}
            <div className="grid grid-cols-2 bg-black/20 p-1 rounded-xl mb-6">
                <button
                    onClick={() => setSide('long')}
                    className={cn(
                        "py-2 rounded-lg text-sm font-bold transition-all",
                        side === 'long' ? "bg-green-500/20 text-green-500 shadow-sm" : "text-text-muted hover:text-white"
                    )}
                >
                    Buy / Long
                </button>
                <button
                    onClick={() => setSide('short')}
                    className={cn(
                        "py-2 rounded-lg text-sm font-bold transition-all",
                        side === 'short' ? "bg-red-500/20 text-red-500 shadow-sm" : "text-text-muted hover:text-white"
                    )}
                >
                    Sell / Short
                </button>
            </div>

            {/* Protocol availability warning */}
            {!isAvailable && (
                <div className="bg-yellow-500/10 border border-yellow-500/20 rounded-lg p-3 mb-4 flex items-start gap-2">
                    <AlertTriangle className="w-4 h-4 text-yellow-500 flex-shrink-0 mt-0.5" />
                    <p className="text-xs text-yellow-400">SparkDEX Eternal is only available on Flare mainnet</p>
                </div>
            )}

            {/* Market inactive warning */}
            {isAvailable && marketInfo && !marketInfo.isActive && (
                <div className="bg-red-500/10 border border-red-500/20 rounded-lg p-3 mb-4 flex items-start gap-2">
                    <AlertTriangle className="w-4 h-4 text-red-500 flex-shrink-0 mt-0.5" />
                    <p className="text-xs text-red-400">This market is currently inactive</p>
                </div>
            )}

            <div className="space-y-6">
                {/* Margin Input */}
                <div className="space-y-2">
                    <div className="flex justify-between text-xs">
                        <span className="text-text-muted">Margin (WFLR)</span>
                        <button
                            onClick={() => nativeBalance && setMarginInput(formatUnits(nativeBalance * 9n / 10n, 18))}
                            className="text-text-muted hover:text-accent transition-colors"
                        >
                            Balance: {nativeBalance ? Number(formatUnits(nativeBalance, 18)).toFixed(2) : "0.00"}
                        </button>
                    </div>
                    <div className="bg-background-secondary p-3 rounded-xl border border-white/5 flex items-center justify-between">
                        <input
                            type="number"
                            value={marginInput}
                            onChange={(e) => setMarginInput(e.target.value)}
                            placeholder="0.00"
                            className="bg-transparent text-lg font-bold text-white outline-none w-full"
                        />
                        <span className="text-xs font-bold text-text-muted">WFLR</span>
                    </div>
                </div>

                {/* Leverage Slider */}
                <div className="space-y-3">
                    <div className="flex justify-between text-xs">
                        <span className="text-text-muted">Leverage</span>
                        <span className="text-white font-bold">{leverage}x</span>
                    </div>
                    <input
                        type="range"
                        min="1"
                        max={maxLeverage}
                        step="1"
                        value={leverage}
                        onChange={(e) => setLeverage(Number(e.target.value))}
                        className="w-full accent-accent h-1 bg-white/10 rounded-lg appearance-none cursor-pointer"
                    />
                    <div className="flex justify-between text-[10px] text-text-muted">
                        <span>1x</span>
                        <span>{Math.floor(maxLeverage / 4)}x</span>
                        <span>{Math.floor(maxLeverage / 2)}x</span>
                        <span>{maxLeverage}x</span>
                    </div>
                </div>

                {/* Summary */}
                <div className="bg-white/5 rounded-xl p-4 space-y-2 text-xs">
                    <div className="flex justify-between">
                        <span className="text-text-muted">Mark Price</span>
                        <span className="text-white">
                            {priceLoading ? <Loader2 className="w-3 h-3 animate-spin" /> : formatPrice(markPrice)}
                        </span>
                    </div>
                    <div className="flex justify-between">
                        <span className="text-text-muted">Position Size</span>
                        <span className="text-white">
                            {margin > 0n ? Number(formatUnits(positionSize, 18)).toFixed(2) : "0.00"} WFLR
                        </span>
                    </div>
                    <div className="flex justify-between">
                        <span className="text-text-muted">Est. Liquidation</span>
                        <span className="text-error font-medium">
                            {formatPrice(estimatedLiqPrice)}
                        </span>
                    </div>
                    <div className="flex justify-between">
                        <span className="text-text-muted">Slippage</span>
                        <div className="flex items-center gap-1">
                            {[0.1, 0.5, 1.0].map((s) => (
                                <button
                                    key={s}
                                    onClick={() => setSlippage(s)}
                                    className={cn(
                                        "px-1.5 py-0.5 rounded text-[10px]",
                                        slippage === s
                                            ? "bg-accent text-black"
                                            : "bg-white/10 text-text-muted hover:text-white"
                                    )}
                                >
                                    {s}%
                                </button>
                            ))}
                        </div>
                    </div>
                    {marketInfo?.fee && (
                        <div className="flex justify-between border-t border-white/5 pt-2 mt-2">
                            <span className="text-text-muted">Trading Fee</span>
                            <span className="text-white">
                                {(Number(marketInfo.fee) / 10000).toFixed(2)}%
                            </span>
                        </div>
                    )}
                </div>

                {/* Existing position warning */}
                {existingPosition && (
                    <div className="bg-blue-500/10 border border-blue-500/20 rounded-lg p-3 flex items-start gap-2">
                        <Info className="w-4 h-4 text-blue-400 flex-shrink-0 mt-0.5" />
                        <p className="text-xs text-blue-400">
                            You have an existing {side} position. This order will increase your position.
                        </p>
                    </div>
                )}

                {/* Error message */}
                {error && (
                    <div className="bg-red-500/10 border border-red-500/20 rounded-lg p-3 flex items-start gap-2">
                        <AlertTriangle className="w-4 h-4 text-red-500 flex-shrink-0 mt-0.5" />
                        <p className="text-xs text-red-400">{error.message?.slice(0, 100)}</p>
                    </div>
                )}

                {/* Success message */}
                {isSuccess && (
                    <div className="bg-green-500/10 border border-green-500/20 rounded-lg p-3 flex items-center gap-2">
                        <CheckCircle className="w-4 h-4 text-green-500" />
                        <p className="text-xs text-green-400">Order submitted successfully!</p>
                    </div>
                )}

                {/* Submit Button */}
                <button
                    onClick={handleOrder}
                    disabled={!canSubmit}
                    className={cn(
                        "w-full font-bold py-4 rounded-xl transition-all shadow-lg flex items-center justify-center gap-2",
                        !canSubmit && "opacity-50 cursor-not-allowed",
                        side === 'long'
                            ? "bg-green-500 hover:bg-green-600 text-white shadow-green-900/20"
                            : "bg-red-500 hover:bg-red-600 text-white shadow-red-900/20"
                    )}
                >
                    {isProcessing ? (
                        <>
                            <Loader2 className="animate-spin w-5 h-5" />
                            {isPending ? "Confirm in wallet..." : "Processing..."}
                        </>
                    ) : (
                        side === 'long' ? 'Place Long Order' : 'Place Short Order'
                    )}
                </button>
            </div>
        </div>
    );
}
