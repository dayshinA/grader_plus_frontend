import { useState } from "react";

import { Button } from "~/components/ui/button";
import { Toolbar, type ToolbarFormat, type ToolbarTextAlign } from "~/components/ui/toolbar";
import { TooltipProvider } from "~/components/ui/tooltip";

export function ToolbarDemo() {
  const [visible, setVisible] = useState(true);
  const [activeFormats, setActiveFormats] = useState<ToolbarFormat[]>(["bold"]);
  const [textAlign, setTextAlign] = useState<ToolbarTextAlign>("left");

  const toggleFormat = (format: ToolbarFormat) =>
    setActiveFormats((prev) =>
      prev.includes(format) ? prev.filter((f) => f !== format) : [...prev, format],
    );

  return (
    <TooltipProvider>
      <div className="flex flex-col gap-8">
        <section className="flex flex-col gap-3">
          <h3 className="text-sm font-medium text-muted-foreground">
            Uncontrolled: manages its own active and align state
          </h3>
          <div className="flex min-h-[100px] items-center justify-center rounded-lg border border-dashed border-border p-6">
            <Toolbar />
          </div>
        </section>

        <section className="flex flex-col gap-3">
          <h3 className="text-sm font-medium text-muted-foreground">
            Controlled: driven by this page's own state
          </h3>
          <div className="flex min-h-[100px] items-center justify-center rounded-lg border border-dashed border-border p-6">
            <Toolbar
              activeFormats={activeFormats}
              onFormatToggle={toggleFormat}
              textAlign={textAlign}
              onTextAlignChange={setTextAlign}
            />
          </div>
          <p className="text-xs text-muted-foreground">
            Active: {activeFormats.length ? activeFormats.join(", ") : "none"} · Align: {textAlign}
          </p>
        </section>

        <section className="flex flex-col gap-3">
          <h3 className="text-sm font-medium text-muted-foreground">
            The visible prop animates the toolbar out rather than hard unmounting it
          </h3>
          <Button
            variant="outline"
            size="sm"
            className="w-fit"
            onClick={() => setVisible((v) => !v)}
          >
            {visible ? "Hide" : "Show"} toolbar
          </Button>
          <div className="flex min-h-[100px] items-center justify-center rounded-lg border border-dashed border-border p-6">
            <Toolbar visible={visible} />
          </div>
        </section>
      </div>
    </TooltipProvider>
  );
}
