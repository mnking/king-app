import { describe, it, expect, vi } from 'vitest';
import { renderHook } from '@testing-library/react';
import { useNumberInput } from '../../hooks/use-number-input';
import type { KeyboardEvent, ClipboardEvent } from 'react';

describe('useNumberInput', () => {
  describe('Hook API', () => {
    it('should be defined', () => {
      const { result } = renderHook(() => useNumberInput());
      expect(result.current).toBeDefined();
      expect(result.current.handleKeyDown).toBeDefined();
      expect(result.current.handlePaste).toBeDefined();
    });

    it('should accept options', () => {
      const { result } = renderHook(() =>
        useNumberInput({ allowDecimal: true, allowZero: false })
      );
      expect(result.current).toBeDefined();
    });
  });

  /**
   * T010: Test - "blocks letters in integer field"
   * Expected to FAIL initially (hook not implemented)
   */
  describe('T010: Block letters in integer field', () => {
    it('should block alphabetic characters (a-z)', () => {
      const { result } = renderHook(() =>
        useNumberInput({ allowDecimal: false, allowZero: false })
      );

      const preventDefault = vi.fn();
      const mockEvent = {
        key: 'a',
        ctrlKey: false,
        metaKey: false,
        preventDefault,
      } as unknown as KeyboardEvent<HTMLInputElement>;

      result.current.handleKeyDown(mockEvent);

      // Should call preventDefault to block the character
      expect(preventDefault).toHaveBeenCalled();
    });

    it('should block uppercase letters (A-Z)', () => {
      const { result } = renderHook(() => useNumberInput());
      const preventDefault = vi.fn();

      const mockEvent = {
        key: 'Z',
        ctrlKey: false,
        metaKey: false,
        preventDefault,
      } as unknown as KeyboardEvent<HTMLInputElement>;

      result.current.handleKeyDown(mockEvent);
      expect(preventDefault).toHaveBeenCalled();
    });

    it('should allow digit characters (0-9)', () => {
      const { result } = renderHook(() => useNumberInput());
      const preventDefault = vi.fn();

      const mockEvent = {
        key: '5',
        ctrlKey: false,
        metaKey: false,
        preventDefault,
      } as unknown as KeyboardEvent<HTMLInputElement>;

      result.current.handleKeyDown(mockEvent);

      // Should NOT call preventDefault - allow digits
      expect(preventDefault).not.toHaveBeenCalled();
    });

    it('should allow control keys (Backspace, Delete, Tab, Arrow keys)', () => {
      const { result } = renderHook(() => useNumberInput());

      const controlKeys = ['Backspace', 'Delete', 'Tab', 'ArrowLeft', 'ArrowRight', 'Home', 'End'];

      controlKeys.forEach((key) => {
        const preventDefault = vi.fn();
        const mockEvent = {
          key,
          ctrlKey: false,
          metaKey: false,
          preventDefault,
        } as unknown as KeyboardEvent<HTMLInputElement>;

        result.current.handleKeyDown(mockEvent);
        expect(preventDefault).not.toHaveBeenCalled();
      });
    });

    it('should allow Ctrl+A, Ctrl+C, Ctrl+V, Ctrl+X shortcuts', () => {
      const { result } = renderHook(() => useNumberInput());

      const shortcuts = ['a', 'c', 'v', 'x'];

      shortcuts.forEach((key) => {
        const preventDefault = vi.fn();
        const mockEvent = {
          key,
          ctrlKey: true,
          metaKey: false,
          preventDefault,
        } as unknown as KeyboardEvent<HTMLInputElement>;

        result.current.handleKeyDown(mockEvent);
        expect(preventDefault).not.toHaveBeenCalled();
      });
    });
  });

  /**
   * T011: Test - "blocks scientific notation characters (e, E)"
   * Expected to FAIL initially
   */
  describe('T011: Block scientific notation (e, E)', () => {
    it('should block lowercase e', () => {
      const { result } = renderHook(() => useNumberInput());
      const preventDefault = vi.fn();

      const mockEvent = {
        key: 'e',
        ctrlKey: false,
        metaKey: false,
        preventDefault,
      } as unknown as KeyboardEvent<HTMLInputElement>;

      result.current.handleKeyDown(mockEvent);
      expect(preventDefault).toHaveBeenCalled();
    });

    it('should block uppercase E', () => {
      const { result } = renderHook(() => useNumberInput());
      const preventDefault = vi.fn();

      const mockEvent = {
        key: 'E',
        ctrlKey: false,
        metaKey: false,
        preventDefault,
      } as unknown as KeyboardEvent<HTMLInputElement>;

      result.current.handleKeyDown(mockEvent);
      expect(preventDefault).toHaveBeenCalled();
    });

    it('should not block Ctrl+E (browser shortcut)', () => {
      const { result } = renderHook(() => useNumberInput());
      const preventDefault = vi.fn();

      const mockEvent = {
        key: 'e',
        ctrlKey: true,
        metaKey: false,
        preventDefault,
      } as unknown as KeyboardEvent<HTMLInputElement>;

      result.current.handleKeyDown(mockEvent);
      expect(preventDefault).not.toHaveBeenCalled();
    });
  });

  /**
   * T012: Test - "blocks negative sign (-)"
   * Expected to FAIL initially
   */
  describe('T012: Block negative sign (-)', () => {
    it('should block minus/hyphen character', () => {
      const { result } = renderHook(() => useNumberInput());
      const preventDefault = vi.fn();

      const mockEvent = {
        key: '-',
        ctrlKey: false,
        metaKey: false,
        preventDefault,
      } as unknown as KeyboardEvent<HTMLInputElement>;

      result.current.handleKeyDown(mockEvent);
      expect(preventDefault).toHaveBeenCalled();
    });

    it('should block plus character', () => {
      const { result } = renderHook(() => useNumberInput());
      const preventDefault = vi.fn();

      const mockEvent = {
        key: '+',
        ctrlKey: false,
        metaKey: false,
        preventDefault,
      } as unknown as KeyboardEvent<HTMLInputElement>;

      result.current.handleKeyDown(mockEvent);
      expect(preventDefault).toHaveBeenCalled();
    });
  });

  describe('Decimal handling', () => {
    it('should allow decimal point when allowDecimal=true', () => {
      const { result } = renderHook(() => useNumberInput({ allowDecimal: true }));
      const preventDefault = vi.fn();

      const mockEvent = {
        key: '.',
        ctrlKey: false,
        metaKey: false,
        preventDefault,
      } as unknown as KeyboardEvent<HTMLInputElement>;

      result.current.handleKeyDown(mockEvent);
      expect(preventDefault).not.toHaveBeenCalled();
    });

    it('should block decimal point when allowDecimal=false', () => {
      const { result } = renderHook(() => useNumberInput({ allowDecimal: false }));
      const preventDefault = vi.fn();

      const mockEvent = {
        key: '.',
        ctrlKey: false,
        metaKey: false,
        preventDefault,
      } as unknown as KeyboardEvent<HTMLInputElement>;

      result.current.handleKeyDown(mockEvent);
      expect(preventDefault).toHaveBeenCalled();
    });
  });

  /**
   * T013: Test - "strips commas from pasted content"
   * Expected to FAIL initially
   */
  describe('T013: Strip commas from pasted content', () => {
    it('should strip commas from pasted number', () => {
      const { result } = renderHook(() => useNumberInput());
      const preventDefault = vi.fn();
      const mockInput = document.createElement('input');
      mockInput.value = '';

      const mockEvent = {
        preventDefault,
        currentTarget: mockInput,
        clipboardData: {
          getData: vi.fn().mockReturnValue('1,547'),
        },
      } as unknown as ClipboardEvent<HTMLInputElement>;

      result.current.handlePaste(mockEvent);

      // Should prevent default paste behavior
      expect(preventDefault).toHaveBeenCalled();

      // Should set input value without commas
      expect(mockInput.value).toBe('1547');
    });

    it('should handle multiple commas', () => {
      const { result } = renderHook(() => useNumberInput());
      const preventDefault = vi.fn();
      const mockInput = document.createElement('input');
      mockInput.value = '';

      const mockEvent = {
        preventDefault,
        currentTarget: mockInput,
        clipboardData: {
          getData: vi.fn().mockReturnValue('1,234,567.89'),
        },
      } as unknown as ClipboardEvent<HTMLInputElement>;

      result.current.handlePaste(mockEvent);

      expect(preventDefault).toHaveBeenCalled();
      expect(mockInput.value).toBe('1234567.89');
    });

    it('should preserve decimal point when allowDecimal=true', () => {
      const { result } = renderHook(() => useNumberInput({ allowDecimal: true }));
      const preventDefault = vi.fn();
      const mockInput = document.createElement('input');
      mockInput.value = '';

      const mockEvent = {
        preventDefault,
        currentTarget: mockInput,
        clipboardData: {
          getData: vi.fn().mockReturnValue('1,547.50'),
        },
      } as unknown as ClipboardEvent<HTMLInputElement>;

      result.current.handlePaste(mockEvent);

      expect(preventDefault).toHaveBeenCalled();
      expect(mockInput.value).toBe('1547.50');
    });
  });

  /**
   * T014: Test - "blocks paste with invalid characters"
   * Expected to FAIL initially
   */
  describe('T014: Block paste with invalid characters', () => {
    it('should block paste with alphabetic text', () => {
      const { result } = renderHook(() => useNumberInput());
      const preventDefault = vi.fn();
      const mockInput = document.createElement('input');
      mockInput.value = '';

      const mockEvent = {
        preventDefault,
        currentTarget: mockInput,
        clipboardData: {
          getData: vi.fn().mockReturnValue('five hundred'),
        },
      } as unknown as ClipboardEvent<HTMLInputElement>;

      result.current.handlePaste(mockEvent);

      // Should prevent paste
      expect(preventDefault).toHaveBeenCalled();

      // Should NOT modify input value
      expect(mockInput.value).toBe('');
    });

    it('should block paste with scientific notation', () => {
      const { result } = renderHook(() => useNumberInput());
      const preventDefault = vi.fn();
      const mockInput = document.createElement('input');
      mockInput.value = '';

      const mockEvent = {
        preventDefault,
        currentTarget: mockInput,
        clipboardData: {
          getData: vi.fn().mockReturnValue('1.5e10'),
        },
      } as unknown as ClipboardEvent<HTMLInputElement>;

      result.current.handlePaste(mockEvent);

      expect(preventDefault).toHaveBeenCalled();
      expect(mockInput.value).toBe('');
    });

    it('should block paste with negative numbers', () => {
      const { result } = renderHook(() => useNumberInput());
      const preventDefault = vi.fn();
      const mockInput = document.createElement('input');
      mockInput.value = '';

      const mockEvent = {
        preventDefault,
        currentTarget: mockInput,
        clipboardData: {
          getData: vi.fn().mockReturnValue('-500'),
        },
      } as unknown as ClipboardEvent<HTMLInputElement>;

      result.current.handlePaste(mockEvent);

      expect(preventDefault).toHaveBeenCalled();
      expect(mockInput.value).toBe('');
    });

    it('should allow paste with valid integer', () => {
      const { result } = renderHook(() => useNumberInput({ allowDecimal: false }));
      const preventDefault = vi.fn();
      const mockInput = document.createElement('input');
      mockInput.value = '';

      const mockEvent = {
        preventDefault,
        currentTarget: mockInput,
        clipboardData: {
          getData: vi.fn().mockReturnValue('150'),
        },
      } as unknown as ClipboardEvent<HTMLInputElement>;

      result.current.handlePaste(mockEvent);

      expect(preventDefault).toHaveBeenCalled();
      expect(mockInput.value).toBe('150');
    });

    it('should allow paste with valid decimal when allowDecimal=true', () => {
      const { result } = renderHook(() => useNumberInput({ allowDecimal: true }));
      const preventDefault = vi.fn();
      const mockInput = document.createElement('input');
      mockInput.value = '';

      const mockEvent = {
        preventDefault,
        currentTarget: mockInput,
        clipboardData: {
          getData: vi.fn().mockReturnValue('150.75'),
        },
      } as unknown as ClipboardEvent<HTMLInputElement>;

      result.current.handlePaste(mockEvent);

      expect(preventDefault).toHaveBeenCalled();
      expect(mockInput.value).toBe('150.75');
    });

    it('should block decimal in paste when allowDecimal=false', () => {
      const { result } = renderHook(() => useNumberInput({ allowDecimal: false }));
      const preventDefault = vi.fn();
      const mockInput = document.createElement('input');
      mockInput.value = '';

      const mockEvent = {
        preventDefault,
        currentTarget: mockInput,
        clipboardData: {
          getData: vi.fn().mockReturnValue('150.75'),
        },
      } as unknown as ClipboardEvent<HTMLInputElement>;

      result.current.handlePaste(mockEvent);

      expect(preventDefault).toHaveBeenCalled();
      expect(mockInput.value).toBe('');
    });
  });
});
