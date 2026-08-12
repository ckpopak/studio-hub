import { NextRequest, NextResponse } from "next/server";
import { recentCashflow, type CashflowAppendInput } from "@ricenation/sheets";
import { requireSession } from "@/lib/session";
import { getSheetsClient } from "@/lib/sheets";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const { error } = await requireSession();
  if (error) return error;

  const limitParam = req.nextUrl.searchParams.get("limit");
  const limit = Math.min(Math.max(Number(limitParam ?? 40) || 40, 1), 200);

  try {
    const ledger = await getSheetsClient().fetchCashflow();
    return NextResponse.json({
      spreadsheetId: ledger.spreadsheetId,
      tab: ledger.tab,
      rows: recentCashflow(ledger, limit),
      totalRows: ledger.rows.length,
    });
  } catch (err) {
    console.error(err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Failed to load cashflow" },
      { status: 500 },
    );
  }
}

function toAmount(value: unknown): number | null {
  if (value === undefined || value === null || value === "") return null;
  const n = typeof value === "number" ? value : Number(String(value).replace(/,/g, ""));
  return Number.isFinite(n) ? n : NaN;
}

export async function POST(req: NextRequest) {
  const { error } = await requireSession();
  if (error) return error;

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const raw = (body ?? {}) as Record<string, unknown>;
  const inn = toAmount(raw.in);
  const out = toAmount(raw.out);
  const bal = toAmount(raw.bal);

  if (Number.isNaN(inn) || Number.isNaN(out) || Number.isNaN(bal)) {
    return NextResponse.json(
      { error: "IN, OUT, and BAL must be numbers when provided" },
      { status: 400 },
    );
  }

  const input: CashflowAppendInput = {
    marker: typeof raw.marker === "string" ? raw.marker : "",
    note: typeof raw.note === "string" ? raw.note : "",
    in: inn,
    out: out,
    bal: raw.bal === undefined || raw.bal === null || raw.bal === "" ? undefined : bal,
  };

  try {
    const row = await getSheetsClient().appendCashflow(input);
    return NextResponse.json({ ok: true, row }, { status: 201 });
  } catch (err) {
    console.error(err);
    const message = err instanceof Error ? err.message : "Failed to append cashflow";
    const status =
      /Provide a non-zero|Invalid/i.test(message)
        ? 400
        : /permission|forbidden|403/i.test(message)
          ? 403
          : 500;
    return NextResponse.json({ error: message }, { status });
  }
}
