-- ============================================================
-- SEED DATA: Collide Staff Manager — Test Employees, Skills, Events, Shifts
-- Run this in the Supabase SQL Editor (Dashboard > SQL Editor > New Query)
-- This runs as postgres role and bypasses RLS.
-- Delete this test data later — all Vancouver March 2026 events are fake.
-- ============================================================

-- ── 1. INSERT 5 TEST EMPLOYEES ──
INSERT INTO employees (first_name, last_name, email, role, phone, hourly_rate)
VALUES
  ('Marcus', 'Chen', 'marcus.chen@collideapparel.com', 'admin', '604-555-0101', 35.00),
  ('Priya', 'Sharma', 'priya.sharma@collideapparel.com', 'team_lead', '604-555-0102', 28.00),
  ('Jordan', 'Williams', 'jordan.williams@collideapparel.com', 'employee', '604-555-0103', 22.00),
  ('Anika', 'Osei', 'anika.osei@collideapparel.com', 'employee', '604-555-0104', 22.00),
  ('Liam', 'Novak', 'liam.novak@collideapparel.com', 'team_lead', '604-555-0105', 28.00)
ON CONFLICT DO NOTHING;

-- ── 2. INSERT SKILLS ──
INSERT INTO skills (name, sort_order)
VALUES
  ('Pressing', 1),
  ('Selling', 2),
  ('Inventory Management', 3),
  ('Customer Service', 4),
  ('Cash Handling', 5),
  ('Visual Merchandising', 6)
ON CONFLICT DO NOTHING;

-- ── 3. ASSIGN SKILLS TO EMPLOYEES ──
-- Marcus (admin): Selling, Cash Handling, Inventory Management
INSERT INTO employee_skills (employee_id, skill_id, proficiency)
SELECT e.id, s.id, 'advanced'
FROM employees e, skills s
WHERE e.email = 'marcus.chen@collideapparel.com' AND s.name = 'Selling'
ON CONFLICT DO NOTHING;

INSERT INTO employee_skills (employee_id, skill_id, proficiency)
SELECT e.id, s.id, 'advanced'
FROM employees e, skills s
WHERE e.email = 'marcus.chen@collideapparel.com' AND s.name = 'Cash Handling'
ON CONFLICT DO NOTHING;

INSERT INTO employee_skills (employee_id, skill_id, proficiency)
SELECT e.id, s.id, 'intermediate'
FROM employees e, skills s
WHERE e.email = 'marcus.chen@collideapparel.com' AND s.name = 'Inventory Management'
ON CONFLICT DO NOTHING;

-- Priya (team_lead): Pressing, Visual Merchandising
INSERT INTO employee_skills (employee_id, skill_id, proficiency)
SELECT e.id, s.id, 'advanced'
FROM employees e, skills s
WHERE e.email = 'priya.sharma@collideapparel.com' AND s.name = 'Pressing'
ON CONFLICT DO NOTHING;

INSERT INTO employee_skills (employee_id, skill_id, proficiency)
SELECT e.id, s.id, 'intermediate'
FROM employees e, skills s
WHERE e.email = 'priya.sharma@collideapparel.com' AND s.name = 'Visual Merchandising'
ON CONFLICT DO NOTHING;

-- Jordan (employee): Selling, Customer Service
INSERT INTO employee_skills (employee_id, skill_id, proficiency)
SELECT e.id, s.id, 'intermediate'
FROM employees e, skills s
WHERE e.email = 'jordan.williams@collideapparel.com' AND s.name = 'Selling'
ON CONFLICT DO NOTHING;

INSERT INTO employee_skills (employee_id, skill_id, proficiency)
SELECT e.id, s.id, 'advanced'
FROM employees e, skills s
WHERE e.email = 'jordan.williams@collideapparel.com' AND s.name = 'Customer Service'
ON CONFLICT DO NOTHING;

-- Anika (employee): Pressing, Inventory Management, Cash Handling
INSERT INTO employee_skills (employee_id, skill_id, proficiency)
SELECT e.id, s.id, 'intermediate'
FROM employees e, skills s
WHERE e.email = 'anika.osei@collideapparel.com' AND s.name = 'Pressing'
ON CONFLICT DO NOTHING;

INSERT INTO employee_skills (employee_id, skill_id, proficiency)
SELECT e.id, s.id, 'advanced'
FROM employees e, skills s
WHERE e.email = 'anika.osei@collideapparel.com' AND s.name = 'Inventory Management'
ON CONFLICT DO NOTHING;

INSERT INTO employee_skills (employee_id, skill_id, proficiency)
SELECT e.id, s.id, 'intermediate'
FROM employees e, skills s
WHERE e.email = 'anika.osei@collideapparel.com' AND s.name = 'Cash Handling'
ON CONFLICT DO NOTHING;

-- Liam (team_lead): Selling, Visual Merchandising, Customer Service
INSERT INTO employee_skills (employee_id, skill_id, proficiency)
SELECT e.id, s.id, 'advanced'
FROM employees e, skills s
WHERE e.email = 'liam.novak@collideapparel.com' AND s.name = 'Selling'
ON CONFLICT DO NOTHING;

INSERT INTO employee_skills (employee_id, skill_id, proficiency)
SELECT e.id, s.id, 'advanced'
FROM employees e, skills s
WHERE e.email = 'liam.novak@collideapparel.com' AND s.name = 'Visual Merchandising'
ON CONFLICT DO NOTHING;

INSERT INTO employee_skills (employee_id, skill_id, proficiency)
SELECT e.id, s.id, 'intermediate'
FROM employees e, skills s
WHERE e.email = 'liam.novak@collideapparel.com' AND s.name = 'Customer Service'
ON CONFLICT DO NOTHING;

-- ── 4. CREATE A VENUE IN VANCOUVER ──
INSERT INTO venues (name, address, city, province, notes)
VALUES ('Vancouver Convention Centre', '1055 Canada Pl', 'Vancouver', 'BC', 'Test venue — delete later')
ON CONFLICT DO NOTHING;

-- ── 5. CREATE 3 TEST EVENTS IN MARCH 2026 (Vancouver) ──
-- Event 1: Vancouver Spring Pop-Up (March 7-9) — will have ALL roles filled (green)
INSERT INTO events (name, start_date, end_date, event_type, status, description)
VALUES ('Vancouver Spring Pop-Up', '2026-03-07', '2026-03-09', 'pop-up', 'confirmed', 'FAKE TEST EVENT — Vancouver — Delete later. All roles filled.');

-- Event 2: Vancouver Street Market (March 14-15) — will have 2 of 4 roles filled (red)
INSERT INTO events (name, start_date, end_date, event_type, status, description)
VALUES ('Vancouver Street Market', '2026-03-14', '2026-03-15', 'market', 'confirmed', 'FAKE TEST EVENT — Vancouver — Delete later. Partial staffing.');

-- Event 3: Vancouver Fashion Expo (March 21-23) — will have 1 of 4 roles filled (red)
INSERT INTO events (name, start_date, end_date, event_type, status, description)
VALUES ('Vancouver Fashion Expo', '2026-03-21', '2026-03-23', 'expo', 'confirmed', 'FAKE TEST EVENT — Vancouver — Delete later. Minimal staffing.');

-- ── 6. LINK EVENTS TO VENUE ──
INSERT INTO event_venues (event_id, venue_id)
SELECT e.id, v.id FROM events e, venues v
WHERE e.name = 'Vancouver Spring Pop-Up' AND v.name = 'Vancouver Convention Centre';

INSERT INTO event_venues (event_id, venue_id)
SELECT e.id, v.id FROM events e, venues v
WHERE e.name = 'Vancouver Street Market' AND v.name = 'Vancouver Convention Centre';

INSERT INTO event_venues (event_id, venue_id)
SELECT e.id, v.id FROM events e, venues v
WHERE e.name = 'Vancouver Fashion Expo' AND v.name = 'Vancouver Convention Centre';

-- ── 7. ADD 4 ROLE REQUIREMENTS PER EVENT ──
-- Event 1: Vancouver Spring Pop-Up (4 roles, all will be filled)
INSERT INTO role_requirements (event_id, role_name, qty_needed)
SELECT id, 'Sales Lead', 1 FROM events WHERE name = 'Vancouver Spring Pop-Up';
INSERT INTO role_requirements (event_id, role_name, qty_needed)
SELECT id, 'Cashier', 1 FROM events WHERE name = 'Vancouver Spring Pop-Up';
INSERT INTO role_requirements (event_id, role_name, qty_needed)
SELECT id, 'Presser', 1 FROM events WHERE name = 'Vancouver Spring Pop-Up';
INSERT INTO role_requirements (event_id, role_name, qty_needed)
SELECT id, 'Merchandiser', 1 FROM events WHERE name = 'Vancouver Spring Pop-Up';

-- Event 2: Vancouver Street Market (4 roles, 2 will be filled)
INSERT INTO role_requirements (event_id, role_name, qty_needed)
SELECT id, 'Sales Lead', 1 FROM events WHERE name = 'Vancouver Street Market';
INSERT INTO role_requirements (event_id, role_name, qty_needed)
SELECT id, 'Cashier', 1 FROM events WHERE name = 'Vancouver Street Market';
INSERT INTO role_requirements (event_id, role_name, qty_needed)
SELECT id, 'Presser', 1 FROM events WHERE name = 'Vancouver Street Market';
INSERT INTO role_requirements (event_id, role_name, qty_needed)
SELECT id, 'Merchandiser', 1 FROM events WHERE name = 'Vancouver Street Market';

-- Event 3: Vancouver Fashion Expo (4 roles, 1 will be filled)
INSERT INTO role_requirements (event_id, role_name, qty_needed)
SELECT id, 'Sales Lead', 1 FROM events WHERE name = 'Vancouver Fashion Expo';
INSERT INTO role_requirements (event_id, role_name, qty_needed)
SELECT id, 'Cashier', 1 FROM events WHERE name = 'Vancouver Fashion Expo';
INSERT INTO role_requirements (event_id, role_name, qty_needed)
SELECT id, 'Presser', 1 FROM events WHERE name = 'Vancouver Fashion Expo';
INSERT INTO role_requirements (event_id, role_name, qty_needed)
SELECT id, 'Merchandiser', 1 FROM events WHERE name = 'Vancouver Fashion Expo';

-- ── 8. CREATE SHIFTS (assigned employees) ──
-- Event 1: Vancouver Spring Pop-Up — ALL 4 roles filled (will show GREEN)
INSERT INTO shifts (event_id, employee_id, shift_date, start_time, end_time, role, status)
SELECT e.id, emp.id, '2026-03-07', '09:00', '17:00', 'Sales Lead', 'confirmed'
FROM events e, employees emp WHERE e.name = 'Vancouver Spring Pop-Up' AND emp.email = 'marcus.chen@collideapparel.com';

INSERT INTO shifts (event_id, employee_id, shift_date, start_time, end_time, role, status)
SELECT e.id, emp.id, '2026-03-07', '09:00', '17:00', 'Cashier', 'confirmed'
FROM events e, employees emp WHERE e.name = 'Vancouver Spring Pop-Up' AND emp.email = 'jordan.williams@collideapparel.com';

INSERT INTO shifts (event_id, employee_id, shift_date, start_time, end_time, role, status)
SELECT e.id, emp.id, '2026-03-07', '09:00', '17:00', 'Presser', 'confirmed'
FROM events e, employees emp WHERE e.name = 'Vancouver Spring Pop-Up' AND emp.email = 'priya.sharma@collideapparel.com';

INSERT INTO shifts (event_id, employee_id, shift_date, start_time, end_time, role, status)
SELECT e.id, emp.id, '2026-03-07', '09:00', '17:00', 'Merchandiser', 'confirmed'
FROM events e, employees emp WHERE e.name = 'Vancouver Spring Pop-Up' AND emp.email = 'liam.novak@collideapparel.com';

-- Event 2: Vancouver Street Market — 2 of 4 roles filled (will show RED)
INSERT INTO shifts (event_id, employee_id, shift_date, start_time, end_time, role, status)
SELECT e.id, emp.id, '2026-03-14', '10:00', '18:00', 'Sales Lead', 'confirmed'
FROM events e, employees emp WHERE e.name = 'Vancouver Street Market' AND emp.email = 'liam.novak@collideapparel.com';

INSERT INTO shifts (event_id, employee_id, shift_date, start_time, end_time, role, status)
SELECT e.id, emp.id, '2026-03-14', '10:00', '18:00', 'Presser', 'confirmed'
FROM events e, employees emp WHERE e.name = 'Vancouver Street Market' AND emp.email = 'anika.osei@collideapparel.com';
-- Cashier and Merchandiser LEFT VACANT

-- Event 3: Vancouver Fashion Expo — 1 of 4 roles filled (will show RED)
INSERT INTO shifts (event_id, employee_id, shift_date, start_time, end_time, role, status)
SELECT e.id, emp.id, '2026-03-21', '08:00', '16:00', 'Cashier', 'confirmed'
FROM events e, employees emp WHERE e.name = 'Vancouver Fashion Expo' AND emp.email = 'jordan.williams@collideapparel.com';
-- Sales Lead, Presser, Merchandiser LEFT VACANT

-- ============================================================
-- SUMMARY:
-- 5 employees: Marcus (admin), Priya (team_lead), Jordan (employee),
--              Anika (employee), Liam (team_lead)
-- 6 skills: Pressing, Selling, Inventory Management, Customer Service,
--           Cash Handling, Visual Merchandising
-- 3 events in Vancouver, March 2026:
--   Spring Pop-Up (Mar 7-9): 4/4 filled → GREEN in calendar
--   Street Market (Mar 14-15): 2/4 filled → RED (2 vacancies)
--   Fashion Expo (Mar 21-23): 1/4 filled → RED (3 vacancies)
-- Total vacancies: 5 unclaimed shifts visible in Staffing Vacancies
-- ============================================================
