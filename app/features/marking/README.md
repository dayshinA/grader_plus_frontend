# marking

- Backend module: `src/marking/` (MarkingModule)
- API reference: `.claude/API-REFERENCE.md`, section "Marking"
- Design: `.claude/FRONTEND-DESIGN.md`, "Marker surface"

The blind marking surface. This is version 1's `grading` folder renamed, and the name
matters: in version 2 `grading` means discrepancies and final grades, not the workspace.

## Screens

`/marking` (queue) and `/marking/:projectId` (workspace).

## Routes

| Method | Path | Permission |
|---|---|---|
| GET | `/me/marking-queue` | authenticated |
| GET | `/marking/projects/:id` | `marking.work` |
| PUT | `/marking/projects/:id/scores` | `marking.work` |
| PUT | `/marking/projects/:id/feedback` | `marking.work` |
| POST | `/marking/projects/:id/submit` | `marking.work` |
| GET | `/marking/submissions/:id/annotations` | `marking.work` |
| POST | `/marking/submissions/:id/annotations` | `marking.work` |
| PATCH | `/annotations/:id` | `marking.work` |
| DELETE | `/annotations/:id` | `marking.work` |

## Must never render

Another marker, their total, their feedback, their annotations, the number of markers on
the project, any discrepancy or moderation state, any spread, any hint that a project is
contested.

**No request here carries a marker identity.** There is no `markerId` field anywhere.
Which marker is always the token, and sending one gets a 422 rather than being ignored.

## Notes

Autosave is debounced, and every score save recomputes the total server side, so the
displayed total comes from the response. Two implementations of one formula is two answers.

Submitting is a deliberate act, separate from the last autosave, and is refused while any
criterion is unscored. The 422 names which, so map it onto the form.

Editing after submitting is allowed. It silently re-runs comparison and the response says
nothing about the outcome. Infer nothing from timing, status codes or latency, and show no
"this changed the outcome" hint. There is nothing to show.

Annotations are pins on the caller's own evaluation, PDF only. A Word file is download
only. Say that plainly rather than offering an annotator that misbehaves.

A closed offering returns 403 on write, which must read as "this offering is closed".
Autosave failing must be visible and must not lose the form.
