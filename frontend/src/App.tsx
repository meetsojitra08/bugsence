import { QueryClientProvider } from "@tanstack/react-query";
import { queryClient } from "@/lib/queryClient";
import { ThemeProvider, useTheme } from "@/app/theme-provider";
import { Button } from "@/components/ui/button";
import { Toaster, toast } from "sonner";
import { Sparkles, Moon, Sun, Bug, Zap } from "lucide-react";

function BugSenseWelcome() {
  const { theme, setTheme } = useTheme();

  return (
    <div className="flex min-h-screen flex-col items-center justify-center p-6 bg-background text-text">
      <div className="w-full max-w-md rounded-xl border border-border bg-surface p-8 shadow-sm">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-2">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary text-white">
              <Bug className="h-5 w-5" />
            </div>
            <div>
              <h1 className="text-xl font-semibold tracking-tight">BugSense AI</h1>
              <p className="text-xs text-text-muted">Issue Tracking & Triage</p>
            </div>
          </div>
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
            title="Toggle Theme"
          >
            {theme === "dark" ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
          </Button>
        </div>

        <p className="text-sm text-text-muted mb-6 leading-relaxed">
          Welcome to BugSense AI. Frontend scaffolded with React 18, Vite, TypeScript,
          Tailwind CSS tokens, and shadcn/ui components.
        </p>

        <div className="flex flex-col gap-3">
          <Button
            variant="ai"
            className="w-full flex items-center justify-center gap-2"
            onClick={() => toast.success("AI Triage engine ready!")}
          >
            <Sparkles className="h-4 w-4" />
            AI Triage Ready
          </Button>

          <Button
            variant="outline"
            className="w-full flex items-center justify-center gap-2"
            onClick={() => toast.info("Linear-speed optimistic updates active.")}
          >
            <Zap className="h-4 w-4 text-warning" />
            Optimistic UI Ready
          </Button>
        </div>
      </div>
    </div>
  );
}

export function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <ThemeProvider defaultTheme="dark">
        <BugSenseWelcome />
        <Toaster richColors position="bottom-right" />
      </ThemeProvider>
    </QueryClientProvider>
  );
}

export default App;
