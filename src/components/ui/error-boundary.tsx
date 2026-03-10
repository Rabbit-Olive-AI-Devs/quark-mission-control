"use client";

import { Component, type ReactNode } from "react";

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

export class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  render() {
    if (this.state.hasError) {
      if (this.props.fallback) return this.props.fallback;

      return (
        <div className="rounded-xl border border-[#EF4444]/20 bg-[#EF4444]/5 p-4">
          <div className="text-sm font-medium text-[#FCA5A5] mb-1">Something went wrong</div>
          <div className="text-xs text-[#94A3B8]">{this.state.error?.message || "An unexpected error occurred"}</div>
          <button
            onClick={() => this.setState({ hasError: false, error: null })}
            className="mt-3 text-xs px-3 py-1.5 rounded-lg bg-white/5 text-[#F1F5F9] hover:bg-white/10 transition-colors"
          >
            Try again
          </button>
        </div>
      );
    }

    return this.props.children;
  }
}
