import { AlertCircle, CheckCircle2, Info } from "lucide-react";
import { ReactNode } from "react";
import { cn } from "@/lib/cn";

type Tone = "error" | "success" | "info";

const tones: Record<Tone, { box: string; Icon: typeof Info }> = {
  error: { box: "border-negative/30 bg-negative/8 text-negative", Icon: AlertCircle },
  success: { box: "border-positive/30 bg-positive/8 text-positive", Icon: CheckCircle2 },
  info: { box: "border-accent/30 bg-accent-soft/60 text-accent-strong dark:text-accent", Icon: Info },
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
        "flex items-start gap-2.5 rounded-xl border px-4 py-3 text-sm animate-fade-up",
        box,
        className,
      )}
    >
      <Icon className="mt-0.5 h-4 w-4 shrink-0" />
      <div className="min-w-0 break-words">{children}</div>
    </div>
  );
}
