"use client";

import { useEstimateSettlement, useEstimatePnl, useFeeBreakdown, useCanSettle, useSettleERT, useForceSettleERT } from "@/lib/hooks";
import { formatUnits } from "viem";
import { X, Loader2, AlertTriangle, CheckCircle, TrendingUp, TrendingDown, DollarSign, Shield, Percent } from "lucide-react";
import { cn } from "@/lib/utils";

interface SettlementModalProps {
    ertId: bigint;
    isOpen: boolean;
    onClose: () => void;
    isExpired?: boolean;
}

export function SettlementModal({ ertId, isOpen, onClose, isExpired }: SettlementModalProps) {
    // Settlement estimation hooks
    const { data: settlement, isLoading: settlementLoading } = useEstimateSettlement(ertId);
    const { data: pnl, isProfitable, isLoading: pnlLoading } = useEstimatePnl(ertId);
    const { data: feeBreakdown, isLoading: feeLoading } = useFeeBreakdown(ertId, pnl);
    const { data: canSettleResult, isLoading: canSettleLoading } = useCanSettle(ertId);

    // Settlement execution hooks
    const {
        settle,
        isPending: settlePending,
        isConfirming: settleConfirming,
        isSuccess: settleSuccess,
        error: settleError
    } = useSettleERT();

    const {
        forceSettle,
        isPending: forcePending,
        isConfirming: forceConfirming,
        isSuccess: forceSuccess,
        error: forceError
    } = useForceSettleERT();

    if (!isOpen) return null;

    const isLoading = settlementLoading || pnlLoading || feeLoading || canSettleLoading;
    const isPending = settlePending || settleConfirming || forcePending || forceConfirming;
    const isSuccess = settleSuccess || forceSuccess;
    const error = settleError || forceError;

    const handleSettle = async () => {
        await settle(ertId);
    };

    const handleForceSettle = async () => {
        await forceSettle(ertId);
    };

    const formatUSD = (value: bigint | undefined) => {
        if (value === undefined) return "-";
        const isNegative = value < 0n;
        const absValue = isNegative ? -value : value;
        return `${isNegative ? "-" : ""}$${Number(formatUnits(absValue, 6)).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
            {/* Backdrop */}
            <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />

            {/* Modal */}
            <div className="relative bg-background-secondary border border-white/10 rounded-2xl p-6 w-full max-w-lg mx-4 shadow-2xl">
                {/* Header */}
                <div className="flex items-center justify-between mb-6">
                    <div>
                        <h2 className="text-xl font-bold text-white">Settle ERT #{ertId.toString()}</h2>
                        <p className="text-sm text-text-muted">Review settlement details before confirming</p>
                    </div>
                    <button
                        onClick={onClose}
                        className="p-2 hover:bg-white/10 rounded-full transition-colors text-text-muted hover:text-white"
                    >
                        <X className="w-5 h-5" />
                    </button>
                </div>

                {isLoading ? (
                    <div className="flex items-center justify-center py-12">
                        <Loader2 className="w-8 h-8 animate-spin text-accent" />
                    </div>
                ) : isSuccess ? (
                    <div className="text-center py-8">
                        <div className="w-16 h-16 bg-accent/10 rounded-full flex items-center justify-center mx-auto mb-4">
                            <CheckCircle className="w-8 h-8 text-accent" />
                        </div>
                        <h3 className="text-lg font-bold text-white mb-2">Settlement Complete!</h3>
                        <p className="text-text-muted text-sm">Your ERT has been successfully settled.</p>
                        <button
                            onClick={onClose}
                            className="mt-6 bg-accent hover:bg-accent-hover text-black font-bold py-3 px-6 rounded-xl transition-all"
                        >
                            Close
                        </button>
                    </div>
                ) : (
                    <>
                        {/* PnL Summary */}
                        <div className={cn(
                            "p-4 rounded-xl mb-4",
                            isProfitable ? "bg-green-500/10 border border-green-500/20" : "bg-red-500/10 border border-red-500/20"
                        )}>
                            <div className="flex items-center justify-between">
                                <div className="flex items-center gap-3">
                                    {isProfitable ? (
                                        <TrendingUp className="w-6 h-6 text-green-500" />
                                    ) : (
                                        <TrendingDown className="w-6 h-6 text-red-500" />
                                    )}
                                    <div>
                                        <p className="text-xs text-text-muted">Total PnL</p>
                                        <p className={cn("text-2xl font-bold", isProfitable ? "text-green-500" : "text-red-500")}>
                                            {formatUSD(settlement?.totalPnl)}
                                        </p>
                                    </div>
                                </div>
                                <div className={cn(
                                    "text-xs px-2 py-1 rounded",
                                    isProfitable ? "bg-green-500/20 text-green-400" : "bg-red-500/20 text-red-400"
                                )}>
                                    {isProfitable ? "PROFITABLE" : "LOSS"}
                                </div>
                            </div>
                        </div>

                        {/* Fee Breakdown */}
                        <div className="glass-panel p-4 rounded-xl mb-4 space-y-3">
                            <h3 className="text-sm font-semibold text-white flex items-center gap-2">
                                <Percent className="w-4 h-4 text-accent" /> Fee Breakdown
                            </h3>

                            <div className="space-y-2 text-sm">
                                <div className="flex justify-between">
                                    <span className="text-text-muted">LP Base Fee</span>
                                    <span className="text-white">{formatUSD(settlement?.lpBaseFee)}</span>
                                </div>
                                <div className="flex justify-between">
                                    <span className="text-text-muted">LP Profit Share (20%)</span>
                                    <span className="text-white">{formatUSD(settlement?.lpProfitShare)}</span>
                                </div>
                                <div className="flex justify-between">
                                    <span className="text-text-muted">Insurance Fund (2%)</span>
                                    <span className="text-white">{formatUSD(settlement?.insuranceFee)}</span>
                                </div>
                                <div className="border-t border-white/10 pt-2 flex justify-between font-bold">
                                    <span className="text-white">Your Profit</span>
                                    <span className={isProfitable ? "text-accent" : "text-red-400"}>
                                        {formatUSD(settlement?.executorProfit)}
                                    </span>
                                </div>
                            </div>
                        </div>

                        {/* Capital & Stake Returns */}
                        <div className="grid grid-cols-2 gap-4 mb-6">
                            <div className="glass-panel p-4 rounded-xl">
                                <div className="flex items-center gap-2 mb-2">
                                    <DollarSign className="w-4 h-4 text-accent" />
                                    <span className="text-xs text-text-muted">Capital Returned</span>
                                </div>
                                <p className="text-lg font-bold text-white">{formatUSD(settlement?.capitalReturned)}</p>
                            </div>
                            <div className="glass-panel p-4 rounded-xl">
                                <div className="flex items-center gap-2 mb-2">
                                    <Shield className="w-4 h-4 text-accent" />
                                    <span className="text-xs text-text-muted">Stake Returned</span>
                                </div>
                                <p className="text-lg font-bold text-white">{formatUSD(settlement?.stakeReturned)}</p>
                                {settlement?.stakeSlashed && settlement.stakeSlashed > 0n && (
                                    <p className="text-xs text-red-400">-{formatUSD(settlement.stakeSlashed)} slashed</p>
                                )}
                            </div>
                        </div>

                        {/* Settle Status Warning */}
                        {canSettleResult && !canSettleResult.canSettle && (
                            <div className="bg-yellow-500/10 border border-yellow-500/20 rounded-xl p-3 mb-4 flex items-start gap-3">
                                <AlertTriangle className="w-5 h-5 text-yellow-500 flex-shrink-0 mt-0.5" />
                                <div>
                                    <p className="text-sm font-medium text-yellow-500">Cannot Settle</p>
                                    <p className="text-xs text-yellow-400/80">{canSettleResult.reason}</p>
                                </div>
                            </div>
                        )}

                        {/* Error Message */}
                        {error && (
                            <div className="bg-red-500/10 border border-red-500/20 rounded-xl p-3 mb-4 flex items-start gap-3">
                                <AlertTriangle className="w-5 h-5 text-red-500 flex-shrink-0 mt-0.5" />
                                <div>
                                    <p className="text-sm font-medium text-red-500">Transaction Failed</p>
                                    <p className="text-xs text-red-400/80">{error.message?.slice(0, 100)}</p>
                                </div>
                            </div>
                        )}

                        {/* Action Buttons */}
                        <div className="flex gap-3">
                            <button
                                onClick={onClose}
                                className="flex-1 bg-white/5 hover:bg-white/10 text-white font-bold py-3 rounded-xl transition-all border border-white/10"
                            >
                                Cancel
                            </button>
                            {isExpired ? (
                                <button
                                    onClick={handleForceSettle}
                                    disabled={isPending}
                                    className="flex-1 bg-orange-500 hover:bg-orange-600 text-white font-bold py-3 rounded-xl transition-all flex items-center justify-center gap-2"
                                >
                                    {isPending ? (
                                        <><Loader2 className="w-4 h-4 animate-spin" /> Processing...</>
                                    ) : (
                                        <>Force Settle</>
                                    )}
                                </button>
                            ) : (
                                <button
                                    onClick={handleSettle}
                                    disabled={isPending || (canSettleResult && !canSettleResult.canSettle)}
                                    className={cn(
                                        "flex-1 bg-accent hover:bg-accent-hover text-black font-bold py-3 rounded-xl transition-all flex items-center justify-center gap-2",
                                        (canSettleResult && !canSettleResult.canSettle) && "opacity-50 cursor-not-allowed"
                                    )}
                                >
                                    {isPending ? (
                                        <><Loader2 className="w-4 h-4 animate-spin" /> Processing...</>
                                    ) : (
                                        <>Confirm Settlement</>
                                    )}
                                </button>
                            )}
                        </div>
                    </>
                )}
            </div>
        </div>
    );
}
