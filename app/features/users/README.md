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

The user detail page keeps identity, account status and deactivation in its header. Account
facts and role grants stack in reading order on smaller screens, then use a compact account
column beside a wider roles column on wide screens. Editing stays inside the account card.

`GET /users` returns a scoped view: what comes back depends on the caller's roles, so an
empty directory is a legitimate answer and not an error.

Bulk import (contract of 2026-08-17): file columns are `email`, `full_name`, `role` and
the scope columns that role uses, named by what a person has in front of them
(`school_code`, `unit_name`, `module_code`, `academic_year`), never UUIDs. The response is
`{ report, createdUsers }` on the shared import report shape in
`app/types/import-report.ts`. This route has no dryRun yet, so the dialog uploads
directly with no preview step, unlike the other importers.

## Files in this folder

- `api/use-users.ts`
- `api/users.service.ts`
- `components/account-page.tsx`
- `components/bulk-import-dialog.tsx`
- `components/create-user-dialog.tsx`
- `components/user-detail-page.tsx`
- `components/users-page.tsx`
- `types.ts`
