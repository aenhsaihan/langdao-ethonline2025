"use client";

import React, { useState } from 'react';
import { 
  ClockIcon, 
  CurrencyDollarIcon,
  CheckCircleIcon,
  StarIcon
} from '@heroicons/react/24/outline';
import { StarIcon as StarIconSolid } from '@heroicons/react/24/solid';
import Link from 'next/link';

export interface SessionSummaryData {
  sessionId: string;
  duration: number; // seconds
  totalCost: number;
  tutorAddress: string;
  studentAddress: string;
  language: string;
  ratePerSecond: number;
  endReason: string;
  tutorName?: string;
  studentName?: string;
}

interface SessionSummaryProps {
  summary: SessionSummaryData;
  userRole: 'tutor' | 'student';
  onClose: () => void;
}

export const SessionSummary: React.FC<SessionSummaryProps> = ({ summary, userRole, onClose }) => {
  const [rating, setRating] = useState(0);
  const [hoveredRating, setHoveredRating] = useState(0);
  const [feedback, setFeedback] = useState('');
  const [submitted, setSubmitted] = useState(false);

  const formatDuration = (seconds: number): string => {
    const hours = Math.floor(seconds / 3600);
    const mins = Math.floor((seconds % 3600) / 60);
    const secs = seconds % 60;
    
    if (hours > 0) {
      return `${hours}h ${mins}m ${secs}s`;
    }
    return `${mins}m ${secs}s`;
  };

  const handleSubmitRating = async () => {
    // TODO: Implement API call to submit rating
    console.log('Submitting rating:', { rating, feedback });
    setSubmitted(true);
    
    // Close after 2 seconds
    setTimeout(() => {
      onClose();
    }, 2000);
  };

  return (
    <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-[70] p-4">
      <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        
        {/* Header */}
        <div className="bg-gradient-to-r from-blue-500 to-purple-600 text-white p-6 rounded-t-2xl">
          <div className="flex items-center gap-3 mb-2">
            <CheckCircleIcon className="w-8 h-8" />
            <h2 className="text-2xl font-bold">Session Complete!</h2>
          </div>
          <p className="text-blue-100">
            {userRole === 'tutor' 
              ? 'Great job teaching! Here\'s your session summary.' 
              : 'Thanks for learning with us! Here\'s your session summary.'}
          </p>
        </div>

        {/* Summary Content */}
        <div className="p-6 space-y-6">
          
          {/* Duration & Cost */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="bg-blue-50 dark:bg-blue-900/20 p-4 rounded-xl border border-blue-200 dark:border-blue-800">
              <div className="flex items-center gap-2 mb-2">
                <ClockIcon className="w-5 h-5 text-blue-600" />
                <span className="text-sm font-semibold text-gray-600 dark:text-gray-300">Duration</span>
              </div>
              <p className="text-2xl font-bold text-blue-600 dark:text-blue-400">
                {formatDuration(summary.duration)}
              </p>
            </div>

            <div className="bg-green-50 dark:bg-green-900/20 p-4 rounded-xl border border-green-200 dark:border-green-800">
              <div className="flex items-center gap-2 mb-2">
                <CurrencyDollarIcon className="w-5 h-5 text-green-600" />
                <span className="text-sm font-semibold text-gray-600 dark:text-gray-300">
                  {userRole === 'tutor' ? 'Earned' : 'Total Cost'}
                </span>
              </div>
              <p className="text-2xl font-bold text-green-600 dark:text-green-400">
                {summary.totalCost.toFixed(4)} ETH
              </p>
              <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                Rate: {(summary.ratePerSecond * 60).toFixed(4)} ETH/min
              </p>
            </div>
          </div>

          {/* Session Details */}
          <div className="bg-gray-50 dark:bg-gray-900/50 p-4 rounded-xl">
            <h3 className="font-semibold mb-3">Session Details</h3>
            <div className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-gray-600 dark:text-gray-400">Session ID:</span>
                <span className="font-mono">{summary.sessionId.slice(0, 12)}...</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600 dark:text-gray-400">Language:</span>
                <span className="font-semibold capitalize">{summary.language}</span>
              </div>
              {userRole === 'student' && summary.tutorName && (
                <div className="flex justify-between">
                  <span className="text-gray-600 dark:text-gray-400">Tutor:</span>
                  <span>{summary.tutorName}</span>
                </div>
              )}
              {userRole === 'tutor' && summary.studentName && (
                <div className="flex justify-between">
                  <span className="text-gray-600 dark:text-gray-400">Student:</span>
                  <span>{summary.studentName}</span>
                </div>
              )}
              <div className="flex justify-between">
                <span className="text-gray-600 dark:text-gray-400">End Reason:</span>
                <span className="capitalize">{summary.endReason}</span>
              </div>
            </div>
          </div>

          {/* Rating Section */}
          {!submitted ? (
            <div className="bg-purple-50 dark:bg-purple-900/20 p-4 rounded-xl border border-purple-200 dark:border-purple-800">
              <h3 className="font-semibold mb-3">Rate Your Experience</h3>
              
              {/* Star Rating */}
              <div className="flex items-center gap-2 mb-4">
                <span className="text-sm text-gray-600 dark:text-gray-400 mr-2">Rating:</span>
                {[1, 2, 3, 4, 5].map((star) => (
                  <button
                    key={star}
                    type="button"
                    onClick={() => setRating(star)}
                    onMouseEnter={() => setHoveredRating(star)}
                    onMouseLeave={() => setHoveredRating(0)}
                    className="transition-transform hover:scale-110"
                  >
                    {star <= (hoveredRating || rating) ? (
                      <StarIconSolid className="w-8 h-8 text-yellow-500" />
                    ) : (
                      <StarIcon className="w-8 h-8 text-gray-300 dark:text-gray-600" />
                    )}
                  </button>
                ))}
                {rating > 0 && (
                  <span className="ml-2 font-semibold">{rating}/5</span>
                )}
              </div>

              {/* Feedback */}
              <div>
                <label className="block text-sm font-medium mb-2">
                  Feedback (Optional)
                </label>
                <textarea
                  value={feedback}
                  onChange={(e) => setFeedback(e.target.value)}
                  placeholder={`Share your thoughts about this session with the ${userRole === 'tutor' ? 'student' : 'tutor'}...`}
                  className="w-full p-3 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 focus:ring-2 focus:ring-purple-500 focus:border-transparent resize-none"
                  rows={3}
                />
              </div>

              <button
                onClick={handleSubmitRating}
                disabled={rating === 0}
                className="mt-4 w-full px-4 py-2 bg-purple-600 hover:bg-purple-700 disabled:bg-gray-300 disabled:cursor-not-allowed text-white font-semibold rounded-lg transition-all"
              >
                Submit Rating
              </button>
            </div>
          ) : (
            <div className="bg-green-50 dark:bg-green-900/20 p-4 rounded-xl border border-green-200 dark:border-green-800 text-center">
              <CheckCircleIcon className="w-12 h-12 text-green-600 mx-auto mb-2" />
              <p className="font-semibold text-green-700 dark:text-green-400">
                Thank you for your feedback!
              </p>
            </div>
          )}

          {/* Actions */}
          <div className="flex gap-3">
            <Link
              href="/dashboard"
              className="flex-1 px-4 py-2 bg-gray-200 hover:bg-gray-300 dark:bg-gray-700 dark:hover:bg-gray-600 text-center rounded-lg font-semibold transition-all"
            >
              Back to Dashboard
            </Link>
            {userRole === 'student' && (
              <Link
                href="/find-tutor"
                className="flex-1 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-center rounded-lg font-semibold transition-all"
              >
                Find Another Tutor
              </Link>
            )}
            {userRole === 'tutor' && (
              <Link
                href="/tutor"
                className="flex-1 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-center rounded-lg font-semibold transition-all"
              >
                Back to Tutor Mode
              </Link>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
