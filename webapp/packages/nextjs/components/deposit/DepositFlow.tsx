"use client";

import { useState } from "react";
import { useAccount } from "wagmi";
import { parseUnits, formatUnits } from "viem";
import toast from "react-hot-toast";
import { DepositSlider } from "./DepositSlider";

import { CONTRACTS, PYUSD_DECIMALS } from "../../lib/constants/contracts";
import { useScaffoldReadContract, useScaffoldWriteContract } from "~~/hooks/scaffold-eth";

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

  // Get MockERC20 token balance (PYUSD)
  const {
    data: tokenBalance,
    isLoading: isTokenBalanceLoading
  } = useScaffoldReadContract({
    contractName: "MockERC20",
    functionName: "balanceOf",
    args: [address],
  });

  // Get current allowance for LangDAO contract
  const {
    data: allowance,
    isLoading: isAllowanceLoading
  } = useScaffoldReadContract({
    contractName: "MockERC20",
    functionName: "allowance",
    args: [address, CONTRACTS.LANGDAO],
  });

  // Get student's current balance in LangDAO contract
  const {
    data: contractBalance,
    isLoading: isContractBalanceLoading,
    error: contractBalanceError
  } = useScaffoldReadContract({
    contractName: "LangDAO",
    functionName: "studentBalances",
    args: [address, CONTRACTS.PYUSD], // MockERC20 address
  });

  // Debug: Check if user is registered as student
  const {
    data: studentInfo,
    isLoading: isStudentInfoLoading
  } = useScaffoldReadContract({
    contractName: "LangDAO",
    functionName: "getStudentInfo",
    args: [address],
  });

  const { writeContractAsync: writeApproval } = useScaffoldWriteContract({
    contractName: "MockERC20",
  });

  const { writeContractAsync: writeDeposit } = useScaffoldWriteContract({
    contractName: "LangDAO",
  });

  const balance = tokenBalance ? parseFloat(formatUnits(tokenBalance, PYUSD_DECIMALS)) : 0;
  const currentAllowance = allowance ? parseFloat(formatUnits(allowance, PYUSD_DECIMALS)) : 0;
  const currentContractBalance = contractBalance ? parseFloat(formatUnits(contractBalance, PYUSD_DECIMALS)) : 0;

  const isLoadingBalances = isTokenBalanceLoading || isContractBalanceLoading;
  const isStudentRegistered = studentInfo ? studentInfo[2] : false; // isRegistered is the 3rd element

  // Debug logging
  console.log("Debug - Contract Balance:", contractBalance);
  console.log("Debug - Contract Balance Error:", contractBalanceError);
  console.log("Debug - Student Info:", studentInfo);
  console.log("Debug - Is Student Registered:", isStudentRegistered);
  console.log("Debug - PYUSD Address:", CONTRACTS.PYUSD);
  console.log("Debug - LangDAO Address:", CONTRACTS.LANGDAO);



  const handleInitialDeposit = () => {
    if (depositAmount <= 0) {
      toast.error("Please select an amount to deposit");
      return;
    }
    if (depositAmount > balance) {
      toast.error("Insufficient balance");
      return;
    }

    // Check if we need approval
    if (currentAllowance < depositAmount) {
      setStep("approval");
    } else {
      setStep("deposit");
    }
  };

  const handleApproval = async () => {
    if (!address) {
      toast.error("Please connect your wallet");
      return;
    }

    setIsApproving(true);

    try {
      const depositAmountWei = parseUnits(depositAmount.toString(), PYUSD_DECIMALS);

      await writeApproval({
        functionName: "approve",
        args: [CONTRACTS.LANGDAO, depositAmountWei],
      });

      toast.success("Approval successful!");
      setStep("deposit");
    } catch (err) {
      console.error("Approval error:", err);
      toast.error("Approval failed. Please try again.");
    } finally {
      setIsApproving(false);
    }
  };

  const handleDeposit = async () => {
    if (!address) {
      toast.error("Please connect your wallet");
      return;
    }

    setIsDepositing(true);

    try {
      const depositAmountWei = parseUnits(depositAmount.toString(), PYUSD_DECIMALS);

      await writeDeposit({
        functionName: "depositFunds",
        args: [depositAmountWei],
      });

      toast.success("Deposit successful!");
      onComplete();
    } catch (err) {
      console.error("Deposit error:", err);
      toast.error("Deposit failed. Please try again.");
    } finally {
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
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium text-blue-700 dark:text-blue-300">
                      Wallet Balance
                    </span>
                    {isTokenBalanceLoading ? (
                      <div className="flex items-center">
                        <div className="w-4 h-4 border-2 border-blue-500 border-t-transparent rounded-full animate-spin mr-2"></div>
                        <span className="text-sm text-blue-700 dark:text-blue-300">Loading...</span>
                      </div>
                    ) : (
                      <span className="text-lg font-bold text-blue-900 dark:text-blue-100">
                        {balance.toFixed(4)} PYUSD
                      </span>
                    )}
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium text-blue-700 dark:text-blue-300">
                      LangDAO Balance
                    </span>
                    {isContractBalanceLoading ? (
                      <div className="flex items-center">
                        <div className="w-4 h-4 border-2 border-blue-500 border-t-transparent rounded-full animate-spin mr-2"></div>
                        <span className="text-sm text-blue-700 dark:text-blue-300">Loading...</span>
                      </div>
                    ) : (
                      <span className="text-lg font-bold text-blue-900 dark:text-blue-100">
                        {currentContractBalance.toFixed(4)} PYUSD
                      </span>
                    )}
                  </div>
                </div>
              </div>

              {!isStudentInfoLoading && !isStudentRegistered && (
                <div className="bg-yellow-50 dark:bg-yellow-900/20 rounded-xl p-4 mb-6">
                  <div className="flex items-center">
                    <span className="text-yellow-600 dark:text-yellow-400 mr-2">⚠️</span>
                    <span className="text-sm text-yellow-700 dark:text-yellow-300">
                      You need to register as a student first to deposit funds.
                    </span>
                  </div>
                </div>
              )}

              {contractBalanceError && (
                <div className="bg-red-50 dark:bg-red-900/20 rounded-xl p-4 mb-6">
                  <div className="flex items-center">
                    <span className="text-red-600 dark:text-red-400 mr-2">❌</span>
                    <span className="text-sm text-red-700 dark:text-red-300">
                      Error reading LangDAO balance. Please try refreshing.
                    </span>
                  </div>
                </div>
              )}

              {!isTokenBalanceLoading && balance === 0 && (
                <div className="bg-orange-50 dark:bg-orange-900/20 rounded-xl p-4 mb-6">
                  <div className="flex items-center">
                    <span className="text-orange-600 dark:text-orange-400 mr-2">💡</span>
                    <span className="text-sm text-orange-700 dark:text-orange-300">
                      You don't have any PYUSD tokens. Use the Mock Token Faucet to get some test tokens first.
                    </span>
                  </div>
                </div>
              )}

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
                disabled={depositAmount <= 0 || depositAmount > balance || !isStudentRegistered || isLoadingBalances}
                className="flex-1 px-6 py-3 bg-gradient-to-r from-green-500 to-green-600 text-white rounded-xl font-medium hover:shadow-lg transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isLoadingBalances ? (
                  <div className="flex items-center justify-center">
                    <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin mr-2"></div>
                    Loading...
                  </div>
                ) : !isStudentRegistered ? (
                  "Register as Student First"
                ) : (
                  "Continue to Deposit"
                )}
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (step === "approval") {
    return (
      <div className="min-h-[calc(100vh-8rem)] bg-gray-50 dark:bg-gray-900 flex items-center justify-center p-4">
        <div className="max-w-2xl w-full">
          <div className="bg-white dark:bg-gray-800 rounded-3xl p-8 border-2 border-gray-200 dark:border-gray-700">
            <div className="text-center mb-8">
              <div className="w-16 h-16 mx-auto bg-gradient-to-br from-yellow-400 to-yellow-600 rounded-2xl flex items-center justify-center mb-4">
                <span className="text-2xl">🔐</span>
              </div>
              <h2 className="text-3xl font-bold text-gray-900 dark:text-white mb-2">
                Approve Token Access
              </h2>
              <p className="text-gray-600 dark:text-gray-300">
                Allow LangDAO to access your PYUSD tokens
              </p>
            </div>

            <div className="bg-yellow-50 dark:bg-yellow-900/20 rounded-xl p-6 mb-8">
              <div className="text-center space-y-4">
                <div className="text-2xl font-bold text-gray-900 dark:text-white">
                  {depositAmount.toFixed(2)} PYUSD
                </div>
                <p className="text-sm text-gray-600 dark:text-gray-300">
                  You need to approve LangDAO to spend this amount of PYUSD tokens on your behalf.
                </p>
              </div>
            </div>

            <div className="flex flex-col sm:flex-row gap-4">
              <button
                onClick={() => setStep("initial")}
                className="flex-1 px-6 py-3 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 rounded-xl font-medium hover:bg-gray-50 dark:hover:bg-gray-700 transition-all duration-200"
              >
                Back
              </button>
              <button
                onClick={handleApproval}
                disabled={isApproving}
                className="flex-1 px-6 py-3 bg-gradient-to-r from-yellow-500 to-yellow-600 text-white rounded-xl font-medium hover:shadow-lg transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isApproving ? (
                  <div className="flex items-center justify-center">
                    <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin mr-2"></div>
                    Approving...
                  </div>
                ) : (
                  "Approve PYUSD"
                )}
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

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
                onClick={() => setStep(currentAllowance < depositAmount ? "approval" : "initial")}
                className="flex-1 px-6 py-3 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 rounded-xl font-medium hover:bg-gray-50 dark:hover:bg-gray-700 transition-all duration-200"
              >
                Back
              </button>
              <button
                onClick={handleDeposit}
                disabled={isDepositing}
                className="flex-1 px-6 py-3 bg-gradient-to-r from-green-500 to-green-600 text-white rounded-xl font-medium hover:shadow-lg transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isDepositing ? (
                  <div className="flex items-center justify-center">
                    <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin mr-2"></div>
                    Depositing...
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