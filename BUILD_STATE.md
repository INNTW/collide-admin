# Collide Staff Manager — Build State

> **Last Updated:** 2026-03-24 01:59 EST

## Current Phase: v3.0 — Auth, Roles & Tax Engine (COMPLETE)

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
- [x] Auth system with DEMO_USERS (admin, team_lead, 2x sales)
- [x] LoginPage component with email/password + quick-login buttons
- [x] Role-gated navigation (ADMIN_NAV vs EMPLOYEE_NAV)
- [x] Employee portal with 5 tabs (My Shifts, My Pay, Availability, Inventory Entry, Team)
- [x] Self clock-in/out on employee portal
- [x] Team Lead clock-in/out for team members
- [x] Pay Sheets page updated to use CRATax.calcPayPeriod() instead of flat rates
- [x] Supabase schema v3 — auth_user_id on employees, role-based RLS policies, helper functions, 4 secure views
- [x] Context protection files updated (CLAUDE.md, BUILD_STATE.md, BUILD_JOURNAL.md, PLAN.md)

## Files

| File | Lines | Purpose |
|------|-------|---------|
| `index.jsx` | ~1800+ | Main React app — all pages, auth, CRA tax engine, employee portal, demo data |
| `supabase-schema.sql` | ~400+ | Full Supabase schema — 14 tables, role-based RLS, helper functions, 6 views, triggers |
| `CLAUDE.md` | — | Session boot instructions, architecture decisions, gotchas |
| `BUILD_STATE.md` | — | This file — live progress snapshot |
| `BUILD_JOURNAL.md` | — | Append-only decision log |
| `PLAN.md` | — | Architecture, roadmap, schemas |

## What's Next

1. **Wire Supabase live** — Replace DEMO_* arrays with real Supabase queries (v4.0)
2. **Client-side SIN encryption** — AES-256-GCM via Web Crypto API before storing (v4.0)
3. **Deploy to Vercel** — Production deployment with environment variables (v4.0)
4. **Mobile-responsive employee portal** — Touch-friendly for on-site use at events (v4.0)
5. **Real-time notifications** — Supabase Realtime for schedule publishes and shift reminders (v4.0)
