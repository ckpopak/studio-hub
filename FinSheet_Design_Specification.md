# FinSheet – Personal Finance Web Application
## Complete Design & Requirements Specification
**(Single-file prompt ready for another LLM)**

---

### 1. Project Overview

**Name (working):** FinSheet  
**Type:** Personal financial management web application / system  
**Primary Goal:** Provide a secure, modern web interface for daily personal finance tracking, recurring expense management, and sophisticated what-if financial projections, while using the user’s own Google Sheets as the single source of truth.

**Key Constraints:**
- Must be deployed and run from a Google Cloud platform (or equivalent Google-centric stack).
- Access is restricted exclusively to the logged-in Google account that owns the data (the user’s Google account). No public access, no multi-tenant SaaS in the initial version.
- All persistent data lives in the user’s Google Sheets. The web application reads from and writes to these sheets. The user can also edit the sheets directly at any time.
- Designed first as a high-quality personal tool, with clean architecture so it can later evolve into a product if desired.

**Primary Use Cases:**
- Track daily life expenditures (dinner, online shopping, dental fees, transport, etc.).
- Manage scheduled / regular expenditures (monthly mortgage, debt repayments, yearly insurance, subscriptions).
- Monitor daily, weekly, monthly and yearly spending against budgets.
- Run financial projections and “what-if” scenarios (salary increases, expense reductions, debt acceleration, currency changes, and especially the financial impact of migrating to another country).

---

### 2. Design Principles

1. **Sheets-first**: Google Sheets is the system of record. The web app is a convenient, secure, calculation-rich UI layer on top of the sheets.
2. **Single-user security**: Only the authenticated Google account (and explicitly allowed family accounts if added later) can access the application.
3. **Projection-centric**: Beyond basic tracking, the system must make it easy to model future scenarios (salary changes, migration costs, lifestyle changes, etc.).
4. **Low operational cost**: Prefer serverless / pay-per-use Google Cloud services so personal usage remains inexpensive.
5. **Mobile-first but desktop-capable**: Excellent experience on phone and laptop.
6. **Clean, maintainable codebase**: Suitable for a solo developer or small team, with clear separation of concerns.

---

### 3. High-Level Architecture

```
┌─────────────────────────────────────────────────────────────┐
│  Client (Next.js Progressive Web App)                       │
│  - Google Sign-In                                           │
│  - Dashboard, transaction forms, charts, scenario builder   │
│  - Offline viewing of recent data (PWA)                     │
└──────────────────────────┬──────────────────────────────────┘
                           │ HTTPS + Google ID Token
┌──────────────────────────▼──────────────────────────────────┐
│  Backend (Next.js API Routes or Cloud Run)                  │
│  - Auth middleware (strict email allow-list)                │
│  - Google Sheets API client (acting on behalf of the user)  │
│  - Aggregation & Projection Engine                          │
└──────────────────────────┬──────────────────────────────────┘
                           │ Google Sheets API (OAuth)
┌──────────────────────────▼──────────────────────────────────┐
│  User’s Google Drive – Finance Workbook                     │
│  Tabs: Transactions | Recurring | Categories |              │
│        Scenarios | Assets | Settings                        │
└─────────────────────────────────────────────────────────────┘
```

Optional future components:
- Cloud Scheduler → automatically generate recurring transactions
- Cloud Logging & Error Reporting
- BigQuery export (only if the sheet becomes very large)

---

### 4. Recommended Technology Stack

**Frontend**
- Next.js (App Router) + TypeScript
- Tailwind CSS + shadcn/ui
- Recharts or Tremor for charts
- Progressive Web App (PWA) support

**Authentication**
- NextAuth.js with Google provider  
  **or** Firebase Authentication  
- Hard-coded allow-list of permitted Google email addresses (initially only the owner)

**Backend / API**
- Next.js API Routes (for simplicity in MVP)  
  **or** separate Cloud Run service (Node.js or Python)
- Google Sheets access via official `googleapis` (Node) or equivalent

**Data**
- Google Sheets (user-owned workbook) as the only persistent store for the MVP

**Hosting & Infrastructure**
- Frontend: Firebase Hosting or Cloud Run
- API: Cloud Run
- Secrets: Google Secret Manager
- CI/CD: GitHub Actions → build → deploy to Cloud Run / Firebase
- All resources live inside a single Google Cloud project owned by the user

**Other**
- Date handling: date-fns or Day.js
- Form handling: React Hook Form + Zod
- State: Zustand or React Query (TanStack Query)

---

### 5. Google Sheets Data Model (Source of Truth)

Create one Google Sheets workbook owned by the user’s Google account. Recommended tabs and columns:

#### 5.1 Transactions (append-only daily log)
| Column              | Type     | Notes                                      |
|---------------------|----------|--------------------------------------------|
| id                  | string   | UUID or auto-generated                     |
| date                | date     | YYYY-MM-DD                                 |
| amount              | number   | Always positive; use type to indicate direction |
| currency            | string   | Default HKD (or user’s base currency)      |
| type                | string   | Expense / Income / Transfer                |
| category            | string   | e.g. Food, Transport, Housing, Medical     |
| sub_category        | string   | Optional                                   |
| description         | string   | Free text                                  |
| payment_method      | string   | Cash, Credit Card, FPS, Bank Transfer…     |
| tags                | string   | Comma-separated or JSON array              |
| notes               | string   |                                            |
| created_at          | datetime |                                            |
| updated_at          | datetime |                                            |
| source              | string   | "app" or "manual"                          |

#### 5.2 Recurring
| Column              | Type     | Notes                                      |
|---------------------|----------|--------------------------------------------|
| id                  | string   |                                            |
| name                | string   | e.g. "Yuen Long Mortgage", "Car Insurance" |
| amount              | number   |                                            |
| currency            | string   |                                            |
| frequency           | string   | Monthly, Quarterly, Yearly, Custom         |
| interval_days       | number   | For custom frequency                       |
| start_date          | date     |                                            |
| end_date            | date     | Optional                                   |
| category            | string   |                                            |
| next_due_date       | date     | Calculated / stored                        |
| active              | boolean  |                                            |
| notes               | string   |                                            |
| last_generated      | date     |                                            |

#### 5.3 Categories
| Column              | Type     | Notes                                      |
|---------------------|----------|--------------------------------------------|
| name                | string   | Primary key                                |
| type                | string   | Expense / Income / Transfer                |
| parent              | string   | For hierarchy                              |
| color               | string   | Hex                                        |
| icon                | string   | Optional                                   |
| monthly_budget      | number   | Optional                                   |
| sort_order          | number   |                                            |

#### 5.4 Scenarios (for projections)
| Column                    | Type     | Notes                                      |
|---------------------------|----------|--------------------------------------------|
| id                        | string   |                                            |
| name                      | string   | e.g. "Base Case", "Salary +10% + Bangkok"  |
| description               | string   |                                            |
| salary_increase_pct       | number   |                                            |
| inflation_pct             | number   |                                            |
| fx_rate_hkd_thb           | number   |                                            |
| extra_monthly_saving      | number   |                                            |
| one_time_migration_cost   | number   |                                            |
| monthly_living_cost_change| number   | After relocation                           |
| start_month               | string   | YYYY-MM                                    |
| is_active                 | boolean  |                                            |
| notes                     | string   |                                            |

#### 5.5 Assets / Accounts (optional but recommended)
| Column              | Type     | Notes                                      |
|---------------------|----------|--------------------------------------------|
| name                | string   | e.g. "HSBC Current", "Yuen Long Property"  |
| type                | string   | Bank, Mortgage, Property, Investment…      |
| balance             | number   |                                            |
| currency            | string   |                                            |
| notes               | string   |                                            |
| last_updated        | date     |                                            |

#### 5.6 Settings
Simple key-value or single-row sheet containing:
- base_currency
- owner_email
- default_fx_rate
- projection_horizon_months
- sheet_version

---

### 6. Functional Requirements

#### 6.1 Authentication & Access
- Users must sign in with Google.
- Backend must reject any request whose Google email is not in the hard-coded allow-list.
- Session must be secure (HTTP-only cookies or proper token handling).

#### 6.2 Dashboard & Monitoring
- Overview cards: Today’s spend, This month’s spend, Remaining monthly budget, Net cash flow this month.
- Category breakdown (pie / donut + horizontal bar).
- Spending trend over time (line / area chart).
- Ability to filter by date range, category, tags, payment method.
- Quick view of upcoming recurring payments.

#### 6.3 Transaction Management
- Fast form to add a new transaction (optimized for mobile).
- Pre-defined quick-entry chips for common items (Dinner, Online Shopping, Transport, Dental, Coffee, etc.).
- Edit and soft-delete (or mark as void) existing transactions.
- Support for multiple currencies with a simple FX rate snapshot.
- Ability to add tags and notes.
- Bulk import via CSV that appends to the Transactions sheet.

#### 6.4 Recurring / Scheduled Expenditure
- Full CRUD for recurring items.
- Support for Monthly, Quarterly, Yearly and custom intervals.
- Display of next due date and estimated annual cost.
- One-click “Generate this month’s entries” that creates the corresponding rows in the Transactions sheet.
- Ability to pause / resume recurring items.
- Calendar or list view of upcoming cash outflows (next 30 / 90 days).

#### 6.5 Budgeting
- Monthly budget per category (stored in Categories sheet).
- Visual progress bars and remaining amounts.
- Simple alerts when a category is approaching or exceeding budget.

#### 6.6 Projection & Scenario Engine (Core Differentiator)
The system must support creating and comparing financial scenarios:

**Supported variables / levers:**
- Salary / income increase (percentage or absolute)
- Inflation rate
- FX rate changes (especially HKD ↔ THB)
- Extra monthly savings target
- One-time costs (e.g. relocation, major dental work, car replacement)
- Ongoing change in monthly living costs after migration
- Debt acceleration (extra payments)
- Property sale proceeds and mortgage payoff impact

**Outputs:**
- Month-by-month cash flow projection (12 / 24 / 36 / 60 months)
- Ending cash / runway indicator
- Side-by-side comparison of 2–3 scenarios
- Simple “Migration Readiness” view that combines cash buffer, debt status, and projected surplus in the new location
- Ability to save named scenarios and switch between them

The projection engine should be pure functions that can run either on the client or on the backend, taking current Transactions + Recurring + Scenario parameters as input.

#### 6.7 Additional Features
- Net-worth snapshot (if Assets tab is maintained)
- Tag-based analysis and filtering
- Export current filtered view or projection results to CSV / PDF
- Basic audit trail of changes made through the application
- Dark mode
- Responsive design + PWA installability
- Offline read of recently cached data

---

### 7. Non-Functional Requirements

- **Performance**: Dashboard and common views should load in under 2 seconds on a normal connection after the first load.
- **Reliability**: Graceful handling of Sheets API rate limits and temporary network issues.
- **Cost**: Designed so that personal monthly Google Cloud cost remains very low (ideally under a few USD).
- **Maintainability**: Clear folder structure, typed interfaces for sheet rows, and separation between UI, API, and pure calculation logic.
- **Privacy**: No data is stored on the server beyond temporary processing. All persistent data stays in the user’s Google account.

---

### 8. Security & Access Control

- Google OAuth 2.0 / OpenID Connect only.
- Strict email allow-list enforced on every API request.
- Minimal OAuth scopes: preferably `https://www.googleapis.com/auth/spreadsheets` or the more limited `drive.file` if feasible.
- No public endpoints.
- Secrets (client IDs, etc.) stored in Google Secret Manager or environment variables injected at deploy time.
- Optional later hardening: Cloud Armor, IP restrictions, or additional MFA.

---

### 9. Deployment Model (Google Cloud)

1. One Google Cloud project.
2. Enable required APIs: Google Sheets API, Cloud Run, Secret Manager, Cloud Build (and Firebase if used).
3. OAuth consent screen configured (Internal or Testing mode is acceptable for personal use).
4. Frontend and API deployed to Cloud Run (or Firebase Hosting + Cloud Functions / Cloud Run).
5. GitHub Actions pipeline:
   - On push to `main`
   - Build Docker image or Next.js output
   - Deploy to Cloud Run / Firebase
6. Optional custom domain mapped later.

---

### 10. Suggested GitHub Repository Structure

```
finsheet/
├── apps/
│   └── web/                    # Next.js application (UI + API routes)
├── packages/
│   ├── sheets/                 # Typed Google Sheets client & row mappers
│   ├── projection/             # Pure projection & scenario calculation engine
│   └── ui/                     # Shared UI components (optional)
├── infra/
│   ├── cloudrun/
│   └── github-actions/
├── docs/
│   ├── sheet-template.md
│   └── architecture.md
├── .github/
│   └── workflows/
│       └── deploy.yml
├── .env.example
├── package.json                # Monorepo root (pnpm or npm workspaces)
└── README.md
```

---

### 11. MVP Implementation Roadmap

**Phase 0 – Foundation**
- Create the Google Sheets template with correct headers and data validation.
- Next.js + Google Auth with email allow-list.
- Read-only connection to the Transactions sheet and basic dashboard.

**Phase 1 – Core Tracking**
- Add / edit transactions (write back to Sheets).
- Category management.
- Monthly summary and basic charts.

**Phase 2 – Recurring**
- Full recurring CRUD.
- “Generate this month” functionality.
- Upcoming payments view.

**Phase 3 – Projections**
- Scenario editor.
- Cash-flow projection engine.
- Side-by-side scenario comparison and migration-oriented views.

**Phase 4 – Polish**
- PWA, mobile UX improvements, budgets, alerts, export, dark mode.
- Cloud Scheduler for automatic recurring generation (optional).
- Documentation and one-click sheet template.

---

### 12. Implementation Notes for Another LLM

When generating code from this specification:

- Prefer TypeScript throughout.
- Define clear TypeScript interfaces that mirror every sheet row.
- Keep the projection engine as pure, testable functions with no side effects.
- All Sheets read/write operations must go through a thin, well-typed client layer.
- Auth middleware must be applied to every API route that touches data.
- Design the UI so that common actions (add expense, view this month, run a scenario) require the fewest possible taps/clicks.
- Assume the base currency is HKD but make currency handling generic.
- The system should feel fast and trustworthy for daily use by a non-technical user.

---

### 13. Out of Scope for Initial MVP (but keep architecture open)

- Multi-user collaboration beyond a simple email allow-list
- Bank account aggregation / Open Banking
- Receipt OCR
- Advanced machine-learning forecasting
- Mobile native apps (PWA is sufficient initially)
- Public SaaS multi-tenancy

---

**End of Specification**

This document is intentionally complete and self-contained so it can be used as a single prompt for another LLM to generate architecture diagrams, code scaffolding, Google Sheets templates, projection logic, or deployment configurations.