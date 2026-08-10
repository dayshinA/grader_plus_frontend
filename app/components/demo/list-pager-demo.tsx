import { useState } from "react";

import { ListPager } from "~/components/ui/list-pager";

export function ListPagerDemo() {
  const [page, setPage] = useState(1);

  return (
    <div className="space-y-4">
      <ListPager page={page} pageCount={9} onPageChange={setPage} />
      <p className="text-xs text-muted-foreground">
        Page numbers collapse to a &ldquo;Page {page} of 9&rdquo; label below <code>sm</code>.
      </p>
    </div>
  );
}
