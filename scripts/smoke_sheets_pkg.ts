import path from "node:path";
import { SheetsClient, buildDashboardSummary } from "../packages/sheets/src/index";

process.env.GOOGLE_APPLICATION_CREDENTIALS = path.resolve(
  ".secrets/finsheet-reader.json",
);

async function main() {
  const client = new SheetsClient();
  const [y, cf] = await Promise.all([
    client.fetchYearly(),
    client.fetchCashflow(),
  ]);
  const s = buildDashboardSummary(y, cf);
  console.log(
    JSON.stringify(
      {
        months: y.months.length,
        lines: y.lineItems.length,
        rows: cf.rows.length,
        month: s.selectedMonth,
        salary: s.month.salary,
        cashFlow: s.month.cashFlow,
        bal: s.month.latestBal,
        categories: s.month.categories.length,
      },
      null,
      2,
    ),
  );
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
