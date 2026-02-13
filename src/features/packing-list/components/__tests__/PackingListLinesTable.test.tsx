import React, { useState } from 'react';
import { describe, expect, it } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { PackingListLinesTable } from '../PackingListLinesTable';

const sampleLine = {
  clientId: 'line-1',
  persistedId: 'persisted-line-1',
  commodityDescription: 'Electronic accessories',
  unitOfMeasure: 'CTN',
  packageTypeCode: 'GP',
  quantity: 10,
  numberOfPackages: 10,
  grossWeightKg: 1200,
  volumeM3: 4.5,
  shipmarks: 'MARK-001',
  imdg: null,
};

const ViewModeTable = () => {
  const [expandedLineId, setExpandedLineId] = useState<string | null>(null);

  return (
    <PackingListLinesTable
      lines={[sampleLine]}
      loading={false}
      packingListStatus="APPROVED"
      isEditable={false}
      inlineEditable={false}
      onAdd={() => {}}
      onDelete={() => {}}
      expandedLineId={expandedLineId}
      onExpandedChange={setExpandedLineId}
    />
  );
};

describe('PackingListLinesTable', () => {
  it('allows expanding rows in view mode while keeping fields read-only', async () => {
    const user = userEvent.setup();

    render(<ViewModeTable />);

    expect(
      screen.queryByPlaceholderText('Describe the commodity, contents, or notes'),
    ).not.toBeInTheDocument();

    const rowToggle = screen.getAllByRole('button')[0];
    await user.click(rowToggle);

    const commodityTextarea = screen.getByPlaceholderText(
      'Describe the commodity, contents, or notes',
    );
    expect(commodityTextarea).toBeDisabled();
  });
});
