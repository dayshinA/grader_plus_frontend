# access

- Backend module: `src/access/` (AccessModule)
- API reference: `.claude/API-REFERENCE.md`, section "Access"
- Design: `.claude/FRONTEND-DESIGN.md`, "Ground rules", "Accounts and roles"

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

## Notes

`GET /me/permissions` is the only answer to "what can this person do". Never branch on a
role name, never decode the token. A component containing `if (role === "coordinator")` is
a bug: one person holds several roles at once and capability is the union of them.

The permission set is a coarse gate that ignores scope, so a 403 on the real request is
normal even when the button rendered. Handle it, do not prevent it.

A grant is `(role, scope)` and the scope picker changes shape with the role: system takes
no scope, unit admin takes an academic unit, coordinator and marker take an offering.
Grants are revoked, never deleted, and a revoked grant stays visible in history.

## Files in this folder

- `api/access.service.ts`
- `api/use-access.ts`
- `components/role-grants-card.tsx`
- `components/scope-picker.tsx`
- `permissions.ts`
- `types.ts`
