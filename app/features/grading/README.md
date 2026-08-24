# grading

- Backend module: `src/grading/` (GradingModule)

Discrepancy cases and final grades. **Not the marking workspace**: version 1 used this name
for the marker's evaluation screen, which is now `marking/`. Replaces the version 1
`discrepancy` folder.

## Screens

`/offerings/:id/discrepancies`, `/offerings/:id/grades`, and the close action on
`/offerings/:id`.

## Routes

| Method | Path | Permission |
|---|---|---|
| GET | `/offerings/:id/discrepancies` | `discrepancy.read` |
| GET | `/discrepancies/:id` | `discrepancy.resolve` |
| POST | `/discrepancies/:id/resolve` | `discrepancy.resolve` |
| GET | `/offerings/:id/grades` | `grade.read` |
| GET | `/projects/:id/grade` | `grade.read` |
| POST | `/projects/:id/grade/override` | `grade.override` |
| POST | `/offerings/:id/close` | `offering.close` |

## Notes

Discrepancy resolution is the one screen where both markers' work appears side by side,
reachable only by the coordinator and only once a case exists. It is the single legitimate
crossing point in the whole app.

Resolution is accepting the calculated average or overriding it with a required reason. A
case never resolves itself, so there is no automatic path off the screen. Marks can still
change while a case is open, so refetch rather than caching hard.

Markers brought in during moderation mark blind and cannot resolve the case they were added
for.

Grades come from `final_grades` and never from evaluations. A project with an open case has
no grade yet and appears as such. The override is for a marker becoming permanently
unavailable, not a way to settle an ordinary disagreement, so word it that way and require
the reason.

Closing is the freeze. Warn plainly that writes are refused afterwards.

## Files in this folder

- `api/grading.service.ts`
- `api/use-grading.ts`
- `components/discrepancies-page.tsx`
- `components/discrepancy-detail-page.tsx`
- `components/grades-page.tsx`
- `components/override-grade-dialog.tsx`
- `types.ts`
