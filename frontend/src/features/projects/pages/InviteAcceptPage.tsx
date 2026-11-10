import { useEffect, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { Bug, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/features/auth/hooks/useAuth";
import { projectsApi } from "@/features/projects/api/projectsApi";
import { useProjectStore } from "@/stores/useProjectStore";

export function InviteAcceptPage() {
  const { token } = useParams<{ token: string }>();
  const { isAuthenticated } = useAuth();
  const navigate = useNavigate();
  const setCurrentProjectId = useProjectStore((s) => s.setCurrentProjectId);

  const [inviteInfo, setInviteInfo] = useState<{
    project_name: string;
    project_key: string;
    email: string;
    role: string;
    status: string;
    invited_by: string;
  } | null>(null);
  const [loading, setLoading] = useState(true);
  const [joining, setJoining] = useState(false);

  useEffect(() => {
    if (!token) return;
    projectsApi
      .getPublicInvite(token)
      .then(setInviteInfo)
      .catch(() => setInviteInfo(null))
      .finally(() => setLoading(false));
  }, [token]);

  const handleAccept = async () => {
    if (!token) return;
    setJoining(true);
    try {
      const res = await projectsApi.acceptInvite(token);
      setCurrentProjectId(res.project_id);
      toast.success(`Joined ${res.project_name}`);
      navigate("/today");
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : "Could not accept invite");
    } finally {
      setJoining(false);
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4">
      <div className="w-full max-w-md rounded-xl border border-border bg-surface p-6 text-center shadow-sm">
        <div className="mx-auto flex h-10 w-10 items-center justify-center rounded-lg bg-accent text-accent-foreground">
          <Bug className="h-5 w-5" />
        </div>

        {loading ? (
          <div className="py-8">
            <Loader2 className="mx-auto h-5 w-5 animate-spin text-text-muted" />
          </div>
        ) : !inviteInfo ? (
          <div className="mt-4 space-y-2">
            <h1 className="text-lg font-semibold text-text">Invite link invalid</h1>
            <p className="text-xs text-text-muted">
              Ask a project owner for a fresh invite link.
            </p>
          </div>
        ) : inviteInfo.status !== "pending" ? (
          <div className="mt-4 space-y-2">
            <h1 className="text-lg font-semibold text-text">Invite {inviteInfo.status}</h1>
            <p className="text-xs text-text-muted">
              This invite to {inviteInfo.project_name} is no longer active.
            </p>
          </div>
        ) : (
          <div className="mt-4 space-y-4">
            <div>
              <h1 className="text-lg font-semibold text-text">
                Join {inviteInfo.project_name}
              </h1>
              <p className="mt-1 text-xs text-text-muted">
                {inviteInfo.invited_by} invited you as{" "}
                <strong className="capitalize text-text">{inviteInfo.role}</strong>.
              </p>
            </div>

            {isAuthenticated ? (
              <Button onClick={handleAccept} disabled={joining} className="w-full">
                {joining ? "Joining…" : `Join ${inviteInfo.project_name}`}
              </Button>
            ) : (
              <div className="space-y-2">
                <Button asChild className="w-full">
                  <Link to={`/register?next=/invite/${token}`}>
                    Create account to join
                  </Link>
                </Button>
                <Button variant="outline" asChild className="w-full">
                  <Link to={`/login?next=/invite/${token}`}>
                    Already have an account? Sign in
                  </Link>
                </Button>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
