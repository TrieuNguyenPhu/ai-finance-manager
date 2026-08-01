"use client";

import { useId } from "react";
import { Input } from "@/components/ui/Field";
import { currencyDigits } from "@/lib/money";

type MoneyInputProps = {
  label: string;
  value: string;
  currency: string;
  onChange: (value: string) => void;
  onBlur?: () => void;
  error?: string | null;
  disabled?: boolean;
  required?: boolean;
};

function amountHint(currency: string): string {
  if (!currency) return "Choose an account to set the currency.";
  if (!/^[A-Z]{3}$/.test(currency)) return "Use a 3-letter currency code first.";

  const digits = currencyDigits(currency);
  if (digits === 0) return `Enter the amount in ${currency}; decimals are not supported.`;
  return `Enter the amount in ${currency} using "." for up to ${digits} decimal places.`;
}

/** Major-unit text input; callers parse it exactly before sending minor units. */
export function MoneyInput({
  label,
  value,
  currency,
  onChange,
  onBlur,
  error,
  disabled = false,
  required = false,
}: MoneyInputProps) {
  const id = useId();
  const descriptionId = `${id}-description`;
  const digits = currency ? currencyDigits(currency) : 2;

  return (
    <div className="flex flex-col gap-1.5">
      <label htmlFor={id} className="text-xs font-semibold text-foreground">
        {label} {currency ? <span className="text-muted">({currency})</span> : null}
      </label>
      <Input
        id={id}
        type="text"
        inputMode={digits === 0 ? "numeric" : "decimal"}
        autoComplete="off"
        spellCheck={false}
        value={value}
        onChange={(event) => onChange(event.target.value)}
        onBlur={onBlur}
        placeholder={currency ? (digits === 0 ? "45000" : "45.00") : "Select an account first"}
        aria-describedby={descriptionId}
        aria-invalid={error ? true : undefined}
        disabled={disabled}
        required={required}
      />
      <p
        id={descriptionId}
        role={error ? "alert" : undefined}
        className={
          error
            ? "min-h-[1lh] text-xs leading-5 text-negative"
            : "min-h-[1lh] text-xs leading-5 text-muted"
        }
      >
        {error ?? amountHint(currency)}
      </p>
    </div>
  );
}
