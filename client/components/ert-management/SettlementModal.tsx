"use client";

import { useEstimateSettlement, useEstimatePnl, useFeeBreakdown, useCanSettle, useSettleERT, useForceSettleERT, useEnhancedPrice, useExecutionRights } from "@/lib/hooks";
import { formatUnits } from "viem";
import { X, Loader2, AlertTriangle, CheckCircle, TrendingUp, TrendingDown, DollarSign, Shield, Percent, Info } from "lucide-react";
import { cn } from "@/lib/utils";
import { TrustlessPriceBadge } from "@/components/ui/TrustlessPriceBadge";
import { PriceFreshnessIndicator, FTSOSourceBadge, StalenessWarningBadge } from "@/components/ui/PriceFeedIndicators";

interface SettlementModalProps {
    ertId: bigint;
    isOpen: boolean;
    onClose: () => void;
    isExpired?: boolean;
    feedName?: string; // e.g., "BTC/USD" for price verification
    entryPrice?: bigint;
    entryPriceDecimals?: number;
    entryTimestamp?: Date;
}

export function SettlementModal({
    ertId,
    isOpen,
    onClose,
    isExpired,
    feedName = "BTC/USD",
    entryPrice,
    entryPriceDecimals = 18,
    entryTimestamp,
}: SettlementModalProps) {
    // Settlement estimation hooks
    const { data: settlement, isLoading: settlementLoading } = useEstimateSettlement(ertId);
    const { data: pnl, isProfitable, isLoading: pnlLoading } = useEstimatePnl(ertId);
    const { data: feeBreakdown, isLoading: feeLoading } = useFeeBreakdown(ertId, pnl);
    const { data: canSettleResult, isLoading: canSettleLoading } = useCanSettle(ertId);
    const { data: executionRights } = useExecutionRights(ertId);

    // Current FTSO price for verification display
    const { enhanced: currentFTSOPrice } = useEnhancedPrice(feedName);

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

    const formatValue = (value: bigint | undefined, decimals: number = 6, prefix: string = "$") => {
        if (value === undefined) return "-";
        const isNegative = value < 0n;
        const absValue = isNegative ? -value : value;
        return `${isNegative ? "-" : ""}${prefix}${Number(formatUnits(absValue, decimals)).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: decimals === 18 ? 4 : 2 })}`;
    };

    // Calculate fees locally when contract returns zeros
    // Fee percentages: LP Profit Share 20%, Insurance 2%, LP Base Fee 0.5% of capital
    const LP_PROFIT_SHARE_BPS = 2000n; // 20%
    const INSURANCE_FEE_BPS = 200n; // 2%
    const LP_BASE_FEE_BPS = 50n; // 0.5%
    const BPS_DIVISOR = 10000n;

    const effectivePnl = pnl ?? settlement?.totalPnl ?? 0n;
    // Use executionRights.capitalLimit as primary source, fall back to settlement.capitalReturned
    const capitalAmount = executionRights?.capitalLimit ?? settlement?.capitalReturned ?? 0n;

    const baseFee = capitalAmount * LP_BASE_FEE_BPS / BPS_DIVISOR;
    const profitShare = effectivePnl > 0n ? effectivePnl * LP_PROFIT_SHARE_BPS / BPS_DIVISOR : 0n;
    const insuranceFee = effectivePnl > 0n ? effectivePnl * INSURANCE_FEE_BPS / BPS_DIVISOR : 0n;

    const calculatedFees = {
        lpBaseFee: baseFee,
        lpProfitShare: profitShare,
        insuranceFee: insuranceFee,
        // Executor profit = PnL minus all fees (base fee always applies)
        executorProfit: effectivePnl - baseFee - profitShare - insuranceFee,
    };

    // Use contract values if non-zero, otherwise use calculated values
    const displayFees = {
        lpBaseFee: (feeBreakdown?.lpBaseFee ?? settlement?.lpBaseFee ?? 0n) > 0n
            ? (feeBreakdown?.lpBaseFee ?? settlement?.lpBaseFee)
            : calculatedFees.lpBaseFee,
        lpProfitShare: (feeBreakdown?.lpProfitShare ?? settlement?.lpProfitShare ?? 0n) > 0n
            ? (feeBreakdown?.lpProfitShare ?? settlement?.lpProfitShare)
            : calculatedFees.lpProfitShare,
        insuranceFee: (feeBreakdown?.insuranceFee ?? settlement?.insuranceFee ?? 0n) > 0n
            ? (feeBreakdown?.insuranceFee ?? settlement?.insuranceFee)
            : calculatedFees.insuranceFee,
        executorProfit: (feeBreakdown?.executorProfit ?? settlement?.executorProfit ?? 0n) !== 0n
            ? (feeBreakdown?.executorProfit ?? settlement?.executorProfit)
            : calculatedFees.executorProfit,
    };

    const formattedEntryPrice = entryPrice
        ? Number(formatUnits(entryPrice, entryPriceDecimals)).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })
        : undefined;

    const formattedCurrentPrice = currentFTSOPrice
        ? Number(currentFTSOPrice.formatted).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })
        : '-';

    const formattedEntryDate = entryTimestamp
        ? entryTimestamp.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
        : undefined;

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
            {/* Backdrop */}
            <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />

            {/* Modal */}
            <div className="relative bg-background-secondary border border-white/10 rounded-2xl p-6 w-full max-w-lg mx-4 shadow-2xl max-h-[90vh] overflow-y-auto">
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
                        {/* PnL Summary with Trustless Badge */}
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
                                        <div className="flex items-center gap-2 mb-1">
                                            <p className="text-xs text-text-muted">Total PnL</p>
                                            <TrustlessPriceBadge size="sm" showLabel={false} />
                                        </div>
                                        <p className={cn("text-2xl font-bold", isProfitable ? "text-green-500" : "text-red-500")}>
                                            {formatValue(settlement?.totalPnl)}
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

                        {/* Price Verification Section */}
                        <div className="glass-panel p-4 rounded-xl mb-4 space-y-3">
                            <h3 className="text-sm font-semibold text-white flex items-center gap-2">
                                <Info className="w-4 h-4 text-accent" />
                                Price Verification
                            </h3>

                            <div className="space-y-2 text-sm">
                                {/* Entry Price Row */}
                                {formattedEntryPrice && (
                                    <div className="flex justify-between items-start">
                                        <span className="text-text-muted">Entry Price</span>
                                        <div className="text-right">
                                            <span className="text-white font-mono">${formattedEntryPrice}</span>
                                            {formattedEntryDate && (
                                                <p className="text-[10px] text-text-muted mt-0.5">{formattedEntryDate}</p>
                                            )}
                                        </div>
                                    </div>
                                )}

                                {/* Current FTSO Price Row */}
                                <div className="flex justify-between items-start">
                                    <span className="text-text-muted">Current FTSO</span>
                                    <div className="text-right">
                                        <div className="flex items-center gap-2 justify-end">
                                            <span className="text-white font-mono">${formattedCurrentPrice}</span>
                                            {currentFTSOPrice && (
                                                <>
                                                    <PriceFreshnessIndicator freshness={currentFTSOPrice.freshness} />
                                                    <FTSOSourceBadge source={currentFTSOPrice.source} size="sm" />
                                                </>
                                            )}
                                        </div>
                                        {currentFTSOPrice?.freshness === 'stale' ? (
                                            <div className="mt-1 flex justify-end">
                                                <StalenessWarningBadge />
                                            </div>
                                        ) : currentFTSOPrice ? (
                                            <span className="text-[10px] text-text-muted">{currentFTSOPrice.ageFormatted}</span>
                                        ) : null}
                                    </div>
                                </div>
                            </div>

                            {/* Info notice */}
                            <div className="border-t border-white/5 pt-3 mt-3">
                                <div className="flex items-start gap-2 bg-accent/5 rounded-lg p-2">
                                    <Shield className="w-3.5 h-3.5 text-accent flex-shrink-0 mt-0.5" />
                                    <p className="text-[11px] text-accent/80">
                                        Settlement uses trustless FTSO prices - cannot be manipulated by executors.
                                    </p>
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
                                    <span className="text-text-muted">LP Base Fee (0.5%)</span>
                                    <span className="text-white">{formatValue(displayFees.lpBaseFee)}</span>
                                </div>
                                <div className="flex justify-between">
                                    <span className="text-text-muted">LP Profit Share (20%)</span>
                                    <span className="text-white">{formatValue(displayFees.lpProfitShare)}</span>
                                </div>
                                <div className="flex justify-between">
                                    <span className="text-text-muted">Insurance Fund (2%)</span>
                                    <span className="text-white">{formatValue(displayFees.insuranceFee)}</span>
                                </div>
                                <div className="border-t border-white/10 pt-2 flex justify-between font-bold">
                                    <span className="text-white">Your Profit</span>
                                    <span className={isProfitable ? "text-accent" : "text-red-400"}>
                                        {formatValue(displayFees.executorProfit)}
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
                                <p className="text-lg font-bold text-white">{formatValue(settlement?.capitalReturned)}</p>
                            </div>
                            <div className="glass-panel p-4 rounded-xl">
                                <div className="flex items-center gap-2 mb-2">
                                    <Shield className="w-4 h-4 text-accent" />
                                    <span className="text-xs text-text-muted">Stake Returned</span>
                                </div>
                                <p className="text-lg font-bold text-white">{formatValue(settlement?.stakeReturned, 18, "")} <span className="text-xs text-text-muted">FLR</span></p>
                                {settlement?.stakeSlashed != null && settlement.stakeSlashed > 0n && (
                                    <p className="text-xs text-red-400">-{formatValue(settlement.stakeSlashed, 18, "")} FLR slashed</p>
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

                        {/* Stale Price Warning */}
                        {currentFTSOPrice?.freshness === 'stale' && (
                            <div className="bg-orange-500/10 border border-orange-500/20 rounded-xl p-3 mb-4 flex items-start gap-3">
                                <AlertTriangle className="w-5 h-5 text-orange-500 flex-shrink-0 mt-0.5" />
                                <div>
                                    <p className="text-sm font-medium text-orange-500">Stale Price Data</p>
                                    <p className="text-xs text-orange-400/80">Current FTSO price is outdated. Settlement may use stale pricing.</p>
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
