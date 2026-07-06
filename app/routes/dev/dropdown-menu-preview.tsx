import { useState } from "react";
import { ChevronDown } from "lucide-react";

import { Button } from "~/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuCheckboxItem,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuSeparator,
  DropdownMenuShortcut,
  DropdownMenuSub,
  DropdownMenuSubContent,
  DropdownMenuSubTrigger,
  DropdownMenuTrigger,
} from "~/components/ui/dropdown-menu";

export default function DropdownMenuPreview() {
  const [showBookmarks, setShowBookmarks] = useState(true);
  const [showHistory, setShowHistory] = useState(false);
  const [view, setView] = useState("list");

  return (
    <main className="flex min-h-screen flex-col gap-10 bg-background p-10 text-foreground">
      <h1 className="text-xl font-semibold">DropdownMenu preview</h1>

      <section className="flex flex-col gap-3">
        <h2 className="text-sm font-medium text-muted-foreground">
          Default — matches trigger width
        </h2>
        <div className="min-w-75">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline">
                Same width of trigger
                <ChevronDown
                  className="-me-1 ms-2 opacity-60"
                  size={16}
                  strokeWidth={2}
                  aria-hidden="true"
                />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent className="min-w-[--radix-dropdown-menu-trigger-width]">
              <DropdownMenuItem>Option 1</DropdownMenuItem>
              <DropdownMenuItem>Option 2</DropdownMenuItem>
              <DropdownMenuItem>Option 3</DropdownMenuItem>
              <DropdownMenuItem disabled>Option 4 (disabled)</DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </section>

      <section className="flex flex-col gap-3">
        <h2 className="text-sm font-medium text-muted-foreground">
          Full surface — label, separator, shortcut, submenu, checkbox items, radio group
        </h2>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="secondary">Actions</Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent className="w-56">
            <DropdownMenuLabel>My Account</DropdownMenuLabel>
            <DropdownMenuSeparator />
            <DropdownMenuItem>
              Profile
              <DropdownMenuShortcut>⇧⌘P</DropdownMenuShortcut>
            </DropdownMenuItem>
            <DropdownMenuItem>
              Billing
              <DropdownMenuShortcut>⌘B</DropdownMenuShortcut>
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuCheckboxItem checked={showBookmarks} onCheckedChange={setShowBookmarks}>
              Show Bookmarks
            </DropdownMenuCheckboxItem>
            <DropdownMenuCheckboxItem checked={showHistory} onCheckedChange={setShowHistory}>
              Show History
            </DropdownMenuCheckboxItem>
            <DropdownMenuSeparator />
            <DropdownMenuRadioGroup value={view} onValueChange={setView}>
              <DropdownMenuLabel>View</DropdownMenuLabel>
              <DropdownMenuRadioItem value="list">List</DropdownMenuRadioItem>
              <DropdownMenuRadioItem value="grid">Grid</DropdownMenuRadioItem>
            </DropdownMenuRadioGroup>
            <DropdownMenuSeparator />
            <DropdownMenuSub>
              <DropdownMenuSubTrigger>More options</DropdownMenuSubTrigger>
              <DropdownMenuSubContent>
                <DropdownMenuItem>Export</DropdownMenuItem>
                <DropdownMenuItem>Duplicate</DropdownMenuItem>
              </DropdownMenuSubContent>
            </DropdownMenuSub>
          </DropdownMenuContent>
        </DropdownMenu>
      </section>

      <section className="mt-10 flex flex-col gap-3 bg-gray-900 p-6 dark:bg-gray-900">
        <h2 className="text-sm font-medium text-gray-300">On a dark surface</h2>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="outline">Open menu</Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent>
            <DropdownMenuItem>Option 1</DropdownMenuItem>
            <DropdownMenuItem>Option 2</DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </section>
    </main>
  );
}
