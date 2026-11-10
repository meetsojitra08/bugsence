import React, { useState } from "react";
import {
  AlertCircle,
  ChevronDown,
  Copy,
  Link2,
  Loader2,
  Mail,
  RefreshCw,
  Shield,
  Trash2,
  UserPlus,
  Users,
} from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Modal } from "@/components/ui/modal";
import { PageHeader } from "@/components/common/PageHeader";
import {
  useProjectInvites,
  useProjectMembers,
  useProjects,
  useRemoveMember,
  useUpdateMemberRole,
} from "../hooks/useProjects";
import { projectsApi } from "../api/projectsApi";
import { useProjectStore } from "@/stores/useProjectStore";
import { useAuth } from "@/features/auth/hooks/useAuth";
import { formatRelativeAge, formatTimeAgo } from "@/lib/format";
import type { ProjectMembership, ProjectRole } from "../types";

export function ProjectMembersPage() {
  const { user: currentUser } = useAuth();
  const { data: projects = [] } = useProjects();
  const { getActiveProject } = useProjectStore();
  const activeProject = getActiveProject(projects);

  const projectId = activeProject?.id || null;
  const { data: members = [], isLoading, error: fetchError } = useProjectMembers(projectId);
  const { data: invites = [], refetch: refetchInvites } = useProjectInvites(projectId);

  const updateRoleMutation = useUpdateMemberRole(projectId || "");
  const removeMutation = useRemoveMember(projectId || "");

  const [isInviteOpen, setIsInviteOpen] = useState(false);
  const [inviteEmail, setInviteEmail] = useState("");
  const [inviteRole, setInviteRole] = useState<ProjectRole>("member");
  const [inviteError, setInviteError] = useState<string | null>(null);
  const [isSendingInvite, setIsSendingInvite] = useState(false);
  const [shareRole, setShareRole] = useState<ProjectRole>("member");
  const [shareUrl, setShareUrl] = useState("");
  const [isGeneratingLink, setIsGeneratingLink] = useState(false);

  const [memberToRemove, setMemberToRemove] = useState<ProjectMembership | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);

  const currentMembership = members.find((m) => m.user.id === currentUser?.id);
  const myRole = activeProject?.my_role || currentMembership?.role || "viewer";
  const canManageMembers = myRole === "owner" || myRole === "admin";
  const isOwner = myRole === "owner";

  const ownerCount = members.filter((m) => m.role === "owner").length;

  const handleSendInvite = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!projectId) return;
    setInviteError(null);
    if (!inviteEmail.trim()) {
      setInviteError("Email is required.");
      return;
    }
    setIsSendingInvite(true);
    try {
      await projectsApi.createInvite(projectId, {
        email: inviteEmail.trim(),
        role: inviteRole,
      });
      toast.success(`Invite sent to ${inviteEmail.trim()}`);
      setIsInviteOpen(false);
      setInviteEmail("");
      setInviteRole("member");
      refetchInvites();
    } catch (err: unknown) {
      setInviteError(err instanceof Error ? err.message : "Failed to send invite.");
    } finally {
      setIsSendingInvite(false);
    }
  };

  const handleGenerateShareLink = async () => {
    if (!projectId) return;
    setIsGeneratingLink(true);
    try {
      const inv = await projectsApi.createInvite(projectId, { role: shareRole });
      const url = `${window.location.origin}/invite/${inv.token}`;
      setShareUrl(url);
      navigator.clipboard?.writeText(url);
      toast.success("Shareable invite link copied");
      refetchInvites();
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : "Could not generate link");
    } finally {
      setIsGeneratingLink(false);
    }
  };

  const handleResendInvite = async (inviteId: string) => {
    if (!projectId) return;
    try {
      await projectsApi.resendInvite(projectId, inviteId);
      toast.success("Invite resent");
      refetchInvites();
    } catch {
      toast.error("Could not resend invite");
    }
  };

  const handleRevokeInvite = async (inviteId: string) => {
    if (!projectId) return;
    try {
      await projectsApi.revokeInvite(projectId, inviteId);
      toast.success("Invite revoked");
      refetchInvites();
    } catch {
      toast.error("Could not revoke invite");
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
      toast.success(`Updated role for ${member.user.full_name || member.user.email}`);
    } catch (err: unknown) {
      setActionError(err instanceof Error ? err.message : "Failed to update role.");
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
      toast.success(`Removed ${memberToRemove.user.full_name || memberToRemove.user.email}`);
      setMemberToRemove(null);
    } catch (err: unknown) {
      setActionError(err instanceof Error ? err.message : "Failed to remove member.");
      setMemberToRemove(null);
    }
  };

  if (!activeProject) {
    return (
      <div className="flex flex-col items-center justify-center p-12 text-center">
        <Users className="h-10 w-10 text-text-muted" />
        <h3 className="mt-4 text-base font-semibold text-text">No project selected</h3>
        <p className="mt-1 text-xs text-text-muted">
          Select or create a project from the top bar to manage members.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-6" data-testid="project-members-page">
      <PageHeader
        eyebrow={`Project · ${activeProject.key}`}
        title="Members"
        description={`Invite teammates by email or shareable link to ${activeProject.name}.`}
        actions={
          canManageMembers ? (
            <Button onClick={() => setIsInviteOpen(true)} className="gap-2">
              <UserPlus className="h-4 w-4" />
              Invite member
            </Button>
          ) : undefined
        }
      />

      {actionError && (
        <div className="flex items-center gap-2 rounded-lg border border-danger/25 bg-danger/10 p-3 text-sm text-danger">
          <AlertCircle className="h-4 w-4 shrink-0" />
          <span>{actionError}</span>
        </div>
      )}

      {fetchError && (
        <div className="flex items-center gap-2 rounded-lg border border-danger/25 bg-danger/10 p-3 text-sm text-danger">
          <AlertCircle className="h-4 w-4 shrink-0" />
          <span>Failed to load project members.</span>
        </div>
      )}

      {/* Shareable Invite Link + Role Explainer */}
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-12">
        {canManageMembers && (
          <div className="rounded-lg border border-border bg-surface p-4 lg:col-span-7">
            <div className="flex items-center gap-2 text-xs font-semibold text-text">
              <Link2 className="h-4 w-4 text-accent" />
              <span>Shareable invite link</span>
            </div>
            <p className="mt-1 text-xs text-text-muted">
              Works for teammates without an account yet — they can create one as they join.
            </p>
            <div className="mt-3 flex flex-wrap items-center gap-2">
              <select
                value={shareRole}
                onChange={(e) => setShareRole(e.target.value as ProjectRole)}
                aria-label="Default role for invite link"
                className="h-9 rounded-md border border-border bg-background px-2.5 text-xs text-text"
              >
                <option value="member">Member</option>
                <option value="viewer">Viewer</option>
                {isOwner && <option value="owner">Owner</option>}
              </select>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={handleGenerateShareLink}
                disabled={isGeneratingLink}
                className="h-9 gap-1.5"
                data-testid="generate-share-link-btn"
              >
                {isGeneratingLink ? (
                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                ) : (
                  <Copy className="h-3.5 w-3.5" />
                )}
                Create &amp; copy link
              </Button>
              {shareUrl && (
                <Input
                  value={shareUrl}
                  readOnly
                  className="h-9 min-w-[200px] flex-1 font-mono text-[11px]"
                />
              )}
            </div>
          </div>
        )}

        <div
          className={`rounded-lg border border-border bg-surface p-4 text-xs ${
            canManageMembers ? "lg:col-span-5" : "lg:col-span-12"
          }`}
        >
          <p className="font-semibold text-text">Roles &amp; permissions</p>
          <ul className="mt-2 space-y-1 text-text-muted">
            <li>
              <strong className="text-text">Owner:</strong> Full project, integration, and member
              control.
            </li>
            <li>
              <strong className="text-text">Member:</strong> Triage Inbox, create, edit, and resolve
              issues.
            </li>
            <li>
              <strong className="text-text">Viewer:</strong> Read-only access for QA &amp;
              stakeholders.
            </li>
          </ul>
        </div>
      </div>

      {/* Members Table */}
      <div className="rounded-lg border border-border bg-surface">
        <div className="flex items-center justify-between border-b border-border px-5 py-3.5">
          <div className="flex items-center gap-2">
            <Users className="h-4 w-4 text-text-muted" />
            <h2 className="text-[13px] font-semibold text-text">Members</h2>
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
            <table className="w-full text-left text-[13px]">
              <thead className="border-b border-border bg-background text-[10px] uppercase tracking-[0.08em] text-text-muted">
                <tr>
                  <th scope="col" className="px-5 py-2.5 font-medium">
                    Member
                  </th>
                  <th scope="col" className="px-5 py-2.5 font-medium">
                    Role
                  </th>
                  <th scope="col" className="px-5 py-2.5 font-medium">
                    Open issues
                  </th>
                  <th scope="col" className="px-5 py-2.5 font-medium">
                    Last active
                  </th>
                  <th scope="col" className="px-5 py-2.5 text-right font-medium">
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
                      <td className="whitespace-nowrap px-5 py-3.5">
                        <div className="flex items-center gap-3">
                          <div className="flex h-8 w-8 items-center justify-center rounded-full bg-accent/15 text-xs font-semibold text-accent">
                            {(member.user.full_name || member.user.email)[0].toUpperCase()}
                          </div>
                          <div>
                            <div className="flex items-center gap-2">
                              <span className="font-medium text-text">
                                {member.user.full_name || "Member"}
                              </span>
                              {isCurrentUser && (
                                <span className="rounded bg-surface-elevated px-1.5 py-0.5 text-[10px] text-text-muted">
                                  You
                                </span>
                              )}
                            </div>
                            <p className="font-mono text-[11px] text-text-muted">
                              {member.user.email}
                            </p>
                          </div>
                        </div>
                      </td>

                      <td className="whitespace-nowrap px-5 py-3.5">
                        {canManageMembers && !isSoleOwner ? (
                          <div className="relative inline-block">
                            <select
                              value={member.role === "admin" ? "member" : member.role}
                              aria-label={`Role for ${member.user.full_name || member.user.email}`}
                              onChange={(e) =>
                                handleRoleChange(member, e.target.value as ProjectRole)
                              }
                              disabled={updateRoleMutation.isPending}
                              className="appearance-none rounded-md border border-border bg-surface px-2.5 py-1 pr-7 text-[12px] font-medium text-text hover:border-text-muted/40 focus:outline-none focus:ring-2 focus:ring-accent"
                            >
                              {isOwner && <option value="owner">Owner</option>}
                              <option value="member">Member</option>
                              <option value="viewer">Viewer</option>
                            </select>
                            <ChevronDown className="pointer-events-none absolute right-2 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-text-muted" />
                          </div>
                        ) : (
                          <span className="inline-flex items-center gap-1 rounded-md border border-border/80 bg-surface-elevated px-2.5 py-1 text-xs font-medium capitalize text-text">
                            <Shield className="h-3 w-3 text-text-muted" />
                            {member.role}
                          </span>
                        )}
                      </td>

                      <td className="whitespace-nowrap px-5 py-3.5 font-mono text-xs text-text">
                        {member.open_issues_count ?? 0}
                      </td>

                      <td className="whitespace-nowrap px-5 py-3.5 text-xs text-text-muted">
                        {member.last_active ? formatRelativeAge(member.last_active) : "–"}
                      </td>

                      <td className="whitespace-nowrap px-5 py-3.5 text-right">
                        {(canManageMembers || isCurrentUser) && !isSoleOwner ? (
                          <Button
                            variant="ghost"
                            size="sm"
                            aria-label={`Remove member ${member.user.full_name || member.user.email}`}
                            onClick={() => setMemberToRemove(member)}
                            className="gap-1 text-text-muted hover:bg-danger/10 hover:text-danger"
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                            <span>Remove</span>
                          </Button>
                        ) : (
                          <span className="text-xs text-text-muted">–</span>
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

      {/* Pending Invites */}
      {canManageMembers && (
        <div className="rounded-lg border border-border bg-surface" data-testid="pending-invites-list">
          <div className="border-b border-border px-5 py-3.5">
            <h2 className="text-[13px] font-semibold text-text">
              Pending invites ({invites.length})
            </h2>
          </div>
          {invites.length === 0 ? (
            <div className="px-5 py-4 text-xs text-text-muted">
              No pending email or link invites.
            </div>
          ) : (
          <div className="divide-y divide-border text-xs">
            {invites.map((inv) => (
              <div
                key={inv.id}
                className="flex flex-wrap items-center justify-between gap-3 px-5 py-3"
              >
                <div className="min-w-0">
                  <p className="font-medium text-text">
                    {inv.email || "Shareable invite link"}
                  </p>
                  <p className="text-[11px] text-text-muted">
                    Role: <span className="capitalize">{inv.role}</span> · Created{" "}
                    {formatTimeAgo(inv.created_at)}
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      const link = `${window.location.origin}/invite/${inv.token}`;
                      navigator.clipboard?.writeText(link);
                      toast.success("Link copied");
                    }}
                    className="h-7 gap-1 text-[11px]"
                  >
                    <Copy className="h-3 w-3" />
                    Copy link
                  </Button>
                  {inv.email && (
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => handleResendInvite(inv.id)}
                      className="h-7 gap-1 text-[11px]"
                      data-testid={`resend-invite-${inv.id}`}
                    >
                      <RefreshCw className="h-3 w-3" />
                      Resend
                    </Button>
                  )}
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() => handleRevokeInvite(inv.id)}
                    className="h-7 text-[11px] text-danger hover:bg-danger/10"
                    data-testid={`revoke-invite-${inv.id}`}
                  >
                    Revoke
                  </Button>
                </div>
              </div>
            ))}
          </div>
          )}
        </div>
      )}

      {/* Email Invite Modal */}
      <Modal
        isOpen={isInviteOpen}
        onClose={() => setIsInviteOpen(false)}
        title="Invite by email"
        description={`Send an invite link to ${activeProject.name}. Works even if they don't have an account yet.`}
      >
        <form onSubmit={handleSendInvite} className="mt-4 space-y-4">
          {inviteError && (
            <div className="rounded-lg border border-danger/25 bg-danger/10 p-3 text-sm text-danger">
              {inviteError}
            </div>
          )}

          <div className="space-y-1.5">
            <Label htmlFor="invite-email">Email</Label>
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
              className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm text-text focus:outline-none focus:ring-2 focus:ring-ring"
            >
              <option value="member">Member (Create, triage, and resolve issues)</option>
              <option value="viewer">Viewer (Read-only for QA &amp; stakeholders)</option>
              {isOwner && <option value="owner">Owner (Full project control)</option>}
            </select>
          </div>

          <div className="flex items-center justify-end gap-3 pt-3">
            <Button
              type="button"
              variant="outline"
              onClick={() => setIsInviteOpen(false)}
              disabled={isSendingInvite}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={isSendingInvite}>
              {isSendingInvite ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Sending…
                </>
              ) : (
                "Send invite"
              )}
            </Button>
          </div>
        </form>
      </Modal>

      {/* Remove Confirmation Modal */}
      <Modal
        isOpen={Boolean(memberToRemove)}
        onClose={() => setMemberToRemove(null)}
        title="Remove member"
        description={
          memberToRemove
            ? `Remove ${memberToRemove.user.full_name || memberToRemove.user.email} from ${activeProject.name}?`
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
            {removeMutation.isPending ? "Removing…" : "Remove member"}
          </Button>
        </div>
      </Modal>
    </div>
  );
}
