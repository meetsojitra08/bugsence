import { useMemo } from "react";
import { MessageSquare, AlertCircle } from "lucide-react";
import { toast } from "sonner";
import {
  useCreateComment,
  useDeleteComment,
  useIssueTimeline,
  useUpdateComment,
} from "../../hooks/useIssues";
import { useAuth } from "@/features/auth/hooks/useAuth";
import { useProjectMembers } from "@/features/projects/hooks/useProjects";
import { ActivityItem } from "./ActivityItem";
import { CommentCard } from "./CommentCard";
import { CommentComposer } from "./CommentComposer";
import type { TimelineItem } from "../../types";

interface IssueTimelineProps {
  issueId: string;
  projectId: string;
  projectKey?: string;
  issueNumber?: number;
}

export function IssueTimeline({ issueId, projectId, projectKey, issueNumber }: IssueTimelineProps) {
  const { user } = useAuth();
  const { data: members = [] } = useProjectMembers(projectId);

  const isProjectAdminOrOwner = useMemo(() => {
    if (!user) return false;
    const myMembership = members.find((m) => m.user.id === user.id);
    return myMembership?.role === "admin" || myMembership?.role === "owner";
  }, [members, user]);

  const {
    data: timeline = [],
    isLoading,
    isError,
  } = useIssueTimeline(issueId, projectKey, issueNumber);

  const createMutation = useCreateComment(issueId);
  const updateMutation = useUpdateComment(issueId);
  const deleteMutation = useDeleteComment(issueId);

  const handleCreateComment = async (body: string) => {
    try {
      await createMutation.mutateAsync({ body });
      toast.success("Comment posted");
    } catch {
      toast.error("Failed to post comment");
    }
  };

  const handleUpdateComment = async (commentId: string, newBody: string) => {
    try {
      await updateMutation.mutateAsync({ commentId, payload: { body: newBody } });
      toast.success("Comment updated");
    } catch {
      toast.error("Failed to update comment");
    }
  };

  const handleDeleteComment = async (commentId: string) => {
    try {
      await deleteMutation.mutateAsync(commentId);
      toast.success("Comment deleted");
    } catch {
      toast.error("Failed to delete comment");
    }
  };

  return (
    <div className="flex flex-col space-y-4" data-testid="issue-timeline-container">
      {/* Timeline Stream */}
      <div className="space-y-3" data-testid="timeline-items-stream">
        {isLoading ? (
          <div className="animate-pulse space-y-3">
            <div className="h-6 w-3/4 rounded bg-surface/50" />
            <div className="h-20 w-full rounded-xl bg-surface/50" />
            <div className="h-6 w-1/2 rounded bg-surface/50" />
          </div>
        ) : isError ? (
          <div className="flex items-center gap-2 rounded-lg border border-red-500/20 bg-red-500/10 p-3 text-xs text-red-400">
            <AlertCircle className="h-4 w-4 flex-shrink-0" />
            <span>Failed to load timeline activity and comments.</span>
          </div>
        ) : timeline.length === 0 ? (
          <div
            className="flex flex-col items-center justify-center rounded-xl border border-dashed border-border/60 py-8 text-center text-text-muted"
            data-testid="timeline-empty-state"
          >
            <MessageSquare className="mb-2 h-8 w-8 opacity-40" />
            <p className="text-xs font-medium text-text">No conversation yet</p>
            <p className="mt-0.5 text-[11px] text-text-muted">
              Leave a comment below to start the conversation on this issue.
            </p>
          </div>
        ) : (
          timeline.map((item: TimelineItem) => (
            <div key={item.id} className="transition-all">
              {item.type === "comment" ? (
                <CommentCard
                  item={item}
                  currentUserId={user?.id}
                  isProjectAdminOrOwner={isProjectAdminOrOwner}
                  onUpdate={handleUpdateComment}
                  onDelete={handleDeleteComment}
                />
              ) : (
                <ActivityItem item={item} />
              )}
            </div>
          ))
        )}
      </div>

      {/* Composer Anchor */}
      <div className="pt-2">
        <CommentComposer projectId={projectId} onSubmit={handleCreateComment} />
      </div>
    </div>
  );
}
