/**
 * ISO 6346 Container Number Validator
 *
 * Validates shipping container numbers according to ISO 6346 standard.
 * Format: 4 letters (owner code + equipment category) + 6 digits (serial) + 1 check digit
 * Example: MSCU6639871
 *
 * @see https://en.wikipedia.org/wiki/ISO_6346
 */

/**
 * Letter to numeric value mapping for ISO 6346 check digit calculation.
 * A=10, B=12, C=13, ..., Z=38 (excluding 11, 22, 33, etc.)
 */
export const LETTER_MAP: Record<string, number> = {
  A: 10, B: 12, C: 13, D: 14, E: 15, F: 16, G: 17, H: 18, I: 19, J: 20,
  K: 21, L: 23, M: 24, N: 25, O: 26, P: 27, Q: 28, R: 29, S: 30, T: 31,
  U: 32, V: 34, W: 35, X: 36, Y: 37, Z: 38,
};

/**
 * Validates a container number according to ISO 6346 standard.
 *
 * Validation steps:
 * 1. Normalize input (uppercase, remove spaces)
 * 2. Check format: 4 letters + 7 digits
 * 3. Validate check digit using ISO 6346 algorithm
 *
 * @param input - Container number to validate (e.g., "MSCU6639871" or "mscu 663 987 1")
 * @returns true if valid, false otherwise
 *
 * @example
 * ```typescript
 * isValidISO6346("MSCU6639871") // true
 * isValidISO6346("MSCU6639870") // false (wrong check digit)
 * isValidISO6346("ABC123")      // false (wrong format)
 * ```
 */
export function isValidISO6346(input: string): boolean {
  // Normalize: uppercase and remove all whitespace
  const normalized = input.toUpperCase().replace(/\s+/g, '');

  // Check format: 4 letters + 7 digits (total 11 characters)
  const formatRegex = /^[A-Z]{4}[0-9]{7}$/;
  if (!formatRegex.test(normalized)) {
    return false;
  }

  // Split into base (first 10 chars) and check digit (last char)
  const base = normalized.slice(0, 10);
  const checkDigit = Number(normalized.slice(10));

  // Calculate expected check digit
  let sum = 0;
  for (let i = 0; i < base.length; i++) {
    const char = base[i];

    // Convert character to numeric value
    const value = /[A-Z]/.test(char) ? LETTER_MAP[char] : Number(char);

    // Weight is 2^position (1, 2, 4, 8, 16, 32, ...)
    const weight = 2 ** i;

    sum += value * weight;
  }

  // Check digit is (sum mod 11), with 10 mapped to 0
  const mod = sum % 11;
  const expectedCheckDigit = mod === 10 ? 0 : mod;

  return expectedCheckDigit === checkDigit;
}

/**
 * Normalizes a container number by converting to uppercase and removing spaces.
 * Does not validate the format or check digit.
 *
 * @param input - Container number to normalize
 * @returns Normalized container number
 *
 * @example
 * ```typescript
 * normalizeContainerNumber("mscu 663 987 1") // "MSCU6639871"
 * normalizeContainerNumber("  TEMU9876543  ") // "TEMU9876543"
 * ```
 */
export function normalizeContainerNumber(input: string): string {
  return input.toUpperCase().replace(/\s+/g, '');
}
