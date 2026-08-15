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
  ]),
] satisfies RouteConfig;
