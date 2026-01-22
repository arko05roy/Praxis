"use client";

import { useTokenBalance, useNativeBalance, useEnhancedPrice } from "@/lib/hooks";
import { getAddresses } from "@/lib/contracts/addresses";
import { TOKEN_DECIMALS } from "@/lib/contracts/external";
import { useChainId } from "wagmi";
import { formatUnits } from "viem";
import { Loader2, Wallet, RefreshCw } from "lucide-react";
import { cn } from "@/lib/utils";
import { useState } from "react";

// Token configuration with display info and price feed mappings
const TOKEN_CONFIG = {
    FLR: {
        name: "Flare",
        symbol: "FLR",
        color: "text-pink-400",
        iconBg: "bg-pink-500/20",
        feedId: "FLR/USD",
        icon: "F",
    },
    MockUSDC: {
        name: "USD Coin",
        symbol: "USDC",
        color: "text-green-400",
        iconBg: "bg-green-500/20",
        feedId: "USDC/USD",
        icon: "$",
    },
    MockWFLR: {
        name: "Wrapped FLR",
        symbol: "WFLR",
        color: "text-pink-400",
        iconBg: "bg-pink-500/20",
        feedId: "FLR/USD",
        icon: "W",
    },
    MockFXRP: {
        name: "FAsset XRP",
        symbol: "FXRP",
        color: "text-cyan-400",
        iconBg: "bg-cyan-500/20",
        feedId: "XRP/USD",
        icon: "X",
    },
    MockFBTC: {
        name: "FAsset BTC",
        symbol: "FBTC",
        color: "text-orange-400",
        iconBg: "bg-orange-500/20",
        feedId: "BTC/USD",
        icon: "B",
    },
    MockFDOGE: {
        name: "FAsset DOGE",
        symbol: "FDOGE",
        color: "text-yellow-400",
        iconBg: "bg-yellow-500/20",
        feedId: "DOGE/USD",
        icon: "D",
    },
    MockSFLR: {
        name: "Staked FLR",
        symbol: "sFLR",
        color: "text-purple-400",
        iconBg: "bg-purple-500/20",
        feedId: "FLR/USD",
        icon: "S",
    },
} as const;

type TokenKey = keyof typeof TOKEN_CONFIG;

interface TokenBalanceRowProps {
    tokenKey: TokenKey;
    balance: bigint | undefined;
    decimals: number;
    isLoading: boolean;
}

function TokenBalanceRow({ tokenKey, balance, decimals, isLoading }: TokenBalanceRowProps) {
    const config = TOKEN_CONFIG[tokenKey];
    const { enhanced, isLoading: priceLoading } = useEnhancedPrice(config.feedId);

    const formattedBalance = balance !== undefined
        ? formatUnits(balance, decimals)
        : "0";

    const numBalance = Number(formattedBalance);

    // Calculate USD value
    const usdValue = balance && enhanced
        ? numBalance * (Number(enhanced.price) / 10 ** enhanced.decimals)
        : 0;

    const formatBalanceDisplay = (val: number) => {
        if (val === 0) return "0.00";
        if (val >= 1000000) return `${(val / 1000000).toFixed(2)}M`;
        if (val >= 1000) return `${(val / 1000).toFixed(2)}K`;
        if (val >= 1) return val.toFixed(4);
        if (val >= 0.0001) return val.toFixed(6);
        return val.toExponential(2);
    };

    const formatUSD = (val: number) => {
        if (val === 0) return "$0.00";
        if (val >= 1000000) return `$${(val / 1000000).toFixed(2)}M`;
        if (val >= 1000) return `$${(val / 1000).toFixed(2)}K`;
        return `$${val.toFixed(2)}`;
    };

    return (
        <div className="flex items-center justify-between py-3 px-4 hover:bg-white/5 rounded-lg transition-colors group">
            <div className="flex items-center gap-3">
                <div className={cn(
                    "w-9 h-9 rounded-full flex items-center justify-center font-bold text-sm",
                    config.iconBg,
                    config.color
                )}>
                    {config.icon}
                </div>
                <div>
                    <p className="text-sm font-medium text-white">{config.symbol}</p>
                    <p className="text-xs text-text-muted">{config.name}</p>
                </div>
            </div>

            <div className="text-right">
                {isLoading ? (
                    <Loader2 className="w-4 h-4 animate-spin text-text-muted ml-auto" />
                ) : (
                    <>
                        <p className="text-sm font-semibold text-white tabular-nums">
                            {formatBalanceDisplay(numBalance)}
                        </p>
                        <p className="text-xs text-text-muted tabular-nums">
                            {priceLoading ? "..." : formatUSD(usdValue)}
                        </p>
                    </>
                )}
            </div>
        </div>
    );
}

export function WalletBalances() {
    const chainId = useChainId();
    const [isRefreshing, setIsRefreshing] = useState(false);

    // Get contract addresses
    let addresses;
    try {
        addresses = getAddresses(chainId);
    } catch {
        addresses = null;
    }

    // Native FLR balance
    const { balance: nativeBalance, isLoading: nativeLoading, refetch: refetchNative } = useNativeBalance();

    // Token balances
    const { data: usdcData, isLoading: usdcLoading, refetch: refetchUsdc } = useTokenBalance(addresses?.MockUSDC);
    const { data: wflrData, isLoading: wflrLoading, refetch: refetchWflr } = useTokenBalance(addresses?.MockWFLR);
    const { data: fxrpData, isLoading: fxrpLoading, refetch: refetchFxrp } = useTokenBalance(addresses?.MockFXRP);
    const { data: fbtcData, isLoading: fbtcLoading, refetch: refetchFbtc } = useTokenBalance(addresses?.MockFBTC);
    const { data: fdogeData, isLoading: fdogeLoading, refetch: refetchFdoge } = useTokenBalance(addresses?.MockFDOGE);
    const { data: sflrData, isLoading: sflrLoading, refetch: refetchSflr } = useTokenBalance(addresses?.MockSFLR);

    const handleRefresh = async () => {
        setIsRefreshing(true);
        await Promise.all([
            refetchNative(),
            refetchUsdc(),
            refetchWflr(),
            refetchFxrp(),
            refetchFbtc(),
            refetchFdoge(),
            refetchSflr(),
        ]);
        setIsRefreshing(false);
    };

    const isAnyLoading = nativeLoading || usdcLoading || wflrLoading || fxrpLoading || fbtcLoading || fdogeLoading || sflrLoading;

    // Calculate total USD value
    const { enhanced: flrPrice } = useEnhancedPrice("FLR/USD");
    const { enhanced: usdcPrice } = useEnhancedPrice("USDC/USD");
    const { enhanced: xrpPrice } = useEnhancedPrice("XRP/USD");
    const { enhanced: btcPrice } = useEnhancedPrice("BTC/USD");
    const { enhanced: dogePrice } = useEnhancedPrice("DOGE/USD");

    const calculateUsdValue = (balance: bigint | undefined, decimals: number, price: typeof flrPrice) => {
        if (!balance || !price) return 0;
        const formatted = Number(formatUnits(balance, decimals));
        return formatted * (Number(price.price) / 10 ** price.decimals);
    };

    const totalUsdValue =
        calculateUsdValue(nativeBalance, 18, flrPrice) +
        calculateUsdValue(usdcData?.value, TOKEN_DECIMALS.MockUSDC, usdcPrice) +
        calculateUsdValue(wflrData?.value, TOKEN_DECIMALS.MockWFLR, flrPrice) +
        calculateUsdValue(fxrpData?.value, TOKEN_DECIMALS.MockFXRP, xrpPrice) +
        calculateUsdValue(fbtcData?.value, TOKEN_DECIMALS.MockFBTC, btcPrice) +
        calculateUsdValue(fdogeData?.value, TOKEN_DECIMALS.MockFDOGE, dogePrice) +
        calculateUsdValue(sflrData?.value, TOKEN_DECIMALS.MockSFLR, flrPrice);

    return (
        <div className="glass-panel rounded-2xl p-6">
            <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2">
                    <Wallet className="w-5 h-5 text-text-secondary" />
                    <h3 className="text-sm font-medium text-text-secondary">Wallet Balances</h3>
                </div>
                <button
                    onClick={handleRefresh}
                    disabled={isRefreshing || isAnyLoading}
                    className="p-1.5 hover:bg-white/10 rounded-lg transition-colors disabled:opacity-50"
                >
                    <RefreshCw className={cn("w-4 h-4 text-text-muted", isRefreshing && "animate-spin")} />
                </button>
            </div>

            {/* Total Value Header */}
            <div className="mb-4 pb-4 border-b border-white/5">
                <p className="text-xs text-text-muted mb-1">Total Balance</p>
                <p className="text-2xl font-bold text-white tabular-nums">
                    ${totalUsdValue.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                </p>
            </div>

            {/* Token List */}
            <div className="space-y-1 max-h-[400px] overflow-y-auto custom-scrollbar">
                {/* Native FLR */}
                <TokenBalanceRow
                    tokenKey="FLR"
                    balance={nativeBalance}
                    decimals={18}
                    isLoading={nativeLoading}
                />

                {/* MockUSDC */}
                <TokenBalanceRow
                    tokenKey="MockUSDC"
                    balance={usdcData?.value}
                    decimals={TOKEN_DECIMALS.MockUSDC}
                    isLoading={usdcLoading}
                />

                {/* MockWFLR */}
                <TokenBalanceRow
                    tokenKey="MockWFLR"
                    balance={wflrData?.value}
                    decimals={TOKEN_DECIMALS.MockWFLR}
                    isLoading={wflrLoading}
                />

                {/* MockFXRP */}
                <TokenBalanceRow
                    tokenKey="MockFXRP"
                    balance={fxrpData?.value}
                    decimals={TOKEN_DECIMALS.MockFXRP}
                    isLoading={fxrpLoading}
                />

                {/* MockFBTC */}
                <TokenBalanceRow
                    tokenKey="MockFBTC"
                    balance={fbtcData?.value}
                    decimals={TOKEN_DECIMALS.MockFBTC}
                    isLoading={fbtcLoading}
                />

                {/* MockFDOGE */}
                <TokenBalanceRow
                    tokenKey="MockFDOGE"
                    balance={fdogeData?.value}
                    decimals={TOKEN_DECIMALS.MockFDOGE}
                    isLoading={fdogeLoading}
                />

                {/* MockSFLR */}
                <TokenBalanceRow
                    tokenKey="MockSFLR"
                    balance={sflrData?.value}
                    decimals={TOKEN_DECIMALS.MockSFLR}
                    isLoading={sflrLoading}
                />
            </div>
        </div>
    );
}
