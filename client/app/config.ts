import {
    createConfig,
    http,
    cookieStorage,
    createStorage
} from 'wagmi'
import { injected, walletConnect } from 'wagmi/connectors'
import { defineChain } from 'viem'

// Define Coston2 testnet with proper native currency
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

// Define Flare mainnet
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

// Define Local Fork (Anvil) - for demo and testing
// Uses same chain ID as Flare mainnet (14) but different RPC
export const flareFork = defineChain({
    id: 31337, // Anvil default chain ID for local testing
    name: 'Flare Fork (Local)',
    nativeCurrency: {
        decimals: 18,
        name: 'Flare',
        symbol: 'FLR',
    },
    rpcUrls: {
        default: { http: ['http://127.0.0.1:8546'] },
    },
    blockExplorers: {
        default: { name: 'Local', url: 'http://127.0.0.1:8546' },
    },
    testnet: true,
})

const projectId = process.env.NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID || 'YOUR_PROJECT_ID'

// Check if we're using local fork
const useLocalFork = process.env.NEXT_PUBLIC_USE_LOCAL_FORK === 'true'

export function getConfig() {
    // Include local fork chain when enabled
    const chains = useLocalFork ? [flareFork, coston2, flare] : [coston2, flare]

    const transports: Record<number, ReturnType<typeof http>> = {
        [coston2.id]: http(),
        [flare.id]: http(),
    }

    if (useLocalFork) {
        transports[flareFork.id] = http('http://127.0.0.1:8546')
    }

    return createConfig({
        chains: chains as any,
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
        transports,
    })
}