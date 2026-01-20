"use client";

import { UserPositionSummary } from "@/components/dashboard/UserPositionSummary";
import { ProtocolStatsCard } from "@/components/dashboard/ProtocolStatsCard";
import { AssetList } from "@/components/dashboard/AssetList";
import { QuickActionsPanel } from "@/components/dashboard/QuickActionsPanel";

export default function DashboardPage() {
    return (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 h-full">
            {/* Middle Column (Portfolio & Assets) */}
            <div className="lg:col-span-8 flex flex-col gap-6">
                <UserPositionSummary />

                <div className="flex-1">
                    <AssetList />
                </div>
            </div>

            {/* Right Column (Stats & Swap) */}
            <div className="lg:col-span-4 flex flex-col gap-6">
                <ProtocolStatsCard />
                <div className="flex-1 min-h-[400px]">
                    <QuickActionsPanel />
                </div>
            </div>
        </div>
    );
}
