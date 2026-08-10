import { MoreHorizontal, Pin, Settings, Share2, Trash, TriangleAlert } from "lucide-react";

import { Button } from "~/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "~/components/ui/dropdown-menu";
import { StatCard, type StatCardData } from "~/components/ui/stat-card";

const stats: StatCardData[] = [
  { title: "All Orders", value: 122380, delta: 15.1, lastMonth: 105922 },
  { title: "Order Created", value: 1902380, delta: -2.0, lastMonth: 2002098 },
  {
    title: "Organic Sales",
    value: 98_100_000,
    delta: 0.4,
    lastMonth: 97_800_000,
    format: (v) => `$${(v / 1_000_000).toFixed(1)}M`,
  },
  { title: "Active Users", value: 48210, delta: 3.7, lastMonth: 46480 },
];

function StatCardActions() {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="icon" className="-me-1.5">
          <MoreHorizontal />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        <DropdownMenuItem>
          <Settings />
          Settings
        </DropdownMenuItem>
        <DropdownMenuItem>
          <TriangleAlert />
          Add alert
        </DropdownMenuItem>
        <DropdownMenuItem>
          <Pin />
          Pin to dashboard
        </DropdownMenuItem>
        <DropdownMenuItem>
          <Share2 />
          Share
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        <DropdownMenuItem variant="destructive">
          <Trash />
          Remove
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

export function StatCardDemo() {
  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {stats.map((stat) => (
          <StatCard key={stat.title} stat={stat} actions={<StatCardActions />} />
        ))}
      </div>

      <div>
        <p className="mb-2 text-xs font-medium tracking-wide text-muted-foreground uppercase">
          Loading, and with a caption instead of a comparison
        </p>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <StatCard stat={{ title: "Wallet float", caption: "Held across all client wallets" }} loading />
          <StatCard
            stat={{
              title: "Pending transfers",
              value: 7,
              caption: "Waiting on an admin decision",
            }}
          />
          <StatCard
            stat={{ title: "Wallet float", caption: "Couldn't load this figure" }}
            unavailable
          />
        </div>
      </div>
    </div>
  );
}
