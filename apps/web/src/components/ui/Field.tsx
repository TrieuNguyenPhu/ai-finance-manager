import {
  InputHTMLAttributes,
  ReactNode,
  SelectHTMLAttributes,
  cloneElement,
  isValidElement,
  useId,
} from "react";
import { ChevronDown } from "lucide-react";
import { cn } from "@/lib/cn";

const controlClass =
  "h-11 w-full rounded-lg border border-border bg-surface px-3 text-sm text-foreground outline-2 outline-transparent transition-[background-color,border-color] duration-150 placeholder:text-muted/70 hover:border-muted/70 focus:border-accent focus:outline-focus focus:outline-offset-1 disabled:cursor-not-allowed disabled:bg-surface-2 disabled:opacity-55 aria-invalid:border-negative aria-invalid:focus:outline-negative";

export function Input({ className, ...props }: InputHTMLAttributes<HTMLInputElement>) {
  return <input className={cn(controlClass, className)} {...props} />;
}

export function Select({ className, ...props }: SelectHTMLAttributes<HTMLSelectElement>) {
  return (
    <span className="relative block">
      <select
        className={cn(controlClass, "peer appearance-none pr-9", className)}
        {...props}
      />
      <ChevronDown
        aria-hidden
        className="pointer-events-none absolute top-1/2 right-3 h-4 w-4 -translate-y-1/2 text-muted peer-disabled:opacity-40"
      />
    </span>
  );
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
  const hintId = hint ? `${id}-hint` : undefined;
  const control = children(id);
  const describedControl =
    hintId && isValidElement<{ "aria-describedby"?: string }>(control)
      ? cloneElement(control, {
          "aria-describedby": control.props["aria-describedby"]
            ? `${control.props["aria-describedby"]} ${hintId}`
            : hintId,
        })
      : control;
  return (
    <div className={cn("flex flex-col gap-1.5", className)}>
      <label htmlFor={id} className="text-xs font-semibold text-foreground">
        {label}
      </label>
      {describedControl}
      {hint ? (
        <p id={hintId} className="min-h-[1lh] text-xs leading-5 text-muted">
          {hint}
        </p>
      ) : null}
    </div>
  );
}
