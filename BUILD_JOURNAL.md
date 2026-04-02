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


## 2026-03-31 | Session 5 | Brand overhaul — white + navy scheme, navigation restructure

Complete visual overhaul from dark glassmorphism to Collide brand guidelines. Tharindra provided 8-page Brand Guidelines PDF and Collide logo. Also major structural reorganization of page hierarchy.

**Brand changes:**
- Background changed from dark gradient to white (#ffffff)
- All glass effects changed from white-tinted to navy-tinted (rgba(0,57,107,0.06))
- Text changed from white to navy (#00396b)
- BRAND constants expanded with: navy, lightBlue, primary, accentBlue, navBg, navText, navActive, navHover
- Montserrat font loaded globally via Google Fonts CDN in index.html
- Fixed all `text-white` class on inputs (invisible on white background)
- Fixed chart grid strokes (invisible rgba(255,255,255,0.1) → BRAND.accentBlue)
- Fixed loading screen text color (navy text on navy bg → white text)

**Navigation restructure:**
- Replaced traditional sidebar with floating FAB-style pill buttons on left side
- Flyout submenu on hover for Inventory (Dashboard, Products, Analytics, Projections)
- Renamed "Scheduling" → "Staffing" throughout
- Removed standalone "Projections" section from nav
- Created NAV_SIDEBAR array (parallel to legacy NAV_TREE for backward compatibility)

**Page merges and simplifications:**
- **Dashboard**: Replaced detailed stat cards with Gateway Dashboard (4 big buttons: Staffing, Employees, Inventory, Analytics) + upcoming events snapshot
- **Staffing**: Combined Scheduling, Assignment, and Staffing Analytics into 3-tab wrapper (SchedulingPage inner component)
- **Employees**: Combined Directory + Skills + By Role into DirectorySkillsPage with 3 tabs, paired with Payroll in 2/3 + 1/3 grid
- **Inventory**: Created InventoryDashboardPage as landing with snapshot chart, "Enter Inventory" button, last update log, and quick-link buttons to Analytics/Projections
- **Analytics**: New combined AnalyticsPage with 3 tabs — Reports, Sales Forecast, Event P&L (replaced separate Projections section)
- **EventsPage**: Rewritten with "Event View" (calendar + event list) and "Shift View" (expandable events with green/red shift assignment indicators)
- **StaffingPage**: Rewritten as Assignment view with 2-week mini calendar (red=vacancy, green=fully staffed) and unclaimed shifts table with importance ratings (Critical/High/Medium/Acceptable)

**Bug fixed:**
- React hooks ordering violation caused white screen on launch. `useEffect` for user menu close handler was after conditional early returns. Moved all hooks before conditionals.

**Files changed:** `src/App.jsx`, `index.html`

---

## 2026-04-01 | Session 6 | Staffing flyout, employee card redesign, navy header

Further refinements based on Tharindra's feedback. Staffing gets its own flyout submenu, Employees goes full-width with card layout, header goes navy.

**Staffing restructure:**
- Converted Staffing from a single page link to a flyout menu in NAV_SIDEBAR (matching Inventory pattern)
- Sub-items: Dashboard, Scheduling, Assignment, Staffing Analytics
- Created StaffingDashboardPage: 3-column landing with snapshot stats for each sub-section
- Each column shows key metrics (upcoming events, unclaimed shifts, active staff) and links to full page
- SchedulingPage simplified to render EventsPage directly
- New routes: `staffing-dashboard`, `scheduling-cal`, `assignment`, `staffing-analytics`

**Employee page redesign:**
- Removed grid layout with Payroll sidebar — now full-width
- Removed redundant "Employee Directory" header (DashSectionWrap wrapper)
- "A to Z" tab: card grid with avatar, name/email, skill badges on left side, role badge (color-coded) on right
- "By Skill" tab: employees grouped under skill name headers with role badges (matches By Role format)
- "By Role" tab: unchanged
- Employees sorted alphabetically in A to Z view

**Header redesign:**
- Background changed from white to navy (#00396b)
- Collide SVG logo color changed to white
- All header icons (menu toggle, search, bell, avatar chevron) changed to white
- Search bar background changed to translucent white (rgba(255,255,255,0.15))
- User menu toggle hover state changed to translucent white
- Notification dot border color matched to navy background

**Floating nav:**
- Aligned to top-left (justify-start) instead of vertically centered (justify-center)

**Bug fixed:**
- `quantity_needed` vs `qty_needed` inconsistency: StaffingPage and StaffingDashboardPage were reading `r.quantity_needed` but the DB column is `qty_needed`. This caused vacancy counts to always default to `|| 1`. Fixed 3 occurrences.

**Test data created:**
- `seed.sql` — 5 employees (2 admins/team leads, 3 employees), 6 skills, 3 Vancouver March 2026 events with 4 role requirements each
- Event 1 (Spring Pop-Up): 4/4 roles filled → green in calendar
- Event 2 (Street Market): 2/4 filled → red (2 vacancies)
- Event 3 (Fashion Expo): 1/4 filled → red (3 vacancies)
- 5 total unclaimed shifts for Assignment view testing
- Must be run in Supabase SQL Editor (RLS blocks anon inserts)

**Files changed:** `src/App.jsx`, `seed.sql` (new)

---

## 2026-04-01 | Session 7 | Dashboard card redesign, real logo, inventory overhaul

Major UI polish pass across Staffing Dashboard, Inventory Dashboard, Analytics page, and header branding. Focus on card interaction patterns, action button placement, and replacing placeholder logo with real brand asset.

**Staffing Dashboard redesign:**
- Per-event shift breakdown: each event row now shows Total / Claimed / Open columns with color-coded values (green for claimed, red for open vacancies)
- Column headers added above event list for clarity
- All 3 cards (Scheduling, Assignment, Staffing Analytics) now have dark navy border (`2px solid #00396b`)
- Full-card hover glow effect (`box-shadow: 0 0 24px rgba(0,57,107,0.25)`)
- Entire card is clickable — `cursor-pointer` with `onClick` navigating to the sub-page
- Enter buttons (Enter Scheduling / Enter Assignment / Enter Staff Analytics) are now parallel across all 3 cards, pinned to bottom with `mt-auto`, 60% width, centered, with scale-up on hover
- Removed old full-width bottom row buttons and radial gradient glow in favor of card-wide interaction

**EventsPage toggle rename:**
- "Event View" → "Calendar View"
- "Shift View" → "Event View"

**Inventory Dashboard overhaul:**
- Restructured from 2-column (snapshot + sidebar) to 4 distinct cards: Inventory Snapshot, Last Inventory Update, Analytics, Projections
- Each card has a blue hyperlink in the top-right corner:
  - Snapshot: "Enter Inventory →"
  - Last Update: "View Full Log →"
  - Analytics: "Enter Analytics & Projection →"
  - Projections: "Enter Projections →"
- Analytics card: "Run Reports" and "Run Inventory Analysis" action buttons (placeholder/no-op)
- Projections card: "Run Projection for New Event" and "Add Data to Inventory Projection Model" action buttons (placeholder/no-op)
- Snapshot card fully clickable with hover glow
- All cards have navy border and hover glow effect

**Analytics page action buttons:**
- Reports tab: "View Inventory Reports" button above content (placeholder)
- Sales Forecast tab: "Project Future Event Revenue", "Project Future Event Inventory", "Update Projection Model" buttons above content (placeholder)

**Real Collide logo:**
- Replaced approximate SVG text-based CollideLogo with actual Collide shirt Logo SVG from brand guidelines (`/Logos/2026 Logo/Collide shirt Logo.svg`)
- SVG contains 3 layers: body/flame (st2 → navy), cyan accents (st0 → #00ccf8/primary), "C" letter (st1 → white)
- Dynamic color system: `color` prop controls body color, C letter auto-inverts for contrast (white body → navy C, navy body → white C), cyan accents always use BRAND.primary
- Works correctly on both navy header (white body, navy C) and white backgrounds (navy body, white C)

**Admin badge styling:**
- Changed from translucent background with no border to solid `BRAND.primary` (#54cdf9) fill with navy text
- Clean, visible pill on the navy header

**Key decision:** Card interaction pattern standardized across Staffing and Inventory dashboards — entire card is clickable, with a visual "Enter" button as affordance but not the only click target. Hover glow signals interactivity.

**Files changed:** `src/App.jsx`, `BUILD_STATE.md`, `BUILD_JOURNAL.md`, `PLAN.md`

---
