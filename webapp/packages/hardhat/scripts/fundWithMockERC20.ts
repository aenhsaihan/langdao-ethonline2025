import { HardhatRuntimeEnvironment } from "hardhat/types";
import { ethers } from "ethers";
import * as dotenv from "dotenv";

// Load environment variables
dotenv.config();

interface FundOptions {
  recipient: string;
  amount: string;
  tokenName?: string;
  tokenSymbol?: string;
  tokenAddress?: string;
}

/**
 * CLI script to fund any account with mock ERC20 tokens on Hardhat network
 *
 * Usage examples:
 * - Fund with default token: FUND_RECIPIENT=0x123... FUND_AMOUNT=1000 yarn fund
 * - Fund with custom token: FUND_RECIPIENT=0x123... FUND_AMOUNT=1000 FUND_TOKEN_NAME="TestToken" FUND_TOKEN_SYMBOL="TEST" yarn fund
 * - Fund existing token: FUND_RECIPIENT=0x123... FUND_AMOUNT=1000 FUND_TOKEN_ADDRESS=0x456... yarn fund
 */
async function main() {
  const hre = require("hardhat") as HardhatRuntimeEnvironment;

  // Get options from environment variables or command line arguments
  const options = getOptionsFromEnvOrArgs();

  if (!options.recipient || !options.amount) {
    console.log("❌ Missing required arguments!");
    printUsage();
    process.exit(1);
  }

  // Validate recipient address
  if (!ethers.isAddress(options.recipient)) {
    console.log("❌ Invalid recipient address!");
    process.exit(1);
  }

  // Validate amount
  const amount = parseFloat(options.amount);
  if (isNaN(amount) || amount <= 0) {
    console.log("❌ Invalid amount! Must be a positive number.");
    process.exit(1);
  }

  console.log("🚀 Starting mock ERC20 funding process...");
  console.log(`📋 Recipient: ${options.recipient}`);
  console.log(`💰 Amount: ${options.amount} tokens`);

  try {
    const { deployer } = await hre.getNamedAccounts();
    const { deploy } = hre.deployments;

    let tokenAddress: string;
    let tokenContract: ethers.Contract;

    if (options.tokenAddress) {
      // Use existing token
      tokenAddress = options.tokenAddress;
      console.log(`🔗 Using existing token at: ${tokenAddress}`);
      tokenContract = await hre.ethers.getContractAt("MockERC20", tokenAddress);
    } else {
      // Deploy new token or use default
      const tokenName = options.tokenName || "MockToken";
      const tokenSymbol = options.tokenSymbol || "MOCK";
      const initialSupply = ethers.parseEther("1000000"); // 1M tokens

      console.log(`🪙 Deploying new token: ${tokenName} (${tokenSymbol})`);

      const deployment = await deploy("MockERC20", {
        from: deployer,
        args: [tokenName, tokenSymbol, initialSupply],
        log: true,
        autoMine: true,
      });

      tokenAddress = deployment.address;
      tokenContract = await hre.ethers.getContractAt("MockERC20", tokenAddress);

      console.log(`✅ Token deployed at: ${tokenAddress}`);
    }

    // Convert amount to wei (assuming 18 decimals)
    const amountWei = ethers.parseEther(options.amount);

    // Check if deployer has enough tokens
    const deployerBalance = await tokenContract.balanceOf(deployer);
    console.log(`📊 Deployer token balance: ${ethers.formatEther(deployerBalance)} tokens`);

    if (deployerBalance < amountWei) {
      console.log("⚠️ Deployer doesn't have enough tokens. Minting more...");
      const mintTx = await tokenContract.mint(deployer, amountWei);
      await mintTx.wait();
      console.log("✅ Minted additional tokens to deployer");
    }

    // Transfer tokens to recipient
    console.log(`💸 Transferring ${options.amount} tokens to ${options.recipient}...`);
    const transferTx = await tokenContract.transfer(options.recipient, amountWei);
    const receipt = await transferTx.wait();

    console.log("✅ Transfer successful!");
    console.log(`📋 Transaction hash: ${receipt?.hash}`);

    // Check final balances
    const recipientBalance = await tokenContract.balanceOf(options.recipient);
    const finalDeployerBalance = await tokenContract.balanceOf(deployer);

    console.log("\n📊 Final balances:");
    console.log(`   Recipient (${options.recipient}): ${ethers.formatEther(recipientBalance)} tokens`);
    console.log(`   Deployer: ${ethers.formatEther(finalDeployerBalance)} tokens`);

    // Get token info
    const tokenName = await tokenContract.name();
    const tokenSymbol = await tokenContract.symbol();
    const decimals = await tokenContract.decimals();

    console.log("\n🪙 Token Information:");
    console.log(`   Name: ${tokenName}`);
    console.log(`   Symbol: ${tokenSymbol}`);
    console.log(`   Decimals: ${decimals}`);
    console.log(`   Address: ${tokenAddress}`);
  } catch (error) {
    console.error("❌ Error during funding process:", error);
    process.exit(1);
  }
}

function getOptionsFromEnvOrArgs(): FundOptions {
  // First try environment variables
  const options: FundOptions = {
    recipient: process.env.FUND_RECIPIENT || "",
    amount: process.env.FUND_AMOUNT || "",
    tokenName: process.env.FUND_TOKEN_NAME,
    tokenSymbol: process.env.FUND_TOKEN_SYMBOL,
    tokenAddress: process.env.FUND_TOKEN_ADDRESS,
  };

  // If no env vars, try to parse command line arguments (fallback)
  if (!options.recipient || !options.amount) {
    const args = process.argv.slice(2);
    for (let i = 0; i < args.length; i++) {
      switch (args[i]) {
        case "--recipient":
        case "-r":
          options.recipient = args[++i];
          break;
        case "--amount":
        case "-a":
          options.amount = args[++i];
          break;
        case "--token-name":
        case "-n":
          options.tokenName = args[++i];
          break;
        case "--token-symbol":
        case "-s":
          options.tokenSymbol = args[++i];
          break;
        case "--token-address":
        case "-t":
          options.tokenAddress = args[++i];
          break;
        case "--help":
        case "-h":
          printUsage();
          process.exit(0);
          break;
      }
    }
  }

  return options;
}

function printUsage() {
  console.log(`
🪙 Mock ERC20 Token Funding Script

Usage (Environment Variables - Recommended):
  FUND_RECIPIENT=<address> FUND_AMOUNT=<number> yarn fund

Usage (Command Line Arguments - Fallback):
  yarn fund -- --recipient <address> --amount <number> [options]

Required Arguments:
  FUND_RECIPIENT or --recipient, -r    Recipient address to fund
  FUND_AMOUNT or --amount, -a          Amount of tokens to send

Optional Arguments:
  FUND_TOKEN_NAME or --token-name, -n       Name for new token (default: "MockToken")
  FUND_TOKEN_SYMBOL or --token-symbol, -s   Symbol for new token (default: "MOCK")
  FUND_TOKEN_ADDRESS or --token-address, -t Use existing token at this address
  --help, -h                               Show this help message

Examples:
  # Fund with default token (Environment Variables)
  FUND_RECIPIENT=0x1234567890123456789012345678901234567890 FUND_AMOUNT=1000 yarn fund

  # Fund with custom token (Environment Variables)
  FUND_RECIPIENT=0x1234567890123456789012345678901234567890 FUND_AMOUNT=1000 FUND_TOKEN_NAME="TestToken" FUND_TOKEN_SYMBOL="TEST" yarn fund

  # Fund using existing token (Environment Variables)
  FUND_RECIPIENT=0x1234567890123456789012345678901234567890 FUND_AMOUNT=1000 FUND_TOKEN_ADDRESS=0x4567890123456789012345678901234567890123 yarn fund

  # Command line fallback (if env vars not set)
  yarn fund -- --recipient 0x1234567890123456789012345678901234567890 --amount 1000

Note: Environment variables are the recommended approach as they work reliably with Hardhat!
`);
}

// Run the script
main().catch(error => {
  console.error(error);
  process.exitCode = 1;
});
