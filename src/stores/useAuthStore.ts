import { create } from 'zustand';
import { devtools, persist } from 'zustand/middleware';

import type {
  ApiResult,
  AuthApiUser,
  AuthLoginResponse,
  AuthSession,
  RefreshTokenResponse,
  UserPreferences,
  UserProfile,
} from '@/services/apiAuth';
import * as authApi from '@/services/apiAuth';
import { getMsUntilExpiry } from '@/shared/utils/jwt';
import {
  registerAuthInterceptor,
  resetUnauthorizedGuard,
  setUnauthorizedHandler,
} from '@/shared/utils/api-client';
import {
  clearTokenStorage,
  getRefreshToken as readRefreshToken,
  setAccessToken,
  setRefreshToken,
  isRefreshTokenExpired,
} from '@/shared/utils/auth-tokens';
import { ROLES, type Role } from '@/config/rbac/roles';
import { ROLE_PERMISSIONS } from '@/config/rbac/mapping';
import type { Permission } from '@/config/rbac/permissions';

const REFRESH_BUFFER_MS = 60_000; // Refresh 1 minute before expiry
const MIN_REFRESH_DELAY_MS = 5_000;

let refreshTimeout: ReturnType<typeof setTimeout> | null = null;
let refreshPromise: Promise<boolean> | null = null;

const clearScheduledRefresh = () => {
  if (refreshTimeout) {
    clearTimeout(refreshTimeout);
    refreshTimeout = null;
  }
};

const computeExpiresAt = (session: AuthSession | null): number | null => {
  if (!session?.access_token) {
    return null;
  }

  if (typeof session.expires_at === 'number') {
    const value = session.expires_at;
    return value > 1_000_000_000_000 ? value : value * 1000;
  }

  if (typeof session.expires_in === 'number') {
    return Date.now() + session.expires_in * 1000;
  }

  const msUntilExpiry = getMsUntilExpiry(session.access_token, 0);
  return msUntilExpiry !== null ? Date.now() + msUntilExpiry : null;
};

type SignUpData = authApi.SignUpData;

export interface AuthStoreState {
  user: AuthApiUser | null;
  profile: UserProfile | null;
  preferences: UserPreferences | null;
  session: AuthSession | null;
  accessToken: string | null;
  refreshToken: string | null;
  expiresAt: number | null;
  loading: boolean;
  isAuthenticated: boolean;
  initialized: boolean;
  error: string | null;
  roles: Role[];
  permissions: (Permission | '*')[];
  can: (permission: Permission | string) => boolean;
  initialize: () => Promise<void>;
  signIn: (
    email: string,
    password: string,
  ) => Promise<ApiResult<AuthLoginResponse>>;
  signUp: (
    email: string,
    password: string,
    userData?: SignUpData['userData'],
  ) => Promise<ApiResult<AuthLoginResponse>>;
  signOut: () => Promise<ApiResult<null>>;
  refreshAccessToken: () => Promise<boolean>;
  forceLogout: (reason?: string) => void;
  setProfile: (profile: UserProfile | null) => void;
  setPreferences: (preferences: UserPreferences | null) => void;
  setUser: (user: AuthApiUser | null) => void;
}

type StorePartial = Pick<
  AuthStoreState,
  'user' | 'profile' | 'preferences' | 'roles' | 'permissions'
>;

export const useAuthStore = create<AuthStoreState>()(
  persist(
    devtools((set, get) => {
      const normalizeRoles = (rolesInput: string | string[] | null | undefined): Role[] => {
        const rolesArray = rolesInput
          ? Array.isArray(rolesInput)
            ? rolesInput
            : [rolesInput]
          : [];
        const normalized: Role[] = [];

        rolesArray.forEach((roleValue) => {
          if (typeof roleValue !== 'string') {
            return;
          }
          const match = ROLES.find((role) => role === roleValue);
          if (match && !normalized.includes(match)) {
            normalized.push(match);
          } else if (roleValue) {
            console.warn('Unknown role received, ignoring:', roleValue);
          }
        });

        if (rolesArray.length > 0 && normalized.length === 0) {
          console.warn('No roles provided; applying default role.');
          return ['default' as Role];
        }

        return normalized;
      };

      const deriveRoles = (userCandidate: AuthApiUser | null): Role[] => {
        if (!userCandidate) return [];
        const legacyRole = (userCandidate as { role?: string | null }).role;
        const normalized = normalizeRoles(
          userCandidate.roles ??
          (legacyRole ? [legacyRole] : undefined),
        );
        if (!normalized.includes('default')) {
          normalized.push('default');
        }
        return normalized;
      };

      const derivePermissions = (roles: Role[]): (Permission | '*')[] => {
        const permSet = new Set<Permission | '*'>();

        roles.forEach((role) => {
          const perms = ROLE_PERMISSIONS[role];
          perms?.forEach((perm) => {
            if (perm === '*') {
              permSet.add('*');
              return;
            }
            permSet.add(perm);
            if ((perm as string).endsWith(':write')) {
              const readPerm = `${(perm as string).split(':')[0]}:read`;
              permSet.add(readPerm as Permission);
            }
          });
        });

        return Array.from(permSet);
      };

      const scheduleRefresh = (expiresAt: number | null) => {
        clearScheduledRefresh();

        if (!expiresAt) {
          return;
        }

        const delay = Math.max(expiresAt - Date.now() - REFRESH_BUFFER_MS, MIN_REFRESH_DELAY_MS);
        refreshTimeout = setTimeout(() => {
          get()
            .refreshAccessToken()
            .catch((error) => {
              console.error('Scheduled token refresh failed', error);
            });
        }, delay);
      };

      const applySession = (
        session: AuthSession | null,
        userOverride?: AuthApiUser | null,
      ) => {
        if (!session) {
          clearScheduledRefresh();
          clearTokenStorage();
          set({
            session: null,
            accessToken: null,
            refreshToken: null,
            expiresAt: null,
            isAuthenticated: false,
            roles: [],
          });
          return;
        }

        const expiresAt = computeExpiresAt(session);
        const nextRefreshToken =
          session.refresh_token ?? get().refreshToken ?? readRefreshToken();

        setAccessToken(session.access_token, expiresAt);
        setRefreshToken(nextRefreshToken ?? null);
        scheduleRefresh(expiresAt);

        const user = userOverride ?? session.user ?? null;

        const roles = deriveRoles(user);
        const permissions = derivePermissions(roles);

        set({
          session: {
            ...session,
            refresh_token: nextRefreshToken,
            expires_at:
              typeof session.expires_at === 'number'
                ? session.expires_at
                : expiresAt && Math.floor(expiresAt / 1000),
          },
          accessToken: session.access_token,
          refreshToken: nextRefreshToken ?? null,
          expiresAt,
          user: user
            ? {
              ...user,
              roles: user.roles ?? roles,
            }
            : null,
          roles,
          permissions,
          isAuthenticated: !!(user && session.access_token),
          loading: false,
          error: null,
        });
      };

      const resetState = () => {
        clearScheduledRefresh();
        clearTokenStorage();
        resetUnauthorizedGuard();
        set({
          session: null,
          accessToken: null,
          refreshToken: null,
          expiresAt: null,
          user: null,
          profile: null,
          preferences: null,
          isAuthenticated: false,
          loading: false,
          error: null,
          roles: [],
          permissions: [],
        });
      };

      const refreshAccessToken = async (): Promise<boolean> => {
        if (refreshPromise) {
          return refreshPromise;
        }

        const token = get().refreshToken ?? readRefreshToken();
        if (!token) {
          return false;
        }

        // Check if refresh token is expired before attempting refresh
        if (isRefreshTokenExpired()) {
          console.warn('Refresh token expired, forcing logout');
          get().forceLogout('refresh_token_expired');
          return false;
        }

        refreshPromise = (async () => {
          try {
            const result: RefreshTokenResponse = await authApi.refreshToken(token);
            if (!result.access_token) {
              throw new Error('No access token returned during refresh');
            }

            const session: AuthSession = {
              access_token: result.access_token,
              refresh_token: result.refresh_token ?? token, // Backend returns new refresh token
              expires_in: result.expires_in,
              user: get().session?.user ?? get().user ?? null,
            };

            applySession(session);
            return true;
          } catch (error) {
            console.error('Token refresh failed', error);
            get().forceLogout('refresh_failed');
            return false;
          } finally {
            refreshPromise = null;
          }
        })();

        return refreshPromise;
      };

      return {
        user: null,
        profile: null,
        preferences: null,
        session: null,
        accessToken: null,
        refreshToken: null,
        expiresAt: null,
        loading: true,
        isAuthenticated: false,
        initialized: false,
        error: null,
        roles: [],
        permissions: [],
        can: (permission) => {
          const permString = permission as Permission;
          const currentPerms = get().permissions;
          if (currentPerms.includes('*')) {
            return true;
          }
          return currentPerms.includes(permString);
        },
        initialize: async () => {
          if (get().initialized) {
            return;
          }

          set({ initialized: true, loading: true });

          const storedRefreshToken = readRefreshToken();
          if (!storedRefreshToken) {
            resetState();
            return;
          }

          // Check if refresh token expired on app load
          if (isRefreshTokenExpired()) {
            console.warn('Refresh token expired on initialization');
            resetState();
            return;
          }

          set({ refreshToken: storedRefreshToken });

          const refreshed = await refreshAccessToken();
          if (!refreshed) {
            set({ loading: false });
            return;
          }

          try {
            const sessionResult = await authApi.getCurrentSession();
            if (sessionResult.data) {
              applySession(sessionResult.data);
            } else {
              set({ loading: false });
            }
          } catch (error) {
            console.error('Failed to fetch current session', error);
            set({ loading: false });
          }
        },
        signIn: async (email, password) => {
          set({ loading: true });
          const result = await authApi.signIn({ email, password });

          if (result.data?.session) {
            applySession(result.data.session, result.data.user ?? undefined);

            if (!result.data.session.user) {
              const sessionResult = await authApi.getCurrentSession();
              if (sessionResult.data) {
                applySession(sessionResult.data);
              }
            }
          } else {
            set({ loading: false });
          }

          return result;
        },
        signUp: async (email, password, userData) => {
          set({ loading: true });
          const result = await authApi.signUp({ email, password, userData });

          if (result.data?.session) {
            applySession(result.data.session, result.data.user ?? undefined);

            if (!result.data.session.user) {
              const sessionResult = await authApi.getCurrentSession();
              if (sessionResult.data) {
                applySession(sessionResult.data);
              }
            }
          } else {
            set({ loading: false });
          }

          return result;
        },
        signOut: async () => {
          // Optimistic logout to avoid blocking UI on network issues.
          resetState();
          // REM CODE FOR FUTURE USE:
          // authApi.signOut().catch((error) => {
          //   console.warn('Logout request failed', error);
          // });
          return { data: null, error: null };
        },
        refreshAccessToken,
        forceLogout: (reason) => {
          if (reason) {
            console.warn('Force logout triggered:', reason);
          }
          resetState();
        },
        setProfile: (profile) =>
          set({
            profile: profile
              ? {
                ...profile,
                roles: profile.roles ?? [],
              }
              : null,
          }),
        setPreferences: (preferences) => set({ preferences }),
        setUser: (user) =>
          set((state) => {
            const nextRoles = deriveRoles(user);
            return {
              user,
              roles: nextRoles,
              permissions: derivePermissions(nextRoles),
              isAuthenticated: !!(user && state.accessToken),
            };
          }),
      };
    }),
    {
      name: 'auth-store',
      partialize: (state): StorePartial => ({
        user: state.user,
        profile: state.profile,
        preferences: state.preferences,
        roles: state.roles,
        permissions: state.permissions,
      }),
    },
  ),
);

registerAuthInterceptor({
  getAccessToken: () => useAuthStore.getState().accessToken,
  refreshAccessToken: () => useAuthStore.getState().refreshAccessToken(),
  onAuthFailure: () => useAuthStore.getState().forceLogout('unauthorized'),
});

setUnauthorizedHandler(() => {
  useAuthStore.getState().forceLogout('unauthorized');
});
