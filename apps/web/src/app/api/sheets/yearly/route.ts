import { NextRequest, NextResponse } from "next/server";
import type { YearlyAmountUpdate } from "@ricenation/sheets";
import { requireSession } from "@/lib/session";
import { getSheetsClient } from "@/lib/sheets";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  const { error } = await requireSession();
  if (error) return error;

  try {
    const matrix = await getSheetsClient().fetchYearly();
    return NextResponse.json(matrix);
  } catch (err) {
    console.error(err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Failed to load yearly sheet" },
      { status: 500 },
    );
  }
}

export async function PATCH(req: NextRequest) {
  const { error } = await requireSession();
  if (error) return error;

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const raw = (body ?? {}) as Record<string, unknown>;
  const label = typeof raw.label === "string" ? raw.label : "";
  const month = typeof raw.month === "string" ? raw.month : "";
  const amountRaw = raw.amount;
  const amount =
    typeof amountRaw === "number"
      ? amountRaw
      : Number(String(amountRaw ?? "").replace(/,/g, ""));

  if (!label || !month || !Number.isFinite(amount)) {
    return NextResponse.json(
      { error: "label, month, and numeric amount are required" },
      { status: 400 },
    );
  }

  const update: YearlyAmountUpdate = { label, month, amount };

  try {
    const result = await getSheetsClient().updateYearlyAmount(update);
    return NextResponse.json({ ok: true, ...result });
  } catch (err) {
    console.error(err);
    const message =
      err instanceof Error ? err.message : "Failed to update yearly amount";
    const status = /required|Unknown|Invalid/i.test(message)
      ? 400
      : /permission|forbidden|403/i.test(message)
        ? 403
        : 500;
    return NextResponse.json({ error: message }, { status });
  }
}
