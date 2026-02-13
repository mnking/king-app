import { env, buildEndpointURL, isRealAPI } from '@/config/api';
import { apiFetch } from '@/shared/utils/api-client';
import { getAccessToken } from '@/shared/utils/auth-tokens';

export type AuthApiUser = {
  id: string;
  email: string;
  full_name?: string | null;
  avatar_url?: string | null;
  roles?: string[] | null;
  [key: string]: unknown;
};

export interface UserProfile {
  id: string;
  email: string;
  full_name: string | null;
  avatar_url: string | null;
  roles: string[];
  department: string | null;
  created_at: string;
  updated_at: string;
}

export interface UserPreferences {
  id: string;
  user_id: string;
  theme: string;
  language: string;
  notifications_enabled: boolean;
  created_at: string;
  updated_at: string;
}

export interface SignUpData {
  email: string;
  password: string;
  userData?: {
    full_name?: string;
    avatar_url?: string;
    roles?: string[];
  };
}

export interface SignInData {
  email: string;
  password: string;
}

export interface AuthSession {
  access_token: string;
  refresh_token?: string | null;
  expires_in?: number;
  expires_at?: number;
  user: AuthApiUser | null;
}

export interface AuthLoginResponse {
  session: AuthSession | null;
  user?: AuthApiUser | null;
  [key: string]: unknown;
}

export type ApiResult<T> = {
  data: T | null;
  error: Error | null;
};

const decodeJwtPayload = <T = unknown>(token: string): T | null => {
  try {
    const [, payload] = token.split('.');
    if (!payload) return null;
    const normalized = payload.replace(/-/g, '+').replace(/_/g, '/');
    const json = atob(normalized);
    return JSON.parse(json) as T;
  } catch (error) {
    console.warn('Failed to decode JWT payload', error);
    return null;
  }
};


const parseErrorMessage = async (response: Response, fallback: string) => {
  try {
    const data = await response.json();
    if (typeof data?.error === 'string' && data.error.length > 0) {
      return data.error;
    }
    if (typeof data?.message === 'string' && data.message.length > 0) {
      return data.message;
    }
    return fallback;
  } catch {
    return fallback;
  }
};

const normalizeProfileRoles = (
  profile: UserProfile,
): UserProfile => {
  const incomingRoles =
    Array.isArray(profile.roles) && profile.roles.length > 0
      ? profile.roles
      : [];
  const legacyRole = (profile as unknown as { role?: string | null }).role;
  const mergedRoles =
    incomingRoles.length > 0
      ? incomingRoles
      : legacyRole
        ? [legacyRole]
        : [];

  return {
    ...profile,
    roles: mergedRoles,
  };
};

const ensureJson = async <T>(response: Response, fallback: string): Promise<T> => {
  if (!response.ok) {
    throw new Error(await parseErrorMessage(response, fallback));
  }

  return (await response.json()) as T;
};

const buildErrorResult = (error: unknown, fallback: string): ApiResult<never> => ({
  data: null,
  error: error instanceof Error ? error : new Error(fallback),
});

export const signUp = async ({ email, password, userData }: SignUpData): Promise<ApiResult<AuthLoginResponse>> => {
  try {
    const response = await fetch(buildEndpointURL('auth', '/signup'), {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        email,
        password,
        userData: {
          full_name: userData?.full_name,
          avatar_url: userData?.avatar_url,
          roles: userData?.roles ?? ['user'],
        },
      }),
    });

    const result = await ensureJson<AuthLoginResponse>(response, 'Signup failed');
    return { data: result, error: null };
  } catch (error) {
    return buildErrorResult(error, 'Unknown error');
  }
};

const originalSignIn = async ({ email, password }: SignInData): Promise<ApiResult<AuthLoginResponse>> => {
  try {
    const response = await fetch(buildEndpointURL('auth', '/login'), {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ email, password }),
    });

    const result = await ensureJson<AuthLoginResponse>(response, 'Login failed');
    return { data: result, error: null };
  } catch (error) {
    return buildErrorResult(error, 'Unknown error');
  }
};

const realApiSignIn = async ({ email, password }: SignInData): Promise<ApiResult<AuthLoginResponse>> => {
  try {
    const username = email.includes('@') ? email.split('@')[0] : email;

    if (env.enableLogging) {
      console.log('🔐 Attempting real auth login:', {
        username,
        authUrl: '/api/auth',
      });
    }

    const loginUrl = buildEndpointURL('auth', '/login');
    // if (import.meta.env.MODE === 'test' || env.enableLogging) {
    //   // eslint-disable-next-line no-console
    //   console.log('[auth] Login URL', loginUrl);
    // }
    const response = await fetch(loginUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ username, password }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      let errorMessage = response.status === 401 ? 'Invalid credentials' : 'Login failed';

      try {
        if (errorText) {
          const errorData = JSON.parse(errorText);
          errorMessage =
            response.status === 401
              ? 'Invalid credentials'
              : errorData.error || errorData.message || errorMessage;
        }
      } catch {
        if (response.status !== 401) {
          errorMessage = `HTTP ${response.status}: ${response.statusText}`;
        }
      }

      throw new Error(errorMessage);
    }

    const result = await response.json();

    if (env.enableLogging) {
      console.log('✅ Real auth login successful');
    }

    if (!result.access_token) {
      throw new Error('Invalid response format - no access_token received');
    }

    const payload = decodeJwtPayload<{
      roles?: string[];
      username?: string;
      sub?: string;
    }>(result.access_token);

    const tokenRoles = Array.isArray(payload?.roles) ? payload.roles : [];
    const mergedUser: AuthApiUser = {
      id: payload?.sub ?? username,
      email: `${username}@localhost`,
      username: payload?.username ?? username,
      full_name: (payload?.username ?? username).charAt(0).toUpperCase() + (payload?.username ?? username).slice(1),
      roles: tokenRoles.length > 0 ? tokenRoles : ['default'],
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };

    return {
      data: {
        session: {
          access_token: result.access_token,
          refresh_token: result.refresh_token,
          expires_in: result.expires_in,
          user: mergedUser,
        },
        user: mergedUser,
      },
      error: null,
    };
  } catch (error) {
    console.error('❌ Real auth login failed:', error);
    return buildErrorResult(error, 'Unknown auth error');
  }
};

export const signIn = ({ email, password }: SignInData) => {
  if (isRealAPI('auth')) {
    return realApiSignIn({ email, password });
  }

  return originalSignIn({ email, password });
};

export interface RefreshTokenResponse {
  access_token: string;
  refresh_token?: string;
  expires_in?: number;
}

export const refreshToken = async (refreshTokenValue: string): Promise<RefreshTokenResponse> => {
  if (!isRealAPI('auth')) {
    throw new Error('Token refresh only available with real API');
  }

  const response = await fetch(buildEndpointURL('auth', '/refresh'), {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ refresh_token: refreshTokenValue }),
  });

  return ensureJson<RefreshTokenResponse>(response, 'Token refresh failed');
};

export const signInWithProvider = async (
  provider: 'google' | 'github',
): Promise<ApiResult<Record<string, unknown>>> => {
  try {
    const response = await fetch(buildEndpointURL('auth', `/oauth/${provider}`), {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      },
    });

    const data = await ensureJson<Record<string, unknown>>(
      response,
      'OAuth initialization failed',
    );

    if (data.redirectUrl && typeof data.redirectUrl === 'string') {
      window.location.href = data.redirectUrl;
    }

    return { data, error: null };
  } catch (error) {
    return buildErrorResult(error, 'Unknown error');
  }
};

export const signOut = async (): Promise<ApiResult<null>> => {
  try {
    const response = await apiFetch(buildEndpointURL('auth', '/logout'), {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
    });

    const data = await ensureJson<{ data: null }>(response, 'Logout failed');
    return { data: data.data, error: null };
  } catch (error) {
    return buildErrorResult(error, 'Unknown error');
  }
};

export const updatePassword = async (
  currentPassword: string,
  newPassword: string,
): Promise<ApiResult<null>> => {
  try {
    const response = await apiFetch(buildEndpointURL('auth', '/update-password'), {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ currentPassword, newPassword }),
    });

    const data = await ensureJson<{ data: null }>(response, 'Password update failed');
    return { data: data.data, error: null };
  } catch (error) {
    return buildErrorResult(error, 'Unknown error');
  }
};

export const getCurrentSession = async (): Promise<ApiResult<AuthSession>> => {
  try {
    const token = getAccessToken();

    if (!token) {
      return { data: null, error: null };
    }

    const response = await fetch(buildEndpointURL('auth', '/me'), {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
    });

    if (response.status === 401) {
      return { data: null, error: null };
    }

    const result = await ensureJson<{ data: { session: AuthSession } }>(
      response,
      'Failed to get session',
    );
    return { data: result.data.session, error: null };
  } catch (error) {
    return buildErrorResult(error, 'Unknown error');
  }
};

export const getUserProfile = async (
  userId: string,
): Promise<ApiResult<UserProfile>> => {
  try {
    const response = await apiFetch(`/api/users/${userId}`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      },
    });

    const result = await ensureJson<{ data: UserProfile }>(
      response,
      'Failed to get user profile',
    );
    const normalized = normalizeProfileRoles(result.data);
    return { data: normalized, error: null };
  } catch (error) {
    return buildErrorResult(error, 'Unknown error');
  }
};

export const updateUserProfile = async (
  userId: string,
  updates: Partial<UserProfile>,
): Promise<ApiResult<UserProfile>> => {
  try {
    const response = await apiFetch(`/api/users/${userId}`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(updates),
    });

    const result = await ensureJson<{ data: UserProfile }>(
      response,
      'Failed to update user profile',
    );
    const normalized = normalizeProfileRoles(result.data);
    return { data: normalized, error: null };
  } catch (error) {
    return buildErrorResult(error, 'Unknown error');
  }
};

export const getUserPreferences = async (
  userId: string,
): Promise<ApiResult<UserPreferences>> => {
  try {
    const response = await apiFetch(
      `/api/users/${userId}/preferences`,
      {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
      },
    );

    const result = await ensureJson<{ data: UserPreferences }>(
      response,
      'Failed to get user preferences',
    );
    return { data: result.data, error: null };
  } catch (error) {
    return buildErrorResult(error, 'Unknown error');
  }
};

export const updateUserPreferences = async (
  userId: string,
  preferences: Partial<UserPreferences>,
): Promise<ApiResult<UserPreferences>> => {
  try {
    const response = await apiFetch(
      `/api/users/${userId}/preferences`,
      {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(preferences),
      },
    );

    const result = await ensureJson<{ data: UserPreferences }>(
      response,
      'Failed to update user preferences',
    );
    return { data: result.data, error: null };
  } catch (error) {
    return buildErrorResult(error, 'Unknown error');
  }
};

export const uploadAvatar = async (
  userId: string,
  file: File,
): Promise<ApiResult<string>> => {
  try {
    const formData = new FormData();
    formData.append('avatar', file);

    const response = await apiFetch(`/api/users/${userId}/avatar`, {
      method: 'POST',
      body: formData,
    });

    const result = await ensureJson<{ data: { avatar_url: string } }>(
      response,
      'Avatar upload failed',
    );
    return { data: result.data.avatar_url, error: null };
  } catch (error) {
    return buildErrorResult(error, 'Unknown error');
  }
};

export const checkPermission = async (
  userProfile: UserProfile | null,
  resource: string,
  action: string,
): Promise<boolean> => {
  if (!userProfile) {
    return false;
  }

  const roles = userProfile.roles ?? [];
  if (roles.includes('admin')) {
    return true;
  }

  const primaryRole = roles[0];
  if (!primaryRole) {
    return false;
  }

  try {
    const response = await apiFetch(buildEndpointURL('auth', '/check-permission'), {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        role: primaryRole,
        resource,
        action,
      }),
    });

    if (!response.ok) {
      console.error('Error checking permission');
      return false;
    }

    const result = await response.json();
    return result.data?.allowed ?? false;
  } catch (error) {
    console.error('Error checking permission:', error);
    return false;
  }
};

export const hasRole = (
  userProfile: UserProfile | null,
  roles: string | string[],
): boolean => {
  if (!userProfile) {
    return false;
  }

  const roleArray = Array.isArray(roles) ? roles : [roles];
  return roleArray.some((role) => (userProfile.roles ?? []).includes(role));
};

export const isAdmin = (userProfile: UserProfile | null): boolean => {
  return (userProfile?.roles ?? []).includes('admin');
};

export const isManagerOrAdmin = (userProfile: UserProfile | null): boolean => {
  const roles = userProfile?.roles ?? [];
  return roles.includes('admin') || roles.includes('manager');
};

export const getUserInitials = (fullName: string): string => {
  if (!fullName) {
    return '';
  }

  return fullName
    .split(' ')
    .map((name) => name.charAt(0).toUpperCase())
    .join('')
    .slice(0, 2);
};

export const getDisplayName = (user: UserProfile): string => {
  if (!user) {
    return 'Unknown User';
  }

  return user.full_name || user.email || 'Unknown User';
};
