export const documentListQueryKey = (
  ownerId: string,
  page: number,
  itemsPerPage: number,
  search?: string,
) => ['document-service', 'documents', ownerId, page, itemsPerPage, search] as const;

export const documentListPrefixKey = (ownerId: string) =>
  ['document-service', 'documents', ownerId] as const;
