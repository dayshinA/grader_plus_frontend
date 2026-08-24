import { redirect } from "react-router";

// Merged into home on 2026-08-18. The path stays registered so old bookmarks still land.
export function clientLoader() {
  return redirect("/");
}

export default function AdminOverviewRoute() {
  return null;
}
