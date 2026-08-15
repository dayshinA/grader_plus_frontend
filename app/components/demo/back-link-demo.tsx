import { Link, useLocation } from "react-router";

import { BackLink } from "~/components/ui/back-link";
import { backTo } from "~/hooks/use-back-link";

export function BackLinkDemo() {
  const { pathname, search } = useLocation();

  return (
    <div className="space-y-3 rounded-xl border border-border p-4">
      <BackLink />
      <p className="text-sm text-muted-foreground">
        Renders only what the navigation that opened the screen declared through{" "}
        <code>backTo()</code>, so there is nothing above this line until something declares
        one. Arriving from the sidebar or a pasted link is not arriving from somewhere, and a
        link claiming otherwise would be a false statement about your own history.
      </p>
      <Link
        to={`${pathname}${search}`}
        state={backTo({ to: "/admin/users", label: "accounts" })}
        className="inline-flex text-sm underline underline-offset-4"
      >
        Reopen this page as though it were opened from the accounts list
      </Link>
    </div>
  );
}
