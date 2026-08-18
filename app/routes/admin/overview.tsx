import { redirect } from "react-router";

/**
 * The platform overview merged into home on 2026-08-18: a system administrator's home is
 * the overview now. The path stays registered so old links and bookmarks land somewhere
 * rather than on a 404.
 */
export function clientLoader() {
  return redirect("/");
}

export default function AdminOverviewRoute() {
  return null;
}
