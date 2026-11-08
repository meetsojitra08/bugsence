export function generateSuggestedKey(name: string): string {
  if (!name.trim()) return "";
  const words = name
    .trim()
    .replace(/[^a-zA-Z0-9\s]/g, "")
    .split(/\s+/)
    .filter(Boolean);

  if (words.length >= 2) {
    const letters = words.map((w) => w[0]).join("");
    return letters.slice(0, 4).toUpperCase();
  }
  const clean = words[0] || "";
  return clean.slice(0, 3).toUpperCase();
}
