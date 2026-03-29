import React, { useState, useMemo } from 'react';
import { Users, AlertCircle, Clock, DollarSign, Briefcase, Calendar } from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { StatCard, SectionCard, EmptyState } from '../components';
import { BRAND } from '../constants/brand';
import { EVENT_TYPE_DEFAULTS } from '../constants/events';
import { currency } from '../utils/formatters';

const StaffingProjectionsPage = ({ events = [], employees = [], shifts = [], roleRequirements = [], historicSales = [] }) => {
  const [hourlyOverride, setHourlyOverride] = useState("");

  const activeEmployees = employees.filter(e => e.status === "active");
  const avgHourlyRate = activeEmployees.length > 0
    ? activeEmployees.reduce((s, e) => s + Number(e.hourly_rate || 0), 0) / activeEmployees.length
    : 20;
  const effectiveRate = hourlyOverride ? parseFloat(hourlyOverride) : avgHourlyRate;

  // Upcoming events
  const upcomingEvents = useMemo(() => {
    const now = new Date().toISOString().split("T")[0];
    return events.filter(e => e.start_date >= now).sort((a, b) => a.start_date.localeCompare(b.start_date));
  }, [events]);

  // Calculate staffing needs per event
  const staffingNeeds = useMemo(() => {
    return upcomingEvents.map(event => {
      const type = event.event_type || "festival";
      const defaults = EVENT_TYPE_DEFAULTS[type] || EVENT_TYPE_DEFAULTS.other;
      const days = event.end_date && event.start_date
        ? Math.max(1, Math.ceil((new Date(event.end_date) - new Date(event.start_date)) / (1000 * 60 * 60 * 24)) + 1)
        : defaults.avgDays;

      // Check existing role requirements for this event
      const eventReqs = roleRequirements.filter(r => r.event_id === event.id);
      const reqStaff = eventReqs.reduce((sum, r) => sum + (r.qty_needed || 0), 0);

      // Check already-assigned shifts
      const eventShifts = shifts.filter(s => s.event_id === event.id);
      const assignedStaff = new Set(eventShifts.map(s => s.employee_id)).size;

      const neededStaff = reqStaff > 0 ? reqStaff : defaults.staffPerDay * days;
      const gap = Math.max(0, neededStaff - assignedStaff);
      const hoursPerStaff = 8; // assume 8hr shifts
      const totalHours = neededStaff * hoursPerStaff * days;
      const laborCost = totalHours * effectiveRate;

      return {
        ...event,
        eventType: type,
        days,
        neededStaff,
        assignedStaff,
        gap,
        totalHours,
        laborCost,
        fillRate: neededStaff > 0 ? (assignedStaff / neededStaff) * 100 : 0,
      };
    });
  }, [upcomingEvents, roleRequirements, shifts, effectiveRate]);

  const totalStaffNeeded = staffingNeeds.reduce((s, e) => s + e.neededStaff, 0);
  const totalGaps = staffingNeeds.reduce((s, e) => s + e.gap, 0);
  const totalLaborCost = staffingNeeds.reduce((s, e) => s + e.laborCost, 0);
  const totalHours = staffingNeeds.reduce((s, e) => s + e.totalHours, 0);

  // Chart data — staffing gaps
  const gapChartData = staffingNeeds.slice(0, 10).map(e => ({
    name: e.name?.substring(0, 15) || "Event",
    needed: e.neededStaff,
    assigned: e.assignedStaff,
    gap: e.gap,
  }));

  // Labor cost by event type
  const laborByType = useMemo(() => {
    const map = {};
    staffingNeeds.forEach(e => {
      const label = EVENT_TYPE_DEFAULTS[e.eventType]?.label || e.eventType;
      if (!map[label]) map[label] = 0;
      map[label] += e.laborCost;
    });
    return Object.entries(map).map(([name, cost]) => ({ name, cost: Math.round(cost) })).sort((a, b) => b.cost - a.cost);
  }, [staffingNeeds]);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-4">
        <h1 className="text-2xl font-bold" style={{ color: BRAND.text }}>Staffing Projections</h1>
        <div className="flex items-center gap-2 px-3 py-2 rounded-lg" style={{ background: "rgba(255,255,255,0.05)", border: `1px solid ${BRAND.glassBorder}` }}>
          <span className="text-xs" style={{ color: "rgba(224,230,255,0.6)" }}>Avg Rate</span>
          <input
            type="number"
            placeholder={avgHourlyRate.toFixed(2)}
            value={hourlyOverride}
            onChange={(e) => setHourlyOverride(e.target.value)}
            className="w-20 px-2 py-1 rounded text-sm text-white text-center focus:outline-none"
            style={{ background: "rgba(255,255,255,0.08)", border: `1px solid ${BRAND.glassBorder}` }}
          />
          <span className="text-xs" style={{ color: BRAND.primary }}>$/hr</span>
        </div>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard label="Staff Needed" value={totalStaffNeeded} icon={Users} color="primary" />
        <StatCard label="Staffing Gaps" value={totalGaps} icon={AlertCircle} color={totalGaps > 0 ? "danger" : "success"} />
        <StatCard label="Total Hours" value={`${totalHours.toLocaleString()}h`} icon={Clock} color="warning" />
        <StatCard label="Labor Cost" value={currency(totalLaborCost)} icon={DollarSign} color="primary" />
      </div>

      {/* Staffing Gap Chart */}
      <SectionCard title="Staffing Gaps by Event" icon={Users}>
        {gapChartData.length > 0 ? (
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={gapChartData} margin={{ top: 10, right: 10, left: 10, bottom: 40 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.1)" />
              <XAxis dataKey="name" tick={{ fill: "rgba(224,230,255,0.6)", fontSize: 11 }} angle={-25} textAnchor="end" />
              <YAxis tick={{ fill: "rgba(224,230,255,0.6)", fontSize: 11 }} />
              <Tooltip contentStyle={{ background: BRAND.navy, border: `1px solid ${BRAND.glassBorder}`, borderRadius: 8, color: BRAND.text }} />
              <Legend />
              <Bar dataKey="assigned" stackId="a" fill={BRAND.success} name="Assigned" radius={[0, 0, 0, 0]} />
              <Bar dataKey="gap" stackId="a" fill={BRAND.danger} name="Gap" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        ) : (
          <EmptyState icon={Users} title="No upcoming events" message="Add events to see staffing projections" />
        )}
      </SectionCard>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Labor by Event Type */}
        <SectionCard title="Labor Cost by Event Type" icon={DollarSign}>
          {laborByType.length > 0 ? (
            <ResponsiveContainer width="100%" height={250}>
              <BarChart data={laborByType} layout="vertical" margin={{ top: 10, right: 20, left: 80, bottom: 10 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.1)" />
                <XAxis type="number" tick={{ fill: "rgba(224,230,255,0.6)", fontSize: 11 }} tickFormatter={(v) => `$${(v / 1000).toFixed(0)}k`} />
                <YAxis dataKey="name" type="category" tick={{ fill: "rgba(224,230,255,0.6)", fontSize: 11 }} width={70} />
                <Tooltip contentStyle={{ background: BRAND.navy, border: `1px solid ${BRAND.glassBorder}`, borderRadius: 8, color: BRAND.text }} formatter={(v) => [currency(v), "Labor Cost"]} />
                <Bar dataKey="cost" fill={BRAND.primary} radius={[0, 4, 4, 0]} />
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <EmptyState icon={DollarSign} title="No data" message="Staffing projections will appear here" />
          )}
        </SectionCard>

        {/* Workforce Capacity */}
        <SectionCard title="Workforce Capacity" icon={Briefcase}>
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <span style={{ color: BRAND.text }}>Active Employees</span>
              <span className="font-semibold" style={{ color: BRAND.primary }}>{activeEmployees.length}</span>
            </div>
            <div className="flex items-center justify-between">
              <span style={{ color: BRAND.text }}>Peak Staff Needed</span>
              <span className="font-semibold" style={{ color: BRAND.warning }}>
                {staffingNeeds.length > 0 ? Math.max(...staffingNeeds.map(e => e.neededStaff)) : 0}
              </span>
            </div>
            <div className="flex items-center justify-between">
              <span style={{ color: BRAND.text }}>Events with Gaps</span>
              <span className="font-semibold" style={{ color: BRAND.danger }}>
                {staffingNeeds.filter(e => e.gap > 0).length} / {staffingNeeds.length}
              </span>
            </div>
            <div className="mt-4 p-3 rounded-lg" style={{ background: "rgba(255,255,255,0.04)" }}>
              <p className="text-xs mb-2" style={{ color: "rgba(224,230,255,0.5)" }}>Overall Fill Rate</p>
              <div className="w-full h-3 rounded-full overflow-hidden" style={{ background: "rgba(255,255,255,0.1)" }}>
                <div
                  className="h-full rounded-full transition-all"
                  style={{
                    width: `${totalStaffNeeded > 0 ? Math.min(100, ((totalStaffNeeded - totalGaps) / totalStaffNeeded) * 100) : 0}%`,
                    background: totalGaps === 0 ? BRAND.success : totalGaps > totalStaffNeeded * 0.3 ? BRAND.danger : BRAND.warning,
                  }}
                />
              </div>
              <p className="text-sm mt-1 font-semibold" style={{ color: BRAND.primary }}>
                {totalStaffNeeded > 0 ? ((totalStaffNeeded - totalGaps) / totalStaffNeeded * 100).toFixed(0) : 100}% filled
              </p>
            </div>
          </div>
        </SectionCard>
      </div>

      {/* Detailed Table */}
      <SectionCard title="Event Staffing Detail" icon={Calendar}>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr style={{ borderBottom: `1px solid ${BRAND.glassBorder}` }}>
                <th className="text-left py-3 px-3" style={{ color: BRAND.primary }}>Event</th>
                <th className="text-center py-3 px-3" style={{ color: BRAND.primary }}>Date</th>
                <th className="text-center py-3 px-3" style={{ color: BRAND.primary }}>Days</th>
                <th className="text-center py-3 px-3" style={{ color: BRAND.primary }}>Needed</th>
                <th className="text-center py-3 px-3" style={{ color: BRAND.primary }}>Assigned</th>
                <th className="text-center py-3 px-3" style={{ color: BRAND.primary }}>Gap</th>
                <th className="text-center py-3 px-3" style={{ color: BRAND.primary }}>Fill Rate</th>
                <th className="text-right py-3 px-3" style={{ color: BRAND.primary }}>Labor Cost</th>
              </tr>
            </thead>
            <tbody>
              {staffingNeeds.map(e => (
                <tr key={e.id} className="hover:bg-white/5 transition" style={{ borderBottom: `1px solid ${BRAND.glassBorder}` }}>
                  <td className="py-3 px-3 font-medium" style={{ color: BRAND.text }}>{e.name}</td>
                  <td className="py-3 px-3 text-center text-xs" style={{ color: "rgba(224,230,255,0.7)" }}>{e.start_date}</td>
                  <td className="py-3 px-3 text-center" style={{ color: BRAND.text }}>{e.days}</td>
                  <td className="py-3 px-3 text-center" style={{ color: BRAND.primary }}>{e.neededStaff}</td>
                  <td className="py-3 px-3 text-center" style={{ color: BRAND.success }}>{e.assignedStaff}</td>
                  <td className="py-3 px-3 text-center font-semibold" style={{ color: e.gap > 0 ? BRAND.danger : BRAND.success }}>
                    {e.gap > 0 ? `-${e.gap}` : "0"}
                  </td>
                  <td className="py-3 px-3 text-center">
                    <div className="inline-flex items-center gap-1">
                      <div className="w-16 h-2 rounded-full overflow-hidden" style={{ background: "rgba(255,255,255,0.1)" }}>
                        <div className="h-full rounded-full" style={{ width: `${Math.min(100, e.fillRate)}%`, background: e.fillRate >= 100 ? BRAND.success : e.fillRate >= 50 ? BRAND.warning : BRAND.danger }} />
                      </div>
                      <span className="text-xs" style={{ color: "rgba(224,230,255,0.6)" }}>{e.fillRate.toFixed(0)}%</span>
                    </div>
                  </td>
                  <td className="py-3 px-3 text-right" style={{ color: BRAND.primary }}>{currency(e.laborCost)}</td>
                </tr>
              ))}
            </tbody>
          </table>
          {staffingNeeds.length === 0 && <EmptyState icon={Users} title="No upcoming events" message="Add events to project staffing needs" />}
        </div>
      </SectionCard>
    </div>
  );
};

export default StaffingProjectionsPage;
