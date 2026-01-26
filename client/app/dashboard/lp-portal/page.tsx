"use client";

import { Suspense } from "react";
import { VaultInfoPanel } from "@/components/lp-portal/VaultInfoPanel";
import { useVaultInfo } from "@/lib/hooks";
import { LPBalanceCard } from "@/components/lp-portal/LPBalanceCard";
import { DepositForm } from "@/components/lp-portal/DepositForm";
import { WithdrawForm } from "@/components/lp-portal/WithdrawForm";

export default function LPPortalPage() {
    return (
        <div className="max-w-6xl mx-auto space-y-8">
            <div>
                <h1 className="text-3xl font-bold text-white mb-2">Liquidity Portal</h1>
                <p className="text-text-secondary">Provide liquidity to the Execution Vault and earn passive yield from executor fees.</p>
            </div>

            <VaultInfoPanel />

            <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
                <div className="lg:col-span-8 space-y-8">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                        <Suspense fallback={<div className="glass-panel p-6 rounded-2xl animate-pulse h-64" />}>
                            <DepositForm />
                        </Suspense>
                        <WithdrawForm />
                    </div>
                </div>

                <div className="lg:col-span-4 space-y-8">
                    <LPBalanceCard />

                    {/* Dynamic Yield Projection */}
                    <YieldProjectionCard />
                </div>
            </div>
        </div>
    );
}

function YieldProjectionCard() {
    const { data: vaultInfo, isLoading } = useVaultInfo(); // Imported from "@/lib/hooks" - need to adding import if missing

    // Simple mock calculation: Base 2% + (Utilization * 15%)
    // Real protocol would query historical returns
    const utilization = vaultInfo ? vaultInfo.utilizationRate : 0;
    const projectedApy = 2.0 + (utilization / 100 * 15.0);

    return (
        <div className="glass-panel p-6 rounded-2xl bg-accent/5 border-accent/20">
            <h4 className="text-accent font-semibold mb-2">Yield Projection</h4>
            <p className="text-sm text-text-muted mb-4">
                Based on current utilization and fee generation.
            </p>
            <div className="text-3xl font-bold text-white font-mono">
                {isLoading ? '...' : projectedApy.toFixed(1)}% <span className="text-sm font-sans text-text-secondary font-normal">APY</span>
            </div>
        </div>
    );
}
