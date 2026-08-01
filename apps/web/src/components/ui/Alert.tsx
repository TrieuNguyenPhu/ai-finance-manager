import { AlertCircle, CheckCircle2, Info, TriangleAlert } from "lucide-react";
import { ReactNode } from "react";
import { cn } from "@/lib/cn";

type Tone = "error" | "success" | "info" | "warning";

const tones: Record<Tone, { box: string; Icon: typeof Info }> = {
  error: { box: "border-negative/30 bg-negative/8 text-negative", Icon: AlertCircle },
  success: { box: "border-positive/30 bg-positive/8 text-positive", Icon: CheckCircle2 },
  info: { box: "border-accent/30 bg-accent-soft/60 text-accent-strong dark:text-accent", Icon: Info },
  warning: { box: "border-warning/30 bg-warning/8 text-warning", Icon: TriangleAlert },
};

export function Alert({
  tone,
  children,
  className,
}: {
  tone: Tone;
  children: ReactNode;
  className?: string;
}) {
  const { box, Icon } = tones[tone];
  return (
    <div
      role={tone === "error" ? "alert" : "status"}
      className={cn(
        "flex animate-fade-up items-start gap-2.5 rounded-lg border px-4 py-3 text-sm leading-6",
        box,
        className,
      )}
    >
      <Icon className="mt-0.5 h-4 w-4 shrink-0" aria-hidden />
      <div className="min-w-0 break-words">{children}</div>
    </div>
  );
}
