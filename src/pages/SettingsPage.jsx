import React, { useState, useEffect } from "react";
import { User, Settings, Check, Globe, Calendar, DollarSign } from "lucide-react";
import { SectionCard, Input, Select } from "../components";
import { BRAND } from "../constants/brand";

const PREFS_KEY = "collide-prefs";

const DEFAULT_PREFS = {
  emailNotifications: true,
  darkMode: true,
  timezone: "America/Toronto",
  payPeriod: "biweekly",
  currencyFormat: "CAD",
};

const TIMEZONE_OPTIONS = [
  { value: "America/Toronto", label: "Eastern (Toronto)" },
  { value: "America/Winnipeg", label: "Central (Winnipeg)" },
  { value: "America/Edmonton", label: "Mountain (Edmonton)" },
  { value: "America/Vancouver", label: "Pacific (Vancouver)" },
  { value: "America/Halifax", label: "Atlantic (Halifax)" },
  { value: "America/St_Johns", label: "Newfoundland (St. John's)" },
];

const PAY_PERIOD_OPTIONS = [
  { value: "biweekly", label: "Biweekly" },
  { value: "monthly", label: "Monthly" },
  { value: "semi-monthly", label: "Semi-monthly" },
];

const CURRENCY_OPTIONS = [
  { value: "CAD", label: "CAD ($)" },
  { value: "USD", label: "USD ($)" },
];

const SettingsPage = ({ user }) => {
  const [prefs, setPrefs] = useState(DEFAULT_PREFS);
  const [saveMessage, setSaveMessage] = useState("");

  useEffect(() => {
    try {
      const stored = localStorage.getItem(PREFS_KEY);
      if (stored) {
        const parsed = JSON.parse(stored);
        setPrefs({ ...DEFAULT_PREFS, ...parsed });
      }
    } catch {
      // Use defaults on parse error
    }
  }, []);

  const updatePref = (key, value) => {
    const updated = { ...prefs, [key]: value };
    setPrefs(updated);
    try {
      localStorage.setItem(PREFS_KEY, JSON.stringify(updated));
    } catch {
      // Silently fail on storage error
    }
    setSaveMessage("Settings saved");
    setTimeout(() => setSaveMessage(""), 2000);
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold" style={{ color: BRAND.text }}>
          Settings
        </h1>
        {saveMessage && (
          <div
            className="flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm font-medium animate-pulse"
            style={{ background: "rgba(34,197,94,0.2)", color: "#22c55e" }}
          >
            <Check size={14} />
            {saveMessage}
          </div>
        )}
      </div>

      <SectionCard title="Account" icon={User}>
        <div className="space-y-3">
          <Input label="Email" value={user?.email || ""} disabled />
          <Input label="Full Name" value={user?.user_metadata?.name || ""} disabled />
        </div>
      </SectionCard>

      <SectionCard title="Notifications" icon={Settings}>
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <div>
              <label className="font-medium" style={{ color: BRAND.text }}>
                Email Notifications
              </label>
              <p className="text-xs" style={{ color: "rgba(224,230,255,0.5)" }}>
                Receive shift and payroll alerts via email
              </p>
            </div>
            <input
              type="checkbox"
              checked={prefs.emailNotifications}
              onChange={(e) => updatePref("emailNotifications", e.target.checked)}
              className="w-5 h-5 rounded accent-cyan-400"
            />
          </div>
          <div className="flex items-center justify-between">
            <div>
              <label className="font-medium" style={{ color: BRAND.text }}>
                Dark Mode
              </label>
              <p className="text-xs" style={{ color: "rgba(224,230,255,0.5)" }}>
                Use dark glassmorphism theme
              </p>
            </div>
            <input
              type="checkbox"
              checked={prefs.darkMode}
              onChange={(e) => updatePref("darkMode", e.target.checked)}
              className="w-5 h-5 rounded accent-cyan-400"
            />
          </div>
        </div>
      </SectionCard>

      <SectionCard title="Regional" icon={Globe}>
        <div className="space-y-3">
          <Select
            label="Timezone"
            value={prefs.timezone}
            onChange={(e) => updatePref("timezone", e.target.value)}
            options={TIMEZONE_OPTIONS}
          />
          <Select
            label="Pay Period"
            value={prefs.payPeriod}
            onChange={(e) => updatePref("payPeriod", e.target.value)}
            options={PAY_PERIOD_OPTIONS}
          />
          <Select
            label="Currency Format"
            value={prefs.currencyFormat}
            onChange={(e) => updatePref("currencyFormat", e.target.value)}
            options={CURRENCY_OPTIONS}
          />
        </div>
      </SectionCard>
    </div>
  );
};

export default SettingsPage;
