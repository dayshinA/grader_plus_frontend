import { BackLink } from "~/components/ui/back-link";

export function BackLinkDemo() {
  return (
    <div className="space-y-3 rounded-xl border border-border p-4">
      <BackLink fallback={{ to: "/super-admin/users", label: "Users" }} />
      <p className="text-sm text-muted-foreground">
        Points at whatever the link that opened the screen declared via <code>backTo()</code> — so a
        user opened from page 3 of the list goes back to page 3. Falls back to the domain&rsquo;s
        list on a cold entry, which is what this preview shows.
      </p>
    </div>
  );
}
