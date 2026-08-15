# notifications

- Backend module: `src/notifications/` (NotificationsModule)
- API reference: `.claude/API-REFERENCE.md`, section "Notifications"
- Design: `.claude/FRONTEND-DESIGN.md`, "Notifications"

The caller's own notifications. New in version 2, no version 1 counterpart.

## Screens

`/account/notifications`, plus whatever unread indicator the shell carries.

## Routes

| Method | Path | Permission |
|---|---|---|
| GET | `/me/notifications` | authenticated |
| POST | `/me/notifications/:id/read` | authenticated |

## Notes

Payloads are already blindness safe: no other marker's name, no marks. Render the message
as given. Do not enrich a notification by fetching the project it mentions and showing
marks alongside it.

A discrepancy notification goes to the coordinator only. A marker never learns a case
exists, so nothing here may hint at one.
