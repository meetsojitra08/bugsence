import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { Bug, CheckCircle2, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { apiRequest } from "@/lib/apiClient";

export function PublicReportPage() {
  const { projectKey } = useParams<{ projectKey: string }>();
  const [meta, setMeta] = useState<{
    project_name: string;
    project_key: string;
    enabled: boolean;
    welcome_message: string;
  } | null>(null);
  const [loading, setLoading] = useState(true);
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [reporterName, setReporterName] = useState("");
  const [reporterEmail, setReporterEmail] = useState("");
  const [environment, setEnvironment] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [submittedKey, setSubmittedKey] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!projectKey) return;
    apiRequest<{
      project_name: string;
      project_key: string;
      enabled: boolean;
      welcome_message: string;
    }>(`/public/report/${projectKey}/`, { skipAuth: true })
      .then(setMeta)
      .catch(() => setMeta(null))
      .finally(() => setLoading(false));
  }, [projectKey]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!projectKey || (!description.trim() && !title.trim())) return;
    setSubmitting(true);
    setError(null);
    try {
      const res = await apiRequest<{ key: string }>(`/public/report/${projectKey}/`, {
        method: "POST",
        skipAuth: true,
        body: JSON.stringify({
          title: title.trim(),
          description: description.trim(),
          reporter_name: reporterName.trim(),
          reporter_email: reporterEmail.trim(),
          environment: environment.trim(),
        }),
      });
      setSubmittedKey(res.key);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Could not submit bug report.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4 py-10">
      <div className="w-full max-w-lg rounded-xl border border-border bg-surface p-6 shadow-sm">
        <div className="flex items-center gap-2.5 border-b border-border pb-4">
          <span className="flex h-8 w-8 items-center justify-center rounded-md bg-accent text-accent-foreground">
            <Bug className="h-4 w-4" />
          </span>
          <div>
            <h1 className="text-base font-semibold text-text">
              {meta ? `Report a bug · ${meta.project_name}` : "Bug report"}
            </h1>
            <p className="text-xs text-text-muted">
              {meta?.welcome_message || "Send a report straight to the team inbox."}
            </p>
          </div>
        </div>

        {loading ? (
          <div className="py-10 text-center">
            <Loader2 className="mx-auto h-5 w-5 animate-spin text-text-muted" />
          </div>
        ) : !meta || !meta.enabled ? (
          <p className="py-8 text-center text-xs text-text-muted">
            Public bug reporting is not enabled for this project.
          </p>
        ) : submittedKey ? (
          <div className="py-8 text-center space-y-3" data-testid="public-report-success">
            <CheckCircle2 className="mx-auto h-8 w-8 text-success" />
            <h2 className="text-base font-semibold text-text">Report received ({submittedKey})</h2>
            <p className="text-xs text-text-muted">
              It&apos;s in the team&apos;s Inbox now.
              {reporterEmail && " We'll email you once it's fixed."}
            </p>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => {
                setSubmittedKey(null);
                setTitle("");
                setDescription("");
              }}
            >
              Submit another report
            </Button>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="mt-4 space-y-4">
            {error && (
              <div className="rounded-lg border border-danger/30 bg-danger/10 p-3 text-xs text-danger">
                {error}
              </div>
            )}

            <div className="space-y-1">
              <Label htmlFor="pub-title">Summary (optional)</Label>
              <Input
                id="pub-title"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="Short headline of what broke"
              />
            </div>

            <div className="space-y-1">
              <Label htmlFor="pub-desc">What happened? *</Label>
              <textarea
                id="pub-desc"
                required
                rows={4}
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Paste any error message, steps, or what you saw…"
                className="w-full rounded-md border border-border bg-background p-2.5 text-sm text-text focus:border-accent focus:outline-none"
              />
            </div>

            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <div className="space-y-1">
                <Label htmlFor="pub-name">Your name</Label>
                <Input
                  id="pub-name"
                  value={reporterName}
                  onChange={(e) => setReporterName(e.target.value)}
                  placeholder="Optional"
                />
              </div>
              <div className="space-y-1">
                <Label htmlFor="pub-email">Your email (notify when fixed)</Label>
                <Input
                  id="pub-email"
                  type="email"
                  value={reporterEmail}
                  onChange={(e) => setReporterEmail(e.target.value)}
                  placeholder="Optional"
                />
              </div>
            </div>

            <div className="space-y-1">
              <Label htmlFor="pub-env">Browser / OS (optional)</Label>
              <Input
                id="pub-env"
                value={environment}
                onChange={(e) => setEnvironment(e.target.value)}
                placeholder="e.g. Chrome on macOS"
              />
            </div>

            <Button type="submit" disabled={submitting} className="w-full">
              {submitting ? "Sending…" : "Send to Inbox"}
            </Button>
          </form>
        )}
      </div>
    </div>
  );
}
