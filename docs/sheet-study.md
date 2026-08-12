# FinSheet sheet study (existing workbooks)

Study date: 2026-08-12 (updated after owner clarifications)  
GCP project: `silentricenation`  
Reader SA: `finsheet-reader@silentricenation.iam.gserviceaccount.com`  
Dumps: [sheet-study-v2.json](sheet-study-v2.json), [sheet-study-raw.json](sheet-study-raw.json)

## Access setup

| Step | Result |
|------|--------|
| Project `silentricenation` | ACTIVE |
| APIs | Sheets + Drive enabled |
| Auth | SA `finsheet-reader@…` (gcloud ADC Sheets scopes blocked) |
| Smoke read | Both workbooks OK |

---

## Confirmed understanding (owner corrections)

1. **B(Y) holds actuals for past months** (not forecast-only). Future months are planned/projected values in the same grid.
2. **B(M) columns:** `BAL` = balance, `IN` = money in, `OUT` = money out.
3. **`N_M`** = day *N* of month *M*. Marker-only rows without amount values are unimportant.
4. **Negative amounts in B(Y):** money is **out of cash** — treated as **debt** (not a credit/refund convention).
5. **“Protected” naming:** not important.
6. **Layout policy:** **do not replace** these layouts. FinSheet should **stick to B(Y) + B(M)** as the working model (not the normalized Transactions/Recurring/… tabs from the design spec as the primary store).

---

## Workbook A — B(Y) yearly grid

- **Title:** Protected - B(Y) - v5.0 (2026)
- **ID:** `1dLumPx3m2dEZjmkG0GA2IUc9vcpnoN5-Rx82abHyemc`
- **Owner:** ken.kp.chan@gmail.com
- **Tab:** `OY(hkd)` — frozen header + first column
- **Shape:** line items × months `Dec25` … `Dec29` (49 months), HKD

**Role:** Monthly category amounts across a multi-year horizon — **past months = actuals**, later months = plan/outlook. Includes recurrent named lines (`mum`, `pm`, `rc`), housing/car/tax, 不固定/固定 groups, investing, `buffer`/`adjustment`, and rollups (`total exp.`, `salary`, `cash flow`).

---

## Workbook B — B(M) monthly cashflow

- **Title:** Protected - B(M) - v5.0 (2026)
- **ID:** `1Ub9LDhs1rcm-NTdeIYyCCRgK8oEQ5bSTKGW5Mrs5_vA`
- **Owner:** ken.kp.chan@gmail.com
- **Tab:** `_cflow` (~314 rows); hidden empty `Sheet91` (ignore)
- **Header:** `BAL | IN | OUT` (and a second `IN | OUT | BAL` block on the right — meaning of the dual block still to confirm if needed)

**Role:** Day-to-day cash diary with running balance. Col A often `N_M` (calendar day cue). Notes free-text (SI, CC, salary, mortgage, etc.).

---

## How they work together

| | B(Y) | B(M) |
|--|------|------|
| Grain | Month × category line | Event / day rows |
| Past | Actual monthly totals | Actual money movements |
| Future | Planned monthly amounts | May extend with planned markers |
| App stance | **Keep this layout** | **Keep this layout** |

---

## Sign convention in B(Y) (confirmed)

**Negative = money out of cash = debt** (cash position / funding shortfall), not a credit or refund.

Examples that fit this reading: `mum` Dec26 −8400, `住: 水電煤` Dec26 −17200, large negative `投資` / `cash flow` months where cash is depleted or obligated.

---

## Implication for FinSheet project

- Prefer **UI + API over the existing B(Y)/B(M) shapes**, not a greenfield Sheets template matching design-spec §5 as the system of record.
- Design-spec features (dashboard, projections, scenarios) should be framed as **views/engines on top of these two layouts**.
- Import/migration of a new normalized schema is **out of scope** unless you later change §6.

## Write-back (B(M))

- App can **append** rows to `_cflow` via `POST /api/sheets/cashflow`.
- Runtime SA needs **Editor** (not only Viewer) on workbook B:
  `finsheet-reader@silentricenation.iam.gserviceaccount.com`
- BAL is computed as `previous BAL + IN - OUT` unless overridden.

## Quick IDs

```
silentricenation
B(Y): 1dLumPx3m2dEZjmkG0GA2IUc9vcpnoN5-Rx82abHyemc
B(M): 1Ub9LDhs1rcm-NTdeIYyCCRgK8oEQ5bSTKGW5Mrs5_vA
SA:   finsheet-reader@silentricenation.iam.gserviceaccount.com
```
