"use client";

import { cn } from "@/lib/utils";
import { Clock, AlertTriangle, CheckCircle, Zap } from "lucide-react";

// =============================================================
//              PRICE FRESHNESS INDICATOR
// =============================================================

interface PriceFreshnessIndicatorProps {
  freshness: 'fresh' | 'recent' | 'stale';
  className?: string;
}

export function PriceFreshnessIndicator({ freshness, className }: PriceFreshnessIndicatorProps) {
  const colors = {
    fresh: 'bg-green-500',
    recent: 'bg-yellow-500',
    stale: 'bg-red-500',
  };

  return (
    <span
      className={cn(
        "w-2 h-2 rounded-full inline-block",
        colors[freshness],
        className
      )}
      title={`Price is ${freshness}`}
    />
  );
}

// =============================================================
//              FTSO SOURCE BADGE
// =============================================================

interface FTSOSourceBadgeProps {
  source: 'ftso_v2' | 'mock';
  size?: 'sm' | 'md';
  className?: string;
}

export function FTSOSourceBadge({ source, size = 'sm', className }: FTSOSourceBadgeProps) {
  const isFTSO = source === 'ftso_v2';

  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 rounded font-medium",
        size === 'sm' ? "text-[10px] px-1.5 py-0.5" : "text-xs px-2 py-1",
        isFTSO
          ? "bg-accent/10 text-accent border border-accent/20"
          : "bg-yellow-500/10 text-yellow-400 border border-yellow-500/20",
        className
      )}
    >
      {isFTSO ? (
        <>
          <Zap className={cn(size === 'sm' ? "w-2.5 h-2.5" : "w-3 h-3")} />
          FTSO v2
        </>
      ) : (
        "Mock"
      )}
    </span>
  );
}

// =============================================================
//              PRICE UPDATE TIME
// =============================================================

interface PriceUpdateTimeProps {
  ageFormatted: string;
  className?: string;
}

export function PriceUpdateTime({ ageFormatted, className }: PriceUpdateTimeProps) {
  return (
    <span className={cn("inline-flex items-center gap-1 text-text-muted", className)}>
      <Clock className="w-3 h-3" />
      <span className="text-[10px]">{ageFormatted}</span>
    </span>
  );
}

// =============================================================
//              STALENESS WARNING BADGE
// =============================================================

interface StalenessWarningBadgeProps {
  className?: string;
}

export function StalenessWarningBadge({ className }: StalenessWarningBadgeProps) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 text-[10px] px-1.5 py-0.5 rounded bg-red-500/10 text-red-400 border border-red-500/20",
        className
      )}
    >
      <AlertTriangle className="w-2.5 h-2.5" />
      Stale
    </span>
  );
}

// =============================================================
//              COMBINED PRICE STATUS
// =============================================================

interface PriceStatusProps {
  freshness: 'fresh' | 'recent' | 'stale';
  source: 'ftso_v2' | 'mock';
  ageFormatted: string;
  showSource?: boolean;
  showTime?: boolean;
  compact?: boolean;
  className?: string;
}

export function PriceStatus({
  freshness,
  source,
  ageFormatted,
  showSource = true,
  showTime = true,
  compact = false,
  className,
}: PriceStatusProps) {
  if (compact) {
    return (
      <div className={cn("flex items-center gap-1.5", className)}>
        <PriceFreshnessIndicator freshness={freshness} />
        {freshness === 'stale' ? (
          <StalenessWarningBadge />
        ) : showTime ? (
          <span className="text-[10px] text-text-muted">{ageFormatted}</span>
        ) : null}
      </div>
    );
  }

  return (
    <div className={cn("flex items-center gap-2", className)}>
      <PriceFreshnessIndicator freshness={freshness} />
      {freshness === 'stale' ? (
        <StalenessWarningBadge />
      ) : (
        <>
          {showTime && <PriceUpdateTime ageFormatted={ageFormatted} />}
          {showSource && <FTSOSourceBadge source={source} />}
        </>
      )}
    </div>
  );
}

// =============================================================
//              FTSO HEADER BADGE
// =============================================================

interface FTSOHeaderBadgeProps {
  isConnected: boolean;
  className?: string;
}

export function FTSOHeaderBadge({ isConnected, className }: FTSOHeaderBadgeProps) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 text-[10px] px-2 py-1 rounded-full font-medium",
        isConnected
          ? "bg-accent/10 text-accent border border-accent/20"
          : "bg-white/5 text-text-muted border border-white/10",
        className
      )}
    >
      {isConnected ? (
        <>
          <CheckCircle className="w-3 h-3" />
          FTSO v2
        </>
      ) : (
        "No Oracle"
      )}
    </span>
  );
}
