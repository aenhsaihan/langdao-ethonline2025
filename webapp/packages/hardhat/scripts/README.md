# Hardhat Scripts

This directory contains various utility scripts for the Hardhat project.

## Mock ERC20 Token Funding Script

The `fundWithMockERC20.ts` script allows you to fund any account with mock ERC20 tokens on the Hardhat network.

### Prerequisites

1. Make sure you have a local Hardhat network running:

   ```bash
   yarn chain
   ```

2. Deploy the contracts (optional, the script can deploy MockERC20 automatically):
   ```bash
   yarn deploy
   ```

### Usage

#### Basic Usage (Environment Variables - Recommended)

```bash
# Fund an account with 1000 default mock tokens
FUND_RECIPIENT=0x1234567890123456789012345678901234567890 FUND_AMOUNT=1000 yarn fund
```

#### Advanced Usage (Environment Variables)

```bash
# Fund with custom token name and symbol
FUND_RECIPIENT=0x1234567890123456789012345678901234567890 FUND_AMOUNT=1000 FUND_TOKEN_NAME="TestToken" FUND_TOKEN_SYMBOL="TEST" yarn fund

# Fund using an existing token
FUND_RECIPIENT=0x1234567890123456789012345678901234567890 FUND_AMOUNT=1000 FUND_TOKEN_ADDRESS=0x4567890123456789012345678901234567890123 yarn fund
```

#### Command Line Arguments (Fallback)

```bash
# Basic usage
yarn fund -- --recipient 0x1234567890123456789012345678901234567890 --amount 1000

# Advanced usage
yarn fund -- --recipient 0x1234567890123456789012345678901234567890 --amount 1000 --token-name "TestToken" --token-symbol "TEST"

# Short form
yarn fund -- -r 0x1234567890123456789012345678901234567890 -a 1000
```

#### Help

```bash
yarn fund -- --help
```

> **Recommended**: Use environment variables as they work reliably with Hardhat. Command line arguments are available as a fallback.

### Arguments

| Environment Variable | Command Line      | Short | Required | Description                               |
| -------------------- | ----------------- | ----- | -------- | ----------------------------------------- |
| `FUND_RECIPIENT`     | `--recipient`     | `-r`  | Yes      | Recipient address to fund                 |
| `FUND_AMOUNT`        | `--amount`        | `-a`  | Yes      | Amount of tokens to send                  |
| `FUND_TOKEN_NAME`    | `--token-name`    | `-n`  | No       | Name for new token (default: "MockToken") |
| `FUND_TOKEN_SYMBOL`  | `--token-symbol`  | `-s`  | No       | Symbol for new token (default: "MOCK")    |
| `FUND_TOKEN_ADDRESS` | `--token-address` | `-t`  | No       | Use existing token at this address        |
| -                    | `--help`          | `-h`  | No       | Show help message                         |

### Features

- ✅ Automatically deploys MockERC20 token if needed
- ✅ Validates recipient address format
- ✅ Checks and mints additional tokens if needed
- ✅ Shows detailed transaction information
- ✅ Displays final balances for both accounts
- ✅ Provides comprehensive token information
- ✅ Supports both new and existing tokens

### Example Output

```
🚀 Starting mock ERC20 funding process...
📋 Recipient: 0x1234567890123456789012345678901234567890
💰 Amount: 1000 tokens
🪙 Deploying new token: MockToken (MOCK)
✅ Token deployed at: 0x4567890123456789012345678901234567890123
📊 Deployer token balance: 1000000.0 tokens
💸 Transferring 1000 tokens to 0x1234567890123456789012345678901234567890...
✅ Transfer successful!
📋 Transaction hash: 0x7890123456789012345678901234567890123456789012345678901234567890

📊 Final balances:
   Recipient (0x1234567890123456789012345678901234567890): 1000.0 tokens
   Deployer: 999000.0 tokens

🪙 Token Information:
   Name: MockToken
   Symbol: MOCK
   Decimals: 18
   Address: 0x4567890123456789012345678901234567890123
```

### Troubleshooting

1. **"Invalid recipient address"**: Make sure the address is a valid Ethereum address format
2. **"Invalid amount"**: Ensure the amount is a positive number
3. **Network errors**: Make sure the Hardhat network is running (`yarn chain`)
4. **Deployment errors**: Check that you have sufficient ETH for gas fees

### Integration with Other Scripts

This script works well with other Hardhat scripts:

```bash
# Generate a new account
yarn account:generate

# List all accounts
yarn account

# Fund the new account (using environment variables)
FUND_RECIPIENT=<new-account-address> FUND_AMOUNT=1000 yarn fund

# Or using command line arguments
yarn fund -- --recipient <new-account-address> --amount 1000
```
