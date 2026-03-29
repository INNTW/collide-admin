import React, { useState, useMemo } from 'react';
import { Calendar, Clock, FileText, Star, AlertCircle, MapPin } from 'lucide-react';
import { Badge, EmptyState, StatCard, SectionCard } from '../components';
import { BRAND } from '../constants/brand';
import { EVENT_TYPE_DEFAULTS } from '../constants/events';

const MyShiftsPage = ({ employees = [], events = [], shifts = [], user, locations = [] }) => {
  const [viewMode, setViewMode] = useState("upcoming"); // upcoming, past, all

  // Find the current logged-in employee
  const currentEmployee = employees.find(e => e.email === user?.email);

  // Get shifts for this employee
  const myShifts = useMemo(() => {
    if (!currentEmployee) return [];
    return shifts
      .filter(s => s.employee_id === currentEmployee.id)
      .map(s => {
        const event = events.find(e => e.id === s.event_id);
        const location = event ? locations.find(l => l.id === event.location_id) : null;
        return { ...s, event, location };
      })
      .sort((a, b) => {
        const dateA = a.event?.start_date || "";
        const dateB = b.event?.start_date || "";
        return dateA.localeCompare(dateB);
      });
  }, [currentEmployee, shifts, events, locations]);

  const now = new Date().toISOString().split("T")[0];
  const upcomingShifts = myShifts.filter(s => s.event?.start_date >= now);
  const pastShifts = myShifts.filter(s => s.event?.start_date < now);

  const displayShifts = viewMode === "upcoming" ? upcomingShifts : viewMode === "past" ? pastShifts : myShifts;

  // Total hours calculation
  const totalUpcomingHours = upcomingShifts.reduce((sum, s) => {
    if (s.start_time && s.end_time) {
      const [sh, sm] = s.start_time.split(":").map(Number);
      const [eh, em] = s.end_time.split(":").map(Number);
      return sum + ((eh * 60 + em) - (sh * 60 + sm)) / 60;
    }
    return sum + 8;
  }, 0);

  // Group shifts by event
  const shiftsByEvent = useMemo(() => {
    const map = {};
    displayShifts.forEach(s => {
      const eventId = s.event?.id || "unassigned";
      if (!map[eventId]) map[eventId] = { event: s.event, location: s.location, shifts: [] };
      map[eventId].shifts.push(s);
    });
    return Object.values(map);
  }, [displayShifts]);

  if (!currentEmployee) {
    return (
      <div className="space-y-6">
        <h1 className="text-2xl font-bold" style={{ color: BRAND.text }}>My Shifts</h1>
        <SectionCard title="Employee Not Found" icon={AlertCircle}>
          <p className="text-sm" style={{ color: "rgba(224,230,255,0.7)" }}>
            No employee profile found for your account ({user?.email}). Please contact an admin to link your account.
          </p>
        </SectionCard>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div>
          <h1 className="text-2xl font-bold" style={{ color: BRAND.text }}>My Shifts</h1>
          <p className="text-sm mt-1" style={{ color: "rgba(224,230,255,0.6)" }}>
            Welcome, {currentEmployee.first_name}. Here are your assigned shifts.
          </p>
        </div>
        <div className="flex gap-2">
          {["upcoming", "past", "all"].map(mode => (
            <button
              key={mode}
              onClick={() => setViewMode(mode)}
              className="px-3 py-1.5 rounded-lg text-sm capitalize transition"
              style={{
                background: viewMode === mode ? `${BRAND.primary}20` : "rgba(255,255,255,0.05)",
                color: viewMode === mode ? BRAND.primary : "rgba(224,230,255,0.6)",
                border: `1px solid ${viewMode === mode ? BRAND.primary : BRAND.glassBorder}`,
              }}
            >
              {mode}
            </button>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard label="Upcoming Shifts" value={upcomingShifts.length} icon={Calendar} color="primary" />
        <StatCard label="Upcoming Hours" value={`${totalUpcomingHours.toFixed(1)}h`} icon={Clock} color="success" />
        <StatCard label="Past Shifts" value={pastShifts.length} icon={FileText} color="warning" />
        <StatCard label="Total Shifts" value={myShifts.length} icon={Star} color="primary" />
      </div>

      {shiftsByEvent.length === 0 ? (
        <SectionCard title="No Shifts Found" icon={Calendar}>
          <EmptyState
            icon={Calendar}
            title={viewMode === "upcoming" ? "No upcoming shifts" : viewMode === "past" ? "No past shifts" : "No shifts assigned"}
            message="Shifts will appear here once you're assigned to events."
          />
        </SectionCard>
      ) : (
        shiftsByEvent.map((group, idx) => (
          <SectionCard
            key={group.event?.id || idx}
            title={group.event?.name || "Unassigned"}
            icon={Calendar}
          >
            <div className="mb-3 flex items-center gap-4 text-xs" style={{ color: "rgba(224,230,255,0.6)" }}>
              {group.event?.start_date && (
                <span>{group.event.start_date}{group.event.end_date && group.event.end_date !== group.event.start_date ? ` — ${group.event.end_date}` : ""}</span>
              )}
              {group.location && <span className="flex items-center gap-1"><MapPin size={12} />{group.location.name}</span>}
              {group.event?.event_type && (
                <span className="px-2 py-0.5 rounded-full" style={{ background: "rgba(84,205,249,0.15)", color: BRAND.primary }}>
                  {EVENT_TYPE_DEFAULTS[group.event.event_type]?.label || group.event.event_type}
                </span>
              )}
            </div>
            <div className="space-y-2">
              {group.shifts.map(shift => (
                <div
                  key={shift.id}
                  className="flex items-center justify-between p-3 rounded-lg"
                  style={{ background: "rgba(255,255,255,0.05)" }}
                >
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-lg flex items-center justify-center" style={{ background: `${BRAND.primary}20` }}>
                      <Clock size={18} style={{ color: BRAND.primary }} />
                    </div>
                    <div>
                      <p className="font-medium text-sm" style={{ color: BRAND.text }}>
                        {shift.start_time && shift.end_time
                          ? `${shift.start_time.substring(0, 5)} — ${shift.end_time.substring(0, 5)}`
                          : "Time TBD"}
                      </p>
                      {shift.role && (
                        <p className="text-xs" style={{ color: "rgba(224,230,255,0.6)" }}>Role: {shift.role}</p>
                      )}
                    </div>
                  </div>
                  <Badge color={shift.event?.start_date >= now ? "success" : "gray"}>
                    {shift.event?.start_date >= now ? "Upcoming" : "Completed"}
                  </Badge>
                </div>
              ))}
            </div>
          </SectionCard>
        ))
      )}
    </div>
  );
};

export default MyShiftsPage;
