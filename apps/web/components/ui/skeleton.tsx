import { cn } from "@/lib/utils";

/**
 * Skeleton Component
 * Used for creating placeholder loading UI
 */
function Skeleton({
  className,
  ...props
}: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn("animate-pulse rounded-md bg-muted", className)}
      {...props}
    />
  );
}

export { Skeleton }; 