"use client";

import type { DashboardSummary } from "@ricenation/sheets";
import { signOut, useSession } from "next-auth/react";
import { useCallback, useEffect, useState } from "react";
import {
  Area,
  AreaChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { AddCashflowForm } from "@/components/add-cashflow-form";
import { formatHkd } from "@/lib/format";

function StatCard({
  label,
  value,
  hint,
  danger,
}: {
  label: string;
  value: string;
  hint?: string;
  danger?: boolean;
}) {
  return (
    <div className="rounded-xl border border-[var(--line)] bg-[var(--bg-elevated)]/80 px-4 py-4">
      <p className="text-xs tracking-wide text-[var(--muted)] uppercase">{label}</p>
      <p
        className={`font-display mt-2 text-2xl ${
          danger ? "text-[var(--danger)]" : "text-[var(--ink)]"
        }`}
      >
        {value}
      </p>
      {hint ? <p className="mt-1 text-xs text-[var(--muted)]">{hint}</p> : null}
    </div>
  );
}

export function Dashboard() {
  const { data: session } = useSession();
  const [summary, setSummary] = useState<DashboardSummary | null>(null);
  const [month, setMonth] = useState<string>("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async (selected?: string) => {
    setLoading(true);
    setError(null);
    try {
      const qs = selected ? `?month=${encodeURIComponent(selected)}` : "";
      const res = await fetch(`/api/sheets/summary${qs}`);
      if (!res.ok) {
        const body = (await res.json().catch(() => ({}))) as { error?: string };
        throw new Error(body.error ?? `HTTP ${res.status}`);
      }
      const data = (await res.json()) as DashboardSummary;
      setSummary(data);
      setMonth(data.selectedMonth);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const trend = (summary?.cashFlowTrend ?? []).filter((p) => p.value !== null);

  return (
    <main className="mx-auto max-w-5xl px-4 py-8 sm:px-6">
      <header className="flex flex-wrap items-end justify-between gap-4 border-b border-[var(--line)] pb-6">
        <div>
          <p className="font-display text-sm tracking-[0.2em] text-[var(--accent)] uppercase">
            FinSheet
          </p>
          <h1 className="font-display mt-1 text-3xl sm:text-4xl">Dashboard</h1>
          <p className="mt-1 text-sm text-[var(--muted)]">
            {session?.user?.email ?? "Signed in"} · B(Y) + B(M) read-only
          </p>
        </div>
        <div className="flex items-center gap-3">
          <label className="text-sm text-[var(--muted)]">
            Month{" "}
            <select
              className="ml-2 rounded-md border border-[var(--line)] bg-[var(--bg-elevated)] px-2 py-1.5 text-[var(--ink)]"
              value={month}
              onChange={(e) => {
                const next = e.target.value;
                setMonth(next);
                void load(next);
              }}
            >
              {(summary?.months ?? []).map((m) => (
                <option key={m} value={m}>
                  {m}
                </option>
              ))}
            </select>
          </label>
          <button
            type="button"
            onClick={() => signOut({ callbackUrl: "/login" })}
            className="rounded-md border border-[var(--line)] px-3 py-1.5 text-sm text-[var(--muted)] hover:text-[var(--ink)]"
          >
            Sign out
          </button>
        </div>
      </header>

      {loading && !summary ? (
        <p className="mt-10 text-[var(--muted)]">Loading sheets…</p>
      ) : null}
      {error ? (
        <p className="mt-6 rounded-md border border-[var(--danger)]/40 bg-[var(--danger)]/10 px-4 py-3 text-sm text-[var(--danger)]">
          {error}
        </p>
      ) : null}

      {summary ? (
        <div className="mt-8 space-y-10">
          <section className="grid grid-cols-2 gap-3 lg:grid-cols-4">
            <StatCard label="Salary" value={formatHkd(summary.month.salary)} />
            <StatCard label="Total exp." value={formatHkd(summary.month.totalExp)} />
            <StatCard
              label="Cash flow"
              value={formatHkd(summary.month.cashFlow)}
              hint={summary.month.isDebt ? "Negative = debt / cash out" : undefined}
              danger={summary.month.isDebt}
            />
            <StatCard
              label="Latest BAL"
              value={formatHkd(summary.month.latestBal)}
              hint="From B(M) _cflow"
            />
          </section>

          <section>
            <h2 className="font-display text-xl">Cash flow trend</h2>
            <p className="mt-1 text-sm text-[var(--muted)]">
              B(Y) · negative months are debt
            </p>
            <div className="mt-4 h-64 rounded-xl border border-[var(--line)] bg-[var(--bg-elevated)]/60 p-2">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={trend}>
                  <defs>
                    <linearGradient id="cf" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="#c4a35a" stopOpacity={0.45} />
                      <stop offset="100%" stopColor="#c4a35a" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid stroke="#2c3a33" strokeDasharray="3 3" />
                  <XAxis dataKey="month" tick={{ fill: "#9aada0", fontSize: 11 }} />
                  <YAxis
                    tick={{ fill: "#9aada0", fontSize: 11 }}
                    tickFormatter={(v) => `${Math.round(Number(v) / 1000)}k`}
                  />
                  <Tooltip
                    contentStyle={{
                      background: "#1a221e",
                      border: "1px solid #2c3a33",
                      borderRadius: 8,
                    }}
                    formatter={(v: number) => [formatHkd(v), "Cash flow"]}
                  />
                  <Area
                    type="monotone"
                    dataKey="value"
                    stroke="#c4a35a"
                    fill="url(#cf)"
                    strokeWidth={2}
                  />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </section>

          <AddCashflowForm
            latestBal={summary.month.latestBal}
            onCreated={() => void load(month)}
          />

          <section className="grid gap-8 lg:grid-cols-2">
            <div>
              <h2 className="font-display text-xl">
                Categories · {summary.selectedMonth}
              </h2>
              <ul className="mt-4 max-h-[28rem] space-y-2 overflow-y-auto pr-1">
                {summary.month.categories.map((c) => (
                  <li
                    key={c.label}
                    className="flex items-baseline justify-between gap-3 border-b border-[var(--line)]/70 py-2 text-sm"
                  >
                    <span className="text-[var(--ink)]">{c.label}</span>
                    <span
                      className={
                        c.isDebt ? "text-[var(--danger)]" : "text-[var(--muted)]"
                      }
                    >
                      {formatHkd(c.amount)}
                    </span>
                  </li>
                ))}
              </ul>
            </div>

            <div>
              <h2 className="font-display text-xl">Recent cash movements</h2>
              <p className="mt-1 text-sm text-[var(--muted)]">B(M) · BAL / IN / OUT</p>
              <ul className="mt-4 max-h-[28rem] space-y-3 overflow-y-auto pr-1">
                {summary.recentCashflow.map((row, idx) => (
                  <li
                    key={`${row.marker}-${row.bal}-${idx}`}
                    className="rounded-lg border border-[var(--line)] bg-[var(--bg-elevated)]/50 px-3 py-2.5 text-sm"
                  >
                    <div className="flex justify-between gap-2">
                      <span className="font-medium text-[var(--accent)]">
                        {row.marker || "—"}
                      </span>
                      <span className="text-[var(--muted)]">
                        BAL {formatHkd(row.bal)}
                      </span>
                    </div>
                    <div className="mt-1 flex gap-4 text-[var(--muted)]">
                      <span>IN {formatHkd(row.in)}</span>
                      <span>OUT {formatHkd(row.out)}</span>
                    </div>
                    {row.note ? (
                      <p className="mt-1 text-[var(--ink)]/90">{row.note}</p>
                    ) : null}
                  </li>
                ))}
              </ul>
            </div>
          </section>
        </div>
      ) : null}
    </main>
  );
}
