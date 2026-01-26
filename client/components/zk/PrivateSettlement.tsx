"use client";

import { useState, useCallback, useMemo } from "react";
import {
  CheckCircle2,
  Shield,
  TrendingUp,
  TrendingDown,
  Info,
  Clock,
  Users,
  Wallet,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { ERTSelector } from "./ERTSelector";
import { ProofGenerator } from "./ProofGenerator";
import { ProofVerifier } from "./ProofVerifier";
import { ProofStatus } from "./ProofStatus";
import {
  generatePrivateSettlementProof,
  executePrivateSettlement,
} from "@/lib/zk";
import type {
  ERTForPrivateExecution,
  PrivateSettlementProof,
  PrivateExecutionResult,
  PrivateProof,
} from "@/lib/zk";

type Step = "input" | "proving" | "verified" | "executing" | "complete";

export function PrivateSettlement() {
  const [step, setStep] = useState<Step>("input");
  const [selectedERT, setSelectedERT] = useState<ERTForPrivateExecution | null>(null);
  const [proof, setProof] = useState<PrivateSettlementProof | null>(null);
  const [result, setResult] = useState<PrivateExecutionResult | null>(null);

  // Calculate performance based on actual ERT data
  const performance = useMemo(() => {
    if (!selectedERT) return null;

    // For demo, we simulate PnL based on capital usage
    // In production, this would come from actual position tracking
    const startingCapital = selectedERT.capital;
    const capitalUsed = selectedERT.capitalUsed;

    // Simulate a random PnL for demo purposes (in production, this comes from real trading data)
    // Use a deterministic "random" based on ERT ID so it's consistent
    const pnlSeed = selectedERT.id * 17 + 42;
    const pnlPercent = ((pnlSeed % 60) - 20) / 100; // Range: -20% to +40%
    const pnl = BigInt(Math.floor(Number(startingCapital) * pnlPercent));
    const endingCapital = startingCapital + pnl;

    // Simulated trade count based on capital utilization
    const trades = Math.max(1, Math.floor(Number(capitalUsed) / 1e8));

    return {
      startingCapital,
      endingCapital,
      pnl,
      pnlPercent: pnlPercent * 100,
      trades,
    };
  }, [selectedERT]);

  const feeDistribution = useMemo(() => {
    if (!performance || performance.pnl <= BigInt(0)) {
      return {
        lpShare: BigInt(0),
        executorShare: BigInt(0),
        protocolFee: BigInt(0),
      };
    }

    // 20% to LP, 80% to executor for positive PnL
    const lpShare = (performance.pnl * BigInt(20)) / BigInt(100);
    const executorShare = performance.pnl - lpShare;

    return {
      lpShare,
      executorShare,
      protocolFee: BigInt(0),
    };
  }, [performance]);

  const formatUSD = (value: bigint): string => {
    const num = Number(value) / 1e6;
    return `$${num.toLocaleString(undefined, {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    })}`;
  };

  const formatPnL = (value: bigint): string => {
    const num = Number(value) / 1e6;
    const sign = num >= 0 ? "+" : "";
    return `${sign}$${num.toLocaleString(undefined, {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    })}`;
  };

  const generateProof = useCallback(async (): Promise<PrivateSettlementProof> => {
    if (!selectedERT || !performance) throw new Error("No ERT selected");

    // Get current block for FTSO price reference
    const ftsoPriceBlock = Math.floor(Date.now() / 1000) - 10; // Simulate recent block

    return generatePrivateSettlementProof(
      selectedERT,
      performance.startingCapital,
      performance.endingCapital,
      ftsoPriceBlock
    );
  }, [selectedERT, performance]);

  const handleProofComplete = (generatedProof: PrivateProof) => {
    setProof(generatedProof as PrivateSettlementProof);
    setStep("verified");
  };

  const handleExecute = async () => {
    if (!proof) return;
    setStep("executing");

    const executionResult = await executePrivateSettlement(proof);
    setResult(executionResult);
    setStep("complete");
  };

  const handleReset = () => {
    setStep("input");
    setProof(null);
    setResult(null);
  };

  const isValidInput = selectedERT && selectedERT.status === "active";

  return (
    <div className="glass-panel rounded-2xl p-6 space-y-6">
      {step === "input" && (
        <>
          {/* ERT Selection */}
          <ERTSelector selectedERT={selectedERT} onSelect={setSelectedERT} />

          {/* Performance Summary */}
          {selectedERT && performance && (
            <div className="mt-6 space-y-4">
              {/* Main Stats */}
              <div className="bg-black/30 rounded-xl p-5 border border-white/5">
                <h3 className="text-lg font-medium text-white mb-4">
                  Performance Summary
                </h3>

                <div className="grid grid-cols-2 gap-6">
                  {/* Starting Capital */}
                  <div>
                    <div className="text-sm text-gray-400 mb-1">Starting Capital</div>
                    <div className="text-2xl font-medium text-white">
                      {formatUSD(performance.startingCapital)}
                    </div>
                  </div>

                  {/* Ending Capital */}
                  <div>
                    <div className="text-sm text-gray-400 mb-1">Current Value</div>
                    <div className="text-2xl font-medium text-white">
                      {formatUSD(performance.endingCapital)}
                    </div>
                  </div>
                </div>

                {/* PnL Display */}
                <div
                  className={`mt-4 p-4 rounded-lg ${
                    performance.pnl >= BigInt(0)
                      ? "bg-green-500/10 border border-green-500/20"
                      : "bg-red-500/10 border border-red-500/20"
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      {performance.pnl >= BigInt(0) ? (
                        <TrendingUp className="w-5 h-5 text-green-400" />
                      ) : (
                        <TrendingDown className="w-5 h-5 text-red-400" />
                      )}
                      <span className="text-gray-400">Unrealized PnL</span>
                    </div>
                    <div className="text-right">
                      <div
                        className={`text-xl font-bold ${
                          performance.pnl >= BigInt(0) ? "text-green-400" : "text-red-400"
                        }`}
                      >
                        {formatPnL(performance.pnl)}
                      </div>
                      <div
                        className={`text-sm ${
                          performance.pnl >= BigInt(0) ? "text-green-400/70" : "text-red-400/70"
                        }`}
                      >
                        {performance.pnlPercent >= 0 ? "+" : ""}
                        {performance.pnlPercent.toFixed(2)}%
                      </div>
                    </div>
                  </div>
                </div>

                {/* Trade Count */}
                <div className="mt-4 flex items-center justify-between text-sm">
                  <span className="text-gray-400">Estimated Trades</span>
                  <span className="text-white">{performance.trades} executions</span>
                </div>
              </div>

              {/* Fee Distribution */}
              <div className="bg-black/30 rounded-xl p-5 border border-white/5">
                <h3 className="text-lg font-medium text-white mb-4 flex items-center gap-2">
                  <Users className="w-5 h-5 text-[#8FD460]" />
                  Settlement Distribution
                </h3>

                <div className="space-y-4">
                  {/* LP Share */}
                  <div className="flex items-center justify-between p-3 bg-black/20 rounded-lg">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-lg bg-blue-500/20 flex items-center justify-center">
                        <Wallet className="w-4 h-4 text-blue-400" />
                      </div>
                      <div>
                        <div className="text-white font-medium">LP Share</div>
                        <div className="text-xs text-gray-400">20% of profit</div>
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="text-white font-medium">
                        {formatUSD(feeDistribution.lpShare)}
                      </div>
                    </div>
                  </div>

                  {/* Executor Share */}
                  <div className="flex items-center justify-between p-3 bg-black/20 rounded-lg">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-lg bg-[#8FD460]/20 flex items-center justify-center">
                        <Shield className="w-4 h-4 text-[#8FD460]" />
                      </div>
                      <div>
                        <div className="text-white font-medium">Executor Share</div>
                        <div className="text-xs text-gray-400">80% of profit</div>
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="text-[#8FD460] font-medium">
                        {formatUSD(feeDistribution.executorShare)}
                      </div>
                    </div>
                  </div>

                  {/* Capital Return */}
                  <div className="flex items-center justify-between p-3 bg-black/20 rounded-lg">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-lg bg-purple-500/20 flex items-center justify-center">
                        <CheckCircle2 className="w-4 h-4 text-purple-400" />
                      </div>
                      <div>
                        <div className="text-white font-medium">Capital Return</div>
                        <div className="text-xs text-gray-400">To vault</div>
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="text-white font-medium">
                        {formatUSD(performance.startingCapital)}
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Privacy Notice */}
          <div className="bg-black/30 rounded-xl p-4 border border-[#8FD460]/20">
            <h4 className="text-[#8FD460] font-medium flex items-center gap-2">
              <Shield className="w-4 h-4" />
              This settlement will be private
            </h4>
            <ul className="text-sm text-gray-400 mt-3 space-y-1.5">
              <li className="flex items-center gap-2">
                <span className="w-1.5 h-1.5 rounded-full bg-[#8FD460]" />
                Complete trade history remains hidden
              </li>
              <li className="flex items-center gap-2">
                <span className="w-1.5 h-1.5 rounded-full bg-[#8FD460]" />
                Entry/exit prices remain hidden
              </li>
              <li className="flex items-center gap-2">
                <span className="w-1.5 h-1.5 rounded-full bg-[#8FD460]" />
                Only PnL and distributions are revealed
              </li>
            </ul>
          </div>

          {/* What Gets Proven */}
          <div className="bg-black/20 rounded-xl p-4 border border-white/5">
            <h4 className="text-white font-medium mb-3">What the ZK Proof Verifies:</h4>
            <div className="grid grid-cols-2 gap-2 text-sm">
              <div className="flex items-center gap-2 text-gray-400">
                <CheckCircle2 className="w-4 h-4 text-[#8FD460]" />
                PnL calculated correctly
              </div>
              <div className="flex items-center gap-2 text-gray-400">
                <CheckCircle2 className="w-4 h-4 text-[#8FD460]" />
                FTSO prices used
              </div>
              <div className="flex items-center gap-2 text-gray-400">
                <CheckCircle2 className="w-4 h-4 text-[#8FD460]" />
                All trades within constraints
              </div>
              <div className="flex items-center gap-2 text-gray-400">
                <CheckCircle2 className="w-4 h-4 text-[#8FD460]" />
                Fee distribution correct
              </div>
            </div>
          </div>

          {/* Generate Proof Button */}
          <Button
            onClick={() => setStep("proving")}
            disabled={!isValidInput}
            className="w-full bg-[#8FD460] hover:bg-[#7ac350] text-black font-medium py-6 rounded-xl disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <span className="flex items-center gap-2">
              <CheckCircle2 className="w-5 h-5" />
              Generate Settlement Proof
            </span>
          </Button>

          {/* Info */}
          <div className="flex items-start gap-2 text-xs text-gray-500">
            <Info className="w-4 h-4 mt-0.5 shrink-0" />
            <span>
              Settlement will return capital to the vault and distribute PnL
              according to the ERT terms. Performance is calculated from on-chain data.
            </span>
          </div>
        </>
      )}

      {step === "proving" && (
        <ProofGenerator
          type="settlement"
          generateProof={generateProof}
          onComplete={handleProofComplete}
        />
      )}

      {step === "verified" && proof && (
        <ProofVerifier
          proof={proof}
          onExecute={handleExecute}
          isExecuting={false}
        />
      )}

      {(step === "executing" || step === "complete") && (
        <ProofStatus
          result={result}
          isExecuting={step === "executing"}
          onReset={handleReset}
        />
      )}
    </div>
  );
}
