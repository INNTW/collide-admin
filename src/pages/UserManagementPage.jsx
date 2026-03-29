import React, { useState, useEffect, useCallback } from "react";
import { UserPlus, List, X, Users, Check, Lock, Award, Clock, FileText, Unlock, Eye, EyeOff, Edit2 } from "lucide-react";
import { Btn, StatCard, SectionCard, EmptyState, Modal, Input, Select } from "../components";
import { BRAND } from "../constants/brand";
import { supabase } from "../lib/supabase";
import { SINEncryption } from "../lib/sin-encryption";

const PROVINCES = [
  { value: "", label: "Select Province" },
  { value: "AB", label: "Alberta" },
  { value: "BC", label: "British Columbia" },
  { value: "MB", label: "Manitoba" },
  { value: "NB", label: "New Brunswick" },
  { value: "NL", label: "Newfoundland and Labrador" },
  { value: "NS", label: "Nova Scotia" },
  { value: "NT", label: "Northwest Territories" },
  { value: "NU", label: "Nunavut" },
  { value: "ON", label: "Ontario" },
  { value: "PE", label: "Prince Edward Island" },
  { value: "QC", label: "Quebec" },
  { value: "SK", label: "Saskatchewan" },
  { value: "YT", label: "Yukon" },
];

const SIN_PASSPHRASE = import.meta.env.VITE_SIN_PASSPHRASE || "collide-sin-key";

const UserManagementPage = ({ user, employees = [], onRefresh }) => {
  const [users, setUsers] = useState([]);
  const [loadingUsers, setLoadingUsers] = useState(false);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showResetModal, setShowResetModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [selectedUser, setSelectedUser] = useState(null);
  const [saving, setSaving] = useState(false);
  const [actionMessage, setActionMessage] = useState("");
  const [createForm, setCreateForm] = useState({
    email: "", first_name: "", last_name: "", app_role: "employee", hourly_rate: "", phone: "",
  });
  const [resetPassword, setResetPassword] = useState("");
  const [sendingResetEmail, setSendingResetEmail] = useState(null);

  // Edit profile state
  const [editForm, setEditForm] = useState({});
  const [sinInput, setSinInput] = useState("");
  const [sinRevealed, setSinRevealed] = useState(false);
  const [sinDecrypted, setSinDecrypted] = useState("");
  const [sinLoading, setSinLoading] = useState(false);
  const [editShiftCount, setEditShiftCount] = useState(null);

  // Read token directly from localStorage to bypass Supabase Web Locks bug
  const getToken = () => {
    try {
      const key = Object.keys(localStorage).find(k => k.startsWith("sb-") && k.endsWith("-auth-token"));
      if (key) {
        const stored = JSON.parse(localStorage.getItem(key));
        return stored?.access_token || null;
      }
    } catch (e) { /* ignore */ }
    return null;
  };

  const callEdgeFn = async (body) => {
    const token = getToken();
    if (!token) throw new Error("Not authenticated — please log in again");
    const res = await fetch(
      `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/admin-users`,
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
          apikey: import.meta.env.VITE_SUPABASE_ANON_KEY,
        },
        body: JSON.stringify(body),
      }
    );
    const json = await res.json();
    if (!res.ok && !json.users) throw new Error(json.error || `HTTP ${res.status}`);
    return json;
  };

  const loadUsers = useCallback(async () => {
    setLoadingUsers(true);
    try {
      const json = await callEdgeFn({ action: "list" });
      if (json.users) setUsers(json.users);
      else if (json.error) setActionMessage(`Error: ${json.error}`);
    } catch (err) {
      setActionMessage(`Error: ${err.message}`);
    }
    setLoadingUsers(false);
  }, []);

  useEffect(() => { loadUsers(); }, [loadUsers]);

  const handleCreateUser = async () => {
    if (!createForm.email) return;
    setSaving(true);
    try {
      const json = await callEdgeFn({ action: "invite", ...createForm });
      if (json.error) { setActionMessage(`Error: ${json.error}`); }
      else {
        setActionMessage(json.message || "Invitation email sent!");
        setShowCreateModal(false);
        setCreateForm({ email: "", first_name: "", last_name: "", app_role: "employee", hourly_rate: "", phone: "" });
        loadUsers();
        onRefresh?.();
      }
    } catch (err) { setActionMessage(`Error: ${err.message}`); }
    setSaving(false);
  };

  const handleSendResetEmail = async (userEmail) => {
    if (!userEmail) return;
    setSendingResetEmail(userEmail);
    try {
      const json = await callEdgeFn({ action: "send-reset-email", email: userEmail });
      if (json.error) { setActionMessage(`Error: ${json.error}`); }
      else { setActionMessage(json.message || "Password reset email sent!"); }
    } catch (err) { setActionMessage(`Error: ${err.message}`); }
    setSendingResetEmail(null);
  };

  const handleUpdateRole = async (employeeId, newRole) => {
    try {
      const json = await callEdgeFn({ action: "update-role", employee_id: employeeId, app_role: newRole });
      if (json.error) setActionMessage(`Error: ${json.error}`);
      else { setActionMessage("Role updated"); loadUsers(); onRefresh?.(); }
    } catch (err) { setActionMessage(`Error: ${err.message}`); }
  };

  const handleToggleAccess = async (authUserId, disable) => {
    try {
      const json = await callEdgeFn({ action: "toggle-access", auth_user_id: authUserId, disable });
      if (json.error) setActionMessage(`Error: ${json.error}`);
      else { setActionMessage(disable ? "User disabled" : "User enabled"); loadUsers(); }
    } catch (err) { setActionMessage(`Error: ${err.message}`); }
  };

  const handleResetPassword = async () => {
    if (!selectedUser || !resetPassword) return;
    setSaving(true);
    try {
      const json = await callEdgeFn({ action: "reset-password", auth_user_id: selectedUser.id, new_password: resetPassword });
      if (json.error) setActionMessage(`Error: ${json.error}`);
      else {
        setActionMessage("Password reset successfully");
        setShowResetModal(false);
        setSelectedUser(null);
        setResetPassword("");
      }
    } catch (err) { setActionMessage(`Error: ${err.message}`); }
    setSaving(false);
  };

  // ── Edit Profile handlers ──

  const openEditModal = async (u) => {
    setSelectedUser(u);
    setSinInput("");
    setSinRevealed(false);
    setSinDecrypted("");
    setEditShiftCount(null);

    // Find matching employee record
    const emp = employees.find(e => e.id === u.employee_id) || {};

    setEditForm({
      first_name: emp.first_name || u.first_name || "",
      last_name: emp.last_name || u.last_name || "",
      email: u.email || emp.email || "",
      phone: emp.phone || "",
      hourly_rate: emp.hourly_rate ?? "",
      app_role: emp.app_role || u.app_role || "employee",
      status: emp.status || "active",
      street: emp.street || "",
      city: emp.city || "",
      province: emp.province || "",
      postal_code: emp.postal_code || "",
      emergency_contact_name: emp.emergency_contact_name || "",
      emergency_contact_phone: emp.emergency_contact_phone || "",
      emergency_contact_relationship: emp.emergency_contact_relationship || "",
      td1_federal_claim: emp.td1_federal_claim ?? 16452,
      td1_provincial_claim: emp.td1_provincial_claim ?? 12989,
    });

    // Load SIN (encrypted) if present
    if (emp.sin_encrypted && u.employee_id) {
      setSinLoading(true);
      try {
        const decrypted = await SINEncryption.decrypt(emp.sin_encrypted, SIN_PASSPHRASE, u.employee_id);
        if (decrypted) {
          setSinDecrypted(decrypted);
          setSinInput(decrypted);
        }
      } catch (e) {
        console.error("SIN decrypt error:", e);
      }
      setSinLoading(false);
    }

    // Load shift count
    if (u.employee_id) {
      try {
        const { count } = await supabase
          .from("shifts")
          .select("*", { count: "exact", head: true })
          .eq("employee_id", u.employee_id);
        setEditShiftCount(count ?? 0);
      } catch (e) {
        setEditShiftCount(null);
      }
    }

    setShowEditModal(true);
  };

  const handleSaveProfile = async () => {
    if (!selectedUser?.employee_id) return;
    setSaving(true);
    try {
      const updateData = {
        first_name: editForm.first_name,
        last_name: editForm.last_name,
        phone: editForm.phone,
        hourly_rate: editForm.hourly_rate ? parseFloat(editForm.hourly_rate) : null,
        app_role: editForm.app_role,
        status: editForm.status,
        street: editForm.street,
        city: editForm.city,
        province: editForm.province,
        postal_code: editForm.postal_code,
        emergency_contact_name: editForm.emergency_contact_name,
        emergency_contact_phone: editForm.emergency_contact_phone,
        emergency_contact_relationship: editForm.emergency_contact_relationship,
        td1_federal_claim: editForm.td1_federal_claim ? parseFloat(editForm.td1_federal_claim) : 16452,
        td1_provincial_claim: editForm.td1_provincial_claim ? parseFloat(editForm.td1_provincial_claim) : 12989,
      };

      // Handle SIN encryption
      const cleanSIN = sinInput.replace(/\D/g, "");
      if (cleanSIN && cleanSIN.length === 9) {
        const encrypted = await SINEncryption.encrypt(
          SINEncryption.format(sinInput),
          SIN_PASSPHRASE,
          selectedUser.employee_id
        );
        if (encrypted) {
          updateData.sin_encrypted = encrypted;
        }
      } else if (!sinInput.trim()) {
        updateData.sin_encrypted = null;
      }

      const { error } = await supabase
        .from("employees")
        .update(updateData)
        .eq("id", selectedUser.employee_id);

      if (error) throw error;

      setActionMessage("Profile saved successfully");
      setShowEditModal(false);
      setSelectedUser(null);
      loadUsers();
      onRefresh?.();
    } catch (err) {
      setActionMessage(`Error: ${err.message}`);
    }
    setSaving(false);
  };

  const roleColors = {
    admin: BRAND.danger,
    team_lead: BRAND.warning,
    employee: BRAND.primary,
    unlinked: "rgba(224,230,255,0.3)",
  };

  const roleLabels = { admin: "Admin", team_lead: "Team Lead", employee: "Employee" };

  const adminCount = users.filter(u => u.app_role === "admin").length;
  const activeCount = users.filter(u => !u.banned).length;
  const disabledCount = users.filter(u => u.banned).length;

  const maskedSIN = sinDecrypted ? SINEncryption.mask(sinDecrypted) : "***-***-***";

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div>
          <h1 className="text-2xl font-bold" style={{ color: BRAND.text }}>User Management</h1>
          <p className="text-sm mt-1" style={{ color: "rgba(224,230,255,0.6)" }}>
            Create logins, manage access roles, and monitor user activity.
          </p>
        </div>
        <div className="flex gap-2">
          <Btn icon={UserPlus} onClick={() => setShowCreateModal(true)}>Create User</Btn>
          <Btn icon={List} variant="secondary" onClick={loadUsers} disabled={loadingUsers}>
            {loadingUsers ? "Loading..." : "Refresh"}
          </Btn>
        </div>
      </div>

      {actionMessage && (
        <div
          className="p-3 rounded-lg text-sm flex items-center justify-between"
          style={{
            background: actionMessage.startsWith("Error") ? "rgba(244,67,54,0.2)" : "rgba(76,175,80,0.2)",
            color: actionMessage.startsWith("Error") ? BRAND.danger : BRAND.success,
          }}
        >
          <span>{actionMessage}</span>
          <button onClick={() => setActionMessage("")} className="ml-3 hover:opacity-70">
            <X size={14} />
          </button>
        </div>
      )}

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard label="Total Users" value={users.length} icon={Users} color="primary" />
        <StatCard label="Active" value={activeCount} icon={Check} color="success" />
        <StatCard label="Disabled" value={disabledCount} icon={Lock} color="danger" />
        <StatCard label="Admins" value={adminCount} icon={Award} color="warning" />
      </div>

      {/* Users Table */}
      <SectionCard title={`All Users (${users.length})`} icon={Users}>
        {loadingUsers ? (
          <div className="text-center py-8">
            <div className="inline-block animate-spin rounded-full h-8 w-8 border-4 border-opacity-30" style={{ borderColor: BRAND.primary }}></div>
            <p className="mt-2 text-sm" style={{ color: "rgba(224,230,255,0.6)" }}>Loading users...</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr style={{ borderBottom: `1px solid ${BRAND.glassBorder}` }}>
                  <th className="text-left py-3 px-3" style={{ color: BRAND.primary }}>User</th>
                  <th className="text-left py-3 px-3" style={{ color: BRAND.primary }}>Email</th>
                  <th className="text-center py-3 px-3" style={{ color: BRAND.primary }}>Role</th>
                  <th className="text-center py-3 px-3" style={{ color: BRAND.primary }}>Status</th>
                  <th className="text-center py-3 px-3" style={{ color: BRAND.primary }}>Last Login</th>
                  <th className="text-center py-3 px-3" style={{ color: BRAND.primary }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {users.map(u => (
                  <tr key={u.id} className="hover:bg-white/5 transition" style={{ borderBottom: `1px solid ${BRAND.glassBorder}` }}>
                    <td className="py-3 px-3">
                      <div className="flex items-center gap-2">
                        <div className="w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold"
                          style={{ background: `${roleColors[u.app_role] || BRAND.primary}20`, color: roleColors[u.app_role] || BRAND.primary }}>
                          {(u.first_name?.[0] || u.email?.[0] || "?").toUpperCase()}
                        </div>
                        <span className="font-medium" style={{ color: BRAND.text }}>
                          {u.first_name && u.last_name ? `${u.first_name} ${u.last_name}` : "\u2014"}
                        </span>
                      </div>
                    </td>
                    <td className="py-3 px-3" style={{ color: "rgba(224,230,255,0.7)" }}>{u.email}</td>
                    <td className="py-3 px-3 text-center">
                      {u.employee_id ? (
                        <select
                          value={u.app_role}
                          onChange={(e) => handleUpdateRole(u.employee_id, e.target.value)}
                          className="px-2 py-1 rounded text-xs font-semibold text-center appearance-none cursor-pointer"
                          style={{
                            background: `${roleColors[u.app_role]}20`,
                            color: roleColors[u.app_role],
                            border: `1px solid ${roleColors[u.app_role]}40`,
                          }}
                        >
                          <option value="admin">Admin</option>
                          <option value="team_lead">Team Lead</option>
                          <option value="employee">Employee</option>
                        </select>
                      ) : (
                        <span className="text-xs px-2 py-1 rounded-full" style={{ background: "rgba(224,230,255,0.1)", color: "rgba(224,230,255,0.4)" }}>
                          Unlinked
                        </span>
                      )}
                    </td>
                    <td className="py-3 px-3 text-center">
                      <span className="text-xs px-2 py-1 rounded-full"
                        style={{
                          background: u.banned ? `${BRAND.danger}20` : `${BRAND.success}20`,
                          color: u.banned ? BRAND.danger : BRAND.success,
                        }}>
                        {u.banned ? "Disabled" : "Active"}
                      </span>
                    </td>
                    <td className="py-3 px-3 text-center text-xs" style={{ color: "rgba(224,230,255,0.5)" }}>
                      {u.last_sign_in_at ? new Date(u.last_sign_in_at).toLocaleDateString("en-CA", { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" }) : "Never"}
                    </td>
                    <td className="py-3 px-3 text-center">
                      <div className="flex items-center justify-center gap-1">
                        {u.employee_id && (
                          <button
                            onClick={() => openEditModal(u)}
                            className="p-1.5 rounded hover:bg-white/10 transition"
                            title="Edit Profile"
                            style={{ color: BRAND.text }}
                          >
                            <Edit2 size={14} />
                          </button>
                        )}
                        <button
                          onClick={() => handleSendResetEmail(u.email)}
                          className="p-1.5 rounded hover:bg-white/10 transition"
                          title="Send Password Reset Email"
                          style={{ color: sendingResetEmail === u.email ? "rgba(224,230,255,0.3)" : BRAND.primary }}
                          disabled={sendingResetEmail === u.email}
                        >
                          {sendingResetEmail === u.email ? <Clock size={14} /> : <FileText size={14} />}
                        </button>
                        <button
                          onClick={() => { setSelectedUser(u); setShowResetModal(true); }}
                          className="p-1.5 rounded hover:bg-white/10 transition"
                          title="Reset Password Manually"
                          style={{ color: BRAND.warning }}
                        >
                          <Lock size={14} />
                        </button>
                        <button
                          onClick={() => handleToggleAccess(u.id, !u.banned)}
                          className="p-1.5 rounded hover:bg-white/10 transition"
                          title={u.banned ? "Enable User" : "Disable User"}
                          style={{ color: u.banned ? BRAND.success : BRAND.warning }}
                        >
                          {u.banned ? <Unlock size={14} /> : <Lock size={14} />}
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            {users.length === 0 && !loadingUsers && (
              <EmptyState icon={Users} title="No users found" message="Create a user to get started" />
            )}
          </div>
        )}
      </SectionCard>

      {/* Role Legend */}
      <SectionCard title="Role Permissions" icon={Award}>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {[
            { role: "Admin", color: BRAND.danger, perms: "Full access: all pages, user management, settings, payroll, reports" },
            { role: "Team Lead", color: BRAND.warning, perms: "Scheduling, employees, inventory, reports, notifications" },
            { role: "Employee", color: BRAND.primary, perms: "My Shifts, availability, personal dashboard only" },
          ].map(r => (
            <div key={r.role} className="rounded-lg p-3" style={{ background: "rgba(255,255,255,0.04)", border: `1px solid ${BRAND.glassBorder}` }}>
              <div className="flex items-center gap-2 mb-2">
                <div className="w-3 h-3 rounded-full" style={{ background: r.color }}></div>
                <span className="font-semibold text-sm" style={{ color: BRAND.text }}>{r.role}</span>
              </div>
              <p className="text-xs" style={{ color: "rgba(224,230,255,0.6)" }}>{r.perms}</p>
            </div>
          ))}
        </div>
      </SectionCard>

      {/* Create User Modal */}
      <Modal isOpen={showCreateModal} onClose={() => { setShowCreateModal(false); setCreateForm({ email: "", first_name: "", last_name: "", app_role: "employee", hourly_rate: "", phone: "" }); }} title="Create New User" size="md">
        <div className="space-y-3">
          <div className="grid grid-cols-2 gap-3">
            <Input label="First Name" value={createForm.first_name} onChange={(e) => setCreateForm({ ...createForm, first_name: e.target.value })} placeholder="John" />
            <Input label="Last Name" value={createForm.last_name} onChange={(e) => setCreateForm({ ...createForm, last_name: e.target.value })} placeholder="Doe" />
          </div>
          <Input label="Email" type="email" value={createForm.email} onChange={(e) => setCreateForm({ ...createForm, email: e.target.value })} placeholder="john@collideapparel.com" />
          <p className="text-xs" style={{ color: "rgba(224,230,255,0.5)" }}>They will receive an email to set their own password.</p>
          <Input label="Phone Number" type="tel" value={createForm.phone} onChange={(e) => setCreateForm({ ...createForm, phone: e.target.value })} placeholder="(416) 555-0123" />
          <Select label="Access Role" value={createForm.app_role} onChange={(e) => setCreateForm({ ...createForm, app_role: e.target.value })} options={[
            { value: "admin", label: "Admin \u2014 Full access" },
            { value: "team_lead", label: "Team Lead \u2014 Scheduling & inventory" },
            { value: "employee", label: "Employee \u2014 My Shifts only" },
          ]} />
          <Input label="Hourly Rate ($)" type="number" value={createForm.hourly_rate} onChange={(e) => setCreateForm({ ...createForm, hourly_rate: e.target.value })} placeholder="0.00" />
          <div className="flex justify-end gap-2 mt-4">
            <Btn variant="secondary" onClick={() => setShowCreateModal(false)}>Cancel</Btn>
            <Btn onClick={handleCreateUser} disabled={saving || !createForm.email}>
              {saving ? "Sending Invite..." : "Send Invite Email"}
            </Btn>
          </div>
        </div>
      </Modal>

      {/* Reset Password Modal */}
      <Modal isOpen={showResetModal} onClose={() => { setShowResetModal(false); setSelectedUser(null); setResetPassword(""); }} title="Reset Password" size="sm">
        <div className="space-y-3">
          <p className="text-sm" style={{ color: "rgba(224,230,255,0.7)" }}>
            Reset password for <strong style={{ color: BRAND.text }}>{selectedUser?.email}</strong>
          </p>
          <Input label="New Password" type="password" value={resetPassword} onChange={(e) => setResetPassword(e.target.value)} placeholder="Min 6 characters" />
          <div className="flex justify-end gap-2 mt-4">
            <Btn variant="secondary" onClick={() => { setShowResetModal(false); setSelectedUser(null); setResetPassword(""); }}>Cancel</Btn>
            <Btn onClick={handleResetPassword} disabled={saving || resetPassword.length < 6}>
              {saving ? "Resetting..." : "Reset Password"}
            </Btn>
          </div>
        </div>
      </Modal>

      {/* Edit Employee Profile Modal */}
      <Modal isOpen={showEditModal} onClose={() => { setShowEditModal(false); setSelectedUser(null); }} title="Edit Employee Profile" size="lg">
        <div className="space-y-4 max-h-[70vh] overflow-y-auto pr-1">
          {/* Basic Info */}
          <div className="rounded-lg p-4" style={{ background: "rgba(255,255,255,0.04)", border: `1px solid ${BRAND.glassBorder}` }}>
            <h3 className="text-sm font-semibold mb-3" style={{ color: BRAND.primary }}>Basic Information</h3>
            <div className="grid grid-cols-2 gap-3">
              <Input label="First Name" value={editForm.first_name || ""} onChange={(e) => setEditForm({ ...editForm, first_name: e.target.value })} placeholder="First name" />
              <Input label="Last Name" value={editForm.last_name || ""} onChange={(e) => setEditForm({ ...editForm, last_name: e.target.value })} placeholder="Last name" />
            </div>
            <div className="mb-4">
              <label className="block text-sm font-medium mb-2" style={{ color: BRAND.text }}>Email</label>
              <div
                className="w-full px-4 py-2 rounded-lg text-sm"
                style={{
                  background: "rgba(255,255,255,0.03)",
                  border: `1px solid ${BRAND.glassBorder}`,
                  color: "rgba(224,230,255,0.5)",
                }}
              >
                {editForm.email || "\u2014"}
              </div>
            </div>
            <Input label="Phone Number" type="tel" value={editForm.phone || ""} onChange={(e) => setEditForm({ ...editForm, phone: e.target.value })} placeholder="(416) 555-0123" />
            <Input label="Hourly Rate ($)" type="number" value={editForm.hourly_rate ?? ""} onChange={(e) => setEditForm({ ...editForm, hourly_rate: e.target.value })} placeholder="0.00" />
            <div className="grid grid-cols-2 gap-3">
              <Select label="Role" value={editForm.app_role || "employee"} onChange={(e) => setEditForm({ ...editForm, app_role: e.target.value })} options={[
                { value: "admin", label: "Admin" },
                { value: "team_lead", label: "Team Lead" },
                { value: "employee", label: "Employee" },
              ]} />
              <Select label="Status" value={editForm.status || "active"} onChange={(e) => setEditForm({ ...editForm, status: e.target.value })} options={[
                { value: "active", label: "Active" },
                { value: "on_leave", label: "On Leave" },
                { value: "terminated", label: "Terminated" },
              ]} />
            </div>
          </div>

          {/* SIN */}
          <div className="rounded-lg p-4" style={{ background: "rgba(255,255,255,0.04)", border: `1px solid ${BRAND.glassBorder}` }}>
            <h3 className="text-sm font-semibold mb-3" style={{ color: BRAND.primary }}>Social Insurance Number (SIN)</h3>
            {sinLoading ? (
              <p className="text-xs" style={{ color: "rgba(224,230,255,0.5)" }}>Decrypting SIN...</p>
            ) : (
              <div>
                <div className="flex items-end gap-2">
                  <div className="flex-1">
                    <Input
                      label="SIN"
                      type={sinRevealed ? "text" : "password"}
                      value={sinInput}
                      onChange={(e) => setSinInput(e.target.value)}
                      placeholder="123-456-789"
                    />
                  </div>
                  <button
                    type="button"
                    onClick={() => setSinRevealed(!sinRevealed)}
                    className="p-2 mb-4 rounded hover:bg-white/10 transition"
                    title={sinRevealed ? "Hide SIN" : "Reveal SIN"}
                    style={{ color: BRAND.primary }}
                  >
                    {sinRevealed ? <EyeOff size={18} /> : <Eye size={18} />}
                  </button>
                </div>
                {sinDecrypted && !sinRevealed && (
                  <p className="text-xs -mt-2 mb-2" style={{ color: "rgba(224,230,255,0.4)" }}>
                    Stored: {maskedSIN}
                  </p>
                )}
                {sinInput && !SINEncryption.validate(sinInput) && sinInput.replace(/\D/g, "").length > 0 && (
                  <p className="text-xs -mt-2" style={{ color: BRAND.warning }}>
                    SIN must be 9 digits (e.g. 123-456-789)
                  </p>
                )}
              </div>
            )}
          </div>

          {/* Address */}
          <div className="rounded-lg p-4" style={{ background: "rgba(255,255,255,0.04)", border: `1px solid ${BRAND.glassBorder}` }}>
            <h3 className="text-sm font-semibold mb-3" style={{ color: BRAND.primary }}>Address</h3>
            <Input label="Street" value={editForm.street || ""} onChange={(e) => setEditForm({ ...editForm, street: e.target.value })} placeholder="123 Main St" />
            <div className="grid grid-cols-3 gap-3">
              <Input label="City" value={editForm.city || ""} onChange={(e) => setEditForm({ ...editForm, city: e.target.value })} placeholder="Toronto" />
              <Select label="Province" value={editForm.province || ""} onChange={(e) => setEditForm({ ...editForm, province: e.target.value })} options={PROVINCES} />
              <Input label="Postal Code" value={editForm.postal_code || ""} onChange={(e) => setEditForm({ ...editForm, postal_code: e.target.value })} placeholder="M5V 2T6" />
            </div>
          </div>

          {/* Emergency Contact */}
          <div className="rounded-lg p-4" style={{ background: "rgba(255,255,255,0.04)", border: `1px solid ${BRAND.glassBorder}` }}>
            <h3 className="text-sm font-semibold mb-3" style={{ color: BRAND.primary }}>Emergency Contact</h3>
            <div className="grid grid-cols-2 gap-3">
              <Input label="Contact Name" value={editForm.emergency_contact_name || ""} onChange={(e) => setEditForm({ ...editForm, emergency_contact_name: e.target.value })} placeholder="Jane Doe" />
              <Input label="Relationship" value={editForm.emergency_contact_relationship || ""} onChange={(e) => setEditForm({ ...editForm, emergency_contact_relationship: e.target.value })} placeholder="Spouse, Parent, etc." />
            </div>
            <Input label="Contact Phone" type="tel" value={editForm.emergency_contact_phone || ""} onChange={(e) => setEditForm({ ...editForm, emergency_contact_phone: e.target.value })} placeholder="(416) 555-0456" />
          </div>

          {/* TD1 Claims */}
          <div className="rounded-lg p-4" style={{ background: "rgba(255,255,255,0.04)", border: `1px solid ${BRAND.glassBorder}` }}>
            <h3 className="text-sm font-semibold mb-3" style={{ color: BRAND.primary }}>CRA Tax Claims (TD1)</h3>
            <div className="grid grid-cols-2 gap-3">
              <Input label="TD1 Federal Claim ($)" type="number" value={editForm.td1_federal_claim ?? ""} onChange={(e) => setEditForm({ ...editForm, td1_federal_claim: e.target.value })} placeholder="16452" />
              <Input label="TD1 Provincial Claim ($)" type="number" value={editForm.td1_provincial_claim ?? ""} onChange={(e) => setEditForm({ ...editForm, td1_provincial_claim: e.target.value })} placeholder="12989" />
            </div>
            <p className="text-xs mt-1" style={{ color: "rgba(224,230,255,0.4)" }}>
              Defaults to 2026 Basic Personal Amount if left blank. Federal: $16,452 / Ontario: $12,989.
            </p>
          </div>

          {/* Activity Section */}
          <div className="rounded-lg p-4" style={{ background: "rgba(255,255,255,0.04)", border: `1px solid ${BRAND.glassBorder}` }}>
            <h3 className="text-sm font-semibold mb-3" style={{ color: BRAND.primary }}>Activity</h3>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <p className="text-xs" style={{ color: "rgba(224,230,255,0.5)" }}>Last Login</p>
                <p className="text-sm font-medium" style={{ color: BRAND.text }}>
                  {selectedUser?.last_sign_in_at
                    ? new Date(selectedUser.last_sign_in_at).toLocaleDateString("en-CA", {
                        year: "numeric", month: "short", day: "numeric", hour: "2-digit", minute: "2-digit",
                      })
                    : "Never"}
                </p>
              </div>
              <div>
                <p className="text-xs" style={{ color: "rgba(224,230,255,0.5)" }}>Total Shifts Assigned</p>
                <p className="text-sm font-medium" style={{ color: BRAND.text }}>
                  {editShiftCount !== null ? editShiftCount : "\u2014"}
                </p>
              </div>
            </div>
          </div>

          {/* Save / Cancel */}
          <div className="flex justify-end gap-2 pt-2">
            <Btn variant="secondary" onClick={() => { setShowEditModal(false); setSelectedUser(null); }}>Cancel</Btn>
            <Btn onClick={handleSaveProfile} disabled={saving}>
              {saving ? "Saving..." : "Save Profile"}
            </Btn>
          </div>
        </div>
      </Modal>
    </div>
  );
};

export default UserManagementPage;
