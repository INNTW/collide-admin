import React, { useState } from "react";
import { Plus, Calendar, Clock, MapPin, Edit2, Trash2 } from "lucide-react";
import { supabase } from "../lib/supabase";
import { StatCard, SectionCard, EmptyState, Btn, Modal, Input, Select } from "../components";
import { BRAND } from "../constants/brand";
import { formatDate } from "../utils/formatters";

const EventsManagementPage = ({ events = [], locations = [], onRefresh }) => {
  const [showEventModal, setShowEventModal] = useState(false);
  const [showLocationModal, setShowLocationModal] = useState(false);
  const [editEvent, setEditEvent] = useState(null);
  const [editLocation, setEditLocation] = useState(null);
  const [saving, setSaving] = useState(false);
  const [activeTab, setActiveTab] = useState("events"); // events | locations
  const [filterStatus, setFilterStatus] = useState("");
  const [eventForm, setEventForm] = useState({ name: "", start_date: "", end_date: "", event_type: "festival", status: "upcoming", description: "", notes: "" });
  const [locForm, setLocForm] = useState({ event_id: "", name: "", address: "", city: "", province: "ON", notes: "" });

  const resetEventForm = () => setEventForm({ name: "", start_date: "", end_date: "", event_type: "festival", status: "upcoming", description: "", notes: "" });
  const resetLocForm = () => setLocForm({ event_id: "", name: "", address: "", city: "", province: "ON", notes: "" });

  const openEditEvent = (e) => {
    setEditEvent(e);
    setEventForm({
      name: e.name,
      start_date: e.start_date,
      end_date: e.end_date,
      event_type: e.event_type || "festival",
      status: e.status || "upcoming",
      description: e.description || "",
      notes: e.notes || "",
    });
  };

  const openEditLocation = (loc) => {
    setEditLocation(loc);
    setLocForm({
      event_id: loc.event_id,
      name: loc.name,
      address: loc.address || "",
      city: loc.city || "",
      province: loc.province || "ON",
      notes: loc.notes || "",
    });
  };

  const handleSaveEvent = async () => {
    if (!eventForm.name || !eventForm.start_date || !eventForm.end_date) return;
    setSaving(true);
    const payload = {
      name: eventForm.name,
      start_date: eventForm.start_date,
      end_date: eventForm.end_date,
      event_type: eventForm.event_type,
      status: eventForm.status,
      description: eventForm.description || null,
      notes: eventForm.notes || null,
    };
    if (editEvent) {
      await supabase.from("events").update(payload).eq("id", editEvent.id);
    } else {
      await supabase.from("events").insert(payload);
    }
    setSaving(false);
    setShowEventModal(false);
    setEditEvent(null);
    resetEventForm();
    onRefresh?.();
  };

  const handleDeleteEvent = async (id) => {
    if (!confirm("Delete this event and all associated locations, shifts, and requirements?")) return;
    await supabase.from("event_locations").delete().eq("event_id", id);
    await supabase.from("shifts").delete().eq("event_id", id);
    await supabase.from("role_requirements").delete().eq("event_id", id);
    await supabase.from("distributions").delete().eq("event_id", id);
    await supabase.from("events").delete().eq("id", id);
    onRefresh?.();
  };

  const handleSaveLocation = async () => {
    if (!locForm.event_id || !locForm.name) return;
    setSaving(true);
    const payload = {
      event_id: locForm.event_id,
      name: locForm.name,
      address: locForm.address || null,
      city: locForm.city || null,
      province: locForm.province || null,
      notes: locForm.notes || null,
    };
    if (editLocation) {
      await supabase.from("event_locations").update(payload).eq("id", editLocation.id);
    } else {
      await supabase.from("event_locations").insert(payload);
    }
    setSaving(false);
    setShowLocationModal(false);
    setEditLocation(null);
    resetLocForm();
    onRefresh?.();
  };

  const handleDeleteLocation = async (id) => {
    if (!confirm("Delete this location?")) return;
    await supabase.from("event_locations").delete().eq("id", id);
    onRefresh?.();
  };

  const now = new Date().toISOString().split("T")[0];
  const upcomingEvents = events.filter(e => e.end_date >= now);
  const pastEvents = events.filter(e => e.end_date < now);
  const filteredEvents = filterStatus
    ? events.filter(e => e.status === filterStatus)
    : events;
  const sortedEvents = [...filteredEvents].sort((a, b) => a.start_date.localeCompare(b.start_date));

  const statusColors = { upcoming: BRAND.primary, active: BRAND.success, completed: "rgba(224,230,255,0.5)", cancelled: BRAND.danger };
  const typeLabels = { festival: "Festival", concert: "Concert", market: "Market", pop_up: "Pop-Up", corporate: "Corporate", tournament: "Tournament", combine: "Combine", camp: "Camp", other: "Other" };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-4">
        <h1 className="text-2xl font-bold" style={{ color: BRAND.text }}>Events Manager</h1>
        <div className="flex gap-2">
          {activeTab === "events" ? (
            <Btn icon={Plus} onClick={() => { resetEventForm(); setEditEvent(null); setShowEventModal(true); }}>New Event</Btn>
          ) : (
            <Btn icon={Plus} onClick={() => { resetLocForm(); setEditLocation(null); setShowLocationModal(true); }}>New Location</Btn>
          )}
        </div>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard label="Total Events" value={events.length} icon={Calendar} color="primary" />
        <StatCard label="Upcoming" value={upcomingEvents.length} icon={Calendar} color="success" />
        <StatCard label="Past" value={pastEvents.length} icon={Clock} color="warning" />
        <StatCard label="Locations" value={locations.length} icon={MapPin} color="primary" />
      </div>

      {/* Tabs */}
      <div className="flex gap-2">
        {["events", "locations"].map(tab => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className="px-4 py-2 rounded-lg text-sm font-medium transition"
            style={{
              background: activeTab === tab ? `${BRAND.primary}20` : "rgba(255,255,255,0.05)",
              color: activeTab === tab ? BRAND.primary : "rgba(224,230,255,0.7)",
              border: `1px solid ${activeTab === tab ? BRAND.primary : BRAND.glassBorder}`,
            }}
          >
            {tab === "events" ? "Events" : "Locations"}
          </button>
        ))}
        {activeTab === "events" && (
          <select
            value={filterStatus}
            onChange={(e) => setFilterStatus(e.target.value)}
            className="ml-auto px-3 py-1.5 rounded-lg text-sm text-white focus:outline-none"
            style={{ background: "rgba(255,255,255,0.05)", border: `1px solid ${BRAND.glassBorder}` }}
          >
            <option value="">All Statuses</option>
            <option value="upcoming">Upcoming</option>
            <option value="active">Active</option>
            <option value="completed">Completed</option>
            <option value="cancelled">Cancelled</option>
          </select>
        )}
      </div>

      {/* Events Tab */}
      {activeTab === "events" && (
        <SectionCard title={`Events (${sortedEvents.length})`} icon={Calendar}>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr style={{ borderBottom: `1px solid ${BRAND.glassBorder}` }}>
                  <th className="text-left py-3 px-3" style={{ color: BRAND.primary }}>Event</th>
                  <th className="text-center py-3 px-3" style={{ color: BRAND.primary }}>Type</th>
                  <th className="text-center py-3 px-3" style={{ color: BRAND.primary }}>Dates</th>
                  <th className="text-center py-3 px-3" style={{ color: BRAND.primary }}>Status</th>
                  <th className="text-center py-3 px-3" style={{ color: BRAND.primary }}>Locations</th>
                  <th className="text-center py-3 px-3" style={{ color: BRAND.primary }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {sortedEvents.map(e => {
                  const eventLocs = locations.filter(l => l.event_id === e.id);
                  return (
                    <tr key={e.id} className="hover:bg-white/5 transition" style={{ borderBottom: `1px solid ${BRAND.glassBorder}` }}>
                      <td className="py-3 px-3">
                        <div className="font-medium" style={{ color: BRAND.text }}>{e.name}</div>
                        {e.description && <p className="text-xs mt-0.5" style={{ color: "rgba(224,230,255,0.5)" }}>{e.description.substring(0, 60)}</p>}
                      </td>
                      <td className="py-3 px-3 text-center">
                        <span className="text-xs px-2 py-1 rounded-full" style={{ background: "rgba(84,205,249,0.15)", color: BRAND.primary }}>
                          {typeLabels[e.event_type] || e.event_type}
                        </span>
                      </td>
                      <td className="py-3 px-3 text-center text-xs" style={{ color: "rgba(224,230,255,0.7)" }}>
                        {e.start_date} &rarr; {e.end_date}
                      </td>
                      <td className="py-3 px-3 text-center">
                        <span className="text-xs px-2 py-1 rounded-full" style={{ background: `${statusColors[e.status] || BRAND.primary}20`, color: statusColors[e.status] || BRAND.primary }}>
                          {e.status}
                        </span>
                      </td>
                      <td className="py-3 px-3 text-center" style={{ color: BRAND.text }}>{eventLocs.length}</td>
                      <td className="py-3 px-3 text-center">
                        <div className="flex items-center justify-center gap-1">
                          <button onClick={() => openEditEvent(e)} className="p-1.5 rounded-lg hover:bg-white/10 transition">
                            <Edit2 size={14} style={{ color: BRAND.primary }} />
                          </button>
                          <button onClick={() => handleDeleteEvent(e.id)} className="p-1.5 rounded-lg hover:bg-white/10 transition">
                            <Trash2 size={14} style={{ color: BRAND.danger }} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
            {sortedEvents.length === 0 && <EmptyState icon={Calendar} title="No events" message="Create your first event to get started" />}
          </div>
        </SectionCard>
      )}

      {/* Locations Tab */}
      {activeTab === "locations" && (
        <SectionCard title={`Locations (${locations.length})`} icon={MapPin}>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr style={{ borderBottom: `1px solid ${BRAND.glassBorder}` }}>
                  <th className="text-left py-3 px-3" style={{ color: BRAND.primary }}>Location</th>
                  <th className="text-left py-3 px-3" style={{ color: BRAND.primary }}>Event</th>
                  <th className="text-left py-3 px-3" style={{ color: BRAND.primary }}>Address</th>
                  <th className="text-center py-3 px-3" style={{ color: BRAND.primary }}>City</th>
                  <th className="text-center py-3 px-3" style={{ color: BRAND.primary }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {locations.map(loc => {
                  const event = events.find(e => e.id === loc.event_id);
                  return (
                    <tr key={loc.id} className="hover:bg-white/5 transition" style={{ borderBottom: `1px solid ${BRAND.glassBorder}` }}>
                      <td className="py-3 px-3 font-medium" style={{ color: BRAND.text }}>{loc.name}</td>
                      <td className="py-3 px-3" style={{ color: "rgba(224,230,255,0.7)" }}>{event?.name || "Unknown"}</td>
                      <td className="py-3 px-3 text-xs" style={{ color: "rgba(224,230,255,0.6)" }}>{loc.address || "—"}</td>
                      <td className="py-3 px-3 text-center" style={{ color: BRAND.text }}>{loc.city || "—"}</td>
                      <td className="py-3 px-3 text-center">
                        <div className="flex items-center justify-center gap-1">
                          <button onClick={() => openEditLocation(loc)} className="p-1.5 rounded-lg hover:bg-white/10 transition">
                            <Edit2 size={14} style={{ color: BRAND.primary }} />
                          </button>
                          <button onClick={() => handleDeleteLocation(loc.id)} className="p-1.5 rounded-lg hover:bg-white/10 transition">
                            <Trash2 size={14} style={{ color: BRAND.danger }} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
            {locations.length === 0 && <EmptyState icon={MapPin} title="No locations" message="Add a location to an event" />}
          </div>
        </SectionCard>
      )}

      {/* Event Modal */}
      <Modal isOpen={showEventModal || !!editEvent} onClose={() => { setShowEventModal(false); setEditEvent(null); resetEventForm(); }} title={editEvent ? "Edit Event" : "New Event"} size="lg">
        <div className="space-y-1">
          <Input label="Event Name" value={eventForm.name} onChange={(e) => setEventForm({ ...eventForm, name: e.target.value })} placeholder="e.g. Osheaga 2026" />
          <div className="grid grid-cols-2 gap-4">
            <Input label="Start Date" value={eventForm.start_date} onChange={(e) => setEventForm({ ...eventForm, start_date: e.target.value })} type="date" />
            <Input label="End Date" value={eventForm.end_date} onChange={(e) => setEventForm({ ...eventForm, end_date: e.target.value })} type="date" />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <Select label="Event Type" value={eventForm.event_type} onChange={(e) => setEventForm({ ...eventForm, event_type: e.target.value })} options={Object.entries(typeLabels).map(([k, v]) => ({ value: k, label: v }))} />
            <Select label="Status" value={eventForm.status} onChange={(e) => setEventForm({ ...eventForm, status: e.target.value })} options={[{ value: "upcoming", label: "Upcoming" }, { value: "active", label: "Active" }, { value: "completed", label: "Completed" }, { value: "cancelled", label: "Cancelled" }]} />
          </div>
          <Input label="Description" value={eventForm.description} onChange={(e) => setEventForm({ ...eventForm, description: e.target.value })} placeholder="Brief description..." />
          <Input label="Notes" value={eventForm.notes} onChange={(e) => setEventForm({ ...eventForm, notes: e.target.value })} placeholder="Internal notes..." />
          <div className="flex justify-end gap-2 mt-4">
            <Btn variant="secondary" onClick={() => { setShowEventModal(false); setEditEvent(null); resetEventForm(); }}>Cancel</Btn>
            <Btn onClick={handleSaveEvent} disabled={saving || !eventForm.name || !eventForm.start_date || !eventForm.end_date}>{saving ? "Saving..." : editEvent ? "Update" : "Create"}</Btn>
          </div>
        </div>
      </Modal>

      {/* Location Modal */}
      <Modal isOpen={showLocationModal || !!editLocation} onClose={() => { setShowLocationModal(false); setEditLocation(null); resetLocForm(); }} title={editLocation ? "Edit Location" : "New Location"} size="md">
        <div className="space-y-1">
          {!editLocation && (
            <Select
              label="Copy from existing venue"
              value=""
              onChange={(e) => {
                if (e.target.value) {
                  const existing = locations.find(l => l.id === e.target.value);
                  if (existing) {
                    setLocForm({ ...locForm, name: existing.name, address: existing.address || "", city: existing.city || "", province: existing.province || "ON", notes: existing.notes || "" });
                  }
                }
              }}
              options={[{ value: "", label: "None — create new" }, ...locations.map(l => ({ value: l.id, label: `${l.name}${l.address ? ' — ' + l.address : ''}` }))]}
              placeholder="Select venue to copy..."
            />
          )}
          <Select label="Event" value={locForm.event_id} onChange={(e) => setLocForm({ ...locForm, event_id: e.target.value })} options={events.map(ev => ({ value: ev.id, label: ev.name }))} placeholder="Select event..." />
          <Input label="Location Name" value={locForm.name} onChange={(e) => setLocForm({ ...locForm, name: e.target.value })} placeholder="e.g. Main Stage Booth" />
          <Input label="Address" value={locForm.address} onChange={(e) => setLocForm({ ...locForm, address: e.target.value })} placeholder="123 Street..." />
          <div className="grid grid-cols-2 gap-4">
            <Input label="City" value={locForm.city} onChange={(e) => setLocForm({ ...locForm, city: e.target.value })} placeholder="Toronto" />
            <Select label="Province" value={locForm.province} onChange={(e) => setLocForm({ ...locForm, province: e.target.value })} options={[{ value: "ON", label: "Ontario" }, { value: "QC", label: "Quebec" }, { value: "BC", label: "British Columbia" }, { value: "AB", label: "Alberta" }, { value: "MB", label: "Manitoba" }, { value: "SK", label: "Saskatchewan" }, { value: "NS", label: "Nova Scotia" }, { value: "NB", label: "New Brunswick" }]} />
          </div>
          <Input label="Notes" value={locForm.notes} onChange={(e) => setLocForm({ ...locForm, notes: e.target.value })} placeholder="Notes..." />
          <div className="flex justify-end gap-2 mt-4">
            <Btn variant="secondary" onClick={() => { setShowLocationModal(false); setEditLocation(null); resetLocForm(); }}>Cancel</Btn>
            <Btn onClick={handleSaveLocation} disabled={saving || !locForm.event_id || !locForm.name}>{saving ? "Saving..." : editLocation ? "Update" : "Create"}</Btn>
          </div>
        </div>
      </Modal>
    </div>
  );
};

export default EventsManagementPage;
