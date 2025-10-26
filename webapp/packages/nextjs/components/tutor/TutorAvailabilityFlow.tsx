"use client";

import React, { useEffect, useState, useRef } from "react";
import { AnimatePresence, motion } from "framer-motion";
import toast from "react-hot-toast";
import { useActiveAccount } from "thirdweb/react";
import { useSocket } from "../../lib/socket/socketContext";
import { useScaffoldReadContract, useUsdConversion } from "~~/hooks/scaffold-eth";
import { LANGUAGES } from "../../lib/constants/contracts";

interface TutorAvailabilityFlowProps {
  onBack?: () => void;
}

type AvailabilityState = "setup" | "waiting" | "waiting-for-student" | "in-session";

export const TutorAvailabilityFlow: React.FC<TutorAvailabilityFlowProps> = ({ onBack }) => {
  const account = useActiveAccount();
  const { socket, isConnected, on, off, emit } = useSocket();
  const [availabilityState, setAvailabilityState] = useState<AvailabilityState>("setup");
  const [language, setLanguage] = useState("en"); // Use language code instead of name
  const [ratePerHour, setRatePerHour] = useState("10"); // Store as hourly rate string like registration
  const { pyusdToUsdFormatted } = useUsdConversion();
  const [incomingRequests, setIncomingRequests] = useState<any[]>([]);
  const [currentSession, setCurrentSession] = useState<any>(null);
  const unavailableTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Monitor active session on blockchain for this tutor
  const { data: activeSessionData, refetch: refetchActiveSession } = useScaffoldReadContract({
    contractName: "LangDAO",
    functionName: "activeSessions",
    args: [account?.address],
  });

  // Poll for active session when in waiting-for-student state
  useEffect(() => {
    if (availabilityState === "waiting-for-student" && account?.address) {
      console.log("👀 Monitoring blockchain for active session...");

      // Check immediately
      refetchActiveSession();

      // Then poll every 3 seconds
      const interval = setInterval(() => {
        console.log("🔄 Checking blockchain for active session...");
        refetchActiveSession();
      }, 3000);

      return () => clearInterval(interval);
    }
  }, [availabilityState, account?.address, refetchActiveSession]);

  // Detect when session becomes active on blockchain
  useEffect(() => {
    if (activeSessionData && availabilityState === "waiting-for-student") {
      const [student, tutor, token, startTime, endTime, ratePerSecond, totalPaid, languageId, sessionId, isActive] = activeSessionData;

      console.log("📊 Active session data from blockchain:", {
        student,
        tutor,
        isActive,
        startTime: startTime?.toString(),
        sessionId: sessionId?.toString(),
      });

      // If session is active and has a start time, redirect to video call
      if (isActive && startTime && startTime > 0n) {
        console.log("✅ Session is active on blockchain! Redirecting to video call...");

        const videoCallUrl = `https://langdao-production.up.railway.app/?student=${student}&tutor=${account?.address}&session=${sessionId}`;

        toast.success("Session started on blockchain! Redirecting...");

        setTimeout(() => {
          console.log("🚀 Redirecting to:", videoCallUrl);
          window.location.href = videoCallUrl;
        }, 1000);
      }
    }
  }, [activeSessionData, availabilityState, account?.address]);

  // Use LANGUAGES from constants - map to format needed for UI
  const languages = LANGUAGES.map(lang => ({
    value: lang.code,
    label: lang.name,
    flag: lang.flag,
    id: lang.id
  }));

  // Helper function to convert wei per second back to hourly USD for display
  const weiPerSecondToHourlyUsd = (weiPerSecond: number | string | undefined): string => {
    if (!weiPerSecond || weiPerSecond === 0) return "$0.00";
    const wei = typeof weiPerSecond === "string" ? parseFloat(weiPerSecond) : weiPerSecond;
    if (isNaN(wei)) return "$0.00";
    const pyusdPerSecond = wei / 1e18;
    const pyusdPerHour = pyusdPerSecond * 3600;
    return pyusdToUsdFormatted(pyusdPerHour);
  };

  // Socket event listeners
  useEffect(() => {
    if (!socket || !account?.address) return;

    console.log("Setting up tutor socket event listeners");

    // Tutor-specific events
    const handleAvailabilitySet = () => {
      toast.success("You're now available for tutoring!");
      setAvailabilityState("waiting");
    };

    const handleAvailabilityRemoved = () => {
      toast.success("You're no longer available for tutoring");
      setAvailabilityState("setup");
      setIncomingRequests([]);

      // Clear the timeout since server responded
      if (unavailableTimeoutRef.current) {
        clearTimeout(unavailableTimeoutRef.current);
        unavailableTimeoutRef.current = null;
      }
    };

    const handleIncomingRequest = (data: any) => {
      setIncomingRequests(prev => [...prev, data]);
      toast(
        (t: any) => (
          <div className="flex flex-col space-y-2">
            <div className="font-medium">New Student Request!</div>
            <div className="text-sm text-gray-600">Student wants to learn {data.language}</div>
            <div className="text-sm text-gray-600">Budget: {weiPerSecondToHourlyUsd(data.budgetPerSecond)}/hr</div>
            <div className="flex space-x-2">
              <button
                onClick={() => {
                  acceptRequest(data.requestId);
                  toast.dismiss(t.id);
                }}
                className="px-3 py-1 bg-green-500 text-white rounded text-sm"
              >
                Accept
              </button>
              <button
                onClick={() => {
                  declineRequest(data.requestId);
                  toast.dismiss(t.id);
                }}
                className="px-3 py-1 bg-red-500 text-white rounded text-sm"
              >
                Decline
              </button>
            </div>
          </div>
        ),
        {
          duration: 30000,
          position: "top-right",
        },
      );
    };

    const handleRequestAccepted = (data: any) => {
      console.log("Request accepted, waiting for student:", data);
      setCurrentSession(data);
      setAvailabilityState("waiting-for-student");
      setIncomingRequests([]);
      toast.success("Request accepted! Waiting for student to start session...");
    };

    const handleStudentRejected = (data: any) => {
      console.log("Student rejected or selected another tutor:", data);
      setCurrentSession(null);
      setAvailabilityState("waiting");
      setIncomingRequests([]);
      toast("Student rejected you or selected another tutor. Back to waiting for new requests.", {
        icon: "ℹ️",
      });
    };

    const handleStudentSelected = (data: any) => {
      console.log("🎯 TUTOR RECEIVED tutor:student-selected:", data);
      console.log("Current availability state:", availabilityState);
      setCurrentSession(data);
      setAvailabilityState("in-session");
      setIncomingRequests([]);
      toast.success("Student selected you! Session starting...");
    };

    const handleSessionStarted = (data: any) => {
      console.log("🚀 TUTOR RECEIVED session:started EVENT (tx confirmed)");
      console.log("Session data:", data);
      console.log("Waiting for student to enter room...");

      toast("Transaction confirmed! Waiting for student to enter room...", {
        icon: "⏳",
        duration: 10000,
      });
    };

    const handleStudentInRoom = (data: any) => {
      console.log("🚪🚪🚪 TUTOR RECEIVED student:in-room EVENT 🚪🚪🚪");
      console.log("Student is in room:", data);
      console.log("Current tutor address:", account?.address);

      // Now redirect to video call
      const videoCallUrl = data.videoCallUrl || `https://langdao-production.up.railway.app/?student=${data.studentAddress}&tutor=${account?.address}&session=${data.requestId}`;
      console.log("Student is in room! Redirecting to:", videoCallUrl);

      toast.success("Student is in the room! Joining now...");
      setTimeout(() => {
        console.log("Executing redirect now...");
        window.location.href = videoCallUrl;
      }, 1000);
    };

    const handleStudentRejectedTransaction = (data: any) => {
      console.log("Student rejected transaction:", data);
      // Return to waiting state
      setCurrentSession(null);
      setAvailabilityState("waiting");
      toast("Student rejected the transaction. Back to waiting for new students.", {
        icon: "⚠️",
      });
    };

    // Register event listeners
    on("tutor:availability-set", handleAvailabilitySet);
    on("tutor:availability-removed", handleAvailabilityRemoved);
    on("tutor:incoming-request", handleIncomingRequest);
    on("tutor:request-accepted", handleRequestAccepted);
    on("tutor:student-rejected", handleStudentRejected);
    on("tutor:student-selected", handleStudentSelected);
    on("session:started", handleSessionStarted);
    on("student:in-room", handleStudentInRoom);
    on("tutor:student-rejected-transaction", handleStudentRejectedTransaction);

    return () => {
      off("tutor:availability-set", handleAvailabilitySet);
      off("tutor:availability-removed", handleAvailabilityRemoved);
      off("tutor:incoming-request", handleIncomingRequest);
      off("tutor:request-accepted", handleRequestAccepted);
      off("tutor:student-rejected", handleStudentRejected);
      off("tutor:student-selected", handleStudentSelected);
      off("session:started", handleSessionStarted);
      off("student:in-room", handleStudentInRoom);
      off("tutor:student-rejected-transaction", handleStudentRejectedTransaction);
    };
  }, [socket, account?.address, availabilityState]);

  const becomeAvailable = () => {
    if (!socket || !isConnected) {
      toast.error("Not connected to server");
      return;
    }

    // Convert hourly rate to per-second wei (same as registration)
    const ratePerSecond = Math.floor((parseFloat(ratePerHour) / 3600) * 1e18);

    console.log("Emitting tutor:set-available:", {
      address: account?.address,
      language,
      ratePerSecond,
      ratePerHour, // for debugging
    });

    emit("tutor:set-available", {
      address: account?.address,
      language,
      ratePerSecond,
    });

    toast("🚀 Setting you as available...");
  };

  const becomeUnavailable = () => {
    if (!socket) {
      toast.error("Not connected to server");
      return;
    }

    if (!socket.connected) {
      toast.error("Socket not connected to server");
      console.error("Socket connection status:", socket.connected);
      return;
    }

    console.log("Socket ID:", socket.id);
    console.log("Socket connected:", socket.connected);
    console.log("Emitting tutor:set-unavailable for address:", account?.address);

    // Clear any existing timeout
    if (unavailableTimeoutRef.current) {
      clearTimeout(unavailableTimeoutRef.current);
      unavailableTimeoutRef.current = null;
    }

    emit("tutor:set-unavailable", {
      address: account?.address,
    });

    // Add a timeout fallback in case server doesn't respond
    // Capture the current state to check against when timeout fires
    const currentState = availabilityState;
    const timeout = setTimeout(() => {
      // Only apply the fallback if we're still in the same state (waiting)
      // This prevents the timeout from firing if the state changed due to other events
      if (currentState === "waiting") {
        console.warn("No server response after 5 seconds, falling back to local state change");
        setAvailabilityState("setup");
        setIncomingRequests([]);
        toast.error("Server didn't respond, but you've been set as unavailable locally");
      }
      unavailableTimeoutRef.current = null;
    }, 5000);

    unavailableTimeoutRef.current = timeout;

    // Don't immediately change state - wait for server confirmation
    toast("⏳ Removing you from available tutors...");
  };

  const acceptRequest = (requestId: string) => {
    if (!socket) return;

    emit("tutor:accept-request", {
      requestId,
      tutorAddress: account?.address,
    });

    // Remove this request from the list
    setIncomingRequests(prev => prev.filter(req => req.requestId !== requestId));
  };

  const declineRequest = (requestId: string) => {
    if (!socket) return;

    emit("tutor:decline-request", {
      requestId,
    });

    // Remove this request from the list
    setIncomingRequests(prev => prev.filter(req => req.requestId !== requestId));
  };

  const endSession = () => {
    setCurrentSession(null);
    setAvailabilityState("waiting");
    toast.success("Session ended. You're available for new students!");
  };

  const selectedLanguageData = languages.find(lang => lang.value === language);

  if (availabilityState === "setup") {
    return (
      <div className="min-h-[calc(100vh-8rem)] bg-gradient-to-br from-purple-50 to-blue-50 dark:from-purple-900/20 dark:to-blue-900/20 flex items-center justify-center p-4">
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="max-w-2xl w-full">
          <div className="bg-white dark:bg-gray-800 rounded-3xl p-8 border-2 border-gray-200 dark:border-gray-700 shadow-xl">
            {/* Header */}
            <div className="text-center mb-8">
              <div className="w-20 h-20 mx-auto bg-gradient-to-br from-purple-500 to-blue-600 rounded-2xl flex items-center justify-center mb-6">
                <span className="text-3xl">👨‍🏫</span>
              </div>
              <h2 className="text-3xl font-bold text-gray-900 dark:text-white mb-4">Ready to Start Tutoring?</h2>
              <p className="text-gray-600 dark:text-gray-300">
                Set your language and rate, then go live to start earning!
              </p>
            </div>

            {/* Language Selection */}
            <div className="mb-6">
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">
                Language to Teach
              </label>
              <div className="grid grid-cols-4 md:grid-cols-6 lg:grid-cols-8 gap-2">
                {languages.map(lang => (
                  <button
                    key={lang.value}
                    onClick={() => setLanguage(lang.value)}
                    className={`p-2 rounded-lg border-2 transition-all duration-200 flex flex-col items-center ${language === lang.value
                        ? "border-purple-500 bg-purple-50 dark:bg-purple-900/20"
                        : "border-gray-200 dark:border-gray-600 hover:border-purple-300"
                      }`}
                    title={lang.label}
                  >
                    <div className="text-xl">{lang.flag}</div>
                    <div className="text-xs font-medium text-gray-900 dark:text-white mt-1 truncate w-full text-center">{lang.label}</div>
                  </button>
                ))}
              </div>
            </div>

            {/* Rate Setting */}
            <div className="mb-8">
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Your Rate (PYUSD per hour)
              </label>
              <div className="relative">
                <input
                  type="number"
                  step="0.01"
                  min="0"
                  value={ratePerHour}
                  onChange={e => setRatePerHour(e.target.value)}
                  className="w-full p-4 pr-28 border-2 border-gray-200 dark:border-gray-600 rounded-xl bg-white dark:bg-gray-700 text-gray-900 dark:text-white text-lg"
                  placeholder="10.00"
                />
                <div className="absolute right-4 top-1/2 transform -translate-y-1/2 text-gray-500">PYUSD</div>
              </div>
              {ratePerHour && parseFloat(ratePerHour) > 0 && (
                <div className="mt-2 flex items-center justify-between text-sm">
                  <span className="text-purple-600 dark:text-purple-400 font-medium">
                    ≈ {pyusdToUsdFormatted(ratePerHour)}/hr
                  </span>
                  <span className="text-gray-500">
                    {pyusdToUsdFormatted(parseFloat(ratePerHour) / 3600, 6)}/sec
                  </span>
                </div>
              )}
            </div>

            {/* Connection Status */}
            <div className="mb-6 p-4 bg-gray-50 dark:bg-gray-700 rounded-xl">
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium text-gray-700 dark:text-gray-300">Server Connection</span>
                <div className="flex items-center space-x-2">
                  <div className={`w-2 h-2 rounded-full ${isConnected ? "bg-green-500" : "bg-red-500"}`}></div>
                  <span className={`text-sm ${isConnected ? "text-green-600" : "text-red-600"}`}>
                    {isConnected ? "Connected" : "Disconnected"}
                  </span>
                </div>
              </div>
            </div>

            {/* Action Buttons */}
            <div className="flex space-x-4">
              {onBack && (
                <button
                  onClick={onBack}
                  className="flex-1 px-6 py-4 border-2 border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 rounded-xl font-medium hover:bg-gray-50 dark:hover:bg-gray-700 transition-all duration-200"
                >
                  Back
                </button>
              )}
              <button
                onClick={becomeAvailable}
                disabled={!isConnected}
                className="flex-1 px-6 py-4 bg-gradient-to-r from-purple-500 to-blue-600 text-white rounded-xl font-medium hover:shadow-lg transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <span className="mr-2">🚀</span>
                Go Live & Start Earning
              </button>
            </div>
          </div>
        </motion.div>
      </div>
    );
  }

  if (availabilityState === "waiting") {
    return (
      <div className="min-h-[calc(100vh-8rem)] bg-gradient-to-br from-green-50 to-emerald-50 dark:from-green-900/20 dark:to-emerald-900/20 flex items-center justify-center p-4">
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          className="max-w-2xl w-full text-center"
        >
          <div className="bg-white dark:bg-gray-800 rounded-3xl p-8 border-2 border-gray-200 dark:border-gray-700 shadow-xl">
            {/* Animated Waiting Indicator */}
            <div className="relative mb-8">
              {/* Outer rotating ring */}
              <motion.div
                animate={{ rotate: 360 }}
                transition={{ duration: 4, repeat: Infinity, ease: "linear" }}
                className="w-40 h-40 mx-auto"
              >
                <div className="w-full h-full rounded-full border-4 border-transparent border-t-green-500 border-r-green-400 opacity-80"></div>
              </motion.div>

              {/* Inner rotating ring */}
              <motion.div
                animate={{ rotate: -360 }}
                transition={{ duration: 3, repeat: Infinity, ease: "linear" }}
                className="absolute inset-4 w-32 h-32 mx-auto"
              >
                <div className="w-full h-full rounded-full border-3 border-transparent border-b-emerald-500 border-l-emerald-400 opacity-60"></div>
              </motion.div>

              {/* Pulsing center */}
              <div className="absolute inset-0 flex items-center justify-center">
                <motion.div
                  animate={{
                    scale: [1, 1.2, 1],
                    rotate: [0, 180, 360],
                  }}
                  transition={{
                    duration: 3,
                    repeat: Infinity,
                    ease: "easeInOut",
                  }}
                  className="w-20 h-20 bg-gradient-to-br from-green-400 to-emerald-500 rounded-full flex items-center justify-center shadow-lg"
                >
                  <motion.div
                    animate={{ scale: [1, 1.1, 1] }}
                    transition={{ duration: 2, repeat: Infinity }}
                    className="text-3xl"
                  >
                    {selectedLanguageData?.flag}
                  </motion.div>
                </motion.div>
              </div>

              {/* Floating particles */}
              {[...Array(6)].map((_, i) => (
                <motion.div
                  key={i}
                  animate={{
                    y: [0, -20, 0],
                    opacity: [0.3, 1, 0.3],
                  }}
                  transition={{
                    duration: 2 + i * 0.2,
                    repeat: Infinity,
                    delay: i * 0.3,
                  }}
                  className="absolute w-2 h-2 bg-green-400 rounded-full"
                  style={{
                    left: `${20 + i * 12}%`,
                    top: `${30 + (i % 2) * 40}%`,
                  }}
                />
              ))}
            </div>

            <h2 className="text-3xl font-bold text-gray-900 dark:text-white mb-4">You're Live! 🎉</h2>

            {/* Connection Status Debug */}
            <div className="mb-4 p-3 bg-gray-100 dark:bg-gray-700 rounded-lg text-sm">
              <div>Socket ID: {socket?.id || "Not connected"}</div>
              <div>Connected: {socket?.connected ? "✅ Yes" : "❌ No"}</div>
              <div>Server: {process.env.NEXT_PUBLIC_BACKEND_URL || "http://localhost:4000"}</div>
            </div>
            <div className="mb-6">
              <p className="text-lg text-gray-600 dark:text-gray-300 mb-4">
                Teaching <span className="font-semibold text-green-600">{selectedLanguageData?.label}</span> at{" "}
                <span className="font-semibold">{pyusdToUsdFormatted(ratePerHour)}/hr</span>
              </p>

              {/* Earnings Preview */}
              <div className="grid grid-cols-3 gap-4 max-w-md mx-auto">
                <div className="text-center p-3 bg-green-50 dark:bg-green-900/20 rounded-xl">
                  <div className="text-lg font-bold text-green-600 dark:text-green-400">
                    {pyusdToUsdFormatted(parseFloat(ratePerHour) / 60)}
                  </div>
                  <div className="text-xs text-gray-500">/min</div>
                </div>
                <div className="text-center p-3 bg-green-50 dark:bg-green-900/20 rounded-xl">
                  <div className="text-lg font-bold text-green-600 dark:text-green-400">
                    {pyusdToUsdFormatted(ratePerHour)}
                  </div>
                  <div className="text-xs text-gray-500">/hour</div>
                </div>
                <div className="text-center p-3 bg-green-50 dark:bg-green-900/20 rounded-xl">
                  <div className="text-lg font-bold text-green-600 dark:text-green-400">
                    {pyusdToUsdFormatted(parseFloat(ratePerHour) * 24)}
                  </div>
                  <div className="text-xs text-gray-500">/day</div>
                </div>
              </div>
            </div>

            {/* Sound Wave Animation */}
            <div className="mb-8 flex justify-center">
              <div className="flex items-center space-x-1">
                {[...Array(5)].map((_, i) => (
                  <motion.div
                    key={i}
                    animate={{
                      scaleY: [0.5, 1.5, 0.5],
                    }}
                    transition={{
                      duration: 1.5,
                      repeat: Infinity,
                      delay: i * 0.1,
                      ease: "easeInOut",
                    }}
                    className="w-1 h-8 bg-gradient-to-t from-green-400 to-emerald-500 rounded-full"
                  />
                ))}
                <motion.div
                  animate={{ scale: [1, 1.05, 1] }}
                  transition={{ duration: 2, repeat: Infinity }}
                  className="mx-4"
                >
                  <div className="inline-flex items-center px-6 py-3 bg-green-100 dark:bg-green-900/30 rounded-full">
                    <div className="w-3 h-3 bg-green-500 rounded-full mr-3 animate-pulse"></div>
                    <span className="text-green-700 dark:text-green-300 font-medium">Waiting for students...</span>
                  </div>
                </motion.div>
                {[...Array(5)].map((_, i) => (
                  <motion.div
                    key={i + 5}
                    animate={{
                      scaleY: [0.5, 1.5, 0.5],
                    }}
                    transition={{
                      duration: 1.5,
                      repeat: Infinity,
                      delay: (i + 5) * 0.1,
                      ease: "easeInOut",
                    }}
                    className="w-1 h-8 bg-gradient-to-t from-green-400 to-emerald-500 rounded-full"
                  />
                ))}
              </div>
            </div>

            {/* Incoming Requests */}
            <AnimatePresence>
              {incomingRequests.length > 0 && (
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -20 }}
                  className="mb-6"
                >
                  <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
                    Incoming Requests ({incomingRequests.length})
                  </h3>
                  <div className="space-y-3">
                    {incomingRequests.map(request => (
                      <motion.div
                        key={request.requestId}
                        initial={{ opacity: 0, x: -20 }}
                        animate={{ opacity: 1, x: 0 }}
                        className="flex items-center justify-between p-4 bg-blue-50 dark:bg-blue-900/20 rounded-xl border border-blue-200 dark:border-blue-800"
                      >
                        <div>
                          <div className="font-medium text-gray-900 dark:text-white">Student Request</div>
                          <div className="text-sm text-gray-600 dark:text-gray-400">
                            Budget: {weiPerSecondToHourlyUsd(request.budgetPerSecond)}/hr
                          </div>
                        </div>
                        <div className="flex space-x-2">
                          <button
                            onClick={() => acceptRequest(request.requestId)}
                            className="px-4 py-2 bg-green-500 text-white rounded-lg hover:bg-green-600 transition-colors"
                          >
                            Accept
                          </button>
                          <button
                            onClick={() => declineRequest(request.requestId)}
                            className="px-4 py-2 bg-red-500 text-white rounded-lg hover:bg-red-600 transition-colors"
                          >
                            Decline
                          </button>
                        </div>
                      </motion.div>
                    ))}
                  </div>
                </motion.div>
              )}
            </AnimatePresence>

            {/* Stop Button */}
            <div className="flex flex-col items-center space-y-3">
              <button
                onClick={becomeUnavailable}
                className="px-8 py-3 bg-red-500 text-white rounded-xl font-medium hover:bg-red-600 transition-all duration-200"
              >
                <span className="mr-2">⏹️</span>
                Stop Tutoring
              </button>

              {/* Manual fallback button */}
              <button
                onClick={() => {
                  console.log("Manual fallback: setting state to setup");
                  setAvailabilityState("setup");
                  setIncomingRequests([]);
                  toast.success("Manually set as unavailable");
                }}
                className="px-4 py-2 text-sm bg-gray-500 text-white rounded-lg hover:bg-gray-600 transition-all duration-200"
              >
                Manual Stop (if socket fails)
              </button>
            </div>
          </div>
        </motion.div>
      </div>
    );
  }

  if (availabilityState === "waiting-for-student") {
    return (
      <div className="min-h-[calc(100vh-8rem)] bg-gradient-to-br from-yellow-50 to-orange-50 dark:from-yellow-900/20 dark:to-orange-900/20 flex items-center justify-center p-4">
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          className="max-w-2xl w-full text-center"
        >
          <div className="bg-white dark:bg-gray-800 rounded-3xl p-8 border-2 border-gray-200 dark:border-gray-700 shadow-xl">
            {/* Animated waiting indicator */}
            <motion.div
              animate={{
                scale: [1, 1.1, 1],
                rotate: [0, 5, -5, 0],
              }}
              transition={{ duration: 2, repeat: Infinity }}
              className="w-20 h-20 mx-auto bg-gradient-to-br from-yellow-500 to-orange-600 rounded-2xl flex items-center justify-center mb-6"
            >
              <span className="text-3xl">⏳</span>
            </motion.div>

            <h2 className="text-3xl font-bold text-gray-900 dark:text-white mb-4">Waiting for Student to Start 🎓</h2>
            <p className="text-lg text-gray-600 dark:text-gray-300 mb-8">
              You've accepted the request. The student is preparing to start the session.
            </p>

            <div className="bg-yellow-50 dark:bg-yellow-900/20 rounded-xl p-6 mb-8">
              <div className="text-2xl font-bold text-yellow-600 dark:text-yellow-400 mb-2">Request Accepted ✅</div>
              <div className="text-sm text-gray-600 dark:text-gray-400 space-y-1">
                <div>
                  Student: {currentSession?.studentAddress?.slice(0, 6)}...{currentSession?.studentAddress?.slice(-4)}
                </div>
                <div>Language: {currentSession?.language}</div>
                <div>Budget: {weiPerSecondToHourlyUsd(currentSession?.budgetPerSecond)}/hr</div>
              </div>
            </div>

            {/* Pulsing indicator */}
            <motion.div
              animate={{ opacity: [0.5, 1, 0.5] }}
              transition={{ duration: 2, repeat: Infinity }}
              className="mb-8"
            >
              <div className="inline-flex items-center px-6 py-3 bg-yellow-100 dark:bg-yellow-900/30 rounded-full">
                <div className="w-3 h-3 bg-yellow-500 rounded-full mr-3 animate-pulse"></div>
                <span className="text-yellow-700 dark:text-yellow-300 font-medium">
                  Waiting for student to confirm...
                </span>
              </div>
            </motion.div>

            <button
              onClick={() => {
                // Notify the student that we're withdrawing our acceptance
                if (socket && currentSession) {
                  emit("tutor:withdraw-acceptance", {
                    requestId: currentSession.requestId,
                    tutorAddress: account?.address,
                    studentAddress: currentSession.studentAddress,
                  });
                }

                setAvailabilityState("waiting");
                setCurrentSession(null);
                toast("Returned to waiting for students");
              }}
              className="px-8 py-3 bg-gray-500 text-white rounded-xl font-medium hover:bg-gray-600 transition-all duration-200"
            >
              <span className="mr-2">⬅️</span>
              Back to Waiting
            </button>
          </div>
        </motion.div>
      </div>
    );
  }

  if (availabilityState === "in-session") {
    return (
      <div className="min-h-[calc(100vh-8rem)] bg-gradient-to-br from-blue-50 to-indigo-50 dark:from-blue-900/20 dark:to-indigo-900/20 flex items-center justify-center p-4">
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          className="max-w-2xl w-full text-center"
        >
          <div className="bg-white dark:bg-gray-800 rounded-3xl p-8 border-2 border-gray-200 dark:border-gray-700 shadow-xl">
            <div className="w-20 h-20 mx-auto bg-gradient-to-br from-blue-500 to-indigo-600 rounded-2xl flex items-center justify-center mb-6">
              <span className="text-3xl">📹</span>
            </div>

            <h2 className="text-3xl font-bold text-gray-900 dark:text-white mb-4">Session in Progress! 🎓</h2>
            <p className="text-lg text-gray-600 dark:text-gray-300 mb-8">
              You're currently teaching a student. Earnings are being tracked automatically.
            </p>

            <div className="bg-blue-50 dark:bg-blue-900/20 rounded-xl p-6 mb-8">
              <div className="text-2xl font-bold text-blue-600 dark:text-blue-400 mb-2">Session Active</div>
              <div className="text-sm text-gray-600 dark:text-gray-400">
                Student: {currentSession?.studentAddress?.slice(0, 6)}...{currentSession?.studentAddress?.slice(-4)}
              </div>
            </div>

            <button
              onClick={endSession}
              className="px-8 py-3 bg-red-500 text-white rounded-xl font-medium hover:bg-red-600 transition-all duration-200"
            >
              End Session
            </button>
          </div>
        </motion.div>
      </div>
    );
  }

  return null;
};
