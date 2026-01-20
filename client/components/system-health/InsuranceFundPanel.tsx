"use client";

import { useInsuranceFundStatus } from "@/lib/hooks";
import { formatUnits } from "viem";
import { Umbrella, Check } from "lucide-react";

export function InsuranceFundPanel() {
    const { data: fundStatus } = useInsuranceFundStatus();

    // Mock mocks
    const balance = "450,200";
    const target = "1,000,000";
    const progress = 45;
    const isHealthy = true;

    return (
        <div className="glass-panel p-6 rounded-2xl relative overflow-hidden">
            <div className="flex items-center gap-3 mb-6">
                <div className="w-10 h-10 rounded-full bg-blue-500/20 flex items-center justify-center text-blue-400">
                    <Umbrella className="w-5 h-5" />
                </div>
                <div>
                    <h3 className="font-semibold text-white">Insurance Fund</h3>
                    <p className="text-xs text-text-muted">buffer against executor defaults</p>
                </div>
            </div>

            <div className="space-y-4">
                <div className="flex items-end justify-between">
                    <div>
                        <p className="text-3xl font-bold text-white tracking-tight">${balance}</p>
                        <p className="text-xs text-text-muted mt-1 flex items-center gap-1">
                            {isHealthy && <Check className="w-3 h-3 text-green-500" />}
                            Fund is solvent
                        </p>
                    </div>
                    <div className="text-right">
                        <p className="text-xs text-text-muted">Target Size</p>
                        <p className="text-sm font-medium text-white">${target}</p>
                    </div>
                </div>

                <div className="space-y-1">
                    <div className="h-2 w-full bg-black/40 rounded-full overflow-hidden border border-white/5">
                        <div
                            className="h-full bg-blue-500 rounded-full transition-all"
                            style={{ width: `${progress}%` }}
                        />
                    </div>
                    <p className="text-[10px] text-right text-blue-400">{progress}% Funded</p>
                </div>
            </div>
        </div>
    );
}
