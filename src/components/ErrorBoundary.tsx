import { AlertTriangle, RotateCw } from 'lucide-react';
import { Component, ErrorInfo, ReactNode } from 'react';

interface ErrorBoundaryProps {
  children: ReactNode;
}

interface ErrorBoundaryState {
  hasError: boolean;
  message: string;
}

export class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  constructor(props: ErrorBoundaryProps) {
    super(props);
    this.state = { hasError: false, message: '' };
  }

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    let friendly = error.message || 'An unexpected error occurred while syncing warehouse data.';
    try {
      const parsed = JSON.parse(error.message) as { error?: string; operationType?: string; path?: string };
      if (parsed && parsed.error) {
        if (parsed.error.includes('Quota exceeded')) {
          friendly = 'Daily database quota has been reached. Quota resets tomorrow.';
        } else if (parsed.error.toLowerCase().includes('permission')) {
          friendly = `Permission denied while running ${parsed.operationType || 'database'} access on ${parsed.path || 'workspace'}. Please sign in again.`;
        } else {
          friendly = parsed.error;
        }
      }
    } catch {
      // Keep original error message
    }

    return { hasError: true, message: friendly };
  }

  componentDidCatch(error: Error, info: ErrorInfo): void {
    console.error('Application ErrorBoundary caught:', error, info);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="flex min-h-screen items-center justify-center bg-[#F3F5F4] p-6">
          <div className="w-full max-w-md rounded-xl border border-[#DCE2DF] bg-white p-6 text-center shadow-sm">
            <span className="mx-auto flex h-11 w-11 items-center justify-center rounded-xl bg-amber-50 text-amber-700">
              <AlertTriangle className="h-5 w-5" aria-hidden="true" />
            </span>
            <h1 className="mt-4 font-display text-[17px] font-semibold text-[#111916]">
              Unable to sync warehouse data
            </h1>
            <p className="mt-2 text-[13.5px] leading-relaxed text-[#5B6A63]">
              {this.state.message}
            </p>
            <button
              type="button"
              onClick={() => window.location.reload()}
              className="mt-5 inline-flex h-9.5 items-center gap-2 rounded-lg bg-[#145338] px-4 text-[13px] font-semibold text-white hover:bg-[#0E3E29]"
            >
              <RotateCw className="h-3.5 w-3.5" />
              <span>Reload workspace</span>
            </button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
