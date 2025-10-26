import { defineChain } from "thirdweb";
import { sepolia } from "thirdweb/chains";

// Local Hardhat chain configuration
export const hardhatChain = defineChain({
  id: 31337,
  name: "Hardhat Local",
  nativeCurrency: {
    name: "Ether",
    symbol: "ETH",
    decimals: 18,
  },
  rpc: "http://127.0.0.1:8545",
  blockExplorers: [
    {
      name: "Local Explorer",
      url: "http://localhost:3000/blockexplorer", // Your scaffold-eth block explorer
    },
  ],
});

// Export the chain to use in your app - using Sepolia for now
export const activeChain = sepolia;