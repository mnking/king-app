/**
 * E2E Test Fixtures: Booking Orders
 *
 * Standardized test data for booking order filter scenarios.
 * Used across FilterTextbox E2E tests to ensure consistent data.
 */

export interface BookingOrderFixture {
  bookingNumber: string;
  agentCode: string;
  vesselCode: string;
  voyageNumber: string;
  status: string;
  createdBy: string;
}

/**
 * Sample booking orders for filter testing
 */
export const bookingOrderFixtures: BookingOrderFixture[] = [
  {
    bookingNumber: 'BO-2025-001',
    agentCode: 'AGT001',
    vesselCode: 'VSL-MAERSK-001',
    voyageNumber: 'VOY-2025-101',
    status: 'draft',
    createdBy: 'operator1',
  },
  {
    bookingNumber: 'BO-2025-002',
    agentCode: 'AGT002',
    vesselCode: 'VSL-COSCO-002',
    voyageNumber: 'VOY-2025-102',
    status: 'confirmed',
    createdBy: 'operator2',
  },
  {
    bookingNumber: 'BO-2025-003',
    agentCode: 'AGT001',
    vesselCode: 'VSL-MSC-003',
    voyageNumber: 'VOY-2025-103',
    status: 'in_progress',
    createdBy: 'operator1',
  },
  {
    bookingNumber: 'BO-2025-004',
    agentCode: 'AGT003',
    vesselCode: 'VSL-EVERGREEN-004',
    voyageNumber: 'VOY-2025-104',
    status: 'completed',
    createdBy: 'operator3',
  },
  {
    bookingNumber: 'BO-2025-005',
    agentCode: 'AGT002',
    vesselCode: 'VSL-HAPAG-005',
    voyageNumber: 'VOY-2025-105',
    status: 'draft',
    createdBy: 'operator2',
  },
];

/**
 * Search scenarios for filter testing
 */
export const filterScenarios = {
  byBookingNumber: {
    searchTerm: 'BO-2025-001',
    expectedCount: 1,
    expectedResults: ['BO-2025-001'],
  },
  byAgentCode: {
    searchTerm: 'AGT001',
    expectedCount: 2,
    expectedResults: ['BO-2025-001', 'BO-2025-003'],
  },
  byVesselCode: {
    searchTerm: 'MAERSK',
    expectedCount: 1,
    expectedResults: ['BO-2025-001'],
  },
  byStatus: {
    searchTerm: 'draft',
    expectedCount: 2,
    expectedResults: ['BO-2025-001', 'BO-2025-005'],
  },
  multiKeyword: {
    searchTerm: 'AGT001 operator1',
    expectedCount: 2,
    expectedResults: ['BO-2025-001', 'BO-2025-003'],
  },
  noResults: {
    searchTerm: 'NONEXISTENT-9999',
    expectedCount: 0,
    expectedResults: [],
  },
};

/**
 * Helper function to get expected results for a search term
 */
export function getExpectedResults(searchTerm: string): BookingOrderFixture[] {
  const term = searchTerm.toLowerCase();
  return bookingOrderFixtures.filter((order) => {
    return (
      order.bookingNumber.toLowerCase().includes(term) ||
      order.agentCode.toLowerCase().includes(term) ||
      order.vesselCode.toLowerCase().includes(term) ||
      order.voyageNumber.toLowerCase().includes(term) ||
      order.status.toLowerCase().includes(term) ||
      order.createdBy.toLowerCase().includes(term)
    );
  });
}
