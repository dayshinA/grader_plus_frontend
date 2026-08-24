# access

- Backend module: `src/access/` (AccessModule)

Role grants, and what the caller currently holds. This is what the whole UI renders from.

## Screens

The role grant panel inside `/admin/users/:id`. Everything else consumes this feature
rather than showing a screen of its own.

## Routes

| Method | Path | Permission |
|---|---|---|
| GET | `/me/permissions` | authenticated |
| GET | `/users/:id/roles` | `role.read` |
| POST | `/users/:id/roles` | `role.grant` |
| DELETE | `/roles/:id` | `role.revoke` |
| POST | `/offerings/:id/marker-roles/import` | `role.grant` |

## Notes

`GET /me/permissions` is the only answer to "what can this person do". Never branch on a
role name, never decode the token. A component containing `if (role === "coordinator")` is
a bug: one person holds several roles at once and capability is the union of them.

The permission set is a coarse gate that ignores scope, so a 403 on the real request is
normal even when the button rendered. Handle it, do not prevent it.

A grant is `(role, scope)` and the scope picker changes shape with the role: system takes
no scope, unit admin takes an academic unit, coordinator and marker take an offering.
Grants are revoked, never deleted, and a revoked grant stays visible in history.

`POST /users/:id/roles` refuses a deactivated target with 409 `USER_INACTIVE`, so the
grants card takes the button away with the reason when the loaded account is inactive and
keeps the 409 path as the backstop.

The marker eligibility import grants marker on the offering in the path from a one-column
file of emails, with the shared dryRun preview. Its dialog is opened from the assignment
screen, which is where the eligible list renders, but the service and hook live here
because the route belongs to AccessModule. Eligibility is not assignment: the
two-to-five rule applies at assignment time. Since 2026-08-17 a coordinator may grant
Marker to an existing account on their own offering (never themselves), so no copy should
send them to a unit admin for that.

## Files in this folder

- `api/access.service.ts`
- `api/use-access.ts`
- `components/marker-eligibility-import-dialog.tsx`
- `components/role-grants-card.tsx`
- `components/scope-picker.tsx`
- `permissions.ts`
- `types.ts`
