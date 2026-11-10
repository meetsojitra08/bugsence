/** Shared formatting, platform shortcut, and pluralization utilities. */

export function pluralize(count: number, singular: string, plural?: string): string {
  const form = count === 1 ? singular : (plural ?? `${singular}s`);
  return `${count} ${form}`;
}

export function isMacPlatform(): boolean {
  if (typeof navigator === "undefined") return false;
  const platform =
    (navigator as Navigator & { userAgentData?: { platform?: string } }).userAgentData?.platform ||
    navigator.platform ||
    navigator.userAgent ||
    "";
  return /mac|iphone|ipad|ipod/i.test(platform);
}

export function modKeyLabel(): string {
  return isMacPlatform() ? "⌘" : "Ctrl+";
}

export function formatShortcut(key: string): string {
  return `${modKeyLabel()}${key}`;
}

export function formatRelativeAge(dateInput?: string | null): string {
  if (!dateInput) return "–";
  const ts = new Date(dateInput).getTime();
  if (!Number.isFinite(ts)) return "–";
  const diffMs = Math.max(0, Date.now() - ts);
  const mins = Math.floor(diffMs / 60_000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins}m`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h`;
  const days = Math.floor(hours / 24);
  if (days < 30) return `${days}d`;
  const months = Math.floor(days / 30);
  return `${months}mo`;
}

/** Formats relative time with natural 'ago' phrasing without producing 'just now ago'. */
export function formatTimeAgo(dateInput?: string | null): string {
  const rel = formatRelativeAge(dateInput);
  if (rel === "–" || rel === "just now") return rel;
  return `${rel} ago`;
}

export function daysSince(dateInput?: string | null): number {
  if (!dateInput) return 0;
  const ts = new Date(dateInput).getTime();
  if (!Number.isFinite(ts)) return 0;
  return Math.max(0, Math.floor((Date.now() - ts) / 86_400_000));
}

export function formatDurationDays(days: number | null | undefined, resolvedCount: number): string {
  if (!resolvedCount || days === null || days === undefined) return "–";
  return `${days}d`;
}

export function buildGitBranchName(issueKey: string, title: string): string {
  const clean = title
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
  let slug = clean;
  if (slug.length > 36) {
    const truncated = slug.slice(0, 36);
    const lastDash = truncated.lastIndexOf("-");
    // Break on whole word boundary unless single continuous token exceeds 36 chars
    slug = lastDash >= 12 ? truncated.slice(0, lastDash) : truncated;
  }
  slug = slug.replace(/-+$/g, "");
  const prefix = issueKey.toLowerCase();
  return slug ? `${prefix}-${slug}` : prefix;
}
