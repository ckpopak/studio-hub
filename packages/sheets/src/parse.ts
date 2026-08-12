/** Parse sheet numeric cells that may use thousands separators. */
export function parseAmount(raw: unknown): number | null {
  if (raw === null || raw === undefined) return null;
  const s = String(raw).replace(/,/g, "").trim();
  if (!s || s === "-" || s === "\u2014") return null;
  const n = Number(s);
  return Number.isFinite(n) ? n : null;
}

const MONTH_RE =
  /^(Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)(\d{2})$/i;

const MONTH_INDEX: Record<string, number> = {
  jan: 0,
  feb: 1,
  mar: 2,
  apr: 3,
  may: 4,
  jun: 5,
  jul: 6,
  aug: 7,
  sep: 8,
  oct: 9,
  nov: 10,
  dec: 11,
};

/** Convert Dec25 -> Date at month start (UTC). */
export function monthKeyToDate(key: string): Date | null {
  const m = key.match(MONTH_RE);
  if (!m) return null;
  const mon = MONTH_INDEX[m[1].toLowerCase()];
  if (mon === undefined) return null;
  const year = 2000 + Number(m[2]);
  return new Date(Date.UTC(year, mon, 1));
}

export function formatMonthKey(d: Date): string {
  const names = [
    "Jan",
    "Feb",
    "Mar",
    "Apr",
    "May",
    "Jun",
    "Jul",
    "Aug",
    "Sep",
    "Oct",
    "Nov",
    "Dec",
  ];
  const yy = String(d.getUTCFullYear()).slice(-2);
  return `${names[d.getUTCMonth()]}${yy}`;
}

/**
 * Prefer the current calendar month if present in headers;
 * otherwise the latest month on or before today; else last column.
 */
export function pickDefaultMonth(months: string[], now = new Date()): string {
  if (months.length === 0) return "";
  const current = formatMonthKey(
    new Date(Date.UTC(now.getFullYear(), now.getMonth(), 1)),
  );
  if (months.includes(current)) return current;

  const nowTs = Date.UTC(now.getFullYear(), now.getMonth(), 1);
  let best: string | null = null;
  let bestTs = -Infinity;
  for (const m of months) {
    const d = monthKeyToDate(m);
    if (!d) continue;
    const ts = d.getTime();
    if (ts <= nowTs && ts > bestTs) {
      bestTs = ts;
      best = m;
    }
  }
  return best ?? months[months.length - 1];
}
