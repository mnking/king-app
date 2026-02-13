import { useQuery } from '@tanstack/react-query';
import { buildEndpointURL } from '@/config/api';
import { apiFetch } from '@/shared/utils/api-client';
import { packingListsApi } from '@/services/apiPackingLists';
import type { PackingListListItem } from '@/features/packing-list/types';

type ForwarderHbl = {
  id: string;
  code?: string | null;
  bypassStorageFlag?: boolean | null;
  issuerId?: string | null;
  containerNumber?: string | null;
  containerType?: string | null;
  sealNumber?: string | null;
  forwarderName?: string | null;
  vessel?: string | null;
  voyage?: string | null;
  consignee?: string | null;
  shipper?: string | null;
  issuerId?: string | null;
  containers?: Array<{
    containerNumber?: string | null;
    containerTypeCode?: string | null;
    sealNumber?: string | null;
  }> | null;
  packingList?: {
    id: string;
    createdAt?: string;
    updatedAt?: string;
    createdBy?: string;
    updatedBy?: string;
    packingListNumber?: string | null;
    mbl?: string | null;
    eta?: string | null;
    ata?: string | null;
    note?: string | null;
    forwarderId?: string;
    weight?: number | null;
    volume?: number | null;
    numberOfPackages?: number | null;
    status?: PackingListListItem['status'];
  } | null;
};

const normalizePackingLists = (response: any): PackingListListItem[] => {
  const data = response?.data ?? response;
  if (Array.isArray(data?.results)) return data.results;
  return [];
};

export function usePackingListsByHblIds(hblIds: string[]) {
  const normalizedHblIds = Array.from(new Set(hblIds.filter(Boolean)));

  return useQuery<PackingListListItem[], Error>({
    queryKey: ['packing-lists-by-hbl-ids', normalizedHblIds.sort()],
    enabled: normalizedHblIds.length > 0,
    staleTime: 0,
    refetchOnMount: 'always',
    refetchOnReconnect: 'always',
    refetchOnWindowFocus: true,
    queryFn: async (): Promise<PackingListListItem[]> => {
      const params = new URLSearchParams({ hasPackingList: 'true' });
      normalizedHblIds.forEach((id) => params.append('hblIds[]', id));

      const response = await apiFetch(
        buildEndpointURL('forwarder', `/v1/hbls?${params.toString()}`),
        { method: 'GET' },
      );

      if (!response.ok) {
        throw new Error('Failed to fetch HBLs for handover');
      }

      const json = await response.json();
      const results: ForwarderHbl[] = Array.isArray(json?.results)
        ? json.results
        : Array.isArray(json?.data?.results)
          ? json.data.results
          : [];

      const eligible = results.filter((hbl) => hbl.bypassStorageFlag === true);

      // Fetch packing lists (includes forwarderName) for eligible HBLs and merge HBL info (shipper/consignee/containers)
      const packingListResults = await Promise.all(
        eligible.map(async (hbl) => {
          const resp = await packingListsApi.getAll({
            hblId: hbl.id,
            status: 'APPROVED',
          });
          const lists = normalizePackingLists(resp);

          return lists.map((pl) => {
            const primaryContainer = hbl.containers?.[0] ?? null;
            return {
              ...pl,
              hblData: {
                ...pl.hblData,
                id: hbl.id,
                hblCode: pl.hblData?.hblCode ?? hbl.code ?? '',
                containerNumber:
                  pl.hblData?.containerNumber ??
                  hbl.containerNumber ??
                  primaryContainer?.containerNumber ??
                  '',
                containerType:
                  pl.hblData?.containerType ??
                  hbl.containerType ??
                  primaryContainer?.containerTypeCode ??
                  '',
                sealNumber:
                  pl.hblData?.sealNumber ??
                  hbl.sealNumber ??
                  primaryContainer?.sealNumber ??
                  '',
                forwarderName:
                  pl.hblData?.forwarderName ??
                  hbl.forwarderName ??
                  hbl.issuerId ??
                  '',
                consignee: pl.hblData?.consignee ?? hbl.consignee ?? '',
                shipper: pl.hblData?.shipper ?? hbl.shipper ?? '',
              },
            } as PackingListListItem;
          });
        }),
      );

      const mapped = packingListResults.flat();

      const unique = new Map<string, PackingListListItem>();
      mapped.forEach((item) => unique.set(item.id, item));
      return Array.from(unique.values());
    },
  });
}
