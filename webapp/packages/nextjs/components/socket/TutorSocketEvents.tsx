"use client";

import React, { useEffect, useState } from 'react';
import { useSocket } from '../../lib/socket/socketContext';
import { useActiveAccount } from 'thirdweb/react';
import toast from 'react-hot-toast';

interface IncomingRequest {
  requestId: string;
  studentAddress: string;
  language: string;
  budgetPerSecond: number;
  timestamp: number;
}

interface TutorSocketEventsProps {
  onRequestReceived?: (request: IncomingRequest) => void;
}

export const TutorSocketEvents: React.FC<TutorSocketEventsProps> = ({ onRequestReceived }) => {
  const { socket, on, off, emit } = useSocket();
  const account = useActiveAccount();
  const [incomingRequests, setIncomingRequests] = useState<IncomingRequest[]>([]);
  const [isAvailable, setIsAvailable] = useState(false);

  useEffect(() => {
    if (!socket) return;

    // Tutor event listeners
    const handleIncomingRequest = (data: IncomingRequest) => {
      setIncomingRequests(prev => [...prev, data]);
      onRequestReceived?.(data);
      
      toast((t) => (
        <div className="flex flex-col space-y-2">
          <div className="font-medium">New Tutoring Request!</div>
          <div className="text-sm text-gray-600">
            Student: {data.studentAddress.slice(0, 6)}...{data.studentAddress.slice(-4)}
          </div>
          <div className="text-sm text-gray-600">
            Language: {data.language} | Budget: {data.budgetPerSecond} ETH/sec
          </div>
          <div className="flex space-x-2">
            <button
              onClick={() => {
                acceptRequest(data.requestId);
                toast.dismiss(t.id);
              }}
              className="px-3 py-1 bg-green-500 text-white rounded text-sm"
            >
              Accept
            </button>
            <button
              onClick={() => {
                declineRequest(data.requestId);
                toast.dismiss(t.id);
              }}
              className="px-3 py-1 bg-red-500 text-white rounded text-sm"
            >
              Decline
            </button>
          </div>
        </div>
      ), {
        duration: 30000, // 30 seconds to respond
        position: 'top-right',
      });
    };

    const handleAvailabilitySet = () => {
      toast.success('Availability status updated');
      setIsAvailable(true);
    };

    const handleRequestAccepted = (data: any) => {
      toast.success('Request accepted! Session starting...');
      // Remove the request from pending list
      setIncomingRequests(prev => prev.filter(req => req.requestId !== data.requestId));
    };

    const handleRequestDeclined = (data: any) => {
      toast.info('Request declined');
      // Remove the request from pending list
      setIncomingRequests(prev => prev.filter(req => req.requestId !== data.requestId));
    };

    // Register event listeners
    on('tutor:incoming-request', handleIncomingRequest);
    on('tutor:availability-set', handleAvailabilitySet);
    on('tutor:request-accepted', handleRequestAccepted);
    on('tutor:request-declined', handleRequestDeclined);

    return () => {
      off('tutor:incoming-request', handleIncomingRequest);
      off('tutor:availability-set', handleAvailabilitySet);
      off('tutor:request-accepted', handleRequestAccepted);
      off('tutor:request-declined', handleRequestDeclined);
    };
  }, [socket]); // Simplified deps



  const acceptRequest = (requestId: string) => {
    if (!account?.address) {
      toast.error('Wallet not connected');
      return;
    }

    emit('tutor:accept-request', {
      requestId,
      tutorAddress: account.address
    });
  };

  const declineRequest = (requestId: string) => {
    emit('tutor:decline-request', {
      requestId
    });
  };

  return (
    <div className="space-y-4">
      {/* Availability Controls */}
      <div className="bg-white dark:bg-gray-800 p-4 rounded-lg border">
        <h3 className="font-medium mb-3">Tutor Availability</h3>
        <div className="flex items-center space-x-2">
          <div className={`w-3 h-3 rounded-full ${isAvailable ? 'bg-green-500' : 'bg-gray-400'}`}></div>
          <span className="text-sm">
            {isAvailable ? 'Available for sessions' : 'Not available'}
          </span>
        </div>
      </div>

      {/* Pending Requests */}
      {incomingRequests.length > 0 && (
        <div className="bg-white dark:bg-gray-800 p-4 rounded-lg border">
          <h3 className="font-medium mb-3">Pending Requests ({incomingRequests.length})</h3>
          <div className="space-y-2">
            {incomingRequests.map((request) => (
              <div key={request.requestId} className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-700 rounded">
                <div>
                  <div className="text-sm font-medium">
                    {request.studentAddress.slice(0, 6)}...{request.studentAddress.slice(-4)}
                  </div>
                  <div className="text-xs text-gray-600 dark:text-gray-400">
                    {request.language} • {request.budgetPerSecond} ETH/sec
                  </div>
                </div>
                <div className="flex space-x-2">
                  <button
                    onClick={() => acceptRequest(request.requestId)}
                    className="px-3 py-1 bg-green-500 text-white rounded text-sm hover:bg-green-600"
                  >
                    Accept
                  </button>
                  <button
                    onClick={() => declineRequest(request.requestId)}
                    className="px-3 py-1 bg-red-500 text-white rounded text-sm hover:bg-red-600"
                  >
                    Decline
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};