"use client";

import React from 'react';
import { useSocket } from '../../lib/socket/socketContext';

export const ConnectionStatus: React.FC = () => {
  const { connectionStatus, socket } = useSocket();

  const getStatusColor = () => {
    switch (connectionStatus) {
      case 'connected':
        return 'bg-green-500';
      case 'connecting':
        return 'bg-yellow-500 animate-pulse';
      case 'error':
        return 'bg-red-500';
      default:
        return 'bg-gray-500';
    }
  };

  const getStatusText = () => {
    switch (connectionStatus) {
      case 'connected':
        return 'Socket Connected';
      case 'connecting':
        return 'Connecting...';
      case 'error':
        return 'Connection Error';
      default:
        return 'Socket Disconnected';
    }
  };

  return (
    <div className="flex items-center space-x-2" title={socket?.id ? `Socket ID: ${socket.id}` : 'No socket connection'}>
      <div className={`w-2 h-2 rounded-full ${getStatusColor()}`}></div>
      <span className="text-sm text-gray-600 dark:text-gray-300">
        {getStatusText()}
      </span>
    </div>
  );
};