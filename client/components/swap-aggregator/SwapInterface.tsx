"use client";

import { useState, useEffect } from "react";
import { useNativeBalance } from "@/lib/hooks";
import { ArrowDown, Settings, RotateCw, Check } from "lucide-react";
import { formatUnits } from "viem";
import { useAccount, useBalance } from "wagmi";
import { COSTON2_TOKENS, TOKEN_DECIMALS } from "@/lib/contracts/external";

const AVAILABLE_TOKENS = ['WFLR', 'USDC', 'FXRP', 'FBTC', 'FDOGE'];

// Token addresses for balance queries using deployed Coston2 contracts
const TOKEN_ADDRESSES: Record<string, `0x${string}` | undefined> = {
    'WFLR': COSTON2_TOKENS.MockWFLR,
    'USDC': COSTON2_TOKENS.MockUSDC,
    'FXRP': COSTON2_TOKENS.MockFXRP,
    'FBTC': COSTON2_TOKENS.MockFBTC,
    'FDOGE': COSTON2_TOKENS.MockFDOGE,
    'sFLR': COSTON2_TOKENS.MockSFLR,
};

const TOKEN_DECIMALS_MAP: Record<string, number> = {
    'WFLR': TOKEN_DECIMALS.MockWFLR,
    'USDC': TOKEN_DECIMALS.MockUSDC,
    'FXRP': TOKEN_DECIMALS.MockFXRP,
    'FBTC': TOKEN_DECIMALS.MockFBTC,
    'FDOGE': TOKEN_DECIMALS.MockFDOGE,
    'sFLR': TOKEN_DECIMALS.MockSFLR,
};

const TOKEN_ICONS: Record<string, { bg: string; text: string; letter: string }> = {
    'WFLR': { bg: 'bg-accent/20', text: 'text-accent', letter: 'W' },
    'USDC': { bg: 'bg-blue-500/20', text: 'text-blue-500', letter: 'U' },
    'FXRP': { bg: 'bg-purple-500/20', text: 'text-purple-500', letter: 'X' },
    'FBTC': { bg: 'bg-orange-500/20', text: 'text-orange-500', letter: 'B' },
    'FDOGE': { bg: 'bg-yellow-500/20', text: 'text-yellow-500', letter: 'D' },
    'sFLR': { bg: 'bg-green-500/20', text: 'text-green-500', letter: 'S' },
};

interface SwapInterfaceProps {
    onQuoteUpdate: (amount: string, fromToken: string, toToken: string) => void;
    bestQuote?: string;
    isLoading?: boolean;
}

export function SwapInterface({ onQuoteUpdate, bestQuote, isLoading }: SwapInterfaceProps) {
    const [amount, setAmount] = useState("");
    const [fromToken, setFromToken] = useState("WFLR");
    const [toToken, setToToken] = useState("USDC");
    const [showFromSelector, setShowFromSelector] = useState(false);
    const [showToSelector, setShowToSelector] = useState(false);

    const { address } = useAccount();
    const { balance: nativeBalance } = useNativeBalance();

    // Get token address for current fromToken
    const fromTokenAddress = TOKEN_ADDRESSES[fromToken];

    // Query ERC20 balance for the selected token
    const { data: tokenBalanceData } = useBalance({
        address,
        token: fromTokenAddress,
        query: {
            enabled: !!address && !!fromTokenAddress,
        },
    });

    // Use ERC20 balance
    const displayBalance = tokenBalanceData?.value;

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
            const decimals = TOKEN_DECIMALS_MAP[fromToken] || 18;
            setAmount(formatUnits(displayBalance, decimals));
        }
    };

    // Get decimals for current token
    const fromDecimals = TOKEN_DECIMALS_MAP[fromToken] || 18;

    const fromIcon = TOKEN_ICONS[fromToken] || TOKEN_ICONS['WFLR'];
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
                            Balance: {displayBalance ? Number(formatUnits(displayBalance, fromDecimals)).toFixed(4) : "0.00"}
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
