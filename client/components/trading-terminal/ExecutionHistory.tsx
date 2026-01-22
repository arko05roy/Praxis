"use client";

import { useState, useEffect } from "react";
import { History, ExternalLink, CheckCircle2, XCircle, Loader2, ArrowRightLeft, TrendingUp, Wallet } from "lucide-react";
import { cn } from "@/lib/utils";

interface Execution {
    id: string;
    type: "swap" | "stake" | "lend" | "withdraw";
    status: "pending" | "success" | "failed";
    timestamp: Date;
    details: string;
    txHash?: string;
    ertId: string;
}

interface ExecutionHistoryProps {
    ertId: bigint | undefined;
}

// Mock execution history - in production this would come from a hook/API
const mockExecutions: Execution[] = [
    {
        id: "1",
        type: "swap",
        status: "success",
        timestamp: new Date(Date.now() - 1000 * 60 * 5),
        details: "500 USDC → 0.156 WETH",
        txHash: "0x1234...abcd",
        ertId: "1"
    },
    {
        id: "2",
        type: "lend",
        status: "success",
        timestamp: new Date(Date.now() - 1000 * 60 * 30),
        details: "Supplied 1,000 USDC to Kinetic",
        txHash: "0x5678...efgh",
        ertId: "1"
    },
    {
        id: "3",
        type: "swap",
        status: "failed",
        timestamp: new Date(Date.now() - 1000 * 60 * 60),
        details: "200 USDC → FLR (Slippage exceeded)",
        ertId: "1"
    },
    {
        id: "4",
        type: "stake",
        status: "success",
        timestamp: new Date(Date.now() - 1000 * 60 * 120),
        details: "Staked 500 FLR via Sceptre",
        txHash: "0x9abc...ijkl",
        ertId: "2"
    }
];

const typeIcons = {
    swap: ArrowRightLeft,
    stake: TrendingUp,
    lend: Wallet,
    withdraw: Wallet
};

const typeColors = {
    swap: "text-blue-400",
    stake: "text-purple-400",
    lend: "text-green-400",
    withdraw: "text-orange-400"
};

export function ExecutionHistory({ ertId }: ExecutionHistoryProps) {
    const [executions, setExecutions] = useState<Execution[]>([]);

    useEffect(() => {
        // Filter executions by ERT ID if provided
        if (ertId) {
            setExecutions(mockExecutions.filter(e => e.ertId === ertId.toString()));
        } else {
            setExecutions(mockExecutions);
        }
    }, [ertId]);

    const formatTimeAgo = (date: Date) => {
        const seconds = Math.floor((Date.now() - date.getTime()) / 1000);
        if (seconds < 60) return "Just now";
        if (seconds < 3600) return `${Math.floor(seconds / 60)}m ago`;
        if (seconds < 86400) return `${Math.floor(seconds / 3600)}h ago`;
        return `${Math.floor(seconds / 86400)}d ago`;
    };

    const StatusIcon = ({ status }: { status: Execution["status"] }) => {
        switch (status) {
            case "success":
                return <CheckCircle2 className="w-3.5 h-3.5 text-green-500" />;
            case "failed":
                return <XCircle className="w-3.5 h-3.5 text-error" />;
            case "pending":
                return <Loader2 className="w-3.5 h-3.5 text-yellow-500 animate-spin" />;
        }
    };

    return (
        <div className="glass-panel rounded-2xl p-5 h-full flex flex-col">
            <div className="flex items-center justify-between mb-4">
                <h3 className="text-sm font-semibold text-white flex items-center gap-2">
                    <History className="w-4 h-4 text-text-muted" />
                    Execution History
                </h3>
                {ertId && (
                    <span className="text-xs text-text-muted">ERT #{ertId.toString()}</span>
                )}
            </div>

            <div className="flex-1 overflow-y-auto space-y-2 min-h-0">
                {executions.length === 0 ? (
                    <div className="flex flex-col items-center justify-center h-full text-center py-8">
                        <div className="w-10 h-10 rounded-full bg-white/5 flex items-center justify-center mb-3">
                            <History className="w-5 h-5 text-text-muted" />
                        </div>
                        <p className="text-sm text-text-muted">No executions yet</p>
                        <p className="text-xs text-text-muted/60 mt-1">
                            {ertId ? "Execute a trade to see history" : "Select an ERT to view history"}
                        </p>
                    </div>
                ) : (
                    executions.map((execution) => {
                        const TypeIcon = typeIcons[execution.type];
                        return (
                            <div
                                key={execution.id}
                                className={cn(
                                    "bg-black/20 rounded-xl p-3 border transition-colors",
                                    execution.status === "failed" ? "border-error/20" : "border-white/5 hover:border-white/10"
                                )}
                            >
                                <div className="flex items-start justify-between gap-3">
                                    <div className="flex items-start gap-3">
                                        <div className={cn(
                                            "w-8 h-8 rounded-lg flex items-center justify-center bg-white/5",
                                            typeColors[execution.type]
                                        )}>
                                            <TypeIcon className="w-4 h-4" />
                                        </div>
                                        <div className="flex flex-col">
                                            <div className="flex items-center gap-2">
                                                <span className="text-xs font-medium text-white capitalize">
                                                    {execution.type}
                                                </span>
                                                <StatusIcon status={execution.status} />
                                            </div>
                                            <span className="text-xs text-text-muted mt-0.5">
                                                {execution.details}
                                            </span>
                                        </div>
                                    </div>
                                    <div className="flex flex-col items-end">
                                        <span className="text-[10px] text-text-muted">
                                            {formatTimeAgo(execution.timestamp)}
                                        </span>
                                        {execution.txHash && (
                                            <a
                                                href={`https://coston2-explorer.flare.network/tx/${execution.txHash}`}
                                                target="_blank"
                                                rel="noopener noreferrer"
                                                className="text-[10px] text-accent hover:underline flex items-center gap-1 mt-1"
                                            >
                                                View <ExternalLink className="w-2.5 h-2.5" />
                                            </a>
                                        )}
                                    </div>
                                </div>
                            </div>
                        );
                    })
                )}
            </div>

            {executions.length > 0 && (
                <div className="pt-3 mt-3 border-t border-white/5">
                    <button className="w-full text-xs text-text-muted hover:text-white transition-colors">
                        View all transactions
                    </button>
                </div>
            )}
        </div>
    );
}
