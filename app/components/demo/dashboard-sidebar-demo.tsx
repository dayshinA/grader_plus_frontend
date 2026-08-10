import { SidebarInset, SidebarProvider, SidebarTrigger } from "~/components/ui/sidebar";
import { DashboardSidebar } from "~/components/ui/dashboard-sidebar";

export function DashboardSidebarDemo() {
  return (
    <div className="h-[500px] w-full overflow-hidden rounded-xl border border-border/50 shadow-sm sm:h-[600px]">
      <SidebarProvider className="min-h-0">
        <DashboardSidebar />
        <SidebarInset>
          <header className="flex h-12 shrink-0 items-center gap-2 border-b border-border/50 px-3">
            <SidebarTrigger />
            <span className="text-sm text-muted-foreground">
              GraderPlus <span className="mx-1">/</span>{" "}
              <span className="font-medium text-foreground">Home</span>
            </span>
          </header>
          <div className="flex flex-1 flex-col gap-4 p-4">
            <div className="grid auto-rows-min grid-cols-1 gap-4 sm:grid-cols-2">
              <div className="aspect-video rounded-xl bg-muted/50" />
              <div className="aspect-video rounded-xl bg-muted/50" />
            </div>
            <div className="min-h-[200px] flex-1 rounded-xl bg-muted/50" />
          </div>
        </SidebarInset>
      </SidebarProvider>
    </div>
  );
}
