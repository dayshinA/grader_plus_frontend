import { type RouteConfig, index, route } from "@react-router/dev/routes";

export default [
  index("routes/home.tsx"),
  route("dev/button-preview", "routes/dev/button-preview.tsx"),
  route("dev/input-preview", "routes/dev/input-preview.tsx"),
  route("dev/loader-one-preview", "routes/dev/loader-one-preview.tsx"),
  route("dev/dropdown-menu-preview", "routes/dev/dropdown-menu-preview.tsx"),
] satisfies RouteConfig;
