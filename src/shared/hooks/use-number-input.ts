import { KeyboardEvent, ClipboardEvent } from 'react';

/**
 * Options for useNumberInput hook
 */
export interface UseNumberInputOptions {
  allowDecimal?: boolean;
  allowZero?: boolean;
}

/**
 * Return type for useNumberInput hook
 */
export interface UseNumberInputReturn {
  handleKeyDown: (e: KeyboardEvent<HTMLInputElement>) => void;
  handlePaste: (e: ClipboardEvent<HTMLInputElement>) => void;
}

/**
 * Custom hook for number input validation
 * Blocks invalid characters and sanitizes pasted content
 *
 * @param options - Configuration options
 * @param options.allowDecimal - Allow decimal point (default: true)
 * @param options.allowZero - Allow zero values (default: true)
 * @returns Event handlers for keydown and paste events
 *
 * @example
 * ```tsx
 * const { handleKeyDown, handlePaste } = useNumberInput({ allowDecimal: false });
 * <input
 *   type="number"
 *   onKeyDown={handleKeyDown}
 *   onPaste={handlePaste}
 * />
 * ```
 */
export function useNumberInput(
  options: UseNumberInputOptions = {}
): UseNumberInputReturn {
  const { allowDecimal = true } = options;

  /**
   * Handle keydown events to block invalid characters
   * Allows: digits, decimal (if enabled), control keys, shortcuts
   * Blocks: letters, e/E (scientific notation), minus/plus signs
   */
  const handleKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
    const { key, ctrlKey, metaKey } = e;

    // Allow control/meta key combinations (Ctrl+A, Ctrl+C, Ctrl+V, Ctrl+X, etc.)
    if (ctrlKey || metaKey) {
      return;
    }

    // Allow navigation and editing keys
    const navigationKeys = [
      'Backspace',
      'Delete',
      'Tab',
      'Escape',
      'Enter',
      'ArrowLeft',
      'ArrowRight',
      'ArrowUp',
      'ArrowDown',
      'Home',
      'End',
    ];

    if (navigationKeys.includes(key)) {
      return;
    }

    // Allow digits 0-9
    if (/^[0-9]$/.test(key)) {
      return;
    }

    // Allow decimal point if enabled
    if (allowDecimal && key === '.') {
      return;
    }

    // Block everything else (including letters, e/E, minus, plus, etc.)
    e.preventDefault();
  };

  /**
   * Handle paste events to sanitize pasted content
   * - Strips commas from numbers (e.g., "1,547" → "1547")
   * - Blocks invalid content (letters, scientific notation, negatives)
   * - Respects allowDecimal setting
   */
  const handlePaste = (e: ClipboardEvent<HTMLInputElement>) => {
    e.preventDefault();

    // Get pasted text
    const pastedText = e.clipboardData.getData('text');

    // Strip commas
    const cleanedText = pastedText.replace(/,/g, '');

    // Validate based on allowDecimal setting
    const validPattern = allowDecimal
      ? /^[0-9]*\.?[0-9]+$/  // Allow decimal numbers
      : /^[0-9]+$/;          // Integers only

    // Only insert if valid
    if (validPattern.test(cleanedText)) {
      const input = e.currentTarget;
      input.value = cleanedText;

      // Trigger input event to update React Hook Form
      const inputEvent = new Event('input', { bubbles: true });
      input.dispatchEvent(inputEvent);
    }
    // If invalid, preventDefault already called, so nothing happens
  };

  return { handleKeyDown, handlePaste };
}
