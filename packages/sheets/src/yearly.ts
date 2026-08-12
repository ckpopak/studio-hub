import { YEARLY_ROLLUP_LABELS } from "./config";
import { parseAmount } from "./parse";
import type { YearlyLineItem, YearlyMatrix } from "./types";

export function parseYearlyMatrix(
  values: string[][],
  spreadsheetId: string,
  tab: string,
): YearlyMatrix {
  if (!values.length) {
    return { spreadsheetId, tab, months: [], lineItems: [] };
  }

  const header = values[0] ?? [];
  const months = header
    .slice(1)
    .map((h) => String(h ?? "").trim())
    .filter(Boolean);

  const lineItems: YearlyLineItem[] = [];
  for (const row of values.slice(1)) {
    if (!row || row.length === 0) continue;
    const label = String(row[0] ?? "").trim();
    if (!label) continue;

    const amounts: Record<string, number> = {};
    let hasDebt = false;
    for (let i = 0; i < months.length; i++) {
      const amount = parseAmount(row[i + 1]);
      if (amount === null) continue;
      amounts[months[i]] = amount;
      if (amount < 0) hasDebt = true;
    }
    lineItems.push({ label, amounts, hasDebt });
  }

  return { spreadsheetId, tab, months, lineItems };
}

export function findLine(
  matrix: YearlyMatrix,
  label: string,
): YearlyLineItem | undefined {
  return matrix.lineItems.find(
    (item) => item.label.toLowerCase() === label.toLowerCase(),
  );
}

/** Leaf / named lines for a month; excludes rollups and group headers. */
export function monthCategoryBreakdown(
  matrix: YearlyMatrix,
  month: string,
): { label: string; amount: number; isDebt: boolean }[] {
  const groupHeaders = new Set(["\u4e0d\u56fa\u5b9a", "\u56fa\u5b9a"]);
  return matrix.lineItems
    .filter((item) => !YEARLY_ROLLUP_LABELS.has(item.label))
    .filter((item) => !groupHeaders.has(item.label))
    .map((item) => {
      const amount = item.amounts[month];
      if (amount === undefined || amount === 0) return null;
      return { label: item.label, amount, isDebt: amount < 0 };
    })
    .filter(
      (x): x is { label: string; amount: number; isDebt: boolean } => x !== null,
    );
}
