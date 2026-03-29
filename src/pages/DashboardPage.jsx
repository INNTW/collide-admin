import React, { useMemo } from "react";
import { Users, Calendar, DollarSign, TrendingUp, Clock, UserCheck } from "lucide-react";
import { StatCard, SectionCard, EmptyState, Badge } from "../components";
import { BRAND } from "../constants/brand";
import { formatDate, currency } from "../utils/formatters";

/** Parse "HH:MM" into fractional hours */
const parseTime = (t) => {
  if (!t) return null;
  const [h, m] = t.split(":").map(Number);
  if (isNaN(h) || isNaN(m)) return null;
  return h + m / 60;
};

/** Duration in hours between two "HH:MM" strings. Handles overnight (end < start). */
const shiftDurationHours = (start_time, end_time) => {
  const s = parseTime(start_time);
  const e = parseTime(end_time);
  if (s === null || e === null) return null;
  let dur = e - s;
  if (dur <= 0) dur += 24; // overnight shift
  return dur;
};

const DashboardPage = ({ employees = [], events = [], locations = [], shifts = [], availability = {}, products = [], stock = {}, historicSales = [] }) => {
  const today = new Date().toISOString().split("T")[0];
  const upcomingEvents = (events || [])
    .filter((e) => e.end_date >= today)
    .sort((a, b) => a.start_date.localeCompare(b.start_date))
    .slice(0, 5);

  const totalStaff = (employees || []).length;

  // Build employee lookup by id for hourly_rate
  const employeeMap = useMemo(() => {
    const map = {};
    (employees || []).forEach((emp) => {
      map[emp.id] = emp;
    });
    return map;
  }, [employees]);

  // Average shift duration across all shifts
  const avgShiftDuration = useMemo(() => {
    const durations = (shifts || [])
      .map((s) => shiftDurationHours(s.start_time, s.end_time))
      .filter((d) => d !== null && d > 0);
    if (durations.length === 0) return null;
    const avg = durations.reduce((sum, d) => sum + d, 0) / durations.length;
    return Math.round(avg * 10) / 10;
  }, [shifts]);

  // Payroll this month: sum of (shift duration * employee hourly_rate) for shifts in current month
  const payrollThisMonth = useMemo(() => {
    const now = new Date();
    const yearMonth = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
    let total = 0;
    (shifts || []).forEach((s) => {
      if (!s.shift_date || !s.shift_date.startsWith(yearMonth)) return;
      const dur = shiftDurationHours(s.start_time, s.end_time);
      if (!dur || dur <= 0) return;
      const emp = employeeMap[s.employee_id];
      const rate = emp?.hourly_rate ?? 0;
      total += dur * rate;
    });
    return total;
  }, [shifts, employeeMap]);

  // Shifts this week: count shifts whose shift_date falls within the current week (Mon-Sun)
  const shiftsThisWeek = useMemo(() => {
    const now = new Date();
    // Get Monday of the current week
    const day = now.getDay(); // 0=Sun, 1=Mon...
    const diffToMonday = day === 0 ? -6 : 1 - day;
    const monday = new Date(now);
    monday.setDate(now.getDate() + diffToMonday);
    monday.setHours(0, 0, 0, 0);
    const mondayStr = monday.toISOString().split("T")[0];

    const sunday = new Date(monday);
    sunday.setDate(monday.getDate() + 6);
    const sundayStr = sunday.toISOString().split("T")[0];

    return (shifts || []).filter(
      (s) => s.shift_date && s.shift_date >= mondayStr && s.shift_date <= sundayStr
    ).length;
  }, [shifts]);

  // Staff available today: count employees whose availability for today is "available"
  const staffAvailableToday = useMemo(() => {
    let count = 0;
    const empIds = Object.keys(availability || {});
    empIds.forEach((empId) => {
      const status = (availability[empId] || {})[today];
      if (status === "available") count++;
    });
    return count;
  }, [availability, today]);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold mb-2" style={{ color: BRAND.text }}>
          Dashboard
        </h1>
        <p style={{ color: "rgba(224,230,255,0.7)" }}>
          Welcome back! Here's your team overview.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-6 gap-4">
        <StatCard
          icon={Users}
          label="Total Staff"
          value={totalStaff}
          color="primary"
        />
        <StatCard
          icon={Calendar}
          label="Upcoming Events"
          value={upcomingEvents.length}
          color="warning"
        />
        <StatCard
          icon={DollarSign}
          label="Payroll This Month"
          value={currency(payrollThisMonth)}
          color="success"
        />
        <StatCard
          icon={TrendingUp}
          label="Avg Shift Duration"
          value={avgShiftDuration !== null ? `${avgShiftDuration}h` : "\u2014"}
          color="warning"
        />
        <StatCard
          icon={Clock}
          label="Shifts This Week"
          value={shiftsThisWeek}
          color="primary"
        />
        <StatCard
          icon={UserCheck}
          label="Staff Available Today"
          value={staffAvailableToday}
          color="success"
        />
      </div>

      <SectionCard title="Upcoming Events" icon={Calendar}>
        {upcomingEvents.length === 0 ? (
          <EmptyState title="No events" message="All upcoming shifts are scheduled" />
        ) : (
          <div className="space-y-2">
            {upcomingEvents.map((event) => (
              <div
                key={event.id}
                className="p-3 rounded-lg"
                style={{ background: "rgba(255,255,255,0.05)" }}
              >
                <div className="flex justify-between items-start">
                  <div>
                    <p className="font-medium" style={{ color: BRAND.text }}>
                      {event.name}
                    </p>
                    <p className="text-sm" style={{ color: "rgba(224,230,255,0.6)" }}>
                      {formatDate(event.start_date)} — {formatDate(event.end_date)}
                    </p>
                  </div>
                  <Badge color={event.status === "active" ? "success" : event.status === "upcoming" ? "primary" : "gray"}>{event.status || "upcoming"}</Badge>
                </div>
              </div>
            ))}
          </div>
        )}
      </SectionCard>
    </div>
  );
};

export default DashboardPage;
