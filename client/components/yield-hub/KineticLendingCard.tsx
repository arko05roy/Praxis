"use client";

import { useState, useEffect } from "react";
import {
    useKineticSupply,
    useKineticSupplyAPY,
    useKineticMarketInfo,
    useKineticBalance,
    useTokenBalance,
    useExternalProtocolsAvailable,
    useApproveVault,
    useAllowance,
} from "@/lib/hooks";
import { Landmark, Loader2, AlertTriangle, CheckCircle, Wallet } from "lucide-react";
import { parseUnits, formatUnits } from "viem";
import { cn } from "@/lib/utils";
import { useRouter, useSearchParams } from "next/navigation";

// Kinetic kToken addresses (mainnet)
const KINETIC_MARKETS = {
    USDC: {
        kToken: '0xDEeBaBe05BDA7e8C1740873abF715f16164C29B8' as `0x${string}`,
        underlying: '0xFbDa5F676cB37624f28265A144A48B0d6e87d3b6' as `0x${string}`,
        decimals: 6,
        symbol: 'USDC',
    },
    WETH: {
        kToken: '0x5C2400019017AE61F811D517D088Df732642DbD0' as `0x${string}`,
        underlying: '0x1502FA4be69d526124D453619276FacCab275d3D' as `0x${string}`,
        decimals: 18,
        symbol: 'WETH',
    },
    sFLR: {
        kToken: '0x291487beC339c2fE5D83DD45F0a15EFC9Ac45656' as `0x${string}`,
        underlying: '0x12e605bc104e93B45e1aD99F9e555f659051c2BB' as `0x${string}`,
        decimals: 18,
        symbol: 'sFLR',
    },
};

type MarketKey = keyof typeof KINETIC_MARKETS;

export function KineticLendingCard() {
    const router = useRouter();
    const searchParams = useSearchParams();
    const [selectedMarket, setSelectedMarket] = useState<MarketKey>((searchParams?.get("market") as MarketKey) || "USDC");
    const [amount, setAmount] = useState(searchParams?.get("amount") || "");

    const isAvailable = useExternalProtocolsAvailable();
    const market = KINETIC_MARKETS[selectedMarket];

    // Market data hooks
    const { supplyAPY, isAvailable: apyAvailable } = useKineticSupplyAPY(market.kToken);
    const { totalSupply, utilization, isAvailable: marketAvailable } = useKineticMarketInfo(market.kToken);

    // User balance hooks
    const { data: underlyingBalance, isLoading: balanceLoading } = useTokenBalance(market.underlying);
    const { underlyingBalance: suppliedBalance, isLoading: suppliedLoading } = useKineticBalance(market.kToken);

    // Allowance for ERC20 approval
    const { data: allowance, refetch: refetchAllowance } = useAllowance(market.underlying, market.kToken);

    // Supply hook
    const {
        supply,
        isPending,
        isConfirming,
        isSuccess,
        error,
    } = useKineticSupply();

    // Approval hook (reusing vault approve)
    const {
        approve,
        isPending: approvePending,
        isConfirming: approveConfirming,
        isSuccess: approveSuccess,
    } = useApproveVault();

    // Parse amount
    const parsedAmount = amount && Number(amount) > 0
        ? parseUnits(amount, market.decimals)
        : 0n;

    const needsApproval = parsedAmount > 0n && (allowance ?? 0n) < parsedAmount;
    const isProcessing = isPending || isConfirming || approvePending || approveConfirming;

    // Format TVL
    const formatTVL = (value: bigint | undefined, decimals: number) => {
        if (!value) return '-';
        const num = Number(formatUnits(value, decimals));
        if (num >= 1000000) return `${(num / 1000000).toFixed(2)}M`;
        if (num >= 1000) return `${(num / 1000).toFixed(1)}k`;
        return num.toFixed(2);
    };

    // Handle approve
    const handleApprove = async () => {
        await approve(market.underlying, market.kToken);
    };

    // Handle supply
    const handleSupply = async () => {
        if (parsedAmount === 0n) return;
        await supply(market.kToken, parsedAmount);
    };

    // Refetch allowance after successful approval and reload
    useEffect(() => {
        if (approveSuccess) {
            refetchAllowance();

            const params = new URLSearchParams();
            if (amount) params.set("amount", amount);
            if (selectedMarket) params.set("market", selectedMarket);

            router.push(`?${params.toString()}`, { scroll: false });

            setTimeout(() => {
                window.location.reload();
            }, 1000);
        }
    }, [approveSuccess, refetchAllowance, amount, selectedMarket, router]);

    // Reset form after successful supply
    useEffect(() => {
        if (isSuccess) {
            const timer = setTimeout(() => setAmount(""), 3000);
            return () => clearTimeout(timer);
        }
    }, [isSuccess]);

    return (
        <div className="glass-panel p-6 rounded-2xl relative overflow-hidden">
            {/* Background Decoration */}
            <div className="absolute top-0 left-0 w-40 h-40 bg-blue-500/10 rounded-full blur-3xl -translate-y-1/2 -translate-x-1/2" />

            <div className="flex items-center justify-between mb-6 relative z-10">
                <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-blue-500/20 flex items-center justify-center text-blue-400">
                        <Landmark className="w-5 h-5" />
                    </div>
                    <div>
                        <h3 className="font-bold text-white">Kinetic Lending</h3>
                        <p className="text-xs text-text-muted">Supply assets, earn yield</p>
                    </div>
                </div>
                {!isAvailable && (
                    <span className="text-xs bg-yellow-500/10 text-yellow-400 px-2 py-1 rounded border border-yellow-500/20">
                        Mainnet Only
                    </span>
                )}
            </div>

            {/* Market Selector Tabs */}
            <div className="flex gap-2 mb-6 relative z-10">
                {(Object.keys(KINETIC_MARKETS) as MarketKey[]).map((m) => (
                    <button
                        key={m}
                        onClick={() => setSelectedMarket(m)}
                        className={cn(
                            "px-4 py-2 rounded-lg text-xs font-bold transition-all border",
                            selectedMarket === m
                                ? "bg-blue-500/20 border-blue-500 text-blue-400"
                                : "bg-white/5 border-transparent text-text-muted hover:bg-white/10"
                        )}
                    >
                        {m}
                    </button>
                ))}
            </div>

            <div className="grid grid-cols-2 gap-4 mb-6 relative z-10">
                <div className="bg-black/20 p-3 rounded-xl border border-white/5">
                    <p className="text-xs text-text-muted mb-1">Supply APY</p>
                    <p className="text-xl font-bold text-green-400">
                        {supplyAPY ? `${supplyAPY.toFixed(2)}%` : '-'}
                    </p>
                </div>
                <div className="bg-black/20 p-3 rounded-xl border border-white/5">
                    <p className="text-xs text-text-muted mb-1">Total Supplied</p>
                    <p className="text-xl font-bold text-white">
                        ${formatTVL(totalSupply, market.decimals)}
                    </p>
                </div>
            </div>

            {/* User's supplied balance */}
            {suppliedBalance && suppliedBalance > 0n && (
                <div className="bg-blue-500/10 border border-blue-500/20 rounded-lg p-3 mb-4 relative z-10">
                    <div className="flex items-center justify-between">
                        <span className="text-xs text-blue-400 flex items-center gap-1">
                            <Wallet className="w-3 h-3" /> Your Supply
                        </span>
                        <span className="text-sm font-bold text-white">
                            {Number(formatUnits(suppliedBalance, market.decimals)).toLocaleString(undefined, { maximumFractionDigits: 4 })} {market.symbol}
                        </span>
                    </div>
                </div>
            )}

            <div className="space-y-4 relative z-10">
                <div className="bg-background-secondary p-4 rounded-xl border border-white/5">
                    <div className="flex justify-between mb-2">
                        <label className="text-xs text-text-muted">Supply {selectedMarket}</label>
                        <button
                            onClick={() => underlyingBalance && setAmount(formatUnits(underlyingBalance.value, underlyingBalance.decimals))}
                            className="text-xs text-text-muted hover:text-blue-400 transition-colors"
                        >
                            Available: {balanceLoading ? '...' : underlyingBalance
                                ? Number(formatUnits(underlyingBalance.value, underlyingBalance.decimals)).toLocaleString(undefined, { maximumFractionDigits: 4 })
                                : '0'}
                        </button>
                    </div>
                    <div className="flex items-center gap-2">
                        <input
                            type="number"
                            value={amount}
                            onChange={(e) => setAmount(e.target.value)}
                            placeholder="0.0"
                            className="bg-transparent text-2xl font-bold text-white outline-none w-full"
                        />
                        <button
                            onClick={() => underlyingBalance && setAmount(formatUnits(underlyingBalance.value, underlyingBalance.decimals))}
                            className="text-xs bg-white/10 hover:bg-white/20 text-blue-400 px-2 py-1 rounded transition-colors"
                        >
                            MAX
                        </button>
                    </div>
                </div>

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
                        <p className="text-xs text-green-400">Supply successful!</p>
                    </div>
                )}

                {/* Approve or Supply Button */}
                {needsApproval ? (
                    <button
                        onClick={handleApprove}
                        disabled={isProcessing || !isAvailable}
                        className="w-full bg-blue-600 hover:bg-blue-500 text-white font-bold py-4 rounded-xl transition-all shadow-lg shadow-blue-900/20 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                    >
                        {approvePending || approveConfirming ? (
                            <>
                                <Loader2 className="animate-spin w-5 h-5" />
                                {approvePending ? "Confirm in wallet..." : "Approving..."}
                            </>
                        ) : (
                            `Approve ${selectedMarket}`
                        )}
                    </button>
                ) : (
                    <button
                        onClick={handleSupply}
                        disabled={!amount || parsedAmount === 0n || isProcessing || !isAvailable}
                        className="w-full bg-blue-600 hover:bg-blue-500 text-white font-bold py-4 rounded-xl transition-all shadow-lg shadow-blue-900/20 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                    >
                        {isPending || isConfirming ? (
                            <>
                                <Loader2 className="animate-spin w-5 h-5" />
                                {isPending ? "Confirm in wallet..." : "Supplying..."}
                            </>
                        ) : (
                            "Supply Assets"
                        )}
                    </button>
                )}

                {/* Utilization indicator */}
                {utilization !== undefined && utilization > 0 && (
                    <p className="text-[10px] text-text-muted text-center">
                        Market utilization: {utilization.toFixed(1)}%
                    </p>
                )}
            </div>
        </div>
    );
}
