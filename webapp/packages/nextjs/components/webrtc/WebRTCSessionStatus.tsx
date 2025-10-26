"use client";

import React from 'react';
import { useWebRTCSession } from '~~/hooks/useWebRTCSession';

export const WebRTCSessionStatus: React.FC = () => {
  const { currentSession, isSessionActive, sessionDuration, endSession, isEndingSession } = useWebRTCSession();

  if (!isSessionActive || !currentSession) return null;

  const formatDuration = (seconds: number) => {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const secs = seconds % 60;
    
    if (hours > 0) {
      return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
    }
    return `${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  const handleEndSession = async () => {
    try {
      await endSession();
    } catch (error) {
      console.error('Failed to end session:', error);
    }
  };

  return (
    <div className="fixed top-4 right-4 z-40 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg shadow-lg p-4 min-w-[280px]">
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center space-x-2">
          <div className="w-3 h-3 bg-green-500 rounded-full animate-pulse"></div>
          <span className="text-sm font-medium text-gray-900 dark:text-white">
            Session Active
          </span>
        </div>
        <button
          onClick={handleEndSession}
          disabled={isEndingSession}
          className="text-xs px-2 py-1 bg-red-100 dark:bg-red-900 text-red-700 dark:text-red-300 rounded hover:bg-red-200 dark:hover:bg-red-800 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
        >
          {isEndingSession ? 'Ending...' : 'End Session'}
        </button>
      </div>
      
      <div className="space-y-1 text-xs text-gray-600 dark:text-gray-300">
        <div className="flex justify-between">
          <span>Duration:</span>
          <span className="font-mono font-medium text-gray-900 dark:text-white">
            {formatDuration(sessionDuration)}
          </span>
        </div>
        <div className="flex justify-between">
          <span>Session ID:</span>
          <span className="font-mono">
            {currentSession.requestId.slice(0, 8)}...
          </span>
        </div>
        <div className="flex justify-between">
          <span>Tutor:</span>
          <span className="font-mono">
            {currentSession.tutorAddress.slice(0, 6)}...{currentSession.tutorAddress.slice(-4)}
          </span>
        </div>
      </div>

      <div className="mt-3 pt-2 border-t border-gray-200 dark:border-gray-600">
        <div className="flex items-center space-x-1 text-xs text-gray-500 dark:text-gray-400">
          <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          <span>Payment will be processed when session ends</span>
        </div>
      </div>
    </div>
  );
};