import React from 'react';
import { AlertTriangle, RefreshCw, Home, ChevronDown } from 'lucide-react';

/**
 * Robust React Error Boundary with Flowboard / Apple design system tokens.
 * Catches runtime rendering exceptions and presents a clean recovery interface
 * instead of unmounting the entire DOM or flashing a black screen.
 */
export default class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = {
      hasError: false,
      error: null,
      errorInfo: null,
    };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, errorInfo) {
    this.setState({ errorInfo });
    // Keep error trace visible in browser console for debugging
    console.error('Crewboard ErrorBoundary caught an unhandled render error:', error, errorInfo);
  }

  handleReset = () => {
    this.setState({
      hasError: false,
      error: null,
      errorInfo: null,
    });
  };

  handleReload = () => {
    window.location.reload();
  };

  handleGoHome = () => {
    window.location.href = '/dashboard';
  };

  render() {
    if (this.state.hasError) {
      if (this.props.fallback) {
        return typeof this.props.fallback === 'function'
          ? this.props.fallback(this.state.error, this.handleReset)
          : this.props.fallback;
      }

      const errorMessage =
        this.state.error?.message ||
        (typeof this.state.error === 'string' ? this.state.error : 'Unknown runtime exception');

      return (
        <div className="min-h-[360px] p-6 sm:p-10 flex items-center justify-center bg-crew-bg">
          <div className="w-full max-w-lg bg-crew-surface border border-crew-border rounded-3xl p-6 sm:p-8 shadow-card text-center space-y-5 animate-in fade-in duration-200">
            <div className="w-12 h-12 rounded-2xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-800/40 text-rose-600 dark:text-rose-400 flex items-center justify-center mx-auto">
              <AlertTriangle className="w-6 h-6" />
            </div>

            <div>
              <h2 className="font-heading text-xl sm:text-2xl font-bold text-crew-text-primary tracking-tight">
                {this.props.title || 'Something went wrong'}
              </h2>
              <p className="text-xs sm:text-sm text-crew-text-secondary mt-1.5 max-w-sm mx-auto leading-relaxed">
                {this.props.description ||
                  'Crewboard encountered an unexpected component error. Your data and session are safe.'}
              </p>
            </div>

            {/* Recovery Actions */}
            <div className="flex flex-wrap items-center justify-center gap-2.5 pt-2">
              <button
                type="button"
                onClick={this.handleReload}
                className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-semibold rounded-xl bg-[#181B20] text-white hover:bg-black dark:bg-white dark:text-gray-900 dark:hover:bg-gray-100 transition-all shadow-sm"
              >
                <RefreshCw className="w-3.5 h-3.5" />
                <span>Reload Page</span>
              </button>

              <button
                type="button"
                onClick={this.handleReset}
                className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-medium rounded-xl border border-crew-border bg-crew-surface hover:bg-crew-bg text-crew-text-primary transition-colors shadow-subtle"
              >
                <span>Try Again</span>
              </button>

              <button
                type="button"
                onClick={this.handleGoHome}
                className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-medium rounded-xl text-crew-text-secondary hover:text-crew-text-primary hover:bg-black/5 dark:hover:bg-white/5 transition-colors"
              >
                <Home className="w-3.5 h-3.5" />
                <span>Dashboard</span>
              </button>
            </div>

            {/* Collapsible Error Diagnosis for Devs / Supervisors */}
            <details className="text-left pt-2 border-t border-crew-border/60 group">
              <summary className="text-[11px] font-mono text-crew-text-tertiary cursor-pointer hover:text-crew-text-secondary flex items-center justify-between select-none py-1">
                <span>Technical diagnostic details</span>
                <ChevronDown className="w-3.5 h-3.5 transition-transform group-open:rotate-180" />
              </summary>
              <div className="mt-2 p-3 rounded-xl bg-crew-bg border border-crew-border font-mono text-[11px] text-rose-600 dark:text-rose-400 overflow-x-auto max-h-48 whitespace-pre-wrap leading-relaxed">
                {errorMessage}
                {this.state.errorInfo?.componentStack && (
                  <div className="mt-2 text-crew-text-tertiary text-[10px] whitespace-pre">
                    {this.state.errorInfo.componentStack}
                  </div>
                )}
              </div>
            </details>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

