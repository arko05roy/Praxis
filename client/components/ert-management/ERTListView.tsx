"use client";

import { useMyERTs } from "@/lib/hooks";
import { ERTCard } from "./ERTCard";
import { Loader2, Plus, Box } from "lucide-react";
import Link from "next/link";
import { useState } from "react";

export function ERTListView() {
    const { count, isLoading } = useMyERTs();

    if (isLoading) {
        return (
            <div className="flex items-center justify-center h-64">
                <Loader2 className="w-8 h-8 animate-spin text-accent" />
            </div>
        );
    }

    if (count === 0n) {
        return (
            <div className="flex flex-col items-center justify-center h-64 glass-panel rounded-2xl border-dashed border-white/10">
                <div className="w-16 h-16 bg-white/5 rounded-full flex items-center justify-center mb-4">
                    <Box className="w-8 h-8 text-text-muted" />
                </div>
                <h3 className="text-white font-medium mb-1">No Active ERTs</h3>
                <p className="text-sm text-text-muted mb-6">You don't have any Execution Rights yet.</p>

                <Link href="/dashboard/executor">
                    <button className="bg-accent hover:bg-accent-hover text-black font-bold py-2 px-6 rounded-xl transition-all flex items-center gap-2">
                        <Plus className="w-4 h-4" /> Request ERT
                    </button>
                </Link>
            </div>
        );
    }

    // Create array of indices [0, 1, ... count-1]
    const indices = Array.from({ length: Number(count) }, (_, i) => i);

    return (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {indices.map((index) => (
                <ERTCardByIndex key={index} index={index} />
            ))}

            {/* Add New Card (always visible at end) */}
            <Link href="/dashboard/executor" className="group">
                <div className="h-full min-h-[240px] rounded-2xl border border-dashed border-white/10 flex flex-col items-center justify-center hover:bg-white/5 transition-all text-text-muted hover:text-white cursor-pointer hover:border-accent/30">
                    <div className="w-12 h-12 rounded-full bg-white/5 flex items-center justify-center mb-3 group-hover:bg-accent group-hover:text-black transition-colors">
                        <Plus className="w-6 h-6" />
                    </div>
                    <span className="font-medium">Request New ERT</span>
                </div>
            </Link>
        </div>
    );
}

import { useERTByIndex } from "@/lib/hooks";
import { useAccount } from "wagmi";

function ERTCardByIndex({ index }: { index: number }) {
    const { address } = useAccount();
    const { data: tokenId, isLoading } = useERTByIndex(address, BigInt(index));

    if (isLoading || tokenId === undefined) {
        return (
            <div className="h-[240px] glass-panel rounded-2xl animate-pulse flex items-center justify-center">
                <Loader2 className="w-6 h-6 animate-spin text-white/20" />
            </div>
        );
    }

    return <ERTCard ertId={tokenId} />;
}
