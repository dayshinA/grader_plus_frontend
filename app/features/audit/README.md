# audit

- Backend module: `src/audit/` (AuditModule)
- API reference: `.claude/API-REFERENCE.md`, section "Audit"
- Design: `.claude/FRONTEND-DESIGN.md`, "Audit", "Unit structure and audit"

The append only log. New in version 2, no version 1 counterpart.

## Screens

`/admin/audit`, `/units/:id/audit`.

## Routes

| Method | Path | Permission |
|---|---|---|
| GET | `/admin/audit` | `audit.read` |
| GET | `/units/:id/audit` | `audit.read_scoped` |
| GET | `/offerings/:id/audit` | `audit.read_scoped` |

## Notes

Read only. There is no update route and no delete route, and they are absent rather than
permission gated, so do not build a row menu that implies one.

`/admin/audit` filters on `action`, `actor` and `limit`. That `limit` is the only paging
like parameter in the whole API and is not pagination.

## Files in this folder

- `api/audit.service.ts`
- `api/use-audit.ts`
- `components/audit-table.tsx`
- `types.ts`
