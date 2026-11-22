import React from "react";

interface Props {
  children: React.ReactNode;
}

interface State {
  hasError: boolean;
  message: string;
}

export class ErrorBoundary extends React.Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false, message: "" };
  }

  static getDerivedStateFromError(error: Error): State {
    return {
      hasError: true,
      message: error?.message || "An unexpected error occurred in the Admin CMS.",
    };
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen flex items-center justify-center bg-canvas text-ink p-6">
          <div className="max-w-lg w-full bg-panel border border-line rounded-2xl p-6 space-y-4">
            <h1 className="text-xl font-semibold text-ink">Admin CMS Error</h1>
            <p className="text-sm text-muted leading-relaxed">
              Something interrupted the admin session. You can reload the page or return to the public website.
            </p>
            <pre className="text-xs bg-canvas border border-line rounded-xl p-3 overflow-auto max-h-40 text-missed">
              {this.state.message}
            </pre>
            <div className="flex items-center gap-3 pt-2">
              <button
                type="button"
                onClick={() => window.location.reload()}
                className="px-4 py-2 rounded-xl bg-accent text-primary-foreground font-medium text-sm hover:opacity-95 cursor-pointer"
              >
                Reload Admin
              </button>
              <a
                href="/"
                className="px-4 py-2 rounded-xl border border-line text-ink text-sm hover:bg-secondary"
              >
                Back to Website
              </a>
            </div>
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}
