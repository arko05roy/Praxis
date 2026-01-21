import {
    createConfig,
    http,
    cookieStorage,
    createStorage
} from 'wagmi'
import { injected, walletConnect } from 'wagmi/connectors'
import { defineChain } from 'viem'

// Define Coston2 testnet - PRIMARY NETWORK for demo
export const coston2 = defineChain({
    id: 114,
    name: 'Coston2',
    nativeCurrency: {
        decimals: 18,
        name: 'Coston2 Flare',
        symbol: 'C2FLR',
    },
    rpcUrls: {
        default: { http: ['https://coston2-api.flare.network/ext/C/rpc'] },
    },
    blockExplorers: {
        default: { name: 'Coston2 Explorer', url: 'https://coston2-explorer.flare.network' },
    },
    testnet: true,
})

// Define Flare mainnet (for reference - not used in testnet demo)
export const flare = defineChain({
    id: 14,
    name: 'Flare',
    nativeCurrency: {
        decimals: 18,
        name: 'Flare',
        symbol: 'FLR',
    },
    rpcUrls: {
        default: { http: ['https://flare-api.flare.network/ext/C/rpc'] },
    },
    blockExplorers: {
        default: { name: 'Flare Explorer', url: 'https://flare-explorer.flare.network' },
    },
})

const projectId = process.env.NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID || 'YOUR_PROJECT_ID'

export function getConfig() {
    // Coston2 is the primary network for testnet demo
    // Flare mainnet included for wallet compatibility but not actively used
    const chains = [coston2, flare] as const

    return createConfig({
        chains,
        connectors: [
            injected(),
            walletConnect({
                projectId,
                metadata: {
                    name: 'PRAXIS',
                    description: 'Execution Rights Protocol',
                    url: 'https://praxis.finance',
                    icons: ['https://praxis.finance/logo.png'],
                },
            }),
        ],
        ssr: true,
        storage: createStorage({
            storage: cookieStorage,
        }),
        transports: {
            [coston2.id]: http(),
            [flare.id]: http(),
        },
    })
}

// Default chain for the application
export const DEFAULT_CHAIN_ID = 114; // Coston2

// Check if a chain is supported
export function isSupportedChain(chainId: number): boolean {
    return chainId === 114 || chainId === 14;
}

// Check if the chain is the testnet
export function isTestnetChain(chainId: number): boolean {
    return chainId === 114;
}
