export type YearlyLineItem = {
  label: string;
  /** Month key (e.g. Dec25) -> amount in HKD. */
  amounts: Record<string, number>;
  /** True when any amount is negative (cash out / debt). */
  hasDebt: boolean;
};

export type YearlyMatrix = {
  spreadsheetId: string;
  tab: string;
  months: string[];
  lineItems: YearlyLineItem[];
};

export type CashflowRow = {
  /** Day/month marker such as 28_M, 7Mar, Mar — may be empty. */
  marker: string;
  bal: number | null;
  in: number | null;
  out: number | null;
  note: string;
};

export type CashflowLedger = {
  spreadsheetId: string;
  tab: string;
  rows: CashflowRow[];
};

/** Input for appending a B(M) cash movement (BAL computed server-side). */
export type CashflowAppendInput = {
  marker?: string;
  in?: number | null;
  out?: number | null;
  note?: string;
  /** If set, overrides computed BAL = previous + in - out. */
  bal?: number | null;
};

/** Update one B(Y) cell: line label × month column. */
export type YearlyAmountUpdate = {
  label: string;
  month: string;
  amount: number;
};

export type MonthSummary = {
  month: string;
  salary: number | null;
  totalExp: number | null;
  cashFlow: number | null;
  /** cashFlow < 0 means debt / cash shortfall. */
  isDebt: boolean;
  latestBal: number | null;
  categories: { label: string; amount: number; isDebt: boolean }[];
};

export type DashboardSummary = {
  selectedMonth: string;
  months: string[];
  month: MonthSummary;
  cashFlowTrend: { month: string; value: number | null }[];
  recentCashflow: CashflowRow[];
};
