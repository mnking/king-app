/**
 * DynamicFilterExample
 *
 * Demonstrates how to use DynamicFilter component with all field types.
 * This example shows:
 * - Text input fields
 * - Date picker fields
 * - Single-select dropdowns with custom key/value mapping
 * - Multi-select dropdowns
 * - Filter application and clearing
 * - Filtering mock data
 */

import { useState } from 'react';
import { DynamicFilter } from '@/shared/components/DynamicFilter';
import type { FilterFieldConfig, FilterValues } from '@/shared/components/DynamicFilter';

// Mock data for provinces
const mockProvinces = [
  { provinceCode: 'HCM', provinceName: 'Ho Chi Minh City' },
  { provinceCode: 'HN', provinceName: 'Ha Noi' },
  { provinceCode: 'DN', provinceName: 'Da Nang' },
  { provinceCode: 'CT', provinceName: 'Can Tho' },
  { provinceCode: 'HP', provinceName: 'Hai Phong' },
];

// Mock data for statuses
const mockStatuses = [
  { code: 'active', name: 'Active' },
  { code: 'pending', name: 'Pending' },
  { code: 'completed', name: 'Completed' },
  { code: 'cancelled', name: 'Cancelled' },
];

// Mock data for shipping lines
const mockShippingLines = [
  { id: 'MSC', name: 'Mediterranean Shipping Company' },
  { id: 'MAERSK', name: 'Maersk Line' },
  { id: 'CMA', name: 'CMA CGM' },
  { id: 'COSCO', name: 'COSCO Shipping' },
  { id: 'HAPAG', name: 'Hapag-Lloyd' },
];

// Mock data for bookings
interface Booking {
  id: string;
  bookingNumber: string;
  province: string;
  status: string;
  shippingLine: string;
  createdDate: string;
  containerCount: number;
}

const mockBookings: Booking[] = [
  {
    id: '1',
    bookingNumber: 'BK001',
    province: 'HCM',
    status: 'active',
    shippingLine: 'MAERSK',
    createdDate: '2024-01-15',
    containerCount: 5,
  },
  {
    id: '2',
    bookingNumber: 'BK002',
    province: 'HN',
    status: 'pending',
    shippingLine: 'MSC',
    createdDate: '2024-01-20',
    containerCount: 3,
  },
  {
    id: '3',
    bookingNumber: 'BK003',
    province: 'HCM',
    status: 'completed',
    shippingLine: 'CMA',
    createdDate: '2024-02-10',
    containerCount: 8,
  },
  {
    id: '4',
    bookingNumber: 'BK004',
    province: 'DN',
    status: 'active',
    shippingLine: 'COSCO',
    createdDate: '2024-02-15',
    containerCount: 2,
  },
  {
    id: '5',
    bookingNumber: 'BK005',
    province: 'HCM',
    status: 'cancelled',
    shippingLine: 'HAPAG',
    createdDate: '2024-03-01',
    containerCount: 4,
  },
  {
    id: '6',
    bookingNumber: 'BK006',
    province: 'CT',
    status: 'active',
    shippingLine: 'MAERSK',
    createdDate: '2024-03-05',
    containerCount: 6,
  },
  {
    id: '7',
    bookingNumber: 'BK007',
    province: 'HN',
    status: 'completed',
    shippingLine: 'MSC',
    createdDate: '2024-03-10',
    containerCount: 7,
  },
];

export function DynamicFilterExample() {
  const [filterValues, setFilterValues] = useState<FilterValues>({});
  const [filteredBookings, setFilteredBookings] = useState<Booking[]>(mockBookings);

  // Define filter fields
  const filterFields: FilterFieldConfig[] = [
    {
      type: 'text',
      name: 'bookingNumber',
      label: 'Booking Number',
      placeholder: 'Enter booking number...',
    },
    {
      type: 'date',
      name: 'fromDate',
      label: 'From Date',
    },
    {
      type: 'date',
      name: 'toDate',
      label: 'To Date',
    },
    {
      type: 'select',
      name: 'province',
      label: 'Province',
      options: mockProvinces,
      keyField: 'provinceCode',
      valueField: 'provinceName',
      placeholder: 'Select province...',
    },
    {
      type: 'select',
      name: 'shippingLine',
      label: 'Shipping Line',
      options: mockShippingLines,
      keyField: 'id',
      valueField: 'name',
      placeholder: 'Select shipping line...',
    },
    {
      type: 'multiselect',
      name: 'statuses',
      label: 'Status',
      options: mockStatuses,
      keyField: 'code',
      valueField: 'name',
      placeholder: 'Select statuses...',
    },
  ];

  /**
   * Apply filters to mock data
   */
  const handleApplyFilter = (values: FilterValues) => {
    setFilterValues(values);

    let filtered = [...mockBookings];

    // Filter by booking number
    if (values.bookingNumber) {
      const searchTerm = String(values.bookingNumber).toLowerCase();
      filtered = filtered.filter((b) =>
        b.bookingNumber.toLowerCase().includes(searchTerm)
      );
    }

    // Filter by from date
    if (values.fromDate) {
      filtered = filtered.filter((b) => b.createdDate >= String(values.fromDate));
    }

    // Filter by to date
    if (values.toDate) {
      filtered = filtered.filter((b) => b.createdDate <= String(values.toDate));
    }

    // Filter by province
    if (values.province) {
      filtered = filtered.filter((b) => b.province === values.province);
    }

    // Filter by shipping line
    if (values.shippingLine) {
      filtered = filtered.filter((b) => b.shippingLine === values.shippingLine);
    }

    // Filter by statuses (multi-select)
    if (values.statuses && Array.isArray(values.statuses) && values.statuses.length > 0) {
      filtered = filtered.filter((b) => values.statuses.includes(b.status));
    }

    setFilteredBookings(filtered);
  };

  /**
   * Clear all filters
   */
  const handleClear = () => {
    setFilterValues({});
    setFilteredBookings(mockBookings);
  };

  return (
    <div className="max-w-7xl mx-auto p-6 space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
          DynamicFilter Example
        </h1>
        <p className="mt-2 text-sm text-gray-600 dark:text-gray-400">
          This page demonstrates the DynamicFilter component with all field types: text inputs, date pickers, single-select, and multi-select dropdowns.
        </p>
      </div>

      {/* DynamicFilter Component */}
      <div className="border border-gray-200 dark:border-gray-700 rounded-lg p-4 bg-white dark:bg-gray-800">
        <DynamicFilter
          fields={filterFields}
          onApplyFilter={handleApplyFilter}
          onClear={handleClear}
        />
      </div>

      {/* Active Filters Display */}
      {Object.keys(filterValues).length > 0 && (
        <div className="p-4 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg">
          <h3 className="text-sm font-medium text-blue-900 dark:text-blue-300 mb-2">
            Active Filters
          </h3>
          <pre className="text-xs text-blue-800 dark:text-blue-400 overflow-auto">
            {JSON.stringify(filterValues, null, 2)}
          </pre>
        </div>
      )}

      {/* Results Count */}
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
          Booking Orders ({filteredBookings.length} of {mockBookings.length})
        </h2>
        {Object.keys(filterValues).length > 0 && (
          <span className="text-sm text-gray-600 dark:text-gray-400">
            Filtered results
          </span>
        )}
      </div>

      {/* Results Table */}
      <div className="border border-gray-200 dark:border-gray-700 rounded-lg overflow-hidden">
        <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
          <thead className="bg-gray-50 dark:bg-gray-800">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                Booking #
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                Province
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                Status
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                Shipping Line
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                Created Date
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                Containers
              </th>
            </tr>
          </thead>
          <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
            {filteredBookings.length > 0 ? (
              filteredBookings.map((booking) => {
                const province = mockProvinces.find((p) => p.provinceCode === booking.province);
                const status = mockStatuses.find((s) => s.code === booking.status);
                const shippingLine = mockShippingLines.find((sl) => sl.id === booking.shippingLine);

                return (
                  <tr key={booking.id} className="hover:bg-gray-50 dark:hover:bg-gray-700">
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900 dark:text-white">
                      {booking.bookingNumber}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600 dark:text-gray-300">
                      {province?.provinceName || booking.province}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span
                        className={`px-2 py-1 text-xs rounded-full ${
                          booking.status === 'active'
                            ? 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300'
                            : booking.status === 'pending'
                              ? 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-300'
                              : booking.status === 'completed'
                                ? 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-300'
                                : 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-300'
                        }`}
                      >
                        {status?.name || booking.status}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600 dark:text-gray-300">
                      {shippingLine?.name || booking.shippingLine}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600 dark:text-gray-300">
                      {booking.createdDate}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600 dark:text-gray-300">
                      {booking.containerCount}
                    </td>
                  </tr>
                );
              })
            ) : (
              <tr>
                <td
                  colSpan={6}
                  className="px-6 py-12 text-center text-sm text-gray-500 dark:text-gray-400"
                >
                  No bookings found matching the selected filters.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* Test Instructions */}
      <div className="mt-8 p-4 bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg">
        <h3 className="text-sm font-semibold text-yellow-900 dark:text-yellow-300 mb-2">
          Test Instructions
        </h3>
        <ul className="text-xs text-yellow-800 dark:text-yellow-400 space-y-1 list-disc list-inside">
          <li>
            <strong>Text filter:</strong> Try searching for "BK001" or "BK00" in Booking Number
          </li>
          <li>
            <strong>Date filter:</strong> Set From Date to "2024-02-01" to filter bookings after Feb 1st
          </li>
          <li>
            <strong>Single-select:</strong> Select "Ho Chi Minh City" in Province dropdown
          </li>
          <li>
            <strong>Multi-select:</strong> Select multiple statuses like "Active" and "Pending"
          </li>
          <li>
            <strong>Combined filters:</strong> Try combining multiple filters for advanced filtering
          </li>
          <li>
            <strong>Clear filters:</strong> Click "Clear" button to reset all filters
          </li>
        </ul>
      </div>
    </div>
  );
}
