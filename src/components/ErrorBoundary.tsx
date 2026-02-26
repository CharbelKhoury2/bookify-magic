import React, { Component, ReactNode } from 'react';

interface ErrorBoundaryProps {
  children: ReactNode;
  fallback?: ReactNode;
}

interface ErrorBoundaryState {
  hasError: boolean;
  error?: Error;
}

export class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  constructor(props: ErrorBoundaryProps) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo): void {
    console.error('ErrorBoundary caught an error:', error, errorInfo);
  }

  render(): ReactNode {
    if (this.state.hasError) {
      if (this.props.fallback) {
        return this.props.fallback;
      }

      const isEnvironmentError = this.state.error?.message?.includes('WebSocket') ||
        this.state.error?.message?.includes('insecure') ||
        this.state.error?.message?.includes('Storage');

      return (
        <div className="card-magical p-8 text-center max-w-lg mx-auto my-12">
          <div className="text-4xl mb-4">
            {isEnvironmentError ? '🔌' : '😢'}
          </div>
          <h2 className="text-xl font-bold text-foreground mb-2">
            {isEnvironmentError ? 'Connection Hiccup' : 'Oops! Something went wrong'}
          </h2>
          <p className="text-muted-foreground mb-6">
            {isEnvironmentError
              ? "Your browser's security settings (like Private Mode) might be limiting some magical connections. Don't worry, the site should still work!"
              : (this.state.error?.message || 'An unexpected error occurred')}
          </p>
          <div className="flex flex-col sm:flex-row gap-3 justify-center">
            <button
              onClick={() => {
                this.setState({ hasError: false, error: undefined });
                window.location.reload();
              }}
              className="px-6 py-2.5 rounded-xl bg-primary text-primary-foreground font-semibold hover:shadow-glow transition-all"
            >
              Refresh Page
            </button>
            <button
              onClick={() => this.setState({ hasError: false, error: undefined })}
              className="px-6 py-2.5 rounded-xl border-2 border-border font-semibold hover:bg-secondary/50 transition-all"
            >
              Dismiss
            </button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
