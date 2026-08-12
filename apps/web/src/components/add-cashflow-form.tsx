"use client";

import { useMemo, useState } from "react";
import { formatHkd } from "@/lib/format";

type Props = {
  latestBal: number | null;
  onCreated: () => void;
};

function defaultMarker(): string {
  const d = new Date();
  return `${d.getDate()}_M`;
}

export function AddCashflowForm({ latestBal, onCreated }: Props) {
  const [marker, setMarker] = useState(defaultMarker);
  const [inn, setInn] = useState("");
  const [out, setOut] = useState("");
  const [note, setNote] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [ok, setOk] = useState<string | null>(null);

  const previewBal = useMemo(() => {
    const i = inn.trim() === "" ? 0 : Number(inn.replace(/,/g, ""));
    const o = out.trim() === "" ? 0 : Number(out.replace(/,/g, ""));
    if (!Number.isFinite(i) || !Number.isFinite(o)) return null;
    return (latestBal ?? 0) + i - o;
  }, [inn, out, latestBal]);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    setOk(null);
    try {
      const res = await fetch("/api/sheets/cashflow", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          marker,
          in: inn.trim() === "" ? null : Number(inn.replace(/,/g, "")),
          out: out.trim() === "" ? null : Number(out.replace(/,/g, "")),
          note,
        }),
      });
      const body = (await res.json().catch(() => ({}))) as {
        error?: string;
        row?: { bal: number };
      };
      if (!res.ok) {
        throw new Error(body.error ?? `HTTP ${res.status}`);
      }
      setOk(`Saved · BAL ${formatHkd(body.row?.bal ?? null)}`);
      setInn("");
      setOut("");
      setNote("");
      setMarker(defaultMarker());
      onCreated();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to save");
    } finally {
      setBusy(false);
    }
  }

  return (
    <section className="rounded-xl border border-[var(--line)] bg-[var(--bg-elevated)]/70 p-4">
      <h2 className="font-display text-xl">Add cash movement</h2>
      <p className="mt-1 text-sm text-[var(--muted)]">
        Appends to B(M) `_cflow` · current BAL {formatHkd(latestBal)}
      </p>

      <form onSubmit={onSubmit} className="mt-4 grid gap-3 sm:grid-cols-2">
        <label className="block text-sm">
          <span className="text-[var(--muted)]">Marker</span>
          <input
            value={marker}
            onChange={(e) => setMarker(e.target.value)}
            placeholder="28_M"
            className="mt-1 w-full rounded-md border border-[var(--line)] bg-[var(--bg)] px-3 py-2.5 text-[var(--ink)]"
          />
        </label>
        <label className="block text-sm">
          <span className="text-[var(--muted)]">Note</span>
          <input
            value={note}
            onChange={(e) => setNote(e.target.value)}
            placeholder="dinner / SI / CC …"
            className="mt-1 w-full rounded-md border border-[var(--line)] bg-[var(--bg)] px-3 py-2.5 text-[var(--ink)]"
          />
        </label>
        <label className="block text-sm">
          <span className="text-[var(--muted)]">IN</span>
          <input
            inputMode="decimal"
            value={inn}
            onChange={(e) => setInn(e.target.value)}
            placeholder="0"
            className="mt-1 w-full rounded-md border border-[var(--line)] bg-[var(--bg)] px-3 py-2.5 text-[var(--ink)]"
          />
        </label>
        <label className="block text-sm">
          <span className="text-[var(--muted)]">OUT</span>
          <input
            inputMode="decimal"
            value={out}
            onChange={(e) => setOut(e.target.value)}
            placeholder="0"
            className="mt-1 w-full rounded-md border border-[var(--line)] bg-[var(--bg)] px-3 py-2.5 text-[var(--ink)]"
          />
        </label>

        <div className="sm:col-span-2 flex flex-wrap items-center justify-between gap-3 pt-1">
          <p className="text-sm text-[var(--muted)]">
            Next BAL{" "}
            <span className="text-[var(--ink)]">{formatHkd(previewBal)}</span>
          </p>
          <button
            type="submit"
            disabled={busy}
            className="rounded-md bg-[var(--accent)] px-5 py-2.5 text-sm font-semibold text-[#1a1510] disabled:opacity-60"
          >
            {busy ? "Saving…" : "Save to sheet"}
          </button>
        </div>
      </form>

      {error ? (
        <p className="mt-3 text-sm text-[var(--danger)]">{error}</p>
      ) : null}
      {ok ? <p className="mt-3 text-sm text-[var(--ok)]">{ok}</p> : null}
    </section>
  );
}
