"use client";

import { useState, useCallback, useMemo, useEffect } from "react";
import {
  ArrowDown,
  Shield,
  AlertCircle,
  ChevronDown,
  Info,
  CheckCircle2,
  XCircle,
  AlertTriangle,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { ERTSelector } from "./ERTSelector";
import { ProofGenerator } from "./ProofGenerator";
import { ProofVerifier } from "./ProofVerifier";
import { ProofStatus } from "./ProofStatus";
import {
  generatePrivateSwapProof,
  getSupportedTokens,
  MOCK_ADDRESSES,
} from "@/lib/zk";
import { useTokenApproval } from "@/lib/hooks/useTokenApproval";
import { usePositions } from "@/lib/hooks/executor";
import { useChainId } from "wagmi";
import { getAddresses } from "@/lib/contracts/addresses";
import type {
  ERTForPrivateExecution,
  PrivateSwapProof,
  PrivateExecutionResult,
  PrivateProof,
} from "@/lib/zk";
import { usePrivateExecution } from "@/lib/hooks/usePrivateExecution";

type Step = "input" | "proving" | "verified" | "executing" | "complete";

const SUPPORTED_TOKENS = getSupportedTokens();

const parseAmount = (amount: string, decimals: number): bigint => {
  if (!amount || isNaN(parseFloat(amount))) return BigInt(0);
  const [whole, fraction = ""] = amount.split(".");
  const paddedFraction = fraction.padEnd(decimals, "0").slice(0, decimals);
  return BigInt(whole + paddedFraction);
};

// Helper to format balance with clamping and dust handling (moved up or used consistently)
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

export function PrivateSwap() {
  const [step, setStep] = useState<Step>("input");
  const [selectedERT, setSelectedERT] = useState<ERTForPrivateExecution | null>(null);
  const [tokenIn, setTokenIn] = useState(SUPPORTED_TOKENS[0]);
  const [tokenOut, setTokenOut] = useState(SUPPORTED_TOKENS[1]);
  const [amountIn, setAmountIn] = useState("");
  const [slippage, setSlippage] = useState("2");
  const [proof, setProof] = useState<PrivateSwapProof | null>(null);
  const [result, setResult] = useState<PrivateExecutionResult | null>(null);
  const [showTokenInDropdown, setShowTokenInDropdown] = useState(false);
  const [showTokenOutDropdown, setShowTokenOutDropdown] = useState(false);

  const {
    executeSwap,
    isPending,
    isConfirming,
    isSuccess,
    hash
  } = usePrivateExecution();

  const chainId = useChainId();
  const addresses = getAddresses(chainId);
  // Default to zero address if not yet deployed to prevent crash, though it should be there.
  const zkExecutorAddress = addresses.ZKExecutor || "0x0000000000000000000000000000000000000000";

  const {
    isApproved,
    approve: approveToken,
    isPending: isApprovePending,
    isConfirming: isApproveConfirming
  } = useTokenApproval(
    tokenIn.address as `0x${string}`,
    zkExecutorAddress,
    parseAmount(amountIn, tokenIn.decimals)
  );

  // Check compliance status
  const complianceStatus = useMemo(() => {
    if (!selectedERT) {
      return {
        adapterAllowed: false,
        tokenInAllowed: false,
        tokenOutAllowed: false,
        amountWithinLimit: false,
        allPassing: false,
      };
    }

    const adapter = MOCK_ADDRESSES.MockSimpleDEX.toLowerCase();
    const adapterAllowed = selectedERT.allowedAdapters.some(
      (a) => a.toLowerCase() === adapter
    );

    const tokenInAllowed = selectedERT.allowedAssets.some(
      (a) => a.toLowerCase() === tokenIn.address.toLowerCase()
    );

    const tokenOutAllowed = selectedERT.allowedAssets.some(
      (a) => a.toLowerCase() === tokenOut.address.toLowerCase()
    );

    const amountInBigInt = parseAmount(amountIn, tokenIn.decimals);
    const amountWithinLimit = amountInBigInt <= selectedERT.maxPositionSize;

    return {
      adapterAllowed,
      tokenInAllowed,
      tokenOutAllowed,
      amountWithinLimit,
      allPassing: adapterAllowed && tokenInAllowed && tokenOutAllowed && amountWithinLimit,
    };
  }, [selectedERT, tokenIn, tokenOut, amountIn]);

  const handleSwapTokens = () => {
    const temp = tokenIn;
    setTokenIn(tokenOut);
    setTokenOut(temp);
  };



  const calculateMinAmountOut = useCallback((): bigint => {
    const amountInBigInt = parseAmount(amountIn, tokenIn.decimals);
    const slippagePercent = parseFloat(slippage) / 100;
    const minOut = amountInBigInt - BigInt(Math.floor(Number(amountInBigInt) * slippagePercent));
    if (tokenIn.decimals > tokenOut.decimals) {
      return minOut / BigInt(10 ** (tokenIn.decimals - tokenOut.decimals));
    } else if (tokenOut.decimals > tokenIn.decimals) {
      return minOut * BigInt(10 ** (tokenOut.decimals - tokenIn.decimals));
    }
    return minOut;
  }, [amountIn, tokenIn, tokenOut, slippage]);

  const generateProof = useCallback(async (): Promise<PrivateSwapProof> => {
    if (!selectedERT) throw new Error("No ERT selected");

    const amountInBigInt = parseAmount(amountIn, tokenIn.decimals);
    const minAmountOut = calculateMinAmountOut();

    return generatePrivateSwapProof(
      selectedERT,
      tokenIn.address,
      tokenOut.address,
      amountInBigInt,
      minAmountOut,
      MOCK_ADDRESSES.MockSimpleDEX
    );
  }, [selectedERT, tokenIn, tokenOut, amountIn, calculateMinAmountOut]);

  const handleProofComplete = (generatedProof: PrivateProof) => {
    setProof(generatedProof as PrivateSwapProof);
    setStep("verified");
  };

  const handleExecute = async () => {
    if (!proof) return;
    executeSwap(proof);
  };

  useEffect(() => {
    if (isSuccess && proof && selectedERT) {
      // Defer state updates to avoid synchronous setState in effect
      setTimeout(() => {
        setStep("complete");

        // Construct a result object based on success
        const executionResult: PrivateExecutionResult = {
          success: true,
          txHash: hash || "0x",
          proofHash: proof.proofHash,
          executionTime: 0,
        };
        setResult(executionResult);

        // Update local state to reflect spending
        const amountSpent = parseAmount(amountIn, tokenIn.decimals);

        if (tokenIn.symbol === "USDC") {
          const newCapital = selectedERT.availableCapital - amountSpent;
          setSelectedERT({
            ...selectedERT,
            availableCapital: newCapital
          });
        }
      }, 0);
    }
  }, [isSuccess, proof, selectedERT, amountIn, tokenIn, hash, setSelectedERT]);

  const handleReset = () => {
    setStep("input");
    setProof(null);
    setResult(null);
    setAmountIn("");
  };

  // Fetch positions for the selected ERT
  const { data: positions } = usePositions(selectedERT ? BigInt(selectedERT.id) : undefined);

  // Debug Logging
  useEffect(() => {
    if (selectedERT) {
      console.log("Selected ERT:", selectedERT);
      console.log("Positions:", positions);
      console.log("Token In:", tokenIn);
    }
  }, [selectedERT, positions, tokenIn]);

  // Calculate available balance based on token selection
  const availableBalance = useMemo(() => {
    if (!selectedERT) return BigInt(0);

    // If swapping stablecoin (Base Asset), use Available Capital from ERT
    if (tokenIn.symbol === "USDC") {
      console.log("Using ERT Available Capital for USDC:", selectedERT.availableCapital);
      return selectedERT.availableCapital;
    }

    // If swapping another asset (closing/reducing position), find the position size
    if (positions) {
      const position = positions.find(
        (p) => p.asset.toLowerCase() === tokenIn.address.toLowerCase()
      );
      if (position) {
        console.log("Found Position for", tokenIn.symbol, position);
        return position.size;
      } else {
        console.log("No Position found for", tokenIn.symbol);
      }
    }

    return BigInt(0);
  }, [selectedERT, tokenIn, positions]);

  const isValidInput =
    selectedERT &&
    amountIn &&
    parseFloat(amountIn) > 0 &&
    parseAmount(amountIn, tokenIn.decimals) <= availableBalance;

  // Check if token is whitelisted on ERT
  const isTokenWhitelisted = (address: string) => {
    if (!selectedERT) return false;
    return selectedERT.allowedAssets.some(
      (a) => a.toLowerCase() === address.toLowerCase()
    );
  };

  return (
    <div className="glass-panel rounded-2xl p-6 space-y-6">
      {step === "input" && (
        <>
          {/* ERT Selection */}
          <ERTSelector selectedERT={selectedERT} onSelect={setSelectedERT} />

          {/* Compliance Pre-Check */}
          {selectedERT && (
            <div className={`rounded-xl p-4 border ${complianceStatus.allPassing
              ? "bg-[#8FD460]/10 border-[#8FD460]/30"
              : "bg-yellow-500/10 border-yellow-500/30"
              }`}>
              <h4 className={`font-medium flex items-center gap-2 mb-3 ${complianceStatus.allPassing ? "text-[#8FD460]" : "text-yellow-500"
                }`}>
                {complianceStatus.allPassing ? (
                  <CheckCircle2 className="w-4 h-4" />
                ) : (
                  <AlertTriangle className="w-4 h-4" />
                )}
                ERT Compliance Pre-Check
              </h4>
              <div className="grid grid-cols-2 gap-2 text-sm">
                <div className="flex items-center gap-2">
                  {complianceStatus.adapterAllowed ? (
                    <CheckCircle2 className="w-3.5 h-3.5 text-[#8FD460]" />
                  ) : (
                    <XCircle className="w-3.5 h-3.5 text-red-500" />
                  )}
                  <span className={complianceStatus.adapterAllowed ? "text-gray-300" : "text-red-400"}>
                    DEX Adapter
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  {complianceStatus.tokenInAllowed ? (
                    <CheckCircle2 className="w-3.5 h-3.5 text-[#8FD460]" />
                  ) : (
                    <XCircle className="w-3.5 h-3.5 text-red-500" />
                  )}
                  <span className={complianceStatus.tokenInAllowed ? "text-gray-300" : "text-red-400"}>
                    {tokenIn.symbol} Allowed
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  {complianceStatus.tokenOutAllowed ? (
                    <CheckCircle2 className="w-3.5 h-3.5 text-[#8FD460]" />
                  ) : (
                    <XCircle className="w-3.5 h-3.5 text-red-500" />
                  )}
                  <span className={complianceStatus.tokenOutAllowed ? "text-gray-300" : "text-red-400"}>
                    {tokenOut.symbol} Allowed
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  {complianceStatus.amountWithinLimit ? (
                    <CheckCircle2 className="w-3.5 h-3.5 text-[#8FD460]" />
                  ) : (
                    <XCircle className="w-3.5 h-3.5 text-red-500" />
                  )}
                  <span className={complianceStatus.amountWithinLimit ? "text-gray-300" : "text-red-400"}>
                    Amount OK
                  </span>
                </div>
              </div>
              {!complianceStatus.allPassing && (
                <p className="text-xs text-yellow-500/80 mt-3">
                  Your ERT doesn&apos;t whitelist these tokens/adapter. The proof will show compliance failures.
                  Mint a new ERT with MockSimpleDEX, MockWFLR, and MockUSDC whitelisted.
                </p>
              )}
            </div>
          )}

          {/* Swap Interface */}
          <div className="space-y-3 mt-6">
            {/* Token In */}
            <div className={`bg-black/30 rounded-xl p-4 border ${selectedERT && !complianceStatus.tokenInAllowed
              ? "border-red-500/30"
              : "border-white/5"
              }`}>
              <div className="flex justify-between items-center mb-2">
                <span className="text-sm text-gray-400">You Send (Private)</span>
                {selectedERT && (
                  <span className="text-xs text-gray-500">
                    Available: {safeFormatBalance(availableBalance, tokenIn.decimals)} {tokenIn.symbol}
                  </span>
                )}
              </div>
              <div className="flex items-center gap-3">
                <input
                  type="number"
                  value={amountIn}
                  onChange={(e) => setAmountIn(e.target.value)}
                  placeholder="0.0"
                  className="flex-1 bg-transparent text-2xl text-white outline-none placeholder:text-gray-600"
                />
                <div className="relative">
                  <button
                    onClick={() => setShowTokenInDropdown(!showTokenInDropdown)}
                    className={`flex items-center gap-2 rounded-lg px-3 py-2 transition-colors ${selectedERT && !complianceStatus.tokenInAllowed
                      ? "bg-red-500/20 hover:bg-red-500/30"
                      : "bg-white/5 hover:bg-white/10"
                      }`}
                  >
                    <span className="text-white font-medium">{tokenIn.symbol}</span>
                    {selectedERT && (
                      isTokenWhitelisted(tokenIn.address) ? (
                        <CheckCircle2 className="w-3 h-3 text-[#8FD460]" />
                      ) : (
                        <XCircle className="w-3 h-3 text-red-500" />
                      )
                    )}
                    <ChevronDown className="w-4 h-4 text-gray-400" />
                  </button>
                  {showTokenInDropdown && (
                    <div className="absolute right-0 top-full mt-1 bg-[#141a17] border border-white/10 rounded-lg shadow-xl z-10 min-w-[160px]">
                      {SUPPORTED_TOKENS.map((token) => {
                        const isWhitelisted = isTokenWhitelisted(token.address);
                        return (
                          <button
                            key={token.symbol}
                            onClick={() => {
                              if (token.symbol !== tokenOut.symbol) {
                                setTokenIn(token);
                              }
                              setShowTokenInDropdown(false);
                            }}
                            className="w-full px-4 py-2 text-left hover:bg-white/5 text-white disabled:opacity-50 flex items-center justify-between"
                            disabled={token.symbol === tokenOut.symbol}
                          >
                            <span>{token.symbol}</span>
                            {selectedERT && (
                              isWhitelisted ? (
                                <CheckCircle2 className="w-3.5 h-3.5 text-[#8FD460]" />
                              ) : (
                                <XCircle className="w-3.5 h-3.5 text-red-500/50" />
                              )
                            )}
                          </button>
                        );
                      })}
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Swap Button */}
            <div className="flex justify-center -my-1 relative z-10">
              <button
                onClick={handleSwapTokens}
                className="w-10 h-10 rounded-full bg-[#8FD460]/20 hover:bg-[#8FD460]/30 flex items-center justify-center transition-colors"
              >
                <ArrowDown className="w-5 h-5 text-[#8FD460]" />
              </button>
            </div>

            {/* Token Out */}
            <div className={`bg-black/30 rounded-xl p-4 border ${selectedERT && !complianceStatus.tokenOutAllowed
              ? "border-red-500/30"
              : "border-white/5"
              }`}>
              <div className="flex justify-between items-center mb-2">
                <span className="text-sm text-gray-400">You Receive (Private)</span>
              </div>
              <div className="flex items-center gap-3">
                <input
                  type="text"
                  value={amountIn ? `~${amountIn}` : ""}
                  readOnly
                  placeholder="0.0"
                  className="flex-1 bg-transparent text-2xl text-gray-400 outline-none placeholder:text-gray-600"
                />
                <div className="relative">
                  <button
                    onClick={() => setShowTokenOutDropdown(!showTokenOutDropdown)}
                    className={`flex items-center gap-2 rounded-lg px-3 py-2 transition-colors ${selectedERT && !complianceStatus.tokenOutAllowed
                      ? "bg-red-500/20 hover:bg-red-500/30"
                      : "bg-white/5 hover:bg-white/10"
                      }`}
                  >
                    <span className="text-white font-medium">{tokenOut.symbol}</span>
                    {selectedERT && (
                      isTokenWhitelisted(tokenOut.address) ? (
                        <CheckCircle2 className="w-3 h-3 text-[#8FD460]" />
                      ) : (
                        <XCircle className="w-3 h-3 text-red-500" />
                      )
                    )}
                    <ChevronDown className="w-4 h-4 text-gray-400" />
                  </button>
                  {showTokenOutDropdown && (
                    <div className="absolute right-0 top-full mt-1 bg-[#141a17] border border-white/10 rounded-lg shadow-xl z-10 min-w-[160px]">
                      {SUPPORTED_TOKENS.map((token) => {
                        const isWhitelisted = isTokenWhitelisted(token.address);
                        return (
                          <button
                            key={token.symbol}
                            onClick={() => {
                              if (token.symbol !== tokenIn.symbol) {
                                setTokenOut(token);
                              }
                              setShowTokenOutDropdown(false);
                            }}
                            className="w-full px-4 py-2 text-left hover:bg-white/5 text-white disabled:opacity-50 flex items-center justify-between"
                            disabled={token.symbol === tokenIn.symbol}
                          >
                            <span>{token.symbol}</span>
                            {selectedERT && (
                              isWhitelisted ? (
                                <CheckCircle2 className="w-3.5 h-3.5 text-[#8FD460]" />
                              ) : (
                                <XCircle className="w-3.5 h-3.5 text-red-500/50" />
                              )
                            )}
                          </button>
                        );
                      })}
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* Slippage Settings */}
          <div className="flex items-center justify-between bg-black/20 rounded-lg p-3">
            <span className="text-sm text-gray-400">Slippage Tolerance</span>
            <div className="flex items-center gap-2">
              {["0.5", "1", "2"].map((val) => (
                <button
                  key={val}
                  onClick={() => setSlippage(val)}
                  className={`px-3 py-1 rounded-lg text-sm transition-colors ${slippage === val
                    ? "bg-[#8FD460]/20 text-[#8FD460]"
                    : "bg-white/5 text-gray-400 hover:text-white"
                    }`}
                >
                  {val}%
                </button>
              ))}
            </div>
          </div>

          {/* Privacy Notice */}
          <div className="bg-black/30 rounded-xl p-4 border border-[#8FD460]/20">
            <h4 className="text-[#8FD460] font-medium flex items-center gap-2">
              <Shield className="w-4 h-4" />
              This swap will be private
            </h4>
            <ul className="text-sm text-gray-400 mt-3 space-y-1.5">
              <li className="flex items-center gap-2">
                <span className="w-1.5 h-1.5 rounded-full bg-[#8FD460]" />
                Token pair will be hidden
              </li>
              <li className="flex items-center gap-2">
                <span className="w-1.5 h-1.5 rounded-full bg-[#8FD460]" />
                Swap amount will be hidden
              </li>
              <li className="flex items-center gap-2">
                <span className="w-1.5 h-1.5 rounded-full bg-[#8FD460]" />
                Only ERT compliance will be proven
              </li>
            </ul>
          </div>

          {/* Generate Proof Button */}
          <Button
            onClick={() => setStep("proving")}
            disabled={!isValidInput}
            className={`w-full font-medium py-6 rounded-xl disabled:opacity-50 disabled:cursor-not-allowed ${complianceStatus.allPassing
              ? "bg-[#8FD460] hover:bg-[#7ac350] text-black"
              : "bg-yellow-500 hover:bg-yellow-600 text-black"
              }`}
          >
            <span className="flex items-center gap-2">
              {complianceStatus.allPassing ? (
                <Shield className="w-5 h-5" />
              ) : (
                <AlertTriangle className="w-5 h-5" />
              )}
              {complianceStatus.allPassing
                ? "Generate Private Swap Proof"
                : "Generate Proof (Will Show Failures)"}
            </span>
          </Button>

          {/* Info */}
          <div className="flex items-start gap-2 text-xs text-gray-500">
            <Info className="w-4 h-4 mt-0.5 shrink-0" />
            <span>
              MockSimpleDEX will be used for this swap. To pass all compliance checks,
              ensure your ERT whitelists the DEX adapter and both tokens.
            </span>
          </div>
        </>
      )}

      {step === "proving" && (
        <ProofGenerator
          type="swap"
          generateProof={generateProof}
          onComplete={handleProofComplete}
        />
      )}

      {step === "verified" && proof && (
        <div className="space-y-4">
          {!isApproved ? (
            <div className="glass-panel rounded-2xl p-6 text-center space-y-4 border-yellow-500/20 bg-yellow-500/5">
              <div className="w-16 h-16 mx-auto rounded-full bg-yellow-500/20 flex items-center justify-center">
                <Shield className="w-8 h-8 text-yellow-500" />
              </div>
              <h3 className="text-lg font-medium text-white">Approval Required</h3>
              <p className="text-gray-400 text-sm">
                You need to approve the ZK Executor contract to spend your {tokenIn.symbol} before executing the private swap.
              </p>
              <Button
                onClick={() => approveToken()}
                disabled={isApprovePending || isApproveConfirming}
                className="w-full bg-yellow-500 hover:bg-yellow-600 text-black font-medium py-6 rounded-xl"
              >
                {isApprovePending || isApproveConfirming ? (
                  <span className="flex items-center gap-2">
                    <span className="animate-spin rounded-full h-4 w-4 border-b-2 border-black"></span>
                    Approving...
                  </span>
                ) : (
                  `Approve ${tokenIn.symbol}`
                )}
              </Button>
            </div>
          ) : (
            <ProofVerifier
              proof={proof}
              onExecute={handleExecute}
              isExecuting={isPending || isConfirming}
            />
          )}
        </div>
      )}

      {(step === "executing" || step === "complete") && (
        <ProofStatus
          result={result}
          isExecuting={step === "executing" && (isPending || isConfirming)}
          onReset={handleReset}
          isSimulated={false}
        />
      )}
    </div>
  );
}
