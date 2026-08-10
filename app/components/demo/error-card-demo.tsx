import { useState } from "react";
import { FileSearch } from "lucide-react";

import { Button } from "~/components/ui/button";
import { ErrorCard } from "~/components/ui/error-card";

export function ErrorCardDemo() {
  const [retrying, setRetrying] = useState(false);

  return (
    <div className="space-y-4">
      <ErrorCard
        title="Couldn't load modules"
        description="The modules service is unavailable. Please try again."
        onRetry={() => {
          setRetrying(true);
          window.setTimeout(() => setRetrying(false), 1200);
        }}
        isRetrying={retrying}
      />

      <ErrorCard
        icon={FileSearch}
        title="Module not found"
        description="There's no module with this id. It may have been deactivated, or the link may be wrong."
        action={
          <Button className="h-11 cursor-pointer sm:h-9" onClick={() => undefined}>
            Back to modules
          </Button>
        }
      />

      <p className="text-xs text-muted-foreground">
        Given an <code>ApiError</code> as <code>error</code>, the description is the API&rsquo;s own
        message — the two above pass it explicitly instead.
      </p>
    </div>
  );
}
