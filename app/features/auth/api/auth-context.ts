import { createContext, useContext } from "react";

import type { Permission, ResolvedGrant } from "~/features/access/types";
import type { AuthStatus } from "~/features/auth/types";
import type { SessionResponse } from "~/lib/api-client";
import type { User } from "~/features/users/types";

export const LOGIN_PATH = "/login";
/** The forced screen a temporary password gets, outside the shell. */
export const SET_PASSWORD_PATH = "/set-password";

export interface AuthContextValue {
  /** From GET /me. Identity does not come out of the token. */
  user: User | null;
  /** What login or refresh returned, which is where mustChangePassword arrives. */
  session: SessionResponse["user"] | null;
  /** From GET /me/permissions. Every gate in the app reads this and never a role name. */
  grants: ResolvedGrant[];
  status: AuthStatus;
  // Why the last session ended and whose it was, so only its owner resumes the destination.
  sessionEnd: { deliberate: boolean; userId: string } | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  /** The session exists but /me or /me/permissions has not answered yet. */
  isResolvingIdentity: boolean;
  /** A failed permissions call is fatal to the session, so it surfaces rather than hides. */
  identityError: unknown;
  mustChangePassword: boolean;
  can: (permission: Permission) => boolean;
  canAny: (permissions: Permission[]) => boolean;
  signIn: (session: SessionResponse) => void;
  signOut: () => void;
}

export const AuthContext = createContext<AuthContextValue | null>(null);

export function useAuth(): AuthContextValue {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used inside <AuthProvider>, which root.tsx composes.");
  }
  return context;
}

/** Gates one action on one permission. Ignores scope, so the request can still 403. */
export function usePermission(permission: Permission): boolean {
  return useAuth().can(permission);
}
