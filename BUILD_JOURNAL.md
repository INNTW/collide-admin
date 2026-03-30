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
- CRA-accurate pay stubs on My Pay tab
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

---

## 2026-03-30 16:19 | Session 4 | Google Places autocomplete — venue name search

Tharindra requested Google Places autocomplete be moved from the Address field to the **Venue Name** field so typing a venue name (e.g. "Chesswood Arena") shows a dropdown of matching establishments, and selecting one auto-fills name, address, city, and province.

**Root causes of failures (6 attempts before success):**

1. **`google.maps.places.Autocomplete` widget blocked** — Google blocks the legacy Autocomplete widget for new Cloud projects created after March 2025. Browser showed broken icons/exclamation marks in the input field. Fix: switched to programmatic `AutocompleteService` API.

2. **`AutocompleteService` undefined (race condition)** — Loading script with `loading=async` parameter fires `script.onload` before the Places library is initialized. `window.google.maps.places` was undefined at that point. Fix attempt: use `importLibrary("places")`.

3. **`importLibrary is not a function`** — `importLibrary()` only exists when using the callback-based bootstrap loader (`?callback=functionName`), NOT with a plain script tag. Fix: changed to callback-based loader.

4. **`ApiNotActivatedMapError`** — Maps JavaScript API was not enabled in Google Cloud Console. Fix: Tharindra enabled it.

5. **`REQUEST_DENIED` from `getPlacePredictions`** — Legacy `AutocompleteService` requires the legacy "Places API", not "Places API (New)". Tharindra only had "Places API (New)" enabled. Fix: rewrote component to use Places API (New).

6. **Final working solution:** `AutocompleteSuggestion.fetchAutocompleteSuggestions()` + `Place.fetchFields()` from the Places API (New). Uses callback-based loader with `importLibrary("places")`.

**Vercel deployment gotcha:** Commits with git author email `tdesilva@Tharindras-MacBook-Pro.local` instead of `tharindra.desilva@gmail.com` cause Vercel deployments to ERROR with empty build logs. Fixed with `git config user.email`.

**Vercel CDN caching gotcha:** Production URL may serve stale JS bundles even after new deployment is READY. Preview deployment URLs (e.g. `collide-staff-manager-HASH-tharindradesilva-7720s-projects.vercel.app`) always serve the correct new bundle.

**Files changed:** `src/App.jsx` (lines ~555-725: `loadGooglePlaces()` function + `VenueAutocomplete` component)

**Git commits this session:**
- `c2a8e3c` Move Places autocomplete to Venue Name field (ERROR deploy — wrong email)
- `58736d3` Trigger redeploy with correct git author
- `ee68da5` Fix: use AutocompleteService instead of deprecated Autocomplete widget
- `ea4c147` Fix: use importLibrary for async loading
- `02962d0` Fix: use callback + importLibrary for Places API
- `9bf5e76` Fix: use libraries=places param for reliable loading
- `56adf10` Add safety timeout and error handling for Places API calls
- `da888b6` **Switch to Places API (New)**: AutocompleteSuggestion + Place.fetchFields (WORKING)

**Key decisions:**
- Places API (New) is the correct API for new Google Cloud projects — legacy Places API is deprecated
- Google Maps script loaded via callback-based bootstrap loader, not `loading=async` or `libraries=` param
- `VenueAutocomplete` is a self-contained component with debounce, session tokens, click-outside handling
- Restricted to Canadian establishments (`includedRegionCodes: ["ca"]`, `includedPrimaryTypes: ["establishment"]`)

**Google Cloud APIs required:** Maps JavaScript API + Places API (New) — both must be enabled

---
