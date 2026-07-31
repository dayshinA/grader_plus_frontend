import { AnimatePresence, motion } from "framer-motion";
import { ChevronDown, PanelLeft, type LucideIcon } from "lucide-react";
import * as React from "react";
import { NavLink } from "react-router";

import { Badge } from "~/components/ui/badge";
import { Button } from "~/components/ui/button";
import { ScrollArea } from "~/components/ui/scroll-area";
import { Separator } from "~/components/ui/separator";
import { useIsMobile } from "~/hooks/use-mobile";
import { cn } from "~/lib/utils";

const SIDEBAR_COLLAPSE_COOKIE = "graderplus-sidebar-collapsed";
const SIDEBAR_COOKIE_MAX_AGE = 60 * 60 * 24 * 7;

export interface SidebarNavItem {
  label: string;
  href: string;
  icon: LucideIcon;
  badge?: string;
  /** Passed through to `NavLink`'s `end` prop for exact-match active state. */
  end?: boolean;
  /**
   * Optional app-level tag naming what makes this item relevant. `Sidebar`
   * itself never reads it — the component stays generic and content-agnostic —
   * but a consuming layout can filter its own `groups` on it before passing
   * them in. GraderPlus uses it to carry a `PermissionKey` (see
   * `app-layout.tsx`).
   */
  requires?: string;
}

/** A group can be a plain array (always-visible, existing shorthand) or an object opting into
 * a collapsible accordion header (e.g. "Extra Options") — additive, existing call sites using
 * a plain `SidebarNavItem[]` keep working unchanged. */
export interface SidebarNavGroup {
  items: SidebarNavItem[];
  label?: string;
  collapsible?: boolean;
  /** Only meaningful when `collapsible` is true. @default false */
  defaultOpen?: boolean;
}
export type SidebarGroupInput = SidebarNavItem[] | SidebarNavGroup;

function normalizeGroup(group: SidebarGroupInput): SidebarNavGroup {
  return Array.isArray(group) ? { items: group } : group;
}

/** Kept in sync with `sidebarVariants` below — export so a consuming layout can size its
 * own content offset without hardcoding the same magic numbers twice. */
export const SIDEBAR_EXPANDED_WIDTH = "15rem";
export const SIDEBAR_COLLAPSED_WIDTH = "3.05rem";

// ---------------------------------------------------------------------------
// Provider / context — required ancestor of `Sidebar`. Holds the state that
// needs to be reachable from outside the sidebar's own DOM subtree (e.g. a
// `SidebarTrigger` placed in a top bar), plus the keyboard shortcut and
// collapsed-state cookie persistence.
// ---------------------------------------------------------------------------

type SidebarContextValue = {
  collapsed: boolean;
  setCollapsed: React.Dispatch<React.SetStateAction<boolean>>;
  toggleCollapsed: () => void;
  mobileOpen: boolean;
  setMobileOpen: React.Dispatch<React.SetStateAction<boolean>>;
  toggleMobile: () => void;
  isMobile: boolean;
};

const SidebarContext = React.createContext<SidebarContextValue | null>(null);

// eslint-disable-next-line react-refresh/only-export-components -- provider + hook live in one file, same pattern as auth-context.tsx's useAuth
export function useSidebar() {
  const context = React.useContext(SidebarContext);
  if (!context) {
    throw new Error("useSidebar must be used within a SidebarProvider.");
  }
  return context;
}

function readCollapsedCookie(): boolean | null {
  const match = document.cookie.match(new RegExp(`(?:^|; )${SIDEBAR_COLLAPSE_COOKIE}=([^;]*)`));
  return match ? match[1] === "true" : null;
}

export interface SidebarProviderProps {
  children: React.ReactNode;
  /** Initial collapsed state, used until the persisted cookie (if any) is read on mount.
   * @default true */
  defaultCollapsed?: boolean;
}

/** Must wrap any `Sidebar`/`SidebarTrigger` pair. Owns collapsed + mobile-drawer state,
 * persists the collapsed value to a cookie, and wires the Cmd/Ctrl+B shortcut. */
export function SidebarProvider({ children, defaultCollapsed = true }: SidebarProviderProps) {
  const [collapsed, setCollapsed] = React.useState(() => readCollapsedCookie() ?? defaultCollapsed);
  const [mobileOpen, setMobileOpen] = React.useState(false);
  const isMobile = useIsMobile();

  React.useEffect(() => {
    document.cookie = `${SIDEBAR_COLLAPSE_COOKIE}=${collapsed}; path=/; max-age=${SIDEBAR_COOKIE_MAX_AGE}`;
  }, [collapsed]);

  const toggleCollapsed = React.useCallback(() => setCollapsed((value) => !value), []);
  const toggleMobile = React.useCallback(() => setMobileOpen((value) => !value), []);

  React.useEffect(() => {
    function handleKeyDown(event: KeyboardEvent) {
      if (event.key.toLowerCase() === "b" && (event.metaKey || event.ctrlKey)) {
        event.preventDefault();
        toggleCollapsed();
      }
    }
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [toggleCollapsed]);

  const contextValue = React.useMemo<SidebarContextValue>(
    () => ({ collapsed, setCollapsed, toggleCollapsed, mobileOpen, setMobileOpen, toggleMobile, isMobile }),
    [collapsed, mobileOpen, toggleCollapsed, toggleMobile, isMobile],
  );

  return <SidebarContext.Provider value={contextValue}>{children}</SidebarContext.Provider>;
}

/** Toggles the sidebar from anywhere under `SidebarProvider` — desktop collapse/expand, or the
 * mobile drawer open/close, whichever applies. */
export const SidebarTrigger = React.forwardRef<
  HTMLButtonElement,
  React.ComponentProps<typeof Button>
>(({ className, onClick, ...props }, ref) => {
  const { isMobile, toggleCollapsed, toggleMobile } = useSidebar();

  return (
    <Button
      ref={ref}
      variant="ghost"
      size="icon"
      className={cn("h-8 w-8", className)}
      onClick={(event) => {
        onClick?.(event);
        if (isMobile) {
          toggleMobile();
        } else {
          toggleCollapsed();
        }
      }}
      {...props}
    >
      <PanelLeft className="h-4 w-4" />
      <span className="sr-only">Toggle sidebar</span>
    </Button>
  );
});
SidebarTrigger.displayName = "SidebarTrigger";

// ---------------------------------------------------------------------------

export interface SidebarProps {
  /** Groups render in order; a divider renders automatically between groups. A group opts into
   * a collapsible accordion header by passing `{ items, label, collapsible: true }` instead of
   * a plain `SidebarNavItem[]`. */
  groups: SidebarGroupInput[];
  /** Brand/app logo slot, rendered top-left above the header slot. Render-prop so it can hide its wordmark on collapse like the built-in nav items do. */
  logo?: (isCollapsed: boolean) => React.ReactNode;
  /** Slot rendered below the logo row (e.g. an org/module switcher). Render-prop so it can react to collapse state like the built-in items do. */
  header?: (isCollapsed: boolean) => React.ReactNode;
  /** Slot rendered below the nav list (e.g. settings link, account menu). */
  footer?: (isCollapsed: boolean) => React.ReactNode;
  className?: string;

  /** Fires whenever the collapsed state changes (including on mount), for any consumer
   * that needs its own layout (main content offset, etc.) to react to it — this is a
   * notification, not a controlling prop; the component still owns its own state.
   * Not fired while the mobile drawer is active, since content isn't pushed by it. */
  onCollapsedChange?: (isCollapsed: boolean) => void;
}

const sidebarVariants = {
  open: { width: SIDEBAR_EXPANDED_WIDTH },
  closed: { width: SIDEBAR_COLLAPSED_WIDTH },
};

const labelVariants = {
  open: {
    x: 0,
    opacity: 1,
    transition: { x: { stiffness: 1000, velocity: -100 } },
  },
  closed: {
    x: -20,
    opacity: 0,
    transition: { x: { stiffness: 100 } },
  },
};

const transitionProps = {
  type: "tween" as const,
  ease: "easeOut" as const,
  duration: 0.2,
  staggerChildren: 0.1,
};

const staggerVariants = {
  open: { transition: { staggerChildren: 0.03, delayChildren: 0.02 } },
  closed: {},
};

/** Must be rendered under `SidebarProvider`. Desktop: a collapsible nav rail, pinned open or
 * closed via the built-in toggle button, a `SidebarTrigger` elsewhere, or Cmd/Ctrl+B. Below
 * the `md` breakpoint: a slide-in drawer instead of the fixed rail, opened/closed via
 * `SidebarTrigger` or `useSidebar().setMobileOpen`. */
export function Sidebar({
  groups,
  logo,
  header,
  footer,
  className,
  onCollapsedChange,
}: SidebarProps) {
  const { collapsed: isCollapsed, isMobile, mobileOpen, setMobileOpen } = useSidebar();

  const normalizedGroups = React.useMemo(() => groups.map(normalizeGroup), [groups]);

  React.useEffect(() => {
    if (!isMobile) onCollapsedChange?.(isCollapsed);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isCollapsed, isMobile]);

  if (isMobile) {
    return (
      <AnimatePresence>
        {mobileOpen && (
          <MobileDrawer
            groups={normalizedGroups}
            logo={logo}
            header={header}
            footer={footer}
            className={className}
            onClose={() => setMobileOpen(false)}
          />
        )}
      </AnimatePresence>
    );
  }

  return (
    <motion.div
      className={cn(
        "fixed left-0 top-0 z-40 hidden h-full shrink-0 border-r border-border md:block",
        className,
      )}
      initial={isCollapsed ? "closed" : "open"}
      animate={isCollapsed ? "closed" : "open"}
      variants={sidebarVariants}
      transition={transitionProps}
    >
      <motion.div
        className="relative z-40 flex h-full shrink-0 flex-col bg-background text-muted-foreground"
        variants={staggerVariants}
      >
        <div className="flex grow flex-col items-center">
          {logo && (
            <div className="flex h-[54px] w-full shrink-0 items-center border-b border-border p-2">
              {logo(isCollapsed)}
            </div>
          )}

          {header && (
            <div className="flex h-[54px] w-full shrink-0 items-center border-b border-border p-2">
              {header(isCollapsed)}
            </div>
          )}

          <div className="flex h-full w-full flex-col">
            <ScrollArea className="grow min-h-0 p-2">
              <nav className="flex w-full flex-col gap-1">
                {normalizedGroups.map((group, groupIndex) => (
                  <React.Fragment key={groupIndex}>
                    {groupIndex > 0 && <Separator className="my-1" />}
                    <SidebarGroupBlock group={group} isCollapsed={isCollapsed} />
                  </React.Fragment>
                ))}
              </nav>
            </ScrollArea>
          </div>

          {footer && <div className="flex w-full flex-col p-2">{footer(isCollapsed)}</div>}
        </div>
      </motion.div>
    </motion.div>
  );
}

function MobileDrawer({
  groups,
  logo,
  header,
  footer,
  className,
  onClose,
}: {
  groups: SidebarNavGroup[];
  logo?: SidebarProps["logo"];
  header?: SidebarProps["header"];
  footer?: SidebarProps["footer"];
  className?: string;
  onClose: () => void;
}) {
  React.useEffect(() => {
    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") onClose();
    }
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [onClose]);

  return (
    <>
      <motion.div
        className="fixed inset-0 z-40 bg-black/50 md:hidden"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        transition={{ duration: 0.15 }}
        onClick={onClose}
        aria-hidden="true"
      />
      <motion.div
        role="dialog"
        aria-modal="true"
        className={cn(
          "fixed left-0 top-0 z-50 flex h-full w-[18rem] max-w-[80vw] flex-col border-r border-border bg-background text-muted-foreground md:hidden",
          className,
        )}
        initial={{ x: "-100%" }}
        animate={{ x: 0 }}
        exit={{ x: "-100%" }}
        transition={{ type: "tween", ease: "easeOut", duration: 0.2 }}
      >
        {logo && (
          <div className="flex h-[54px] w-full shrink-0 items-center border-b border-border p-2">
            {logo(false)}
          </div>
        )}
        {header && (
          <div className="flex h-[54px] w-full shrink-0 items-center border-b border-border p-2">
            {header(false)}
          </div>
        )}

        <ScrollArea className="grow min-h-0 p-2">
          <nav className="flex w-full flex-col gap-1">
            {groups.map((group, groupIndex) => (
              <React.Fragment key={groupIndex}>
                {groupIndex > 0 && <Separator className="my-1" />}
                <SidebarGroupBlock group={group} isCollapsed={false} onNavigate={onClose} />
              </React.Fragment>
            ))}
          </nav>
        </ScrollArea>

        {footer && <div className="flex w-full flex-col p-2">{footer(false)}</div>}
      </motion.div>
    </>
  );
}

function SidebarGroupBlock({
  group,
  isCollapsed,
  onNavigate,
}: {
  group: SidebarNavGroup;
  isCollapsed: boolean;
  onNavigate?: () => void;
}) {
  const [open, setOpen] = React.useState(group.defaultOpen ?? false);

  // Icon-collapsed rail has no room for an accordion header — fall back to a flat icon-only
  // list, same as every other label vanishing in that state.
  const showAccordion = group.collapsible && group.label && !isCollapsed;

  if (!showAccordion) {
    return (
      <>
        {group.items.map((item) => (
          <SidebarLink key={item.href} item={item} isCollapsed={isCollapsed} onNavigate={onNavigate} />
        ))}
      </>
    );
  }

  return (
    <div className="flex flex-col">
      <button
        type="button"
        onClick={() => setOpen((value) => !value)}
        aria-expanded={open}
        className="flex h-8 w-full items-center justify-between rounded-md px-2 text-xs font-medium text-muted-foreground/70 transition hover:bg-accent hover:text-accent-foreground"
      >
        <span>{group.label}</span>
        <motion.span animate={{ rotate: open ? 0 : -90 }} transition={{ duration: 0.15 }}>
          <ChevronDown className="h-3.5 w-3.5" />
        </motion.span>
      </button>
      <AnimatePresence initial={false}>
        {open && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.15 }}
            className="overflow-hidden"
          >
            <div className="flex flex-col gap-1 pt-1">
              {group.items.map((item) => (
                <SidebarLink key={item.href} item={item} isCollapsed={isCollapsed} onNavigate={onNavigate} />
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

function SidebarLink({
  item,
  isCollapsed,
  onNavigate,
}: {
  item: SidebarNavItem;
  isCollapsed: boolean;
  onNavigate?: () => void;
}) {
  const Icon = item.icon;

  return (
    <NavLink
      to={item.href}
      end={item.end}
      onClick={onNavigate}
      className={({ isActive }) =>
        cn(
          "flex h-8 w-full flex-row items-center rounded-md px-2 py-1.5 transition hover:bg-accent hover:text-accent-foreground",
          isActive && "bg-accent text-primary",
        )
      }
    >
      <Icon className="h-4 w-4 shrink-0" />
      <motion.span variants={labelVariants} className="flex items-center gap-2">
        {!isCollapsed && (
          <span className="ml-2 flex items-center gap-2 whitespace-nowrap text-sm font-medium">
            {item.label}
            {item.badge && (
              <Badge variant="secondary" className="h-fit w-fit px-1.5 py-0 text-[10px]">
                {item.badge}
              </Badge>
            )}
          </span>
        )}
      </motion.span>
    </NavLink>
  );
}
