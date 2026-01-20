"use client";

import { SceptreStakingCard } from "@/components/yield-hub/SceptreStakingCard";
import { KineticLendingCard } from "@/components/yield-hub/KineticLendingCard";
import { YieldComparisonTable } from "@/components/yield-hub/YieldComparisonTable";
import { TrendingUp } from "lucide-react";

export default function YieldHubPage() {
    return (
        <div className="max-w-7xl mx-auto space-y-8">
            <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-accent/10 flex items-center justify-center text-accent">
                    <TrendingUp className="w-5 h-5" />
                </div>
                <div>
                    <h1 className="text-3xl font-bold text-white">Yield Hub</h1>
                    <p className="text-text-secondary">Deploy your idle capital into approved yield strategies on Flare Network.</p>
                </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                <SceptreStakingCard />
                <KineticLendingCard />
            </div>

            <YieldComparisonTable />
        </div>
    );
}
