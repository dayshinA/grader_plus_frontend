import { useState } from "react";
import { Check, ChevronRight, Copy } from "lucide-react";
import { toast } from "sonner";

import { Button } from "~/components/ui/button";
import { cn } from "~/lib/utils";

/**
 * How many top-level keys (or entries) the payload has, so the summary line says whether opening
 * it is worth it. Anything that isn't an object or array has no count worth printing.
 */
function describe(value: unknown): string | undefined {
  if (Array.isArray(value)) {
    return `${value.length} ${value.length === 1 ? "entry" : "entries"}`;
  }
  if (value && typeof value === "object") {
    const count = Object.keys(value).length;
    return `${count} ${count === 1 ? "field" : "fields"}`;
  }
  return undefined;
}

/**
 * A raw JSON payload on a detail screen — the gateway's own reply, a client's attached metadata:
 * things an admin needs verbatim when tracing a payment, and that no amount of field-by-field
 * modelling would keep up with, since their shape is the vendor's to change.
 *
 * Collapsed by default and built on native `<details>`, so it costs one line until someone wants
 * it, works without JavaScript, and comes with the disclosure keyboard behaviour already right.
 * The payload scrolls inside its own box in both directions rather than stretching the page — a
 * deeply nested response is wide, and a detail screen shouldn't scroll sideways because of it.
 */
export function JsonViewer({
  value,
  label,
  defaultOpen = false,
  emptyText = "Nothing recorded.",
  className,
}: {
  value: unknown;
  /** Names the payload in the summary line and the copy button's accessible label. */
  label: string;
  defaultOpen?: boolean;
  /** Shown instead of the disclosure when there is no payload at all. */
  emptyText?: string;
  className?: string;
}) {
  const [copied, setCopied] = useState(false);

  if (value === null || value === undefined) {
    return <p className={cn("text-sm text-muted-foreground", className)}>{emptyText}</p>;
  }

  const formatted = JSON.stringify(value, null, 2);
  const summary = describe(value);

  async function handleCopy() {
    try {
      await navigator.clipboard.writeText(formatted);
      setCopied(true);
      toast.success(`${label} copied.`);
      window.setTimeout(() => setCopied(false), 2000);
    } catch {
      // Clipboard access is denied outside a secure context — it's on screen to copy by hand.
      toast.error("Couldn't copy automatically. Select the payload and copy it.");
    }
  }

  return (
    <details className={cn("group rounded-lg border border-border", className)} open={defaultOpen}>
      <summary className="flex min-h-11 cursor-pointer list-none items-center gap-2 px-3 py-2 text-sm text-foreground [&::-webkit-details-marker]:hidden">
        <ChevronRight
          className="size-4 shrink-0 text-muted-foreground transition-transform group-open:rotate-90 motion-reduce:transition-none"
          aria-hidden="true"
        />
        <span className="font-medium">{label}</span>
        {summary && <span className="text-xs text-muted-foreground">{summary}</span>}
      </summary>

      <div className="space-y-2 border-t border-border p-3">
        <pre className="max-h-80 overflow-auto rounded-md bg-muted/40 p-3 font-mono text-xs leading-relaxed text-foreground">
          {formatted}
        </pre>
        <Button
          type="button"
          variant="outline"
          className="h-11 w-full cursor-pointer sm:h-9 sm:w-auto"
          onClick={() => void handleCopy()}
        >
          {copied ? (
            <Check className="size-4" aria-hidden="true" />
          ) : (
            <Copy className="size-4" aria-hidden="true" />
          )}
          {copied ? "Copied" : "Copy JSON"}
          <span className="sr-only"> — {label}</span>
        </Button>
      </div>
    </details>
  );
}
