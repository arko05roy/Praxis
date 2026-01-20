"use client";

import { SwapInterface } from "@/components/swap-aggregator/SwapInterface";
import { QuotesComparison } from "@/components/swap-aggregator/QuotesComparison";
import { useState, useEffect, useCallback } from "react";
import { useAllSwapQuotes, useBestSwapRoute, useAggregatedSwap, useRegisteredAdapters, usePriceImpact, useCommonPrices } from "@/lib/hooks";
import { parseUnits, formatUnits } from "viem";
import { AlertTriangle, CheckCircle2, Loader2 } from "lucide-react";

// Token addresses (will be replaced with proper config)
const TOKEN_ADDRESSES: Record<string, `0x${string}`> = {
    'FLR': '0x1D80c49BbBCd1C0911346656B529DF9E5c2F783d' as `0x${string}`, // WFLR
    'USDC': '0xFbDa5F676cB37624f28265A144A48B0d6e87d3b6' as `0x${string}`,
    'WETH': '0x1502FA4be69d526124D453619276FacCab275d55' as `0x${string}`,
    'sFLR': '0x12e605bc104e93B45e1aD99F9e555f659051c2BB' as `0x${string}`,
};

const TOKEN_DECIMALS: Record<string, number> = {
    'FLR': 18,
    'USDC': 6,
    'WETH': 18,
    'sFLR': 18,
};

export default function SwapAggregatorPage() {
    const [amount, setAmount] = useState("");
    const [fromToken, setFromToken] = useState("FLR");
    const [toToken, setToToken] = useState("USDC");
    const [slippage, setSlippage] = useState(0.5);

    // Get token addresses
    const tokenIn = TOKEN_ADDRESSES[fromToken];
    const tokenOut = TOKEN_ADDRESSES[toToken];
    const decimalsIn = TOKEN_DECIMALS[fromToken] || 18;
    const decimalsOut = TOKEN_DECIMALS[toToken] || 18;

    // Parse amount to bigint
    const amountIn = amount && Number(amount) > 0
        ? parseUnits(amount, decimalsIn)
        : undefined;

    // Fetch quotes from SwapRouter
    const {
        data: quotes,
        bestQuote,
        worstQuote,
        isLoading: quotesLoading,
        error: quotesError,
        refetch: refetchQuotes
    } = useAllSwapQuotes(tokenIn, tokenOut, amountIn);

    // Get best route
    const { data: bestRoute, isLoading: routeLoading } = useBestSwapRoute(tokenIn, tokenOut, amountIn);

    // Get registered adapters
    const { data: adapters, count: adapterCount } = useRegisteredAdapters();

    // Get common prices for rate calculation
    const { data: prices } = useCommonPrices();

    // Calculate price impact
    const expectedRate = prices?.flr && fromToken === 'FLR'
        ? BigInt(Math.floor(prices.flr * 1e6)) // FLR price in USDC terms
        : undefined;

    const { priceImpact, isSevere, isModerate } = usePriceImpact(
        amountIn,
        bestQuote?.amountOut,
        expectedRate,
        decimalsIn,
        decimalsOut
    );

    // Swap execution hook
    const {
        swap,
        isPending: swapPending,
        isConfirming,
        isSuccess,
        error: swapError
    } = useAggregatedSwap();

    // Format quotes for display
    const formattedQuotes = quotes?.map((q, idx) => ({
        dex: q.adapterName || `Adapter ${idx + 1}`,
        amountOut: formatUnits(q.amountOut, decimalsOut),
        fee: formatUnits(q.gasEstimate * 25n, 9), // Estimate gas cost at 25 gwei
        isBest: bestQuote && q.amountOut === bestQuote.amountOut,
        diff: bestQuote && bestQuote.amountOut > 0n
            ? Number((bestQuote.amountOut - q.amountOut) * 10000n / bestQuote.amountOut) / 100
            : 0,
        adapter: q.adapter,
    })) || [];

    // Handle swap execution
    const handleSwap = useCallback(async () => {
        if (!amountIn || !bestQuote) return;

        // Calculate min amount out with slippage
        const minAmountOut = bestQuote.amountOut * BigInt(Math.floor((100 - slippage) * 100)) / 10000n;

        await swap({
            tokenIn,
            tokenOut,
            amountIn,
            minAmountOut,
        });
    }, [amountIn, bestQuote, slippage, swap, tokenIn, tokenOut]);

    // Handle quote update from SwapInterface
    const handleQuoteUpdate = useCallback((newAmount: string, from: string, to: string) => {
        setAmount(newAmount);
        setFromToken(from);
        setToToken(to);
    }, []);

    // Auto-refresh quotes every 15 seconds
    useEffect(() => {
        if (!amountIn) return;
        const interval = setInterval(() => {
            refetchQuotes();
        }, 15000);
        return () => clearInterval(interval);
    }, [amountIn, refetchQuotes]);

    const isLoading = quotesLoading || routeLoading;

    return (
        <div className="max-w-5xl mx-auto">
            <div className="text-center mb-10">
                <h1 className="text-3xl font-bold text-white mb-2">DEX Aggregator</h1>
                <p className="text-text-secondary">Get the best price across all major liquidity sources on Flare Network.</p>
            </div>

            {/* Adapter Status Banner */}
            <div className="mb-6 flex items-center justify-between text-xs">
                <div className="flex items-center gap-4">
                    <span className="text-text-muted">Connected Adapters:</span>
                    <span className="text-white font-medium">{adapterCount} DEXs</span>
                </div>
                {priceImpact !== undefined && priceImpact > 0 && (
                    <div className={`flex items-center gap-2 px-3 py-1 rounded-full ${
                        isSevere ? 'bg-red-500/10 text-red-400' :
                        isModerate ? 'bg-yellow-500/10 text-yellow-400' :
                        'bg-green-500/10 text-green-400'
                    }`}>
                        {isSevere ? <AlertTriangle className="w-3 h-3" /> : <CheckCircle2 className="w-3 h-3" />}
                        <span>Price Impact: {priceImpact.toFixed(2)}%</span>
                    </div>
                )}
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
                <div className="lg:col-span-5">
                    <SwapInterface
                        onQuoteUpdate={handleQuoteUpdate}
                        bestQuote={bestQuote ? formatUnits(bestQuote.amountOut, decimalsOut) : undefined}
                        isLoading={isLoading}
                    />

                    <div className="mt-6 space-y-3">
                        <div className="flex justify-between text-xs text-text-muted px-4">
                            <span>Slippage Tolerance</span>
                            <div className="flex items-center gap-2">
                                {[0.1, 0.5, 1.0].map((s) => (
                                    <button
                                        key={s}
                                        onClick={() => setSlippage(s)}
                                        className={`px-2 py-0.5 rounded ${
                                            slippage === s
                                                ? 'bg-accent text-black'
                                                : 'bg-white/5 text-text-muted hover:bg-white/10'
                                        }`}
                                    >
                                        {s}%
                                    </button>
                                ))}
                            </div>
                        </div>

                        {/* Transaction Status */}
                        {(swapPending || isConfirming) && (
                            <div className="flex items-center justify-center gap-2 text-accent text-sm py-2">
                                <Loader2 className="w-4 h-4 animate-spin" />
                                {swapPending ? 'Confirm in wallet...' : 'Transaction pending...'}
                            </div>
                        )}
                        {isSuccess && (
                            <div className="flex items-center justify-center gap-2 text-green-400 text-sm py-2">
                                <CheckCircle2 className="w-4 h-4" />
                                Swap successful!
                            </div>
                        )}
                        {swapError && (
                            <div className="text-red-400 text-xs text-center py-2">
                                Error: {swapError.message?.slice(0, 50)}...
                            </div>
                        )}
                    </div>
                </div>

                <div className="hidden lg:flex lg:col-span-1 justify-center pt-20 text-white/10">
                    →
                </div>

                <div className="lg:col-span-6">
                    <QuotesComparison
                        quotes={formattedQuotes}
                        isLoading={isLoading}
                        onSwap={handleSwap}
                        swapPending={swapPending || isConfirming}
                    />
                </div>
            </div>
        </div>
    );
}
