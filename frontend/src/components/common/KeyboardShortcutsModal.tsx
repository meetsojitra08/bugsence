import { useEffect, useState } from "react";
import { Keyboard, X } from "lucide-react";

const SHORTCUT_GROUPS = [
  {
    title: "Global Navigation",
    shortcuts: [
      { keys: ["⌘", "K"], description: "Open Command Palette and Global Search" },
      { keys: ["?"], description: "Toggle this Keyboard Shortcuts cheat sheet" },
      { keys: ["G", "D"], description: "Navigate to Dashboard" },
      { keys: ["G", "I"], description: "Navigate to Issues List" },
      { keys: ["G", "B"], description: "Navigate to Kanban Board" },
      { keys: ["G", "M"], description: "Navigate to Team Members" },
    ],
  },
  {
    title: "Issues & AI Actions",
    shortcuts: [
      { keys: ["C"], description: "Create a new issue from anywhere" },
      { keys: ["⌘", "J"], description: "Run AI Triage auto-fill in creation form" },
      { keys: ["ESC"], description: "Close modal, popover or side drawer" },
    ],
  },
];

export function KeyboardShortcutsModal() {
  const [isOpen, setIsOpen] = useState(false);

  useEffect(() => {
    let lastKey = "";
    let lastKeyTime = 0;

    const handleKeyDown = (e: KeyboardEvent) => {
      // Don't trigger if user is typing in an input, textarea or contentEditable
      const target = e.target as HTMLElement;
      if (
        target.tagName === "INPUT" ||
        target.tagName === "TEXTAREA" ||
        target.isContentEditable
      ) {
        return;
      }

      if (e.key === "?" || (e.shiftKey && e.key === "/")) {
        e.preventDefault();
        setIsOpen((prev) => !prev);
        return;
      }

      if (e.key === "Escape" && isOpen) {
        setIsOpen(false);
        return;
      }

      // Handle two-key sequences (e.g. G then D)
      const now = Date.now();
      if (lastKey.toLowerCase() === "g" && now - lastKeyTime < 1000) {
        const k = e.key.toLowerCase();
        if (k === "d") {
          window.location.href = "/dashboard";
        } else if (k === "i") {
          window.location.href = "/issues";
        } else if (k === "b") {
          window.location.href = "/board";
        } else if (k === "m") {
          window.location.href = "/settings/members";
        }
      }
      lastKey = e.key;
      lastKeyTime = now;
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isOpen]);

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-xs"
      onClick={() => setIsOpen(false)}
      data-testid="shortcuts-modal-backdrop"
    >
      <div
        className="animate-in fade-in-0 zoom-in-95 w-full max-w-lg overflow-hidden rounded-2xl border border-border bg-surface-elevated text-text shadow-2xl duration-150"
        onClick={(e) => e.stopPropagation()}
        data-testid="shortcuts-modal-dialog"
      >
        <div className="flex items-center justify-between border-b border-border px-5 py-4">
          <div className="flex items-center gap-2.5">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary/10 text-primary">
              <Keyboard className="h-4 w-4" />
            </div>
            <div>
              <h2 className="text-sm font-bold text-text">Keyboard Shortcuts</h2>
              <p className="text-[11px] text-text-muted">
                Navigate and file issues at lightning speed
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={() => setIsOpen(false)}
            className="rounded-lg p-1.5 text-text-muted hover:bg-surface hover:text-text"
            data-testid="close-shortcuts-modal"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="max-h-[70vh] overflow-y-auto p-5 space-y-6">
          {SHORTCUT_GROUPS.map((group) => (
            <div key={group.title} className="space-y-2.5">
              <h3 className="text-xs font-semibold text-text-muted uppercase tracking-wider">
                {group.title}
              </h3>
              <div className="divide-y divide-border/50 rounded-xl border border-border/80 bg-surface/40">
                {group.shortcuts.map((s, idx) => (
                  <div
                    key={idx}
                    className="flex items-center justify-between px-3.5 py-2.5 text-xs"
                  >
                    <span className="text-text-muted font-medium">{s.description}</span>
                    <div className="flex items-center gap-1">
                      {s.keys.map((k, kIdx) => (
                        <kbd
                          key={kIdx}
                          className="rounded border border-border bg-surface-elevated px-2 py-0.5 font-mono text-[11px] font-semibold text-text shadow-xs"
                        >
                          {k}
                        </kbd>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>

        <div className="border-t border-border bg-surface/40 px-5 py-3 text-right">
          <span className="text-[11px] text-text-muted">
            Press <kbd className="rounded border border-border px-1 font-mono">ESC</kbd> to dismiss
          </span>
        </div>
      </div>
    </div>
  );
}
