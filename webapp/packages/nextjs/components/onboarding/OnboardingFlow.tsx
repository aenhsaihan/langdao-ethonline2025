"use client";

import { useState, useEffect } from "react";
import { useActiveAccount, useReadContract } from "thirdweb/react";
import { getContract } from "thirdweb";
import { RoleSelection } from "./RoleSelection";
import { StudentRegistration } from "./StudentRegistration";
import { TutorRegistration } from "./TutorRegistration";
import { DepositFlow } from "../deposit/DepositFlow";
import { StudentDashboard } from "../dashboard/StudentDashboard";
import { TutorAvailabilityFlow } from "../tutor/TutorAvailabilityFlow";
import { CONTRACTS } from "../../lib/constants/contracts";
import { client } from "../../client";
import { activeChain } from "../../lib/chains";
import deployedContracts from "~~/contracts/deployedContracts";

type OnboardingStep = "role" | "registration" | "deposit" | "dashboard" | "tutor-availability" | "complete";
type UserRole = "student" | "tutor" | null;

interface OnboardingFlowProps {
  onComplete: () => void;
}

export const OnboardingFlow = ({ onComplete }: OnboardingFlowProps) => {
  const [currentStep, setCurrentStep] = useState<OnboardingStep>("role");
  const [selectedRole, setSelectedRole] = useState<UserRole>(null);
  const [isCheckingRegistration, setIsCheckingRegistration] = useState(true);
  
  const account = useActiveAccount();

  // Create contract instance using deployed contract ABI
  const contract = getContract({
    client,
    chain: activeChain,
    address: CONTRACTS.LANGDAO,
    abi: deployedContracts[31337].LangDAO.abi,
  });

  // Check if user is already registered as student
  const { data: studentInfo } = useReadContract({
    contract,
    method: "getStudentInfo",
    params: [account?.address || "0x0000000000000000000000000000000000000000"],
  });

  // Check if user is already registered as tutor
  const { data: tutorInfo } = useReadContract({
    contract,
    method: "getTutorInfo",
    params: [account?.address || "0x0000000000000000000000000000000000000000"],
  });

  // Check registration status when account or contract data changes
  useEffect(() => {
    if (!account?.address) {
      setIsCheckingRegistration(false);
      return;
    }

    // Check if user is already registered
    const isStudentRegistered = studentInfo && studentInfo[2]; // isRegistered is the 3rd element
    const isTutorRegistered = tutorInfo && tutorInfo[2]; // isRegistered is the 3rd element

    if (isStudentRegistered) {
      setSelectedRole("student");
      setCurrentStep("dashboard"); // Go directly to dashboard to show balance
      setIsCheckingRegistration(false);
    } else if (isTutorRegistered) {
      setSelectedRole("tutor");
      setCurrentStep("tutor-availability"); // Go to tutor availability flow
      setIsCheckingRegistration(false);
    } else {
      // Not registered, start with role selection
      setCurrentStep("role");
      setIsCheckingRegistration(false);
    }
  }, [account?.address, studentInfo, tutorInfo]);

  const handleRoleSelect = (role: "student" | "tutor") => {
    setSelectedRole(role);
    setCurrentStep("registration");
  };

  const handleRegistrationComplete = () => {
    // For students, go to deposit flow
    // For tutors, go to availability flow
    if (selectedRole === "student") {
      setCurrentStep("deposit");
    } else {
      setCurrentStep("tutor-availability");
    }
  };

  const handleDepositComplete = () => {
    setCurrentStep("dashboard"); // Show dashboard after deposit
  };

  const handleStartLearning = () => {
    onComplete(); // This will take them to the main app
  };

  const handleAddFunds = () => {
    setCurrentStep("deposit"); // Go back to deposit flow
  };

  const handleBack = () => {
    switch (currentStep) {
      case "registration":
        setCurrentStep("role");
        setSelectedRole(null);
        break;
      case "deposit":
        // If user is already registered, go back to dashboard
        // Otherwise go back to registration
        if (selectedRole === "student" && (studentInfo && studentInfo[2])) {
          setCurrentStep("dashboard");
        } else {
          setCurrentStep("registration");
        }
        break;
      case "tutor-availability":
        // If tutor is already registered, they can go back to complete
        // Otherwise go back to registration
        if (selectedRole === "tutor" && (tutorInfo && tutorInfo[2])) {
          setCurrentStep("complete");
        } else {
          setCurrentStep("registration");
        }
        break;
      default:
        break;
    }
  };



  // Show loading while checking registration status
  if (isCheckingRegistration) {
    return (
      <div className="min-h-[calc(100vh-8rem)] bg-gray-50 dark:bg-gray-900 flex items-center justify-center p-4">
        <div className="max-w-2xl w-full text-center">
          <div className="bg-white dark:bg-gray-800 rounded-3xl p-8 border-2 border-gray-200 dark:border-gray-700">
            <div className="w-16 h-16 mx-auto bg-gradient-to-br from-blue-400 to-blue-600 rounded-full flex items-center justify-center mb-6 animate-pulse">
              <span className="text-2xl">🔍</span>
            </div>
            <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-4">
              Checking Registration Status
            </h2>
            <p className="text-gray-600 dark:text-gray-300">
              Please wait while we check if you're already registered...
            </p>
          </div>
        </div>
      </div>
    );
  }

  if (currentStep === "complete") {
    return (
      <div className="min-h-[calc(100vh-8rem)] bg-gray-50 dark:bg-gray-900 flex items-center justify-center p-4">
        <div className="max-w-2xl w-full text-center">
          <div className="bg-white dark:bg-gray-800 rounded-3xl p-8 border-2 border-gray-200 dark:border-gray-700">
            <div className="w-20 h-20 mx-auto bg-gradient-to-br from-green-400 to-green-600 rounded-full flex items-center justify-center mb-6">
              <span className="text-3xl">🎉</span>
            </div>
            <h2 className="text-3xl font-bold text-gray-900 dark:text-white mb-4">
              Welcome to LangDAO!
            </h2>
            <p className="text-gray-600 dark:text-gray-300 mb-8">
              Your account is set up and ready to go. 
              {selectedRole === "student" 
                ? " Start finding tutors and begin your language learning journey!"
                : " Students can now find and book sessions with you!"
              }
            </p>
            <button
              onClick={onComplete}
              className="px-8 py-3 bg-gradient-to-r from-green-500 to-green-600 text-white rounded-xl font-medium hover:shadow-lg transition-all duration-200"
            >
              Get Started
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="relative">
      {/* Content */}
      <div>
        {currentStep === "role" && (
          <RoleSelection onRoleSelect={handleRoleSelect} />
        )}

        {currentStep === "registration" && selectedRole === "student" && (
          <StudentRegistration
            onComplete={handleRegistrationComplete}
            onBack={handleBack}
          />
        )}

        {currentStep === "registration" && selectedRole === "tutor" && (
          <TutorRegistration
            onComplete={handleRegistrationComplete}
            onBack={handleBack}
          />
        )}

        {currentStep === "deposit" && (
          <DepositFlow
            onComplete={handleDepositComplete}
            onBack={handleBack}
          />
        )}

        {currentStep === "dashboard" && (
          <StudentDashboard 
            onStartLearning={handleStartLearning} 
            onAddFunds={handleAddFunds}
          />
        )}

        {currentStep === "tutor-availability" && (
          <TutorAvailabilityFlow 
            onBack={handleBack}
          />
        )}
      </div>
    </div>
  );
};