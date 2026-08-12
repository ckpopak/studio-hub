export const YEARLY_SPREADSHEET_ID =
  process.env.YEARLY_SPREADSHEET_ID ??
  "1dLumPx3m2dEZjmkG0GA2IUc9vcpnoN5-Rx82abHyemc";

export const CASHFLOW_SPREADSHEET_ID =
  process.env.CASHFLOW_SPREADSHEET_ID ??
  "1Ub9LDhs1rcm-NTdeIYyCCRgK8oEQ5bSTKGW5Mrs5_vA";

export const YEARLY_TAB = process.env.YEARLY_TAB ?? "OY(hkd)";
export const CASHFLOW_TAB = process.env.CASHFLOW_TAB ?? "_cflow";

/** Rollup / summary rows excluded from category breakdown. */
export const YEARLY_ROLLUP_LABELS = new Set([
  "\u4e0d\u56fa\u5b9a",
  "\u56fa\u5b9a",
  "total exp.",
  "salary",
  "cash flow",
  "buffer",
  "adjustment",
]);
