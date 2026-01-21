"use client";

import { ExecutorStatusCard } from "@/components/executor-portal/ExecutorStatusCard";
import { ReputationDashboard } from "@/components/executor-portal/ReputationDashboard";
import { RequestERTForm } from "@/components/executor-portal/RequestERTForm";
import { TierBenefitsList } from "@/components/executor-portal/TierBenefitsList";

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
                    <TierBenefitsList />
                </div>
            </div>
        </div>
    );
}
