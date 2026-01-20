"use client";

import { useState, useEffect } from "react";
import {
    useFAssetTransfer,
    useFAssetBalance,
    useFAssetApprove,
    useFAssetInfo,
    useFTSOPrice,
    useExternalProtocolsAvailable,
    FAssetType,
} from "@/lib/hooks";
import { Send, Download, Loader2, AlertTriangle, CheckCircle, Info } from "lucide-react";
import { cn } from "@/lib/utils";
import { parseUnits } from "viem";

const FASSET_TYPES: FAssetType[] = ['FXRP', 'FBTC', 'FDOGE'];

// Feed IDs for price fetching
const FASSET_FEED_IDS: Record<FAssetType, string> = {
    FXRP: 'XRP/USD',
    FBTC: 'BTC/USD',
    FDOGE: 'DOGE/USD',
};

export function FAssetActionPanel() {
    const [activeTab, setActiveTab] = useState<'mint' | 'redeem'>('mint');
    const [amount, setAmount] = useState("");
    const [selectedAsset, setSelectedAsset] = useState<FAssetType>("FXRP");

    const isAvailable = useExternalProtocolsAvailable();

    // FAsset data hooks
    const { data: balance, isLoading: balanceLoading, refetch: refetchBalance } = useFAssetBalance(selectedAsset);
    const { data: assetInfo } = useFAssetInfo(selectedAsset);
    const { data: priceData } = useFTSOPrice(FASSET_FEED_IDS[selectedAsset]);

    // Transfer hook (for redemption simulation - actual minting/redeeming goes through FAsset system)
    const {
        transfer,
        isPending,
        isConfirming,
        isSuccess,
        error,
    } = useFAssetTransfer(selectedAsset);

    const isProcessing = isPending || isConfirming;

    // Parse amount with correct decimals
    const parsedAmount = amount && Number(amount) > 0 && assetInfo
        ? parseUnits(amount, assetInfo.decimals)
        : 0n;

    // Reset form on success
    useEffect(() => {
        if (isSuccess) {
            const timer = setTimeout(() => {
                setAmount("");
                refetchBalance();
            }, 3000);
            return () => clearTimeout(timer);
        }
    }, [isSuccess, refetchBalance]);

    // Calculate price display
    const currentPrice = priceData
        ? (Number(priceData.price) / 10 ** priceData.decimals).toFixed(4)
        : '-';

    return (
        <div className="glass-panel p-6 rounded-2xl h-full">
            <div className="flex items-center gap-2 mb-6 p-1 bg-black/20 rounded-xl">
                <button
                    onClick={() => setActiveTab('mint')}
                    className={cn(
                        "flex-1 py-2 rounded-lg text-sm font-bold transition-all flex items-center justify-center gap-2",
                        activeTab === 'mint' ? "bg-accent/20 text-accent shadow-sm" : "text-text-muted hover:text-white"
                    )}
                >
                    <Download className="w-4 h-4" /> Mint
                </button>
                <button
                    onClick={() => setActiveTab('redeem')}
                    className={cn(
                        "flex-1 py-2 rounded-lg text-sm font-bold transition-all flex items-center justify-center gap-2",
                        activeTab === 'redeem' ? "bg-orange-500/20 text-orange-500 shadow-sm" : "text-text-muted hover:text-white"
                    )}
                >
                    <Send className="w-4 h-4" /> Redeem
                </button>
            </div>

            {/* Mainnet only warning */}
            {!isAvailable && (
                <div className="bg-yellow-500/10 border border-yellow-500/20 rounded-lg p-3 mb-4 flex items-start gap-2">
                    <AlertTriangle className="w-4 h-4 text-yellow-500 flex-shrink-0 mt-0.5" />
                    <p className="text-xs text-yellow-400">FAssets are only available on Flare Mainnet</p>
                </div>
            )}

            <div className="space-y-6">
                <div className="space-y-2">
                    <label className="text-xs text-text-muted">Select Asset</label>
                    <div className="grid grid-cols-3 gap-2">
                        {FASSET_TYPES.map(asset => (
                            <button
                                key={asset}
                                onClick={() => setSelectedAsset(asset)}
                                className={cn(
                                    "py-2 rounded-xl border text-sm font-medium transition-all",
                                    selectedAsset === asset
                                        ? "bg-white/10 border-white/20 text-white"
                                        : "bg-transparent border-transparent text-text-muted hover:bg-white/5"
                                )}
                            >
                                {asset}
                            </button>
                        ))}
                    </div>
                </div>

                <div className="space-y-2">
                    <div className="flex justify-between text-xs">
                        <span className="text-text-muted">Amount</span>
                        <button
                            onClick={() => balance && setAmount(balance.formatted)}
                            className="text-text-muted hover:text-accent transition-colors"
                        >
                            Balance: {balanceLoading ? '...' : balance?.formatted || '0.00'}
                        </button>
                    </div>
                    <div className="bg-background-secondary p-4 rounded-xl border border-white/5 flex items-center justify-between">
                        <input
                            type="number"
                            value={amount}
                            onChange={(e) => setAmount(e.target.value)}
                            placeholder="0.00"
                            className="bg-transparent text-xl font-bold text-white outline-none w-full"
                        />
                        <div className="flex items-center gap-2">
                            <button
                                onClick={() => balance && setAmount(balance.formatted)}
                                className="text-xs bg-white/10 hover:bg-white/20 text-accent px-2 py-1 rounded transition-colors"
                            >
                                MAX
                            </button>
                            <span className="text-xs font-bold text-text-muted bg-white/5 px-2 py-1 rounded">
                                {selectedAsset}
                            </span>
                        </div>
                    </div>
                </div>

                <div className="bg-white/5 rounded-xl p-4 text-xs space-y-2">
                    <div className="flex justify-between">
                        <span className="text-text-muted">Current Price</span>
                        <span className="text-white font-mono">${currentPrice}</span>
                    </div>
                    <div className="flex justify-between">
                        <span className="text-text-muted">Collateral Ratio</span>
                        <span className="text-white font-mono">~150%</span>
                    </div>
                    <div className="flex justify-between">
                        <span className="text-text-muted">{activeTab === 'mint' ? 'Minting' : 'Redemption'} Fee</span>
                        <span className="text-white font-mono">0.1%</span>
                    </div>
                    <div className="flex justify-between border-t border-white/5 pt-2 mt-2">
                        <span className="text-text-muted">Estimated Wait</span>
                        <span className="text-white font-mono">~5 mins</span>
                    </div>
                </div>

                {/* Info notice */}
                <div className="bg-blue-500/10 border border-blue-500/20 rounded-lg p-3 flex items-start gap-2">
                    <Info className="w-4 h-4 text-blue-400 flex-shrink-0 mt-0.5" />
                    <p className="text-xs text-blue-400">
                        {activeTab === 'mint'
                            ? "FAsset minting is handled through the Flare FAsset system. This UI provides visibility into your balances."
                            : "Redemption requests are processed by the FAsset collateral agents."}
                    </p>
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
                        <p className="text-xs text-green-400">Transaction successful!</p>
                    </div>
                )}

                <button
                    disabled={!amount || parsedAmount === 0n || isProcessing || !isAvailable}
                    className={cn(
                        "w-full font-bold py-4 rounded-xl transition-all shadow-lg flex items-center justify-center gap-2",
                        "disabled:opacity-50 disabled:cursor-not-allowed",
                        activeTab === 'mint'
                            ? "bg-accent hover:bg-accent-hover text-black"
                            : "bg-orange-500 hover:bg-orange-600 text-white"
                    )}
                >
                    {isProcessing ? (
                        <>
                            <Loader2 className="w-5 h-5 animate-spin" />
                            {isPending ? "Confirm in wallet..." : "Processing..."}
                        </>
                    ) : (
                        activeTab === 'mint' ? 'Mint FAssets' : 'Request Redemption'
                    )}
                </button>
                <p className="text-[10px] text-center text-text-muted">
                    {activeTab === 'mint'
                        ? "Minting requires sending native assets to the Collateral Agent."
                        : "Redeeming will burn FAssets and release native tokens."}
                </p>
            </div>
        </div>
    );
}
