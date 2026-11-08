import React, { useState } from "react";
import { Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Modal } from "@/components/ui/modal";
import { useCreateProject } from "../hooks/useProjects";
import { useProjectStore } from "@/stores/useProjectStore";
import { generateSuggestedKey } from "../utils/keyGenerator";

interface CreateProjectModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export function CreateProjectModal({ isOpen, onClose }: CreateProjectModalProps) {
  const [name, setName] = useState("");
  const [key, setKey] = useState("");
  const [keyManuallyEdited, setKeyManuallyEdited] = useState(false);
  const [description, setDescription] = useState("");
  const [error, setError] = useState<string | null>(null);

  const createMutation = useCreateProject();
  const setCurrentProjectId = useProjectStore((s) => s.setCurrentProjectId);

  const handleNameChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    setName(val);
    if (!keyManuallyEdited) {
      setKey(generateSuggestedKey(val));
    }
  };

  const handleKeyChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setKeyManuallyEdited(true);
    setKey(e.target.value.toUpperCase().replace(/[^A-Z0-9]/g, ""));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!name.trim()) {
      setError("Project name is required.");
      return;
    }

    if (!key.trim() || key.trim().length < 2) {
      setError("Project key must be at least 2 alphanumeric characters.");
      return;
    }

    try {
      const created = await createMutation.mutateAsync({
        name: name.trim(),
        key: key.trim().toUpperCase(),
        description: description.trim() || undefined,
      });

      setCurrentProjectId(created.id);
      onClose();
      // Reset form
      setName("");
      setKey("");
      setDescription("");
      setKeyManuallyEdited(false);
    } catch (err: unknown) {
      if (err instanceof Error) {
        setError(err.message);
      } else {
        setError("Failed to create project. Please try again.");
      }
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Create New Project"
      description="Create a workspace to track issues, plan boards, and invite team members."
    >
      <form onSubmit={handleSubmit} className="mt-4 space-y-4">
        {error && (
          <div className="rounded-lg border border-red-500/20 bg-red-500/10 p-3 text-sm text-red-500">
            {error}
          </div>
        )}

        <div className="space-y-1.5">
          <Label htmlFor="project-name">Project Name</Label>
          <Input
            id="project-name"
            placeholder="e.g. BugSense Web App"
            value={name}
            onChange={handleNameChange}
            required
            autoFocus
          />
        </div>

        <div className="space-y-1.5">
          <div className="flex items-center justify-between">
            <Label htmlFor="project-key">Project Key</Label>
            <span className="text-xs text-text-muted">
              Used as prefix for issues (e.g. {key || "BUG"}-1)
            </span>
          </div>
          <Input
            id="project-key"
            placeholder="e.g. BUG"
            value={key}
            onChange={handleKeyChange}
            maxLength={10}
            required
            className="font-mono uppercase tracking-wider"
          />
          <p className="text-xs text-text-muted">
            Must be 2–10 uppercase letters or numbers. Immutable once created.
          </p>
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="project-description">
            Description <span className="text-xs text-text-muted">(Optional)</span>
          </Label>
          <textarea
            id="project-description"
            rows={3}
            placeholder="What is this project about?"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            className="placeholder:text-muted-foreground w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
          />
        </div>

        <div className="flex items-center justify-end gap-3 pt-3">
          <Button
            type="button"
            variant="outline"
            onClick={onClose}
            disabled={createMutation.isPending}
          >
            Cancel
          </Button>
          <Button type="submit" disabled={createMutation.isPending}>
            {createMutation.isPending ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Creating...
              </>
            ) : (
              "Create Project"
            )}
          </Button>
        </div>
      </form>
    </Modal>
  );
}
