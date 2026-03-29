import { useState } from "react";
import { Plus, Trash2, User } from "lucide-react";
import { SectionCard, Modal, Select, Btn, Badge } from "../components";
import { BRAND } from "../constants/brand";
import { supabase } from "../lib/supabase";

const SkillsTagsPage = ({ employees = [], skills = [], employeeSkills = [], onRefresh }) => {
  const [showAddModal, setShowAddModal] = useState(false);
  const [selectedEmployee, setSelectedEmployee] = useState("");
  const [selectedSkill, setSelectedSkill] = useState("");
  const [proficiency, setProficiency] = useState("intermediate");

  const handleAddSkill = async () => {
    if (selectedEmployee && selectedSkill) {
      const { error } = await supabase.from("employee_skills").insert({
        employee_id: selectedEmployee,
        skill_id: selectedSkill,
        proficiency: proficiency,
      });
      if (error) {
        console.error("Failed to add skill:", error);
        alert("Failed to add skill: " + (error.message || "Unknown error"));
        return;
      }
      setSelectedEmployee("");
      setSelectedSkill("");
      setProficiency("intermediate");
      setShowAddModal(false);
      if (onRefresh) await onRefresh();
    }
  };

  const getEmployeeSkills = (empId) => {
    return (employeeSkills || []).filter((es) => es.employee_id === empId);
  };

  const removeSkill = async (employeeId, skillId) => {
    const { error } = await supabase
      .from("employee_skills")
      .delete()
      .eq("employee_id", employeeId)
      .eq("skill_id", skillId);
    if (error) {
      console.error("Failed to remove skill:", error);
      return;
    }
    if (onRefresh) await onRefresh();
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold mb-2" style={{ color: BRAND.text }}>
            Skills & Tags
          </h1>
          <p style={{ color: "rgba(224,230,255,0.7)" }}>
            Manage employee skills and proficiency levels
          </p>
        </div>
        <Btn
          icon={Plus}
          onClick={() => setShowAddModal(true)}
          variant="primary"
        >
          Add Skill
        </Btn>
      </div>

      <Modal
        isOpen={showAddModal}
        onClose={() => setShowAddModal(false)}
        title="Add Employee Skill"
        size="md"
      >
        <div className="space-y-4">
          <Select
            label="Employee"
            value={selectedEmployee}
            onChange={(e) => setSelectedEmployee(e.target.value)}
            options={employees.map((e) => ({
              value: e.id,
              label: `${e.first_name} ${e.last_name}`,
            }))}
            placeholder="Select employee..."
          />

          <Select
            label="Skill"
            value={selectedSkill}
            onChange={(e) => setSelectedSkill(e.target.value)}
            options={skills.map((s) => ({
              value: s.id,
              label: s.name,
            }))}
            placeholder="Select skill..."
          />

          <Select
            label="Proficiency"
            value={proficiency}
            onChange={(e) => setProficiency(e.target.value)}
            options={[
              { value: "beginner", label: "Beginner" },
              { value: "intermediate", label: "Intermediate" },
              { value: "expert", label: "Expert" },
            ]}
          />

          <div className="flex gap-2 pt-4">
            <Btn onClick={handleAddSkill} variant="primary" className="flex-1">
              Add Skill
            </Btn>
            <Btn
              onClick={() => setShowAddModal(false)}
              variant="secondary"
              className="flex-1"
            >
              Cancel
            </Btn>
          </div>
        </div>
      </Modal>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {employees.map((emp) => {
          const empSkills = getEmployeeSkills(emp.id);

          return (
            <SectionCard key={emp.id} title={`${emp.first_name} ${emp.last_name}`} icon={User}>
              {empSkills.length === 0 ? (
                <p className="text-sm text-center py-4" style={{ color: "rgba(224,230,255,0.6)" }}>
                  No skills added
                </p>
              ) : (
                <div className="space-y-2">
                  {empSkills.map((es) => (
                    <div
                      key={es.id}
                      className="flex items-center justify-between p-2 rounded-lg"
                      style={{ background: "rgba(255,255,255,0.05)" }}
                    >
                      <div>
                        <p className="text-sm font-medium" style={{ color: BRAND.text }}>
                          {es.skills?.name}
                        </p>
                        <Badge color="primary" variant="outline">
                          {es.proficiency || "Intermediate"}
                        </Badge>
                      </div>
                      <Btn
                        icon={Trash2}
                        size="sm"
                        variant="danger"
                        onClick={() => removeSkill(emp.id, es.skill_id)}
                      >
                        Remove
                      </Btn>
                    </div>
                  ))}
                </div>
              )}
            </SectionCard>
          );
        })}
      </div>
    </div>
  );
};

export default SkillsTagsPage;
