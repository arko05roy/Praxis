"use client";

import { useState, useEffect, useMemo } from "react";
import { ChevronDown, Check, Shield, Clock, AlertCircle, Loader2 } from "lucide-react";
import { useAccount } from "wagmi";
import {
  useMyERTCount,
  useERTByIndex,
  useExecutionRights,
  useERTCapitalUtilization,
  type ExecutionRights,
} from "@/lib/hooks";
import type { ERTForPrivateExecution } from "@/lib/zk";

interface ERTSelectorProps {
  selectedERT: ERTForPrivateExecution | null;
  onSelect: (ert: ERTForPrivateExecution) => void;
}

// Convert ExecutionRights to ERTForPrivateExecution format
function convertToPrivateERT(rights: ExecutionRights): ERTForPrivateExecution {
  const availableCapital = rights.capitalLimit - rights.status.capitalDeployed;

  return {
    id: Number(rights.tokenId),
    capital: rights.capitalLimit,
    capitalUsed: rights.status.capitalDeployed,
    availableCapital: availableCapital > 0n ? availableCapital : 0n,
    allowedAdapters: [...rights.constraints.allowedAdapters].map(a => a.toLowerCase()),
    allowedAssets: [...rights.constraints.allowedAssets].map(a => a.toLowerCase()),
    maxPositionSize: (rights.capitalLimit * BigInt(rights.constraints.maxPositionSizeBps)) / 10000n,
    maxLeverage: rights.constraints.maxLeverage,
    status: rights.ertStatus === 1 ? "active" : rights.ertStatus === 2 ? "settled" : "expired",
    expiresAt: Number(rights.expiryTime),
  };
}

// Individual ERT item component that fetches its own data
function ERTItem({
  index,
  isSelected,
  onSelect,
}: {
  index: number;
  isSelected: boolean;
  onSelect: (ert: ERTForPrivateExecution) => void;
}) {
  const { address } = useAccount();

  // Get token ID at this index
  const { data: tokenId, isLoading: isLoadingId } = useERTByIndex(
    address,
    BigInt(index)
  );

  // Get execution rights for this token
  const { data: rights, isLoading: isLoadingRights } = useExecutionRights(tokenId);

  const isLoading = isLoadingId || isLoadingRights;

  if (isLoading) {
    return (
      <div className="w-full p-4 flex items-center gap-4 animate-pulse">
        <div className="w-10 h-10 rounded-lg bg-white/5" />
        <div className="flex-1">
          <div className="h-4 bg-white/5 rounded w-24 mb-2" />
          <div className="h-3 bg-white/5 rounded w-32" />
        </div>
      </div>
    );
  }

  if (!rights) return null;

  // Only show active ERTs
  if (rights.ertStatus !== 1) return null;

  const privateERT = convertToPrivateERT(rights);
  const availableCapital = Number(privateERT.availableCapital) / 1e6;

  const getTimeRemaining = (expiresAt: number) => {
    const now = Math.floor(Date.now() / 1000);
    const remaining = expiresAt - now;

    if (remaining <= 0) return "Expired";
    if (remaining < 3600) return `${Math.floor(remaining / 60)}m`;
    if (remaining < 86400) return `${Math.floor(remaining / 3600)}h`;
    return `${Math.floor(remaining / 86400)}d`;
  };

  return (
    <button
      onClick={() => onSelect(privateERT)}
      className={`w-full p-4 flex items-center gap-4 hover:bg-white/5 transition-colors ${
        isSelected ? "bg-[#8FD460]/10" : ""
      }`}
    >
      <div className="w-10 h-10 rounded-lg bg-[#8FD460]/20 flex items-center justify-center">
        <Shield className="w-5 h-5 text-[#8FD460]" />
      </div>

      <div className="flex-1 text-left">
        <div className="flex items-center gap-2">
          <span className="text-white font-medium">ERT #{privateERT.id}</span>
          <span className="text-xs px-2 py-0.5 rounded-full bg-[#8FD460]/20 text-[#8FD460]">
            Active
          </span>
        </div>

        <div className="flex items-center gap-4 mt-1 text-sm text-gray-400">
          <span>${availableCapital.toLocaleString()} available</span>
          <span className="flex items-center gap-1">
            <Clock className="w-3 h-3" />
            {getTimeRemaining(privateERT.expiresAt)}
          </span>
          <span>{privateERT.maxLeverage}x max</span>
        </div>
      </div>

      {isSelected && <Check className="w-5 h-5 text-[#8FD460]" />}
    </button>
  );
}

export function ERTSelector({ selectedERT, onSelect }: ERTSelectorProps) {
  const [isOpen, setIsOpen] = useState(false);
  const { address } = useAccount();

  // Get count of ERTs owned
  const { data: ertCount, isLoading: isLoadingCount } = useMyERTCount();

  const count = ertCount ? Number(ertCount) : 0;

  // If no wallet connected
  if (!address) {
    return (
      <div className="relative">
        <label className="block text-sm font-medium text-gray-400 mb-2">
          Select Execution Rights Token
        </label>
        <div className="w-full bg-black/30 border border-white/10 rounded-xl p-4 text-center">
          <p className="text-gray-400">Connect wallet to view your ERTs</p>
        </div>
      </div>
    );
  }

  // Loading state
  if (isLoadingCount) {
    return (
      <div className="relative">
        <label className="block text-sm font-medium text-gray-400 mb-2">
          Select Execution Rights Token
        </label>
        <div className="w-full bg-black/30 border border-white/10 rounded-xl p-4 flex items-center justify-center gap-2">
          <Loader2 className="w-5 h-5 text-gray-400 animate-spin" />
          <span className="text-gray-400">Loading ERTs...</span>
        </div>
      </div>
    );
  }

  // No ERTs found
  if (count === 0) {
    return (
      <div className="relative">
        <label className="block text-sm font-medium text-gray-400 mb-2">
          Select Execution Rights Token
        </label>
        <div className="w-full bg-black/30 border border-yellow-500/20 rounded-xl p-4">
          <div className="flex items-center gap-3 text-yellow-500">
            <AlertCircle className="w-5 h-5" />
            <div>
              <p className="font-medium">No ERTs Found</p>
              <p className="text-sm text-gray-400 mt-1">
                Mint an ERT from the Executor Portal to use private execution.
              </p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  const formatCapital = (amount: bigint) => {
    return `$${(Number(amount) / 1e6).toLocaleString()}`;
  };

  const getTimeRemaining = (expiresAt: number) => {
    const now = Math.floor(Date.now() / 1000);
    const remaining = expiresAt - now;

    if (remaining <= 0) return "Expired";
    if (remaining < 3600) return `${Math.floor(remaining / 60)}m`;
    if (remaining < 86400) return `${Math.floor(remaining / 3600)}h`;
    return `${Math.floor(remaining / 86400)}d`;
  };

  return (
    <div className="relative">
      <label className="block text-sm font-medium text-gray-400 mb-2">
        Select Execution Rights Token
      </label>

      {/* Selected ERT Display */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="w-full bg-black/30 border border-white/10 rounded-xl p-4 flex items-center justify-between hover:border-[#8FD460]/30 transition-colors"
      >
        {selectedERT ? (
          <div className="flex items-center gap-4">
            <div className="w-10 h-10 rounded-lg bg-[#8FD460]/20 flex items-center justify-center">
              <Shield className="w-5 h-5 text-[#8FD460]" />
            </div>
            <div className="text-left">
              <div className="flex items-center gap-2">
                <span className="text-white font-medium">ERT #{selectedERT.id}</span>
                <span
                  className={`text-xs px-2 py-0.5 rounded-full ${
                    selectedERT.status === "active"
                      ? "bg-[#8FD460]/20 text-[#8FD460]"
                      : "bg-gray-500/20 text-gray-400"
                  }`}
                >
                  {selectedERT.status}
                </span>
              </div>
              <div className="text-sm text-gray-400">
                {formatCapital(selectedERT.availableCapital)} available
              </div>
            </div>
          </div>
        ) : (
          <span className="text-gray-400">Select an ERT ({count} available)</span>
        )}

        <ChevronDown
          className={`w-5 h-5 text-gray-400 transition-transform ${
            isOpen ? "rotate-180" : ""
          }`}
        />
      </button>

      {/* Dropdown */}
      {isOpen && (
        <div className="absolute z-50 w-full mt-2 bg-[#141a17] border border-white/10 rounded-xl shadow-xl overflow-hidden max-h-[300px] overflow-y-auto">
          {Array.from({ length: count }, (_, i) => (
            <ERTItem
              key={i}
              index={i}
              isSelected={selectedERT?.id === i}
              onSelect={(ert) => {
                onSelect(ert);
                setIsOpen(false);
              }}
            />
          ))}
        </div>
      )}

      {/* Selected ERT Details */}
      {selectedERT && (
        <div className="mt-4 grid grid-cols-3 gap-3">
          <div className="bg-black/20 rounded-lg p-3 text-center">
            <div className="text-gray-400 text-xs mb-1">Total Capital</div>
            <div className="text-white font-medium">
              {formatCapital(selectedERT.capital)}
            </div>
          </div>
          <div className="bg-black/20 rounded-lg p-3 text-center">
            <div className="text-gray-400 text-xs mb-1">Max Leverage</div>
            <div className="text-white font-medium">{selectedERT.maxLeverage}x</div>
          </div>
          <div className="bg-black/20 rounded-lg p-3 text-center">
            <div className="text-gray-400 text-xs mb-1">Adapters</div>
            <div className="text-white font-medium">
              {selectedERT.allowedAdapters.length}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
