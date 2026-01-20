"use client";

import { useState } from "react";
import { ERTSelector } from "@/components/trading-terminal/ERTSelector";
import { ConstraintChecker } from "@/components/trading-terminal/ConstraintChecker";
import { QuickTradePanel } from "@/components/trading-terminal/QuickTradePanel";
import { Terminal } from "lucide-react";

export default function TradingTerminalPage() {
    const [selectedErtId, setSelectedErtId] = useState<bigint | undefined>(undefined);

    return (
        <div className="max-w-7xl mx-auto space-y-6">
            <div className="flex items-center gap-3 mb-6">
                <div className="w-10 h-10 rounded-xl bg-accent/10 flex items-center justify-center text-accent">
                    <Terminal className="w-5 h-5" />
                </div>
                <div>
                    <h1 className="text-2xl font-bold text-white">Trading Terminal</h1>
                    <p className="text-sm text-text-secondary">Execute strategy actions using your active Execution Rights.</p>
                </div>
            </div>

            {/* Top Control Bar: Select ERT */}
            <div className="glass-panel p-4 rounded-xl flex items-center gap-4 border border-white/5">
                <div className="w-full md:w-1/3">
                    <label className="text-xs text-text-muted mb-1 block pl-1">Active Context</label>
                    <ERTSelector selectedId={selectedErtId} onSelect={setSelectedErtId} />
                </div>
                <div className="hidden md:block w-px h-10 bg-white/10 mx-2" />
                <div className="hidden md:flex flex-col">
                    <span className="text-xs text-text-muted">Session Status</span>
                    <span className="text-sm text-green-500 font-medium flex items-center gap-1">
                        ● Connected to Gateway
                    </span>
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 h-[calc(100vh-250px)] min-h-[600px]">
                {/* Left: Trade Execution */}
                <div className="lg:col-span-8 flex flex-col gap-6">
                    <QuickTradePanel ertId={selectedErtId} />

                    {/* Placeholder for Advanced Action Builder (Future) */}
                    <div className="flex-1 glass-panel rounded-2xl p-6 border-dashed border-white/10 flex flex-col items-center justify-center text-text-muted/50">
                        <p>Advanced Action Builder / Charting Area</p>
                        <p className="text-xs mt-2">Coming in Phase 2</p>
                    </div>
                </div>

                {/* Right: Constraints & Info */}
                <div className="lg:col-span-4 h-full">
                    <ConstraintChecker ertId={selectedErtId} />
                </div>
            </div>
        </div>
    );
}
