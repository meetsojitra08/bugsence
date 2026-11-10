/** Resolve a safe internal redirect path from `?next=` or router location state. */
export function getSafeNextPath(searchParams: URLSearchParams): string | null {
  const raw = searchParams.get("next");
  if (!raw || !raw.startsWith("/") || raw.startsWith("//")) {
    return null;
  }
  return raw;
}

export function resolvePostAuthDestination(
  safeNext: string | null,
  locationState: unknown,
  fallback = "/today"
): string {
  if (safeNext) return safeNext;
  const fromPath = (locationState as { from?: { pathname?: string } } | null)?.from?.pathname;
  return fromPath || fallback;
}
