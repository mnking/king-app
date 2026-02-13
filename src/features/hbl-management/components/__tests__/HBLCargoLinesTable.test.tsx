import { describe, expect, it } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import React, { useState } from 'react';
import { HBLCargoLinesTable } from '../HBLCargoLinesTable';

const line = {
  clientId: 'line-1',
  persistedId: 'persisted-line-1',
  commodityDescription: 'Electronic accessories',
  unitOfMeasure: 'CTN',
  packageTypeCode: 'GP' as const,
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
    <HBLCargoLinesTable
      lines={[line]}
      loading={false}
      isEditable={false}
      inlineEditable={false}
      onAdd={() => {}}
      onDelete={() => {}}
      expandedLineId={expandedLineId}
      onExpandedChange={setExpandedLineId}
    />
  );
};

describe('HBLCargoLinesTable', () => {
  it('allows expanding rows in view mode but keeps inputs read-only', async () => {
    const user = userEvent.setup();
    render(<ViewModeTable />);

    expect(
      screen.queryByPlaceholderText('Describe the commodity, contents, or notes'),
    ).not.toBeInTheDocument();

    const rowToggles = screen.getAllByRole('button');
    await user.click(rowToggles[0]);

    const commodityTextarea = screen.getByPlaceholderText(
      'Describe the commodity, contents, or notes',
    );
    expect(commodityTextarea).toBeInTheDocument();
    expect(commodityTextarea).toBeDisabled();
  });
});
