import React, { useState } from "react";
import { Plus, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import type { IssueStatus } from "../types";

interface QuickAddCardProps {
  status: IssueStatus;
  onQuickAdd: (title: string, status: IssueStatus) => void;
}

export function QuickAddCard({ status, onQuickAdd }: QuickAddCardProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [title, setTitle] = useState("");

  const handleSubmit = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!title.trim()) return;

    onQuickAdd(title.trim(), status);
    setTitle("");
    setIsOpen(false);
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter") {
      e.preventDefault();
      handleSubmit();
    } else if (e.key === "Escape") {
      setTitle("");
      setIsOpen(false);
    }
  };

  if (!isOpen) {
    return (
      <button
        onClick={() => setIsOpen(true)}
        className="flex w-full items-center gap-1.5 rounded-lg border border-transparent px-2.5 py-1.5 text-xs font-medium text-text-muted transition-colors hover:border-border hover:bg-background/60 hover:text-text"
        data-testid={`quick-add-btn-${status}`}
      >
        <Plus className="h-3.5 w-3.5" />
        <span>Add issue</span>
      </button>
    );
  }

  return (
    <form
      onSubmit={handleSubmit}
      className="animate-in zoom-in-95 flex flex-col gap-2 rounded-xl border border-primary/40 bg-surface p-2.5 shadow-sm duration-100"
      data-testid={`quick-add-form-${status}`}
    >
      <Input
        value={title}
        onChange={(e) => setTitle(e.target.value)}
        onKeyDown={handleKeyDown}
        placeholder="Issue title (press Enter to create)..."
        autoFocus
        className="h-8 bg-background text-xs"
        data-testid={`quick-add-input-${status}`}
      />

      <div className="flex items-center justify-end gap-1.5">
        <button
          type="button"
          onClick={() => {
            setTitle("");
            setIsOpen(false);
          }}
          className="p-1 text-text-muted hover:text-text"
        >
          <X className="h-3.5 w-3.5" />
        </button>
        <Button
          type="submit"
          size="sm"
          disabled={!title.trim()}
          className="h-7 px-2.5 text-xs"
          data-testid={`quick-add-submit-${status}`}
        >
          Add
        </Button>
      </div>
    </form>
  );
}
