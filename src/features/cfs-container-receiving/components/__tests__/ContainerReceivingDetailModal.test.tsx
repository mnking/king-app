import { describe, it, expect, vi } from 'vitest';
import { fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { formatDate } from '@/shared/utils/date-format';
import type { EnrichedUnplannedContainer } from '@/shared/features/plan/types';
import ContainerReceivingDetailModal from '../ContainerReceivingDetailModal';

const createContainer = (
  overrides?: Partial<EnrichedUnplannedContainer>,
): EnrichedUnplannedContainer => ({
  id: 'order-container-1',
  orderId: 'order-1',
  containerId: 'container-master-1',
  containerNo: 'TSTU1234567',
  sealNumber: 'SEAL-1',
  yardFreeFrom: null,
  yardFreeTo: null,
  extractFrom: null,
  extractTo: null,
  eta: null,
  containerFile: null,
  isPriority: false,
  mblNumber: null,
  customsStatus: 'NOT_REGISTERED',
  cargoReleaseStatus: 'NOT_REQUESTED',
  containerStatus: null,
  summary: null,
  hbls: [],
  bookingOrder: null,
  atYard: false,
  ...overrides,
});

describe('ContainerReceivingDetailModal - Destuff request status', () => {
  it('displays ATA from booking order data', () => {
    const container = createContainer({
      bookingOrder: {
        id: 'order-1',
        code: 'ORD-001',
        bookingNumber: 'BKG-001',
        agentId: 'agent-1',
        agentCode: 'AGT',
        eta: '2026-02-01T00:00:00.000Z',
        ata: '2026-02-09T13:01:00.000Z',
        vesselCode: 'VSL-1',
        voyage: 'VOY-1',
      },
    });

    render(
      <ContainerReceivingDetailModal
        open
        container={container}
        bookingOrderContainerId={container.id}
        onClose={vi.fn()}
        onUpdatePosition={vi.fn().mockResolvedValue(true)}
        onUpdateCargoRelease={vi.fn().mockResolvedValue(undefined)}
        onSubmitCustomsRequest={vi.fn().mockResolvedValue({
          eventType: 'IMPORT_CONTAINER_IDENTIFICATION',
          status: 'ACCEPTED',
          transactionId: 'tx-1',
        })}
        onGetCustomsSubmissionStatus={vi.fn().mockResolvedValue({
          declarationNumber: 'DECL-1',
          eventType: 'CONTAINER_IDENTIFICATION',
          operationMode: 'IMPORT',
          transactionId: 'tx-1',
          stateCode: null,
          status: null,
          message: null,
          requestNumber: null,
          requestDate: null,
          rawResponse: {},
          source: 'history',
          refreshed: false,
          lastUpdated: null,
        })}
        customsStatus="UNIDENTIFIED"
      />,
    );

    expect(screen.getByText(formatDate('2026-02-09T13:01:00.000Z'))).toBeInTheDocument();
  });

  it('passes ATA (UTC) and booking order id when marking discharged', async () => {
    const user = userEvent.setup();
    const container = createContainer();
    const onUpdatePosition = vi.fn().mockResolvedValue(true);

    render(
      <ContainerReceivingDetailModal
        open
        container={container}
        bookingOrderContainerId={container.id}
        onClose={vi.fn()}
        onUpdatePosition={onUpdatePosition}
        onUpdateCargoRelease={vi.fn().mockResolvedValue(undefined)}
        onSubmitCustomsRequest={vi.fn().mockResolvedValue({
          eventType: 'IMPORT_CONTAINER_IDENTIFICATION',
          status: 'ACCEPTED',
          transactionId: 'tx-1',
        })}
        onGetCustomsSubmissionStatus={vi.fn().mockResolvedValue({
          declarationNumber: 'DECL-1',
          eventType: 'CONTAINER_IDENTIFICATION',
          operationMode: 'IMPORT',
          transactionId: 'tx-1',
          stateCode: null,
          status: null,
          message: null,
          requestNumber: null,
          requestDate: null,
          rawResponse: {},
          source: 'history',
          refreshed: false,
          lastUpdated: null,
        })}
        customsStatus="UNIDENTIFIED"
      />,
    );

    const ataInput = screen.getByLabelText(/ata \(actual time arrival\)/i);
    expect((ataInput as HTMLInputElement).value).toMatch(
      /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/,
    );

    const ataLocalValue = '2026-02-09T13:01';
    fireEvent.change(ataInput, { target: { value: ataLocalValue } });
    await user.click(screen.getByRole('button', { name: /mark discharged/i }));

    await waitFor(() =>
      expect(onUpdatePosition).toHaveBeenCalledWith(
        container.id,
        'AT_PORT',
        container.orderId,
        new Date(ataLocalValue).toISOString(),
      ),
    );
  });

  it('renders two workflow groups with two actions per group', () => {
    const container = createContainer();

    render(
      <ContainerReceivingDetailModal
        open
        container={container}
        bookingOrderContainerId={container.id}
        onClose={vi.fn()}
        onUpdatePosition={vi.fn().mockResolvedValue(true)}
        onUpdateCargoRelease={vi.fn().mockResolvedValue(undefined)}
        onSubmitCustomsRequest={vi.fn().mockResolvedValue({
          eventType: 'IMPORT_CONTAINER_IDENTIFICATION',
          status: 'ACCEPTED',
          transactionId: 'tx-1',
        })}
        onGetCustomsSubmissionStatus={vi.fn().mockResolvedValue({
          declarationNumber: 'DECL-1',
          eventType: 'CONTAINER_IDENTIFICATION',
          operationMode: 'IMPORT',
          transactionId: 'tx-1',
          stateCode: null,
          status: null,
          message: null,
          requestNumber: null,
          requestDate: null,
          rawResponse: {},
          source: 'history',
          refreshed: false,
          lastUpdated: null,
        })}
        customsStatus="UNIDENTIFIED"
      />,
    );

    expect(screen.getByTestId('customs-workflow-card-identified')).toBeInTheDocument();
    expect(screen.getByTestId('customs-workflow-card-got_in')).toBeInTheDocument();
    expect(screen.queryByTestId('customs-workflow-card-destuff_approved')).not.toBeInTheDocument();

    expect(screen.getAllByRole('button', { name: /send request/i })).toHaveLength(2);
    expect(screen.getAllByRole('button', { name: /get status/i })).toHaveLength(2);

    expect(
      screen.getByRole('button', { name: /identified send request/i }),
    ).not.toBeDisabled();
    expect(
      screen.getByRole('button', { name: /identified get status/i }),
    ).not.toBeDisabled();
    expect(screen.getByRole('button', { name: /got-in send request/i })).toBeDisabled();
    expect(screen.getByRole('button', { name: /got-in get status/i })).toBeDisabled();
  });

  it('submits and queries identified status within separated result sections', async () => {
    const user = userEvent.setup();
    const container = createContainer();
    const onSubmitCustomsRequest = vi.fn().mockResolvedValue({
      eventType: 'IMPORT_CONTAINER_IDENTIFICATION',
      status: 'ACCEPTED',
      transactionId: 'tx-1',
    });
    const onGetCustomsSubmissionStatus = vi.fn().mockResolvedValue({
      declarationNumber: 'PBO260007',
      eventType: 'CONTAINER_IDENTIFICATION',
      operationMode: 'IMPORT',
      transactionId: '2275565f-2daa-471f-99be-c7273c19f04c',
      stateCode: '3',
      status: 'cleared',
      message: 'Da duoc cap so dinh danh',
      requestNumber: '116558623102',
      requestDate: '2026-02-09T13:01:00.000Z',
      rawResponse: {
        stateCode: '3',
        message: 'Da duoc cap so dinh danh',
        requestNumber: '116558623102',
        requestDate: '2026-02-09T13:01:00',
        entries: [
          {
            packageIdentifier: 'HBL2025C88412',
            billOfLadingNumber: 'HBL2025C88412',
          },
        ],
      },
      source: 'realtime',
      refreshed: true,
      lastUpdated: '2026-02-09T06:06:34.628Z',
    });

    render(
      <ContainerReceivingDetailModal
        open
        container={container}
        bookingOrderContainerId={container.id}
        onClose={vi.fn()}
        onUpdatePosition={vi.fn().mockResolvedValue(true)}
        onUpdateCargoRelease={vi.fn().mockResolvedValue(undefined)}
        onSubmitCustomsRequest={onSubmitCustomsRequest}
        onGetCustomsSubmissionStatus={onGetCustomsSubmissionStatus}
        customsStatus="UNIDENTIFIED"
      />,
    );

    const identifiedCard = screen.getByTestId('customs-workflow-card-identified');

    await user.click(within(identifiedCard).getByRole('button', { name: /send request/i }));

    await waitFor(() =>
      expect(onSubmitCustomsRequest).toHaveBeenCalledWith(container.id, 'IDENTIFIED'),
    );
    const submitSection = within(identifiedCard).getByTestId(
      'customs-submit-result-identified',
    );
    await waitFor(() => expect(submitSection).toHaveTextContent('ACCEPTED'));
    expect(within(submitSection).queryByText(/event type/i)).not.toBeInTheDocument();
    expect(within(submitSection).queryByText(/transaction id/i)).not.toBeInTheDocument();
    expect(
      within(submitSection).getByText(/identification submission status/i),
    ).toBeInTheDocument();

    await user.click(within(identifiedCard).getByRole('button', { name: /get status/i }));

    await waitFor(() =>
      expect(onGetCustomsSubmissionStatus).toHaveBeenCalledWith(
        container.id,
        'CFS_IMPORT_IDENTIFICATION',
      ),
    );
    const checkSection = within(identifiedCard).getByTestId(
      'customs-check-result-identified',
    );
    await waitFor(() => expect(checkSection).toHaveTextContent('cleared'));
    expect(within(checkSection).queryByText(/declaration number/i)).not.toBeInTheDocument();
    expect(within(checkSection).queryByText(/event type/i)).not.toBeInTheDocument();
    expect(within(checkSection).queryByText(/transaction id/i)).not.toBeInTheDocument();
    expect(within(checkSection).getByText(/^Request number$/i)).toBeInTheDocument();
    expect(within(checkSection).getByText(/raw request date/i)).toBeInTheDocument();
    expect(within(checkSection).getByText(/package identifier/i)).toBeInTheDocument();
    expect(within(checkSection).getByText(/bill of lading number/i)).toBeInTheDocument();
    expect(within(checkSection).getByText(/source/i)).toBeInTheDocument();
    expect(within(checkSection).getAllByText('HBL2025C88412')).toHaveLength(2);
  });

  it('clears previous check result when user submits a new request', async () => {
    const user = userEvent.setup();
    const container = createContainer();
    const onSubmitCustomsRequest = vi
      .fn()
      .mockResolvedValueOnce({
        eventType: 'IMPORT_CONTAINER_IDENTIFICATION',
        status: 'ACCEPTED',
        transactionId: 'tx-1',
      })
      .mockResolvedValueOnce({
        eventType: 'IMPORT_CONTAINER_IDENTIFICATION',
        status: 'ACCEPTED',
        transactionId: 'tx-2',
      });
    const onGetCustomsSubmissionStatus = vi.fn().mockResolvedValue({
      declarationNumber: 'DECL-1',
      eventType: 'CONTAINER_IDENTIFICATION',
      operationMode: 'IMPORT',
      transactionId: 'tx-1',
      stateCode: null,
      status: 'cleared',
      message: 'Declaration cleared successfully',
      requestNumber: 'REQ-1',
      requestDate: null,
      rawResponse: {},
      source: 'realtime',
      refreshed: false,
      lastUpdated: '2026-02-07T10:30:00Z',
    });

    render(
      <ContainerReceivingDetailModal
        open
        container={container}
        bookingOrderContainerId={container.id}
        onClose={vi.fn()}
        onUpdatePosition={vi.fn().mockResolvedValue(true)}
        onUpdateCargoRelease={vi.fn().mockResolvedValue(undefined)}
        onSubmitCustomsRequest={onSubmitCustomsRequest}
        onGetCustomsSubmissionStatus={onGetCustomsSubmissionStatus}
        customsStatus="UNIDENTIFIED"
      />,
    );

    const identifiedCard = screen.getByTestId('customs-workflow-card-identified');
    const checkSection = within(identifiedCard).getByTestId(
      'customs-check-result-identified',
    );

    await user.click(within(identifiedCard).getByRole('button', { name: /send request/i }));
    await user.click(within(identifiedCard).getByRole('button', { name: /get status/i }));

    await waitFor(() => expect(checkSection).toHaveTextContent('cleared'));
    expect(within(checkSection).getByText('REQ-1')).toBeInTheDocument();

    await user.click(within(identifiedCard).getByRole('button', { name: /send request/i }));

    await waitFor(() => expect(checkSection).toHaveTextContent('No status queried'));
    expect(within(checkSection).queryByText('REQ-1')).not.toBeInTheDocument();
  });

  it('keeps submit and check results when container data refetches with same id', async () => {
    const user = userEvent.setup();
    const container = createContainer();
    const onSubmitCustomsRequest = vi.fn().mockResolvedValue({
      eventType: 'IMPORT_CONTAINER_IDENTIFICATION',
      status: 'ACCEPTED',
      transactionId: 'tx-identification-1',
    });
    const onGetCustomsSubmissionStatus = vi.fn().mockResolvedValue({
      declarationNumber: 'PBO260007',
      eventType: 'CONTAINER_IDENTIFICATION',
      operationMode: 'IMPORT',
      transactionId: 'tx-identification-1',
      stateCode: '3',
      status: 'inspection',
      message: 'Dang xu ly',
      requestNumber: '116558623102',
      requestDate: '2026-02-09T13:01:00.000Z',
      rawResponse: {
        requestDate: '2026-02-09T13:01:00',
        entries: [
          {
            packageIdentifier: 'HBL2025C88412',
            billOfLadingNumber: 'HBL2025C88412',
          },
        ],
      },
      source: 'realtime',
      refreshed: true,
      lastUpdated: '2026-02-08T17:00:09.865Z',
    });

    const { rerender } = render(
      <ContainerReceivingDetailModal
        open
        container={container}
        bookingOrderContainerId={container.id}
        onClose={vi.fn()}
        onUpdatePosition={vi.fn().mockResolvedValue(true)}
        onUpdateCargoRelease={vi.fn().mockResolvedValue(undefined)}
        onSubmitCustomsRequest={onSubmitCustomsRequest}
        onGetCustomsSubmissionStatus={onGetCustomsSubmissionStatus}
        customsStatus="UNIDENTIFIED"
      />,
    );

    const identifiedCard = screen.getByTestId('customs-workflow-card-identified');

    await user.click(within(identifiedCard).getByRole('button', { name: /send request/i }));
    await user.click(within(identifiedCard).getByRole('button', { name: /get status/i }));

    const submitSection = within(identifiedCard).getByTestId(
      'customs-submit-result-identified',
    );
    const checkSection = within(identifiedCard).getByTestId(
      'customs-check-result-identified',
    );

    await waitFor(() => expect(submitSection).toHaveTextContent('ACCEPTED'));
    await waitFor(() => expect(checkSection).toHaveTextContent('inspection'));

    rerender(
      <ContainerReceivingDetailModal
        open
        container={{ ...container, customsRequestStatus: 'IDENTIFIED' }}
        bookingOrderContainerId={container.id}
        onClose={vi.fn()}
        onUpdatePosition={vi.fn().mockResolvedValue(true)}
        onUpdateCargoRelease={vi.fn().mockResolvedValue(undefined)}
        onSubmitCustomsRequest={onSubmitCustomsRequest}
        onGetCustomsSubmissionStatus={onGetCustomsSubmissionStatus}
        customsStatus="IDENTIFIED"
      />,
    );

    expect(
      within(identifiedCard).getByTestId('customs-submit-result-identified'),
    ).toHaveTextContent('ACCEPTED');
    expect(
      within(identifiedCard).getByTestId('customs-check-result-identified'),
    ).toHaveTextContent('116558623102');
    expect(
      within(identifiedCard).getByTestId('customs-check-result-identified'),
    ).toHaveTextContent('inspection');
  });

  it('enables update when user selects Approved, then locks UI after save', async () => {
    const user = userEvent.setup();
    const container = createContainer({ cargoReleaseStatus: 'REQUESTED' });
    const onUpdateCargoRelease = vi.fn().mockResolvedValue(undefined);

    render(
      <ContainerReceivingDetailModal
        open
        container={container}
        bookingOrderContainerId={container.id}
        onClose={vi.fn()}
        onUpdatePosition={vi.fn().mockResolvedValue(true)}
        onUpdateCargoRelease={onUpdateCargoRelease}
        onSubmitCustomsRequest={vi.fn().mockResolvedValue({
          eventType: 'IMPORT_CONTAINER_IDENTIFICATION',
          status: 'ACCEPTED',
          transactionId: 'tx-1',
        })}
        onGetCustomsSubmissionStatus={vi.fn().mockResolvedValue({
          declarationNumber: 'DECL-1',
          eventType: 'CONTAINER_IDENTIFICATION',
          operationMode: 'IMPORT',
          transactionId: 'tx-1',
          stateCode: null,
          status: null,
          message: null,
          requestNumber: null,
          requestDate: null,
          rawResponse: {},
          source: 'history',
          refreshed: false,
          lastUpdated: null,
        })}
        customsStatus="UNIDENTIFIED"
      />,
    );

    const select = screen.getByRole('combobox');
    const updateButton = screen.getByRole('button', { name: /update destuff status/i });

    expect(updateButton).toBeDisabled();
    expect(select).not.toBeDisabled();

    await user.selectOptions(select, 'APPROVED');

    expect(updateButton).not.toBeDisabled();
    expect(select).not.toBeDisabled();

    await user.click(updateButton);

    await waitFor(() => expect(onUpdateCargoRelease).toHaveBeenCalledTimes(1));
    await waitFor(() =>
      expect(onUpdateCargoRelease).toHaveBeenCalledWith(container, 'APPROVED'),
    );

    await waitFor(() => expect(select).toBeDisabled());
    await waitFor(() => expect(updateButton).toBeDisabled());
  });

  it('is read-only when persisted status is Approved', () => {
    const container = createContainer({ cargoReleaseStatus: 'APPROVED' });

    render(
      <ContainerReceivingDetailModal
        open
        container={container}
        bookingOrderContainerId={container.id}
        onClose={vi.fn()}
        onUpdatePosition={vi.fn().mockResolvedValue(true)}
        onUpdateCargoRelease={vi.fn().mockResolvedValue(undefined)}
        onSubmitCustomsRequest={vi.fn().mockResolvedValue({
          eventType: 'IMPORT_CONTAINER_IDENTIFICATION',
          status: 'ACCEPTED',
          transactionId: 'tx-1',
        })}
        onGetCustomsSubmissionStatus={vi.fn().mockResolvedValue({
          declarationNumber: 'DECL-1',
          eventType: 'CONTAINER_IDENTIFICATION',
          operationMode: 'IMPORT',
          transactionId: 'tx-1',
          stateCode: null,
          status: null,
          message: null,
          requestNumber: null,
          requestDate: null,
          rawResponse: {},
          source: 'history',
          refreshed: false,
          lastUpdated: null,
        })}
        customsStatus="UNIDENTIFIED"
      />,
    );

    const select = screen.getByRole('combobox');
    const updateButton = screen.getByRole('button', { name: /update destuff status/i });

    expect(select).toBeDisabled();
    expect(updateButton).toBeDisabled();
  });
});
