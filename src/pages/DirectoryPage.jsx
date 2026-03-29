import { useState } from "react";
import { Users, Search, Edit2, Eye } from "lucide-react";
import { Badge, EmptyState, Input, Select, Btn } from "../components";
import { BRAND } from "../constants/brand";

const DirectoryPage = ({ employees = [], employeeSkills = [], skills = [] }) => {
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedSkillFilter, setSelectedSkillFilter] = useState("");

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

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-2xl font-bold mb-2" style={{ color: BRAND.text }}>
          Employee Directory
        </h1>
        <p style={{ color: "rgba(224,230,255,0.7)" }}>
          View and manage your team members
        </p>
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
          {filtered.map((emp) => (
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
              </div>

              {emp.phone && (
                <p className="text-xs mb-2" style={{ color: "rgba(224,230,255,0.6)" }}>
                  {emp.phone}
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
                <Btn icon={Edit2} size="sm" variant="secondary" className="flex-1">
                  Edit
                </Btn>
                <Btn icon={Eye} size="sm" variant="secondary" className="flex-1">
                  View
                </Btn>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default DirectoryPage;
