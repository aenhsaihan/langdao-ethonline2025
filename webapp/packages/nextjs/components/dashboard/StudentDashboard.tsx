"use client";

import { useActiveAccount, useReadContract } from "thirdweb/react";
import { getContract } from "thirdweb";
import { formatUnits } from "viem";
import { CONTRACTS } from "../../lib/constants/contracts";
import { client } from "../../client";
import { activeChain } from "../../lib/chains";
// import { QuickActions } from "../socket/QuickActions";
// import { StudentSocketEvents } from "../socket/StudentSocketEvents";
// import { TutorSocketEvents } from "../socket/TutorSocketEvents";
import deployedContracts from "~~/contracts/deployedContracts";

interface StudentDashboardProps {
  onStartLearning?: () => void;
  onAddFunds?: () => void;
}

export const StudentDashboard = ({ onStartLearning, onAddFunds }: StudentDashboardProps) => {
  const account = useActiveAccount();

  // Create contract instance using deployed contract ABI
  const contract = getContract({
    client,
    chain: activeChain,
    address: CONTRACTS.LANGDAO,
    abi: deployedContracts[activeChain.id as keyof typeof deployedContracts]?.LangDAO?.abi || deployedContracts[31337].LangDAO.abi,
  });

  // Get student info
  const { data: studentInfo } = useReadContract({
    contract,
    method: "getStudentInfo",
    params: [account?.address || "0x0000000000000000000000000000000000000000"],
  });

  // Get student balance (placeholder - will be implemented with proper token support)
  const { data: balance } = useReadContract({
    contract,
    method: "studentBalances",
    params: [
      account?.address || "0x0000000000000000000000000000000000000000",
      "0x0000000000000000000000000000000000000000" // Zero address placeholder
    ],
  });

  const balanceFormatted = balance ? parseFloat(formatUnits(balance, 18)) : 0;
  const targetLanguage = studentInfo ? Number(studentInfo[0]) : 0;
  const budgetPerSec = studentInfo ? Number(studentInfo[1]) : 0;
  const budgetPerHour = budgetPerSec * 3600;

  // Language mapping
  const getLanguageName = (id: number) => {
    const languages = {
      1: "Spanish", 2: "French", 3: "German", 4: "Italian", 5: "Portuguese",
      6: "Japanese", 7: "Korean", 8: "Chinese", 9: "Arabic", 10: "Russian"
    };
    return languages[id as keyof typeof languages] || "Unknown";
  };

  return (
    <div className="min-h-[calc(100vh-8rem)] bg-gray-50 dark:bg-gray-900 p-4">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="text-center mb-8">
          <h1 className="text-4xl font-bold text-gray-900 dark:text-white mb-2">
            Student Dashboard
          </h1>
          <p className="text-gray-600 dark:text-gray-300">
            Ready to start learning? Find a tutor and begin your session!
          </p>
        </div>

        <div className="grid md:grid-cols-2 gap-8">
          {/* Balance Card */}
          <div className="bg-white dark:bg-gray-800 rounded-3xl p-8 border-2 border-gray-200 dark:border-gray-700">
            <div className="text-center">
              <div className="w-16 h-16 mx-auto bg-gradient-to-br from-green-400 to-green-600 rounded-2xl flex items-center justify-center mb-6">
                <span className="text-2xl">💰</span>
              </div>
              <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">
                Your Balance
              </h2>
              <div className="text-4xl font-bold text-green-600 dark:text-green-400 mb-4">
                {balanceFormatted.toFixed(4)} PYUSD
              </div>
              <p className="text-gray-600 dark:text-gray-300 text-sm">
                Available for tutoring sessions
              </p>
            </div>
          </div>

          {/* Profile Card */}
          <div className="bg-white dark:bg-gray-800 rounded-3xl p-8 border-2 border-gray-200 dark:border-gray-700">
            <div className="text-center">
              <div className="w-16 h-16 mx-auto bg-gradient-to-br from-blue-400 to-blue-600 rounded-2xl flex items-center justify-center mb-6">
                <span className="text-2xl">🎓</span>
              </div>
              <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-4">
                Learning Profile
              </h2>
              <div className="space-y-3 text-left">
                <div className="flex justify-between">
                  <span className="text-gray-600 dark:text-gray-300">Target Language:</span>
                  <span className="font-medium text-gray-900 dark:text-white">
                    {getLanguageName(targetLanguage)}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600 dark:text-gray-300">Budget per Hour:</span>
                  <span className="font-medium text-gray-900 dark:text-white">
                    {(budgetPerHour / 1e18).toFixed(4)} PYUSD
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600 dark:text-gray-300">Status:</span>
                  <span className="font-medium text-green-600 dark:text-green-400">
                    Ready to Learn
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Socket Integration - Temporarily Disabled */}
        {/* 
        <div className="mt-8">
          <QuickActions />
        </div>
        <div className="mt-8 grid md:grid-cols-2 gap-6">
          <StudentSocketEvents />
          <TutorSocketEvents />
        </div>
        */}

        {/* Action Buttons */}
        <div className="mt-8 flex flex-col sm:flex-row gap-4 justify-center">
          <a
            href="/find-tutor"
            className="inline-block px-8 py-4 bg-gradient-to-r from-blue-500 to-purple-600 text-white rounded-xl font-medium hover:shadow-lg transition-all duration-200 text-lg text-center"
          >
            <span className="mr-2">🚀</span>
            Find a Tutor
          </a>
          <button 
            onClick={onAddFunds}
            className="px-8 py-4 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 rounded-xl font-medium hover:bg-gray-50 dark:hover:bg-gray-700 transition-all duration-200 text-lg"
          >
            <span className="mr-2">💰</span>
            Add More Funds
          </button>
        </div>

        {/* Quick Stats */}
        <div className="mt-12 grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="bg-white dark:bg-gray-800 rounded-2xl p-6 border border-gray-200 dark:border-gray-700 text-center">
            <div className="text-2xl font-bold text-gray-900 dark:text-white">
              {Math.floor(balanceFormatted * 3600 / (budgetPerHour / 1e18))}
            </div>
            <div className="text-sm text-gray-500 dark:text-gray-400">
              Hours Available
            </div>
          </div>
          <div className="bg-white dark:bg-gray-800 rounded-2xl p-6 border border-gray-200 dark:border-gray-700 text-center">
            <div className="text-2xl font-bold text-gray-900 dark:text-white">0</div>
            <div className="text-sm text-gray-500 dark:text-gray-400">
              Sessions Completed
            </div>
          </div>
          <div className="bg-white dark:bg-gray-800 rounded-2xl p-6 border border-gray-200 dark:border-gray-700 text-center">
            <div className="text-2xl font-bold text-gray-900 dark:text-white">
              {getLanguageName(targetLanguage)}
            </div>
            <div className="text-sm text-gray-500 dark:text-gray-400">
              Learning Language
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};