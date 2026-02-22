'use client';

import React, { Component, type ErrorInfo, type ReactNode } from 'react';
import { AlertTriangle } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface ErrorBoundaryProps {
  children: ReactNode;
  fallback?: ReactNode;
}

interface ErrorBoundaryState {
  hasError: boolean;
  error: Error | null;
}

export class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  constructor(props: ErrorBoundaryProps) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo): void {
    console.error('ErrorBoundary caught an error:', error, errorInfo);
  }

  handleRetry = (): void => {
    this.setState({ hasError: false, error: null });
  };

  render(): ReactNode {
    if (this.state.hasError) {
      if (this.props.fallback) {
        return this.props.fallback;
      }

      return (
        <div className="flex flex-col items-center justify-center py-12 text-center">
          <div className="mb-4 rounded-full bg-red-50 p-4">
            <AlertTriangle className="h-8 w-8 text-red-500" />
          </div>
          <h3 className="mb-1 text-lg font-semibold text-gray-900">
            Something went wrong
          </h3>
          <p className="mb-2 max-w-md text-sm text-gray-500">
            An unexpected error occurred. Please try again.
          </p>
          {this.state.error && (
            <p className="mb-4 max-w-md rounded-md bg-gray-50 px-4 py-2 text-xs text-gray-400">
              {this.state.error.message}
            </p>
          )}
          <Button onClick={this.handleRetry} variant="outline">
            Try again
          </Button>
        </div>
      );
    }

    return this.props.children;
  }
}
