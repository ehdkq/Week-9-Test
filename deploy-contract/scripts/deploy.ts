import "dotenv/config";
import { artifacts } from "hardhat";
import { createWalletClient, createPublicClient, http, getAddress } from "viem";
import { privateKeyToAccount } from "viem/accounts";

// Environment variables
const RPC_URL = process.env.RPC_URL!;
const CHAIN_ID = Number(process.env.CHAIN_ID!);
const PRIVATE_KEY = (process.env.PRIVKEY || "").replace(/^0x/, "");
const DIDLAB_SIGNER_PRIVATE_KEY = (process.env.DIDLAB_SIGNER_PRIVKEY || "").replace(/^0x/, ""); // <-- ADDED

// Check for missing environment variables
if (!RPC_URL || !CHAIN_ID || !PRIVATE_KEY || !DIDLAB_SIGNER_PRIVATE_KEY) { // <-- UPDATED
  console.error('Missing the following environment variables:');
  if (!RPC_URL) console.error('  RPC_URL');
  if (!CHAIN_ID) console.error('  CHAIN_ID');
  if (!PRIVATE_KEY) console.error('  PRIVKEY');
  if (!DIDLAB_SIGNER_PRIVATE_KEY) console.error('  DIDLAB_SIGNER_PRIVKEY'); // <-- ADDED
  throw new Error("Missing env vars");
}

async function main() {
  // Load the compiled contract
  const { abi, bytecode } = await artifacts.readArtifact("SupplyChain"); // <-- UPDATED contract name
  const validBytecode = bytecode as `0x${string}`;

  // Define the blockchain network
  const chain = {
    id: CHAIN_ID,
    name: `didlab-${CHAIN_ID}`,
    nativeCurrency: { name: "ETH", symbol: "ETH", decimals: 18 },
    rpcUrls: { default: { http: [RPC_URL] } },
  } as const;

  // Create account from private key
  const deployerAccount = privateKeyToAccount(`0x${PRIVATE_KEY}`); // <-- Renamed for clarity
  const didlabSignerAccount = privateKeyToAccount(`0x${DIDLAB_SIGNER_PRIVATE_KEY}`); // <-- ADDED

  // --- CHECK: Ensure deployer and signer are different ---
  if (deployerAccount.address === didlabSignerAccount.address) {
    throw new Error("PRIVKEY and DIDLAB_SIGNER_PRIVKEY must be for different accounts!");
  }

  // Create wallet and public clients
  const wallet = createWalletClient({ 
    account: deployerAccount, // <-- UPDATED to use deployer
    chain, 
    transport: http(RPC_URL) 
  });

  const publicClient = createPublicClient({ 
    chain, 
    transport: http(RPC_URL) 
  });

  console.log("═══════════════════════════════════════════════");
  console.log("Deploying SupplyChain Contract"); // <-- UPDATED
  console.log("═══════════════════════════════════════════════");
  console.log(`Network: ${chain.name} (Chain ID: ${CHAIN_ID})`);
  console.log(`Deployer: ${deployerAccount.address}`); // <-- UPDATED
  console.log(`Didlab Signer: ${didlabSignerAccount.address}`); // <-- ADDED
  console.log(`RPC: ${RPC_URL}`);
  console.log("───────────────────────────────────────────────");

  const didlabSignerAddress = didlabSignerAccount.address as `0x${string}`; // <-- ADDED

  // Deploy the contract
  const hash = await wallet.deployContract({
    abi,
    bytecode: validBytecode,
    args: [didlabSignerAddress], // <-- CRITICAL: Pass signer address to constructor
    gasPrice: 20_000_000_000n, // 20 gwei
  });

  console.log(`✓ Deploy transaction sent: ${hash}`);
  console.log("  Waiting for confirmation...");

  // Wait for the transaction to be mined
  const rcpt = await publicClient.waitForTransactionReceipt({ hash });

  console.log("───────────────────────────────────────────────");
  console.log("✓ Contract deployed successfully!");
  console.log("═══════════════════════════════════════════════");
  console.log(`Contract Address: ${rcpt.contractAddress}`);
  console.log(`Didlab Signer: ${didlabSignerAddress}`);
  console.log(`Block Number: ${rcpt.blockNumber}`);
  console.log(`Gas Used: ${rcpt.gasUsed}`);
  console.log("═══════════════════════════════════════════════");
  console.log("\nAdd this to your .env file for your DApp:");
  console.log(`SUPPLY_CHAIN_CONTRACT_ADDRESS=${rcpt.contractAddress}`); // <-- UPDATED
  console.log("═══════════════════════════════════════════════\n");
}

main().catch((e) => {
  console.error("\n❌ Deployment failed:");
  console.error(e);
  process.exit(1);
});