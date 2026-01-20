"use client";

import { ExternalLink } from "lucide-react";

export function YieldComparisonTable() {
    const opportunities = [
        { asset: "FLR", protocol: "Sceptre", type: "Liquid Staking", apy: "8.4%", risk: "Low" },
        { asset: "FLR", protocol: "Kinetic", type: "Lending", apy: "5.1%", risk: "Low" },
        { asset: "USDC", protocol: "Kinetic", type: "Lending", apy: "4.2%", risk: "Low" },
        { asset: "WETH", protocol: "Kinetic", type: "Lending", apy: "2.8%", risk: "Low" },
        { asset: "FLR-USDC", protocol: "SparkDEX", type: "LP V3", apy: "24.5%", risk: "High" },
        { asset: "WETH-USDC", protocol: "BlazeSwap", type: "LP V2", apy: "18.2%", risk: "Medium" },
    ];

    return (
        <div className="glass-panel rounded-2xl overflow-hidden">
            <div className="p-6 border-b border-white/5">
                <h3 className="font-semibold text-white">Top Yield Opportunities</h3>
            </div>

            <div className="overflow-x-auto">
                <table className="w-full">
                    <thead className="bg-white/5 text-xs text-text-muted uppercase tracking-wider">
                        <tr>
                            <th className="px-6 py-4 text-left font-medium">Asset</th>
                            <th className="px-6 py-4 text-left font-medium">Protocol</th>
                            <th className="px-6 py-4 text-left font-medium">Strategy</th>
                            <th className="px-6 py-4 text-left font-medium">APY</th>
                            <th className="px-6 py-4 text-left font-medium">Risk</th>
                            <th className="px-6 py-4 text-right font-medium">Action</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-white/5">
                        {opportunities.map((opp, i) => (
                            <tr key={i} className="hover:bg-white/5 transition-colors group cursor-pointer">
                                <td className="px-6 py-4 text-sm font-bold text-white">{opp.asset}</td>
                                <td className="px-6 py-4 text-sm text-text-secondary">{opp.protocol}</td>
                                <td className="px-6 py-4 text-sm text-text-muted">{opp.type}</td>
                                <td className="px-6 py-4 text-sm font-bold text-accent">{opp.apy}</td>
                                <td className="px-6 py-4">
                                    <span className={`text-[10px] px-2 py-0.5 rounded border ${opp.risk === 'Low' ? 'bg-green-500/10 text-green-500 border-green-500/20' :
                                            opp.risk === 'Medium' ? 'bg-yellow-500/10 text-yellow-500 border-yellow-500/20' :
                                                'bg-red-500/10 text-red-500 border-red-500/20'
                                        }`}>
                                        {opp.risk}
                                    </span>
                                </td>
                                <td className="px-6 py-4 text-right">
                                    <button className="text-text-muted hover:text-white transition-colors">
                                        <ExternalLink className="w-4 h-4" />
                                    </button>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        </div>
    );
}
