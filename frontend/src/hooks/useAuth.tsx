/** Authentication state and the JWT lifecycle. */

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { createContext, useCallback, useContext, useMemo, type ReactNode } from 'react';

import { ApiError, tokenStore } from '@/services/api_client';
import { authApi } from '@/services/endpoints';
import type { LoginInput, RegisterInput } from '@/types/forms';
import type { UserResponse } from '@/types/models';

interface AuthContextValue {
  user: UserResponse | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  login: (input: LoginInput) => Promise<void>;
  register: (input: RegisterInput) => Promise<void>;
  logout: () => void;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }): JSX.Element {
  const queryClient = useQueryClient();
  const hasToken = Boolean(tokenStore.get());

  const { data: user, isLoading } = useQuery({
    queryKey: ['auth', 'me'],
    queryFn: authApi.me,
    enabled: hasToken,
    retry: (failureCount, error) => {
      // A rejected token will keep being rejected; retrying just delays the redirect.
      if (error instanceof ApiError && error.isUnauthorized) return false;
      return failureCount < 2;
    },
    staleTime: 5 * 60 * 1000,
  });

  const loginMutation = useMutation({
    mutationFn: authApi.login,
    onSuccess: (token) => {
      tokenStore.set(token.access_token);
      void queryClient.invalidateQueries();
    },
  });

  const registerMutation = useMutation({
    mutationFn: authApi.register,
    onSuccess: (token) => {
      tokenStore.set(token.access_token);
      void queryClient.invalidateQueries();
    },
  });

  const logout = useCallback(() => {
    tokenStore.clear();
    queryClient.clear();
  }, [queryClient]);

  const value = useMemo<AuthContextValue>(
    () => ({
      user: user ?? null,
      isLoading: hasToken && isLoading,
      isAuthenticated: Boolean(user),
      login: async (input) => {
        await loginMutation.mutateAsync(input);
      },
      register: async (input) => {
        await registerMutation.mutateAsync(input);
      },
      logout,
    }),
    [user, hasToken, isLoading, loginMutation, registerMutation, logout],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextValue {
  const context = useContext(AuthContext);
  if (context === null) {
    throw new Error('useAuth must be used inside an AuthProvider.');
  }
  return context;
}
