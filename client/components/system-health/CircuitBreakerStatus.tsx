"use client";

import { useCircuitBreakerStatus } from "@/lib/hooks";
import { ShieldCheck, ShieldAlert, AlertOctagon } from "lucide-react";
import { cn } from "@/lib/utils";

export function CircuitBreakerStatus() {
    const { data: status } = useCircuitBreakerStatus();

    // Mock status if undefined
    const isTripped = status?.isTripped || false;
    const dailyLoss = 12.5; // percent
    const maxDailyLoss = 30.0; // percent

    return (
        <div className="glass-panel p-6 rounded-2xl relative overflow-hidden">
            {isTripped ? (
                <div className="absolute inset-0 bg-red-500/10 z-0 animate-pulse" />
            ) : (
                <div className="absolute inset-0 bg-green-500/5 z-0" />
            )}

            <div className="relative z-10">
                <div className="flex justify-between items-start mb-6">
                    <div>
                        <h3 className="font-semibold text-white flex items-center gap-2">
                            Circuit Breaker
                            {isTripped ? (
                                <span className="text-xs bg-red-500 text-white px-2 py-0.5 rounded font-bold uppercase">Tripped</span>
                            ) : (
                                <span className="text-xs bg-green-500/20 text-green-500 px-2 py-0.5 rounded font-bold uppercase border border-green-500/20">Active</span>
                            )}
                        </h3>
                        <p className="text-xs text-text-muted mt-1">
                            {isTripped
                                ? "Protocol interactions paused due to unusual activity."
                                : "Automated risk controls are monitoring all transactions."}
                        </p>
                    </div>
                    <div className={cn("p-3 rounded-xl border", isTripped ? "bg-red-500/20 border-red-500 text-red-500" : "bg-green-500/10 border-green-500/20 text-green-500")}>
                        {isTripped ? <AlertOctagon className="w-6 h-6" /> : <ShieldCheck className="w-6 h-6" />}
                    </div>
                </div>

                <div className="space-y-4">
                    <div>
                        <div className="flex justify-between text-xs mb-1">
                            <span className="text-text-muted">Daily Value Loss</span>
                            <span className={cn("font-bold", dailyLoss > maxDailyLoss * 0.8 ? "text-orange-500" : "text-white")}>
                                {dailyLoss.toFixed(2)}% / {maxDailyLoss.toFixed(0)}%
                            </span>
                        </div>
                        <div className="h-2 w-full bg-black/40 rounded-full overflow-hidden border border-white/5">
                            <div
                                className={cn("h-full rounded-full transition-all", isTripped ? "bg-red-500" : "bg-green-500")}
                                style={{ width: `${(dailyLoss / maxDailyLoss) * 100}%` }}
                            />
                        </div>
                    </div>

                    {isTripped && (
                        <div className="bg-red-500/10 border border-red-500/20 rounded-xl p-3 flex items-start gap-2">
                            <ShieldAlert className="w-4 h-4 text-red-500 mt-0.5" />
                            <div className="text-xs text-red-400">
                                <p className="font-bold mb-1">Emergency Cooldown Active</p>
                                <p>Trading and withdrawals are temporarily suspended. Admins are investigating.</p>
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}
