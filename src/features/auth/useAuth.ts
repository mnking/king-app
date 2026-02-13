import { useCallback, useEffect, useMemo, useRef } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { shallow } from 'zustand/shallow';

import * as authApi from '@/services/apiAuth';
import { useAuthStore } from '@/stores/useAuthStore';

export const useAuth = () => {
  const queryClient = useQueryClient();
  const authState = useAuthStore(
    (state) => ({
      user: state.user,
      profile: state.profile,
      preferences: state.preferences,
      session: state.session,
      loading: state.loading,
      isAuthenticated: state.isAuthenticated,
      initialized: state.initialized,
      roles: state.roles,
      permissions: state.permissions,
      can: state.can,
      initialize: state.initialize,
      signIn: state.signIn,
      signUp: state.signUp,
      signOut: state.signOut,
      forceLogout: state.forceLogout,
      setProfile: state.setProfile,
      setPreferences: state.setPreferences,
      setUser: state.setUser,
    }),
    shallow,
  );

  const {
    user,
    profile,
    preferences,
    session,
    loading,
    isAuthenticated,
    initialized,
    roles,
    permissions,
    can,
    initialize,
    signIn: signInAction,
    signUp: signUpAction,
    signOut: signOutAction,
    forceLogout: forceLogoutAction,
    setProfile,
    setPreferences,
    setUser,
  } = authState;

  useEffect(() => {
    if (!initialized) {
      initialize();
    }
  }, [initialized, initialize]);

  const previousAuthState = useRef(isAuthenticated);
  useEffect(() => {
    if (previousAuthState.current && !isAuthenticated) {
      queryClient.clear();
    }
    previousAuthState.current = isAuthenticated;
  }, [isAuthenticated, queryClient]);

  useEffect(() => {
    if (session?.user && (!user || user.id !== session.user.id)) {
      setUser(session.user);
    }
  }, [session?.user, setUser, user]);

  const profileQuery = useQuery({
    queryKey: ['userProfile', user?.id],
    queryFn: async () => {
      if (!user?.id) {
        return null;
      }
      const result = await authApi.getUserProfile(user.id);
      if (!result.error) {
        setProfile(result.data ?? null);
      }
      return result.data;
    },
    enabled: !!user?.id,
  });

  const preferencesQuery = useQuery({
    queryKey: ['userPreferences', user?.id],
    queryFn: async () => {
      if (!user?.id) {
        return null;
      }
      const result = await authApi.getUserPreferences(user.id);
      if (!result.error) {
        setPreferences(result.data ?? null);
      }
      return result.data;
    },
    enabled: !!user?.id,
  });

  useEffect(() => {
    if (profileQuery.data) {
      setProfile(profileQuery.data);
    }
  }, [profileQuery.data, setProfile]);

  useEffect(() => {
    if (preferencesQuery.data) {
      setPreferences(preferencesQuery.data);
    }
  }, [preferencesQuery.data, setPreferences]);

  const updateProfileMutation = useMutation({
    mutationFn: ({
      userId,
      updates,
    }: {
      userId: string;
      updates: Partial<authApi.UserProfile>;
    }) => authApi.updateUserProfile(userId, updates),
    onSuccess: (result, variables) => {
      if (!result.error && result.data) {
        setProfile(result.data);
        queryClient.invalidateQueries({ queryKey: ['userProfile', variables.userId] });
      }
    },
  });

  const updatePreferencesMutation = useMutation({
    mutationFn: ({
      userId,
      preferences: updates,
    }: {
      userId: string;
      preferences: Partial<authApi.UserPreferences>;
    }) => authApi.updateUserPreferences(userId, updates),
    onSuccess: (result, variables) => {
      if (!result.error && result.data) {
        setPreferences(result.data);
        queryClient.invalidateQueries({
          queryKey: ['userPreferences', variables.userId],
        });
      }
    },
  });

  const uploadAvatarMutation = useMutation({
    mutationFn: ({ userId, file }: { userId: string; file: File }) =>
      authApi.uploadAvatar(userId, file),
    onSuccess: (result, variables) => {
      if (!result.error && result.data && profile) {
        setProfile({ ...profile, avatar_url: result.data });
        queryClient.invalidateQueries({ queryKey: ['userProfile', variables.userId] });
      }
    },
  });

  const updatePasswordMutation = useMutation({
    mutationFn: ({
      currentPassword,
      newPassword,
    }: {
      currentPassword: string;
      newPassword: string;
    }) => authApi.updatePassword(currentPassword, newPassword),
  });

  const handleSignIn = useCallback(
    async (email: string, password: string) => {
      const result = await signInAction(email, password);
      if (!result.error) {
        queryClient.invalidateQueries({ queryKey: ['userProfile'] });
        queryClient.invalidateQueries({ queryKey: ['userPreferences'] });
      }
      return result;
    },
    [queryClient, signInAction],
  );

  const handleSignUp = useCallback(
    async (
      email: string,
      password: string,
      userData?: authApi.SignUpData['userData'],
    ) => {
      const result = await signUpAction(email, password, userData);
      if (!result.error) {
        queryClient.invalidateQueries({ queryKey: ['userProfile'] });
        queryClient.invalidateQueries({ queryKey: ['userPreferences'] });
      }
      return result;
    },
    [queryClient, signUpAction],
  );

  const handleSignOut = useCallback(async () => {
    const result = await signOutAction();
    queryClient.clear();
    return result;
  }, [queryClient, signOutAction]);

  const handleForceLogout = useCallback(
    (reason?: string) => {
      queryClient.clear();
      forceLogoutAction(reason);
    },
    [forceLogoutAction, queryClient],
  );

  const handleUpdateProfile = useCallback(
    async (updates: Partial<authApi.UserProfile>) => {
      if (!user?.id) {
        return {
          data: null,
          error: new Error('No user logged in'),
        } as authApi.ApiResult<authApi.UserProfile>;
      }

      return updateProfileMutation.mutateAsync({
        userId: user.id,
        updates,
      });
    },
    [updateProfileMutation, user?.id],
  );

  const handleUpdatePreferences = useCallback(
    async (updates: Partial<authApi.UserPreferences>) => {
      if (!user?.id) {
        return {
          data: null,
          error: new Error('No user logged in'),
        } as authApi.ApiResult<authApi.UserPreferences>;
      }

      return updatePreferencesMutation.mutateAsync({
        userId: user.id,
        preferences: updates,
      });
    },
    [updatePreferencesMutation, user?.id],
  );

  const handleUploadAvatar = useCallback(
    async (file: File) => {
      if (!user?.id) {
        return {
          data: null,
          error: new Error('No user logged in'),
        } as authApi.ApiResult<string>;
      }

      return uploadAvatarMutation.mutateAsync({ userId: user.id, file });
    },
    [uploadAvatarMutation, user?.id],
  );

  const handleUpdatePassword = useCallback(
    async (currentPassword: string, newPassword: string) => {
      return updatePasswordMutation.mutateAsync({
        currentPassword,
        newPassword,
      });
    },
    [updatePasswordMutation],
  );

  const hasPermission = useCallback(
    async (resource: string, action: string) => {
      return can(`${resource}:${action}`);
    },
    [can],
  );

  const hasRole = useCallback(
    (rolesInput: string | string[]) =>
      authApi.hasRole(
        profile ? { ...profile, roles: profile.roles ?? [] } : null,
        rolesInput,
      ),
    [profile],
  );

  const isAdmin = useCallback(() => authApi.isAdmin(profile ?? null), [profile]);

  const isManagerOrAdmin = useCallback(
    () => authApi.isManagerOrAdmin(profile ?? null),
    [profile],
  );

  const utils = useMemo(
    () => ({
      getUserInitials: authApi.getUserInitials,
      getDisplayName: authApi.getDisplayName,
    }),
    [],
  );

  return {
    user,
    profile,
    preferences,
    session,
    loading,
    initialized,
    isAuthenticated,
    roles,
    permissions,
    signUp: handleSignUp,
    signIn: handleSignIn,
    signInWithProvider: authApi.signInWithProvider,
    signOut: handleSignOut,
    updateProfile: handleUpdateProfile,
    updatePreferences: handleUpdatePreferences,
    uploadAvatar: handleUploadAvatar,
    updatePassword: handleUpdatePassword,
    hasPermission,
    hasRole,
    isAdmin,
    isManagerOrAdmin,
    utils,
    forceLogout: handleForceLogout,
    can,
  } as const;
};
