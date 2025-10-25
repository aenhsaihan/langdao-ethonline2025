"use client";

import React, { useState } from 'react';
import { useSession } from '~~/lib/socket/sessionContext';
import { useActiveAccount } from 'thirdweb/react';
import { PlayIcon } from '@heroicons/react/24/solid';

export default function SessionTestPage() {
  const { startSession, isInSession, activeSession } = useSession();
  const account = useActiveAccount();
  
  const [formData, setFormData] = useState({
    tutorAddress: '0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266',
    studentAddress: '',
    language: 'english',
    ratePerSecond: '0.001',
    estimatedDuration: '1800', // 30 minutes
    studentBalance: '2.0',
  });

  const handleStartSession = () => {
    if (!account?.address) {
      alert('Please connect your wallet first');
      return;
    }

    const sessionData = {
      sessionId: `session_${Date.now()}`,
      tutorAddress: formData.tutorAddress.toLowerCase(),
      studentAddress: formData.studentAddress.toLowerCase() || account.address.toLowerCase(),
      language: formData.language,
      ratePerSecond: parseFloat(formData.ratePerSecond),
      startTime: Date.now(),
      estimatedDuration: parseInt(formData.estimatedDuration),
      studentBalance: parseFloat(formData.studentBalance),
      tutorName: 'John Doe',
      studentName: 'Alice Smith',
    };

    startSession(sessionData);
  };

  if (isInSession && activeSession) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="max-w-2xl mx-auto">
          <div className="bg-green-50 dark:bg-green-900/20 border border-green-500 rounded-xl p-6">
            <h1 className="text-2xl font-bold mb-4">Session Active!</h1>
            <p className="mb-4">The session navbar is visible at the top of the page.</p>
            <div className="bg-white dark:bg-gray-800 rounded-lg p-4">
              <h2 className="font-semibold mb-2">Current Session Info:</h2>
              <pre className="text-sm overflow-auto">
                {JSON.stringify(activeSession, null, 2)}
              </pre>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="max-w-2xl mx-auto">
        <h1 className="text-3xl font-bold mb-6">Test Session Navbar</h1>
        
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-6">
          <p className="text-gray-600 dark:text-gray-300 mb-6">
            Use this page to test the live session navbar feature. Fill in the form below and start a mock session.
          </p>

          <form className="space-y-4" onSubmit={(e) => { e.preventDefault(); handleStartSession(); }}>
            
            <div>
              <label className="block text-sm font-medium mb-2">Tutor Address</label>
              <input
                type="text"
                value={formData.tutorAddress}
                onChange={(e) => setFormData({ ...formData, tutorAddress: e.target.value })}
                className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 focus:ring-2 focus:ring-blue-500"
                placeholder="0x..."
              />
            </div>

            <div>
              <label className="block text-sm font-medium mb-2">Student Address (leave empty to use your connected wallet)</label>
              <input
                type="text"
                value={formData.studentAddress}
                onChange={(e) => setFormData({ ...formData, studentAddress: e.target.value })}
                className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 focus:ring-2 focus:ring-blue-500"
                placeholder="0x... or leave empty"
              />
              {account?.address && (
                <p className="text-xs text-gray-500 mt-1">Connected: {account.address}</p>
              )}
            </div>

            <div>
              <label className="block text-sm font-medium mb-2">Language</label>
              <select
                value={formData.language}
                onChange={(e) => setFormData({ ...formData, language: e.target.value })}
                className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 focus:ring-2 focus:ring-blue-500"
              >
                <option value="english">English</option>
                <option value="spanish">Spanish</option>
                <option value="french">French</option>
                <option value="german">German</option>
                <option value="mandarin">Mandarin</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium mb-2">Rate Per Second (ETH)</label>
              <input
                type="number"
                step="0.0001"
                value={formData.ratePerSecond}
                onChange={(e) => setFormData({ ...formData, ratePerSecond: e.target.value })}
                className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 focus:ring-2 focus:ring-blue-500"
              />
              <p className="text-xs text-gray-500 mt-1">
                Cost per minute: {(parseFloat(formData.ratePerSecond) * 60).toFixed(4)} ETH
              </p>
            </div>

            <div>
              <label className="block text-sm font-medium mb-2">Estimated Duration (seconds)</label>
              <input
                type="number"
                value={formData.estimatedDuration}
                onChange={(e) => setFormData({ ...formData, estimatedDuration: e.target.value })}
                className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 focus:ring-2 focus:ring-blue-500"
              />
              <p className="text-xs text-gray-500 mt-1">
                {Math.floor(parseInt(formData.estimatedDuration) / 60)} minutes
              </p>
            </div>

            <div>
              <label className="block text-sm font-medium mb-2">Student Balance (ETH)</label>
              <input
                type="number"
                step="0.01"
                value={formData.studentBalance}
                onChange={(e) => setFormData({ ...formData, studentBalance: e.target.value })}
                className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 focus:ring-2 focus:ring-blue-500"
              />
            </div>

            <button
              type="submit"
              className="w-full flex items-center justify-center gap-2 px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white font-semibold rounded-lg transition-all"
            >
              <PlayIcon className="w-5 h-5" />
              Start Test Session
            </button>
          </form>

          <div className="mt-6 p-4 bg-blue-50 dark:bg-blue-900/20 rounded-lg border border-blue-200 dark:border-blue-800">
            <h3 className="font-semibold mb-2">Features to Test:</h3>
            <ul className="text-sm space-y-1 list-disc list-inside">
              <li>Real-time countdown timer</li>
              <li>Balance draining in real-time</li>
              <li>Low balance warning (yellow) at 20%</li>
              <li>Critical balance alert (red, flashing) at 10%</li>
              <li>Auto session end when balance reaches 0</li>
              <li>Top up button linking to dashboard</li>
              <li>End session button with confirmation</li>
              <li>Session summary after ending</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
}
