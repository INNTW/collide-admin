/**
 * Collide Apparel Staff Manager v5.0 Phase 1
 * React + Vite + Supabase + Recharts + Lucide React
 * Single-file app with glassmorphism UI, Supabase Auth, CRA tax engine
 * 
 * NEW IN v5.0:
 * - Hierarchical navigation tree (Scheduling, Employees, Inventory sections)
 * - Calendar scheduling view (Month/Week/Day)
 * - Employee skills & tags system
 * - Role requirements & fulfillment dashboard
 * - Enhanced shift builder with role assignment
 */

import React, { useState, useEffect, useCallback, useRef, useMemo } from "react";
import {
  Home,
  Calendar,
  Users,
  Package,
  BarChart3,
  Bell,
  Settings,
  LogOut,
  Menu,
  X,
  Search,
  ChevronDown,
  ChevronRight,
  Plus,
  Edit2,
  Trash2,
  Eye,
  EyeOff,
  Copy,
  Check,
  AlertCircle,
  Lock,
  Unlock,
  TrendingUp,
  DollarSign,
  Clock,
  User,
  FileText,
  Grid,
  List,
  Tag,
  Star,
  Zap,
  UserPlus,
  Award,
  ChevronLeft,
  Briefcase,
  MapPin,
} from "lucide-react";
import {
  LineChart,
  Line,
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from "recharts";
import { supabase } from "./lib/supabase";

// ============================================================================
// CONSTANTS & CONFIG
// ============================================================================

const BRAND = {
  gradient: "linear-gradient(135deg, #001F3F 0%, #003366 40%, #001a33 70%, #000d1a 100%)",
  navy: "#001F3F",
  primary: "#54CDF9",
  glass: "rgba(255,255,255,0.08)",
  glassBorder: "rgba(255,255,255,0.15)",
  blur: "blur(16px)",
  success: "#4CAF50",
  warning: "#FF9800",
  danger: "#F44336",
  text: "#E0E6FF",
};

// ============================================================
// CRA 2026 TAX ENGINE — Ontario
// Source: CRA T4127 122nd Edition, T4032-ON Jan 2026
// ============================================================
const TAX_CONFIG_2026 = {
  year: 2026,
  payPeriods: 26,

  cpp: {
    rate: 0.0595,
    ympe: 74600,
    basicExemption: 3500,
    maxContribution: 4230.45,
  },

  cpp2: {
    rate: 0.04,
    yampe: 85000,
    maxContribution: 416.00,
  },

  ei: {
    rate: 0.0163,
    maxInsurableEarnings: 68900,
    maxPremium: 1123.07,
  },

  federal: {
    brackets: [
      { min: 0, max: 58523, rate: 0.14, k: 0 },
      { min: 58523, max: 117045, rate: 0.205, k: 3804 },
      { min: 117045, max: 181440, rate: 0.26, k: 10241 },
      { min: 181440, max: 258482, rate: 0.29, k: 15684 },
      { min: 258482, max: Infinity, rate: 0.33, k: 26023 },
    ],
    bpa: 16452,
    ceaMax: 1368,
    lowestRate: 0.14,
  },

  ontario: {
    brackets: [
      { min: 0, max: 53891, rate: 0.0505, kp: 0 },
      { min: 53891, max: 107785, rate: 0.0915, kp: 2210 },
      { min: 107785, max: 150000, rate: 0.1116, kp: 4376 },
      { min: 150000, max: 220000, rate: 0.1216, kp: 5876 },
      { min: 220000, max: Infinity, rate: 0.1316, kp: 8076 },
    ],
    bpa: 12989,
    lowestRate: 0.0505,
    surtax: {
      threshold1: 5818,
      rate1: 0.20,
      threshold2: 7446,
      rate2: 0.36,
    },
    ohp: [
      { min: 0, max: 20000, base: 0, rate: 0 },
      { min: 20000, max: 25000, base: 0, rate: 0.06 },
      { min: 25000, max: 36000, base: 300, rate: 0.06 },
      { min: 36000, max: 48000, base: 450, rate: 0.25 },
      { min: 48000, max: 48000, base: 600, rate: 0.25 },
      { min: 48000, max: 72000, base: 750, rate: 0.25 },
      { min: 72000, max: 200000, base: 900, rate: 0.25 },
      { min: 200000, max: Infinity, base: 900, rate: 0 },
    ],
  },
};

// Navigation tree structure
const NAV_TREE = {
  sections: [
    {
      id: "dashboard",
      label: "Dashboard",
      icon: Home,
      page: null,
      roles: ["admin", "manager"],
    },
    {
      id: "scheduling",
      label: "Scheduling",
      icon: Calendar,
      roles: ["admin", "manager"],
      children: [
        { id: "calendar", label: "Calendar View", page: "calendar-view" },
        { id: "shift-builder", label: "Shift Builder", page: "shift-builder" },
        { id: "role-requirements", label: "Role Requirements", page: "role-requirements" },
        { id: "availability", label: "Availability", page: "availability" },
      ],
    },
    {
      id: "employees",
      label: "Employees",
      icon: Users,
      roles: ["admin", "manager"],
      children: [
        { id: "directory", label: "Directory", page: "directory" },
        { id: "skills-tags", label: "Skills & Tags", page: "skills-tags" },
        { id: "payroll", label: "Payroll & T4", page: "payroll" },
      ],
    },
    {
      id: "inventory",
      label: "Inventory",
      icon: Package,
      roles: ["admin"],
      children: [
        { id: "products", label: "Products", page: "products" },
        { id: "stock", label: "Stock & Distribution", page: "stock" },
        { id: "inv-analytics", label: "Analytics", page: "inv-analytics" },
      ],
    },
    {
      id: "reports",
      label: "Reports",
      icon: BarChart3,
      page: "reports",
      roles: ["admin", "manager"],
    },
    {
      id: "notifications",
      label: "Notifications",
      icon: Bell,
      page: "notifications",
      roles: ["admin", "manager"],
    },
    {
      id: "settings",
      label: "Settings",
      icon: Settings,
      page: "settings",
      roles: ["admin"],
    },
  ],
};

// ============================================================================
// UTILITY FUNCTIONS
// ============================================================================

// ── SIN Encryption (AES-256-GCM via Web Crypto API) ──
const SINEncryption = {
  deriveKey: async (passphrase, salt) => {
    const enc = new TextEncoder();
    const keyMaterial = await crypto.subtle.importKey("raw", enc.encode(passphrase), "PBKDF2", false, ["deriveKey"]);
    return crypto.subtle.deriveKey(
      { name: "PBKDF2", salt: enc.encode(salt), iterations: 100000, hash: "SHA-256" },
      keyMaterial,
      { name: "AES-GCM", length: 256 },
      false,
      ["encrypt", "decrypt"]
    );
  },

  encrypt: async (plainSIN, passphrase, userId) => {
    try {
      const key = await SINEncryption.deriveKey(passphrase, userId);
      const iv = crypto.getRandomValues(new Uint8Array(12));
      const enc = new TextEncoder();
      const ciphertext = await crypto.subtle.encrypt({ name: "AES-GCM", iv }, key, enc.encode(plainSIN));
      const combined = new Uint8Array(iv.length + new Uint8Array(ciphertext).length);
      combined.set(iv);
      combined.set(new Uint8Array(ciphertext), iv.length);
      return btoa(String.fromCharCode(...combined));
    } catch (e) { console.error("SIN encrypt error:", e); return null; }
  },

  decrypt: async (encryptedB64, passphrase, userId) => {
    try {
      const key = await SINEncryption.deriveKey(passphrase, userId);
      const combined = new Uint8Array(atob(encryptedB64).split("").map(c => c.charCodeAt(0)));
      const iv = combined.slice(0, 12);
      const ciphertext = combined.slice(12);
      const decrypted = await crypto.subtle.decrypt({ name: "AES-GCM", iv }, key, ciphertext);
      return new TextDecoder().decode(decrypted);
    } catch (e) { console.error("SIN decrypt error:", e); return null; }
  },

  mask: (sin) => sin ? `***-***-${sin.replace(/\D/g, "").slice(-3)}` : "***-***-***",
  validate: (sin) => /^\d{3}-?\d{3}-?\d{3}$/.test(sin.trim()),
  format: (sin) => { const d = sin.replace(/\D/g, ""); return d.length === 9 ? `${d.slice(0,3)}-${d.slice(3,6)}-${d.slice(6)}` : sin; },
};

// ── CRA 2026 Tax Engine (T4127 122nd Edition) ──
const CRATax = {
  calcCPP: (grossPay, ytdPensionableEarnings, ytdCPP, payPeriods = 26) => {
    const cfg = TAX_CONFIG_2026.cpp;
    const periodExemption = cfg.basicExemption / payPeriods;
    const pensionable = Math.min(grossPay, (cfg.ympe - ytdPensionableEarnings));
    if (pensionable <= 0) return 0;
    const contribution = Math.max(0, (pensionable - periodExemption) * cfg.rate);
    const remaining = cfg.maxContribution - ytdCPP;
    return Math.min(contribution, Math.max(0, remaining));
  },

  calcCPP2: (grossPay, ytdPensionableEarnings, ytdCPP2, payPeriods = 26) => {
    const cfg1 = TAX_CONFIG_2026.cpp;
    const cfg2 = TAX_CONFIG_2026.cpp2;
    if (ytdPensionableEarnings + grossPay <= cfg1.ympe) return 0;
    const earningsAboveYMPE = Math.max(0, Math.min(grossPay, ytdPensionableEarnings + grossPay - cfg1.ympe));
    const maxCPP2Earnings = cfg2.yampe - cfg1.ympe;
    const cpp2Pensionable = Math.min(earningsAboveYMPE, Math.max(0, maxCPP2Earnings - Math.max(0, ytdPensionableEarnings - cfg1.ympe)));
    if (cpp2Pensionable <= 0) return 0;
    const contribution = cpp2Pensionable * cfg2.rate;
    const remaining = cfg2.maxContribution - ytdCPP2;
    return Math.min(contribution, Math.max(0, remaining));
  },

  calcEI: (grossPay, ytdInsurableEarnings, ytdEI) => {
    const cfg = TAX_CONFIG_2026.ei;
    const insurable = Math.min(grossPay, Math.max(0, cfg.maxInsurableEarnings - ytdInsurableEarnings));
    if (insurable <= 0) return 0;
    const premium = insurable * cfg.rate;
    const remaining = cfg.maxPremium - ytdEI;
    return Math.min(premium, Math.max(0, remaining));
  },

  calcFederalTax: (annualizedIncome, td1Claim, payPeriods = 26) => {
    const cfg = TAX_CONFIG_2026.federal;
    if (annualizedIncome <= 0) return 0;
    let bracket = cfg.brackets[0];
    for (const b of cfg.brackets) {
      if (annualizedIncome > b.min) bracket = b;
    }
    let annualTax = annualizedIncome * bracket.rate - bracket.k;
    const bpaCredit = Math.min(td1Claim || cfg.bpa, cfg.bpa) * cfg.lowestRate;
    const ceaCredit = cfg.ceaMax * cfg.lowestRate;
    annualTax = annualTax - bpaCredit - ceaCredit;
    return Math.max(0, annualTax / payPeriods);
  },

  calcOntarioTax: (annualizedIncome, td1ProvClaim, payPeriods = 26) => {
    const cfg = TAX_CONFIG_2026.ontario;
    if (annualizedIncome <= 0) return 0;
    let bracket = cfg.brackets[0];
    for (const b of cfg.brackets) {
      if (annualizedIncome > b.min) bracket = b;
    }
    let basicProvTax = annualizedIncome * bracket.rate - bracket.kp;
    const bpaCredit = Math.min(td1ProvClaim || cfg.bpa, cfg.bpa) * cfg.lowestRate;
    basicProvTax = basicProvTax - bpaCredit;
    basicProvTax = Math.max(0, basicProvTax);
    let surtax = 0;
    if (basicProvTax > cfg.surtax.threshold1) {
      surtax += (basicProvTax - cfg.surtax.threshold1) * cfg.surtax.rate1;
    }
    if (basicProvTax > cfg.surtax.threshold2) {
      surtax += (basicProvTax - cfg.surtax.threshold2) * cfg.surtax.rate2;
    }
    const totalProvTax = basicProvTax + surtax;
    return Math.max(0, totalProvTax / payPeriods);
  },

  calcOHP: (annualIncome) => {
    if (annualIncome <= 20000) return 0;
    if (annualIncome <= 25000) return Math.min(300, (annualIncome - 20000) * 0.06);
    if (annualIncome <= 36000) return Math.min(450, 300 + (annualIncome - 25000) * 0.06);
    if (annualIncome <= 48000) return Math.min(600, 450 + (annualIncome - 36000) * 0.25);
    if (annualIncome <= 72000) return Math.min(750, 600 + (annualIncome - 48000) * 0.25);
    if (annualIncome <= 200000) return Math.min(900, 750 + (annualIncome - 72000) * 0.25);
    return 900;
  },

  calcPayPeriod: (grossPay, employee, ytd, payPeriods = 26) => {
    const annualized = grossPay * payPeriods;
    const cpp = CRATax.calcCPP(grossPay, ytd.pensionableEarnings || 0, ytd.cpp || 0, payPeriods);
    const cpp2 = CRATax.calcCPP2(grossPay, ytd.pensionableEarnings || 0, ytd.cpp2 || 0, payPeriods);
    const ei = CRATax.calcEI(grossPay, ytd.insurableEarnings || 0, ytd.ei || 0);
    const federalTax = CRATax.calcFederalTax(annualized, employee.td1_federal_claim, payPeriods);
    const provincialTax = CRATax.calcOntarioTax(annualized, employee.td1_provincial_claim, payPeriods);
    const totalDeductions = cpp + cpp2 + ei + federalTax + provincialTax;
    const netPay = Math.max(0, grossPay - totalDeductions);
    return { grossPay, cpp, cpp2, ei, federalTax, provincialTax, totalDeductions, netPay, annualized };
  },

  generateT4: (employee, allPayRecords) => {
    const totalGross = allPayRecords.reduce((s, r) => s + r.grossPay, 0);
    const totalCPP = allPayRecords.reduce((s, r) => s + r.cpp, 0);
    const totalCPP2 = allPayRecords.reduce((s, r) => s + r.cpp2, 0);
    const totalEI = allPayRecords.reduce((s, r) => s + r.ei, 0);
    const totalFedTax = allPayRecords.reduce((s, r) => s + r.federalTax, 0);
    const totalProvTax = allPayRecords.reduce((s, r) => s + r.provincialTax, 0);
    const totalTax = totalFedTax + totalProvTax;
    const pensionableEarnings = Math.min(totalGross, TAX_CONFIG_2026.cpp.ympe);
    const insurableEarnings = Math.min(totalGross, TAX_CONFIG_2026.ei.maxInsurableEarnings);
    return {
      employee,
      year: TAX_CONFIG_2026.year,
      box14_employmentIncome: totalGross,
      box16_cpp: totalCPP,
      box16A_cpp2: totalCPP2,
      box17_qpp: 0,
      box18_ei: totalEI,
      box22_incomeTaxDeducted: totalTax,
      box24_eiInsurableEarnings: insurableEarnings,
      box26_cppPensionableEarnings: pensionableEarnings,
      box44_unionDues: 0,
      box10_provinceOfEmployment: "ON",
      federalTax: totalFedTax,
      provincialTax: totalProvTax,
    };
  },

  // Convenience wrapper matching the class-style API used by the agent's pages
  calculateTotalDeductions: (income, province = "ON") => {
    const annualized = income;
    const cpp = Math.min(Math.max(0, (Math.min(income, TAX_CONFIG_2026.cpp.ympe) - TAX_CONFIG_2026.cpp.basicExemption)) * TAX_CONFIG_2026.cpp.rate, TAX_CONFIG_2026.cpp.maxContribution);
    const ei = Math.min(income, TAX_CONFIG_2026.ei.maxInsurableEarnings) * TAX_CONFIG_2026.ei.rate;
    const federal = CRATax.calcFederalTax(annualized, TAX_CONFIG_2026.federal.bpa, 1);
    const provincial = CRATax.calcOntarioTax(annualized, TAX_CONFIG_2026.ontario.bpa, 1);
    return { federal, provincial, cpp, ei, total: federal + provincial + cpp + ei, net: income - (federal + provincial + cpp + ei) };
  },
};

function formatDate(dateStr) {
  if (!dateStr) return "";
  const date = new Date(dateStr);
  return date.toLocaleDateString("en-US", {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}

function formatTime(timeStr) {
  if (!timeStr) return "";
  return new Date(`2000-01-01T${timeStr}`).toLocaleTimeString("en-US", {
    hour: "numeric",
    minute: "2-digit",
    hour12: true,
  });
}

function currency(value) {
  return `$${parseFloat(value || 0).toFixed(2)}`;
}

// ============================================================================
// SHARED COMPONENTS
// ============================================================================

const Badge = ({ children, color = "primary", variant = "solid" }) => {
  const colors = {
    primary: { bg: "#54CDF9", text: "#001F3F" },
    success: { bg: "#4CAF50", text: "#fff" },
    warning: { bg: "#FF9800", text: "#fff" },
    danger: { bg: "#F44336", text: "#fff" },
    info: { bg: "#2196F3", text: "#fff" },
    gray: { bg: "rgba(255,255,255,0.1)", text: "#E0E6FF" },
  };

  const c = colors[color] || colors.primary;
  const style =
    variant === "solid"
      ? { background: c.bg, color: c.text }
      : { border: `1px solid ${c.bg}`, color: c.bg };

  return (
    <span
      className="inline-block px-3 py-1 rounded-full text-xs font-medium"
      style={style}
    >
      {children}
    </span>
  );
};

const Modal = ({ isOpen, onClose, title, children, size = "md" }) => {
  if (!isOpen) return null;

  const sizes = {
    sm: "max-w-sm",
    md: "max-w-md",
    lg: "max-w-lg",
    xl: "max-w-xl",
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50"
      onClick={onClose}
    >
      <div
        className={`${sizes[size]} rounded-xl p-6 shadow-2xl`}
        style={{
          background: BRAND.glass,
          border: `1px solid ${BRAND.glassBorder}`,
          backdropFilter: BRAND.blur,
        }}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-xl font-bold" style={{ color: BRAND.text }}>
            {title}
          </h2>
          <button
            onClick={onClose}
            className="p-1 hover:bg-white/10 rounded-lg transition"
          >
            <X size={20} style={{ color: BRAND.text }} />
          </button>
        </div>
        <div>{children}</div>
      </div>
    </div>
  );
};

const Input = ({ label, value, onChange, type = "text", placeholder, error }) => {
  return (
    <div className="mb-4">
      {label && (
        <label className="block text-sm font-medium mb-2" style={{ color: BRAND.text }}>
          {label}
        </label>
      )}
      <input
        type={type}
        value={value}
        onChange={onChange}
        placeholder={placeholder}
        className="w-full px-4 py-2 rounded-lg text-white transition focus:outline-none focus:ring-2"
        style={{
          background: "rgba(255,255,255,0.05)",
          border: error
            ? `1px solid ${BRAND.danger}`
            : `1px solid ${BRAND.glassBorder}`,
          focusRing: BRAND.primary,
        }}
      />
      {error && (
        <p className="text-xs mt-1" style={{ color: BRAND.danger }}>
          {error}
        </p>
      )}
    </div>
  );
};

const Select = ({ label, value, onChange, options, placeholder }) => {
  return (
    <div className="mb-4">
      {label && (
        <label className="block text-sm font-medium mb-2" style={{ color: BRAND.text }}>
          {label}
        </label>
      )}
      <select
        value={value}
        onChange={onChange}
        className="w-full px-4 py-2 rounded-lg text-white transition focus:outline-none focus:ring-2"
        style={{
          background: "rgba(255,255,255,0.05)",
          border: `1px solid ${BRAND.glassBorder}`,
        }}
      >
        {placeholder && <option value="">{placeholder}</option>}
        {options.map((opt) => (
          <option key={opt.value} value={opt.value}>
            {opt.label}
          </option>
        ))}
      </select>
    </div>
  );
};

const Btn = ({
  children,
  onClick,
  variant = "primary",
  size = "md",
  icon: Icon,
  className = "",
  disabled = false,
  type = "button",
}) => {
  const variants = {
    primary: {
      bg: BRAND.primary,
      text: "#001F3F",
      hover: "#3BB8E8",
    },
    secondary: {
      bg: "rgba(255,255,255,0.1)",
      text: BRAND.text,
      hover: "rgba(255,255,255,0.15)",
    },
    danger: {
      bg: BRAND.danger,
      text: "#fff",
      hover: "#E53935",
    },
    success: {
      bg: BRAND.success,
      text: "#fff",
      hover: "#45A049",
    },
  };

  const v = variants[variant] || variants.primary;
  const sizes_map = {
    sm: "px-3 py-1 text-sm",
    md: "px-4 py-2 text-base",
    lg: "px-6 py-3 text-lg",
  };

  return (
    <button
      type={type}
      onClick={onClick}
      disabled={disabled}
      className={`inline-flex items-center gap-2 rounded-lg font-medium transition ${
        sizes_map[size]
      } ${className} ${disabled ? "opacity-50 cursor-not-allowed" : ""}`}
      style={{
        background: v.bg,
        color: v.text,
      }}
      onMouseEnter={(e) => !disabled && (e.target.style.background = v.hover)}
      onMouseLeave={(e) => (e.target.style.background = v.bg)}
    >
      {Icon && <Icon size={18} />}
      {children}
    </button>
  );
};

const EmptyState = ({ icon: Icon, title, message }) => {
  return (
    <div className="flex flex-col items-center justify-center py-12 text-center">
      {Icon && <Icon size={48} style={{ color: BRAND.primary }} className="mb-4 opacity-50" />}
      <h3 className="text-lg font-semibold mb-2" style={{ color: BRAND.text }}>
        {title}
      </h3>
      <p className="text-sm" style={{ color: "rgba(224,230,255,0.6)" }}>
        {message}
      </p>
    </div>
  );
};

const StatCard = ({ icon: Icon, label, value, trend, color = "primary" }) => {
  const colors = {
    primary: BRAND.primary,
    success: BRAND.success,
    warning: BRAND.warning,
    danger: BRAND.danger,
  };

  return (
    <div
      className="p-4 rounded-xl"
      style={{
        background: BRAND.glass,
        border: `1px solid ${BRAND.glassBorder}`,
        backdropFilter: BRAND.blur,
      }}
    >
      <div className="flex items-start justify-between">
        <div>
          <p className="text-sm font-medium mb-1" style={{ color: "rgba(224,230,255,0.7)" }}>
            {label}
          </p>
          <p className="text-2xl font-bold" style={{ color: colors[color] }}>
            {value}
          </p>
        </div>
        {Icon && (
          <Icon size={24} style={{ color: colors[color] }} className="opacity-50" />
        )}
      </div>
      {trend && (
        <p className="text-xs mt-2" style={{ color: trend.positive ? BRAND.success : BRAND.danger }}>
          {trend.positive ? "+" : ""}{trend.value}% vs last period
        </p>
      )}
    </div>
  );
};

const SectionCard = ({ title, children, icon: Icon }) => {
  return (
    <div
      className="rounded-xl overflow-hidden"
      style={{
        background: BRAND.glass,
        border: `1px solid ${BRAND.glassBorder}`,
        backdropFilter: BRAND.blur,
      }}
    >
      <div className="p-4 border-b" style={{ borderColor: BRAND.glassBorder }}>
        <div className="flex items-center gap-2">
          {Icon && <Icon size={20} style={{ color: BRAND.primary }} />}
          <h2 className="text-lg font-semibold" style={{ color: BRAND.text }}>
            {title}
          </h2>
        </div>
      </div>
      <div className="p-4">{children}</div>
    </div>
  );
};

// ============================================================================
// LOGIN PAGE
// ============================================================================

const LoginPage = ({ onLoginSuccess }) => {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const handleLogin = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError("");

    try {
      const { data, error: signInError } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (signInError) throw signInError;

      onLoginSuccess(data.user);
    } catch (err) {
      setError(err.message || "Login failed");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div
      className="min-h-screen flex items-center justify-center p-4"
      style={{ background: BRAND.gradient }}
    >
      <div
        className="w-full max-w-md p-8 rounded-2xl"
        style={{
          background: BRAND.glass,
          border: `1px solid ${BRAND.glassBorder}`,
          backdropFilter: BRAND.blur,
        }}
      >
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold mb-2" style={{ color: BRAND.primary }}>
            Collide
          </h1>
          <p className="text-sm" style={{ color: "rgba(224,230,255,0.7)" }}>
            Staff Manager v5.0
          </p>
        </div>

        <form onSubmit={handleLogin} className="space-y-4">
          <Input
            label="Email"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="you@example.com"
            error={error ? "Invalid credentials" : ""}
          />
          <Input
            label="Password"
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="••••••••"
          />

          {error && (
            <div className="p-3 rounded-lg text-sm" style={{ background: "rgba(244,67,54,0.2)", color: BRAND.danger }}>
              {error}
            </div>
          )}

          <Btn
            type="submit"
            onClick={handleLogin}
            disabled={loading}
            className="w-full"
          >
            {loading ? "Logging in..." : "Login"}
          </Btn>
        </form>

        <p className="text-center text-xs mt-4" style={{ color: "rgba(224,230,255,0.5)" }}>
          Demo: admin@collide.ca / password
        </p>
      </div>
    </div>
  );
};

// ============================================================================
// COMMAND PALETTE
// ============================================================================

const CommandPalette = ({ isOpen, onClose, pages, currentPage, onNavigate }) => {
  const [search, setSearch] = useState("");
  const inputRef = useRef(null);

  useEffect(() => {
    if (isOpen) {
      setTimeout(() => inputRef.current?.focus(), 0);
    }
  }, [isOpen]);

  const allSearchablePages = useMemo(() => {
    const results = [];

    NAV_TREE.sections.forEach((section) => {
      if (section.page) {
        results.push({
          id: section.id,
          label: section.label,
          section: section.id,
          page: section.page,
        });
      }
      if (section.children) {
        section.children.forEach((child) => {
          results.push({
            id: child.id,
            label: `${section.label} > ${child.label}`,
            section: section.id,
            page: child.page,
          });
        });
      }
    });

    return results;
  }, []);

  const filtered = search
    ? allSearchablePages.filter(
        (p) =>
          p.label.toLowerCase().includes(search.toLowerCase()) ||
          p.id.toLowerCase().includes(search.toLowerCase())
      )
    : allSearchablePages;

  const handleSelect = (item) => {
    onNavigate({ section: item.section, page: item.page });
    setSearch("");
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-40 flex items-start justify-center pt-12 p-4"
      onClick={onClose}
    >
      <div
        className="w-full max-w-2xl rounded-xl shadow-2xl overflow-hidden"
        style={{
          background: BRAND.glass,
          border: `1px solid ${BRAND.glassBorder}`,
          backdropFilter: BRAND.blur,
        }}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center gap-3 px-4 py-3" style={{ borderBottom: `1px solid ${BRAND.glassBorder}` }}>
          <Search size={18} style={{ color: BRAND.primary }} />
          <input
            ref={inputRef}
            type="text"
            placeholder="Search pages..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="flex-1 bg-transparent outline-none text-white"
            onKeyDown={(e) => {
              if (e.key === "Escape") onClose();
            }}
          />
        </div>

        <div className="max-h-80 overflow-y-auto">
          {filtered.length === 0 ? (
            <EmptyState title="No results" message="Try searching for a different page" />
          ) : (
            filtered.map((item, idx) => (
              <button
                key={item.id}
                onClick={() => handleSelect(item)}
                className="w-full text-left px-4 py-3 hover:bg-white/10 transition"
                style={{ borderBottom: `1px solid ${BRAND.glassBorder}` }}
              >
                <p className="text-sm font-medium" style={{ color: BRAND.text }}>
                  {item.label}
                </p>
              </button>
            ))
          )}
        </div>
      </div>
    </div>
  );
};

// ============================================================================
// PAGES: DASHBOARD
// ============================================================================

const DashboardPage = ({ employees = [], events = [], locations = [], shifts = [], availability = {}, products = [], stock = {}, historicSales = [] }) => {
  const upcomingEvents = (events || [])
    .filter((e) => new Date(e.start_date) >= new Date())
    .slice(0, 5);

  const totalStaff = (employees || []).length;
  const staffTomorrow = (events || []).filter(
    (e) =>
      new Date(e.start_date).toDateString() ===
      new Date(new Date().getTime() + 86400000).toDateString()
  ).length;

  // Payroll summary — pay_records not yet loaded in this phase, show placeholder
  const payrollThisMonth = 0;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold mb-2" style={{ color: BRAND.text }}>
          Dashboard
        </h1>
        <p style={{ color: "rgba(224,230,255,0.7)" }}>
          Welcome back! Here's your team overview.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <StatCard
          icon={Users}
          label="Total Staff"
          value={totalStaff}
          color="primary"
        />
        <StatCard
          icon={Calendar}
          label="Shifts Tomorrow"
          value={staffTomorrow}
          color="info"
        />
        <StatCard
          icon={DollarSign}
          label="Payroll This Month"
          value={currency(payrollThisMonth)}
          color="success"
        />
        <StatCard
          icon={TrendingUp}
          label="Avg Shift Duration"
          value="6.5h"
          trend={{ positive: true, value: 5 }}
          color="warning"
        />
      </div>

      <SectionCard title="Upcoming Events" icon={Calendar}>
        {upcomingEvents.length === 0 ? (
          <EmptyState title="No events" message="All upcoming shifts are scheduled" />
        ) : (
          <div className="space-y-2">
            {upcomingEvents.map((event) => (
              <div
                key={event.id}
                className="p-3 rounded-lg"
                style={{ background: "rgba(255,255,255,0.05)" }}
              >
                <div className="flex justify-between items-start">
                  <div>
                    <p className="font-medium" style={{ color: BRAND.text }}>
                      {event.name}
                    </p>
                    <p className="text-sm" style={{ color: "rgba(224,230,255,0.6)" }}>
                      {formatDate(event.start_date)} at {formatTime(event.start_time)}
                    </p>
                  </div>
                  <Badge color="success">{event.staff_assigned || 0} staff</Badge>
                </div>
              </div>
            ))}
          </div>
        )}
      </SectionCard>
    </div>
  );
};

// ============================================================================
// PAGES: CALENDAR VIEW
// ============================================================================

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
    return events.filter((e) => e.start_date === date.toISOString().split("T")[0]);
  };

  const handlePrevMonth = () => {
    setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() - 1));
  };

  const handleNextMonth = () => {
    setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() + 1));
  };

  const monthName = currentDate.toLocaleString("en-US", { month: "long", year: "numeric" });

  if (viewMode === "day") {
    const dayEvents = getEventsForDate(selectedDay);
    const hours = Array.from({ length: 18 }, (_, i) => 6 + i); // 6AM to 11PM

    return (
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <button
            onClick={() => setViewMode("month")}
            className="inline-flex items-center gap-2 px-3 py-2 rounded-lg hover:bg-white/10 transition"
          >
            <ChevronLeft size={18} style={{ color: BRAND.primary }} />
            <span style={{ color: BRAND.text }}>Back to Month</span>
          </button>
          <h1 className="text-2xl font-bold" style={{ color: BRAND.text }}>
            {selectedDay.toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric" })}
          </h1>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          <div className="lg:col-span-2">
            <SectionCard title="Schedule" icon={Calendar}>
              <div className="space-y-2">
                {hours.map((hour) => {
                  const hourEvents = dayEvents.filter((e) => {
                    const startHour = parseInt(e.start_time.split(":")[0]);
                    return startHour === hour;
                  });

                  return (
                    <div key={hour} className="flex items-center gap-4">
                      <div className="w-16 text-sm font-medium" style={{ color: "rgba(224,230,255,0.7)" }}>
                        {String(hour).padStart(2, "0")}:00
                      </div>
                      <div className="flex-1 space-y-2">
                        {hourEvents.map((event) => (
                          <div
                            key={event.id}
                            className="p-3 rounded-lg cursor-pointer transition hover:bg-white/10"
                            style={{ background: "rgba(84,205,249,0.2)", borderLeft: `4px solid ${BRAND.primary}` }}
                            onClick={() => {
                              setSelectedEvent(event);
                              setSelectedSlot(event);
                            }}
                          >
                            <p className="font-medium text-sm" style={{ color: BRAND.text }}>
                              {event.name}
                            </p>
                            <p className="text-xs" style={{ color: "rgba(224,230,255,0.6)" }}>
                              {formatTime(event.start_time)} - {formatTime(event.end_time)} • {event.staff_assigned || 0} staff
                            </p>
                          </div>
                        ))}
                        {hourEvents.length === 0 && (
                          <button
                            onClick={() => {
                              setSelectedSlot({ hour, date: selectedDay });
                              setAssignmentModalOpen(true);
                            }}
                            className="px-3 py-2 text-sm rounded-lg text-white/50 hover:bg-white/5 transition border border-white/10"
                          >
                            + Add event
                          </button>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </SectionCard>
          </div>

          <div>
            <SectionCard title="Available Staff" icon={Users}>
              {employees.length === 0 ? (
                <EmptyState title="No staff" message="Add employees first" />
              ) : (
                <div className="space-y-2">
                  {employees.slice(0, 8).map((emp) => (
                    <div
                      key={emp.id}
                      className="p-2 rounded-lg text-sm cursor-pointer hover:bg-white/10 transition"
                      style={{ background: "rgba(255,255,255,0.05)" }}
                    >
                      <p style={{ color: BRAND.text }}>{emp.first_name} {emp.last_name}</p>
                      <div className="flex flex-wrap gap-1 mt-1">
                        {(employeeSkills.filter(es => es.employee_id === emp.id) || []).slice(0, 2).map((es) => (
                          <Badge key={es.id} color="info" variant="outline">
                            {es.skills?.name || "Unknown"}
                          </Badge>
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

// ============================================================================
// PAGES: SHIFT BUILDER
// ============================================================================

const ShiftBuilderPage = ({ events = [], employees = [], shifts = [], locations = [], roleRequirements = [] }) => {
  const [selectedEvent, setSelectedEvent] = useState(events[0]?.id || "");
  const [shifts, setShifts] = useState([]);
  const [showAddForm, setShowAddForm] = useState(false);
  const [newShift, setNewShift] = useState({
    employee_id: "",
    start_time: "09:00",
    end_time: "17:00",
    role: "",
  });

  const currentEvent = events.find((e) => e.id === selectedEvent);
  const eventRoles = roleRequirements.filter((r) => r.event_id === selectedEvent);

  const handleAddShift = () => {
    if (newShift.employee_id && newShift.start_time && newShift.end_time) {
      setShifts([
        ...shifts,
        {
          id: Date.now(),
          event_id: selectedEvent,
          ...newShift,
        },
      ]);
      setNewShift({
        employee_id: "",
        start_time: "09:00",
        end_time: "17:00",
        role: "",
      });
      setShowAddForm(false);
    }
  };

  const handleRemoveShift = (id) => {
    setShifts(shifts.filter((s) => s.id !== id));
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
              setShifts([]);
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
                    Need {role.quantity_needed} staff
                  </p>
                </div>
              ))}
            </div>
          )}
        </SectionCard>
      </div>

      <SectionCard title="Assigned Shifts" icon={Clock}>
        {shifts.length === 0 ? (
          <EmptyState title="No shifts assigned" message="Add shifts using the form below" />
        ) : (
          <div className="space-y-2">
            {shifts.map((shift) => {
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

// ============================================================================
// PAGES: ROLE REQUIREMENTS
// ============================================================================

const RoleRequirementsPage = ({ events = [], shifts = [], locations = [], employees = [], roleRequirements = [] }) => {
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

  const handleAddRole = () => {
    if (newRole.role_name && newRole.quantity_needed > 0) {
      setRoles([
        ...roles,
        {
          id: Date.now(),
          event_id: selectedEvent,
          ...newRole,
        },
      ]);
      setNewRole({
        role_name: "Sales Lead",
        quantity_needed: 1,
      });
      setShowAddRole(false);
    }
  };

  const handleRemoveRole = (id) => {
    setRoles(roles.filter((r) => r.id !== id));
  };

  const totalNeeded = roles.reduce((sum, r) => sum + r.quantity_needed, 0);

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
          color="info"
        />
        <StatCard
          icon={AlertCircle}
          label="Unfilled"
          value={Math.max(0, totalNeeded - 3)} // Placeholder
          color="warning"
        />
      </div>

      <SectionCard title="Role Breakdown" icon={Briefcase}>
        {roles.length === 0 ? (
          <EmptyState title="No roles defined" message="Add roles for this event using the form below" />
        ) : (
          <div className="space-y-3">
            {roles.map((role) => {
              const filled = Math.floor(role.quantity_needed * 0.7); // Placeholder
              const fillPercentage = (filled / role.quantity_needed) * 100;
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
                        {filled}/{role.quantity_needed} filled
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

// ============================================================================
// PAGES: DIRECTORY
// ============================================================================

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

// ============================================================================
// PAGES: SKILLS & TAGS
// ============================================================================

const SkillsTagsPage = ({ employees = [], skills = [], employeeSkills = [] }) => {
  const [showAddModal, setShowAddModal] = useState(false);
  const [selectedEmployee, setSelectedEmployee] = useState("");
  const [selectedSkill, setSelectedSkill] = useState("");
  const [proficiency, setProficiency] = useState("intermediate");

  const handleAddSkill = () => {
    if (selectedEmployee && selectedSkill) {
      // This would normally be saved to Supabase
      setSelectedEmployee("");
      setSelectedSkill("");
      setProficiency("intermediate");
      setShowAddModal(false);
    }
  };

  const getEmployeeSkills = (empId) => {
    return (employeeSkills || []).filter((es) => es.employee_id === empId);
  };

  const removeSkill = (employeeId, skillId) => {
    // This would normally delete from Supabase
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
                        <Badge color="info" variant="outline">
                          {es.proficiency_level || "Intermediate"}
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

// ============================================================================
// PAGES: AVAILABILITY
// ============================================================================

const AvailabilityPage = ({ employees = [] }) => {
  const [selectedEmployee, setSelectedEmployee] = useState(employees[0]?.id || "");
  const [availability, setAvailability] = useState({
    monday: true,
    tuesday: true,
    wednesday: true,
    thursday: true,
    friday: true,
    saturday: false,
    sunday: false,
  });

  const days = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"];
  const dayKeys = ["monday", "tuesday", "wednesday", "thursday", "friday", "saturday", "sunday"];

  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-bold" style={{ color: BRAND.text }}>
        Availability
      </h1>

      <SectionCard title="Select Employee" icon={Users}>
        <Select
          value={selectedEmployee}
          onChange={(e) => setSelectedEmployee(e.target.value)}
          options={employees.map((e) => ({
            value: e.id,
            label: `${e.first_name} ${e.last_name}`,
          }))}
        />
      </SectionCard>

      <SectionCard title="Weekly Schedule" icon={Calendar}>
        <div className="space-y-3">
          {days.map((day, idx) => (
            <div
              key={day}
              className="flex items-center justify-between p-3 rounded-lg"
              style={{ background: "rgba(255,255,255,0.05)" }}
            >
              <label className="text-sm font-medium" style={{ color: BRAND.text }}>
                {day}
              </label>
              <input
                type="checkbox"
                checked={availability[dayKeys[idx]]}
                onChange={(e) =>
                  setAvailability({
                    ...availability,
                    [dayKeys[idx]]: e.target.checked,
                  })
                }
                className="w-5 h-5 rounded cursor-pointer"
              />
            </div>
          ))}
        </div>

        <Btn variant="primary" className="w-full mt-4">
          Save Availability
        </Btn>
      </SectionCard>
    </div>
  );
};

// ============================================================================
// PAGES: PAYROLL
// ============================================================================

const PayrollPage = ({ employees = [], events = [], locations = [], shifts = [] }) => {
  const [selectedEmployee, setSelectedEmployee] = useState(employees[0]?.id || "");
  const [selectedPeriod, setSelectedPeriod] = useState(
    new Date().toISOString().split("T")[0]
  );

  const employeePayroll = []; // pay_records integration pending — Phase 2
  const periodPayroll = employeePayroll.filter(
    (p) => p.date.substring(0, 7) === selectedPeriod.substring(0, 7)
  );

  const selectedEmp = employees.find((e) => e.id === selectedEmployee);

  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-bold" style={{ color: BRAND.text }}>
        Payroll & T4
      </h1>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
        <Select
          label="Employee"
          value={selectedEmployee}
          onChange={(e) => setSelectedEmployee(e.target.value)}
          options={employees.map((e) => ({
            value: e.id,
            label: `${e.first_name} ${e.last_name}`,
          }))}
        />

        <Input
          label="Period"
          type="month"
          value={selectedPeriod}
          onChange={(e) => setSelectedPeriod(e.target.value)}
        />
      </div>

      {selectedEmp && (
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <StatCard
            icon={DollarSign}
            label="Gross Income"
            value={currency(periodPayroll.reduce((sum, p) => sum + parseFloat(p.amount || 0), 0))}
            color="primary"
          />
          <StatCard
            icon={Briefcase}
            label="Hours"
            value={`${(periodPayroll.reduce((sum, p) => sum + parseFloat(p.hours || 0), 0)).toFixed(1)}h`}
            color="info"
          />
          <StatCard
            icon={DollarSign}
            label="Deductions"
            value={currency(
              CRATax.calculateTotalDeductions(
                periodPayroll.reduce((sum, p) => sum + parseFloat(p.amount || 0), 0),
                "ON"
              ).total
            )}
            color="warning"
          />
          <StatCard
            icon={TrendingUp}
            label="Net Pay"
            value={currency(
              periodPayroll.reduce((sum, p) => sum + parseFloat(p.amount || 0), 0) -
                CRATax.calculateTotalDeductions(
                  periodPayroll.reduce((sum, p) => sum + parseFloat(p.amount || 0), 0),
                  "ON"
                ).total
            )}
            color="success"
          />
        </div>
      )}

      <SectionCard title="Pay Stubs" icon={FileText}>
        {periodPayroll.length === 0 ? (
          <EmptyState
            title="No pay stubs"
            message="No payroll records for this period"
          />
        ) : (
          <div className="space-y-2">
            {periodPayroll.map((p) => (
              <div
                key={p.id}
                className="flex items-center justify-between p-3 rounded-lg"
                style={{ background: "rgba(255,255,255,0.05)" }}
              >
                <div>
                  <p className="text-sm font-medium" style={{ color: BRAND.text }}>
                    {formatDate(p.date)}
                  </p>
                  <p className="text-xs" style={{ color: "rgba(224,230,255,0.6)" }}>
                    {p.hours} hours
                  </p>
                </div>
                <div className="text-right">
                  <p className="text-sm font-medium" style={{ color: BRAND.primary }}>
                    {currency(p.amount)}
                  </p>
                  <Btn icon={FileText} size="sm" variant="secondary">
                    View
                  </Btn>
                </div>
              </div>
            ))}
          </div>
        )}
      </SectionCard>
    </div>
  );
};

// ============================================================================
// PAGES: REPORTS
// ============================================================================

const ReportsPage = ({ employees = [], events = [], shifts = [], historicSales = [], products = [] }) => {
  const staffTrendData = [
    { month: "Jan", staff: 12, shifts: 45 },
    { month: "Feb", staff: 14, shifts: 52 },
    { month: "Mar", staff: 16, shifts: 58 },
    { month: "Apr", staff: 15, shifts: 61 },
    { month: "May", staff: 18, shifts: 72 },
    { month: "Jun", staff: 20, shifts: 85 },
  ];

  const payrollData = [
    { name: "Salaries", value: 45000, color: BRAND.primary },
    { name: "Wages", value: 32000, color: BRAND.success },
    { name: "Benefits", value: 8000, color: BRAND.warning },
    { name: "Taxes", value: 12000, color: BRAND.danger },
  ];

  const COLORS_ARRAY = [BRAND.primary, BRAND.success, BRAND.warning, BRAND.danger];

  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-bold" style={{ color: BRAND.text }}>
        Reports & Analytics
      </h1>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <StatCard icon={Users} label="Total Staff" value={employees.length} color="primary" />
        <StatCard icon={Calendar} label="Total Shifts" value={events.length} color="info" />
        <StatCard
          icon={DollarSign}
          label="YTD Payroll"
          value={currency(0)} // pay_records integration pending
          color="success"
        />
        <StatCard
          icon={TrendingUp}
          label="Avg Wage/Hour"
          value={currency(28.5)}
          color="warning"
        />
      </div>

      <SectionCard title="Staff & Shift Trend" icon={TrendingUp}>
        <ResponsiveContainer width="100%" height={300}>
          <LineChart data={staffTrendData}>
            <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.1)" />
            <XAxis dataKey="month" stroke={BRAND.text} />
            <YAxis stroke={BRAND.text} />
            <Tooltip contentStyle={{ background: BRAND.glass, border: `1px solid ${BRAND.glassBorder}` }} />
            <Legend />
            <Line
              type="monotone"
              dataKey="staff"
              stroke={BRAND.primary}
              strokeWidth={2}
              dot={{ fill: BRAND.primary }}
            />
            <Line
              type="monotone"
              dataKey="shifts"
              stroke={BRAND.success}
              strokeWidth={2}
              dot={{ fill: BRAND.success }}
            />
          </LineChart>
        </ResponsiveContainer>
      </SectionCard>

      <SectionCard title="Payroll Breakdown" icon={DollarSign}>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          <ResponsiveContainer width="100%" height={250}>
            <PieChart>
              <Pie
                data={payrollData}
                cx="50%"
                cy="50%"
                labelLine={false}
                label={(entry) => entry.name}
                outerRadius={80}
                fill={BRAND.primary}
                dataKey="value"
              >
                {payrollData.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={COLORS_ARRAY[index]} />
                ))}
              </Pie>
              <Tooltip />
            </PieChart>
          </ResponsiveContainer>

          <div className="flex flex-col justify-center space-y-2">
            {payrollData.map((item) => (
              <div key={item.name} className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div
                    className="w-3 h-3 rounded-full"
                    style={{ background: item.color }}
                  ></div>
                  <span style={{ color: BRAND.text }}>{item.name}</span>
                </div>
                <span style={{ color: BRAND.primary }}>{currency(item.value)}</span>
              </div>
            ))}
          </div>
        </div>
      </SectionCard>
    </div>
  );
};

// ============================================================================
// PAGES: INVENTORY
// ============================================================================

const InventoryProductsPage = ({ products = [], stock = {} }) => {
  const totalStockUnits = Object.values(stock).reduce((a, b) => a + b, 0);
  const totalStockValue = products.reduce((sum, p) => sum + (stock[p.id] || 0) * (p.cost || 0), 0);
  return (
    <div>
      <h1 className="text-2xl font-bold" style={{ color: BRAND.text }}>Products</h1>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(150px, 1fr))", gap: 16, marginTop: 20 }}>
        <StatCard title="Total Products" value={products.length} icon={Package} color={BRAND.primary} />
        <StatCard title="Stock Units" value={totalStockUnits} icon={Package} color={BRAND.success} />
        <StatCard title="Stock Value" value={currency(totalStockValue)} icon={DollarSign} color={BRAND.warning} />
      </div>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(280px, 1fr))", gap: 16, marginTop: 20 }}>
        {products.map(p => {
          const margin = p.retail > 0 ? (((p.retail - p.cost) / p.retail) * 100).toFixed(0) : 0;
          return (
            <Card key={p.id} title={p.name} icon={Package}>
              <div style={{ fontSize: 13, color: "rgba(224,230,255,0.7)" }}>
                <p>SKU: {p.sku}</p>
                <p style={{ marginTop: 4 }}>Cost: {currency(p.cost)} | Retail: {currency(p.retail)}</p>
                <p style={{ color: BRAND.primary, marginTop: 4 }}>Margin: {margin}% | Stock: {stock[p.id] || 0}</p>
              </div>
            </Card>
          );
        })}
        {products.length === 0 && <EmptyState icon={Package} title="No products" description="Add products to get started" />}
      </div>
    </div>
  );
};

const InventoryStockPage = ({ products = [], stock = {}, distributions = [] }) => (
  <div>
    <h1 className="text-2xl font-bold" style={{ color: BRAND.text }}>Stock & Distribution</h1>
    <Card title="Stock Levels" icon={Package} style={{ marginTop: 20 }}>
      <div style={{ overflowX: "auto" }}>
        <table style={{ width: "100%", fontSize: 13, borderCollapse: "collapse" }}>
          <thead>
            <tr style={{ borderBottom: `1px solid ${BRAND.glassBorder}` }}>
              <th style={{ padding: 8, textAlign: "left", color: BRAND.primary }}>Product</th>
              <th style={{ padding: 8, textAlign: "center", color: BRAND.primary }}>On Hand</th>
              <th style={{ padding: 8, textAlign: "center", color: BRAND.primary }}>Distributed</th>
              <th style={{ padding: 8, textAlign: "center", color: BRAND.primary }}>Returned</th>
            </tr>
          </thead>
          <tbody>
            {products.map(p => {
              const onHand = stock[p.id] || 0;
              const distrib = distributions.filter(d => d.product_id === p.id).reduce((sum, d) => sum + (d.qty_sent || 0), 0);
              const returned = distributions.filter(d => d.product_id === p.id).reduce((sum, d) => sum + (d.qty_returned || 0), 0);
              return (
                <tr key={p.id} style={{ borderBottom: `1px solid ${BRAND.glassBorder}` }}>
                  <td style={{ padding: 8, color: BRAND.text }}>{p.name}</td>
                  <td style={{ padding: 8, textAlign: "center", color: BRAND.primary }}>{onHand}</td>
                  <td style={{ padding: 8, textAlign: "center", color: "rgba(224,230,255,0.7)" }}>{distrib}</td>
                  <td style={{ padding: 8, textAlign: "center", color: "rgba(224,230,255,0.7)" }}>{returned}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </Card>
  </div>
);

const InventoryAnalyticsPage = ({ historicSales = [], products = [] }) => {
  const totalRevenue = historicSales.reduce((sum, s) => sum + (s.revenue || 0), 0);
  const totalSold = historicSales.reduce((sum, s) => sum + (s.sold || 0), 0);
  return (
    <div>
      <h1 className="text-2xl font-bold" style={{ color: BRAND.text }}>Inventory Analytics</h1>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: 16, marginTop: 20 }}>
        <StatCard title="Historic Revenue" value={currency(totalRevenue)} icon={DollarSign} color={BRAND.primary} />
        <StatCard title="Units Sold" value={totalSold} icon={Package} color={BRAND.success} />
      </div>
    </div>
  );
};

// PAGES: NOTIFICATIONS
// ============================================================================

const NotificationsPage = ({ notifications = [] }) => {
  const displayNotifs = notifications.length > 0 ? notifications : [
    {
      id: 1,
      type: "shift",
      title: "New Shift Available",
      message: "Friday 6PM - 10PM retail shift",
      time: "2 hours ago",
      read: false,
    },
    {
      id: 2,
      type: "payroll",
      title: "Paycheck Processed",
      message: "Your paycheck has been processed",
      time: "1 day ago",
      read: false,
    },
    {
      id: 3,
      type: "schedule",
      title: "Schedule Updated",
      message: "Your availability affects 2 shifts",
      time: "3 days ago",
      read: true,
    },
  ];

  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-bold" style={{ color: BRAND.text }}>
        Notifications
      </h1>

      <div className="space-y-2">
        {displayNotifs.map((notif) => (
          <div
            key={notif.id}
            className="p-4 rounded-lg cursor-pointer transition hover:bg-white/10"
            style={{
              background: notif.read ? "rgba(255,255,255,0.02)" : "rgba(84,205,249,0.1)",
              border: `1px solid ${notif.read ? BRAND.glassBorder : BRAND.primary}`,
            }}
          >
            <div className="flex items-start justify-between">
              <div>
                <p className="font-medium" style={{ color: BRAND.text }}>
                  {notif.title}
                </p>
                <p className="text-sm mt-1" style={{ color: "rgba(224,230,255,0.6)" }}>
                  {notif.message}
                </p>
              </div>
              {!notif.read && (
                <div
                  className="w-2 h-2 rounded-full"
                  style={{ background: BRAND.primary }}
                ></div>
              )}
            </div>
            <p className="text-xs mt-2" style={{ color: "rgba(224,230,255,0.4)" }}>
              {notif.time}
            </p>
          </div>
        ))}
      </div>
    </div>
  );
};

// ============================================================================
// PAGES: SETTINGS
// ============================================================================

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

// ============================================================================
// MAIN APP COMPONENT
// ============================================================================

export default function App() {
  // Authentication & Data
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  // Navigation State
  const [currentNav, setCurrentNav] = useState({ section: "dashboard", page: null });
  const [expandedSections, setExpandedSections] = useState(new Set());

  // Data State
  const [employees, setEmployees] = useState([]);
  const [events, setEvents] = useState([]);
  const [locations, setLocations] = useState([]);
  const [shifts, setShifts] = useState([]);
  const [availability, setAvailability] = useState({});
  const [products, setProducts] = useState([]);
  const [stock, setStock] = useState({});
  const [distributions, setDistributions] = useState([]);
  const [historicSales, setHistoricSales] = useState([]);
  const [templates, setTemplates] = useState([]);
  const [notifications, setNotifications] = useState([]);
  const [skills, setSkills] = useState([]);
  const [employeeSkills, setEmployeeSkills] = useState([]);
  const [roleRequirements, setRoleRequirements] = useState([]);

  // UI State
  const [commandPaletteOpen, setCommandPaletteOpen] = useState(false);
  const unsubscribeRef = useRef(new Set());

  // Check auth on mount
  useEffect(() => {
    const checkAuth = async () => {
      try {
        const {
          data: { session },
        } = await supabase.auth.getSession();
        if (session?.user) {
          setUser(session.user);
          await loadData();
        }
      } catch (error) {
        console.error("Auth check failed:", error);
      } finally {
        setLoading(false);
      }
    };

    checkAuth();

    // Listen for auth changes
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(async (event, session) => {
      if (session?.user) {
        setUser(session.user);
        if (event === "SIGNED_IN") {
          await loadData();
        }
      } else {
        setUser(null);
      }
    });

    return () => {
      subscription?.unsubscribe();
    };
  }, []);

  // Load data from Supabase
  const loadData = async () => {
    try {
      const [empRes, evtRes, locRes, shiftRes, availRes, prodRes, stockRes, distRes, histRes, templRes, notRes, skillsRes, empSkillsRes, roleReqRes] = await Promise.all([
        supabase.from("employees").select("*"),
        supabase.from("events").select("*"),
        supabase.from("event_locations").select("*"),
        supabase.from("shifts").select("*"),
        supabase.from("employee_availability").select("*"),
        supabase.from("products").select("*"),
        supabase.from("stock_levels").select("*"),
        supabase.from("distributions").select("*"),
        supabase.from("historic_sales").select("*"),
        supabase.from("shift_templates").select("*, shift_template_entries(*)"),
        supabase.from("notifications").select("*"),
        supabase.from("skills").select("*").order("sort_order"),
        supabase.from("employee_skills").select("*, skills(*)"),
        supabase.from("role_requirements").select("*"),
      ]);
      if (empRes.data) setEmployees(empRes.data);
      if (evtRes.data) setEvents(evtRes.data);
      if (locRes.data) setLocations(locRes.data);
      if (shiftRes.data) setShifts(shiftRes.data);
      if (availRes.data) {
        const availObj = {};
        availRes.data.forEach(r => {
          if (!availObj[r.employee_id]) availObj[r.employee_id] = {};
          availObj[r.employee_id][r.avail_date] = r.status;
        });
        setAvailability(availObj);
      }
      if (prodRes.data) setProducts(prodRes.data);
      if (stockRes.data) {
        const stockObj = {};
        stockRes.data.forEach(r => { stockObj[r.product_id] = r.quantity; });
        setStock(stockObj);
      }
      if (distRes.data) setDistributions(distRes.data);
      if (histRes.data) setHistoricSales(histRes.data);
      if (templRes.data) setTemplates(templRes.data.map(t => ({ ...t, shifts: t.shift_template_entries || [] })));
      if (notRes.data) setNotifications(notRes.data);
      if (skillsRes.data) setSkills(skillsRes.data);
      if (empSkillsRes.data) setEmployeeSkills(empSkillsRes.data);
      if (roleReqRes.data) setRoleRequirements(roleReqRes.data);

      // Subscribe to realtime updates
      setupRealtimeSubscriptions();
    } catch (error) {
      console.error("Data load failed:", error);
    }
  };

  // Setup Realtime subscriptions
  const setupRealtimeSubscriptions = () => {
    const tables = ["employees", "events", "shifts", "notifications", "skills", "employee_skills", "role_requirements"];

    const subscriptions = tables.map((table) => {
      const channel = supabase
        .channel(`public:${table}`)
        .on(
          "postgres_changes",
          {
            event: "*",
            schema: "public",
            table,
          },
          () => {
            loadData();
          }
        )
        .subscribe();

      return channel;
    });

    subscriptions.forEach((channel) => {
      unsubscribeRef.current.add(channel);
    });
  };

  // Cleanup subscriptions
  useEffect(() => {
    return () => {
      unsubscribeRef.current.forEach((channel) => {
        supabase.removeChannel(channel);
      });
    };
  }, []);

  // Handle logout
  const handleLogout = async () => {
    await supabase.auth.signOut();
    setUser(null);
    setCurrentNav({ section: "dashboard", page: null });
  };

  // Get breadcrumb
  const getBreadcrumb = () => {
    const section = NAV_TREE.sections.find((s) => s.id === currentNav.section);
    if (!section) return "";

    if (!section.children) {
      return section.label;
    }

    const child = section.children.find((c) => c.page === currentNav.page);
    if (child) {
      return `${section.label} > ${child.label}`;
    }

    return section.label;
  };

  // Navigation handler
  const handleNavigate = (nav) => {
    setCurrentNav(nav);
    setMobileMenuOpen(false);

    // Expand parent section if it has children
    const section = NAV_TREE.sections.find((s) => s.id === nav.section);
    if (section?.children) {
      setExpandedSections(new Set([...expandedSections, nav.section]));
    }
  };

  // Toggle section expansion
  const toggleSection = (sectionId) => {
    const newExpanded = new Set(expandedSections);
    if (newExpanded.has(sectionId)) {
      newExpanded.delete(sectionId);
    } else {
      newExpanded.add(sectionId);
    }
    setExpandedSections(newExpanded);
  };

  // Render page content
  const renderPage = () => {
    const pageContent = {
      dashboard: <DashboardPage employees={employees} events={events} locations={locations} shifts={shifts} availability={availability} products={products} stock={stock} historicSales={historicSales} />,
      "calendar-view": <CalendarViewPage events={events} employees={employees} shifts={shifts} locations={locations} availability={availability} employeeSkills={employeeSkills} skills={skills} />,
      "shift-builder": <ShiftBuilderPage events={events} employees={employees} shifts={shifts} locations={locations} roleRequirements={roleRequirements} />,
      "role-requirements": <RoleRequirementsPage events={events} shifts={shifts} locations={locations} employees={employees} roleRequirements={roleRequirements} />,
      directory: <DirectoryPage employees={employees} employeeSkills={employeeSkills} skills={skills} />,
      "skills-tags": <SkillsTagsPage employees={employees} skills={skills} employeeSkills={employeeSkills} />,
      availability: <AvailabilityPage employees={employees} events={events} availability={availability} />,
      payroll: <PayrollPage employees={employees} events={events} locations={locations} shifts={shifts} />,
      products: <InventoryProductsPage products={products} stock={stock} />,
      stock: <InventoryStockPage products={products} stock={stock} distributions={distributions} />,
      "inv-analytics": <InventoryAnalyticsPage historicSales={historicSales} products={products} />,
      reports: <ReportsPage employees={employees} events={events} shifts={shifts} historicSales={historicSales} products={products} />,
      notifications: <NotificationsPage notifications={notifications} />,
      settings: <SettingsPage user={user} />,
    };

    if (!currentNav.page) {
      return pageContent.dashboard;
    }

    return pageContent[currentNav.page] || pageContent.dashboard;
  };

  // Loading state
  if (loading) {
    return (
      <div
        className="min-h-screen flex items-center justify-center"
        style={{ background: BRAND.gradient }}
      >
        <div className="text-center">
          <div
            className="inline-block animate-spin rounded-full h-12 w-12 border-4 border-opacity-30 border-current"
            style={{ borderColor: BRAND.primary }}
          ></div>
          <p className="mt-4" style={{ color: BRAND.text }}>
            Loading...
          </p>
        </div>
      </div>
    );
  }

  // Login state
  if (!user) {
    return <LoginPage onLoginSuccess={setUser} />;
  }

  // Check mobile
  const isMobile = typeof window !== "undefined" && window.innerWidth < 768;

  return (
    <div
      className="min-h-screen flex flex-col"
      style={{ background: BRAND.gradient }}
    >
      {/* Header */}
      <div
        className="border-b px-4 py-3 flex items-center justify-between"
        style={{ borderColor: BRAND.glassBorder }}
      >
        <div className="flex items-center gap-3">
          {isMobile && (
            <button
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="p-2 hover:bg-white/10 rounded-lg transition"
            >
              {mobileMenuOpen ? (
                <X size={20} style={{ color: BRAND.text }} />
              ) : (
                <Menu size={20} style={{ color: BRAND.text }} />
              )}
            </button>
          )}
          <h1 className="text-xl font-bold" style={{ color: BRAND.primary }}>
            Collide
          </h1>
        </div>

        <div className="flex-1 max-w-md mx-4">
          <button
            onClick={() => setCommandPaletteOpen(true)}
            className="w-full px-4 py-2 rounded-lg text-sm flex items-center gap-2 transition hover:bg-white/10"
            style={{
              background: "rgba(255,255,255,0.05)",
              border: `1px solid ${BRAND.glassBorder}`,
              color: "rgba(224,230,255,0.7)",
            }}
          >
            <Search size={16} />
            <span>Search...</span>
            <span className="ml-auto text-xs">⌘K</span>
          </button>
        </div>

        <div className="flex items-center gap-2">
          <Btn
            icon={Bell}
            variant="secondary"
            size="sm"
            onClick={() => handleNavigate({ section: "notifications", page: "notifications" })}
          >
          </Btn>
          <Btn icon={LogOut} variant="secondary" size="sm" onClick={handleLogout}>
          </Btn>
        </div>
      </div>

      {/* Breadcrumb */}
      {currentNav.page && (
        <div
          className="px-4 py-2 text-sm border-b"
          style={{
            color: "rgba(224,230,255,0.6)",
            borderColor: BRAND.glassBorder,
          }}
        >
          {getBreadcrumb()}
        </div>
      )}

      {/* Main content */}
      <div className="flex-1 flex overflow-hidden">
        {/* Sidebar */}
        {(!isMobile || mobileMenuOpen) && (
          <div
            className={`${
              isMobile ? "fixed inset-0 top-16 z-40 w-64" : "w-64"
            } overflow-y-auto border-r p-4 space-y-1`}
            style={{
              borderColor: BRAND.glassBorder,
              background: isMobile ? BRAND.glass : "transparent",
            }}
          >
            {NAV_TREE.sections.map((section) => {
              const Icon = section.icon;
              const hasChildren = section.children && section.children.length > 0;
              const isActive = currentNav.section === section.id;
              const isExpanded = expandedSections.has(section.id);

              return (
                <div key={section.id}>
                  <button
                    onClick={() => {
                      if (hasChildren) {
                        toggleSection(section.id);
                      } else {
                        handleNavigate({
                          section: section.id,
                          page: section.page,
                        });
                      }
                    }}
                    className="w-full flex items-center gap-2 px-3 py-2 rounded-lg transition hover:bg-white/10 text-left text-sm"
                    style={{
                      background: isActive ? `${BRAND.primary}20` : "transparent",
                      color: isActive ? BRAND.primary : BRAND.text,
                    }}
                  >
                    <Icon size={18} />
                    <span className="flex-1">{section.label}</span>
                    {hasChildren && (
                      <ChevronDown
                        size={16}
                        style={{
                          transform: isExpanded ? "rotate(0)" : "rotate(-90deg)",
                          transition: "transform 0.2s",
                        }}
                      />
                    )}
                  </button>

                  {hasChildren && isExpanded && (
                    <div className="ml-4 space-y-1 mt-1">
                      {section.children.map((child) => {
                        const isActive = currentNav.page === child.page;
                        return (
                          <button
                            key={child.id}
                            onClick={() =>
                              handleNavigate({
                                section: section.id,
                                page: child.page,
                              })
                            }
                            className="w-full flex items-center gap-2 px-3 py-2 rounded-lg transition hover:bg-white/10 text-left text-sm"
                            style={{
                              background: isActive ? `${BRAND.primary}20` : "transparent",
                              color: isActive ? BRAND.primary : "rgba(224,230,255,0.7)",
                            }}
                          >
                            <div
                              className="w-2 h-2 rounded-full"
                              style={{
                                background: isActive ? BRAND.primary : "rgba(224,230,255,0.3)",
                              }}
                            ></div>
                            <span>{child.label}</span>
                          </button>
                        );
                      })}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}

        {/* Page Content */}
        <div className="flex-1 overflow-y-auto p-4 md:p-6">
          {renderPage()}
        </div>
      </div>

      {/* Command Palette */}
      <CommandPalette
        isOpen={commandPaletteOpen}
        onClose={() => setCommandPaletteOpen(false)}
        pages={[]}
        currentPage={currentNav}
        onNavigate={handleNavigate}
      />

      {/* Close mobile menu when clicking outside */}
      {isMobile && mobileMenuOpen && (
        <button
          onClick={() => setMobileMenuOpen(false)}
          className="fixed inset-0 z-30"
          aria-hidden="true"
        ></button>
      )}
    </div>
  );
}
