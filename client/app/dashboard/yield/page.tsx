"use client";

import { SceptreStakingCard } from "@/components/yield-hub/SceptreStakingCard";
import { KineticLendingCard } from "@/components/yield-hub/KineticLendingCard";
import { YieldComparisonTable } from "@/components/yield-hub/YieldComparisonTable";
import { TrendingUp, Wallet, PiggyBank, Percent } from "lucide-react";
import { useSceptreBalance, useKineticBalance } from "@/lib/hooks";
import { formatUnits } from "viem";

// Kinetic kToken addresses
const KINETIC_USDC = '0xDEeBaBe05BDA7e8C1740873abF715f16164C29B8' as `0x${string}`;

export default function YieldHubPage() {
    const { sFLRBalance, flrEquivalent } = useSceptreBalance();
    const { underlyingBalance: usdcSupplied } = useKineticBalance(KINETIC_USDC);

    // Calculate totals
    const sflrValue = flrEquivalent ? Number(formatUnits(flrEquivalent, 18)) : 0;
    const usdcValue = usdcSupplied ? Number(formatUnits(usdcSupplied, 6)) : 0;
    const totalDeposited = usdcValue + (sflrValue * 0.02); // Rough FLR price estimate

    return (
        <div className="max-w-7xl mx-auto space-y-6">
            {/* Header */}
            <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-accent/20 to-accent/5 flex items-center justify-center text-accent border border-accent/20">
                        <TrendingUp className="w-5 h-5" />
                    </div>
                    <div>
                        <h1 className="text-2xl font-bold text-white">Yield Hub</h1>
                        <p className="text-sm text-text-secondary">Deploy capital into yield strategies on Flare</p>
                    </div>
                </div>
            </div>

            {/* Stats Summary */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div className="glass-panel rounded-xl p-4 border border-white/5">
                    <div className="flex items-center gap-3">
                        <div className="w-9 h-9 rounded-lg bg-accent/10 flex items-center justify-center">
                            <Wallet className="w-4 h-4 text-accent" />
                        </div>
                        <div>
                            <p className="text-xs text-text-muted">Total Deposited</p>
                            <p className="text-lg font-bold text-white">
                                ${totalDeposited.toLocaleString(undefined, { maximumFractionDigits: 2 })}
                            </p>
                        </div>
                    </div>
                </div>

                <div className="glass-panel rounded-xl p-4 border border-white/5">
                    <div className="flex items-center gap-3">
                        <div className="w-9 h-9 rounded-lg bg-purple-500/10 flex items-center justify-center">
                            <PiggyBank className="w-4 h-4 text-purple-400" />
                        </div>
                        <div>
                            <p className="text-xs text-text-muted">Staked (Sceptre)</p>
                            <p className="text-lg font-bold text-white">
                                {sflrValue > 0 ? `${sflrValue.toLocaleString(undefined, { maximumFractionDigits: 2 })} FLR` : '--'}
                            </p>
                        </div>
                    </div>
                </div>

                <div className="glass-panel rounded-xl p-4 border border-white/5">
                    <div className="flex items-center gap-3">
                        <div className="w-9 h-9 rounded-lg bg-blue-500/10 flex items-center justify-center">
                            <Percent className="w-4 h-4 text-blue-400" />
                        </div>
                        <div>
                            <p className="text-xs text-text-muted">Supplied (Kinetic)</p>
                            <p className="text-lg font-bold text-white">
                                {usdcValue > 0 ? `$${usdcValue.toLocaleString(undefined, { maximumFractionDigits: 2 })}` : '--'}
                            </p>
                        </div>
                    </div>
                </div>
            </div>

            {/* Yield Cards */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <SceptreStakingCard />
                <KineticLendingCard />
            </div>

            {/* Comparison Table */}
            <YieldComparisonTable />
        </div>
    );
}
