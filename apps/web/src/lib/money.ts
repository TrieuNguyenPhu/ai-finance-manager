const digitsCache = new Map<string, number>();

/** Minor-unit exponent for a currency (VND → 0, USD → 2), resolved via Intl. */
export function currencyDigits(currency: string): number {
  let digits = digitsCache.get(currency);
  if (digits === undefined) {
    try {
      digits =
        new Intl.NumberFormat("en", { style: "currency", currency }).resolvedOptions()
          .maximumFractionDigits ?? 2;
    } catch {
      digits = 2;
    }
    digitsCache.set(currency, digits);
  }
  return digits;
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
  try {
    const digits = currencyDigits(currency);
    return new Intl.NumberFormat(locale, {
      style: "currency",
      currency,
      currencyDisplay: "code",
    }).format(amountMinor / 10 ** digits);
  } catch {
    return `${amountMinor.toLocaleString()} ${currency}`;
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
  if (limitMinor <= 0) return 0;
  return Math.min(999, Math.round((spentMinor / limitMinor) * 100));
}
