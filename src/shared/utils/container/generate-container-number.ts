/**
 * ISO 6346 Container Number Generator
 *
 * Generates valid shipping container numbers according to ISO 6346 standard.
 * Format: 3-letter owner code + 1-letter category (U/J/Z) + 6-digit serial + 1 check digit
 * Example: MSCU6639870
 *
 * @see https://en.wikipedia.org/wiki/ISO_6346
 */

import { LETTER_MAP } from './iso6346-validator';

const CATEGORY_IDENTIFIER = 'U'; // Freight containers (most common)

/**
 * Generates a valid ISO 6346 container number for a given owner code.
 *
 * @param ownerCode - 3-letter owner code (e.g., "MSC", "TEM", "CMA")
 * @returns A valid 11-character ISO 6346 container number
 * @throws Error if owner code is not exactly 3 uppercase letters
 *
 * @example
 * ```typescript
 * generateValidISO6346ContainerNumber("MSC") // Returns e.g., "MSCU6639870"
 * generateValidISO6346ContainerNumber("TEM") // Returns e.g., "TEMU1234567"
 * ```
 */
export function generateValidISO6346ContainerNumber(ownerCode: string): string {
  // 1. Validate owner code is 3 uppercase letters
  if (!/^[A-Z]{3}$/.test(ownerCode)) {
    throw new Error('Owner code must be exactly 3 uppercase letters');
  }

  // 2. Generate random 6-digit serial (000000-999999)
  const serial = Math.floor(Math.random() * 1_000_000)
    .toString()
    .padStart(6, '0');

  // 3. Build base: owner code + category + serial
  const base = `${ownerCode}${CATEGORY_IDENTIFIER}${serial}`;

  // 4. Calculate check digit using ISO 6346 algorithm
  let sum = 0;
  for (let i = 0; i < base.length; i++) {
    const char = base[i];
    const value = /[A-Z]/.test(char) ? LETTER_MAP[char] : Number(char);
    const weight = 2 ** i;
    sum += value * weight;
  }
  const mod = sum % 11;
  const checkDigit = mod === 10 ? 0 : mod;

  // 5. Return base + check digit
  return `${base}${checkDigit}`;
}
