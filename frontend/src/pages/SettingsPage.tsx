import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";
import {
  Bell,
  Check,
  Copy,
  Eye,
  EyeOff,
  FolderCog,
  GitPullRequest,
  KeyRound,
  Mail,
  MessageSquare,
  Monitor,
  Moon,
  Plus,
  Radio,
  Sun,
  Trash2,
  UserRound,
  Webhook,
} from "lucide-react";
import { useAuth } from "@/features/auth/hooks/useAuth";
import { useTheme } from "@/hooks/useTheme";
import type { Theme } from "@/app/theme-provider";
import { authApi } from "@/features/auth/api/authApi";
import type { NotificationPreferences } from "@/features/auth/types";
import {
  useDeleteProject,
  useProjectIntegrations,
  useProjectMembers,
  useProjects,
  useUpdateProject,
} from "@/features/projects/hooks/useProjects";
import { projectsApi } from "@/features/projects/api/projectsApi";
import { useCreateLabel, useDeleteLabel, useLabels } from "@/features/issues/hooks/useIssues";
import { useProjectStore } from "@/stores/useProjectStore";
import { ApiError } from "@/lib/apiClient";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { PageHeader } from "@/components/common/PageHeader";
import type { IntegrationProvider, ProjectIntegration } from "@/features/projects/types";

const DEFAULT_PREFS: NotificationPreferences = {
  assigned: { in_app: true, email: true, slack: true },
  mention: { in_app: true, email: true, slack: false },
  pr_status: { in_app: true, email: false, slack: false },
  inbox_arrival: { in_app: true, email: false, slack: true },
  resolved: { in_app: true, email: true, slack: true },
};

const EVENT_LABELS: { key: keyof NotificationPreferences; label: string }[] = [
  { key: "assigned", label: "Issue assigned to me" },
  { key: "mention", label: "@mentioned in a comment" },
  { key: "pr_status", label: "Linked PR opened or CI failed" },
  { key: "inbox_arrival", label: "New report arrives in Inbox" },
  { key: "resolved", label: "Issue I reported is resolved" },
];

function errorMessage(error: unknown, fallback: string): string {
  return error instanceof ApiError || error instanceof Error ? error.message : fallback;
}

export function SettingsPage() {
  const { user, updateUser } = useAuth();
  const { theme, setTheme } = useTheme();
  const navigate = useNavigate();

  const { data: projects = [] } = useProjects();
  const { getActiveProject, setCurrentProjectId } = useProjectStore();
  const activeProject = getActiveProject(projects);

  const [activeTab, setActiveTab] = useState<"account" | "project" | "integrations">("account");

  // Account state
  const [fullName, setFullName] = useState("");
  const [avatarUrl, setAvatarUrl] = useState("");
  const [timezone, setTimezone] = useState("UTC");
  const [prefs, setPrefs] = useState<NotificationPreferences>(DEFAULT_PREFS);
  const [isSavingProfile, setIsSavingProfile] = useState(false);

  // Password state with show/hide
  const [oldPassword, setOldPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPasswords, setShowPasswords] = useState(false);
  const [isSavingPassword, setIsSavingPassword] = useState(false);

  // Project settings state
  const { data: members = [] } = useProjectMembers(activeProject?.id || null);
  const { data: labels = [] } = useLabels(activeProject?.id || null);
  const { data: integrations = [], refetch: refetchIntegrations } = useProjectIntegrations(
    activeProject?.id || null
  );
  const updateProjectMutation = useUpdateProject(activeProject?.id || "");
  const deleteProjectMutation = useDeleteProject();
  const createLabelMutation = useCreateLabel(activeProject?.id || null);
  const deleteLabelMutation = useDeleteLabel(activeProject?.id || null);

  const [projName, setProjName] = useState("");
  const [projDesc, setProjDesc] = useState("");
  const [defaultAssigneeId, setDefaultAssigneeId] = useState("");
  const [rotationEnabled, setRotationEnabled] = useState(false);
  const [rotationCadence, setRotationCadence] = useState<"daily" | "weekly">("weekly");
  const [currentTriagerId, setCurrentTriagerId] = useState("");
  const [aiAutoTriage, setAiAutoTriage] = useState(true);
  const [newLabelName, setNewLabelName] = useState("");
  const [newLabelColor, setNewLabelColor] = useState("#2563EB");

  useEffect(() => {
    setFullName(user?.fullName ?? "");
    setAvatarUrl(user?.avatarUrl ?? "");
    setTimezone(user?.timezone || Intl.DateTimeFormat().resolvedOptions().timeZone || "UTC");
    if (user?.notificationPreferences) setPrefs(user.notificationPreferences);
  }, [user]);

  useEffect(() => {
    if (!activeProject) return;
    setProjName(activeProject.name);
    setProjDesc(activeProject.description || "");
    setDefaultAssigneeId(activeProject.default_assignee_id || "");
    setRotationEnabled(Boolean(activeProject.triage_rotation_enabled));
    setRotationCadence(activeProject.triage_rotation_cadence || "weekly");
    setCurrentTriagerId(activeProject.current_triager_id || "");
    setAiAutoTriage(activeProject.ai_auto_triage ?? true);
  }, [activeProject]);

  const handleProfileSave = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!fullName.trim()) {
      toast.error("Name cannot be empty.");
      return;
    }
    setIsSavingProfile(true);
    try {
      const updated = await authApi.updateMe({
        fullName: fullName.trim(),
        avatarUrl: avatarUrl.trim(),
        timezone,
        notificationPreferences: prefs,
      });
      updateUser(updated);
      toast.success("Account settings saved");
    } catch (error) {
      toast.error(errorMessage(error, "Could not update your profile."));
    } finally {
      setIsSavingProfile(false);
    }
  };

  const togglePref = (eventKey: keyof NotificationPreferences, channel: "in_app" | "email" | "slack") => {
    const next = {
      ...prefs,
      [eventKey]: {
        ...prefs[eventKey],
        [channel]: !prefs[eventKey][channel],
      },
    };
    setPrefs(next);
    authApi
      .updateMe({ notificationPreferences: next })
      .then((updated) => updateUser(updated))
      .catch(() => {});
  };

  const handlePasswordSave = async (event: React.FormEvent) => {
    event.preventDefault();
    if (newPassword.length < 8) {
      toast.error("New password must be at least 8 characters.");
      return;
    }
    if (newPassword !== confirmPassword) {
      toast.error("New passwords do not match.");
      return;
    }
    setIsSavingPassword(true);
    try {
      await authApi.changePassword({ oldPassword, newPassword });
      setOldPassword("");
      setNewPassword("");
      setConfirmPassword("");
      toast.success("Password updated");
    } catch (error) {
      toast.error(errorMessage(error, "Could not update your password."));
    } finally {
      setIsSavingPassword(false);
    }
  };

  const handleProjectSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeProject) return;
    try {
      await updateProjectMutation.mutateAsync({
        name: projName.trim(),
        description: projDesc.trim(),
        default_assignee_id: defaultAssigneeId || null,
        triage_rotation_enabled: rotationEnabled,
        triage_rotation_cadence: rotationCadence,
        current_triager_id: currentTriagerId || null,
        ai_auto_triage: aiAutoTriage,
      });
      toast.success("Project settings saved");
    } catch (err) {
      toast.error(errorMessage(err, "Could not update project settings"));
    }
  };

  const handleToggleIntegration = async (
    integration: ProjectIntegration,
    patch: { enabled?: boolean; config?: Record<string, unknown> }
  ) => {
    if (!activeProject) return;
    try {
      await projectsApi.updateIntegration(activeProject.id, integration.provider, patch);
      toast.success("Integration updated");
      refetchIntegrations();
    } catch (err) {
      toast.error(errorMessage(err, "Could not update integration"));
    }
  };

  const themes: { value: Theme; label: string; icon: React.ReactNode }[] = [
    { value: "light", label: "Light", icon: <Sun className="h-3.5 w-3.5" /> },
    { value: "dark", label: "Dark", icon: <Moon className="h-3.5 w-3.5" /> },
    { value: "system", label: "System", icon: <Monitor className="h-3.5 w-3.5" /> },
  ];

  const origin = typeof window !== "undefined" ? window.location.origin : "";
  const projKey = activeProject?.key || "PROJ";

  const integrationMeta: Record<
    IntegrationProvider,
    { title: string; subtitle: string; endpoint: string; icon: React.ReactNode }
  > = {
    github: {
      title: "GitHub",
      subtitle: "Link PRs automatically, move issues to In Review on open, and Done on merge.",
      endpoint: `${origin}/api/v1/integrations/github/webhook/${projKey}/`,
      icon: <GitPullRequest className="h-4 w-4 text-accent" />,
    },
    slack: {
      title: "Slack",
      subtitle: "Send /bug messages or reactions to Inbox, and post assignment/resolution updates.",
      endpoint: `${origin}/api/v1/integrations/slack/command/${projKey}/`,
      icon: <MessageSquare className="h-4 w-4 text-accent" />,
    },
    email_in: {
      title: "Email-in",
      subtitle: `Forward customer emails to bugs@${projKey.toLowerCase()}.bugsense.app into Inbox.`,
      endpoint: `${origin}/api/v1/integrations/email/inbound/${projKey}/`,
      icon: <Mail className="h-4 w-4 text-accent" />,
    },
    sentry: {
      title: "Sentry / Error tracker",
      subtitle: "Create deduplicated Inbox issues from incoming error webhooks.",
      endpoint: `${origin}/api/v1/integrations/sentry/webhook/${projKey}/`,
      icon: <Radio className="h-4 w-4 text-accent" />,
    },
    public_form: {
      title: "Public report form",
      subtitle: "Shareable bug intake form for QA and customers without requiring an account.",
      endpoint: `${origin}/report/${projKey.toLowerCase()}`,
      icon: <Webhook className="h-4 w-4 text-accent" />,
    },
  };

  return (
    <div className="space-y-6" data-testid="settings-page">
      <PageHeader
        eyebrow="Settings"
        title="Settings"
        description="Account preferences, project workflow, and connected tools."
      />

      {/* Tabs: Account | Project | Integrations */}
      <div className="flex gap-1 border-b border-border" role="tablist">
        {[
          { id: "account", label: "Account" },
          { id: "project", label: "Project" },
          { id: "integrations", label: "Integrations" },
        ].map((tab) => (
          <button
            key={tab.id}
            type="button"
            role="tab"
            aria-selected={activeTab === tab.id}
            onClick={() => setActiveTab(tab.id as typeof activeTab)}
            className={`border-b-2 px-4 py-2 text-xs font-medium transition-colors ${
              activeTab === tab.id
                ? "border-accent text-accent"
                : "border-transparent text-text-muted hover:text-text"
            }`}
            data-testid={`settings-tab-${tab.id}`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {activeTab === "account" && (
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-12">
          <div className="space-y-6 lg:col-span-7">
            {/* Profile */}
            <section className="rounded-lg border border-border bg-surface p-5">
              <div className="flex items-center gap-2 border-b border-border pb-3">
                <UserRound className="h-4 w-4 text-accent" />
                <h2 className="text-[13px] font-semibold text-text">Profile</h2>
              </div>
              <form onSubmit={handleProfileSave} className="mt-4 space-y-4">
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                  <div className="space-y-1.5">
                    <Label htmlFor="settings-name">Full name</Label>
                    <Input
                      id="settings-name"
                      value={fullName}
                      onChange={(event) => setFullName(event.target.value)}
                      placeholder="Your name"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label htmlFor="settings-email">Email (locked)</Label>
                    <Input id="settings-email" value={user?.email ?? ""} readOnly disabled />
                    <p className="text-[11px] text-text-muted">
                      Used as your sign-in identifier and for issue notifications.
                    </p>
                  </div>
                </div>

                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                  <div className="space-y-1.5">
                    <Label htmlFor="settings-avatar">Avatar URL</Label>
                    <Input
                      id="settings-avatar"
                      value={avatarUrl}
                      onChange={(e) => setAvatarUrl(e.target.value)}
                      placeholder="https://…"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label htmlFor="settings-timezone">Timezone</Label>
                    <select
                      id="settings-timezone"
                      value={timezone}
                      onChange={(e) => setTimezone(e.target.value)}
                      className="h-9 w-full rounded-md border border-input bg-background px-2.5 text-xs text-text"
                    >
                      <option value="UTC">UTC</option>
                      <option value="America/Los_Angeles">America/Los_Angeles</option>
                      <option value="America/New_York">America/New_York</option>
                      <option value="Europe/London">Europe/London</option>
                      <option value="Europe/Berlin">Europe/Berlin</option>
                      <option value="Asia/Kolkata">Asia/Kolkata</option>
                      <option value="Asia/Tokyo">Asia/Tokyo</option>
                    </select>
                  </div>
                </div>

                <div className="flex justify-end">
                  <Button type="submit" size="sm" disabled={isSavingProfile}>
                    {isSavingProfile ? "Saving…" : "Save profile"}
                  </Button>
                </div>
              </form>
            </section>

            {/* Password with Show/Hide */}
            <section className="rounded-lg border border-border bg-surface p-5">
              <div className="flex items-center justify-between border-b border-border pb-3">
                <div className="flex items-center gap-2">
                  <KeyRound className="h-4 w-4 text-accent" />
                  <h2 className="text-[13px] font-semibold text-text">Password</h2>
                </div>
                <button
                  type="button"
                  onClick={() => setShowPasswords((v) => !v)}
                  className="inline-flex items-center gap-1 text-xs text-text-muted hover:text-text"
                >
                  {showPasswords ? <EyeOff className="h-3.5 w-3.5" /> : <Eye className="h-3.5 w-3.5" />}
                  {showPasswords ? "Hide" : "Show"}
                </button>
              </div>
              <form onSubmit={handlePasswordSave} className="mt-4 space-y-4">
                <div className="space-y-1.5">
                  <Label htmlFor="current-password">Current password</Label>
                  <Input
                    id="current-password"
                    type={showPasswords ? "text" : "password"}
                    value={oldPassword}
                    onChange={(event) => setOldPassword(event.target.value)}
                    autoComplete="current-password"
                  />
                </div>
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                  <div className="space-y-1.5">
                    <Label htmlFor="new-password">New password</Label>
                    <Input
                      id="new-password"
                      type={showPasswords ? "text" : "password"}
                      value={newPassword}
                      onChange={(event) => setNewPassword(event.target.value)}
                      autoComplete="new-password"
                      placeholder="At least 8 characters"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label htmlFor="confirm-password">Confirm new password</Label>
                    <Input
                      id="confirm-password"
                      type={showPasswords ? "text" : "password"}
                      value={confirmPassword}
                      onChange={(event) => setConfirmPassword(event.target.value)}
                      autoComplete="new-password"
                    />
                  </div>
                </div>
                <div className="flex justify-end">
                  <Button type="submit" size="sm" disabled={isSavingPassword}>
                    {isSavingPassword ? "Updating…" : "Update password"}
                  </Button>
                </div>
              </form>
            </section>
          </div>

          <div className="space-y-6 lg:col-span-5">
            {/* Notification Preferences */}
            <section className="rounded-lg border border-border bg-surface p-5">
              <div className="flex items-center gap-2 border-b border-border pb-3">
                <Bell className="h-4 w-4 text-accent" />
                <h2 className="text-[13px] font-semibold text-text">Notifications</h2>
              </div>
              <div className="mt-3 overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead>
                    <tr className="text-[10px] uppercase tracking-wider text-text-muted">
                      <th className="py-2 font-medium">Event</th>
                      <th className="py-2 text-center font-medium">App</th>
                      <th className="py-2 text-center font-medium">Email</th>
                      <th className="py-2 text-center font-medium">Slack</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border/60">
                    {EVENT_LABELS.map((ev) => (
                      <tr key={ev.key}>
                        <td className="py-2.5 pr-2 text-text">{ev.label}</td>
                        {(["in_app", "email", "slack"] as const).map((ch) => (
                          <td key={ch} className="py-2.5 text-center">
                            <input
                              type="checkbox"
                              checked={prefs[ev.key][ch]}
                              onChange={() => togglePref(ev.key, ch)}
                              aria-label={`${ev.label} via ${ch}`}
                              className="rounded border-border text-accent"
                            />
                          </td>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </section>

            {/* Appearance */}
            <section className="rounded-lg border border-border bg-surface p-5">
              <div className="flex items-center gap-2 border-b border-border pb-3">
                <Sun className="h-4 w-4 text-accent" />
                <h2 className="text-[13px] font-semibold text-text">Appearance</h2>
              </div>
              <div className="mt-4 flex flex-wrap gap-2">
                {themes.map((option) => (
                  <button
                    key={option.value}
                    type="button"
                    onClick={() => setTheme(option.value)}
                    aria-pressed={theme === option.value}
                    className={`inline-flex items-center gap-1.5 rounded-md border px-3 py-1.5 text-xs font-medium transition-colors ${
                      theme === option.value
                        ? "border-accent bg-accent/10 text-accent"
                        : "border-border bg-background text-text-muted hover:text-text"
                    }`}
                  >
                    {option.icon}
                    {option.label}
                  </button>
                ))}
              </div>
            </section>
          </div>
        </div>
      )}

      {activeTab === "project" && activeProject && (
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-12">
          <form
            onSubmit={handleProjectSave}
            className="space-y-5 rounded-lg border border-border bg-surface p-5 lg:col-span-7"
          >
            <div className="flex items-center gap-2 border-b border-border pb-3">
              <FolderCog className="h-4 w-4 text-accent" />
              <h2 className="text-[13px] font-semibold text-text">
                Project settings ({activeProject.key})
              </h2>
            </div>

            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div className="space-y-1">
                <Label htmlFor="proj-name">Name</Label>
                <Input
                  id="proj-name"
                  value={projName}
                  onChange={(e) => setProjName(e.target.value)}
                  required
                />
              </div>
              <div className="space-y-1">
                <Label htmlFor="proj-key">Issue key</Label>
                <Input id="proj-key" value={activeProject.key} readOnly disabled className="font-mono" />
              </div>
            </div>

            <div className="space-y-1">
              <Label htmlFor="proj-desc">Description</Label>
              <Input
                id="proj-desc"
                value={projDesc}
                onChange={(e) => setProjDesc(e.target.value)}
                placeholder="What does this project cover?"
              />
            </div>

            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div className="space-y-1">
                <Label htmlFor="proj-default-assignee">Default assignee</Label>
                <select
                  id="proj-default-assignee"
                  value={defaultAssigneeId}
                  onChange={(e) => setDefaultAssigneeId(e.target.value)}
                  className="h-9 w-full rounded-md border border-input bg-background px-2 text-xs text-text"
                >
                  <option value="">None (leave unassigned)</option>
                  {members.map((m) => (
                    <option key={m.id} value={m.user.id}>
                      {m.user.full_name || m.user.email}
                    </option>
                  ))}
                </select>
              </div>

              <div className="space-y-1">
                <Label htmlFor="proj-triager">Current triager</Label>
                <select
                  id="proj-triager"
                  value={currentTriagerId}
                  onChange={(e) => setCurrentTriagerId(e.target.value)}
                  className="h-9 w-full rounded-md border border-input bg-background px-2 text-xs text-text"
                >
                  <option value="">Unassigned</option>
                  {members.map((m) => (
                    <option key={m.id} value={m.user.id}>
                      {m.user.full_name || m.user.email}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div className="space-y-2 rounded-lg border border-border bg-background/50 p-3 text-xs">
              <div className="flex items-center justify-between">
                <label className="flex cursor-pointer items-center gap-2 font-medium text-text">
                  <input
                    type="checkbox"
                    checked={rotationEnabled}
                    onChange={(e) => setRotationEnabled(e.target.checked)}
                    className="rounded border-border text-accent"
                  />
                  Triage rotation
                </label>
                <select
                  value={rotationCadence}
                  onChange={(e) => setRotationCadence(e.target.value as "daily" | "weekly")}
                  disabled={!rotationEnabled}
                  className="h-7 rounded border border-border bg-surface px-2 text-xs text-text"
                >
                  <option value="weekly">Rotate weekly</option>
                  <option value="daily">Rotate daily</option>
                </select>
              </div>
              <p className="text-[11px] text-text-muted">
                Inbox notifications ping only the active triager, with a nudge to everyone if an
                item sits over 24 hours.
              </p>
            </div>

            <label className="flex cursor-pointer items-center gap-2 text-xs text-text">
              <input
                type="checkbox"
                checked={aiAutoTriage}
                onChange={(e) => setAiAutoTriage(e.target.checked)}
                className="rounded border-border text-accent"
              />
              Automatically triage incoming Inbox &amp; pasted bug reports
            </label>

            <div className="flex justify-end border-t border-border pt-3">
              <Button type="submit" size="sm" disabled={updateProjectMutation.isPending}>
                {updateProjectMutation.isPending ? "Saving…" : "Save project settings"}
              </Button>
            </div>
          </form>

          <div className="space-y-6 lg:col-span-5">
            {/* Labels */}
            <section className="rounded-lg border border-border bg-surface p-5 space-y-3">
              <h2 className="border-b border-border pb-2.5 text-[13px] font-semibold text-text">
                Labels
              </h2>
              <div className="flex flex-wrap gap-1.5">
                {labels.map((lbl) => (
                  <span
                    key={lbl.id}
                    className="inline-flex items-center gap-1.5 rounded border border-border px-2 py-0.5 text-xs"
                  >
                    <span className="h-2 w-2 rounded-full" style={{ backgroundColor: lbl.color }} />
                    {lbl.name}
                    <button
                      type="button"
                      onClick={() => deleteLabelMutation.mutate(lbl.id)}
                      className="text-text-muted hover:text-danger"
                      aria-label={`Delete label ${lbl.name}`}
                    >
                      ×
                    </button>
                  </span>
                ))}
              </div>
              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  if (!newLabelName.trim()) return;
                  createLabelMutation.mutate(
                    { name: newLabelName.trim(), color: newLabelColor },
                    {
                      onSuccess: () => {
                        setNewLabelName("");
                        toast.success("Label created");
                      },
                    }
                  );
                }}
                className="flex items-center gap-2"
              >
                <input
                  type="color"
                  value={newLabelColor}
                  onChange={(e) => setNewLabelColor(e.target.value)}
                  className="h-8 w-8 cursor-pointer rounded border border-border bg-background p-0.5"
                />
                <Input
                  value={newLabelName}
                  onChange={(e) => setNewLabelName(e.target.value)}
                  placeholder="New label…"
                  className="h-8 text-xs"
                />
                <Button type="submit" size="sm" variant="outline" className="h-8 gap-1">
                  <Plus className="h-3.5 w-3.5" /> Add
                </Button>
              </form>
            </section>

            {/* Archive / Delete Project */}
            <section className="rounded-lg border border-danger/30 bg-danger/5 p-5 space-y-3">
              <h2 className="text-[13px] font-semibold text-danger">Archive or delete project</h2>
              <p className="text-xs text-text-muted">
                Archive hides the project from active lists. Deleting permanently removes all issues.
              </p>
              <div className="flex flex-wrap gap-2">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() =>
                    updateProjectMutation.mutate(
                      { archived: !activeProject.archived },
                      {
                        onSuccess: () =>
                          toast.success(
                            activeProject.archived ? "Project unarchived" : "Project archived"
                          ),
                      }
                    )
                  }
                >
                  {activeProject.archived ? "Unarchive project" : "Archive project"}
                </Button>
                <Button
                  type="button"
                  variant="destructive"
                  size="sm"
                  onClick={() => {
                    deleteProjectMutation.mutate(activeProject.id, {
                      onSuccess: () => {
                        setCurrentProjectId(null);
                        toast.success("Project deleted");
                        navigate("/today");
                      },
                    });
                  }}
                >
                  <Trash2 className="mr-1.5 h-3.5 w-3.5" />
                  Delete project
                </Button>
              </div>
            </section>
          </div>
        </div>
      )}

      {activeTab === "integrations" && activeProject && (
        <div className="space-y-4" data-testid="integrations-settings">
          {integrations.map((item) => {
            const meta = integrationMeta[item.provider];
            if (!meta) return null;

            return (
              <div
                key={item.id}
                className="rounded-lg border border-border bg-surface p-5 space-y-3"
                data-testid={`integration-card-${item.provider}`}
              >
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div className="flex items-start gap-3">
                    <div className="mt-0.5 flex h-8 w-8 items-center justify-center rounded-md border border-border bg-background">
                      {meta.icon}
                    </div>
                    <div>
                      <h3 className="text-sm font-semibold text-text">{meta.title}</h3>
                      <p className="text-xs text-text-muted">{meta.subtitle}</p>
                    </div>
                  </div>
                  <label className="inline-flex cursor-pointer items-center gap-2 text-xs font-medium text-text">
                    <input
                      type="checkbox"
                      checked={item.enabled}
                      onChange={(e) => handleToggleIntegration(item, { enabled: e.target.checked })}
                      className="rounded border-border text-accent"
                    />
                    {item.enabled ? "Enabled" : "Off"}
                  </label>
                </div>

                <div className="flex flex-wrap items-center gap-2 rounded-md border border-border bg-background/50 p-2.5">
                  <span className="text-[11px] font-medium text-text-muted">
                    {item.provider === "public_form" ? "Share link:" : "Endpoint:"}
                  </span>
                  <code className="flex-1 truncate font-mono text-[11px] text-text">
                    {meta.endpoint}
                  </code>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    className="h-7 gap-1 text-[11px]"
                    onClick={() => {
                      navigator.clipboard?.writeText(meta.endpoint);
                      toast.success(`${meta.title} URL copied`);
                    }}
                  >
                    <Copy className="h-3 w-3" />
                    Copy
                  </Button>
                </div>

                {item.provider === "slack" && (
                  <div className="flex flex-wrap items-center gap-2 pt-1">
                    <Input
                      defaultValue={String(item.config?.webhook_url || "")}
                      placeholder="Slack Incoming Webhook URL (https://hooks.slack.com/services/...)"
                      className="h-8 flex-1 text-xs"
                      onBlur={(e) =>
                        handleToggleIntegration(item, {
                          config: { webhook_url: e.target.value.trim() },
                        })
                      }
                    />
                    <span className="inline-flex items-center gap-1 text-[11px] text-text-muted">
                      <Check className="h-3 w-3 text-success" /> Posts assignments &amp; resolutions
                    </span>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
