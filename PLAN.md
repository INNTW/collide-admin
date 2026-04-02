# Collide Staff Manager — Architecture & Roadmap

## System Architecture (Current — v5.0)

```
┌─────────────────────────────────────────────────────┐
│              FRONTEND (Vite + React 19)                  │
│              src/App.jsx (~7100 lines, monolithic)        │
│              Montserrat font, Tailwind CDN               │
│                                                           │
│  ┌──────────┐  ┌───────────┐  ┌──────────┐              │
│  │  Admin    │  │ Team Lead │  │ Employee │              │
│  │ (all     │  │ (Staffing │  │(My Shifts│              │
│  │  pages)  │  │ Employees │  │ Avail.   │              │
│  │          │  │ Inventory)│  │ Notifs)  │              │
│  └──────────┘  └───────────┘  └──────────┘              │
│         │              │            │                     │
│         └──────────────┼────────────┘                     │
│                        │                                  │
│  ┌─────────────────────▼──────────────────────┐          │
│  │  NAV_SIDEBAR (floating FAB pills)          │          │
│  │  + NAV_TREE (legacy, for hasPageAccess)    │          │
│  │  Hash routing: { section, page }            │          │
│  └─────────────────────┬──────────────────────┘          │
│                        │                                  │
│  ┌─────────────────────▼──────────────────────┐          │
│  │  BRAND constants (white bg, navy accents)  │          │
│  │  Navy #00396b | Light Blue #669ae4         │          │
│  │  Bright Blue #54cdf9 | Accent #cfe2f3      │          │
│  └────────────────────────────────────────────┘          │
└──────────────────────────┬───────────────────────────────┘
                           │
    ┌──────────────────────┼──────────────────────┐
    │              SUPABASE CLOUD                  │
    │                                              │
    │  ┌────────┐  ┌──────────┐  ┌─────────┐      │
    │  │  Auth  │  │ Postgres │  │  Edge   │      │
    │  │  JWT   │  │ 14+tables│  │Functions│      │
    │  │  RLS   │  │ RLS+views│  │admin-   │      │
    │  │        │  │ Realtime │  │ users   │      │
    │  └────────┘  └──────────┘  └─────────┘      │
    └─────────────────────────────────────────────┘
```

## Database Schema (14 Tables)

| Table | Key Columns | Purpose |
|-------|-------------|---------|
| `employees` | id, first_name, last_name, email, phone, role, hourly_rate, status, auth_user_id, app_role | Staff directory & auth link |
| `events` | id, name, start_date, end_date, event_type, status, description | Event scheduling |
| `event_locations` | id, event_id, name, address, city, province | Venue management |
| `shifts` | id, event_id, employee_id, shift_date, start_time, end_time, role, status | Shift assignments |
| `employee_availability` | id, employee_id, avail_date, status | Availability tracking |
| `skills` | id, name, sort_order | Skill taxonomy |
| `employee_skills` | id, employee_id, skill_id, proficiency | Skill-employee mapping |
| `role_requirements` | id, event_id, role_name, qty_needed, date | Staffing needs per event |
| `products` | id, name, sku, category, cost, retail, sizes, weight_kg, status | Inventory catalog |
| `stock_levels` | id, product_id, quantity | Current stock counts |
| `distributions` | id, product_id, event_id, quantity, type | Stock movements |
| `historic_sales` | id, product_id, event_id, quantity_sold, revenue, event_type | Sales history for projections |
| `shift_templates` | id, name + shift_template_entries (relation) | Reusable schedule templates |
| `notifications` | id, user_id, type, message, read | System alerts |

## Navigation Structure (v6.0)

The sidebar uses floating FAB-style pill buttons (navy with white text) aligned to the top-left. Flyout submenus appear on hover for sections with children.

| Nav Item | Type | Sub-items | Roles |
|----------|------|-----------|-------|
| Dashboard | Direct link | — | All |
| Staffing | Flyout menu | Dashboard, Scheduling, Assignment, Staffing Analytics | All (Analytics: admin only) |
| Employees | Direct link | — | Admin, Team Lead |
| Inventory | Flyout menu | Dashboard, Products, Analytics, Projections | Admin, Team Lead (Analytics/Projections: admin only) |
| Analytics | Direct link | 3 internal tabs: Reports, Sales Forecast, Event P&L | Admin, Team Lead |

### Page Hierarchy

- **Dashboard** → GatewayDashboard (4 gateway buttons + upcoming events + DashboardPage stats)
- **Staffing**
  - Dashboard → StaffingDashboardPage (3 clickable cards: Scheduling w/ per-event shift stats, Assignment w/ unclaimed shifts, Staffing Analytics w/ payroll chart; navy border, hover glow, parallel Enter buttons)
  - Scheduling → EventsPage (Calendar View + Event View with expandable events)
  - Assignment → StaffingPage (2-week mini calendar + unclaimed shifts table)
  - Staffing Analytics → StaffingProjectionsPage
- **Employees** → DirectorySkillsPage (3 tabs: A to Z cards, By Skill groups, By Role groups)
- **Inventory**
  - Dashboard → InventoryDashboardPage (4 cards: Snapshot w/ chart, Last Update w/ log, Analytics w/ action buttons, Projections w/ action buttons; blue hyperlinks in top-right of each card)
  - Products → InventoryProductsPage (category tabs with charts)
  - Analytics → InventoryAnalyticsPage
  - Projections → InventoryProjectionsPage
- **Analytics** → AnalyticsPage (3 tabs: Reports w/ "View Inventory Reports" button, Sales Forecast w/ projection action buttons, Event P&L)

### Header
- Navy blue background (#00396b) with real Collide shirt Logo SVG (dynamic color: white body on navy, cyan accents)
- Search bar (⌘K command palette), notification bell, user avatar dropdown
- Role badge next to logo: solid #54cdf9 fill with navy text

## Role Hierarchy & Permissions

| Feature | Admin | Team Lead | Employee |
|---------|-------|-----------|----------|
| Dashboard (full stats) | ✅ | ✅ | ❌ |
| Events Manager | ✅ | ✅ | ❌ |
| Calendar View | ✅ | ✅ | ❌ |
| Shift Builder | ✅ | ✅ | ❌ |
| Role Requirements | ✅ | ✅ | ❌ |
| Availability | ✅ | ✅ | ✅ (own only) |
| My Shifts | ✅ | ✅ | ✅ |
| Directory | ✅ | ✅ | ❌ |
| Skills & Tags | ✅ | ✅ | ❌ |
| Payroll & T4 | ✅ | ❌ | ❌ |
| Inventory (all) | ✅ | ✅ | ❌ |
| Inv. Analytics | ✅ | ❌ | ❌ |
| Inv. Projections | ✅ | ❌ | ❌ |
| Projections (all 3) | ✅ | ❌ | ❌ |
| Reports | ✅ | ✅ | ❌ |
| Notifications | ✅ | ✅ | ✅ |
| User Management | ✅ | ❌ | ❌ |
| Settings | ✅ | ❌ | ❌ |

## CRA 2026 Tax Engine (Ontario)

### Constants (from `TAX_CONFIG_2026`)

| Item | Value |
|------|-------|
| CPP rate | 5.95% |
| CPP YMPE | $74,600 |
| CPP basic exemption | $3,500 |
| CPP max contribution | $4,230.45 |
| CPP2 rate | 4.00% |
| CPP2 YAMPE | $85,000 |
| CPP2 max contribution | $416.00 |
| EI rate | 1.63% |
| EI max insurable | $68,900 |
| EI max premium | $1,123.07 |
| Federal BPA | $16,452 |
| Ontario BPA | $12,989 |
| Pay periods | 26 (biweekly) |

### Functions
- `CRATax.calcCPP()` — Per-period CPP1 with YTD tracking
- `CRATax.calcCPP2()` — Per-period CPP2 (earnings above YMPE up to YAMPE)
- `CRATax.calcEI()` — Per-period EI with annual max
- `CRATax.calcFederalTax()` — Federal bracket tax with BPA credit
- `CRATax.calcOntarioTax()` — Ontario bracket tax + surtax
- `CRATax.calcOHP()` — Ontario Health Premium
- `CRATax.calcPayPeriod()` — All-in-one per-period calculation
- `CRATax.generateT4()` — Year-end T4 summary (boxes 14, 16, 16A, 17, 18, 22, 24, 26, 44)

---

## FULL AUDIT FINDINGS (2026-03-28)

### Category A: Bugs (12 issues)

| # | Severity | Issue | Location |
|---|----------|-------|----------|
| A1 | HIGH | Dashboard "Avg Shift Duration" hardcoded to "6.5h" | App.jsx ~line 976 |
| A2 | HIGH | Dashboard "Payroll This Month" hardcoded to $0.00 | App.jsx ~line 940 |
| A3 | HIGH | Reports page uses hardcoded demo arrays for all charts | App.jsx ~lines 2803-2817 |
| A4 | HIGH | Reports "Avg Wage/Hour" hardcoded to $28.50 | App.jsx ~line 2839 |
| A5 | HIGH | Directory Edit/View buttons have no onClick handlers | App.jsx ~lines 2095-2100 |
| A6 | HIGH | Payroll page `employeePayroll = []` — zero real data | App.jsx ~line 2687 |
| A7 | MED | Notifications shows fake placeholder data when DB empty | App.jsx ~lines 4673-4698 |
| A8 | MED | Settings checkboxes not wired to state (no onChange) | App.jsx ~lines 5111, 5115 |
| A9 | MED | Realtime: any table change reloads ALL 14 tables | App.jsx ~line 5389 |
| A10 | LOW | Shift Builder defaults shift_date to event start_date | App.jsx ~line 1593 |
| A11 | LOW | Stock updates non-atomic (distribution + stock_levels separate calls) | App.jsx ~line 3160 |
| A12 | LOW | `upcomingEvents` and `pastEvents` computed but unused in EventsManagementPage | App.jsx ~lines 1119-1120 |

### Category B: Security Issues (4 issues)

| # | Severity | Issue | Location |
|---|----------|-------|----------|
| B1 | CRITICAL | Demo credentials shown in login UI ("admin@collide.ca / password") | App.jsx ~line 809 |
| B2 | HIGH | Hardcoded Supabase URL in `callEdgeFn` instead of env var | App.jsx ~line 4776 |
| B3 | MED | Password reset field uses `type="text"` — password visible | App.jsx ~line 5076 |
| B4 | LOW | No input validation on forms before Supabase calls | Multiple pages |

### Category C: Missing Features (8 items)

| # | Priority | Feature | Notes |
|---|----------|---------|-------|
| C1 | HIGH | Employee CRUD — no way to add/edit employees from UI | Directory has dead Edit/View buttons |
| C2 | HIGH | Clock-in/out system | Was in v2/v3 design docs, never implemented in v5 |
| C3 | HIGH | Payroll wired to real data | Currently empty array, tax engine unused |
| C4 | MED | Shift date picker in Shift Builder | Always uses event start_date |
| C5 | MED | CSV export | Was in v2 design, lost in v5 rewrite |
| C6 | MED | Shift templates UI | Data loaded from Supabase but never rendered in Builder |
| C7 | LOW | Error boundaries | Crash in any page takes down entire app |
| C8 | LOW | Audit logging | No record of who changed what |

### Category D: Architecture (4 items)

| # | Priority | Issue | Impact |
|---|----------|-------|--------|
| D1 | CRITICAL | 5900-line monolithic App.jsx | Unmaintainable, blocks all future work |
| D2 | HIGH | No React Router — fragile hash routing | No code splitting, no nested routes, no guards |
| D3 | HIGH | Massive prop drilling — every page gets 10+ props | Should use Context or state management |
| D4 | MED | Mixed Tailwind + inline styles | Inconsistent, hard to theme |

---

## TOP 5 MOST CRUCIAL CHANGES (Ranked)

### 1. Split App.jsx into Modules (D1) — CRITICAL
**Why first:** Every other improvement is blocked by this. You can't test, review, or extend a 5900-line file. Every change risks breaking unrelated pages.

**Plan:**
```
src/
├── App.jsx                  # Shell only: auth, layout, routing
├── constants/
│   ├── brand.js             # BRAND design tokens
│   ├── nav.js               # NAV_TREE
│   └── tax.js               # TAX_CONFIG_2026
├── lib/
│   ├── supabase.js          # Client init (exists)
│   ├── tax-engine.js        # CRATax utility object
│   └── sin-encryption.js    # SINEncryption utility
├── components/
│   ├── Badge.jsx
│   ├── Modal.jsx
│   ├── Input.jsx
│   ├── Select.jsx
│   ├── Btn.jsx
│   ├── EmptyState.jsx
│   ├── StatCard.jsx
│   ├── SectionCard.jsx
│   ├── CommandPalette.jsx
│   └── LoginPage.jsx
├── hooks/
│   ├── useAuth.js           # Auth state, login/logout, role loading
│   ├── useData.js           # Supabase data fetching + realtime
│   └── useMobile.js         # Responsive detection
├── pages/
│   ├── DashboardPage.jsx
│   ├── EventsManagementPage.jsx
│   ├── CalendarViewPage.jsx
│   ├── ShiftBuilderPage.jsx
│   ├── RoleRequirementsPage.jsx
│   ├── AvailabilityPage.jsx
│   ├── MyShiftsPage.jsx
│   ├── DirectoryPage.jsx
│   ├── SkillsTagsPage.jsx
│   ├── PayrollPage.jsx
│   ├── InventoryProductsPage.jsx
│   ├── InventoryStockPage.jsx
│   ├── InventoryAnalyticsPage.jsx
│   ├── InventoryProjectionsPage.jsx
│   ├── SalesProjectionsPage.jsx
│   ├── StaffingProjectionsPage.jsx
│   ├── EventPnLPage.jsx
│   ├── ReportsPage.jsx
│   ├── NotificationsPage.jsx
│   ├── UserManagementPage.jsx
│   └── SettingsPage.jsx
└── utils/
    ├── formatters.js        # formatDate, formatTime, currency
    └── helpers.js
```

**Approach:** Extract bottom-up — constants first, then lib, then components, then pages. Each extraction is a standalone commit. Tests after each step.

### 2. Fix Broken/Placeholder Pages (A1-A8) — HIGH
**Why second:** The app looks broken to users. Dashboard, Reports, and Payroll show fake/zero data. Directory buttons don't work.

**Fixes:**
- Dashboard: Calculate avg shift duration from `shifts` data, compute payroll from real records
- Reports: Replace hardcoded arrays with computed data from employees/events/shifts/sales
- Payroll: Wire to `pay_records` table (or compute from shifts × hourly_rate if no pay_records)
- Directory: Implement Edit modal (update employee) and View modal (full profile)
- Notifications: Remove fake fallback data, show proper empty state
- Settings: Wire checkboxes to user preferences (or remove if not yet supported)

### 3. Add React Router (D2) — HIGH
**Why third:** Enables code splitting (lazy loading pages), proper route guards, nested layouts, and redirect patterns. Replaces 50+ lines of brittle hash-routing code.

**Plan:**
- Install `react-router-dom`
- Define routes with role-based guards (wrap in `<ProtectedRoute role={["admin", "team_lead"]}>`)
- Use `<Outlet>` for shared layout (sidebar + header)
- Lazy-load heavy pages (projections, analytics) with `React.lazy()`

### 4. Fix Security Issues (B1-B4) — HIGH
**Why fourth:** Small changes, high impact.

**Fixes:**
- B1: Remove `Demo: admin@collide.ca / password` from LoginPage
- B2: Replace hardcoded URL in `callEdgeFn` with `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/admin-users`
- B3: Change password reset input from `type="text"` to `type="password"`
- B4: Add basic validation (required fields, email format, number ranges) before Supabase calls

### 5. Implement Missing Core Features (C1-C3) — HIGH
**Why fifth:** These are the most user-visible gaps.

**Plan:**
- C1 (Employee CRUD): Add/Edit employee modal on Directory page with full form (name, email, phone, role, hourly_rate, status)
- C2 (Clock-in/out): Add clock-in/out buttons on My Shifts page; record actual_start/actual_end in shifts table
- C3 (Payroll data): Calculate pay from shifts (hours × hourly_rate), apply CRATax.calcPayPeriod(), store in pay_records table

---

## Roadmap

### v5.1–v5.3 — ✅ COMPLETED
- Split App.jsx into modules (later consolidated back to monolith for speed)
- Security fixes (removed demo credentials, fixed hardcoded URLs)
- Dashboard/Reports/Payroll wired to real data
- Employee profile editing
- Hash-based URL routing
- Deployed to Vercel
- Google Places autocomplete for venues

### v5.4 — ✅ COMPLETED (Session 5)
- Complete brand color migration (dark → white + navy)
- Floating FAB sidebar with flyout menus
- Navigation restructure (merged Scheduling→Staffing, removed Projections from nav)
- Page merges: Analytics (Reports+Forecast+P&L), Inventory Dashboard, Gateway Dashboard
- EventsPage + StaffingPage rewrite
- Montserrat font

### v6.0 — ✅ COMPLETED (Session 6)
- Staffing flyout menu with Dashboard/Scheduling/Assignment/Analytics
- Staffing Dashboard landing (3-column snapshots)
- Employee page full-width with A to Z/By Skill/By Role tabs
- Navy header with white logo
- qty_needed bug fix
- Test data seed script (seed.sql)

### v7.0 — ✅ COMPLETED (Session 7)
- Dashboard card redesign: per-event shift stats, dark navy border, hover glow, full-card click, parallel Enter buttons
- EventsPage toggle rename (Calendar View / Event View)
- Inventory Dashboard overhaul: 4 cards with hyperlinks and action buttons
- Analytics page action buttons (Reports, Sales Forecast tabs)
- Real Collide shirt Logo SVG with dynamic color system
- Admin badge: solid primary fill with navy text

### v7.1 — IN PROGRESS
- Run seed.sql to verify all views with real data
- Wire placeholder action buttons to actual logic/modals
- Payroll wired to shifts × hourly_rate with CRATax engine
- Mobile-responsive layouts for on-site event use
- Real-time notifications via Supabase Realtime

### v8.0 — Future
- Drag-and-drop schedule builder
- Multi-province tax support (BC, QC, AB)
- Employee document storage
- Email notifications via Supabase Edge Functions
- Batch import (CSV → employees/products)
- PWA for offline event use
- Clock-in/out system with actual_start/actual_end
