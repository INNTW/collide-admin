# Collide Staff Manager — Build State

> **Last Updated:** 2026-03-29 01:00 EST

## Current Phase: v5.1 — Modular Architecture + Security Fixes (BUILD PASSING)

## Completed in v5.1

### Priority 1: Split App.jsx into modules ✅
- **Before:** 5,824-line monolith in `src/App.jsx`
- **After:** 822-line thin shell + 43 modular files
- Extracted 5 constants → `src/constants/`
- Extracted 2 lib utilities → `src/lib/`
- Extracted 1 util → `src/utils/`
- Extracted 9 shared UI components → `src/components/`
- Extracted 22 page components → `src/pages/`
- Build passes, dev server runs

### Priority 4: Security Fixes ✅
- [x] **B1:** Removed demo credentials from login UI
- [x] **B2:** Replaced hardcoded Supabase URL with `import.meta.env.VITE_SUPABASE_URL` in UserManagementPage
- [x] **B3:** Changed password reset field from `type="text"` to `type="password"`

## What Works (v5.1)

- [x] Supabase Auth (email/password, JWT, session persistence, Web Locks bypass)
- [x] Role-based access control (admin/team_lead/employee via NAV_TREE + hasPageAccess)
- [x] Hash-based routing with browser back/forward
- [x] Events Manager (CRUD events + locations, status filter, shared venue copy)
- [x] Calendar View (month view, day drill-down, shift schedule by hour)
- [x] Shift Builder (select event, assign employees to shifts, delete shifts)
- [x] Role Requirements (define role needs per event, fill rate progress bars)
- [x] Availability (weekly view, tap-to-cycle status, raw fetch save)
- [x] My Shifts (employee view, grouped by event, upcoming/past/all filter)
- [x] Employee Directory (search, skill filter, cards with contact info)
- [x] Skills & Tags (assign skills to employees with proficiency levels)
- [x] Inventory Products (CRUD, categories, cost/retail/margin, stock levels)
- [x] Inventory Stock & Distribution (stock adjustments, event distributions)
- [x] Inventory Analytics (charts: stock trends, revenue by product, category breakdown)
- [x] Inventory Projections (forecast demand based on historic sell-through)
- [x] Sales Projections (revenue forecasting by event type with growth slider)
- [x] Staffing Projections (staffing needs vs capacity, fill rate, labor cost)
- [x] Event P&L Estimator (revenue - COGS - labor - fixed, margin analysis)
- [x] CRA 2026 Tax Engine (CPP1, CPP2, EI, federal/Ontario brackets, surtax, T4 generation)
- [x] SIN Encryption (AES-256-GCM via Web Crypto API)
- [x] User Management (Edge Function: invite, role update, password reset, enable/disable)
- [x] Realtime subscriptions (11 tables auto-refresh on change)
- [x] Mobile responsive (drawer sidebar, touch targets, viewport detection)
- [x] Command palette (Cmd+K search across all pages)
- [x] Modular file architecture (43 files across 6 directories)

## What's Broken

- [ ] **BUG:** Dashboard "Avg Shift Duration" hardcoded to "6.5h" — not calculated from data
- [ ] **BUG:** Dashboard "Payroll This Month" hardcoded to $0.00
- [ ] **BUG:** Reports page charts use hardcoded demo arrays, not real data
- [ ] **BUG:** Reports "Avg Wage/Hour" hardcoded to $28.50
- [ ] **BUG:** Directory Edit/View buttons have no onClick handlers — dead buttons
- [ ] **BUG:** Payroll page `employeePayroll = []` — no real pay record data
- [ ] **BUG:** Notifications shows fake placeholder data when no DB notifications exist
- [ ] **BUG:** Settings checkboxes not wired to state (defaultChecked but no onChange)
- [ ] **BUG:** Realtime: any change to any table reloads ALL 14 tables (thundering herd)

## What's Missing

- [ ] Employee CRUD (add new employee, edit employee profile)
- [ ] Clock-in/out system (was in v2/v3 design, not implemented in v5)
- [ ] CSV export (was in v2 design, not in current code)
- [ ] Shift templates UI (data loaded via Supabase but never rendered)
- [ ] Shift date picker in Shift Builder (defaults to event start_date always)
- [ ] Error boundaries (crash in any page kills the whole app)
- [ ] Input validation on forms (client-side before Supabase calls)
- [ ] Delete confirmation modals (some use browser `confirm()`, some have none)
- [ ] Audit logging (who changed what, when)
- [ ] Offline support / PWA
- [ ] Email notifications via Supabase
- [ ] Batch operations (bulk import employees/products)

## File Architecture (v5.1)

```
src/
├── App.jsx                          (822 lines — thin shell: auth, routing, layout)
├── main.jsx                         (entry point)
├── index.css                        (Tailwind imports)
├── constants/
│   ├── index.js                     (barrel export)
│   ├── brand.js                     (BRAND design tokens)
│   ├── tax.js                       (TAX_CONFIG_2026)
│   ├── nav.js                       (NAV_TREE with role-based access)
│   └── events.js                    (EVENT_TYPE_DEFAULTS, PRODUCT_CATEGORIES)
├── lib/
│   ├── supabase.js                  (Supabase client + Web Locks bypass)
│   ├── tax-engine.js                (CRATax: CPP, EI, federal/Ontario, T4)
│   └── sin-encryption.js            (AES-256-GCM encryption)
├── utils/
│   └── formatters.js                (formatDate, formatTime, currency)
├── components/
│   ├── index.js                     (barrel export)
│   ├── Badge.jsx
│   ├── Btn.jsx
│   ├── CommandPalette.jsx
│   ├── EmptyState.jsx
│   ├── Input.jsx
│   ├── Modal.jsx
│   ├── SectionCard.jsx
│   ├── Select.jsx
│   └── StatCard.jsx
└── pages/
    ├── LoginPage.jsx
    ├── DashboardPage.jsx
    ├── EventsManagementPage.jsx
    ├── CalendarViewPage.jsx
    ├── ShiftBuilderPage.jsx
    ├── RoleRequirementsPage.jsx
    ├── DirectoryPage.jsx
    ├── SkillsTagsPage.jsx
    ├── AvailabilityPage.jsx
    ├── MyShiftsPage.jsx
    ├── PayrollPage.jsx
    ├── ReportsPage.jsx
    ├── InventoryProductsPage.jsx
    ├── InventoryStockPage.jsx
    ├── InventoryAnalyticsPage.jsx
    ├── InventoryProjectionsPage.jsx
    ├── SalesProjectionsPage.jsx
    ├── StaffingProjectionsPage.jsx
    ├── EventPnLPage.jsx
    ├── NotificationsPage.jsx
    ├── UserManagementPage.jsx
    └── SettingsPage.jsx
```

## What's Next (Remaining Priorities)

1. ~~**Split App.jsx into modules**~~ ✅ DONE
2. **Fix broken/placeholder pages** — Dashboard, Payroll, Reports, Directory buttons, Notifications
3. **Add React Router** — Replace fragile hash routing with react-router-dom
4. ~~**Fix security issues**~~ ✅ DONE
5. **Implement missing core features** — Employee CRUD, clock-in/out, shift date picker, connect payroll to real data
