import type { ComponentType } from "react";
import { Link, useSearchParams } from "react-router";

import { cn } from "~/lib/utils";

import AlertDialogPreview from "./alert-dialog-preview";
import AlertPreview from "./alert-preview";
import ButtonPreview from "./button-preview";
import DropdownMenuPreview from "./dropdown-menu-preview";
import InputPreview from "./input-preview";
import LoaderOnePreview from "./loader-one-preview";
import SidebarPreview from "./sidebar-preview";
import TablePreview from "./table-preview";
import ToolbarPreview from "./toolbar-preview";

interface PreviewEntry {
  id: string;
  label: string;
  Component: ComponentType;
}

// Add a new preview by adding one entry here — no routes.ts change needed.
const previews: PreviewEntry[] = [
  { id: "button", label: "Button", Component: ButtonPreview },
  { id: "input", label: "Input", Component: InputPreview },
  { id: "loader-one", label: "Loader One", Component: LoaderOnePreview },
  { id: "dropdown-menu", label: "Dropdown Menu", Component: DropdownMenuPreview },
  { id: "sidebar", label: "Sidebar", Component: SidebarPreview },
  { id: "table", label: "Table", Component: TablePreview },
  { id: "toolbar", label: "Toolbar", Component: ToolbarPreview },
  { id: "alert-dialog", label: "Alert Dialog", Component: AlertDialogPreview },
  { id: "alert", label: "Alert", Component: AlertPreview },
];

export default function ComponentPreviewHub() {
  const [searchParams] = useSearchParams();
  const active = previews.find((preview) => preview.id === searchParams.get("component")) ?? previews[0];
  const ActiveComponent = active.Component;

  return (
    <div className="flex min-h-screen flex-col bg-background text-foreground md:flex-row">
      <nav
        aria-label="Component previews"
        className="flex shrink-0 gap-1 overflow-x-auto border-b border-border p-2 md:w-56 md:flex-col md:overflow-x-visible md:border-b-0 md:border-r md:p-3"
      >
        {previews.map((preview) => {
          const isActive = preview.id === active.id;
          return (
            <Link
              key={preview.id}
              to={`?component=${preview.id}`}
              replace
              preventScrollReset
              aria-current={isActive ? "page" : undefined}
              className={cn(
                "shrink-0 whitespace-nowrap rounded-md px-3 py-1.5 text-sm font-medium transition hover:bg-accent hover:text-accent-foreground md:w-full",
                isActive && "bg-accent text-primary",
              )}
            >
              {preview.label}
            </Link>
          );
        })}
      </nav>

      {/* `contain: layout` scopes any `position: fixed` inside a preview (e.g. Sidebar) to this
          box instead of the viewport, so it can't overlap the nav above. */}
      <div className="min-w-0 flex-1" style={{ contain: "layout" }}>
        <ActiveComponent />
      </div>
    </div>
  );
}
