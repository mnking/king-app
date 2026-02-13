import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import * as usersApi from '../../services/apiUsers';
import type { User, UserInsert, UserUpdate } from '../../services/apiUsers';
import { createEntityHook } from '@/shared/hooks/useCrudOperations';

export const useUsers = createEntityHook<User, UserInsert, UserUpdate>({
  queryKey: ['users'],
  api: {
    getAll: usersApi.getUsers,
    create: usersApi.createUser,
    update: usersApi.updateUser,
    delete: usersApi.deleteUser,
  },
  getId: (user: User) => user.id,
});

// Hook for getting a single user by ID
export const useUser = (id: string) => {
  return useQuery({
    queryKey: ['user', id],
    queryFn: () =>
      usersApi.getUserById(id).then((result) => {
        if (result.error) throw result.error;
        return result.data;
      }),
    enabled: !!id,
  });
};

// Hook for getting a user by email
export const useUserByEmail = (email: string) => {
  return useQuery({
    queryKey: ['user', 'email', email],
    queryFn: () =>
      usersApi.getUserByEmail(email).then((result) => {
        if (result.error) throw result.error;
        return result.data;
      }),
    enabled: !!email,
  });
};

// Hook for getting users by role
export const useUsersByRole = (role: string) => {
  return useQuery({
    queryKey: ['users', 'role', role],
    queryFn: () =>
      usersApi.getUsersByRole(role).then((result) => {
        if (result.error) throw result.error;
        return result.data || [];
      }),
    enabled: !!role,
  });
};

// Hook for getting users by department
export const useUsersByDepartment = (department: string) => {
  return useQuery({
    queryKey: ['users', 'department', department],
    queryFn: () =>
      usersApi.getUsersByDepartment(department).then((result) => {
        if (result.error) throw result.error;
        return result.data || [];
      }),
    enabled: !!department,
  });
};

// Hook for getting active users
export const useActiveUsers = () => {
  return useQuery({
    queryKey: ['users', 'active'],
    queryFn: () =>
      usersApi.getActiveUsers().then((result) => {
        if (result.error) throw result.error;
        return result.data || [];
      }),
  });
};

// Hook for searching users
export const useSearchUsers = (searchTerm: string) => {
  return useQuery({
    queryKey: ['users', 'search', searchTerm],
    queryFn: () =>
      usersApi.searchUsers(searchTerm).then((result) => {
        if (result.error) throw result.error;
        return result.data || [];
      }),
    enabled: !!searchTerm && searchTerm.length >= 2,
  });
};

// Extended hook for domain-specific user operations
export const useUsersExtended = () => {
  const queryClient = useQueryClient();

  const toggleUserStatusMutation = useMutation({
    mutationFn: usersApi.toggleUserStatus,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['users'] });
    },
  });

  const toggleUserStatus = async (id: string) => {
    try {
      const result = await toggleUserStatusMutation.mutateAsync(id);
      return result;
    } catch (error) {
      return { data: null, error };
    }
  };

  return {
    toggleUserStatus,
    isTogglingStatus: toggleUserStatusMutation.isPending,
  };
};
