import path from "node:path";
import { SheetsClient } from "../packages/sheets/src/index";

process.env.GOOGLE_APPLICATION_CREDENTIALS = path.resolve(
  ".secrets/finsheet-reader.json",
);

async function main() {
  const client = new SheetsClient();
  const matrix = await client.fetchYearly();
  const month = matrix.months.includes("Aug26")
    ? "Aug26"
    : matrix.months[matrix.months.length - 1];
  const line = matrix.lineItems.find((i) => i.label === "buffer");
  if (!line) throw new Error("buffer line not found");
  const before = line.amounts[month] ?? 0;
  const probe = before; // write same value — no net change
  const result = await client.updateYearlyAmount({
    label: "buffer",
    month,
    amount: probe,
  });
  console.log("YEARLY_WRITE_OK", result, { before });
}

main().catch((err) => {
  console.error("YEARLY_WRITE_FAIL", err instanceof Error ? err.message : err);
  process.exit(2);
});
