"use client";

import { ExternalLink, Loader2 } from "lucide-react";
import { useSceptreStats, useKineticSupplyAPY, useExternalProtocolsAvailable } from "@/lib/hooks";

// Kinetic kToken addresses
const KINETIC_KTOKENS = {
    sFLR: '0x291487beC339c2fE5D83DD45F0a15EFC9Ac45656' as `0x${string}`,
    USDC: '0xDEeBaBe05BDA7e8C1740873abF715f16164C29B8' as `0x${string}`,
    WETH: '0x5C2400019017AE61F811D517D088Df732642DbD0' as `0x${string}`,
};

interface YieldOpportunity {
    asset: string;
    protocol: string;
    type: string;
    apy: string | number;
    risk: 'Low' | 'Medium' | 'High';
    isLoading?: boolean;
}

export function YieldComparisonTable() {
    const isAvailable = useExternalProtocolsAvailable();

    // Fetch real APY data
    const { data: sceptreStats, isLoading: sceptreLoading } = useSceptreStats();
    const { supplyAPY: sflrAPY, isLoading: sflrLoading } = useKineticSupplyAPY(KINETIC_KTOKENS.sFLR);
    const { supplyAPY: usdcAPY, isLoading: usdcLoading } = useKineticSupplyAPY(KINETIC_KTOKENS.USDC);
    const { supplyAPY: wethAPY, isLoading: wethLoading } = useKineticSupplyAPY(KINETIC_KTOKENS.WETH);

    // Build opportunities with real data where available
    const opportunities: YieldOpportunity[] = [
        {
            asset: "FLR",
            protocol: "Sceptre",
            type: "Liquid Staking",
            apy: sceptreStats?.apy ? `${sceptreStats.apy.toFixed(1)}%` : "~4.0%",
            risk: "Low",
            isLoading: sceptreLoading,
        },
        {
            asset: "sFLR",
            protocol: "Kinetic",
            type: "Lending",
            apy: sflrAPY ? `${sflrAPY.toFixed(2)}%` : "-",
            risk: "Low",
            isLoading: sflrLoading,
        },
        {
            asset: "USDC",
            protocol: "Kinetic",
            type: "Lending",
            apy: usdcAPY ? `${usdcAPY.toFixed(2)}%` : "-",
            risk: "Low",
            isLoading: usdcLoading,
        },
        {
            asset: "WETH",
            protocol: "Kinetic",
            type: "Lending",
            apy: wethAPY ? `${wethAPY.toFixed(2)}%` : "-",
            risk: "Low",
            isLoading: wethLoading,
        },
        // LP pools - these would need additional hooks to fetch from DEX contracts
        {
            asset: "FLR-USDC",
            protocol: "SparkDEX",
            type: "LP V3",
            apy: "Variable",
            risk: "High",
        },
        {
            asset: "WETH-USDC",
            protocol: "BlazeSwap",
            type: "LP V2",
            apy: "Variable",
            risk: "Medium",
        },
    ];

    // Sort by APY (highest first)
    const sortedOpportunities = [...opportunities].sort((a, b) => {
        const apyA = typeof a.apy === 'string' ? parseFloat(a.apy) || 0 : a.apy;
        const apyB = typeof b.apy === 'string' ? parseFloat(b.apy) || 0 : b.apy;
        return apyB - apyA;
    });

    return (
        <div className="glass-panel rounded-2xl overflow-hidden">
            <div className="p-6 border-b border-white/5 flex items-center justify-between">
                <h3 className="font-semibold text-white">Top Yield Opportunities</h3>
                {!isAvailable && (
                    <span className="text-xs bg-yellow-500/10 text-yellow-400 px-2 py-1 rounded border border-yellow-500/20">
                        Connect to Flare Mainnet
                    </span>
                )}
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
                        {sortedOpportunities.map((opp, i) => (
                            <tr key={i} className="hover:bg-white/5 transition-colors group cursor-pointer">
                                <td className="px-6 py-4 text-sm font-bold text-white">{opp.asset}</td>
                                <td className="px-6 py-4 text-sm text-text-secondary">{opp.protocol}</td>
                                <td className="px-6 py-4 text-sm text-text-muted">{opp.type}</td>
                                <td className="px-6 py-4 text-sm font-bold text-accent">
                                    {opp.isLoading ? (
                                        <Loader2 className="w-4 h-4 animate-spin text-text-muted" />
                                    ) : (
                                        opp.apy
                                    )}
                                </td>
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
