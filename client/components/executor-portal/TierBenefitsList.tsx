"use client";

import { useExecutorStatus } from "@/lib/hooks";
import { Check, Shield, Lock, TrendingUp, DollarSign } from "lucide-react";
import { cn } from "@/lib/utils";

// Tier definitions based on ReputationManager contract
const TIERS = [
    {
        id: 0,
        name: "UNVERIFIED",
        maxCapital: 100,
        stakeReq: "50%",
        maxDrawdown: "20%",
        requirements: ["None"],
        status: "Entry Level"
    },
    {
        id: 1,
        name: "NOVICE",
        maxCapital: 1000,
        stakeReq: "25%",
        maxDrawdown: "15%",
        requirements: ["3 Settlements", "50% Profit Rate"],
        status: "Proven"
    },
    {
        id: 2,
        name: "VERIFIED",
        maxCapital: 10000,
        stakeReq: "15%",
        maxDrawdown: "10%",
        requirements: ["10 Settlements", "$5k Volume", "60% Profit Rate"],
        status: "Professional"
    },
    {
        id: 3,
        name: "ESTABLISHED",
        maxCapital: 100000,
        stakeReq: "10%",
        maxDrawdown: "10%",
        requirements: ["25 Settlements", "$50k Volume", "65% Profit Rate"],
        status: "Expert"
    },
    {
        id: 4,
        name: "ELITE",
        maxCapital: 500000,
        stakeReq: "5%",
        maxDrawdown: "15%",
        requirements: ["Whitelisted OR", "50 Settlements", "$500k Volume", "70% Profit Rate"],
        status: "Institutional"
    }
];

export function TierBenefitsList() {
    const { data: status, isLoading } = useExecutorStatus();
    const currentTier = status?.tier || 0;

    if (isLoading) {
        return (
            <div className="glass-panel p-6 rounded-2xl bg-white/5 border border-white/5 animate-pulse">
                <div className="h-6 w-32 bg-white/10 rounded mb-6"></div>
                <div className="space-y-4">
                    {[1, 2, 3].map((i) => (
                        <div key={i} className="h-40 bg-white/5 rounded-xl"></div>
                    ))}
                </div>
            </div>
        );
    }

    return (
        <div className="glass-panel p-6 rounded-2xl bg-white/5 border border-white/5">
            <h3 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
                <TrendingUp className="w-5 h-5 text-accent" />
                Reputation Tiers
            </h3>

            <div className="space-y-4">
                {TIERS.map((tier) => {
                    const isCurrent = tier.id === currentTier;
                    const isPast = tier.id < currentTier;
                    const isFuture = tier.id > currentTier;

                    return (
                        <div
                            key={tier.id}
                            className={cn(
                                "relative p-4 rounded-xl border transition-all",
                                isCurrent ? "bg-accent/10 border-accent/30 shadow-[0_0_15px_rgba(143,212,96,0.1)]" : "bg-white/5 border-white/5",
                                isPast ? "opacity-60" : ""
                            )}
                        >
                            {isCurrent && (
                                <div className="absolute -top-2 -right-2 bg-accent text-black text-[10px] font-bold px-2 py-0.5 rounded-full flex items-center gap-1 shadow-lg">
                                    <Check className="w-3 h-3" /> CURRENT
                                </div>
                            )}

                            <div className="flex justify-between items-start mb-3">
                                <div>
                                    <h4 className={cn("font-bold text-sm tracking-wide", isCurrent ? "text-white" : "text-text-secondary")}>
                                        {tier.name}
                                    </h4>
                                    <span className="text-[10px] text-text-muted">{tier.status}</span>
                                </div>
                                <div className="text-right">
                                    <div className="flex items-center gap-1 justify-end text-sm font-bold text-white">
                                        <DollarSign className="w-3 h-3 text-text-muted" />
                                        {tier.maxCapital.toLocaleString()}
                                    </div>
                                    <span className="text-[10px] text-text-muted">Max Capital</span>
                                </div>
                            </div>

                            {/* Specs Grid */}
                            <div className="grid grid-cols-2 gap-2 mb-3">
                                <div className="bg-black/20 rounded p-2">
                                    <span className="text-[10px] text-text-muted block">Stake Req</span>
                                    <span className="text-xs font-mono text-white">{tier.stakeReq}</span>
                                </div>
                                <div className="bg-black/20 rounded p-2">
                                    <span className="text-[10px] text-text-muted block">Max Drawdown</span>
                                    <span className="text-xs font-mono text-white">{tier.maxDrawdown}</span>
                                </div>
                            </div>

                            {/* Requirements */}
                            <div className="space-y-1">
                                <span className="text-[10px] text-text-muted block mb-1">Requirements</span>
                                {tier.requirements.map((req, i) => (
                                    <div key={i} className="flex items-center gap-2 text-[10px] text-text-secondary">
                                        {isPast || isCurrent ? (
                                            <Check className="w-3 h-3 text-accent" />
                                        ) : (
                                            <div className="w-1.5 h-1.5 rounded-full bg-white/20" />
                                        )}
                                        {req}
                                    </div>
                                ))}
                            </div>

                            {isFuture && (
                                <div className="absolute inset-0 bg-black/40 backdrop-blur-[1px] rounded-xl flex items-center justify-center opacity-0 hover:opacity-100 transition-opacity">
                                    <div className="bg-black/80 px-3 py-1.5 rounded-lg flex items-center gap-2 text-xs text-text-muted border border-white/10">
                                        <Lock className="w-3 h-3" /> Locked
                                    </div>
                                </div>
                            )}
                        </div>
                    );
                })}
            </div>
        </div>
    );
}


