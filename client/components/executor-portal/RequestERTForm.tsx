"use client";

import { useState } from "react";
import { useMintERT, useTierConfig, useRequiredStake, useTokenBalance, useExecutorStatus, useCommonPrices } from "@/lib/hooks";
import { formatUnits, parseUnits } from "viem";
import { Loader2, Calculator } from "lucide-react";

import { useBalance, useAccount } from "wagmi";

export function RequestERTForm() {
    const [capitalAmount, setCapitalAmount] = useState("");
    const [durationDays, setDurationDays] = useState("30");
    const [leverage, setLeverage] = useState(2);

    const { address } = useAccount();

    const { data: status } = useExecutorStatus();
    const { data: tierConfig } = useTierConfig();
    const { mintWithDefaults, isPending } = useMintERT();
    const { FLR } = useCommonPrices();

    // Get Native FLR Balance for Validation
    const { data: balanceData } = useBalance({
        address: address,
    });

    // Calculate stake requirements
    const capitalBigInt = capitalAmount ? parseUnits(capitalAmount, 6) : 0n;
    const { data: requiredStake } = useRequiredStake(capitalBigInt);

    const maxCapital = tierConfig ? formatUnits(tierConfig.maxCapital, 6) : "0";

    // requiredStake is in USD (6 decimals) from contract. Convert to FLR.
    const flrPrice = FLR ? Number(FLR.formatted) : 0;
    const requiredStakeUsd = requiredStake ? Number(formatUnits(requiredStake, 6)) : 0;
    const stakeAmountFlr = flrPrice > 0 ? requiredStakeUsd / flrPrice : 0;
    const stakeAmountWei = parseUnits(stakeAmountFlr.toFixed(18), 18);

    const hasInsufficientBalance = balanceData && stakeAmountWei > balanceData.value;

    const handleRequest = () => {
        if (!requiredStake || !stakeAmountWei) return;

        mintWithDefaults(
            capitalBigInt,
            Number(durationDays),
            stakeAmountWei, // Send actual FLR amount
            [], // Default all adapters
            []  // Default all assets
        );
    };

    if (!status?.isAuthorized) {
        return (
            <div className="glass-panel rounded-2xl p-8 flex flex-col items-center justify-center text-center">
                <div className="w-12 h-12 bg-white/5 rounded-full flex items-center justify-center mb-4">
                    <Calculator className="w-6 h-6 text-text-muted" />
                </div>
                <h3 className="text-white font-medium mb-2">Access Restricted</h3>
                <p className="text-sm text-text-muted max-w-sm">
                    You must be an authorized executor to request Execution Rights.
                    Contact the protocol DAO to verify your address.
                </p>
            </div>
        );
    }

    return (
        <div className="glass-panel rounded-2xl p-6">
            <div className="flex items-center justify-between mb-6">
                <h3 className="text-lg font-semibold text-white">Request Execution Rights</h3>
                <span className="text-xs text-text-muted px-2 py-1 bg-white/5 rounded">
                    Max Capital: ${Number(maxCapital).toLocaleString()}
                </span>
            </div>

            <div className="space-y-6">
                <div className="space-y-2">
                    <label className="text-sm text-text-secondary">Capital Needed (USD)</label>
                    <input
                        type="number"
                        value={capitalAmount}
                        onChange={(e) => setCapitalAmount(e.target.value)}
                        // Only enforce max validation if loaded. Don't block typing.
                        max={maxCapital !== "0" ? maxCapital : undefined}
                        className="w-full bg-background-secondary border border-white/5 rounded-xl px-4 py-3 text-white outline-none focus:border-accent/50 transition-colors"
                        placeholder={tierConfig ? `Max: ${Number(maxCapital).toLocaleString()}` : "Loading limits..."}
                        disabled={!tierConfig}
                    />
                </div>

                {/* Duration Selection */}
                <div className="space-y-2">
                    <label className="text-sm text-text-secondary">Duration (Days)</label>
                    <div className="grid grid-cols-4 gap-2">
                        {["7", "14", "30", "60"].map(d => (
                            <button
                                key={d}
                                onClick={() => setDurationDays(d)}
                                className={`py-2 rounded-lg text-sm font-medium border transition-colors ${durationDays === d
                                    ? 'bg-accent/20 border-accent text-accent'
                                    : 'bg-white/5 border-transparent text-text-muted hover:bg-white/10'
                                    }`}
                            >
                                {d}d
                            </button>
                        ))}
                    </div>
                </div>

                {/* Stats Summary */}
                <div className="bg-black/20 rounded-xl p-4 space-y-3">
                    <div className="flex justify-between text-sm">
                        <span className="text-text-muted">Required Stake (FLR) <span className="text-xs opacity-70">(Auto-deducted)</span></span>
                        <span className={`${hasInsufficientBalance ? 'text-error font-bold' : 'text-white font-mono'}`}>
                            {stakeAmountFlr.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                        </span>
                    </div>
                    <div className="flex justify-between text-sm">
                        <span className="text-text-muted">Base Fee APR</span>
                        <span className="text-white font-mono">2.0%</span>
                    </div>
                    <div className="flex justify-between text-sm">
                        <span className="text-text-muted">Profit Share</span>
                        <span className="text-white font-mono">20.0%</span>
                    </div>
                </div>

                <button
                    onClick={handleRequest}
                    disabled={!capitalAmount || isPending || !requiredStake || !stakeAmountWei || hasInsufficientBalance}
                    className="w-full bg-accent hover:bg-accent-hover text-black font-bold py-4 rounded-xl transition-all shadow-[0_4px_20px_rgba(143,212,96,0.3)] hover:shadow-[0_6px_25px_rgba(143,212,96,0.4)] disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                >
                    {isPending ? <Loader2 className="animate-spin w-5 h-5" /> : null}
                    {hasInsufficientBalance ? `Insufficient FLR Balance (${balanceData ? Number(balanceData.formatted).toFixed(2) : '0'})` : 'Mint Execution Rights (ERT)'}
                </button>
            </div>
        </div>
    );
}
