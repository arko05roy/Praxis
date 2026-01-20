"use client";

import { CircuitBreakerStatus } from "@/components/system-health/CircuitBreakerStatus";
import { InsuranceFundPanel } from "@/components/system-health/InsuranceFundPanel";
import { ExposureBreakdown } from "@/components/system-health/ExposureBreakdown";
import { HeartPulse } from "lucide-react";

export default function SystemHealthPage() {
    return (
        <div className="max-w-7xl mx-auto space-y-8">
            <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-accent/10 flex items-center justify-center text-accent">
                    <HeartPulse className="w-5 h-5" />
                </div>
                <div>
                    <h1 className="text-3xl font-bold text-white">System Health</h1>
                    <p className="text-text-secondary">Real-time monitoring of protocol risk parameters and safety modules.</p>
                </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                <CircuitBreakerStatus />
                <InsuranceFundPanel />
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                <ExposureBreakdown />
            </div>
        </div>
    );
}
