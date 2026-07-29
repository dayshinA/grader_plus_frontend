import { type RouteConfig, index, layout, route } from "@react-router/dev/routes";

export default [
  index("routes/home.tsx"),
  route("login", "routes/login.tsx"),
  route("unauthorized", "routes/unauthorized.tsx"),

  layout("routes/auth/require-auth.tsx", [
    route("change-password", "routes/change-password.tsx"),

    layout("routes/app-layout.tsx", [
      layout("routes/auth/require-coordinator.tsx", [
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
      layout("routes/auth/require-marker.tsx", [
        route("marker/projects", "routes/marker/projects.tsx"),
        route(
          "marker/projects/:studentId",
          "routes/marker/projects.$studentId.tsx",
        ),
      ]),
      layout("routes/auth/require-super-admin.tsx", [
        route("super-admin/users", "routes/super-admin/users.tsx"),
        route(
          "super-admin/users/bulk-import",
          "routes/super-admin/users.bulk-import.tsx",
        ),
        route("super-admin/schools", "routes/super-admin/schools.tsx"),
        route(
          "super-admin/school-admin-grants",
          "routes/super-admin/school-admin-grants.tsx",
        ),
        route(
          "super-admin/departments",
          "routes/super-admin/departments.tsx",
        ),
        route(
          "super-admin/department-admin-grants",
          "routes/super-admin/department-admin-grants.tsx",
        ),
        route("super-admin/modules", "routes/super-admin/modules.tsx"),
        route(
          "super-admin/module-grants",
          "routes/super-admin/module-grants.tsx",
        ),
      ]),
    ]),
  ]),

  route("dev/preview", "routes/dev/preview.tsx"),
] satisfies RouteConfig;
