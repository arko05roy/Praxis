"use client";

import { useState, useCallback } from "react";
import { useLPBalance, useLPWithdraw, usePreviewRedeem, useVaultRedeem } from "@/lib/hooks";
import { formatUnits, parseUnits } from "viem";
import { Loader2, CheckCircle2, AlertTriangle } from "lucide-react";

// ERC-4626 vault shares typically have same decimals as underlying asset (USDC = 6)
const SHARE_DECIMALS = 6;

export function WithdrawForm() {
    const [amount, setAmount] = useState(""); // Shares to burn
    const [useDirectRedeem, setUseDirectRedeem] = useState(false);
    const { data: balance, refetch: refetchBalance } = useLPBalance();

    // Gateway withdraw (via PraxisGateway)
    const {
        withdraw: gatewayWithdraw,
        isPending: gatewayPending,
        isConfirming: gatewayConfirming,
        isSuccess: gatewaySuccess,
        error: gatewayError
    } = useLPWithdraw();

    // Direct vault redeem (ERC-4626 fallback)
    const {
        redeem: vaultRedeem,
        isPending: vaultPending,
        isConfirming: vaultConfirming,
        isSuccess: vaultSuccess,
        error: vaultError
    } = useVaultRedeem();

    // Parse share amount for preview
    const shareAmount = amount && Number(amount) > 0
        ? parseUnits(amount, SHARE_DECIMALS)
        : undefined;

    // Preview how much USDC they'll get
    const { data: previewAssets } = usePreviewRedeem(shareAmount);

    const handleWithdraw = useCallback(async () => {
        if (!amount || Number(amount) <= 0) return;
        const sharesToBurn = parseUnits(amount, SHARE_DECIMALS);

        try {
            if (useDirectRedeem) {
                // Use direct ERC-4626 redeem
                await vaultRedeem(sharesToBurn);
            } else {
                // Try gateway first
                await gatewayWithdraw(sharesToBurn);
            }
            refetchBalance();
        } catch (e) {
            console.error("Withdraw failed:", e);
        }
    }, [amount, useDirectRedeem, gatewayWithdraw, vaultRedeem, refetchBalance]);

    const isPending = gatewayPending || vaultPending;
    const isConfirming = gatewayConfirming || vaultConfirming;
    const isSuccess = gatewaySuccess || vaultSuccess;
    const error = gatewayError || vaultError;
    const isProcessing = isPending || isConfirming;

    return (
        <div className="glass-panel rounded-2xl p-6">
            <h3 className="text-lg font-semibold text-white mb-6">Withdraw Liquidity</h3>

            <div className="space-y-4">
                <div className="bg-background-secondary rounded-xl p-4 border border-white/5">
                    <div className="flex justify-between mb-2">
                        <span className="text-xs text-text-muted font-medium">Shares Amount</span>
                        <span className="text-xs text-text-muted">
                            Available: {balance ? formatUnits(balance.shares, SHARE_DECIMALS) : "0.00"}
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
                            onClick={() => setAmount(balance ? formatUnits(balance.shares, SHARE_DECIMALS) : "")}
                            className="text-xs bg-white/10 hover:bg-white/20 text-accent px-2 py-1 rounded transition-colors"
                        >
                            MAX
                        </button>
                    </div>
                </div>

                {/* Preview of USDC output */}
                {previewAssets && previewAssets > 0n && (
                    <div className="flex items-center justify-between text-xs px-2 text-text-muted">
                        <span>You will receive</span>
                        <span className="text-white font-medium">
                            {formatUnits(previewAssets, SHARE_DECIMALS)} USDC
                        </span>
                    </div>
                )}

                {/* Toggle for direct redeem mode */}
                <div className="flex items-center justify-between text-xs px-2">
                    <span className="text-text-muted flex items-center gap-1">
                        <AlertTriangle className="w-3 h-3" />
                        Use direct vault redeem
                    </span>
                    <button
                        onClick={() => setUseDirectRedeem(!useDirectRedeem)}
                        className={`px-2 py-1 rounded text-xs transition-colors ${
                            useDirectRedeem
                                ? 'bg-accent/20 text-accent'
                                : 'bg-white/5 text-text-muted hover:bg-white/10'
                        }`}
                    >
                        {useDirectRedeem ? 'ON' : 'OFF'}
                    </button>
                </div>

                {isSuccess && (
                    <div className="flex items-center justify-center gap-2 text-green-400 text-sm py-2">
                        <CheckCircle2 className="w-4 h-4" />
                        Withdrawal successful!
                    </div>
                )}

                {error && (
                    <div className="text-red-400 text-xs text-center py-2">
                        Error: {error.message?.slice(0, 50)}...
                    </div>
                )}

                <button
                    onClick={handleWithdraw}
                    disabled={!amount || Number(amount) <= 0 || isProcessing}
                    className="w-full bg-white/5 hover:bg-white/10 text-white font-bold py-4 rounded-xl transition-all border border-white/10 hover:border-white/20 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                >
                    {isProcessing ? (
                        <>
                            <Loader2 className="animate-spin w-5 h-5" />
                            {isPending ? "Confirm in wallet..." : "Processing..."}
                        </>
                    ) : (
                        useDirectRedeem ? "Redeem from Vault" : "Withdraw Assets"
                    )}
                </button>
            </div>
        </div>
    );
}
