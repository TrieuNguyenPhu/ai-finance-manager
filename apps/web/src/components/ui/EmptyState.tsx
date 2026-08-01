import { LucideIcon } from "lucide-react";
import { ReactNode } from "react";

export function EmptyState({
  icon: Icon,
  title,
  description,
  action,
}: {
  icon: LucideIcon;
  title: string;
  description?: string;
  action?: ReactNode;
}) {
  return (
    <div className="flex animate-fade-in flex-col items-start justify-center border-y border-border py-12 text-left sm:py-16">
      <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-accent-soft">
        <Icon className="h-5 w-5 text-accent-strong" aria-hidden />
      </div>
      <h2 className="mt-5 font-display text-2xl font-medium text-foreground">{title}</h2>
      {description ? (
        <p className="mt-2 max-w-[55ch] text-sm leading-6 text-muted">{description}</p>
      ) : null}
      {action ? <div className="mt-5">{action}</div> : null}
    </div>
  );
}
