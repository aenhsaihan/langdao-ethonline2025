"use client";

import React, { createContext, useContext, useEffect, useState, useCallback } from 'react';
import { useActiveAccount } from 'thirdweb/react';
import { io, Socket } from 'socket.io-client';
import toast from 'react-hot-toast';

interface SocketContextType {
  socket: Socket | null;
  isConnected: boolean;
  connectionStatus: 'disconnected' | 'connecting' | 'connected' | 'error';
  emit: (event: string, data?: any) => void;
  on: (event: string, callback: (data: any) => void) => void;
  off: (event: string, callback?: (data: any) => void) => void;
}

const SocketContext = createContext<SocketContextType | null>(null);

export const useSocket = () => {
  const context = useContext(SocketContext);
  if (!context) {
    throw new Error('useSocket must be used within a SocketProvider');
  }
  return context;
};

interface SocketProviderProps {
  children: React.ReactNode;
}

export const SocketProvider: React.FC<SocketProviderProps> = ({ children }) => {
  const [socket, setSocket] = useState<Socket | null>(null);
  const [isConnected, setIsConnected] = useState(false);
  const [connectionStatus, setConnectionStatus] = useState<'disconnected' | 'connecting' | 'connected' | 'error'>('disconnected');
  const account = useActiveAccount();

  const connect = useCallback(() => {
    if (socket?.connected) return;

    setConnectionStatus('connecting');
    
    const newSocket = io(process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:4000', {
      transports: ['websocket', 'polling'],
      autoConnect: true,
      reconnection: true,
      reconnectionAttempts: 5,
      reconnectionDelay: 1000,
    });

    // Connection events
    newSocket.on('connect', () => {
      setIsConnected(true);
      setConnectionStatus('connected');
      console.log('Socket connected:', newSocket.id);
      toast.success('Connected to LangDAO server');
      
      // Emit user info when connected
      if (account?.address) {
        console.log('Emitting user:connect for address:', account.address);
        newSocket.emit('user:connect', {
          address: account.address,
          timestamp: Date.now()
        });
      }
    });

    newSocket.on('disconnect', (reason) => {
      setIsConnected(false);
      setConnectionStatus('disconnected');
      console.log('Socket disconnected:', reason);
      toast.error(`Disconnected from server: ${reason}`);
    });

    newSocket.on('connect_error', (error) => {
      setConnectionStatus('error');
      console.error('Socket connection error:', error);
      toast.error(`Connection failed: ${error.message}`);
    });

    newSocket.on('reconnect', (attemptNumber) => {
      toast.success(`Reconnected to server (attempt ${attemptNumber})`);
    });

    newSocket.on('reconnect_error', () => {
      toast.error('Reconnection failed');
    });

    // Global event listeners for debugging
    newSocket.on('tutor:available-updated', (data) => {
      console.log('🌍 GLOBAL SOCKET RECEIVED tutor:available-updated:', data);
      toast(`Global: Tutor ${data.action}`, { duration: 2000 });
    });

    newSocket.on('tutor:became-unavailable', (data) => {
      console.log('🌍 GLOBAL SOCKET RECEIVED tutor:became-unavailable:', data);
      toast(`Global: Tutor became unavailable`, { duration: 2000 });
    });

    setSocket(newSocket);
  }, [account?.address, socket?.connected]);

  const disconnect = useCallback(() => {
    if (socket) {
      socket.disconnect();
      setSocket(null);
      setIsConnected(false);
      setConnectionStatus('disconnected');
    }
  }, [socket]);

  const emit = useCallback((event: string, data?: any) => {
    if (socket?.connected) {
      socket.emit(event, data);
    } else {
      toast.error('Not connected to server');
    }
  }, [socket]);

  const on = useCallback((event: string, callback: (data: any) => void) => {
    if (socket) {
      socket.on(event, callback);
    }
  }, [socket]);

  const off = useCallback((event: string, callback?: (data: any) => void) => {
    if (socket) {
      if (callback) {
        socket.off(event, callback);
      } else {
        socket.off(event);
      }
    }
  }, [socket]);

  // Connect when wallet connects, disconnect when wallet disconnects
  useEffect(() => {
    if (account?.address) {
      connect();
    } else {
      disconnect();
    }

    return () => {
      disconnect();
    };
  }, [account?.address]); // Remove connect/disconnect from deps to prevent infinite loop

  const value: SocketContextType = {
    socket,
    isConnected,
    connectionStatus,
    emit,
    on,
    off,
  };

  return (
    <SocketContext.Provider value={value}>
      {children}
    </SocketContext.Provider>
  );
};