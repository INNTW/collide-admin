import { useState } from "react";
import { Users, Search, Eye, ExternalLink, FileText, Phone, Mail, DollarSign } from "lucide-react";
import { Badge, EmptyState, Input, Select, Btn, Modal } from "../components";
import { BRAND } from "../constants/brand";
import { exportCSV } from "../utils/csv-export";

const ROLE_COLORS = {
  admin: { bg: "rgba(239,68,68,0.2)", text: "#f87171" },
  team_lead: { bg: "rgba(251,191,36,0.2)", text: "#fbbf24" },
  employee: { bg: "rgba(84,205,249,0.2)", text: "#54CDF9" },
};

const DirectoryPage = ({ employees = [], employeeSkills = [], skills = [], onNavigate }) => {
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedSkillFilter, setSelectedSkillFilter] = useState("");
  const [selectedEmployee, setSelectedEmployee] = useState(null);

  const filtered = employees.filter((emp) => {
    const matchesSearch =
      `${emp.first_name} ${emp.last_name}`.toLowerCase().includes(searchTerm.toLowerCase()) ||
      emp.email?.toLowerCase().includes(searchTerm.toLowerCase());

    if (!selectedSkillFilter) return matchesSearch;

    const hasSkill = (employeeSkills || []).some(
      (es) => es.employee_id === emp.id && es.skill_id === selectedSkillFilter
    );

    return matchesSearch && hasSkill;
  });

  const getEmployeeSkills = (empId) => {
    return (employeeSkills || [])
      .filter((es) => es.employee_id === empId)
      .map((es) => skills.find((s) => s.id === es.skill_id))
      .filter(Boolean);
  };

  const formatRole = (role) => {
    if (!role) return "Employee";
    return role.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div>
          <h1 className="text-2xl font-bold mb-2" style={{ color: BRAND.text }}>
            Employee Directory
          </h1>
          <p style={{ color: "rgba(224,230,255,0.7)" }}>
            Quick-reference view of your team members
          </p>
        </div>
        <Btn
          icon={FileText}
          variant="secondary"
          size="sm"
          onClick={() =>
            exportCSV(
              filtered.map((emp) => ({
                first_name: emp.first_name,
                last_name: emp.last_name,
                email: emp.email || "",
                phone: emp.phone || "",
                role: emp.app_role || "",
                status: emp.status || "",
              })),
              [
                { key: "first_name", label: "First Name" },
                { key: "last_name", label: "Last Name" },
                { key: "email", label: "Email" },
                { key: "phone", label: "Phone" },
                { key: "role", label: "Role" },
                { key: "status", label: "Status" },
              ],
              "employee_directory"
            )
          }
        >
          Export CSV
        </Btn>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-4">
        <div className="md:col-span-2">
          <Input
            label="Search employees"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Name or email..."
            icon={Search}
          />
        </div>

        <Select
          label="Filter by skill"
          value={selectedSkillFilter}
          onChange={(e) => setSelectedSkillFilter(e.target.value)}
          options={skills.map((s) => ({ value: s.id, label: s.name }))}
          placeholder="All skills"
        />
      </div>

      {filtered.length === 0 ? (
        <EmptyState
          icon={Users}
          title="No employees found"
          message="Try adjusting your search or filters"
        />
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filtered.map((emp) => {
            const roleKey = emp.app_role || "employee";
            const roleStyle = ROLE_COLORS[roleKey] || ROLE_COLORS.employee;

            return (
              <div
                key={emp.id}
                className="p-4 rounded-xl"
                style={{
                  background: BRAND.glass,
                  border: `1px solid ${BRAND.glassBorder}`,
                  backdropFilter: BRAND.blur,
                }}
              >
                <div className="flex items-start justify-between mb-2">
                  <div>
                    <p className="font-semibold" style={{ color: BRAND.text }}>
                      {emp.first_name} {emp.last_name}
                    </p>
                    <p className="text-xs" style={{ color: "rgba(224,230,255,0.6)" }}>
                      {emp.email}
                    </p>
                  </div>
                  <span
                    className="text-xs font-medium px-2 py-0.5 rounded-full"
                    style={{ background: roleStyle.bg, color: roleStyle.text }}
                  >
                    {formatRole(roleKey)}
                  </span>
                </div>

                {emp.phone && (
                  <p className="text-xs mb-1" style={{ color: "rgba(224,230,255,0.6)" }}>
                    {emp.phone}
                  </p>
                )}

                {emp.hourly_rate != null && (
                  <p className="text-xs mb-2 flex items-center gap-1" style={{ color: "rgba(224,230,255,0.6)" }}>
                    <DollarSign size={12} />
                    {Number(emp.hourly_rate).toFixed(2)}/hr
                  </p>
                )}

                <div className="flex flex-wrap gap-1 mb-3">
                  {getEmployeeSkills(emp.id).map((skill) => (
                    <Badge key={skill.id} color="primary">
                      {skill.name}
                    </Badge>
                  ))}
                </div>

                <div className="flex gap-2 pt-3" style={{ borderTop: `1px solid ${BRAND.glassBorder}` }}>
                  <Btn
                    icon={ExternalLink}
                    size="sm"
                    variant="secondary"
                    className="flex-1"
                    onClick={() => onNavigate?.({ section: "settings", page: "user-management" })}
                  >
                    Edit
                  </Btn>
                  <Btn
                    icon={Eye}
                    size="sm"
                    variant="secondary"
                    className="flex-1"
                    onClick={() => setSelectedEmployee(emp)}
                  >
                    View
                  </Btn>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* View Employee Detail Modal */}
      <Modal
        isOpen={!!selectedEmployee}
        onClose={() => setSelectedEmployee(null)}
        title="Employee Details"
        size="md"
      >
        {selectedEmployee && (
          <div className="space-y-4">
            <div className="text-center pb-4" style={{ borderBottom: `1px solid ${BRAND.glassBorder}` }}>
              <div
                className="w-16 h-16 rounded-full mx-auto mb-3 flex items-center justify-center text-xl font-bold"
                style={{ background: "rgba(84,205,249,0.2)", color: BRAND.primary }}
              >
                {selectedEmployee.first_name?.[0]}
                {selectedEmployee.last_name?.[0]}
              </div>
              <h3 className="text-lg font-semibold" style={{ color: BRAND.text }}>
                {selectedEmployee.first_name} {selectedEmployee.last_name}
              </h3>
              <span
                className="inline-block text-xs font-medium px-3 py-1 rounded-full mt-1"
                style={{
                  background: (ROLE_COLORS[selectedEmployee.app_role] || ROLE_COLORS.employee).bg,
                  color: (ROLE_COLORS[selectedEmployee.app_role] || ROLE_COLORS.employee).text,
                }}
              >
                {formatRole(selectedEmployee.app_role || "employee")}
              </span>
            </div>

            <div className="space-y-3">
              <div className="flex items-center gap-3">
                <Mail size={16} style={{ color: BRAND.primary }} />
                <div>
                  <p className="text-xs" style={{ color: "rgba(224,230,255,0.5)" }}>Email</p>
                  <p className="text-sm" style={{ color: BRAND.text }}>{selectedEmployee.email || "N/A"}</p>
                </div>
              </div>

              <div className="flex items-center gap-3">
                <Phone size={16} style={{ color: BRAND.primary }} />
                <div>
                  <p className="text-xs" style={{ color: "rgba(224,230,255,0.5)" }}>Phone</p>
                  <p className="text-sm" style={{ color: BRAND.text }}>{selectedEmployee.phone || "N/A"}</p>
                </div>
              </div>

              <div className="flex items-center gap-3">
                <DollarSign size={16} style={{ color: BRAND.primary }} />
                <div>
                  <p className="text-xs" style={{ color: "rgba(224,230,255,0.5)" }}>Hourly Rate</p>
                  <p className="text-sm" style={{ color: BRAND.text }}>
                    {selectedEmployee.hourly_rate != null
                      ? `$${Number(selectedEmployee.hourly_rate).toFixed(2)}/hr`
                      : "Not set"}
                  </p>
                </div>
              </div>
            </div>

            {getEmployeeSkills(selectedEmployee.id).length > 0 && (
              <div>
                <p className="text-xs mb-2" style={{ color: "rgba(224,230,255,0.5)" }}>Skills</p>
                <div className="flex flex-wrap gap-1">
                  {getEmployeeSkills(selectedEmployee.id).map((skill) => (
                    <Badge key={skill.id} color="primary">
                      {skill.name}
                    </Badge>
                  ))}
                </div>
              </div>
            )}

            <div>
              <p className="text-xs mb-1" style={{ color: "rgba(224,230,255,0.5)" }}>Status</p>
              <Badge color={selectedEmployee.status === "active" ? "success" : "warning"}>
                {selectedEmployee.status || "active"}
              </Badge>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
};

export default DirectoryPage;
