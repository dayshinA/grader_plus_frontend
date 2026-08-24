# intake

- Backend module: `src/intake/` (IntakeModule)

The Learn archive walk, students, projects and submitted files. Replaces the version 1
`submissions` folder.

## Screens

`/offerings/:id/intake`, plus the signed URL fetch the marking workspace document pane
depends on.

## Routes

| Method | Path | Permission |
|---|---|---|
| POST | `/offerings/:id/intake` | `intake.upload` |
| GET | `/offerings/:id/intake/report/:jobId` | `intake.upload` |
| GET | `/offerings/:id/projects` | `project.read` |
| POST | `/offerings/:id/projects` | `project.create` |
| GET | `/projects/:id` | `project.read` |
| PATCH | `/projects/:id` | `project.update` |
| DELETE | `/projects/:id` | `project.delete` |
| POST | `/projects/:id/exclude` | `project.exclude` |
| DELETE | `/projects/:id/exclude` | `project.exclude` |
| GET | `/projects/:id/submissions` | `submission.read` |
| POST | `/projects/:id/submissions` | `submission.upload` |
| DELETE | `/submissions/:id` | `submission.delete` |
| GET | `/submissions/:id/url` | `submission.read` |

## Notes

The report is a working screen, not a summary: every folder that failed is listed
individually with its reason and never guessed at. Manual project creation covers the gaps.

The upload is one request and a large archive can time out. Show real progress and a clear
failure, not a spinner that ends in silence.

Exclusion needs a reason of at least five characters and stays on the record. It says a
student's work can never be graded, so confirm it properly.

Signed URLs are short lived. Fetch one when a file is opened, not when the screen loads,
and refetch on expiry rather than holding it in state.

## Files in this folder

- `api/intake.service.ts`
- `api/use-intake.ts`
- `components/archive-upload-card.tsx`
- `components/exclude-project-dialog.tsx`
- `components/intake-page.tsx`
- `components/project-files-dialog.tsx`
- `components/project-form-dialog.tsx`
- `types.ts`
