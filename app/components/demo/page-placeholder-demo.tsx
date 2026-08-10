import { Percent } from "lucide-react";

import { PagePlaceholder } from "~/components/ui/page-placeholder";

export function PagePlaceholderDemo() {
  return (
    <PagePlaceholder
      icon={Percent}
      title="Not built yet"
      description="This screen is routed and reachable. Its content is the next slice of work."
      planned={[
        "The current rate, editable as a percentage",
        "A worked example of how the rate applies to an amount",
        "A record of when it last changed, and by whom",
      ]}
    />
  );
}
