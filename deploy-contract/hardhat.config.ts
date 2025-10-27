import "dotenv/config";
import { HardhatUserConfig } from "hardhat/config";
import "@nomicfoundation/hardhat-toolbox";

const RPC_URL = process.env.RPC_URL || "";
const CHAIN_ID = Number(process.env.CHAIN_ID || "31337");
const PRIVATE_KEY = process.env.PRIVATE_KEY || "";

const config: HardhatUserConfig = {
  solidity: { version: "0.8.20", settings: { optimizer: { enabled: true, runs: 200 } } },
  defaultNetwork: "hardhat",
  networks: {
    hardhat: { chainId: 31337 },
    ...(RPC_URL && PRIVATE_KEY
      ? { didlab: { url: RPC_URL, chainId: CHAIN_ID, accounts: [PRIVATE_KEY] } }
      : {}),
  },
};

export default config;
