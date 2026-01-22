"use client";

import { useMyERTs, useExecutionRights, useERTByIndex } from "@/lib/hooks";
import { formatUnits } from "viem";
import { ChevronDown } from "lucide-react";
import { useState } from "react";
import { useAccount } from "wagmi";

interface ERTSelectorProps {
    selectedId: bigint | undefined;
    onSelect: (id: bigint) => void;
}

export function ERTSelector({ selectedId, onSelect }: ERTSelectorProps) {
    const { count } = useMyERTs();
    const [isOpen, setIsOpen] = useState(false);

    // Get actual ERT IDs from contract
    const indices = count > 0n ? Array.from({ length: Number(count) }, (_, i) => i) : [];

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
                <div className="absolute top-full left-0 w-full mt-2 glass-panel bg-[#0a0f0d] border border-white/10 rounded-xl overflow-hidden shadow-2xl z-[100]">
                    {indices.map((index) => (
                        <ERTOptionByIndex
                            key={index}
                            index={index}
                            onSelect={(id) => { onSelect(id); setIsOpen(false); }}
                        />
                    ))}
                    {indices.length === 0 && (
                        <div className="p-3 text-xs text-text-muted text-center">
                            No Active ERTs
                        </div>
                    )}
                </div>
            )}
        </div>
    );
}

function ERTOptionByIndex({ index, onSelect }: { index: number, onSelect: (id: bigint) => void }) {
    const { address } = useAccount();
    const { data: tokenId, isLoading } = useERTByIndex(address, BigInt(index));
    const { data: rights, isLoading: rightsLoading } = useExecutionRights(tokenId);

    if (isLoading || rightsLoading || tokenId === undefined) {
        return (
            <div className="p-3 border-b border-white/5 flex items-center gap-3 animate-pulse">
                <div className="w-8 h-4 bg-white/10 rounded"></div>
                <div className="w-16 h-4 bg-white/10 rounded"></div>
            </div>
        );
    }

    // Don't show settled, expired, or liquidated ERTs
    // Status: 0=PENDING, 1=ACTIVE, 2=SETTLED, 3=EXPIRED, 4=LIQUIDATED
    if (rights && (rights.ertStatus === 2 || rights.ertStatus === 3 || rights.ertStatus === 4)) {
        return null;
    }

    return (
        <div
            onClick={() => onSelect(tokenId)}
            className="p-3 hover:bg-white/5 cursor-pointer border-b border-white/5 last:border-0 flex items-center gap-3"
        >
            <span className="font-mono text-xs text-text-muted">#{tokenId.toString()}</span>
            <span className="text-sm text-white">{rights?.ertStatusName ?? "ERT"}</span>
        </div>
    );
}
