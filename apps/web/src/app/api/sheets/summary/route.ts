import { NextRequest, NextResponse } from "next/server";
import { buildDashboardSummary } from "@ricenation/sheets";
import { requireSession } from "@/lib/session";
import { getSheetsClient } from "@/lib/sheets";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const { error } = await requireSession();
  if (error) return error;

  const month = req.nextUrl.searchParams.get("month") ?? undefined;
  const recentLimit = Number(req.nextUrl.searchParams.get("recentLimit") ?? 25) || 25;

  try {
    const client = getSheetsClient();
    const [yearly, cashflow] = await Promise.all([
      client.fetchYearly(),
      client.fetchCashflow(),
    ]);
    const summary = buildDashboardSummary(yearly, cashflow, { month, recentLimit });
    return NextResponse.json(summary);
  } catch (err) {
    console.error(err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Failed to build summary" },
      { status: 500 },
    );
  }
}
