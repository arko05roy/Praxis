"use client";

import { useState } from "react";
import { MarketInfoPanel } from "@/components/perpetuals/MarketInfoPanel";
import { OrderForm } from "@/components/perpetuals/OrderForm";
import { PositionPanel } from "@/components/perpetuals/PositionPanel";
import { PriceChart } from "@/components/perpetuals/PriceChart";
import { usePerpMarkets, useExternalProtocolsAvailable } from "@/lib/hooks";
import { ChevronDown, Zap, Shield, TrendingUp, ExternalLink, Layers, Clock } from "lucide-react";
import { cn } from "@/lib/utils";

const AVAILABLE_MARKETS = [
    { id: "ETH-USD", name: "Ethereum", symbol: "ETH", color: "#627eea" },
    { id: "BTC-USD", name: "Bitcoin", symbol: "BTC", color: "#f7931a" },
    { id: "FLR-USD", name: "Flare", symbol: "FLR", color: "#e6007a" },
];

export default function PerpetualsPage() {
    const [activeMarket, setActiveMarket] = useState("ETH-USD");
    const [showMarketSelector, setShowMarketSelector] = useState(false);
    const isAvailable = useExternalProtocolsAvailable();

    const currentMarket = AVAILABLE_MARKETS.find(m => m.id === activeMarket) || AVAILABLE_MARKETS[0];

    return (
        <div className="max-w-7xl mx-auto space-y-6">
            {/* SparkDEX Eternal Header */}
            <div className="glass-panel p-6 rounded-2xl bg-gradient-to-r from-orange-500/5 via-transparent to-yellow-500/5 border border-orange-500/10">
                <div className="flex items-center justify-between">
                    <div className="flex items-center gap-4">
                        <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-orange-500 to-yellow-500 flex items-center justify-center shadow-lg shadow-orange-500/20">
                            <Zap className="w-6 h-6 text-white" />
                        </div>
                        <div>
                            <h1 className="text-xl font-bold text-white flex items-center gap-2">
                                SparkDEX Eternal
                                <span className="text-xs font-normal bg-orange-500/10 text-orange-400 px-2 py-0.5 rounded-full border border-orange-500/20">
                                    Perpetuals
                                </span>
                            </h1>
                            <p className="text-sm text-text-muted">
                                Decentralized perpetual futures powered by Flare
                            </p>
                        </div>
                    </div>

                    <div className="flex items-center gap-3">
                        <a
                            href="https://sparkdex.ai"
                            target="_blank"
                            rel="noopener noreferrer"
                            className="flex items-center gap-1.5 text-xs text-text-muted hover:text-orange-400 transition-colors"
                        >
                            sparkdex.ai <ExternalLink className="w-3 h-3" />
                        </a>
                        <div className={cn(
                            "flex items-center gap-2 text-xs px-3 py-1.5 rounded-full",
                            isAvailable
                                ? "bg-green-500/10 text-green-400 border border-green-500/20"
                                : "bg-yellow-500/10 text-yellow-400 border border-yellow-500/20"
                        )}>
                            <span className={cn(
                                "w-2 h-2 rounded-full",
                                isAvailable ? "bg-green-500 animate-pulse" : "bg-yellow-500"
                            )} />
                            {isAvailable ? "Connected" : "Mainnet Only"}
                        </div>
                    </div>
                </div>

                {/* Features row */}
                <div className="grid grid-cols-3 gap-4 mt-6 pt-6 border-t border-white/5">
                    <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-lg bg-white/5 flex items-center justify-center">
                            <Layers className="w-4 h-4 text-orange-400" />
                        </div>
                        <div>
                            <p className="text-xs text-text-muted">Leverage</p>
                            <p className="text-sm font-bold text-white">Up to 50x</p>
                        </div>
                    </div>
                    <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-lg bg-white/5 flex items-center justify-center">
                            <Shield className="w-4 h-4 text-orange-400" />
                        </div>
                        <div>
                            <p className="text-xs text-text-muted">Oracle</p>
                            <p className="text-sm font-bold text-white">FTSO v2</p>
                        </div>
                    </div>
                    <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-lg bg-white/5 flex items-center justify-center">
                            <Clock className="w-4 h-4 text-orange-400" />
                        </div>
                        <div>
                            <p className="text-xs text-text-muted">Settlement</p>
                            <p className="text-sm font-bold text-white">Instant</p>
                        </div>
                    </div>
                </div>
            </div>

            {/* Market Selector & Oracle Status */}
            <div className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                    {/* Market Dropdown */}
                    <div className="relative">
                        <button
                            onClick={() => setShowMarketSelector(!showMarketSelector)}
                            className="flex items-center gap-2 bg-white/5 hover:bg-white/10 border border-white/10 px-4 py-2 rounded-xl transition-all"
                        >
                            <div
                                className="w-8 h-8 rounded-full flex items-center justify-center text-white text-xs font-bold"
                                style={{ backgroundColor: currentMarket.color + '30' }}
                            >
                                {currentMarket.symbol[0]}
                            </div>
                            <div className="text-left">
                                <p className="text-[10px] text-text-muted">Market</p>
                                <p className="text-sm font-bold text-white flex items-center gap-1">
                                    {activeMarket} <ChevronDown className={cn("w-3 h-3 text-text-muted transition-transform", showMarketSelector && "rotate-180")} />
                                </p>
                            </div>
                        </button>

                        {/* Dropdown */}
                        {showMarketSelector && (
                            <div className="absolute top-full mt-2 left-0 w-48 bg-background-secondary border border-white/10 rounded-xl p-2 shadow-xl z-50">
                                {AVAILABLE_MARKETS.map((market) => (
                                    <button
                                        key={market.id}
                                        onClick={() => {
                                            setActiveMarket(market.id);
                                            setShowMarketSelector(false);
                                        }}
                                        className={cn(
                                            "w-full flex items-center gap-3 p-2 rounded-lg transition-colors",
                                            activeMarket === market.id
                                                ? "bg-white/10 text-white"
                                                : "text-text-muted hover:bg-white/5 hover:text-white"
                                        )}
                                    >
                                        <div
                                            className="w-6 h-6 rounded-full flex items-center justify-center text-white text-[10px] font-bold"
                                            style={{ backgroundColor: market.color + '30' }}
                                        >
                                            {market.symbol[0]}
                                        </div>
                                        <div className="text-left">
                                            <p className="text-sm font-medium">{market.id}</p>
                                            <p className="text-[10px] text-text-muted">{market.name}</p>
                                        </div>
                                    </button>
                                ))}
                            </div>
                        )}
                    </div>
                </div>

                <div className="flex items-center gap-2 text-xs text-text-muted">
                    <span>Oracle Status:</span>
                    <span className="text-green-500 flex items-center gap-1">
                        <span className="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse" />
                        Synced
                    </span>
                </div>
            </div>

            {/* Main Trading Area */}
            {isAvailable ? (
                <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
                    {/* Left Column: Chart & Positions */}
                    <div className="lg:col-span-8 space-y-6">
                        <MarketInfoPanel marketId={activeMarket} />

                        {/* Price Chart */}
                        <PriceChart market={activeMarket} height={400} />

                        <PositionPanel market={activeMarket} />
                    </div>

                    {/* Right Column: Order Form */}
                    <div className="lg:col-span-4 h-full">
                        <OrderForm market={activeMarket} />
                    </div>
                </div>
            ) : (
                /* Mainnet Only State */
                <div className="glass-panel p-12 rounded-2xl text-center">
                    <div className="w-20 h-20 rounded-2xl bg-gradient-to-br from-orange-500/20 to-yellow-500/20 flex items-center justify-center mx-auto mb-6 border border-orange-500/20">
                        <Zap className="w-10 h-10 text-orange-400" />
                    </div>
                    <h2 className="text-2xl font-bold text-white mb-2">SparkDEX Eternal</h2>
                    <p className="text-text-muted mb-6 max-w-md mx-auto">
                        Trade perpetual futures with up to 50x leverage on Flare's decentralized perpetuals protocol.
                        Prices powered by FTSO v2 oracles.
                    </p>

                    <div className="bg-yellow-500/10 border border-yellow-500/20 rounded-xl p-4 inline-flex items-center gap-3 mb-8">
                        <div className="w-10 h-10 rounded-full bg-yellow-500/20 flex items-center justify-center">
                            <Shield className="w-5 h-5 text-yellow-500" />
                        </div>
                        <div className="text-left">
                            <p className="text-sm font-semibold text-yellow-400">Flare Mainnet Required</p>
                            <p className="text-xs text-yellow-400/70">Switch to Flare Mainnet to access perpetual trading</p>
                        </div>
                    </div>

                    {/* Features Preview */}
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4 max-w-2xl mx-auto">
                        <div className="bg-white/5 rounded-xl p-4 border border-white/5">
                            <TrendingUp className="w-6 h-6 text-orange-400 mb-2" />
                            <h3 className="text-sm font-semibold text-white mb-1">Long & Short</h3>
                            <p className="text-xs text-text-muted">Profit in any market direction</p>
                        </div>
                        <div className="bg-white/5 rounded-xl p-4 border border-white/5">
                            <Layers className="w-6 h-6 text-orange-400 mb-2" />
                            <h3 className="text-sm font-semibold text-white mb-1">50x Leverage</h3>
                            <p className="text-xs text-text-muted">Maximize capital efficiency</p>
                        </div>
                        <div className="bg-white/5 rounded-xl p-4 border border-white/5">
                            <Shield className="w-6 h-6 text-orange-400 mb-2" />
                            <h3 className="text-sm font-semibold text-white mb-1">FTSO Oracles</h3>
                            <p className="text-xs text-text-muted">Trustless price feeds</p>
                        </div>
                    </div>

                    {/* Available Markets Preview */}
                    <div className="mt-8 pt-8 border-t border-white/5">
                        <p className="text-xs text-text-muted mb-4">Available Markets</p>
                        <div className="flex justify-center gap-3">
                            {AVAILABLE_MARKETS.map((market) => (
                                <div
                                    key={market.id}
                                    className="flex items-center gap-2 bg-white/5 px-3 py-2 rounded-lg border border-white/5"
                                >
                                    <div
                                        className="w-6 h-6 rounded-full flex items-center justify-center text-white text-[10px] font-bold"
                                        style={{ backgroundColor: market.color + '30' }}
                                    >
                                        {market.symbol[0]}
                                    </div>
                                    <span className="text-sm text-white font-medium">{market.id}</span>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
