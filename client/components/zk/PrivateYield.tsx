"use client";

import { useState, useCallback, useMemo } from "react";
import {
  TrendingUp,
  Shield,
  ChevronDown,
  Info,
  Coins,
  Landmark,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { ERTSelector } from "./ERTSelector";
import { ProofGenerator } from "./ProofGenerator";
import { ProofVerifier } from "./ProofVerifier";
import { ProofStatus } from "./ProofStatus";
import {
  generatePrivateYieldProof,
  executePrivateYield,
  getSupportedTokens,
  getSupportedAdapters,
  MOCK_ADDRESSES,
} from "@/lib/zk";
import type {
  ERTForPrivateExecution,
  PrivateYieldProof,
  PrivateExecutionResult,
} from "@/lib/zk";
import { usePositions } from "@/lib/hooks/executor";

type Step = "input" | "proving" | "verified" | "executing" | "complete";
type YieldAction = "stake" | "unstake" | "supply" | "withdraw";
type Protocol = "staking" | "lending";

const SUPPORTED_TOKENS = getSupportedTokens();
const SUPPORTED_ADAPTERS = getSupportedAdapters();

const parseAmount = (amountStr: string, decimals: number): bigint => {
  if (!amountStr || isNaN(parseFloat(amountStr))) return BigInt(0);
  const [whole, fraction = ""] = amountStr.split(".");
  const paddedFraction = fraction.padEnd(decimals, "0").slice(0, decimals);
  return BigInt(whole + paddedFraction);
};

// Helper to format balance with clamping and dust handling
const safeFormatBalance = (balance: bigint, decimals: number) => {
  if (balance <= 0n) return "0.00";
  const str = balance.toString().padStart(decimals + 1, "0");
  const whole = str.slice(0, -decimals) || "0";
  const fraction = str.slice(-decimals);

  const formatted = `${Number(whole).toLocaleString()}.${fraction.slice(0, 2)}`;

  // If formatted is "0.00" but balance > 0, show precision
  if (formatted === "0.00" && balance > 0n) {
    return "< 0.01";
  }
  return formatted;
};

const PROTOCOL_INFO = {
  staking: {
    name: "Liquid Staking",
    description: "Stake FLR and receive sFLR for liquid staking rewards",
    adapter: SUPPORTED_ADAPTERS.find((a) => a.type === "staking")!,
    icon: Coins,
    actions: ["stake", "unstake"] as YieldAction[],
    apy: "4.2%",
  },
  lending: {
    name: "Lending Protocol",
    description: "Supply assets to earn lending interest",
    adapter: SUPPORTED_ADAPTERS.find((a) => a.type === "lending")!,
    icon: Landmark,
    actions: ["supply", "withdraw"] as YieldAction[],
    apy: "3.8%",
  },
};

export function PrivateYield() {
  const [step, setStep] = useState<Step>("input");
  const [selectedERT, setSelectedERT] = useState<ERTForPrivateExecution | null>(null);
  const [protocol, setProtocol] = useState<Protocol>("staking");
  const [action, setAction] = useState<YieldAction>("stake");
  const [selectedToken, setSelectedToken] = useState(SUPPORTED_TOKENS[0]);
  const [amount, setAmount] = useState("");
  const [proof, setProof] = useState<PrivateYieldProof | null>(null);
  const [result, setResult] = useState<PrivateExecutionResult | null>(null);
  const [showTokenDropdown, setShowTokenDropdown] = useState(false);



  const protocolInfo = PROTOCOL_INFO[protocol];
  const ProtocolIcon = protocolInfo.icon;

  // Fetch positions for the selected ERT
  const { data: positions } = usePositions(selectedERT ? BigInt(selectedERT.id) : undefined);

  // Calculate available balance
  const availableBalance = useCallback(() => {
    if (!selectedERT) return BigInt(0);

    // If using Base Asset (USDC), use Available Capital logic
    // But only if we are supplying/depositing capital?
    // Actually, if we are "Staking FLR", we need FLR position.

    if (selectedToken.symbol === "USDC") {
      // Clamp negative available capital to 0
      return selectedERT.availableCapital > 0n ? selectedERT.availableCapital : 0n;
    }

    // For other assets, find position
    if (positions) {
      const position = positions.find(
        (p) => p.asset.toLowerCase() === selectedToken.address.toLowerCase()
      );
      if (position) {
        return position.size;
      }
    }
    return BigInt(0);
  }, [selectedERT, selectedToken, positions])(); // Immediately invoke or use useMemo

  const handleProtocolChange = (newProtocol: Protocol) => {
    setProtocol(newProtocol);
    setAction(PROTOCOL_INFO[newProtocol].actions[0]);
  };

  const generateProof = useCallback(async (): Promise<PrivateYieldProof> => {
    if (!selectedERT) throw new Error("No ERT selected");

    const amountBigInt = parseAmount(amount, selectedToken.decimals);

    return generatePrivateYieldProof(
      selectedERT,
      action,
      protocolInfo.adapter.address,
      selectedToken.address,
      amountBigInt
    );
  }, [selectedERT, action, selectedToken, amount, protocolInfo]);

  const handleProofComplete = (generatedProof: PrivateYieldProof) => {
    setProof(generatedProof);
    setStep("verified");
  };

  const handleExecute = async () => {
    if (!proof) return;
    setStep("executing");

    const executionResult = await executePrivateYield(proof);
    setResult(executionResult);
    setStep("complete");
  };

  const handleReset = () => {
    setStep("input");
    setProof(null);
    setResult(null);
    setAmount("");
  };

  const isValidInput =
    selectedERT &&
    amount &&
    parseFloat(amount) > 0 &&
    parseFloat(amount) > 0 &&
    parseAmount(amount, selectedToken.decimals) <= availableBalance;

  const getActionLabel = () => {
    switch (action) {
      case "stake":
        return "Stake";
      case "unstake":
        return "Unstake";
      case "supply":
        return "Supply";
      case "withdraw":
        return "Withdraw";
    }
  };

  return (
    <div className="glass-panel rounded-2xl p-6 space-y-6">
      {step === "input" && (
        <>
          {/* ERT Selection */}
          <ERTSelector selectedERT={selectedERT} onSelect={setSelectedERT} />

          {/* Protocol Selection */}
          <div className="mt-6">
            <label className="block text-sm font-medium text-gray-400 mb-3">
              Select Protocol
            </label>
            <div className="grid grid-cols-2 gap-3">
              {(["staking", "lending"] as Protocol[]).map((p) => {
                const info = PROTOCOL_INFO[p];
                const Icon = info.icon;
                return (
                  <button
                    key={p}
                    onClick={() => handleProtocolChange(p)}
                    className={`p-4 rounded-xl border transition-all ${protocol === p
                      ? "bg-[#8FD460]/10 border-[#8FD460]/30"
                      : "bg-black/30 border-white/5 hover:border-white/10"
                      }`}
                  >
                    <div className="flex items-center gap-3">
                      <div
                        className={`w-10 h-10 rounded-lg flex items-center justify-center ${protocol === p
                          ? "bg-[#8FD460]/20 text-[#8FD460]"
                          : "bg-white/5 text-gray-400"
                          }`}
                      >
                        <Icon className="w-5 h-5" />
                      </div>
                      <div className="text-left">
                        <div className="text-white font-medium">{info.name}</div>
                        <div className="text-xs text-gray-400">APY: {info.apy}</div>
                      </div>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Action Selection */}
          <div>
            <label className="block text-sm font-medium text-gray-400 mb-3">
              Action
            </label>
            <div className="flex gap-2">
              {protocolInfo.actions.map((a) => (
                <button
                  key={a}
                  onClick={() => setAction(a)}
                  className={`flex-1 py-3 rounded-xl text-sm font-medium transition-colors ${action === a
                    ? "bg-[#8FD460] text-black"
                    : "bg-white/5 text-gray-400 hover:bg-white/10 hover:text-white"
                    }`}
                >
                  {a.charAt(0).toUpperCase() + a.slice(1)}
                </button>
              ))}
            </div>
          </div>

          {/* Amount Input */}
          <div className="bg-black/30 rounded-xl p-4 border border-white/5">
            <div className="flex justify-between items-center mb-2">
              <span className="text-sm text-gray-400">
                Amount to {getActionLabel()} (Private)
              </span>
              {selectedERT && (
                <button
                  onClick={() =>
                    setAmount(
                      safeFormatBalance(
                        availableBalance,
                        selectedToken.decimals
                      ).replace(/,/g, "")
                    )
                  }
                  className="text-xs text-[#8FD460] hover:underline"
                >
                  Max: {safeFormatBalance(availableBalance, selectedToken.decimals)}
                </button>
              )}
            </div>
            <div className="flex items-center gap-3">
              <input
                type="number"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                placeholder="0.0"
                className="flex-1 bg-transparent text-2xl text-white outline-none placeholder:text-gray-600"
              />
              <div className="relative">
                <button
                  onClick={() => setShowTokenDropdown(!showTokenDropdown)}
                  className="flex items-center gap-2 bg-white/5 hover:bg-white/10 rounded-lg px-3 py-2 transition-colors"
                >
                  <span className="text-white font-medium">{selectedToken.symbol}</span>
                  <ChevronDown className="w-4 h-4 text-gray-400" />
                </button>
                {showTokenDropdown && (
                  <div className="absolute right-0 top-full mt-1 bg-[#141a17] border border-white/10 rounded-lg shadow-xl z-10 min-w-[140px]">
                    {SUPPORTED_TOKENS.map((token) => (
                      <button
                        key={token.symbol}
                        onClick={() => {
                          setSelectedToken(token);
                          setShowTokenDropdown(false);
                        }}
                        className="w-full px-4 py-2 text-left hover:bg-white/5 text-white"
                      >
                        {token.symbol}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Protocol Details */}
          <div className="bg-black/20 rounded-xl p-4 border border-white/5">
            <div className="flex items-center gap-3 mb-3">
              <ProtocolIcon className="w-5 h-5 text-[#8FD460]" />
              <span className="text-white font-medium">{protocolInfo.name}</span>
            </div>
            <p className="text-sm text-gray-400">{protocolInfo.description}</p>
            <div className="flex items-center gap-4 mt-3 text-sm">
              <div>
                <span className="text-gray-500">Protocol:</span>{" "}
                <span className="text-white">{protocolInfo.adapter.name}</span>
              </div>
              <div>
                <span className="text-gray-500">APY:</span>{" "}
                <span className="text-[#8FD460]">{protocolInfo.apy}</span>
              </div>
            </div>
          </div>

          {/* Privacy Notice */}
          <div className="bg-black/30 rounded-xl p-4 border border-[#8FD460]/20">
            <h4 className="text-[#8FD460] font-medium flex items-center gap-2">
              <Shield className="w-4 h-4" />
              This yield action will be private
            </h4>
            <ul className="text-sm text-gray-400 mt-3 space-y-1.5">
              <li className="flex items-center gap-2">
                <span className="w-1.5 h-1.5 rounded-full bg-[#8FD460]" />
                Protocol used will be hidden
              </li>
              <li className="flex items-center gap-2">
                <span className="w-1.5 h-1.5 rounded-full bg-[#8FD460]" />
                Deposit amount will be hidden
              </li>
              <li className="flex items-center gap-2">
                <span className="w-1.5 h-1.5 rounded-full bg-[#8FD460]" />
                Only shows &quot;deployed to yield&quot;
              </li>
            </ul>
          </div>

          {/* Generate Proof Button */}
          <Button
            onClick={() => setStep("proving")}
            disabled={!isValidInput}
            className="w-full bg-[#8FD460] hover:bg-[#7ac350] text-black font-medium py-6 rounded-xl disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <span className="flex items-center gap-2">
              <TrendingUp className="w-5 h-5" />
              Generate Private {getActionLabel()} Proof
            </span>
          </Button>

          {/* Info */}
          <div className="flex items-start gap-2 text-xs text-gray-500">
            <Info className="w-4 h-4 mt-0.5 shrink-0" />
            <span>
              {protocolInfo.adapter.name} will be used for this action.
              This is a demo on Coston2 testnet.
            </span>
          </div>
        </>
      )}

      {step === "proving" && (
        <ProofGenerator
          type="yield"
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
