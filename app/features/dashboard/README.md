# dashboard

- Backend module: `src/dashboard/` (DashboardModule)
- API reference: `.claude/API-REFERENCE.md`, section "Dashboards"
- Design: `.claude/FRONTEND-DESIGN.md`, "Home", "Unit dashboard", "Progress dashboard",
  "Platform overview"

Read only aggregates, plus the role aware home screen.

## Screens

`/` (home), `/offerings/:id/dashboard`, `/units/:id/dashboard`, `/admin/overview`.

## Routes

| Method | Path | Permission |
|---|---|---|
| GET | `/me/home` | authenticated |
| GET | `/offerings/:id/dashboard` | `dashboard.read` |
| GET | `/units/:id/dashboard` | `dashboard.read` |
| GET | `/admin/overview` | `platform.read` |

## Must never render

Any total, for anybody, including the caller's own. There is no score column in any query
behind these routes, and the screen must not acquire one by fetching grades alongside and
joining them.

## Notes

Progress is states and timing: not started, in draft, submitted, and when. A unit dashboard
shows that a case exists and how far apart the marks are, never the markers' reasoning and
never individual scores.

`/me/home` is already shaped per caller, so the screen renders what it is given rather than
deciding what to ask for. A person with no roles yet sees an explanation, not a broken
dashboard.

The application shell and navigation live here too, built from the caller's permission set.

## Files in this folder

- `api/dashboard.service.ts`
- `api/use-dashboard.ts`
- `components/admin-overview-page.tsx`
- `components/app-shell.tsx`
- `components/app-sidebar.tsx`
- `components/home-page.tsx`
- `components/offering-dashboard-page.tsx`
- `components/unit-dashboard-page.tsx`
- `nav.ts`
- `types.ts`
