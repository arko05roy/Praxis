"use client";

import { useState } from "react";
import { useTokenBalance, useAllowance, useApproveVault, useLPDeposit, usePreviewDeposit } from "@/lib/hooks";
import { formatUnits } from "viem";
import { Loader2, ArrowRight } from "lucide-react";

export function DepositForm() {
    const [amount, setAmount] = useState("");
    const { data: balance } = useTokenBalance();
    const { data: allowance } = useAllowance();
    const { approve, isPending: isApprovePending } = useApproveVault(); // Need to check if useApproveVault returns isPending directly or inside an object
    const { depositFormatted, isPending: isDepositPending } = useLPDeposit();

    // Need to verify checking allowance logic properly
    const allowanceBigInt = allowance ?? 0n;
    const depositAmountBigInt = BigInt(Number(amount || 0) * 10 ** 6); // USD has 6 decimals? Need to check token
    const needsApproval = depositAmountBigInt > allowanceBigInt;

    const handleDeposit = () => {
        if (needsApproval) {
            approve(depositAmountBigInt);
        } else {
            depositFormatted(amount, 6);
        }
    };

    const isPending = isApprovePending || isDepositPending;

    return (
        <div className="glass-panel rounded-2xl p-6">
            <h3 className="text-lg font-semibold text-white mb-6">Deposit Capital</h3>

            <div className="space-y-4">
                <div className="bg-background-secondary rounded-xl p-4 border border-white/5">
                    <div className="flex justify-between mb-2">
                        <span className="text-xs text-text-muted font-medium">Amount (USDC)</span>
                        <span className="text-xs text-text-muted">
                            Balance: {balance ? formatUnits(balance.value, balance.decimals) : "0.00"}
                        </span>
                    </div>
                    <div className="flex items-center gap-2">
                        <input
                            type="number"
                            value={amount}
                            onChange={(e) => setAmount(e.target.value)}
                            placeholder="0.00"
                            className="bg-transparent text-2xl font-mono text-white placeholder-text-muted outline-none w-full"
                        />
                        <button
                            onClick={() => setAmount(balance ? formatUnits(balance.value, balance.decimals) : "")}
                            className="text-xs bg-white/10 hover:bg-white/20 text-accent px-2 py-1 rounded transition-colors"
                        >
                            MAX
                        </button>
                    </div>
                </div>

                <button
                    onClick={handleDeposit}
                    disabled={!amount || Number(amount) <= 0 || isPending}
                    className="w-full bg-accent hover:bg-accent-hover text-black font-bold py-4 rounded-xl transition-all shadow-[0_4px_20px_rgba(143,212,96,0.3)] hover:shadow-[0_6px_25px_rgba(143,212,96,0.4)] disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                >
                    {isPending ? <Loader2 className="animate-spin w-5 h-5" /> : null}
                    {needsApproval ? "Approve USDC" : "Deposit Capital"}
                </button>

                <p className="text-xs text-center text-text-muted">
                    You will receive Execution Vault Shares (ExVs) representing your share of the pool.
                </p>
            </div>
        </div>
    );
}
