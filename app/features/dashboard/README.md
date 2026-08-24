# dashboard

- Backend module: `src/dashboard/` (DashboardModule)

Read only aggregates, plus the role aware home screen.

## Screens

`/` (role-aware home or landing redirect), `/offerings/:id/dashboard`,
`/units/:id/dashboard`. A caller with only marking, administered units or coordinated
offerings skips Home and goes straight to that existing surface. Their sidebar begins with
"Marking", "My unit(s)" or "My offering(s)". A caller with work across surfaces retains
Home. The platform overview merged into home on 2026-08-18:
`/admin/overview` redirects to `/` and has no sidebar entry.

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

The one landing exception is a caller with exactly one useful kind of work. Marking-only
callers go to `/marking`. There is no cross-scope picker route, so the root and sidebar use
the same stable order for scoped entries: administered units alphabetically; coordinated
offerings by newest academic year, then module code. Every entry remains in "My units" or
"My offerings". Empty, mixed and platform cases keep Home so the frontend never invents
or hides a destination.

Home enriches its cards with calls the caller could already make: the marking queue when
they hold `marking.work`, the offering and unit dashboards for the cards it shows (on the
same query keys as the full pages, so clicking through lands on a warm cache), unread
notifications for everyone, and for a system administrator the whole platform surface:
overview tiles and meters plus the newest accounts, the schools and the newest modules
(`platform-home.tsx`, fetching `/users`, `/units` and `/units/:id/modules` per unit).
Each enrichment degrades to the base card on failure; only `/me/home` itself can error
the screen.

The application shell and navigation live here too, built from the caller's permission set.

## Files in this folder

- `api/dashboard.service.ts`
- `api/use-dashboard.ts`
- `components/app-shell.tsx`
- `components/app-sidebar.tsx`
- `components/home-page.tsx`
- `components/platform-home.tsx`
- `components/offering-dashboard-page.tsx`
- `components/unit-dashboard-page.tsx`
- `nav.ts`
- `types.ts`
