import type { Config } from "@react-router/dev/config";

export default {
  // SPA mode, not SSR. The backend issues a bearer JWT held in memory
  // client-side only (no cookie, no server session) — a server-rendered
  // loader has no way to authenticate a protected route, since the token
  // never leaves the browser's JS runtime. See SYSTEM_DESIGN.md decision #1.
  ssr: false,
} satisfies Config;
