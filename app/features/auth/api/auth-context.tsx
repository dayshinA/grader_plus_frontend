import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { flushSync } from "react-dom";
import { useNavigate } from "react-router";
import {
  ApiError,
  clearSession,
  configureApiClient,
  ensureSessionBootstrap,
  getCurrentSession,
  refreshSession as apiRefreshSession,
  setSession,
} from "~/lib/api-client";
import { authService } from "~/features/auth/api/auth.service";
import { permissionsService } from "~/features/permissions/api/permissions.service";
import type { UserPermissionsSummary } from "~/features/permissions/types";
import type { LoginResponse, User } from "~/features/auth/types";
import { queryClient } from "~/lib/query-client";

/** How long before expires_in to proactively refresh, and the floor if expires_in is already tiny. */
const REFRESH_BUFFER_SECONDS = 60;
const MIN_REFRESH_DELAY_MS = 5_000;

interface AuthContextValue {
  user: User | null;
  /**
   * The caller's RBAC summary from `GET /role-assignments/me` — the only source
   * of identity or capability in this app (the JWT is `{ sub, email }` and the
   * login response carries no role). Null exactly when `user` is null.
   *
   * Read it through the predicates in `~/features/permissions/utils`, and treat
   * it as coarse UI gating only: `permissionKeys` is scope-blind and the server
   * still checks every request.
   */
  permissions: UserPermissionsSummary | null;
  /**
   * True until the mount-time silent-refresh attempt (session recovery across a
   * hard reload) **and** the `/role-assignments/me` call that follows it both
   * settle. Covering the second call matters: without it `ProtectedRoute` reads
   * a null summary on a genuinely-permitted route and flash-redirects to
   * /unauthorized.
   */
  isBootstrapping: boolean;
  /**
   * Resolves with the summary once the session is fully established. **Rejects**
   * if `/role-assignments/me` fails, having already torn the session back down
   * (decision #40) — the caller is on /login already, so this surfaces as the
   * login form's own error state rather than a redirect to where it already is.
   */
  login: (response: LoginResponse) => Promise<UserPermissionsSummary>;
  logout: () => void;
  markPasswordChanged: () => void;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [permissions, setPermissions] = useState<UserPermissionsSummary | null>(
    null,
  );
  const [isBootstrapping, setIsBootstrapping] = useState(true);
  const refreshTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const permissionsPromiseRef = useRef<Promise<UserPermissionsSummary | null> | null>(
    null,
  );
  const navigate = useNavigate();

  /**
   * Single-flight fetch of the RBAC summary, mirroring `refreshSession()`'s
   * dedupe in api-client. Both the `onTokenRefreshed` callback and the
   * bootstrap effect below fire on a hard reload — the bootstrap's own refresh
   * *is* what triggers that callback — so without deduping, every page load
   * would issue two identical `/role-assignments/me` requests.
   *
   * Resolves null rather than throwing; each caller decides what a failure
   * means (see decision #40 — fatal in every case, but the *shape* of "fatal"
   * differs between login and mid-session).
   */
  const loadPermissions =
    useCallback((): Promise<UserPermissionsSummary | null> => {
      if (!permissionsPromiseRef.current) {
        permissionsPromiseRef.current = permissionsService
          .getMyPermissions()
          .then((summary) => {
            setPermissions(summary);
            return summary;
          })
          .catch(() => null)
          .finally(() => {
            permissionsPromiseRef.current = null;
          });
      }
      return permissionsPromiseRef.current;
    }, []);

  const clearRefreshTimer = useCallback(() => {
    if (refreshTimerRef.current) {
      clearTimeout(refreshTimerRef.current);
      refreshTimerRef.current = null;
    }
  }, []);

  const forceLogoutRedirect = useCallback(() => {
    clearSession();
    clearRefreshTimer();
    // See logout()'s matching comment below — same stale-cache-across-accounts bug, reachable
    // via forced session expiry too (e.g. a revoked refresh token) if someone signs back in as a
    // different user in the same tab afterward.
    queryClient.clear();
    const next = encodeURIComponent(
      window.location.pathname + window.location.search,
    );
    flushSync(() => {
      setUser(null);
      setPermissions(null);
    });
    navigate(`/login?next=${next}&expired=1`, { replace: true });
  }, [navigate, clearRefreshTimer]);

  const scheduleProactiveRefresh = useCallback(
    (expiresIn: number) => {
      clearRefreshTimer();
      const delayMs = Math.max(
        (expiresIn - REFRESH_BUFFER_SECONDS) * 1000,
        MIN_REFRESH_DELAY_MS,
      );
      refreshTimerRef.current = setTimeout(() => {
        void apiRefreshSession().then((refreshed) => {
          // A failed *proactive* refresh means a real, previously-valid
          // session just died (expired token, revoked chain, etc.) — unlike
          // the mount-time bootstrap below, this always shows the "session
          // expired" redirect (decision #2), never a silent no-op.
          if (!refreshed) forceLogoutRedirect();
        });
      }, delayMs);
    },
    [clearRefreshTimer, forceLogoutRedirect],
  );

  const logout = useCallback(() => {
    clearSession();
    clearRefreshTimer();
    // Found 2026-08-01 while manually verifying Phase 4 (BUGS.md): without this, TanStack
    // Query's cache is a plain module-level singleton (`app/lib/query-client.ts`) that survives
    // a client-side logout/login untouched — signing in as a different account in the same tab
    // (no hard reload in between) rendered the *previous* account's cached list data (e.g.
    // Users) until the background refetch settled, rather than that account's own real state.
    // Clearing it here means every query starts genuinely fresh for whoever just signed in.
    queryClient.clear();
    // Best-effort: revokes the refresh-token cookie server-side. Even if
    // this fails (network down, etc.), the user is still logged out here —
    // the access token is already discarded and the UI moves on regardless.
    void authService.logout().catch(() => {});
    // Clearing user synchronously (flushSync) lets ProtectedRoute's own
    // reactive redirect run and settle *before* we navigate — otherwise the
    // two races and ProtectedRoute can win, turning a deliberate logout into
    // a `?next=...&expired=1` redirect meant only for forced session expiry.
    // Our explicit replace below always runs after, so it wins and leaves a
    // clean `/login` URL.
    flushSync(() => {
      setUser(null);
      setPermissions(null);
    });
    navigate("/login", { replace: true });
  }, [navigate, clearRefreshTimer]);

  useEffect(() => {
    configureApiClient({
      onUnauthorized: forceLogoutRedirect,
      onTokenRefreshed: (session) => {
        // Token/session storage itself lives in api-client.ts now (see its
        // own comment) — this callback only needs to sync React state.
        setUser(session.user as User);
        scheduleProactiveRefresh(session.expires_in);
        // Refetch the RBAC summary on *every* refresh, not just at login. A
        // role can be revoked mid-session and takes effect on the very next
        // request, so a stale cached summary shows nav items and buttons that
        // 403 the moment they're used — a real UX bug, not a theoretical one.
        // Deduped against the bootstrap effect below by loadPermissions.
        void loadPermissions().then((summary) => {
          if (!summary) forceLogoutRedirect();
        });
      },
    });
  }, [forceLogoutRedirect, scheduleProactiveRefresh, loadPermissions]);

  // Silent session recovery: the refresh-token cookie survives a hard
  // reload even though this in-memory access token doesn't. `ensureSessionBootstrap`
  // may already have been triggered — and resolved — by a protected route's
  // `clientLoader` before this component even mounted (see that function's
  // own comment); calling it again here just joins the same cached promise,
  // never a second network request. Success restores the session with no
  // login screen; failure (no cookie / a fresh visitor) is silent, not an
  // "expired" redirect, since there was never a session to lose here.
  useEffect(() => {
    let cancelled = false;
    void ensureSessionBootstrap()
      .then(async () => {
        if (cancelled) return;
        // Explicit re-check rather than relying solely on the
        // onTokenRefreshed callback above: if a clientLoader triggered (and
        // resolved) the bootstrap before this component mounted, that
        // callback wasn't registered yet when it fired, so this is the only
        // place that would otherwise pick up an already-recovered session.
        const session = getCurrentSession();
        if (!session) return;
        setUser(session.user as User);
        scheduleProactiveRefresh(session.expires_in);
        // Awaited inside the `.then`, so the `.finally` below (and therefore
        // isBootstrapping) waits for the summary too — ProtectedRoute must not
        // start gating on a null summary. In the common case this joins the
        // request onTokenRefreshed already started rather than issuing a
        // second one.
        const summary = await loadPermissions();
        if (!cancelled && !summary) forceLogoutRedirect();
      })
      .finally(() => {
        if (!cancelled) setIsBootstrapping(false);
      });
    return () => {
      cancelled = true;
    };
    // `loadPermissions` and `forceLogoutRedirect` are referentially stable for
    // the same reason, so adding them here doesn't re-run this effect.
    // `scheduleProactiveRefresh` is a referentially-stable useCallback (its
    // own deps chain bottoms out at useNavigate()'s stable identity), so in
    // practice this still only runs once per mount. configureApiClient above
    // is wired first in effect order, so onTokenRefreshed is already
    // registered by the time this fires (for the non-race case).
  }, [scheduleProactiveRefresh, loadPermissions, forceLogoutRedirect]);

  useEffect(() => clearRefreshTimer, [clearRefreshTimer]);

  const login = useCallback(
    async (response: LoginResponse): Promise<UserPermissionsSummary> => {
      // The token has to be in place before /role-assignments/me goes out —
      // it's an authenticated call, and api-client reads the token from module
      // state on every request.
      setSession(response);
      const summary = await loadPermissions();

      if (!summary) {
        // Decision #40: without the summary no screen can be gated, so the
        // session is unusable. Tear it back down rather than leaving a
        // half-authenticated shell. No redirect — the caller is the login
        // form, which surfaces this as its own error state; redirecting to
        // /login from /login would just discard the message.
        clearSession();
        clearRefreshTimer();
        setUser(null);
        setPermissions(null);
        throw new ApiError({
          success: false,
          statusCode: 0,
          code: "PERMISSIONS_LOAD_FAILED",
          message: "Signed in, but your roles couldn't be loaded. Please try again.",
        });
      }

      setUser(response.user);
      scheduleProactiveRefresh(response.expires_in);
      return summary;
    },
    [scheduleProactiveRefresh, loadPermissions, clearRefreshTimer],
  );

  const markPasswordChanged = useCallback(() => {
    setUser((current) =>
      current ? { ...current, mustChangePassword: false } : current,
    );
  }, []);

  return (
    <AuthContext.Provider
      value={{
        user,
        permissions,
        isBootstrapping,
        login,
        logout,
        markPasswordChanged,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

// eslint-disable-next-line react-refresh/only-export-components -- provider + hook live in one file, same established pattern as sidebar.tsx's SidebarProvider/useSidebar
export function useAuth(): AuthContextValue {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
}
