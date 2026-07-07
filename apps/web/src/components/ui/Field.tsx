import { InputHTMLAttributes, ReactNode, SelectHTMLAttributes, useId } from "react";
import { cn } from "@/lib/cn";

const controlClass =
  "h-10 w-full rounded-lg border border-border bg-surface px-3 text-sm text-foreground shadow-[inset_0_1px_2px_rgb(0_0_0/0.03)] transition-colors duration-200 placeholder:text-muted/70 hover:border-muted/50 focus:border-accent focus:outline-2 focus:outline-offset-1 focus:outline-accent/30";

export function Input({ className, ...props }: InputHTMLAttributes<HTMLInputElement>) {
  return <input className={cn(controlClass, className)} {...props} />;
}

export function Select({ className, ...props }: SelectHTMLAttributes<HTMLSelectElement>) {
  return <select className={cn(controlClass, "appearance-none", className)} {...props} />;
}

type FieldProps = {
  label: string;
  hint?: string;
  children: (id: string) => ReactNode;
  className?: string;
};

/** Label + control wrapper that wires the `for`/`id` pair automatically. */
export function Field({ label, hint, children, className }: FieldProps) {
  const id = useId();
  return (
    <div className={cn("flex flex-col gap-1.5", className)}>
      <label htmlFor={id} className="text-xs font-medium text-muted">
        {label}
      </label>
      {children(id)}
      {hint ? <p className="text-[11px] text-muted/80">{hint}</p> : null}
    </div>
  );
}
