"use client";

import React, { useState, useEffect } from "react";
import { useActiveAccount } from "thirdweb/react";
import { motion, AnimatePresence } from "framer-motion";
import toast from "react-hot-toast";
import { io, Socket } from "socket.io-client";

interface StudentTutorFinderProps {
  onBack?: () => void;
  onSessionStart?: (tutorData: any) => void;
}

type FinderState = "setup" | "searching" | "tutor-found" | "session-starting" | "no-tutors";

interface TutorResponse {
  requestId: string;
  tutorAddress: string;
  language: string;
  ratePerSecond: number;
  timestamp: number;
}

export const StudentTutorFinder: React.FC<StudentTutorFinderProps> = ({ 
  onBack, 
  onSessionStart 
}) => {
  const account = useActiveAccount();
  const [socket, setSocket] = useState<Socket | null>(null);
  const [isConnected, setIsConnected] = useState(false);
  const [finderState, setFinderState] = useState<FinderState>("setup");
  const [language, setLanguage] = useState("english");
  const [budgetPerSecond, setBudgetPerSecond] = useState(0.002);
  const [currentRequestId, setCurrentRequestId] = useState<string | null>(null);
  const [availableTutors, setAvailableTutors] = useState<TutorResponse[]>([]);
  const [currentTutor, setCurrentTutor] = useState<TutorResponse | null>(null);
  const [searchStartTime, setSearchStartTime] = useState<number>(0);
  const [elapsedTime, setElapsedTime] = useState(0);

  const languages = [
    { value: "english", label: "English", flag: "🇺🇸" },
    { value: "spanish", label: "Spanish", flag: "🇪🇸" },
    { value: "french", label: "French", flag: "🇫🇷" },
    { value: "german", label: "German", flag: "🇩🇪" },
    { value: "mandarin", label: "Mandarin", flag: "🇨🇳" },
    { value: "japanese", label: "Japanese", flag: "🇯🇵" },
    { value: "korean", label: "Korean", flag: "🇰🇷" },
    { value: "italian", label: "Italian", flag: "🇮🇹" },
    { value: "portuguese", label: "Portuguese", flag: "🇵🇹" },
    { value: "russian", label: "Russian", flag: "🇷🇺" },
  ];

  // Timer for elapsed search time
  useEffect(() => {
    let interval: NodeJS.Timeout;
    if (finderState === "searching" && searchStartTime > 0) {
      interval = setInterval(() => {
        setElapsedTime(Math.floor((Date.now() - searchStartTime) / 1000));
      }, 1000);
    }
    return () => {
      if (interval) clearInterval(interval);
    };
  }, [finderState, searchStartTime]);

  // Socket connection
  useEffect(() => {
    if (!account?.address) return;

    const newSocket = io(process.env.NEXT_PUBLIC_BACKEND_URL || "http://localhost:4000", {
      transports: ["websocket", "polling"],
      autoConnect: true,
    });

    newSocket.on("connect", () => {
      setIsConnected(true);
      console.log("Student socket connected:", newSocket.id);
      
      newSocket.emit("user:connect", {
        address: account.address,
        role: "student",
        timestamp: Date.now(),
      });
    });

    newSocket.on("disconnect", () => {
      setIsConnected(false);
      setFinderState("setup");
    });

    // Student-specific events
    newSocket.on("student:request-sent", (data) => {
      console.log("Request sent confirmation:", data);
      setCurrentRequestId(data.requestId);
      setFinderState("searching");
      setSearchStartTime(Date.now());
      toast.success("🔍 Searching for tutors...");
    });

    newSocket.on("student:no-tutors-available", () => {
      console.log("No tutors available initially");
      setFinderState("searching"); // Keep searching for tutors that come online
      toast("📡 No tutors online yet, broadcasting your request...", {
        duration: 3000,
      });
    });

    newSocket.on("student:tutor-accepted", (data: any) => {
      console.log("Tutor accepted:", data);
      
      // Convert backend format to TutorResponse format
      const tutorResponse: TutorResponse = {
        requestId: data.requestId,
        tutorAddress: data.tutorAddress || data.tutor?.address || "Unknown",
        language: data.language || language,
        ratePerSecond: parseFloat(data.ratePerSecond) || 0,
        timestamp: Date.now(),
      };
      
      setCurrentTutor(tutorResponse);
      setFinderState("tutor-found");
      
      toast((t: any) => (
        <div className="flex flex-col space-y-2">
          <div className="font-medium">🎉 Tutor Found!</div>
          <div className="text-sm text-gray-600">
            {tutorResponse.tutorAddress.slice(0, 6)}...{tutorResponse.tutorAddress.slice(-4)}
          </div>
          <div className="text-sm text-gray-600">
            Rate: {tutorResponse.ratePerSecond} ETH/sec
          </div>
        </div>
      ), {
        duration: 5000,
        position: "top-center",
      });
    });

    newSocket.on("student:tutor-declined", (data) => {
      console.log("Tutor declined:", data);
      toast("😔 A tutor declined, still searching...");
    });

    newSocket.on("error", (error) => {
      console.error("Socket error:", error);
      toast.error(error.message || "Connection error");
    });

    setSocket(newSocket);

    return () => {
      newSocket.disconnect();
    };
  }, [account?.address]);

  const startSearch = () => {
    if (!socket || !isConnected) {
      toast.error("Not connected to server");
      return;
    }

    const requestId = `req_${Math.random().toString(36).substr(2, 9)}`;
    
    console.log("Starting tutor search:", {
      requestId,
      studentAddress: account?.address,
      language,
      budgetPerSecond,
    });

    socket.emit("student:request-tutor", {
      requestId,
      studentAddress: account?.address,
      language,
      budgetPerSecond,
    });

    setCurrentRequestId(requestId);
    toast("🚀 Starting search...");
  };

  const acceptTutor = () => {
    if (!socket || !currentTutor || !currentRequestId) return;

    socket.emit("student:accept-tutor", {
      requestId: currentRequestId,
      tutorAddress: currentTutor.tutorAddress,
      studentAddress: account?.address,
    });

    setFinderState("session-starting");
    toast.success("🎓 Starting session with tutor!");
    
    // Simulate session start
    setTimeout(() => {
      onSessionStart?.(currentTutor);
    }, 2000);
  };

  const skipTutor = () => {
    if (!socket || !currentTutor || !currentRequestId) return;

    socket.emit("student:reject-tutor", {
      requestId: currentRequestId,
      tutorAddress: currentTutor.tutorAddress,
      studentAddress: account?.address,
    });

    setCurrentTutor(null);
    setFinderState("searching");
    toast("⏭️ Skipped tutor, continuing search...");
  };

  const cancelSearch = () => {
    if (socket && currentRequestId) {
      // Broadcast to backend that we're cancelling the search
      socket.emit("student:cancel-request", {
        requestId: currentRequestId,
        studentAddress: account?.address,
      });
      
      console.log("Cancelling search and broadcasting to backend:", currentRequestId);
    }

    setFinderState("setup");
    setCurrentRequestId(null);
    setCurrentTutor(null);
    setSearchStartTime(0);
    setElapsedTime(0);
    toast("🛑 Search cancelled");
  };

  const selectedLanguageData = languages.find(lang => lang.value === language);

  // Setup State
  if (finderState === "setup") {
    return (
      <div className="min-h-[calc(100vh-8rem)] bg-gradient-to-br from-blue-50 to-indigo-50 dark:from-blue-900/20 dark:to-indigo-900/20 flex items-center justify-center p-4">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="max-w-2xl w-full"
        >
          <div className="bg-white dark:bg-gray-800 rounded-3xl p-8 border-2 border-gray-200 dark:border-gray-700 shadow-xl">
            {/* Header */}
            <div className="text-center mb-8">
              <div className="w-20 h-20 mx-auto bg-gradient-to-br from-blue-500 to-indigo-600 rounded-2xl flex items-center justify-center mb-6">
                <span className="text-3xl">🎓</span>
              </div>
              <h2 className="text-3xl font-bold text-gray-900 dark:text-white mb-4">
                Find Your Perfect Tutor
              </h2>
              <p className="text-gray-600 dark:text-gray-300">
                Connect instantly with native speakers and start learning!
              </p>
            </div>

            {/* Language Selection */}
            <div className="mb-6">
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">
                Language to Learn
              </label>
              <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                {languages.map((lang) => (
                  <button
                    key={lang.value}
                    onClick={() => setLanguage(lang.value)}
                    className={`p-3 rounded-xl border-2 transition-all duration-200 ${
                      language === lang.value
                        ? "border-blue-500 bg-blue-50 dark:bg-blue-900/20"
                        : "border-gray-200 dark:border-gray-600 hover:border-blue-300"
                    }`}
                  >
                    <div className="text-2xl mb-1">{lang.flag}</div>
                    <div className="text-sm font-medium text-gray-900 dark:text-white">
                      {lang.label}
                    </div>
                  </button>
                ))}
              </div>
            </div>

            {/* Budget Setting */}
            <div className="mb-8">
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Your Budget (ETH per second)
              </label>
              <div className="relative">
                <input
                  type="number"
                  step="0.0001"
                  value={budgetPerSecond}
                  onChange={(e) => setBudgetPerSecond(parseFloat(e.target.value) || 0)}
                  className="w-full p-4 border-2 border-gray-200 dark:border-gray-600 rounded-xl bg-white dark:bg-gray-700 text-gray-900 dark:text-white text-lg"
                  placeholder="0.002"
                />
                <div className="absolute right-4 top-1/2 transform -translate-y-1/2 text-gray-500">
                  ETH/sec
                </div>
              </div>
              <div className="mt-2 text-sm text-gray-500">
                ≈ {(budgetPerSecond * 3600).toFixed(4)} ETH per hour
              </div>
            </div>

            {/* Connection Status */}
            <div className="mb-6 p-4 bg-gray-50 dark:bg-gray-700 rounded-xl">
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                  Server Connection
                </span>
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
                onClick={startSearch}
                disabled={!isConnected}
                className="flex-1 px-6 py-4 bg-gradient-to-r from-blue-500 to-indigo-600 text-white rounded-xl font-medium hover:shadow-lg transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <span className="mr-2">🔍</span>
                Find Tutors Now
              </button>
            </div>
          </div>
        </motion.div>
      </div>
    );
  }

  // Searching State
  if (finderState === "searching") {
    return (
      <div className="min-h-[calc(100vh-8rem)] bg-gradient-to-br from-purple-50 to-pink-50 dark:from-purple-900/20 dark:to-pink-900/20 flex items-center justify-center p-4">
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          className="max-w-2xl w-full text-center"
        >
          <div className="bg-white dark:bg-gray-800 rounded-3xl p-8 border-2 border-gray-200 dark:border-gray-700 shadow-xl">
            {/* Animated Search Indicator */}
            <div className="relative mb-8">
              {/* Outer pulsing ring */}
              <motion.div
                animate={{ scale: [1, 1.2, 1], opacity: [0.3, 0.6, 0.3] }}
                transition={{ duration: 2, repeat: Infinity }}
                className="absolute inset-0 w-40 h-40 mx-auto rounded-full bg-gradient-to-r from-purple-400 to-pink-400"
              />
              
              {/* Middle rotating ring */}
              <motion.div
                animate={{ rotate: 360 }}
                transition={{ duration: 3, repeat: Infinity, ease: "linear" }}
                className="relative w-40 h-40 mx-auto"
              >
                <div className="w-full h-full rounded-full border-4 border-transparent border-t-purple-500 border-r-pink-500"></div>
              </motion.div>
              
              {/* Inner content */}
              <div className="absolute inset-0 flex items-center justify-center">
                <motion.div
                  animate={{ 
                    scale: [1, 1.1, 1],
                    rotate: [0, 10, -10, 0]
                  }}
                  transition={{ 
                    duration: 2, 
                    repeat: Infinity,
                    ease: "easeInOut"
                  }}
                  className="w-24 h-24 bg-gradient-to-br from-purple-500 to-pink-500 rounded-full flex items-center justify-center shadow-lg"
                >
                  <motion.div
                    animate={{ scale: [1, 1.2, 1] }}
                    transition={{ duration: 1.5, repeat: Infinity }}
                    className="text-3xl"
                  >
                    {selectedLanguageData?.flag}
                  </motion.div>
                </motion.div>
              </div>
              
              {/* Floating search icons */}
              {[...Array(8)].map((_, i) => (
                <motion.div
                  key={i}
                  animate={{
                    y: [0, -30, 0],
                    opacity: [0.2, 1, 0.2],
                    rotate: [0, 360],
                  }}
                  transition={{
                    duration: 3 + i * 0.2,
                    repeat: Infinity,
                    delay: i * 0.4,
                  }}
                  className="absolute w-6 h-6 text-2xl"
                  style={{
                    left: `${20 + (i * 10)}%`,
                    top: `${20 + (i % 2) * 60}%`,
                  }}
                >
                  {i % 4 === 0 ? "🔍" : i % 4 === 1 ? "👨‍🏫" : i % 4 === 2 ? "🌐" : "💬"}
                </motion.div>
              ))}
            </div>

            <h2 className="text-3xl font-bold text-gray-900 dark:text-white mb-4">
              Finding Your Tutor... 🔍
            </h2>
            
            <p className="text-lg text-gray-600 dark:text-gray-300 mb-6">
              Searching for <span className="font-semibold text-purple-600">{selectedLanguageData?.label}</span> tutors
              <br />
              Budget: <span className="font-semibold">{budgetPerSecond} ETH/sec</span>
            </p>

            {/* Search Progress */}
            <div className="mb-8">
              <div className="flex justify-center items-center space-x-4 mb-4">
                <div className="flex space-x-1">
                  {[...Array(3)].map((_, i) => (
                    <motion.div
                      key={i}
                      animate={{
                        scaleY: [0.5, 2, 0.5],
                      }}
                      transition={{
                        duration: 1,
                        repeat: Infinity,
                        delay: i * 0.2,
                      }}
                      className="w-1 h-6 bg-gradient-to-t from-purple-400 to-pink-500 rounded-full"
                    />
                  ))}
                </div>
                <span className="text-purple-600 dark:text-purple-400 font-medium">
                  Broadcasting to all tutors...
                </span>
                <div className="flex space-x-1">
                  {[...Array(3)].map((_, i) => (
                    <motion.div
                      key={i + 3}
                      animate={{
                        scaleY: [0.5, 2, 0.5],
                      }}
                      transition={{
                        duration: 1,
                        repeat: Infinity,
                        delay: (i + 3) * 0.2,
                      }}
                      className="w-1 h-6 bg-gradient-to-t from-purple-400 to-pink-500 rounded-full"
                    />
                  ))}
                </div>
              </div>
              
              <div className="text-sm text-gray-500">
                Search time: {Math.floor(elapsedTime / 60)}:{(elapsedTime % 60).toString().padStart(2, '0')}
              </div>
            </div>

            {/* Status Messages */}
            <motion.div
              animate={{ opacity: [0.7, 1, 0.7] }}
              transition={{ duration: 2, repeat: Infinity }}
              className="mb-8"
            >
              <div className="inline-flex items-center px-6 py-3 bg-purple-100 dark:bg-purple-900/30 rounded-full">
                <div className="w-3 h-3 bg-purple-500 rounded-full mr-3 animate-pulse"></div>
                <span className="text-purple-700 dark:text-purple-300 font-medium">
                  {elapsedTime < 10 
                    ? "Searching available tutors..." 
                    : elapsedTime < 30 
                    ? "Notifying tutors who come online..." 
                    : "Broadcasting to new tutors..."}
                </span>
              </div>
            </motion.div>

            {/* Cancel Button */}
            <button
              onClick={cancelSearch}
              className="px-8 py-3 bg-red-500 text-white rounded-xl font-medium hover:bg-red-600 transition-all duration-200"
            >
              <span className="mr-2">❌</span>
              Cancel Search
            </button>
          </div>
        </motion.div>
      </div>
    );
  }

  // Tutor Found State
  if (finderState === "tutor-found" && currentTutor) {
    return (
      <div className="min-h-[calc(100vh-8rem)] bg-gradient-to-br from-green-50 to-emerald-50 dark:from-green-900/20 dark:to-emerald-900/20 flex items-center justify-center p-4">
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          className="max-w-2xl w-full text-center"
        >
          <div className="bg-white dark:bg-gray-800 rounded-3xl p-8 border-2 border-gray-200 dark:border-gray-700 shadow-xl">
            {/* Success Animation */}
            <motion.div
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              transition={{ type: "spring", duration: 0.6 }}
              className="w-32 h-32 mx-auto mb-8 bg-gradient-to-br from-green-400 to-emerald-500 rounded-full flex items-center justify-center"
            >
              <motion.div
                animate={{ rotate: [0, 10, -10, 0] }}
                transition={{ duration: 2, repeat: Infinity }}
                className="text-5xl"
              >
                🎉
              </motion.div>
            </motion.div>

            <h2 className="text-3xl font-bold text-gray-900 dark:text-white mb-4">
              Perfect Match Found! 🎓
            </h2>

            {/* Tutor Info */}
            <div className="bg-green-50 dark:bg-green-900/20 rounded-xl p-6 mb-8">
              <div className="flex items-center justify-center space-x-4 mb-4">
                <div className="w-16 h-16 bg-gradient-to-br from-green-500 to-emerald-600 rounded-full flex items-center justify-center">
                  <span className="text-2xl">👨‍🏫</span>
                </div>
                <div>
                  <div className="text-lg font-bold text-gray-900 dark:text-white">
                    {currentTutor.tutorAddress.slice(0, 6)}...{currentTutor.tutorAddress.slice(-4)}
                  </div>
                  <div className="text-sm text-gray-600 dark:text-gray-400">
                    Native {selectedLanguageData?.label} Speaker
                  </div>
                </div>
              </div>
              
              <div className="grid grid-cols-2 gap-4 text-center">
                <div>
                  <div className="text-2xl font-bold text-green-600 dark:text-green-400">
                    {currentTutor.ratePerSecond}
                  </div>
                  <div className="text-xs text-gray-500">ETH/sec</div>
                </div>
                <div>
                  <div className="text-2xl font-bold text-green-600 dark:text-green-400">
                    {(currentTutor.ratePerSecond * 3600).toFixed(4)}
                  </div>
                  <div className="text-xs text-gray-500">ETH/hour</div>
                </div>
              </div>
            </div>

            <p className="text-lg text-gray-600 dark:text-gray-300 mb-8">
              This tutor is ready to start your {selectedLanguageData?.label} lesson right now!
            </p>

            {/* Action Buttons */}
            <div className="flex space-x-4">
              <button
                onClick={skipTutor}
                className="flex-1 px-6 py-4 border-2 border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 rounded-xl font-medium hover:bg-gray-50 dark:hover:bg-gray-700 transition-all duration-200"
              >
                <span className="mr-2">⏭️</span>
                Skip & Find Another
              </button>
              <button
                onClick={acceptTutor}
                className="flex-1 px-6 py-4 bg-gradient-to-r from-green-500 to-emerald-600 text-white rounded-xl font-medium hover:shadow-lg transition-all duration-200"
              >
                <span className="mr-2">🚀</span>
                Start Session Now
              </button>
            </div>
          </div>
        </motion.div>
      </div>
    );
  }

  // Session Starting State
  if (finderState === "session-starting") {
    return (
      <div className="min-h-[calc(100vh-8rem)] bg-gradient-to-br from-blue-50 to-indigo-50 dark:from-blue-900/20 dark:to-indigo-900/20 flex items-center justify-center p-4">
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          className="max-w-2xl w-full text-center"
        >
          <div className="bg-white dark:bg-gray-800 rounded-3xl p-8 border-2 border-gray-200 dark:border-gray-700 shadow-xl">
            <motion.div
              animate={{ rotate: 360 }}
              transition={{ duration: 2, repeat: Infinity, ease: "linear" }}
              className="w-20 h-20 mx-auto bg-gradient-to-br from-blue-500 to-indigo-600 rounded-2xl flex items-center justify-center mb-6"
            >
              <span className="text-3xl">📹</span>
            </motion.div>

            <h2 className="text-3xl font-bold text-gray-900 dark:text-white mb-4">
              Starting Your Session! 🎓
            </h2>
            <p className="text-lg text-gray-600 dark:text-gray-300 mb-8">
              Connecting you with your tutor...
            </p>

            <motion.div
              animate={{ scale: [1, 1.05, 1] }}
              transition={{ duration: 2, repeat: Infinity }}
              className="inline-flex items-center px-6 py-3 bg-blue-100 dark:bg-blue-900/30 rounded-full"
            >
              <div className="w-3 h-3 bg-blue-500 rounded-full mr-3 animate-pulse"></div>
              <span className="text-blue-700 dark:text-blue-300 font-medium">
                Preparing video call...
              </span>
            </motion.div>
          </div>
        </motion.div>
      </div>
    );
  }

  return null;
};