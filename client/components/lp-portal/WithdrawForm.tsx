"use client";

import { useState } from "react";
import { useLPBalance, useLPWithdraw, usePreviewRedeem } from "@/lib/hooks";
import { formatUnits, parseUnits } from "viem";
import { Loader2 } from "lucide-react";

export function WithdrawForm() {
    const [amount, setAmount] = useState(""); // Shares to burn
    const { data: balance } = useLPBalance();
    const { withdraw, isPending } = useLPWithdraw();

    // Preview redeem to show how much USDC they get
    // Not fully implemented in this simplified snippet but ideally would preview

    const handleWithdraw = () => {
        if (!amount) return;
        // Assuming shares have 18 decimals
        const sharesToBurn = parseUnits(amount, 18);
        withdraw(sharesToBurn);
    };

    return (
        <div className="glass-panel rounded-2xl p-6">
            <h3 className="text-lg font-semibold text-white mb-6">Withdraw Liquidity</h3>

            <div className="space-y-4">
                <div className="bg-background-secondary rounded-xl p-4 border border-white/5">
                    <div className="flex justify-between mb-2">
                        <span className="text-xs text-text-muted font-medium">Shares Amount</span>
                        <span className="text-xs text-text-muted">
                            Available: {balance ? formatUnits(balance.shares, 18) : "0.00"}
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
                            onClick={() => setAmount(balance ? formatUnits(balance.shares, 18) : "")}
                            className="text-xs bg-white/10 hover:bg-white/20 text-accent px-2 py-1 rounded transition-colors"
                        >
                            MAX
                        </button>
                    </div>
                </div>

                <button
                    onClick={handleWithdraw}
                    disabled={!amount || Number(amount) <= 0 || isPending}
                    className="w-full bg-white/5 hover:bg-white/10 text-white font-bold py-4 rounded-xl transition-all border border-white/10 hover:border-white/20 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                >
                    {isPending ? <Loader2 className="animate-spin w-5 h-5" /> : null}
                    Withdraw Assets
                </button>
            </div>
        </div>
    );
}
