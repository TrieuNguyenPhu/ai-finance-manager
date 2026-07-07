export type Account = {
  id: string;
  name: string;
  accountType: string;
  currency: string;
  balanceMinor: number;
};

export type LedgerEntry = {
  id: string;
  accountId: string;
  categoryId: string | null;
  entryType: string;
  amountMinor: number;
  currency: string;
  memo: string | null;
  occurredAt: string;
  reversesEntryId: string | null;
};

export type Budget = {
  id: string;
  categoryName: string;
  yearMonth: string;
  limitMinor: number;
  currency: string;
  thresholdPercent: number;
  spentMinor: number;
};

export type DashboardRow = {
  yearMonth: string;
  currency: string;
  incomeMinor: number;
  expenseMinor: number;
  netMinor: number;
};

export type Draft = {
  entryType: string;
  amountMinor: number;
  currency: string;
  memo: string | null;
  categoryHint: string | null;
  confidence: number;
  provenance: string;
  disclaimer: string;
};

export type Profile = {
  userId: string;
  displayName: string | null;
  preferredCurrency: string;
  locale: string;
};
