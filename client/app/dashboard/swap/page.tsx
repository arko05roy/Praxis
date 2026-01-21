"use client";

import { SwapInterface } from "@/components/swap-aggregator/SwapInterface";
import { QuotesComparison } from "@/components/swap-aggregator/QuotesComparison";
import { useState, useEffect, useCallback, useMemo } from "react";
import { useAllSwapQuotes, useBestSwapRoute, useAggregatedSwap, useRegisteredAdapters, usePriceImpact, useCommonPrices, useBlazeSwapQuote, useBlazeSwapSwap } from "@/lib/hooks";
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

// Token prices in USD for mock quotes (demo fallback when DEX has no liquidity)
const TOKEN_PRICES_USD: Record<string, number> = {
    'FLR': 0.015,
    'USDC': 1.0,
    'WETH': 3500,
    'sFLR': 0.016,
};

// Generate mock quote based on oracle prices (for demo when DEX returns 0)
function generateMockQuote(
    fromToken: string,
    toToken: string,
    amountIn: bigint,
    decimalsIn: number,
    decimalsOut: number
): { amountOut: bigint; adapter: `0x${string}`; adapterName: string; gasEstimate: bigint } | null {
    const fromPrice = TOKEN_PRICES_USD[fromToken];
    const toPrice = TOKEN_PRICES_USD[toToken];

    if (!fromPrice || !toPrice) return null;

    const amountInFloat = Number(formatUnits(amountIn, decimalsIn));
    const valueUsd = amountInFloat * fromPrice;
    const amountOutFloat = valueUsd / toPrice;

    // Apply 0.3% fee (simulating DEX fee)
    const amountOutWithFee = amountOutFloat * 0.997;

    return {
        amountOut: parseUnits(amountOutWithFee.toFixed(decimalsOut), decimalsOut),
        adapter: '0x0000000000000000000000000000000000000001' as `0x${string}`,
        adapterName: 'Mock (Demo)',
        gasEstimate: 150000n,
    };
}

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
        bestQuote: routerBestQuote,
        worstQuote,
        isLoading: quotesLoading,
        error: quotesError,
        refetch: refetchQuotes
    } = useAllSwapQuotes(tokenIn, tokenOut, amountIn);

    // Get best route
    const { data: bestRoute, isLoading: routeLoading } = useBestSwapRoute(tokenIn, tokenOut, amountIn);

    // Get registered adapters
    const { data: adapters, count: adapterCount } = useRegisteredAdapters();

    // FALLBACK: Query BlazeSwap directly if SwapRouter returns no quotes
    const { data: blazeSwapQuote, isLoading: blazeLoading, isAvailable: blazeAvailable } = useBlazeSwapQuote(tokenIn, tokenOut, amountIn);

    // Use BlazeSwap swap hook as fallback
    const { swap: blazeSwap, isPending: blazeSwapPending, isConfirming: blazeConfirming, isSuccess: blazeSuccess, error: blazeError } = useBlazeSwapSwap();

    // Combine quotes: prefer SwapRouter quotes, fallback to BlazeSwap direct, then mock
    const combinedQuotes = useMemo(() => {
        const result = quotes ? [...quotes] : [];

        // Add BlazeSwap direct quote if SwapRouter didn't return it
        if (blazeSwapQuote && blazeSwapQuote.amountOut > 0n) {
            const hasBlazeFromRouter = result.some(q => q.adapterName?.toLowerCase().includes('blaze'));
            if (!hasBlazeFromRouter) {
                result.push(blazeSwapQuote);
            }
        }

        // Check if all quotes are 0 - add mock quote for demo
        const hasValidQuote = result.some(q => q.amountOut > 0n);

        if (!hasValidQuote && amountIn && amountIn > 0n) {
            const mockQuote = generateMockQuote(fromToken, toToken, amountIn, decimalsIn, decimalsOut);
            if (mockQuote) {
                result.push(mockQuote);
            }
        }

        return result.sort((a, b) => (b.amountOut > a.amountOut ? 1 : -1));
    }, [quotes, blazeSwapQuote, amountIn, fromToken, toToken, decimalsIn, decimalsOut]);

    // Best quote from combined sources
    const bestQuote = combinedQuotes[0];

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
    const formattedQuotes = combinedQuotes.map((q, idx) => ({
        dex: q.adapterName || `Adapter ${idx + 1}`,
        amountOut: formatUnits(q.amountOut, decimalsOut),
        fee: formatUnits(q.gasEstimate * 25n, 9), // Estimate gas cost at 25 gwei
        isBest: bestQuote && q.amountOut === bestQuote.amountOut,
        diff: bestQuote && bestQuote.amountOut > 0n
            ? Number((bestQuote.amountOut - q.amountOut) * 10000n / bestQuote.amountOut) / 100
            : 0,
        adapter: q.adapter,
    }));

    // Handle swap execution - use BlazeSwap direct if that's the best quote
    const [mockSwapMessage, setMockSwapMessage] = useState<string | null>(null);

    const handleSwap = useCallback(async () => {
        if (!amountIn || !bestQuote) return;

        // Check if this is a mock quote (demo only)
        if (bestQuote.adapterName === 'Mock (Demo)') {
            setMockSwapMessage(`Demo Mode: Would swap ${formatUnits(amountIn, decimalsIn)} ${fromToken} for ~${formatUnits(bestQuote.amountOut, decimalsOut)} ${toToken}`);
            setTimeout(() => setMockSwapMessage(null), 5000);
            return;
        }

        // Calculate min amount out with slippage
        const minAmountOut = bestQuote.amountOut * BigInt(Math.floor((100 - slippage) * 100)) / 10000n;

        // Check if best quote is from BlazeSwap direct (not via SwapRouter)
        const isBlazeSwapDirect = bestQuote.adapterName === 'BlazeSwap' && blazeSwapQuote?.amountOut === bestQuote.amountOut;

        if (isBlazeSwapDirect) {
            // Use BlazeSwap directly
            await blazeSwap(tokenIn, tokenOut, amountIn, minAmountOut);
        } else {
            // Use aggregated swap via SwapRouter
            await swap({
                tokenIn,
                tokenOut,
                amountIn,
                minAmountOut,
            });
        }
    }, [amountIn, bestQuote, slippage, swap, blazeSwap, blazeSwapQuote, tokenIn, tokenOut, fromToken, toToken, decimalsIn, decimalsOut]);

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

    const isLoading = quotesLoading || routeLoading || blazeLoading;
    const anySwapPending = swapPending || blazeSwapPending;
    const anyConfirming = isConfirming || blazeConfirming;
    const anySuccess = isSuccess || blazeSuccess;
    const anyError = swapError || blazeError;

    // Effective adapter count (includes direct DEX if available)
    const effectiveAdapterCount = adapterCount + (blazeAvailable ? 1 : 0);

    return (
        <div className="max-w-5xl mx-auto">
            <div className="text-center mb-10">
                <h1 className="text-3xl font-bold text-white mb-2">DEX Aggregator</h1>
                <p className="text-text-secondary">Get the best price across all major liquidity sources on Flare Network.</p>
            </div>

            {/* Adapter Status Banner */}
            <div className="mb-6 flex items-center justify-between text-xs">
                <div className="flex items-center gap-4">
                    <span className="text-text-muted">Connected DEXs:</span>
                    <span className="text-white font-medium">{effectiveAdapterCount} sources</span>
                    {blazeAvailable && adapterCount === 0 && (
                        <span className="text-yellow-400">(Direct mode)</span>
                    )}
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
                        {(anySwapPending || anyConfirming) && (
                            <div className="flex items-center justify-center gap-2 text-accent text-sm py-2">
                                <Loader2 className="w-4 h-4 animate-spin" />
                                {anySwapPending ? 'Confirm in wallet...' : 'Transaction pending...'}
                            </div>
                        )}
                        {anySuccess && (
                            <div className="flex items-center justify-center gap-2 text-green-400 text-sm py-2">
                                <CheckCircle2 className="w-4 h-4" />
                                Swap successful!
                            </div>
                        )}
                        {mockSwapMessage && (
                            <div className="flex items-center justify-center gap-2 text-yellow-400 text-sm py-2 bg-yellow-500/10 rounded-lg px-3">
                                <AlertTriangle className="w-4 h-4" />
                                {mockSwapMessage}
                            </div>
                        )}
                        {anyError && (
                            <div className="text-red-400 text-xs text-center py-2">
                                Error: {anyError.message?.slice(0, 50)}...
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
                        swapPending={anySwapPending || anyConfirming}
                    />
                </div>
            </div>
        </div>
    );
}
