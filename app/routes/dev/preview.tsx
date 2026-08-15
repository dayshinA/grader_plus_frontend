import { useState } from "react";

import { componentRegistry } from "~/components/demo/registry";
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from "~/components/ui/breadcrumb";
import { Card, CardContent } from "~/components/ui/card";
import { DashboardSidebar, type NavGroupData } from "~/components/ui/dashboard-sidebar";
import { Separator } from "~/components/ui/separator";
import { SidebarInset, SidebarProvider, SidebarTrigger } from "~/components/ui/sidebar";
import type { Route } from "./+types/preview";

export function meta({}: Route.MetaArgs) {
  return [
    { title: "Component preview | GraderPlus" },
    {
      name: "description",
      content: "Live preview of every UI component built for GraderPlus.",
    },
  ];
}

const navGroups: NavGroupData[] = (() => {
  const byCategory = new Map<string, NavGroupData["items"]>();
  for (const entry of componentRegistry) {
    const items = byCategory.get(entry.category) ?? [];
    items.push({ id: entry.id, title: entry.name, icon: entry.icon });
    byCategory.set(entry.category, items);
  }
  return Array.from(byCategory.entries()).map(([heading, items]) => ({ heading, items }));
})();

export default function ComponentPreview() {
  const [activeId, setActiveId] = useState(componentRegistry[0].id);
  const selected =
    componentRegistry.find((entry) => entry.id === activeId) ?? componentRegistry[0];

  return (
    <SidebarProvider>
      <DashboardSidebar
        navGroups={navGroups}
        bottomItems={[]}
        workspaces={["GraderPlus"]}
        activeId={activeId}
        onSelect={setActiveId}
      />
      <SidebarInset>
        <header className="flex h-14 shrink-0 items-center gap-2 border-b border-border/50 px-4">
          <SidebarTrigger className="-ml-1" />
          <Separator orientation="vertical" className="h-4" />
          <Breadcrumb>
            <BreadcrumbList>
              <BreadcrumbItem>
                <BreadcrumbPage className="text-muted-foreground">
                  {selected.category}
                </BreadcrumbPage>
              </BreadcrumbItem>
              <BreadcrumbSeparator />
              <BreadcrumbItem>
                <BreadcrumbPage>{selected.name}</BreadcrumbPage>
              </BreadcrumbItem>
            </BreadcrumbList>
          </Breadcrumb>
        </header>

        <div className="flex-1 overflow-y-auto p-4 sm:p-6">
          <div className="mx-auto max-w-4xl">
            <div className="mb-6">
              <h1 className="text-xl font-semibold text-foreground sm:text-2xl">{selected.name}</h1>
              <p className="mt-1 text-sm text-muted-foreground">{selected.description}</p>
            </div>
            <Card>
              <CardContent>{selected.render()}</CardContent>
            </Card>
          </div>
        </div>
      </SidebarInset>
    </SidebarProvider>
  );
}
