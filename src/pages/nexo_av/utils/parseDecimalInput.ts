/**
 * Parse a numeric string input where BOTH "." and "," are treated as decimal separators.
 * 
 * Rules:
 * - "10.20" → 10.20
 * - "10,20" → 10.20
 * - "1000"  → 1000 (no thousands separator needed)
 * - ""      → 0
 * 
 * This is the single source of truth for all numeric inputs in the platform.
 * Thousands separators are NOT used — users write "1000", not "1.000".
 */
export function parseDecimalInput(value: string | number | null | undefined): number {
  if (value === null || value === undefined || value === '') return 0;
  if (typeof value === 'number') return isNaN(value) ? 0 : value;

  // Replace comma with dot (both mean decimal)
  const cleaned = String(value).trim().replace(/,/g, '.');

  // If multiple dots remain, keep only the last one as decimal
  const parts = cleaned.split('.');
  let normalized: string;
  if (parts.length > 2) {
    // e.g. "1.000.50" → we join all but last, then add decimal
    normalized = parts.slice(0, -1).join('') + '.' + parts[parts.length - 1];
  } else {
    normalized = cleaned;
  }

  const num = parseFloat(normalized);
  return isNaN(num) ? 0 : num;
}

/**
 * Normalize a raw input string so it can be stored as a valid decimal string.
 * Replaces commas with dots but keeps the string form (for controlled inputs).
 * Returns empty string for empty input.
 */
export function normalizeDecimalString(value: string): string {
  if (!value || value.trim() === '') return '';
  return value.replace(/,/g, '.');
}
