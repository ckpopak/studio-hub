import { NextResponse } from "next/server";
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
