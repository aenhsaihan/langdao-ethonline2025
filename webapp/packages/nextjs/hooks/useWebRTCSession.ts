import { useEffect, useState, useCallback } from 'react';
import { useSocket } from '~~/lib/socket/socketContext';
import { useScaffoldWriteContract } from '~~/hooks/scaffold-eth';

interface SessionData {
  requestId: string;
  tutorAddress: string;
  studentAddress: string;
  languageId: number;
  startTime?: number;
}

interface WebRTCSessionState {
  currentSession: SessionData | null;
  isSessionActive: boolean;
  sessionDuration: number;
  showEndSessionPrompt: boolean;
  isEndingSession: boolean;
}

export const useWebRTCSession = () => {
  const { socket } = useSocket();
  const [state, setState] = useState<WebRTCSessionState>({
    currentSession: null,
    isSessionActive: false,
    sessionDuration: 0,
    showEndSessionPrompt: false,
    isEndingSession: false,
  });

  const { writeContractAsync: endSessionWrite } = useScaffoldWriteContract("LangDAO");

  // Initialize session from sessionStorage on mount
  useEffect(() => {
    const pendingSession = sessionStorage.getItem('pendingSession');
    if (pendingSession) {
      try {
        const sessionData = JSON.parse(pendingSession);
        // Check if session is too old (more than 2 hours)
        const sessionAge = Date.now() - (sessionData.startTime || 0);
        const TWO_HOURS = 2 * 60 * 60 * 1000;
        
        if (sessionAge > TWO_HOURS) {
          console.log('Session too old, clearing...');
          sessionStorage.removeItem('pendingSession');
          return;
        }
        
        setState(prev => ({
          ...prev,
          currentSession: { ...sessionData, startTime: sessionData.startTime || Date.now() },
          isSessionActive: true,
        }));
      } catch (error) {
        console.error('Failed to parse pending session:', error);
        sessionStorage.removeItem('pendingSession');
      }
    }
  }, []);

  // Session duration timer
  useEffect(() => {
    let interval: NodeJS.Timeout;
    
    if (state.isSessionActive && state.currentSession?.startTime) {
      interval = setInterval(() => {
        setState(prev => ({
          ...prev,
          sessionDuration: Math.floor((Date.now() - (prev.currentSession?.startTime || 0)) / 1000),
        }));
      }, 1000);
    }

    return () => {
      if (interval) clearInterval(interval);
    };
  }, [state.isSessionActive, state.currentSession?.startTime]);

  // Socket event listeners
  useEffect(() => {
    if (!socket) return;

    const handleSessionEnded = (data: any) => {
      console.log('WebRTC session ended:', data);
      setState(prev => ({
        ...prev,
        showEndSessionPrompt: true,
      }));
    };

    const handleUserDisconnected = (data: any) => {
      console.log('User disconnected:', data);
      if (data.reason === 'connection-lost') {
        // Grace period for reconnection
        setTimeout(() => {
          setState(prev => ({
            ...prev,
            showEndSessionPrompt: true,
          }));
        }, 30000); // 30 second grace period
      } else {
        setState(prev => ({
          ...prev,
          showEndSessionPrompt: true,
        }));
      }
    };

    const handleHeartbeatTimeout = (data: any) => {
      console.log('Heartbeat timeout:', data);
      setState(prev => ({
        ...prev,
        showEndSessionPrompt: true,
      }));
    };

    socket.on('webrtc:session-ended', handleSessionEnded);
    socket.on('webrtc:user-disconnected', handleUserDisconnected);
    socket.on('webrtc:heartbeat-timeout', handleHeartbeatTimeout);

    return () => {
      socket.off('webrtc:session-ended', handleSessionEnded);
      socket.off('webrtc:user-disconnected', handleUserDisconnected);
      socket.off('webrtc:heartbeat-timeout', handleHeartbeatTimeout);
    };
  }, [socket]);

  const endSession = useCallback(async () => {
    if (!state.currentSession || state.isEndingSession) return;

    setState(prev => ({ ...prev, isEndingSession: true }));

    try {
      // Call smart contract to end session
      const tx = await endSessionWrite({
        functionName: "endSession",
        args: [state.currentSession.tutorAddress],
      });

      // Notify backend of completion
      const response = await fetch(`${process.env.NEXT_PUBLIC_BACKEND_URL}/api/webrtc-session-ended`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          sessionId: state.currentSession.requestId,
          userAddress: state.currentSession.studentAddress,
          transactionHash: tx,
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to notify backend');
      }

      // Clean up local state
      setState(prev => ({
        ...prev,
        currentSession: null,
        isSessionActive: false,
        sessionDuration: 0,
        showEndSessionPrompt: false,
        isEndingSession: false,
      }));

      sessionStorage.removeItem('pendingSession');
      
      console.log('Session ended successfully');
    } catch (error) {
      console.error('Failed to end session:', error);
      setState(prev => ({ ...prev, isEndingSession: false }));
      throw error;
    }
  }, [state.currentSession, state.isEndingSession, endSessionWrite]);

  const dismissPrompt = useCallback(() => {
    setState(prev => ({ ...prev, showEndSessionPrompt: false }));
  }, []);

  const startSession = useCallback((sessionData: SessionData) => {
    const sessionWithTime = { ...sessionData, startTime: Date.now() };
    sessionStorage.setItem('pendingSession', JSON.stringify(sessionWithTime));
    setState(prev => ({
      ...prev,
      currentSession: sessionWithTime,
      isSessionActive: true,
      sessionDuration: 0,
    }));
  }, []);

  return {
    ...state,
    endSession,
    dismissPrompt,
    startSession,
  };
};