# Collide Staff Manager — Build State

> **Last Updated:** 2026-04-01 23:00 EST

## Current Phase: v7.0 — Dashboard Card Redesign, Real Logo, Inventory Overhaul

## Completed Features

### v1.0 — Core App (Session 1)
- [x] Supabase schema designed (employees, events, locations, shifts, pay periods, pay records)
- [x] React app scaffold with sidebar navigation
- [x] Dashboard page (stats, upcoming events, conflict detection)
- [x] Employee management (CRUD, SIN masking, profiles, search/filter)
- [x] Event management (CRUD, multi-location, expandable cards)
- [x] Schedule page (event selector, shift assignment, per-day/per-location grid)
- [x] Pay sheets (date range filter, per-employee breakdowns, simplified deductions)
- [x] Print-ready views for schedules and pay sheets

### v2.0 — Full Feature Set (Session 1, continued)
- [x] Availability tracking system (per-employee, per-date, cycle through available/tentative/unavailable)
- [x] Availability matrix on Schedule page (shows who's free on which event days)
- [x] Shift templates (3 presets: Standard Day, Long Festival, Weekend Pop-Up)
- [x] Clock-in/out UI (timer button per shift, records actual_start/actual_end)
- [x] CSV export (employees, schedules, pay sheets)
- [x] Event cost estimator (staff count, total hours, est. labour cost per event)
- [x] Notifications page (compose, send schedule-published/shift-reminder notifications)
- [x] Inventory — Products tab (catalog with SKU, cost, retail, margin, stock levels)
- [x] Inventory — Stock & Distribution tab (send inventory to events, track sent/sold/returned)
- [x] Inventory — Projections tab (historic sell-through → recommended quantities with 15% buffer)
- [x] Inventory — Historic Analytics tab (revenue by product, sell-through by event, monthly trends, full history table)
- [x] Reports page (YoY revenue, staff utilization, category pie chart, labour vs revenue)
- [x] Supabase schema v2 (14 tables: products, stock_levels, distributions, historic_sales, employee_availability, shift_templates, notifications + RLS + views + triggers)

### v3.0 — Auth, Roles & Tax Engine (Session 1, continued)
- [x] CRA-accurate tax engine (`TAX_CONFIG_2026` + `CRATax` object with all 2026 rates from canada.ca)
- [x] CPP1 + CPP2 calculation with annual maximums and YTD tracking
- [x] EI calculation with annual max premium
- [x] Federal tax brackets (14%, 20.5%, 26%, 29%, 33%) with K constants
- [x] Ontario provincial tax brackets with KP constants + surtax
- [x] T4 summary generation (boxes 14, 16, 16A, 18, 22, 24, 26)
- [x] Auth system with Supabase Auth (email/password)
- [x] Role-gated navigation (ADMIN_NAV vs EMPLOYEE_NAV)
- [x] Employee portal with 5 tabs (My Shifts, My Pay, Availability, Inventory Entry, Team)
- [x] Self clock-in/out on employee portal
- [x] Team Lead clock-in/out for team members
- [x] Pay Sheets page updated to use CRATax.calcPayPeriod() instead of flat rates
- [x] Supabase schema v3 — auth_user_id on employees, role-based RLS policies, helper functions, 4 secure views

### v5.1 — Modular Architecture Split (Session 2+)
- [x] Split monolithic App.jsx into 43 modular files (constants/, lib/, utils/, components/, pages/)
- [x] App.jsx now thin shell (~822 lines for auth, routing, layout, data loading)
- [x] Security fixes: removed demo credentials from login, fixed hardcoded Supabase URL

### v5.2 — Feature Wiring & Polish (Session 3+)
- [x] Dashboard wired to real data (avg shift duration, payroll, shifts/week)
- [x] Reports wired to real data (staff trends, payroll breakdown, YTD)
- [x] Payroll wired to CRATax.calcPayPeriod() for real pay stubs
- [x] Employee profiles: full editing (phone, SIN, address, emergency contact, TD1)
- [x] Error boundaries wrapping page content
- [x] Hash-based URL routing (#/dashboard, #/events-manager, etc.)
- [x] Deployed to Vercel at collide-staff-manager.vercel.app

### v5.3 — Universal Venues & Google Places (Session 4, 2026-03-30)
- [x] Universal venues system: venues table + event_venues junction (many-to-many)
- [x] Venues tab on Events Manager page (CRUD for venue locations)
- [x] Google Places autocomplete on Venue Name field using Places API (New)
- [x] `VenueAutocomplete` component: `AutocompleteSuggestion.fetchAutocompleteSuggestions()` + `Place.fetchFields()`
- [x] Auto-fills venue name, street address, city, and province from Google selection
- [x] Session tokens for billing optimization
- [x] Debounce (300ms) and click-outside-to-close on dropdown

### v5.4 — Brand Color Overhaul & Navigation Restructure (Session 5)
- [x] Complete brand color migration from dark glassmorphism to white + navy scheme
- [x] BRAND constants updated: navy #00396b, lightBlue #669ae4, primary #54cdf9, accentBlue #cfe2f3
- [x] Montserrat font loaded globally via Google Fonts
- [x] Floating FAB-style sidebar: pill-shaped navy buttons on left with hover flyout menus
- [x] Merged Scheduling/Staffing/Assignment into unified "Staffing" section with 3 tabs
- [x] Merged Reports + Sales Forecast + Event P&L into unified "Analytics" page with 3 tabs
- [x] Removed standalone "Projections" from nav (now under Inventory flyout + Analytics)
- [x] Created Inventory Dashboard landing page with snapshot chart, quick-links, and "Enter Inventory" button
- [x] Created Gateway Dashboard with 4 big buttons (Staffing, Employees, Inventory, Analytics) + upcoming events
- [x] Dashboard stat cards updated: Upcoming Events, Unassigned Shifts, Payroll This Month, Last Inventory Update
- [x] EventsPage restructured: "Event View" (calendar + event list) and "Shift View" (expandable events with green/red shift status)
- [x] StaffingPage (Assignment): 2-week mini calendar (red=vacancy, green=staffed) + unclaimed shifts table with importance ratings
- [x] DirectorySkillsPage: 3 tabs — Directory, By Skill, By Role (employees grouped under role headers with skill badges)
- [x] Products page: category tabs with charts
- [x] Fixed React hooks ordering violation (white screen bug)
- [x] Fixed invisible text-white inputs on white background
- [x] Fixed chart grid strokes invisible on white
- [x] Fixed loading screen text color

### v6.0 — Staffing Flyout, Employee Cards, Navy Header (Session 6)
- [x] Staffing converted to flyout menu in sidebar (like Inventory) with sub-items: Dashboard, Scheduling, Assignment, Staffing Analytics
- [x] Created Staffing Dashboard landing page: 3-column snapshot cards with stats (upcoming events, unclaimed shifts, active staff) that link into sub-pages
- [x] Employees page restructured: full-width, no sidebar Payroll panel
- [x] Employee "A to Z" tab: card grid with avatar, name, email, skill badges on left, role badge on right
- [x] Employee "By Skill" tab: employees grouped under skill headers (matching By Role format)
- [x] Employee "By Role" tab: unchanged from v5.4
- [x] Header changed to navy blue background with white Collide SVG logo
- [x] All header elements updated: white icons, white text, translucent hover states
- [x] Floating nav aligned to top-left instead of vertically centered
- [x] Fixed `qty_needed` vs `quantity_needed` bug — code was reading wrong column, defaulting to 1
- [x] Created seed.sql with 5 test employees, 6 skills, 3 Vancouver March 2026 events, role requirements, and shifts
- [x] Build verified passing

### v7.0 — Dashboard Card Redesign, Real Logo, Inventory Overhaul (Session 7)
- [x] StaffingDashboardPage: per-event shift stats (Total / Claimed / Open columns) with color-coded values
- [x] StaffingDashboardPage: dark navy border on all 3 cards, full-card hover glow (box-shadow)
- [x] StaffingDashboardPage: entire card clickable (cursor-pointer, onClick navigates to sub-page)
- [x] StaffingDashboardPage: Enter buttons parallel across all 3 cards (pinned to bottom with mt-auto), 60% width, centered
- [x] EventsPage toggle labels renamed: "Event View" → "Calendar View", "Shift View" → "Event View"
- [x] InventoryDashboardPage: full restructure — 4 cards (Snapshot, Last Update, Analytics, Projections)
- [x] InventoryDashboardPage: blue hyperlinks in top-right of each card (Enter Inventory, View Full Log, Enter Analytics & Projection, Enter Projections)
- [x] InventoryDashboardPage: Analytics card action buttons — "Run Reports", "Run Inventory Analysis" (placeholder)
- [x] InventoryDashboardPage: Projections card action buttons — "Run Projection for New Event", "Add Data to Inventory Projection Model" (placeholder)
- [x] InventoryDashboardPage: Snapshot card fully clickable with hover glow
- [x] AnalyticsPage: Reports tab — "View Inventory Reports" action button (placeholder)
- [x] AnalyticsPage: Sales Forecast tab — "Project Future Event Revenue", "Project Future Event Inventory", "Update Projection Model" buttons (placeholder)
- [x] CollideLogo replaced with real Collide shirt Logo SVG from brand guidelines (dynamic color: body + C letter invert based on background)
- [x] Admin role badge: solid BRAND.primary (#54cdf9) fill with navy text (replaces translucent background)
- [x] Build verified passing

## Files

| File | Lines | Purpose |
|------|-------|---------|
| `src/App.jsx` | ~7400+ | Main React app — all pages, auth, venues, Google Places, CRA tax engine, real Collide logo |
| `src/constants/` | — | BRAND, TAX_CONFIG, NAV_TREE, EVENT_TYPE_DEFAULTS |
| `src/lib/` | — | Tax engine, SIN encryption |
| `src/utils/` | — | Formatters |
| `src/components/` | — | 9 shared UI components |
| `src/pages/` | — | 22 page components |
| `supabase-schema.sql` | ~400+ | Full Supabase schema — 14+ tables, role-based RLS, helper functions, views, triggers |
| `seed.sql` | ~160 | Test data seed script — 5 employees, 6 skills, 3 events, shifts |
| `CLAUDE.md` | — | Session boot instructions, architecture decisions, gotchas |
| `BUILD_STATE.md` | — | This file — live progress snapshot |
| `BUILD_JOURNAL.md` | — | Append-only decision log |
| `PLAN.md` | — | Architecture, roadmap, schemas |

## What's Next

1. **Run seed.sql** — Paste into Supabase SQL Editor to populate test data for all views
2. **Wire placeholder buttons** — Connect "Run Reports", "Run Projection", "Run Inventory Analysis" to actual logic/modals
3. **Payroll wired to shifts** — Calculate pay from shifts × hourly_rate using CRATax engine
4. **Mobile-responsive employee portal** — Touch-friendly for on-site use at events
5. **Real-time notifications** — Supabase Realtime for schedule publishes and shift reminders
