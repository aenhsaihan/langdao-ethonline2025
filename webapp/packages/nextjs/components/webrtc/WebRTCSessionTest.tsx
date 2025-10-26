"use client";

import React, { useState } from 'react';
import { useWebRTCSession } from '~~/hooks/useWebRTCSession';
import { useSocket } from '~~/lib/socket/socketContext';

export const WebRTCSessionTest: React.FC = () => {
  const { currentSession, isSessionActive, sessionDuration, startSession, endSession } = useWebRTCSession();
  const { socket } = useSocket();
  const [isCreatingSession, setIsCreatingSession] = useState(false);

  const createMockSession = () => {
    setIsCreatingSession(true);
    
    const mockSession = {
      requestId: `test_session_${Date.now()}`,
      tutorAddress: '0x742d35Cc6634C0532925a3b8D0C9C0E3C5d5c8eA', // Mock address
      studentAddress: '0x8ba1f109551bD432803012645Hac136c30C6A0', // Mock address
      languageId: 1,
    };

    startSession(mockSession);
    setIsCreatingSession(false);
  };

  const simulateSessionEnd = () => {
    if (!socket) return;
    
    socket.emit('webrtc:session-ended', {
      sessionId: currentSession?.requestId,
      tutorAddress: currentSession?.tutorAddress,
      studentAddress: currentSession?.studentAddress,
      endedBy: 'user',
      reason: 'manual',
    });
  };

  const simulateDisconnection = () => {
    if (!socket) return;
    
    socket.emit('webrtc:user-disconnected', {
      sessionId: currentSession?.requestId,
      disconnectedUser: currentSession?.studentAddress,
      reason: 'connection-lost',
    });
  };

  const simulateTimeout = () => {
    if (!socket) return;
    
    socket.emit('webrtc:heartbeat-timeout', {
      sessionId: currentSession?.requestId,
      lastHeartbeat: Date.now() - 60000, // 1 minute ago
      timeoutDuration: 30000, // 30 seconds
    });
  };

  const formatDuration = (seconds: number) => {
    const minutes = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${minutes}m ${secs}s`;
  };

  return (
    <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-6">
      <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-4">
        WebRTC Session Test
      </h2>
      
      <div className="space-y-4">
        {/* Session Status */}
        <div className="bg-gray-50 dark:bg-gray-700 rounded-lg p-4">
          <h3 className="font-medium text-gray-900 dark:text-white mb-2">Current Session</h3>
          {isSessionActive && currentSession ? (
            <div className="space-y-2 text-sm text-gray-600 dark:text-gray-300">
              <div className="flex justify-between">
                <span>Status:</span>
                <span className="text-green-600 dark:text-green-400 font-medium">Active</span>
              </div>
              <div className="flex justify-between">
                <span>Duration:</span>
                <span className="font-mono">{formatDuration(sessionDuration)}</span>
              </div>
              <div className="flex justify-between">
                <span>Session ID:</span>
                <span className="font-mono text-xs">{currentSession.requestId}</span>
              </div>
              <div className="flex justify-between">
                <span>Tutor:</span>
                <span className="font-mono text-xs">{currentSession.tutorAddress}</span>
              </div>
            </div>
          ) : (
            <p className="text-gray-500 dark:text-gray-400 text-sm">No active session</p>
          )}
        </div>

        {/* Controls */}
        <div className="space-y-3">
          <h3 className="font-medium text-gray-900 dark:text-white">Test Controls</h3>
          
          {!isSessionActive ? (
            <button
              onClick={createMockSession}
              disabled={isCreatingSession}
              className="w-full px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              {isCreatingSession ? 'Creating...' : 'Create Mock Session'}
            </button>
          ) : (
            <div className="grid grid-cols-2 gap-2">
              <button
                onClick={simulateSessionEnd}
                className="px-3 py-2 bg-orange-600 text-white rounded-lg hover:bg-orange-700 transition-colors text-sm"
              >
                Simulate End
              </button>
              <button
                onClick={simulateDisconnection}
                className="px-3 py-2 bg-yellow-600 text-white rounded-lg hover:bg-yellow-700 transition-colors text-sm"
              >
                Simulate Disconnect
              </button>
              <button
                onClick={simulateTimeout}
                className="px-3 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors text-sm"
              >
                Simulate Timeout
              </button>
              <button
                onClick={endSession}
                className="px-3 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition-colors text-sm"
              >
                Manual End
              </button>
            </div>
          )}
        </div>

        {/* Instructions */}
        <div className="bg-blue-50 dark:bg-blue-900/20 rounded-lg p-4">
          <h4 className="font-medium text-blue-900 dark:text-blue-100 mb-2">Test Instructions</h4>
          <ul className="text-sm text-blue-800 dark:text-blue-200 space-y-1">
            <li>1. Create a mock session to start testing</li>
            <li>2. Use simulation buttons to trigger different end scenarios</li>
            <li>3. Check that prompts appear and blockchain transactions work</li>
            <li>4. Verify session cleanup after completion</li>
          </ul>
        </div>

        {/* Socket Status */}
        <div className="text-xs text-gray-500 dark:text-gray-400">
          Socket Status: {socket?.connected ? (
            <span className="text-green-600 dark:text-green-400">Connected</span>
          ) : (
            <span className="text-red-600 dark:text-red-400">Disconnected</span>
          )}
        </div>
      </div>
    </div>
  );
};