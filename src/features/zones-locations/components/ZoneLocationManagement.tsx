import React, { useState } from 'react';
import { AlertCircle, Plus } from 'lucide-react';
import { Panel, PanelGroup, PanelResizeHandle } from 'react-resizable-panels';
import type { PaginationState } from '@tanstack/react-table';
import {
  useZones,
  useCreateZone,
  useUpdateZone,
  useUpdateZoneStatus,
  useDeleteZone,
  useBulkDeleteZones,
  useBulkUpdateZoneStatuses,
} from '../hooks/use-zones-query';
import {
  useLocationsByZone,
  useCreateLocation,
  useCreateLocationLayout,
  useUpdateLocation,
  useBulkUpdateLocationStatuses,
  useDeleteLocation,
  useBulkDeleteLocations,
  useLocationSelection,
  useLocationCounts,
  generateLocationCode,
} from '../hooks/use-locations-query';
import { useToast } from '@/shared/hooks';
import { ensureErrorMessage } from '@/shared/utils';
import type {
  Zone,
  Location,
  ZoneCreateForm,
  ZoneUpdateForm,
  LocationCreateForm,
  LocationUpdateForm,
  LocationType,
  LocationLayoutRequest,
} from '../types';
import { ZoneTable, ZoneFormModal } from './zones';
import { LocationTable, LocationFormModal } from './locations';
import { useAuth } from '@/features/auth/useAuth';
import Button from '@/shared/components/ui/Button';

// Modern dual-table interface with consistent EntityTable patterns for improved UX
export const ZoneLocationManagement: React.FC = () => {
  const { can } = useAuth();
  const canWriteZones = can?.('zone_and_location_management:write') ?? false;
  const toast = useToast();
  // Selected zone state (local state)
  const [selectedZone, setSelectedZone] = React.useState<Zone | null>(null);

  // Pagination state for zones (server-side)
  const [zonesPagination, setZonesPagination] = useState<PaginationState>({
    pageIndex: 0,
    pageSize: 10, // First option in pageSizeOptions
  });

  // Pagination state for locations (server-side)
  const [locationsPagination, setLocationsPagination] = useState<PaginationState>({
    pageIndex: 0,
    pageSize: 10, // First option in pageSizeOptions
  });

  // Zone queries and mutations
  const {
    data: zonesData,
    isLoading: zonesLoading,
    isFetching: zonesFetching,
    error: zonesError,
  } = useZones({
    page: zonesPagination.pageIndex + 1,
    itemsPerPage: zonesPagination.pageSize,
  });
  const zones = zonesData?.results || [];
  const zonesTotalCount = zonesData?.total ?? 0;
  const zonesLoadingState = zonesLoading; // Only show spinner on initial load

  const createZoneMutation = useCreateZone();
  const updateZoneMutation = useUpdateZone();
  const updateZoneStatusMutation = useUpdateZoneStatus();
  const deleteZoneMutation = useDeleteZone();
  const bulkDeleteZonesMutation = useBulkDeleteZones();
  const bulkUpdateZoneStatusesMutation = useBulkUpdateZoneStatuses();

  // Location counts for all zones
  const zoneIds = zones.map((zone) => zone.id);
  const { data: locationCounts } = useLocationCounts(zoneIds);
  const { data: lockedLocationCounts } = useLocationCounts(zoneIds, 'locked');

  // Location queries and mutations
  const {
    data: locationsData,
    isLoading: locationsLoading,
    isFetching: locationsFetching,
    error: locationsError,
  } = useLocationsByZone(selectedZone?.id || '', {
    page: locationsPagination.pageIndex + 1,
    itemsPerPage: locationsPagination.pageSize,
  });
  const locations = React.useMemo(
    () => locationsData?.results ?? [],
    [locationsData],
  );
  const locationsTotalCount = locationsData?.total ?? 0;
  const locationsLoadingState = locationsLoading; // Only show spinner on initial load
  const selectedZoneLockedCount = React.useMemo(
    () =>
      selectedZone
        ? locations.filter((location) => location.status === 'locked').length
        : 0,
    [locations, selectedZone],
  );

  const createLocationMutation = useCreateLocation();
  const createLocationLayoutMutation = useCreateLocationLayout();
  const updateLocationMutation = useUpdateLocation();
  const bulkUpdateLocationStatusesMutation = useBulkUpdateLocationStatuses();
  const deleteLocationMutation = useDeleteLocation();
  const bulkDeleteLocationsMutation = useBulkDeleteLocations();

  // Location selection state
  const {
    selectedLocationIds: selectedLocations,
    toggleLocationSelection,
    clearLocationSelection,
  } = useLocationSelection();

  // Modal state
  const [zoneModalOpen, setZoneModalOpen] = React.useState(false);
  const [zoneModalMode, setZoneModalMode] = React.useState<'create' | 'edit'>(
    'create',
  );
  const [editingZone, setEditingZone] = React.useState<Zone | null>(null);

  const [locationModalOpen, setLocationModalOpen] = React.useState(false);
  const [locationModalMode, setLocationModalMode] = React.useState<
    'create' | 'edit'
  >('create');
  const [editingLocation, setEditingLocation] = React.useState<Location | null>(
    null,
  );

  // Clear location selection and reset pagination when zone changes
  React.useEffect(() => {
    clearLocationSelection();
    setLocationsPagination(prev => ({ ...prev, pageIndex: 0 })); // Preserve user's pageSize preference
  }, [selectedZone?.id, clearLocationSelection]);

  // Zone handlers
  const handleZoneSelect = (zone: Zone) => {
    setSelectedZone(zone);
    clearLocationSelection();
  };

  const handleCreateZone = () => {
    if (!canWriteZones) {
      toast.error('You do not have permission to modify zones or locations.');
      return;
    }
    // Ensure clean state for create mode
    setZoneModalMode('create');
    setEditingZone(null);
    setZoneModalOpen(true);
  };

  const handleEditZone = (zone: Zone) => {
    if (!canWriteZones) {
      toast.error('You do not have permission to modify zones or locations.');
      return;
    }
    setZoneModalMode('edit');
    setEditingZone(zone);
    setZoneModalOpen(true);
  };

  const handleZoneSave = async (
    data: ZoneCreateForm | (ZoneUpdateForm & { id: string }),
  ) => {
    if (!canWriteZones) {
      toast.error('You do not have permission to modify zones or locations.');
      return;
    }
    try {
      if (zoneModalMode === 'create') {
        const newZone = await createZoneMutation.mutateAsync(
          data as ZoneCreateForm,
        );
        setSelectedZone(newZone);
        toast.success(`Zone "${newZone.name}" created.`);
      } else {
        const { id, ...updateData } = data as ZoneUpdateForm & { id: string };
        if (
          editingZone?.status === 'active' &&
          updateData.name &&
          updateData.name !== editingZone.name
        ) {
          toast.warning('Active zones cannot be renamed.');
          return;
        }
        await updateZoneMutation.mutateAsync({ id, data: updateData });
        toast.success(`Zone updated.`);
      }
      setEditingZone(null);
      setZoneModalOpen(false);
    } catch (error) {
      console.error('Failed to save zone:', error);
      const errorMessage = ensureErrorMessage(error);
      toast.error(`Failed to save zone: ${errorMessage}`);
    }
  };

  const handleDeleteZone = async (zone: Zone) => {
    if (!canWriteZones) {
      toast.error('You do not have permission to modify zones or locations.');
      return;
    }
    try {
      await deleteZoneMutation.mutateAsync(zone.id);
      toast.success(`Zone "${zone.name}" deleted.`);
      if (selectedZone?.id === zone.id) {
        setSelectedZone(null);
      }
    } catch (error) {
      console.error('Failed to delete zone:', error);
      const errorMessage = ensureErrorMessage(error);
      toast.error(`Failed to delete zone "${zone.name}": ${errorMessage}`);
    }
  };

  const handleBulkDeleteZones = async (zoneIds: string[]) => {
    if (!canWriteZones) {
      toast.error('You do not have permission to modify zones or locations.');
      return;
    }
    try {
      await bulkDeleteZonesMutation.mutateAsync(zoneIds);
      toast.success(
        `Deleted ${zoneIds.length} zone${zoneIds.length !== 1 ? 's' : ''}.`,
      );
      if (selectedZone && zoneIds.includes(selectedZone.id)) {
        setSelectedZone(null);
      }
    } catch (error) {
      console.error('Failed to delete zones:', error);
      const errorMessage = ensureErrorMessage(error);
      toast.error(`Failed to delete selected zones: ${errorMessage}`);
    }
  };

  const handleBulkUpdateZoneStatuses = async (
    zoneIds: string[],
    status: Zone['status'],
  ) => {
    if (!canWriteZones) {
      toast.error('You do not have permission to modify zones or locations.');
      return;
    }
    if (status === 'inactive') {
      const lockedZones = zoneIds.filter(
        (zoneId) => getLockedLocationCount(zoneId) > 0,
      );
      if (lockedZones.length > 0) {
        const lockedZoneNames = zones
          .filter((zone) => lockedZones.includes(zone.id))
          .map((zone) => `"${zone.name}"`)
          .join(', ');
        toast.warning(
          `Cannot mark zone${lockedZones.length !== 1 ? 's' : ''} ${lockedZoneNames || 'with locked locations'} as inactive while they have locked locations.`,
        );
        return;
      }
    }
    try {
      await bulkUpdateZoneStatusesMutation.mutateAsync({
        ids: zoneIds,
        status,
      });
      toast.success(
        `Updated ${zoneIds.length} zone${zoneIds.length !== 1 ? 's' : ''} to ${status} status.`,
      );
    } catch (error) {
      console.error('Failed to update zone statuses:', error);
      const errorMessage = ensureErrorMessage(error);
      toast.error(`Failed to update zone statuses: ${errorMessage}`);
    }
  };

  const handleToggleZoneStatus = async (zone: Zone) => {
    if (!canWriteZones) {
      toast.error('You do not have permission to modify zones or locations.');
      return;
    }
    const lockedCount = getLockedLocationCount(zone.id);
    if (zone.status === 'active' && lockedCount > 0) {
      toast.warning(
        `Cannot mark zone "${zone.name}" as inactive while it has ${lockedCount} locked location${lockedCount !== 1 ? 's' : ''}. Unlock or update those locations first.`,
      );
      return;
    }
    try {
      const newStatus = zone.status === 'active' ? 'inactive' : 'active';
      await updateZoneStatusMutation.mutateAsync({
        id: zone.id,
        status: newStatus,
      });
      toast.success(`Zone "${zone.name}" marked as ${newStatus}.`);
    } catch (error) {
      console.error('Failed to update zone status:', error);
      const errorMessage = ensureErrorMessage(error);
      toast.error(`Failed to update zone status: ${errorMessage}`);
    }
  };

  const handleZoneSort = (_sortBy: 'code' | 'name', _order: 'asc' | 'desc') => {
    // Sorting will be handled by the query parameters in the future
    // For now, we can implement client-side sorting or skip this
  };

  // Location handlers
  const handleCreateLocation = () => {
    if (!canWriteZones) {
      toast.error('You do not have permission to modify zones or locations.');
      return;
    }
    setLocationModalMode('create');
    setEditingLocation(null);
    setLocationModalOpen(true);
  };

  const handleEditLocation = (location: Location) => {
    if (!canWriteZones) {
      toast.error('You do not have permission to modify zones or locations.');
      return;
    }
    setLocationModalMode('edit');
    setEditingLocation(location);
    setLocationModalOpen(true);
  };

  const handleLocationSave = async (
    data: LocationCreateForm | (LocationUpdateForm & { id: string }),
  ) => {
    if (!canWriteZones) {
      toast.error('You do not have permission to modify zones or locations.');
      return;
    }
    if (
      locationModalMode === 'edit' &&
      editingLocation?.status === 'locked' &&
      (data as LocationUpdateForm).status === 'inactive'
    ) {
      toast.warning('Locked locations cannot be moved to inactive status.');
      return;
    }
    if (
      locationModalMode === 'edit' &&
      editingLocation?.status === 'inactive' &&
      (data as LocationUpdateForm).status === 'locked'
    ) {
      toast.warning('Inactive locations cannot be moved directly to locked status.');
      return;
    }
    try {
      if (locationModalMode === 'create') {
        const created = await createLocationMutation.mutateAsync(
          data as LocationCreateForm,
        );
        const createdName = (created as Location).displayCode ?? 'Location';
        toast.success(`${createdName} created.`);
      } else {
        const { id, ...updateData } = data as LocationUpdateForm & { id: string };
        await updateLocationMutation.mutateAsync({
          id: location?.id || id,
          data: updateData,
        });
        toast.success('Location updated.');
      }
      setLocationModalOpen(false);
    } catch (error) {
      console.error('Failed to save location:', error);
      const errorMessage = ensureErrorMessage(error);
      toast.error(`Failed to save location: ${errorMessage}`);
      throw error;
    }
  };

  const handleLocationLayoutSave = async (
    zoneId: string,
    payload: LocationLayoutRequest,
  ) => {
    if (!canWriteZones) {
      toast.error('You do not have permission to modify zones or locations.');
      return;
    }

    try {
      const response = await createLocationLayoutMutation.mutateAsync({
        zoneId,
        payload,
      });
      const createdCount = response.created?.length || 0;
      toast.success(
        createdCount > 0
          ? `Created ${createdCount} RBS location${createdCount !== 1 ? 's' : ''}.`
          : 'No locations created.',
      );
      setLocationModalOpen(false);
    } catch (error) {
      console.error('Failed to create layout:', error);
      const errorMessage = ensureErrorMessage(error);
      toast.error(`Failed to create layout: ${errorMessage}`);
      throw error;
    }
  };

  const handleLocationDelete = async (location: Location) => {
    if (!canWriteZones) {
      toast.error('You do not have permission to modify zones or locations.');
      return;
    }
    try {
      await deleteLocationMutation.mutateAsync(location.id);
      toast.success(`Location "${location.displayCode}" deleted.`);
    } catch (error) {
      console.error('Failed to delete location:', error);
      const errorMessage = ensureErrorMessage(error);
      toast.error(`Failed to delete location: ${errorMessage}`);
    }
  };

  const handleBulkLocationStatusUpdate = async (
    locationIds: string[],
    status: Location['status'],
  ) => {
    if (!canWriteZones) {
      toast.error('You do not have permission to modify zones or locations.');
      return;
    }
    if (status === 'inactive') {
      const lockedLocations = locations.filter(
        (location) =>
          locationIds.includes(location.id) && location.status === 'locked',
      );
      if (lockedLocations.length > 0) {
        const lockedCodes = lockedLocations
          .map((location) => location.displayCode || location.locationCode)
          .filter(Boolean)
          .join(', ');
        toast.warning(
          `Cannot set locked location${lockedLocations.length !== 1 ? 's' : ''} ${lockedCodes || ''} to inactive.`,
        );
        return;
      }
    }
    try {
      await bulkUpdateLocationStatusesMutation.mutateAsync({
        ids: locationIds,
        status,
      });
      toast.success(
        `Updated ${locationIds.length} location${locationIds.length !== 1 ? 's' : ''} to ${status}.`,
      );
      clearLocationSelection();
    } catch (error) {
      console.error('Failed to update location statuses:', error);
      const errorMessage = ensureErrorMessage(error);
      toast.error(`Failed to update location statuses: ${errorMessage}`);
    }
  };

  const handleBulkLocationDelete = async (locationIds: string[]) => {
    if (!canWriteZones) {
      toast.error('You do not have permission to modify zones or locations.');
      return;
    }
    try {
      await bulkDeleteLocationsMutation.mutateAsync(locationIds);
      toast.success(
        `Deleted ${locationIds.length} location${locationIds.length !== 1 ? 's' : ''}.`,
      );
      clearLocationSelection();
    } catch (error) {
      console.error('Failed to delete locations:', error);
      const errorMessage = ensureErrorMessage(error);
      toast.error(`Failed to delete locations: ${errorMessage}`);
    }
  };

  // Utility functions
  const getLocationCount = (zoneId: string): number => {
    // For the selected zone, use current locations data for accuracy
    if (selectedZone?.id === zoneId) {
      return locationsTotalCount;
    }
    // For other zones, use the fetched location counts
    return locationCounts?.[zoneId] || 0;
  };

  const getLockedLocationCount = (zoneId: string): number => {
    if (selectedZone?.id === zoneId) {
      return selectedZoneLockedCount;
    }
    return lockedLocationCounts?.[zoneId] || 0;
  };

  const handleGenerateCodePreview = (
    zoneCode: string,
    type: LocationType,
    details: {
      rbsRow?: string;
      rbsBay?: string;
      rbsSlot?: string;
      customLabel?: string;
    },
  ) => {
    return { displayCode: generateLocationCode(zoneCode, type, details) };
  };

  // Helper function to check if zone can be deleted
  const canDeleteZone = (zone: Zone): boolean => {
    // Can delete if zone has no locations
    return getLocationCount(zone.id) === 0;
  };

  const renderError = (error: Error | null, onClear?: () => void) => {
    if (!error) return null;

    const errorMessage = error.message || 'An unexpected error occurred';

    return (
      <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-4 mb-4">
        <div className="flex items-center">
          <AlertCircle className="h-5 w-5 text-red-400 mr-2" />
          <span className="text-red-800 dark:text-red-200">{errorMessage}</span>
          {onClear && (
            <button
              onClick={onClear}
              className="ml-auto text-red-600 dark:text-red-400 hover:text-red-800 dark:hover:text-red-200"
            >
              ×
            </button>
          )}
        </div>
      </div>
    );
  };

  return (
    <div className="h-full overflow-hidden flex flex-col bg-gray-50 dark:bg-gray-900">
      <div className="flex-1 flex flex-col p-4 max-w-full min-h-0">
        {/* Error Messages */}
        <div className="flex-shrink-0">
          {renderError(zonesError)}
          {renderError(locationsError)}
        </div>

        {/* Main Content - Resizable Dual Table Layout */}
        <PanelGroup
          direction="horizontal"
          className="flex-1 min-h-0"
          id="zones-locations-panels"
        >
          {/* Zones Panel - Resizable */}
          <Panel
            defaultSize={50}
            minSize={25}
            maxSize={80}
            className="flex flex-col min-h-0 flex-1"
          >
            <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 flex flex-col h-full mr-1">
              <div className="border-b border-gray-200 dark:border-gray-700 px-4 py-3 flex-shrink-0">
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
                      Warehouse Zones
                    </h2>
                    <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                      Select a zone to view and manage its locations
                    </p>
                  </div>
                  <Button
                    type="button"
                    size="sm"
                    variant="primary"
                    className="inline-flex items-center gap-2"
                    onClick={handleCreateZone}
                    disabled={!canWriteZones}
                  >
                    <Plus className="h-4 w-4" />
                    Create Zone
                  </Button>
                </div>
              </div>
              <div className="flex-1 min-h-0 p-2">
                <ZoneTable
                  zones={zones}
                  selectedZone={selectedZone}
                  loading={zonesLoadingState}
                  fetching={zonesFetching}
                  error={zonesError ? (zonesError as Error).message : null}
                  onZoneSelect={handleZoneSelect}
                  onZoneEdit={handleEditZone}
                  onZoneDelete={handleDeleteZone}
                  onZoneToggleStatus={handleToggleZoneStatus}
                  onCreateZone={handleCreateZone}
                  onBulkDeleteZones={handleBulkDeleteZones}
                  onBulkUpdateZoneStatuses={handleBulkUpdateZoneStatuses}
                  onSort={handleZoneSort}
                  getLocationCount={getLocationCount}
                  getLockedLocationCount={getLockedLocationCount}
                  canDeleteZone={canDeleteZone}
                  totalCount={zonesTotalCount}
                  pagination={zonesPagination}
                  onPaginationChange={setZonesPagination}
                  className="h-full"
                />
              </div>
            </div>
          </Panel>

          {/* Resize Handle */}
          <PanelResizeHandle className="w-2 bg-gray-200 dark:bg-gray-700 hover:bg-blue-400 dark:hover:bg-blue-500 transition-colors duration-200 cursor-col-resize flex items-center justify-center group">
            <div className="w-1 h-8 bg-gray-400 dark:bg-gray-500 group-hover:bg-blue-600 dark:group-hover:bg-blue-400 rounded-full transition-colors duration-200"></div>
          </PanelResizeHandle>

          {/* Locations Panel - Resizable */}
          <Panel defaultSize={50} minSize={25} className="flex flex-col min-h-0 flex-1">
            <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 flex flex-col h-full ml-1">
              <div className="border-b border-gray-200 dark:border-gray-700 px-4 py-3 flex-shrink-0">
                <div className="flex items-center justify-between">
                  <div>
                    <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
                      {selectedZone
                        ? `${selectedZone.name} Locations`
                        : 'Select a Zone'}
                    </h2>
                    {selectedZone && (
                      <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                        Zone:{' '}
                        <span className="font-mono font-medium">
                          {selectedZone.code}
                        </span>{' '}
                        • {selectedZone.status}
                      </p>
                    )}
                    {selectedZone &&
                      selectedZone.status === 'active' &&
                      getLockedLocationCount(selectedZone.id) > 0 && (
                        <p className="text-xs text-amber-700 dark:text-amber-400 mt-1">
                          This zone has locked locations. Unlock them before marking the zone inactive.
                        </p>
                      )}
                  </div>
                  <Button
                    type="button"
                    size="sm"
                    variant="primary"
                    className="inline-flex items-center gap-2"
                    onClick={handleCreateLocation}
                    disabled={!canWriteZones}
                  >
                    <Plus className="h-4 w-4" />
                    Create Location
                  </Button>
                </div>
              </div>
              <div className="flex-1 min-h-0 max-h-full overflow-hidden p-2">
                <LocationTable
                  locations={locations}
                  selectedLocations={selectedLocations}
                  zone={selectedZone}
                  loading={locationsLoadingState}
                  fetching={locationsFetching}
                  error={locationsError ? (locationsError as Error).message : null}
                  onLocationEdit={handleEditLocation}
                  onLocationDelete={handleLocationDelete}
                  onLocationsDelete={handleBulkLocationDelete}
                  onLocationsStatusUpdate={handleBulkLocationStatusUpdate}
                  onLocationSelect={toggleLocationSelection}
                  onCreateLocation={handleCreateLocation}
                  totalCount={locationsTotalCount}
                  pagination={locationsPagination}
                  onPaginationChange={setLocationsPagination}
                  className="h-full"
                />
              </div>
            </div>
          </Panel>
        </PanelGroup>

        {/* Zone Modal */}
        <ZoneFormModal
          isOpen={zoneModalOpen}
          onClose={() => setZoneModalOpen(false)}
          mode={zoneModalMode}
          zone={editingZone}
          onSave={handleZoneSave}
        />

        {/* Location Modal */}
        <LocationFormModal
          isOpen={locationModalOpen}
          onClose={() => setLocationModalOpen(false)}
          mode={locationModalMode}
          location={editingLocation}
          zone={selectedZone}
          zones={zones}
          onSave={handleLocationSave}
          onSaveLayout={handleLocationLayoutSave}
          onGenerateCodePreview={handleGenerateCodePreview}
        />
      </div>
    </div>
  );
};

export default ZoneLocationManagement;
