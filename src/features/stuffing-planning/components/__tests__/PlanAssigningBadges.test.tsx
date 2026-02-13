import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { ContainerStatusBadge } from '../PlanAssigningBadges';

describe('PlanAssigningBadges', () => {
  it('renders a readable container status label', () => {
    render(<ContainerStatusBadge status="CREATED" />);
    expect(screen.getByText(/created/i)).toBeInTheDocument();
  });
});