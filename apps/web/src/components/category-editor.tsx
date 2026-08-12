"use client";

import { useState } from "react";
import { formatHkd } from "@/lib/format";

type Category = { label: string; amount: number; isDebt: boolean };

type Props = {
  month: string;
  categories: Category[];
  onUpdated: () => void;
};

export function CategoryEditor({ month, categories, onUpdated }: Props) {
  const [editing, setEditing] = useState<string | null>(null);
  const [draft, setDraft] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function startEdit(cat: Category) {
    setEditing(cat.label);
    setDraft(String(cat.amount));
    setError(null);
  }

  async function save(label: string) {
    const amount = Number(draft.replace(/,/g, ""));
    if (!Number.isFinite(amount)) {
      setError("Enter a valid number");
      return;
    }
    setBusy(true);
    setError(null);
    try {
      const res = await fetch("/api/sheets/yearly", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ label, month, amount }),
      });
      const body = (await res.json().catch(() => ({}))) as { error?: string };
      if (!res.ok) throw new Error(body.error ?? `HTTP ${res.status}`);
      setEditing(null);
      onUpdated();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Update failed");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div>
      <h2 className="font-display text-xl">Categories · {month}</h2>
      <p className="mt-1 text-sm text-[var(--muted)]">
        Tap an amount to edit B(Y) for this month
      </p>
      {error ? (
        <p className="mt-2 text-sm text-[var(--danger)]">{error}</p>
      ) : null}
      <ul className="mt-4 max-h-[28rem] space-y-2 overflow-y-auto pr-1">
        {categories.map((c) => (
          <li
            key={c.label}
            className="flex items-center justify-between gap-3 border-b border-[var(--line)]/70 py-2 text-sm"
          >
            <span className="text-[var(--ink)]">{c.label}</span>
            {editing === c.label ? (
              <span className="flex items-center gap-2">
                <input
                  autoFocus
                  inputMode="decimal"
                  value={draft}
                  onChange={(e) => setDraft(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") void save(c.label);
                    if (e.key === "Escape") setEditing(null);
                  }}
                  className="w-28 rounded-md border border-[var(--line)] bg-[var(--bg)] px-2 py-1 text-right text-[var(--ink)]"
                />
                <button
                  type="button"
                  disabled={busy}
                  onClick={() => void save(c.label)}
                  className="text-[var(--accent)] disabled:opacity-50"
                >
                  Save
                </button>
                <button
                  type="button"
                  disabled={busy}
                  onClick={() => setEditing(null)}
                  className="text-[var(--muted)]"
                >
                  Cancel
                </button>
              </span>
            ) : (
              <button
                type="button"
                onClick={() => startEdit(c)}
                className={`tabular-nums underline-offset-2 hover:underline ${
                  c.isDebt ? "text-[var(--danger)]" : "text-[var(--muted)]"
                }`}
              >
                {formatHkd(c.amount)}
              </button>
            )}
          </li>
        ))}
      </ul>
    </div>
  );
}
