"use client";

import { useMyERTs, useExecutionRights } from "@/lib/hooks";
import { formatUnits } from "viem";
import { ChevronDown, Clock, Wallet } from "lucide-react";
import { useState } from "react";

interface ERTSelectorProps {
    selectedId: bigint | undefined;
    onSelect: (id: bigint) => void;
}

export function ERTSelector({ selectedId, onSelect }: ERTSelectorProps) {
    const { count } = useMyERTs();
    const [isOpen, setIsOpen] = useState(false);

    // Mock list for UI dev
    const mockIds = [1n, 2n];
    const displayIds = count > 0n ? Array.from({ length: Number(count) }, (_, i) => BigInt(i)) : mockIds;

    const SelectedERTDisplay = ({ id }: { id: bigint | undefined }) => {
        const { data: rights } = useExecutionRights(id);
        if (!id || !rights) return <span className="text-text-muted">Select an Active ERT...</span>;

        return (
            <div className="flex items-center justify-between w-full">
                <div className="flex items-center gap-3">
                    <div className="bg-accent/20 text-accent font-mono font-bold px-2 py-1 rounded text-xs">
                        #{id.toString()}
                    </div>
                    <div className="flex flex-col text-left">
                        <span className="text-sm font-bold text-white">${formatUnits(rights.capitalLimit, 6)}</span>
                        <span className="text-[10px] text-text-muted">Allocated Capital</span>
                    </div>
                </div>
            </div>
        );
    };

    return (
        <div className="relative z-50">
            <button
                onClick={() => setIsOpen(!isOpen)}
                className="w-full glass-panel bg-white/5 hover:bg-white/10 border border-white/10 rounded-xl p-3 flex items-center justify-between transition-all"
            >
                <SelectedERTDisplay id={selectedId} />
                <ChevronDown className={`w-4 h-4 text-text-secondary transition-transform ${isOpen ? 'rotate-180' : ''}`} />
            </button>

            {isOpen && (
                <div className="absolute top-full left-0 w-full mt-2 glass-panel bg-[#0a0f0d] border border-white/10 rounded-xl overflow-hidden shadow-2xl">
                    {displayIds.map((id) => (
                        <div
                            key={id.toString()}
                            onClick={() => { onSelect(id); setIsOpen(false); }}
                            className="p-3 hover:bg-white/5 cursor-pointer border-b border-white/5 last:border-0 flex items-center gap-3"
                        >
                            <span className="font-mono text-xs text-text-muted">#{id.toString()}</span>
                            <span className="text-sm text-white">ERT Contract</span>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
}
