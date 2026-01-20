"use client";

import { ExecutorStatusCard } from "@/components/executor-portal/ExecutorStatusCard";
import { ReputationDashboard } from "@/components/executor-portal/ReputationDashboard";
import { RequestERTForm } from "@/components/executor-portal/RequestERTForm";

export default function ExecutorPortalPage() {
    return (
        <div className="max-w-6xl mx-auto space-y-8">
            <div>
                <h1 className="text-3xl font-bold text-white mb-2">Executor Portal</h1>
                <p className="text-text-secondary">Manage your reputation, request capital, and configure your execution strategies.</p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="md:col-span-1">
                    <ExecutorStatusCard />
                </div>
                <div className="md:col-span-2">
                    <ReputationDashboard />
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
                <div className="lg:col-span-8">
                    <h2 className="text-xl font-semibold text-white mb-4">Request New Capital</h2>
                    <RequestERTForm />
                </div>

                <div className="lg:col-span-4 space-y-6">
                    <div className="glass-panel p-6 rounded-2xl bg-white/5 border border-white/5">
                        <h3 className="text-lg font-semibold text-white mb-4">Tier Requirements</h3>
                        <div className="space-y-4">
                            <div className="space-y-1">
                                <div className="flex justify-between text-xs">
                                    <span className="text-text-muted">Next Tier</span>
                                    <span className="text-accent">ESTABLISHED</span>
                                </div>
                                <div className="h-1.5 w-full bg-black/40 rounded-full overflow-hidden">
                                    <div className="h-full w-[65%] bg-accent rounded-full" />
                                </div>
                                <p className="text-[10px] text-text-muted text-right">65% Completed</p>
                            </div>

                            <ul className="text-xs text-text-muted space-y-2 mt-4">
                                <li className="flex items-center gap-2"><div className="w-1.5 h-1.5 rounded-full bg-accent" /> 20+ Settlements</li>
                                <li className="flex items-center gap-2"><div className="w-1.5 h-1.5 rounded-full bg-accent" /> $500k+ Volume</li>
                                <li className="flex items-center gap-2"><div className="w-1.5 h-1.5 rounded-full bg-white/20" /> 60% Profit Rate</li>
                            </ul>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
