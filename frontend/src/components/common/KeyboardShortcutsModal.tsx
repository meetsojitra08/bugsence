import { useEffect, useMemo, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Keyboard, X } from "lucide-react";
import { modKeyLabel } from "@/lib/format";

function buildShortcutGroups(modKey: string) {
  return [
    {
      title: "Global Navigation",
      shortcuts: [
        { keys: [modKey, "K"], description: "Open Command Palette and Global Search" },
        { keys: ["?"], description: "Toggle this Keyboard Shortcuts cheat sheet" },
        { keys: ["G", "T"], description: "Navigate to Today" },
        { keys: ["G", "N"], description: "Navigate to Inbox" },
        { keys: ["G", "I"], description: "Navigate to Issues" },
        { keys: ["G", "B"], description: "Navigate to Board" },
        { keys: ["G", "M"], description: "Navigate to Members" },
      ],
    },
    {
      title: "Capture & Issues",
      shortcuts: [
        { keys: ["C"], description: "Open Capture modal from anywhere" },
        { keys: [modKey, "Enter"], description: "Create issue from Capture" },
        { keys: ["ESC"], description: "Close modal, popover or side drawer" },
      ],
    },
    {
      title: "Inbox Triage",
      shortcuts: [
        { keys: ["J", "K"], description: "Select next / previous report in Inbox" },
        { keys: ["E"], description: "Accept selected report to Todo" },
        { keys: ["A"], description: "Assign selected report" },
        { keys: ["M"], description: "Merge selected report into duplicate" },
        { keys: ["X"], description: "Mark selected report invalid" },
      ],
    },
  ];
}

export function KeyboardShortcutsModal() {
  const [isOpen, setIsOpen] = useState(false);
  const navigate = useNavigate();
  const closeRef = useRef<HTMLButtonElement>(null);
  const shortcutGroups = useMemo(
    () => buildShortcutGroups(modKeyLabel().replace(/\+$/, "")),
    []
  );

  useEffect(() => {
    if (isOpen) closeRef.current?.focus();
  }, [isOpen]);

  useEffect(() => {
    let lastKey = "";
    let lastKeyTime = 0;

    const handleKeyDown = (e: KeyboardEvent) => {
      // Don't trigger if user is typing in an input, textarea or contentEditable
      const target = e.target as HTMLElement;
      if (
        target.tagName === "INPUT" ||
        target.tagName === "TEXTAREA" ||
        target.tagName === "SELECT" ||
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

      // Handle two-key sequences (e.g. G then T/N/I/B/M)
      const now = Date.now();
      if (lastKey.toLowerCase() === "g" && now - lastKeyTime < 1000) {
        const k = e.key.toLowerCase();
        if (k === "t" || k === "d") {
          navigate("/today");
          setIsOpen(false);
        } else if (k === "n") {
          navigate("/inbox");
          setIsOpen(false);
        } else if (k === "i") {
          navigate("/issues");
          setIsOpen(false);
        } else if (k === "b") {
          navigate("/board");
          setIsOpen(false);
        } else if (k === "m") {
          navigate("/settings/members");
          setIsOpen(false);
        }
      }
      lastKey = e.key;
      lastKeyTime = now;
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, navigate]);

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm"
      onClick={() => setIsOpen(false)}
      data-testid="shortcuts-modal-backdrop"
    >
      <div
        className="animate-in fade-in-0 zoom-in-95 w-full max-w-lg overflow-hidden rounded-2xl border border-border bg-surface-elevated text-text shadow-modal duration-150"
        onClick={(e) => e.stopPropagation()}
        data-testid="shortcuts-modal-dialog"
        role="dialog"
        aria-modal="true"
        aria-labelledby="shortcuts-title"
      >
        <div className="flex items-center justify-between border-b border-border px-5 py-4">
          <div className="flex items-center gap-2.5">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-accent/10 text-accent">
              <Keyboard className="h-4 w-4" />
            </div>
            <div>
              <h2 id="shortcuts-title" className="text-sm font-bold text-text">
                Keyboard Shortcuts
              </h2>
              <p className="text-[11px] text-text-muted">
                Navigate and file issues at lightning speed
              </p>
            </div>
          </div>
          <button
            ref={closeRef}
            type="button"
            onClick={() => setIsOpen(false)}
            className="rounded-lg p-1.5 text-text-muted hover:bg-surface hover:text-text focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent"
            aria-label="Close keyboard shortcuts"
            data-testid="close-shortcuts-modal"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="max-h-[70vh] space-y-6 overflow-y-auto p-5">
          {shortcutGroups.map((group) => (
            <div key={group.title} className="space-y-2.5">
              <h3 className="text-xs font-semibold uppercase tracking-wider text-text-muted">
                {group.title}
              </h3>
              <div className="divide-y divide-border/50 rounded-xl border border-border/80 bg-surface/40">
                {group.shortcuts.map((s, idx) => (
                  <div
                    key={idx}
                    className="flex items-center justify-between px-3.5 py-2.5 text-xs"
                  >
                    <span className="font-medium text-text-muted">{s.description}</span>
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
