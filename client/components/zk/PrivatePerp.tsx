"use client";

import { useState, useCallback } from "react";
import {
  Activity,
  Shield,
  TrendingUp,
  TrendingDown,
  ChevronDown,
  Info,
  AlertTriangle,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { ERTSelector } from "./ERTSelector";
import { ProofGenerator } from "./ProofGenerator";
import { ProofVerifier } from "./ProofVerifier";
import { ProofStatus } from "./ProofStatus";
import {
  generatePrivatePerpProof,
  executePrivatePerp,
  getSupportedPerpMarkets,
} from "@/lib/zk";
import type {
  ERTForPrivateExecution,
  PrivatePerpProof,
  PrivateExecutionResult,
} from "@/lib/zk";

type Step = "input" | "proving" | "verified" | "executing" | "complete";

const SUPPORTED_MARKETS = getSupportedPerpMarkets();

export function PrivatePerp() {
  const [step, setStep] = useState<Step>("input");
  const [selectedERT, setSelectedERT] = useState<ERTForPrivateExecution | null>(null);
  const [market, setMarket] = useState(SUPPORTED_MARKETS[0]);
  const [isLong, setIsLong] = useState(true);
  const [size, setSize] = useState("");
  const [leverage, setLeverage] = useState(2);
  const [proof, setProof] = useState<PrivatePerpProof | null>(null);
  const [result, setResult] = useState<PrivateExecutionResult | null>(null);
  const [showMarketDropdown, setShowMarketDropdown] = useState(false);

  const parseSize = (sizeStr: string): bigint => {
    if (!sizeStr || isNaN(parseFloat(sizeStr))) return BigInt(0);
    // Size in USD with 6 decimals
    const value = parseFloat(sizeStr);
    return BigInt(Math.floor(value * 1e6));
  };

  const calculateCollateral = useCallback((): bigint => {
    const sizeBigInt = parseSize(size);
    if (sizeBigInt === BigInt(0)) return BigInt(0);
    return sizeBigInt / BigInt(leverage);
  }, [size, leverage]);

  const formatUSD = (value: bigint): string => {
    return `$${(Number(value) / 1e6).toLocaleString(undefined, {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    })}`;
  };

  const generateProof = useCallback(async (): Promise<PrivatePerpProof> => {
    if (!selectedERT) throw new Error("No ERT selected");

    const sizeBigInt = parseSize(size);
    const collateral = calculateCollateral();

    return generatePrivatePerpProof(
      selectedERT,
      market.symbol,
      sizeBigInt,
      leverage,
      isLong,
      collateral
    );
  }, [selectedERT, market, size, leverage, isLong, calculateCollateral]);

  const handleProofComplete = (generatedProof: PrivatePerpProof) => {
    setProof(generatedProof);
    setStep("verified");
  };

  const handleExecute = async () => {
    if (!proof) return;
    setStep("executing");

    const executionResult = await executePrivatePerp(proof);
    setResult(executionResult);
    setStep("complete");
  };

  const handleReset = () => {
    setStep("input");
    setProof(null);
    setResult(null);
    setSize("");
    setLeverage(2);
  };

  const maxLeverage = selectedERT
    ? Math.min(selectedERT.maxLeverage, market.maxLeverage)
    : market.maxLeverage;

  const isValidInput =
    selectedERT &&
    size &&
    parseFloat(size) > 0 &&
    leverage >= 1 &&
    leverage <= maxLeverage &&
    calculateCollateral() <= selectedERT.availableCapital;

  const liquidationPrice = () => {
    if (!size || parseFloat(size) === 0) return "N/A";
    // Simplified liquidation price calculation
    const entryPrice = 1; // Assume $1 for demo
    const margin = 1 / leverage;
    if (isLong) {
      return `$${(entryPrice * (1 - margin * 0.9)).toFixed(4)}`;
    } else {
      return `$${(entryPrice * (1 + margin * 0.9)).toFixed(4)}`;
    }
  };

  return (
    <div className="glass-panel rounded-2xl p-6 space-y-6">
      {step === "input" && (
        <>
          {/* ERT Selection */}
          <ERTSelector selectedERT={selectedERT} onSelect={setSelectedERT} />

          {/* Market Selection */}
          <div className="mt-6">
            <label className="block text-sm font-medium text-gray-400 mb-2">
              Select Market
            </label>
            <div className="relative">
              <button
                onClick={() => setShowMarketDropdown(!showMarketDropdown)}
                className="w-full bg-black/30 border border-white/10 rounded-xl p-4 flex items-center justify-between hover:border-[#8FD460]/30 transition-colors"
              >
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-lg bg-purple-500/20 flex items-center justify-center">
                    <Activity className="w-5 h-5 text-purple-400" />
                  </div>
                  <div className="text-left">
                    <div className="text-white font-medium">{market.symbol}</div>
                    <div className="text-sm text-gray-400">{market.name}</div>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <span className="text-xs text-gray-500">
                    Max {market.maxLeverage}x
                  </span>
                  <ChevronDown
                    className={`w-5 h-5 text-gray-400 transition-transform ${showMarketDropdown ? "rotate-180" : ""
                      }`}
                  />
                </div>
              </button>

              {showMarketDropdown && (
                <div className="absolute z-50 w-full mt-2 bg-[#141a17] border border-white/10 rounded-xl shadow-xl overflow-hidden">
                  {SUPPORTED_MARKETS.map((m) => (
                    <button
                      key={m.symbol}
                      onClick={() => {
                        setMarket(m);
                        setShowMarketDropdown(false);
                        // Adjust leverage if needed
                        if (leverage > m.maxLeverage) {
                          setLeverage(m.maxLeverage);
                        }
                      }}
                      className={`w-full p-4 flex items-center gap-4 hover:bg-white/5 transition-colors ${market.symbol === m.symbol ? "bg-[#8FD460]/10" : ""
                        }`}
                    >
                      <div className="w-10 h-10 rounded-lg bg-purple-500/20 flex items-center justify-center">
                        <Activity className="w-5 h-5 text-purple-400" />
                      </div>
                      <div className="flex-1 text-left">
                        <div className="text-white font-medium">{m.symbol}</div>
                        <div className="text-sm text-gray-400">{m.name}</div>
                      </div>
                      <span className="text-xs text-gray-500">Max {m.maxLeverage}x</span>
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Direction Selection */}
          <div>
            <label className="block text-sm font-medium text-gray-400 mb-3">
              Position Direction (Private)
            </label>
            <div className="grid grid-cols-2 gap-3">
              <button
                onClick={() => setIsLong(true)}
                className={`p-4 rounded-xl border transition-all flex items-center justify-center gap-3 ${isLong
                  ? "bg-green-500/10 border-green-500/30 text-green-400"
                  : "bg-black/30 border-white/5 text-gray-400 hover:border-white/10"
                  }`}
              >
                <TrendingUp className="w-5 h-5" />
                <span className="font-medium">Long</span>
              </button>
              <button
                onClick={() => setIsLong(false)}
                className={`p-4 rounded-xl border transition-all flex items-center justify-center gap-3 ${!isLong
                  ? "bg-red-500/10 border-red-500/30 text-red-400"
                  : "bg-black/30 border-white/5 text-gray-400 hover:border-white/10"
                  }`}
              >
                <TrendingDown className="w-5 h-5" />
                <span className="font-medium">Short</span>
              </button>
            </div>
          </div>

          {/* Position Size */}
          <div className="bg-black/30 rounded-xl p-4 border border-white/5">
            <div className="flex justify-between items-center mb-2">
              <span className="text-sm text-gray-400">Position Size (Private)</span>
              <span className="text-xs text-gray-500">In USD</span>
            </div>
            <div className="flex items-center gap-3">
              <span className="text-2xl text-gray-500">$</span>
              <input
                type="number"
                value={size}
                onChange={(e) => setSize(e.target.value)}
                placeholder="0.00"
                className="flex-1 bg-transparent text-2xl text-white outline-none placeholder:text-gray-600"
              />
            </div>
          </div>

          {/* Leverage Slider */}
          <div>
            <div className="flex justify-between items-center mb-3">
              <label className="text-sm font-medium text-gray-400">
                Leverage (Private)
              </label>
              <span className="text-white font-medium">{leverage}x</span>
            </div>
            <input
              type="range"
              min="1"
              max={maxLeverage}
              value={leverage}
              onChange={(e) => setLeverage(parseInt(e.target.value))}
              className="w-full h-2 bg-white/10 rounded-lg appearance-none cursor-pointer accent-[#8FD460]"
            />
            <div className="flex justify-between text-xs text-gray-500 mt-2">
              <span>1x</span>
              <span>{Math.floor(maxLeverage / 2)}x</span>
              <span>{maxLeverage}x</span>
            </div>
          </div>

          {/* Position Summary */}
          <div className="bg-black/20 rounded-xl p-4 border border-white/5 space-y-3">
            <h4 className="text-white font-medium">Position Summary</h4>
            <div className="grid grid-cols-2 gap-3 text-sm">
              <div className="flex justify-between">
                <span className="text-gray-400">Size</span>
                <span className="text-white">
                  {size ? `$${parseFloat(size).toLocaleString()}` : "$0.00"}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-400">Collateral</span>
                <span className="text-white">{formatUSD(calculateCollateral())}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-400">Direction</span>
                <span className={isLong ? "text-green-400" : "text-red-400"}>
                  {isLong ? "Long" : "Short"}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-400">Liq. Price</span>
                <span className="text-yellow-400">{liquidationPrice()}</span>
              </div>
            </div>
          </div>

          {/* Risk Warning */}
          {leverage >= 5 && (
            <div className="bg-yellow-500/10 rounded-xl p-4 border border-yellow-500/20 flex items-start gap-3">
              <AlertTriangle className="w-5 h-5 text-yellow-500 shrink-0 mt-0.5" />
              <div>
                <h4 className="text-yellow-500 font-medium">High Leverage Warning</h4>
                <p className="text-sm text-gray-400 mt-1">
                  Using {leverage}x leverage increases liquidation risk. Your position
                  will be liquidated if the price moves {(100 / leverage * 0.9).toFixed(1)}%
                  against you.
                </p>
              </div>
            </div>
          )}

          {/* Privacy Notice */}
          <div className="bg-black/30 rounded-xl p-4 border border-[#8FD460]/20">
            <h4 className="text-[#8FD460] font-medium flex items-center gap-2">
              <Shield className="w-4 h-4" />
              This position will be private
            </h4>
            <ul className="text-sm text-gray-400 mt-3 space-y-1.5">
              <li className="flex items-center gap-2">
                <span className="w-1.5 h-1.5 rounded-full bg-[#8FD460]" />
                Direction (long/short) will be hidden
              </li>
              <li className="flex items-center gap-2">
                <span className="w-1.5 h-1.5 rounded-full bg-[#8FD460]" />
                Position size will be hidden
              </li>
              <li className="flex items-center gap-2">
                <span className="w-1.5 h-1.5 rounded-full bg-[#8FD460]" />
                Leverage used will be hidden
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
              <Activity className="w-5 h-5" />
              Generate Private Position Proof
            </span>
          </Button>

          {/* Info */}
          <div className="flex items-start gap-2 text-xs text-gray-500">
            <Info className="w-4 h-4 mt-0.5 shrink-0" />
            <span>
              Perpetual positions are simulated for this demo.
              No actual perpetual contract exists on Coston2 testnet.
            </span>
          </div>
        </>
      )}

      {step === "proving" && (
        <ProofGenerator
          type="perp"
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
