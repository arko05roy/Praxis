import {
    createConfig,
    http,
    cookieStorage,
    createStorage
} from 'wagmi'
import { flare, flareTestnet } from 'wagmi/chains'

export function getConfig() {
    return createConfig({
        chains: [flareTestnet],
        ssr: true,
        storage: createStorage({
            storage: cookieStorage,
        }),
        transports: {
            [flareTestnet.id]: http(),
        },
    })
}