import { useState } from "react";

import { Button } from "~/components/ui/button";
import { TooltipProvider } from "~/components/ui/tooltip";
import { Toolbar, type ToolbarFormat, type ToolbarTextAlign } from "~/components/ui/toolbar";

export default function ToolbarPreview() {
  const [visible, setVisible] = useState(true);
  const [activeFormats, setActiveFormats] = useState<ToolbarFormat[]>(["bold"]);
  const [textAlign, setTextAlign] = useState<ToolbarTextAlign>("left");

  const toggleFormat = (format: ToolbarFormat) =>
    setActiveFormats((prev) =>
      prev.includes(format) ? prev.filter((f) => f !== format) : [...prev, format],
    );

  return (
    <TooltipProvider>
      <main className="flex min-h-screen flex-col gap-10 bg-background p-10 text-foreground">
        <h1 className="text-xl font-semibold">Toolbar preview</h1>

        <section className="flex flex-col gap-3">
          <h2 className="text-sm font-medium text-muted-foreground">
            Uncontrolled — manages its own active/align state
          </h2>
          <div className="flex min-h-[100px] items-center justify-center rounded-lg border border-dashed border-border p-6">
            <Toolbar />
          </div>
        </section>

        <section className="flex flex-col gap-3">
          <h2 className="text-sm font-medium text-muted-foreground">
            Controlled — active formats/alignment driven by this page's own state
          </h2>
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
          <h2 className="text-sm font-medium text-muted-foreground">
            <code>visible</code> prop — animates out rather than a hard unmount
          </h2>
          <Button variant="outline" size="sm" className="w-fit" onClick={() => setVisible((v) => !v)}>
            {visible ? "Hide" : "Show"} toolbar
          </Button>
          <div className="flex min-h-[100px] items-center justify-center rounded-lg border border-dashed border-border p-6">
            <Toolbar visible={visible} />
          </div>
        </section>

        <section className="mt-10 flex flex-col gap-3 bg-gray-900 p-6 dark:bg-gray-900">
          <h2 className="text-sm font-medium text-gray-300">On a dark surface</h2>
          <div className="flex min-h-[100px] items-center justify-center">
            <Toolbar />
          </div>
        </section>
      </main>
    </TooltipProvider>
  );
}
