import { ReactNode } from "react";

export function PageHeader({
  title,
  description,
  actions,
}: {
  title: string;
  description?: string;
  actions?: ReactNode;
}) {
  return (
    <header className="animate-fade-up border-b border-border pb-5 sm:flex sm:items-end sm:justify-between sm:gap-8 sm:pb-6">
      <div className="min-w-0">
        <h1 className="font-display text-3xl font-medium leading-none text-foreground sm:text-4xl">
          {title}
        </h1>
        {description ? (
          <p className="mt-2 max-w-[65ch] text-sm leading-6 text-muted">{description}</p>
        ) : null}
      </div>
      {actions ? <div className="mt-4 flex items-center gap-2 sm:mt-0">{actions}</div> : null}
    </header>
  );
}
