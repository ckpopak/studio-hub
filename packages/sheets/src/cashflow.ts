import { parseAmount } from "./parse";
import type { CashflowLedger, CashflowRow } from "./types";

function hasAmount(row: CashflowRow): boolean {
  return row.bal !== null || row.in !== null || row.out !== null;
}

/**
 * Parse B(M) `_cflow` using the primary left BAL/IN/OUT block + note column.
 * Skips marker-only rows with no numeric amounts.
 */
export function parseCashflowLedger(
  values: string[][],
  spreadsheetId: string,
  tab: string,
): CashflowLedger {
  const rows: CashflowRow[] = [];
  // Skip header row if it looks like BAL/IN/OUT
  const start =
    values[0] &&
    String(values[0][1] ?? "")
      .toUpperCase()
      .includes("BAL")
      ? 1
      : 0;

  for (const raw of values.slice(start)) {
    if (!raw) continue;
    const marker = String(raw[0] ?? "").trim();
    const bal = parseAmount(raw[1]);
    const inn = parseAmount(raw[2]);
    const out = parseAmount(raw[3]);
    const note = String(raw[4] ?? "").trim();
    const row: CashflowRow = { marker, bal, in: inn, out, note };
    if (!hasAmount(row) && !note) continue;
    if (!hasAmount(row)) continue; // ignore N_M markers with no values
    rows.push(row);
  }

  return { spreadsheetId, tab, rows };
}

export function latestBalance(ledger: CashflowLedger): number | null {
  for (let i = ledger.rows.length - 1; i >= 0; i--) {
    const bal = ledger.rows[i]?.bal;
    if (bal !== null && bal !== undefined) return bal;
  }
  return null;
}

export function recentCashflow(
  ledger: CashflowLedger,
  limit: number,
): CashflowRow[] {
  if (limit <= 0) return [];
  return ledger.rows.slice(-limit).reverse();
}
