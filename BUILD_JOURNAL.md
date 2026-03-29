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

---

## 2026-03-24 01:30 | Session 1 | v2.0 feature expansion

Tharindra asked for all suggested improvements plus a full inventory projection/distribution model with historic data visualization. Rebuilt the entire app to incorporate 8 new systems.

**New features added:**
- Availability tracking, shift templates, clock-in/out, CSV export
- Event cost estimator, notifications system
- Inventory system with 4 sub-tabs (Products, Stock, Projections, Analytics)
- Reports page with YoY revenue charts

**Schema expanded to 14 tables.**

---

## 2026-03-24 01:48 | Session 1 | v3.0 — Auth, Roles & CRA Tax Engine

**Correction from Tharindra:** Flat-rate tax calculation (15% federal, 5.05% provincial) is NOT acceptable. Must implement bracket-based progressive tax per CRA T4127.

**Built:**
- CRA 2026 tax engine with full bracket tables
- Three-tier role system (Admin, Team Lead, Employee)
- Supabase Auth integration
- Employee portal with 5 tabs
- RLS overhaul with 3 helper functions and 20+ policies

---

## 2026-03-24 01:59 | Session 1 | Context protection initialized

Created CLAUDE.md, BUILD_STATE.md, BUILD_JOURNAL.md, PLAN.md per Optimus Context Guard protocol.

---

## Sessions 2-N (between 2026-03-24 and 2026-03-28) | v4.0 → v5.0 evolution

*Note: These sessions were not journaled. Reconstructed from git log analysis.*

**Major changes made (from git history):**
- Migrated from single `index.jsx` to Vite project structure (`src/App.jsx`, `src/lib/supabase.js`, `src/main.jsx`)
- Replaced demo data with live Supabase queries (14 parallel fetches in `loadData()`)
- Added Supabase Realtime subscriptions for 11 tables
- Implemented Web Locks API bypass (supabase.js `auth.lock` override)
- Raw fetch workaround for role loading (`/rpc/get_my_role`)
- Added hash-based routing with browser back/forward support
- Built 12+ new pages: Events Manager, Calendar View, Shift Builder, Role Requirements, Inventory Projections, Sales Forecast, Staffing Needs, Event P&L, User Management
- Added Edge Function integration for user management (invite, role update, password reset)
- Mobile responsive overhaul (drawer sidebar, touch targets, viewport detection)
- SIN encryption implementation (AES-256-GCM via Web Crypto)
- Command palette (Cmd+K)
- Multiple bug fixes: React hooks ordering, shift creation fields, white screen fixes

**Key commits:**
- `75468d4` — URL routing, calendar fix, dashboard fix, shared venues, auth persistence
- `eb69047` — Fix white screen: bypass Web Locks API
- `e1a8439` — Fix shift creation: add missing shift_date and status fields
- `8192e60` — Mobile overhaul: fix scrolling, sidebar drawer, touch targets
- `3c4eb92` — Add role-based access control: nav filtering, page guards, role badge
- `36dbc5a` — Add User Management admin panel with role-based access control

---

## 2026-03-28 18:27 | Session (new) | Full v5.0 Audit

Performed comprehensive code audit of the entire `src/App.jsx` (~5900 lines). Read every line across all 19+ pages, all shared components, the tax engine, auth system, routing, and data layer.

**Audit found 22 issues across 4 categories:**

### Bugs Found (12):
- Dashboard has 2 hardcoded values ("6.5h" avg shift, $0 payroll)
- Reports page uses entirely hardcoded demo arrays for all charts
- Directory Edit/View buttons have no onClick — dead buttons
- Payroll page has no real data (`employeePayroll = []`, tax engine is never called)
- Notifications falls back to fake data
- Settings checkboxes non-functional
- Realtime thundering herd (any change reloads all 14 tables)
- Shift Builder doesn't let you pick a date (defaults to event start)
- Stock updates are non-atomic

### Security Issues Found (4):
- **CRITICAL:** Demo credentials exposed in login UI text
- Hardcoded Supabase URL in Edge Function call (should use env var)
- Password reset field shows plaintext (type="text")
- No client-side input validation before DB calls

### Missing Features (8):
- No employee CRUD (the most basic admin function!)
- No clock-in/out (was designed in v2/v3 but lost in rewrite)
- Payroll not wired to any real data source
- No CSV export, no shift templates UI, no error boundaries

### Architecture Issues (4):
- **CRITICAL:** 5900-line monolithic file blocks all future work
- No React Router — fragile custom hash routing
- Massive prop drilling (no Context/state management)
- Mixed Tailwind + inline styles

**Top 5 prioritized changes documented in PLAN.md:**
1. Split App.jsx into modules
2. Fix broken/placeholder pages
3. Add React Router
4. Fix security issues
5. Implement missing core features (employee CRUD, clock-in/out, payroll)

**All 4 context files updated:**
- `CLAUDE.md` — Rewritten for v5.0 reality (was describing v3.0 with demo data)
- `BUILD_STATE.md` — Updated with complete audit findings, broken/missing lists
- `BUILD_JOURNAL.md` — Reconstructed missing session history, added audit entry
- `PLAN.md` — Complete rewrite with audit findings, file split plan, ranked top 5, roadmap

**Files changed:** `CLAUDE.md`, `BUILD_STATE.md`, `BUILD_JOURNAL.md`, `PLAN.md`

---

## 2026-03-29 01:00 | Session 7 | v5.0 → v5.1 — Modular architecture + security fixes

**Priority 1 COMPLETE: Split monolithic App.jsx into modular architecture.**

The 5,824-line `src/App.jsx` was broken down into 43 separate files across 6 directories:
- `src/constants/` (5 files): brand.js, tax.js, nav.js, events.js, index.js
- `src/lib/` (2 files): tax-engine.js, sin-encryption.js (supabase.js already existed)
- `src/utils/` (1 file): formatters.js
- `src/components/` (10 files): Badge, Btn, CommandPalette, EmptyState, Input, Modal, SectionCard, Select, StatCard, index.js
- `src/pages/` (22 files): All 22 page components extracted with proper imports/exports

App.jsx rebuilt as 822-line thin shell (auth, data loading, routing, layout). **86% line reduction.**

**Priority 4 COMPLETE: Security fixes applied.**
- B1: Removed demo credentials (`admin@collide.ca / password`) from LoginPage
- B2: Replaced hardcoded Supabase URL with `import.meta.env.VITE_SUPABASE_URL` in UserManagementPage
- B3: Changed password reset field from `type="text"` to `type="password"` in UserManagementPage

**Verification:** `npm run build` passes, dev server runs, no import/export errors.

**Decision:** Kept hash-based routing for now (React Router is separate priority). The modular split was done bottom-up: constants → lib → utils → components → pages → shell rebuild. Each page was extracted as an independent module with its own imports.

**Files created:** 43 new files (see BUILD_STATE.md for full tree)
**Files modified:** `src/App.jsx` (rewritten as thin shell), `CLAUDE.md`, `BUILD_STATE.md`, `BUILD_JOURNAL.md`
