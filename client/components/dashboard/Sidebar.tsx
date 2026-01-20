"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
    LayoutGrid,
    Wallet,
    Bookmark,
    ArrowLeftRight,
    Store,
    BarChart2,
    Headphones,
    Settings
} from "lucide-react";
import { cn } from "@/lib/utils";

const navigation = [
    { name: "Dashboard", href: "/dashboard", icon: LayoutGrid, section: "Main" },
    { name: "Wallet", href: "/dashboard/wallet", icon: Wallet, section: "Main" },
    { name: "Watchlist", href: "/dashboard/watchlist", icon: Bookmark, section: "Main" },
    { name: "Transaction", href: "/dashboard/transactions", icon: ArrowLeftRight, section: "Main" },
    { name: "Market", href: "/dashboard/market", icon: Store, section: "Insign" },
    { name: "Analytics", href: "/dashboard/analytics", icon: BarChart2, section: "Insign" },
    { name: "Support", href: "/dashboard/support", icon: Headphones, section: "Tools" },
    { name: "Setting", href: "/dashboard/settings", icon: Settings, section: "Tools" },
];

export function Sidebar() {
    const pathname = usePathname();

    return (
        <div className="fixed left-0 top-0 h-full w-[230px] bg-[#0a0f0d] border-r border-white/5 p-5 flex flex-col z-50">
            <div className="flex items-center gap-2 mb-10 pl-2">
                <div className="w-8 h-8 rounded-full bg-accent flex items-center justify-center">
                    <LayoutGrid className="w-5 h-5 text-black" />
                </div>
                <span className="text-xl font-bold text-white tracking-wide">Cryptfy</span>
            </div>

            <div className="flex-1 overflow-y-auto space-y-8">
                {["Main", "Insign", "Tools"].map((section) => (
                    <div key={section}>
                        <h3 className="text-xs font-semibold text-text-muted uppercase tracking-wider mb-3 pl-2">
                            {section}
                        </h3>
                        <div className="space-y-1">
                            {navigation
                                .filter((item) => item.section === section)
                                .map((item) => {
                                    const isActive = pathname === item.href;
                                    return (
                                        <Link
                                            key={item.name}
                                            href={item.href}
                                            className={cn(
                                                "flex items-center gap-3 px-3 py-3 rounded-xl text-sm font-medium transition-all duration-200",
                                                isActive
                                                    ? "bg-accent text-black shadow-[0_0_20px_rgba(143,212,96,0.2)]"
                                                    : "text-text-secondary hover:bg-white/5 hover:text-white"
                                            )}
                                        >
                                            <item.icon className={cn("w-5 h-5", isActive ? "text-black" : "text-current")} />
                                            {item.name}
                                        </Link>
                                    );
                                })}
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
}
