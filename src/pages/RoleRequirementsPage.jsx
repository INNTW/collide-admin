import { useState, useEffect } from "react";
import { Users, Calendar, Briefcase, AlertCircle, Plus, Trash2 } from "lucide-react";
import { SectionCard, StatCard, EmptyState, Select, Input, Btn, Badge } from "../components";
import { BRAND } from "../constants/brand";
import { supabase } from "../lib/supabase";
import { formatDate } from "../utils/formatters";

const RoleRequirementsPage = ({ events = [], shifts = [], locations = [], employees = [], roleRequirements = [], onRefresh }) => {
  const [selectedEvent, setSelectedEvent] = useState(events[0]?.id || "");
  const [roles, setRoles] = useState([]);
  const [showAddRole, setShowAddRole] = useState(false);
  const [newRole, setNewRole] = useState({
    role_name: "Sales Lead",
    quantity_needed: 1,
  });

  useEffect(() => {
    const eventRoles = roleRequirements.filter((r) => r.event_id === selectedEvent);
    setRoles(eventRoles);
  }, [selectedEvent, roleRequirements]);

  const predefinedRoles = [
    "Sales Lead",
    "Cashier",
    "Stock Runner",
    "Setup Crew",
    "Team Lead",
  ];

  const handleAddRole = async () => {
    if (!selectedEvent) {
      alert("Please select an event first");
      return;
    }
    if (!newRole.role_name || newRole.quantity_needed <= 0) {
      alert("Please provide a role name and quantity");
      return;
    }
    const { error } = await supabase.from("role_requirements").insert({
      event_id: selectedEvent,
      role_name: newRole.role_name,
      qty_needed: newRole.quantity_needed,
      date: new Date().toISOString().split("T")[0],
    });
    if (error) {
      console.error("Failed to add role:", error);
      alert("Failed to add role: " + (error.message || "Unknown error"));
      return;
    }
    setNewRole({ role_name: "Sales Lead", quantity_needed: 1 });
    setShowAddRole(false);
    if (onRefresh) await onRefresh();
  };

  const handleRemoveRole = async (id) => {
    const { error } = await supabase.from("role_requirements").delete().eq("id", id);
    if (error) {
      console.error("Failed to remove role:", error);
      return;
    }
    if (onRefresh) await onRefresh();
  };

  const totalNeeded = roles.reduce((sum, r) => sum + r.qty_needed, 0);
  const eventShifts = shifts.filter(s => s.event_id === selectedEvent);
  const totalAssigned = new Set(eventShifts.map(s => s.employee_id)).size;
  const totalUnfilled = Math.max(0, totalNeeded - totalAssigned);

  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-bold" style={{ color: BRAND.text }}>
        Role Requirements
      </h1>

      <SectionCard title="Select Event" icon={Calendar}>
        <Select
          value={selectedEvent}
          onChange={(e) => setSelectedEvent(e.target.value)}
          options={events.map((e) => ({
            value: e.id,
            label: `${e.name} - ${formatDate(e.start_date)}`,
          }))}
          placeholder="Choose an event..."
        />
      </SectionCard>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <StatCard
          icon={Users}
          label="Total Roles"
          value={roles.length}
          color="primary"
        />
        <StatCard
          icon={Briefcase}
          label="Total Needed"
          value={totalNeeded}
          color="primary"
        />
        <StatCard
          icon={AlertCircle}
          label="Unfilled"
          value={totalUnfilled}
          color={totalUnfilled > 0 ? "danger" : "success"}
        />
      </div>

      <SectionCard title="Role Breakdown" icon={Briefcase}>
        {roles.length === 0 ? (
          <EmptyState title="No roles defined" message="Add roles for this event using the form below" />
        ) : (
          <div className="space-y-3">
            {roles.map((role) => {
              const roleShifts = eventShifts.filter(s => s.role === role.role_name);
              const filled = roleShifts.length;
              const fillPercentage = role.qty_needed > 0 ? (filled / role.qty_needed) * 100 : 0;
              const statusColor =
                fillPercentage >= 80
                  ? BRAND.success
                  : fillPercentage >= 50
                  ? BRAND.warning
                  : BRAND.danger;

              return (
                <div key={role.id} className="space-y-2 p-3 rounded-lg" style={{ background: "rgba(255,255,255,0.05)" }}>
                  <div className="flex justify-between items-start">
                    <div>
                      <p className="font-medium" style={{ color: BRAND.text }}>
                        {role.role_name}
                      </p>
                      <p className="text-xs" style={{ color: "rgba(224,230,255,0.6)" }}>
                        {filled}/{role.qty_needed} filled
                      </p>
                    </div>
                    <Btn
                      icon={Trash2}
                      size="sm"
                      variant="danger"
                      onClick={() => handleRemoveRole(role.id)}
                    >
                      Remove
                    </Btn>
                  </div>

                  <div
                    className="h-2 rounded-full overflow-hidden"
                    style={{ background: "rgba(255,255,255,0.1)" }}
                  >
                    <div
                      className="h-full transition-all"
                      style={{
                        width: `${fillPercentage}%`,
                        background: statusColor,
                      }}
                    ></div>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        <div className="mt-4">
          {showAddRole && (
            <div
              className="p-4 rounded-lg space-y-3 mb-3"
              style={{ background: "rgba(255,255,255,0.05)" }}
            >
              <Select
                label="Role Name"
                value={newRole.role_name}
                onChange={(e) => setNewRole({ ...newRole, role_name: e.target.value })}
                options={predefinedRoles.map((r) => ({
                  value: r,
                  label: r,
                }))}
              />

              <Input
                label="Quantity Needed"
                type="number"
                value={newRole.quantity_needed}
                onChange={(e) =>
                  setNewRole({ ...newRole, quantity_needed: parseInt(e.target.value) || 1 })
                }
                min="1"
              />

              <div className="flex gap-2">
                <Btn onClick={handleAddRole} variant="primary" size="sm">
                  Add Role
                </Btn>
                <Btn onClick={() => setShowAddRole(false)} variant="secondary" size="sm">
                  Cancel
                </Btn>
              </div>
            </div>
          )}

          {!showAddRole && (
            <Btn
              icon={Plus}
              onClick={() => setShowAddRole(true)}
              variant="primary"
              className="w-full"
            >
              Add Role
            </Btn>
          )}
        </div>
      </SectionCard>
    </div>
  );
};

export default RoleRequirementsPage;
