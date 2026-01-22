"use client";

import { useState, useEffect } from "react";
import { Loader2, Lock, ShieldCheck } from "lucide-react";
import { PROOF_GENERATION_STAGES } from "@/lib/zk";
import type { PrivateProof } from "@/lib/zk";

interface ProofGeneratorProps {
  type: "swap" | "yield" | "perp" | "settlement";
  onComplete: (proof: PrivateProof) => void;
  generateProof: () => Promise<PrivateProof>;
}

export function ProofGenerator({ type, onComplete, generateProof }: ProofGeneratorProps) {
  const [progress, setProgress] = useState(0);
  const [stage, setStage] = useState("Initializing...");
  const [isGenerating, setIsGenerating] = useState(true);

  useEffect(() => {
    if (!isGenerating) return;

    let currentStage = 0;
    const interval = setInterval(() => {
      if (currentStage < PROOF_GENERATION_STAGES.length) {
        setProgress(PROOF_GENERATION_STAGES[currentStage].progress);
        setStage(PROOF_GENERATION_STAGES[currentStage].label);
        currentStage++;
      }
    }, 350);

    // Generate the actual proof
    generateProof().then((proof) => {
      clearInterval(interval);
      setProgress(100);
      setStage("Proof ready!");
      setIsGenerating(false);

      // Small delay before calling onComplete for visual effect
      setTimeout(() => {
        onComplete(proof);
      }, 500);
    });

    return () => clearInterval(interval);
  }, [generateProof, onComplete, isGenerating]);

  const getTypeLabel = () => {
    switch (type) {
      case "swap":
        return "Private Swap";
      case "yield":
        return "Private Yield";
      case "perp":
        return "Private Position";
      case "settlement":
        return "Private Settlement";
    }
  };

  return (
    <div className="text-center space-y-6 py-8">
      {/* Animated proof generation visualization */}
      <div className="relative w-32 h-32 mx-auto">
        {/* Outer ring */}
        <div className="absolute inset-0 rounded-full border-4 border-[#8FD460]/20" />

        {/* Progress ring */}
        <svg className="absolute inset-0 -rotate-90" viewBox="0 0 128 128">
          <circle
            cx="64"
            cy="64"
            r="58"
            fill="none"
            stroke="#8FD460"
            strokeWidth="4"
            strokeLinecap="round"
            strokeDasharray={`${progress * 3.64} 364`}
            className="transition-all duration-300"
          />
        </svg>

        {/* Spinning indicator */}
        {isGenerating && (
          <div
            className="absolute inset-2 rounded-full border-4 border-[#8FD460] border-t-transparent animate-spin"
            style={{ animationDuration: "1.5s" }}
          />
        )}

        {/* Center content */}
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          {isGenerating ? (
            <>
              <Lock className="w-6 h-6 text-[#8FD460] mb-1" />
              <span className="text-xl font-bold text-[#8FD460]">{progress}%</span>
            </>
          ) : (
            <ShieldCheck className="w-10 h-10 text-[#8FD460]" />
          )}
        </div>
      </div>

      {/* Status text */}
      <div>
        <h3 className="text-xl font-medium text-white">
          {isGenerating ? `Generating ${getTypeLabel()} Proof` : "Proof Generated"}
        </h3>
        <p className="text-gray-400 mt-1">{stage}</p>
      </div>

      {/* Progress bar */}
      <div className="w-full max-w-xs mx-auto bg-black/30 rounded-full h-2">
        <div
          className="bg-[#8FD460] h-2 rounded-full transition-all duration-300"
          style={{ width: `${progress}%` }}
        />
      </div>

      {/* Privacy notice */}
      <div className="bg-black/20 rounded-lg p-4 max-w-md mx-auto border border-[#8FD460]/10">
        <p className="text-sm text-gray-500">
          Your trade details are being encrypted into a zero-knowledge proof.
          Only compliance will be verifiable - the actual trade remains private.
        </p>
      </div>

      {/* Technical details */}
      <div className="flex justify-center gap-4 text-xs text-gray-600">
        <span>Protocol: Groth16</span>
        <span>|</span>
        <span>Curve: BN254</span>
        <span>|</span>
        <span>Type: {type}</span>
      </div>
    </div>
  );
}
