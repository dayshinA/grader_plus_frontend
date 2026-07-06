import {
  Blocks,
  ChevronsUpDown,
  ClipboardList,
  Download,
  FileClock,
  GraduationCap,
  LayoutDashboard,
  LogOut,
  Palette,
  Scale,
  Settings,
  UserCircle,
  Users,
} from "lucide-react";
import * as React from "react";

import { Avatar, AvatarFallback } from "~/components/ui/avatar";
import { Button } from "~/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "~/components/ui/dropdown-menu";
import { Separator } from "~/components/ui/separator";
import {
  SIDEBAR_COLLAPSED_WIDTH,
  SIDEBAR_EXPANDED_WIDTH,
  Sidebar,
  SidebarProvider,
  SidebarTrigger,
  type SidebarCollapseMode,
  type SidebarGroupInput,
} from "~/components/ui/sidebar";

// Illustrative example data for this preview only — the Sidebar component
// itself takes no GraderPlus-specific content. Real per-role nav config gets
// wired in when routes/root.tsx / role layouts are built.
const coordinatorGroups: SidebarGroupInput[] = [
  [
    { label: "Dashboard", href: "/coordinator/dashboard", icon: LayoutDashboard, end: true },
    { label: "Submissions", href: "/coordinator/submissions", icon: FileClock },
    { label: "Marker Assignment", href: "/coordinator/markers", icon: Users },
  ],
  [
    { label: "Rubrics", href: "/coordinator/rubrics", icon: ClipboardList },
    { label: "Discrepancies", href: "/coordinator/discrepancies", icon: Scale, badge: "3" },
  ],
  {
    label: "Extra Options",
    collapsible: true,
    items: [
      { label: "Export", href: "/coordinator/export", icon: Download },
      { label: "Appearance", href: "/coordinator/appearance", icon: Palette },
    ],
  },
];

export default function SidebarPreview() {
  const [mode, setMode] = React.useState<SidebarCollapseMode>("hover");
  const [isCollapsed, setIsCollapsed] = React.useState(true);
  const [headerMenuOpen, setHeaderMenuOpen] = React.useState(false);
  const [footerMenuOpen, setFooterMenuOpen] = React.useState(false);

  return (
    <SidebarProvider defaultCollapsed>
      <main className="min-h-screen bg-background text-foreground">
        <div
          className="flex items-center gap-2 border-b border-border p-3"
          style={{
            paddingLeft: `max(0.75rem, ${isCollapsed ? SIDEBAR_COLLAPSED_WIDTH : SIDEBAR_EXPANDED_WIDTH})`,
            transition: "padding-left 200ms ease-out",
          }}
        >
          {/* Demonstrates the point of SidebarTrigger: it works from outside the
              Sidebar's own DOM tree — this toolbar isn't rendered inside <Sidebar>. */}
          <SidebarTrigger />
          <Separator orientation="vertical" className="h-4" />
          <span className="text-sm font-medium text-muted-foreground">Collapse mode:</span>
          <Button
            size="sm"
            variant={mode === "hover" ? "default" : "outline"}
            onClick={() => setMode("hover")}
          >
            Hover (auto)
          </Button>
          <Button
            size="sm"
            variant={mode === "manual" ? "default" : "outline"}
            onClick={() => setMode("manual")}
          >
            Manual (pin)
          </Button>
        </div>

        <Sidebar
          key={mode}
          groups={coordinatorGroups}
          collapseMode={mode}
          onCollapsedChange={setIsCollapsed}
          forceExpanded={headerMenuOpen || footerMenuOpen}
          logo={(isCollapsedNow) => (
            <div className="flex items-center gap-2">
              <GraduationCap className="h-5 w-5 shrink-0 text-primary" />
              {!isCollapsedNow && <span className="text-sm font-semibold">GraderPlus</span>}
            </div>
          )}
          header={(isCollapsedNow) => (
            <DropdownMenu modal={false} onOpenChange={setHeaderMenuOpen}>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="sm" className="flex w-full items-center gap-2 px-2">
                  <Avatar className="size-6 rounded-md">
                    <AvatarFallback className="rounded-md">M1</AvatarFallback>
                  </Avatar>
                  {!isCollapsedNow && (
                    <span className="flex items-center gap-2">
                      <span className="text-sm font-medium">CO3305</span>
                      <ChevronsUpDown className="h-4 w-4 text-muted-foreground/70" />
                    </span>
                  )}
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="start">
                <DropdownMenuItem>
                  <Blocks className="h-4 w-4" /> Switch module
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          )}
          footer={(isCollapsedNow) => (
            <>
              <NavFooterLink isCollapsed={isCollapsedNow} />
              <DropdownMenu modal={false} onOpenChange={setFooterMenuOpen}>
                <DropdownMenuTrigger className="w-full">
                  <div className="flex h-8 w-full flex-row items-center gap-2 rounded-md px-2 py-1.5 transition hover:bg-accent hover:text-accent-foreground">
                    <Avatar className="size-6">
                      <AvatarFallback>DA</AvatarFallback>
                    </Avatar>
                    {!isCollapsedNow && (
                      <span className="flex w-full items-center gap-2">
                        <span className="text-sm font-medium">Dayshin</span>
                        <ChevronsUpDown className="ml-auto h-4 w-4 text-muted-foreground/70" />
                      </span>
                    )}
                  </div>
                </DropdownMenuTrigger>
                <DropdownMenuContent sideOffset={5}>
                  <DropdownMenuItem>
                    <UserCircle className="h-4 w-4" /> Profile
                  </DropdownMenuItem>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem>
                    <LogOut className="h-4 w-4" /> Sign out
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </>
          )}
        />

        <div
          className="p-6"
          style={{
            paddingLeft: `max(1.5rem, ${isCollapsed ? SIDEBAR_COLLAPSED_WIDTH : SIDEBAR_EXPANDED_WIDTH})`,
            transition: "padding-left 200ms ease-out",
          }}
        >
          <h1 className="text-xl font-semibold">Sidebar preview (v3.0)</h1>
          <p className="mt-2 max-w-prose text-sm text-muted-foreground">
            The <code>SidebarTrigger</code> button in the toolbar above toggles the rail from
            outside the sidebar's own DOM — so does <kbd>Cmd/Ctrl+B</kbd>, and the collapsed
            state now survives a reload (persisted to a cookie). "Extra Options" is a collapsible
            accordion group — closed by default, and it collapses to a flat icon-only list when
            the whole rail is icon-collapsed. Resize the window below 768px to see the mobile
            drawer: the same trigger now opens a slide-in panel with a backdrop instead of
            toggling the desktop rail.
          </p>
        </div>
      </main>
    </SidebarProvider>
  );
}

function NavFooterLink({ isCollapsed }: { isCollapsed: boolean }) {
  return (
    <a
      href="/coordinator/settings"
      className="flex h-8 w-full flex-row items-center rounded-md px-2 py-1.5 transition hover:bg-accent hover:text-accent-foreground"
    >
      <Settings className="h-4 w-4 shrink-0" />
      {!isCollapsed && <span className="ml-2 text-sm font-medium">Settings</span>}
    </a>
  );
}
