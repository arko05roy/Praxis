"use client";

import { Check, X, Loader2, ExternalLink, Copy, ArrowRight, AlertTriangle, Info } from "lucide-react";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import type { PrivateExecutionResult } from "@/lib/zk";

interface ProofStatusProps {
  result: PrivateExecutionResult | null;
  isExecuting: boolean;
  onReset: () => void;
  onViewHistory?: () => void;
  isSimulated?: boolean; // New prop to indicate simulation mode
}

export function ProofStatus({
  result,
  isExecuting,
  onReset,
  onViewHistory,
  isSimulated = true, // Default to simulated for now
}: ProofStatusProps) {
  const [copiedTx, setCopiedTx] = useState(false);
  const [copiedProof, setCopiedProof] = useState(false);

  const handleCopyTxHash = () => {
    if (result?.txHash) {
      navigator.clipboard.writeText(result.txHash);
      setCopiedTx(true);
      setTimeout(() => setCopiedTx(false), 2000);
    }
  };

  const handleCopyProofHash = () => {
    if (result?.proofHash) {
      navigator.clipboard.writeText(result.proofHash);
      setCopiedProof(true);
      setTimeout(() => setCopiedProof(false), 2000);
    }
  };

  if (isExecuting) {
    return (
      <div className="text-center space-y-6 py-8">
        {/* Executing animation */}
        <div className="relative w-24 h-24 mx-auto">
          <div className="absolute inset-0 rounded-full border-4 border-[#8FD460]/20" />
          <div
            className="absolute inset-0 rounded-full border-4 border-[#8FD460] border-t-transparent animate-spin"
            style={{ animationDuration: "1s" }}
          />
          <div className="absolute inset-0 flex items-center justify-center">
            <Loader2 className="w-8 h-8 text-[#8FD460] animate-spin" />
          </div>
        </div>

        <div>
          <h3 className="text-xl font-medium text-white">Executing Privately</h3>
          <p className="text-gray-400 mt-2">
            Submitting ZK proof to the network...
          </p>
        </div>

        <div className="bg-black/20 rounded-lg p-4 max-w-md mx-auto border border-[#8FD460]/10">
          <p className="text-sm text-gray-500">
            The blockchain only sees that a valid proof was submitted.
            Your trade details remain completely private.
          </p>
        </div>
      </div>
    );
  }

  if (!result) {
    return null;
  }

  return (
    <div className="text-center space-y-6 py-6">
      {/* Result icon */}
      <div
        className={`w-20 h-20 mx-auto rounded-full flex items-center justify-center ${
          result.success ? "bg-[#8FD460]/20" : "bg-red-500/20"
        }`}
      >
        {result.success ? (
          <Check className="w-10 h-10 text-[#8FD460]" />
        ) : (
          <X className="w-10 h-10 text-red-500" />
        )}
      </div>

      {/* Status text */}
      <div>
        <h3
          className={`text-2xl font-medium ${
            result.success ? "text-[#8FD460]" : "text-red-500"
          }`}
        >
          {result.success
            ? isSimulated
              ? "Proof Generated Successfully"
              : "Private Execution Complete"
            : "Execution Failed"}
        </h3>
        <p className="text-gray-400 mt-2">
          {result.success
            ? isSimulated
              ? "ZK proof has been generated and verified. Actual on-chain execution pending contract deployment."
              : "Your trade has been executed privately on-chain."
            : result.error || "An error occurred during execution."}
        </p>
      </div>

      {/* Simulation Warning */}
      {result.success && isSimulated && (
        <div className="bg-yellow-500/10 border border-yellow-500/30 rounded-xl p-4 max-w-md mx-auto">
          <div className="flex items-start gap-3">
            <AlertTriangle className="w-5 h-5 text-yellow-500 shrink-0 mt-0.5" />
            <div>
              <p className="text-yellow-500 font-medium text-sm">Demo Mode</p>
              <p className="text-yellow-500/70 text-xs mt-1">
                This is a simulated execution. Real on-chain ZK execution requires deployed verifier contracts.
                The proof is cryptographically valid but not yet submitted to the blockchain.
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Transaction details */}
      {result.success && (
        <div className="bg-black/30 rounded-xl p-5 max-w-md mx-auto space-y-4 border border-white/5">
          {/* Transaction Hash - only show if NOT simulated */}
          {result.txHash && !isSimulated && (
            <div className="flex items-center justify-between">
              <span className="text-gray-400 text-sm">Transaction</span>
              <div className="flex items-center gap-2">
                <span className="text-white font-mono text-sm">
                  {result.txHash.slice(0, 10)}...{result.txHash.slice(-6)}
                </span>
                <button
                  onClick={handleCopyTxHash}
                  className="text-gray-500 hover:text-gray-300 transition-colors"
                >
                  {copiedTx ? (
                    <Check className="w-4 h-4 text-[#8FD460]" />
                  ) : (
                    <Copy className="w-4 h-4" />
                  )}
                </button>
                <a
                  href={`https://coston2-explorer.flare.network/tx/${result.txHash}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-gray-500 hover:text-gray-300 transition-colors"
                >
                  <ExternalLink className="w-4 h-4" />
                </a>
              </div>
            </div>
          )}

          {/* Proof Hash - this is always real */}
          <div className="flex items-center justify-between">
            <span className="text-gray-400 text-sm">Proof Hash</span>
            <div className="flex items-center gap-2">
              <span className="text-white font-mono text-sm">
                {result.proofHash.slice(0, 10)}...{result.proofHash.slice(-6)}
              </span>
              <button
                onClick={handleCopyProofHash}
                className="text-gray-500 hover:text-gray-300 transition-colors"
              >
                {copiedProof ? (
                  <Check className="w-4 h-4 text-[#8FD460]" />
                ) : (
                  <Copy className="w-4 h-4" />
                )}
              </button>
            </div>
          </div>

          {/* Proof Protocol */}
          <div className="flex items-center justify-between">
            <span className="text-gray-400 text-sm">Protocol</span>
            <span className="text-white text-sm font-mono">GROTH16</span>
          </div>

          {/* Generation Time */}
          <div className="flex items-center justify-between">
            <span className="text-gray-400 text-sm">{isSimulated ? "Generation Time" : "Execution Time"}</span>
            <span className="text-white text-sm">{result.executionTime}ms</span>
          </div>
        </div>
      )}

      {/* Privacy reminder */}
      {result.success && (
        <div className="bg-[#8FD460]/5 rounded-lg p-4 max-w-md mx-auto border border-[#8FD460]/20">
          <div className="flex items-start gap-2">
            <Info className="w-4 h-4 text-[#8FD460] shrink-0 mt-0.5" />
            <div>
              <p className="text-sm text-[#8FD460]">
                {isSimulated
                  ? "Proof cryptographically hides:"
                  : "On-chain observers see: \"ERT executed action\""}
              </p>
              <p className="text-xs text-gray-500 mt-1">
                Token pair, amounts, and strategy remain completely hidden.
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Actions */}
      <div className="flex gap-3 justify-center max-w-md mx-auto">
        <Button
          onClick={onReset}
          variant="outline"
          className="flex-1 border-white/10 hover:bg-white/5"
        >
          New Execution
        </Button>
        {onViewHistory && (
          <Button
            onClick={onViewHistory}
            className="flex-1 bg-[#8FD460]/10 hover:bg-[#8FD460]/20 text-[#8FD460]"
          >
            <span className="flex items-center gap-2">
              View History
              <ArrowRight className="w-4 h-4" />
            </span>
          </Button>
        )}
      </div>
    </div>
  );
}
