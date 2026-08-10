import * as React from "react"
import {
  Activity,
  Blocks,
  Calendar,
  ChevronRight,
  ChevronsUpDown,
  CreditCard,
  FolderKanban,
  Globe,
  Hash,
  Inbox,
  LayoutDashboard,
  LogOut,
  Plus,
  Search,
  Settings,
  Terminal,
  Users,
} from "lucide-react"
import { Link, useNavigate } from "react-router"

import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "~/components/ui/collapsible"
import {
  CommandDialog,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "~/components/ui/command"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "~/components/ui/dropdown-menu"
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuAction,
  SidebarMenuBadge,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarMenuSub,
  SidebarMenuSubButton,
  SidebarMenuSubItem,
  useSidebar,
} from "~/components/ui/sidebar"

export type NavItemData = {
  id: string
  title: string
  icon: React.ElementType
  /**
   * Turns the item into a real link. With this set the item renders a router `<Link>`, so it gets
   * middle-click, cmd-click and prefetch for free; without it the item is a button and selection
   * is reported through `onSelect` (which is how the component preview drives it).
   */
  href?: string
  badge?: number | string
  shortcut?: string
  children?: NavItemData[]
}

export type NavGroupData = {
  heading?: string
  items: NavItemData[]
}

export const defaultNavGroups: NavGroupData[] = [
  {
    items: [
      { id: "search", title: "Search", icon: Search, shortcut: "⌘K" },
      { id: "home", title: "Home", icon: LayoutDashboard },
      { id: "inbox", title: "Inbox", icon: Inbox, badge: 12 },
      { id: "analytics", title: "Analytics", icon: Activity },
    ],
  },
  {
    heading: "Workspace",
    items: [
      {
        id: "projects",
        title: "Projects",
        icon: FolderKanban,
        children: [
          { id: "p-active", title: "Active", icon: Hash },
          { id: "p-archived", title: "Archived", icon: Hash },
        ],
      },
      { id: "calendar", title: "Calendar", icon: Calendar },
      {
        id: "team",
        title: "Team",
        icon: Users,
        children: [
          { id: "t-design", title: "Designers", icon: Hash },
          { id: "t-eng", title: "Engineering", icon: Hash },
          { id: "t-product", title: "Product", icon: Hash },
        ],
      },
      {
        id: "customers",
        title: "Customers",
        icon: Globe,
        children: [
          { id: "c-enterprise", title: "Enterprise", icon: Hash },
          { id: "c-smb", title: "SMB", icon: Hash },
        ],
      },
      { id: "finance", title: "Finance", icon: CreditCard },
    ],
  },
  {
    heading: "Developers",
    items: [
      { id: "api", title: "API Keys", icon: Terminal },
      { id: "webhooks", title: "Webhooks", icon: Blocks },
    ],
  },
]

export const defaultBottomItems: NavItemData[] = [
  { id: "settings", title: "Settings", icon: Settings, shortcut: "⌘," },
  { id: "logout", title: "Log out", icon: LogOut },
]

export const defaultWorkspaces = ["GraderPlus", "Loughborough University"]

function flattenItems(items: NavItemData[]): NavItemData[] {
  return items.reduce<NavItemData[]>((acc, item) => {
    acc.push(item)
    if (item.children) acc.push(...flattenItems(item.children))
    return acc
  }, [])
}

function WorkspaceSwitcher({
  workspaces,
  selected,
  onSelect,
}: {
  workspaces: string[]
  selected: string
  onSelect: (workspace: string) => void
}) {
  return (
    <SidebarMenu>
      <SidebarMenuItem>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <SidebarMenuButton
              size="lg"
              className="data-[state=open]:bg-sidebar-accent data-[state=open]:text-sidebar-accent-foreground"
            >
              <div className="flex aspect-square size-8 items-center justify-center rounded-md bg-primary text-sm font-semibold text-primary-foreground">
                {selected.charAt(0)}
              </div>
              <div className="grid flex-1 text-left text-sm leading-tight">
                <span className="truncate font-medium">{selected}</span>
                <span className="truncate text-xs text-muted-foreground">Pro Plan</span>
              </div>
              <ChevronsUpDown className="ml-auto size-4" />
            </SidebarMenuButton>
          </DropdownMenuTrigger>
          <DropdownMenuContent
            className="w-(--radix-dropdown-menu-trigger-width) min-w-56 rounded-lg"
            align="start"
            side="bottom"
          >
            {workspaces.map((workspace) => (
              <DropdownMenuItem key={workspace} onSelect={() => onSelect(workspace)}>
                {workspace}
              </DropdownMenuItem>
            ))}
            <DropdownMenuSeparator />
            <DropdownMenuItem>
              <Plus />
              Create workspace
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </SidebarMenuItem>
    </SidebarMenu>
  )
}

function NavItem({
  item,
  activeId,
  onActivate,
}: {
  item: NavItemData
  activeId: string
  onActivate: (item: NavItemData) => void
}) {
  if (item.children) {
    const hasActiveChild = item.children.some((child) => child.id === activeId)
    return (
      <Collapsible defaultOpen={hasActiveChild} className="group/collapsible">
        <SidebarMenuItem>
          <CollapsibleTrigger asChild>
            <SidebarMenuButton className="cursor-pointer">
              <item.icon />
              <span>{item.title}</span>
            </SidebarMenuButton>
          </CollapsibleTrigger>
          <CollapsibleTrigger asChild>
            <SidebarMenuAction className="cursor-pointer transition-transform group-data-[state=open]/collapsible:rotate-90">
              <ChevronRight />
              <span className="sr-only">Toggle {item.title}</span>
            </SidebarMenuAction>
          </CollapsibleTrigger>
          <CollapsibleContent>
            <SidebarMenuSub>
              {item.children.map((child) => (
                <SidebarMenuSubItem key={child.id}>
                  <SidebarMenuSubButton
                    asChild={Boolean(child.href)}
                    isActive={activeId === child.id}
                    onClick={() => onActivate(child)}
                    className="cursor-pointer"
                  >
                    {child.href ? (
                      <Link to={child.href}>
                        <child.icon />
                        <span>{child.title}</span>
                      </Link>
                    ) : (
                      <>
                        <child.icon />
                        <span>{child.title}</span>
                      </>
                    )}
                  </SidebarMenuSubButton>
                </SidebarMenuSubItem>
              ))}
            </SidebarMenuSub>
          </CollapsibleContent>
        </SidebarMenuItem>
      </Collapsible>
    )
  }

  const content = (
    <>
      <item.icon />
      <span>{item.title}</span>
      {item.shortcut && (
        <kbd className="ml-auto hidden font-mono text-[10px] text-muted-foreground/60 group-hover/menu-item:inline-block">
          {item.shortcut}
        </kbd>
      )}
    </>
  )

  return (
    <SidebarMenuItem>
      <SidebarMenuButton
        asChild={Boolean(item.href)}
        isActive={activeId === item.id}
        onClick={() => onActivate(item)}
        className="cursor-pointer"
      >
        {item.href ? <Link to={item.href}>{content}</Link> : content}
      </SidebarMenuButton>
      {item.badge && <SidebarMenuBadge>{item.badge}</SidebarMenuBadge>}
    </SidebarMenuItem>
  )
}

export function DashboardSidebar({
  navGroups = defaultNavGroups,
  bottomItems = defaultBottomItems,
  workspaces = defaultWorkspaces,
  activeId: activeIdProp,
  onSelect,
  activeWorkspace: activeWorkspaceProp,
  onWorkspaceSelect,
  header,
  footer,
  searchPlaceholder = "Search projects, docs, or actions...",
  ...props
}: Omit<React.ComponentProps<typeof Sidebar>, "onSelect"> & {
  navGroups?: NavGroupData[]
  bottomItems?: NavItemData[]
  workspaces?: string[]
  activeId?: string
  onSelect?: (id: string) => void
  activeWorkspace?: string
  onWorkspaceSelect?: (workspace: string) => void
  /** Replaces the built-in workspace switcher — e.g. with product branding. */
  header?: React.ReactNode
  /** Replaces the `bottomItems` menu — e.g. with an account dropdown. */
  footer?: React.ReactNode
  searchPlaceholder?: string
}) {
  const [internalActiveId, setInternalActiveId] = React.useState("home")
  const [internalWorkspace, setInternalWorkspace] = React.useState(workspaces[0])
  const [commandOpen, setCommandOpen] = React.useState(false)
  const navigate = useNavigate()
  const { setOpenMobile } = useSidebar()

  const activeId = activeIdProp ?? internalActiveId
  const activeWorkspace = activeWorkspaceProp ?? internalWorkspace

  const allItems = React.useMemo(
    () => flattenItems([...navGroups.flatMap((g) => g.items), ...bottomItems]),
    [navGroups, bottomItems]
  )

  const handleActivate = React.useCallback(
    (item: NavItemData) => {
      if (item.id === "search") {
        setCommandOpen(true)
        return
      }
      // On mobile the sidebar is an off-canvas drawer over the page: leaving it open after a tap
      // would hide the screen the tap just navigated to.
      setOpenMobile(false)
      // A linked item is already navigating via its `<Link>`; navigating again here would push the
      // same entry twice.
      if (item.href) return
      if (onSelect) onSelect(item.id)
      else setInternalActiveId(item.id)
    },
    [onSelect, setOpenMobile]
  )

  const handleWorkspaceSelect = onWorkspaceSelect ?? setInternalWorkspace

  React.useEffect(() => {
    const down = (e: KeyboardEvent) => {
      if (e.key === "k" && (e.metaKey || e.ctrlKey)) {
        e.preventDefault()
        setCommandOpen((open) => !open)
      }
    }
    document.addEventListener("keydown", down)
    return () => document.removeEventListener("keydown", down)
  }, [])

  return (
    <>
      <Sidebar collapsible="offcanvas" {...props}>
        <SidebarHeader>
          {header ?? (
            <WorkspaceSwitcher
              workspaces={workspaces}
              selected={activeWorkspace}
              onSelect={handleWorkspaceSelect}
            />
          )}
        </SidebarHeader>
        <SidebarContent>
          {navGroups.map((group, idx) => (
            <SidebarGroup key={group.heading ?? idx}>
              {group.heading && <SidebarGroupLabel>{group.heading}</SidebarGroupLabel>}
              <SidebarGroupContent>
                <SidebarMenu>
                  {group.items.map((item) => (
                    <NavItem
                      key={item.id}
                      item={item}
                      activeId={activeId}
                      onActivate={handleActivate}
                    />
                  ))}
                </SidebarMenu>
              </SidebarGroupContent>
            </SidebarGroup>
          ))}
        </SidebarContent>
        <SidebarFooter>
          {footer ?? (
            <SidebarMenu>
              {bottomItems.map((item) => (
                <NavItem
                  key={item.id}
                  item={item}
                  activeId={activeId}
                  onActivate={handleActivate}
                />
              ))}
            </SidebarMenu>
          )}
        </SidebarFooter>
      </Sidebar>

      <CommandDialog open={commandOpen} onOpenChange={setCommandOpen}>
        <CommandInput placeholder={searchPlaceholder} />
        <CommandList>
          <CommandEmpty>No results found.</CommandEmpty>
          <CommandGroup heading="Navigate">
            {allItems
              .filter((item) => item.id !== "search")
              .map((item) => (
                <CommandItem
                  key={item.id}
                  onSelect={() => {
                    setCommandOpen(false)
                    // The palette isn't a link, so linked items navigate explicitly here.
                    if (item.href) {
                      setOpenMobile(false)
                      navigate(item.href)
                      return
                    }
                    handleActivate(item)
                  }}
                >
                  <item.icon />
                  <span>{item.title}</span>
                </CommandItem>
              ))}
          </CommandGroup>
        </CommandList>
      </CommandDialog>
    </>
  )
}
