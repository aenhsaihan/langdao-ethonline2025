"use client";

import React, { useState } from 'react';
import { useActiveAccount } from 'thirdweb/react';
import { useSocket } from '../../lib/socket/socketContext';
import { TutorSocketEvents } from './TutorSocketEvents';
import { StudentSocketEvents } from './StudentSocketEvents';
import { LANGUAGES } from '../../lib/constants/contracts';

export const SocketDemo: React.FC = () => {
  const account = useActiveAccount();
  const { isConnected, emit } = useSocket();
  const [userRole, setUserRole] = useState<'tutor' | 'student' | null>(null);
  const [language, setLanguage] = useState('en'); // Use language code
  const [rate, setRate] = useState(0.001);
  const [budget, setBudget] = useState(0.002);

  if (!account) {
    return (
      <div className="bg-white dark:bg-gray-800 p-6 rounded-lg border">
        <h2 className="text-xl font-bold mb-4">Socket Demo</h2>
        <p className="text-gray-600 dark:text-gray-400">
          Please connect your wallet to test socket functionality.
        </p>
      </div>
    );
  }

  const setTutorAvailable = () => {
    emit('tutor:set-available', {
      address: account.address,
      language,
      ratePerSecond: rate
    });
  };

  const setTutorUnavailable = () => {
    emit('tutor:set-unavailable', {
      address: account.address
    });
  };

  const requestTutor = () => {
    const requestId = `req_${Math.random().toString(36).substr(2, 9)}`;
    emit('student:request-tutor', {
      requestId,
      studentAddress: account.address,
      language,
      budgetPerSecond: budget
    });
  };

  return (
    <div className="space-y-6">
      <div className="bg-white dark:bg-gray-800 p-6 rounded-lg border">
        <h2 className="text-xl font-bold mb-4">Socket Demo</h2>
        
        <div className="mb-4">
          <div className="flex items-center space-x-2 mb-2">
            <span className="text-sm font-medium">Connection Status:</span>
            <div className={`w-3 h-3 rounded-full ${isConnected ? 'bg-green-500' : 'bg-red-500'}`}></div>
            <span className="text-sm">{isConnected ? 'Connected' : 'Disconnected'}</span>
          </div>
          <div className="text-sm text-gray-600 dark:text-gray-400">
            Wallet: {account.address.slice(0, 6)}...{account.address.slice(-4)}
          </div>
        </div>

        {/* Role Selection */}
        <div className="mb-6">
          <h3 className="font-medium mb-2">Select Role for Testing:</h3>
          <div className="flex space-x-4">
            <button
              onClick={() => setUserRole('tutor')}
              className={`px-4 py-2 rounded ${
                userRole === 'tutor' 
                  ? 'bg-blue-500 text-white' 
                  : 'bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300'
              }`}
            >
              Tutor
            </button>
            <button
              onClick={() => setUserRole('student')}
              className={`px-4 py-2 rounded ${
                userRole === 'student' 
                  ? 'bg-blue-500 text-white' 
                  : 'bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300'
              }`}
            >
              Student
            </button>
          </div>
        </div>

        {/* Common Settings */}
        <div className="mb-6">
          <h3 className="font-medium mb-2">Settings:</h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="block text-sm font-medium mb-1">Language</label>
              <select
                value={language}
                onChange={(e) => setLanguage(e.target.value)}
                className="w-full p-2 border rounded dark:bg-gray-700 dark:border-gray-600"
              >
                {LANGUAGES.map(lang => (
                  <option key={lang.code} value={lang.code}>
                    {lang.flag} {lang.name}
                  </option>
                ))}
              </select>
            </div>
            {userRole === 'tutor' && (
              <div>
                <label className="block text-sm font-medium mb-1">Rate (PYUSD/sec)</label>
                <input
                  type="number"
                  step="0.001"
                  value={rate}
                  onChange={(e) => setRate(parseFloat(e.target.value))}
                  className="w-full p-2 border rounded dark:bg-gray-700 dark:border-gray-600"
                />
                <div className="text-xs text-gray-500 mt-1">≈ ${(rate * 3600).toFixed(2)}/hr</div>
              </div>
            )}
            {userRole === 'student' && (
              <div>
                <label className="block text-sm font-medium mb-1">Budget (PYUSD/sec)</label>
                <input
                  type="number"
                  step="0.001"
                  value={budget}
                  onChange={(e) => setBudget(parseFloat(e.target.value))}
                  className="w-full p-2 border rounded dark:bg-gray-700 dark:border-gray-600"
                />
                <div className="text-xs text-gray-500 mt-1">≈ ${(budget * 3600).toFixed(2)}/hr</div>
              </div>
            )}
          </div>
        </div>

        {/* Role-specific Actions */}
        {userRole === 'tutor' && (
          <div className="mb-6">
            <h3 className="font-medium mb-2">Tutor Actions:</h3>
            <div className="flex space-x-4">
              <button
                onClick={setTutorAvailable}
                disabled={!isConnected}
                className="px-4 py-2 bg-green-500 text-white rounded hover:bg-green-600 disabled:bg-gray-400"
              >
                Set Available
              </button>
              <button
                onClick={setTutorUnavailable}
                disabled={!isConnected}
                className="px-4 py-2 bg-red-500 text-white rounded hover:bg-red-600 disabled:bg-gray-400"
              >
                Set Unavailable
              </button>
            </div>
          </div>
        )}

        {userRole === 'student' && (
          <div className="mb-6">
            <h3 className="font-medium mb-2">Student Actions:</h3>
            <button
              onClick={requestTutor}
              disabled={!isConnected}
              className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600 disabled:bg-gray-400"
            >
              Request Tutor
            </button>
          </div>
        )}
      </div>

      {/* Socket Event Components */}
      {userRole === 'tutor' && <TutorSocketEvents />}
      {userRole === 'student' && <StudentSocketEvents />}
    </div>
  );
};