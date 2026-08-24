# assignments

- Backend module: `src/assignments/` (AssignmentsModule)

Who marks what. Replaces the version 1 `marker-assignments` folder.

## Screens

`/offerings/:id/assignments`, a matrix of projects against markers.

## Routes

| Method | Path | Permission |
|---|---|---|
| GET | `/offerings/:id/assignments` | `assignment.read` |
| POST | `/offerings/:id/assignments` | `assignment.write` |
| POST | `/offerings/:id/assignments/auto` | `assignment.write` |
| POST | `/offerings/:id/assignments/import` | `assignment.write` |
| GET | `/offerings/:id/assignments/coverage` | `assignment.read` |
| GET | `/offerings/:id/markers` | `assignment.read` |
| PATCH | `/assignments/:id` | `assignment.write` |
| DELETE | `/assignments/:id` | `assignment.write` |
| POST | `/offerings/:id/open-marking` | `offering.update` |

## Notes

Two markers minimum, five maximum. One first marker, one second marker and one moderator at
most; `additional_marker` is the unconstrained value for a fourth or fifth opinion.
Moderator is a value here, not a role, and it marks blind like any other.

Coverage says which projects are short and gates opening marking. Surface it as a checklist
rather than letting the open action fail.

The coordinator cannot assign themselves. The server refuses it and the picker should not
offer them.

This screen names markers, and that is correct. Blindness is between markers, not between a
coordinator and their own allocation.

The "Import eligible markers" button on this screen belongs to the access feature: the
route is `POST /offerings/:id/marker-roles/import` (`role.grant`) and the dialog, service
and hook live in `app/features/access/`. It feeds the eligible list behind
`GET /offerings/:id/markers`.

## Files in this folder

- `api/assignments.service.ts`
- `api/use-assignments.ts`
- `components/assign-marker-dialog.tsx`
- `components/assignments-page.tsx`
- `components/auto-assign-dialog.tsx`
- `components/coverage-card.tsx`
- `types.ts`
