import { describe, it, expect } from 'vitest';
import { render } from '@testing-library/react';
import { LoadingSpinner } from '../LoadingSpinner';

// LoadingSpinner is a pure SVG component without semantic roles, so we need to query the DOM directly
/* eslint-disable testing-library/no-container, testing-library/no-node-access */

describe('LoadingSpinner', () => {
  describe('Rendering', () => {
    it('should render loading spinner with SVG', () => {
      const { container } = render(<LoadingSpinner />);
      const svg = container.querySelector('svg');
      expect(svg).toBeInTheDocument();
    });
  });

  describe('Sizes', () => {
    it.each([
      ['sm', 'h-4', 'w-4'],
      ['md', 'h-6', 'w-6'],
      ['lg', 'h-8', 'w-8'],
    ] as const)('should render %s size with correct dimensions', (size, height, width) => {
      const { container, rerender } = render(<LoadingSpinner size={size} />);
      const svg = container.querySelector('svg');
      expect(svg).toHaveClass(height, width, 'animate-spin');
      rerender(<LoadingSpinner />); // cleanup for next iteration
    });
  });

  describe('Custom Props', () => {
    it('should accept and apply custom className', () => {
      const { container } = render(<LoadingSpinner className="text-blue-500" />);
      const svg = container.querySelector('svg');
      expect(svg).toHaveClass('text-blue-500', 'animate-spin');
    });
  });
});
