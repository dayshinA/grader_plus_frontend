import { type RouteConfig, index, layout, prefix, route } from "@react-router/dev/routes";

/**
 * The version 2 route map, from `.claude/FRONTEND-DESIGN.md`. A route group is a permission
 * check rather than a role check: somebody holding coordinator on one offering and marker
 * on another reaches both `/offerings/...` and `/marking`, which is the normal case.
 */
export default [
  route("login", "routes/login.tsx"),
  route("forgot-password", "routes/forgot-password.tsx"),
  route("reset-password", "routes/reset-password.tsx"),

  // The component gallery, which is a style guide rather than a real screen.
  route("dev/preview", "routes/dev/preview.tsx"),

  layout("routes/protected.tsx", [
    index("routes/home.tsx"),

    ...prefix("account", [
      index("routes/account/index.tsx"),
      route("notifications", "routes/account/notifications.tsx"),
      route("password", "routes/account/password.tsx"),
    ]),

    ...prefix("admin", [
      route("units", "routes/admin/units.tsx"),
      route("programmes", "routes/admin/programmes.tsx"),
      route("modules", "routes/admin/modules.tsx"),
      route("users", "routes/admin/users.tsx"),
      route("users/:userId", "routes/admin/user-detail.tsx"),
      route("overview", "routes/admin/overview.tsx"),
      route("audit", "routes/admin/audit.tsx"),
    ]),

    ...prefix("marking", [
      index("routes/marking/index.tsx"),
      route(":projectId", "routes/marking/workspace.tsx"),
    ]),

    // The coordinator surface is one frame with tabs inside it, in the order the work
    // actually happens: intake and the rubric before assignments, grades and export last.
    route("offerings/:offeringId", "routes/offerings/layout.tsx", [
      index("routes/offerings/settings.tsx"),
      route("intake", "routes/offerings/intake.tsx"),
      route("rubric", "routes/offerings/rubric.tsx"),
      route("assignments", "routes/offerings/assignments.tsx"),
      route("dashboard", "routes/offerings/dashboard.tsx"),
      route("audit", "routes/offerings/audit.tsx"),
    ]),

    // The unit surface is one frame with tabs inside it, so the layout owns the header
    // and each tab is only its own content.
    route("units/:unitId", "routes/units/layout.tsx", [
      route("dashboard", "routes/units/dashboard.tsx"),
      route("programmes", "routes/units/programmes.tsx"),
      route("modules", "routes/units/modules.tsx"),
      route("audit", "routes/units/audit.tsx"),
    ]),
  ]),
] satisfies RouteConfig;
