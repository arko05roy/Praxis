"use client";

import { useState, useEffect } from "react";
import { useTokenBalance, useNativeBalance } from "@/lib/hooks";
import { ArrowDown, Settings, RotateCw, Check } from "lucide-react";
import { formatUnits } from "viem";
import { useAccount } from "wagmi";

const AVAILABLE_TOKENS = ['FLR', 'USDC', 'WETH', 'sFLR'];

const TOKEN_ICONS: Record<string, { bg: string; text: string; letter: string }> = {
    'FLR': { bg: 'bg-accent/20', text: 'text-accent', letter: 'F' },
    'USDC': { bg: 'bg-blue-500/20', text: 'text-blue-500', letter: 'U' },
    'WETH': { bg: 'bg-purple-500/20', text: 'text-purple-500', letter: 'E' },
    'sFLR': { bg: 'bg-green-500/20', text: 'text-green-500', letter: 'S' },
};

interface SwapInterfaceProps {
    onQuoteUpdate: (amount: string, fromToken: string, toToken: string) => void;
    bestQuote?: string;
    isLoading?: boolean;
}

export function SwapInterface({ onQuoteUpdate, bestQuote, isLoading }: SwapInterfaceProps) {
    const [amount, setAmount] = useState("");
    const [fromToken, setFromToken] = useState("FLR");
    const [toToken, setToToken] = useState("USDC");
    const [showFromSelector, setShowFromSelector] = useState(false);
    const [showToSelector, setShowToSelector] = useState(false);

    const { address } = useAccount();
    const { data: tokenBalance } = useTokenBalance();
    const { data: nativeBalance } = useNativeBalance();

    // Use native balance for FLR, token balance for others
    const displayBalance = fromToken === 'FLR'
        ? nativeBalance
        : tokenBalance;

    // Debounce quote update
    useEffect(() => {
        const timeout = setTimeout(() => {
            onQuoteUpdate(amount, fromToken, toToken);
        }, 500);
        return () => clearTimeout(timeout);
    }, [amount, fromToken, toToken, onQuoteUpdate]);

    const handleTokenSelect = (token: string, isFrom: boolean) => {
        if (isFrom) {
            if (token === toToken) {
                setToToken(fromToken);
            }
            setFromToken(token);
            setShowFromSelector(false);
        } else {
            if (token === fromToken) {
                setFromToken(toToken);
            }
            setToToken(token);
            setShowToSelector(false);
        }
    };

    const handleSwapTokens = () => {
        const temp = fromToken;
        setFromToken(toToken);
        setToToken(temp);
    };

    const handleMaxClick = () => {
        if (displayBalance) {
            // Leave some for gas if native token
            const maxAmount = fromToken === 'FLR'
                ? displayBalance > 10n ** 17n ? displayBalance - 10n ** 17n : 0n
                : displayBalance;
            setAmount(formatUnits(maxAmount, fromToken === 'USDC' ? 6 : 18));
        }
    };

    const fromIcon = TOKEN_ICONS[fromToken] || TOKEN_ICONS['FLR'];
    const toIcon = TOKEN_ICONS[toToken] || TOKEN_ICONS['USDC'];

    return (
        <div className="glass-panel p-6 rounded-2xl relative">
            <div className="flex justify-between items-center mb-6">
                <h3 className="font-semibold text-white">Swap</h3>
                <button className="p-2 hover:bg-white/10 rounded-full text-text-muted transition-colors">
                    <Settings className="w-4 h-4" />
                </button>
            </div>

            <div className="space-y-2">
                {/* FROM */}
                <div className="bg-background-secondary p-4 rounded-xl border border-white/5 hover:border-white/10 transition-colors group">
                    <div className="flex justify-between mb-2">
                        <label className="text-xs text-text-muted group-focus-within:text-accent transition-colors">Sell</label>
                        <button
                            onClick={handleMaxClick}
                            className="text-xs text-text-muted hover:text-accent transition-colors"
                        >
                            Balance: {displayBalance ? Number(formatUnits(displayBalance, fromToken === 'USDC' ? 6 : 18)).toFixed(4) : "0.00"}
                            {displayBalance && <span className="ml-1 text-accent">(MAX)</span>}
                        </button>
                    </div>
                    <div className="flex items-center gap-4">
                        <input
                            type="number"
                            value={amount}
                            onChange={(e) => setAmount(e.target.value)}
                            placeholder="0.0"
                            className="bg-transparent text-3xl font-bold text-white outline-none w-full placeholder-white/20"
                        />
                        <div className="relative">
                            <button
                                onClick={() => setShowFromSelector(!showFromSelector)}
                                className="flex items-center gap-2 bg-black/40 hover:bg-black/60 cursor-pointer px-3 py-1.5 rounded-full border border-white/10 transition-colors"
                            >
                                <div className={`w-6 h-6 rounded-full ${fromIcon.bg} flex items-center justify-center text-[10px] font-bold ${fromIcon.text}`}>
                                    {fromIcon.letter}
                                </div>
                                <span className="font-bold text-white">{fromToken}</span>
                                <ArrowDown className="w-3 h-3 text-text-muted" />
                            </button>
                            {showFromSelector && (
                                <div className="absolute top-full mt-2 right-0 bg-background-secondary border border-white/10 rounded-xl p-2 z-20 min-w-[120px]">
                                    {AVAILABLE_TOKENS.map((token) => (
                                        <button
                                            key={token}
                                            onClick={() => handleTokenSelect(token, true)}
                                            className="w-full flex items-center gap-2 px-3 py-2 hover:bg-white/10 rounded-lg transition-colors"
                                        >
                                            <div className={`w-5 h-5 rounded-full ${TOKEN_ICONS[token].bg} flex items-center justify-center text-[8px] font-bold ${TOKEN_ICONS[token].text}`}>
                                                {TOKEN_ICONS[token].letter}
                                            </div>
                                            <span className="text-white text-sm">{token}</span>
                                            {token === fromToken && <Check className="w-3 h-3 text-accent ml-auto" />}
                                        </button>
                                    ))}
                                </div>
                            )}
                        </div>
                    </div>
                </div>

                {/* SWAP ARROW */}
                <div className="flex justify-center -my-3 relative z-10">
                    <button
                        onClick={handleSwapTokens}
                        className="bg-background-tertiary p-2 rounded-xl border border-white/10 hover:border-accent/50 hover:text-accent transition-all text-text-muted shadow-lg"
                    >
                        <ArrowDown className="w-4 h-4" />
                    </button>
                </div>

                {/* TO */}
                <div className="bg-background-secondary p-4 rounded-xl border border-white/5 hover:border-white/10 transition-colors">
                    <div className="flex justify-between mb-2">
                        <label className="text-xs text-text-muted">Buy</label>
                        {bestQuote && !isLoading && (
                            <span className="text-xs text-accent">Best rate found</span>
                        )}
                    </div>
                    <div className="flex items-center gap-4">
                        <input
                            type="number"
                            readOnly
                            value={bestQuote || ""}
                            placeholder="0.0"
                            className="bg-transparent text-3xl font-bold text-white outline-none w-full cursor-default"
                        />
                        <div className="relative">
                            <button
                                onClick={() => setShowToSelector(!showToSelector)}
                                className="flex items-center gap-2 bg-black/40 hover:bg-black/60 cursor-pointer px-3 py-1.5 rounded-full border border-white/10 transition-colors"
                            >
                                <div className={`w-6 h-6 rounded-full ${toIcon.bg} flex items-center justify-center text-[10px] font-bold ${toIcon.text}`}>
                                    {toIcon.letter}
                                </div>
                                <span className="font-bold text-white">{toToken}</span>
                                <ArrowDown className="w-3 h-3 text-text-muted" />
                            </button>
                            {showToSelector && (
                                <div className="absolute top-full mt-2 right-0 bg-background-secondary border border-white/10 rounded-xl p-2 z-20 min-w-[120px]">
                                    {AVAILABLE_TOKENS.map((token) => (
                                        <button
                                            key={token}
                                            onClick={() => handleTokenSelect(token, false)}
                                            className="w-full flex items-center gap-2 px-3 py-2 hover:bg-white/10 rounded-lg transition-colors"
                                        >
                                            <div className={`w-5 h-5 rounded-full ${TOKEN_ICONS[token].bg} flex items-center justify-center text-[8px] font-bold ${TOKEN_ICONS[token].text}`}>
                                                {TOKEN_ICONS[token].letter}
                                            </div>
                                            <span className="text-white text-sm">{token}</span>
                                            {token === toToken && <Check className="w-3 h-3 text-accent ml-auto" />}
                                        </button>
                                    ))}
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            </div>

            {amount && Number(amount) > 0 && (
                <div className="mt-4 p-3 bg-accent/5 rounded-xl border border-accent/10 flex items-center justify-between text-xs">
                    {isLoading ? (
                        <span className="text-accent flex items-center gap-2">
                            <RotateCw className="w-3 h-3 animate-spin" /> Fetching best rates...
                        </span>
                    ) : bestQuote ? (
                        <span className="text-accent flex items-center gap-2">
                            <Check className="w-3 h-3" /> Best rate: {Number(bestQuote).toFixed(6)} {toToken}
                        </span>
                    ) : (
                        <span className="text-text-muted">Enter amount to get quotes</span>
                    )}
                </div>
            )}
        </div>
    );
}
