# structure

- Backend module: `src/structure/` (StructureModule)
- API reference: `.claude/API-REFERENCE.md`, section "Structure"
- Design: `.claude/FRONTEND-DESIGN.md`, "Academic units", "Programmes and modules",
  "Offering settings"

The academic hierarchy: schools and their constituent units, plus programmes, modules and
offerings. Replaces the version 1 `schools`, `departments` and `academic-modules` folders,
which described a model that no longer exists.

## Screens

`/admin/units`, `/admin/units/:id`, `/admin/programmes`, `/admin/modules`,
`/units/:id/programmes`, `/units/:id/modules`, `/offerings/:id`.

## Routes

| Method | Path | Permission |
|---|---|---|
| GET | `/units` | `unit.read` |
| POST | `/units` | `unit.create` |
| PATCH | `/units/:id` | `unit.update` |
| GET | `/units/:id/programmes` | `programme.read` |
| POST | `/units/:id/programmes` | `programme.create` |
| PATCH | `/programmes/:id` | `programme.update` |
| GET | `/units/:id/modules` | `module.read` |
| POST | `/units/:id/modules` | `module.create` |
| PATCH | `/modules/:id` | `module.update` |
| GET | `/modules/:id/programmes` | `module.read` |
| PUT | `/modules/:id/programmes` | `module.update` |
| GET | `/modules/:id/offerings` | `offering.read` |
| POST | `/modules/:id/offerings` | `offering.create` |
| PATCH | `/offerings/:id` | `offering.update` |
| POST | `/offerings/:id/reopen` | `offering.reopen` |
| POST | `/units/:id/programmes/import` | `programme.create` |
| POST | `/units/:id/modules/import` | `module.create` |
| POST | `/units/:id/module-programmes/import` | `module.update` |
| POST | `/units/:id/offerings/rollover` | `offering.create` |

## Notes

Two levels maximum. A school is a root, a constituent unit has exactly one school parent,
and a third level is refused with 422. The create form must not offer one in the first
place, and the parent picker lists schools only.

`unitKind` is descriptive. Nothing branches on it.

Programmes and modules are siblings linked many to many, not parent and child.
`PUT /modules/:id/programmes` replaces the whole set, and an empty array unlinks
everything, so the UI must say so: it does not behave like a tag picker. A link whose two
sides answer to different schools is service teaching and system administrator only, so
mark those programmes unavailable with the reason rather than letting the save 403.

Deactivate rather than delete. Reopening a closed offering is a separate permission most
coordinators do not hold.

The four batch routes (2026-08-17) sit beside the manual dialogs, never instead of them,
and answer the shared import report from `app/types/import-report.ts` with the dryRun
preview flow. The programme and module imports are create only. The link import is
additive only: it adds links and never removes one, so it must not read as an alternative
to the full-set-replace editor in `module-programmes-dialog.tsx`. Rollover is a JSON form
on the unit page header, one row per active module, carrying threshold and marker cap
forward and never the deadline.

## Files in this folder

- `api/structure.service.ts`
- `api/use-offering-header.ts`
- `api/use-structure.ts`
- `api/use-unit-scope.ts`
- `components/module-form-dialog.tsx`
- `components/module-programmes-dialog.tsx`
- `components/modules-panel.tsx`
- `components/offering-form-dialog.tsx`
- `components/offering-layout.tsx`
- `components/offering-picker.tsx`
- `components/offering-rollover-dialog.tsx`
- `components/offering-settings-page.tsx`
- `components/offering-status-badge.tsx`
- `components/programme-form-dialog.tsx`
- `components/programmes-panel.tsx`
- `components/unit-form-dialog.tsx`
- `components/unit-layout.tsx`
- `components/unit-scope-picker.tsx`
- `components/units-page.tsx`
- `types.ts`
