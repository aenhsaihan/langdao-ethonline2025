"use client";

import React from 'react';
import { useWebRTCSession } from '~~/hooks/useWebRTCSession';
import { WebRTCSessionStatus } from './WebRTCSessionStatus';
import { WebRTCSessionEndPrompt } from './WebRTCSessionEndPrompt';

interface WebRTCSessionProviderProps {
  children: React.ReactNode;
}

export const WebRTCSessionProvider: React.FC<WebRTCSessionProviderProps> = ({ children }) => {
  const { showEndSessionPrompt, dismissPrompt } = useWebRTCSession();

  return (
    <>
      {children}
      <WebRTCSessionStatus />
      <WebRTCSessionEndPrompt 
        isOpen={showEndSessionPrompt} 
        onClose={dismissPrompt} 
      />
    </>
  );
};