import type { ReactNode } from "react";
import {
  AlignLeft,
  ArrowLeft,
  ArrowLeftRight,
  Bell,
  Braces,
  ChevronsLeftRight,
  FolderTree,
  Gauge,
  Type,
  Inbox,
  type LucideIcon,
  ListFilter,
  Megaphone,
  MousePointerClick,
  PanelLeft,
  CircleCheck,
  Construction,
  Heading,
  KeyRound,
  ListOrdered,
  Rows3,
  ScrollText,
  ServerCrash,
  SlidersHorizontal,
  SquareChevronDown,
  ShieldAlert,
  Table2,
  TextCursorInput,
  TextQuote,
  TriangleAlert,
  Waves,
} from "lucide-react";

import { ButtonDemo } from "./button-demo";
import { AlertDialogDemo } from "./alert-dialog-demo";
import { SonnerDemo } from "./sonner-demo";
import { InputDemo } from "./input-demo";
import { FormFieldDemo } from "./form-field-demo";
import { TextareaDemo } from "./textarea-demo";
import { PaginationDemo } from "./pagination-demo";
import { ResizableTableDemo } from "./resizable-table-demo";
import { DashboardSidebarDemo } from "./dashboard-sidebar-demo";
import { StatCardDemo } from "./stat-card-demo";
import { EmptyStateDemo } from "./empty-state-demo";
import { NotFoundPageDemo } from "./not-found-page-demo";
import { WaveDemo } from "./wave-demo";
import { PageHeaderDemo } from "./page-header-demo";
import { PagePlaceholderDemo } from "./page-placeholder-demo";
import { TableDemo } from "./table-demo";
import { DataTableDemo } from "./data-table-demo";
import { ConfirmDialogDemo } from "./confirm-dialog-demo";
import { ChangeSummaryDemo } from "./change-summary-demo";
import { ListPagerDemo } from "./list-pager-demo";
import { FormFeedbackDemo } from "./form-feedback-demo";
import { DetailListDemo } from "./detail-list-demo";
import { SecretFieldDemo } from "./secret-field-demo";
import { ErrorCardDemo } from "./error-card-demo";
import { FilterTabsDemo } from "./filter-tabs-demo";
import { JsonViewerDemo } from "./json-viewer-demo";
import { BackLinkDemo } from "./back-link-demo";
import { CalloutDemo } from "./callout-demo";
import { ListToolbarDemo } from "./list-toolbar-demo";
import { FileTreeDemo } from "./file-tree-demo";
import { ToolbarDemo } from "./toolbar-demo";
import { SelectFieldDemo } from "./select-field-demo";

export type ComponentDemoEntry = {
  id: string;
  name: string;
  description: string;
  category: string;
  icon: LucideIcon;
  render: () => ReactNode;
};

export const componentRegistry: ComponentDemoEntry[] = [
  {
    id: "button",
    name: "Button",
    category: "Actions",
    icon: MousePointerClick,
    description:
      "Primary interactive element for actions. Six variants: default, secondary, outline, ghost, link, destructive.",
    render: () => <ButtonDemo />,
  },
  {
    id: "alert-dialog",
    name: "Alert Dialog",
    category: "Overlays",
    icon: ShieldAlert,
    description:
      "Interrupts the user with a confirmation prompt for actions that need explicit acknowledgement, with an optional icon variant.",
    render: () => <AlertDialogDemo />,
  },
  {
    id: "sonner",
    name: "Toast (Sonner)",
    category: "Feedback",
    icon: Bell,
    description:
      "Non-blocking notification for the outcome of an action. Success, error, and warning variants; mounted globally via <Toaster /> in root.tsx.",
    render: () => <SonnerDemo />,
  },
  {
    id: "input",
    name: "Input",
    category: "Forms",
    icon: TextCursorInput,
    description:
      "Single-line text field, paired with Label. Shown with helper text and with an invalid (aria-invalid) state.",
    render: () => <InputDemo />,
  },
  {
    id: "form-field",
    name: "Form Field",
    category: "Forms",
    icon: TextQuote,
    description:
      "Label, input and message in one — wires up htmlFor, aria-invalid, aria-describedby and role=alert, with a 44px mobile touch target and an automatic password reveal toggle.",
    render: () => <FormFieldDemo />,
  },
  {
    id: "select-field",
    name: "Select Field",
    category: "Forms",
    icon: SquareChevronDown,
    description:
      "FormField's counterpart for a choice: label, Select and message with the same aria-invalid/aria-describedby wiring. Handles an empty option list, and portals into a dialog when given a container.",
    render: () => <SelectFieldDemo />,
  },
  {
    id: "textarea",
    name: "Textarea",
    category: "Forms",
    icon: AlignLeft,
    description: "Multi-line text field for longer free-form input, paired with Label.",
    render: () => <TextareaDemo />,
  },
  {
    id: "pagination",
    name: "Pagination",
    category: "Navigation",
    icon: ChevronsLeftRight,
    description:
      "Page-by-page navigation with active state and ellipsis for overflow. Also composed into the Resizable Table's pager.",
    render: () => <PaginationDemo />,
  },
  {
    id: "resizable-table",
    name: "Resizable Table",
    category: "Data Display",
    icon: Table2,
    description:
      "Employee data table with drag-to-resize columns, sortable fields, row selection, CSV/JSON export, and Pagination for paging.",
    render: () => <ResizableTableDemo />,
  },
  {
    id: "page-header",
    name: "Page Header",
    category: "Layout",
    icon: Heading,
    description:
      "The title block every admin screen opens with — title, one-line description, and optional actions that stack full-width on mobile and sit inline from sm:.",
    render: () => <PageHeaderDemo />,
  },
  {
    id: "page-placeholder",
    name: "Page Placeholder",
    category: "Feedback",
    icon: Construction,
    description:
      "Stands in for a screen that is routed and navigable but not built yet, listing what the real screen will do. Used by every scaffolded admin screen.",
    render: () => <PagePlaceholderDemo />,
  },
  {
    id: "table",
    name: "Table",
    category: "Data Display",
    icon: Table2,
    description:
      "The bare shadcn table primitives (Table, TableHeader, TableRow, TableHead, TableCell). Use Data Table for real list screens — this is the styling reference underneath it.",
    render: () => <TableDemo />,
  },
  {
    id: "data-table",
    name: "Data Table",
    category: "Data Display",
    icon: Rows3,
    description:
      "The list surface for admin screens: typed columns, a table from md: up and caller-supplied cards below it, plus built-in loading skeletons and an empty slot. Used by the Clients screen.",
    render: () => <DataTableDemo />,
  },
  {
    id: "confirm-dialog",
    name: "Confirm Dialog",
    category: "Overlays",
    icon: CircleCheck,
    description:
      "Confirmation step for an action that can't be undone. Controlled: it stays open while the request is in flight and closes only when the caller says so, so a failure doesn't vanish the context.",
    render: () => <ConfirmDialogDemo />,
  },
  {
    id: "change-summary",
    name: "Change Summary",
    category: "Overlays",
    icon: ArrowLeftRight,
    description:
      "The now → after list inside a confirmation dialog: one row per field being changed, blanks written as \"Not set\", and values that wrap rather than clip on a phone. Every save on the platform goes through one.",
    render: () => <ChangeSummaryDemo />,
  },
  {
    id: "list-pager",
    name: "List Pager",
    category: "Navigation",
    icon: ListOrdered,
    description:
      "Paging for a list screen, built on Pagination. Renders nothing for a single page, ellipsises long runs, and collapses to a \"Page 2 of 9\" label on mobile.",
    render: () => <ListPagerDemo />,
  },
  {
    id: "filter-tabs",
    name: "Filter Tabs",
    category: "Navigation",
    icon: SlidersHorizontal,
    description:
      "The segmented control list screens filter with — a role=group of aria-pressed chips with optional counts. Full-width tap targets on a phone, inline with the search box from sm:. Used by Clients and Collections.",
    render: () => <FilterTabsDemo />,
  },
  {
    id: "error-card",
    name: "Error Card",
    category: "Feedback",
    icon: ServerCrash,
    description:
      "What a screen shows when its data didn't load: the API's own message where there is one, a retry, and an optional escape route. One component so every list and detail screen fails the same way.",
    render: () => <ErrorCardDemo />,
  },
  {
    id: "form-feedback",
    name: "Form Error & Submit",
    category: "Forms",
    icon: TriangleAlert,
    description:
      "FormError shows the part of an ApiError that isn't attached to a field, and stays silent when every message already found one. SubmitButton is the full-width busy-state submit used by every admin form.",
    render: () => <FormFeedbackDemo />,
  },
  {
    id: "stat-card",
    name: "Stat Card",
    category: "Data Display",
    icon: Gauge,
    description:
      "Metric card with value, period-over-period delta badge, and an optional actions menu. Accepts a custom format() for currency or other units, a static caption instead of a comparison, a loading state that reserves the exact space the number will take, and an unavailable state that shows an em dash rather than loading forever.",
    render: () => <StatCardDemo />,
  },
  {
    id: "dashboard-sidebar",
    name: "Dashboard Sidebar",
    category: "Navigation",
    icon: PanelLeft,
    description:
      "Collapsible app sidebar with grouped nav, nested sub-items, and a ⌘K command palette. Items with an href render as router links; the workspace switcher and bottom menu are replaceable via the header/footer slots (the admin console swaps in branding and an account menu). Collapses to an off-canvas drawer on mobile automatically. This very page uses it.",
    render: () => <DashboardSidebarDemo />,
  },
  {
    id: "empty-state",
    name: "Empty State",
    category: "Feedback",
    icon: Inbox,
    description:
      "Placeholder for a list or page with no data yet, with a title, description, and call-to-action buttons. Built on the official shadcn Empty primitives; this variant adds a decorative animated Marquee.",
    render: () => <EmptyStateDemo />,
  },
  {
    id: "not-found-page",
    name: "Not Found Page",
    category: "Feedback",
    icon: TriangleAlert,
    description:
      "Full-page 404 state with a back-to-home link. Wired into app/root.tsx's ErrorBoundary for real 404 responses — this preview shows the same component standalone.",
    render: () => <NotFoundPageDemo />,
  },
  {
    id: "wave",
    name: "Wave",
    category: "Feedback",
    icon: Waves,
    description:
      "Inline loading indicator (5 animated bars) for buttons, cards, or small regions. Distinct from Skeleton (content placeholder) — use this for an active in-progress state.",
    render: () => <WaveDemo />,
  },
  {
    id: "detail-list",
    name: "Detail List",
    category: "Data Display",
    icon: ScrollText,
    description:
      "Label/value block for detail screens, as a semantic <dl>. Stacks on mobile, two columns from sm: up, with wide rows for long values.",
    render: () => <DetailListDemo />,
  },
  {
    id: "back-link",
    name: "Back Link",
    category: "Navigation",
    icon: ArrowLeft,
    description:
      "The back link on a detail screen or a tabbed frame. Reads its destination from the navigation that opened the screen (backTo()), so it names where somebody actually came from, and renders nothing when they arrived from the sidebar or a pasted link.",
    render: () => <BackLinkDemo />,
  },
  {
    id: "json-viewer",
    name: "JSON Viewer",
    category: "Data Display",
    icon: Braces,
    description:
      "Collapsed disclosure for a raw JSON payload — a gateway response, a client's metadata. Scrolls inside its own box and copies to the clipboard.",
    render: () => <JsonViewerDemo />,
  },
  {
    id: "secret-field",
    name: "Secret Field",
    category: "Data Display",
    icon: KeyRound,
    description:
      "A credential on screen — monospace and wrapping, masked by default, with reveal and copy. Used for client API keys.",
    render: () => <SecretFieldDemo />,
  },
  {
    id: "callout",
    name: "Callout",
    category: "Feedback",
    icon: Megaphone,
    description:
      "An inline note that belongs to the thing beside it, in four tones. Unlike a toast it stays on the page, and unlike FormError it isn't tied to a submit failure.",
    render: () => <CalloutDemo />,
  },
  {
    id: "list-toolbar",
    name: "List Toolbar",
    category: "Data Display",
    icon: ListFilter,
    description:
      "The row above every list screen: a search box that stretches full-width on a phone, and that list's own filters beside it from sm: up.",
    render: () => <ListToolbarDemo />,
  },
  {
    id: "file-tree",
    name: "File Tree",
    category: "Data Display",
    icon: FolderTree,
    description:
      "Collapsible folder and file hierarchy with selection, an expand-all toggle and per-node icons. Built for browsing the contents of an uploaded submission archive.",
    render: () => <FileTreeDemo />,
  },
  {
    id: "toolbar",
    name: "Toolbar",
    category: "Actions",
    icon: Type,
    description:
      "Floating rich-text formatting toolbar: format toggles, highlight and colour, exclusive text-align. Controlled or uncontrolled, with a visible prop that animates it out. Restored from v1; decorative until an editor exists to drive it.",
    render: () => <ToolbarDemo />,
  },
];
