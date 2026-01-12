import hardhatToolboxMochaEthersPlugin from "@nomicfoundation/hardhat-toolbox-mocha-ethers";
import { defineConfig } from "hardhat/config";
import dotenv from "dotenv";

// Load environment variables from .env file
dotenv.config();

// Environment variable helpers with defaults
const PRIVATE_KEY =
  process.env.PRIVATE_KEY ||
  "0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80"; // Default Hardhat test key

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

    // Flare Mainnet Fork (for testing with real DEX liquidity)
    flareFork: {
      type: "edr-simulated",
      chainType: "l1",
      forkConfig: {
        jsonRpcUrl: "https://flare-api.flare.network/ext/C/rpc",
        blockNumber: 53740000,
      },
    },

    // Anvil Fork (run anvil with: anvil --fork-url https://flare-api.flare.network/ext/C/rpc --port 8546)
    anvilFork: {
      type: "http",
      chainType: "l1",
      url: "http://127.0.0.1:8546",
      accounts: ["0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80"],
      chainId: 14,
    },

    // Flare Testnet (Coston2)
    coston2: {
      type: "http",
      chainType: "l1",
      url:
        process.env.COSTON2_RPC_URL ||
        "https://coston2-api.flare.network/ext/C/rpc",
      accounts: [PRIVATE_KEY],
      chainId: 114,
    },

    // Flare Mainnet
    flare: {
      type: "http",
      chainType: "l1",
      url:
        process.env.FLARE_RPC_URL ||
        "https://flare-api.flare.network/ext/C/rpc",
      accounts: [PRIVATE_KEY],
      chainId: 14,
    },

    // Songbird Testnet (Coston)
    coston: {
      type: "http",
      chainType: "l1",
      url:
        process.env.COSTON_RPC_URL ||
        "https://coston-api.flare.network/ext/C/rpc",
      accounts: [PRIVATE_KEY],
      chainId: 16,
    },

    // Songbird Mainnet
    songbird: {
      type: "http",
      chainType: "l1",
      url:
        process.env.SONGBIRD_RPC_URL ||
        "https://songbird-api.flare.network/ext/C/rpc",
      accounts: [PRIVATE_KEY],
      chainId: 19,
    },

    // Ethereum Sepolia (for testing cross-chain)
    sepolia: {
      type: "http",
      chainType: "l1",
      url: process.env.SEPOLIA_RPC_URL || "https://rpc.sepolia.org",
      accounts: [PRIVATE_KEY],
    },
  },
});
