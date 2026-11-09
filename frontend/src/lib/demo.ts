const DEMO_MODE_KEY = "bugsense_demo_mode";

/**
 * Demo sessions use a local flag plus a synthetic bearer token. Every mock API
 * must gate on this single helper so the flag can never drift between modules.
 */
export function isDemoSession(): boolean {
  return localStorage.getItem(DEMO_MODE_KEY) === "true";
}

export function enableDemoSession(): void {
  localStorage.setItem(DEMO_MODE_KEY, "true");
}

export function disableDemoSession(): void {
  localStorage.removeItem(DEMO_MODE_KEY);
}
