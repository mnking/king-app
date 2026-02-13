import { UserRole } from '@/shared/types/roles';
import { config } from '@/config';
import { apiFetch } from '@/shared/utils/api-client';

export interface User {
  id: string;
  email: string;
  full_name?: string;
  avatar_url?: string;
  role: UserRole;
  department?: string;
  job_title?: string;
  position?: string;
  phone?: string;
  location?: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
  last_seen?: string;
}

export interface UserInsert {
  email: string;
  full_name?: string;
  avatar_url?: string;
  role: UserRole;
  department?: string;
  job_title?: string;
  position?: string;
  phone?: string;
  location?: string;
  is_active?: boolean;
}

export interface UserUpdate {
  full_name?: string;
  avatar_url?: string;
  role?: UserRole;
  department?: string;
  job_title?: string;
  position?: string;
  phone?: string;
  location?: string;
  is_active?: boolean;
}

const API_URL = config.apiUrl;

// Get all users
export const getUsers = async (): Promise<{
  data: User[] | null;
  error: Error | null;
}> => {
  try {
    const response = await apiFetch(`${API_URL}/api/users`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      },
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.error || 'Failed to fetch users');
    }

    const result = await response.json();
    return { data: result.data, error: null };
  } catch (error) {
    return {
      data: null,
      error: error instanceof Error ? error : new Error('Unknown error'),
    };
  }
};

// Get a single user by ID
export const getUser = async (
  id: string,
): Promise<{ data: User | null; error: Error | null }> => {
  try {
    const response = await apiFetch(`${API_URL}/api/users/${id}`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      },
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.error || 'Failed to fetch user');
    }

    const data = await response.json();
    return { data, error: null };
  } catch (error) {
    return {
      data: null,
      error: error instanceof Error ? error : new Error('Unknown error'),
    };
  }
};

// Get user by email
export const getUserByEmail = async (
  email: string,
): Promise<{ data: User | null; error: Error | null }> => {
  try {
    const response = await apiFetch(
      `${API_URL}/api/users?email=${encodeURIComponent(email)}`,
      {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
      },
    );

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.error || 'Failed to fetch user by email');
    }

    const data = await response.json();
    return { data: data[0] || null, error: null };
  } catch (error) {
    return {
      data: null,
      error: error instanceof Error ? error : new Error('Unknown error'),
    };
  }
};

// Create a new user
export const createUser = async (
  user: UserInsert,
): Promise<{ data: User | null; error: Error | null }> => {
  try {
    const response = await apiFetch(`${API_URL}/api/users`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ ...user, updated_at: new Date().toISOString() }),
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.error || 'Failed to create user');
    }

    const data = await response.json();
    return { data, error: null };
  } catch (error) {
    return {
      data: null,
      error: error instanceof Error ? error : new Error('Unknown error'),
    };
  }
};

// Update an existing user
export const updateUser = async (
  id: string,
  updates: UserUpdate,
): Promise<{ data: User | null; error: Error | null }> => {
  try {
    const response = await apiFetch(`${API_URL}/api/users/${id}`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        ...updates,
        updated_at: new Date().toISOString(),
      }),
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.error || 'Failed to update user');
    }

    const data = await response.json();
    return { data, error: null };
  } catch (error) {
    return {
      data: null,
      error: error instanceof Error ? error : new Error('Unknown error'),
    };
  }
};

// Delete a user
export const deleteUser = async (
  id: string,
): Promise<{ data: null; error: Error | null }> => {
  try {
    const response = await apiFetch(`${API_URL}/api/users/${id}`, {
      method: 'DELETE',
      headers: {
        'Content-Type': 'application/json',
      },
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.error || 'Failed to delete user');
    }

    return { data: null, error: null };
  } catch (error) {
    return {
      data: null,
      error: error instanceof Error ? error : new Error('Unknown error'),
    };
  }
};

// Toggle user active status
export const toggleUserStatus = async (
  id: string,
  isActive: boolean,
): Promise<{ data: User | null; error: Error | null }> => {
  try {
    const response = await apiFetch(`${API_URL}/api/users/${id}/status`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        is_active: isActive,
        updated_at: new Date().toISOString(),
      }),
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.error || 'Failed to toggle user status');
    }

    const data = await response.json();
    return { data, error: null };
  } catch (error) {
    return {
      data: null,
      error: error instanceof Error ? error : new Error('Unknown error'),
    };
  }
};

// Get users by role
export const getUsersByRole = async (
  role: string,
): Promise<{ data: User[] | null; error: Error | null }> => {
  try {
    const response = await apiFetch(
      `${API_URL}/api/users?role=${encodeURIComponent(role)}`,
      {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
      },
    );

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.error || 'Failed to fetch users by role');
    }

    const data = await response.json();
    return { data, error: null };
  } catch (error) {
    return {
      data: null,
      error: error instanceof Error ? error : new Error('Unknown error'),
    };
  }
};

// Get active users
export const getActiveUsers = async (): Promise<{
  data: User[] | null;
  error: Error | null;
}> => {
  try {
    const response = await apiFetch(`${API_URL}/api/users?is_active=true`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      },
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.error || 'Failed to fetch active users');
    }

    const data = await response.json();
    return { data, error: null };
  } catch (error) {
    return {
      data: null,
      error: error instanceof Error ? error : new Error('Unknown error'),
    };
  }
};

// Get users by department
export const getUsersByDepartment = async (
  department: string,
): Promise<{ data: User[] | null; error: Error | null }> => {
  try {
    const response = await apiFetch(
      `${API_URL}/api/users?department=${encodeURIComponent(department)}`,
      {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
      },
    );

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.error || 'Failed to fetch users by department');
    }

    const data = await response.json();
    return { data, error: null };
  } catch (error) {
    return {
      data: null,
      error: error instanceof Error ? error : new Error('Unknown error'),
    };
  }
};

// Search users by name or email
export const searchUsers = async (
  searchTerm: string,
): Promise<{ data: User[] | null; error: Error | null }> => {
  try {
    const response = await apiFetch(
      `${API_URL}/api/users/search?q=${encodeURIComponent(searchTerm)}`,
      {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
      },
    );

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.error || 'Failed to search users');
    }

    const data = await response.json();
    return { data, error: null };
  } catch (error) {
    return {
      data: null,
      error: error instanceof Error ? error : new Error('Unknown error'),
    };
  }
};

// Alias for getUser (for compatibility)
export const getUserById = getUser;
