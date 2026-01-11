import hardhatToolboxMochaEthersPlugin from "@nomicfoundation/hardhat-toolbox-mocha-ethers";
import { configVariable, defineConfig } from "hardhat/config";

export default defineConfig({
  plugins: [hardhatToolboxMochaEthersPlugin],
  solidity: {
    profiles: {
      default: {
        version: "0.8.28",
        settings: {
          evmVersion: "cancun",
        },
      },
      production: {
        version: "0.8.28",
        settings: {
          evmVersion: "cancun",
          optimizer: {
            enabled: true,
            runs: 200,
          },
        },
      },
    },
  },
  networks: {
    // Local simulated networks
    hardhatMainnet: {
      type: "edr-simulated",
      chainType: "l1",
    },
    hardhatOp: {
      type: "edr-simulated",
      chainType: "op",
    },

    // Flare Testnet (Coston2)
    coston2: {
      type: "http",
      chainType: "l1",
      url: configVariable("COSTON2_RPC_URL", {
        defaultValue: "https://coston2-api.flare.network/ext/C/rpc",
      }),
      accounts: [configVariable("PRIVATE_KEY")],
      chainId: 114,
    },

    // Flare Mainnet
    flare: {
      type: "http",
      chainType: "l1",
      url: configVariable("FLARE_RPC_URL", {
        defaultValue: "https://flare-api.flare.network/ext/C/rpc",
      }),
      accounts: [configVariable("PRIVATE_KEY")],
      chainId: 14,
    },

    // Songbird Testnet (Coston)
    coston: {
      type: "http",
      chainType: "l1",
      url: configVariable("COSTON_RPC_URL", {
        defaultValue: "https://coston-api.flare.network/ext/C/rpc",
      }),
      accounts: [configVariable("PRIVATE_KEY")],
      chainId: 16,
    },

    // Songbird Mainnet
    songbird: {
      type: "http",
      chainType: "l1",
      url: configVariable("SONGBIRD_RPC_URL", {
        defaultValue: "https://songbird-api.flare.network/ext/C/rpc",
      }),
      accounts: [configVariable("PRIVATE_KEY")],
      chainId: 19,
    },

    // Ethereum Sepolia (for testing cross-chain)
    sepolia: {
      type: "http",
      chainType: "l1",
      url: configVariable("SEPOLIA_RPC_URL"),
      accounts: [configVariable("PRIVATE_KEY")],
    },
  },
});
