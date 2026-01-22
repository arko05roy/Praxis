"use client";

import { useState, useEffect } from "react";
import {
  ArrowLeftRight,
  TrendingUp,
  Activity,
  CheckCircle2,
  Clock,
  XCircle,
  ExternalLink,
  RefreshCw,
  Trash2,
} from "lucide-react";
import { getExecutionHistory, clearExecutionHistory } from "@/lib/zk";
import type { PrivateExecutionHistoryEntry } from "@/lib/zk";
import { Button } from "@/components/ui/button";

interface PrivateExecutionHistoryProps {
  maxItems?: number;
  showControls?: boolean;
}

export function PrivateExecutionHistory({
  maxItems = 10,
  showControls = true,
}: PrivateExecutionHistoryProps) {
  const [history, setHistory] = useState<PrivateExecutionHistoryEntry[]>([]);
  const [isRefreshing, setIsRefreshing] = useState(false);

  const refreshHistory = () => {
    setIsRefreshing(true);
    setHistory(getExecutionHistory(maxItems));
    setTimeout(() => setIsRefreshing(false), 300);
  };

  useEffect(() => {
    // Initial fetch deferred to next tick
    const timer = setTimeout(refreshHistory, 0);
    // Set up polling
    const interval = setInterval(refreshHistory, 5000);
    return () => {
      clearTimeout(timer);
      clearInterval(interval);
    };
  }, [maxItems]);

  const handleClearHistory = () => {
    clearExecutionHistory();
    setHistory([]);
  };

  const getActionIcon = (actionType: PrivateExecutionHistoryEntry["actionType"]) => {
    switch (actionType) {
      case "swap":
        return <ArrowLeftRight className="w-4 h-4" />;
      case "yield":
        return <TrendingUp className="w-4 h-4" />;
      case "perp":
        return <Activity className="w-4 h-4" />;
      case "settlement":
        return <CheckCircle2 className="w-4 h-4" />;
    }
  };

  const getStatusColor = (status: PrivateExecutionHistoryEntry["status"]) => {
    switch (status) {
      case "completed":
        return "text-[#8FD460]";
      case "pending":
        return "text-yellow-500";
      case "failed":
        return "text-red-500";
    }
  };

  const getStatusIcon = (status: PrivateExecutionHistoryEntry["status"]) => {
    switch (status) {
      case "completed":
        return <CheckCircle2 className="w-4 h-4 text-[#8FD460]" />;
      case "pending":
        return <Clock className="w-4 h-4 text-yellow-500" />;
      case "failed":
        return <XCircle className="w-4 h-4 text-red-500" />;
    }
  };

  const formatTime = (timestamp: number) => {
    const date = new Date(timestamp * 1000);
    const now = new Date();
    const diff = now.getTime() - date.getTime();

    if (diff < 60000) return "Just now";
    if (diff < 3600000) return `${Math.floor(diff / 60000)}m ago`;
    if (diff < 86400000) return `${Math.floor(diff / 3600000)}h ago`;
    return date.toLocaleDateString();
  };

  if (history.length === 0) {
    return (
      <div className="glass-panel rounded-2xl p-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-medium text-white">Private Execution History</h3>
          {showControls && (
            <Button
              variant="ghost"
              size="sm"
              onClick={refreshHistory}
              className="text-gray-400 hover:text-white"
            >
              <RefreshCw
                className={`w-4 h-4 ${isRefreshing ? "animate-spin" : ""}`}
              />
            </Button>
          )}
        </div>

        <div className="text-center py-8">
          <div className="w-16 h-16 mx-auto rounded-full bg-white/5 flex items-center justify-center mb-4">
            <Clock className="w-8 h-8 text-gray-500" />
          </div>
          <p className="text-gray-400">No private executions yet</p>
          <p className="text-sm text-gray-500 mt-1">
            Your execution history will appear here
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="glass-panel rounded-2xl p-6">
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-medium text-white">Private Execution History</h3>
        {showControls && (
          <div className="flex items-center gap-2">
            <Button
              variant="ghost"
              size="sm"
              onClick={refreshHistory}
              className="text-gray-400 hover:text-white"
            >
              <RefreshCw
                className={`w-4 h-4 ${isRefreshing ? "animate-spin" : ""}`}
              />
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={handleClearHistory}
              className="text-gray-400 hover:text-red-400"
            >
              <Trash2 className="w-4 h-4" />
            </Button>
          </div>
        )}
      </div>

      {/* History List */}
      <div className="space-y-3">
        {history.map((entry) => (
          <div
            key={entry.id}
            className="bg-black/30 rounded-xl p-4 border border-white/5 hover:border-white/10 transition-colors"
          >
            <div className="flex items-start justify-between">
              <div className="flex items-center gap-3">
                {/* Action Icon */}
                <div
                  className={`w-10 h-10 rounded-lg flex items-center justify-center ${entry.actionType === "swap"
                      ? "bg-blue-500/20 text-blue-400"
                      : entry.actionType === "yield"
                        ? "bg-green-500/20 text-green-400"
                        : entry.actionType === "perp"
                          ? "bg-purple-500/20 text-purple-400"
                          : "bg-[#8FD460]/20 text-[#8FD460]"
                    }`}
                >
                  {getActionIcon(entry.actionType)}
                </div>

                {/* Details */}
                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-white font-medium capitalize">
                      {entry.actionType}
                    </span>
                    <span className="text-gray-500 text-sm">
                      ERT #{entry.ertId}
                    </span>
                  </div>
                  <p className="text-sm text-gray-400 mt-0.5">
                    {entry.publicDescription}
                  </p>
                </div>
              </div>

              {/* Status & Time */}
              <div className="text-right">
                <div className="flex items-center gap-1.5 justify-end">
                  {getStatusIcon(entry.status)}
                  <span className={`text-sm capitalize ${getStatusColor(entry.status)}`}>
                    {entry.status}
                  </span>
                </div>
                <span className="text-xs text-gray-500">
                  {formatTime(entry.timestamp)}
                </span>
              </div>
            </div>

            {/* Transaction Link */}
            {entry.txHash && (
              <div className="mt-3 pt-3 border-t border-white/5 flex items-center justify-between">
                <span className="text-xs text-gray-500 font-mono">
                  {entry.proofHash.slice(0, 16)}...
                </span>
                <a
                  href={`https://coston2-explorer.flare.network/tx/${entry.txHash}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-xs text-[#8FD460] hover:underline flex items-center gap-1"
                >
                  View on Explorer
                  <ExternalLink className="w-3 h-3" />
                </a>
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
