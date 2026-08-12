import { latestBalance, recentCashflow } from "./cashflow";
import { pickDefaultMonth } from "./parse";
import { findLine, monthCategoryBreakdown } from "./yearly";
import type {
  CashflowLedger,
  DashboardSummary,
  MonthSummary,
  YearlyMatrix,
} from "./types";

export function buildMonthSummary(
  matrix: YearlyMatrix,
  ledger: CashflowLedger,
  month: string,
): MonthSummary {
  const salary = findLine(matrix, "salary")?.amounts[month] ?? null;
  const totalExp = findLine(matrix, "total exp.")?.amounts[month] ?? null;
  const cashFlow = findLine(matrix, "cash flow")?.amounts[month] ?? null;
  return {
    month,
    salary,
    totalExp,
    cashFlow,
    isDebt: cashFlow !== null && cashFlow < 0,
    latestBal: latestBalance(ledger),
    categories: monthCategoryBreakdown(matrix, month),
  };
}

export function buildDashboardSummary(
  matrix: YearlyMatrix,
  ledger: CashflowLedger,
  options?: { month?: string; recentLimit?: number },
): DashboardSummary {
  const selectedMonth =
    options?.month && matrix.months.includes(options.month)
      ? options.month
      : pickDefaultMonth(matrix.months);

  const cashFlowLine = findLine(matrix, "cash flow");
  const cashFlowTrend = matrix.months.map((m) => ({
    month: m,
    value: cashFlowLine?.amounts[m] ?? null,
  }));

  return {
    selectedMonth,
    months: matrix.months,
    month: buildMonthSummary(matrix, ledger, selectedMonth),
    cashFlowTrend,
    recentCashflow: recentCashflow(ledger, options?.recentLimit ?? 25),
  };
}
