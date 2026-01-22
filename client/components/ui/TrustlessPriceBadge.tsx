"use client";

import { useState } from "react";
import { Shield, Info } from "lucide-react";
import { cn } from "@/lib/utils";

interface TrustlessPriceBadgeProps {
    size?: 'sm' | 'md' | 'lg';
    className?: string;
    showLabel?: boolean;
}

export function TrustlessPriceBadge({
    size = 'md',
    className,
    showLabel = true,
}: TrustlessPriceBadgeProps) {
    const [showTooltip, setShowTooltip] = useState(false);

    const sizeClasses = {
        sm: "text-[10px] px-1.5 py-0.5 gap-1",
        md: "text-xs px-2 py-1 gap-1.5",
        lg: "text-sm px-3 py-1.5 gap-2",
    };

    const iconSizes = {
        sm: "w-3 h-3",
        md: "w-3.5 h-3.5",
        lg: "w-4 h-4",
    };

    return (
        <div className="relative inline-block">
            <button
                onMouseEnter={() => setShowTooltip(true)}
                onMouseLeave={() => setShowTooltip(false)}
                className={cn(
                    "inline-flex items-center rounded-full font-medium transition-colors",
                    "bg-accent/10 text-accent border border-accent/20",
                    "hover:bg-accent/20",
                    sizeClasses[size],
                    className
                )}
            >
                <Shield className={iconSizes[size]} />
                {showLabel && <span>Trustless Price</span>}
                <Info className={cn(iconSizes[size], "opacity-60")} />
            </button>

            {/* Tooltip */}
            {showTooltip && (
                <div className="absolute z-50 bottom-full left-1/2 -translate-x-1/2 mb-2 w-64">
                    <div className="bg-background-secondary border border-white/10 rounded-lg p-3 shadow-xl">
                        <div className="flex items-start gap-2">
                            <Shield className="w-4 h-4 text-accent flex-shrink-0 mt-0.5" />
                            <div>
                                <p className="text-xs font-semibold text-white mb-1">
                                    Trustless Price Source
                                </p>
                                <p className="text-[11px] text-text-muted leading-relaxed">
                                    Price verified by Flare FTSO - decentralized oracle system that cannot be manipulated by executors or any single party.
                                </p>
                            </div>
                        </div>
                        {/* Arrow */}
                        <div className="absolute top-full left-1/2 -translate-x-1/2 -mt-px">
                            <div className="w-2 h-2 bg-background-secondary border-r border-b border-white/10 transform rotate-45" />
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}

// Compact version for inline use
export function TrustlessBadgeInline({ className }: { className?: string }) {
    return (
        <span
            className={cn(
                "inline-flex items-center gap-1 text-[10px] px-1.5 py-0.5 rounded",
                "bg-accent/10 text-accent border border-accent/20",
                className
            )}
            title="Price verified by Flare FTSO - trustless and decentralized"
        >
            <Shield className="w-2.5 h-2.5" />
            FTSO
        </span>
    );
}
