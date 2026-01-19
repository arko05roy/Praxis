import { http, createConfig } from 'wagmi';
import { injected, walletConnect } from 'wagmi/connectors';

// Flare Mainnet Chain Definition
export const flare = {
  id: 14,
  name: 'Flare',
  nativeCurrency: {
    decimals: 18,
    name: 'Flare',
    symbol: 'FLR',
  },
  rpcUrls: {
    default: { http: ['https://flare-api.flare.network/ext/C/rpc'] },
    public: { http: ['https://flare-api.flare.network/ext/C/rpc'] },
  },
  blockExplorers: {
    default: { name: 'Flare Explorer', url: 'https://flare-explorer.flare.network' },
  },
} as const;

// Coston2 Testnet Chain Definition
export const coston2 = {
  id: 114,
  name: 'Coston2',
  nativeCurrency: {
    decimals: 18,
    name: 'Coston2 Flare',
    symbol: 'C2FLR',
  },
  rpcUrls: {
    default: { http: ['https://coston2-api.flare.network/ext/C/rpc'] },
    public: { http: ['https://coston2-api.flare.network/ext/C/rpc'] },
  },
  blockExplorers: {
    default: { name: 'Coston2 Explorer', url: 'https://coston2-explorer.flare.network' },
  },
  testnet: true,
} as const;

// WalletConnect Project ID (replace with your own)
const projectId = process.env.NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID || 'YOUR_PROJECT_ID';

export const config = createConfig({
  chains: [flare, coston2],
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
  transports: {
    [flare.id]: http(),
    [coston2.id]: http(),
  },
});

declare module 'wagmi' {
  interface Register {
    config: typeof config;
  }
}
