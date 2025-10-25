"use client";

import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { useSocket } from './socketContext';
import { useActiveAccount } from 'thirdweb/react';
import toast from 'react-hot-toast';

export interface SessionData {
  sessionId: string;
  tutorAddress: string;
  studentAddress: string;
  language: string;
  ratePerSecond: number;
  startTime: number;
  estimatedDuration: number; // in seconds
  studentBalance: number;
  tutorName?: string;
  studentName?: string;
}

export interface SessionStats {
  elapsedTime: number; // seconds
  timeRemaining: number; // seconds
  totalCost: number;
  currentBalance: number;
  costPerMinute: number;
  isLowBalance: boolean;
  isCriticalBalance: boolean;
}

interface SessionContextType {
  activeSession: SessionData | null;
  sessionStats: SessionStats | null;
  isInSession: boolean;
  userRole: 'tutor' | 'student' | null;
  startSession: (data: SessionData) => void;
  endSession: () => void;
  updateBalance: (newBalance: number) => void;
}

const SessionContext = createContext<SessionContextType | null>(null);

export const useSession = () => {
  const context = useContext(SessionContext);
  if (!context) {
    throw new Error('useSession must be used within a SessionProvider');
  }
  return context;
};

interface SessionProviderProps {
  children: React.ReactNode;
}

const LOW_BALANCE_THRESHOLD = 0.2; // 20% of estimated cost
const CRITICAL_BALANCE_THRESHOLD = 0.1; // 10% of estimated cost

export const SessionProvider: React.FC<SessionProviderProps> = ({ children }) => {
  const [activeSession, setActiveSession] = useState<SessionData | null>(null);
  const [sessionStats, setSessionStats] = useState<SessionStats | null>(null);
  const [userRole, setUserRole] = useState<'tutor' | 'student' | null>(null);
  const { socket, isConnected } = useSocket();
  const account = useActiveAccount();

  // Calculate session stats in real-time
  useEffect(() => {
    if (!activeSession) {
      setSessionStats(null);
      return;
    }

    const updateStats = () => {
      const now = Date.now();
      const elapsedMs = now - activeSession.startTime;
      const elapsedTime = Math.floor(elapsedMs / 1000);
      
      const totalCost = (elapsedTime * activeSession.ratePerSecond);
      const currentBalance = activeSession.studentBalance - totalCost;
      
      const estimatedTotalCost = activeSession.estimatedDuration * activeSession.ratePerSecond;
      const timeRemaining = Math.max(0, activeSession.estimatedDuration - elapsedTime);
      
      const isLowBalance = currentBalance < (estimatedTotalCost * LOW_BALANCE_THRESHOLD);
      const isCriticalBalance = currentBalance < (estimatedTotalCost * CRITICAL_BALANCE_THRESHOLD) || currentBalance <= 0;

      const costPerMinute = activeSession.ratePerSecond * 60;

      setSessionStats({
        elapsedTime,
        timeRemaining,
        totalCost,
        currentBalance: Math.max(0, currentBalance),
        costPerMinute,
        isLowBalance,
        isCriticalBalance,
      });

      // Auto-end session if balance depleted
      if (isCriticalBalance && currentBalance <= 0) {
        toast.error('Session ended: Balance depleted');
        endSession();
      }
    };

    // Update every second
    updateStats();
    const interval = setInterval(updateStats, 1000);

    return () => clearInterval(interval);
  }, [activeSession]);

  // Socket event listeners
  useEffect(() => {
    if (!socket || !isConnected) return;

    // Session started
    socket.on('session:started', (data: SessionData) => {
      console.log('Session started:', data);
      setActiveSession(data);
      
      // Determine user role
      if (account?.address?.toLowerCase() === data.tutorAddress.toLowerCase()) {
        setUserRole('tutor');
        toast.success('Session started - You are the tutor');
      } else if (account?.address?.toLowerCase() === data.studentAddress.toLowerCase()) {
        setUserRole('student');
        toast.success('Session started - You are the student');
      }
    });

    // Session ended
    socket.on('session:ended', (data: { sessionId: string; reason: string; summary: any }) => {
      console.log('Session ended:', data);
      
      if (data.summary) {
        toast.success(
          `Session ended: ${data.reason}\nDuration: ${Math.floor(data.summary.duration / 60)}m ${data.summary.duration % 60}s\nTotal cost: ${data.summary.totalCost.toFixed(4)} ETH`,
          { duration: 5000 }
        );
      } else {
        toast(`Session ended: ${data.reason}`);
      }
      
      setActiveSession(null);
      setSessionStats(null);
      setUserRole(null);
    });

    // Balance update
    socket.on('session:balance-update', (data: { sessionId: string; newBalance: number }) => {
      console.log('Balance update:', data);
      if (activeSession && data.sessionId === activeSession.sessionId) {
        setActiveSession(prev => prev ? { ...prev, studentBalance: data.newBalance } : null);
      }
    });

    // Low balance warning from server
    socket.on('session:low-balance-warning', (data: { sessionId: string; currentBalance: number; timeRemaining: number }) => {
      toast.error(
        `⚠️ Low balance warning!\nRemaining: ${data.currentBalance.toFixed(4)} ETH\nTime left: ~${Math.floor(data.timeRemaining / 60)} minutes`,
        { duration: 5000 }
      );
    });

    return () => {
      socket.off('session:started');
      socket.off('session:ended');
      socket.off('session:balance-update');
      socket.off('session:low-balance-warning');
    };
  }, [socket, isConnected, account?.address, activeSession]);

  const startSession = useCallback((data: SessionData) => {
    console.log('Starting session:', data);
    setActiveSession(data);
    
    // Emit to backend
    if (socket && isConnected) {
      socket.emit('session:start', data);
    }
  }, [socket, isConnected]);

  const endSession = useCallback(() => {
    console.log('Ending session');
    
    if (socket && isConnected && activeSession) {
      socket.emit('session:end', { sessionId: activeSession.sessionId });
    }
    
    setActiveSession(null);
    setSessionStats(null);
    setUserRole(null);
  }, [socket, isConnected, activeSession]);

  const updateBalance = useCallback((newBalance: number) => {
    if (activeSession) {
      setActiveSession(prev => prev ? { ...prev, studentBalance: newBalance } : null);
    }
  }, [activeSession]);

  const value: SessionContextType = {
    activeSession,
    sessionStats,
    isInSession: !!activeSession,
    userRole,
    startSession,
    endSession,
    updateBalance,
  };

  return <SessionContext.Provider value={value}>{children}</SessionContext.Provider>;
};
