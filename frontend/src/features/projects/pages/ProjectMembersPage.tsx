import React, { useState } from "react";
import {
  AlertCircle,
  Check,
  ChevronDown,
  Loader2,
  Mail,
  Shield,
  Trash2,
  UserPlus,
  Users,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Modal } from "@/components/ui/modal";
import { ProjectBadge } from "../components/ProjectBadge";
import {
  useInviteMember,
  useProjectMembers,
  useProjects,
  useRemoveMember,
  useUpdateMemberRole,
} from "../hooks/useProjects";
import { useProjectStore } from "@/stores/useProjectStore";
import { useAuth } from "@/features/auth/hooks/useAuth";
import type { ProjectMembership, ProjectRole } from "../types";

export function ProjectMembersPage() {
  const { user: currentUser } = useAuth();
  const { data: projects = [] } = useProjects();
  const { getActiveProject } = useProjectStore();
  const activeProject = getActiveProject(projects);

  const projectId = activeProject?.id || null;
  const { data: members = [], isLoading, error: fetchError } = useProjectMembers(projectId);

  const inviteMutation = useInviteMember(projectId || "");
  const updateRoleMutation = useUpdateMemberRole(projectId || "");
  const removeMutation = useRemoveMember(projectId || "");

  // Modal states
  const [isInviteOpen, setIsInviteOpen] = useState(false);
  const [inviteEmail, setInviteEmail] = useState("");
  const [inviteRole, setInviteRole] = useState<ProjectRole>("member");
  const [inviteError, setInviteError] = useState<string | null>(null);

  const [memberToRemove, setMemberToRemove] = useState<ProjectMembership | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  const currentMembership = members.find((m) => m.user.id === currentUser?.id);
  const myRole = activeProject?.my_role || currentMembership?.role || "viewer";
  const canManageMembers = myRole === "owner" || myRole === "admin";

  const ownerCount = members.filter((m) => m.role === "owner").length;

  const handleInvite = async (e: React.FormEvent) => {
    e.preventDefault();
    setInviteError(null);

    if (!inviteEmail.trim()) {
      setInviteError("Email is required.");
      return;
    }

    try {
      await inviteMutation.mutateAsync({
        email: inviteEmail.trim(),
        role: inviteRole,
      });
      setIsInviteOpen(false);
      setInviteEmail("");
      setInviteRole("member");
      setSuccessMessage(`Invited ${inviteEmail} successfully.`);
      setTimeout(() => setSuccessMessage(null), 4000);
    } catch (err: unknown) {
      if (err instanceof Error) {
        setInviteError(err.message);
      } else {
        setInviteError("Failed to invite member.");
      }
    }
  };

  const handleRoleChange = async (member: ProjectMembership, newRole: ProjectRole) => {
    setActionError(null);
    if (member.role === "owner" && newRole !== "owner" && ownerCount <= 1) {
      setActionError("Cannot demote the only owner of this project.");
      return;
    }

    try {
      await updateRoleMutation.mutateAsync({
        memberId: member.id,
        data: { role: newRole },
      });
      setSuccessMessage(`Updated role for ${member.user.full_name || member.user.email}.`);
      setTimeout(() => setSuccessMessage(null), 3000);
    } catch (err: unknown) {
      if (err instanceof Error) {
        setActionError(err.message);
      } else {
        setActionError("Failed to update role.");
      }
    }
  };

  const handleConfirmRemove = async () => {
    if (!memberToRemove) return;
    setActionError(null);

    if (memberToRemove.role === "owner" && ownerCount <= 1) {
      setActionError("Cannot remove the only owner of this project.");
      setMemberToRemove(null);
      return;
    }

    try {
      await removeMutation.mutateAsync(memberToRemove.id);
      setSuccessMessage(`Removed ${memberToRemove.user.full_name || memberToRemove.user.email}.`);
      setMemberToRemove(null);
      setTimeout(() => setSuccessMessage(null), 3000);
    } catch (err: unknown) {
      if (err instanceof Error) {
        setActionError(err.message);
      } else {
        setActionError("Failed to remove member.");
      }
      setMemberToRemove(null);
    }
  };

  if (!activeProject) {
    return (
      <div className="flex flex-col items-center justify-center p-12 text-center">
        <Users className="h-12 w-12 text-text-muted" />
        <h3 className="text-text-primary mt-4 text-lg font-semibold">No Project Selected</h3>
        <p className="mt-1 text-sm text-text-muted">
          Select or create a project from the top bar to view team members.
        </p>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-5xl space-y-6 p-6">
      {/* Page Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-3">
          <ProjectBadge name={activeProject.name} projectKey={activeProject.key} size="lg" />
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-text-primary text-xl font-bold">{activeProject.name}</h1>
              <span className="font-mono text-xs font-semibold text-text-muted">
                [{activeProject.key}]
              </span>
            </div>
            <p className="text-sm text-text-muted">
              Manage workspace access and member permissions.
            </p>
          </div>
        </div>

        {canManageMembers && (
          <Button
            onClick={() => setIsInviteOpen(true)}
            className="flex items-center gap-2 self-start sm:self-auto"
          >
            <UserPlus className="h-4 w-4" />
            <span>Invite Member</span>
          </Button>
        )}
      </div>

      {/* Notifications */}
      {successMessage && (
        <div className="flex items-center gap-2 rounded-lg border border-emerald-500/20 bg-emerald-500/10 p-3 text-sm text-emerald-600 dark:text-emerald-400">
          <Check className="h-4 w-4 shrink-0" />
          <span>{successMessage}</span>
        </div>
      )}

      {actionError && (
        <div className="flex items-center gap-2 rounded-lg border border-red-500/20 bg-red-500/10 p-3 text-sm text-red-500">
          <AlertCircle className="h-4 w-4 shrink-0" />
          <span>{actionError}</span>
        </div>
      )}

      {fetchError && (
        <div className="flex items-center gap-2 rounded-lg border border-red-500/20 bg-red-500/10 p-3 text-sm text-red-500">
          <AlertCircle className="h-4 w-4 shrink-0" />
          <span>Failed to load team members.</span>
        </div>
      )}

      {/* Members Card & Table */}
      <div className="rounded-xl border border-border bg-surface shadow-sm">
        <div className="flex items-center justify-between border-b border-border px-6 py-4">
          <div className="flex items-center gap-2">
            <Users className="h-5 w-5 text-text-muted" />
            <h2 className="text-text-primary text-sm font-semibold">Team Members</h2>
            <span className="rounded-full bg-surface-elevated px-2 py-0.5 text-xs text-text-muted">
              {members.length}
            </span>
          </div>
        </div>

        {isLoading ? (
          <div className="flex items-center justify-center p-12">
            <Loader2 className="h-6 w-6 animate-spin text-text-muted" />
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="bg-surface-elevated/40 text-xs uppercase text-text-muted">
                <tr>
                  <th scope="col" className="px-6 py-3 font-medium">
                    User
                  </th>
                  <th scope="col" className="px-6 py-3 font-medium">
                    Email
                  </th>
                  <th scope="col" className="px-6 py-3 font-medium">
                    Role
                  </th>
                  <th scope="col" className="px-6 py-3 text-right font-medium">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {members.map((member) => {
                  const isCurrentUser = member.user.id === currentUser?.id;
                  const isSoleOwner = member.role === "owner" && ownerCount <= 1;

                  return (
                    <tr key={member.id} className="transition-colors hover:bg-surface-elevated/20">
                      {/* Name & Avatar */}
                      <td className="whitespace-nowrap px-6 py-4">
                        <div className="flex items-center gap-3">
                          <div className="flex h-9 w-9 items-center justify-center rounded-full bg-primary/10 font-semibold text-primary">
                            {(member.user.full_name || member.user.email)[0].toUpperCase()}
                          </div>
                          <div>
                            <div className="flex items-center gap-2">
                              <span className="text-text-primary font-medium">
                                {member.user.full_name || "Team Member"}
                              </span>
                              {isCurrentUser && (
                                <span className="py-0.2 rounded bg-surface-elevated px-1.5 text-[10px] text-text-muted">
                                  You
                                </span>
                              )}
                            </div>
                          </div>
                        </div>
                      </td>

                      {/* Email */}
                      <td className="whitespace-nowrap px-6 py-4 font-mono text-xs text-text-muted">
                        {member.user.email}
                      </td>

                      {/* Role selection / badge */}
                      <td className="whitespace-nowrap px-6 py-4">
                        {canManageMembers && !isSoleOwner ? (
                          <div className="relative inline-block">
                            <select
                              value={member.role}
                              aria-label={`Role for ${member.user.full_name || member.user.email}`}
                              onChange={(e) =>
                                handleRoleChange(member, e.target.value as ProjectRole)
                              }
                              disabled={updateRoleMutation.isPending}
                              className="text-text-primary appearance-none rounded-lg border border-border bg-surface-elevated px-3 py-1.5 pr-8 text-xs font-medium hover:border-primary/50 focus:outline-none focus:ring-2 focus:ring-primary"
                            >
                              <option value="owner">Owner</option>
                              <option value="admin">Admin</option>
                              <option value="member">Member</option>
                              <option value="viewer">Viewer</option>
                            </select>
                            <ChevronDown className="pointer-events-none absolute right-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-text-muted" />
                          </div>
                        ) : (
                          <span
                            className="text-text-primary inline-flex items-center gap-1 rounded-md border border-border/80 bg-surface-elevated px-2.5 py-1 text-xs font-medium capitalize"
                            title={isSoleOwner ? "Sole project owner" : undefined}
                          >
                            <Shield className="h-3 w-3 text-text-muted" />
                            {member.role}
                          </span>
                        )}
                      </td>

                      {/* Actions */}
                      <td className="whitespace-nowrap px-6 py-4 text-right">
                        {(canManageMembers || isCurrentUser) && !isSoleOwner ? (
                          <Button
                            variant="ghost"
                            size="sm"
                            aria-label={`Remove member ${member.user.full_name || member.user.email}`}
                            onClick={() => setMemberToRemove(member)}
                            className="text-text-muted hover:bg-red-500/10 hover:text-red-500"
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        ) : (
                          <span
                            className="text-xs text-text-muted"
                            title={isSoleOwner ? "Cannot remove sole owner" : ""}
                          >
                            —
                          </span>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Invite Member Modal */}
      <Modal
        isOpen={isInviteOpen}
        onClose={() => setIsInviteOpen(false)}
        title="Invite Member to Project"
        description={`Add an existing user to ${activeProject.name} by their email address.`}
      >
        <form onSubmit={handleInvite} className="mt-4 space-y-4">
          {inviteError && (
            <div className="rounded-lg border border-red-500/20 bg-red-500/10 p-3 text-sm text-red-500">
              {inviteError}
            </div>
          )}

          <div className="space-y-1.5">
            <Label htmlFor="invite-email">User Email</Label>
            <div className="relative">
              <Mail className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-text-muted" />
              <Input
                id="invite-email"
                type="email"
                placeholder="colleague@company.com"
                value={inviteEmail}
                onChange={(e) => setInviteEmail(e.target.value)}
                required
                className="pl-9"
                autoFocus
              />
            </div>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="invite-role">Role</Label>
            <select
              id="invite-role"
              value={inviteRole}
              onChange={(e) => setInviteRole(e.target.value as ProjectRole)}
              className="text-text-primary w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
            >
              <option value="member">Member (Can create, edit, and comment on issues)</option>
              <option value="admin">Admin (Can manage settings and invite members)</option>
              <option value="viewer">Viewer (Read-only access)</option>
              <option value="owner">Owner (Full control over project)</option>
            </select>
          </div>

          <div className="flex items-center justify-end gap-3 pt-3">
            <Button
              type="button"
              variant="outline"
              onClick={() => setIsInviteOpen(false)}
              disabled={inviteMutation.isPending}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={inviteMutation.isPending}>
              {inviteMutation.isPending ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Sending...
                </>
              ) : (
                "Send Invite"
              )}
            </Button>
          </div>
        </form>
      </Modal>

      {/* Remove Confirmation Modal */}
      <Modal
        isOpen={Boolean(memberToRemove)}
        onClose={() => setMemberToRemove(null)}
        title="Remove Member"
        description={
          memberToRemove
            ? `Are you sure you want to remove ${
                memberToRemove.user.full_name || memberToRemove.user.email
              } from ${activeProject.name}? They will lose access immediately.`
            : ""
        }
      >
        <div className="mt-4 flex items-center justify-end gap-3">
          <Button
            variant="outline"
            onClick={() => setMemberToRemove(null)}
            disabled={removeMutation.isPending}
          >
            Cancel
          </Button>
          <Button
            variant="destructive"
            onClick={handleConfirmRemove}
            disabled={removeMutation.isPending}
          >
            {removeMutation.isPending ? "Removing..." : "Remove Member"}
          </Button>
        </div>
      </Modal>
    </div>
  );
}
