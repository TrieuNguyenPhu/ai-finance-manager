import { cn } from "@/lib/cn";

/** Budget usage bar: teal under threshold, amber near it, red over limit. */
export function ProgressBar({
  percent,
  thresholdPercent,
  label = "Budget used",
  className,
}: {
  percent: number;
  thresholdPercent?: number;
  label?: string;
  className?: string;
}) {
  const normalizedPercent = Number.isFinite(percent) ? percent : 0;
  const boundedPercent = Math.min(100, Math.max(0, normalizedPercent));
  const over = normalizedPercent >= 100;
  const nearLimit =
    !over && thresholdPercent !== undefined && normalizedPercent >= thresholdPercent;
  return (
    <div
      role="progressbar"
      aria-valuenow={boundedPercent}
      aria-valuemin={0}
      aria-valuemax={100}
      aria-label={label}
      className={cn("h-2 w-full overflow-hidden rounded-full bg-surface-2", className)}
    >
      <div
        className={cn(
          "h-full origin-left rounded-full transition-transform duration-500 ease-out",
          over ? "bg-negative" : nearLimit ? "bg-warning" : "bg-accent-strong",
        )}
        style={{ transform: `scaleX(${boundedPercent / 100})` }}
      />
    </div>
  );
}
