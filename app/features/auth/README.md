# auth

- Backend module: `src/auth/` (AuthModule)
- API reference: `.claude/API-REFERENCE.md`, section "Auth"
- Design: `.claude/FRONTEND-DESIGN.md`, "Authentication and session"

Turning credentials into a session. Knows nothing about academic structure.

## Screens

`/login`, `/forgot-password`, `/reset-password`, and `/set-password`, the forced screen a
temporary password lands on. The voluntary change lives on `/account/password` and uses the
same form.

## Routes

| Method | Path | Permission |
|---|---|---|
| POST | `/auth/login` | public |
| POST | `/auth/refresh` | public |
| POST | `/auth/logout` | public |
| POST | `/auth/forgot-password` | public |
| POST | `/auth/reset-password` | public |
| POST | `/auth/change-password` | authenticated |

## Notes

The access token lives 15 minutes in memory, never in storage, and carries a user id and
nothing else. Refresh is an httpOnly cookie this code never reads.

The single flight refresh belongs here or in `lib/api-client.ts`, and nowhere else.
Concurrent 401s must share one refresh or the backend revokes the chain as a replay.

An interrupted session keeps the current protected URL so the same person can return after
signing in again. The redirect state carries the interrupted account's user id, and the
login form resumes the route only when the same account signs back in. A deliberate sign
out clears that return state entirely. Either way a different account starts at home, where
its own permissions determine what it can open. `ProtectedRoute` is the only place that
navigates on session loss: `signOut` and the 401 handler just clear state and record
whether the loss was deliberate, so two redirects never race for the same transition.

`mustChangePassword` on the login response forces `/set-password` before anything else
renders. That screen is authenticated but sits outside the app shell, since every link a
sidebar would offer bounces straight back to it. Changing a password revokes every refresh
token, so the forced path signs back in with the password just set and lands on home,
rather than asking for a second sign in on a first visit. The voluntary change on
`/account/password` still signs out. After login and after every refresh, call `access` for permissions
and `users` for the person: identity does not come out of the token.

## Files in this folder

- `api/auth-context.ts`
- `api/auth-provider.tsx`
- `api/auth.service.ts`
- `api/use-auth.ts`
- `components/auth-shell.tsx`
- `components/change-password-form.tsx`
- `components/forgot-password-form.tsx`
- `components/login-form.tsx`
- `components/protected-route.tsx`
- `components/reset-password-form.tsx`
- `components/set-password-page.tsx`
- `types.ts`
