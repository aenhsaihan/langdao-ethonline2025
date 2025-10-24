"use client";

import React, { useEffect, useState } from 'react';
import { useSocket } from '../../lib/socket/socketContext';
import { useActiveAccount } from 'thirdweb/react';
import toast from 'react-hot-toast';

interface TutorResponse {
  requestId: string;
  tutorAddress: string;
  accepted: boolean;
  timestamp: number;
}

interface StudentSocketEventsProps {
  onTutorResponse?: (response: TutorResponse) => void;
}

export const StudentSocketEvents: React.FC<StudentSocketEventsProps> = ({ onTutorResponse }) => {
  const { socket, on, off, emit } = useSocket();
  const account = useActiveAccount();
  const [pendingRequests, setPendingRequests] = useState<string[]>([]);
  const [tutorResponses, setTutorResponses] = useState<TutorResponse[]>([]);

  useEffect(() => {
    if (!socket) return;

    // Student event listeners
    const handleRequestSent = (data: { requestId: string }) => {
      setPendingRequests(prev => [...prev, data.requestId]);
      toast.success('Tutor request sent! Waiting for responses...');
    };

    const handleNoTutorsAvailable = (data: any) => {
      toast.error('No tutors available for your request');
      setPendingRequests(prev => prev.filter(id => id !== data.requestId));
    };

    const handleTutorAccepted = (data: TutorResponse) => {
      setTutorResponses(prev => [...prev, { ...data, accepted: true }]);
      onTutorResponse?.({ ...data, accepted: true });
      
      toast((t) => (
        <div className="flex flex-col space-y-2">
          <div className="font-medium">Tutor Accepted Your Request!</div>
          <div className="text-sm text-gray-600">
            Tutor: {data.tutorAddress.slice(0, 6)}...{data.tutorAddress.slice(-4)}
          </div>
          <div className="flex space-x-2">
            <button
              onClick={() => {
                acceptTutor(data.requestId, data.tutorAddress);
                toast.dismiss(t.id);
              }}
              className="px-3 py-1 bg-green-500 text-white rounded text-sm"
            >
              Start Session
            </button>
            <button
              onClick={() => {
                rejectTutor(data.requestId, data.tutorAddress);
                toast.dismiss(t.id);
              }}
              className="px-3 py-1 bg-red-500 text-white rounded text-sm"
            >
              Reject
            </button>
          </div>
        </div>
      ), {
        duration: 30000, // 30 seconds to respond
        position: 'top-right',
      });
    };

    const handleTutorDeclined = () => {
      toast.info('A tutor declined your request');
      // Keep the request active for other tutors
    };

    // Register event listeners
    on('student:request-sent', handleRequestSent);
    on('student:no-tutors-available', handleNoTutorsAvailable);
    on('student:tutor-accepted', handleTutorAccepted);
    on('student:tutor-declined', handleTutorDeclined);

    return () => {
      off('student:request-sent', handleRequestSent);
      off('student:no-tutors-available', handleNoTutorsAvailable);
      off('student:tutor-accepted', handleTutorAccepted);
      off('student:tutor-declined', handleTutorDeclined);
    };
  }, [socket]); // Simplified deps



  const acceptTutor = (requestId: string, tutorAddress: string) => {
    emit('student:accept-tutor', {
      requestId,
      tutorAddress,
      studentAddress: account?.address
    });
    
    // Remove from pending and responses
    setPendingRequests(prev => prev.filter(id => id !== requestId));
    setTutorResponses(prev => prev.filter(resp => resp.requestId !== requestId));
    
    toast.success('Session starting with tutor!');
  };

  const rejectTutor = (requestId: string, tutorAddress: string) => {
    emit('student:reject-tutor', {
      requestId,
      tutorAddress,
      studentAddress: account?.address
    });
    
    // Remove this specific tutor response but keep request active
    setTutorResponses(prev => prev.filter(resp => 
      !(resp.requestId === requestId && resp.tutorAddress === tutorAddress)
    ));
    
    toast.info('Tutor rejected. Waiting for other responses...');
  };

  const cancelRequest = (requestId: string) => {
    emit('student:cancel-request', {
      requestId,
      studentAddress: account?.address
    });
    
    setPendingRequests(prev => prev.filter(id => id !== requestId));
    setTutorResponses(prev => prev.filter(resp => resp.requestId !== requestId));
    
    toast.info('Request cancelled');
  };

  return (
    <div className="space-y-4">
      {/* Pending Requests */}
      {pendingRequests.length > 0 && (
        <div className="bg-white dark:bg-gray-800 p-4 rounded-lg border">
          <h3 className="font-medium mb-3">Pending Requests ({pendingRequests.length})</h3>
          <div className="space-y-2">
            {pendingRequests.map((requestId) => (
              <div key={requestId} className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-700 rounded">
                <div>
                  <div className="text-sm font-medium">Request ID: {requestId}</div>
                  <div className="text-xs text-gray-600 dark:text-gray-400">
                    Waiting for tutor responses...
                  </div>
                </div>
                <button
                  onClick={() => cancelRequest(requestId)}
                  className="px-3 py-1 bg-red-500 text-white rounded text-sm hover:bg-red-600"
                >
                  Cancel
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Tutor Responses */}
      {tutorResponses.length > 0 && (
        <div className="bg-white dark:bg-gray-800 p-4 rounded-lg border">
          <h3 className="font-medium mb-3">Tutor Responses ({tutorResponses.length})</h3>
          <div className="space-y-2">
            {tutorResponses.map((response) => (
              <div key={`${response.requestId}-${response.tutorAddress}`} className="flex items-center justify-between p-3 bg-green-50 dark:bg-green-900/20 rounded border border-green-200 dark:border-green-800">
                <div>
                  <div className="text-sm font-medium">
                    Tutor: {response.tutorAddress.slice(0, 6)}...{response.tutorAddress.slice(-4)}
                  </div>
                  <div className="text-xs text-gray-600 dark:text-gray-400">
                    Accepted your request • Request: {response.requestId}
                  </div>
                </div>
                <div className="flex space-x-2">
                  <button
                    onClick={() => acceptTutor(response.requestId, response.tutorAddress)}
                    className="px-3 py-1 bg-green-500 text-white rounded text-sm hover:bg-green-600"
                  >
                    Start Session
                  </button>
                  <button
                    onClick={() => rejectTutor(response.requestId, response.tutorAddress)}
                    className="px-3 py-1 bg-gray-500 text-white rounded text-sm hover:bg-gray-600"
                  >
                    Reject
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