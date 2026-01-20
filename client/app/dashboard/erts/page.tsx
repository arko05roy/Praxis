"use client";

import { ERTListView } from "@/components/ert-management/ERTListView";

export default function ERTManagementPage() {
    return (
        <div className="max-w-7xl mx-auto space-y-8">
            <div className="flex items-end justify-between">
                <div>
                    <h1 className="text-3xl font-bold text-white mb-2">My Execution Rights</h1>
                    <p className="text-text-secondary">Monitor your active positions, manage risk, and settle expired contracts.</p>
                </div>
            </div>

            {/* Stats Strip (Optional) */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div className="glass-panel p-4 rounded-xl flex flex-col">
                    <span className="text-xs text-text-muted mb-1">Total Allocated Capital</span>
                    <span className="text-xl font-bold text-white">$150,000</span>
                </div>
                <div className="glass-panel p-4 rounded-xl flex flex-col">
                    <span className="text-xs text-text-muted mb-1">Active Contracts</span>
                    <span className="text-xl font-bold text-white">2</span>
                </div>
                <div className="glass-panel p-4 rounded-xl flex flex-col">
                    <span className="text-xs text-text-muted mb-1">Total PnL (Open)</span>
                    <span className="text-xl font-bold text-accent">+$1,240.50</span>
                </div>
                <div className="glass-panel p-4 rounded-xl flex flex-col">
                    <span className="text-xs text-text-muted mb-1">Next Expiry</span>
                    <span className="text-xl font-bold text-white">14h 20m</span>
                </div>
            </div>

            <ERTListView />
        </div>
    );
}
