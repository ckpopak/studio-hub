import { YEARLY_ROLLUP_LABELS } from "./config";
import { parseAmount } from "./parse";
import type {
  YearlyAmountUpdate,
  YearlyLineItem,
  YearlyMatrix,
} from "./types";

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

/** 1-based column number ? A, B, ... Z, AA */
export function columnIndexToLetter(colNumber: number): string {
  let n = colNumber;
  let s = "";
  while (n > 0) {
    const rem = (n - 1) % 26;
    s = String.fromCharCode(65 + rem) + s;
    n = Math.floor((n - 1) / 26);
  }
  return s;
}

export function yearlyUpdateA1(
  tab: string,
  values: string[][],
  update: YearlyAmountUpdate,
): { range: string; amount: number; label: string; month: string } {
  const label = update.label.trim();
  if (!label) throw new Error("Label is required");
  if (!Number.isFinite(update.amount)) throw new Error("Invalid amount");
  if (!values.length) throw new Error("Yearly sheet is empty");

  const months = (values[0] ?? [])
    .slice(1)
    .map((h) => String(h ?? "").trim())
    .filter(Boolean);
  const monthIndex = months.findIndex((m) => m === update.month);
  if (monthIndex < 0) throw new Error(`Unknown month: ${update.month}`);

  let rowNumber = -1;
  for (let i = 1; i < values.length; i++) {
    const rowLabel = String(values[i]?.[0] ?? "").trim();
    if (rowLabel.toLowerCase() === label.toLowerCase()) {
      rowNumber = i + 1;
      break;
    }
  }
  if (rowNumber < 0) throw new Error(`Unknown line item: ${label}`);

  const col = columnIndexToLetter(monthIndex + 2);
  return {
    range: `'${tab}'!${col}${rowNumber}`,
    amount: update.amount,
    label,
    month: months[monthIndex],
  };
}
