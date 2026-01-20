"use client";

import { useExecutorStatus } from "@/lib/hooks";
import { Shield, CheckCircle, XCircle } from "lucide-react";

export function ExecutorStatusCard() {
    const { data: status, isLoading } = useExecutorStatus();

    const isAuthorized = status?.isAuthorized || false;
    const tierName = status?.tierName || "UNVERIFIED";

    return (
        <div className="glass-panel rounded-2xl p-6 relative overflow-hidden group">
            {/* Background Glow */}
            <div className="absolute top-0 right-0 w-32 h-32 bg-blue-500/10 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2" />

            <div className="flex items-start justify-between mb-4 relative z-10">
                <div>
                    <h3 className="text-text-secondary text-sm font-medium mb-1">Executor Status</h3>
                    <div className="flex items-center gap-3">
                        <span className="text-2xl font-bold text-white tracking-tight">{tierName}</span>
                        {isAuthorized ? (
                            <span className="bg-accent/10 text-accent text-xs px-2 py-0.5 rounded-md border border-accent/20 flex items-center gap-1">
                                <CheckCircle className="w-3 h-3" /> Authorized
                            </span>
                        ) : (
                            <span className="bg-white/5 text-text-muted text-xs px-2 py-0.5 rounded-md border border-white/10 flex items-center gap-1">
                                <XCircle className="w-3 h-3" /> Not Authorized
                            </span>
                        )}
                    </div>
                </div>
                <div className="p-3 rounded-xl bg-white/5 border border-white/5">
                    <Shield className="w-5 h-5 text-blue-400" />
                </div>
            </div>

            <div className="text-xs text-text-muted relative z-10">
                {isAuthorized
                    ? "You are authorized to request Execution Rights and manage trading strategies."
                    : "Complete verification to upgrade your tier and access higher capital limits."}
            </div>
        </div>
    );
}
