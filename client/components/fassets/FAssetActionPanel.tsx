"use client";

import { useState } from "react";
import { useFAssetTransfer } from "@/lib/hooks";
import { ArrowRightLeft, Send, Download } from "lucide-react";
import { cn } from "@/lib/utils";

export function FAssetActionPanel() {
    const [activeTab, setActiveTab] = useState<'mint' | 'redeem'>('mint');
    const [amount, setAmount] = useState("");
    const [selectedAsset, setSelectedAsset] = useState("FXRP");

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

            <div className="space-y-6">
                <div className="space-y-2">
                    <label className="text-xs text-text-muted">Select Asset</label>
                    <div className="grid grid-cols-3 gap-2">
                        {['FXRP', 'FBTC', 'FDOGE'].map(asset => (
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
                        <span className="text-text-muted">Balance: 0.00</span>
                    </div>
                    <div className="bg-background-secondary p-4 rounded-xl border border-white/5 flex items-center justify-between">
                        <input
                            type="number"
                            value={amount}
                            onChange={(e) => setAmount(e.target.value)}
                            placeholder="0.00"
                            className="bg-transparent text-xl font-bold text-white outline-none w-full"
                        />
                        <span className="text-xs font-bold text-text-muted bg-white/5 px-2 py-1 rounded">
                            {selectedAsset}
                        </span>
                    </div>
                </div>

                <div className="bg-white/5 rounded-xl p-4 text-xs space-y-2">
                    <div className="flex justify-between">
                        <span className="text-text-muted">Collateral Ratio</span>
                        <span className="text-white font-mono">1.5%</span>
                    </div>
                    <div className="flex justify-between">
                        <span className="text-text-muted">Minting Fee</span>
                        <span className="text-white font-mono">0.1%</span>
                    </div>
                    <div className="flex justify-between border-t border-white/5 pt-2 mt-2">
                        <span className="text-text-muted">Estimated Wait</span>
                        <span className="text-white font-mono">~5 mins</span>
                    </div>
                </div>

                <button className="w-full bg-white text-black hover:bg-white/90 font-bold py-4 rounded-xl transition-all shadow-lg flex items-center justify-center gap-2">
                    {activeTab === 'mint' ? 'Mint FAssets' : 'Redeem Undergraduate'}
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
