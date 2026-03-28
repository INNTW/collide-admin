# Collide Staff Manager — Architecture & Roadmap

## System Architecture

```
┌─────────────────────────────────────────────────┐
│                   FRONTEND                       │
│              React (Single JSX)                  │
│                                                  │
│  ┌──────────┐  ┌──────────┐  ┌──────────┐      │
│  │  Admin    │  │ Team Lead│  │ Employee │      │
│  │ Dashboard │  │   View   │  │  Portal  │      │
│  │ (Full)   │  │ (Partial)│  │ (Own)    │      │
│  └──────────┘  └──────────┘  └──────────┘      │
│         │              │            │            │
│         └──────────────┼────────────┘            │
│                        │                         │
│              ┌─────────▼──────────┐              │
│              │   Auth Gate +      │              │
│              │   Role Router      │              │
│              └─────────┬──────────┘              │
└────────────────────────┼─────────────────────────┘
                         │
                         ▼
┌─────────────────────────────────────────────────┐
│                  SUPABASE                        │
│                                                  │
│  ┌──────────┐  ┌──────────┐  ┌──────────┐      │
│  │  Auth    │  │ Database │  │   RLS    │      │
│  │ (email+ │  │ (Postgres│  │ (Role-   │      │
│  │ password)│  │  14+ tbl)│  │  gated)  │      │
│  └──────────┘  └──────────┘  └──────────┘      │
└─────────────────────────────────────────────────┘
```

## Role Hierarchy & Permissions

| Feature | Admin | Team Lead | Employee |
|---------|-------|-----------|----------|
| View all employees | ✅ | ❌ | ❌ |
| Edit employees / SIN / tax | ✅ | ❌ | ❌ |
| Create/edit events | ✅ | ❌ | ❌ |
| Create/edit locations | ✅ | ❌ | ❌ |
| Build schedules | ✅ | ❌ | ❌ |
| View all schedules | ✅ | ✅ (own team) | ❌ |
| View own schedule | ✅ | ✅ | ✅ |
| Clock in/out staff | ✅ | ✅ | ❌ |
| Clock in/out self | ✅ | ✅ | ✅ |
| View all pay sheets | ✅ | ❌ | ❌ |
| View own pay stubs | ✅ | ✅ | ✅ |
| Submit availability | ✅ | ✅ | ✅ |
| Manage inventory catalog | ✅ | ❌ | ❌ |
| Create distributions | ✅ | ❌ | ❌ |
| Enter inventory counts (at event) | ✅ | ✅ | ✅ |
| View projections / analytics | ✅ | ❌ | ❌ |
| View reports | ✅ | ❌ | ❌ |
| Send notifications | ✅ | ❌ | ❌ |
| View notifications (own) | ✅ | ✅ | ✅ |

## Database Schema — Auth Extension

### New/Modified Tables for Auth

```sql
-- Add to employees table:
ALTER TABLE employees ADD COLUMN auth_user_id UUID UNIQUE REFERENCES auth.users(id);
ALTER TABLE employees ADD COLUMN role TEXT DEFAULT 'sales' CHECK (role IN ('admin', 'team_lead', 'sales'));

-- User profiles view (safe for employees to read about themselves)
CREATE VIEW my_profile AS
SELECT id, first_name, last_name, email, phone, hourly_rate, status, role
FROM employees
WHERE auth_user_id = auth.uid();

-- My shifts view
CREATE VIEW my_shifts AS
SELECT s.*, el.name as location_name, el.city, ev.name as event_name
FROM shifts s
JOIN event_locations el ON s.event_location_id = el.id
JOIN events ev ON el.event_id = ev.id
WHERE s.employee_id = (SELECT id FROM employees WHERE auth_user_id = auth.uid());

-- My pay records view
CREATE VIEW my_pay_records AS
SELECT pr.*, pp.start_date as period_start, pp.end_date as period_end
FROM pay_records pr
JOIN pay_periods pp ON pr.pay_period_id = pp.id
WHERE pr.employee_id = (SELECT id FROM employees WHERE auth_user_id = auth.uid());
```

### RLS Policies by Role

```sql
-- Employees: admin sees all, others see only themselves
CREATE POLICY "admin_all_employees" ON employees
  FOR ALL USING (
    EXISTS (SELECT 1 FROM employees WHERE auth_user_id = auth.uid() AND role = 'admin')
  );

CREATE POLICY "employee_own_record" ON employees
  FOR SELECT USING (auth_user_id = auth.uid());

-- Shifts: admin sees all, team_lead sees own event shifts, employee sees own
CREATE POLICY "admin_all_shifts" ON shifts
  FOR ALL USING (
    EXISTS (SELECT 1 FROM employees WHERE auth_user_id = auth.uid() AND role = 'admin')
  );

CREATE POLICY "employee_own_shifts" ON shifts
  FOR SELECT USING (
    employee_id = (SELECT id FROM employees WHERE auth_user_id = auth.uid())
  );

-- Pay records: admin sees all, employee sees own only
CREATE POLICY "admin_all_pay" ON pay_records
  FOR ALL USING (
    EXISTS (SELECT 1 FROM employees WHERE auth_user_id = auth.uid() AND role = 'admin')
  );

CREATE POLICY "employee_own_pay" ON pay_records
  FOR SELECT USING (
    employee_id = (SELECT id FROM employees WHERE auth_user_id = auth.uid())
  );
```

## CRA Tax Engine Design (2026 Tax Year — Ontario)

### Source: CRA T4127 Payroll Deductions Formulas

All constants below are for 2026 tax year. Stored in a `TAX_CONFIG_2026` object for easy annual updates.

### CPP (Canada Pension Plan)

```
CPP1:
  Rate: 5.95%
  Annual max pensionable earnings (YMPE): $71,300
  Annual basic exemption: $3,500
  Annual max contribution: $4,034.10

CPP2 (Second ceiling — since 2024):
  Rate: 4.00%
  YMPE2 (second ceiling): $79,400
  Annual max CPP2 contribution: $324.00

Per-pay calculation:
  CPP1 per pay = min(
    (pensionable_earnings - (3500 / pay_periods)) * 0.0595,
    (4034.10 - ytd_cpp1) // don't exceed annual max
  )
  CPP2 per pay = (applied only on earnings between YMPE and YMPE2)
```

### EI (Employment Insurance)

```
  Rate: 1.63% (employee)
  Annual max insurable earnings: $65,700
  Annual max contribution: $1,071.00

Per-pay calculation:
  EI per pay = min(
    insurable_earnings * 0.0163,
    (1071.00 - ytd_ei)
  )
```

### Federal Tax Brackets (2026)

```
  $0 – $57,375:           15.0%
  $57,375 – $114,750:     20.5%
  $114,750 – $158,468:    26.0%
  $158,468 – $220,000:    29.0%
  $220,000+:              33.0%

  Basic personal amount: $16,129
  Federal tax = bracket_tax(annualized_income) - (BPA * 0.15)
  Per-pay federal tax = annual_tax / pay_periods
```

### Ontario Provincial Tax Brackets (2026)

```
  $0 – $52,886:           5.05%
  $52,886 – $105,775:     9.15%
  $105,775 – $150,000:    11.16%
  $150,000 – $220,000:    12.16%
  $220,000+:              13.16%

  Ontario personal amount: $11,865
  Ontario surtax:
    20% on basic provincial tax > $5,315
    + 36% on basic provincial tax > $6,802

  Per-pay Ontario tax = (annual_tax + surtax) / pay_periods
```

### T4 Box Mapping

| Box | Description | Source |
|-----|-------------|--------|
| 14 | Employment income | Sum of all gross pay in tax year |
| 16 | Employee's CPP contributions | Sum of CPP1 deductions |
| 17 | Employee's QPP contributions | 0 (Ontario employees) |
| 18 | Employee's EI premiums | Sum of EI deductions |
| 22 | Income tax deducted | Sum of federal + provincial tax |
| 24 | EI insurable earnings | Sum of insurable earnings (max $65,700) |
| 26 | CPP pensionable earnings | Sum of pensionable earnings (max $71,300) |
| 44 | Union dues | 0 (unless applicable) |
| 16A | CPP2 contributions | Sum of CPP2 deductions |

## Roadmap

### v3.0 — Auth, Roles & Tax (Current)
- Supabase Auth integration
- Three-tier role system with RLS
- Admin vs Employee portal
- CRA-accurate tax engine
- T4 generation

### v4.0 — Production Hardening (Future)
- Wire Supabase live (replace demo data)
- Client-side SIN encryption (AES-256-GCM)
- Deploy to Vercel
- Mobile-responsive employee portal
- Real-time notifications (Supabase Realtime)

### v5.0 — Advanced Features (Future)
- Drag-and-drop schedule builder
- Photo-based inventory counting
- Multi-province tax support (not just Ontario)
- Payroll direct deposit integration
- Event P&L reports (revenue - COGS - labour)
- Employee document storage (void cheques, IDs, contracts)
