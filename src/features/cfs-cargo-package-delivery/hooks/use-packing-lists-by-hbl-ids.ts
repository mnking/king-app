import { useQuery } from '@tanstack/react-query';
import { packingListsApi } from '@/services/apiPackingLists';
import { buildEndpointURL } from '@/config/api';
import { apiFetch } from '@/shared/utils/api-client';
import type { PackingListListItem } from '@/features/packing-list/types';

type ForwarderHbl = {
  id: string;
  code?: string | null;
  bypassStorageFlag?: boolean | null;
  containerNumber?: string | null;
  containerType?: string | null;
  sealNumber?: string | null;
  forwarderName?: string | null;
  vessel?: string | null;
  voyage?: string | null;
  consignee?: string | null;
  shipper?: string | null;
  containers?: Array<{
    containerNumber?: string | null;
    containerTypeCode?: string | null;
    sealNumber?: string | null;
  }> | null;
  packingList?: {
    id: string;
    packingListNumber?: string | null;
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
    queryKey: ['cfs-packing-lists-by-hbl-ids', normalizedHblIds.sort()],
    enabled: normalizedHblIds.length > 0,
    queryFn: async (): Promise<PackingListListItem[]> => {
      // Fetch HBLs with packing lists, then filter by bypassStorageFlag === false
      const params = new URLSearchParams({ hasPackingList: 'true', itemsPerPage: '1000' });
      normalizedHblIds.forEach((id) => params.append('hblIds[]', id));

      const response = await apiFetch(
        buildEndpointURL('forwarder', `/v1/hbls?${params.toString()}`),
        { method: 'GET' },
      );
      if (!response.ok) {
        throw new Error('Failed to fetch HBLs for delivery');
      }
      const json = await response.json();
      const results: ForwarderHbl[] = Array.isArray(json?.results)
        ? json.results
        : Array.isArray(json?.data?.results)
          ? json.data.results
          : [];

      const eligible = results.filter((hbl) => hbl.bypassStorageFlag === false);

      // Fetch packing lists for each eligible HBL and merge HBL details
      const packingListResults = await Promise.all(
        eligible.map(async (hbl) => {
          const plResp = await packingListsApi.getAll({
            hblId: hbl.id,
            status: 'APPROVED',
            workingStatus: 'IN_PROGRESS',
          });
          const lists = normalizePackingLists(plResp);
          const primaryContainer = hbl.containers?.[0] ?? null;

          return lists.map((pl) => ({
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
              forwarderName: pl.hblData?.forwarderName ?? hbl.forwarderName ?? '',
              consignee: pl.hblData?.consignee ?? hbl.consignee ?? '',
              shipper: pl.hblData?.shipper ?? hbl.shipper ?? '',
            },
          })) as PackingListListItem[];
        }),
      );

      const flat = packingListResults.flat();
      const unique = new Map<string, PackingListListItem>();
      flat.forEach((item) => {
        unique.set(item.id, item);
      });
      return Array.from(unique.values());
    },
  });
}
