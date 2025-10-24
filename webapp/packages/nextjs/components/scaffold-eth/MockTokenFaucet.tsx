"use client";

import { useEffect, useState } from "react";
import { Address as AddressType, createWalletClient, http, parseEther } from "viem";
import { hardhat } from "viem/chains";
import { useAccount } from "wagmi";
import { BanknotesIcon } from "@heroicons/react/24/outline";
import { Address, AddressInput } from "~~/components/scaffold-eth";
import { useDeployedContractInfo, useScaffoldReadContract, useScaffoldWriteContract } from "~~/hooks/scaffold-eth";

const localWalletClient = createWalletClient({
  chain: hardhat,
  transport: http(),
});

/**
 * MockTokenFaucet component which lets you send mock tokens to any address.
 */
export const MockTokenFaucet = () => {
  const [loading, setLoading] = useState(false);
  const [inputAddress, setInputAddress] = useState<AddressType>();

  const { data: deployedContractData } = useDeployedContractInfo({
    contractName: "MockERC20",
  });

  const { data: totalSupply } = useScaffoldReadContract({
    contractName: "MockERC20",
    functionName: "totalSupply",
  });

  const { data: balance } = useScaffoldReadContract({
    contractName: "MockERC20",
    functionName: "balanceOf",
    args: [inputAddress],
  });

  const { writeContractAsync: writeContractAsync } = useScaffoldWriteContract({
    contractName: "MockERC20",
  });

  const { chain: ConnectedChain } = useAccount();

  useEffect(() => {
    const getMockTokenAddress = async () => {
      try {
      } catch (error) {
        console.error("⚡️ ~ file: MockTokenFaucet.tsx:getMockTokenAddress ~ error", error);
      }
    };
  });

  const mintMockTokens = async () => {
    if (!inputAddress) {
      return;
    }
    try {
      setLoading(true);
      await writeContractAsync({
        functionName: "mint",
        args: [inputAddress, parseEther("1000000")],
      });
      setLoading(false);
      setInputAddress(undefined);
    } catch (error) {
      console.error("⚡️ ~ file: MockTokenFaucet.tsx:mintMockTokens ~ error", error);
      setLoading(false);
    }
  };

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
      <input type="checkbox" id="mock-token-faucet" className="modal-toggle" />
      <label htmlFor="mock-token-faucet" className="modal cursor-pointer">
        <label className="modal-box relative">
          {/* dummy input to capture event onclick on modal box */}
          <input className="h-0 w-0 absolute top-0 left-0" />
          <h3 className="text-xl font-bold mb-3">Mock Token Faucet</h3>
          <label htmlFor="mock-token-faucet" className="btn btn-ghost btn-sm btn-circle absolute right-3 top-3">
            ✕
          </label>
          <div className="space-y-3">
            <div className="flex space-x-4">
              <div>
                <span className="text-sm font-bold">From:</span>
                <Address address={deployedContractData?.address} onlyEnsOrAddress />
              </div>
              <div>
                <span className="text-sm font-bold pl-3">Total Supply:</span>
                <span>{totalSupply?.toString()}</span>
              </div>
            </div>
            <div className="flex space-x-4">
              <div>
                <span className="text-sm font-bold pl-3">Token balance:</span>
                <span>{balance?.toString()}</span>
              </div>
            </div>
            <div className="flex flex-col space-y-3">
              <AddressInput
                placeHolder="Destination Address"
                value={inputAddress ?? ""}
                onChange={value => setInputAddress(value as AddressType)}
              />
              <button
                className="h-10 btn btn-primary btn-sm px-2 rounded-full"
                onClick={mintMockTokens}
                disabled={loading}
              >
                {!loading ? (
                  <BanknotesIcon className="h-6 w-6" />
                ) : (
                  <span className="loading loading-spinner loading-sm"></span>
                )}
                <span>Send</span>
              </button>
            </div>
          </div>
        </label>
      </label>
    </div>
  );
};
