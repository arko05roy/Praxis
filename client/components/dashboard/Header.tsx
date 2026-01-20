"use client";

import { Bell, User } from "lucide-react";
import { ConnectButton } from "@rainbow-me/rainbowkit";
import { usePathname } from "next/navigation";

export function Header() {
    const pathname = usePathname();
    // Simple logic to get current page name
    const pageName = pathname.split("/").pop() || "Dashboard";
    const title = pageName.charAt(0).toUpperCase() + pageName.slice(1);

    return (
        <header className="flex items-center justify-between px-8 py-5 bg-background sticky top-0 z-40 border-b border-white/5 backdrop-blur-sm">
            <div className="flex items-center gap-4">
                <h1 className="text-2xl font-semibold text-white">{title}</h1>
            </div>

            <div className="flex items-center gap-4">
                <ConnectButton
                    accountStatus={{
                        smallScreen: 'avatar',
                        largeScreen: 'full',
                    }}
                    showBalance={{
                        smallScreen: false,
                        largeScreen: true,
                    }}
                />

                <div className="flex items-center gap-2 border-l border-white/10 pl-4 ml-2">
                    <button className="w-10 h-10 rounded-full bg-background-secondary border border-white/5 flex items-center justify-center hover:bg-white/5 transition-colors text-white">
                        <User className="w-5 h-5" />
                    </button>
                    <button className="w-10 h-10 rounded-full bg-background-secondary border border-white/5 flex items-center justify-center hover:bg-white/5 transition-colors text-white relative">
                        <Bell className="w-5 h-5" />
                        <span className="absolute top-2 right-2.5 w-2 h-2 bg-accent rounded-full border border-background-secondary"></span>
                    </button>
                </div>
            </div>
        </header>
    );
}
