/**
 * Converts a 3- or 6-digit hex colour into an rgba() string.
 * Label colours come from user data and may use the short `#FFF` form, so a
 * naive `${color}20` concatenation is not safe.
 */
export function hexToRgba(hex: string, alpha: number): string {
  let value = (hex || "").replace("#", "").trim();
  if (value.length === 3) {
    value = value
      .split("")
      .map((char) => char + char)
      .join("");
  }
  if (!/^[0-9a-fA-F]{6}$/.test(value)) {
    return `rgba(139, 182, 155, ${alpha})`;
  }
  const r = Number.parseInt(value.slice(0, 2), 16);
  const g = Number.parseInt(value.slice(2, 4), 16);
  const b = Number.parseInt(value.slice(4, 6), 16);
  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
}
