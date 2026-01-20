"use client";

import { useState } from "react";
import { useKineticMarkets, useKineticSupply } from "@/lib/hooks";
import { Landmark, ArrowUpRight, Loader2 } from "lucide-react";

export function KineticLendingCard() {
    const { data: markets } = useKineticMarkets();
    const [selectedMarket, setSelectedMarket] = useState("USDC");
    const [amount, setAmount] = useState("");
    const [isSupplying, setIsSupplying] = useState(false);

    // Mock data if hook returns empty/undefined in dev
    const marketData = {
        USDC: { apy: 4.2, tvl: '2.4M' },
        WETH: { apy: 2.8, tvl: '1.1M' },
        FLR: { apy: 5.1, tvl: '8.5M' }
    };

    const currentMarket = marketData[selectedMarket as keyof typeof marketData];

    const handleSupply = async () => {
        setIsSupplying(true);
        await new Promise(r => setTimeout(r, 2000));
        setIsSupplying(false);
        setAmount("");
    };

    return (
        <div className="glass-panel p-6 rounded-2xl relative overflow-hidden">
            {/* Background Decoration */}
            <div className="absolute top-0 left-0 w-40 h-40 bg-blue-500/10 rounded-full blur-3xl -translate-y-1/2 -translate-x-1/2" />

            <div className="flex items-center gap-3 mb-6 relative z-10">
                <div className="w-10 h-10 rounded-full bg-blue-500/20 flex items-center justify-center text-blue-400">
                    <Landmark className="w-5 h-5" />
                </div>
                <div>
                    <h3 className="font-bold text-white">Kinetic Lending</h3>
                    <p className="text-xs text-text-muted">Supply assets, earn yield</p>
                </div>
            </div>

            {/* Market Selector Tabs */}
            <div className="flex gap-2 mb-6 relative z-10">
                {Object.keys(marketData).map((m) => (
                    <button
                        key={m}
                        onClick={() => setSelectedMarket(m)}
                        className={`px-4 py-2 rounded-lg text-xs font-bold transition-all border ${selectedMarket === m
                                ? "bg-blue-500/20 border-blue-500 text-blue-400"
                                : "bg-white/5 border-transparent text-text-muted hover:bg-white/10"
                            }`}
                    >
                        {m}
                    </button>
                ))}
            </div>

            <div className="grid grid-cols-2 gap-4 mb-6 relative z-10">
                <div className="bg-black/20 p-3 rounded-xl border border-white/5">
                    <p className="text-xs text-text-muted mb-1">Supply APY</p>
                    <p className="text-xl font-bold text-green-400">{currentMarket.apy}%</p>
                </div>
                <div className="bg-black/20 p-3 rounded-xl border border-white/5">
                    <p className="text-xs text-text-muted mb-1">Market TVL</p>
                    <p className="text-xl font-bold text-white">${currentMarket.tvl}</p>
                </div>
            </div>

            <div className="space-y-4 relative z-10">
                <div className="bg-background-secondary p-4 rounded-xl border border-white/5">
                    <div className="flex justify-between mb-2">
                        <label className="text-xs text-text-muted">Supply {selectedMarket}</label>
                        <span className="text-xs text-text-muted">Available: 50,000</span>
                    </div>
                    <div className="flex items-center gap-2">
                        <input
                            type="number"
                            value={amount}
                            onChange={(e) => setAmount(e.target.value)}
                            placeholder="0.0"
                            className="bg-transparent text-2xl font-bold text-white outline-none w-full"
                        />
                        <button className="text-xs bg-white/10 hover:bg-white/20 text-blue-400 px-2 py-1 rounded transition-colors">
                            MAX
                        </button>
                    </div>
                </div>

                <button
                    onClick={handleSupply}
                    disabled={!amount || isSupplying}
                    className="w-full bg-blue-600 hover:bg-blue-500 text-white font-bold py-4 rounded-xl transition-all shadow-lg shadow-blue-900/20 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                >
                    {isSupplying ? <Loader2 className="animate-spin w-5 h-5" /> : "Supply Assets"}
                </button>
            </div>
        </div>
    );
}
