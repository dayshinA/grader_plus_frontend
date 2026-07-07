import type { Role } from "~/features/auth/types";

/** Where an authenticated user of each role lands by default (post-login, or on a bare `/`). */
export function roleLandingPath(role: Role): string {
  switch (role) {
    case "coordinator":
      return "/coordinator/dashboard";
    case "marker":
      return "/marker/projects";
    case "super_admin":
      return "/super-admin/users";
  }
}
