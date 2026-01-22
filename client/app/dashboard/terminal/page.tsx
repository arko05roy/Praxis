"use client";

import { useState } from "react";
import { ERTSelector } from "@/components/trading-terminal/ERTSelector";
import { ConstraintChecker } from "@/components/trading-terminal/ConstraintChecker";
import { QuickTradePanel } from "@/components/trading-terminal/QuickTradePanel";
import { ERTDetailsPanel } from "@/components/trading-terminal/ERTDetailsPanel";
import { ExecutionHistory } from "@/components/trading-terminal/ExecutionHistory";
import { Terminal, Keyboard, Zap } from "lucide-react";

export default function TradingTerminalPage() {
    const [selectedErtId, setSelectedErtId] = useState<bigint | undefined>(undefined);

    return (
        <div className="max-w-[1600px] mx-auto space-y-4">
            {/* Header */}
            <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-accent/20 to-accent/5 flex items-center justify-center text-accent border border-accent/20">
                        <Terminal className="w-5 h-5" />
                    </div>
                    <div>
                        <h1 className="text-2xl font-bold text-white">Trading Terminal</h1>
                        <p className="text-sm text-text-secondary">Execute strategy actions using your Execution Rights</p>
                    </div>
                </div>
                <div className="hidden lg:flex items-center gap-2 text-xs text-text-muted bg-white/5 px-3 py-2 rounded-lg border border-white/5">
                    <Keyboard className="w-3.5 h-3.5" />
                    <span>Press</span>
                    <kbd className="px-1.5 py-0.5 bg-black/30 rounded text-[10px] font-mono">?</kbd>
                    <span>for shortcuts</span>
                </div>
            </div>

            {/* Control Bar */}
            <div className="glass-panel p-4 rounded-xl border border-white/5 relative z-50 overflow-visible">
                <div className="flex flex-col lg:flex-row items-start lg:items-center gap-4 overflow-visible">
                    {/* ERT Selector */}
                    <div className="w-full lg:w-80 relative z-50">
                        <label className="text-xs text-text-muted mb-1.5 block pl-1">Active Execution Rights</label>
                        <ERTSelector selectedId={selectedErtId} onSelect={setSelectedErtId} />
                    </div>

                    <div className="hidden lg:block w-px h-12 bg-white/10" />

                    {/* Status Indicators */}
                    <div className="flex items-center gap-6">
                        <div className="flex flex-col">
                            <span className="text-xs text-text-muted">Gateway Status</span>
                            <span className="text-sm text-green-500 font-medium flex items-center gap-1.5">
                                <span className="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse"></span>
                                Connected
                            </span>
                        </div>
                        <div className="flex flex-col">
                            <span className="text-xs text-text-muted">Network</span>
                            <span className="text-sm text-white font-medium">Coston2</span>
                        </div>
                        {selectedErtId && (
                            <div className="flex flex-col">
                                <span className="text-xs text-text-muted">Mode</span>
                                <span className="text-sm text-accent font-medium flex items-center gap-1">
                                    <Zap className="w-3 h-3" />
                                    ERT #{selectedErtId.toString()}
                                </span>
                            </div>
                        )}
                    </div>
                </div>
            </div>

            {/* Main Grid */}
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 min-h-[calc(100vh-280px)]">
                {/* Left Column: ERT Details + Execution History */}
                <div className="lg:col-span-3 flex flex-col gap-4">
                    <ERTDetailsPanel ertId={selectedErtId} />
                    <div className="flex-1 min-h-[300px]">
                        <ExecutionHistory ertId={selectedErtId} />
                    </div>
                </div>

                {/* Center Column: Trading Panel */}
                <div className="lg:col-span-6 flex flex-col gap-4">
                    <QuickTradePanel ertId={selectedErtId} />

                    {/* Quick Actions */}
                    <div className="glass-panel rounded-2xl p-5">
                        <h3 className="text-sm font-semibold text-white mb-4">Quick Actions</h3>
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                            <QuickActionButton
                                label="Swap"
                                description="DEX Trade"
                                active
                            />
                            <QuickActionButton
                                label="Stake"
                                description="Liquid Staking"
                            />
                            <QuickActionButton
                                label="Lend"
                                description="Supply Assets"
                            />
                            <QuickActionButton
                                label="Leverage"
                                description="Perp Position"
                            />
                        </div>
                    </div>

                    {/* Advanced Builder Placeholder */}
                    <div className="flex-1 glass-panel rounded-2xl p-6 border border-dashed border-white/10 flex flex-col items-center justify-center text-center min-h-[200px]">
                        <div className="w-12 h-12 rounded-full bg-white/5 flex items-center justify-center mb-3">
                            <Terminal className="w-6 h-6 text-text-muted" />
                        </div>
                        <p className="text-sm text-text-muted">Advanced Action Builder</p>
                        <p className="text-xs text-text-muted/60 mt-1">Multi-step strategies & charting coming in Phase 2</p>
                    </div>
                </div>

                {/* Right Column: Constraints */}
                <div className="lg:col-span-3">
                    <ConstraintChecker ertId={selectedErtId} />
                </div>
            </div>
        </div>
    );
}

function QuickActionButton({ label, description, active = false }: { label: string; description: string; active?: boolean }) {
    return (
        <button
            className={`p-3 rounded-xl border transition-all text-left ${
                active
                    ? "bg-accent/10 border-accent/30 text-accent"
                    : "bg-white/5 border-white/5 text-text-muted hover:bg-white/10 hover:border-white/10"
            }`}
        >
            <span className={`text-sm font-medium block ${active ? "text-accent" : "text-white"}`}>{label}</span>
            <span className="text-[10px]">{description}</span>
        </button>
    );
}
