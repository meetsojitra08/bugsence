import { useNavigate } from "react-router-dom";
import { Bug, Home, List } from "lucide-react";
import { Button } from "@/components/ui/button";

export function NotFoundPage() {
  const navigate = useNavigate();

  return (
    <div
      className="flex min-h-screen flex-col items-center justify-center bg-background p-6 text-center text-text"
      data-testid="not-found-page"
    >
      <div className="flex h-16 w-16 items-center justify-center rounded-2xl border border-accent/20 bg-accent/10 text-accent shadow-xs">
        <Bug className="h-8 w-8" />
      </div>

      <div className="mt-4 font-mono text-xs font-semibold text-accent">ERROR 404</div>
      <h1 className="mt-1 text-3xl font-extrabold tracking-tight text-text">Page Not Found</h1>
      <p className="mt-2 max-w-md text-xs text-text-muted">
        The project route or resource you requested could not be located. It might have been
        renamed, deleted, or you may need permission from the project owner.
      </p>

      <div className="mt-6 flex flex-col items-center gap-3 sm:flex-row">
        <Button
          size="sm"
          onClick={() => navigate("/today")}
          className="flex items-center gap-2 text-xs"
        >
          <Home className="h-3.5 w-3.5" />
          <span>Return to Today</span>
        </Button>

        <Button
          variant="outline"
          size="sm"
          onClick={() => navigate("/issues")}
          className="flex items-center gap-2 text-xs"
        >
          <List className="h-3.5 w-3.5" />
          <span>Browse Issues</span>
        </Button>
      </div>
    </div>
  );
}
