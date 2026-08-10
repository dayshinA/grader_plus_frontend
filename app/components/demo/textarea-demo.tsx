import { useId } from "react";

import { Label } from "~/components/ui/label";
import { Textarea } from "~/components/ui/textarea";

export function TextareaDemo() {
  const id = useId();
  return (
    <div className="min-w-0 max-w-sm space-y-2">
      <Label htmlFor={id}>Simple textarea</Label>
      <Textarea id={id} placeholder="Leave a comment" />
    </div>
  );
}
