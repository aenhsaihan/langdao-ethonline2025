"use client";

import { useState } from "react";

interface RoleSelectionProps {
  onRoleSelect: (role: "student" | "tutor") => void;
}

export const RoleSelection = ({ onRoleSelect }: RoleSelectionProps) => {
  const [selectedRole, setSelectedRole] = useState<"student" | "tutor" | null>(null);

  const handleRoleClick = (role: "student" | "tutor") => {
    setSelectedRole(role);
    setTimeout(() => onRoleSelect(role), 200); // Small delay for visual feedback
  };

  return (
    <div className="min-h-[calc(100vh-8rem)] bg-gray-50 dark:bg-gray-900 flex items-center justify-center p-4">
      <div className="max-w-4xl w-full">
        <div className="text-center mb-12">
          <h1 className="text-4xl lg:text-5xl font-bold text-gray-900 dark:text-white mb-4">
            Choose your role
          </h1>
          <p className="text-lg text-gray-600 dark:text-gray-300">
            Select how you'd like to use LangDAO
          </p>
        </div>

        <div className="grid md:grid-cols-2 gap-8 max-w-2xl mx-auto">
          {/* Student Card */}
          <div
            onClick={() => handleRoleClick("student")}
            className={`
              bg-white dark:bg-gray-800 rounded-3xl p-8 border-2 cursor-pointer
              transition-all duration-300 hover:shadow-xl hover:scale-105
              ${selectedRole === "student" 
                ? "border-blue-500 bg-blue-50 dark:bg-blue-900/20" 
                : "border-gray-200 dark:border-gray-700 hover:border-blue-300"
              }
            `}
          >
            <div className="text-center space-y-6">
              <div className="w-20 h-20 mx-auto bg-gradient-to-br from-blue-400 to-blue-600 rounded-2xl flex items-center justify-center">
                <span className="text-3xl">🎓</span>
              </div>
              
              <div>
                <h3 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">
                  Student
                </h3>
                <p className="text-gray-600 dark:text-gray-300">
                  Learn languages with native speakers
                </p>
              </div>

              <div className="space-y-3 text-sm text-gray-500 dark:text-gray-400">
                <div className="flex items-center justify-center">
                  <span className="mr-2">✓</span>
                  Instant tutor matching
                </div>
                <div className="flex items-center justify-center">
                  <span className="mr-2">✓</span>
                  Pay per second
                </div>
                <div className="flex items-center justify-center">
                  <span className="mr-2">✓</span>
                  45+ languages available
                </div>
              </div>
            </div>
          </div>

          {/* Tutor Card */}
          <div
            onClick={() => handleRoleClick("tutor")}
            className={`
              bg-white dark:bg-gray-800 rounded-3xl p-8 border-2 cursor-pointer
              transition-all duration-300 hover:shadow-xl hover:scale-105
              ${selectedRole === "tutor" 
                ? "border-purple-500 bg-purple-50 dark:bg-purple-900/20" 
                : "border-gray-200 dark:border-gray-700 hover:border-purple-300"
              }
            `}
          >
            <div className="text-center space-y-6">
              <div className="w-20 h-20 mx-auto bg-gradient-to-br from-purple-400 to-purple-600 rounded-2xl flex items-center justify-center">
                <span className="text-3xl">👨‍🏫</span>
              </div>
              
              <div>
                <h3 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">
                  Tutor
                </h3>
                <p className="text-gray-600 dark:text-gray-300">
                  Teach your native language and earn
                </p>
              </div>

              <div className="space-y-3 text-sm text-gray-500 dark:text-gray-400">
                <div className="flex items-center justify-center">
                  <span className="mr-2">✓</span>
                  Flexible schedule
                </div>
                <div className="flex items-center justify-center">
                  <span className="mr-2">✓</span>
                  Instant payments
                </div>
                <div className="flex items-center justify-center">
                  <span className="mr-2">✓</span>
                  Global student base
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};