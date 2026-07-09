import { AlertTriangle, Bell, CheckCircle2, Info } from "lucide-react";
import { useState } from "react";

import { Alert, type AlertPosition } from "~/components/ui/alert";
import { Button } from "~/components/ui/button";

const POSITIONS: AlertPosition[] = [
  "top-left",
  "top-center",
  "top-right",
  "bottom-left",
  "bottom-center",
  "bottom-right",
];

export default function AlertPreview() {
  const [toastKey, setToastKey] = useState(0);
  const [toastPosition, setToastPosition] = useState<AlertPosition>("top-right");
  const [inlineVisible, setInlineVisible] = useState(true);
  const [reducedMotionToastKey, setReducedMotionToastKey] = useState(0);

  return (
    <main className="flex min-h-screen flex-col gap-10 bg-background p-6 text-foreground sm:p-10">
      <h1 className="text-xl font-semibold">Alert preview</h1>

      <section className="flex flex-col gap-3">
        <h2 className="text-sm font-medium text-muted-foreground">
          Inline variant — no timeout, sits in normal document flow
        </h2>
        <div className="flex min-h-258 items-center justify-center rounded-lg border border-dashed border-border p-6">
          {inlineVisible ? (
            <Alert
              icon={<Info aria-hidden />}
              title="Marker assignment saved"
              message="Two markers and one moderator are now assigned to this project."
              timeout={0}
              onDismiss={() => setInlineVisible(false)}
            />
          ) : (
            <Button
              onClick={() => setInlineVisible(true)}
              size="sm"
              variant="outline"
            >
              Show inline alert again
            </Button>
          )}
        </div>
      </section>

      <section className="flex flex-col gap-3">
        <h2 className="text-sm font-medium text-muted-foreground">
          Toast variant — floating, portalled, auto-dismisses (hover/focus/tab-blur pauses the timer)
        </h2>
        <div className="flex flex-wrap items-center gap-2">
          {POSITIONS.map((position) => (
            <Button
              key={position}
              onClick={() => {
                setToastPosition(position);
                setToastKey((current) => current + 1);
              }}
              size="sm"
              variant="outline"
            >
              {position}
            </Button>
          ))}
        </div>

        {toastKey > 0 ? (
          <Alert
            icon={<CheckCircle2 aria-hidden />}
            key={toastKey}
            message="Your latest updates are now live for the team."
            position={toastPosition}
            timeout={6000}
            title="Changes saved"
          />
        ) : null}
      </section>

      <section className="flex flex-col gap-3">
        <h2 className="text-sm font-medium text-muted-foreground">
          Destructive, no icon, no dismiss button
        </h2>
        <div className="flex min-h-20 items-center justify-center rounded-lg border border-dashed border-border p-6">
          <Alert
            dismissible={false}
            message="Two markers must submit their evaluations before a discrepancy check can run."
            timeout={0}
            title="Cannot finalize grade yet"
          />
        </div>
      </section>

      <section className="flex flex-col gap-3">
        <h2 className="text-sm font-medium text-muted-foreground">
          <code>status</code> — auto-picked colored icon (success/error/warning/info)
        </h2>
        <div className="flex flex-col items-center gap-3 rounded-lg border border-dashed border-border p-6">
          <Alert
            status="success"
            message="Two markers and one moderator are now assigned to this project."
            timeout={0}
            title="Marker assignment saved"
          />
          <Alert
            status="error"
            message="Something went wrong. Please try again."
            timeout={0}
            title="Couldn't load users"
          />
          <Alert
            status="warning"
            message="One marker still hasn't submitted their evaluation."
            timeout={0}
            title="Grading incomplete"
          />
          <Alert
            status="info"
            message="Demo scheduling isn't confirmed as in-scope yet."
            timeout={0}
            title="Heads up"
          />
        </div>
      </section>

      <section className="flex flex-col gap-3">
        <h2 className="text-sm font-medium text-muted-foreground">
          <code>reducedMotion</code> — forced fast-fade regardless of OS preference
        </h2>
        <Button
          className="w-fit"
          onClick={() => setReducedMotionToastKey((current) => current + 1)}
          size="sm"
          variant="outline"
        >
          Show reduced-motion toast
        </Button>
        {reducedMotionToastKey > 0 ? (
          <Alert
            icon={<Bell aria-hidden />}
            key={`reduced-${reducedMotionToastKey}`}
            message="This entrance/exit is a plain opacity fade, not a spring."
            position="bottom-right"
            reducedMotion
            timeout={6000}
            title="Reduced motion"
          />
        ) : null}
      </section>

      <section className="mt-4 flex flex-col gap-3 rounded-lg bg-gray-900 p-6">
        <h2 className="text-sm font-medium text-gray-300">On a dark surface</h2>
        <Alert
          icon={<AlertTriangle aria-hidden />}
          message="This inline alert renders correctly regardless of the surrounding background."
          timeout={0}
          title="Heads up"
        />
      </section>
    </main>
  );
}
