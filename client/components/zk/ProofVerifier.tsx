"use client";

import { useState, useEffect } from "react";
import {
  Check,
  X,
  Loader2,
  Shield,
  Eye,
  EyeOff,
  Copy,
  ExternalLink,
} from "lucide-react";
import {
  verifyProof,
  formatAttestationKey,
  getPrivacyDescription,
} from "@/lib/zk";
import type { PrivateProof, ProofVerificationResult } from "@/lib/zk";
import { Button } from "@/components/ui/button";

interface ProofVerifierProps {
  proof: PrivateProof;
  onExecute: () => void;
  isExecuting?: boolean;
}

export function ProofVerifier({ proof, onExecute, isExecuting = false }: ProofVerifierProps) {
  const [verification, setVerification] = useState<ProofVerificationResult | null>(null);
  const [isVerifying, setIsVerifying] = useState(true);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    setIsVerifying(true);
    verifyProof(proof).then((result) => {
      setVerification(result);
      setIsVerifying(false);
    });
  }, [proof]);

  const privacyInfo = getPrivacyDescription(proof);

  const handleCopyHash = () => {
    navigator.clipboard.writeText(proof.proofHash);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const attestations = proof.attestations as Record<string, boolean>;

  return (
    <div className="space-y-6">
      {/* Proof Header */}
      <div className="flex items-center gap-4">
        <div
          className={`w-14 h-14 rounded-full flex items-center justify-center ${
            isVerifying
              ? "bg-gray-500/20"
              : verification?.valid
              ? "bg-[#8FD460]/20"
              : "bg-red-500/20"
          }`}
        >
          {isVerifying ? (
            <Loader2 className="w-7 h-7 text-gray-400 animate-spin" />
          ) : verification?.valid ? (
            <Shield className="w-7 h-7 text-[#8FD460]" />
          ) : (
            <X className="w-7 h-7 text-red-500" />
          )}
        </div>
        <div className="flex-1">
          <h3 className="text-xl font-medium text-white">
            {isVerifying
              ? "Verifying Proof..."
              : verification?.valid
              ? "Proof Verified"
              : "Verification Failed"}
          </h3>
          <div className="flex items-center gap-2 mt-1">
            <span className="text-gray-400 text-sm font-mono truncate max-w-[200px]">
              {proof.proofHash.slice(0, 10)}...{proof.proofHash.slice(-8)}
            </span>
            <button
              onClick={handleCopyHash}
              className="text-gray-500 hover:text-gray-300 transition-colors"
            >
              {copied ? (
                <Check className="w-4 h-4 text-[#8FD460]" />
              ) : (
                <Copy className="w-4 h-4" />
              )}
            </button>
          </div>
        </div>
      </div>

      {/* Public Attestations */}
      <div className="bg-black/30 rounded-xl p-5 border border-white/5">
        <h4 className="text-sm font-medium text-gray-400 mb-4 flex items-center gap-2">
          <Check className="w-4 h-4 text-[#8FD460]" />
          Public Attestations
        </h4>
        <div className="space-y-3">
          {Object.entries(attestations).map(([key, value]) => (
            <div
              key={key}
              className="flex justify-between items-center py-2 border-b border-white/5 last:border-0"
            >
              <span className="text-gray-300">{formatAttestationKey(key)}</span>
              <span
                className={`flex items-center gap-1.5 ${
                  value ? "text-[#8FD460]" : "text-red-500"
                }`}
              >
                {value ? (
                  <>
                    <Check className="w-4 h-4" />
                    PASS
                  </>
                ) : (
                  <>
                    <X className="w-4 h-4" />
                    FAIL
                  </>
                )}
              </span>
            </div>
          ))}
        </div>
      </div>

      {/* Privacy Information */}
      <div className="grid grid-cols-2 gap-4">
        {/* Hidden Data */}
        <div className="bg-black/30 rounded-xl p-4 border border-yellow-500/20">
          <h4 className="text-yellow-500 font-medium flex items-center gap-2 mb-3">
            <EyeOff className="w-4 h-4" />
            Private (Hidden)
          </h4>
          <ul className="space-y-2">
            {privacyInfo.hidden.map((item, i) => (
              <li key={i} className="text-sm text-gray-400 flex items-center gap-2">
                <span className="w-1.5 h-1.5 rounded-full bg-yellow-500/50" />
                {item}
              </li>
            ))}
          </ul>
        </div>

        {/* Revealed Data */}
        <div className="bg-black/30 rounded-xl p-4 border border-[#8FD460]/20">
          <h4 className="text-[#8FD460] font-medium flex items-center gap-2 mb-3">
            <Eye className="w-4 h-4" />
            Public (Revealed)
          </h4>
          <ul className="space-y-2">
            {privacyInfo.revealed.map((item, i) => (
              <li key={i} className="text-sm text-gray-400 flex items-center gap-2">
                <span className="w-1.5 h-1.5 rounded-full bg-[#8FD460]/50" />
                {item}
              </li>
            ))}
          </ul>
        </div>
      </div>

      {/* Verification Stats */}
      {verification && (
        <div className="flex justify-between items-center text-sm text-gray-500 px-1">
          <div className="flex items-center gap-4">
            <span>Protocol: {proof.protocol.toUpperCase()}</span>
            <span>Verified in: {verification.verificationTime}ms</span>
          </div>
          <span>ERT #{proof.publicInputs.ertId}</span>
        </div>
      )}

      {/* Execute Button */}
      <Button
        onClick={onExecute}
        disabled={!verification?.valid || isExecuting}
        className="w-full bg-[#8FD460] hover:bg-[#7ac350] text-black font-medium py-6 rounded-xl disabled:opacity-50 disabled:cursor-not-allowed"
      >
        {isExecuting ? (
          <span className="flex items-center gap-2">
            <Loader2 className="w-5 h-5 animate-spin" />
            Executing Privately...
          </span>
        ) : (
          <span className="flex items-center gap-2">
            <Shield className="w-5 h-5" />
            Execute Privately
          </span>
        )}
      </Button>
    </div>
  );
}
