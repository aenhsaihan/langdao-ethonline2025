"use client";

import { useEffect, useState } from "react";
import { createWalletClient, http } from "viem";
import { hardhat } from "viem/chains";
import { useAccount } from "wagmi";
import { BanknotesIcon } from "@heroicons/react/24/outline";

const localWalletClient = createWalletClient({
  chain: hardhat,
  transport: http(),
});

/**
 * MockTokenFaucet component which lets you send mock tokens to any address.
 */
export const MockTokenFaucet = () => {
  const [loading, setLoading] = useState(false);

  const { chain: ConnectedChain } = useAccount();

  // Render only on local chain
  if (ConnectedChain?.id !== hardhat.id) {
    return null;
  }

  return (
    <div>
      <label htmlFor="mock-token-faucet" className="btn btn-primary btn-sm font-normal gap-1">
        <BanknotesIcon className="h-4 w-4" />
        <span>Mock Token Faucet</span>
      </label>
    </div>
  );
};
