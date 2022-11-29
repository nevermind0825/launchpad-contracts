import { HardhatUserConfig } from "hardhat/config";
import "@nomicfoundation/hardhat-chai-matchers";
import "@nomicfoundation/hardhat-toolbox";
import "@nomiclabs/hardhat-etherscan";
import "@nomiclabs/hardhat-solhint";
import "@openzeppelin/hardhat-upgrades";
import "@typechain/hardhat";
import "hardhat-contract-sizer";
import "hardhat-gas-reporter";
import "solidity-coverage";

import "./tasks/accounts";

import { config as dotenvConfig } from "dotenv";
import { resolve } from "path";

dotenvConfig({ path: resolve(__dirname, "./.env") });

// Ensure that we have all the environment variables we need.
let PRIVATEKEY: string;
if (!process.env.PRIVATEKEY) {
  throw new Error("Please set your PRIVATEKEY in a .env file");
} else {
  PRIVATEKEY = process.env.PRIVATEKEY;
}

const chainIds = {
  localhost: 1337,
  hardhat: 31337,
  bsc: 56,
  bsct: 97,
  mainnet: 1,
};

const config: HardhatUserConfig = {
  contractSizer: {
    alphaSort: true,
    runOnCompile: true,
    disambiguatePaths: false,
  },
  solidity: {
    version: "0.8.9",
    settings: {
      metadata: {
        // Not including the metadata hash
        // https://github.com/paulrberg/solidity-template/issues/31
        bytecodeHash: "none",
      },
      // You should disable the optimizer when debugging
      // https://hardhat.org/hardhat-network/#solidity-optimizer-support
      optimizer: {
        enabled: true,
        runs: 800,
      },
    },
  },
  etherscan: {
    // apiKey: process.env.ETHERSCAN,
    apiKey: process.env.BSCSCAN,
  },
  networks: {
    localhost: {
      url: "http://localhost:8545"
    },
    hardhat: {
      forking: {
        url: "https://bsc-dataseed.binance.org/"
      }
    },
    bsc: {
      accounts: [PRIVATEKEY],
      url: "https://bsc-dataseed.binance.org/",
      chainId: chainIds.bsc,
    },
    bsct: {
      accounts: [PRIVATEKEY],
      url: "https://data-seed-prebsc-1-s1.binance.org:8545/",
      chainId: chainIds.bsct,
    },
    mainnet: {
      accounts: [PRIVATEKEY],
      url: "https://mainnet.infura.io/v3/9aa3d95b3bc440fa88ea12eaa4456161",
      chainId: chainIds.mainnet,
      gasPrice: 100000000000,
    },
  },
  paths: {
    artifacts: "./artifacts",
    cache: "./cache",
    sources: "./contracts",
    tests: "./test",
  },
  typechain: {
    outDir: "typechain",
    target: "ethers-v5",
  },
};

export default config;
