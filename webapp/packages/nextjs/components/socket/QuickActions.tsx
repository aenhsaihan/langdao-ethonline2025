"use client";

import React, { useState } from 'react';
import { useSocket } from '../../lib/socket/socketContext';
import { useActiveAccount } from 'thirdweb/react';
import toast from 'react-hot-toast';

export const QuickActions: React.FC = () => {
  const { isConnected, emit } = useSocket();
  const account = useActiveAccount();
  const [isAvailable, setIsAvailable] = useState(false);
  const [language, setLanguage] = useState('english');
  const [rate, setRate] = useState(0.001);
  const [budget, setBudget] = useState(0.002);

  const languages = [
    { value: 'english', label: 'English' },
    { value: 'spanish', label: 'Spanish' },
    { value: 'french', label: 'French' },
    { value: 'german', label: 'German' },
    { value: 'mandarin', label: 'Mandarin' },
    { value: 'japanese', label: 'Japanese' },
    { value: 'korean', label: 'Korean' },
    { value: 'italian', label: 'Italian' },
    { value: 'portuguese', label: 'Portuguese' },
    { value: 'russian', label: 'Russian' },
  ];

  const setTutorAvailable = () => {
    if (!account?.address) {
      toast.error('Wallet not connected');
      return;
    }

    if (!isConnected) {
      toast.error('Not connected to server');
      return;
    }

    emit('tutor:set-available', {
      address: account.address,
      language,
      ratePerSecond: rate
    });

    setIsAvailable(true);
    toast.success(`Set as available for ${language} tutoring`);
  };

  const setTutorUnavailable = () => {
    if (!account?.address) {
      toast.error('Wallet not connected');
      return;
    }

    emit('tutor:set-unavailable', {
      address: account.address
    });

    setIsAvailable(false);
    toast.success('Set as unavailable');
  };

  const requestTutor = () => {
    if (!account?.address) {
      toast.error('Wallet not connected');
      return;
    }

    if (!isConnected) {
      toast.error('Not connected to server');
      return;
    }

    const requestId = `req_${Math.random().toString(36).substr(2, 9)}`;
    
    emit('student:request-tutor', {
      requestId,
      studentAddress: account.address,
      language,
      budgetPerSecond: budget
    });

    toast.success('Tutor request sent! Waiting for responses...');
  };

  if (!account) {
    return null;
  }

  return (
    <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-6">
      <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-6">Quick Actions</h2>
      
      <div className="grid md:grid-cols-2 gap-6">
        {/* Tutor Section */}
        <div className="space-y-4">
          <h3 className="text-lg font-medium text-gray-900 dark:text-white flex items-center">
            👨‍🏫 Become a Tutor
            {isAvailable && (
              <span className="ml-2 px-2 py-1 bg-green-100 text-green-800 text-xs rounded-full">
                Available
              </span>
            )}
          </h3>
          
          <div className="space-y-3">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Language to Teach
              </label>
              <select
                value={language}
                onChange={(e) => setLanguage(e.target.value)}
                className="w-full p-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
              >
                {languages.map((lang) => (
                  <option key={lang.value} value={lang.value}>
                    {lang.label}
                  </option>
                ))}
              </select>
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Rate (ETH per second)
              </label>
              <input
                type="number"
                step="0.0001"
                value={rate}
                onChange={(e) => setRate(parseFloat(e.target.value) || 0)}
                className="w-full p-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                placeholder="0.001"
              />
            </div>
            
            <div className="flex space-x-2">
              {!isAvailable ? (
                <button
                  onClick={setTutorAvailable}
                  disabled={!isConnected}
                  className="flex-1 px-4 py-2 bg-green-500 text-white rounded-md hover:bg-green-600 disabled:bg-gray-400 disabled:cursor-not-allowed"
                >
                  Set Available
                </button>
              ) : (
                <button
                  onClick={setTutorUnavailable}
                  disabled={!isConnected}
                  className="flex-1 px-4 py-2 bg-red-500 text-white rounded-md hover:bg-red-600 disabled:bg-gray-400 disabled:cursor-not-allowed"
                >
                  Set Unavailable
                </button>
              )}
            </div>
          </div>
        </div>

        {/* Student Section */}
        <div className="space-y-4">
          <h3 className="text-lg font-medium text-gray-900 dark:text-white">
            👨‍🎓 Find a Tutor
          </h3>
          
          <div className="space-y-3">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Language to Learn
              </label>
              <select
                value={language}
                onChange={(e) => setLanguage(e.target.value)}
                className="w-full p-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
              >
                {languages.map((lang) => (
                  <option key={lang.value} value={lang.value}>
                    {lang.label}
                  </option>
                ))}
              </select>
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Budget (ETH per second)
              </label>
              <input
                type="number"
                step="0.0001"
                value={budget}
                onChange={(e) => setBudget(parseFloat(e.target.value) || 0)}
                className="w-full p-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                placeholder="0.002"
              />
            </div>
            
            <button
              onClick={requestTutor}
              disabled={!isConnected}
              className="w-full px-4 py-2 bg-blue-500 text-white rounded-md hover:bg-blue-600 disabled:bg-gray-400 disabled:cursor-not-allowed"
            >
              Find Tutor Now
            </button>
          </div>
        </div>
      </div>

      {/* Connection Status */}
      <div className="mt-6 pt-4 border-t border-gray-200 dark:border-gray-700">
        <div className="flex items-center justify-between text-sm">
          <span className="text-gray-600 dark:text-gray-400">Socket Connection:</span>
          <div className="flex items-center space-x-2">
            <div className={`w-2 h-2 rounded-full ${isConnected ? 'bg-green-500' : 'bg-red-500'}`}></div>
            <span className={isConnected ? 'text-green-600' : 'text-red-600'}>
              {isConnected ? 'Connected' : 'Disconnected'}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
};