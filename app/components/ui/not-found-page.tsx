import type { ReactNode } from "react"
import { Link } from "react-router"
import { ArrowLeft, Frown } from "lucide-react"

import { cn } from "~/lib/utils"
import { Button } from "~/components/ui/button"

export interface NotFoundPageProps {
  className?: string
  homeHref?: string
  title?: string
  description?: string
  helperText?: string
  backLabel?: string
  icon?: ReactNode
}

export function NotFoundPage({
  className,
  homeHref = "/",
  title = "404",
  description = "Oops! Page not found",
  helperText = "The page you are looking for might have been removed, had its name changed, or is temporarily unavailable.",
  backLabel = "Back to Home",
  icon,
}: NotFoundPageProps) {
  return (
    <div
      className={cn(
        "animate-in fade-in-0 slide-in-from-bottom-2 flex min-h-[60svh] flex-col items-center justify-center space-y-6 text-center duration-500",
        className
      )}
    >
      <div className="motion-safe:animate-wiggle inline-block">
        {icon ?? <Frown className="mx-auto size-24 text-muted-foreground" />}
      </div>
      <h1 className="text-4xl font-bold text-foreground">{title}</h1>
      <p className="text-xl text-muted-foreground">{description}</p>
      <p className="mx-auto max-w-md text-muted-foreground">{helperText}</p>
      <Button asChild className="mt-4">
        <Link to={homeHref}>
          <ArrowLeft />
          {backLabel}
        </Link>
      </Button>
    </div>
  )
}

export default NotFoundPage
