"use client";

import { useState } from "react";
import toast from "react-hot-toast";

import { LANGUAGES, PYUSD_DECIMALS } from "../../lib/constants/contracts";
import { useScaffoldWriteContract, useUsdConversion } from "~~/hooks/scaffold-eth";

interface StudentRegistrationProps {
  onComplete: () => void;
  onBack: () => void;
}

export const StudentRegistration = ({ onComplete, onBack }: StudentRegistrationProps) => {
  const [targetLanguage, setTargetLanguage] = useState<number | null>(null);
  const [budgetPerHour, setBudgetPerHour] = useState<string>("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const { writeContractAsync, isMining } = useScaffoldWriteContract({
    contractName: "LangDAO",
  });

  const { pyusdToUsdFormatted } = useUsdConversion();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!targetLanguage || !budgetPerHour) {
      toast.error("Please fill in all fields");
      return;
    }

    const budgetPerSecond = Math.floor((parseFloat(budgetPerHour) / 3600) * Math.pow(10, PYUSD_DECIMALS)); // Convert to PYUSD units per second

    setIsSubmitting(true);

    try {
      // Call the registerStudent function from LangDAO contract
      await writeContractAsync({
        functionName: "registerStudent",
        args: [targetLanguage, BigInt(budgetPerSecond)],
      });

      toast.success("Registration successful!");
      onComplete();
    } catch (err) {
      console.error("Registration error:", err);
      toast.error("Registration failed. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  };



  const selectedLanguageObj = LANGUAGES.find(lang => lang.id === targetLanguage);

  return (
    <div className="min-h-[calc(100vh-8rem)] bg-gray-50 dark:bg-gray-900 flex items-center justify-center p-4">
      <div className="max-w-2xl w-full">
        <div className="bg-white dark:bg-gray-800 rounded-3xl p-8 border-2 border-gray-200 dark:border-gray-700">
          <div className="text-center mb-8">
            <div className="w-16 h-16 mx-auto bg-gradient-to-br from-blue-400 to-blue-600 rounded-2xl flex items-center justify-center mb-4">
              <span className="text-2xl">🎓</span>
            </div>
            <h2 className="text-3xl font-bold text-gray-900 dark:text-white mb-2">
              Student Registration
            </h2>
            <p className="text-gray-600 dark:text-gray-300">
              Tell us what language you want to learn
            </p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Target Language Selection */}
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">
                Target Language
              </label>
              <div className="grid grid-cols-4 sm:grid-cols-6 md:grid-cols-8 gap-2 max-h-64 overflow-y-auto p-2 border border-gray-200 dark:border-gray-600 rounded-lg">
                {LANGUAGES.map((language) => (
                  <button
                    key={language.id}
                    type="button"
                    onClick={() => setTargetLanguage(language.id)}
                    className={`
                      p-2 rounded-lg border-2 transition-all duration-200 flex flex-col items-center
                      ${targetLanguage === language.id
                        ? "border-blue-500 bg-blue-50 dark:bg-blue-900/20"
                        : "border-gray-200 dark:border-gray-600 hover:border-blue-300"
                      }
                    `}
                    title={language.name}
                  >
                    <span className="text-xl">{language.flag}</span>
                    <span className="text-xs font-medium text-gray-900 dark:text-white mt-1 truncate w-full text-center">
                      {language.name}
                    </span>
                  </button>
                ))}
              </div>
              {selectedLanguageObj && (
                <div className="mt-3 p-3 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
                  <p className="text-sm text-blue-700 dark:text-blue-300">
                    Selected: {selectedLanguageObj.flag} {selectedLanguageObj.name}
                  </p>
                </div>
              )}
            </div>

            {/* Budget Per Hour */}
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Budget per Hour
              </label>
              <div className="relative">
                <input
                  type="number"
                  step="0.01"
                  min="0"
                  value={budgetPerHour}
                  onChange={(e) => setBudgetPerHour(e.target.value)}
                  placeholder="10.00"
                  className="w-full px-4 py-3 pr-24 border border-gray-300 dark:border-gray-600 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                />
                <div className="absolute right-3 top-3 text-gray-500 dark:text-gray-400">
                  PYUSD
                </div>
              </div>
              {budgetPerHour && parseFloat(budgetPerHour) > 0 && (
                <div className="mt-2 flex items-center justify-between text-sm">
                  <span className="text-gray-500 dark:text-gray-400">
                    ≈ {pyusdToUsdFormatted(budgetPerHour)}/hr
                  </span>
                  <span className="text-gray-500 dark:text-gray-400">
                    {pyusdToUsdFormatted(parseFloat(budgetPerHour) / 3600, 6)}/sec
                  </span>
                </div>
              )}
              <p className="mt-2 text-sm text-gray-500 dark:text-gray-400">
                This is your maximum budget per hour. You'll only pay for actual session time.
              </p>
            </div>

            {/* Action Buttons */}
            <div className="flex flex-col sm:flex-row gap-4 pt-6">
              <button
                type="button"
                onClick={onBack}
                className="flex-1 px-6 py-3 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 rounded-xl font-medium hover:bg-gray-50 dark:hover:bg-gray-700 transition-all duration-200"
              >
                Back
              </button>
              <button
                type="submit"
                disabled={!targetLanguage || !budgetPerHour || isSubmitting || isMining}
                className="flex-1 px-6 py-3 bg-gradient-to-r from-blue-500 to-blue-600 text-white rounded-xl font-medium hover:shadow-lg transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isSubmitting || isMining ? (
                  <div className="flex items-center justify-center">
                    <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin mr-2"></div>
                    {isSubmitting ? "Confirming..." : "Processing..."}
                  </div>
                ) : (
                  "Register as Student"
                )}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};