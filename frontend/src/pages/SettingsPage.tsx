import { useEffect, useState } from "react";
import { toast } from "sonner";
import { KeyRound, Monitor, Moon, Sun, UserRound } from "lucide-react";
import { useAuth } from "@/features/auth/hooks/useAuth";
import { useTheme } from "@/hooks/useTheme";
import type { Theme } from "@/app/theme-provider";
import { authApi } from "@/features/auth/api/authApi";
import { ApiError } from "@/lib/apiClient";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { PageHeader } from "@/components/common/PageHeader";

function errorMessage(error: unknown, fallback: string): string {
  return error instanceof ApiError || error instanceof Error ? error.message : fallback;
}

export function SettingsPage() {
  const { user, updateUser } = useAuth();
  const { theme, setTheme } = useTheme();

  const [fullName, setFullName] = useState("");
  const [isSavingProfile, setIsSavingProfile] = useState(false);
  const [oldPassword, setOldPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [isSavingPassword, setIsSavingPassword] = useState(false);

  useEffect(() => {
    setFullName(user?.fullName ?? "");
  }, [user?.fullName]);

  const handleProfileSave = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!fullName.trim()) {
      toast.error("Name cannot be empty.");
      return;
    }
    setIsSavingProfile(true);
    try {
      const updated = await authApi.updateMe({ fullName: fullName.trim() });
      updateUser(updated);
      toast.success("Profile updated");
    } catch (error) {
      toast.error(errorMessage(error, "Could not update your profile."));
    } finally {
      setIsSavingProfile(false);
    }
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

  const themes: { value: Theme; label: string; icon: React.ReactNode }[] = [
    { value: "light", label: "Light", icon: <Sun className="h-3.5 w-3.5" /> },
    { value: "dark", label: "Dark", icon: <Moon className="h-3.5 w-3.5" /> },
    { value: "system", label: "System", icon: <Monitor className="h-3.5 w-3.5" /> },
  ];

  return (
    <div className="mx-auto max-w-3xl space-y-6" data-testid="settings-page">
      <PageHeader
        eyebrow="Account"
        title="Settings"
        description="Manage your profile, password, and appearance preferences."
      />

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
                autoComplete="name"
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="settings-email">Email</Label>
              <Input id="settings-email" value={user?.email ?? ""} readOnly disabled />
            </div>
          </div>
          <div className="flex justify-end">
            <Button type="submit" size="sm" disabled={isSavingProfile}>
              {isSavingProfile ? "Saving..." : "Save profile"}
            </Button>
          </div>
        </form>
      </section>

      {/* Password */}
      <section className="rounded-lg border border-border bg-surface p-5">
        <div className="flex items-center gap-2 border-b border-border pb-3">
          <KeyRound className="h-4 w-4 text-accent" />
          <h2 className="text-[13px] font-semibold text-text">Password</h2>
        </div>
        <form onSubmit={handlePasswordSave} className="mt-4 space-y-4">
          <div className="space-y-1.5">
            <Label htmlFor="current-password">Current password</Label>
            <Input
              id="current-password"
              type="password"
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
                type="password"
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
                type="password"
                value={confirmPassword}
                onChange={(event) => setConfirmPassword(event.target.value)}
                autoComplete="new-password"
              />
            </div>
          </div>
          <div className="flex justify-end">
            <Button type="submit" size="sm" disabled={isSavingPassword}>
              {isSavingPassword ? "Updating..." : "Update password"}
            </Button>
          </div>
        </form>
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
  );
}
