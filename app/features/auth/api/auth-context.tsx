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
  configureApiClient,
  refreshSession as apiRefreshSession,
} from "~/lib/api-client";
import { authService } from "~/features/auth/api/auth.service";
import type { LoginResponse, User } from "~/features/auth/types";

/** How long before expires_in to proactively refresh, and the floor if expires_in is already tiny. */
const REFRESH_BUFFER_SECONDS = 60;
const MIN_REFRESH_DELAY_MS = 5_000;

interface AuthContextValue {
  user: User | null;
  /** True until the mount-time silent-refresh attempt (session recovery across a hard reload) settles. */
  isBootstrapping: boolean;
  login: (response: LoginResponse) => void;
  logout: () => void;
  markPasswordChanged: () => void;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [isBootstrapping, setIsBootstrapping] = useState(true);
  const tokenRef = useRef<string | null>(null);
  const refreshTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const navigate = useNavigate();

  const clearRefreshTimer = useCallback(() => {
    if (refreshTimerRef.current) {
      clearTimeout(refreshTimerRef.current);
      refreshTimerRef.current = null;
    }
  }, []);

  const forceLogoutRedirect = useCallback(() => {
    tokenRef.current = null;
    clearRefreshTimer();
    const next = encodeURIComponent(
      window.location.pathname + window.location.search,
    );
    flushSync(() => setUser(null));
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
    tokenRef.current = null;
    clearRefreshTimer();
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
    flushSync(() => setUser(null));
    navigate("/login", { replace: true });
  }, [navigate, clearRefreshTimer]);

  useEffect(() => {
    configureApiClient({
      getToken: () => tokenRef.current,
      onUnauthorized: forceLogoutRedirect,
      onTokenRefreshed: (session) => {
        tokenRef.current = session.access_token;
        setUser(session.user as User);
        scheduleProactiveRefresh(session.expires_in);
      },
    });
  }, [forceLogoutRedirect, scheduleProactiveRefresh]);

  // Silent session recovery: the refresh-token cookie survives a hard
  // reload even though this in-memory access token doesn't. Try once on
  // mount, before any protected route renders (see ProtectedRoute's
  // isBootstrapping gate) — success restores the session with no login
  // screen; failure (no cookie / a fresh visitor) is silent, not an
  // "expired" redirect, since there was never a session to lose here.
  useEffect(() => {
    let cancelled = false;
    void apiRefreshSession().finally(() => {
      if (!cancelled) setIsBootstrapping(false);
    });
    return () => {
      cancelled = true;
    };
    // Runs once on mount only — configureApiClient above is wired first in
    // effect order, so onTokenRefreshed is already registered by the time
    // this fires.
  }, []);

  useEffect(() => clearRefreshTimer, [clearRefreshTimer]);

  const login = useCallback(
    (response: LoginResponse) => {
      tokenRef.current = response.access_token;
      setUser(response.user);
      scheduleProactiveRefresh(response.expires_in);
    },
    [scheduleProactiveRefresh],
  );

  const markPasswordChanged = useCallback(() => {
    setUser((current) =>
      current ? { ...current, mustChangePassword: false } : current,
    );
  }, []);

  return (
    <AuthContext.Provider
      value={{ user, isBootstrapping, login, logout, markPasswordChanged }}
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
