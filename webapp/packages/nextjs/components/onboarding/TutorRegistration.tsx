"use client";

import { useState, useEffect } from "react";
import { useWriteContract, useWaitForTransactionReceipt } from "wagmi";
import { parseEther } from "viem";
import toast from "react-hot-toast";

import { LANGUAGES, CONTRACTS } from "../../lib/constants/contracts";
import deployedContracts from "~~/contracts/deployedContracts";

interface TutorRegistrationProps {
  onComplete: () => void;
  onBack: () => void;
}

export const TutorRegistration = ({ onComplete, onBack }: TutorRegistrationProps) => {
  const [selectedLanguages, setSelectedLanguages] = useState<number[]>([]);
  const [ratePerHour, setRatePerHour] = useState<string>("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const { writeContract, data: hash, error, isPending } = useWriteContract();
  
  const { isLoading: isConfirming, isSuccess } = useWaitForTransactionReceipt({
    hash,
  });

  const toggleLanguage = (languageId: number) => {
    setSelectedLanguages(prev => 
      prev.includes(languageId)
        ? prev.filter(id => id !== languageId)
        : [...prev, languageId]
    );
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (selectedLanguages.length === 0 || !ratePerHour) {
      toast.error("Please select at least one language and set your rate");
      return;
    }

    const ratePerSecond = Math.floor((parseFloat(ratePerHour) / 3600) * 1e18); // Convert to wei per second

    setIsSubmitting(true);
    
    try {
      // Call the registerTutor function from LangDAO contract
      writeContract({
        address: CONTRACTS.LANGDAO,
        abi: deployedContracts[31337].LangDAO.abi,
        functionName: "registerTutor",
        args: [selectedLanguages.map(id => BigInt(id)), BigInt(ratePerSecond)],
      });
    } catch (err) {
      console.error("Registration error:", err);
      toast.error("Registration failed. Please try again.");
      setIsSubmitting(false);
    }
  };

  // Handle transaction success
  useEffect(() => {
    if (isSuccess) {
      toast.success("Registration successful!");
      onComplete();
    }
  }, [isSuccess, onComplete]);

  // Handle transaction error
  useEffect(() => {
    if (error) {
      toast.error("Transaction failed. Please try again.");
      setIsSubmitting(false);
    }
  }, [error]);

  const selectedLanguageObjects = LANGUAGES.filter(lang => selectedLanguages.includes(lang.id));

  return (
    <div className="min-h-[calc(100vh-8rem)] bg-gray-50 dark:bg-gray-900 flex items-center justify-center p-4">
      <div className="max-w-2xl w-full">
        <div className="bg-white dark:bg-gray-800 rounded-3xl p-8 border-2 border-gray-200 dark:border-gray-700">
          <div className="text-center mb-8">
            <div className="w-16 h-16 mx-auto bg-gradient-to-br from-purple-400 to-purple-600 rounded-2xl flex items-center justify-center mb-4">
              <span className="text-2xl">👨‍🏫</span>
            </div>
            <h2 className="text-3xl font-bold text-gray-900 dark:text-white mb-2">
              Tutor Registration
            </h2>
            <p className="text-gray-600 dark:text-gray-300">
              Tell us what languages you can teach
            </p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Languages Offered */}
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">
                Languages You Can Teach (Select multiple)
              </label>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                {LANGUAGES.map((language) => (
                  <button
                    key={language.id}
                    type="button"
                    onClick={() => toggleLanguage(language.id)}
                    className={`
                      p-3 rounded-xl border-2 transition-all duration-200 text-left
                      ${selectedLanguages.includes(language.id)
                        ? "border-purple-500 bg-purple-50 dark:bg-purple-900/20"
                        : "border-gray-200 dark:border-gray-600 hover:border-purple-300"
                      }
                    `}
                  >
                    <div className="flex items-center space-x-2">
                      <span className="text-lg">{language.flag}</span>
                      <span className="text-sm font-medium text-gray-900 dark:text-white">
                        {language.name}
                      </span>
                      {selectedLanguages.includes(language.id) && (
                        <span className="ml-auto text-purple-500">✓</span>
                      )}
                    </div>
                  </button>
                ))}
              </div>
              {selectedLanguageObjects.length > 0 && (
                <div className="mt-3 p-3 bg-purple-50 dark:bg-purple-900/20 rounded-lg">
                  <p className="text-sm text-purple-700 dark:text-purple-300 mb-2">
                    Selected languages:
                  </p>
                  <div className="flex flex-wrap gap-2">
                    {selectedLanguageObjects.map((lang) => (
                      <span
                        key={lang.id}
                        className="inline-flex items-center px-2 py-1 bg-purple-100 dark:bg-purple-800 text-purple-700 dark:text-purple-300 rounded-md text-xs"
                      >
                        {lang.flag} {lang.name}
                      </span>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* Rate Per Hour */}
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Rate per Hour (PYUSD)
              </label>
              <div className="relative">
                <input
                  type="number"
                  step="0.01"
                  min="0"
                  value={ratePerHour}
                  onChange={(e) => setRatePerHour(e.target.value)}
                  placeholder="15.00"
                  className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-xl focus:ring-2 focus:ring-purple-500 focus:border-transparent bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                />
                <div className="absolute right-3 top-3 text-gray-500 dark:text-gray-400">
                  PYUSD
                </div>
              </div>
              <p className="mt-2 text-sm text-gray-500 dark:text-gray-400">
                This rate applies to all selected languages. Students pay per second of actual session time.
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
                disabled={selectedLanguages.length === 0 || !ratePerHour || isPending || isConfirming}
                className="flex-1 px-6 py-3 bg-gradient-to-r from-purple-500 to-purple-600 text-white rounded-xl font-medium hover:shadow-lg transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isPending || isConfirming ? (
                  <div className="flex items-center justify-center">
                    <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin mr-2"></div>
                    {isPending ? "Confirming..." : "Processing..."}
                  </div>
                ) : (
                  "Register as Tutor"
                )}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};