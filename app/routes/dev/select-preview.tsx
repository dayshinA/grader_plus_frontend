import { useState } from "react";

import { Label } from "~/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectLabel,
  SelectGroup,
  SelectSeparator,
  SelectTrigger,
  SelectValue,
} from "~/components/ui/select";

export default function SelectPreview() {
  const [role, setRole] = useState<string | undefined>(undefined);

  return (
    <main className="flex min-h-screen flex-col gap-10 bg-background p-10 text-foreground">
      <h1 className="text-xl font-semibold">Select preview</h1>

      <section className="flex max-w-xs flex-col gap-3">
        <h2 className="text-sm font-medium text-muted-foreground">
          Uncontrolled, with placeholder
        </h2>
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="preview-role">Role</Label>
          <Select>
            <SelectTrigger id="preview-role">
              <SelectValue placeholder="Select a role" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="coordinator">Coordinator</SelectItem>
              <SelectItem value="marker">Marker</SelectItem>
              <SelectItem value="super_admin">Super Admin</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </section>

      <section className="flex max-w-xs flex-col gap-3">
        <h2 className="text-sm font-medium text-muted-foreground">
          Controlled, with a group/label/separator and a disabled item
        </h2>
        <Select value={role} onValueChange={setRole}>
          <SelectTrigger>
            <SelectValue placeholder="Select a role" />
          </SelectTrigger>
          <SelectContent>
            <SelectGroup>
              <SelectLabel>Roles</SelectLabel>
              <SelectItem value="coordinator">Coordinator</SelectItem>
              <SelectItem value="marker">Marker</SelectItem>
            </SelectGroup>
            <SelectSeparator />
            <SelectItem value="super_admin">Super Admin</SelectItem>
            <SelectItem value="disabled-example" disabled>
              Disabled option
            </SelectItem>
          </SelectContent>
        </Select>
        <p className="text-xs text-muted-foreground">value: {role ?? "(none)"}</p>
      </section>

      <section className="flex max-w-xs flex-col gap-3">
        <h2 className="text-sm font-medium text-muted-foreground">Disabled trigger</h2>
        <Select disabled>
          <SelectTrigger>
            <SelectValue placeholder="Select a role" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="coordinator">Coordinator</SelectItem>
          </SelectContent>
        </Select>
      </section>
    </main>
  );
}
