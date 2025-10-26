"use client";

import React from 'react';
import { useWebRTCSession } from '~~/hooks/useWebRTCSession';

interface WebRTCSessionEndPromptProps {
  isOpen: boolean;
  onClose: () => void;
}

export const WebRTCSessionEndPrompt: React.FC<WebRTCSessionEndPromptProps> = ({
  isOpen,
  onClose,
}) => {
  const { currentSession, sessionDuration, endSession, isEndingSession } = useWebRTCSession();

  if (!isOpen || !currentSession) return null;

  const formatDuration = (seconds: number) => {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const secs = seconds % 60;
    
    if (hours > 0) {
      return `${hours}h ${minutes}m ${secs}s`;
    }
    return `${minutes}m ${secs}s`;
  };

  const handleEndSession = async () => {
    try {
      await endSession();
      onClose();
    } catch (error) {
      console.error('Failed to end session:', error);
      // Keep modal open on error
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white dark:bg-gray-800 rounded-lg p-6 max-w-md w-full mx-4 shadow-xl">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-semibold text-gray-900 dark:text-white">
            Session Ended
          </h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
            disabled={isEndingSession}
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <div className="mb-6">
          <div className="bg-gray-50 dark:bg-gray-700 rounded-lg p-4 mb-4">
            <h3 className="font-medium text-gray-900 dark:text-white mb-2">Session Details</h3>
            <div className="space-y-2 text-sm text-gray-600 dark:text-gray-300">
              <div className="flex justify-between">
                <span>Duration:</span>
                <span className="font-medium">{formatDuration(sessionDuration)}</span>
              </div>
              <div className="flex justify-between">
                <span>Session ID:</span>
                <span className="font-mono text-xs">{currentSession.requestId.slice(0, 8)}...</span>
              </div>
              <div className="flex justify-between">
                <span>Tutor:</span>
                <span className="font-mono text-xs">{currentSession.tutorAddress.slice(0, 8)}...</span>
              </div>
            </div>
          </div>

          <div className="text-sm text-gray-600 dark:text-gray-300 mb-4">
            <p className="mb-2">
              Your tutoring session has ended. To complete the session and pay your tutor, 
              please confirm the blockchain transaction below.
            </p>
            <p className="text-xs text-gray-500 dark:text-gray-400">
              Payment will be calculated based on your session duration and sent directly to your tutor.
            </p>
          </div>
        </div>

        <div className="flex space-x-3">
          <button
            onClick={onClose}
            disabled={isEndingSession}
            className="flex-1 px-4 py-2 text-gray-700 dark:text-gray-300 bg-gray-100 dark:bg-gray-600 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-500 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={handleEndSession}
            disabled={isEndingSession}
            className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center justify-center"
          >
            {isEndingSession ? (
              <>
                <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
                Processing...
              </>
            ) : (
              'End Session & Pay'
            )}
          </button>
        </div>
      </div>
    </div>
  );
};