// React Query hooks for zones
export {
  useZones,
  useZone,
  useCreateZone,
  useUpdateZone,
  useUpdateZoneStatus,
  useDeleteZone,
  useBulkUpdateZoneStatuses,
  useBulkDeleteZones,
  useZoneQueries,
  zonesQueryKeys,
} from './use-zones-query';

// React Query hooks for locations
export {
  useLocationsByZone,
  useLocationCounts,
  useLocation,
  useCreateLocation,
  useUpdateLocation,
  useUpdateLocationStatus,
  useDeleteLocation,
  useBulkUpdateLocationStatuses,
  useBulkDeleteLocations,
  useLocationSelection,
  useLocationQueries,
  locationsQueryKeys,
  generateLocationCode,
  isLocationCodeUnique,
} from './use-locations-query';
