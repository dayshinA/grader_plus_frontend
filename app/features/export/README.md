# export

- Backend module: `src/export/` (ExportModule)

Reads `final_grades` and nothing else.

## Screens

`/offerings/:id/export`.

## Routes

| Method | Path | Permission |
|---|---|---|
| GET | `/offerings/:id/export/preview` | `export.run` |
| GET | `/offerings/:id/export/grades` | `export.run` |
| GET | `/offerings/:id/export/feedback` | `export.run` |
| GET | `/projects/:id/export/feedback` | `export.run` |

## Notes

Always show the preview first. It names every gap with its reason, which makes an
incomplete export a decision rather than a discovery a week later.

The two download routes return raw files with no envelope. Handle them as downloads, not as
JSON, and do not run them through the interceptor that unwraps `data`.

## Files in this folder

- `api/export.service.ts`
- `api/use-export.ts`
- `components/export-page.tsx`
- `types.ts`
