"use client";

import { ArrowDown, X, Bitcoin } from "lucide-react";

export function QuickActionsPanel() {
    return (
        <div className="glass-panel rounded-2xl p-6 h-full flex flex-col">
            <div className="flex items-center justify-between mb-6">
                <h3 className="text-white font-medium text-lg">Swap</h3>
                <button className="p-2 hover:bg-white/10 rounded-full text-text-muted hover:text-white transition-colors">
                    <X className="w-4 h-4" />
                </button>
            </div>

            <div className="flex-1 space-y-2">
                {/* FROM Input */}
                <div className="bg-background-secondary rounded-xl p-4 border border-white/5">
                    <div className="flex justify-between mb-2">
                        <span className="text-xs text-text-muted font-medium">FROM:</span>
                        <div className="flex items-center gap-2 bg-black/40 rounded-full px-2 py-0.5 border border-white/10 cursor-pointer">
                            <div className="w-4 h-4 rounded-full bg-bitcoin flex items-center justify-center text-[10px] text-white">B</div>
                            <span className="text-xs text-white">BTC</span>
                            <span className="text-xs text-text-muted">▼</span>
                        </div>
                    </div>
                    <div className="flex justify-between items-end">
                        <div className="text-xs text-text-muted">
                            Available: <span className="text-white">0.045 MAX</span>
                        </div>
                        <span className="text-xl font-mono text-white">0.024</span>
                    </div>
                </div>

                {/* Swap Icon */}
                <div className="flex justify-center -my-3 relative z-10">
                    <div className="bg-background-tertiary p-1.5 rounded-full border border-white/10">
                        <ArrowDown className="w-4 h-4 text-text-secondary" />
                    </div>
                </div>

                {/* TO Input */}
                <div className="bg-background-secondary rounded-xl p-4 border border-white/5">
                    <div className="flex justify-between mb-2">
                        <span className="text-xs text-text-muted font-medium">TO:</span>
                        <div className="flex items-center gap-2 bg-black/40 rounded-full px-2 py-0.5 border border-white/10 cursor-pointer">
                            <div className="w-4 h-4 rounded-full bg-accent flex items-center justify-center text-[10px] text-black font-bold">T</div>
                            <span className="text-xs text-white">USDT</span>
                            <span className="text-xs text-text-muted">▼</span>
                        </div>
                    </div>
                    <div className="flex justify-between items-end">
                        <div className="text-xs text-text-muted">
                            Receive:
                        </div>
                        <span className="text-xl font-mono text-white">24,230.00</span>
                    </div>
                </div>
            </div>

            <div className="mt-6 space-y-3">
                <div className="flex justify-between text-xs text-text-muted px-1">
                    <span>Rate</span>
                    <span>1 BTC = 98,230 USDT</span>
                </div>

                <button className="w-full bg-accent hover:bg-accent-hover text-black font-bold py-4 rounded-xl transition-all shadow-[0_4px_20px_rgba(143,212,96,0.3)] hover:shadow-[0_6px_25px_rgba(143,212,96,0.4)] hover:translate-y-[-1px] active:translate-y-[0px] flex items-center justify-center gap-2">
                    Confirm Swap
                    <span className="ml-2">→</span>
                </button>
            </div>
        </div>
    );
}
