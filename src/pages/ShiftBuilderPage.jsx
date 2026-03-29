import { useState, useMemo } from "react";
import { Calendar, Clock, Briefcase, Plus, Trash2, AlertTriangle, Users } from "lucide-react";
import { Badge, Btn, EmptyState, Input, SectionCard, Select } from "../components";
import { BRAND } from "../constants/brand";
import { formatDate, formatTime } from "../utils/formatters";
import { supabase } from "../lib/supabase";

// Generate an array of date strings (YYYY-MM-DD) from start to end inclusive
const getDateRange = (startDate, endDate) => {
  if (!startDate) return [];
  const dates = [];
  const start = new Date(startDate + "T00:00:00");
  const end = endDate ? new Date(endDate + "T00:00:00") : start;
  const current = new Date(start);
  while (current <= end) {
    dates.push(current.toISOString().split("T")[0]);
    current.setDate(current.getDate() + 1);
  }
  return dates;
};

// Calculate shift duration in hours from HH:MM strings
const calcDurationHours = (startTime, endTime) => {
  if (!startTime || !endTime) return 0;
  const [sh, sm] = startTime.split(":").map(Number);
  const [eh, em] = endTime.split(":").map(Number);
  let mins = (eh * 60 + em) - (sh * 60 + sm);
  if (mins < 0) mins += 24 * 60; // overnight shift
  return Math.round((mins / 60) * 10) / 10;
};

// Check if two time ranges overlap
const timesOverlap = (start1, end1, start2, end2) => {
  return start1 < end2 && start2 < end1;
};

// Format a date string nicely for display (e.g. "Sat, Mar 29")
const formatDateHeader = (dateStr) => {
  const d = new Date(dateStr + "T00:00:00");
  return d.toLocaleDateString("en-CA", { weekday: "short", month: "short", day: "numeric" });
};

const ShiftBuilderPage = ({ events = [], employees = [], shifts: existingShifts = [], locations = [], roleRequirements = [], availability = {}, onRefresh }) => {
  const [selectedEvent, setSelectedEvent] = useState(events[0]?.id || "");
  const [draftShifts, setDraftShifts] = useState([]);
  const [showAddForm, setShowAddForm] = useState(false);

  const currentEvent = events.find((e) => e.id === selectedEvent);
  const eventRoles = roleRequirements.filter((r) => r.event_id === selectedEvent);

  // Generate date range for current event
  const eventDates = useMemo(() => {
    if (!currentEvent) return [];
    return getDateRange(currentEvent.start_date, currentEvent.end_date);
  }, [currentEvent]);

  const [newShift, setNewShift] = useState({
    employee_id: "",
    shift_date: currentEvent?.start_date || "",
    start_time: "09:00",
    end_time: "17:00",
    role: "",
  });

  // Combine existing Supabase shifts for this event with any draft shifts
  const eventShifts = existingShifts.filter(s => s.event_id === selectedEvent);
  const allShifts = [...eventShifts, ...draftShifts.filter(d => !eventShifts.some(s => s.id === d.id))];

  // Group shifts by date
  const shiftsByDate = useMemo(() => {
    const grouped = {};
    allShifts.forEach(shift => {
      const date = shift.shift_date || "unknown";
      if (!grouped[date]) grouped[date] = [];
      grouped[date].push(shift);
    });
    // Sort dates
    return Object.keys(grouped)
      .sort()
      .reduce((acc, date) => {
        acc[date] = grouped[date];
        return acc;
      }, {});
  }, [allShifts]);

  // Conflict detection: check all existing shifts for a given employee on a given date/time
  const getEmployeeConflicts = (employeeId, shiftDate, startTime, endTime) => {
    if (!employeeId || !shiftDate) return { hasTimeConflict: false, isUnavailable: false };

    // Check time overlap with existing shifts (across ALL events, not just this one)
    const hasTimeConflict = existingShifts.some(s =>
      s.employee_id === employeeId &&
      s.shift_date === shiftDate &&
      timesOverlap(startTime, endTime, s.start_time, s.end_time)
    );

    // Check availability status
    const empAvail = availability[employeeId];
    const isUnavailable = empAvail && empAvail[shiftDate] === "unavailable";

    return { hasTimeConflict, isUnavailable };
  };

  // Get availability status for an employee on a specific date
  const getAvailabilityStatus = (employeeId, shiftDate) => {
    const empAvail = availability[employeeId];
    if (!empAvail || !empAvail[shiftDate]) return "unknown";
    return empAvail[shiftDate]; // "available", "unavailable", etc.
  };

  // Build employee options with conflict warnings for the dropdown
  const employeeOptions = useMemo(() => {
    return employees.map(emp => {
      const { hasTimeConflict, isUnavailable } = getEmployeeConflicts(
        emp.id, newShift.shift_date, newShift.start_time, newShift.end_time
      );
      let warning = "";
      if (hasTimeConflict && isUnavailable) warning = " [TIME CONFLICT + UNAVAILABLE]";
      else if (hasTimeConflict) warning = " [TIME CONFLICT]";
      else if (isUnavailable) warning = " [UNAVAILABLE]";

      return {
        value: emp.id,
        label: `${emp.first_name} ${emp.last_name}${warning}`,
      };
    });
  }, [employees, newShift.shift_date, newShift.start_time, newShift.end_time, existingShifts, availability]);

  // Conflict warning for the currently selected employee
  const selectedConflict = useMemo(() => {
    if (!newShift.employee_id || !newShift.shift_date) return null;
    return getEmployeeConflicts(newShift.employee_id, newShift.shift_date, newShift.start_time, newShift.end_time);
  }, [newShift.employee_id, newShift.shift_date, newShift.start_time, newShift.end_time, existingShifts, availability]);

  const handleAddShift = async () => {
    if (newShift.employee_id && newShift.start_time && newShift.end_time && selectedEvent) {
      const shiftDate = newShift.shift_date || currentEvent?.start_date || new Date().toISOString().split("T")[0];
      const { error } = await supabase.from("shifts").insert({
        event_id: selectedEvent,
        employee_id: newShift.employee_id,
        shift_date: shiftDate,
        start_time: newShift.start_time,
        end_time: newShift.end_time,
        role: newShift.role || null,
        status: "scheduled",
      });
      if (error) {
        console.error("Failed to add shift:", error);
        alert("Failed to add shift: " + (error.message || "Unknown error"));
        return;
      }
      setNewShift({
        employee_id: "",
        shift_date: currentEvent?.start_date || "",
        start_time: "09:00",
        end_time: "17:00",
        role: "",
      });
      setShowAddForm(false);
      if (onRefresh) await onRefresh();
    }
  };

  const handleRemoveShift = async (id) => {
    const { error } = await supabase.from("shifts").delete().eq("id", id);
    if (error) {
      console.error("Failed to remove shift:", error);
      return;
    }
    setDraftShifts(draftShifts.filter((s) => s.id !== id));
    if (onRefresh) await onRefresh();
  };

  // When event changes, reset form state
  const handleEventChange = (eventId) => {
    setSelectedEvent(eventId);
    setDraftShifts([]);
    const evt = events.find(e => e.id === eventId);
    setNewShift(prev => ({
      ...prev,
      shift_date: evt?.start_date || "",
      employee_id: "",
    }));
  };

  // Availability dot color
  const availDotColor = (status) => {
    if (status === "available") return "#4CAF50";
    if (status === "unavailable") return "#F44336";
    return "rgba(255,255,255,0.3)";
  };

  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-bold" style={{ color: BRAND.text }}>
        Shift Builder
      </h1>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-4">
        <SectionCard title="Select Event" icon={Calendar}>
          <Select
            value={selectedEvent}
            onChange={(e) => handleEventChange(e.target.value)}
            options={events.map((e) => ({
              value: e.id,
              label: `${e.name} - ${formatDate(e.start_date)}`,
            }))}
            placeholder="Choose an event..."
          />
          {currentEvent && eventDates.length > 1 && (
            <p className="text-xs mt-1" style={{ color: "rgba(224,230,255,0.5)" }}>
              {eventDates.length}-day event: {formatDate(currentEvent.start_date)} to {formatDate(currentEvent.end_date)}
            </p>
          )}
        </SectionCard>

        <SectionCard title="Roles Needed" icon={Briefcase}>
          {eventRoles.length === 0 ? (
            <p className="text-sm" style={{ color: "rgba(224,230,255,0.6)" }}>
              No roles defined for this event
            </p>
          ) : (
            <div className="space-y-2">
              {eventRoles.map((role) => {
                const filledCount = allShifts.filter(s => s.role === role.role_name).length;
                return (
                  <div key={role.id} className="p-2 rounded-lg" style={{ background: "rgba(255,255,255,0.05)" }}>
                    <p className="text-sm font-medium" style={{ color: BRAND.text }}>
                      {role.role_name}
                    </p>
                    <p className="text-xs" style={{ color: "rgba(224,230,255,0.6)" }}>
                      {filledCount} / {role.qty_needed} filled
                    </p>
                  </div>
                );
              })}
            </div>
          )}
        </SectionCard>

        <SectionCard title="Staff Summary" icon={Users}>
          <div className="space-y-1">
            <p className="text-sm" style={{ color: BRAND.text }}>
              {allShifts.length} shift{allShifts.length !== 1 ? "s" : ""} assigned
            </p>
            <p className="text-xs" style={{ color: "rgba(224,230,255,0.5)" }}>
              {new Set(allShifts.map(s => s.employee_id)).size} unique staff across {Object.keys(shiftsByDate).length} day{Object.keys(shiftsByDate).length !== 1 ? "s" : ""}
            </p>
          </div>
        </SectionCard>
      </div>

      {/* Shifts grouped by date */}
      <SectionCard title={`Assigned Shifts (${allShifts.length})`} icon={Clock}>
        {allShifts.length === 0 ? (
          <EmptyState title="No shifts assigned" message="Add shifts using the form below" />
        ) : (
          <div className="space-y-4">
            {Object.entries(shiftsByDate).map(([date, shifts]) => (
              <div key={date}>
                {/* Date header */}
                <div
                  className="flex items-center gap-2 mb-2 pb-1 border-b"
                  style={{ borderColor: "rgba(255,255,255,0.1)" }}
                >
                  <Calendar size={14} style={{ color: BRAND.primary }} />
                  <span className="text-sm font-semibold" style={{ color: BRAND.primary }}>
                    {date === "unknown" ? "No Date" : formatDateHeader(date)}
                  </span>
                  <Badge color="gray" variant="outline">{shifts.length} shift{shifts.length !== 1 ? "s" : ""}</Badge>
                </div>

                <div className="space-y-2">
                  {shifts.map((shift) => {
                    const employee = employees.find((e) => e.id === shift.employee_id);
                    const duration = calcDurationHours(shift.start_time, shift.end_time);
                    const availStatus = getAvailabilityStatus(shift.employee_id, shift.shift_date);

                    return (
                      <div
                        key={shift.id}
                        className="flex items-center justify-between p-3 rounded-lg"
                        style={{ background: "rgba(255,255,255,0.05)" }}
                      >
                        <div className="flex items-center gap-2">
                          {/* Availability dot */}
                          <div
                            className="w-2.5 h-2.5 rounded-full flex-shrink-0"
                            title={`Availability: ${availStatus}`}
                            style={{ background: availDotColor(availStatus) }}
                          />
                          <div>
                            <p className="font-medium text-sm" style={{ color: BRAND.text }}>
                              {employee?.first_name} {employee?.last_name}
                            </p>
                            <p className="text-xs" style={{ color: "rgba(224,230,255,0.6)" }}>
                              {formatTime(shift.start_time)} - {formatTime(shift.end_time)}
                              <span style={{ color: "rgba(224,230,255,0.4)" }}> ({duration}h)</span>
                              {shift.role && ` \u2022 ${shift.role}`}
                            </p>
                          </div>
                        </div>
                        <Btn
                          icon={Trash2}
                          size="sm"
                          variant="danger"
                          onClick={() => handleRemoveShift(shift.id)}
                        >
                          Remove
                        </Btn>
                      </div>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>
        )}

        <div className="mt-4">
          {showAddForm && (
            <div
              className="p-4 rounded-lg space-y-3 mb-3"
              style={{ background: "rgba(255,255,255,0.05)" }}
            >
              {/* Shift Date picker */}
              {eventDates.length > 1 ? (
                <Select
                  label="Shift Date"
                  value={newShift.shift_date}
                  onChange={(e) => setNewShift({ ...newShift, shift_date: e.target.value })}
                  options={eventDates.map(d => ({
                    value: d,
                    label: formatDateHeader(d),
                  }))}
                  placeholder="Select date..."
                />
              ) : (
                <div className="mb-4">
                  <label className="block text-sm font-medium mb-2" style={{ color: BRAND.text }}>
                    Shift Date
                  </label>
                  <p className="text-sm px-4 py-2 rounded-lg" style={{ color: BRAND.text, background: "rgba(255,255,255,0.03)", border: `1px solid ${BRAND.glassBorder}` }}>
                    {eventDates[0] ? formatDateHeader(eventDates[0]) : "No date available"}
                  </p>
                </div>
              )}

              <Select
                label="Employee"
                value={newShift.employee_id}
                onChange={(e) => setNewShift({ ...newShift, employee_id: e.target.value })}
                options={employeeOptions}
                placeholder="Select employee..."
              />

              {/* Conflict warning banner */}
              {selectedConflict && (selectedConflict.hasTimeConflict || selectedConflict.isUnavailable) && (
                <div
                  className="flex items-start gap-2 p-3 rounded-lg"
                  style={{ background: "rgba(255,152,0,0.15)", border: "1px solid rgba(255,152,0,0.3)" }}
                >
                  <AlertTriangle size={16} className="flex-shrink-0 mt-0.5" style={{ color: "#FF9800" }} />
                  <div className="text-xs" style={{ color: "#FFB74D" }}>
                    {selectedConflict.hasTimeConflict && (
                      <p>This employee already has an overlapping shift on this date/time.</p>
                    )}
                    {selectedConflict.isUnavailable && (
                      <p>This employee is marked as unavailable for this date.</p>
                    )}
                    <p className="mt-1" style={{ color: "rgba(255,183,77,0.7)" }}>
                      You can still assign them if this is an intentional override.
                    </p>
                  </div>
                </div>
              )}

              <div className="grid grid-cols-2 gap-3">
                <Input
                  label="Start Time"
                  type="time"
                  value={newShift.start_time}
                  onChange={(e) => setNewShift({ ...newShift, start_time: e.target.value })}
                />
                <Input
                  label="End Time"
                  type="time"
                  value={newShift.end_time}
                  onChange={(e) => setNewShift({ ...newShift, end_time: e.target.value })}
                />
              </div>

              {newShift.start_time && newShift.end_time && (
                <p className="text-xs" style={{ color: "rgba(224,230,255,0.4)" }}>
                  Duration: {calcDurationHours(newShift.start_time, newShift.end_time)} hours
                </p>
              )}

              <Select
                label="Role (Optional)"
                value={newShift.role}
                onChange={(e) => setNewShift({ ...newShift, role: e.target.value })}
                options={eventRoles.map((r) => ({
                  value: r.role_name,
                  label: r.role_name,
                }))}
                placeholder="Select role..."
              />

              <div className="flex gap-2">
                <Btn onClick={handleAddShift} variant="primary" size="sm">
                  Add Shift
                </Btn>
                <Btn
                  onClick={() => setShowAddForm(false)}
                  variant="secondary"
                  size="sm"
                >
                  Cancel
                </Btn>
              </div>
            </div>
          )}

          {!showAddForm && (
            <Btn
              icon={Plus}
              onClick={() => {
                setNewShift(prev => ({
                  ...prev,
                  shift_date: currentEvent?.start_date || "",
                }));
                setShowAddForm(true);
              }}
              variant="primary"
              className="w-full"
            >
              Add Shift
            </Btn>
          )}
        </div>
      </SectionCard>
    </div>
  );
};

export default ShiftBuilderPage;
