"use client";

import React, { useEffect, useState } from 'react';
import { useSocket } from '../../lib/socket/socketContext';
import { useActiveAccount } from 'thirdweb/react';
import { BellIcon, XMarkIcon } from '@heroicons/react/24/outline';

interface Notification {
  id: string;
  type: 'tutor-request' | 'tutor-response' | 'session-start' | 'info';
  title: string;
  message: string;
  timestamp: number;
  data?: any;
  actions?: Array<{
    label: string;
    action: () => void;
    variant: 'primary' | 'secondary' | 'danger';
  }>;
}

export const SocketNotifications: React.FC = () => {
  const { socket, on, off, emit } = useSocket();
  const account = useActiveAccount();
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [showNotifications, setShowNotifications] = useState(false);

  const addNotification = (notification: Omit<Notification, 'id' | 'timestamp'>) => {
    const newNotification: Notification = {
      ...notification,
      id: Math.random().toString(36).substr(2, 9),
      timestamp: Date.now(),
    };
    
    setNotifications(prev => [newNotification, ...prev.slice(0, 9)]); // Keep only 10 notifications
    
    // Auto-remove after 30 seconds if no actions
    if (!notification.actions) {
      setTimeout(() => {
        removeNotification(newNotification.id);
      }, 30000);
    }
  };

  const removeNotification = (id: string) => {
    setNotifications(prev => prev.filter(n => n.id !== id));
  };

  useEffect(() => {
    if (!socket) return;

    // Tutor notifications
    const handleIncomingRequest = (data: any) => {
      addNotification({
        type: 'tutor-request',
        title: 'New Tutoring Request',
        message: `Student ${data.studentAddress.slice(0, 6)}...${data.studentAddress.slice(-4)} wants to learn ${data.language}`,
        data,
        actions: [
          {
            label: 'Accept',
            variant: 'primary',
            action: () => {
              emit('tutor:accept-request', {
                requestId: data.requestId,
                tutorAddress: account?.address
              });
              removeNotification(data.requestId);
            }
          },
          {
            label: 'Decline',
            variant: 'danger',
            action: () => {
              emit('tutor:decline-request', { requestId: data.requestId });
              removeNotification(data.requestId);
            }
          }
        ]
      });
    };

    // Student notifications
    const handleTutorAccepted = (data: any) => {
      addNotification({
        type: 'tutor-response',
        title: 'Tutor Accepted!',
        message: `Tutor ${data.tutorAddress.slice(0, 6)}...${data.tutorAddress.slice(-4)} accepted your request`,
        data,
        actions: [
          {
            label: 'Start Session',
            variant: 'primary',
            action: () => {
              emit('student:accept-tutor', {
                requestId: data.requestId,
                tutorAddress: data.tutorAddress,
                studentAddress: account?.address
              });
              removeNotification(data.requestId);
            }
          },
          {
            label: 'Reject',
            variant: 'secondary',
            action: () => {
              emit('student:reject-tutor', {
                requestId: data.requestId,
                tutorAddress: data.tutorAddress,
                studentAddress: account?.address
              });
              removeNotification(data.requestId);
            }
          }
        ]
      });
    };

    const handleSessionStart = (data: any) => {
      addNotification({
        type: 'session-start',
        title: 'Session Starting!',
        message: 'Your language learning session is about to begin',
        data
      });
    };

    const handleNoTutorsAvailable = () => {
      addNotification({
        type: 'info',
        title: 'No Tutors Available',
        message: 'No tutors are currently available for your request. Try again later.'
      });
    };

    // Register listeners
    on('tutor:incoming-request', handleIncomingRequest);
    on('student:tutor-accepted', handleTutorAccepted);
    on('session:starting', handleSessionStart);
    on('student:no-tutors-available', handleNoTutorsAvailable);

    return () => {
      off('tutor:incoming-request', handleIncomingRequest);
      off('student:tutor-accepted', handleTutorAccepted);
      off('session:starting', handleSessionStart);
      off('student:no-tutors-available', handleNoTutorsAvailable);
    };
  }, [socket]); // Simplified deps

  const unreadCount = notifications.filter(n => n.actions).length;

  return (
    <div className="relative">
      {/* Notification Bell */}
      <button
        onClick={() => setShowNotifications(!showNotifications)}
        className="relative p-2 text-gray-400 hover:text-gray-600 dark:text-gray-300 dark:hover:text-white"
      >
        <BellIcon className="h-6 w-6" />
        {unreadCount > 0 && (
          <span className="absolute -top-1 -right-1 bg-red-500 text-white text-xs rounded-full h-5 w-5 flex items-center justify-center">
            {unreadCount}
          </span>
        )}
      </button>

      {/* Notifications Dropdown */}
      {showNotifications && (
        <div className="absolute right-0 mt-2 w-96 bg-white dark:bg-gray-800 rounded-lg shadow-lg border border-gray-200 dark:border-gray-700 z-50">
          <div className="p-4 border-b border-gray-200 dark:border-gray-700">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-medium text-gray-900 dark:text-white">
                Notifications
              </h3>
              <button
                onClick={() => setShowNotifications(false)}
                className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
              >
                <XMarkIcon className="h-5 w-5" />
              </button>
            </div>
          </div>

          <div className="max-h-96 overflow-y-auto">
            {notifications.length === 0 ? (
              <div className="p-4 text-center text-gray-500 dark:text-gray-400">
                No notifications
              </div>
            ) : (
              notifications.map((notification) => (
                <div
                  key={notification.id}
                  className="p-4 border-b border-gray-100 dark:border-gray-700 last:border-b-0"
                >
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <h4 className="text-sm font-medium text-gray-900 dark:text-white">
                        {notification.title}
                      </h4>
                      <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                        {notification.message}
                      </p>
                      <p className="text-xs text-gray-500 dark:text-gray-500 mt-2">
                        {new Date(notification.timestamp).toLocaleTimeString()}
                      </p>
                    </div>
                    {!notification.actions && (
                      <button
                        onClick={() => removeNotification(notification.id)}
                        className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 ml-2"
                      >
                        <XMarkIcon className="h-4 w-4" />
                      </button>
                    )}
                  </div>

                  {notification.actions && (
                    <div className="flex space-x-2 mt-3">
                      {notification.actions.map((action, index) => (
                        <button
                          key={index}
                          onClick={action.action}
                          className={`px-3 py-1 text-sm rounded ${
                            action.variant === 'primary'
                              ? 'bg-blue-500 text-white hover:bg-blue-600'
                              : action.variant === 'danger'
                              ? 'bg-red-500 text-white hover:bg-red-600'
                              : 'bg-gray-200 text-gray-700 hover:bg-gray-300 dark:bg-gray-600 dark:text-gray-300 dark:hover:bg-gray-500'
                          }`}
                        >
                          {action.label}
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
};