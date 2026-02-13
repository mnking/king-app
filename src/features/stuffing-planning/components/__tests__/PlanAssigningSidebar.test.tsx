import { describe, it, expect, vi } from 'vitest';
import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { PlanAssigningSidebar } from '../PlanAssigningSidebar';
import type { ExportPlanContainer } from '../../types';

const createContainer = (overrides?: Partial<ExportPlanContainer>): ExportPlanContainer => ({
  id: 'c-1',
  planId: 'p-1',
  status: 'CREATED',
  equipmentBooked: false,
  appointmentBooked: false,
  assignedPackingListCount: 0,
  containerTypeCode: '20GP',
  containerNumber: 'CONT-001',
  estimatedMoveAt: null,
  estimatedStuffingAt: null,
  confirmedAt: null,
  stuffedAt: null,
  notes: null,
  ...overrides,
});

describe('PlanAssigningSidebar', () => {
  it('renders unassigned and total counts', () => {
    render(
      <PlanAssigningSidebar
        unassignedKey="__unassigned__"
        selectedContainerKey="__unassigned__"
        onSelectContainerKey={vi.fn()}
        unassignedPackingListsCount={2}
        totalPackingListsCount={5}
        planHasUnassigned
        sortedContainers={[createContainer()]}
        onAddContainer={vi.fn()}
      />,
    );

    expect(screen.getByText('Unassigned packing lists')).toBeInTheDocument();
    const unassignedRow = screen.getByRole('button', {
      name: /unassigned packing lists/i,
    });
    expect(within(unassignedRow).getByText('2')).toBeInTheDocument();
    expect(within(unassignedRow).getByText('5 PLs')).toBeInTheDocument();
    expect(screen.getByText(/containers/i)).toBeInTheDocument();
  });

  it('calls onSelectContainerKey when a container is clicked', async () => {
    const user = userEvent.setup();
    const onSelectContainerKey = vi.fn();

    render(
      <PlanAssigningSidebar
        unassignedKey="__unassigned__"
        selectedContainerKey="__unassigned__"
        onSelectContainerKey={onSelectContainerKey}
        unassignedPackingListsCount={0}
        totalPackingListsCount={0}
        planHasUnassigned={false}
        sortedContainers={[createContainer({ id: 'c-123', containerNumber: 'CONT-123' })]}
        onAddContainer={vi.fn()}
      />,
    );

    await user.click(screen.getByText('CONT-123'));
    expect(onSelectContainerKey).toHaveBeenCalledWith('c-123');
  });
});
