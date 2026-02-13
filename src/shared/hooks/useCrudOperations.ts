import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

// Generic types for CRUD operations
export interface CrudConfig<TEntity, TInsert, TUpdate> {
  queryKey: string[];
  api: {
    getAll: () =>
      | Promise<{ data: TEntity[] | null; error: Error | null }>
      | Promise<TEntity[]>;
    create: (
      data: TInsert,
    ) =>
      | Promise<{ data: TEntity | null; error: Error | null }>
      | Promise<TEntity>;
    update: (
      id: string,
      updates: TUpdate,
    ) =>
      | Promise<{ data: TEntity | null; error: Error | null }>
      | Promise<TEntity>;
    delete: (
      id: string,
    ) => Promise<{ data: boolean | null; error: Error | null }> | Promise<void>;
  };
  getId: (entity: TEntity) => string;
}

// Utility to normalize API responses
const normalizeResponse = <T>(
  response: unknown,
): { data: T | null; error: Error | null } => {
  if (response && typeof response === 'object') {
    // Handle wrapped responses (like projects)
    if ('data' in response && 'error' in response) {
      return response;
    }
    // Handle success responses (like delete operations)
    if ('success' in response && (response as any).success === true) {
      return { data: true as T, error: null };
    }
    // Handle direct responses (like tasks)
    return { data: response, error: null };
  }
  return { data: null, error: new Error('Invalid response format') };
};

export function useCrudOperations<TEntity, TInsert, TUpdate>(
  config: CrudConfig<TEntity, TInsert, TUpdate>,
) {
  const queryClient = useQueryClient();

  // Query for fetching all entities
  const {
    data: entities = [],
    isLoading: loading,
    error,
    refetch,
  } = useQuery({
    queryKey: config.queryKey,
    queryFn: async () => {
      try {
        const response = await config.api.getAll();
        const normalized = normalizeResponse<TEntity[]>(response);
        if (normalized.error) throw normalized.error;
        return normalized.data || [];
      } catch (error) {
        throw error instanceof Error
          ? error
          : new Error('Failed to fetch entities');
      }
    },
    staleTime: 0,
    retry: 1,
  });

  // Create mutation with optimistic updates
  const createMutation = useMutation({
    mutationFn: async (data: TInsert) => {
      const response = await config.api.create(data);
      const normalized = normalizeResponse<TEntity>(response);
      if (normalized.error) throw normalized.error;
      if (!normalized.data)
        throw new Error('No data returned from create operation');
      return normalized.data;
    },
    onSuccess: (newEntity) => {
      // Optimistically update the cache
      queryClient.setQueryData<TEntity[]>(config.queryKey, (oldEntities) => {
        return oldEntities ? [newEntity, ...oldEntities] : [newEntity];
      });
    },
    onError: () => {
      // Invalidate and refetch on error
      queryClient.invalidateQueries({ queryKey: config.queryKey });
    },
  });

  // Update mutation with optimistic updates
  const updateMutation = useMutation({
    mutationFn: async ({ id, updates }: { id: string; updates: TUpdate }) => {
      const response = await config.api.update(id, updates);
      const normalized = normalizeResponse<TEntity>(response);
      if (normalized.error) throw normalized.error;
      if (!normalized.data)
        throw new Error('No data returned from update operation');
      return normalized.data;
    },
    onSuccess: (updatedEntity) => {
      // Optimistically update the cache
      queryClient.setQueryData<TEntity[]>(config.queryKey, (oldEntities) => {
        return oldEntities
          ? oldEntities.map((entity) =>
              config.getId(entity) === config.getId(updatedEntity)
                ? updatedEntity
                : entity,
            )
          : [];
      });
    },
    onError: () => {
      // Invalidate and refetch on error
      queryClient.invalidateQueries({ queryKey: config.queryKey });
    },
  });

  // Delete mutation with optimistic updates
  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const response = await config.api.delete(id);
      const normalized = normalizeResponse<boolean>(response);
      if (normalized.error) throw normalized.error;
      return id; // Return the deleted ID for optimistic updates
    },
    onSuccess: (deletedId) => {
      // Optimistically update the cache
      queryClient.setQueryData<TEntity[]>(config.queryKey, (oldEntities) => {
        return oldEntities
          ? oldEntities.filter((entity) => config.getId(entity) !== deletedId)
          : [];
      });
    },
    onError: () => {
      // Invalidate and refetch on error
      queryClient.invalidateQueries({ queryKey: config.queryKey });
    },
  });

  // Helper functions for CRUD operations
  const createEntity = async (data: TInsert) => {
    return await createMutation.mutateAsync(data);
  };

  const updateEntity = async (id: string, updates: TUpdate) => {
    return await updateMutation.mutateAsync({ id, updates });
  };

  const deleteEntity = async (id: string) => {
    try {
      await deleteMutation.mutateAsync(id);
      return { data: true, error: null };
    } catch (error) {
      return {
        data: null,
        error: error instanceof Error ? error : new Error('Delete failed'),
      };
    }
  };

  return {
    // Data
    entities,
    loading,
    error: error?.message || null,

    // Actions
    createEntity,
    updateEntity,
    deleteEntity,
    refetch,

    // Mutation states
    isCreating: createMutation.isPending,
    isUpdating: updateMutation.isPending,
    isDeleting: deleteMutation.isPending,

    // Mutation errors
    createError: createMutation.error?.message || null,
    updateError: updateMutation.error?.message || null,
    deleteError: deleteMutation.error?.message || null,

    // Advanced operations for bulk actions
    bulkUpdate: async (ids: string[], updates: TUpdate) => {
      const updatePromises = ids.map((id) => updateEntity(id, updates));
      return Promise.all(updatePromises);
    },

    bulkDelete: async (ids: string[]) => {
      const deletePromises = ids.map((id) => deleteEntity(id));
      const results = await Promise.all(deletePromises);
      return results;
    },
  };
}

// Hook factory for creating entity-specific hooks
export function createEntityHook<TEntity, TInsert, TUpdate>(
  config: CrudConfig<TEntity, TInsert, TUpdate>,
) {
  return function useEntity() {
    return useCrudOperations(config);
  };
}
