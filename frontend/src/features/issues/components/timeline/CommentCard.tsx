import { useState, KeyboardEvent } from "react";
import { Edit2, Trash2, Check, X } from "lucide-react";
import { SafeMarkdown } from "../../utils/markdown";
import { RelativeTime } from "./RelativeTime";
import type { TimelineItem } from "../../types";

interface CommentCardProps {
  item: TimelineItem;
  currentUserId?: string;
  isProjectAdminOrOwner?: boolean;
  onUpdate: (commentId: string, newBody: string) => Promise<unknown>;
  onDelete: (commentId: string) => Promise<unknown>;
}

export function CommentCard({
  item,
  currentUserId,
  isProjectAdminOrOwner = false,
  onUpdate,
  onDelete,
}: CommentCardProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [editText, setEditText] = useState(item.body);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const isAuthor = Boolean(currentUserId && item.actor.id === currentUserId);
  const canModify = isAuthor || isProjectAdminOrOwner;

  const handleSave = async () => {
    const trimmed = editText.trim();
    if (!trimmed || trimmed === item.body) {
      setIsEditing(false);
      return;
    }

    try {
      setIsSubmitting(true);
      await onUpdate(item.id, trimmed);
      setIsEditing(false);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleKeyDown = (e: KeyboardEvent<HTMLTextAreaElement>) => {
    if ((e.metaKey || e.ctrlKey) && e.key === "Enter") {
      e.preventDefault();
      handleSave();
    } else if (e.key === "Escape") {
      setEditText(item.body);
      setIsEditing(false);
    }
  };

  const authorInitials = item.actor?.full_name
    ? item.actor.full_name
        .split(" ")
        .map((p) => p[0])
        .slice(0, 2)
        .join("")
        .toUpperCase()
    : item.actor?.email?.slice(0, 2).toUpperCase() || "??";

  return (
    <div
      className="bg-card group relative rounded-xl border border-border p-3.5 shadow-sm transition-colors hover:border-border/80"
      data-testid={`comment-card-${item.id}`}
    >
      {/* Header */}
      <div className="mb-2 flex items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          {item.actor.avatar_url ? (
            <img
              src={item.actor.avatar_url}
              alt={item.actor.full_name || item.actor.email}
              className="h-6 w-6 rounded-full border border-border object-cover"
            />
          ) : (
            <div className="flex h-6 w-6 items-center justify-center rounded-full bg-primary/20 text-[10px] font-semibold text-primary">
              {authorInitials}
            </div>
          )}

          <span className="text-xs font-semibold text-text">
            {item.actor.full_name || item.actor.email}
          </span>

          <div className="flex items-center gap-1.5 text-text-muted">
            <span>•</span>
            <RelativeTime dateString={item.created_at} />
            {item.is_edited && (
              <span
                className="cursor-help text-[10px] italic text-text-muted"
                title={
                  item.edited_at
                    ? `Edited on ${new Date(item.edited_at).toLocaleString()}`
                    : "Edited"
                }
              >
                (edited)
              </span>
            )}
          </div>
        </div>

        {/* Action buttons (Author or Admin/Owner) */}
        {canModify && !isEditing && (
          <div className="flex items-center gap-1 opacity-0 transition-opacity group-hover:opacity-100">
            <button
              onClick={() => setIsEditing(true)}
              className="rounded p-1 text-text-muted hover:bg-background hover:text-text"
              title="Edit comment"
              data-testid={`edit-comment-${item.id}`}
            >
              <Edit2 className="h-3.5 w-3.5" />
            </button>
            <button
              onClick={() => onDelete(item.id)}
              className="rounded p-1 text-text-muted hover:bg-background hover:text-red-400"
              title="Delete comment"
              data-testid={`delete-comment-${item.id}`}
            >
              <Trash2 className="h-3.5 w-3.5" />
            </button>
          </div>
        )}
      </div>

      {/* Content or Edit Box */}
      {isEditing ? (
        <div className="mt-1 space-y-2">
          <textarea
            value={editText}
            onChange={(e) => setEditText(e.target.value)}
            onKeyDown={handleKeyDown}
            disabled={isSubmitting}
            className="w-full rounded-lg border border-border bg-background p-2.5 text-xs text-text focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
            rows={3}
            autoFocus
            data-testid={`edit-comment-textarea-${item.id}`}
          />
          <div className="flex items-center justify-between">
            <span className="text-[10px] text-text-muted">
              Press <kbd className="rounded border border-border px-1">Cmd+Enter</kbd> to save,{" "}
              <kbd className="rounded border border-border px-1">Esc</kbd> to cancel
            </span>
            <div className="flex items-center gap-1.5">
              <button
                onClick={() => {
                  setEditText(item.body);
                  setIsEditing(false);
                }}
                disabled={isSubmitting}
                className="inline-flex items-center gap-1 rounded px-2 py-1 text-xs text-text-muted hover:text-text"
              >
                <X className="h-3 w-3" />
                Cancel
              </button>
              <button
                onClick={handleSave}
                disabled={isSubmitting || !editText.trim()}
                className="hover:bg-primary-hover inline-flex items-center gap-1 rounded bg-primary px-2.5 py-1 text-xs font-medium text-white disabled:opacity-50"
                data-testid={`save-comment-btn-${item.id}`}
              >
                <Check className="h-3 w-3" />
                Save
              </button>
            </div>
          </div>
        </div>
      ) : (
        <div className="text-xs leading-relaxed text-text">
          <SafeMarkdown content={item.body} />
        </div>
      )}
    </div>
  );
}
