import { cn } from "~/lib/utils"

const WAVE_BAR_HEIGHTS = ["50%", "75%", "100%", "75%", "50%"] as const

function Wave({ className, ...props }: React.ComponentProps<"span">) {
  return (
    <span role="status" className={cn("inline-flex items-center gap-[2.5%]", className)} {...props}>
      {WAVE_BAR_HEIGHTS.map((height, index) => (
        <span
          key={index}
          aria-hidden="true"
          className="animate-wave inline-block rounded-full bg-current"
          style={{
            width: "12.5%",
            height,
            animationDelay: `calc(var(--delay, 100ms) * ${index})`,
          }}
        />
      ))}
      <span className="sr-only">Loading</span>
    </span>
  )
}

export { Wave }

export default Wave
