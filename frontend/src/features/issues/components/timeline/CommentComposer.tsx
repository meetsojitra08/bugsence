import { useState, useRef, KeyboardEvent, ChangeEvent, useEffect } from "react";
import { Send, Eye, Edit3, AtSign, ImagePlus } from "lucide-react";
import { toast } from "sonner";
import { SafeMarkdown } from "../../utils/markdown";
import { useProjectMembers } from "@/features/projects/hooks/useProjects";
import { issuesApi } from "../../api/issuesApi";
import { formatShortcut } from "@/lib/format";
import type { ProjectMembership } from "@/features/projects/types";

interface CommentComposerProps {
  projectId: string;
  onSubmit: (body: string) => Promise<unknown>;
  placeholder?: string;
}

export function CommentComposer({
  projectId,
  onSubmit,
  placeholder = "Leave a comment... (use @ to mention)",
}: CommentComposerProps) {
  const [text, setText] = useState("");
  const [tab, setTab] = useState<"write" | "preview">("write");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isUploadingImage, setIsUploadingImage] = useState(false);

  // Mention autocomplete state
  const [mentionQuery, setMentionQuery] = useState<string | null>(null);
  const [mentionIndex, setMentionIndex] = useState(0);
  const [mentionCursorPos, setMentionCursorPos] = useState<number | null>(null);

  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const { data: members = [] } = useProjectMembers(projectId);

  // Filter members matching mentionQuery
  const matchingMembers =
    mentionQuery !== null
      ? members
          .filter((m: ProjectMembership) => {
            const q = mentionQuery.toLowerCase();
            const emailPrefix = m.user.email.split("@")[0].toLowerCase();
            const fullName = (m.user.full_name || "").toLowerCase();
            return emailPrefix.includes(q) || fullName.includes(q);
          })
          .slice(0, 5)
      : [];

  useEffect(() => {
    setMentionIndex(0);
  }, [mentionQuery]);

  const handleTextChange = (e: ChangeEvent<HTMLTextAreaElement>) => {
    const val = e.target.value;
    const cursorPos = e.target.selectionStart;
    setText(val);

    // Detect if cursor is right after an '@' or word starting with '@'
    const textBeforeCursor = val.slice(0, cursorPos);
    const lastAtPos = textBeforeCursor.lastIndexOf("@");

    if (lastAtPos !== -1) {
      const charBeforeAt = lastAtPos > 0 ? textBeforeCursor[lastAtPos - 1] : " ";
      const query = textBeforeCursor.slice(lastAtPos + 1);

      // Verify that @ is either at start of line or preceded by whitespace, and no spaces in query
      if (/\s/.test(charBeforeAt) && !/\s/.test(query)) {
        setMentionQuery(query);
        setMentionCursorPos(lastAtPos);
        return;
      }
    }

    setMentionQuery(null);
    setMentionCursorPos(null);
  };

  const insertMention = (member: ProjectMembership) => {
    if (mentionCursorPos === null || !textareaRef.current) return;

    const emailPrefix = member.user.email.split("@")[0];
    const before = text.slice(0, mentionCursorPos);
    const cursorPos = textareaRef.current.selectionStart;
    const after = text.slice(cursorPos);

    const replacement = `@${emailPrefix} `;
    const newText = `${before}${replacement}${after}`;

    setText(newText);
    setMentionQuery(null);
    setMentionCursorPos(null);

    // Reposition cursor
    setTimeout(() => {
      if (textareaRef.current) {
        textareaRef.current.focus();
        const nextCursor = before.length + replacement.length;
        textareaRef.current.setSelectionRange(nextCursor, nextCursor);
      }
    }, 0);
  };

  const handleSubmit = async () => {
    const trimmed = text.trim();
    if (!trimmed || isSubmitting) return;

    try {
      setIsSubmitting(true);
      await onSubmit(trimmed);
      setText("");
      setTab("write");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleKeyDown = (e: KeyboardEvent<HTMLTextAreaElement>) => {
    // If mention popup is open
    if (mentionQuery !== null && matchingMembers.length > 0) {
      if (e.key === "ArrowDown") {
        e.preventDefault();
        setMentionIndex((prev) => (prev + 1) % matchingMembers.length);
        return;
      }
      if (e.key === "ArrowUp") {
        e.preventDefault();
        setMentionIndex((prev) => (prev - 1 + matchingMembers.length) % matchingMembers.length);
        return;
      }
      if (e.key === "Enter" || e.key === "Tab") {
        e.preventDefault();
        insertMention(matchingMembers[mentionIndex]);
        return;
      }
      if (e.key === "Escape") {
        e.preventDefault();
        setMentionQuery(null);
        return;
      }
    }

    // Submit with Cmd+Enter or Ctrl+Enter
    if ((e.metaKey || e.ctrlKey) && e.key === "Enter") {
      e.preventDefault();
      handleSubmit();
    }
  };

  const handlePasteImage = async (e: React.ClipboardEvent<HTMLTextAreaElement>) => {
    const items = Array.from(e.clipboardData?.items || []);
    const imageItem = items.find((it) => it.type.startsWith("image/"));
    if (!imageItem || !projectId) return;

    const file = imageItem.getAsFile();
    if (!file) return;
    e.preventDefault();
    setIsUploadingImage(true);
    try {
      const uploaded = await issuesApi.uploadAttachment(projectId, file);
      setText((prev) => `${prev}${prev ? "\n" : ""}![${uploaded.filename}](${uploaded.url})`);
      toast.success("Image pasted");
    } catch {
      toast.error("Could not upload pasted image");
    } finally {
      setIsUploadingImage(false);
    }
  };

  return (
    <div
      className="relative rounded-xl border border-border bg-surface p-3 shadow-sm transition-all focus-within:border-accent/50 focus-within:ring-1 focus-within:ring-accent/20"
      data-testid="comment-composer"
    >
      {/* Tabs */}
      <div className="mb-2 flex items-center justify-between border-b border-border/50 pb-2">
        <div className="flex items-center gap-1">
          <button
            type="button"
            onClick={() => setTab("write")}
            className={`inline-flex items-center gap-1.5 rounded px-2 py-1 text-xs font-medium transition-colors ${
              tab === "write"
                ? "shadow-xs bg-background text-text"
                : "text-text-muted hover:text-text"
            }`}
            data-testid="composer-tab-write"
          >
            <Edit3 className="h-3 w-3" />
            Write
          </button>
          <button
            type="button"
            onClick={() => setTab("preview")}
            className={`inline-flex items-center gap-1.5 rounded px-2 py-1 text-xs font-medium transition-colors ${
              tab === "preview"
                ? "shadow-xs bg-background text-text"
                : "text-text-muted hover:text-text"
            }`}
            data-testid="composer-tab-preview"
          >
            <Eye className="h-3 w-3" />
            Preview
          </button>
        </div>

        <span className="flex items-center gap-1 text-[11px] text-text-muted">
          {isUploadingImage ? (
            <>
              <ImagePlus className="h-3 w-3 text-accent" />
              Uploading image…
            </>
          ) : (
            <>
              <AtSign className="h-3 w-3" />
              @mentions · Paste images
            </>
          )}
        </span>
      </div>

      {/* Editor or Preview */}
      {tab === "write" ? (
        <div className="relative">
          <textarea
            ref={textareaRef}
            value={text}
            onChange={handleTextChange}
            onKeyDown={handleKeyDown}
            onPaste={handlePasteImage}
            placeholder={placeholder}
            disabled={isSubmitting}
            rows={3}
            className="w-full resize-none border-0 bg-transparent p-1 text-xs leading-relaxed text-text placeholder-text-muted focus:outline-none focus:ring-0"
            data-testid="comment-composer-textarea"
          />

          {/* Autocomplete mention dropdown */}
          {mentionQuery !== null && matchingMembers.length > 0 && (
            <div
              className="bg-surface-elevated absolute bottom-full left-0 z-50 mb-1 max-h-48 w-64 overflow-y-auto rounded-lg border border-border p-1 shadow-lg"
              data-testid="mention-autocomplete-menu"
            >
              <div className="px-2 py-1 text-[10px] font-semibold uppercase tracking-wider text-text-muted">
                Mention member
              </div>
              {matchingMembers.map((member, idx) => (
                <button
                  key={member.id}
                  type="button"
                  onMouseDown={(e) => {
                    e.preventDefault();
                    insertMention(member);
                  }}
                  className={`flex w-full items-center gap-2 rounded px-2 py-1.5 text-left text-xs transition-colors ${
                    idx === mentionIndex ? "bg-primary text-primary-foreground" : "text-text hover:bg-background"
                  }`}
                  data-testid={`mention-option-${member.user.email}`}
                >
                  <div className="flex h-5 w-5 flex-shrink-0 items-center justify-center rounded-full bg-accent/15 text-[9px] font-bold text-accent">
                    {(member.user.full_name || member.user.email).slice(0, 2).toUpperCase()}
                  </div>
                  <div className="truncate">
                    <p className="truncate font-medium">
                      {member.user.full_name || member.user.email}
                    </p>
                    <p className="truncate text-[10px] opacity-75">{member.user.email}</p>
                  </div>
                </button>
              ))}
            </div>
          )}
        </div>
      ) : (
        <div
          className="min-h-[72px] rounded-lg border border-border/40 bg-background/50 p-2.5 text-xs text-text"
          data-testid="comment-composer-preview"
        >
          {text.trim() ? (
            <SafeMarkdown content={text} />
          ) : (
            <p className="italic text-text-muted">Nothing to preview yet.</p>
          )}
        </div>
      )}

      {/* Action Footer */}
      <div className="mt-2 flex items-center justify-between pt-1">
        <span className="text-[10px] text-text-muted">
          Press <kbd className="rounded border border-border px-1">{formatShortcut("Enter")}</kbd> to submit
        </span>

        <button
          type="button"
          onClick={handleSubmit}
          disabled={!text.trim() || isSubmitting}
          className="shadow-xs hover:bg-primary-hover inline-flex items-center gap-1.5 rounded-lg bg-primary px-3 py-1.5 text-xs font-semibold text-primary-foreground transition-colors disabled:pointer-events-none disabled:opacity-50"
          data-testid="submit-comment-btn"
        >
          <Send className="h-3 w-3" />
          {isSubmitting ? "Posting..." : "Comment"}
        </button>
      </div>
    </div>
  );
}
