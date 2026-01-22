"use client";

import { useState } from "react";
import {
  Shield,
  Lock,
  ArrowLeftRight,
  TrendingUp,
  Activity,
  CheckCircle2,
  Eye,
  EyeOff,
  Zap,
} from "lucide-react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  PrivateSwap,
  PrivateYield,
  PrivatePerp,
  PrivateSettlement,
  PrivateExecutionHistory,
} from "@/components/zk";

export default function PrivateExecutionPage() {
  const [activeTab, setActiveTab] = useState("swap");

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="glass-panel rounded-2xl p-6 relative overflow-hidden">
        {/* Ambient glow */}
        <div className="absolute top-0 right-0 w-64 h-64 bg-[#8FD460]/5 rounded-full blur-[100px] pointer-events-none" />

        <div className="relative z-10">
          <div className="flex items-center gap-3 mb-3">
            <div className="w-12 h-12 rounded-xl bg-[#8FD460]/20 flex items-center justify-center">
              <Shield className="w-6 h-6 text-[#8FD460]" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-white">
                Private Execution Center
              </h1>
              <p className="text-gray-400">
                Execute DeFi operations privately using zero-knowledge proofs
              </p>
            </div>
          </div>

          {/* Feature highlights */}
          <div className="grid grid-cols-4 gap-4 mt-6">
            <div className="bg-black/20 rounded-xl p-4 border border-white/5">
              <div className="flex items-center gap-2 text-[#8FD460] mb-2">
                <Lock className="w-4 h-4" />
                <span className="text-sm font-medium">Hidden Trades</span>
              </div>
              <p className="text-xs text-gray-500">
                Token pairs and amounts stay private
              </p>
            </div>
            <div className="bg-black/20 rounded-xl p-4 border border-white/5">
              <div className="flex items-center gap-2 text-[#8FD460] mb-2">
                <EyeOff className="w-4 h-4" />
                <span className="text-sm font-medium">Strategy Protection</span>
              </div>
              <p className="text-xs text-gray-500">
                Your alpha stays secret from competitors
              </p>
            </div>
            <div className="bg-black/20 rounded-xl p-4 border border-white/5">
              <div className="flex items-center gap-2 text-[#8FD460] mb-2">
                <Shield className="w-4 h-4" />
                <span className="text-sm font-medium">Identity Obscured</span>
              </div>
              <p className="text-xs text-gray-500">
                Protocols see "PRAXIS vault" not you
              </p>
            </div>
            <div className="bg-black/20 rounded-xl p-4 border border-white/5">
              <div className="flex items-center gap-2 text-[#8FD460] mb-2">
                <Zap className="w-4 h-4" />
                <span className="text-sm font-medium">Compliance Proven</span>
              </div>
              <p className="text-xs text-gray-500">
                ZK proofs verify ERT constraints
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="grid grid-cols-12 gap-6">
        {/* Execution Panel */}
        <div className="col-span-8">
          <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
            <TabsList className="w-full bg-black/30 border border-white/5 rounded-xl p-1 mb-6">
              <TabsTrigger
                value="swap"
                className="flex-1 flex items-center gap-2 justify-center data-[state=active]:bg-[#8FD460]/20 data-[state=active]:text-[#8FD460] rounded-lg py-3"
              >
                <ArrowLeftRight className="w-4 h-4" />
                Private Swap
              </TabsTrigger>
              <TabsTrigger
                value="yield"
                className="flex-1 flex items-center gap-2 justify-center data-[state=active]:bg-[#8FD460]/20 data-[state=active]:text-[#8FD460] rounded-lg py-3"
              >
                <TrendingUp className="w-4 h-4" />
                Private Yield
              </TabsTrigger>
              <TabsTrigger
                value="perp"
                className="flex-1 flex items-center gap-2 justify-center data-[state=active]:bg-[#8FD460]/20 data-[state=active]:text-[#8FD460] rounded-lg py-3"
              >
                <Activity className="w-4 h-4" />
                Private Perp
              </TabsTrigger>
              <TabsTrigger
                value="settlement"
                className="flex-1 flex items-center gap-2 justify-center data-[state=active]:bg-[#8FD460]/20 data-[state=active]:text-[#8FD460] rounded-lg py-3"
              >
                <CheckCircle2 className="w-4 h-4" />
                Settlement
              </TabsTrigger>
            </TabsList>

            <TabsContent value="swap" className="mt-0">
              <PrivateSwap />
            </TabsContent>
            <TabsContent value="yield" className="mt-0">
              <PrivateYield />
            </TabsContent>
            <TabsContent value="perp" className="mt-0">
              <PrivatePerp />
            </TabsContent>
            <TabsContent value="settlement" className="mt-0">
              <PrivateSettlement />
            </TabsContent>
          </Tabs>
        </div>

        {/* Sidebar */}
        <div className="col-span-4 space-y-6">
          {/* How It Works */}
          <div className="glass-panel rounded-2xl p-5">
            <h3 className="text-lg font-medium text-white mb-4 flex items-center gap-2">
              <Eye className="w-5 h-5 text-[#8FD460]" />
              How Private Execution Works
            </h3>

            <div className="space-y-4">
              <div className="flex gap-3">
                <div className="w-6 h-6 rounded-full bg-[#8FD460]/20 flex items-center justify-center text-[#8FD460] text-xs font-bold shrink-0">
                  1
                </div>
                <div>
                  <div className="text-white text-sm font-medium">
                    Select Your Action
                  </div>
                  <div className="text-xs text-gray-500">
                    Choose swap, yield, perp, or settlement
                  </div>
                </div>
              </div>

              <div className="flex gap-3">
                <div className="w-6 h-6 rounded-full bg-[#8FD460]/20 flex items-center justify-center text-[#8FD460] text-xs font-bold shrink-0">
                  2
                </div>
                <div>
                  <div className="text-white text-sm font-medium">
                    Generate ZK Proof
                  </div>
                  <div className="text-xs text-gray-500">
                    Proof encrypts your trade details
                  </div>
                </div>
              </div>

              <div className="flex gap-3">
                <div className="w-6 h-6 rounded-full bg-[#8FD460]/20 flex items-center justify-center text-[#8FD460] text-xs font-bold shrink-0">
                  3
                </div>
                <div>
                  <div className="text-white text-sm font-medium">
                    Verify Compliance
                  </div>
                  <div className="text-xs text-gray-500">
                    Proof shows ERT constraints are met
                  </div>
                </div>
              </div>

              <div className="flex gap-3">
                <div className="w-6 h-6 rounded-full bg-[#8FD460]/20 flex items-center justify-center text-[#8FD460] text-xs font-bold shrink-0">
                  4
                </div>
                <div>
                  <div className="text-white text-sm font-medium">
                    Execute Privately
                  </div>
                  <div className="text-xs text-gray-500">
                    Trade happens, details stay hidden
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* What's Hidden vs Public */}
          <div className="glass-panel rounded-2xl p-5">
            <h3 className="text-lg font-medium text-white mb-4">
              Privacy Breakdown
            </h3>

            <div className="space-y-3">
              <div>
                <div className="flex items-center gap-2 text-yellow-500 text-sm font-medium mb-2">
                  <EyeOff className="w-4 h-4" />
                  Hidden (Private)
                </div>
                <ul className="text-xs text-gray-400 space-y-1 ml-6">
                  <li>Token addresses & pairs</li>
                  <li>Trade amounts & directions</li>
                  <li>Strategy & timing intent</li>
                  <li>Position sizes & leverage</li>
                </ul>
              </div>

              <div className="border-t border-white/5 pt-3">
                <div className="flex items-center gap-2 text-[#8FD460] text-sm font-medium mb-2">
                  <Eye className="w-4 h-4" />
                  Revealed (Public)
                </div>
                <ul className="text-xs text-gray-400 space-y-1 ml-6">
                  <li>ERT ID used</li>
                  <li>Timestamp of execution</li>
                  <li>Compliance attestations</li>
                  <li>Final PnL (at settlement)</li>
                </ul>
              </div>
            </div>
          </div>

          {/* Execution History */}
          <PrivateExecutionHistory maxItems={5} showControls={true} />
        </div>
      </div>
    </div>
  );
}
