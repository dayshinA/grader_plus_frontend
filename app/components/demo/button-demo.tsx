import { Button } from "~/components/ui/button";

export function ButtonDemo() {
  return (
    <div className="flex flex-wrap gap-2">
      <Button variant="default">Default Button</Button>
      <Button variant="secondary">Secondary Button</Button>
      <Button variant="outline">Outline Button</Button>
      <Button variant="ghost">Ghost Button</Button>
      <Button variant="link">Link Button</Button>
      <Button variant="destructive">Destructive Button</Button>
    </div>
  );
}
