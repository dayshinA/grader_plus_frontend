import { type RouteConfig, index, layout, route } from "@react-router/dev/routes";

export default [
  index("routes/home.tsx"),
  route("login", "routes/login.tsx"),
  route("unauthorized", "routes/unauthorized.tsx"),

  layout("routes/auth/require-auth.tsx", [
    route("change-password", "routes/change-password.tsx"),

    // The three URL prefixes below are section names, not role claims
    // (SYSTEM_DESIGN.md decision #39). A user holds several role templates at
    // once now, so each group is gated on holding a relevant *permission*
    // anywhere rather than on being one role — see each wrapper's own comment.
    layout("routes/app-layout.tsx", [
      layout("routes/auth/require-workspace.tsx", [
        route("workspace/dashboard", "routes/workspace/dashboard.tsx"),
        route(
          "workspace/module-settings",
          "routes/workspace/module-settings.tsx",
        ),
        route(
          "workspace/school-settings",
          "routes/workspace/school-settings.tsx",
        ),
        route("workspace/submissions", "routes/workspace/submissions.tsx"),
        route(
          "workspace/marker-assignments",
          "routes/workspace/marker-assignments.tsx",
        ),
        route("workspace/rubrics", "routes/workspace/rubrics.tsx"),
        route(
          "workspace/discrepancies",
          "routes/workspace/discrepancies.tsx",
        ),
        // Replaced `workspace/export` on 2026-08-10. `grades.view` and `grades.export` are two
        // surfaces over the same `final_grades` data (in-app table vs Learn-format CSV), so
        // they're one screen with the download gated inside it — the same one-screen-two-
        // altitudes call as Modules/Module Settings, minus the need for a nav `excludes` pair,
        // since a Coordinator holds both keys and should see the one entry.
        route("workspace/grades", "routes/workspace/grades.tsx"),
      ]),
      layout("routes/auth/require-marking.tsx", [
        route("marker/projects", "routes/marker/projects.tsx"),
        route(
          "marker/projects/:studentId",
          "routes/marker/projects.$studentId.tsx",
        ),
      ]),
      layout("routes/auth/require-admin.tsx", [
        route("super-admin/users", "routes/super-admin/users.tsx"),
        route("super-admin/users/new", "routes/super-admin/users.new.tsx"),
        route(
          "super-admin/users/:userId",
          "routes/super-admin/users.$userId.tsx",
        ),
        route(
          "super-admin/users/:userId/edit",
          "routes/super-admin/users.$userId.edit.tsx",
        ),
        route(
          "super-admin/users/bulk-import",
          "routes/super-admin/users.bulk-import.tsx",
        ),
        route("super-admin/schools", "routes/super-admin/schools.tsx"),
        route(
          "super-admin/departments",
          "routes/super-admin/departments.tsx",
        ),
        route("super-admin/modules", "routes/super-admin/modules.tsx"),
        // One delegation screen replacing the three grant routes deleted in
        // CH-06/07/08 (school-admin-grants, department-admin-grants,
        // module-grants), whose twelve backend endpoints no longer exist.
        // Reachable by anyone holding `roles.assign` — not only Super Admins —
        // so despite the prefix this is not a Super-Admin-only screen
        // (decision #39: the prefixes are section names, not role claims).
        // Supports `?userId=` for deep-linking from a user row (decision #41).
        route(
          "super-admin/role-assignments",
          "routes/super-admin/role-assignments.tsx",
        ),
        // The extras layer of one assignment, as a page rather than the modal it
        // was until 2026-08-10 (same conversion UserFormDialog got on 2026-08-04).
        // Needs `?userId=` — there is no GET /role-assignments/:id, so the
        // assignment is found by id in that user's list.
        route(
          "super-admin/role-assignments/:assignmentId/extras",
          "routes/super-admin/role-assignments.$assignmentId.extras.tsx",
        ),
      ]),
    ]),
  ]),

  route("dev/preview", "routes/dev/preview.tsx"),
] satisfies RouteConfig;
