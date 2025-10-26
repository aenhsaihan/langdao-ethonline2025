"use client";

import { SocketDemo } from "~~/components/socket/SocketDemo";

export default function SocketDemoPage() {
  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 py-8">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white">Socket Demo</h1>
          <p className="text-gray-600 dark:text-gray-400 mt-2">
            Test the real-time socket functionality for tutor-student matching
          </p>
        </div>
        <SocketDemo />
      </div>
    </div>
  );
}