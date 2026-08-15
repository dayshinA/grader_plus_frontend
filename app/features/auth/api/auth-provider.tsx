import { useCallback, useEffect, useMemo, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";

import { accessService } from "~/features/access/api/access.service";
import { can, canAny } from "~/features/access/permissions";
import { AuthContext, type AuthContextValue } from "~/features/auth/api/auth-context";
import type { AuthStatus } from "~/features/auth/types";
import { usersService } from "~/features/users/api/users.service";
import {
  clearSession,
  configureApiClient,
  ensureSessionBootstrap,
  getCurrentSession,
  setSession,
} from "~/lib/api-client";
import type { SessionResponse } from "~/lib/api-client";

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const queryClient = useQueryClient();
  const [status, setStatus] = useState<AuthStatus>("loading");
  const [sessionUser, setSessionUser] = useState<SessionResponse["user"] | null>(null);

  const signOut = useCallback(() => {
    clearSession();
    setSessionUser(null);
    setStatus("unauthenticated");
    // Every cached query belongs to the session that just ended.
    queryClient.clear();
  }, [queryClient]);

  const signIn = useCallback(
    (session: SessionResponse) => {
      setSession(session);
      setSessionUser(session.user);
      setStatus("authenticated");
      // The previous occupant of this tab has nothing to say about this one.
      queryClient.clear();
    },
    [queryClient],
  );

  useEffect(() => {
    configureApiClient({
      // No navigation here. ProtectedRoute watches the status and redirects once, rather
      // than two redirects racing for the same transition.
      onUnauthorized: signOut,
      onSessionRefreshed: (session) => {
        setSessionUser(session.user);
        setStatus("authenticated");
      },
    });
  }, [signOut]);

  // A hard refresh has no token in memory. The httpOnly refresh cookie is the only way
  // back in, and this is the one attempt per page load.
  useEffect(() => {
    let cancelled = false;
    void ensureSessionBootstrap().then((recovered) => {
      if (cancelled) return;
      const session = getCurrentSession();
      if (recovered && session) {
        setSessionUser(session.user);
        setStatus("authenticated");
      } else {
        setStatus("unauthenticated");
      }
    });
    return () => {
      cancelled = true;
    };
  }, []);

  const isAuthenticated = status === "authenticated";

  const meQuery = useQuery({
    queryKey: ["auth", "me"],
    queryFn: () => usersService.me(),
    enabled: isAuthenticated,
    staleTime: 5 * 60 * 1000,
  });

  const permissionsQuery = useQuery({
    queryKey: ["auth", "permissions"],
    queryFn: () => accessService.myPermissions(),
    enabled: isAuthenticated,
    staleTime: 5 * 60 * 1000,
  });

  const grants = useMemo(() => permissionsQuery.data ?? [], [permissionsQuery.data]);

  const value = useMemo<AuthContextValue>(
    () => ({
      user: meQuery.data ?? null,
      session: sessionUser,
      grants,
      status,
      isAuthenticated,
      isLoading: status === "loading",
      isResolvingIdentity: isAuthenticated && (permissionsQuery.isPending || meQuery.isPending),
      identityError: permissionsQuery.error ?? meQuery.error ?? null,
      // GET /me carries the same flag, so a session recovered by refresh still knows.
      mustChangePassword: Boolean(
        sessionUser?.mustChangePassword ?? meQuery.data?.mustChangePassword,
      ),
      can: (permission) => can(grants, permission),
      canAny: (permissions) => canAny(grants, permissions),
      signIn,
      signOut,
    }),
    [
      meQuery.data,
      meQuery.isPending,
      meQuery.error,
      permissionsQuery.isPending,
      permissionsQuery.error,
      sessionUser,
      grants,
      status,
      isAuthenticated,
      signIn,
      signOut,
    ],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}
