import { renderHook, act } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { useUnsavedChanges } from '../useUnsavedChanges';
import { toastAdapter } from '@/shared/services';

// Mock toastAdapter
vi.mock('@/shared/services', () => ({
  toastAdapter: {
    confirm: vi.fn(),
  },
}));

describe('useUnsavedChanges', () => {
  const mockOnClose = vi.fn();
  const mockReset = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('handleClose', () => {
    it('should close immediately when isReadOnly is true', async () => {
      const { result } = renderHook(() =>
        useUnsavedChanges({
          isDirty: true,
          isReadOnly: true,
          onClose: mockOnClose,
          reset: mockReset,
        }),
      );

      await act(async () => {
        await result.current.handleClose();
      });

      expect(mockReset).toHaveBeenCalledOnce();
      expect(mockOnClose).toHaveBeenCalledOnce();
      expect(toastAdapter.confirm).not.toHaveBeenCalled();
    });

    it('should close immediately when isSubmitting is true', async () => {
      const { result } = renderHook(() =>
        useUnsavedChanges({
          isDirty: true,
          isSubmitting: true,
          onClose: mockOnClose,
          reset: mockReset,
        }),
      );

      await act(async () => {
        await result.current.handleClose();
      });

      expect(mockReset).toHaveBeenCalledOnce();
      expect(mockOnClose).toHaveBeenCalledOnce();
      expect(toastAdapter.confirm).not.toHaveBeenCalled();
    });

    it('should close immediately when isDirty is false', async () => {
      const { result } = renderHook(() =>
        useUnsavedChanges({
          isDirty: false,
          onClose: mockOnClose,
          reset: mockReset,
        }),
      );

      await act(async () => {
        await result.current.handleClose();
      });

      expect(mockReset).toHaveBeenCalledOnce();
      expect(mockOnClose).toHaveBeenCalledOnce();
      expect(toastAdapter.confirm).not.toHaveBeenCalled();
    });

    it('should show confirmation dialog when isDirty is true', async () => {
      vi.mocked(toastAdapter.confirm).mockResolvedValue(true);

      const { result } = renderHook(() =>
        useUnsavedChanges({
          isDirty: true,
          onClose: mockOnClose,
          reset: mockReset,
        }),
      );

      await act(async () => {
        await result.current.handleClose();
      });

      expect(toastAdapter.confirm).toHaveBeenCalledWith(
        'You have unsaved changes. Discard changes?',
        { intent: 'danger' },
      );
    });

    it('should close when user confirms discard', async () => {
      vi.mocked(toastAdapter.confirm).mockResolvedValue(true);

      const { result } = renderHook(() =>
        useUnsavedChanges({
          isDirty: true,
          onClose: mockOnClose,
          reset: mockReset,
        }),
      );

      await act(async () => {
        await result.current.handleClose();
      });

      expect(mockReset).toHaveBeenCalledOnce();
      expect(mockOnClose).toHaveBeenCalledOnce();
    });

    it('should not close when user cancels discard', async () => {
      vi.mocked(toastAdapter.confirm).mockResolvedValue(false);

      const { result } = renderHook(() =>
        useUnsavedChanges({
          isDirty: true,
          onClose: mockOnClose,
          reset: mockReset,
        }),
      );

      await act(async () => {
        await result.current.handleClose();
      });

      expect(toastAdapter.confirm).toHaveBeenCalled();
      expect(mockReset).not.toHaveBeenCalled();
      expect(mockOnClose).not.toHaveBeenCalled();
    });

    it('should use custom confirmation message', async () => {
      vi.mocked(toastAdapter.confirm).mockResolvedValue(true);
      const customMessage = 'Are you sure you want to leave?';

      const { result } = renderHook(() =>
        useUnsavedChanges({
          isDirty: true,
          onClose: mockOnClose,
          reset: mockReset,
          confirmMessage: customMessage,
        }),
      );

      await act(async () => {
        await result.current.handleClose();
      });

      expect(toastAdapter.confirm).toHaveBeenCalledWith(customMessage, {
        intent: 'danger',
      });
    });

    it('should work without reset function', async () => {
      vi.mocked(toastAdapter.confirm).mockResolvedValue(true);

      const { result } = renderHook(() =>
        useUnsavedChanges({
          isDirty: true,
          onClose: mockOnClose,
        }),
      );

      await act(async () => {
        await result.current.handleClose();
      });

      expect(toastAdapter.confirm).toHaveBeenCalled();
      expect(mockOnClose).toHaveBeenCalledOnce();
    });
  });

  describe('hasUnsavedChanges', () => {
    it('should return true when isDirty is true and not read-only', () => {
      const { result } = renderHook(() =>
        useUnsavedChanges({
          isDirty: true,
          isReadOnly: false,
          onClose: mockOnClose,
        }),
      );

      expect(result.current.hasUnsavedChanges).toBe(true);
    });

    it('should return false when isDirty is false', () => {
      const { result } = renderHook(() =>
        useUnsavedChanges({
          isDirty: false,
          isReadOnly: false,
          onClose: mockOnClose,
        }),
      );

      expect(result.current.hasUnsavedChanges).toBe(false);
    });

    it('should return false when isReadOnly is true', () => {
      const { result } = renderHook(() =>
        useUnsavedChanges({
          isDirty: true,
          isReadOnly: true,
          onClose: mockOnClose,
        }),
      );

      expect(result.current.hasUnsavedChanges).toBe(false);
    });
  });
});
