"use client";

import { cn } from "@/lib/utils";
import { TrendingUp, X } from "lucide-react";

export function PositionPanel() {
    // Mock active position
    const position = {
        pair: "ETH-USD",
        side: "Long",
        size: "2.5 ETH",
        value: "$8,625.62",
        entryPrice: "$3,350.00",
        markPrice: "$3,450.25",
        pnl: "+$250.62",
        pnlPercent: "+8.4%",
        leverage: "5x"
    };

    return (
        <div className="glass-panel p-6 rounded-2xl">
            <h3 className="text-sm font-semibold text-text-secondary mb-4">Open Position</h3>

            <div className="overflow-x-auto">
                <table className="w-full text-left">
                    <thead className="text-[10px] text-text-muted uppercase tracking-wider border-b border-white/5">
                        <tr>
                            <th className="pb-3 pl-2">Pair</th>
                            <th className="pb-3">Size</th>
                            <th className="pb-3">Entry Price</th>
                            <th className="pb-3">Mark Price</th>
                            <th className="pb-3">PnL</th>
                            <th className="pb-3 text-right pr-2">Action</th>
                        </tr>
                    </thead>
                    <tbody className="text-sm">
                        <tr className="group hover:bg-white/5 transition-colors">
                            <td className="py-4 pl-2">
                                <div className="flex items-center gap-2">
                                    <span className={cn("text-[10px] px-1.5 py-0.5 rounded font-bold uppercase",
                                        position.side === 'Long' ? "bg-green-500/20 text-green-500" : "bg-red-500/20 text-red-500"
                                    )}>
                                        {position.side} {position.leverage}
                                    </span>
                                    <span className="font-bold text-white">{position.pair}</span>
                                </div>
                            </td>
                            <td className="py-4 font-mono text-text-secondary">{position.size}</td>
                            <td className="py-4 font-mono text-text-secondary">{position.entryPrice}</td>
                            <td className="py-4 font-mono text-white">{position.markPrice}</td>
                            <td className="py-4">
                                <div className={cn("font-bold flex flex-col", position.pnl.startsWith("+") ? "text-green-500" : "text-red-500")}>
                                    <span>{position.pnl}</span>
                                    <span className="text-[10px] opacity-80">{position.pnlPercent}</span>
                                </div>
                            </td>
                            <td className="py-4 text-right pr-2">
                                <button className="text-text-muted hover:text-white px-3 py-1 rounded bg-white/5 hover:bg-white/10 transition-colors text-xs font-medium">
                                    Close
                                </button>
                            </td>
                        </tr>
                    </tbody>
                </table>
            </div>
        </div>
    );
}
