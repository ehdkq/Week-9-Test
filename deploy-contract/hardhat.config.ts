import "dotenv/config";
import { HardhatUserConfig } from "hardhat/config";
import "@nomicfoundation/hardhat-toolbox";

const RPC_URL = "https://eth.didlab.org/";
const CHAIN_ID = 31337;
const PRIVKEY = process.env.PRIVKEY!;

const config: HardhatUserConfig = {
  solidity: {
    version: "0.8.20",
    settings: {
    evmVersion: "paris", 
      optimizer: {
        enabled: true,
        runs: 200,
      },
    },
  },
  networks: {
    didlab: {
      url: RPC_URL,
      chainId: CHAIN_ID,
      accounts: process.env.PRIVKEY ? [process.env.PRIVKEY] : [],
      type: "http", // Only allowed types are "http" and "edr-simulated"
    },
  },
};

export default config;
