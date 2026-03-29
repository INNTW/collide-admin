import { useState } from "react";
import { ChevronLeft, ChevronRight, Calendar, Clock, Grid, Users } from "lucide-react";
import { Badge, Btn, EmptyState, SectionCard, Select } from "../components";
import { BRAND } from "../constants/brand";
import { formatDate, formatTime } from "../utils/formatters";

const CalendarViewPage = ({ events = [], employees = [], shifts = [], locations = [], availability = {}, employeeSkills = [], skills = [] }) => {
  const [currentDate, setCurrentDate] = useState(new Date());
  const [viewMode, setViewMode] = useState("month"); // month, week, day
  const [selectedDay, setSelectedDay] = useState(new Date());
  const [selectedEvent, setSelectedEvent] = useState(null);
  const [assignmentModalOpen, setAssignmentModalOpen] = useState(false);
  const [selectedSlot, setSelectedSlot] = useState(null);

  const getDaysInMonth = (date) => {
    return new Date(date.getFullYear(), date.getMonth() + 1, 0).getDate();
  };

  const getFirstDayOfMonth = (date) => {
    return new Date(date.getFullYear(), date.getMonth(), 1).getDay();
  };

  const monthDays = Array.from({ length: getDaysInMonth(currentDate) }, (_, i) => i + 1);
  const firstDay = getFirstDayOfMonth(currentDate);
  const emptyDays = Array.from({ length: firstDay }, (_, i) => null);

  const getEventsForDate = (date) => {
    const d = date.toISOString().split("T")[0];
    return events.filter((e) => d >= e.start_date && d <= e.end_date);
  };

  const handlePrevMonth = () => {
    setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() - 1));
  };

  const handleNextMonth = () => {
    setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() + 1));
  };

  const monthName = currentDate.toLocaleString("en-US", { month: "long", year: "numeric" });

  if (viewMode === "day") {
    const dayStr = selectedDay.toISOString().split("T")[0];
    const dayEvents = getEventsForDate(selectedDay);
    const dayShifts = shifts.filter(s => s.shift_date === dayStr);
    const hours = Array.from({ length: 18 }, (_, i) => 6 + i);

    return (
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <button onClick={() => setViewMode("month")} className="inline-flex items-center gap-2 px-3 py-2 rounded-lg hover:bg-white/10 transition">
            <ChevronLeft size={18} style={{ color: BRAND.primary }} />
            <span style={{ color: BRAND.text }}>Back to Month</span>
          </button>
          <h1 className="text-2xl font-bold" style={{ color: BRAND.text }}>
            {selectedDay.toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric" })}
          </h1>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          <div className="lg:col-span-2 space-y-4">
            {dayEvents.length > 0 && (
              <SectionCard title={`Events (${dayEvents.length})`} icon={Calendar}>
                <div className="space-y-2">
                  {dayEvents.map(event => (
                    <div key={event.id} className="p-3 rounded-lg" style={{ background: "rgba(84,205,249,0.15)", borderLeft: `4px solid ${BRAND.primary}` }}>
                      <p className="font-medium text-sm" style={{ color: BRAND.text }}>{event.name}</p>
                      <p className="text-xs" style={{ color: "rgba(224,230,255,0.6)" }}>
                        {formatDate(event.start_date)} — {formatDate(event.end_date)} • {event.event_type || "event"}
                      </p>
                    </div>
                  ))}
                </div>
              </SectionCard>
            )}

            <SectionCard title="Shift Schedule" icon={Clock}>
              <div className="space-y-2">
                {dayShifts.length === 0 ? (
                  <EmptyState icon={Clock} title="No shifts" message="No shifts scheduled for this day" />
                ) : (
                  hours.map(hour => {
                    const hourShifts = dayShifts.filter(s => {
                      const startHour = parseInt(s.start_time?.split(":")[0]);
                      return startHour === hour;
                    });
                    if (hourShifts.length === 0) return null;
                    return (
                      <div key={hour} className="flex items-start gap-4">
                        <div className="w-16 text-sm font-medium flex-shrink-0 pt-1" style={{ color: "rgba(224,230,255,0.7)" }}>
                          {String(hour).padStart(2, "0")}:00
                        </div>
                        <div className="flex-1 space-y-1">
                          {hourShifts.map(shift => {
                            const emp = employees.find(e => e.id === shift.employee_id);
                            const evt = events.find(e => e.id === shift.event_id);
                            return (
                              <div key={shift.id} className="p-2 rounded-lg" style={{ background: "rgba(84,205,249,0.1)", borderLeft: `3px solid ${BRAND.primary}` }}>
                                <p className="text-sm font-medium" style={{ color: BRAND.text }}>
                                  {emp ? `${emp.first_name} ${emp.last_name}` : "Unassigned"} {shift.role ? `— ${shift.role}` : ""}
                                </p>
                                <p className="text-xs" style={{ color: "rgba(224,230,255,0.6)" }}>
                                  {formatTime(shift.start_time)} - {formatTime(shift.end_time)} {evt ? `• ${evt.name}` : ""}
                                </p>
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    );
                  }).filter(Boolean)
                )}
              </div>
            </SectionCard>
          </div>

          <div>
            <SectionCard title="Available Staff" icon={Users}>
              {employees.length === 0 ? (
                <EmptyState title="No staff" message="Add employees first" />
              ) : (
                <div className="space-y-2">
                  {employees.slice(0, 8).map(emp => (
                    <div key={emp.id} className="p-2 rounded-lg text-sm cursor-pointer hover:bg-white/10 transition" style={{ background: "rgba(255,255,255,0.05)" }}>
                      <p style={{ color: BRAND.text }}>{emp.first_name} {emp.last_name}</p>
                      <div className="flex flex-wrap gap-1 mt-1">
                        {(employeeSkills.filter(es => es.employee_id === emp.id) || []).slice(0, 2).map(es => (
                          <Badge key={es.id} color="primary" variant="outline">{es.skills?.name || "Unknown"}</Badge>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </SectionCard>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold" style={{ color: BRAND.text }}>
          Calendar {monthName}
        </h1>
        <div className="flex items-center gap-2">
          <Btn icon={ChevronLeft} size="sm" variant="secondary" onClick={handlePrevMonth}>
            Prev
          </Btn>
          <Btn icon={ChevronRight} size="sm" variant="secondary" onClick={handleNextMonth}>
            Next
          </Btn>
          <Select
            value={viewMode}
            onChange={(e) => setViewMode(e.target.value)}
            options={[
              { value: "month", label: "Month" },
              { value: "week", label: "Week" },
            ]}
          />
        </div>
      </div>

      <SectionCard title="Month View" icon={Grid}>
        <div className="space-y-4">
          <div className="grid grid-cols-7 gap-2">
            {["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].map((day) => (
              <div key={day} className="text-center text-sm font-medium" style={{ color: BRAND.primary }}>
                {day}
              </div>
            ))}
          </div>

          <div className="grid grid-cols-7 gap-2">
            {emptyDays.map((_, idx) => (
              <div key={`empty-${idx}`} className="aspect-square"></div>
            ))}
            {monthDays.map((day) => {
              const date = new Date(currentDate.getFullYear(), currentDate.getMonth(), day);
              const dayEvents = getEventsForDate(date);

              return (
                <button
                  key={day}
                  onClick={() => {
                    setSelectedDay(date);
                    setViewMode("day");
                  }}
                  className="aspect-square p-2 rounded-lg text-left text-sm cursor-pointer transition hover:bg-white/10"
                  style={{
                    background:
                      date.toDateString() === selectedDay.toDateString()
                        ? `${BRAND.primary}20`
                        : "rgba(255,255,255,0.05)",
                    border: `1px solid ${BRAND.glassBorder}`,
                  }}
                >
                  <div className="font-semibold" style={{ color: BRAND.text }}>
                    {day}
                  </div>
                  {dayEvents.length > 0 && (
                    <div className="flex flex-wrap gap-1 mt-1">
                      {dayEvents.slice(0, 2).map((event) => (
                        <div
                          key={event.id}
                          className="w-1 h-1 rounded-full"
                          style={{ background: BRAND.primary }}
                        ></div>
                      ))}
                      {dayEvents.length > 2 && (
                        <span className="text-xs" style={{ color: "rgba(224,230,255,0.5)" }}>
                          +{dayEvents.length - 2}
                        </span>
                      )}
                    </div>
                  )}
                </button>
              );
            })}
          </div>
        </div>
      </SectionCard>
    </div>
  );
};

export default CalendarViewPage;
