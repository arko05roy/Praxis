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
          optimizer: {
            enabled: true,
            runs: 50, // Low runs for size optimization (SparkDEXEternalAdapter is large)
          },
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
    // Uses latest block for most up-to-date state including FXRP
    flareFork: {
      type: "edr-simulated",
      chainType: "l1",
      chainId: 14, // Flare mainnet chainId
      forkConfig: {
        jsonRpcUrl: "https://flare-api.flare.network/ext/C/rpc",
        // No blockNumber specified - forks from latest block
      },
    },

    // Anvil Fork (run anvil with: anvil --fork-url https://flare-api.flare.network/ext/C/rpc --port 8546 --chain-id 31337)
    anvilFork: {
      type: "http",
      chainType: "l1",
      url: "http://127.0.0.1:8546",
      // Anvil default test accounts (same as Hardhat)
      accounts: [
        "0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80",
        "0x59c6995e998f97a5a0044966f0945389dc9e86dae88c7a8412f4603b6b78690d",
        "0x5de4111afa1a4b94908f83103eb1f1706367c2e68ca870fc3fb9a804cdab365a",
        "0x7c852118294e51e653712a81e05800f419141751be58f605c371e15141b007a6",
        "0x47e179ec197488593b187f80a00eb0da91f1b9d0b13f8733639f19c30a34926a",
        "0x8b3a350cf5c34c9194ca85829a2df0ec3153be0318b5e2d3348e872092edffba",
        "0x92db14e403b83dfe3df233f83dfa3a0d7096f21ca9b0d6d6b8d88b2b4ec1564e",
        "0x4bbbf85ce3377467afe5d46f804f221813b2bb87f24d81f60f1fcdbf7cbf4356",
        "0xdbda1821b80551c9d65939329250298aa3472ba22feea921c0cf5d620ea67b97",
        "0x2a871d0798f97d79848a013d4936a73bf4cc922c825d33c1cf7073dff6d409c6",
      ],
      chainId: 31337, // Local fork chain ID (matches client config)
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
