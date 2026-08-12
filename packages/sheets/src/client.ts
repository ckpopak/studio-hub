import { google, sheets_v4 } from "googleapis";
import { GoogleAuth, JWT } from "google-auth-library";
import { existsSync, readFileSync } from "node:fs";
import {
  CASHFLOW_SPREADSHEET_ID,
  CASHFLOW_TAB,
  YEARLY_SPREADSHEET_ID,
  YEARLY_TAB,
} from "./config";
import {
  buildCashflowAppendRow,
  latestBalance,
  parseCashflowLedger,
} from "./cashflow";
import { parseYearlyMatrix } from "./yearly";
import type {
  CashflowAppendInput,
  CashflowLedger,
  CashflowRow,
  YearlyMatrix,
} from "./types";

const SHEETS_SCOPE = "https://www.googleapis.com/auth/spreadsheets";

type ServiceAccountJson = {
  client_email: string;
  private_key: string;
};

function loadExplicitServiceAccount(): ServiceAccountJson | null {
  const inline = process.env.GOOGLE_SERVICE_ACCOUNT_JSON;
  if (inline) {
    return JSON.parse(inline) as ServiceAccountJson;
  }

  const email = process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL;
  const key = process.env.GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY?.replace(
    /\\n/g,
    "\n",
  );
  if (email && key) {
    return { client_email: email, private_key: key };
  }

  const path =
    process.env.GOOGLE_APPLICATION_CREDENTIALS ??
    process.env.GOOGLE_SERVICE_ACCOUNT_PATH;
  if (path && existsSync(path)) {
    return JSON.parse(readFileSync(path, "utf8")) as ServiceAccountJson;
  }

  return null;
}

async function createAuth(): Promise<JWT | GoogleAuth> {
  const explicit = loadExplicitServiceAccount();
  if (explicit) {
    return new JWT({
      email: explicit.client_email,
      key: explicit.private_key,
      scopes: [SHEETS_SCOPE],
    });
  }

  // Cloud Run / GCE: use metadata server ADC (runtime service account).
  return new GoogleAuth({ scopes: [SHEETS_SCOPE] });
}

export class SheetsClient {
  private sheets: sheets_v4.Sheets | null = null;
  private initPromise: Promise<sheets_v4.Sheets> | null = null;

  constructor(sheets?: sheets_v4.Sheets) {
    if (sheets) {
      this.sheets = sheets;
    }
  }

  private async getSheets(): Promise<sheets_v4.Sheets> {
    if (this.sheets) return this.sheets;
    if (!this.initPromise) {
      this.initPromise = (async () => {
        const auth = await createAuth();
        const sheets = google.sheets({ version: "v4", auth });
        this.sheets = sheets;
        return sheets;
      })();
    }
    return this.initPromise;
  }

  async getValues(spreadsheetId: string, tab: string): Promise<string[][]> {
    const sheets = await this.getSheets();
    const res = await sheets.spreadsheets.values.get({
      spreadsheetId,
      range: `'${tab}'`,
    });
    return (res.data.values ?? []) as string[][];
  }

  async fetchYearly(
    spreadsheetId = YEARLY_SPREADSHEET_ID,
    tab = YEARLY_TAB,
  ): Promise<YearlyMatrix> {
    const values = await this.getValues(spreadsheetId, tab);
    return parseYearlyMatrix(values, spreadsheetId, tab);
  }

  async fetchCashflow(
    spreadsheetId = CASHFLOW_SPREADSHEET_ID,
    tab = CASHFLOW_TAB,
  ): Promise<CashflowLedger> {
    const values = await this.getValues(spreadsheetId, tab);
    return parseCashflowLedger(values, spreadsheetId, tab);
  }

  /**
   * Append one B(M) cash movement to `_cflow`.
   * Computes BAL from the latest balance unless `input.bal` is provided.
   */
  async appendCashflow(
    input: CashflowAppendInput,
    spreadsheetId = CASHFLOW_SPREADSHEET_ID,
    tab = CASHFLOW_TAB,
  ): Promise<CashflowRow> {
    const ledger = await this.fetchCashflow(spreadsheetId, tab);
    const previousBal = latestBalance(ledger);
    const { row, values } = buildCashflowAppendRow(input, previousBal);

    const sheets = await this.getSheets();
    await sheets.spreadsheets.values.append({
      spreadsheetId,
      range: `'${tab}'!A:E`,
      valueInputOption: "USER_ENTERED",
      insertDataOption: "INSERT_ROWS",
      requestBody: { values: [values] },
    });

    return row;
  }
}
