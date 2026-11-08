import { useNavigate } from "react-router-dom";
import { Bug, Home, Search } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useUiStore } from "@/stores/useUiStore";

export function NotFoundPage() {
  const navigate = useNavigate();
  const { toggleCommandPalette } = useUiStore();

  return (
    <div
      className="flex min-h-screen flex-col items-center justify-center bg-background p-6 text-center text-text"
      data-testid="not-found-page"
    >
      <div className="flex h-16 w-16 items-center justify-center rounded-2xl border border-primary/20 bg-primary/10 text-primary shadow-sm">
        <Bug className="h-8 w-8" />
      </div>

      <div className="mt-4 font-mono text-xs font-semibold text-primary">ERROR 404</div>
      <h1 className="mt-1 text-3xl font-extrabold tracking-tight text-text">
        Issue Not Found
      </h1>
      <p className="mt-2 max-w-md text-xs text-text-muted">
        The workspace route or resource you requested could not be located. It might have been
        renamed, soft-deleted, or you may need permission from the project owner.
      </p>

      <div className="mt-6 flex flex-col items-center gap-3 sm:flex-row">
        <Button
          size="sm"
          onClick={() => navigate("/dashboard")}
          className="flex items-center gap-2 text-xs"
        >
          <Home className="h-3.5 w-3.5" />
          <span>Return to Dashboard</span>
        </Button>

        <Button
          variant="outline"
          size="sm"
          onClick={toggleCommandPalette}
          className="flex items-center gap-2 text-xs"
        >
          <Search className="h-3.5 w-3.5" />
          <span>Search Everything (⌘K)</span>
        </Button>
      </div>
    </div>
  );
}
