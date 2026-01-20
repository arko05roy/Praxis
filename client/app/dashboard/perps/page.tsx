"use client";

import { MarketInfoPanel } from "@/components/perpetuals/MarketInfoPanel";
import { OrderForm } from "@/components/perpetuals/OrderForm";
import { PositionPanel } from "@/components/perpetuals/PositionPanel";
import { Activity, ChevronDown } from "lucide-react";
import { useState } from "react";

export default function PerpetualsPage() {
    const [activeMarket, setActiveMarket] = useState("ETH-USD");

    return (
        <div className="max-w-7xl mx-auto space-y-6">
            {/* Header & Market Selector */}
            <div className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                    <button
                        className="flex items-center gap-2 bg-white/5 hover:bg-white/10 border border-white/10 px-4 py-2 rounded-xl transition-all"
                    >
                        <div className="w-8 h-8 rounded-full bg-blue-500/20 flex items-center justify-center text-blue-400">
                            <Activity className="w-4 h-4" />
                        </div>
                        <div className="text-left">
                            <p className="text-[10px] text-text-muted">Market</p>
                            <p className="text-sm font-bold text-white flex items-center gap-1">
                                {activeMarket} <ChevronDown className="w-3 h-3 text-text-muted" />
                            </p>
                        </div>
                    </button>
                </div>

                <div className="flex items-center gap-2 text-xs text-text-muted">
                    <span>Oracle Status:</span>
                    <span className="text-green-500 flex items-center gap-1">● Synced</span>
                </div>
            </div>

            {/* Main Trading Area */}
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
                {/* Left Column: Chart (Placeholder) & Positions */}
                <div className="lg:col-span-8 space-y-6">
                    <MarketInfoPanel marketId={activeMarket} />

                    {/* TradingView Chart Placeholder */}
                    <div className="glass-panel p-1 rounded-2xl h-[400px] flex items-center justify-center bg-black/40 border border-white/5 relative overflow-hidden group mb-6">
                        <p className="text-sm text-text-muted z-10">TradingView Chart Integration</p>
                        {/* Abstract grid lines */}
                        <div className="absolute inset-0 opacity-10"
                            style={{ backgroundImage: 'linear-gradient(#fff 1px, transparent 1px), linear-gradient(90deg, #fff 1px, transparent 1px)', backgroundSize: '40px 40px' }}>
                        </div>
                    </div>

                    <PositionPanel market={activeMarket} />
                </div>

                {/* Right Column: Order Form */}
                <div className="lg:col-span-4 h-full">
                    <OrderForm market={activeMarket} />
                </div>
            </div>
        </div>
    );
}
