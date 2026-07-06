import { motion } from "framer-motion";
import * as React from "react";

import { cn } from "~/lib/utils";

export interface LoaderOneProps extends React.HTMLAttributes<HTMLDivElement> {
  /** Screen-reader-only text announced while the loader is visible. */
  label?: string;
}

const LoaderOne = React.forwardRef<HTMLDivElement, LoaderOneProps>(
  ({ className, label = "Loading", ...props }, ref) => {
    return (
      <div
        ref={ref}
        role="status"
        aria-live="polite"
        className={cn("flex items-center justify-center gap-1", className)}
        {...props}
      >
        <span className="sr-only">{label}</span>
        {[...Array(3)].map((_, i) => (
          <motion.div
            key={i}
            aria-hidden="true"
            className="h-3 w-3 rounded-full bg-primary"
            initial={{ x: 0 }}
            animate={{
              x: [0, 10, 0],
              opacity: [0.5, 1, 0.5],
              scale: [1, 1.2, 1],
            }}
            transition={{
              duration: 1,
              repeat: Infinity,
              delay: i * 0.2,
            }}
          />
        ))}
      </div>
    );
  },
);
LoaderOne.displayName = "LoaderOne";

export { LoaderOne };
