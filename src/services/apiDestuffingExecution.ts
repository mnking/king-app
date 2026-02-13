import { buildEndpointURL } from '@/config/api';
import { apiFetch } from '@/shared/utils/api-client';
import type { ApiResponse } from '@/shared/features/plan/types';
import type {
  ContainerWorkingStatus,
  DestuffingPlanContainer,
  DestuffResult,
  HblDestuffStatus,
  HblDestuffStatusValue,
  ResealMetadata,
} from '@/features/destuffing-execution/types';

const getDestuffingUrl = (endpoint: string): string => buildEndpointURL('cfs', endpoint);
const getForwarderUrl = (endpoint: string): string =>
  buildEndpointURL('forwarder', endpoint);

const parseErrorMessage = async (response: Response, fallback: string): Promise<string> => {
  try {
    const json = await response.json();
    if (typeof json === 'string') return json;
    if (json?.message) return json.message;
    return fallback;
  } catch {
    return fallback;
  }
};

export type UnsealContainerResponse = DestuffingPlanContainer;

export interface ResealContainerResponse {
  workingStatus: ContainerWorkingStatus;
  resealedAt: string;
  resealedBy: string;
  newSealNumber: string;
  reseal: ResealMetadata;
  cargoLoadedStatus?: string | null;
  customsStatus?: string | null;
}

export interface CompleteContainerResponse {
  workingStatus: ContainerWorkingStatus;
  cargoLoadedStatus: string | null;
  completedAt: string;
  completedBy: string;
}

export interface RecordDestuffResultResponse {
  destuffStatus: HblDestuffStatusValue;
  destuffResult: DestuffResult;
}

export const updateHblBypassFlag = async (
  hblId: string,
  bypassStorageFlag: boolean,
): Promise<ApiResponse<unknown>> => {
  const response = await apiFetch(
    getForwarderUrl(`/v1/hbls/${hblId}`),
    {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ bypassStorageFlag }),
    },
  );

  if (!response.ok) {
    throw new Error(
      await parseErrorMessage(response, 'Failed to update bypass storage flag'),
    );
  }

  return response.json();
};

interface ForwarderHbl {
  id: string;
  code: string;
  bypassStorageFlag?: boolean | null;
  destuffStatus?: string | null;
  destuffMetadata?: {
    document?:
      | {
          id?: string | null;
          name?: string | null;
          url?: string | null;
          sizeBytes?: number | null;
          mimeType?: string | null;
          path?: string | null;
          uploadDate?: string | null;
          size?: number | null;
        }
      | null;
    image?:
      | {
          id?: string | null;
          name?: string | null;
          url?: string | null;
          sizeBytes?: number | null;
          mimeType?: string | null;
          path?: string | null;
          uploadDate?: string | null;
          size?: number | null;
        }
      | null;
    note?: string | null;
    classification?: string | null;
    onHoldRequested?: boolean | null;
  } | null;
  createdAt?: string | null;
  updatedAt?: string | null;
  receivedAt?: string | null;
  packingList?: PackingListLookup | null;
}

interface PackingListLookup {
  id?: string | null;
  packingListNumber?: string | null;
}

interface CargoInspectionSessionLookup {
  id?: string | null;
}

const mapDestuffStatus = (status?: string | null): HblDestuffStatusValue => {
  switch (status) {
    case 'IN_PROGRESS':
      return 'in-progress';
    case 'DONE':
      return 'done';
    case 'ON_HOLD':
      return 'on-hold';
    case 'WAITING':
    default:
      return 'waiting';
  }
};

const mapDestuffClassification = (
  classification?: string | null,
): DestuffResult['classification'] => {
  switch (classification) {
    case 'UNMATCHED':
      return 'unmatched';
    case 'ON_HOLD':
      return 'on-hold';
    case 'PASSED':
    default:
      return 'passed';
  }
};

const mapDestuffMetadata = (
  metadata: ForwarderHbl['destuffMetadata'],
  fallbackTimestamp: string,
): DestuffResult | null => {
  if (!metadata) return null;

  const timestamp =
    metadata.document?.uploadDate ??
    metadata.image?.uploadDate ??
    fallbackTimestamp;

  return {
    timestamp,
    document: (metadata.document?.id ?? metadata.document?.path)
      ? {
          id: metadata.document.id ?? metadata.document.path ?? '',
          name:
            metadata.document.name ??
            metadata.document.path ??
            metadata.document.id ??
            'document',
          url: metadata.document.url ?? undefined,
          mimeType: metadata.document.mimeType ?? 'application/octet-stream',
          sizeBytes:
            metadata.document.sizeBytes ??
            metadata.document.size ??
            undefined,
        }
      : null,
    image: (metadata.image?.id ?? metadata.image?.path)
      ? {
          id: metadata.image.id ?? metadata.image.path ?? '',
          name:
            metadata.image.name ??
            metadata.image.path ??
            metadata.image.id ??
            'image',
          url: metadata.image.url ?? undefined,
          mimeType: metadata.image.mimeType ?? 'application/octet-stream',
          sizeBytes:
            metadata.image.sizeBytes ??
            metadata.image.size ??
            undefined,
        }
      : null,
    note: metadata.note ?? null,
    classification: mapDestuffClassification(metadata.classification),
    onHoldFlag: Boolean(metadata.onHoldRequested),
  };
};

const fetchInspectionSession = async (
  packingListId: string | null,
): Promise<{
  inspectionSessionId: string | null;
}> => {
  if (!packingListId) {
    return {
      inspectionSessionId: null,
    };
  }

  const sessionParams = new URLSearchParams({
    packingListId,
    flowType: 'INBOUND',
  });

  try {
    const sessionResponse = await apiFetch(
      getForwarderUrl(
        `/v1/cargo-inspection-sessions?${sessionParams.toString()}`,
      ),
      { method: 'GET' },
    );

    if (sessionResponse.ok) {
      const sessionJson = await sessionResponse.json();
      const sessions: CargoInspectionSessionLookup[] = Array.isArray(
        sessionJson?.data,
      )
        ? sessionJson.data
        : Array.isArray(sessionJson)
          ? sessionJson
          : [];

      const session = sessions[0];
      return {
        inspectionSessionId: session?.id ?? null,
      };
    }
  } catch {
    // Ignore inspection session errors; treat as no session found
  }

  return {
    inspectionSessionId: null,
  };
};

const fetchPackingListInfo = async (
  hblId: string,
  packingList?: PackingListLookup | null,
): Promise<{
  packingListId: string | null;
  packingListNo: string | null;
  inspectionSessionId: string | null;
}> => {
  try {
    let packingListId = packingList?.id ?? null;
    let packingListNo = packingList?.packingListNumber ?? null;

    if (!packingListId) {
      const params = new URLSearchParams({
        hblId,
        itemsPerPage: '1',
      });
      const packingListResponse = await apiFetch(
        getForwarderUrl(`/v1/packing-lists?${params.toString()}`),
        { method: 'GET' },
      );

      if (!packingListResponse.ok) {
        throw new Error(
          await parseErrorMessage(
            packingListResponse,
            'Failed to fetch packing list',
          ),
        );
      }

      const packingListJson = await packingListResponse.json();
      const packingLists: PackingListLookup[] = Array.isArray(
        packingListJson?.results,
      )
        ? packingListJson.results
        : Array.isArray(packingListJson?.data?.results)
          ? packingListJson.data.results
          : [];

      const packingListItem = packingLists[0];
      packingListId = packingListItem?.id ?? packingListId;
      packingListNo = packingListItem?.packingListNumber ?? packingListNo;
    }

    return {
      packingListId,
      packingListNo,
      ...(await fetchInspectionSession(packingListId)),
    };
  } catch {
    return {
      packingListId: packingList?.id ?? null,
      packingListNo: packingList?.packingListNumber ?? null,
      inspectionSessionId: null,
    };
  }
};

export const unsealContainer = async (
  planId: string,
  containerId: string,
  unsealedAt?: string,
): Promise<ApiResponse<UnsealContainerResponse>> => {
  const response = await apiFetch(
    getDestuffingUrl(`/v1/plans/${planId}/containers/${containerId}/unseal`),
    {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(unsealedAt ? { unsealedAt } : {}),
    },
  );

  if (!response.ok) {
    throw new Error(
      await parseErrorMessage(response, 'Failed to unseal container'),
    );
  }

  return response.json();
};

export const resealContainer = async (
  planId: string,
  containerId: string,
  payload: { newSealNumber: string; onHoldFlag: boolean; note?: string | null },
): Promise<ApiResponse<ResealContainerResponse>> => {
  const response = await apiFetch(
    getDestuffingUrl(`/v1/plans/${planId}/containers/${containerId}/reseal`),
    {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    },
  );

  if (!response.ok) {
    throw new Error(
      await parseErrorMessage(response, 'Failed to reseal container'),
    );
  }

  return response.json();
};

export const completeContainer = async (
  planId: string,
  containerId: string,
  payload?: { sealNumber?: string | null; occurredAt?: string | null; notes?: string | null },
): Promise<ApiResponse<CompleteContainerResponse>> => {
  const body =
    payload && Object.values(payload).some((value) => value !== undefined && value !== null)
      ? JSON.stringify(payload)
      : undefined;

  const response = await apiFetch(
    getDestuffingUrl(`/v1/plans/${planId}/containers/${containerId}/complete-destuffing`),
    {
      method: 'PATCH',
      headers: body ? { 'Content-Type': 'application/json' } : undefined,
      body,
    },
  );

  if (!response.ok) {
    const errorMessage = await parseErrorMessage(response, 'Failed to complete container');
    const error = new Error(errorMessage) as Error & {
      status?: number;
      statusText?: string;
    };
    error.status = response.status;
    error.statusText = response.statusText;
    throw error;
  }

  return response.json();
};

export const getContainerHblsByIds = async (
  _planId: string,
  _containerId: string,
  hblIds: string[],
  containerNumber?: string | null,
): Promise<ApiResponse<{ plannedHbls: HblDestuffStatus[] }>> => {
  if (!Array.isArray(hblIds) || hblIds.length === 0) {
    return Promise.resolve({ data: { plannedHbls: [] } });
  }

  const params = new URLSearchParams({ hasPackingList: 'true' });
  if (containerNumber) {
    params.append('containerNumber', containerNumber);
  }
  hblIds.forEach((id) => params.append('hblIds[]', id));

  const response = await apiFetch(
    getForwarderUrl(`/v1/hbls?${params.toString()}`),
    { method: 'GET' },
  );

  if (!response.ok) {
    throw new Error(
      await parseErrorMessage(response, 'Failed to fetch planned HBLs'),
    );
  }

  const json = await response.json();
  const hbls: ForwarderHbl[] = Array.isArray(json?.results)
    ? json.results
    : Array.isArray(json?.data?.results)
      ? json.data.results
      : [];

  const plannedHbls = await Promise.all(
    hbls.map(async (hbl) => {
      const fallbackTimestamp =
        hbl.updatedAt ?? hbl.createdAt ?? hbl.receivedAt ?? new Date().toISOString();
      const packingListInfo = await fetchPackingListInfo(hbl.id, hbl.packingList);

      return {
        hblId: hbl.id,
        hblCode: hbl.code,
        packingListId: packingListInfo.packingListId,
        packingListNo: packingListInfo.packingListNo,
        bypassStorageFlag: hbl.bypassStorageFlag ?? null,
        destuffStatus: mapDestuffStatus(hbl.destuffStatus),
        inspectionSessionId: packingListInfo.inspectionSessionId,
        destuffResult: mapDestuffMetadata(
          hbl.destuffMetadata,
          fallbackTimestamp,
        ),
      } satisfies HblDestuffStatus;
    }),
  );

  return { data: { plannedHbls } };
};

export const recordDestuffResult = async (
  _planId: string,
  _containerId: string,
  hblId: string,
  payload: {
    document?: DestuffResult['document'] | null;
    image?: DestuffResult['image'] | null;
    note?: string | null;
    onHold: boolean;
    updateMetadataOnly?: boolean;
  },
): Promise<ApiResponse<RecordDestuffResultResponse>> => {
  const response = await apiFetch(
    getForwarderUrl(`/v1/hbls/${hblId}/finalize-destuff`),
    {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    },
  );

  if (!response.ok) {
    throw new Error(
      await parseErrorMessage(response, 'Failed to save destuff result'),
    );
  }

  return response.json();
};
