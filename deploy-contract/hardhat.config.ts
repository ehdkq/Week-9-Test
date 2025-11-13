import "dotenv/config";
import { HardhatUserConfig } from "hardhat/config";
import "@nomicfoundation/hardhat-toolbox";
// We removed the extra "@nomicfoundation/hardhat-ethers" import earlier

// These variables are loaded from your .env file
const RPC_URL = process.env.RPC_URL!;
const CHAIN_ID = Number(process.env.CHAIN_ID || "31338");
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
    // This is the network you need to add back
    didlab: {
      url: RPC_URL,
      chainId: CHAIN_ID,
      accounts: PRIVKEY ? [PRIVKEY] : [],
    },
    // You might also have a 'hardhat' network definition here
    hardhat: {
      // Config for the local node
    }
  },
};

export default config;
