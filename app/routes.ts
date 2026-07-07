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
      ]),
      layout("routes/auth/require-marker.tsx", [
        route("marker/projects", "routes/marker/projects.tsx"),
      ]),
      layout("routes/auth/require-super-admin.tsx", [
        route("super-admin/users", "routes/super-admin/users.tsx"),
      ]),
    ]),
  ]),

  route("dev/preview", "routes/dev/preview.tsx"),
] satisfies RouteConfig;
