import { LoaderCircle, Mail } from "lucide-react";
import { useState } from "react";

import { Button } from "~/components/ui/button";

const variants = ["default", "destructive", "outline", "secondary", "ghost", "link"] as const;
const sizes = ["default", "sm", "lg"] as const;

export default function ButtonPreview() {
  const [isLoading, setIsLoading] = useState(false);

  const handleLoadingClick = () => {
    setIsLoading(true);
    setTimeout(() => setIsLoading(false), 1000);
  };

  return (
    <div className="mx-auto flex max-w-3xl flex-col gap-8 p-6 sm:p-10">
      <h1 className="text-lg font-semibold text-gray-900 dark:text-gray-100">Button — manual QA preview</h1>

      <section className="flex flex-col gap-3">
        <h2 className="text-sm font-medium text-gray-700 dark:text-gray-300">Variants (default size)</h2>
        <div className="flex flex-wrap gap-3">
          {variants.map((variant) => (
            <Button key={variant} variant={variant}>
              {variant}
            </Button>
          ))}
        </div>
      </section>

      <section className="flex flex-col gap-3">
        <h2 className="text-sm font-medium text-gray-700 dark:text-gray-300">Sizes (default variant)</h2>
        <div className="flex flex-wrap items-center gap-3">
          {sizes.map((size) => (
            <Button key={size} size={size}>
              {size}
            </Button>
          ))}
          <Button size="icon" aria-label="Send email">
            <Mail />
          </Button>
        </div>
      </section>

      <section className="flex flex-col gap-3">
        <h2 className="text-sm font-medium text-gray-700 dark:text-gray-300">Disabled</h2>
        <div className="flex flex-wrap gap-3">
          {variants.map((variant) => (
            <Button key={variant} variant={variant} disabled>
              {variant}
            </Button>
          ))}
        </div>
      </section>

      <section className="flex flex-col gap-3">
        <h2 className="text-sm font-medium text-gray-700 dark:text-gray-300">Loading state (async pattern)</h2>
        <Button
          onClick={handleLoadingClick}
          disabled={isLoading}
          data-loading={isLoading}
          className="group relative disabled:opacity-100"
        >
          <span className="group-data-[loading=true]:text-transparent">Click me</span>
          {isLoading && (
            <div className="absolute inset-0 flex items-center justify-center">
              <LoaderCircle className="animate-spin" size={16} strokeWidth={2} aria-hidden="true" />
            </div>
          )}
        </Button>
      </section>

      <section className="flex flex-col gap-3">
        <h2 className="text-sm font-medium text-gray-700 dark:text-gray-300">asChild (renders as an anchor, not a button)</h2>
        <Button asChild variant="link">
          <a href="/">Go home</a>
        </Button>
      </section>

      <section className="flex flex-col gap-3">
        <h2 className="text-sm font-medium text-gray-700 dark:text-gray-300">Keyboard focus check</h2>
        <p className="text-sm text-gray-600 dark:text-gray-400">
          Tab through the buttons above — each should show a visible focus ring (outline-ring/70).
        </p>
      </section>
    </div>
  );
}
