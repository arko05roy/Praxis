"use client";

import { FAssetBalanceCards } from "@/components/fassets/FAssetBalanceCards";
import { FAssetActionPanel } from "@/components/fassets/FAssetActionPanel";
import { ShieldCheck, Info } from "lucide-react";

export default function FAssetsPage() {
    return (
        <div className="max-w-7xl mx-auto space-y-8">
            <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-accent/10 flex items-center justify-center text-accent">
                    <ShieldCheck className="w-5 h-5" />
                </div>
                <div>
                    <h1 className="text-3xl font-bold text-white">FAssets Portfolio</h1>
                    <p className="text-text-secondary">Manage non-smart contract assets (XRP, BTC, DOGE) trustlessly on Flare.</p>
                </div>
            </div>

            <FAssetBalanceCards />

            <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
                <div className="lg:col-span-8">
                    <div className="glass-panel p-6 rounded-2xl min-h-[400px]">
                        <h3 className="text-lg font-semibold text-white mb-6">Transaction History</h3>
                        <div className="flex flex-col items-center justify-center h-[200px] text-text-muted border-dashed border-2 border-white/5 rounded-xl">
                            <Info className="w-8 h-8 mb-2 opacity-50" />
                            <p>No recent FAsset transactions found.</p>
                        </div>
                    </div>
                </div>

                <div className="lg:col-span-4">
                    <FAssetActionPanel />
                </div>
            </div>
        </div>
    );
}
