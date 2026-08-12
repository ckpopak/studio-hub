import path from "node:path";
import { SheetsClient } from "../packages/sheets/src/index";

process.env.GOOGLE_APPLICATION_CREDENTIALS = path.resolve(
  ".secrets/finsheet-reader.json",
);

async function main() {
  const client = new SheetsClient();
  try {
    const row = await client.appendCashflow({
      marker: "probe",
      in: null,
      out: 0.01,
      note: "finsheet write probe - safe to delete",
    });
    console.log("WRITE_OK", row);
  } catch (err) {
    console.error("WRITE_FAIL", err instanceof Error ? err.message : err);
    process.exit(2);
  }
}

main();
