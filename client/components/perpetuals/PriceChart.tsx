"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import { useMarkPrice } from "@/lib/hooks";
import { formatUnits } from "viem";
import { TrendingUp, TrendingDown, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";

interface PricePoint {
    time: number;
    price: number;
}

interface PriceChartProps {
    market: string;
    height?: number;
}

// Generate initial mock historical data based on current price
function generateMockHistory(currentPrice: number, points: number = 100): PricePoint[] {
    const now = Date.now();
    const history: PricePoint[] = [];
    let price = currentPrice;

    // Work backwards from current price with seeded randomness
    for (let i = points - 1; i >= 0; i--) {
        const seed = Math.sin(i * 12.9898) * 43758.5453;
        const random = seed - Math.floor(seed);
        const change = (random - 0.48) * (currentPrice * 0.003);
        price = Math.max(price - change, currentPrice * 0.92);
        price = Math.min(price, currentPrice * 1.08);

        history.push({
            time: now - i * 60000,
            price: i === 0 ? currentPrice : price,
        });
    }

    history[history.length - 1].price = currentPrice;
    return history;
}

export function PriceChart({ market, height = 400 }: PriceChartProps) {
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const containerRef = useRef<HTMLDivElement>(null);
    const [priceHistory, setPriceHistory] = useState<PricePoint[]>([]);
    const [dimensions, setDimensions] = useState({ width: 800, height: height });
    const [hoveredPrice, setHoveredPrice] = useState<PricePoint | null>(null);
    const [mouseX, setMouseX] = useState<number | null>(null);
    const lastUpdateRef = useRef<number>(0);
    const initializedRef = useRef<string>("");

    const { data: markPrice, isLoading } = useMarkPrice(market);
    const currentPrice = markPrice ? Number(formatUnits(markPrice, 8)) : 0;

    // Initialize price history when we get a valid price
    useEffect(() => {
        if (currentPrice > 0 && initializedRef.current !== market) {
            initializedRef.current = market;
            setPriceHistory(generateMockHistory(currentPrice, 100));
        }
    }, [currentPrice, market]);

    // Update price history periodically
    useEffect(() => {
        if (currentPrice <= 0 || priceHistory.length === 0) return;

        const interval = setInterval(() => {
            const now = Date.now();
            if (now - lastUpdateRef.current > 3000) {
                lastUpdateRef.current = now;
                setPriceHistory(prev => {
                    if (prev.length === 0) return prev;
                    const newHistory = [...prev.slice(-99), { time: now, price: currentPrice }];
                    return newHistory;
                });
            }
        }, 3000);

        return () => clearInterval(interval);
    }, [currentPrice, priceHistory.length]);

    // Handle resize with ResizeObserver
    useEffect(() => {
        const container = containerRef.current;
        if (!container) return;

        const updateDimensions = () => {
            const rect = container.getBoundingClientRect();
            if (rect.width > 0) {
                setDimensions({ width: rect.width, height });
            }
        };

        // Initial measurement
        updateDimensions();

        // Use ResizeObserver for better resize handling
        const resizeObserver = new ResizeObserver(updateDimensions);
        resizeObserver.observe(container);

        return () => resizeObserver.disconnect();
    }, [height]);

    // Draw chart
    const drawChart = useCallback(() => {
        const canvas = canvasRef.current;
        const ctx = canvas?.getContext('2d');
        if (!canvas || !ctx || priceHistory.length < 2 || dimensions.width < 100) return;

        const { width, height } = dimensions;
        const dpr = window.devicePixelRatio || 1;

        canvas.width = width * dpr;
        canvas.height = height * dpr;
        canvas.style.width = `${width}px`;
        canvas.style.height = `${height}px`;
        ctx.scale(dpr, dpr);

        ctx.clearRect(0, 0, width, height);

        const prices = priceHistory.map(p => p.price);
        const minPrice = Math.min(...prices);
        const maxPrice = Math.max(...prices);
        const priceRange = maxPrice - minPrice || maxPrice * 0.01;
        const padding = priceRange * 0.15;

        const chartPadding = { top: 60, right: 70, bottom: 40, left: 10 };
        const chartWidth = width - chartPadding.left - chartPadding.right;
        const chartHeight = height - chartPadding.top - chartPadding.bottom;

        const getX = (i: number) => chartPadding.left + (i / (priceHistory.length - 1)) * chartWidth;
        const getY = (price: number) => chartPadding.top + chartHeight - ((price - minPrice + padding) / (priceRange + padding * 2)) * chartHeight;

        const startPrice = priceHistory[0].price;
        const endPrice = priceHistory[priceHistory.length - 1].price;
        const isUp = endPrice >= startPrice;
        const lineColor = isUp ? '#22c55e' : '#ef4444';

        // Draw grid
        ctx.strokeStyle = 'rgba(255, 255, 255, 0.05)';
        ctx.lineWidth = 1;

        for (let i = 0; i <= 4; i++) {
            const y = chartPadding.top + (chartHeight / 4) * i;
            ctx.beginPath();
            ctx.moveTo(chartPadding.left, y);
            ctx.lineTo(width - chartPadding.right, y);
            ctx.stroke();

            const price = maxPrice + padding - ((i / 4) * (priceRange + padding * 2));
            ctx.fillStyle = 'rgba(255, 255, 255, 0.4)';
            ctx.font = '10px monospace';
            ctx.textAlign = 'left';
            ctx.fillText(`$${price.toFixed(2)}`, width - chartPadding.right + 8, y + 4);
        }

        // Draw gradient fill
        const gradient = ctx.createLinearGradient(0, chartPadding.top, 0, height - chartPadding.bottom);
        gradient.addColorStop(0, isUp ? 'rgba(34, 197, 94, 0.15)' : 'rgba(239, 68, 68, 0.15)');
        gradient.addColorStop(1, 'rgba(0, 0, 0, 0)');

        ctx.beginPath();
        ctx.moveTo(getX(0), height - chartPadding.bottom);
        priceHistory.forEach((point, i) => ctx.lineTo(getX(i), getY(point.price)));
        ctx.lineTo(getX(priceHistory.length - 1), height - chartPadding.bottom);
        ctx.closePath();
        ctx.fillStyle = gradient;
        ctx.fill();

        // Draw line
        ctx.beginPath();
        ctx.strokeStyle = lineColor;
        ctx.lineWidth = 2;
        ctx.lineJoin = 'round';
        ctx.lineCap = 'round';
        priceHistory.forEach((point, i) => {
            const x = getX(i);
            const y = getY(point.price);
            i === 0 ? ctx.moveTo(x, y) : ctx.lineTo(x, y);
        });
        ctx.stroke();

        // Draw end dot
        const lastX = getX(priceHistory.length - 1);
        const lastY = getY(endPrice);
        ctx.beginPath();
        ctx.arc(lastX, lastY, 6, 0, Math.PI * 2);
        ctx.fillStyle = isUp ? 'rgba(34, 197, 94, 0.3)' : 'rgba(239, 68, 68, 0.3)';
        ctx.fill();
        ctx.beginPath();
        ctx.arc(lastX, lastY, 3, 0, Math.PI * 2);
        ctx.fillStyle = lineColor;
        ctx.fill();

        // Crosshair on hover
        if (mouseX !== null && mouseX >= chartPadding.left && mouseX <= width - chartPadding.right) {
            const index = Math.round(((mouseX - chartPadding.left) / chartWidth) * (priceHistory.length - 1));
            const point = priceHistory[Math.max(0, Math.min(index, priceHistory.length - 1))];
            if (point) {
                const x = getX(Math.max(0, Math.min(index, priceHistory.length - 1)));
                const y = getY(point.price);

                ctx.strokeStyle = 'rgba(255, 255, 255, 0.2)';
                ctx.lineWidth = 1;
                ctx.setLineDash([4, 4]);
                ctx.beginPath();
                ctx.moveTo(x, chartPadding.top);
                ctx.lineTo(x, height - chartPadding.bottom);
                ctx.stroke();
                ctx.beginPath();
                ctx.moveTo(chartPadding.left, y);
                ctx.lineTo(width - chartPadding.right, y);
                ctx.stroke();
                ctx.setLineDash([]);

                ctx.beginPath();
                ctx.arc(x, y, 5, 0, Math.PI * 2);
                ctx.fillStyle = '#fff';
                ctx.fill();
            }
        }
    }, [priceHistory, dimensions, mouseX]);

    useEffect(() => {
        drawChart();
    }, [drawChart]);

    const handleMouseMove = (e: React.MouseEvent<HTMLCanvasElement>) => {
        const rect = canvasRef.current?.getBoundingClientRect();
        if (!rect) return;
        const x = e.clientX - rect.left;
        setMouseX(x);

        const chartPadding = { left: 10, right: 70 };
        const chartWidth = dimensions.width - chartPadding.left - chartPadding.right;
        const index = Math.round(((x - chartPadding.left) / chartWidth) * (priceHistory.length - 1));
        const point = priceHistory[Math.max(0, Math.min(index, priceHistory.length - 1))];
        if (point) setHoveredPrice(point);
    };

    const handleMouseLeave = () => {
        setMouseX(null);
        setHoveredPrice(null);
    };

    const priceChange = priceHistory.length >= 2
        ? priceHistory[priceHistory.length - 1].price - priceHistory[0].price
        : 0;
    const priceChangePercent = priceHistory.length >= 2 && priceHistory[0].price > 0
        ? (priceChange / priceHistory[0].price) * 100
        : 0;
    const isUp = priceChange >= 0;

    if (isLoading && priceHistory.length === 0) {
        return (
            <div
                className="glass-panel rounded-2xl flex items-center justify-center bg-black/40 border border-white/5"
                style={{ height }}
            >
                <Loader2 className="w-8 h-8 animate-spin text-accent" />
            </div>
        );
    }

    return (
        <div
            ref={containerRef}
            className="glass-panel rounded-2xl bg-black/40 border border-white/5 relative overflow-hidden"
            style={{ height }}
        >
            {/* Price header */}
            <div className="absolute top-4 left-4 z-10">
                <div className="flex items-center gap-3">
                    <p className="text-2xl font-bold text-white font-mono">
                        ${(hoveredPrice?.price ?? currentPrice).toLocaleString(undefined, {
                            minimumFractionDigits: 2,
                            maximumFractionDigits: 2
                        })}
                    </p>
                    {priceHistory.length > 0 && (
                        <div className={cn(
                            "flex items-center gap-1 px-2 py-1 rounded-lg text-sm font-medium",
                            isUp ? "bg-green-500/20 text-green-500" : "bg-red-500/20 text-red-500"
                        )}>
                            {isUp ? <TrendingUp className="w-4 h-4" /> : <TrendingDown className="w-4 h-4" />}
                            <span>{isUp ? '+' : ''}{priceChangePercent.toFixed(2)}%</span>
                        </div>
                    )}
                </div>
                {hoveredPrice && (
                    <p className="text-xs text-text-muted mt-1">
                        {new Date(hoveredPrice.time).toLocaleTimeString()}
                    </p>
                )}
            </div>

            {/* Time period selector */}
            <div className="absolute top-4 right-4 z-10 flex gap-1">
                {['1H', '4H', '1D', '1W'].map((period, i) => (
                    <button
                        key={period}
                        className={cn(
                            "px-2 py-1 rounded text-[10px] font-medium transition-colors",
                            i === 0 ? "bg-white/10 text-white" : "text-text-muted hover:text-white hover:bg-white/5"
                        )}
                    >
                        {period}
                    </button>
                ))}
            </div>

            {/* Canvas */}
            <canvas
                ref={canvasRef}
                className="absolute inset-0 w-full h-full cursor-crosshair"
                onMouseMove={handleMouseMove}
                onMouseLeave={handleMouseLeave}
            />

            {/* FTSO badge */}
            <div className="absolute bottom-4 left-4 z-10">
                <span className="text-[10px] bg-accent/10 text-accent px-2 py-1 rounded border border-accent/20">
                    FTSO v2 Price Feed
                </span>
            </div>
        </div>
    );
}
