import { useId } from "react";

import { Input } from "~/components/ui/input";
import { Label } from "~/components/ui/label";
import { Textarea } from "~/components/ui/textarea";

export default function InputPreview() {
  const helperTextId = useId();
  const errorId = useId();
  const searchId = useId();
  const fileId = useId();
  const disabledId = useId();
  const textareaId = useId();
  const disabledTextareaId = useId();

  return (
    <div className="mx-auto flex max-w-3xl flex-col gap-8 p-6 sm:p-10">
      <h1 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
        Input / Textarea — manual QA preview
      </h1>

      <section className="flex flex-col gap-2">
        <Label htmlFor={helperTextId}>Input with helper text</Label>
        <Input id={helperTextId} placeholder="Email" type="email" />
        <p className="mt-2 text-xs text-muted-foreground" role="region" aria-live="polite">
          We won&lsquo;t share your email with anyone
        </p>
      </section>

      <section className="flex flex-col gap-2">
        <Label htmlFor={errorId}>Input with error</Label>
        <Input
          id={errorId}
          className="border-destructive/80 text-destructive focus-visible:border-destructive/80 focus-visible:ring-destructive/20"
          placeholder="Email"
          type="email"
          defaultValue="invalid@email.com"
        />
        <p className="mt-2 text-xs text-destructive" role="alert" aria-live="polite">
          Email is invalid
        </p>
      </section>

      <section className="flex flex-col gap-2">
        <Label htmlFor={searchId}>Search input</Label>
        <Input id={searchId} placeholder="Search modules..." type="search" />
      </section>

      <section className="flex flex-col gap-2">
        <Label htmlFor={fileId}>File input</Label>
        <Input id={fileId} type="file" />
      </section>

      <section className="flex flex-col gap-2">
        <Label htmlFor={disabledId}>Disabled input</Label>
        <Input id={disabledId} placeholder="Not editable" disabled />
      </section>

      <section className="flex flex-col gap-2">
        <Label htmlFor={textareaId}>Simple textarea</Label>
        <Textarea id={textareaId} placeholder="Leave a comment" />
      </section>

      <section className="flex flex-col gap-2">
        <Label htmlFor={disabledTextareaId}>Disabled textarea</Label>
        <Textarea id={disabledTextareaId} placeholder="Not editable" disabled />
      </section>

      <section className="flex flex-col gap-3">
        <h2 className="text-sm font-medium text-gray-700 dark:text-gray-300">Keyboard focus check</h2>
        <p className="text-sm text-gray-600 dark:text-gray-400">
          Tab through the fields above — each should show a visible ring (ring-ring/20) and border color
          change on focus.
        </p>
      </section>
    </div>
  );
}
