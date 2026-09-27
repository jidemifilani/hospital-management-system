const HEX = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i;

/** Fallback used when a stored brand colour is missing or malformed. */
const FALLBACK_HSL = "222 47% 11%";

/**
 * Parses a six-digit hex colour into 0–255 channels.
 *
 * Returns null rather than throwing: these values come from editable site
 * settings, so a bad one should fall back to the default theme, not break
 * the page that renders it.
 */
function parseHex(hex: string): { r: number; g: number; b: number } | null {
  const match = HEX.exec(hex);
  if (!match) return null;

  // Destructured rather than indexed so the compiler can see all three groups
  // are present; noUncheckedIndexedAccess types match[n] as possibly undefined.
  const [, r, g, b] = match;
  if (r === undefined || g === undefined || b === undefined) return null;

  return { r: parseInt(r, 16), g: parseInt(g, 16), b: parseInt(b, 16) };
}

/** Converts a hex colour to the "H S% L%" triple Tailwind CSS variables expect. */
export function hexToHslStr(hex: string): string {
  const rgb = parseHex(hex);
  if (!rgb) return FALLBACK_HSL;

  const r = rgb.r / 255;
  const g = rgb.g / 255;
  const b = rgb.b / 255;

  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  const l = (max + min) / 2;

  let h = 0;
  let s = 0;

  if (max !== min) {
    const d = max - min;
    s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
    if (max === r) h = ((g - b) / d + (g < b ? 6 : 0)) / 6;
    else if (max === g) h = ((b - r) / d + 2) / 6;
    else h = ((r - g) / d + 4) / 6;
  }

  return `${Math.round(h * 360)} ${Math.round(s * 100)}% ${Math.round(l * 100)}%`;
}

/** Whether a colour needs light text on top of it. */
export function isDark(hex: string): boolean {
  const rgb = parseHex(hex);
  if (!rgb) return true;

  const luminance = (0.299 * rgb.r + 0.587 * rgb.g + 0.114 * rgb.b) / 255;
  return luminance < 0.5;
}
