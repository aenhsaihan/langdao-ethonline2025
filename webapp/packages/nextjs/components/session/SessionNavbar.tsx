"use client";

import React, { useState } from 'react';
import { useSession } from '~~/lib/socket/sessionContext';
import { 
  ClockIcon, 
  CurrencyDollarIcon, 
  ExclamationTriangleIcon,
  XMarkIcon,
  ArrowUpIcon
} from '@heroicons/react/24/outline';
import Link from 'next/link';

export const SessionNavbar: React.FC = () => {
  const { activeSession, sessionStats, isInSession, userRole, endSession } = useSession();
  const [showEndConfirm, setShowEndConfirm] = useState(false);

  if (!isInSession || !activeSession || !sessionStats) {
    return null;
  }

  const formatTime = (seconds: number): string => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const getStatusColor = (): string => {
    if (sessionStats.isCriticalBalance) return 'bg-red-500';
    if (sessionStats.isLowBalance) return 'bg-yellow-500';
    return 'bg-green-500';
  };

  const getStatusText = (): string => {
    if (sessionStats.isCriticalBalance) return 'Critical';
    if (sessionStats.isLowBalance) return 'Low Balance';
    return 'Active';
  };

  const handleEndSession = () => {
    endSession();
    setShowEndConfirm(false);
  };

  return (
    <>
      {/* Session Navbar - Fixed at top */}
      <div className={`fixed top-0 left-0 right-0 z-50 shadow-lg transition-all duration-300 ${
        sessionStats.isCriticalBalance 
          ? 'bg-red-50 dark:bg-red-900/20 border-b-2 border-red-500 animate-pulse' 
          : sessionStats.isLowBalance 
          ? 'bg-yellow-50 dark:bg-yellow-900/20 border-b-2 border-yellow-500'
          : 'bg-white dark:bg-gray-900 border-b border-gray-200 dark:border-gray-700'
      }`}>
        <div className="container mx-auto px-4 py-2">
          <div className="flex items-center justify-between flex-wrap gap-2">
            
            {/* Status Indicator */}
            <div className="flex items-center gap-2">
              <div className={`w-3 h-3 rounded-full ${getStatusColor()} ${
                sessionStats.isCriticalBalance ? 'animate-pulse' : ''
              }`} />
              <span className="text-sm font-semibold">
                {getStatusText()}
              </span>
              <span className="text-xs text-gray-500 dark:text-gray-400">
                ({userRole === 'tutor' ? '👨‍🏫 Tutor' : '👨‍🎓 Student'})
              </span>
            </div>

            {/* Session Info */}
            <div className="flex items-center gap-4 flex-wrap">
              
              {/* Time Elapsed */}
              <div className="flex items-center gap-1.5 bg-gray-100 dark:bg-gray-800 px-3 py-1.5 rounded-lg">
                <ClockIcon className="w-4 h-4 text-blue-500" />
                <div className="flex flex-col">
                  <span className="text-xs text-gray-500 dark:text-gray-400">Elapsed</span>
                  <span className="text-sm font-mono font-bold">
                    {formatTime(sessionStats.elapsedTime)}
                  </span>
                </div>
              </div>

              {/* Time Remaining */}
              <div className="flex items-center gap-1.5 bg-gray-100 dark:bg-gray-800 px-3 py-1.5 rounded-lg">
                <ClockIcon className="w-4 h-4 text-purple-500" />
                <div className="flex flex-col">
                  <span className="text-xs text-gray-500 dark:text-gray-400">Remaining</span>
                  <span className={`text-sm font-mono font-bold ${
                    sessionStats.timeRemaining < 300 ? 'text-red-500' : ''
                  }`}>
                    {formatTime(sessionStats.timeRemaining)}
                  </span>
                </div>
              </div>

              {/* Cost */}
              <div className="flex items-center gap-1.5 bg-gray-100 dark:bg-gray-800 px-3 py-1.5 rounded-lg">
                <CurrencyDollarIcon className="w-4 h-4 text-green-500" />
                <div className="flex flex-col">
                  <span className="text-xs text-gray-500 dark:text-gray-400">Total Cost</span>
                  <span className="text-sm font-mono font-bold">
                    {sessionStats.totalCost.toFixed(4)} ETH
                  </span>
                </div>
              </div>

              {/* Balance (Student only) */}
              {userRole === 'student' && (
                <div className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg ${
                  sessionStats.isCriticalBalance 
                    ? 'bg-red-100 dark:bg-red-900/30 border border-red-500'
                    : sessionStats.isLowBalance
                    ? 'bg-yellow-100 dark:bg-yellow-900/30 border border-yellow-500'
                    : 'bg-gray-100 dark:bg-gray-800'
                }`}>
                  <CurrencyDollarIcon className={`w-4 h-4 ${
                    sessionStats.isCriticalBalance ? 'text-red-500' : 
                    sessionStats.isLowBalance ? 'text-yellow-500' : 'text-green-500'
                  }`} />
                  <div className="flex flex-col">
                    <span className="text-xs text-gray-500 dark:text-gray-400">Balance</span>
                    <span className={`text-sm font-mono font-bold ${
                      sessionStats.isCriticalBalance ? 'text-red-600 dark:text-red-400' :
                      sessionStats.isLowBalance ? 'text-yellow-600 dark:text-yellow-400' : ''
                    }`}>
                      {sessionStats.currentBalance.toFixed(4)} ETH
                    </span>
                  </div>
                </div>
              )}

              {/* Rate Info */}
              <div className="flex items-center gap-1.5 bg-gray-100 dark:bg-gray-800 px-3 py-1.5 rounded-lg">
                <div className="flex flex-col">
                  <span className="text-xs text-gray-500 dark:text-gray-400">Rate</span>
                  <span className="text-sm font-mono">
                    {sessionStats.costPerMinute.toFixed(4)}/min
                  </span>
                </div>
              </div>
            </div>

            {/* Actions */}
            <div className="flex items-center gap-2">
              {/* Low Balance Warning */}
              {userRole === 'student' && sessionStats.isLowBalance && (
                <Link 
                  href="/dashboard"
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg font-semibold transition-all ${
                    sessionStats.isCriticalBalance
                      ? 'bg-red-500 hover:bg-red-600 text-white animate-pulse'
                      : 'bg-yellow-500 hover:bg-yellow-600 text-white'
                  }`}
                >
                  <ExclamationTriangleIcon className="w-4 h-4" />
                  <span className="text-sm">Top Up</span>
                  <ArrowUpIcon className="w-3 h-3" />
                </Link>
              )}

              {/* End Session Button */}
              <button
                onClick={() => setShowEndConfirm(true)}
                className="flex items-center gap-1.5 px-3 py-1.5 bg-red-500 hover:bg-red-600 text-white rounded-lg font-semibold transition-all"
              >
                <XMarkIcon className="w-4 h-4" />
                <span className="text-sm">End Session</span>
              </button>
            </div>
          </div>

          {/* Low Balance Alert Banner */}
          {userRole === 'student' && sessionStats.isCriticalBalance && (
            <div className="mt-2 bg-red-100 dark:bg-red-900/30 border border-red-500 rounded-lg p-3">
              <div className="flex items-center gap-2">
                <ExclamationTriangleIcon className="w-5 h-5 text-red-500 flex-shrink-0 animate-pulse" />
                <div className="flex-1">
                  <p className="text-sm font-bold text-red-700 dark:text-red-300">
                    Critical: Your balance is very low!
                  </p>
                  <p className="text-xs text-red-600 dark:text-red-400">
                    Your session will end automatically when your balance reaches zero. Please top up immediately to continue.
                  </p>
                </div>
                <Link
                  href="/dashboard"
                  className="px-4 py-2 bg-red-500 hover:bg-red-600 text-white rounded-lg font-semibold text-sm whitespace-nowrap"
                >
                  Top Up Now
                </Link>
              </div>
            </div>
          )}

          {userRole === 'student' && sessionStats.isLowBalance && !sessionStats.isCriticalBalance && (
            <div className="mt-2 bg-yellow-100 dark:bg-yellow-900/30 border border-yellow-500 rounded-lg p-2">
              <div className="flex items-center gap-2">
                <ExclamationTriangleIcon className="w-4 h-4 text-yellow-600 flex-shrink-0" />
                <p className="text-xs text-yellow-700 dark:text-yellow-300">
                  Your balance is running low. Consider topping up to avoid session interruption.
                </p>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Spacer to prevent content from being hidden under fixed navbar */}
      <div className={`${
        sessionStats.isCriticalBalance || sessionStats.isLowBalance ? 'h-32' : 'h-20'
      }`} />

      {/* End Session Confirmation Modal */}
      {showEndConfirm && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-[60] p-4">
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-2xl max-w-md w-full p-6">
            <h3 className="text-xl font-bold mb-4">End Session?</h3>
            <p className="text-gray-600 dark:text-gray-300 mb-6">
              Are you sure you want to end this session? 
              {sessionStats && (
                <span className="block mt-2 text-sm">
                  <strong>Duration:</strong> {formatTime(sessionStats.elapsedTime)}<br />
                  <strong>Total Cost:</strong> {sessionStats.totalCost.toFixed(4)} ETH
                </span>
              )}
            </p>
            <div className="flex gap-3">
              <button
                onClick={() => setShowEndConfirm(false)}
                className="flex-1 px-4 py-2 bg-gray-200 hover:bg-gray-300 dark:bg-gray-700 dark:hover:bg-gray-600 rounded-lg font-semibold transition-all"
              >
                Cancel
              </button>
              <button
                onClick={handleEndSession}
                className="flex-1 px-4 py-2 bg-red-500 hover:bg-red-600 text-white rounded-lg font-semibold transition-all"
              >
                End Session
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
};
