import { NextRequest, NextResponse } from "next/server";
import { recentCashflow } from "@ricenation/sheets";
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
