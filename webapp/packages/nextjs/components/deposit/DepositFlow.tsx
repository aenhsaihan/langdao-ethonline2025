"use client";

import { useState, useEffect } from "react";
import { useAccount, useBalance, useWriteContract, useWaitForTransactionReceipt } from "wagmi";
import { parseUnits, formatUnits } from "viem";
import toast from "react-hot-toast";
import { DepositSlider } from "./DepositSlider";

import { CONTRACTS } from "../../lib/constants/contracts";
import deployedContracts from "~~/contracts/deployedContracts";

interface DepositFlowProps {
  onComplete: () => void;
  onBack: () => void;
}

export const DepositFlow = ({ onComplete, onBack }: DepositFlowProps) => {
  const [step, setStep] = useState<"initial" | "approval" | "deposit">("initial");
  const [depositAmount, setDepositAmount] = useState<number>(0);
  const [isApproving, setIsApproving] = useState(false);
  const [isDepositing, setIsDepositing] = useState(false);

  const { address } = useAccount();
  
  // Get ETH balance (displayed as PYUSD for UI consistency)
  const { data: ethBalance } = useBalance({
    address,
  });

  const { writeContract: writeApproval, data: approvalHash, isPending: isApprovalPending } = useWriteContract();
  const { writeContract: writeDeposit, data: depositHash, isPending: isDepositPending } = useWriteContract();
  
  const { isLoading: isApprovalConfirming, isSuccess: isApprovalSuccess } = useWaitForTransactionReceipt({
    hash: approvalHash,
  });

  const { isLoading: isDepositConfirming, isSuccess: isDepositSuccess } = useWaitForTransactionReceipt({
    hash: depositHash,
  });

  const balance = ethBalance ? parseFloat(formatUnits(ethBalance.value, ethBalance.decimals)) : 0;

  // Handle deposit success
  useEffect(() => {
    if (isDepositSuccess) {
      toast.success("Deposit successful!");
      onComplete();
    }
  }, [isDepositSuccess, onComplete]);

  // Handle deposit success
  useEffect(() => {
    if (isDepositSuccess) {
      toast.success("Deposit successful!");
      onComplete();
    }
  }, [isDepositSuccess, onComplete]);

  const handleInitialDeposit = () => {
    if (depositAmount <= 0) {
      toast.error("Please select an amount to deposit");
      return;
    }
    if (depositAmount > balance) {
      toast.error("Insufficient balance");
      return;
    }
    // Skip to deposit (approval will be handled when contract supports ETH)
    setStep("deposit");
  };

  // Simplified deposit handling (for future ETH support)
  const handleApproval = async () => {
    setStep("deposit");
  };

  const handleDeposit = async () => {
    if (!address) {
      toast.error("Please connect your wallet");
      return;
    }

    setIsDepositing(true);
    
    try {
      // Placeholder for future ETH deposit implementation
      toast.error("Deposit functionality will be implemented when contract supports ETH");
      setIsDepositing(false);
    } catch (err) {
      console.error("Deposit error:", err);
      toast.error("Deposit failed. Please try again.");
      setIsDepositing(false);
    }
  };

  if (step === "initial") {
    return (
      <div className="min-h-[calc(100vh-8rem)] bg-gray-50 dark:bg-gray-900 flex items-center justify-center p-4">
        <div className="max-w-2xl w-full">
          <div className="bg-white dark:bg-gray-800 rounded-3xl p-8 border-2 border-gray-200 dark:border-gray-700">
            <div className="text-center mb-8">
              <div className="w-16 h-16 mx-auto bg-gradient-to-br from-green-400 to-green-600 rounded-2xl flex items-center justify-center mb-4">
                <span className="text-2xl">💰</span>
              </div>
              <h2 className="text-3xl font-bold text-gray-900 dark:text-white mb-2">
                Deposit PYUSD
              </h2>
              <p className="text-gray-600 dark:text-gray-300">
                Add funds to start learning with tutors
              </p>
            </div>

            <div className="mb-6">
              <div className="bg-blue-50 dark:bg-blue-900/20 rounded-xl p-4 mb-6">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium text-blue-700 dark:text-blue-300">
                    Your PYUSD Balance
                  </span>
                  <span className="text-lg font-bold text-blue-900 dark:text-blue-100">
                    {balance.toFixed(4)} PYUSD
                  </span>
                </div>
              </div>

              <DepositSlider
                balance={balance}
                value={depositAmount}
                onChange={setDepositAmount}
              />
            </div>

            <div className="flex flex-col sm:flex-row gap-4">
              <button
                onClick={onBack}
                className="flex-1 px-6 py-3 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 rounded-xl font-medium hover:bg-gray-50 dark:hover:bg-gray-700 transition-all duration-200"
              >
                Back
              </button>
              <button
                onClick={handleInitialDeposit}
                disabled={depositAmount <= 0 || depositAmount > balance}
                className="flex-1 px-6 py-3 bg-gradient-to-r from-green-500 to-green-600 text-white rounded-xl font-medium hover:shadow-lg transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Continue to Deposit
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Approval step removed for simplicity

  if (step === "deposit") {
    return (
      <div className="min-h-[calc(100vh-8rem)] bg-gray-50 dark:bg-gray-900 flex items-center justify-center p-4">
        <div className="max-w-2xl w-full">
          <div className="bg-white dark:bg-gray-800 rounded-3xl p-8 border-2 border-gray-200 dark:border-gray-700">
            <div className="text-center mb-8">
              <div className="w-16 h-16 mx-auto bg-gradient-to-br from-green-400 to-green-600 rounded-2xl flex items-center justify-center mb-4">
                <span className="text-2xl">💰</span>
              </div>
              <h2 className="text-3xl font-bold text-gray-900 dark:text-white mb-2">
                Complete Deposit
              </h2>
              <p className="text-gray-600 dark:text-gray-300">
                Finalize your PYUSD deposit to LangDAO
              </p>
            </div>

            <div className="bg-green-50 dark:bg-green-900/20 rounded-xl p-6 mb-8">
              <div className="text-center space-y-4">
                <div className="text-2xl font-bold text-gray-900 dark:text-white">
                  {depositAmount.toFixed(2)} PYUSD
                </div>
                <p className="text-sm text-gray-600 dark:text-gray-300">
                  This amount will be deposited to your LangDAO account and can be used for tutoring sessions.
                </p>
              </div>
            </div>

            <div className="flex flex-col sm:flex-row gap-4">
              <button
                onClick={() => setStep("approval")}
                className="flex-1 px-6 py-3 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 rounded-xl font-medium hover:bg-gray-50 dark:hover:bg-gray-700 transition-all duration-200"
              >
                Back
              </button>
              <button
                onClick={handleDeposit}
                disabled={isDepositPending || isDepositConfirming}
                className="flex-1 px-6 py-3 bg-gradient-to-r from-green-500 to-green-600 text-white rounded-xl font-medium hover:shadow-lg transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isDepositPending || isDepositConfirming ? (
                  <div className="flex items-center justify-center">
                    <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin mr-2"></div>
                    {isDepositPending ? "Depositing..." : "Confirming..."}
                  </div>
                ) : (
                  "Deposit PYUSD"
                )}
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return null;
};