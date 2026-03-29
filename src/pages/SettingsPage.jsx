import React from "react";
import { User, Settings } from "lucide-react";
import { SectionCard, Input } from "../components";
import { BRAND } from "../constants/brand";

const SettingsPage = ({ user }) => {
  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-bold" style={{ color: BRAND.text }}>
        Settings
      </h1>

      <SectionCard title="Account" icon={User}>
        <div className="space-y-3">
          <Input label="Email" value={user?.email || ""} disabled />
          <Input label="Full Name" value={user?.user_metadata?.name || ""} disabled />
        </div>
      </SectionCard>

      <SectionCard title="Preferences" icon={Settings}>
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <label style={{ color: BRAND.text }}>Email Notifications</label>
            <input type="checkbox" defaultChecked className="w-5 h-5 rounded" />
          </div>
          <div className="flex items-center justify-between">
            <label style={{ color: BRAND.text }}>Dark Mode</label>
            <input type="checkbox" defaultChecked className="w-5 h-5 rounded" />
          </div>
        </div>
      </SectionCard>
    </div>
  );
};

export default SettingsPage;
