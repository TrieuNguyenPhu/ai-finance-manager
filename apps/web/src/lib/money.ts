const digitsCache = new Map<string, number>();

export type MajorToMinorErrorCode =
  | "required"
  | "invalid_currency"
  | "invalid_format"
  | "fractional_digits"
  | "unsafe_integer";

export type MajorToMinorResult =
  | { ok: true; amountMinor: number }
  | { ok: false; code: MajorToMinorErrorCode; message: string };

function normalizedCurrency(currency: string): string {
  return currency.trim().toUpperCase();
}

function strictCurrencyDigits(currency: string): number | null {
  const normalized = normalizedCurrency(currency);
  if (!/^[A-Z]{3}$/.test(normalized)) return null;

  try {
    return new Intl.NumberFormat("en", {
      style: "currency",
      currency: normalized,
    }).resolvedOptions().maximumFractionDigits ?? 2;
  } catch {
    return null;
  }
}

/** Minor-unit exponent for a currency (VND → 0, USD → 2), resolved via Intl. */
export function currencyDigits(currency: string): number {
  const normalized = normalizedCurrency(currency);
  let digits = digitsCache.get(normalized);
  if (digits === undefined) {
    try {
      digits =
        new Intl.NumberFormat("en", { style: "currency", currency: normalized }).resolvedOptions()
          .maximumFractionDigits ?? 2;
    } catch {
      digits = 2;
    }
    digitsCache.set(normalized, digits);
  }
  return digits;
}

/**
 * Parse a locale-neutral major-unit amount into an exact safe integer.
 *
 * The accepted decimal separator is `.` and grouping/exponent notation is
 * intentionally rejected. Conversion uses strings + BigInt, never floating
 * point arithmetic, before narrowing to a JSON-safe integer.
 */
export function parseMajorToMinor(value: string, currency: string): MajorToMinorResult {
  const raw = value.trim();
  if (!raw) {
    return { ok: false, code: "required", message: "Enter an amount." };
  }

  const normalized = normalizedCurrency(currency);
  const digits = strictCurrencyDigits(normalized);
  if (digits === null) {
    return {
      ok: false,
      code: "invalid_currency",
      message: "Use a valid 3-letter currency code.",
    };
  }

  if (!/^-?\d+(?:\.\d+)?$/.test(raw)) {
    return {
      ok: false,
      code: "invalid_format",
      message: 'Use digits and "." as the decimal separator (for example, 1234.56).',
    };
  }

  const negative = raw.startsWith("-");
  const unsigned = negative ? raw.slice(1) : raw;
  const [whole, fraction = ""] = unsigned.split(".");
  if (fraction.length > digits) {
    return {
      ok: false,
      code: "fractional_digits",
      message:
        digits === 0
          ? `${normalized} does not support decimal places.`
          : `${normalized} supports at most ${digits} decimal place${digits === 1 ? "" : "s"}.`,
    };
  }

  const paddedFraction = fraction.padEnd(digits, "0");
  const minorDigits = `${whole}${paddedFraction}`.replace(/^0+(?=\d)/, "");
  let amountMinor = BigInt(minorDigits);
  if (negative) amountMinor = -amountMinor;

  const maxSafe = BigInt(Number.MAX_SAFE_INTEGER);
  if (amountMinor > maxSafe || amountMinor < -maxSafe) {
    return {
      ok: false,
      code: "unsafe_integer",
      message: "Amount is too large to store safely.",
    };
  }

  return { ok: true, amountMinor: Number(amountMinor) };
}

/** Convert a safe minor-unit integer into an editable, locale-neutral major-unit string. */
export function minorToMajorInput(amountMinor: number, currency: string): string {
  if (!Number.isSafeInteger(amountMinor)) {
    throw new RangeError("amountMinor must be a safe integer");
  }

  const digits = strictCurrencyDigits(currency);
  if (digits === null) {
    throw new RangeError("currency must be a 3-letter currency code");
  }
  const sign = amountMinor < 0 ? "-" : "";
  const raw = Math.abs(amountMinor).toString().padStart(digits + 1, "0");
  if (digits === 0) return `${sign}${raw}`;

  const whole = raw.slice(0, -digits);
  const fraction = raw.slice(-digits);
  return `${sign}${whole}.${fraction}`;
}

/**
 * Format an integer minor-unit amount for display.
 * Display-only conversion — all arithmetic stays in integer minor units.
 */
export function formatMinor(
  amountMinor: number,
  currency: string,
  locale?: string,
): string {
  const normalized = normalizedCurrency(currency);
  const digits = strictCurrencyDigits(normalized);
  if (digits === null) {
    throw new RangeError("currency must be a 3-letter currency code");
  }
  const major = minorToMajorInput(amountMinor, normalized);

  try {
    const formatter = new Intl.NumberFormat(locale, {
      style: "currency",
      currency: normalized,
      currencyDisplay: "code",
      minimumFractionDigits: digits,
      maximumFractionDigits: digits,
    });
    // ECMA-402 accepts decimal strings and preserves their exact mathematical
    // value. TypeScript's older Intl overload still declares only number/bigint.
    return formatter.format(major as unknown as number);
  } catch {
    return `${major} ${normalized}`;
  }
}

/** Format with an explicit sign, e.g. +VND 50,000 / -VND 12,000. */
export function formatSignedMinor(
  amountMinor: number,
  currency: string,
  locale?: string,
): string {
  const abs = formatMinor(Math.abs(amountMinor), currency, locale);
  if (amountMinor < 0) return `-${abs}`;
  if (amountMinor > 0) return `+${abs}`;
  return abs;
}

/** Integer percentage of spent vs limit, clamped to [0, 999]. */
export function percentOf(spentMinor: number, limitMinor: number): number {
  if (!Number.isSafeInteger(spentMinor) || !Number.isSafeInteger(limitMinor)) {
    throw new RangeError("percentage inputs must be safe integers");
  }
  if (spentMinor <= 0 || limitMinor <= 0) return 0;

  const denominator = BigInt(limitMinor);
  const rounded =
    (BigInt(spentMinor) * BigInt(100) + denominator / BigInt(2)) / denominator;
  const maximum = BigInt(999);
  return Number(rounded > maximum ? maximum : rounded);
}
