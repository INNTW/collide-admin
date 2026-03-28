# Collide Staff Manager — Build Journal

> Append-only log of decisions, changes, and learnings. Newest entries at the bottom.

---

## 2026-03-24 01:18 | Session 1 | Initial build — v1.0 core app

Built the foundational Collide Staff Manager React app from scratch. Tharindra described Collide Apparel as an event merchandising company with 50+ events/year, some events having 2-3 locations, and overlapping weekends requiring staff splits.

**Decisions made:**
- Single JSX artifact approach (all pages in one file) for rapid iteration
- Supabase as the backend (Tharindra's choice — cloud database)
- React + Tailwind + Recharts stack
- Demo data pre-loaded so the app is immediately usable

**Files created:**
- `index.jsx` — 5 pages: Dashboard, Employees, Events, Schedule, Pay Sheets
- `supabase-schema.sql` — 6 core tables with RLS, views, and triggers

**Key feature notes:**
- Dashboard detects overlapping weekends automatically (groups events by week)
- Employee SIN is masked by default, click to reveal
- Schedule shows per-day, per-location grid with shift details
- Pay sheets use simplified flat-rate Canadian deductions (noted as approximate)

---

## 2026-03-24 01:30 | Session 1 | v2.0 feature expansion

Tharindra asked for all suggested improvements plus a full inventory projection/distribution model with historic data visualization. Rebuilt the entire app to incorporate 8 new systems.

**New features added:**
- Availability tracking (employee → date → available/tentative/unavailable)
- Availability matrix integrated into Schedule page
- Shift templates (3 presets with one-click apply)
- Clock-in/out with actual_start/actual_end recording
- CSV export buttons on Employees, Schedule, Pay Sheets
- Event cost estimator (auto-calculates labour from scheduled shifts)
- Notifications system (compose + send to event staff)
- Inventory system with 4 sub-tabs:
  - Products (catalog with SKU, margins, stock levels)
  - Stock & Distribution (send to events, track lifecycle)
  - Projections (historic sell-through → recommended quantities)
  - Analytics (recharts: revenue by product, sell-through by event, monthly trends)
- Reports page (YoY revenue, staff utilization, category performance, labour vs revenue)

**Schema expanded to 14 tables:** Added products, stock_levels, distributions, historic_sales, employee_availability, shift_templates, shift_template_entries, notifications

**Historic demo data added:** 4 past events (CNE, Osheaga, Bluesfest, Celebration of Light) with realistic sales data to power the projection engine.

---

## 2026-03-24 01:48 | Session 1 | v3.0 scoping — Auth, Roles & Tax

Tharindra asked three critical questions:
1. **Employee logins** — Each employee needs their own login to see shifts, pay, submit availability, enter inventory
2. **Admin hierarchy** — Only Tharindra and partner should see admin tools. Employees should never see other people's data.
3. **Canadian tax accuracy** — Pay sheets must be CRA-accurate for T4 purposes. Wants seamless year-end tax filing.

**Decisions made (confirmed by Tharindra):**
- Three-tier roles: Admin, Team Lead, Employee
- Supabase Auth for login (email + password)
- CRA T4127 formula implementation (not flat rates)
- T4 summary generation for year-end
- Accountant validation recommended before live CRA filing

**Correction from Tharindra:** The simplified flat-rate tax calculation (15% federal, 5.05% provincial) is NOT acceptable for production. Must implement actual bracket-based progressive tax calculation per CRA T4127.

---

## 2026-03-24 01:48 | Session 1 | Context protection initialized

Created all 4 context files per Optimus Context Guard protocol:
- `CLAUDE.md` — Session boot instructions, architecture decisions, gotchas, common mistakes
- `BUILD_STATE.md` — Live progress snapshot with checkboxes
- `BUILD_JOURNAL.md` — This file
- `PLAN.md` — Architecture, schemas, roadmap, tax engine design

---

## 2026-03-24 01:55 | Session 1 | v3.0 — Auth, Roles & CRA Tax Engine built

Built all v3.0 features in `index.jsx`:

**CRA Tax Engine (`TAX_CONFIG_2026` + `CRATax` object):**
- Full 2026 Ontario tax constants from canada.ca (T4127, T4032-ON)
- CPP1 (5.95%, YMPE $74,600, max $4,230.45), CPP2 (4%, YAMPE $85,000, max $416)
- EI (1.63%, max insurable $68,900, max premium $1,123.07)
- Federal brackets (14%, 20.5%, 26%, 29%, 33%) with K constants
- Ontario brackets (5.05%, 9.15%, 11.16%, 12.16%, 13.16%) with KP constants
- Ontario surtax (20% over $5,818 + 36% over $7,446)
- Functions: `calcCPP`, `calcCPP2`, `calcEI`, `calcFederalTax`, `calcOntarioTax`, `calcPayPeriod`, `generateT4`
- YTD accumulator tracking across pay periods

**Auth System:**
- `DEMO_USERS` array with 4 demo accounts (admin, team_lead, 2x sales)
- `LoginPage` component with email/password form + quick-login buttons
- Auth state management in main `App` component (currentUser, login/logout)
- Role-gated navigation: `ADMIN_NAV` (8 pages) vs `EMPLOYEE_NAV` (restricted)

**Employee Portal (`EmployeePortal` component):**
- 5 tabs: My Shifts, My Pay, Availability, Inventory Entry, Team (Team Lead only)
- Self clock-in/out on My Shifts tab
- Team Lead can clock in/out team members on Team tab

**Pay Sheets updated:**
- Replaced flat-rate deductions with `CRATax.calcPayPeriod()` calls
- T4 summary toggle (admin only) with `CRATax.generateT4()` per employee
- T4 cards show boxes 14, 16, 16A, 18, 22, 24, 26

**Files changed:** `index.jsx`

---

## 2026-03-24 01:59 | Session 1 | v3.0 — Supabase schema updated for auth + RLS

Updated `supabase-schema.sql` from v2.0 to v3.0:

**Employees table changes:**
- Added `auth_user_id UUID UNIQUE REFERENCES auth.users(id)` — links Supabase Auth to employee record
- Changed `role` CHECK to `('admin', 'team_lead', 'sales')` — removed 'manager', standardized
- Updated TD1 defaults to 2026 values ($16,452 federal BPA, $12,989 Ontario BPA)

**Pay records table changes:**
- Added `cpp2_deduction` column for CPP2 second ceiling
- Added YTD tracking columns: `ytd_gross`, `ytd_cpp`, `ytd_cpp2`, `ytd_ei`, `ytd_federal_tax`, `ytd_provincial_tax`

**RLS overhaul — replaced generic `auth_full_access` with role-based policies:**
- 3 helper functions: `is_admin()`, `is_team_lead_or_admin()`, `my_employee_id()`
- Employees: admin full CRUD, non-admin read own record only
- Events/Locations: admin full CRUD, all authenticated can read
- Shifts: admin full CRUD, team lead read+update, employee read own
- Availability: admin full CRUD, all manage own
- Pay: admin full CRUD, employee read own only
- Inventory: admin full CRUD, all read products, team lead can update distributions
- Templates: admin only
- Notifications: admin full CRUD, all read

**Secure employee views added:**
- `my_profile` — safe subset (no SIN, no banking)
- `my_shifts` — own shifts with event/location details
- `my_pay_records` — own pay stubs with YTD and period dates
- `my_availability` — own availability entries

**Files changed:** `supabase-schema.sql`
