import { Component, type ErrorInfo, type ReactNode } from "react";
import { AlertTriangle, RotateCcw, Home } from "lucide-react";
import { Button } from "@/components/ui/button";

interface Props {
  children?: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

export class ErrorBoundary extends Component<Props, State> {
  public override state: State = {
    hasError: false,
    error: null,
  };

  public static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  public override componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error("ErrorBoundary caught an unhandled error:", error, errorInfo);
  }

  private handleReset = () => {
    this.setState({ hasError: false, error: null });
    window.location.href = "/dashboard";
  };

  private handleReload = () => {
    window.location.reload();
  };

  public override render() {
    if (this.state.hasError) {
      return (
        <div
          className="flex min-h-screen flex-col items-center justify-center bg-background p-6 text-center text-text"
          data-testid="error-boundary-fallback"
        >
          <div className="flex h-16 w-16 items-center justify-center rounded-2xl border border-danger/20 bg-danger/10 text-danger shadow-sm">
            <AlertTriangle className="h-8 w-8" />
          </div>

          <h1 className="mt-5 text-2xl font-bold tracking-tight text-text">
            Something went wrong
          </h1>
          <p className="mt-2 max-w-md text-xs text-text-muted">
            BugSense encountered an unexpected runtime error. Your workspace data is safe and
            preserved on the server.
          </p>

          <p className="mt-3 font-mono text-[11px] text-text-muted">
            Reference: {this.state.error?.name ?? "runtime-error"}
          </p>

          <div className="mt-6 flex items-center gap-3">
            <Button
              variant="outline"
              size="sm"
              onClick={this.handleReload}
              className="flex items-center gap-2 text-xs"
            >
              <RotateCcw className="h-3.5 w-3.5" />
              <span>Reload Page</span>
            </Button>
            <Button
              size="sm"
              onClick={this.handleReset}
              className="flex items-center gap-2 text-xs"
            >
              <Home className="h-3.5 w-3.5" />
              <span>Back to Dashboard</span>
            </Button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
