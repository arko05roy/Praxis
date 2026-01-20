"use client";

import { PieChart, AlertTriangle } from "lucide-react";

export function ExposureBreakdown() {
    // Mock exposure data
    const exposures = [
        { asset: "WETH", amount: "$1.2M", percent: 45, limit: 50, status: "OK" },
        { asset: "WBTC", amount: "$850k", percent: 32, limit: 40, status: "OK" },
        { asset: "FLR", amount: "$420k", percent: 15, limit: 30, status: "OK" },
        { asset: "USDC", amount: "$180k", percent: 8, limit: 100, status: "OK" },
    ];

    return (
        <div className="glass-panel p-6 rounded-2xl col-span-1 lg:col-span-2">
            <div className="flex items-center justify-between mb-6">
                <h3 className="font-semibold text-white flex items-center gap-2">
                    <PieChart className="w-4 h-4 text-accent" /> Asset Exposure
                </h3>
                <span className="text-xs bg-white/5 text-text-muted px-2 py-1 rounded border border-white/10">
                    Diversification Score: 8.5/10
                </span>
            </div>

            <div className="overflow-x-auto">
                <table className="w-full text-left">
                    <thead className="text-[10px] text-text-muted uppercase tracking-wider border-b border-white/5">
                        <tr>
                            <th className="pb-3 pl-2">Asset</th>
                            <th className="pb-3">Exposure Value</th>
                            <th className="pb-3">Current %</th>
                            <th className="pb-3">Max Limit %</th>
                            <th className="pb-3 text-right pr-2">Status</th>
                        </tr>
                    </thead>
                    <tbody className="text-sm">
                        {exposures.map((exp) => (
                            <tr key={exp.asset} className="hover:bg-white/5 transition-colors border-b border-white/5 last:border-0">
                                <td className="py-4 pl-2 font-bold text-white">{exp.asset}</td>
                                <td className="py-4 font-mono text-text-secondary">{exp.amount}</td>
                                <td className="py-4 font-mono text-white">{exp.percent}%</td>
                                <td className="py-4 font-mono text-text-muted">{exp.limit}%</td>
                                <td className="py-4 text-right pr-2">
                                    <span className={`text-[10px] px-2 py-0.5 rounded border ${exp.status === 'OK' ? 'bg-green-500/10 text-green-500 border-green-500/20' :
                                            'bg-red-500/10 text-red-500 border-red-500/20'
                                        }`}>
                                        {exp.status}
                                    </span>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        </div>
    );
}
