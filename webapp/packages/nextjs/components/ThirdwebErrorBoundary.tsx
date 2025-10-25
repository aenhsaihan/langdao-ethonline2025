"use client";

import React from 'react';

interface Props {
  children: React.ReactNode;
  fallback?: React.ReactNode;
}

interface State {
  hasError: boolean;
  error?: Error;
}

export class ThirdwebErrorBoundary extends React.Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    // Log thirdweb errors but don't crash the app
    if (error.message?.includes('thirdweb') || error.message?.includes('Unauthorized')) {
      console.warn('Thirdweb service temporarily unavailable:', error.message);
      return;
    }
    console.error('Component error:', error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return this.props.fallback || (
        <div className="p-4 text-yellow-600 bg-yellow-50 rounded-lg">
          <p className="text-sm">Wallet services temporarily unavailable</p>
          <button 
            onClick={() => this.setState({ hasError: false })}
            className="text-xs underline mt-2"
          >
            Retry
          </button>
        </div>
      );
    }

    return this.props.children;
  }
}