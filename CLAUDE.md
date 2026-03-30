# Collide Staff Manager — Session Boot Instructions

> **Read this file FIRST every session. It contains permanent warnings, architecture decisions, and gotchas that prevent repeated mistakes.**

## Project Identity

- **Product:** Collide Apparel Staff & Inventory Manager
- **Owner:** Tharindra De Silva (tharindra.desilva@gmail.com) + business partner
- **Company:** Collide Apparel Inc. — event merchandising company operating across Canada
- **Stack:** React (single JSX artifact) + Supabase (Auth, Database, RLS) + Tailwind CSS + Recharts
- **Deploy target:** Vercel (planned)
- **Database:** Supabase (cloud) — PostgreSQL with Row Level Security

## Business Context

Collide Apparel sells merchandise at 50+ events/year across Canada. Events can have 2-3 booth locations. Some weekends have 2-3 events running simultaneously, requiring staff to be split across events. Staff pool is small but deployed dynamically. The app manages the full lifecycle: employee onboarding → scheduling → clock-in/out → pay calculation → T4 generation, PLUS inventory projection → distribution → post-event reconciliation.

## Architecture Decisions

### Three-Tier Role System (decided 2026-03-24)
- **Admin** (Tharindra + partner): Full access to everything — employees, events, scheduling, pay, inventory, reports, notifications, settings. Can see all SIN/tax data. Can edit all records.
- **Team Lead**: Can clock staff in/out at events, enter inventory counts, view their assigned team's schedule. CANNOT see pay data, SIN numbers, tax info, or admin tools.
- **Employee**: Can ONLY view their own shifts, their own pay stubs, submit their own availability, and enter inventory counts when assigned. Cannot see other employees' data.

### Auth & Security (decided 2026-03-24)
- Supabase Auth handles login (email + password)
- Role stored in `employees.role` column (values: `admin`, `team_lead`, `sales`)
- RLS policies enforce role-based access at the database level — not just UI hiding
- SIN numbers encrypted client-side before storage (AES-256-GCM via Web Crypto API)
- Admin dashboard and employee portal are separate route views within the same app

### Canadian Tax Engine (decided 2026-03-24)
- Must follow CRA T4127 Payroll Deductions Formulas for Ontario
- Implements: CPP (with CPP2 second ceiling), EI (with annual max), federal tax brackets, Ontario provincial tax brackets, Ontario surtax, TD1 personal amounts
- YTD accumulator tracking across pay periods for accurate progressive deductions
- T4 box generation at year-end (boxes 14, 16, 17, 18, 22, 24, 26, 44)
- **Important:** Tharindra's accountant should validate before using for actual CRA filing. Formulas change annually.

### Inventory Projection Model (decided 2026-03-24)
- Projections based on historic sell-through rates from past events
- Uses average units/day per product across comparable events
- Adds 15% buffer to recommendations
- Tracks: sent → sold → returned per product per event

## Common Mistakes — DO NOT REPEAT

1. **Don't use flat-rate tax percentages.** The initial v1 used `gross * 0.15` for federal tax — this is wrong. Must use actual CRA bracket tables with progressive rates.
2. **Don't forget CPP2.** Since 2024, there's a second CPP ceiling. Both CPP1 and CPP2 must be calculated separately.
3. **Don't show SIN/pay data to non-admin roles.** RLS must enforce this at the DB level, not just hide it in the UI.
4. **Don't hardcode tax year constants.** Use a config object so annual CRA updates are a single-file change.
5. **Don't use legacy Google Places API classes.** `google.maps.places.Autocomplete` and `AutocompleteService` are blocked/deprecated for new Google Cloud projects (post March 2025). Must use Places API (New): `AutocompleteSuggestion.fetchAutocompleteSuggestions()` + `Place.fetchFields()`.
6. **Don't use `loading=async` or `importLibrary()` without the callback loader.** `importLibrary()` only works with the callback-based bootstrap loader (`?callback=functionName`), NOT with a plain script tag + `loading=async`. Our working pattern uses `?callback=__googleMapsCallback` and calls `importLibrary("places")` from inside the callback.
7. **Don't commit with wrong git author email.** Vercel deployments ERROR with empty build logs if git author email doesn't match the Vercel account. Must be `tharindra.desilva@gmail.com`. Run `git config user.email "tharindra.desilva@gmail.com"` in the repo.
8. **Don't assume Vercel CDN serves the latest bundle immediately.** After a new deployment goes READY, the production URL may serve stale cached JS. Use the preview deployment URL to verify new code is working before assuming the production URL is updated.

## Technical Gotchas

1. **Supabase RLS + Auth:** When setting up RLS policies that check `auth.uid()`, the `employees` table must have an `auth_user_id` column that links to `auth.users.id`. Don't try to match on email — use the UUID foreign key.
2. **Time zone handling:** All dates stored as DATE (no timezone). All times stored as TIME. Shift calculations use string parsing, not Date objects, to avoid timezone drift.
3. **Print styles:** The app has `@media print` CSS that hides the sidebar and admin controls. Ensure print-specific classes (`print:hidden`, `print:block`) are maintained when adding new UI elements.
4. **Demo data:** The app ships with DEMO_* arrays for local development. In production, these are replaced by Supabase queries. Keep demo data in sync with schema changes.
5. **RLS helper functions use SECURITY DEFINER:** The `is_admin()`, `is_team_lead_or_admin()`, and `my_employee_id()` helper functions are `SECURITY DEFINER` so they can read the employees table even when RLS restricts direct access. If these functions are modified, ensure they remain SECURITY DEFINER or RLS policies will break for non-admin users.
6. **TD1 claim defaults:** The schema defaults TD1 claims to 2026 BPA values ($16,452 federal, $12,989 Ontario). When updating for a new tax year, change both the schema defaults AND the `TAX_CONFIG_2026` object in `App.jsx`.
7. **Pay records have YTD columns:** The `pay_records` table includes `ytd_*` columns for accumulator tracking. These must be populated correctly when creating pay records — each new record should carry forward the running YTD totals from the previous period.
8. **Google Places API (New) loading pattern:** The `VenueAutocomplete` component in `App.jsx` (line ~555) uses a specific loading pattern that was debugged extensively. The script loads via callback (`?callback=__googleMapsCallback`), then calls `importLibrary("places")` from inside the callback. This returns the `placesLib` object containing `AutocompleteSuggestion`, `AutocompleteSessionToken`, and `Place`. Do NOT change this to `?libraries=places` or `loading=async` — those patterns fail.
9. **Google Cloud project API requirements:** The API key (`VITE_GOOGLE_MAPS_API_KEY` env var on Vercel) requires BOTH "Maps JavaScript API" AND "Places API (New)" enabled in Google Cloud Console. The legacy "Places API" alone is NOT sufficient.
10. **Git repo location:** The git repo lives at `/tmp/collide-staff-manager` on Tharindra's Mac. The Cowork mount at `/sessions/*/mnt/collide-staff-manager` is a Google Drive bridge path — git operations must run on the Mac via Desktop Commander, not in the Cowork sandbox.
11. **Vercel project identifiers:** Project ID: `prj_HdUp8VrW67X1jwdIdepetrlYWU6L`, Team ID: `team_Pe42KakppRwhzfbYbSmwP8PJ`. GitHub repo: `tdesilva13/collide-staff-manager`.

## File Map

| File | Purpose |
|------|---------|
| `src/App.jsx` | Main React app (~6000+ lines) — all pages, components, state, Google Places integration |
| `src/constants/` | BRAND, TAX_CONFIG, NAV_TREE, EVENT_TYPE_DEFAULTS |
| `src/lib/` | Tax engine, SIN encryption |
| `src/utils/` | Formatters |
| `src/components/` | 9 shared UI components |
| `src/pages/` | 22 page components |
| `supabase-schema.sql` | Full Supabase schema — 14+ tables, RLS policies, views, triggers |
| `CLAUDE.md` | This file — session boot instructions |
| `BUILD_STATE.md` | Live progress snapshot |
| `BUILD_JOURNAL.md` | Append-only decision log |
| `PLAN.md` | Architecture, schemas, roadmap |

## Current Version: v5.2+ (deployed on Vercel)

### What's Built (v5.2+)
- Dashboard with stats, upcoming events, conflict detection, historic revenue chart
- Employee management with SIN masking, profiles, search/filter
- Event management with universal venues (many-to-many event-venue linking)
- **Google Places autocomplete on Venue Name field** — uses Places API (New): `AutocompleteSuggestion` + `Place.fetchFields()`, auto-fills name, address, city, province
- Schedule builder with availability matrix, shift templates, clock-in/out
- Pay sheets with CRA-accurate deductions (CPP1, CPP2, EI, federal/Ontario brackets, surtax)
- T4 summary generation per employee (boxes 14, 16, 16A, 18, 22, 24, 26)
- Inventory system: products, stock, distributions, projections engine, historic analytics (4 sub-tabs with recharts)
- Year-over-year reporting with charts (revenue, utilization, category, labour vs revenue)
- Notifications system for schedule publishing
- Auth system with Supabase Auth, role-gated navigation
- Employee portal (My Shifts with self clock-in/out, My Pay with CRA stubs, Availability, Inventory Entry, Team)
- Team Lead view with clock-in/out for team members
- Supabase schema with auth_user_id, role-based RLS (3 helper functions, 20+ policies), 4 secure views
- Modular architecture: App.jsx is thin shell, extracted to constants/, lib/, utils/, components/, pages/
- **Deployed on Vercel** at `collide-staff-manager.vercel.app`
- Hash-based routing (#/dashboard, #/events-manager, etc.)
- Error boundaries wrapping page content

### What's Next
- Client-side SIN encryption (AES-256-GCM via Web Crypto API)
- Mobile-responsive employee portal
- Real-time notifications (Supabase Realtime)
- Google API key domain restriction (restrict to collide-staff-manager.vercel.app)
