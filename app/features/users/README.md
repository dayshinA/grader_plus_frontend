# users

- Backend module: `src/users/` (UsersModule)
- API reference: `.claude/API-REFERENCE.md`, section "Users"
- Design: `.claude/FRONTEND-DESIGN.md`, "Accounts and roles", "Account"

Accounts, and the caller's own profile.

## Screens

`/admin/users`, `/admin/users/:id`, `/account`.

## Routes

| Method | Path | Permission |
|---|---|---|
| GET | `/me` | authenticated |
| PATCH | `/me` | authenticated |
| GET | `/users` | `user.read` |
| POST | `/users` | `user.create` |
| GET | `/users/:id` | `user.read` |
| PATCH | `/users/:id` | `user.update` |
| POST | `/users/:id/deactivate` | `user.deactivate` |
| POST | `/users/bulk-import` | `user.create` |

## Notes

Deactivation, never deletion, so a user who has marked anything stays readable. Do not
build a delete affordance.

`GET /users` returns a scoped view: what comes back depends on the caller's roles, so an
empty directory is a legitimate answer and not an error.

How much per row detail bulk import shows is an open question in `FRONTEND-DESIGN.md`.
