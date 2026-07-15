import { cn } from "@/lib/cn";

/** Budget usage bar: teal under threshold, amber near it, red over limit. */
export function ProgressBar({
  percent,
  thresholdPercent,
  className,
}: {
  percent: number;
  thresholdPercent?: number;
  className?: string;
}) {
  const over = percent >= 100;
  const nearLimit = !over && thresholdPercent !== undefined && percent >= thresholdPercent;
  return (
    <div
      role="progressbar"
      aria-valuenow={Math.min(percent, 100)}
      aria-valuemin={0}
      aria-valuemax={100}
      className={cn("h-2 w-full overflow-hidden rounded-full bg-surface-2", className)}
    >
      <div
        className={cn(
          "h-full rounded-full transition-[width] duration-700 ease-out",
          over ? "bg-negative" : nearLimit ? "bg-warning" : "bg-accent-strong",
        )}
        style={{ width: `${Math.min(percent, 100)}%` }}
      />
    </div>
  );
}
