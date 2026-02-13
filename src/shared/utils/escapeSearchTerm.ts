/**
 * escapeSearchTerm Utility
 *
 * Sanitizes search terms by escaping HTML and regex metacharacters
 * to prevent XSS attacks and regex injection issues.
 *
 * Used by FilterTextbox component unless skipSanitization is set.
 */

/**
 * HTML character escape map
 */
const HTML_ESCAPE_MAP: Record<string, string> = {
  '<': '&lt;',
  '>': '&gt;',
  '&': '&amp;',
  '"': '&quot;',
  "'": '&#x27;',
} as const;

/**
 * Regex metacharacters that need escaping
 * Reference: https://developer.mozilla.org/en-US/docs/Web/JavaScript/Guide/Regular_Expressions#escaping
 */
const REGEX_METACHARACTERS = /[.*+?^${}()|[\]\\]/g;

/**
 * Escapes HTML characters in a string
 */
function escapeHTML(text: string): string {
  return text.replace(/[<>&"']/g, (char) => HTML_ESCAPE_MAP[char] || char);
}

/**
 * Escapes regex metacharacters in a string
 */
function escapeRegex(text: string): string {
  return text.replace(REGEX_METACHARACTERS, '\\$&');
}

/**
 * Sanitizes search term by escaping HTML and regex metacharacters
 *
 * @param searchTerm - The search term to sanitize
 * @returns Sanitized search term safe for HTML rendering and regex operations
 *
 * @example
 * ```typescript
 * escapeSearchTerm('<script>') // '&lt;script&gt;'
 * escapeSearchTerm('file*.txt') // 'file\\*.txt'
 * escapeSearchTerm('BO-2025-001') // 'BO-2025-001' (unchanged)
 * ```
 */
export function escapeSearchTerm(searchTerm: string): string {
  if (!searchTerm) {
    return searchTerm;
  }

  // Apply HTML escaping first to protect against XSS
  let escaped = escapeHTML(searchTerm);

  // Then escape regex metacharacters to prevent regex injection
  escaped = escapeRegex(escaped);

  return escaped;
}
