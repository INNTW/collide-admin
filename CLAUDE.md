# Collide Staff Manager — Session Boot Instructions

> **Read this file FIRST every session. It contains permanent warnings, architecture decisions, and gotchas that prevent repeated mistakes.**

## Project Identity

- **Product:** Collide Apparel Staff & Inventory Manager v5.1
- **Owner:** Tharindra De Silva (tharindra.desilva@gmail.com) + business partner
- **Company:** Collide Apparel Inc. — event merchandising company operating across Canada
- **Stack:** React 19 + Vite 8 + Tailwind CSS + Supabase (Auth, Database, RLS, Realtime, Edge Functions) + Recharts + Lucide React
- **Deploy target:** Vercel (planned)
- **Database:** Supabase (cloud) — PostgreSQL with Row Level Security
- **Repo:** https://github.com/tdesilva13/collide-staff-manager

## Business Context

Collide Apparel sells merchandise at 50+ events/year across Canada. Events can have 2-3 booth locations. Some weekends have 2-3 events running simultaneously, requiring staff to be split across events. Staff pool is small but deployed dynamically. The app manages the full lifecycle: employee onboarding → scheduling → availability → pay calculation → T4 generation, PLUS inventory projection → distribution → post-event reconciliation.

## Architecture Decisions

### Modular Architecture (v5.1 — refactored 2026-03-29)
- **Current state:** App.jsx is an 822-line thin shell (auth, routing, layout). All pages, components, constants, and utilities are in separate modules.
- **Structure:** `src/constants/` (5 files), `src/lib/` (3 files), `src/utils/` (1 file), `src/components/` (10 files), `src/pages/` (22 files)
- **History:** v1–v5 was a single 5,900-line monolith. Split in v5.1.
- **Remaining:** Data loading and state management still centralized in App.jsx with prop drilling. Future: extract into custom hooks (useAuth, useData) or context providers.

### Three-Tier Role System (decided 2026-03-24)
- **Admin** (Tharindra + partner): Full access — employees, events, scheduling, pay, inventory, reports, settings, user management
- **Team Lead**: Scheduling, employee directory, inventory, reports. CANNOT see payroll, user management, or projections
- **Employee**: My Shifts, Availability, Notifications only. Cannot see other employees' data.
- Roles enforced via `NAV_TREE` filtering AND `hasPageAccess()` guard in `renderPage()`
- Role loaded via raw `fetch()` to `/rpc/get_my_role` (bypasses Web Locks bug)

### Auth & Security
- Supabase Auth handles login (email + password via `signInWithPassword`)
- Role stored in `employees.app_role` column
- RLS policies enforce role-based access at the database level
- SIN numbers encrypted client-side (AES-256-GCM via Web Crypto API, PBKDF2 key derivation)
- Web Locks API bypass in supabase.js `auth.lock` — required for Safari/mobile compatibility
- Logout bypasses `supabase.auth.signOut()` entirely — clears localStorage directly

### Hash-Based Routing (no library)
- Navigation via `window.location.hash` (e.g., `#/shift-builder`)
- State: `{ section: "scheduling", page: "shift-builder" }`
- Back/forward browser buttons handled via `hashchange` listener
- **No react-router** — custom implementation in App component

### Canadian Tax Engine (CRA 2026 — Ontario)
- Constants in `TAX_CONFIG_2026` object — CPP, CPP2, EI, federal brackets, Ontario brackets, surtax, OHP
- All calculations in `CRATax` utility object
- YTD accumulator tracking across pay periods
- T4 box generation (14, 16, 16A, 17, 18, 22, 24, 26, 44)
- **Important:** Tharindra's accountant should validate before using for actual CRA filing

### Design System
- Glassmorphism theme via `BRAND` constant — navy gradient background, cyan (#54CDF9) accent
- Glass cards: `rgba(255,255,255,0.08)` + `backdrop-filter: blur(16px)`
- Shared components: `Badge`, `Modal`, `Input`, `Select`, `Btn`, `EmptyState`, `StatCard`, `SectionCard`
- Mixed Tailwind + inline `style` props for theming

## Common Mistakes — DO NOT REPEAT

1. **Don't use flat-rate tax percentages.** Must use actual CRA bracket tables with progressive rates.
2. **Don't forget CPP2.** Both CPP1 and CPP2 must be calculated separately.
3. **Don't show SIN/pay data to non-admin roles.** RLS must enforce at DB level, not just UI.
4. **Don't hardcode tax year constants.** Use `TAX_CONFIG_2026` so annual updates are a single change.
5. **Don't call `supabase.auth.signOut()`.** It triggers Web Locks crash. Use direct localStorage removal.
6. **Don't use `supabase.rpc()` for role loading.** Use raw `fetch()` to bypass Web Locks bug.
7. **Don't hardcode the Supabase URL.** Use `import.meta.env.VITE_SUPABASE_URL` everywhere. (BUG: `callEdgeFn` in UserManagementPage hardcodes it.)
8. **Don't add hooks after early returns.** React hooks ordering must be consistent — all hooks before any conditional returns.

## Technical Gotchas

1. **Web Locks API Bug:** Supabase client's `auth.lock()` crashes on Safari/mobile. Bypassed in `supabase.js` lines 12-14 with a no-op async function. Role loading and availability saving also use raw `fetch()` to avoid the client entirely.
2. **localStorage Token Pattern:** Auth token accessed via `Object.keys(localStorage).find(k => k.startsWith("sb-") && k.endsWith("-auth-token"))`. If Supabase changes naming convention, this breaks in multiple places.
3. **Realtime Thundering Herd:** Every realtime change on ANY of 11 tables triggers `loadData()` which refetches ALL 14 tables. This will cause performance issues at scale.
4. **Time zone handling:** All dates stored as DATE (no timezone). Shift calculations use string parsing, not Date objects.
5. **RLS helper functions use SECURITY DEFINER:** `is_admin()`, `is_team_lead_or_admin()`, `my_employee_id()` are SECURITY DEFINER to read employees table through RLS.
6. **TD1 claim defaults:** Schema defaults TD1 claims to 2026 BPA values ($16,452 federal, $12,989 Ontario).
7. ~~**`EVENT_TYPE_DEFAULTS` referenced before definition**~~ — FIXED in v5.1 modular split. Each page now imports its own dependencies.

## File Map

| Directory | Files | Purpose |
|-----------|-------|---------|
| `src/App.jsx` | 1 | Thin shell (822 lines): auth, data loading, routing, layout |
| `src/constants/` | 5 | BRAND, TAX_CONFIG_2026, NAV_TREE, EVENT_TYPE_DEFAULTS, PRODUCT_CATEGORIES |
| `src/lib/` | 3 | supabase.js, tax-engine.js, sin-encryption.js |
| `src/utils/` | 1 | formatters.js (formatDate, formatTime, currency) |
| `src/components/` | 10 | Badge, Btn, CommandPalette, EmptyState, Input, Modal, SectionCard, Select, StatCard |
| `src/pages/` | 22 | All page components (LoginPage, DashboardPage, etc.) |
| Root config | 4 | vite.config.js, package.json, .env.example, index.html |
| Context guard | 4 | CLAUDE.md, BUILD_STATE.md, BUILD_JOURNAL.md, PLAN.md |

## Current Version: v5.1

### What's Built
- **Modular architecture** — 43 files across 6 directories (was 5,900-line monolith)
- Live Supabase integration (14 tables, realtime subscriptions, RLS)
- Supabase Auth with JWT, Web Locks workaround, role loading via RPC
- Hash-based routing with browser back/forward support
- 22 page components: Dashboard, Events Manager, Calendar, Shift Builder, Role Requirements, Availability, My Shifts, Directory, Skills & Tags, Payroll, Products, Stock, Analytics, Projections, Sales Forecast, Staffing Needs, Event P&L, Reports, Notifications, User Management, Settings
- CRA 2026 tax engine (CPP1, CPP2, EI, federal/Ontario brackets, surtax, OHP, T4 generation)
- SIN encryption (AES-256-GCM via Web Crypto)
- User Management with Edge Function (invite, role update, password reset, enable/disable)
- Mobile responsive layout with drawer sidebar
- Command palette (Cmd+K)
- Glassmorphism design system

### What's Broken / Missing (see PLAN.md for prioritized fix list)
- Dashboard/Reports show hardcoded placeholder data
- Directory Edit/View buttons are dead (no onClick)
- Payroll page has no real data (`employeePayroll = []`)
- No clock-in/out system (was in v2/v3 design, not in current code)
- No CSV export (was in v2 design, not in current code)
- No shift templates UI (data loaded but never rendered)
- Settings page checkboxes not connected to state
- Notifications page shows fake data when empty
- ~~Hardcoded demo credentials shown in login UI~~ FIXED v5.1
- ~~Hardcoded Supabase URL in Edge Function call~~ FIXED v5.1
- ~~Password field uses type="text"~~ FIXED v5.1
