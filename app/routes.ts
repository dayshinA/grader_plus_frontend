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
        route("coordinator/dashboard", "routes/coordinator/dashboard.tsx"),
        route(
          "coordinator/module-settings",
          "routes/coordinator/module-settings.tsx",
        ),
        route(
          "coordinator/school-settings",
          "routes/coordinator/school-settings.tsx",
        ),
        route("coordinator/submissions", "routes/coordinator/submissions.tsx"),
        route(
          "coordinator/marker-assignments",
          "routes/coordinator/marker-assignments.tsx",
        ),
        route("coordinator/rubrics", "routes/coordinator/rubrics.tsx"),
        route(
          "coordinator/discrepancies",
          "routes/coordinator/discrepancies.tsx",
        ),
        route("coordinator/export", "routes/coordinator/export.tsx"),
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
      ]),
    ]),
  ]),

  route("dev/preview", "routes/dev/preview.tsx"),
] satisfies RouteConfig;
