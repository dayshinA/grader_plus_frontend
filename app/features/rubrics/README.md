# rubrics

- Backend module: `src/rubrics/` (RubricsModule)

One rubric per offering, written as a whole document.

## Screens

`/offerings/:id/rubric`. The read side also feeds the marking workspace form.

## Routes

| Method | Path | Permission |
|---|---|---|
| GET | `/offerings/:id/rubric` | `rubric.read` |
| PUT | `/offerings/:id/rubric` | `rubric.write` |
| GET | `/offerings/:id/rubric/validate` | `rubric.read` |
| POST | `/offerings/:id/rubric/copy-from/:sourceId` | `rubric.write` |

## Notes

The editor holds the full set and PUTs it. There is no per criterion endpoint.

Weightings are percentages totalling 100. Show the running total live and validate before
allowing a save, because 33.33 three times is 99.99 and is genuinely invalid.

Once any evaluation exists in the offering, structural edits are refused: no adding,
removing or reweighting. Wording stays editable. The editor must reflect that, because
changing a weighting mid marking moves totals under markers who have already submitted.

## Files in this folder

- `api/rubrics.service.ts`
- `api/use-rubrics.ts`
- `components/rubric-editor.tsx`
- `components/rubric-page.tsx`
- `types.ts`
