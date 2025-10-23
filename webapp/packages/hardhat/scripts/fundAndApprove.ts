import { HardhatRuntimeEnvironment } from "hardhat/types";
import { ethers } from "ethers";
import * as dotenv from "dotenv";

// Load environment variables
dotenv.config();

interface FundAndApproveOptions {
  recipient: string;
  amount: string;
  tokenAddress?: string;
  contractAddress?: string;
}

/**
 * Script to fund an account with mock ERC20 tokens AND approve the LangDAO contract to spend them
 * This solves the common issue where users have tokens but haven't approved the contract
 *
 * Usage:
 * FUND_RECIPIENT=<address> FUND_AMOUNT=<amount> [FUND_TOKEN_ADDRESS=<token>] [FUND_CONTRACT_ADDRESS=<contract>] yarn fund-and-approve
 */
async function main() {
  const hre = require("hardhat") as HardhatRuntimeEnvironment;

  // Get options from environment variables
  const options = getOptionsFromEnv();

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

  console.log("🚀 Starting fund and approve process...");
  console.log(`📋 Recipient: ${options.recipient}`);
  console.log(`💰 Amount: ${options.amount} tokens`);

  try {
    const { deployer } = await hre.getNamedAccounts();
    const { deploy } = hre.deployments;

    // Get or deploy MockERC20 token
    let tokenAddress: string;
    let tokenContract: ethers.Contract;

    if (options.tokenAddress) {
      tokenAddress = options.tokenAddress;
      console.log(`🔗 Using existing token at: ${tokenAddress}`);
      tokenContract = await hre.ethers.getContractAt("MockERC20", tokenAddress);
    } else {
      // Deploy new token
      const tokenName = "MockToken";
      const tokenSymbol = "MOCK";
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

    // Get LangDAO contract address
    let contractAddress: string;
    if (options.contractAddress) {
      contractAddress = options.contractAddress;
    } else {
      // Try to get deployed LangDAO contract
      try {
        const langDAODeployment = await hre.deployments.get("LangDAO");
        contractAddress = langDAODeployment.address;
        console.log(`📋 Using LangDAO contract at: ${contractAddress}`);
      } catch (error) {
        console.log("❌ LangDAO contract not found. Please deploy it first or specify FUND_CONTRACT_ADDRESS");
        process.exit(1);
      }
    }

    // Convert amount to wei
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
    await transferTx.wait();
    console.log("✅ Transfer successful!");

    // Approve the LangDAO contract to spend tokens on behalf of recipient
    console.log(`🔐 Approving LangDAO contract to spend ${options.amount} tokens...`);

    // We need to impersonate the recipient to approve on their behalf
    await hre.network.provider.request({
      method: "hardhat_impersonateAccount",
      params: [options.recipient],
    });

    const recipientSigner = await hre.ethers.getSigner(options.recipient);
    const tokenContractWithRecipient = tokenContract.connect(recipientSigner);

    const approveTx = await tokenContractWithRecipient.approve(contractAddress, amountWei);
    await approveTx.wait();
    console.log("✅ Approval successful!");

    // Stop impersonating
    await hre.network.provider.request({
      method: "hardhat_stopImpersonatingAccount",
      params: [options.recipient],
    });

    // Check final balances and allowances
    const recipientBalance = await tokenContract.balanceOf(options.recipient);
    const allowance = await tokenContract.allowance(options.recipient, contractAddress);

    console.log("\n📊 Final Status:");
    console.log(`   Recipient balance: ${ethers.formatEther(recipientBalance)} tokens`);
    console.log(`   LangDAO allowance: ${ethers.formatEther(allowance)} tokens`);
    console.log(`   Token address: ${tokenAddress}`);
    console.log(`   LangDAO address: ${contractAddress}`);

    console.log("\n✅ Setup complete! The recipient can now call depositFunds() successfully.");
  } catch (error) {
    console.error("❌ Error during fund and approve process:", error);
    process.exit(1);
  }
}

function getOptionsFromEnv(): FundAndApproveOptions {
  return {
    recipient: process.env.FUND_RECIPIENT || "",
    amount: process.env.FUND_AMOUNT || "",
    tokenAddress: process.env.FUND_TOKEN_ADDRESS,
    contractAddress: process.env.FUND_CONTRACT_ADDRESS,
  };
}

function printUsage() {
  console.log(`
🪙 Mock ERC20 Token Fund and Approve Script

This script funds an account with tokens AND approves the LangDAO contract to spend them.
This solves the common issue where users have tokens but haven't approved the contract.

Usage:
  FUND_RECIPIENT=<address> FUND_AMOUNT=<amount> [options] yarn fund-and-approve

Required Environment Variables:
  FUND_RECIPIENT    Recipient address to fund
  FUND_AMOUNT       Amount of tokens to send

Optional Environment Variables:
  FUND_TOKEN_ADDRESS      Use existing token at this address (default: deploy new)
  FUND_CONTRACT_ADDRESS   LangDAO contract address (default: auto-detect)

Examples:
  # Basic usage - fund and approve for LangDAO
  FUND_RECIPIENT=0x1234567890123456789012345678901234567890 FUND_AMOUNT=1000 yarn fund-and-approve

  # Use existing token
  FUND_RECIPIENT=0x1234567890123456789012345678901234567890 FUND_AMOUNT=1000 FUND_TOKEN_ADDRESS=0x4567890123456789012345678901234567890123 yarn fund-and-approve

  # Specify LangDAO contract address
  FUND_RECIPIENT=0x1234567890123456789012345678901234567890 FUND_AMOUNT=1000 FUND_CONTRACT_ADDRESS=0x7890123456789012345678901234567890123456 yarn fund-and-approve
`);
}

// Run the script
main().catch(error => {
  console.error(error);
  process.exitCode = 1;
});
