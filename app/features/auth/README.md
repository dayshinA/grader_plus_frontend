# auth

- Backend module: `src/auth/` (AuthModule)
- API reference: `.claude/API-REFERENCE.md`, section "Auth"
- Design: `.claude/FRONTEND-DESIGN.md`, "Authentication and session"

Turning credentials into a session. Knows nothing about academic structure.

## Screens

`/login`, `/forgot-password`, `/reset-password`, and the forced change password screen.

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

`mustChangePassword` on the login response forces the change password screen before
anything else renders. After login and after every refresh, call `access` for permissions
and `users` for the person: identity does not come out of the token.
