import React, { useState, useEffect, useMemo } from 'react';
import { Users, Calendar } from 'lucide-react';
import { Select, Btn, SectionCard } from '../components';
import { BRAND } from '../constants/brand';

const AvailabilityPage = ({ employees = [], events = [], availability: parentAvailability = {}, onRefresh, user, currentRole }) => {
  const [selectedEmployee, setSelectedEmployee] = useState("");
  const [weekOffset, setWeekOffset] = useState(0);
  const [weekSlots, setWeekSlots] = useState({});
  const [saving, setSaving] = useState(false);
  const [saveMsg, setSaveMsg] = useState(null);

  // Find the logged-in user's employee record
  const currentEmployee = useMemo(
    () => employees.find((e) => e.email === user?.email),
    [employees, user]
  );

  const isEmployeeOnly = currentRole === "employee";

  // Auto-select: employees locked to self, admins default to first
  useEffect(() => {
    if (isEmployeeOnly && currentEmployee) {
      setSelectedEmployee(currentEmployee.id);
    } else if (!selectedEmployee && employees.length > 0) {
      setSelectedEmployee(employees[0].id);
    }
  }, [employees, currentEmployee, isEmployeeOnly]);

  // Compute the 7 days of the current week view
  const weekDays = useMemo(() => {
    const today = new Date();
    const dayOfWeek = today.getDay();
    const monday = new Date(today);
    monday.setDate(today.getDate() - ((dayOfWeek + 6) % 7) + weekOffset * 7);
    return Array.from({ length: 7 }, (_, i) => {
      const d = new Date(monday);
      d.setDate(monday.getDate() + i);
      return d;
    });
  }, [weekOffset]);

  const formatDate = (d) => d.toISOString().split("T")[0];
  const dayNames = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

  // Build weekSlots from parentAvailability when employee or week changes
  useEffect(() => {
    if (!selectedEmployee) return;
    const empAvail = parentAvailability[selectedEmployee] || {};
    const slots = {};
    weekDays.forEach((d) => {
      const key = formatDate(d);
      slots[key] = empAvail[key] || "available";
    });
    setWeekSlots(slots);
  }, [selectedEmployee, weekDays, parentAvailability]);

  const statusColors = {
    available: { bg: "rgba(74,222,128,0.2)", color: "#4ade80", label: "Available" },
    tentative: { bg: "rgba(251,191,36,0.2)", color: "#fbbf24", label: "Tentative" },
    unavailable: { bg: "rgba(244,67,54,0.2)", color: "#ef4444", label: "Unavailable" },
  };
  const statusCycle = ["available", "tentative", "unavailable"];

  const cycleStatus = (dateKey) => {
    setWeekSlots((prev) => {
      const current = prev[dateKey] || "available";
      const nextIdx = (statusCycle.indexOf(current) + 1) % statusCycle.length;
      return { ...prev, [dateKey]: statusCycle[nextIdx] };
    });
  };

  const handleSave = async () => {
    if (!selectedEmployee) return;
    setSaving(true);
    setSaveMsg(null);

    try {
      let token = null;
      try {
        const key = Object.keys(localStorage).find((k) => k.startsWith("sb-") && k.endsWith("-auth-token"));
        if (key) {
          const stored = JSON.parse(localStorage.getItem(key));
          token = stored?.access_token || null;
        }
      } catch (e) { /* ignore */ }

      if (!token) {
        setSaveMsg({ type: "error", text: "Session expired — please log in again." });
        return;
      }

      // Build upsert rows for the week
      const rows = Object.entries(weekSlots).map(([date, status]) => ({
        employee_id: selectedEmployee,
        avail_date: date,
        status,
      }));

      const res = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/rest/v1/employee_availability`,
        {
          method: "POST",
          headers: {
            Authorization: `Bearer ${token}`,
            apikey: import.meta.env.VITE_SUPABASE_ANON_KEY,
            "Content-Type": "application/json",
            Prefer: "resolution=merge-duplicates",
          },
          body: JSON.stringify(rows),
        }
      );

      if (!res.ok) {
        const errText = await res.text();
        console.error("Failed to save availability:", errText);
        setSaveMsg({ type: "error", text: "Failed to save: " + errText });
        return;
      }

      setSaveMsg({ type: "success", text: "Availability saved!" });
      if (onRefresh) await onRefresh();
    } catch (err) {
      console.error("Save error:", err);
      setSaveMsg({ type: "error", text: "Failed to save: " + (err.message || "Unknown error") });
    } finally {
      setSaving(false);
    }
  };

  const weekLabel = weekDays.length > 0
    ? `${weekDays[0].toLocaleDateString("en-US", { month: "short", day: "numeric" })} – ${weekDays[6].toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}`
    : "";

  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-bold" style={{ color: BRAND.text }}>
        Availability
      </h1>

      <SectionCard title={isEmployeeOnly ? "Your Availability" : "Select Employee"} icon={Users}>
        {isEmployeeOnly ? (
          <div className="px-4 py-3 rounded-lg" style={{ background: "rgba(255,255,255,0.05)", border: `1px solid ${BRAND.glassBorder}` }}>
            <span style={{ color: BRAND.text }}>
              {currentEmployee
                ? `${currentEmployee.first_name} ${currentEmployee.last_name}`
                : user?.email || "You"}
            </span>
          </div>
        ) : (
          <Select
            value={selectedEmployee}
            onChange={(e) => setSelectedEmployee(e.target.value)}
            options={employees.map((e) => ({
              value: e.id,
              label: `${e.first_name} ${e.last_name}`,
            }))}
            placeholder="Select an employee..."
          />
        )}
      </SectionCard>

      <SectionCard title="Weekly Schedule" icon={Calendar}>
        {/* Week navigation */}
        <div className="flex items-center justify-between mb-4">
          <Btn variant="ghost" size="sm" onClick={() => setWeekOffset((w) => w - 1)}>← Prev</Btn>
          <span className="text-sm font-medium" style={{ color: BRAND.text }}>{weekLabel}</span>
          <Btn variant="ghost" size="sm" onClick={() => setWeekOffset((w) => w + 1)}>Next →</Btn>
        </div>

        {/* Tap-to-cycle legend */}
        <div className="flex gap-3 mb-4 flex-wrap">
          {statusCycle.map((s) => (
            <div key={s} className="flex items-center gap-1.5">
              <div className="w-3 h-3 rounded-full" style={{ background: statusColors[s].color }} />
              <span className="text-xs" style={{ color: "rgba(224,230,255,0.7)" }}>{statusColors[s].label}</span>
            </div>
          ))}
        </div>

        {/* Day slots */}
        <div className="space-y-2">
          {weekDays.map((d, idx) => {
            const key = formatDate(d);
            const status = weekSlots[key] || "available";
            const sc = statusColors[status];
            const isToday = formatDate(d) === formatDate(new Date());
            return (
              <div
                key={key}
                onClick={() => cycleStatus(key)}
                className="flex items-center justify-between p-4 rounded-lg cursor-pointer transition-all active:scale-[0.98]"
                style={{
                  background: sc.bg,
                  border: isToday ? `2px solid ${BRAND.primary}` : "2px solid transparent",
                  minHeight: 56,
                }}
              >
                <div>
                  <span className="text-sm font-semibold" style={{ color: BRAND.text }}>
                    {dayNames[idx]}
                  </span>
                  <span className="text-xs ml-2" style={{ color: "rgba(224,230,255,0.5)" }}>
                    {d.toLocaleDateString("en-US", { month: "short", day: "numeric" })}
                  </span>
                  {isToday && (
                    <span className="text-xs ml-2 px-1.5 py-0.5 rounded" style={{ background: `${BRAND.primary}30`, color: BRAND.primary }}>Today</span>
                  )}
                </div>
                <span className="text-xs font-semibold px-3 py-1 rounded-full" style={{ background: sc.bg, color: sc.color }}>
                  {sc.label}
                </span>
              </div>
            );
          })}
        </div>

        <p className="text-xs mt-2" style={{ color: "rgba(224,230,255,0.4)" }}>
          Tap a day to cycle: Available → Tentative → Unavailable
        </p>

        {saveMsg && (
          <div className="mt-3 p-3 rounded-lg text-sm" style={{
            background: saveMsg.type === "success" ? "rgba(74,222,128,0.15)" : "rgba(244,67,54,0.15)",
            color: saveMsg.type === "success" ? "#4ade80" : "#ef4444",
          }}>
            {saveMsg.text}
          </div>
        )}

        <Btn variant="primary" className="w-full mt-4" onClick={handleSave} disabled={saving || !selectedEmployee}>
          {saving ? "Saving..." : "Save Availability"}
        </Btn>
      </SectionCard>
    </div>
  );
};

export default AvailabilityPage;
