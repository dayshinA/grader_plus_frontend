import { type RouteConfig, index, route } from "@react-router/dev/routes";

// Version 2 rebuild. The version 1 tree is archived at .claude/version_1/app/routes.ts
// and shares no prefix with the route map in .claude/FRONTEND-DESIGN.md, so it was not
// carried across. Routes come back one surface at a time as each feature ships.
export default [
  index("routes/home.tsx"),
  route("dev/preview", "routes/dev/preview.tsx"),
] satisfies RouteConfig;
