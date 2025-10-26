"use client";

import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import toast from "react-hot-toast";
import { useActiveAccount } from "thirdweb/react";
import { useScaffoldReadContract, useScaffoldWriteContract } from "~~/hooks/scaffold-eth";

export const ActiveSessionPrompt = () => {
  const account = useActiveAccount();
  const [showPrompt, setShowPrompt] = useState(false);
  const [currentTime, setCurrentTime] = useState(Math.floor(Date.now() / 1000));

  // Check for active session
  const { data: activeSessionData, refetch } = useScaffoldReadContract({
    contractName: "LangDAO",
    functionName: "activeSessions",
    args: [account?.address],
  });

  const { writeContractAsync, isMining } = useScaffoldWriteContract({
    contractName: "LangDAO",
  });

  // Update current time every second for live duration display
  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentTime(Math.floor(Date.now() / 1000));
    }, 1000);

    return () => clearInterval(interval);
  }, []);

  // Poll for active session every 5 seconds
  useEffect(() => {
    if (!account?.address) return;

    const interval = setInterval(() => {
      refetch();
    }, 5000);

    return () => clearInterval(interval);
  }, [account?.address, refetch]);

  // Check if session is active
  useEffect(() => {
    if (activeSessionData) {
      const [student, tutor, token, startTime, endTime, ratePerSecond, totalPaid, languageId, sessionId, isActive] =
        activeSessionData;

      // Show prompt if session is active and has started
      if (isActive && startTime && startTime > 0n) {
        setShowPrompt(true);
      } else {
        setShowPrompt(false);
      }
    }
  }, [activeSessionData]);

  const handleEndSession = async () => {
    if (!activeSessionData) return;

    const [student, tutor, token, startTime, endTime, ratePerSecond, totalPaid, languageId, sessionId, isActive] =
      activeSessionData;

    try {
      toast.loading("Ending session...");

      await writeContractAsync({
        functionName: "endSession",
        args: [tutor],
      });

      toast.dismiss();
      toast.success("Session ended successfully!");
      setShowPrompt(false);
      refetch();
    } catch (error) {
      console.error("Error ending session:", error);
      toast.dismiss();
      toast.error("Failed to end session. Please try again.");
    }
  };

  if (!showPrompt || !activeSessionData) return null;

  const [student, tutor, token, startTime, endTime, ratePerSecond, totalPaid, languageId, sessionId, isActive] =
    activeSessionData;

  // Calculate session duration using current time state for live updates
  const duration = startTime ? currentTime - Number(startTime) : 0;
  const hours = Math.floor(duration / 3600);
  const minutes = Math.floor((duration % 3600) / 60);
  const seconds = duration % 60;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: -20 }}
        className="fixed top-20 left-1/2 transform -translate-x-1/2 z-50 w-full max-w-md px-4"
      >
        <div className="bg-gradient-to-r from-orange-500 to-red-500 text-white rounded-2xl p-6 shadow-2xl border-2 border-white">
          <div className="flex items-start space-x-4">
            <div className="flex-shrink-0">
              <motion.div
                animate={{ scale: [1, 1.2, 1] }}
                transition={{ duration: 2, repeat: Infinity }}
                className="w-12 h-12 bg-white/20 rounded-full flex items-center justify-center"
              >
                <span className="text-2xl">⚠️</span>
              </motion.div>
            </div>
            <div className="flex-1">
              <h3 className="text-lg font-bold mb-2">Active Session Detected!</h3>
              <p className="text-sm text-white/90 mb-3">
                You have an ongoing tutoring session. Please end it to avoid unnecessary charges.
              </p>
              <div className="bg-white/20 rounded-lg p-3 mb-4">
                <div className="text-xs text-white/80 mb-1">Session Duration</div>
                <div className="text-2xl font-bold font-mono">
                  {String(hours).padStart(2, "0")}:{String(minutes).padStart(2, "0")}:
                  {String(seconds).padStart(2, "0")}
                </div>
              </div>
              <div className="flex space-x-2">
                <button
                  onClick={handleEndSession}
                  disabled={isMining}
                  className="flex-1 px-4 py-2 bg-white text-red-600 rounded-lg font-medium hover:bg-gray-100 transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {isMining ? (
                    <div className="flex items-center justify-center">
                      <div className="w-4 h-4 border-2 border-red-600 border-t-transparent rounded-full animate-spin mr-2"></div>
                      Ending...
                    </div>
                  ) : (
                    <>
                      <span className="mr-1">🛑</span>
                      End Session Now
                    </>
                  )}
                </button>
                <button
                  onClick={() => setShowPrompt(false)}
                  className="px-4 py-2 bg-white/20 text-white rounded-lg font-medium hover:bg-white/30 transition-all duration-200"
                >
                  Dismiss
                </button>
              </div>
            </div>
          </div>
        </div>
      </motion.div>
    </AnimatePresence>
  );
};
