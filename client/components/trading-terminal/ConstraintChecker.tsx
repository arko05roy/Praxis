"use client";

import { useExecutionRights, useERTDrawdownStatus, useERTCapitalUtilization } from "@/lib/hooks";
import { AlertCircle, CheckCircle, ShieldAlert } from "lucide-react";
import { cn } from "@/lib/utils";

interface ConstraintCheckerProps {
    ertId: bigint | undefined;
}

export function ConstraintChecker({ ertId }: ConstraintCheckerProps) {
    const { data: rights } = useExecutionRights(ertId);
    const { drawdownPercentage, maxDrawdownPercentage, isNearLimit } = useERTDrawdownStatus(ertId);
    const { utilizationPercentage } = useERTCapitalUtilization(ertId);

    if (!rights) return (
        <div className="glass-panel p-6 rounded-2xl flex flex-col items-center justify-center text-text-muted h-full opacity-50">
            <ShieldAlert className="w-8 h-8 mb-2" />
            <p className="text-sm">Select an ERT to view constraints</p>
        </div>
    );

    const constraints = rights.constraints;
    const maxDrawdown = (maxDrawdownPercentage || 0) * 100;
    const currentDrawdown = (drawdownPercentage || 0) * 100;

    return (
        <div className="glass-panel p-6 rounded-2xl h-full">
            <h3 className="text-sm font-semibold text-text-secondary mb-4 flex items-center gap-2">
                <CheckCircle className="w-4 h-4 text-accent" /> Risk Constraints
            </h3>

            <div className="space-y-6">
                {/* Drawdown Monitor */}
                <div className="space-y-2">
                    <div className="flex justify-between text-xs">
                        <span className="text-text-muted">Max Drawdown ({maxDrawdown}%)</span>
                        <span className={cn("font-bold", isNearLimit ? "text-error" : "text-white")}>
                            {currentDrawdown.toFixed(2)}% Used
                        </span>
                    </div>
                    <div className="h-2 w-full bg-black/40 rounded-full overflow-hidden border border-white/5">
                        <div
                            className={cn("h-full rounded-full transition-all", isNearLimit ? "bg-error" : "bg-green-500")}
                            style={{ width: `${Math.min((currentDrawdown / maxDrawdown) * 100, 100)}%` }}
                        />
                    </div>
                    {isNearLimit && <p className="text-[10px] text-error">Warning: Approaching drawdown limit.</p>}
                </div>

                {/* Capital Utilization */}
                <div className="space-y-2">
                    <div className="flex justify-between text-xs">
                        <span className="text-text-muted">Capital Utilization</span>
                        <span className="text-white">{(utilizationPercentage! * 100).toFixed(1)}%</span>
                    </div>
                    <div className="h-2 w-full bg-black/40 rounded-full overflow-hidden border border-white/5">
                        <div
                            className="h-full bg-blue-500 rounded-full transition-all"
                            style={{ width: `${(utilizationPercentage! * 100)}%` }}
                        />
                    </div>
                </div>

                {/* Whitelists */}
                <div className="pt-4 border-t border-white/5">
                    <p className="text-xs text-text-muted mb-2">Whitelisted Permissions</p>
                    <div className="flex flex-wrap gap-2">
                        {/* Mock permissions display since we get raw addresses */}
                        <span className="px-2 py-1 bg-white/5 rounded text-[10px] text-text-secondary border border-white/10">SparkDEX Swap</span>
                        <span className="px-2 py-1 bg-white/5 rounded text-[10px] text-text-secondary border border-white/10">BlazeSwap</span>
                        <span className="px-2 py-1 bg-white/5 rounded text-[10px] text-text-secondary border border-white/10">Kinetic Lending</span>
                        <span className="px-2 py-1 bg-white/5 rounded text-[10px] text-text-secondary border border-white/10">flr-USDC-WETH</span>
                    </div>
                </div>
            </div>
        </div>
    );
}
