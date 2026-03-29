import { useState } from "react";
import { Calendar, Clock, Briefcase, Plus, Trash2 } from "lucide-react";
import { Btn, EmptyState, Input, SectionCard, Select } from "../components";
import { BRAND } from "../constants/brand";
import { formatDate, formatTime } from "../utils/formatters";
import { supabase } from "../lib/supabase";

const ShiftBuilderPage = ({ events = [], employees = [], shifts: existingShifts = [], locations = [], roleRequirements = [], onRefresh }) => {
  const [selectedEvent, setSelectedEvent] = useState(events[0]?.id || "");
  const [draftShifts, setDraftShifts] = useState([]);
  const [showAddForm, setShowAddForm] = useState(false);
  const [newShift, setNewShift] = useState({
    employee_id: "",
    start_time: "09:00",
    end_time: "17:00",
    role: "",
  });

  const currentEvent = events.find((e) => e.id === selectedEvent);
  const eventRoles = roleRequirements.filter((r) => r.event_id === selectedEvent);

  // Combine existing Supabase shifts for this event with any draft shifts
  const eventShifts = existingShifts.filter(s => s.event_id === selectedEvent);
  const allShifts = [...eventShifts, ...draftShifts.filter(d => !eventShifts.some(s => s.id === d.id))];

  const handleAddShift = async () => {
    if (newShift.employee_id && newShift.start_time && newShift.end_time && selectedEvent) {
      const { error } = await supabase.from("shifts").insert({
        event_id: selectedEvent,
        employee_id: newShift.employee_id,
        shift_date: currentEvent?.start_date || new Date().toISOString().split("T")[0],
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

  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-bold" style={{ color: BRAND.text }}>
        Shift Builder
      </h1>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-4">
        <SectionCard title="Select Event" icon={Calendar}>
          <Select
            value={selectedEvent}
            onChange={(e) => {
              setSelectedEvent(e.target.value);
              setDraftShifts([]);
            }}
            options={events.map((e) => ({
              value: e.id,
              label: `${e.name} - ${formatDate(e.start_date)}`,
            }))}
            placeholder="Choose an event..."
          />
        </SectionCard>

        <SectionCard title="Roles Needed" icon={Briefcase}>
          {eventRoles.length === 0 ? (
            <p className="text-sm" style={{ color: "rgba(224,230,255,0.6)" }}>
              No roles defined for this event
            </p>
          ) : (
            <div className="space-y-2">
              {eventRoles.map((role) => (
                <div key={role.id} className="p-2 rounded-lg" style={{ background: "rgba(255,255,255,0.05)" }}>
                  <p className="text-sm font-medium" style={{ color: BRAND.text }}>
                    {role.role_name}
                  </p>
                  <p className="text-xs" style={{ color: "rgba(224,230,255,0.6)" }}>
                    Need {role.qty_needed} staff
                  </p>
                </div>
              ))}
            </div>
          )}
        </SectionCard>
      </div>

      <SectionCard title={`Assigned Shifts (${allShifts.length})`} icon={Clock}>
        {allShifts.length === 0 ? (
          <EmptyState title="No shifts assigned" message="Add shifts using the form below" />
        ) : (
          <div className="space-y-2">
            {allShifts.map((shift) => {
              const employee = employees.find((e) => e.id === shift.employee_id);
              return (
                <div
                  key={shift.id}
                  className="flex items-center justify-between p-3 rounded-lg"
                  style={{ background: "rgba(255,255,255,0.05)" }}
                >
                  <div>
                    <p className="font-medium text-sm" style={{ color: BRAND.text }}>
                      {employee?.first_name} {employee?.last_name}
                    </p>
                    <p className="text-xs" style={{ color: "rgba(224,230,255,0.6)" }}>
                      {formatTime(shift.start_time)} - {formatTime(shift.end_time)}
                      {shift.role && ` • ${shift.role}`}
                    </p>
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
        )}

        <div className="mt-4">
          {showAddForm && (
            <div
              className="p-4 rounded-lg space-y-3 mb-3"
              style={{ background: "rgba(255,255,255,0.05)" }}
            >
              <Select
                label="Employee"
                value={newShift.employee_id}
                onChange={(e) => setNewShift({ ...newShift, employee_id: e.target.value })}
                options={employees.map((e) => ({
                  value: e.id,
                  label: `${e.first_name} ${e.last_name}`,
                }))}
                placeholder="Select employee..."
              />

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
              onClick={() => setShowAddForm(true)}
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
