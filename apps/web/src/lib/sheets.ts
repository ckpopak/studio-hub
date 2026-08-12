import { SheetsClient } from "@ricenation/sheets";

let client: SheetsClient | null = null;

export function getSheetsClient(): SheetsClient {
  if (!client) client = new SheetsClient();
  return client;
}
