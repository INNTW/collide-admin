/**
 * Collide Apparel Staff Manager v5.0
 * React + Vite + Supabase + Recharts + Lucide React
 * Single-file app with glassmorphism UI, Supabase Auth, CRA tax engine
 *
 * Phase 1 — Scheduling & Navigation:
 *   Navigation tree, Calendar View, Shift Builder, Skills & Tags, Role Requirements, Availability
 * Phase 2 — Inventory & POS:
 *   Product CRUD, Stock & Distribution tracking, Inventory Analytics with charts
 * Phase 3 — Projections:
 *   Sales Forecast, Staffing Needs, Event P&L Estimator
 * Phase 4 — Polish:
 *   Events Manager (create/edit/delete events + locations), event_type support, final cleanup
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
  AreaChart,
  Area,
  ComposedChart,
} from "recharts";
import { supabase } from "./lib/supabase";

// ============================================================================
// CONSTANTS & CONFIG
// ============================================================================

const BRAND = {
  // Brand guideline colors
  navy: "#00396b",         // Main Navy Blue
  lightBlue: "#669ae4",    // Light Blue
  primary: "#54cdf9",      // Bright Blue (accent)
  accentBlue: "#cfe2f3",   // Accent Blue (subtle backgrounds)
  black: "#000000",
  white: "#ffffff",
  // App theme (white background mode)
  gradient: "#ffffff",     // White background
  glass: "rgba(0,57,107,0.06)",         // Navy tinted glass
  glassBorder: "rgba(0,57,107,0.12)",   // Navy tinted border
  blur: "blur(16px)",
  success: "#4CAF50",
  warning: "#FF9800",
  danger: "#F44336",
  text: "#00396b",         // Navy text on white
  textMuted: "#669ae4",    // Light blue for muted text
  textLight: "rgba(0,57,107,0.55)", // Faded navy
  // Floating nav
  navBg: "#00396b",        // Navy pill buttons
  navText: "#ffffff",      // White text on nav
  navActive: "#54cdf9",    // Bright blue active state
  navHover: "#669ae4",     // Light blue hover
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
// Role hierarchy: admin > team_lead > employee
// Each nav item specifies which roles can see it
// Main sidebar nav — clean icon+text buttons, no nested dropdowns
const NAV_SIDEBAR = [
  { id: "dashboard", label: "Dashboard", icon: Home, page: null, roles: ["admin", "team_lead", "employee"] },
  {
    id: "scheduling", label: "Staffing", icon: Calendar, roles: ["admin", "team_lead", "employee"],
    flyout: [
      { id: "staffing-dashboard", label: "Dashboard", page: "staffing-dashboard", roles: ["admin", "team_lead", "employee"] },
      { id: "scheduling", label: "Scheduling", page: "scheduling-cal", roles: ["admin", "team_lead", "employee"] },
      { id: "assignment", label: "Assignment", page: "assignment", roles: ["admin", "team_lead"] },
      { id: "staffing-analytics", label: "Staffing Analytics", page: "staffing-analytics", roles: ["admin"] },
    ],
  },
  { id: "employees", label: "Employees", icon: Users, page: "employees-dash", roles: ["admin", "team_lead"] },
  {
    id: "inventory", label: "Inventory", icon: Package, roles: ["admin", "team_lead"],
    flyout: [
      { id: "inv-dashboard", label: "Dashboard", page: "inv-dashboard", roles: ["admin", "team_lead"] },
      { id: "products", label: "Products", page: "products", roles: ["admin", "team_lead"] },
      { id: "inv-analytics", label: "Analytics", page: "inv-analytics", roles: ["admin"] },
      { id: "inv-projections", label: "Projections", page: "inv-projections", roles: ["admin"] },
    ],
  },
  { id: "analytics", label: "Analytics", icon: BarChart3, page: "analytics", roles: ["admin", "team_lead"] },
];

// User account menu items (top-right avatar dropdown)
const USER_MENU_ITEMS = [
  { id: "my-shifts", label: "My Shifts", icon: Calendar, page: "my-shifts", roles: ["admin", "team_lead", "employee"] },
  { id: "notifications", label: "Notifications", icon: Bell, page: "notifications", roles: ["admin", "team_lead", "employee"] },
  { id: "my-pay", label: "My Pay Stubs", icon: DollarSign, page: "payroll", roles: ["admin"] },
  { id: "settings", label: "Settings", icon: Settings, page: "settings", roles: ["admin"] },
];

// Legacy NAV_TREE kept for hasPageAccess checks
const NAV_TREE = {
  sections: [
    { id: "dashboard", label: "Dashboard", icon: Home, page: null, roles: ["admin", "team_lead", "employee"] },
    { id: "scheduling", label: "Staffing", icon: Calendar, page: "scheduling", roles: ["admin", "team_lead", "employee"] },
    { id: "employees", label: "Employees", icon: Users, page: "employees-dash", roles: ["admin", "team_lead"] },
    { id: "inventory", label: "Inventory", icon: Package, roles: ["admin", "team_lead"], children: [
      { id: "inv-dashboard", label: "Dashboard", page: "inv-dashboard", roles: ["admin", "team_lead"] },
      { id: "products", label: "Products", page: "products", roles: ["admin", "team_lead"] },
      { id: "stock", label: "Stock", page: "stock", roles: ["admin", "team_lead"] },
      { id: "inv-analytics", label: "Analytics", page: "inv-analytics", roles: ["admin"] },
      { id: "inv-projections", label: "Projections", page: "inv-projections", roles: ["admin"] },
    ]},
    { id: "analytics", label: "Analytics", icon: BarChart3, page: "analytics", roles: ["admin", "team_lead"], children: [
      { id: "reports", label: "Reports", page: "reports", roles: ["admin", "team_lead"] },
      { id: "sales-projections", label: "Sales Forecast", page: "sales-projections", roles: ["admin"] },
      { id: "staffing-projections", label: "Staffing Needs", page: "staffing-projections", roles: ["admin"] },
      { id: "event-pnl", label: "Event P&L", page: "event-pnl", roles: ["admin"] },
    ]},
    { id: "my-shifts", label: "My Shifts", icon: User, page: "my-shifts", roles: ["admin", "team_lead", "employee"] },
    { id: "notifications", label: "Notifications", icon: Bell, page: "notifications", roles: ["admin", "team_lead", "employee"] },
    { id: "settings", label: "Settings", icon: Settings, page: "settings", roles: ["admin"], children: [
      { id: "general-settings", label: "General", page: "settings", roles: ["admin"] },
      { id: "user-management", label: "User Management", page: "user-management", roles: ["admin"] },
    ]},
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
    primary: { bg: BRAND.primary, text: BRAND.navy },
    success: { bg: "#4CAF50", text: "#fff" },
    warning: { bg: "#FF9800", text: "#fff" },
    danger: { bg: "#F44336", text: "#fff" },
    info: { bg: BRAND.lightBlue, text: "#fff" },
    gray: { bg: BRAND.accentBlue, text: BRAND.navy },
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
        className={`${sizes[size]} rounded-2xl p-6 shadow-2xl`}
        style={{
          background: BRAND.white,
          border: `2px solid ${BRAND.accentBlue}`,
          boxShadow: "0 16px 48px rgba(0,57,107,0.2)",
        }}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-xl font-bold" style={{ color: BRAND.navy }}>
            {title}
          </h2>
          <button
            onClick={onClose}
            className="p-1 rounded-lg transition"
            style={{ color: BRAND.lightBlue }}
          >
            <X size={20} />
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
        <label className="block text-sm font-semibold mb-2" style={{ color: BRAND.navy }}>
          {label}
        </label>
      )}
      <input
        type={type}
        value={value}
        onChange={onChange}
        placeholder={placeholder}
        className="w-full px-4 py-2.5 rounded-lg transition focus:outline-none focus:ring-2"
        style={{
          background: BRAND.white,
          color: BRAND.navy,
          border: error
            ? `2px solid ${BRAND.danger}`
            : `2px solid ${BRAND.accentBlue}`,
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

// Google Places Autocomplete for address fields
const GOOGLE_MAPS_API_KEY = import.meta.env.VITE_GOOGLE_MAPS_API_KEY;
let placesLibPromise = null;
const loadGooglePlaces = () => {
  if (placesLibPromise) return placesLibPromise;
  placesLibPromise = new Promise((resolve, reject) => {
    // Use callback-based loader to enable importLibrary for the new Places API
    window.__googleMapsCallback = async () => {
      try {
        const placesLib = await window.google.maps.importLibrary("places");
        resolve(placesLib);
      } catch (e) {
        reject(e);
      }
    };
    const script = document.createElement("script");
    script.src = `https://maps.googleapis.com/maps/api/js?key=${GOOGLE_MAPS_API_KEY}&callback=__googleMapsCallback`;
    script.async = true;
    script.onerror = reject;
    document.head.appendChild(script);
  });
  return placesLibPromise;
};

const VenueAutocomplete = ({ value, onChange, onPlaceSelect, placeholder = "Search venue name..." }) => {
  const containerRef = useRef(null);
  const placesLibRef = useRef(null);
  const sessionTokenRef = useRef(null);
  const [suggestions, setSuggestions] = useState([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [loading, setLoading] = useState(false);
  const debounceRef = useRef(null);

  useEffect(() => {
    if (!GOOGLE_MAPS_API_KEY) return;
    let isMounted = true;
    loadGooglePlaces().then((lib) => {
      if (!isMounted) return;
      placesLibRef.current = lib;
      sessionTokenRef.current = new lib.AutocompleteSessionToken();
    }).catch(err => console.error("Failed to load Google Places:", err));
    return () => { isMounted = false; };
  }, []);

  const fetchSuggestions = (input) => {
    if (!input || input.length < 2 || !placesLibRef.current) {
      setSuggestions([]);
      setShowSuggestions(false);
      return;
    }
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(async () => {
      setLoading(true);
      try {
        const { suggestions: results } = await placesLibRef.current.AutocompleteSuggestion.fetchAutocompleteSuggestions({
          input,
          includedPrimaryTypes: ["establishment"],
          includedRegionCodes: ["ca"],
          sessionToken: sessionTokenRef.current,
        });
        setSuggestions(results || []);
        setShowSuggestions((results || []).length > 0);
      } catch (err) {
        console.warn("Places autocomplete error:", err);
        setSuggestions([]);
        setShowSuggestions(false);
      } finally {
        setLoading(false);
      }
    }, 300);
  };

  const handleSelect = async (suggestion) => {
    setShowSuggestions(false);
    setSuggestions([]);
    try {
      const placePrediction = suggestion.placePrediction;
      const place = new placesLibRef.current.Place({ id: placePrediction.placeId });
      await place.fetchFields({ fields: ["displayName", "formattedAddress", "addressComponents"] });
      // Reset session token after place details fetch (ends billing session)
      sessionTokenRef.current = new placesLibRef.current.AutocompleteSessionToken();
      const get = (type) => {
        const comp = (place.addressComponents || []).find(c => c.types.includes(type));
        return comp ? comp.longText : "";
      };
      const getShort = (type) => {
        const comp = (place.addressComponents || []).find(c => c.types.includes(type));
        return comp ? comp.shortText : "";
      };
      const streetNumber = get("street_number");
      const route = get("route");
      const address = streetNumber ? `${streetNumber} ${route}` : route;
      const city = get("locality") || get("sublocality_level_1") || get("administrative_area_level_3");
      const province = getShort("administrative_area_level_1");
      const venueName = place.displayName || "";
      onPlaceSelect({ name: venueName, address, city, province, formatted: place.formattedAddress || address });
    } catch (err) {
      console.error("Place details error:", err);
    }
  };

  const handleInputChange = (e) => {
    onChange(e);
    fetchSuggestions(e.target.value);
  };

  useEffect(() => {
    const handleClickOutside = (e) => {
      if (containerRef.current && !containerRef.current.contains(e.target)) {
        setShowSuggestions(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  return (
    <div className="mb-4 relative" ref={containerRef}>
      <label className="block text-sm font-medium mb-2" style={{ color: BRAND.text }}>Venue Name</label>
      <input
        type="text"
        value={value}
        onChange={handleInputChange}
        onFocus={() => { if (suggestions.length > 0) setShowSuggestions(true); }}
        placeholder={placeholder}
        className="w-full px-4 py-2 rounded-lg text-navy transition focus:outline-none focus:ring-2"
        style={{
          background: BRAND.accentBlue,
          border: `1px solid ${BRAND.glassBorder}`,
        }}
      />
      {showSuggestions && suggestions.length > 0 && (
        <div className="absolute z-50 w-full mt-1 rounded-lg overflow-hidden shadow-xl" style={{ background: "#0a1628", border: `1px solid rgba(84,205,249,0.2)` }}>
          {suggestions.map((s, i) => {
            const pred = s.placePrediction;
            const mainText = pred?.mainText?.text || pred?.text?.text || "";
            const secondaryText = pred?.secondaryText?.text || "";
            return (
              <div
                key={pred?.placeId || i}
                className="px-3 py-2 cursor-pointer transition-colors"
                style={{ color: BRAND.navy, borderTop: i > 0 ? "1px solid rgba(255,255,255,0.05)" : "none" }}
                onMouseDown={() => handleSelect(s)}
                onMouseEnter={(e) => { e.currentTarget.style.background = `${BRAND.primary}20`; }}
                onMouseLeave={(e) => { e.currentTarget.style.background = "transparent"; }}
              >
                <div style={{ color: "#54CDF9", fontWeight: 600 }}>{mainText}</div>
                <div className="text-xs mt-0.5" style={{ color: BRAND.textLight }}>{secondaryText}</div>
              </div>
            );
          })}
        </div>
      )}
      {loading && <div className="absolute right-3 top-10 text-xs" style={{ color: BRAND.accent }}>Searching...</div>}
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
        className="w-full px-4 py-2 rounded-lg text-navy transition focus:outline-none focus:ring-2"
        style={{
          background: BRAND.accentBlue,
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
      bg: BRAND.navy,
      text: BRAND.white,
      hover: BRAND.lightBlue,
    },
    secondary: {
      bg: BRAND.accentBlue,
      text: BRAND.navy,
      hover: "#b8d4f0",
    },
    ghost: {
      bg: "transparent",
      text: BRAND.navy,
      hover: BRAND.accentBlue,
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
      <p className="text-sm" style={{ color: BRAND.textMuted }}>
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
          <p className="text-sm font-medium mb-1" style={{ color: BRAND.lightBlue }}>
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
      className="flex items-center justify-center p-4"
      style={{ background: BRAND.navy, height: "100dvh", minHeight: "-webkit-fill-available" }}
    >
      <div
        className="w-full max-w-md p-8 rounded-2xl"
        style={{
          background: BRAND.white,
          border: `2px solid ${BRAND.accentBlue}`,
          boxShadow: "0 16px 48px rgba(0,0,0,0.25)",
        }}
      >
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold mb-2" style={{ color: BRAND.navy, fontFamily: "'Montserrat', sans-serif", letterSpacing: "2px" }}>
            COLLIDE
          </h1>
          <p className="text-sm font-medium" style={{ color: BRAND.lightBlue }}>
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
            <div className="p-3 rounded-lg text-sm" style={{ background: "rgba(244,67,54,0.1)", color: BRAND.danger }}>
              {error}
            </div>
          )}

          <Btn
            type="submit"
            disabled={loading}
            className="w-full"
          >
            {loading ? "Logging in..." : "Login"}
          </Btn>
        </form>

        <p className="text-center text-xs mt-4" style={{ color: BRAND.lightBlue }}>
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
        className="w-full max-w-2xl rounded-2xl shadow-2xl overflow-hidden"
        style={{
          background: BRAND.white,
          border: `2px solid ${BRAND.accentBlue}`,
          boxShadow: "0 16px 48px rgba(0,57,107,0.2)",
        }}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center gap-3 px-4 py-3" style={{ borderBottom: `2px solid ${BRAND.accentBlue}` }}>
          <Search size={18} style={{ color: BRAND.navy }} />
          <input
            ref={inputRef}
            type="text"
            placeholder="Search pages..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="flex-1 bg-transparent outline-none"
            style={{ color: BRAND.navy }}
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
                className="w-full text-left px-4 py-3 hover:bg-blue-50 transition"
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
  const today = new Date().toISOString().split("T")[0];
  const upcomingEvents = (events || [])
    .filter((e) => e.end_date >= today)
    .sort((a, b) => a.start_date.localeCompare(b.start_date))
    .slice(0, 5);

  // Unassigned shifts — shifts with no employee_id assigned
  const unassignedShifts = (shifts || []).filter(s => !s.employee_id && events.find(e => e.id === s.event_id && e.end_date >= today));

  // Payroll summary — pay_records not yet loaded in this phase, show placeholder
  const payrollThisMonth = 0;

  // Last inventory input date placeholder (will use stock update log when available)
  const lastInventoryDate = "Awaiting first log";

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <StatCard
          icon={Calendar}
          label="Upcoming Events"
          value={upcomingEvents.length}
          color="primary"
        />
        <StatCard
          icon={AlertCircle}
          label="Unassigned Shifts"
          value={unassignedShifts.length}
          color={unassignedShifts.length > 0 ? "danger" : "success"}
        />
        <StatCard
          icon={DollarSign}
          label="Payroll This Month"
          value={currency(payrollThisMonth)}
          color="success"
        />
        <StatCard
          icon={Clock}
          label="Last Inventory Update"
          value={lastInventoryDate}
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
                style={{ background: BRAND.accentBlue }}
              >
                <div className="flex justify-between items-start">
                  <div>
                    <p className="font-medium" style={{ color: BRAND.text }}>
                      {event.name}
                    </p>
                    <p className="text-sm" style={{ color: BRAND.textMuted }}>
                      {formatDate(event.start_date)} — {formatDate(event.end_date)}
                    </p>
                  </div>
                  <Badge color={event.status === "active" ? "success" : event.status === "upcoming" ? "primary" : "gray"}>{event.status || "upcoming"}</Badge>
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
// PAGES: EVENTS MANAGEMENT (Phase 4)
// ============================================================================

const EventsManagementPage = ({ events = [], locations = [], venues = [], eventVenues = [], onRefresh }) => {
  const [showEventModal, setShowEventModal] = useState(false);
  const [showVenueModal, setShowVenueModal] = useState(false);
  const [editEvent, setEditEvent] = useState(null);
  const [editVenue, setEditVenue] = useState(null);
  const [saving, setSaving] = useState(false);
  const [activeTab, setActiveTab] = useState("events"); // events | venues
  const [filterStatus, setFilterStatus] = useState("");
  const [eventForm, setEventForm] = useState({ name: "", start_date: "", end_date: "", event_type: "festival", status: "upcoming", description: "", notes: "", selectedVenues: [] });
  const [venueForm, setVenueForm] = useState({ name: "", address: "", city: "", province: "ON", notes: "" });

  const resetEventForm = () => setEventForm({ name: "", start_date: "", end_date: "", event_type: "festival", status: "upcoming", description: "", notes: "", selectedVenues: [] });
  const resetVenueForm = () => setVenueForm({ name: "", address: "", city: "", province: "ON", notes: "" });

  const openEditEvent = (e) => {
    const linkedVenues = eventVenues.filter(ev => ev.event_id === e.id).map(ev => ev.venue_id);
    setEditEvent(e);
    setEventForm({
      name: e.name,
      start_date: e.start_date,
      end_date: e.end_date,
      event_type: e.event_type || "festival",
      status: e.status || "upcoming",
      description: e.description || "",
      notes: e.notes || "",
      selectedVenues: linkedVenues,
    });
  };

  const openEditVenue = (ven) => {
    setEditVenue(ven);
    setVenueForm({
      name: ven.name,
      address: ven.address || "",
      city: ven.city || "",
      province: ven.province || "ON",
      notes: ven.notes || "",
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
    let eventId = editEvent?.id;
    if (editEvent) {
      await supabase.from("events").update(payload).eq("id", editEvent.id);
    } else {
      const { data } = await supabase.from("events").insert(payload).select();
      if (data && data[0]) eventId = data[0].id;
    }
    // Update event_venues junction table
    if (eventId) {
      const existingVenues = eventVenues.filter(ev => ev.event_id === eventId).map(ev => ev.venue_id);
      const toDelete = existingVenues.filter(vid => !eventForm.selectedVenues.includes(vid));
      const toAdd = eventForm.selectedVenues.filter(vid => !existingVenues.includes(vid));
      if (toDelete.length > 0) {
        await Promise.all(toDelete.map(vid => supabase.from("event_venues").delete().eq("event_id", eventId).eq("venue_id", vid)));
      }
      if (toAdd.length > 0) {
        await supabase.from("event_venues").insert(toAdd.map(vid => ({ event_id: eventId, venue_id: vid })));
      }
    }
    // Notify all staff to submit availability when a NEW event is created
    if (!editEvent && eventId) {
      const startLabel = new Date(eventForm.start_date + "T00:00:00").toLocaleDateString("en-US", { month: "short", day: "numeric" });
      const endLabel = new Date(eventForm.end_date + "T00:00:00").toLocaleDateString("en-US", { month: "short", day: "numeric" });
      const dateRange = eventForm.start_date === eventForm.end_date ? startLabel : `${startLabel} – ${endLabel}`;
      await supabase.from("notifications").insert({
        type: "general",
        message: `New event added: ${eventForm.name} (${dateRange}). Please submit your availability.`,
        event_id: eventId,
        status: "sent",
        sent_at: new Date().toISOString(),
      });
    }
    setSaving(false);
    setShowEventModal(false);
    setEditEvent(null);
    resetEventForm();
    onRefresh?.();
  };

  const handleDeleteEvent = async (id) => {
    if (!confirm("Delete this event and all associated venues, shifts, and requirements?")) return;
    await supabase.from("event_venues").delete().eq("event_id", id);
    await supabase.from("event_locations").delete().eq("event_id", id);
    await supabase.from("shifts").delete().eq("event_id", id);
    await supabase.from("role_requirements").delete().eq("event_id", id);
    await supabase.from("distributions").delete().eq("event_id", id);
    await supabase.from("events").delete().eq("id", id);
    onRefresh?.();
  };

  const handleSaveVenue = async () => {
    if (!venueForm.name) return;
    setSaving(true);
    const payload = {
      name: venueForm.name,
      address: venueForm.address || null,
      city: venueForm.city || null,
      province: venueForm.province || null,
      notes: venueForm.notes || null,
    };
    if (editVenue) {
      await supabase.from("venues").update(payload).eq("id", editVenue.id);
    } else {
      await supabase.from("venues").insert(payload);
    }
    setSaving(false);
    setShowVenueModal(false);
    setEditVenue(null);
    resetVenueForm();
    onRefresh?.();
  };

  const handleDeleteVenue = async (id) => {
    if (!confirm("Delete this venue? This will remove it from all associated events.")) return;
    await supabase.from("event_venues").delete().eq("venue_id", id);
    await supabase.from("venues").delete().eq("id", id);
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
            <Btn icon={Plus} onClick={() => { resetVenueForm(); setEditVenue(null); setShowVenueModal(true); }}>New Venue</Btn>
          )}
        </div>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard label="Total Events" value={events.length} icon={Calendar} color="primary" />
        <StatCard label="Upcoming" value={upcomingEvents.length} icon={Calendar} color="success" />
        <StatCard label="Past" value={pastEvents.length} icon={Clock} color="warning" />
        <StatCard label="Venues" value={venues.length} icon={MapPin} color="primary" />
      </div>

      {/* Tabs */}
      <div className="flex gap-2">
        {["events", "venues"].map(tab => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className="px-4 py-2 rounded-lg text-sm font-medium transition"
            style={{
              background: activeTab === tab ? `${BRAND.primary}20` : BRAND.accentBlue,
              color: activeTab === tab ? BRAND.primary : "rgba(224,230,255,0.7)",
              border: `1px solid ${activeTab === tab ? BRAND.primary : BRAND.glassBorder}`,
            }}
          >
            {tab === "events" ? "Events" : "Venues"}
          </button>
        ))}
        {activeTab === "events" && (
          <select
            value={filterStatus}
            onChange={(e) => setFilterStatus(e.target.value)}
            className="ml-auto px-3 py-1.5 rounded-lg text-sm focus:outline-none"
            style={{ background: BRAND.accentBlue, border: `1px solid ${BRAND.glassBorder}` }}
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
                  <th className="text-center py-3 px-3" style={{ color: BRAND.primary }}>Venues</th>
                  <th className="text-center py-3 px-3" style={{ color: BRAND.primary }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {sortedEvents.map(e => {
                  const eventVenuesCount = eventVenues.filter(ev => ev.event_id === e.id).length;
                  return (
                    <tr key={e.id} className="hover:bg-white/5 transition" style={{ borderBottom: `1px solid ${BRAND.glassBorder}` }}>
                      <td className="py-3 px-3">
                        <div className="font-medium" style={{ color: BRAND.text }}>{e.name}</div>
                        {e.description && <p className="text-xs mt-0.5" style={{ color: BRAND.textLight }}>{e.description.substring(0, 60)}</p>}
                      </td>
                      <td className="py-3 px-3 text-center">
                        <span className="text-xs px-2 py-1 rounded-full" style={{ background: "rgba(84,205,249,0.15)", color: BRAND.primary }}>
                          {typeLabels[e.event_type] || e.event_type}
                        </span>
                      </td>
                      <td className="py-3 px-3 text-center text-xs" style={{ color: BRAND.lightBlue }}>
                        {e.start_date} &rarr; {e.end_date}
                      </td>
                      <td className="py-3 px-3 text-center">
                        <span className="text-xs px-2 py-1 rounded-full" style={{ background: `${statusColors[e.status] || BRAND.primary}20`, color: statusColors[e.status] || BRAND.primary }}>
                          {e.status}
                        </span>
                      </td>
                      <td className="py-3 px-3 text-center" style={{ color: BRAND.text }}>{eventVenuesCount}</td>
                      <td className="py-3 px-3 text-center">
                        <div className="flex items-center justify-center gap-1">
                          <button onClick={() => openEditEvent(e)} className="p-1.5 rounded-lg hover:bg-blue-50 transition">
                            <Edit2 size={14} style={{ color: BRAND.primary }} />
                          </button>
                          <button onClick={() => handleDeleteEvent(e.id)} className="p-1.5 rounded-lg hover:bg-blue-50 transition">
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

      {/* Venues Tab */}
      {activeTab === "venues" && (
        <SectionCard title={`Venues (${venues.length})`} icon={MapPin}>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr style={{ borderBottom: `1px solid ${BRAND.glassBorder}` }}>
                  <th className="text-left py-3 px-3" style={{ color: BRAND.primary }}>Venue Name</th>
                  <th className="text-left py-3 px-3" style={{ color: BRAND.primary }}>Address</th>
                  <th className="text-center py-3 px-3" style={{ color: BRAND.primary }}>City</th>
                  <th className="text-center py-3 px-3" style={{ color: BRAND.primary }}>Province</th>
                  <th className="text-center py-3 px-3" style={{ color: BRAND.primary }}>Events</th>
                  <th className="text-center py-3 px-3" style={{ color: BRAND.primary }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {venues.map(ven => {
                  const venueEventCount = eventVenues.filter(ev => ev.venue_id === ven.id).length;
                  return (
                    <tr key={ven.id} className="hover:bg-white/5 transition" style={{ borderBottom: `1px solid ${BRAND.glassBorder}` }}>
                      <td className="py-3 px-3 font-medium" style={{ color: BRAND.text }}>{ven.name}</td>
                      <td className="py-3 px-3 text-xs" style={{ color: BRAND.textMuted }}>{ven.address || "—"}</td>
                      <td className="py-3 px-3 text-center" style={{ color: BRAND.text }}>{ven.city || "—"}</td>
                      <td className="py-3 px-3 text-center" style={{ color: BRAND.text }}>{ven.province || "—"}</td>
                      <td className="py-3 px-3 text-center" style={{ color: BRAND.text }}>{venueEventCount}</td>
                      <td className="py-3 px-3 text-center">
                        <div className="flex items-center justify-center gap-1">
                          <button onClick={() => openEditVenue(ven)} className="p-1.5 rounded-lg hover:bg-blue-50 transition">
                            <Edit2 size={14} style={{ color: BRAND.primary }} />
                          </button>
                          <button onClick={() => handleDeleteVenue(ven.id)} className="p-1.5 rounded-lg hover:bg-blue-50 transition">
                            <Trash2 size={14} style={{ color: BRAND.danger }} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
            {venues.length === 0 && <EmptyState icon={MapPin} title="No venues" message="Create your first universal venue" />}
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
          <div className="mb-4">
            <label className="block text-sm font-medium mb-2" style={{ color: BRAND.text }}>Venues</label>
            <div className="space-y-2 max-h-48 overflow-y-auto">
              {venues.length === 0 ? (
                <p className="text-xs" style={{ color: BRAND.textMuted }}>No venues available. Create venues in the Venues tab first.</p>
              ) : (
                venues.map(ven => (
                  <label key={ven.id} className="flex items-center gap-2 p-2 rounded-lg hover:bg-white/5 transition cursor-pointer">
                    <input
                      type="checkbox"
                      checked={eventForm.selectedVenues.includes(ven.id)}
                      onChange={(e) => {
                        if (e.target.checked) {
                          setEventForm({ ...eventForm, selectedVenues: [...eventForm.selectedVenues, ven.id] });
                        } else {
                          setEventForm({ ...eventForm, selectedVenues: eventForm.selectedVenues.filter(id => id !== ven.id) });
                        }
                      }}
                      className="w-4 h-4"
                      style={{ accentColor: BRAND.primary }}
                    />
                    <div>
                      <div className="text-sm" style={{ color: BRAND.text }}>{ven.name}</div>
                      <div className="text-xs" style={{ color: BRAND.textLight }}>{ven.city}, {ven.province}</div>
                    </div>
                  </label>
                ))
              )}
            </div>
          </div>
          <div className="flex justify-end gap-2 mt-4">
            <Btn variant="secondary" onClick={() => { setShowEventModal(false); setEditEvent(null); resetEventForm(); }}>Cancel</Btn>
            <Btn onClick={handleSaveEvent} disabled={saving || !eventForm.name || !eventForm.start_date || !eventForm.end_date}>{saving ? "Saving..." : editEvent ? "Update" : "Create"}</Btn>
          </div>
        </div>
      </Modal>

      {/* Venue Modal */}
      <Modal isOpen={showVenueModal || !!editVenue} onClose={() => { setShowVenueModal(false); setEditVenue(null); resetVenueForm(); }} title={editVenue ? "Edit Venue" : "New Venue"} size="md">
        <div className="space-y-1">
          <VenueAutocomplete
            value={venueForm.name}
            onChange={(e) => setVenueForm({ ...venueForm, name: e.target.value })}
            onPlaceSelect={({ name, address, city, province }) => {
              const provMap = { "Ontario": "ON", "Quebec": "QC", "British Columbia": "BC", "Alberta": "AB", "Manitoba": "MB", "Saskatchewan": "SK", "Nova Scotia": "NS", "New Brunswick": "NB", "Newfoundland and Labrador": "NL", "Prince Edward Island": "PE" };
              setVenueForm({ ...venueForm, name: name || venueForm.name, address, city, province: provMap[province] || province || venueForm.province });
            }}
            placeholder="Search venue name (e.g. Chesswood Arena)"
          />
          <Input label="Address" value={venueForm.address} onChange={(e) => setVenueForm({ ...venueForm, address: e.target.value })} placeholder="Street address" />
          <div className="grid grid-cols-2 gap-4">
            <Input label="City" value={venueForm.city} onChange={(e) => setVenueForm({ ...venueForm, city: e.target.value })} placeholder="Toronto" />
            <Select label="Province" value={venueForm.province} onChange={(e) => setVenueForm({ ...venueForm, province: e.target.value })} options={[{ value: "ON", label: "Ontario" }, { value: "QC", label: "Quebec" }, { value: "BC", label: "British Columbia" }, { value: "AB", label: "Alberta" }, { value: "MB", label: "Manitoba" }, { value: "SK", label: "Saskatchewan" }, { value: "NS", label: "Nova Scotia" }, { value: "NB", label: "New Brunswick" }]} />
          </div>
          <Input label="Notes" value={venueForm.notes} onChange={(e) => setVenueForm({ ...venueForm, notes: e.target.value })} placeholder="Notes..." />
          <div className="flex justify-end gap-2 mt-4">
            <Btn variant="secondary" onClick={() => { setShowVenueModal(false); setEditVenue(null); resetVenueForm(); }}>Cancel</Btn>
            <Btn onClick={handleSaveVenue} disabled={saving || !venueForm.name}>{saving ? "Saving..." : editVenue ? "Update" : "Create"}</Btn>
          </div>
        </div>
      </Modal>
    </div>
  );
};

// ============================================================================
// PAGES: CALENDAR VIEW
// ============================================================================

const CalendarViewPage = ({ events = [], employees = [], shifts = [], locations = [], availability = {}, employeeSkills = [], skills = [], venues = [], eventVenues = [] }) => {
  const [currentDate, setCurrentDate] = useState(new Date());
  const [viewMode, setViewMode] = useState("month"); // month, week, day
  const [selectedDay, setSelectedDay] = useState(new Date());

  const statusColors = { upcoming: BRAND.primary, active: BRAND.success, completed: "rgba(224,230,255,0.5)", cancelled: BRAND.danger };
  const typeLabels = { festival: "Festival", concert: "Concert", market: "Market", pop_up: "Pop-Up", corporate: "Corporate", tournament: "Tournament", combine: "Combine", camp: "Camp", other: "Other" };

  const getDaysInMonth = (date) => new Date(date.getFullYear(), date.getMonth() + 1, 0).getDate();
  const getFirstDayOfMonth = (date) => new Date(date.getFullYear(), date.getMonth(), 1).getDay();

  const monthDays = Array.from({ length: getDaysInMonth(currentDate) }, (_, i) => i + 1);
  const firstDay = getFirstDayOfMonth(currentDate);

  const getEventsForDate = (date) => {
    const d = date.toISOString().split("T")[0];
    return events.filter((e) => d >= e.start_date && d <= e.end_date);
  };

  const getVenueNames = (eventId) => {
    const venueIds = eventVenues.filter(ev => ev.event_id === eventId).map(ev => ev.venue_id);
    return venues.filter(v => venueIds.includes(v.id)).map(v => v.name);
  };

  const getStaffCount = (eventId, dateStr) => {
    return shifts.filter(s => s.event_id === eventId && s.shift_date === dateStr).length;
  };

  const handlePrevMonth = () => setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() - 1));
  const handleNextMonth = () => setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() + 1));

  const monthName = currentDate.toLocaleString("en-US", { month: "long", year: "numeric" });

  // Build calendar grid rows (weeks) for spanning bar calculations
  const totalCells = firstDay + monthDays.length;
  const totalRows = Math.ceil(totalCells / 7);

  // Build list of events that appear this month with their day ranges
  const monthStart = `${currentDate.getFullYear()}-${String(currentDate.getMonth() + 1).padStart(2, "0")}-01`;
  const monthEnd = `${currentDate.getFullYear()}-${String(currentDate.getMonth() + 1).padStart(2, "0")}-${String(getDaysInMonth(currentDate)).padStart(2, "0")}`;

  const monthEvents = events.filter(e => e.start_date <= monthEnd && e.end_date >= monthStart).sort((a, b) => a.start_date.localeCompare(b.start_date));

  // For each event, calculate which grid cells it occupies
  const getEventSpans = (event) => {
    const spans = [];
    const eStart = new Date(event.start_date + "T00:00:00");
    const eEnd = new Date(event.end_date + "T00:00:00");
    
    for (let row = 0; row < totalRows; row++) {
      const rowStartCell = row * 7;
      const rowEndCell = rowStartCell + 6;
      
      // What calendar day does each cell represent?
      const rowStartDay = rowStartCell - firstDay + 1;
      const rowEndDay = rowEndCell - firstDay + 1;
      
      // Event day range in this month (1-based)
      const eventStartDay = eStart.getFullYear() === currentDate.getFullYear() && eStart.getMonth() === currentDate.getMonth()
        ? eStart.getDate() : 1;
      const eventEndDay = eEnd.getFullYear() === currentDate.getFullYear() && eEnd.getMonth() === currentDate.getMonth()
        ? eEnd.getDate() : getDaysInMonth(currentDate);
      
      // Does this event overlap with this row?
      const overlapStart = Math.max(eventStartDay, rowStartDay);
      const overlapEnd = Math.min(eventEndDay, rowEndDay);
      
      if (overlapStart <= overlapEnd && overlapStart >= 1 && overlapStart <= getDaysInMonth(currentDate)) {
        const startCol = overlapStart - rowStartDay;
        const endCol = overlapEnd - rowStartDay;
        spans.push({ row, startCol, endCol, startDay: overlapStart, endDay: overlapEnd });
      }
    }
    return spans;
  };

  if (viewMode === "day") {
    const dayStr = selectedDay.toISOString().split("T")[0];
    const dayEvents = getEventsForDate(selectedDay);
    const dayShifts = shifts.filter(s => s.shift_date === dayStr);
    const hours = Array.from({ length: 18 }, (_, i) => 6 + i);

    return (
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <button onClick={() => setViewMode("month")} className="inline-flex items-center gap-2 px-3 py-2 rounded-lg hover:bg-blue-50 transition">
            <ChevronLeft size={18} style={{ color: BRAND.primary }} />
            <span style={{ color: BRAND.text }}>Back to Month</span>
          </button>
          <h1 className="text-2xl font-bold" style={{ color: BRAND.text }}>
            {selectedDay.toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric" })}
          </h1>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          <div className="lg:col-span-2 space-y-4">
            {dayEvents.length > 0 && (
              <SectionCard title={`Events (${dayEvents.length})`} icon={Calendar}>
                <div className="space-y-2">
                  {dayEvents.map(event => {
                    const venueNames = getVenueNames(event.id);
                    const staffCount = getStaffCount(event.id, dayStr);
                    const color = statusColors[event.status] || BRAND.primary;
                    return (
                      <div key={event.id} className="p-3 rounded-lg" style={{ background: `${color}15`, borderLeft: `4px solid ${color}` }}>
                        <div className="flex items-center justify-between">
                          <p className="font-medium text-sm" style={{ color: BRAND.text }}>{event.name}</p>
                          <span className="text-xs px-2 py-0.5 rounded-full" style={{ background: `${color}20`, color }}>{typeLabels[event.event_type] || event.event_type}</span>
                        </div>
                        <p className="text-xs mt-1" style={{ color: BRAND.textMuted }}>
                          {formatDate(event.start_date)} — {formatDate(event.end_date)}
                          {venueNames.length > 0 && ` • ${venueNames.join(", ")}`}
                          {staffCount > 0 && ` • ${staffCount} staff`}
                        </p>
                      </div>
                    );
                  })}
                </div>
              </SectionCard>
            )}

            <SectionCard title="Shift Schedule" icon={Clock}>
              <div className="space-y-2">
                {dayShifts.length === 0 ? (
                  <EmptyState icon={Clock} title="No shifts" message="No shifts scheduled for this day" />
                ) : (
                  hours.map(hour => {
                    const hourShifts = dayShifts.filter(s => {
                      const startHour = parseInt(s.start_time?.split(":")[0]);
                      return startHour === hour;
                    });
                    if (hourShifts.length === 0) return null;
                    return (
                      <div key={hour} className="flex items-start gap-4">
                        <div className="w-16 text-sm font-medium flex-shrink-0 pt-1" style={{ color: BRAND.lightBlue }}>
                          {String(hour).padStart(2, "0")}:00
                        </div>
                        <div className="flex-1 space-y-1">
                          {hourShifts.map(shift => {
                            const emp = employees.find(e => e.id === shift.employee_id);
                            const evt = events.find(e => e.id === shift.event_id);
                            return (
                              <div key={shift.id} className="p-2 rounded-lg" style={{ background: `${BRAND.primary}20`, borderLeft: `3px solid ${BRAND.primary}` }}>
                                <p className="text-sm font-medium" style={{ color: BRAND.text }}>
                                  {emp ? `${emp.first_name} ${emp.last_name}` : "Unassigned"} {shift.role ? `— ${shift.role}` : ""}
                                </p>
                                <p className="text-xs" style={{ color: BRAND.textMuted }}>
                                  {formatTime(shift.start_time)} - {formatTime(shift.end_time)} {evt ? `• ${evt.name}` : ""}
                                </p>
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    );
                  }).filter(Boolean)
                )}
              </div>
            </SectionCard>
          </div>

          <div>
            <SectionCard title="Available Staff" icon={Users}>
              {employees.length === 0 ? (
                <EmptyState title="No staff" message="Add employees first" />
              ) : (
                <div className="space-y-2">
                  {employees.slice(0, 8).map(emp => (
                    <div key={emp.id} className="p-2 rounded-lg text-sm cursor-pointer hover:bg-blue-50 transition" style={{ background: BRAND.accentBlue }}>
                      <p style={{ color: BRAND.text }}>{emp.first_name} {emp.last_name}</p>
                      <div className="flex flex-wrap gap-1 mt-1">
                        {(employeeSkills.filter(es => es.employee_id === emp.id) || []).slice(0, 2).map(es => (
                          <Badge key={es.id} color="primary" variant="outline">{es.skills?.name || "Unknown"}</Badge>
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

  // ---- MONTH VIEW with spanning event bars ----
  const rows = [];
  for (let row = 0; row < totalRows; row++) {
    const cells = [];
    for (let col = 0; col < 7; col++) {
      const cellIdx = row * 7 + col;
      const dayNum = cellIdx - firstDay + 1;
      if (dayNum < 1 || dayNum > getDaysInMonth(currentDate)) {
        cells.push(null);
      } else {
        cells.push(dayNum);
      }
    }
    rows.push(cells);
  }

  // Build event bars per row, stacking events to avoid overlaps
  const eventBarsByRow = rows.map((_, rowIdx) => {
    const barsInRow = [];
    monthEvents.forEach(event => {
      const spans = getEventSpans(event);
      const span = spans.find(s => s.row === rowIdx);
      if (span) {
        barsInRow.push({ event, ...span });
      }
    });
    return barsInRow;
  });

  // Calculate max stacked events in any row to size cells
  const maxBarsPerRow = eventBarsByRow.map(bars => bars.length);
  const maxBars = Math.max(...maxBarsPerRow, 0);

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold" style={{ color: BRAND.text }}>
          Calendar — {monthName}
        </h1>
        <div className="flex items-center gap-2">
          <Btn icon={ChevronLeft} size="sm" variant="secondary" onClick={handlePrevMonth}>Prev</Btn>
          <Btn size="sm" variant="secondary" onClick={() => setCurrentDate(new Date())}>Today</Btn>
          <Btn icon={ChevronRight} size="sm" variant="secondary" onClick={handleNextMonth}>Next</Btn>
        </div>
      </div>

      {/* Legend */}
      <div className="flex flex-wrap gap-4 px-1">
        {Object.entries(statusColors).map(([status, color]) => (
          <div key={status} className="flex items-center gap-2">
            <div className="w-3 h-3 rounded-sm" style={{ background: color }} />
            <span className="text-xs capitalize" style={{ color: BRAND.lightBlue }}>{status}</span>
          </div>
        ))}
      </div>

      <div className="rounded-xl overflow-hidden" style={{ background: `${BRAND.accentBlue}40`, border: `1px solid ${BRAND.glassBorder}` }}>
        {/* Day headers */}
        <div className="grid grid-cols-7">
          {["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].map((day) => (
            <div key={day} className="text-center text-xs font-semibold py-2 uppercase tracking-wider" style={{ color: BRAND.primary, borderBottom: `1px solid ${BRAND.glassBorder}` }}>
              {day}
            </div>
          ))}
        </div>

        {/* Calendar rows */}
        {rows.map((week, rowIdx) => {
          const barsInRow = eventBarsByRow[rowIdx];
          const barHeight = 22;
          const barGap = 2;
          const barsAreaHeight = barsInRow.length > 0 ? barsInRow.length * (barHeight + barGap) + 4 : 0;
          const minCellHeight = 80;
          const cellHeight = Math.max(minCellHeight, 32 + barsAreaHeight);

          return (
            <div key={rowIdx} className="relative" style={{ minHeight: cellHeight }}>
              {/* Day number row */}
              <div className="grid grid-cols-7">
                {week.map((dayNum, colIdx) => {
                  const isToday = dayNum && new Date().getFullYear() === currentDate.getFullYear() && new Date().getMonth() === currentDate.getMonth() && new Date().getDate() === dayNum;
                  return (
                    <div
                      key={colIdx}
                      onClick={() => {
                        if (dayNum) {
                          setSelectedDay(new Date(currentDate.getFullYear(), currentDate.getMonth(), dayNum));
                          setViewMode("day");
                        }
                      }}
                      className={`cursor-pointer transition hover:bg-white/5`}
                      style={{
                        minHeight: cellHeight,
                        borderRight: colIdx < 6 ? `1px solid ${BRAND.accentBlue}` : "none",
                        borderBottom: rowIdx < rows.length - 1 ? `1px solid ${BRAND.accentBlue}` : "none",
                        background: dayNum ? (isToday ? "rgba(84,205,249,0.08)" : "transparent") : "rgba(0,0,0,0.15)",
                      }}
                    >
                      <div className="px-2 pt-1">
                        {dayNum && (
                          <span className={`text-xs font-semibold ${isToday ? "inline-flex items-center justify-center w-6 h-6 rounded-full" : ""}`}
                            style={{
                              color: isToday ? "#fff" : dayNum ? BRAND.text : "transparent",
                              background: isToday ? BRAND.primary : "transparent",
                            }}>
                            {dayNum}
                          </span>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Event spanning bars overlay */}
              {barsInRow.map((bar, barIdx) => {
                const color = statusColors[bar.event.status] || BRAND.primary;
                const venueNames = getVenueNames(bar.event.id);
                const dayStr = `${currentDate.getFullYear()}-${String(currentDate.getMonth() + 1).padStart(2, "0")}-${String(bar.startDay).padStart(2, "0")}`;
                const staffCount = getStaffCount(bar.event.id, dayStr);
                const colWidth = 100 / 7;
                const left = `${bar.startCol * colWidth}%`;
                const width = `${(bar.endCol - bar.startCol + 1) * colWidth}%`;
                const top = 28 + barIdx * (barHeight + barGap);
                const isStart = bar.event.start_date >= monthStart ? (bar.startDay === new Date(bar.event.start_date + "T00:00:00").getDate()) : (bar.startCol === 0);
                const isEnd = bar.event.end_date <= monthEnd ? (bar.endDay === new Date(bar.event.end_date + "T00:00:00").getDate()) : (bar.endCol === 6);

                return (
                  <div
                    key={`${bar.event.id}-${rowIdx}`}
                    className="absolute flex items-center gap-1 overflow-hidden cursor-pointer transition-opacity hover:opacity-90"
                    onClick={(e) => {
                      e.stopPropagation();
                      setSelectedDay(new Date(currentDate.getFullYear(), currentDate.getMonth(), bar.startDay));
                      setViewMode("day");
                    }}
                    title={`${bar.event.name}${venueNames.length > 0 ? " — " + venueNames.join(", ") : ""}${staffCount > 0 ? " — " + staffCount + " staff" : ""}`}
                    style={{
                      position: "absolute",
                      left,
                      width,
                      top,
                      height: barHeight,
                      background: `${color}30`,
                      borderLeft: isStart ? `3px solid ${color}` : "none",
                      borderRadius: `${isStart ? "4px" : "0"} ${isEnd ? "4px" : "0"} ${isEnd ? "4px" : "0"} ${isStart ? "4px" : "0"}`,
                      paddingLeft: isStart ? 6 : 4,
                      paddingRight: 4,
                      zIndex: 10,
                    }}
                  >
                    <span className="text-xs font-semibold truncate" style={{ color, lineHeight: `${barHeight}px` }}>
                      {bar.event.name}
                    </span>
                    <span className="text-xs truncate flex-shrink-0 hidden sm:inline" style={{ color: `${color}99`, lineHeight: `${barHeight}px` }}>
                      {typeLabels[bar.event.event_type] || ""}
                    </span>
                    {venueNames.length > 0 && (
                      <span className="text-xs truncate hidden md:inline" style={{ color: BRAND.textLight, lineHeight: `${barHeight}px` }}>
                        📍{venueNames[0]}
                      </span>
                    )}
                    {staffCount > 0 && (
                      <span className="text-xs flex-shrink-0 hidden lg:inline" style={{ color: BRAND.textLight, lineHeight: `${barHeight}px` }}>
                        👥{staffCount}
                      </span>
                    )}
                  </div>
                );
              })}
            </div>
          );
        })}
      </div>
    </div>
  );
};

// ============================================================================
// PAGES: SHIFT BUILDER
// ============================================================================

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
            <p className="text-sm" style={{ color: BRAND.textMuted }}>
              No roles defined for this event
            </p>
          ) : (
            <div className="space-y-2">
              {eventRoles.map((role) => (
                <div key={role.id} className="p-2 rounded-lg" style={{ background: BRAND.accentBlue }}>
                  <p className="text-sm font-medium" style={{ color: BRAND.text }}>
                    {role.role_name}
                  </p>
                  <p className="text-xs" style={{ color: BRAND.textMuted }}>
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
                  style={{ background: BRAND.accentBlue }}
                >
                  <div>
                    <p className="font-medium text-sm" style={{ color: BRAND.text }}>
                      {employee?.first_name} {employee?.last_name}
                    </p>
                    <p className="text-xs" style={{ color: BRAND.textMuted }}>
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
              style={{ background: BRAND.accentBlue }}
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

const RoleRequirementsPage = ({ events = [], shifts = [], locations = [], employees = [], roleRequirements = [], onRefresh }) => {
  const [selectedEvent, setSelectedEvent] = useState(events[0]?.id || "");
  const [roles, setRoles] = useState([]);
  const [showAddRole, setShowAddRole] = useState(false);
  const [showRoleManager, setShowRoleManager] = useState(false);
  const [editingRole, setEditingRole] = useState(null);
  const [editForm, setEditForm] = useState({ role_name: "", qty_needed: 1 });
  const [newRole, setNewRole] = useState({ role_name: "", quantity_needed: 1 });
  const [customRoleName, setCustomRoleName] = useState("");
  const [customRoleDesc, setCustomRoleDesc] = useState("");
  const [editingDef, setEditingDef] = useState(null);
  const [editDefName, setEditDefName] = useState("");
  const [editDefDesc, setEditDefDesc] = useState("");

  // Role definitions: stored in localStorage, synced with predefined defaults
  const DEFAULT_ROLE_DEFS = [
    { name: "Sales Lead", description: "Leads the sales team at booth. Handles customer interactions, upselling, and oversees cash handling." },
    { name: "Cashier", description: "Processes all transactions. Manages POS terminal, handles cash and card payments, provides receipts." },
    { name: "Stock Runner", description: "Keeps booth stocked. Moves inventory from storage to display, tracks what's selling fast." },
    { name: "Setup Crew", description: "Handles event setup and teardown. Assembles displays, signage, and ensures booth is show-ready." },
    { name: "Team Lead", description: "Oversees entire booth operation. Manages staff breaks, resolves issues, reports to admin." },
  ];

  const [roleDefs, setRoleDefs] = useState(() => {
    try {
      const saved = localStorage.getItem("collide_role_definitions");
      return saved ? JSON.parse(saved) : DEFAULT_ROLE_DEFS;
    } catch { return DEFAULT_ROLE_DEFS; }
  });

  useEffect(() => {
    localStorage.setItem("collide_role_definitions", JSON.stringify(roleDefs));
  }, [roleDefs]);

  useEffect(() => {
    const eventRoles = roleRequirements.filter((r) => r.event_id === selectedEvent);
    setRoles(eventRoles);
  }, [selectedEvent, roleRequirements]);

  const getRoleDesc = (name) => {
    const def = roleDefs.find(d => d.name === name);
    return def?.description || "";
  };

  // --- Role Definition CRUD ---
  const handleAddRoleDef = () => {
    if (!customRoleName.trim()) return;
    if (roleDefs.some(d => d.name.toLowerCase() === customRoleName.trim().toLowerCase())) {
      alert("A role with this name already exists");
      return;
    }
    setRoleDefs(prev => [...prev, { name: customRoleName.trim(), description: customRoleDesc.trim() }]);
    setCustomRoleName("");
    setCustomRoleDesc("");
  };

  const handleDeleteRoleDef = (name) => {
    if (!confirm(`Delete the "${name}" role definition? This won't remove it from existing event requirements.`)) return;
    setRoleDefs(prev => prev.filter(d => d.name !== name));
  };

  const handleStartEditDef = (def) => {
    setEditingDef(def.name);
    setEditDefName(def.name);
    setEditDefDesc(def.description);
  };

  const handleSaveEditDef = (originalName) => {
    if (!editDefName.trim()) return;
    if (editDefName.trim() !== originalName && roleDefs.some(d => d.name.toLowerCase() === editDefName.trim().toLowerCase())) {
      alert("A role with this name already exists");
      return;
    }
    setRoleDefs(prev => prev.map(d => d.name === originalName ? { name: editDefName.trim(), description: editDefDesc.trim() } : d));
    setEditingDef(null);
  };

  // --- Event Role Requirement CRUD ---
  const handleAddRole = async () => {
    if (!selectedEvent) { alert("Please select an event first"); return; }
    if (!newRole.role_name || newRole.quantity_needed <= 0) { alert("Please provide a role name and quantity"); return; }
    const { error } = await supabase.from("role_requirements").insert({
      event_id: selectedEvent,
      role_name: newRole.role_name,
      qty_needed: newRole.quantity_needed,
      date: new Date().toISOString().split("T")[0],
    });
    if (error) { alert("Failed to add role: " + (error.message || "Unknown error")); return; }
    setNewRole({ role_name: roleDefs[0]?.name || "", quantity_needed: 1 });
    setShowAddRole(false);
    if (onRefresh) await onRefresh();
  };

  const handleRemoveRole = async (id) => {
    if (!confirm("Remove this role requirement?")) return;
    await supabase.from("role_requirements").delete().eq("id", id);
    if (onRefresh) await onRefresh();
  };

  const handleStartEdit = (role) => {
    setEditingRole(role.id);
    setEditForm({ role_name: role.role_name, qty_needed: role.qty_needed });
  };

  const handleSaveEdit = async (id) => {
    if (!editForm.role_name || editForm.qty_needed <= 0) return;
    await supabase.from("role_requirements").update({
      role_name: editForm.role_name,
      qty_needed: editForm.qty_needed,
    }).eq("id", id);
    setEditingRole(null);
    if (onRefresh) await onRefresh();
  };

  const totalNeeded = roles.reduce((sum, r) => sum + r.qty_needed, 0);
  const eventShifts = shifts.filter(s => s.event_id === selectedEvent);
  const totalAssigned = new Set(eventShifts.map(s => s.employee_id)).size;
  const totalUnfilled = Math.max(0, totalNeeded - totalAssigned);

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold" style={{ color: BRAND.text }}>Role Requirements</h1>
        <Btn icon={Settings} variant="ghost" size="sm" onClick={() => setShowRoleManager(!showRoleManager)}>
          {showRoleManager ? "Close" : "Manage Roles"}
        </Btn>
      </div>

      {/* ========== ROLE DEFINITIONS MANAGER ========== */}
      {showRoleManager && (
        <SectionCard title="Role Definitions" icon={Settings}>
          <p className="text-xs mb-3" style={{ color: BRAND.textLight }}>
            Create, edit, or delete role types. These appear in the dropdown when adding roles to events. Descriptions help staff understand what each role involves.
          </p>
          <div className="space-y-2">
            {roleDefs.map((def) => (
              <div key={def.name} className="p-3 rounded-lg" style={{ background: BRAND.accentBlue, border: `1px solid ${BRAND.glassBorder}` }}>
                {editingDef === def.name ? (
                  <div className="space-y-2">
                    <Input label="Role Name" value={editDefName} onChange={(e) => setEditDefName(e.target.value)} />
                    <div>
                      <label className="block text-xs font-medium mb-1" style={{ color: BRAND.lightBlue }}>Description</label>
                      <textarea
                        value={editDefDesc}
                        onChange={(e) => setEditDefDesc(e.target.value)}
                        rows={2}
                        className="w-full rounded-lg px-3 py-2 text-sm"
                        style={{ background: BRAND.accentBlue, border: `1px solid ${BRAND.glassBorder}`, color: BRAND.text, resize: "vertical" }}
                        placeholder="What does this role do?"
                      />
                    </div>
                    <div className="flex gap-2">
                      <Btn variant="primary" size="sm" onClick={() => handleSaveEditDef(def.name)}>Save</Btn>
                      <Btn variant="secondary" size="sm" onClick={() => setEditingDef(null)}>Cancel</Btn>
                    </div>
                  </div>
                ) : (
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-sm" style={{ color: BRAND.text }}>{def.name}</p>
                      {def.description && (
                        <p className="text-xs mt-0.5" style={{ color: BRAND.textLight }}>{def.description}</p>
                      )}
                    </div>
                    <div className="flex gap-1 shrink-0">
                      <Btn icon={Edit2} size="sm" variant="ghost" onClick={() => handleStartEditDef(def)} />
                      <Btn icon={Trash2} size="sm" variant="danger" onClick={() => handleDeleteRoleDef(def.name)} />
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>

          {/* Add new role definition */}
          <div className="mt-3 p-3 rounded-lg space-y-2" style={{ background: "rgba(84,205,249,0.05)", border: `1px dashed ${BRAND.primary}40` }}>
            <p className="text-xs font-medium" style={{ color: BRAND.primary }}>Add Custom Role</p>
            <Input label="Role Name" value={customRoleName} onChange={(e) => setCustomRoleName(e.target.value)} placeholder="e.g. Brand Ambassador" />
            <div>
              <label className="block text-xs font-medium mb-1" style={{ color: BRAND.lightBlue }}>Description</label>
              <textarea
                value={customRoleDesc}
                onChange={(e) => setCustomRoleDesc(e.target.value)}
                rows={2}
                className="w-full rounded-lg px-3 py-2 text-sm"
                style={{ background: BRAND.accentBlue, border: `1px solid ${BRAND.glassBorder}`, color: BRAND.text, resize: "vertical" }}
                placeholder="Describe what this role does at events..."
              />
            </div>
            <Btn icon={Plus} variant="primary" size="sm" onClick={handleAddRoleDef} disabled={!customRoleName.trim()}>
              Add Role Type
            </Btn>
          </div>
        </SectionCard>
      )}

      {/* ========== EVENT SELECTOR ========== */}
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

      {/* ========== STATS ========== */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <StatCard icon={Users} label="Total Roles" value={roles.length} color="primary" />
        <StatCard icon={Briefcase} label="Total Needed" value={totalNeeded} color="primary" />
        <StatCard icon={AlertCircle} label="Unfilled" value={totalUnfilled} color={totalUnfilled > 0 ? "danger" : "success"} />
      </div>

      {/* ========== ROLE BREAKDOWN ========== */}
      <SectionCard title="Role Breakdown" icon={Briefcase}>
        {roles.length === 0 ? (
          <EmptyState title="No roles defined" message="Add roles for this event using the form below" />
        ) : (
          <div className="space-y-3">
            {roles.map((role) => {
              const roleShifts = eventShifts.filter(s => s.role === role.role_name);
              const filled = roleShifts.length;
              const fillPct = role.qty_needed > 0 ? (filled / role.qty_needed) * 100 : 0;
              const statusColor = fillPct >= 80 ? BRAND.success : fillPct >= 50 ? BRAND.warning : BRAND.danger;
              const desc = getRoleDesc(role.role_name);

              if (editingRole === role.id) {
                return (
                  <div key={role.id} className="p-3 rounded-lg space-y-2" style={{ background: `${BRAND.accentBlue}80`, border: `1px solid ${BRAND.primary}40` }}>
                    <Select
                      label="Role"
                      value={editForm.role_name}
                      onChange={(e) => setEditForm({ ...editForm, role_name: e.target.value })}
                      options={roleDefs.map((d) => ({ value: d.name, label: d.name }))}
                    />
                    <Input
                      label="Quantity Needed"
                      type="number"
                      value={editForm.qty_needed}
                      onChange={(e) => setEditForm({ ...editForm, qty_needed: parseInt(e.target.value) || 1 })}
                      min="1"
                    />
                    <div className="flex gap-2">
                      <Btn variant="primary" size="sm" onClick={() => handleSaveEdit(role.id)}>Save</Btn>
                      <Btn variant="secondary" size="sm" onClick={() => setEditingRole(null)}>Cancel</Btn>
                    </div>
                  </div>
                );
              }

              return (
                <div key={role.id} className="space-y-2 p-3 rounded-lg" style={{ background: BRAND.accentBlue }}>
                  <div className="flex justify-between items-start">
                    <div className="flex-1 min-w-0">
                      <p className="font-medium" style={{ color: BRAND.text }}>{role.role_name}</p>
                      {desc && <p className="text-xs mt-0.5" style={{ color: "rgba(224,230,255,0.45)" }}>{desc}</p>}
                      <p className="text-xs mt-1" style={{ color: BRAND.textMuted }}>{filled}/{role.qty_needed} filled</p>
                    </div>
                    <div className="flex gap-1 shrink-0">
                      <Btn icon={Edit2} size="sm" variant="ghost" onClick={() => handleStartEdit(role)} />
                      <Btn icon={Trash2} size="sm" variant="danger" onClick={() => handleRemoveRole(role.id)} />
                    </div>
                  </div>
                  <div className="h-2 rounded-full overflow-hidden" style={{ background: BRAND.accentBlue }}>
                    <div className="h-full transition-all" style={{ width: `${fillPct}%`, background: statusColor }} />
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* ADD ROLE TO EVENT */}
        <div className="mt-4">
          {showAddRole && (
            <div className="p-4 rounded-lg space-y-3 mb-3" style={{ background: BRAND.accentBlue }}>
              <Select
                label="Role Name"
                value={newRole.role_name}
                onChange={(e) => setNewRole({ ...newRole, role_name: e.target.value })}
                options={roleDefs.map((d) => ({ value: d.name, label: d.name }))}
              />
              {newRole.role_name && getRoleDesc(newRole.role_name) && (
                <p className="text-xs px-1" style={{ color: "rgba(224,230,255,0.45)" }}>
                  {getRoleDesc(newRole.role_name)}
                </p>
              )}
              <Input
                label="Quantity Needed"
                type="number"
                value={newRole.quantity_needed}
                onChange={(e) => setNewRole({ ...newRole, quantity_needed: parseInt(e.target.value) || 1 })}
                min="1"
              />
              <div className="flex gap-2">
                <Btn onClick={handleAddRole} variant="primary" size="sm">Add Role</Btn>
                <Btn onClick={() => setShowAddRole(false)} variant="secondary" size="sm">Cancel</Btn>
              </div>
            </div>
          )}
          {!showAddRole && (
            <Btn icon={Plus} onClick={() => { setShowAddRole(true); setNewRole({ role_name: roleDefs[0]?.name || "", quantity_needed: 1 }); }} variant="primary" className="w-full">
              Add Role
            </Btn>
          )}
        </div>
      </SectionCard>
    </div>
  );
};

// ============================================================================
// PAGES: SHIFTS & ROLES
// ============================================================================

const ShiftsRolesPage = ({ events = [], employees = [], shifts = [], locations = [], roleRequirements = [], onRefresh }) => {
  const [activeTab, setActiveTab] = useState("shifts"); // shifts | roles

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between flex-wrap gap-4">
        <h1 className="text-2xl font-bold" style={{ color: BRAND.text }}>Shifts & Roles</h1>
        <div className="flex gap-2">
          {[{ id: "shifts", label: "Shift Builder", icon: Briefcase }, { id: "roles", label: "Role Requirements", icon: Users }].map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className="flex items-center gap-1.5 px-4 py-2 rounded-lg text-sm font-medium transition"
              style={{
                background: activeTab === tab.id ? `${BRAND.primary}20` : BRAND.accentBlue,
                color: activeTab === tab.id ? BRAND.primary : "rgba(224,230,255,0.7)",
                border: `1px solid ${activeTab === tab.id ? BRAND.primary : BRAND.glassBorder}`,
              }}
            >
              <tab.icon size={15} />
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {activeTab === "shifts" ? (
        <ShiftBuilderPage events={events} employees={employees} shifts={shifts} locations={locations} roleRequirements={roleRequirements} onRefresh={onRefresh} />
      ) : (
        <RoleRequirementsPage events={events} shifts={shifts} locations={locations} employees={employees} roleRequirements={roleRequirements} onRefresh={onRefresh} />
      )}
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
        <p style={{ color: BRAND.lightBlue }}>
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
                  <p className="text-xs" style={{ color: BRAND.textMuted }}>
                    {emp.email}
                  </p>
                </div>
              </div>

              {emp.phone && (
                <p className="text-xs mb-2" style={{ color: BRAND.textMuted }}>
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
          <p style={{ color: BRAND.lightBlue }}>
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
                <p className="text-sm text-center py-4" style={{ color: BRAND.textMuted }}>
                  No skills added
                </p>
              ) : (
                <div className="space-y-2">
                  {empSkills.map((es) => (
                    <div
                      key={es.id}
                      className="flex items-center justify-between p-2 rounded-lg"
                      style={{ background: BRAND.accentBlue }}
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

// ============================================================================
// PAGES: DIRECTORY & SKILLS (MERGED)
// ============================================================================

const DirectorySkillsPage = ({ employees = [], employeeSkills = [], skills = [], onRefresh }) => {
  const [activeTab, setActiveTab] = useState("directory"); // directory | skills | by-role

  // Group employees by role for the "By Role" tab
  const employeesByRole = useMemo(() => {
    const groups = {};
    employees.forEach(emp => {
      const role = emp.role || "unassigned";
      if (!groups[role]) groups[role] = [];
      groups[role].push(emp);
    });
    return groups;
  }, [employees]);

  // Group employees by skill for the "By Skill" tab
  const employeesBySkill = useMemo(() => {
    const groups = {};
    skills.forEach(sk => {
      const empsWithSkill = employeeSkills
        .filter(es => es.skill_id === sk.id)
        .map(es => employees.find(e => e.id === es.employee_id))
        .filter(Boolean);
      if (empsWithSkill.length > 0) groups[sk.name] = empsWithSkill;
    });
    return groups;
  }, [employees, employeeSkills, skills]);

  // A-Z sorted employees
  const sortedEmployees = useMemo(() => {
    return [...employees].sort((a, b) => {
      const nameA = (a.name || `${a.first_name || ""} ${a.last_name || ""}`.trim()).toLowerCase();
      const nameB = (b.name || `${b.first_name || ""} ${b.last_name || ""}`.trim()).toLowerCase();
      return nameA.localeCompare(nameB);
    });
  }, [employees]);

  const tabDefs = [
    { id: "directory", label: "A to Z", icon: Users },
    { id: "skills", label: "By Skill", icon: Tag },
    { id: "by-role", label: "By Role", icon: Briefcase },
  ];

  return (
    <div className="space-y-4">
      <div className="space-y-5">
        <h1 className="text-2xl font-bold" style={{ color: BRAND.navy }}>Employees</h1>
        <div className="grid grid-cols-3 gap-0 rounded-xl overflow-hidden" style={{ border: `2px solid ${BRAND.accentBlue}` }}>
          {tabDefs.map(tab => (
            <button key={tab.id} onClick={() => setActiveTab(tab.id)}
              className="flex items-center justify-center gap-2 py-4 text-sm font-bold uppercase tracking-wider transition-all"
              style={{
                background: activeTab === tab.id ? BRAND.navy : BRAND.white,
                color: activeTab === tab.id ? BRAND.white : BRAND.navy,
                borderRight: tab.id !== "by-role" ? `1px solid ${BRAND.accentBlue}` : "none",
              }}>
              <tab.icon size={18} /> {tab.label}
            </button>
          ))}
        </div>
      </div>

      {/* A to Z Directory — cards with skills on left, role on right */}
      {activeTab === "directory" && (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3">
          {sortedEmployees.map(emp => {
            const empSkills = employeeSkills.filter(es => es.employee_id === emp.id).map(es => skills.find(s => s.id === es.skill_id)?.name).filter(Boolean);
            const empName = emp.name || `${emp.first_name || ""} ${emp.last_name || ""}`.trim();
            const empRole = emp.role === "team_lead" ? "Team Lead" : emp.role || "—";
            return (
              <div key={emp.id} className="rounded-xl p-4 flex items-start gap-3 transition hover:shadow-md"
                style={{ background: BRAND.white, border: `2px solid ${BRAND.accentBlue}` }}>
                <div className="w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0" style={{ background: BRAND.navy }}>
                  <User size={18} style={{ color: BRAND.white }} />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <div className="font-semibold text-sm" style={{ color: BRAND.navy }}>{empName}</div>
                      <div className="text-xs mt-0.5" style={{ color: BRAND.lightBlue }}>{emp.email}</div>
                    </div>
                    <span className="flex-shrink-0 px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wide"
                      style={{ background: emp.role === "admin" ? `${BRAND.primary}20` : emp.role === "team_lead" ? "rgba(251,191,36,0.15)" : "rgba(74,222,128,0.15)",
                        color: emp.role === "admin" ? BRAND.navy : emp.role === "team_lead" ? "#b8860b" : "#2d8a4e" }}>
                      {empRole}
                    </span>
                  </div>
                  {empSkills.length > 0 && (
                    <div className="flex flex-wrap gap-1 mt-2">
                      {empSkills.map(sk => (
                        <span key={sk} className="px-2 py-0.5 rounded-full text-[10px] font-semibold" style={{ background: `${BRAND.primary}15`, color: BRAND.navy }}>{sk}</span>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* By Skill — grouped like By Role format */}
      {activeTab === "skills" && (
        <div className="space-y-4">
          {Object.keys(employeesBySkill).length === 0 ? (
            <div className="text-center py-8">
              <Tag size={32} style={{ color: BRAND.lightBlue, margin: "0 auto 8px" }} />
              <p className="text-sm font-medium" style={{ color: BRAND.navy }}>No skill assignments yet</p>
              <p className="text-xs mt-1" style={{ color: BRAND.lightBlue }}>Assign skills to employees to see them grouped here.</p>
            </div>
          ) : Object.entries(employeesBySkill).sort(([a], [b]) => a.localeCompare(b)).map(([skillName, emps]) => (
            <div key={skillName} className="rounded-2xl overflow-hidden" style={{ border: `2px solid ${BRAND.accentBlue}` }}>
              <div className="px-5 py-3 flex items-center gap-2" style={{ background: `${BRAND.accentBlue}60` }}>
                <Tag size={16} style={{ color: BRAND.navy }} />
                <span className="font-bold text-sm uppercase tracking-wider" style={{ color: BRAND.navy }}>{skillName}</span>
                <Badge color="primary">{emps.length}</Badge>
              </div>
              <div className="divide-y" style={{ borderColor: BRAND.accentBlue }}>
                {emps.map(emp => {
                  const empRole = emp.role === "team_lead" ? "Team Lead" : emp.role || "—";
                  return (
                    <div key={emp.id} className="px-5 py-3 flex items-center gap-4 hover:bg-blue-50 transition">
                      <div className="w-9 h-9 rounded-full flex items-center justify-center flex-shrink-0" style={{ background: BRAND.navy }}>
                        <User size={16} style={{ color: BRAND.white }} />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="font-semibold text-sm" style={{ color: BRAND.navy }}>{emp.name || `${emp.first_name || ""} ${emp.last_name || ""}`.trim()}</div>
                        <div className="text-xs" style={{ color: BRAND.lightBlue }}>{emp.email}</div>
                      </div>
                      <span className="flex-shrink-0 px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wide"
                        style={{ background: emp.role === "admin" ? `${BRAND.primary}20` : emp.role === "team_lead" ? "rgba(251,191,36,0.15)" : "rgba(74,222,128,0.15)",
                          color: emp.role === "admin" ? BRAND.navy : emp.role === "team_lead" ? "#b8860b" : "#2d8a4e" }}>
                        {empRole}
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* By Role — grouped cards */}
      {activeTab === "by-role" && (
        <div className="space-y-4">
          {Object.entries(employeesByRole).sort(([a], [b]) => a.localeCompare(b)).map(([role, emps]) => (
            <div key={role} className="rounded-2xl overflow-hidden" style={{ border: `2px solid ${BRAND.accentBlue}` }}>
              <div className="px-5 py-3 flex items-center gap-2" style={{ background: `${BRAND.accentBlue}60` }}>
                <Briefcase size={16} style={{ color: BRAND.navy }} />
                <span className="font-bold text-sm uppercase tracking-wider" style={{ color: BRAND.navy }}>{role === "team_lead" ? "Team Lead" : role}</span>
                <Badge color="primary">{emps.length}</Badge>
              </div>
              <div className="divide-y" style={{ borderColor: BRAND.accentBlue }}>
                {emps.map(emp => {
                  const empSkills = employeeSkills.filter(es => es.employee_id === emp.id).map(es => skills.find(s => s.id === es.skill_id)?.name).filter(Boolean);
                  return (
                    <div key={emp.id} className="px-5 py-3 flex items-center gap-4 hover:bg-blue-50 transition">
                      <div className="w-9 h-9 rounded-full flex items-center justify-center flex-shrink-0" style={{ background: BRAND.navy }}>
                        <User size={16} style={{ color: BRAND.white }} />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="font-semibold text-sm" style={{ color: BRAND.navy }}>{emp.name || `${emp.first_name || ""} ${emp.last_name || ""}`.trim()}</div>
                        <div className="text-xs" style={{ color: BRAND.lightBlue }}>{emp.email}</div>
                      </div>
                      {empSkills.length > 0 && (
                        <div className="flex flex-wrap gap-1">
                          {empSkills.slice(0, 3).map(sk => (
                            <span key={sk} className="px-2 py-0.5 rounded-full text-[10px] font-semibold" style={{ background: `${BRAND.primary}15`, color: BRAND.navy }}>{sk}</span>
                          ))}
                          {empSkills.length > 3 && <span className="text-[10px]" style={{ color: BRAND.lightBlue }}>+{empSkills.length - 3}</span>}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

// ============================================================================
// PAGES: EVENTS (Combined Calendar & List View)
// ============================================================================

const EventsPage = ({ events = [], employees = [], shifts = [], locations = [], venues = [], eventVenues = [], availability = {}, employeeSkills = [], skills = [], roleRequirements = [], onRefresh }) => {
  const [viewMode, setViewMode] = useState("events"); // events | shifts
  const [expandedEvents, setExpandedEvents] = useState(new Set());

  const toggleEventExpand = (eventId) => {
    const next = new Set(expandedEvents);
    if (next.has(eventId)) next.delete(eventId);
    else next.add(eventId);
    setExpandedEvents(next);
  };

  const now = new Date().toISOString().split("T")[0];
  const sortedEvents = useMemo(() => [...events].sort((a, b) => a.start_date.localeCompare(b.start_date)), [events]);

  return (
    <div className="space-y-4">
      {/* View toggle */}
      <div className="flex gap-2">
        {[{ id: "events", label: "Calendar View", icon: Calendar }, { id: "shifts", label: "Event View", icon: List }].map(v => (
          <button key={v.id} onClick={() => setViewMode(v.id)}
            className="flex items-center gap-1.5 px-4 py-2 rounded-full text-sm font-semibold transition"
            style={{ background: viewMode === v.id ? BRAND.navy : BRAND.accentBlue, color: viewMode === v.id ? BRAND.white : BRAND.navy }}>
            <v.icon size={15} /> {v.label}
          </button>
        ))}
      </div>

      {/* Calendar View = Calendar at top + Event list below */}
      {viewMode === "events" && (
        <div className="space-y-6">
          <CalendarViewPage events={events} employees={employees} shifts={shifts} locations={locations} availability={availability} employeeSkills={employeeSkills} skills={skills} venues={venues} eventVenues={eventVenues} />
          <EventsManagementPage events={events} locations={locations} venues={venues} eventVenues={eventVenues} onRefresh={onRefresh} />
        </div>
      )}

      {/* Event View = Events with shifts as expandable sub-items */}
      {viewMode === "shifts" && (
        <div className="space-y-2">
          {sortedEvents.length === 0 ? (
            <EmptyState icon={Calendar} title="No events" message="Create events to see shifts here" />
          ) : sortedEvents.map(event => {
            const eventShifts = shifts.filter(s => s.event_id === event.id);
            const isExpanded = expandedEvents.has(event.id);
            const isPast = event.end_date < now;
            return (
              <div key={event.id} className="rounded-xl overflow-hidden" style={{ border: `2px solid ${BRAND.accentBlue}`, opacity: isPast ? 0.6 : 1 }}>
                <button onClick={() => toggleEventExpand(event.id)}
                  className="w-full flex items-center gap-3 px-4 py-3 text-left transition hover:bg-blue-50"
                  style={{ background: isExpanded ? `${BRAND.accentBlue}` : BRAND.white }}>
                  <ChevronDown size={16} style={{ color: BRAND.navy, transform: isExpanded ? "rotate(0)" : "rotate(-90deg)", transition: "transform 0.2s" }} />
                  <div className="flex-1 min-w-0">
                    <div className="font-semibold text-sm" style={{ color: BRAND.navy }}>{event.name}</div>
                    <div className="text-xs" style={{ color: BRAND.lightBlue }}>{event.start_date} — {event.end_date}</div>
                  </div>
                  <Badge color={isPast ? "gray" : "primary"}>{eventShifts.length} shift{eventShifts.length !== 1 ? "s" : ""}</Badge>
                </button>
                {isExpanded && (
                  <div className="border-t" style={{ borderColor: BRAND.accentBlue }}>
                    {eventShifts.length === 0 ? (
                      <div className="px-6 py-3 text-sm" style={{ color: BRAND.lightBlue }}>No shifts created for this event.</div>
                    ) : eventShifts.map(shift => {
                      const emp = employees.find(e => e.id === shift.employee_id);
                      return (
                        <div key={shift.id} className="flex items-center gap-3 px-6 py-2.5 text-sm hover:bg-blue-50 transition" style={{ borderBottom: `1px solid ${BRAND.accentBlue}` }}>
                          <div className="w-2 h-2 rounded-full flex-shrink-0" style={{ background: emp ? BRAND.success : BRAND.danger }}></div>
                          <span className="font-medium" style={{ color: BRAND.navy }}>{shift.role || "Unspecified"}</span>
                          <span style={{ color: BRAND.lightBlue }}>—</span>
                          <span style={{ color: emp ? BRAND.navy : BRAND.danger }}>{emp ? (emp.name || `${emp.first_name} ${emp.last_name}`) : "Unassigned"}</span>
                          <span className="ml-auto text-xs" style={{ color: BRAND.lightBlue }}>{shift.shift_date || "No date"}</span>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};

// ============================================================================
// PAGES: STAFFING (bookings + availability + claimed/unclaimed roles)
// ============================================================================

const StaffingPage = ({ events = [], employees = [], shifts = [], locations = [], availability: parentAvailability = {}, roleRequirements = [], onRefresh, user, currentRole, venues = [], eventVenues = [] }) => {
  const now = new Date();
  const today = now.toISOString().split("T")[0];

  // Build 14-day calendar grid
  const calendarDays = useMemo(() => {
    const days = [];
    for (let i = 0; i < 14; i++) {
      const d = new Date(now);
      d.setDate(d.getDate() + i);
      const dateStr = d.toISOString().split("T")[0];
      const dayEvents = events.filter(e => e.start_date <= dateStr && e.end_date >= dateStr);
      const hasVacancy = dayEvents.some(ev => {
        const evReqs = roleRequirements.filter(r => r.event_id === ev.id);
        const evShifts = shifts.filter(s => s.event_id === ev.id && s.employee_id);
        const totalNeeded = evReqs.reduce((sum, r) => sum + (r.qty_needed || 1), 0);
        return evShifts.length < totalNeeded;
      });
      days.push({ date: d, dateStr, dayEvents, hasVacancy, hasEvents: dayEvents.length > 0 });
    }
    return days;
  }, [events, shifts, roleRequirements, now]);

  // Build unclaimed shifts list
  const unclaimedShifts = useMemo(() => {
    const result = [];
    const upcomingEvents = events.filter(e => e.end_date >= today).sort((a, b) => a.start_date.localeCompare(b.start_date));
    upcomingEvents.forEach(event => {
      const evReqs = roleRequirements.filter(r => r.event_id === event.id);
      const evShifts = shifts.filter(s => s.event_id === event.id && s.employee_id);
      const filledRoles = {};
      evShifts.forEach(s => { filledRoles[s.role] = (filledRoles[s.role] || 0) + 1; });
      evReqs.forEach(req => {
        const role = req.role_name || "Unspecified";
        const needed = req.qty_needed || 1;
        const filled = filledRoles[role] || 0;
        const open = needed - filled;
        if (open > 0) {
          const daysUntil = Math.max(0, Math.ceil((new Date(event.start_date) - now) / (1000 * 60 * 60 * 24)));
          const importance = daysUntil <= 3 ? "Critical" : daysUntil <= 7 ? "High" : daysUntil <= 14 ? "Medium" : "Acceptable";
          for (let i = 0; i < open; i++) {
            result.push({ id: `${event.id}-${role}-${i}`, eventName: event.name, role, date: event.start_date, daysUntil, importance, eventId: event.id });
          }
        }
      });
    });
    return result.sort((a, b) => a.daysUntil - b.daysUntil);
  }, [events, shifts, roleRequirements, today]);

  const dayNames = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
  const importanceColors = { Critical: BRAND.danger, High: "#f97316", Medium: BRAND.warning, Acceptable: BRAND.success };

  return (
    <div className="space-y-6">
      {/* 2-week calendar mini view */}
      <div className="rounded-2xl p-4" style={{ background: BRAND.white, border: `2px solid ${BRAND.accentBlue}` }}>
        <h3 className="text-sm font-bold uppercase tracking-wider mb-3" style={{ color: BRAND.navy }}>2-Week Staffing Overview</h3>
        <div className="grid grid-cols-7 gap-2">
          {dayNames.map(d => (
            <div key={d} className="text-center text-xs font-bold py-1" style={{ color: BRAND.lightBlue }}>{d}</div>
          ))}
          {/* Pad start to correct day of week */}
          {Array.from({ length: calendarDays[0]?.date.getDay() || 0 }).map((_, i) => (
            <div key={`pad-${i}`}></div>
          ))}
          {calendarDays.map(day => {
            const bg = !day.hasEvents ? BRAND.white : day.hasVacancy ? `${BRAND.danger}15` : `${BRAND.success}15`;
            const border = !day.hasEvents ? BRAND.accentBlue : day.hasVacancy ? BRAND.danger : BRAND.success;
            return (
              <div key={day.dateStr} className="rounded-lg p-2 text-center" style={{ background: bg, border: `2px solid ${border}`, minHeight: 48 }}>
                <div className="text-xs font-bold" style={{ color: BRAND.navy }}>{day.date.getDate()}</div>
                {day.dayEvents.length > 0 && (
                  <div className="text-[10px] font-medium mt-0.5 truncate" style={{ color: day.hasVacancy ? BRAND.danger : BRAND.success }}>
                    {day.dayEvents.length} event{day.dayEvents.length > 1 ? "s" : ""}
                  </div>
                )}
              </div>
            );
          })}
        </div>
        <div className="flex items-center gap-4 mt-3 text-xs">
          <span className="flex items-center gap-1"><span className="w-3 h-3 rounded" style={{ background: `${BRAND.danger}30`, border: `1px solid ${BRAND.danger}` }}></span><span style={{ color: BRAND.navy }}>Has vacancies</span></span>
          <span className="flex items-center gap-1"><span className="w-3 h-3 rounded" style={{ background: `${BRAND.success}30`, border: `1px solid ${BRAND.success}` }}></span><span style={{ color: BRAND.navy }}>Fully staffed</span></span>
        </div>
      </div>

      {/* Unclaimed shifts list */}
      <div className="rounded-2xl overflow-hidden" style={{ background: BRAND.white, border: `2px solid ${BRAND.accentBlue}` }}>
        <div className="px-5 py-3 flex items-center justify-between" style={{ background: `${BRAND.accentBlue}60` }}>
          <h3 className="text-sm font-bold uppercase tracking-wider" style={{ color: BRAND.navy }}>Unclaimed Shifts ({unclaimedShifts.length})</h3>
        </div>
        {unclaimedShifts.length === 0 ? (
          <div className="p-6 text-center">
            <Check size={32} style={{ color: BRAND.success, margin: "0 auto 8px" }} />
            <p className="text-sm font-medium" style={{ color: BRAND.navy }}>All shifts are assigned!</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr style={{ borderBottom: `2px solid ${BRAND.accentBlue}` }}>
                  <th className="text-left py-3 px-4 font-bold text-xs uppercase" style={{ color: BRAND.navy }}>Event</th>
                  <th className="text-left py-3 px-4 font-bold text-xs uppercase" style={{ color: BRAND.navy }}>Role</th>
                  <th className="text-left py-3 px-4 font-bold text-xs uppercase" style={{ color: BRAND.navy }}>Date</th>
                  <th className="text-center py-3 px-4 font-bold text-xs uppercase" style={{ color: BRAND.navy }}>Days Till</th>
                  <th className="text-center py-3 px-4 font-bold text-xs uppercase" style={{ color: BRAND.navy }}>Importance</th>
                </tr>
              </thead>
              <tbody>
                {unclaimedShifts.map(s => (
                  <tr key={s.id} className="hover:bg-blue-50 transition" style={{ borderBottom: `1px solid ${BRAND.accentBlue}` }}>
                    <td className="py-2.5 px-4 font-medium" style={{ color: BRAND.navy }}>{s.eventName}</td>
                    <td className="py-2.5 px-4" style={{ color: BRAND.navy }}>{s.role}</td>
                    <td className="py-2.5 px-4" style={{ color: BRAND.lightBlue }}>{s.date}</td>
                    <td className="py-2.5 px-4 text-center font-bold" style={{ color: s.daysUntil <= 3 ? BRAND.danger : BRAND.navy }}>{s.daysUntil}</td>
                    <td className="py-2.5 px-4 text-center">
                      <span className="px-2.5 py-1 rounded-full text-xs font-bold" style={{ background: `${importanceColors[s.importance]}20`, color: importanceColors[s.importance] }}>
                        {s.importance}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};

// ============================================================================
// PAGES: AVAILABILITY
// ============================================================================

const AvailabilityPage = ({ employees = [], events = [], availability: parentAvailability = {}, onRefresh, user, currentRole, venues = [], eventVenues = [] }) => {
  const [selectedEmployee, setSelectedEmployee] = useState("");
  const [availSlots, setAvailSlots] = useState({});
  const [saving, setSaving] = useState(false);
  const [saveMsg, setSaveMsg] = useState(null);

  const currentEmployee = useMemo(
    () => employees.find((e) => e.email === user?.email),
    [employees, user]
  );

  const isEmployeeOnly = currentRole === "employee";

  useEffect(() => {
    if (isEmployeeOnly && currentEmployee) {
      setSelectedEmployee(currentEmployee.id);
    } else if (!selectedEmployee && employees.length > 0) {
      setSelectedEmployee(employees[0].id);
    }
  }, [employees, currentEmployee, isEmployeeOnly]);

  const formatDate = (d) => typeof d === "string" ? d : d.toISOString().split("T")[0];
  const today = formatDate(new Date());

  // Get upcoming/active events sorted by start date
  const upcomingEvents = useMemo(() => {
    return events
      .filter(e => e.end_date >= today && e.status !== "cancelled")
      .sort((a, b) => a.start_date.localeCompare(b.start_date));
  }, [events, today]);

  // Build all unique dates from upcoming events
  const eventDateMap = useMemo(() => {
    const dateMap = {}; // date -> [{ event, venues }]
    upcomingEvents.forEach(evt => {
      const start = new Date(evt.start_date + "T00:00:00");
      const end = new Date(evt.end_date + "T00:00:00");
      for (let d = new Date(start); d <= end; d.setDate(d.getDate() + 1)) {
        const key = formatDate(d);
        if (!dateMap[key]) dateMap[key] = [];
        const evtVenueIds = eventVenues.filter(ev => ev.event_id === evt.id).map(ev => ev.venue_id);
        const evtVenues = venues.filter(v => evtVenueIds.includes(v.id));
        dateMap[key].push({ event: evt, venues: evtVenues });
      }
    });
    return dateMap;
  }, [upcomingEvents, venues, eventVenues]);

  const sortedDates = useMemo(() => Object.keys(eventDateMap).sort(), [eventDateMap]);

  // Load availability slots when employee changes
  useEffect(() => {
    if (!selectedEmployee) return;
    const empAvail = parentAvailability[selectedEmployee] || {};
    const slots = {};
    sortedDates.forEach(key => {
      slots[key] = empAvail[key] || "available";
    });
    setAvailSlots(slots);
  }, [selectedEmployee, sortedDates, parentAvailability]);

  const statusColors = {
    available: { bg: "rgba(74,222,128,0.2)", color: "#4ade80", label: "Available" },
    tentative: { bg: "rgba(251,191,36,0.2)", color: "#fbbf24", label: "Tentative" },
    unavailable: { bg: "rgba(244,67,54,0.2)", color: "#ef4444", label: "Unavailable" },
  };
  const statusCycle = ["available", "tentative", "unavailable"];

  const cycleStatus = (dateKey) => {
    setAvailSlots((prev) => {
      const current = prev[dateKey] || "available";
      const nextIdx = (statusCycle.indexOf(current) + 1) % statusCycle.length;
      return { ...prev, [dateKey]: statusCycle[nextIdx] };
    });
  };

  const handleSave = async () => {
    if (!selectedEmployee) return;
    setSaving(true);
    setSaveMsg(null);
    try {
      let token = null;
      try {
        const key = Object.keys(localStorage).find((k) => k.startsWith("sb-") && k.endsWith("-auth-token"));
        if (key) {
          const stored = JSON.parse(localStorage.getItem(key));
          token = stored?.access_token || null;
        }
      } catch (e) { /* ignore */ }
      if (!token) {
        setSaveMsg({ type: "error", text: "Session expired — please log in again." });
        return;
      }
      const rows = Object.entries(availSlots).map(([date, status]) => ({
        employee_id: selectedEmployee,
        avail_date: date,
        status,
      }));
      const res = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/rest/v1/employee_availability`,
        {
          method: "POST",
          headers: {
            Authorization: `Bearer ${token}`,
            apikey: import.meta.env.VITE_SUPABASE_ANON_KEY,
            "Content-Type": "application/json",
            Prefer: "resolution=merge-duplicates",
          },
          body: JSON.stringify(rows),
        }
      );
      if (!res.ok) {
        const errText = await res.text();
        setSaveMsg({ type: "error", text: "Failed to save: " + errText });
        return;
      }
      setSaveMsg({ type: "success", text: "Availability saved!" });
      if (onRefresh) await onRefresh();
    } catch (err) {
      setSaveMsg({ type: "error", text: "Failed to save: " + (err.message || "Unknown error") });
    } finally {
      setSaving(false);
    }
  };

  const dayNames = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

  // Group dates by event for a cleaner view
  const eventGroups = useMemo(() => {
    const groups = [];
    const seen = new Set();
    upcomingEvents.forEach(evt => {
      if (seen.has(evt.id)) return;
      seen.add(evt.id);
      const start = new Date(evt.start_date + "T00:00:00");
      const end = new Date(evt.end_date + "T00:00:00");
      const dates = [];
      for (let d = new Date(start); d <= end; d.setDate(d.getDate() + 1)) {
        dates.push(formatDate(d));
      }
      const evtVenueIds = eventVenues.filter(ev => ev.event_id === evt.id).map(ev => ev.venue_id);
      const evtVenues = venues.filter(v => evtVenueIds.includes(v.id));
      groups.push({ event: evt, dates, venues: evtVenues });
    });
    return groups;
  }, [upcomingEvents, venues, eventVenues]);

  const typeColors = { festival: "#a78bfa", concert: "#f472b6", market: "#34d399", corporate: "#60a5fa", sports: "#fbbf24", other: "#94a3b8" };

  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-bold" style={{ color: BRAND.text }}>
        Availability
      </h1>

      <SectionCard title={isEmployeeOnly ? "Your Availability" : "Select Employee"} icon={Users}>
        {isEmployeeOnly ? (
          <div className="px-4 py-3 rounded-lg" style={{ background: BRAND.accentBlue, border: `1px solid ${BRAND.glassBorder}` }}>
            <span style={{ color: BRAND.text }}>
              {currentEmployee
                ? `${currentEmployee.first_name} ${currentEmployee.last_name}`
                : user?.email || "You"}
            </span>
          </div>
        ) : (
          <Select
            value={selectedEmployee}
            onChange={(e) => setSelectedEmployee(e.target.value)}
            options={employees.map((e) => ({
              value: e.id,
              label: `${e.first_name} ${e.last_name}`,
            }))}
            placeholder="Select an employee..."
          />
        )}
      </SectionCard>

      {/* Legend */}
      <div className="flex gap-3 flex-wrap px-1">
        {statusCycle.map((s) => (
          <div key={s} className="flex items-center gap-1.5">
            <div className="w-3 h-3 rounded-full" style={{ background: statusColors[s].color }} />
            <span className="text-xs" style={{ color: BRAND.lightBlue }}>{statusColors[s].label}</span>
          </div>
        ))}
        <span className="text-xs ml-auto" style={{ color: "rgba(224,230,255,0.4)" }}>Tap a date to cycle status</span>
      </div>

      {eventGroups.length === 0 ? (
        <SectionCard title="No Upcoming Events" icon={Calendar}>
          <div className="text-center py-8">
            <Calendar size={40} style={{ color: "rgba(224,230,255,0.3)", margin: "0 auto 12px" }} />
            <p className="text-sm" style={{ color: BRAND.textLight }}>
              No upcoming events in the system. Availability collection will open when events are added.
            </p>
          </div>
        </SectionCard>
      ) : (
        eventGroups.map(({ event: evt, dates, venues: evtVenues }) => (
          <SectionCard key={evt.id} title={evt.name} icon={Calendar}>
            <div className="flex items-center gap-2 mb-3 flex-wrap">
              <span className="text-xs px-2 py-0.5 rounded-full font-medium" style={{
                background: `${typeColors[evt.event_type] || typeColors.other}25`,
                color: typeColors[evt.event_type] || typeColors.other,
              }}>
                {(evt.event_type || "event").charAt(0).toUpperCase() + (evt.event_type || "event").slice(1)}
              </span>
              <span className="text-xs" style={{ color: BRAND.textLight }}>
                {new Date(evt.start_date + "T00:00:00").toLocaleDateString("en-US", { month: "short", day: "numeric" })}
                {evt.start_date !== evt.end_date && ` – ${new Date(evt.end_date + "T00:00:00").toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}`}
              </span>
              {evtVenues.length > 0 && (
                <span className="text-xs" style={{ color: BRAND.textLight }}>
                  📍 {evtVenues.map(v => v.name).join(", ")}
                </span>
              )}
            </div>

            <div className="space-y-2">
              {dates.map(dateKey => {
                const d = new Date(dateKey + "T00:00:00");
                const status = availSlots[dateKey] || "available";
                const sc = statusColors[status];
                const isToday = dateKey === today;
                return (
                  <div
                    key={dateKey}
                    onClick={() => cycleStatus(dateKey)}
                    className="flex items-center justify-between p-3 rounded-lg cursor-pointer transition-all active:scale-[0.98]"
                    style={{
                      background: sc.bg,
                      border: isToday ? `2px solid ${BRAND.primary}` : "2px solid transparent",
                    }}
                  >
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-semibold" style={{ color: BRAND.text }}>
                        {dayNames[d.getDay()]}
                      </span>
                      <span className="text-xs" style={{ color: BRAND.textLight }}>
                        {d.toLocaleDateString("en-US", { month: "short", day: "numeric" })}
                      </span>
                      {isToday && (
                        <span className="text-xs px-1.5 py-0.5 rounded" style={{ background: `${BRAND.primary}30`, color: BRAND.primary }}>Today</span>
                      )}
                    </div>
                    <span className="text-xs font-semibold px-3 py-1 rounded-full" style={{ background: sc.bg, color: sc.color }}>
                      {sc.label}
                    </span>
                  </div>
                );
              })}
            </div>
          </SectionCard>
        ))
      )}

      {eventGroups.length > 0 && (
        <div className="space-y-3">
          {saveMsg && (
            <div className="p-3 rounded-lg text-sm" style={{
              background: saveMsg.type === "success" ? "rgba(74,222,128,0.15)" : "rgba(244,67,54,0.15)",
              color: saveMsg.type === "success" ? "#4ade80" : "#ef4444",
            }}>
              {saveMsg.text}
            </div>
          )}
          <Btn variant="primary" className="w-full" onClick={handleSave} disabled={saving || !selectedEmployee}>
            {saving ? "Saving..." : "Save Availability"}
          </Btn>
        </div>
      )}
    </div>
  );
};

// ============================================================================
// PAGES: MY SHIFTS
// ============================================================================

const MyShiftsPage = ({ employees = [], events = [], shifts = [], user, locations = [] }) => {
  const [viewMode, setViewMode] = useState("upcoming"); // upcoming, past, all

  // Find the current logged-in employee
  const currentEmployee = employees.find(e => e.email === user?.email);

  // Get shifts for this employee
  const myShifts = useMemo(() => {
    if (!currentEmployee) return [];
    return shifts
      .filter(s => s.employee_id === currentEmployee.id)
      .map(s => {
        const event = events.find(e => e.id === s.event_id);
        const location = event ? locations.find(l => l.id === event.location_id) : null;
        return { ...s, event, location };
      })
      .sort((a, b) => {
        const dateA = a.event?.start_date || "";
        const dateB = b.event?.start_date || "";
        return dateA.localeCompare(dateB);
      });
  }, [currentEmployee, shifts, events, locations]);

  const now = new Date().toISOString().split("T")[0];
  const upcomingShifts = myShifts.filter(s => s.event?.start_date >= now);
  const pastShifts = myShifts.filter(s => s.event?.start_date < now);

  const displayShifts = viewMode === "upcoming" ? upcomingShifts : viewMode === "past" ? pastShifts : myShifts;

  // Total hours calculation
  const totalUpcomingHours = upcomingShifts.reduce((sum, s) => {
    if (s.start_time && s.end_time) {
      const [sh, sm] = s.start_time.split(":").map(Number);
      const [eh, em] = s.end_time.split(":").map(Number);
      return sum + ((eh * 60 + em) - (sh * 60 + sm)) / 60;
    }
    return sum + 8;
  }, 0);

  // Group shifts by event
  const shiftsByEvent = useMemo(() => {
    const map = {};
    displayShifts.forEach(s => {
      const eventId = s.event?.id || "unassigned";
      if (!map[eventId]) map[eventId] = { event: s.event, location: s.location, shifts: [] };
      map[eventId].shifts.push(s);
    });
    return Object.values(map);
  }, [displayShifts]);

  if (!currentEmployee) {
    return (
      <div className="space-y-6">
        <h1 className="text-2xl font-bold" style={{ color: BRAND.text }}>My Shifts</h1>
        <SectionCard title="Employee Not Found" icon={AlertCircle}>
          <p className="text-sm" style={{ color: BRAND.lightBlue }}>
            No employee profile found for your account ({user?.email}). Please contact an admin to link your account.
          </p>
        </SectionCard>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div>
          <h1 className="text-2xl font-bold" style={{ color: BRAND.text }}>My Shifts</h1>
          <p className="text-sm mt-1" style={{ color: BRAND.textMuted }}>
            Welcome, {currentEmployee.first_name}. Here are your assigned shifts.
          </p>
        </div>
        <div className="flex gap-2">
          {["upcoming", "past", "all"].map(mode => (
            <button
              key={mode}
              onClick={() => setViewMode(mode)}
              className="px-3 py-1.5 rounded-lg text-sm capitalize transition"
              style={{
                background: viewMode === mode ? `${BRAND.primary}20` : BRAND.accentBlue,
                color: viewMode === mode ? BRAND.primary : "rgba(224,230,255,0.6)",
                border: `1px solid ${viewMode === mode ? BRAND.primary : BRAND.glassBorder}`,
              }}
            >
              {mode}
            </button>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard label="Upcoming Shifts" value={upcomingShifts.length} icon={Calendar} color="primary" />
        <StatCard label="Upcoming Hours" value={`${totalUpcomingHours.toFixed(1)}h`} icon={Clock} color="success" />
        <StatCard label="Past Shifts" value={pastShifts.length} icon={FileText} color="warning" />
        <StatCard label="Total Shifts" value={myShifts.length} icon={Star} color="primary" />
      </div>

      {shiftsByEvent.length === 0 ? (
        <SectionCard title="No Shifts Found" icon={Calendar}>
          <EmptyState
            icon={Calendar}
            title={viewMode === "upcoming" ? "No upcoming shifts" : viewMode === "past" ? "No past shifts" : "No shifts assigned"}
            message="Shifts will appear here once you're assigned to events."
          />
        </SectionCard>
      ) : (
        shiftsByEvent.map((group, idx) => (
          <SectionCard
            key={group.event?.id || idx}
            title={group.event?.name || "Unassigned"}
            icon={Calendar}
          >
            <div className="mb-3 flex items-center gap-4 text-xs" style={{ color: BRAND.textMuted }}>
              {group.event?.start_date && (
                <span>{group.event.start_date}{group.event.end_date && group.event.end_date !== group.event.start_date ? ` — ${group.event.end_date}` : ""}</span>
              )}
              {group.location && <span className="flex items-center gap-1"><MapPin size={12} />{group.location.name}</span>}
              {group.event?.event_type && (
                <span className="px-2 py-0.5 rounded-full" style={{ background: "rgba(84,205,249,0.15)", color: BRAND.primary }}>
                  {EVENT_TYPE_DEFAULTS[group.event.event_type]?.label || group.event.event_type}
                </span>
              )}
            </div>
            <div className="space-y-2">
              {group.shifts.map(shift => (
                <div
                  key={shift.id}
                  className="flex items-center justify-between p-3 rounded-lg"
                  style={{ background: BRAND.accentBlue }}
                >
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-lg flex items-center justify-center" style={{ background: `${BRAND.primary}20` }}>
                      <Clock size={18} style={{ color: BRAND.primary }} />
                    </div>
                    <div>
                      <p className="font-medium text-sm" style={{ color: BRAND.text }}>
                        {shift.start_time && shift.end_time
                          ? `${shift.start_time.substring(0, 5)} — ${shift.end_time.substring(0, 5)}`
                          : "Time TBD"}
                      </p>
                      {shift.role && (
                        <p className="text-xs" style={{ color: BRAND.textMuted }}>Role: {shift.role}</p>
                      )}
                    </div>
                  </div>
                  <Badge color={shift.event?.start_date >= now ? "success" : "gray"}>
                    {shift.event?.start_date >= now ? "Upcoming" : "Completed"}
                  </Badge>
                </div>
              ))}
            </div>
          </SectionCard>
        ))
      )}
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
            color="primary"
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
                style={{ background: BRAND.accentBlue }}
              >
                <div>
                  <p className="text-sm font-medium" style={{ color: BRAND.text }}>
                    {formatDate(p.date)}
                  </p>
                  <p className="text-xs" style={{ color: BRAND.textMuted }}>
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
        <StatCard icon={Calendar} label="Total Shifts" value={events.length} color="primary" />
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
            <CartesianGrid strokeDasharray="3 3" stroke={BRAND.accentBlue} />
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

const PRODUCT_CATEGORIES = [
  { value: "T-Shirts", label: "T-Shirts" },
  { value: "Hoodies", label: "Hoodies" },
  { value: "Hats", label: "Hats" },
  { value: "Accessories", label: "Accessories" },
  { value: "Stickers", label: "Stickers" },
  { value: "Other", label: "Other" },
];

const InventoryProductsPage = ({ products = [], stock = {}, onRefresh }) => {
  const [showAddModal, setShowAddModal] = useState(false);
  const [editProduct, setEditProduct] = useState(null);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({ name: "", sku: "", category: "T-Shirts", cost: "", retail: "", sizes: "S,M,L,XL", weight_kg: "" });
  const [searchTerm, setSearchTerm] = useState("");
  const [filterCategory, setFilterCategory] = useState("");

  const totalStockUnits = Object.values(stock).reduce((a, b) => a + b, 0);
  const totalStockValue = products.reduce((sum, p) => sum + (stock[p.id] || 0) * Number(p.cost || 0), 0);
  const activeProducts = products.filter(p => p.status === "active");
  const avgMargin = activeProducts.length > 0
    ? (activeProducts.reduce((sum, p) => sum + (Number(p.retail) > 0 ? ((Number(p.retail) - Number(p.cost)) / Number(p.retail)) * 100 : 0), 0) / activeProducts.length).toFixed(0)
    : 0;

  const resetForm = () => setForm({ name: "", sku: "", category: "T-Shirts", cost: "", retail: "", sizes: "S,M,L,XL", weight_kg: "" });

  const openEdit = (p) => {
    setEditProduct(p);
    setForm({
      name: p.name,
      sku: p.sku,
      category: p.category || "T-Shirts",
      cost: String(p.cost),
      retail: String(p.retail),
      sizes: (p.sizes || []).join(","),
      weight_kg: String(p.weight_kg || ""),
    });
  };

  const handleSave = async () => {
    if (!form.name || !form.sku) return;
    setSaving(true);
    const payload = {
      name: form.name,
      sku: form.sku,
      category: form.category || "T-Shirts",
      cost: parseFloat(form.cost) || 0,
      retail: parseFloat(form.retail) || 0,
      sizes: form.sizes ? form.sizes.split(",").map(s => s.trim()).filter(Boolean) : ["S", "M", "L", "XL"],
      weight_kg: parseFloat(form.weight_kg) || 0,
    };
    if (editProduct) {
      await supabase.from("products").update(payload).eq("id", editProduct.id);
    } else {
      const { data } = await supabase.from("products").insert(payload).select();
      // Create stock_levels entry for new product
      if (data?.[0]) {
        await supabase.from("stock_levels").insert({ product_id: data[0].id, quantity: 0 });
      }
    }
    setSaving(false);
    setShowAddModal(false);
    setEditProduct(null);
    resetForm();
    onRefresh?.();
  };

  const handleDelete = async (id) => {
    if (!confirm("Delete this product? This cannot be undone.")) return;
    await supabase.from("products").delete().eq("id", id);
    onRefresh?.();
  };

  const handleToggleStatus = async (p) => {
    const newStatus = p.status === "active" ? "inactive" : "active";
    await supabase.from("products").update({ status: newStatus }).eq("id", p.id);
    onRefresh?.();
  };

  const filtered = products.filter(p => {
    const matchSearch = !searchTerm || p.name.toLowerCase().includes(searchTerm.toLowerCase()) || p.sku.toLowerCase().includes(searchTerm.toLowerCase());
    const matchCategory = !filterCategory || p.category === filterCategory;
    return matchSearch && matchCategory;
  });

  return (
    <div className="space-y-6">
      {/* Category tabs spanning full width */}
      <div className="flex gap-1 p-1 rounded-xl" style={{ background: BRAND.accentBlue }}>
        {[{ id: "", label: "All" }, { id: "Hoodies", label: "Hoodies" }, { id: "T-Shirts", label: "T-Shirts" }, { id: "Other", label: "Other" }].map(cat => (
          <button key={cat.id} onClick={() => setFilterCategory(cat.id)}
            className="flex-1 py-2.5 rounded-lg text-sm font-bold transition"
            style={{ background: filterCategory === cat.id ? BRAND.navy : "transparent", color: filterCategory === cat.id ? BRAND.white : BRAND.navy }}>
            {cat.label}
          </button>
        ))}
      </div>

      <div className="flex items-center justify-between flex-wrap gap-4">
        <h1 className="text-2xl font-bold" style={{ color: BRAND.navy }}>Products</h1>
        <Btn icon={Plus} onClick={() => { resetForm(); setEditProduct(null); setShowAddModal(true); }}>Add Product</Btn>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard label="Total Products" value={activeProducts.length} icon={Package} color="primary" />
        <StatCard label="Stock Units" value={totalStockUnits} icon={Package} color="success" />
        <StatCard label="Stock Value" value={currency(totalStockValue)} icon={DollarSign} color="warning" />
        <StatCard label="Avg Margin" value={`${avgMargin}%`} icon={TrendingUp} color="primary" />
      </div>

      {/* Charts + Critical Warnings row */}
      {filtered.length > 0 && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Bar chart — stock by size or color */}
          <div className="rounded-2xl p-4" style={{ background: BRAND.white, border: `2px solid ${BRAND.accentBlue}` }}>
            <div className="flex items-center justify-between mb-3">
              <h4 className="text-sm font-bold" style={{ color: BRAND.navy }}>Stock by Size</h4>
            </div>
            <ResponsiveContainer width="100%" height={200}>
              <BarChart data={(() => {
                const sizeMap = {};
                filtered.forEach(p => { (p.sizes || []).forEach(s => { sizeMap[s] = (sizeMap[s] || 0) + (stock[p.id] || 0); }); });
                return Object.entries(sizeMap).map(([size, qty]) => ({ size, qty }));
              })()}>
                <CartesianGrid strokeDasharray="3 3" stroke={BRAND.accentBlue} />
                <XAxis dataKey="size" tick={{ fill: BRAND.navy, fontSize: 11 }} />
                <YAxis tick={{ fill: BRAND.navy, fontSize: 11 }} />
                <Tooltip />
                <Bar dataKey="qty" fill={BRAND.navy} radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>

          {/* Pie chart — stock distribution */}
          <div className="rounded-2xl p-4" style={{ background: BRAND.white, border: `2px solid ${BRAND.accentBlue}` }}>
            <h4 className="text-sm font-bold mb-3" style={{ color: BRAND.navy }}>Stock Distribution</h4>
            <ResponsiveContainer width="100%" height={200}>
              <PieChart>
                <Pie data={filtered.map(p => ({ name: p.name?.substring(0, 15) || "?", value: stock[p.id] || 0 })).filter(d => d.value > 0)} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={70} label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}>
                  {filtered.map((_, i) => <Cell key={i} fill={[BRAND.navy, BRAND.lightBlue, BRAND.primary, "#4ade80", "#fbbf24", "#f97316", "#a78bfa", "#ec4899"][i % 8]} />)}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          </div>

          {/* Critical warnings */}
          <div className="rounded-2xl p-4" style={{ background: BRAND.white, border: `2px solid ${BRAND.accentBlue}` }}>
            <h4 className="text-sm font-bold mb-3" style={{ color: BRAND.danger }}>Stock Alerts</h4>
            <div className="space-y-2 max-h-48 overflow-y-auto">
              {filtered.filter(p => (stock[p.id] || 0) <= 5).sort((a, b) => (stock[a.id] || 0) - (stock[b.id] || 0)).map(p => (
                <div key={p.id} className="flex items-center justify-between px-3 py-2 rounded-lg" style={{ background: `${BRAND.danger}08`, border: `1px solid ${BRAND.danger}20` }}>
                  <span className="text-xs font-semibold" style={{ color: BRAND.navy }}>{p.name}</span>
                  <span className="text-xs font-bold px-2 py-0.5 rounded-full" style={{ background: (stock[p.id] || 0) === 0 ? `${BRAND.danger}20` : `${BRAND.warning}20`, color: (stock[p.id] || 0) === 0 ? BRAND.danger : BRAND.warning }}>
                    {stock[p.id] || 0} left
                  </span>
                </div>
              ))}
              {filtered.filter(p => (stock[p.id] || 0) > 100).map(p => (
                <div key={`over-${p.id}`} className="flex items-center justify-between px-3 py-2 rounded-lg" style={{ background: `${BRAND.primary}08`, border: `1px solid ${BRAND.primary}20` }}>
                  <span className="text-xs font-semibold" style={{ color: BRAND.navy }}>{p.name}</span>
                  <span className="text-xs font-bold px-2 py-0.5 rounded-full" style={{ background: `${BRAND.primary}20`, color: BRAND.navy }}>
                    Overstocked: {stock[p.id]}
                  </span>
                </div>
              ))}
              {filtered.filter(p => (stock[p.id] || 0) > 5 && (stock[p.id] || 0) <= 100).length === filtered.length && filtered.length > 0 && (
                <div className="text-center py-4">
                  <Check size={24} style={{ color: BRAND.success, margin: "0 auto 4px" }} />
                  <p className="text-xs font-medium" style={{ color: BRAND.success }}>All stock levels healthy</p>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Filters */}
      <div className="flex items-center gap-3 flex-wrap">
        <div className="flex-1 min-w-48">
          <input
            type="text"
            placeholder="Search products..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full px-4 py-2 rounded-lg focus:outline-none focus:ring-2"
            style={{ background: BRAND.accentBlue, border: `1px solid ${BRAND.glassBorder}` }}
          />
        </div>
      </div>

      {/* Product Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
        {filtered.map(p => {
          const margin = Number(p.retail) > 0 ? (((Number(p.retail) - Number(p.cost)) / Number(p.retail)) * 100).toFixed(0) : 0;
          const onHand = stock[p.id] || 0;
          const isInactive = p.status !== "active";
          return (
            <div
              key={p.id}
              className={`rounded-xl p-4 ${isInactive ? "opacity-60" : ""}`}
              style={{ background: BRAND.glass, border: `1px solid ${BRAND.glassBorder}`, backdropFilter: BRAND.blur }}
            >
              <div className="flex items-start justify-between mb-3">
                <div>
                  <h3 className="font-semibold text-base" style={{ color: BRAND.text }}>{p.name}</h3>
                  <p className="text-xs mt-1" style={{ color: BRAND.textLight }}>
                    SKU: {p.sku} &middot; {p.category || "T-Shirts"}
                  </p>
                </div>
                <div className="flex items-center gap-1">
                  <button onClick={() => openEdit(p)} className="p-1.5 rounded-lg hover:bg-blue-50 transition">
                    <Edit2 size={14} style={{ color: BRAND.primary }} />
                  </button>
                  <button onClick={() => handleToggleStatus(p)} className="p-1.5 rounded-lg hover:bg-blue-50 transition">
                    {isInactive ? <Eye size={14} style={{ color: BRAND.success }} /> : <EyeOff size={14} style={{ color: BRAND.warning }} />}
                  </button>
                  <button onClick={() => handleDelete(p.id)} className="p-1.5 rounded-lg hover:bg-blue-50 transition">
                    <Trash2 size={14} style={{ color: BRAND.danger }} />
                  </button>
                </div>
              </div>

              <div className="grid grid-cols-3 gap-2 text-center">
                <div className="rounded-lg p-2" style={{ background: BRAND.accentBlue }}>
                  <p className="text-xs" style={{ color: BRAND.textLight }}>Cost</p>
                  <p className="font-semibold text-sm" style={{ color: BRAND.text }}>{currency(p.cost)}</p>
                </div>
                <div className="rounded-lg p-2" style={{ background: BRAND.accentBlue }}>
                  <p className="text-xs" style={{ color: BRAND.textLight }}>Retail</p>
                  <p className="font-semibold text-sm" style={{ color: BRAND.primary }}>{currency(p.retail)}</p>
                </div>
                <div className="rounded-lg p-2" style={{ background: BRAND.accentBlue }}>
                  <p className="text-xs" style={{ color: BRAND.textLight }}>Margin</p>
                  <p className="font-semibold text-sm" style={{ color: BRAND.success }}>{margin}%</p>
                </div>
              </div>

              <div className="mt-3 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Package size={14} style={{ color: BRAND.primary }} />
                  <span className="text-sm" style={{ color: BRAND.text }}>{onHand} in stock</span>
                </div>
                {(p.sizes || []).length > 0 && (
                  <div className="flex gap-1">
                    {(p.sizes || []).map(s => (
                      <span key={s} className="text-xs px-1.5 py-0.5 rounded" style={{ background: "rgba(84,205,249,0.15)", color: BRAND.primary }}>{s}</span>
                    ))}
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {filtered.length === 0 && (
        <EmptyState icon={Package} title="No products found" message={searchTerm ? "Try a different search term" : "Add your first product to get started"} />
      )}

      {/* Add/Edit Modal */}
      <Modal isOpen={showAddModal || !!editProduct} onClose={() => { setShowAddModal(false); setEditProduct(null); resetForm(); }} title={editProduct ? "Edit Product" : "Add Product"} size="lg">
        <div className="space-y-1">
          <Input label="Product Name" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="e.g. Collide Classic Tee" />
          <div className="grid grid-cols-2 gap-4">
            <Input label="SKU" value={form.sku} onChange={(e) => setForm({ ...form, sku: e.target.value })} placeholder="e.g. CLT-001" />
            <Select label="Category" value={form.category} onChange={(e) => setForm({ ...form, category: e.target.value })} options={PRODUCT_CATEGORIES} />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <Input label="Cost ($)" value={form.cost} onChange={(e) => setForm({ ...form, cost: e.target.value })} type="number" placeholder="0.00" />
            <Input label="Retail ($)" value={form.retail} onChange={(e) => setForm({ ...form, retail: e.target.value })} type="number" placeholder="0.00" />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <Input label="Sizes (comma-separated)" value={form.sizes} onChange={(e) => setForm({ ...form, sizes: e.target.value })} placeholder="S,M,L,XL" />
            <Input label="Weight (kg)" value={form.weight_kg} onChange={(e) => setForm({ ...form, weight_kg: e.target.value })} type="number" placeholder="0.3" />
          </div>
          <div className="flex justify-end gap-2 mt-4">
            <Btn variant="secondary" onClick={() => { setShowAddModal(false); setEditProduct(null); resetForm(); }}>Cancel</Btn>
            <Btn onClick={handleSave} disabled={saving || !form.name || !form.sku}>{saving ? "Saving..." : editProduct ? "Update" : "Create"}</Btn>
          </div>
        </div>
      </Modal>
    </div>
  );
};

const InventoryStockPage = ({ products = [], stock = {}, distributions = [], events = [], onRefresh }) => {
  const [showDistModal, setShowDistModal] = useState(false);
  const [showRestockModal, setShowRestockModal] = useState(false);
  const [saving, setSaving] = useState(false);
  const [distForm, setDistForm] = useState({ event_id: "", product_id: "", qty_sent: "", notes: "" });
  const [restockForm, setRestockForm] = useState({ product_id: "", quantity: "" });
  const [filterProduct, setFilterProduct] = useState("");

  const totalDistributed = distributions.reduce((sum, d) => sum + (d.qty_sent || 0), 0);
  const totalReturned = distributions.reduce((sum, d) => sum + (d.qty_returned || 0), 0);
  const totalSold = distributions.reduce((sum, d) => sum + (d.qty_sold || 0), 0);
  const totalOnHand = Object.values(stock).reduce((a, b) => a + b, 0);

  const handleCreateDistribution = async () => {
    if (!distForm.event_id || !distForm.product_id || !distForm.qty_sent) return;
    setSaving(true);
    await supabase.from("distributions").insert({
      event_id: distForm.event_id,
      product_id: distForm.product_id,
      qty_sent: parseInt(distForm.qty_sent),
      status: "shipped",
      shipped_at: new Date().toISOString(),
      notes: distForm.notes || null,
    });
    // Reduce stock
    const currentQty = stock[distForm.product_id] || 0;
    const newQty = Math.max(0, currentQty - parseInt(distForm.qty_sent));
    await supabase.from("stock_levels").update({ quantity: newQty, updated_at: new Date().toISOString() }).eq("product_id", distForm.product_id);
    setSaving(false);
    setShowDistModal(false);
    setDistForm({ event_id: "", product_id: "", qty_sent: "", notes: "" });
    onRefresh?.();
  };

  const handleRecordReturn = async (distId, returnQty) => {
    const qty = parseInt(returnQty);
    if (!qty || qty <= 0) return;
    const dist = distributions.find(d => d.id === distId);
    if (!dist) return;
    const newReturned = (dist.qty_returned || 0) + qty;
    await supabase.from("distributions").update({
      qty_returned: newReturned,
      returned_at: new Date().toISOString(),
      status: "returned",
    }).eq("id", distId);
    // Add back to stock
    const currentQty = stock[dist.product_id] || 0;
    await supabase.from("stock_levels").update({ quantity: currentQty + qty, updated_at: new Date().toISOString() }).eq("product_id", dist.product_id);
    onRefresh?.();
  };

  const handleRecordSales = async (distId, soldQty) => {
    const qty = parseInt(soldQty);
    if (!qty || qty <= 0) return;
    const dist = distributions.find(d => d.id === distId);
    if (!dist) return;
    await supabase.from("distributions").update({
      qty_sold: (dist.qty_sold || 0) + qty,
    }).eq("id", distId);
    onRefresh?.();
  };

  const handleRestock = async () => {
    if (!restockForm.product_id || !restockForm.quantity) return;
    setSaving(true);
    const currentQty = stock[restockForm.product_id] || 0;
    const newQty = currentQty + parseInt(restockForm.quantity);
    // Upsert stock level
    const { data: existing } = await supabase.from("stock_levels").select("id").eq("product_id", restockForm.product_id).maybeSingle();
    if (existing) {
      await supabase.from("stock_levels").update({ quantity: newQty, last_restocked_at: new Date().toISOString(), updated_at: new Date().toISOString() }).eq("product_id", restockForm.product_id);
    } else {
      await supabase.from("stock_levels").insert({ product_id: restockForm.product_id, quantity: parseInt(restockForm.quantity), last_restocked_at: new Date().toISOString() });
    }
    setSaving(false);
    setShowRestockModal(false);
    setRestockForm({ product_id: "", quantity: "" });
    onRefresh?.();
  };

  const filteredDist = distributions.filter(d => !filterProduct || d.product_id === filterProduct)
    .sort((a, b) => new Date(b.created_at) - new Date(a.created_at));

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-4">
        <h1 className="text-2xl font-bold" style={{ color: BRAND.text }}>Stock & Distribution</h1>
        <div className="flex gap-2">
          <Btn icon={Plus} variant="secondary" onClick={() => setShowRestockModal(true)}>Restock</Btn>
          <Btn icon={Plus} onClick={() => setShowDistModal(true)}>New Distribution</Btn>
        </div>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard label="On Hand" value={totalOnHand} icon={Package} color="primary" />
        <StatCard label="Distributed" value={totalDistributed} icon={Zap} color="warning" />
        <StatCard label="Sold" value={totalSold} icon={DollarSign} color="success" />
        <StatCard label="Returned" value={totalReturned} icon={Package} color="danger" />
      </div>

      {/* Stock Levels Table */}
      <SectionCard title="Current Stock Levels" icon={Package}>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr style={{ borderBottom: `1px solid ${BRAND.glassBorder}` }}>
                <th className="text-left py-3 px-3" style={{ color: BRAND.primary }}>Product</th>
                <th className="text-center py-3 px-3" style={{ color: BRAND.primary }}>Category</th>
                <th className="text-center py-3 px-3" style={{ color: BRAND.primary }}>On Hand</th>
                <th className="text-center py-3 px-3" style={{ color: BRAND.primary }}>Distributed</th>
                <th className="text-center py-3 px-3" style={{ color: BRAND.primary }}>Sold</th>
                <th className="text-center py-3 px-3" style={{ color: BRAND.primary }}>Returned</th>
                <th className="text-center py-3 px-3" style={{ color: BRAND.primary }}>Value</th>
              </tr>
            </thead>
            <tbody>
              {products.map(p => {
                const onHand = stock[p.id] || 0;
                const distrib = distributions.filter(d => d.product_id === p.id).reduce((sum, d) => sum + (d.qty_sent || 0), 0);
                const sold = distributions.filter(d => d.product_id === p.id).reduce((sum, d) => sum + (d.qty_sold || 0), 0);
                const returned = distributions.filter(d => d.product_id === p.id).reduce((sum, d) => sum + (d.qty_returned || 0), 0);
                const lowStock = onHand < 10;
                return (
                  <tr key={p.id} className="hover:bg-white/5 transition" style={{ borderBottom: `1px solid ${BRAND.glassBorder}` }}>
                    <td className="py-3 px-3" style={{ color: BRAND.text }}>{p.name}</td>
                    <td className="py-3 px-3 text-center text-xs">
                      <span className="px-2 py-1 rounded-full" style={{ background: "rgba(84,205,249,0.15)", color: BRAND.primary }}>{p.category}</span>
                    </td>
                    <td className="py-3 px-3 text-center font-semibold" style={{ color: lowStock ? BRAND.danger : BRAND.success }}>
                      {onHand} {lowStock && <AlertCircle size={12} className="inline ml-1" />}
                    </td>
                    <td className="py-3 px-3 text-center" style={{ color: BRAND.lightBlue }}>{distrib}</td>
                    <td className="py-3 px-3 text-center" style={{ color: BRAND.success }}>{sold}</td>
                    <td className="py-3 px-3 text-center" style={{ color: BRAND.lightBlue }}>{returned}</td>
                    <td className="py-3 px-3 text-center" style={{ color: BRAND.primary }}>{currency(onHand * Number(p.cost))}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
          {products.length === 0 && <EmptyState icon={Package} title="No products" message="Add products first in the Products page" />}
        </div>
      </SectionCard>

      {/* Recent Distributions */}
      <SectionCard title="Distribution History" icon={Zap}>
        <div className="mb-4">
          <select
            value={filterProduct}
            onChange={(e) => setFilterProduct(e.target.value)}
            className="px-3 py-1.5 rounded-lg text-sm focus:outline-none"
            style={{ background: BRAND.accentBlue, border: `1px solid ${BRAND.glassBorder}` }}
          >
            <option value="">All Products</option>
            {products.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
          </select>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr style={{ borderBottom: `1px solid ${BRAND.glassBorder}` }}>
                <th className="text-left py-3 px-3" style={{ color: BRAND.primary }}>Product</th>
                <th className="text-left py-3 px-3" style={{ color: BRAND.primary }}>Event</th>
                <th className="text-center py-3 px-3" style={{ color: BRAND.primary }}>Sent</th>
                <th className="text-center py-3 px-3" style={{ color: BRAND.primary }}>Sold</th>
                <th className="text-center py-3 px-3" style={{ color: BRAND.primary }}>Returned</th>
                <th className="text-center py-3 px-3" style={{ color: BRAND.primary }}>Status</th>
                <th className="text-center py-3 px-3" style={{ color: BRAND.primary }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {filteredDist.slice(0, 20).map(d => {
                const product = products.find(p => p.id === d.product_id);
                const event = events.find(e => e.id === d.event_id);
                const remaining = (d.qty_sent || 0) - (d.qty_sold || 0) - (d.qty_returned || 0);
                const statusColors = { draft: BRAND.warning, shipped: BRAND.primary, returned: BRAND.success, completed: BRAND.success };
                return (
                  <tr key={d.id} className="hover:bg-white/5 transition" style={{ borderBottom: `1px solid ${BRAND.glassBorder}` }}>
                    <td className="py-3 px-3" style={{ color: BRAND.text }}>{product?.name || "Unknown"}</td>
                    <td className="py-3 px-3" style={{ color: BRAND.lightBlue }}>{event?.name || "Unknown"}</td>
                    <td className="py-3 px-3 text-center" style={{ color: BRAND.text }}>{d.qty_sent}</td>
                    <td className="py-3 px-3 text-center" style={{ color: BRAND.success }}>{d.qty_sold || 0}</td>
                    <td className="py-3 px-3 text-center" style={{ color: BRAND.lightBlue }}>{d.qty_returned || 0}</td>
                    <td className="py-3 px-3 text-center">
                      <span className="text-xs px-2 py-1 rounded-full" style={{ background: `${statusColors[d.status] || BRAND.primary}20`, color: statusColors[d.status] || BRAND.primary }}>
                        {d.status}
                      </span>
                    </td>
                    <td className="py-3 px-3 text-center">
                      {remaining > 0 && (
                        <div className="flex items-center justify-center gap-1">
                          <button
                            onClick={() => {
                              const qty = prompt(`Record sales for ${product?.name}? (max ${remaining})`);
                              if (qty) handleRecordSales(d.id, qty);
                            }}
                            className="text-xs px-2 py-1 rounded hover:bg-blue-50 transition"
                            style={{ color: BRAND.success }}
                          >Sold</button>
                          <button
                            onClick={() => {
                              const qty = prompt(`Return how many ${product?.name}? (max ${remaining})`);
                              if (qty) handleRecordReturn(d.id, qty);
                            }}
                            className="text-xs px-2 py-1 rounded hover:bg-blue-50 transition"
                            style={{ color: BRAND.warning }}
                          >Return</button>
                        </div>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
          {filteredDist.length === 0 && <EmptyState icon={Zap} title="No distributions" message="Create a distribution to send inventory to an event" />}
        </div>
      </SectionCard>

      {/* New Distribution Modal */}
      <Modal isOpen={showDistModal} onClose={() => { setShowDistModal(false); setDistForm({ event_id: "", product_id: "", qty_sent: "", notes: "" }); }} title="Create Distribution" size="md">
        <div className="space-y-1">
          <Select label="Event" value={distForm.event_id} onChange={(e) => setDistForm({ ...distForm, event_id: e.target.value })} options={events.map(ev => ({ value: ev.id, label: ev.name }))} placeholder="Select event..." />
          <Select label="Product" value={distForm.product_id} onChange={(e) => setDistForm({ ...distForm, product_id: e.target.value })} options={products.map(p => ({ value: p.id, label: `${p.name} (${stock[p.id] || 0} in stock)` }))} placeholder="Select product..." />
          <Input label="Quantity to Send" value={distForm.qty_sent} onChange={(e) => setDistForm({ ...distForm, qty_sent: e.target.value })} type="number" placeholder="0" />
          <Input label="Notes (optional)" value={distForm.notes} onChange={(e) => setDistForm({ ...distForm, notes: e.target.value })} placeholder="Any notes..." />
          {distForm.product_id && distForm.qty_sent && parseInt(distForm.qty_sent) > (stock[distForm.product_id] || 0) && (
            <p className="text-xs" style={{ color: BRAND.danger }}>Warning: Sending more than available stock ({stock[distForm.product_id] || 0} on hand)</p>
          )}
          <div className="flex justify-end gap-2 mt-4">
            <Btn variant="secondary" onClick={() => setShowDistModal(false)}>Cancel</Btn>
            <Btn onClick={handleCreateDistribution} disabled={saving || !distForm.event_id || !distForm.product_id || !distForm.qty_sent}>{saving ? "Saving..." : "Ship"}</Btn>
          </div>
        </div>
      </Modal>

      {/* Restock Modal */}
      <Modal isOpen={showRestockModal} onClose={() => { setShowRestockModal(false); setRestockForm({ product_id: "", quantity: "" }); }} title="Restock Inventory" size="md">
        <div className="space-y-1">
          <Select label="Product" value={restockForm.product_id} onChange={(e) => setRestockForm({ ...restockForm, product_id: e.target.value })} options={products.map(p => ({ value: p.id, label: `${p.name} (${stock[p.id] || 0} current)` }))} placeholder="Select product..." />
          <Input label="Quantity to Add" value={restockForm.quantity} onChange={(e) => setRestockForm({ ...restockForm, quantity: e.target.value })} type="number" placeholder="0" />
          <div className="flex justify-end gap-2 mt-4">
            <Btn variant="secondary" onClick={() => setShowRestockModal(false)}>Cancel</Btn>
            <Btn variant="success" onClick={handleRestock} disabled={saving || !restockForm.product_id || !restockForm.quantity}>{saving ? "Saving..." : "Restock"}</Btn>
          </div>
        </div>
      </Modal>
    </div>
  );
};

const InventoryAnalyticsPage = ({ historicSales = [], products = [], distributions = [], stock = {}, events = [] }) => {
  const [selectedProduct, setSelectedProduct] = useState("");
  const [selectedEventType, setSelectedEventType] = useState("");
  const [dateRange, setDateRange] = useState(90); // days to look back
  const [minSellThrough, setMinSellThrough] = useState(0);
  const [revenueThreshold, setRevenueThreshold] = useState(0);

  // Filtered sales
  const filteredSales = useMemo(() => {
    let sales = historicSales;
    if (selectedProduct) sales = sales.filter(s => s.product_id === selectedProduct);
    if (selectedEventType) sales = sales.filter(s => s.event_type === selectedEventType);
    return sales;
  }, [historicSales, selectedProduct, selectedEventType]);
  const totalRevenue = filteredSales.reduce((sum, s) => sum + Number(s.revenue || 0), 0);
  const totalSold = filteredSales.reduce((sum, s) => sum + (s.sold || 0), 0);
  const totalSent = filteredSales.reduce((sum, s) => sum + (s.sent || 0), 0);
  const sellThroughRate = totalSent > 0 ? ((totalSold / totalSent) * 100).toFixed(0) : 0;
  const avgRevenuePerUnit = totalSold > 0 ? (totalRevenue / totalSold) : 0;

  // Revenue by event
  const revenueByEvent = useMemo(() => {
    const map = {};
    filteredSales.forEach(s => {
      const name = s.event_name || "Unknown";
      if (!map[name]) map[name] = { name, revenue: 0, sold: 0, sent: 0 };
      map[name].revenue += Number(s.revenue || 0);
      map[name].sold += (s.sold || 0);
      map[name].sent += (s.sent || 0);
    });
    return Object.values(map)
      .filter(d => d.revenue >= revenueThreshold)
      .sort((a, b) => b.revenue - a.revenue).slice(0, 10);
  }, [filteredSales, revenueThreshold]);

  // Revenue by product (for pie chart)
  const revenueByProduct = useMemo(() => {
    const map = {};
    filteredSales.forEach(s => {
      const prod = products.find(p => p.id === s.product_id);
      const name = prod?.name || "Unknown";
      if (!map[name]) map[name] = { name, revenue: 0, sold: 0 };
      map[name].revenue += Number(s.revenue || 0);
      map[name].sold += (s.sold || 0);
    });
    return Object.values(map).sort((a, b) => b.revenue - a.revenue);
  }, [filteredSales, products]);

  // Sell-through by product
  const sellThroughByProduct = useMemo(() => {
    const map = {};
    filteredSales.forEach(s => {
      const prod = products.find(p => p.id === s.product_id);
      const name = prod?.name || "Unknown";
      if (!map[name]) map[name] = { name, sent: 0, sold: 0 };
      map[name].sent += (s.sent || 0);
      map[name].sold += (s.sold || 0);
    });
    return Object.values(map).map(item => ({
      ...item,
      rate: item.sent > 0 ? Math.round((item.sold / item.sent) * 100) : 0,
    })).filter(item => item.rate >= minSellThrough).sort((a, b) => b.rate - a.rate).slice(0, 10);
  }, [filteredSales, products, minSellThrough]);

  // Stock health indicators
  const stockHealth = useMemo(() => {
    return products.filter(p => p.status === "active").map(p => {
      const onHand = stock[p.id] || 0;
      const dist = distributions.filter(d => d.product_id === p.id);
      const totalSent = dist.reduce((s, d) => s + (d.qty_sent || 0), 0);
      const totalSold = dist.reduce((s, d) => s + (d.qty_sold || 0), 0);
      const totalReturned = dist.reduce((s, d) => s + (d.qty_returned || 0), 0);
      const sellThrough = totalSent > 0 ? (totalSold / totalSent) * 100 : 0;
      const daysOfStock = totalSold > 0 ? Math.round(onHand / (totalSold / 30)) : 999;
      return { ...p, onHand, totalSent, totalSold, totalReturned, sellThrough, daysOfStock };
    }).sort((a, b) => a.daysOfStock - b.daysOfStock);
  }, [products, stock, distributions]);

  const COLORS_PIE = [BRAND.primary, BRAND.success, BRAND.warning, BRAND.danger, "#9C27B0", "#00BCD4", "#FF5722", "#607D8B"];

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold" style={{ color: BRAND.text }}>Inventory Analytics</h1>

      {/* Filters Bar */}
      <div className="rounded-xl p-4" style={{ background: BRAND.glass, border: `1px solid ${BRAND.glassBorder}`, backdropFilter: BRAND.blur }}>
        <p className="text-xs font-semibold mb-3" style={{ color: BRAND.primary }}>FILTERS & PARAMETERS</p>
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4">
          <div>
            <label className="block text-xs mb-1" style={{ color: BRAND.textMuted }}>Product</label>
            <select value={selectedProduct} onChange={(e) => setSelectedProduct(e.target.value)}
              className="w-full px-3 py-2 rounded-lg text-sm focus:outline-none"
              style={{ background: BRAND.accentBlue, border: `1px solid ${BRAND.glassBorder}` }}>
              <option value="">All Products</option>
              {products.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-xs mb-1" style={{ color: BRAND.textMuted }}>Event Type</label>
            <select value={selectedEventType} onChange={(e) => setSelectedEventType(e.target.value)}
              className="w-full px-3 py-2 rounded-lg text-sm focus:outline-none"
              style={{ background: BRAND.accentBlue, border: `1px solid ${BRAND.glassBorder}` }}>
              <option value="">All Types</option>
              {Object.entries(EVENT_TYPE_DEFAULTS).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-xs mb-1" style={{ color: BRAND.textMuted }}>
              Time Range: <span style={{ color: BRAND.primary }}>{dateRange} days</span>
            </label>
            <input type="range" min="7" max="365" step="7" value={dateRange}
              onChange={(e) => setDateRange(parseInt(e.target.value))}
              className="w-full" />
          </div>
          <div>
            <label className="block text-xs mb-1" style={{ color: BRAND.textMuted }}>
              Min Sell-Through: <span style={{ color: BRAND.primary }}>{minSellThrough}%</span>
            </label>
            <input type="range" min="0" max="100" step="5" value={minSellThrough}
              onChange={(e) => setMinSellThrough(parseInt(e.target.value))}
              className="w-full" />
          </div>
        </div>
        <div className="mt-3">
          <label className="block text-xs mb-1" style={{ color: BRAND.textMuted }}>
            Min Revenue Threshold: <span style={{ color: BRAND.primary }}>${revenueThreshold.toLocaleString()}</span>
          </label>
          <input type="range" min="0" max="50000" step="500" value={revenueThreshold}
            onChange={(e) => setRevenueThreshold(parseInt(e.target.value))}
            className="w-full" />
        </div>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard label="Total Revenue" value={currency(totalRevenue)} icon={DollarSign} color="primary" />
        <StatCard label="Units Sold" value={totalSold} icon={Package} color="success" />
        <StatCard label="Sell-Through" value={`${sellThroughRate}%`} icon={TrendingUp} color="warning" />
        <StatCard label="Avg $/Unit" value={currency(avgRevenuePerUnit)} icon={BarChart3} color="primary" />
      </div>

      {/* Stock Health Dashboard */}
      <SectionCard title="Stock Health Dashboard" icon={Package}>
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3">
          {stockHealth.map(item => {
            const status = item.daysOfStock <= 7 ? "critical" : item.daysOfStock <= 30 ? "low" : "healthy";
            const statusColor = status === "critical" ? BRAND.danger : status === "low" ? BRAND.warning : BRAND.success;
            return (
              <div key={item.id} className="rounded-lg p-3" style={{ background: BRAND.accentBlue, border: `1px solid ${BRAND.glassBorder}` }}>
                <div className="flex items-center justify-between mb-2">
                  <span className="font-medium text-sm" style={{ color: BRAND.text }}>{item.name}</span>
                  <span className="text-xs px-2 py-0.5 rounded-full capitalize" style={{ background: `${statusColor}20`, color: statusColor }}>
                    {status}
                  </span>
                </div>
                <div className="grid grid-cols-4 gap-1 text-center text-xs">
                  <div>
                    <p style={{ color: BRAND.textLight }}>On Hand</p>
                    <p className="font-semibold" style={{ color: BRAND.text }}>{item.onHand}</p>
                  </div>
                  <div>
                    <p style={{ color: BRAND.textLight }}>Sold</p>
                    <p className="font-semibold" style={{ color: BRAND.success }}>{item.totalSold}</p>
                  </div>
                  <div>
                    <p style={{ color: BRAND.textLight }}>Sell %</p>
                    <p className="font-semibold" style={{ color: item.sellThrough >= 60 ? BRAND.success : BRAND.warning }}>{item.sellThrough.toFixed(0)}%</p>
                  </div>
                  <div>
                    <p style={{ color: BRAND.textLight }}>Days Left</p>
                    <p className="font-semibold" style={{ color: statusColor }}>{item.daysOfStock > 365 ? "365+" : item.daysOfStock}</p>
                  </div>
                </div>
                {/* Mini progress bar for sell-through */}
                <div className="mt-2 h-1.5 rounded-full overflow-hidden" style={{ background: BRAND.accentBlue }}>
                  <div className="h-full rounded-full transition-all" style={{ width: `${Math.min(100, item.sellThrough)}%`, background: item.sellThrough >= 60 ? BRAND.success : item.sellThrough >= 30 ? BRAND.warning : BRAND.danger }} />
                </div>
              </div>
            );
          })}
          {stockHealth.length === 0 && <EmptyState icon={Package} title="No active products" message="Add products to see stock health" />}
        </div>
      </SectionCard>

      {/* Revenue by Event */}
      <SectionCard title="Revenue by Event" icon={BarChart3}>
        {revenueByEvent.length > 0 ? (
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={revenueByEvent} margin={{ top: 10, right: 10, left: 10, bottom: 40 }}>
              <CartesianGrid strokeDasharray="3 3" stroke={BRAND.accentBlue} />
              <XAxis dataKey="name" tick={{ fill: "rgba(224,230,255,0.6)", fontSize: 11 }} angle={-30} textAnchor="end" />
              <YAxis tick={{ fill: "rgba(224,230,255,0.6)", fontSize: 11 }} tickFormatter={(v) => `$${(v / 1000).toFixed(0)}k`} />
              <Tooltip contentStyle={{ background: BRAND.navy, border: `1px solid ${BRAND.glassBorder}`, borderRadius: 8, color: BRAND.text }} formatter={(v) => [currency(v), "Revenue"]} />
              <Bar dataKey="revenue" fill={BRAND.primary} radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        ) : (
          <EmptyState icon={BarChart3} title="No sales data" message="Historic sales will appear here after events" />
        )}
      </SectionCard>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Revenue by Product Pie */}
        <SectionCard title="Revenue by Product" icon={DollarSign}>
          {revenueByProduct.length > 0 ? (
            <div>
              <ResponsiveContainer width="100%" height={250}>
                <PieChart>
                  <Pie data={revenueByProduct} cx="50%" cy="50%" outerRadius={80} dataKey="revenue" label={(entry) => entry.name} labelLine={false}>
                    {revenueByProduct.map((_, i) => (
                      <Cell key={i} fill={COLORS_PIE[i % COLORS_PIE.length]} />
                    ))}
                  </Pie>
                  <Tooltip contentStyle={{ background: BRAND.navy, border: `1px solid ${BRAND.glassBorder}`, borderRadius: 8, color: BRAND.text }} formatter={(v) => [currency(v), "Revenue"]} />
                </PieChart>
              </ResponsiveContainer>
              <div className="space-y-1 mt-2">
                {revenueByProduct.map((item, i) => (
                  <div key={item.name} className="flex items-center justify-between text-sm">
                    <div className="flex items-center gap-2">
                      <div className="w-3 h-3 rounded-full" style={{ background: COLORS_PIE[i % COLORS_PIE.length] }}></div>
                      <span style={{ color: BRAND.text }}>{item.name}</span>
                    </div>
                    <span style={{ color: BRAND.primary }}>{currency(item.revenue)}</span>
                  </div>
                ))}
              </div>
            </div>
          ) : (
            <EmptyState icon={DollarSign} title="No data" message="Revenue breakdown will appear here" />
          )}
        </SectionCard>

        {/* Sell-Through Rate */}
        <SectionCard title="Sell-Through Rate by Product" icon={TrendingUp}>
          {sellThroughByProduct.length > 0 ? (
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={sellThroughByProduct} layout="vertical" margin={{ top: 10, right: 20, left: 80, bottom: 10 }}>
                <CartesianGrid strokeDasharray="3 3" stroke={BRAND.accentBlue} />
                <XAxis type="number" tick={{ fill: "rgba(224,230,255,0.6)", fontSize: 11 }} domain={[0, 100]} tickFormatter={(v) => `${v}%`} />
                <YAxis dataKey="name" type="category" tick={{ fill: "rgba(224,230,255,0.6)", fontSize: 11 }} width={70} />
                <Tooltip contentStyle={{ background: BRAND.navy, border: `1px solid ${BRAND.glassBorder}`, borderRadius: 8, color: BRAND.text }} formatter={(v) => [`${v}%`, "Sell-Through"]} />
                <Bar dataKey="rate" radius={[0, 4, 4, 0]}>
                  {sellThroughByProduct.map((entry, i) => (
                    <Cell key={i} fill={entry.rate >= 70 ? BRAND.success : entry.rate >= 40 ? BRAND.warning : BRAND.danger} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <EmptyState icon={TrendingUp} title="No data" message="Sell-through rates will appear here" />
          )}
        </SectionCard>
      </div>
    </div>
  );
};

// ============================================================================
// PAGES: INVENTORY PROJECTIONS
// ============================================================================

const InventoryProjectionsPage = ({ events = [], products = [], historicSales = [], stock = {}, distributions = [] }) => {
  const [selectedEvent, setSelectedEvent] = useState("");
  const [eventType, setEventType] = useState("festival");
  const [eventDays, setEventDays] = useState(2);
  const [expectedTraffic, setExpectedTraffic] = useState(500);
  const [sellThroughOverride, setSellThroughOverride] = useState(0); // 0 = use defaults
  const [growthFactor, setGrowthFactor] = useState(1.0);
  const [bufferPercent, setBufferPercent] = useState(15); // extra stock buffer

  // When an event is selected, pre-fill parameters
  useEffect(() => {
    if (selectedEvent) {
      const event = events.find(e => e.id === selectedEvent);
      if (event) {
        const type = event.event_type || "festival";
        setEventType(type);
        if (event.start_date && event.end_date) {
          const days = Math.max(1, Math.ceil((new Date(event.end_date) - new Date(event.start_date)) / (1000 * 60 * 60 * 24)) + 1);
          setEventDays(days);
        }
      }
    }
  }, [selectedEvent, events]);

  // Historic averages by product by event type
  const productHistoricByType = useMemo(() => {
    const map = {};
    historicSales.forEach(s => {
      const key = `${s.product_id}_${s.event_type || "other"}`;
      if (!map[key]) map[key] = { sold: 0, sent: 0, revenue: 0, count: 0 };
      map[key].sold += (s.sold || 0);
      map[key].sent += (s.sent || 0);
      map[key].revenue += Number(s.revenue || 0);
      map[key].count++;
    });
    return map;
  }, [historicSales]);

  // Calculate projections for each product
  const projections = useMemo(() => {
    const defaults = EVENT_TYPE_DEFAULTS[eventType] || EVENT_TYPE_DEFAULTS.other;
    const baseSellThrough = sellThroughOverride > 0 ? sellThroughOverride / 100 : defaults.sellThrough;

    return products.filter(p => p.status === "active").map(product => {
      const histKey = `${product.id}_${eventType}`;
      const hist = productHistoricByType[histKey];

      let projectedSold, projectedSent;
      if (hist && hist.count > 0) {
        // Use historic data scaled by growth
        const avgSoldPerEvent = hist.sold / hist.count;
        projectedSold = Math.round(avgSoldPerEvent * growthFactor * (eventDays / (defaults.avgDays || 1)));
        projectedSent = baseSellThrough > 0 ? Math.round(projectedSold / baseSellThrough) : projectedSold;
      } else {
        // Estimate: traffic * conversion rate * days
        const conversionRate = baseSellThrough * 0.1; // 10% of traffic * sell-through
        projectedSold = Math.round(expectedTraffic * conversionRate * eventDays * growthFactor / products.filter(p => p.status === "active").length);
        projectedSent = baseSellThrough > 0 ? Math.round(projectedSold / baseSellThrough) : projectedSold;
      }

      const sendWithBuffer = Math.round(projectedSent * (1 + bufferPercent / 100));
      const onHand = stock[product.id] || 0;
      const shortfall = Math.max(0, sendWithBuffer - onHand);
      const projectedRevenue = projectedSold * Number(product.retail || 0);
      const projectedCost = sendWithBuffer * Number(product.cost || 0);

      return {
        ...product,
        projectedSold,
        projectedSent,
        sendWithBuffer,
        onHand,
        shortfall,
        projectedRevenue,
        projectedCost,
        sellThrough: baseSellThrough,
      };
    });
  }, [products, productHistoricByType, eventType, eventDays, expectedTraffic, sellThroughOverride, growthFactor, bufferPercent, stock]);

  const totalSendQty = projections.reduce((s, p) => s + p.sendWithBuffer, 0);
  const totalShortfall = projections.reduce((s, p) => s + p.shortfall, 0);
  const totalProjectedRevenue = projections.reduce((s, p) => s + p.projectedRevenue, 0);
  const totalProjectedCost = projections.reduce((s, p) => s + p.projectedCost, 0);

  // Chart data
  const chartData = projections.map(p => ({
    name: p.name?.substring(0, 12) || "Product",
    send: p.sendWithBuffer,
    onHand: p.onHand,
    shortfall: p.shortfall,
  }));

  const upcomingEvents = events.filter(e => e.start_date >= new Date().toISOString().split("T")[0]).sort((a, b) => a.start_date.localeCompare(b.start_date));

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold" style={{ color: BRAND.text }}>Inventory Projections</h1>

      {/* Parameter Controls */}
      <div className="rounded-xl p-4" style={{ background: BRAND.glass, border: `1px solid ${BRAND.glassBorder}`, backdropFilter: BRAND.blur }}>
        <p className="text-xs font-semibold mb-3" style={{ color: BRAND.primary }}>EVENT PARAMETERS</p>
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4 mb-4">
          <div>
            <label className="block text-xs mb-1" style={{ color: BRAND.textMuted }}>Select Existing Event (optional)</label>
            <select value={selectedEvent} onChange={(e) => setSelectedEvent(e.target.value)}
              className="w-full px-3 py-2 rounded-lg text-sm focus:outline-none"
              style={{ background: BRAND.accentBlue, border: `1px solid ${BRAND.glassBorder}` }}>
              <option value="">— Custom Parameters —</option>
              {upcomingEvents.map(e => <option key={e.id} value={e.id}>{e.name} ({e.start_date})</option>)}
            </select>
          </div>
          <div>
            <label className="block text-xs mb-1" style={{ color: BRAND.textMuted }}>Event Type</label>
            <select value={eventType} onChange={(e) => setEventType(e.target.value)}
              className="w-full px-3 py-2 rounded-lg text-sm focus:outline-none"
              style={{ background: BRAND.accentBlue, border: `1px solid ${BRAND.glassBorder}` }}>
              {Object.entries(EVENT_TYPE_DEFAULTS).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-xs mb-1" style={{ color: BRAND.textMuted }}>
              Event Duration: <span style={{ color: BRAND.primary }}>{eventDays} day{eventDays > 1 ? "s" : ""}</span>
            </label>
            <input type="range" min="1" max="10" step="1" value={eventDays}
              onChange={(e) => setEventDays(parseInt(e.target.value))}
              className="w-full" />
          </div>
        </div>

        <p className="text-xs font-semibold mb-3 mt-2" style={{ color: BRAND.primary }}>PROJECTION PARAMETERS</p>
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4">
          <div>
            <label className="block text-xs mb-1" style={{ color: BRAND.textMuted }}>
              Expected Traffic: <span style={{ color: BRAND.primary }}>{expectedTraffic.toLocaleString()}</span>
            </label>
            <input type="range" min="50" max="5000" step="50" value={expectedTraffic}
              onChange={(e) => setExpectedTraffic(parseInt(e.target.value))}
              className="w-full" />
          </div>
          <div>
            <label className="block text-xs mb-1" style={{ color: BRAND.textMuted }}>
              Growth Factor: <span style={{ color: BRAND.primary }}>{(growthFactor * 100).toFixed(0)}%</span>
            </label>
            <input type="range" min="0.5" max="3.0" step="0.05" value={growthFactor}
              onChange={(e) => setGrowthFactor(parseFloat(e.target.value))}
              className="w-full" />
          </div>
          <div>
            <label className="block text-xs mb-1" style={{ color: BRAND.textMuted }}>
              Sell-Through Override: <span style={{ color: BRAND.primary }}>{sellThroughOverride > 0 ? `${sellThroughOverride}%` : "Auto"}</span>
            </label>
            <input type="range" min="0" max="100" step="5" value={sellThroughOverride}
              onChange={(e) => setSellThroughOverride(parseInt(e.target.value))}
              className="w-full" />
          </div>
          <div>
            <label className="block text-xs mb-1" style={{ color: BRAND.textMuted }}>
              Stock Buffer: <span style={{ color: BRAND.primary }}>{bufferPercent}%</span>
            </label>
            <input type="range" min="0" max="50" step="5" value={bufferPercent}
              onChange={(e) => setBufferPercent(parseInt(e.target.value))}
              className="w-full" />
          </div>
        </div>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard label="Total to Send" value={totalSendQty} icon={Package} color="primary" />
        <StatCard label="Shortfall" value={totalShortfall} icon={AlertCircle} color={totalShortfall > 0 ? "danger" : "success"} />
        <StatCard label="Proj. Revenue" value={currency(totalProjectedRevenue)} icon={DollarSign} color="success" />
        <StatCard label="Inventory Cost" value={currency(totalProjectedCost)} icon={DollarSign} color="warning" />
      </div>

      {/* Inventory vs Stock Chart */}
      <SectionCard title="Required Inventory vs. On Hand" icon={BarChart3}>
        {chartData.length > 0 ? (
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={chartData} margin={{ top: 10, right: 10, left: 10, bottom: 40 }}>
              <CartesianGrid strokeDasharray="3 3" stroke={BRAND.accentBlue} />
              <XAxis dataKey="name" tick={{ fill: "rgba(224,230,255,0.6)", fontSize: 11 }} angle={-25} textAnchor="end" />
              <YAxis tick={{ fill: "rgba(224,230,255,0.6)", fontSize: 11 }} />
              <Tooltip contentStyle={{ background: BRAND.navy, border: `1px solid ${BRAND.glassBorder}`, borderRadius: 8, color: BRAND.text }} />
              <Legend />
              <Bar dataKey="send" fill={BRAND.primary} name="Need to Send" radius={[4, 4, 0, 0]} />
              <Bar dataKey="onHand" fill={BRAND.success} name="On Hand" radius={[4, 4, 0, 0]} />
              <Bar dataKey="shortfall" fill={BRAND.danger} name="Shortfall" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        ) : (
          <EmptyState icon={Package} title="No products" message="Add active products to see projections" />
        )}
      </SectionCard>

      {/* Detailed Projections Table */}
      <SectionCard title="Product-by-Product Projection" icon={FileText}>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr style={{ borderBottom: `1px solid ${BRAND.glassBorder}` }}>
                <th className="text-left py-3 px-3" style={{ color: BRAND.primary }}>Product</th>
                <th className="text-center py-3 px-3" style={{ color: BRAND.primary }}>Proj. Sold</th>
                <th className="text-center py-3 px-3" style={{ color: BRAND.primary }}>Send Qty</th>
                <th className="text-center py-3 px-3" style={{ color: BRAND.primary }}>On Hand</th>
                <th className="text-center py-3 px-3" style={{ color: BRAND.primary }}>Shortfall</th>
                <th className="text-right py-3 px-3" style={{ color: BRAND.primary }}>Proj. Revenue</th>
                <th className="text-right py-3 px-3" style={{ color: BRAND.primary }}>Cost</th>
                <th className="text-center py-3 px-3" style={{ color: BRAND.primary }}>Sell-Through</th>
              </tr>
            </thead>
            <tbody>
              {projections.map(p => (
                <tr key={p.id} className="hover:bg-white/5 transition" style={{ borderBottom: `1px solid ${BRAND.glassBorder}` }}>
                  <td className="py-3 px-3 font-medium" style={{ color: BRAND.text }}>{p.name}</td>
                  <td className="py-3 px-3 text-center" style={{ color: BRAND.text }}>{p.projectedSold}</td>
                  <td className="py-3 px-3 text-center font-semibold" style={{ color: BRAND.primary }}>{p.sendWithBuffer}</td>
                  <td className="py-3 px-3 text-center" style={{ color: p.onHand >= p.sendWithBuffer ? BRAND.success : BRAND.warning }}>{p.onHand}</td>
                  <td className="py-3 px-3 text-center font-semibold" style={{ color: p.shortfall > 0 ? BRAND.danger : BRAND.success }}>
                    {p.shortfall > 0 ? `-${p.shortfall}` : "0"}
                  </td>
                  <td className="py-3 px-3 text-right" style={{ color: BRAND.success }}>{currency(p.projectedRevenue)}</td>
                  <td className="py-3 px-3 text-right" style={{ color: BRAND.warning }}>{currency(p.projectedCost)}</td>
                  <td className="py-3 px-3 text-center" style={{ color: BRAND.primary }}>{(p.sellThrough * 100).toFixed(0)}%</td>
                </tr>
              ))}
            </tbody>
          </table>
          {projections.length === 0 && <EmptyState icon={Package} title="No active products" message="Add products to see inventory projections" />}
        </div>
      </SectionCard>
    </div>
  );
};

// ============================================================================
// PAGES: PROJECTIONS (Phase 3)
// ============================================================================

const EVENT_TYPE_DEFAULTS = {
  festival: { label: "Festival", avgDays: 3, staffPerDay: 6, sellThrough: 0.65 },
  concert: { label: "Concert", avgDays: 1, staffPerDay: 4, sellThrough: 0.55 },
  market: { label: "Market", avgDays: 2, staffPerDay: 3, sellThrough: 0.50 },
  pop_up: { label: "Pop-Up", avgDays: 1, staffPerDay: 2, sellThrough: 0.45 },
  corporate: { label: "Corporate", avgDays: 1, staffPerDay: 3, sellThrough: 0.70 },
  tournament: { label: "Tournament", avgDays: 3, staffPerDay: 5, sellThrough: 0.60 },
  combine: { label: "Combine", avgDays: 1, staffPerDay: 4, sellThrough: 0.55 },
  camp: { label: "Camp", avgDays: 3, staffPerDay: 4, sellThrough: 0.50 },
  other: { label: "Other", avgDays: 1, staffPerDay: 3, sellThrough: 0.50 },
};

const SalesProjectionsPage = ({ events = [], products = [], historicSales = [], stock = {}, distributions = [] }) => {
  const [growthFactor, setGrowthFactor] = useState(1.0);
  const [selectedEventType, setSelectedEventType] = useState("");

  // Build historic averages by event type and product
  const historicAvgByType = useMemo(() => {
    const map = {};
    historicSales.forEach(s => {
      const type = s.event_type || "other";
      if (!map[type]) map[type] = { revenue: 0, sold: 0, sent: 0, count: 0, events: new Set() };
      map[type].revenue += Number(s.revenue || 0);
      map[type].sold += (s.sold || 0);
      map[type].sent += (s.sent || 0);
      map[type].events.add(s.event_id);
      map[type].count++;
    });
    // Average per event
    Object.keys(map).forEach(type => {
      const numEvents = map[type].events.size || 1;
      map[type].avgRevenuePerEvent = map[type].revenue / numEvents;
      map[type].avgSoldPerEvent = map[type].sold / numEvents;
      map[type].avgSentPerEvent = map[type].sent / numEvents;
      map[type].sellThrough = map[type].sent > 0 ? map[type].sold / map[type].sent : EVENT_TYPE_DEFAULTS[type]?.sellThrough || 0.5;
    });
    return map;
  }, [historicSales]);

  // Product-level averages
  const productAvgs = useMemo(() => {
    const map = {};
    historicSales.forEach(s => {
      const pid = s.product_id;
      if (!map[pid]) map[pid] = { revenue: 0, sold: 0, sent: 0, eventCount: new Set() };
      map[pid].revenue += Number(s.revenue || 0);
      map[pid].sold += (s.sold || 0);
      map[pid].sent += (s.sent || 0);
      map[pid].eventCount.add(s.event_id);
    });
    Object.keys(map).forEach(pid => {
      const n = map[pid].eventCount.size || 1;
      map[pid].avgRevenuePerEvent = map[pid].revenue / n;
      map[pid].avgSoldPerEvent = map[pid].sold / n;
    });
    return map;
  }, [historicSales]);

  // Upcoming events (start_date in the future)
  const upcomingEvents = useMemo(() => {
    const now = new Date().toISOString().split("T")[0];
    return events.filter(e => e.start_date >= now).sort((a, b) => a.start_date.localeCompare(b.start_date));
  }, [events]);

  // Project revenue for each upcoming event
  const projections = useMemo(() => {
    return upcomingEvents.map(event => {
      const type = event.event_type || "festival";
      const hist = historicAvgByType[type];
      const defaults = EVENT_TYPE_DEFAULTS[type] || EVENT_TYPE_DEFAULTS.other;

      let projectedRevenue, projectedUnits, sellThrough;
      if (hist) {
        projectedRevenue = hist.avgRevenuePerEvent * growthFactor;
        projectedUnits = Math.round(hist.avgSoldPerEvent * growthFactor);
        sellThrough = hist.sellThrough;
      } else {
        // No historic data — estimate from product catalog
        const avgRetail = products.length > 0 ? products.reduce((s, p) => s + Number(p.retail || 0), 0) / products.length : 35;
        projectedUnits = Math.round(defaults.staffPerDay * defaults.avgDays * 15 * growthFactor);
        projectedRevenue = projectedUnits * avgRetail;
        sellThrough = defaults.sellThrough;
      }

      // COGS estimate
      const avgCost = products.length > 0 ? products.reduce((s, p) => s + Number(p.cost || 0), 0) / products.length : 15;
      const projectedCOGS = projectedUnits * avgCost;

      return {
        ...event,
        eventType: type,
        projectedRevenue,
        projectedUnits,
        projectedCOGS,
        projectedProfit: projectedRevenue - projectedCOGS,
        sellThrough,
      };
    });
  }, [upcomingEvents, historicAvgByType, products, growthFactor]);

  const filteredProjections = selectedEventType
    ? projections.filter(p => p.eventType === selectedEventType)
    : projections;

  const totalProjectedRevenue = filteredProjections.reduce((s, p) => s + p.projectedRevenue, 0);
  const totalProjectedProfit = filteredProjections.reduce((s, p) => s + p.projectedProfit, 0);
  const totalProjectedUnits = filteredProjections.reduce((s, p) => s + p.projectedUnits, 0);

  // Chart data — projected revenue per event
  const chartData = filteredProjections.slice(0, 12).map(p => ({
    name: p.name?.substring(0, 15) || "Event",
    revenue: Math.round(p.projectedRevenue),
    profit: Math.round(p.projectedProfit),
    units: p.projectedUnits,
  }));

  // Historic vs Projected comparison by event type
  const comparisonData = useMemo(() => {
    return Object.keys(EVENT_TYPE_DEFAULTS).map(type => {
      const hist = historicAvgByType[type];
      const defaults = EVENT_TYPE_DEFAULTS[type];
      return {
        name: defaults.label,
        historic: Math.round(hist?.avgRevenuePerEvent || 0),
        projected: Math.round((hist?.avgRevenuePerEvent || 0) * growthFactor),
      };
    }).filter(d => d.historic > 0 || d.projected > 0);
  }, [historicAvgByType, growthFactor]);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-4">
        <h1 className="text-2xl font-bold" style={{ color: BRAND.text }}>Sales Forecast</h1>
        <div className="flex items-center gap-3">
          <select
            value={selectedEventType}
            onChange={(e) => setSelectedEventType(e.target.value)}
            className="px-3 py-2 rounded-lg text-sm focus:outline-none"
            style={{ background: BRAND.accentBlue, border: `1px solid ${BRAND.glassBorder}` }}
          >
            <option value="">All Event Types</option>
            {Object.entries(EVENT_TYPE_DEFAULTS).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}
          </select>
          <div className="flex items-center gap-2 px-3 py-2 rounded-lg" style={{ background: BRAND.accentBlue, border: `1px solid ${BRAND.glassBorder}` }}>
            <span className="text-xs" style={{ color: BRAND.textMuted }}>Growth</span>
            <input
              type="range"
              min="0.5"
              max="2.0"
              step="0.05"
              value={growthFactor}
              onChange={(e) => setGrowthFactor(parseFloat(e.target.value))}
              className="w-24"
            />
            <span className="text-sm font-semibold" style={{ color: BRAND.primary }}>{(growthFactor * 100).toFixed(0)}%</span>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard label="Projected Revenue" value={currency(totalProjectedRevenue)} icon={DollarSign} color="primary" />
        <StatCard label="Projected Profit" value={currency(totalProjectedProfit)} icon={TrendingUp} color="success" />
        <StatCard label="Projected Units" value={totalProjectedUnits} icon={Package} color="warning" />
        <StatCard label="Upcoming Events" value={filteredProjections.length} icon={Calendar} color="primary" />
      </div>

      {/* Revenue Forecast Chart */}
      <SectionCard title="Revenue Forecast by Event" icon={BarChart3}>
        {chartData.length > 0 ? (
          <ResponsiveContainer width="100%" height={300}>
            <ComposedChart data={chartData} margin={{ top: 10, right: 10, left: 10, bottom: 40 }}>
              <CartesianGrid strokeDasharray="3 3" stroke={BRAND.accentBlue} />
              <XAxis dataKey="name" tick={{ fill: "rgba(224,230,255,0.6)", fontSize: 11 }} angle={-25} textAnchor="end" />
              <YAxis tick={{ fill: "rgba(224,230,255,0.6)", fontSize: 11 }} tickFormatter={(v) => `$${(v / 1000).toFixed(0)}k`} />
              <Tooltip contentStyle={{ background: BRAND.navy, border: `1px solid ${BRAND.glassBorder}`, borderRadius: 8, color: BRAND.text }} formatter={(v, name) => [name === "units" ? v : currency(v), name === "revenue" ? "Revenue" : name === "profit" ? "Profit" : "Units"]} />
              <Legend />
              <Bar dataKey="revenue" fill={BRAND.primary} radius={[4, 4, 0, 0]} name="Revenue" />
              <Line type="monotone" dataKey="profit" stroke={BRAND.success} strokeWidth={2} dot={{ fill: BRAND.success }} name="Profit" />
            </ComposedChart>
          </ResponsiveContainer>
        ) : (
          <EmptyState icon={BarChart3} title="No upcoming events" message="Add events to see revenue projections" />
        )}
      </SectionCard>

      {/* Historic vs Projected Comparison */}
      {comparisonData.length > 0 && (
        <SectionCard title="Historic vs Projected (by Event Type)" icon={TrendingUp}>
          <ResponsiveContainer width="100%" height={250}>
            <BarChart data={comparisonData} margin={{ top: 10, right: 10, left: 10, bottom: 10 }}>
              <CartesianGrid strokeDasharray="3 3" stroke={BRAND.accentBlue} />
              <XAxis dataKey="name" tick={{ fill: "rgba(224,230,255,0.6)", fontSize: 11 }} />
              <YAxis tick={{ fill: "rgba(224,230,255,0.6)", fontSize: 11 }} tickFormatter={(v) => `$${(v / 1000).toFixed(0)}k`} />
              <Tooltip contentStyle={{ background: BRAND.navy, border: `1px solid ${BRAND.glassBorder}`, borderRadius: 8, color: BRAND.text }} formatter={(v) => [currency(v)]} />
              <Legend />
              <Bar dataKey="historic" fill="rgba(84,205,249,0.4)" name="Historic Avg" radius={[4, 4, 0, 0]} />
              <Bar dataKey="projected" fill={BRAND.primary} name="Projected" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </SectionCard>
      )}

      {/* Event Projections Table */}
      <SectionCard title="Event-by-Event Forecast" icon={Calendar}>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr style={{ borderBottom: `1px solid ${BRAND.glassBorder}` }}>
                <th className="text-left py-3 px-3" style={{ color: BRAND.primary }}>Event</th>
                <th className="text-center py-3 px-3" style={{ color: BRAND.primary }}>Date</th>
                <th className="text-center py-3 px-3" style={{ color: BRAND.primary }}>Type</th>
                <th className="text-right py-3 px-3" style={{ color: BRAND.primary }}>Revenue</th>
                <th className="text-right py-3 px-3" style={{ color: BRAND.primary }}>COGS</th>
                <th className="text-right py-3 px-3" style={{ color: BRAND.primary }}>Profit</th>
                <th className="text-center py-3 px-3" style={{ color: BRAND.primary }}>Units</th>
                <th className="text-center py-3 px-3" style={{ color: BRAND.primary }}>Sell-Through</th>
              </tr>
            </thead>
            <tbody>
              {filteredProjections.map(p => (
                <tr key={p.id} className="hover:bg-white/5 transition" style={{ borderBottom: `1px solid ${BRAND.glassBorder}` }}>
                  <td className="py-3 px-3 font-medium" style={{ color: BRAND.text }}>{p.name}</td>
                  <td className="py-3 px-3 text-center text-xs" style={{ color: BRAND.lightBlue }}>{p.start_date}</td>
                  <td className="py-3 px-3 text-center">
                    <span className="text-xs px-2 py-1 rounded-full" style={{ background: "rgba(84,205,249,0.15)", color: BRAND.primary }}>
                      {EVENT_TYPE_DEFAULTS[p.eventType]?.label || p.eventType}
                    </span>
                  </td>
                  <td className="py-3 px-3 text-right" style={{ color: BRAND.primary }}>{currency(p.projectedRevenue)}</td>
                  <td className="py-3 px-3 text-right" style={{ color: BRAND.warning }}>{currency(p.projectedCOGS)}</td>
                  <td className="py-3 px-3 text-right font-semibold" style={{ color: p.projectedProfit >= 0 ? BRAND.success : BRAND.danger }}>
                    {currency(p.projectedProfit)}
                  </td>
                  <td className="py-3 px-3 text-center" style={{ color: BRAND.text }}>{p.projectedUnits}</td>
                  <td className="py-3 px-3 text-center" style={{ color: BRAND.success }}>{(p.sellThrough * 100).toFixed(0)}%</td>
                </tr>
              ))}
            </tbody>
          </table>
          {filteredProjections.length === 0 && <EmptyState icon={Calendar} title="No events to forecast" message="Add upcoming events to generate projections" />}
        </div>
      </SectionCard>

      {/* Top Products Forecast */}
      <SectionCard title="Product Revenue Forecast" icon={Package}>
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {products.filter(p => p.status === "active").map(p => {
            const avg = productAvgs[p.id];
            const projRevenue = (avg?.avgRevenuePerEvent || 0) * filteredProjections.length * growthFactor;
            const projUnits = Math.round((avg?.avgSoldPerEvent || 0) * filteredProjections.length * growthFactor);
            const onHand = stock[p.id] || 0;
            const needsRestock = projUnits > onHand;
            return (
              <div key={p.id} className="rounded-lg p-3" style={{ background: BRAND.accentBlue, border: `1px solid ${BRAND.glassBorder}` }}>
                <div className="flex items-center justify-between mb-2">
                  <span className="font-medium text-sm" style={{ color: BRAND.text }}>{p.name}</span>
                  {needsRestock && (
                    <span className="text-xs px-2 py-0.5 rounded-full" style={{ background: `${BRAND.danger}20`, color: BRAND.danger }}>Restock</span>
                  )}
                </div>
                <div className="grid grid-cols-3 gap-2 text-center text-xs">
                  <div>
                    <p style={{ color: BRAND.textLight }}>Proj. Revenue</p>
                    <p className="font-semibold" style={{ color: BRAND.primary }}>{currency(projRevenue)}</p>
                  </div>
                  <div>
                    <p style={{ color: BRAND.textLight }}>Proj. Units</p>
                    <p className="font-semibold" style={{ color: BRAND.text }}>{projUnits}</p>
                  </div>
                  <div>
                    <p style={{ color: BRAND.textLight }}>In Stock</p>
                    <p className="font-semibold" style={{ color: needsRestock ? BRAND.danger : BRAND.success }}>{onHand}</p>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
        {products.filter(p => p.status === "active").length === 0 && (
          <EmptyState icon={Package} title="No products" message="Add products to see forecasts" />
        )}
      </SectionCard>
    </div>
  );
};

const StaffingProjectionsPage = ({ events = [], employees = [], shifts = [], roleRequirements = [], historicSales = [] }) => {
  const [hourlyOverride, setHourlyOverride] = useState("");

  const activeEmployees = employees.filter(e => e.status === "active");
  const avgHourlyRate = activeEmployees.length > 0
    ? activeEmployees.reduce((s, e) => s + Number(e.hourly_rate || 0), 0) / activeEmployees.length
    : 20;
  const effectiveRate = hourlyOverride ? parseFloat(hourlyOverride) : avgHourlyRate;

  // Upcoming events
  const upcomingEvents = useMemo(() => {
    const now = new Date().toISOString().split("T")[0];
    return events.filter(e => e.start_date >= now).sort((a, b) => a.start_date.localeCompare(b.start_date));
  }, [events]);

  // Calculate staffing needs per event
  const staffingNeeds = useMemo(() => {
    return upcomingEvents.map(event => {
      const type = event.event_type || "festival";
      const defaults = EVENT_TYPE_DEFAULTS[type] || EVENT_TYPE_DEFAULTS.other;
      const days = event.end_date && event.start_date
        ? Math.max(1, Math.ceil((new Date(event.end_date) - new Date(event.start_date)) / (1000 * 60 * 60 * 24)) + 1)
        : defaults.avgDays;

      // Check existing role requirements for this event
      const eventReqs = roleRequirements.filter(r => r.event_id === event.id);
      const reqStaff = eventReqs.reduce((sum, r) => sum + (r.qty_needed || 0), 0);

      // Check already-assigned shifts
      const eventShifts = shifts.filter(s => s.event_id === event.id);
      const assignedStaff = new Set(eventShifts.map(s => s.employee_id)).size;

      const neededStaff = reqStaff > 0 ? reqStaff : defaults.staffPerDay * days;
      const gap = Math.max(0, neededStaff - assignedStaff);
      const hoursPerStaff = 8; // assume 8hr shifts
      const totalHours = neededStaff * hoursPerStaff * days;
      const laborCost = totalHours * effectiveRate;

      return {
        ...event,
        eventType: type,
        days,
        neededStaff,
        assignedStaff,
        gap,
        totalHours,
        laborCost,
        fillRate: neededStaff > 0 ? (assignedStaff / neededStaff) * 100 : 0,
      };
    });
  }, [upcomingEvents, roleRequirements, shifts, effectiveRate]);

  const totalStaffNeeded = staffingNeeds.reduce((s, e) => s + e.neededStaff, 0);
  const totalGaps = staffingNeeds.reduce((s, e) => s + e.gap, 0);
  const totalLaborCost = staffingNeeds.reduce((s, e) => s + e.laborCost, 0);
  const totalHours = staffingNeeds.reduce((s, e) => s + e.totalHours, 0);

  // Chart data — staffing gaps
  const gapChartData = staffingNeeds.slice(0, 10).map(e => ({
    name: e.name?.substring(0, 15) || "Event",
    needed: e.neededStaff,
    assigned: e.assignedStaff,
    gap: e.gap,
  }));

  // Labor cost by event type
  const laborByType = useMemo(() => {
    const map = {};
    staffingNeeds.forEach(e => {
      const label = EVENT_TYPE_DEFAULTS[e.eventType]?.label || e.eventType;
      if (!map[label]) map[label] = 0;
      map[label] += e.laborCost;
    });
    return Object.entries(map).map(([name, cost]) => ({ name, cost: Math.round(cost) })).sort((a, b) => b.cost - a.cost);
  }, [staffingNeeds]);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-4">
        <h1 className="text-2xl font-bold" style={{ color: BRAND.text }}>Staffing Projections</h1>
        <div className="flex items-center gap-2 px-3 py-2 rounded-lg" style={{ background: BRAND.accentBlue, border: `1px solid ${BRAND.glassBorder}` }}>
          <span className="text-xs" style={{ color: BRAND.textMuted }}>Avg Rate</span>
          <input
            type="number"
            placeholder={avgHourlyRate.toFixed(2)}
            value={hourlyOverride}
            onChange={(e) => setHourlyOverride(e.target.value)}
            className="w-20 px-2 py-1 rounded text-sm text-center focus:outline-none"
            style={{ background: BRAND.accentBlue, border: `1px solid ${BRAND.glassBorder}`, color: BRAND.navy }}
          />
          <span className="text-xs" style={{ color: BRAND.primary }}>$/hr</span>
        </div>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard label="Staff Needed" value={totalStaffNeeded} icon={Users} color="primary" />
        <StatCard label="Staffing Gaps" value={totalGaps} icon={AlertCircle} color={totalGaps > 0 ? "danger" : "success"} />
        <StatCard label="Total Hours" value={`${totalHours.toLocaleString()}h`} icon={Clock} color="warning" />
        <StatCard label="Labor Cost" value={currency(totalLaborCost)} icon={DollarSign} color="primary" />
      </div>

      {/* Staffing Gap Chart */}
      <SectionCard title="Staffing Gaps by Event" icon={Users}>
        {gapChartData.length > 0 ? (
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={gapChartData} margin={{ top: 10, right: 10, left: 10, bottom: 40 }}>
              <CartesianGrid strokeDasharray="3 3" stroke={BRAND.accentBlue} />
              <XAxis dataKey="name" tick={{ fill: "rgba(224,230,255,0.6)", fontSize: 11 }} angle={-25} textAnchor="end" />
              <YAxis tick={{ fill: "rgba(224,230,255,0.6)", fontSize: 11 }} />
              <Tooltip contentStyle={{ background: BRAND.navy, border: `1px solid ${BRAND.glassBorder}`, borderRadius: 8, color: BRAND.text }} />
              <Legend />
              <Bar dataKey="assigned" stackId="a" fill={BRAND.success} name="Assigned" radius={[0, 0, 0, 0]} />
              <Bar dataKey="gap" stackId="a" fill={BRAND.danger} name="Gap" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        ) : (
          <EmptyState icon={Users} title="No upcoming events" message="Add events to see staffing projections" />
        )}
      </SectionCard>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Labor by Event Type */}
        <SectionCard title="Labor Cost by Event Type" icon={DollarSign}>
          {laborByType.length > 0 ? (
            <ResponsiveContainer width="100%" height={250}>
              <BarChart data={laborByType} layout="vertical" margin={{ top: 10, right: 20, left: 80, bottom: 10 }}>
                <CartesianGrid strokeDasharray="3 3" stroke={BRAND.accentBlue} />
                <XAxis type="number" tick={{ fill: "rgba(224,230,255,0.6)", fontSize: 11 }} tickFormatter={(v) => `$${(v / 1000).toFixed(0)}k`} />
                <YAxis dataKey="name" type="category" tick={{ fill: "rgba(224,230,255,0.6)", fontSize: 11 }} width={70} />
                <Tooltip contentStyle={{ background: BRAND.navy, border: `1px solid ${BRAND.glassBorder}`, borderRadius: 8, color: BRAND.text }} formatter={(v) => [currency(v), "Labor Cost"]} />
                <Bar dataKey="cost" fill={BRAND.primary} radius={[0, 4, 4, 0]} />
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <EmptyState icon={DollarSign} title="No data" message="Staffing projections will appear here" />
          )}
        </SectionCard>

        {/* Workforce Capacity */}
        <SectionCard title="Workforce Capacity" icon={Briefcase}>
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <span style={{ color: BRAND.text }}>Active Employees</span>
              <span className="font-semibold" style={{ color: BRAND.primary }}>{activeEmployees.length}</span>
            </div>
            <div className="flex items-center justify-between">
              <span style={{ color: BRAND.text }}>Peak Staff Needed</span>
              <span className="font-semibold" style={{ color: BRAND.warning }}>
                {staffingNeeds.length > 0 ? Math.max(...staffingNeeds.map(e => e.neededStaff)) : 0}
              </span>
            </div>
            <div className="flex items-center justify-between">
              <span style={{ color: BRAND.text }}>Events with Gaps</span>
              <span className="font-semibold" style={{ color: BRAND.danger }}>
                {staffingNeeds.filter(e => e.gap > 0).length} / {staffingNeeds.length}
              </span>
            </div>
            <div className="mt-4 p-3 rounded-lg" style={{ background: BRAND.accentBlue }}>
              <p className="text-xs mb-2" style={{ color: BRAND.textLight }}>Overall Fill Rate</p>
              <div className="w-full h-3 rounded-full overflow-hidden" style={{ background: BRAND.accentBlue }}>
                <div
                  className="h-full rounded-full transition-all"
                  style={{
                    width: `${totalStaffNeeded > 0 ? Math.min(100, ((totalStaffNeeded - totalGaps) / totalStaffNeeded) * 100) : 0}%`,
                    background: totalGaps === 0 ? BRAND.success : totalGaps > totalStaffNeeded * 0.3 ? BRAND.danger : BRAND.warning,
                  }}
                />
              </div>
              <p className="text-sm mt-1 font-semibold" style={{ color: BRAND.primary }}>
                {totalStaffNeeded > 0 ? ((totalStaffNeeded - totalGaps) / totalStaffNeeded * 100).toFixed(0) : 100}% filled
              </p>
            </div>
          </div>
        </SectionCard>
      </div>

      {/* Detailed Table */}
      <SectionCard title="Event Staffing Detail" icon={Calendar}>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr style={{ borderBottom: `1px solid ${BRAND.glassBorder}` }}>
                <th className="text-left py-3 px-3" style={{ color: BRAND.primary }}>Event</th>
                <th className="text-center py-3 px-3" style={{ color: BRAND.primary }}>Date</th>
                <th className="text-center py-3 px-3" style={{ color: BRAND.primary }}>Days</th>
                <th className="text-center py-3 px-3" style={{ color: BRAND.primary }}>Needed</th>
                <th className="text-center py-3 px-3" style={{ color: BRAND.primary }}>Assigned</th>
                <th className="text-center py-3 px-3" style={{ color: BRAND.primary }}>Gap</th>
                <th className="text-center py-3 px-3" style={{ color: BRAND.primary }}>Fill Rate</th>
                <th className="text-right py-3 px-3" style={{ color: BRAND.primary }}>Labor Cost</th>
              </tr>
            </thead>
            <tbody>
              {staffingNeeds.map(e => (
                <tr key={e.id} className="hover:bg-white/5 transition" style={{ borderBottom: `1px solid ${BRAND.glassBorder}` }}>
                  <td className="py-3 px-3 font-medium" style={{ color: BRAND.text }}>{e.name}</td>
                  <td className="py-3 px-3 text-center text-xs" style={{ color: BRAND.lightBlue }}>{e.start_date}</td>
                  <td className="py-3 px-3 text-center" style={{ color: BRAND.text }}>{e.days}</td>
                  <td className="py-3 px-3 text-center" style={{ color: BRAND.primary }}>{e.neededStaff}</td>
                  <td className="py-3 px-3 text-center" style={{ color: BRAND.success }}>{e.assignedStaff}</td>
                  <td className="py-3 px-3 text-center font-semibold" style={{ color: e.gap > 0 ? BRAND.danger : BRAND.success }}>
                    {e.gap > 0 ? `-${e.gap}` : "0"}
                  </td>
                  <td className="py-3 px-3 text-center">
                    <div className="inline-flex items-center gap-1">
                      <div className="w-16 h-2 rounded-full overflow-hidden" style={{ background: BRAND.accentBlue }}>
                        <div className="h-full rounded-full" style={{ width: `${Math.min(100, e.fillRate)}%`, background: e.fillRate >= 100 ? BRAND.success : e.fillRate >= 50 ? BRAND.warning : BRAND.danger }} />
                      </div>
                      <span className="text-xs" style={{ color: BRAND.textMuted }}>{e.fillRate.toFixed(0)}%</span>
                    </div>
                  </td>
                  <td className="py-3 px-3 text-right" style={{ color: BRAND.primary }}>{currency(e.laborCost)}</td>
                </tr>
              ))}
            </tbody>
          </table>
          {staffingNeeds.length === 0 && <EmptyState icon={Users} title="No upcoming events" message="Add events to project staffing needs" />}
        </div>
      </SectionCard>
    </div>
  );
};

const EventPnLPage = ({ events = [], products = [], historicSales = [], employees = [], shifts = [], stock = [], roleRequirements = [], distributions = [] }) => {
  const [growthFactor, setGrowthFactor] = useState(1.0);

  const activeEmployees = employees.filter(e => e.status === "active");
  const avgHourlyRate = activeEmployees.length > 0
    ? activeEmployees.reduce((s, e) => s + Number(e.hourly_rate || 0), 0) / activeEmployees.length
    : 20;
  const avgCost = products.length > 0
    ? products.reduce((s, p) => s + Number(p.cost || 0), 0) / products.length
    : 15;

  // Historic averages by event type
  const historicAvgByType = useMemo(() => {
    const map = {};
    historicSales.forEach(s => {
      const type = s.event_type || "other";
      if (!map[type]) map[type] = { revenue: 0, sold: 0, events: new Set() };
      map[type].revenue += Number(s.revenue || 0);
      map[type].sold += (s.sold || 0);
      map[type].events.add(s.event_id);
    });
    Object.keys(map).forEach(type => {
      const n = map[type].events.size || 1;
      map[type].avgRevenuePerEvent = map[type].revenue / n;
      map[type].avgSoldPerEvent = map[type].sold / n;
    });
    return map;
  }, [historicSales]);

  // Upcoming events
  const upcomingEvents = useMemo(() => {
    const now = new Date().toISOString().split("T")[0];
    return events.filter(e => e.start_date >= now).sort((a, b) => a.start_date.localeCompare(b.start_date));
  }, [events]);

  // P&L per event
  const eventPnL = useMemo(() => {
    return upcomingEvents.map(event => {
      const type = event.event_type || "festival";
      const defaults = EVENT_TYPE_DEFAULTS[type] || EVENT_TYPE_DEFAULTS.other;
      const hist = historicAvgByType[type];
      const days = event.end_date && event.start_date
        ? Math.max(1, Math.ceil((new Date(event.end_date) - new Date(event.start_date)) / (1000 * 60 * 60 * 24)) + 1)
        : defaults.avgDays;

      // Revenue projection
      let projRevenue, projUnits;
      if (hist) {
        projRevenue = hist.avgRevenuePerEvent * growthFactor;
        projUnits = Math.round(hist.avgSoldPerEvent * growthFactor);
      } else {
        const avgRetail = products.length > 0 ? products.reduce((s, p) => s + Number(p.retail || 0), 0) / products.length : 35;
        projUnits = Math.round(defaults.staffPerDay * days * 15 * growthFactor);
        projRevenue = projUnits * avgRetail;
      }

      // COGS
      const cogs = projUnits * avgCost;

      // Labor
      const eventReqs = roleRequirements.filter(r => r.event_id === event.id);
      const staffNeeded = eventReqs.length > 0
        ? eventReqs.reduce((sum, r) => sum + (r.qty_needed || 0), 0)
        : defaults.staffPerDay * days;
      const hoursPerStaff = 8;
      const totalHours = staffNeeded * hoursPerStaff * days;
      const laborCost = totalHours * avgHourlyRate;

      // Fixed costs estimate (transport, booth, misc)
      const fixedCosts = days * 200;

      const totalExpenses = cogs + laborCost + fixedCosts;
      const netProfit = projRevenue - totalExpenses;
      const margin = projRevenue > 0 ? (netProfit / projRevenue) * 100 : 0;

      return {
        ...event,
        eventType: type,
        days,
        projRevenue,
        projUnits,
        cogs,
        laborCost,
        fixedCosts,
        totalExpenses,
        netProfit,
        margin,
        staffNeeded,
      };
    });
  }, [upcomingEvents, historicAvgByType, products, roleRequirements, avgHourlyRate, avgCost, growthFactor]);

  const totalRevenue = eventPnL.reduce((s, e) => s + e.projRevenue, 0);
  const totalExpenses = eventPnL.reduce((s, e) => s + e.totalExpenses, 0);
  const totalNetProfit = eventPnL.reduce((s, e) => s + e.netProfit, 0);
  const overallMargin = totalRevenue > 0 ? (totalNetProfit / totalRevenue * 100).toFixed(0) : 0;

  // Waterfall data for expense breakdown
  const waterfallData = [
    { name: "Revenue", value: Math.round(totalRevenue), fill: BRAND.primary },
    { name: "COGS", value: -Math.round(eventPnL.reduce((s, e) => s + e.cogs, 0)), fill: BRAND.danger },
    { name: "Labor", value: -Math.round(eventPnL.reduce((s, e) => s + e.laborCost, 0)), fill: BRAND.warning },
    { name: "Fixed", value: -Math.round(eventPnL.reduce((s, e) => s + e.fixedCosts, 0)), fill: "rgba(224,230,255,0.4)" },
    { name: "Profit", value: Math.round(totalNetProfit), fill: totalNetProfit >= 0 ? BRAND.success : BRAND.danger },
  ];

  // P&L by event chart
  const pnlChartData = eventPnL.slice(0, 10).map(e => ({
    name: e.name?.substring(0, 15) || "Event",
    revenue: Math.round(e.projRevenue),
    expenses: Math.round(e.totalExpenses),
    profit: Math.round(e.netProfit),
  }));

  const COLORS_PIE = [BRAND.danger, BRAND.warning, "rgba(224,230,255,0.4)"];
  const expenseBreakdown = [
    { name: "COGS", value: Math.round(eventPnL.reduce((s, e) => s + e.cogs, 0)) },
    { name: "Labor", value: Math.round(eventPnL.reduce((s, e) => s + e.laborCost, 0)) },
    { name: "Fixed", value: Math.round(eventPnL.reduce((s, e) => s + e.fixedCosts, 0)) },
  ];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-4">
        <h1 className="text-2xl font-bold" style={{ color: BRAND.text }}>Event P&L Estimator</h1>
        <div className="flex items-center gap-2 px-3 py-2 rounded-lg" style={{ background: BRAND.accentBlue, border: `1px solid ${BRAND.glassBorder}` }}>
          <span className="text-xs" style={{ color: BRAND.textMuted }}>Growth</span>
          <input
            type="range"
            min="0.5"
            max="2.0"
            step="0.05"
            value={growthFactor}
            onChange={(e) => setGrowthFactor(parseFloat(e.target.value))}
            className="w-24"
          />
          <span className="text-sm font-semibold" style={{ color: BRAND.primary }}>{(growthFactor * 100).toFixed(0)}%</span>
        </div>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard label="Total Revenue" value={currency(totalRevenue)} icon={DollarSign} color="primary" />
        <StatCard label="Total Expenses" value={currency(totalExpenses)} icon={DollarSign} color="danger" />
        <StatCard label="Net Profit" value={currency(totalNetProfit)} icon={TrendingUp} color={totalNetProfit >= 0 ? "success" : "danger"} />
        <StatCard label="Overall Margin" value={`${overallMargin}%`} icon={BarChart3} color="primary" />
      </div>

      {/* Revenue vs Expenses by Event */}
      <SectionCard title="Revenue vs Expenses by Event" icon={BarChart3}>
        {pnlChartData.length > 0 ? (
          <ResponsiveContainer width="100%" height={300}>
            <ComposedChart data={pnlChartData} margin={{ top: 10, right: 10, left: 10, bottom: 40 }}>
              <CartesianGrid strokeDasharray="3 3" stroke={BRAND.accentBlue} />
              <XAxis dataKey="name" tick={{ fill: "rgba(224,230,255,0.6)", fontSize: 11 }} angle={-25} textAnchor="end" />
              <YAxis tick={{ fill: "rgba(224,230,255,0.6)", fontSize: 11 }} tickFormatter={(v) => `$${(v / 1000).toFixed(0)}k`} />
              <Tooltip contentStyle={{ background: BRAND.navy, border: `1px solid ${BRAND.glassBorder}`, borderRadius: 8, color: BRAND.text }} formatter={(v) => [currency(v)]} />
              <Legend />
              <Bar dataKey="revenue" fill={BRAND.primary} name="Revenue" radius={[4, 4, 0, 0]} />
              <Bar dataKey="expenses" fill={BRAND.danger} name="Expenses" radius={[4, 4, 0, 0]} />
              <Line type="monotone" dataKey="profit" stroke={BRAND.success} strokeWidth={2} dot={{ fill: BRAND.success }} name="Net Profit" />
            </ComposedChart>
          </ResponsiveContainer>
        ) : (
          <EmptyState icon={BarChart3} title="No upcoming events" message="Add events to generate P&L estimates" />
        )}
      </SectionCard>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Expense Breakdown Pie */}
        <SectionCard title="Expense Breakdown" icon={DollarSign}>
          {totalExpenses > 0 ? (
            <div>
              <ResponsiveContainer width="100%" height={220}>
                <PieChart>
                  <Pie data={expenseBreakdown} cx="50%" cy="50%" outerRadius={75} dataKey="value" label={(entry) => entry.name} labelLine={false}>
                    {expenseBreakdown.map((_, i) => (
                      <Cell key={i} fill={COLORS_PIE[i]} />
                    ))}
                  </Pie>
                  <Tooltip contentStyle={{ background: BRAND.navy, border: `1px solid ${BRAND.glassBorder}`, borderRadius: 8, color: BRAND.text }} formatter={(v) => [currency(v)]} />
                </PieChart>
              </ResponsiveContainer>
              <div className="space-y-1 mt-2">
                {expenseBreakdown.map((item, i) => (
                  <div key={item.name} className="flex items-center justify-between text-sm">
                    <div className="flex items-center gap-2">
                      <div className="w-3 h-3 rounded-full" style={{ background: COLORS_PIE[i] }}></div>
                      <span style={{ color: BRAND.text }}>{item.name}</span>
                    </div>
                    <span style={{ color: BRAND.primary }}>{currency(item.value)} ({totalExpenses > 0 ? ((item.value / totalExpenses) * 100).toFixed(0) : 0}%)</span>
                  </div>
                ))}
              </div>
            </div>
          ) : (
            <EmptyState icon={DollarSign} title="No data" message="Expense breakdown will appear here" />
          )}
        </SectionCard>

        {/* Margin Summary */}
        <SectionCard title="Margin by Event Type" icon={TrendingUp}>
          <div className="space-y-3">
            {Object.entries(EVENT_TYPE_DEFAULTS).map(([type, def]) => {
              const typeEvents = eventPnL.filter(e => e.eventType === type);
              if (typeEvents.length === 0) return null;
              const typeRevenue = typeEvents.reduce((s, e) => s + e.projRevenue, 0);
              const typeProfit = typeEvents.reduce((s, e) => s + e.netProfit, 0);
              const typeMargin = typeRevenue > 0 ? (typeProfit / typeRevenue) * 100 : 0;
              return (
                <div key={type} className="p-3 rounded-lg" style={{ background: BRAND.accentBlue }}>
                  <div className="flex items-center justify-between mb-2">
                    <span className="font-medium text-sm" style={{ color: BRAND.text }}>{def.label}</span>
                    <span className="text-sm font-semibold" style={{ color: typeMargin >= 0 ? BRAND.success : BRAND.danger }}>{typeMargin.toFixed(0)}% margin</span>
                  </div>
                  <div className="flex items-center justify-between text-xs">
                    <span style={{ color: BRAND.textLight }}>{typeEvents.length} events</span>
                    <span style={{ color: BRAND.primary }}>{currency(typeRevenue)} rev &rarr; {currency(typeProfit)} profit</span>
                  </div>
                  <div className="w-full h-2 rounded-full mt-2 overflow-hidden" style={{ background: BRAND.accentBlue }}>
                    <div className="h-full rounded-full" style={{ width: `${Math.max(0, Math.min(100, typeMargin))}%`, background: typeMargin >= 30 ? BRAND.success : typeMargin >= 10 ? BRAND.warning : BRAND.danger }} />
                  </div>
                </div>
              );
            }).filter(Boolean)}
            {eventPnL.length === 0 && <EmptyState icon={TrendingUp} title="No data" message="Add events to see margin analysis" />}
          </div>
        </SectionCard>
      </div>

      {/* Detailed P&L Table */}
      <SectionCard title="Event P&L Detail" icon={FileText}>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr style={{ borderBottom: `1px solid ${BRAND.glassBorder}` }}>
                <th className="text-left py-3 px-2" style={{ color: BRAND.primary }}>Event</th>
                <th className="text-center py-3 px-2" style={{ color: BRAND.primary }}>Type</th>
                <th className="text-right py-3 px-2" style={{ color: BRAND.primary }}>Revenue</th>
                <th className="text-right py-3 px-2" style={{ color: BRAND.primary }}>COGS</th>
                <th className="text-right py-3 px-2" style={{ color: BRAND.primary }}>Labor</th>
                <th className="text-right py-3 px-2" style={{ color: BRAND.primary }}>Fixed</th>
                <th className="text-right py-3 px-2" style={{ color: BRAND.primary }}>Net Profit</th>
                <th className="text-center py-3 px-2" style={{ color: BRAND.primary }}>Margin</th>
              </tr>
            </thead>
            <tbody>
              {eventPnL.map(e => (
                <tr key={e.id} className="hover:bg-white/5 transition" style={{ borderBottom: `1px solid ${BRAND.glassBorder}` }}>
                  <td className="py-3 px-2 font-medium" style={{ color: BRAND.text }}>{e.name}</td>
                  <td className="py-3 px-2 text-center">
                    <span className="text-xs px-2 py-0.5 rounded-full" style={{ background: "rgba(84,205,249,0.15)", color: BRAND.primary }}>
                      {EVENT_TYPE_DEFAULTS[e.eventType]?.label || e.eventType}
                    </span>
                  </td>
                  <td className="py-3 px-2 text-right" style={{ color: BRAND.primary }}>{currency(e.projRevenue)}</td>
                  <td className="py-3 px-2 text-right" style={{ color: BRAND.danger }}>{currency(e.cogs)}</td>
                  <td className="py-3 px-2 text-right" style={{ color: BRAND.warning }}>{currency(e.laborCost)}</td>
                  <td className="py-3 px-2 text-right" style={{ color: BRAND.textMuted }}>{currency(e.fixedCosts)}</td>
                  <td className="py-3 px-2 text-right font-semibold" style={{ color: e.netProfit >= 0 ? BRAND.success : BRAND.danger }}>
                    {currency(e.netProfit)}
                  </td>
                  <td className="py-3 px-2 text-center">
                    <span className="text-xs font-semibold" style={{ color: e.margin >= 20 ? BRAND.success : e.margin >= 0 ? BRAND.warning : BRAND.danger }}>
                      {e.margin.toFixed(0)}%
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {eventPnL.length === 0 && <EmptyState icon={FileText} title="No upcoming events" message="Add events to generate P&L estimates" />}
        </div>
      </SectionCard>
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
            className="p-4 rounded-lg cursor-pointer transition hover:bg-blue-50"
            style={{
              background: notif.read ? `${BRAND.accentBlue}30` : `${BRAND.primary}20`,
              border: `1px solid ${notif.read ? BRAND.glassBorder : BRAND.primary}`,
            }}
          >
            <div className="flex items-start justify-between">
              <div>
                <p className="font-medium" style={{ color: BRAND.text }}>
                  {notif.title}
                </p>
                <p className="text-sm mt-1" style={{ color: BRAND.textMuted }}>
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
// PAGES: USER MANAGEMENT
// ============================================================================

const UserManagementPage = ({ user, employees = [], onRefresh }) => {
  const [users, setUsers] = useState([]);
  const [loadingUsers, setLoadingUsers] = useState(false);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showResetModal, setShowResetModal] = useState(false);
  const [selectedUser, setSelectedUser] = useState(null);
  const [saving, setSaving] = useState(false);
  const [actionMessage, setActionMessage] = useState("");
  const [createForm, setCreateForm] = useState({
    email: "", first_name: "", last_name: "", app_role: "employee", hourly_rate: "",
  });
  const [resetPassword, setResetPassword] = useState("");
  const [sendingResetEmail, setSendingResetEmail] = useState(null);

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
      "https://jediymydtrgxrnazizai.supabase.co/functions/v1/admin-users",
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
        setCreateForm({ email: "", first_name: "", last_name: "", app_role: "employee", hourly_rate: "" });
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
      const { error } = await supabase.auth.resetPasswordForEmail(userEmail, {
        redirectTo: `${window.location.origin}/#/reset-password`,
      });
      if (error) { setActionMessage(`Error: ${error.message}`); }
      else { setActionMessage("Password reset email sent!"); }
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

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div>
          <h1 className="text-2xl font-bold" style={{ color: BRAND.text }}>User Management</h1>
          <p className="text-sm mt-1" style={{ color: BRAND.textMuted }}>
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
            <p className="mt-2 text-sm" style={{ color: BRAND.textMuted }}>Loading users...</p>
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
                          {u.first_name && u.last_name ? `${u.first_name} ${u.last_name}` : "—"}
                        </span>
                      </div>
                    </td>
                    <td className="py-3 px-3" style={{ color: BRAND.lightBlue }}>{u.email}</td>
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
                    <td className="py-3 px-3 text-center text-xs" style={{ color: BRAND.textLight }}>
                      {u.last_sign_in_at ? new Date(u.last_sign_in_at).toLocaleDateString("en-CA", { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" }) : "Never"}
                    </td>
                    <td className="py-3 px-3 text-center">
                      <div className="flex items-center justify-center gap-1">
                        <button
                          onClick={() => handleSendResetEmail(u.email)}
                          className="p-1.5 rounded hover:bg-blue-50 transition"
                          title="Send Password Reset Email"
                          style={{ color: sendingResetEmail === u.email ? "rgba(224,230,255,0.3)" : BRAND.primary }}
                          disabled={sendingResetEmail === u.email}
                        >
                          {sendingResetEmail === u.email ? <Clock size={14} /> : <FileText size={14} />}
                        </button>
                        <button
                          onClick={() => { setSelectedUser(u); setShowResetModal(true); }}
                          className="p-1.5 rounded hover:bg-blue-50 transition"
                          title="Reset Password Manually"
                          style={{ color: BRAND.warning }}
                        >
                          <Lock size={14} />
                        </button>
                        <button
                          onClick={() => handleToggleAccess(u.id, !u.banned)}
                          className="p-1.5 rounded hover:bg-blue-50 transition"
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
            <div key={r.role} className="rounded-lg p-3" style={{ background: BRAND.accentBlue, border: `1px solid ${BRAND.glassBorder}` }}>
              <div className="flex items-center gap-2 mb-2">
                <div className="w-3 h-3 rounded-full" style={{ background: r.color }}></div>
                <span className="font-semibold text-sm" style={{ color: BRAND.text }}>{r.role}</span>
              </div>
              <p className="text-xs" style={{ color: BRAND.textMuted }}>{r.perms}</p>
            </div>
          ))}
        </div>
      </SectionCard>

      {/* Create User Modal */}
      <Modal isOpen={showCreateModal} onClose={() => { setShowCreateModal(false); setCreateForm({ email: "", first_name: "", last_name: "", app_role: "employee", hourly_rate: "" }); }} title="Create New User" size="md">
        <div className="space-y-3">
          <div className="grid grid-cols-2 gap-3">
            <Input label="First Name" value={createForm.first_name} onChange={(e) => setCreateForm({ ...createForm, first_name: e.target.value })} placeholder="John" />
            <Input label="Last Name" value={createForm.last_name} onChange={(e) => setCreateForm({ ...createForm, last_name: e.target.value })} placeholder="Doe" />
          </div>
          <Input label="Email" type="email" value={createForm.email} onChange={(e) => setCreateForm({ ...createForm, email: e.target.value })} placeholder="john@collideapparel.com" />
          <p className="text-xs" style={{ color: BRAND.textLight }}>They will receive an email to set their own password.</p>
          <Select label="Access Role" value={createForm.app_role} onChange={(e) => setCreateForm({ ...createForm, app_role: e.target.value })} options={[
            { value: "admin", label: "Admin — Full access" },
            { value: "team_lead", label: "Team Lead — Scheduling & inventory" },
            { value: "employee", label: "Employee — My Shifts only" },
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
          <p className="text-sm" style={{ color: BRAND.lightBlue }}>
            Reset password for <strong style={{ color: BRAND.text }}>{selectedUser?.email}</strong>
          </p>
          <Input label="New Password" type="text" value={resetPassword} onChange={(e) => setResetPassword(e.target.value)} placeholder="Min 6 characters" />
          <div className="flex justify-end gap-2 mt-4">
            <Btn variant="secondary" onClick={() => { setShowResetModal(false); setSelectedUser(null); setResetPassword(""); }}>Cancel</Btn>
            <Btn onClick={handleResetPassword} disabled={saving || resetPassword.length < 6}>
              {saving ? "Resetting..." : "Reset Password"}
            </Btn>
          </div>
        </div>
      </Modal>
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
  const [showSetPassword, setShowSetPassword] = useState(false);
  const [isInviteFlow, setIsInviteFlow] = useState(() => {
    const hash = window.location.hash;
    return hash.includes("access_token") && (hash.includes("type=invite") || hash.includes("type=recovery") || hash.includes("type=magiclink"));
  });

  // Navigation State
  const [currentNav, setCurrentNav] = useState(() => {
    const hash = window.location.hash.replace('#/', '');
    if (hash && !hash.includes("access_token")) {
      for (const section of NAV_TREE.sections) {
        if (section.id === hash) return { section: hash, page: null };
        const child = section.children?.find(c => c.page === hash);
        if (child) return { section: section.id, page: hash };
      }
    }
    return { section: "dashboard", page: null };
  });
  const [expandedSections, setExpandedSections] = useState(new Set());

  // Data State
  const [employees, setEmployees] = useState([]);
  const [events, setEvents] = useState([]);
  const [locations, setLocations] = useState([]);
  const [venues, setVenues] = useState([]);
  const [eventVenues, setEventVenues] = useState([]);
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

  // Role State — default to most restrictive until confirmed
  const [currentRole, setCurrentRole] = useState(null);
  const [roleLoaded, setRoleLoaded] = useState(false);

  // UI State
  const [commandPaletteOpen, setCommandPaletteOpen] = useState(false);
  const unsubscribeRef = useRef(new Set());

  // Reactive mobile detection (must be before any early returns to respect hooks rules)
  const [isMobile, setIsMobile] = useState(
    typeof window !== "undefined" && window.innerWidth < 768
  );
  useEffect(() => {
    const onResize = () => setIsMobile(window.innerWidth < 768);
    window.addEventListener("resize", onResize);
    return () => window.removeEventListener("resize", onResize);
  }, []);
  useEffect(() => {
    if (!isMobile) setMobileMenuOpen(false);
  }, [isMobile]);

  // Hash routing - update hash when currentNav changes
  useEffect(() => {
    const page = currentNav.page || currentNav.section;
    window.location.hash = `#/${page}`;
  }, [currentNav]);

  // Hash routing - listen for back/forward navigation
  useEffect(() => {
    const handleHashChange = () => {
      const hash = window.location.hash.replace('#/', '');
      if (!hash) return;
      for (const section of NAV_TREE.sections) {
        if (section.id === hash && currentNav.section !== hash) {
          setCurrentNav({ section: hash, page: null });
          return;
        }
        const child = section.children?.find(c => c.page === hash);
        if (child && currentNav.page !== hash) {
          setCurrentNav({ section: section.id, page: hash });
          return;
        }
      }
    };
    window.addEventListener('hashchange', handleHashChange);
    return () => window.removeEventListener('hashchange', handleHashChange);
  }, [currentNav]);

  // Check auth on mount
  useEffect(() => {
    const checkAuth = async () => {
      try {
        // Optimistic auth: check localStorage for cached token first
        const cachedSession = localStorage.getItem('supabase.auth.token');
        if (cachedSession) {
          try {
            const parsed = JSON.parse(cachedSession);
            if (parsed.user) {
              setUser(parsed.user);
              await loadData();
            }
          } catch (e) {
            // Invalid cached session, will verify via getSession
          }
        }

        // Verify/refresh token in background (with timeout)
        const sessionPromise = supabase.auth.getSession();
        const timeoutPromise = new Promise((_, reject) =>
          setTimeout(() => reject(new Error("Auth session check timed out")), 8000)
        );
        const {
          data: { session },
        } = await Promise.race([sessionPromise, timeoutPromise]);
        if (session?.user) {
          setUser(session.user);
          // Only reload data if not already loaded optimistically
          if (!cachedSession) {
            await loadData();
          }
        }
      } catch (error) {
        // On timeout: don't clear user if cached token exists
        if (error.message !== "Auth session check timed out" || !localStorage.getItem('supabase.auth.token')) {
          console.error("Auth check failed:", error);
          setUser(null);
        }
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
        if (event === "PASSWORD_RECOVERY") {
          setShowSetPassword(true);
          window.location.hash = "#/dashboard";
        } else if (event === "SIGNED_IN" || event === "INITIAL_SESSION") {
          if (isInviteFlow) {
            setShowSetPassword(true);
            setIsInviteFlow(false);
            window.location.hash = "#/dashboard";
          } else if (!showSetPassword) {
            await loadData();
          }
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
      const [empRes, evtRes, locRes, venRes, evVenRes, shiftRes, availRes, prodRes, stockRes, distRes, histRes, templRes, notRes, skillsRes, empSkillsRes, roleReqRes] = await Promise.all([
        supabase.from("employees").select("*"),
        supabase.from("events").select("*"),
        supabase.from("event_locations").select("*"),
        supabase.from("venues").select("*"),
        supabase.from("event_venues").select("*"),
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
      if (venRes.data) setVenues(venRes.data);
      if (evVenRes.data) setEventVenues(evVenRes.data);
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

  // Load current user's role — raw fetch to bypass Supabase Web Locks bug entirely
  const loadUserRole = useCallback(async () => {
    if (!user?.email) return;
    try {
      // Read JWT from localStorage (same pattern as callEdgeFn)
      let token = null;
      try {
        const key = Object.keys(localStorage).find(k => k.startsWith("sb-") && k.endsWith("-auth-token"));
        if (key) {
          const stored = JSON.parse(localStorage.getItem(key));
          token = stored?.access_token || null;
        }
      } catch (e) { /* ignore */ }

      if (token) {
        // Call get_my_role RPC via raw fetch — completely bypasses supabase client
        const res = await fetch(
          `${import.meta.env.VITE_SUPABASE_URL}/rest/v1/rpc/get_my_role`,
          {
            method: "POST",
            headers: {
              Authorization: `Bearer ${token}`,
              apikey: import.meta.env.VITE_SUPABASE_ANON_KEY,
              "Content-Type": "application/json",
            },
            body: "{}",
          }
        );
        if (res.ok) {
          const role = await res.json();
          if (role && typeof role === "string") {
            setCurrentRole(role);
            setRoleLoaded(true);
            return;
          }
        }
      }
    } catch (e) {
      console.error("Role load failed:", e);
    }
    setCurrentRole("employee");
    setRoleLoaded(true);
  }, [user]);

  useEffect(() => { loadUserRole(); }, [loadUserRole]);

  // Setup Realtime subscriptions
  const setupRealtimeSubscriptions = () => {
    const tables = ["employees", "events", "event_locations", "venues", "event_venues", "shifts", "notifications", "skills", "employee_skills", "role_requirements", "products", "stock_levels", "distributions"];

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

  // Handle logout — bypass supabase.auth.signOut() which triggers Web Locks bug
  const handleLogout = () => {
    try {
      // Clear Supabase auth token from localStorage directly
      const key = Object.keys(localStorage).find(k => k.startsWith("sb-") && k.endsWith("-auth-token"));
      if (key) localStorage.removeItem(key);
    } catch (e) { /* ignore */ }
    setUser(null);
    setCurrentRole(null);
    setRoleLoaded(false);
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
  // Check if user has access to a page by checking NAV_TREE roles
  const hasPageAccess = (pageName) => {
    if (!currentRole) return false;
    if (!pageName || pageName === "dashboard") return true; // dashboard is accessible to all
    for (const section of NAV_TREE.sections) {
      if (section.page === pageName) return !section.roles || section.roles.includes(currentRole);
      if (section.children) {
        const child = section.children.find(c => c.page === pageName);
        if (child) return !child.roles || child.roles.includes(currentRole);
      }
    }
    return false;
  };

  const AccessDenied = () => (
    <div style={{ padding: 40, textAlign: "center" }}>
      <div style={{
        background: BRAND.glass,
        backdropFilter: "blur(20px)",
        border: `1px solid ${BRAND.glassBorder}`,
        borderRadius: 16,
        padding: "40px 32px",
        maxWidth: 420,
        margin: "0 auto",
      }}>
        <div style={{ fontSize: 48, marginBottom: 16 }}>🔒</div>
        <h2 style={{ color: BRAND.text, marginBottom: 8, fontSize: 20 }}>Access Restricted</h2>
        <p style={{ color: BRAND.textMuted, fontSize: 14, lineHeight: 1.5 }}>
          You don't have permission to view this page. Contact your admin if you think this is a mistake.
        </p>
      </div>
    </div>
  );

  // ── Section Wrapper ──
  const DashSectionWrap = ({ title, icon: Icon, children, large }) => (
    <div className="rounded-2xl overflow-hidden" style={{ background: BRAND.white, border: `2px solid ${BRAND.accentBlue}`, minHeight: large ? 520 : 340 }}>
      <div className="px-5 py-3 flex items-center gap-2 border-b" style={{ borderColor: BRAND.accentBlue, background: `${BRAND.accentBlue}60` }}>
        {Icon && <Icon size={18} style={{ color: BRAND.navy }} />}
        <h3 className="text-base font-semibold" style={{ color: BRAND.navy }}>{title}</h3>
      </div>
      <div className="p-0">{children}</div>
    </div>
  );

  // ── User Menu State ──
  const [userMenuOpen, setUserMenuOpen] = useState(false);
  const [hoveredFlyout, setHoveredFlyout] = useState(null);
  const flyoutTimeout = useRef(null);

  // Close user menu when clicking outside (must be before any conditional returns to satisfy React hooks rules)
  useEffect(() => {
    if (!userMenuOpen) return;
    const close = (e) => {
      if (!e.target.closest("[data-user-menu]")) setUserMenuOpen(false);
    };
    document.addEventListener("click", close);
    return () => document.removeEventListener("click", close);
  }, [userMenuOpen]);

  const currentEmployee = employees.find(e => e.email === user?.email);
  const displayName = currentEmployee ? (currentEmployee.name || `${currentEmployee.first_name || ""} ${currentEmployee.last_name || ""}`.trim()) : user?.email?.split("@")[0] || "User";

  // ── Staffing Page (single page, Scheduling + Assignment + Staffing Analytics tabs) ──
  const SchedulingPage = () => {
    return (
      <EventsPage events={events} employees={employees} shifts={shifts} locations={locations} venues={venues} eventVenues={eventVenues} availability={availability} employeeSkills={employeeSkills} skills={skills} roleRequirements={roleRequirements} onRefresh={loadData} />
    );
  };

  // ── Staffing Dashboard (3-column snapshot landing) ──
  const StaffingDashboardPage = () => {
    const now = new Date();
    const today = now.toISOString().split("T")[0];
    const upcomingEvents = events.filter(e => e.end_date >= today).sort((a, b) => a.start_date.localeCompare(b.start_date));

    // Count upcoming shifts
    const totalUpcomingShifts = shifts.filter(s => {
      const ev = events.find(e => e.id === s.event_id);
      return ev && ev.end_date >= today;
    }).length;

    // Build unclaimed shifts list
    const unclaimedShifts = (() => {
      const result = [];
      upcomingEvents.forEach(event => {
        const evReqs = roleRequirements.filter(r => r.event_id === event.id);
        const evShifts = shifts.filter(s => s.event_id === event.id && s.employee_id);
        const filledRoles = {};
        evShifts.forEach(s => { filledRoles[s.role] = (filledRoles[s.role] || 0) + 1; });
        evReqs.forEach(req => {
          const role = req.role_name || "Unspecified";
          const needed = req.qty_needed || 1;
          const filled = filledRoles[role] || 0;
          const open = needed - filled;
          if (open > 0) {
            const daysUntil = Math.max(0, Math.ceil((new Date(event.start_date) - now) / (1000 * 60 * 60 * 24)));
            for (let i = 0; i < open; i++) {
              result.push({ id: `${event.id}-${role}-${i}`, eventName: event.name, role, date: event.start_date, daysUntil });
            }
          }
        });
      });
      return result.sort((a, b) => a.daysUntil - b.daysUntil);
    })();

    // YTD payroll estimate (hours × rate from shifts)
    const currentYear = now.getFullYear();
    const ytdPayroll = employees.reduce((total, emp) => {
      const empShifts = shifts.filter(s => s.employee_id === emp.id && s.shift_date && s.shift_date.startsWith(String(currentYear)));
      const hours = empShifts.reduce((sum, s) => {
        if (!s.start_time || !s.end_time) return sum + 8;
        const start = new Date(`2000-01-01T${s.start_time}`);
        const end = new Date(`2000-01-01T${s.end_time}`);
        return sum + Math.max(0, (end - start) / 3600000);
      }, 0);
      return total + hours * (emp.hourly_rate || 20);
    }, 0);

    // Monthly wage data for line chart (Jan-Dec of current year)
    const monthNames = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
    const wageData = monthNames.map((name, idx) => {
      const monthStr = `${currentYear}-${String(idx + 1).padStart(2, "0")}`;
      const monthPayroll = employees.reduce((total, emp) => {
        const empShifts = shifts.filter(s => s.employee_id === emp.id && s.shift_date && s.shift_date.startsWith(monthStr));
        const hours = empShifts.reduce((sum, s) => {
          if (!s.start_time || !s.end_time) return sum + 8;
          const start = new Date(`2000-01-01T${s.start_time}`);
          const end = new Date(`2000-01-01T${s.end_time}`);
          return sum + Math.max(0, (end - start) / 3600000);
        }, 0);
        return total + hours * (emp.hourly_rate || 20);
      }, 0);
      const isFuture = idx > now.getMonth();
      return { name, wages: monthPayroll, projected: isFuture ? Math.max(monthPayroll, ytdPayroll / Math.max(1, now.getMonth() + 1)) : null };
    });

    // Projected payroll for next 2 months
    const avgMonthly = ytdPayroll / Math.max(1, now.getMonth() + 1);
    const nextMonth1 = monthNames[(now.getMonth() + 1) % 12];
    const nextMonth2 = monthNames[(now.getMonth() + 2) % 12];

    // Per-event shift stats for scheduling card
    const eventShiftStats = upcomingEvents.slice(0, 6).map(evt => {
      const evShifts = shifts.filter(s => s.event_id === evt.id);
      const totalShifts = evShifts.length;
      const claimed = evShifts.filter(s => s.employee_id).length;
      const evReqs = roleRequirements.filter(r => r.event_id === evt.id);
      const totalNeeded = evReqs.reduce((sum, r) => sum + (r.qty_needed || 1), 0);
      const available = Math.max(0, totalNeeded - claimed);
      return { ...evt, totalShifts: Math.max(totalShifts, totalNeeded), claimed, available };
    });

    return (
      <div className="space-y-5">
        <div>
          <h1 className="text-2xl font-bold" style={{ color: BRAND.navy }}>Staffing</h1>
          <p className="text-sm mt-1 font-medium" style={{ color: BRAND.lightBlue }}>Overview of scheduling, assignments, and analytics.</p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-5" style={{ minHeight: "calc(100vh - 200px)" }}>

          {/* ── SCHEDULING CARD ── */}
          <div className="rounded-2xl flex flex-col overflow-hidden transition-all duration-300 group cursor-pointer hover:shadow-[0_0_24px_rgba(0,57,107,0.25)]"
            onClick={() => handleNavigate({ section: "scheduling", page: "scheduling-cal" })}
            style={{ background: BRAND.white, border: `2px solid ${BRAND.navy}` }}>
            {/* Blue header */}
            <div className="px-5 py-4 text-center" style={{ background: BRAND.navy }}>
              <h2 className="text-lg font-bold uppercase tracking-wider" style={{ color: BRAND.white }}>Scheduling</h2>
            </div>
            {/* Content — events with shift breakdown */}
            <div className="flex-1 flex flex-col px-5 pt-4 pb-3">
              <div className="space-y-2 overflow-y-auto" style={{ maxHeight: "34vh" }}>
                {eventShiftStats.length === 0 ? (
                  <div className="text-center py-6">
                    <Calendar size={28} style={{ color: BRAND.lightBlue, margin: "0 auto 6px" }} />
                    <p className="text-xs font-medium" style={{ color: BRAND.lightBlue }}>No upcoming events</p>
                  </div>
                ) : (
                  <>
                    {/* Column headers */}
                    <div className="flex items-center gap-3 px-3 pb-1" style={{ borderBottom: `1px solid ${BRAND.accentBlue}` }}>
                      <div className="flex-1 min-w-0">
                        <div className="text-[10px] font-bold uppercase tracking-wider" style={{ color: BRAND.lightBlue }}>Event</div>
                      </div>
                      <div className="text-center" style={{ width: 52 }}>
                        <div className="text-[10px] font-bold uppercase tracking-wider" style={{ color: BRAND.lightBlue }}>Total</div>
                      </div>
                      <div className="text-center" style={{ width: 58 }}>
                        <div className="text-[10px] font-bold uppercase tracking-wider" style={{ color: BRAND.lightBlue }}>Claimed</div>
                      </div>
                      <div className="text-center" style={{ width: 50 }}>
                        <div className="text-[10px] font-bold uppercase tracking-wider" style={{ color: BRAND.lightBlue }}>Open</div>
                      </div>
                    </div>
                    {eventShiftStats.map(evt => (
                      <div key={evt.id} className="flex items-center gap-3 px-3 py-2.5 rounded-lg" style={{ background: `${BRAND.accentBlue}60` }}>
                        <div className="w-2 h-2 rounded-full flex-shrink-0" style={{ background: BRAND.primary }}></div>
                        <div className="flex-1 min-w-0">
                          <div className="text-sm font-semibold truncate" style={{ color: BRAND.navy }}>{evt.name}</div>
                          <div className="text-[11px]" style={{ color: BRAND.lightBlue }}>{evt.start_date} — {evt.end_date}</div>
                        </div>
                        <div className="text-center" style={{ width: 52 }}>
                          <div className="text-sm font-black" style={{ color: BRAND.navy }}>{evt.totalShifts}</div>
                        </div>
                        <div className="text-center" style={{ width: 58 }}>
                          <div className="text-sm font-black" style={{ color: BRAND.success }}>{evt.claimed}</div>
                        </div>
                        <div className="text-center" style={{ width: 50 }}>
                          <div className="text-sm font-black" style={{ color: evt.available > 0 ? BRAND.danger : BRAND.navy }}>{evt.available}</div>
                        </div>
                      </div>
                    ))}
                    {upcomingEvents.length > 6 && (
                      <p className="text-xs text-center pt-1" style={{ color: BRAND.lightBlue }}>+{upcomingEvents.length - 6} more</p>
                    )}
                  </>
                )}
              </div>
              {/* Total shifts summary */}
              <div className="text-center py-3 mt-2" style={{ borderTop: `1px solid ${BRAND.accentBlue}` }}>
                <div className="text-4xl font-black" style={{ color: BRAND.navy, lineHeight: 1 }}>{totalUpcomingShifts}</div>
                <div className="text-[10px] font-semibold uppercase tracking-wider mt-1.5" style={{ color: BRAND.lightBlue }}>Total Shifts</div>
              </div>
            </div>
            {/* Parallel Enter button pinned to bottom */}
            <div className="px-5 pb-5 pt-2 mt-auto flex justify-center">
              <div className="flex items-center justify-center rounded-xl font-bold text-sm uppercase tracking-wider transition-all group-hover:shadow-lg group-hover:scale-105"
                style={{ width: "60%", paddingTop: "1.25rem", paddingBottom: "1.25rem", background: BRAND.navy, color: BRAND.white }}>
                Enter Scheduling
              </div>
            </div>
          </div>

          {/* ── ASSIGNMENT CARD ── */}
          <div className="rounded-2xl flex flex-col overflow-hidden transition-all duration-300 group cursor-pointer hover:shadow-[0_0_24px_rgba(0,57,107,0.25)]"
            onClick={() => handleNavigate({ section: "scheduling", page: "assignment" })}
            style={{ background: BRAND.white, border: `2px solid ${BRAND.navy}` }}>
            {/* Blue header */}
            <div className="px-5 py-4 text-center" style={{ background: BRAND.navy }}>
              <h2 className="text-lg font-bold uppercase tracking-wider" style={{ color: BRAND.white }}>Assignment</h2>
            </div>
            {/* Content — unclaimed shifts */}
            <div className="flex-1 flex flex-col px-5 pt-4 pb-3">
              {unclaimedShifts.length > 0 && (
                <div className="text-center mb-3">
                  <span className="px-3 py-1 rounded-full text-xs font-bold" style={{ background: `${BRAND.danger}15`, color: BRAND.danger }}>{unclaimedShifts.length} open shift{unclaimedShifts.length !== 1 ? "s" : ""}</span>
                </div>
              )}
              <div className="space-y-1.5 overflow-y-auto" style={{ maxHeight: "34vh" }}>
                {unclaimedShifts.length === 0 ? (
                  <div className="text-center py-8">
                    <Check size={36} style={{ color: BRAND.success, margin: "0 auto 8px" }} />
                    <p className="text-sm font-semibold" style={{ color: BRAND.navy }}>All shifts assigned!</p>
                    <p className="text-xs mt-1" style={{ color: BRAND.lightBlue }}>No open positions to fill.</p>
                  </div>
                ) : unclaimedShifts.map(s => (
                  <div key={s.id} className="flex items-center gap-3 px-3 py-2 rounded-lg" style={{ background: `${BRAND.accentBlue}40` }}>
                    <div className="w-2 h-2 rounded-full flex-shrink-0" style={{ background: s.daysUntil <= 3 ? BRAND.danger : s.daysUntil <= 7 ? "#f97316" : BRAND.warning }}></div>
                    <div className="flex-1 min-w-0">
                      <div className="text-sm font-semibold truncate" style={{ color: BRAND.navy }}>{s.role}</div>
                      <div className="text-[11px]" style={{ color: BRAND.lightBlue }}>{s.eventName}</div>
                    </div>
                    <div className="text-right flex-shrink-0">
                      <div className="text-xs font-bold" style={{ color: s.daysUntil <= 3 ? BRAND.danger : BRAND.navy }}>{s.daysUntil}d</div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
            {/* Parallel Enter button pinned to bottom */}
            <div className="px-5 pb-5 pt-2 mt-auto flex justify-center">
              <div className="flex items-center justify-center rounded-xl font-bold text-sm uppercase tracking-wider transition-all group-hover:shadow-lg group-hover:scale-105"
                style={{ width: "60%", paddingTop: "1.25rem", paddingBottom: "1.25rem", background: BRAND.navy, color: BRAND.white }}>
                Enter Assignment
              </div>
            </div>
          </div>

          {/* ── STAFFING ANALYTICS CARD ── */}
          <div className="rounded-2xl flex flex-col overflow-hidden transition-all duration-300 group cursor-pointer hover:shadow-[0_0_24px_rgba(0,57,107,0.25)]"
            onClick={() => handleNavigate({ section: "scheduling", page: "staffing-analytics" })}
            style={{ background: BRAND.white, border: `2px solid ${BRAND.navy}` }}>
            {/* Blue header */}
            <div className="px-5 py-4 text-center" style={{ background: BRAND.navy }}>
              <h2 className="text-lg font-bold uppercase tracking-wider" style={{ color: BRAND.white }}>Staffing Analytics</h2>
            </div>
            {/* Content — payroll stats + chart */}
            <div className="flex-1 flex flex-col px-5 pt-4 pb-3">
              {/* YTD + Projected */}
              <div className="grid grid-cols-2 gap-3 mb-4">
                <div className="rounded-xl p-3 text-center" style={{ background: `${BRAND.accentBlue}60` }}>
                  <div className="text-[10px] font-bold uppercase tracking-wider mb-1" style={{ color: BRAND.lightBlue }}>YTD Payroll</div>
                  <div className="text-xl font-black" style={{ color: BRAND.navy }}>${(ytdPayroll / 1000).toFixed(1)}k</div>
                </div>
                <div className="rounded-xl p-3 text-center" style={{ background: `${BRAND.accentBlue}60` }}>
                  <div className="text-[10px] font-bold uppercase tracking-wider mb-1" style={{ color: BRAND.lightBlue }}>Projected ({nextMonth1}–{nextMonth2})</div>
                  <div className="text-xl font-black" style={{ color: BRAND.navy }}>${(avgMonthly * 2 / 1000).toFixed(1)}k</div>
                </div>
              </div>
              {/* 12-month chart */}
              <div className="rounded-xl p-3" style={{ background: `${BRAND.accentBlue}40` }}>
                <div className="text-[10px] font-bold uppercase tracking-wider mb-2" style={{ color: BRAND.lightBlue }}>Wages Paid — {currentYear}</div>
                <ResponsiveContainer width="100%" height={140}>
                  <AreaChart data={wageData}>
                    <CartesianGrid strokeDasharray="3 3" stroke={BRAND.accentBlue} />
                    <XAxis dataKey="name" tick={{ fill: BRAND.navy, fontSize: 9 }} />
                    <YAxis tick={{ fill: BRAND.navy, fontSize: 9 }} tickFormatter={v => `$${(v/1000).toFixed(0)}k`} />
                    <Tooltip formatter={(v) => [`$${Number(v).toFixed(2)}`, "Wages"]} />
                    <Area type="monotone" dataKey="wages" stroke={BRAND.navy} fill={`${BRAND.navy}20`} strokeWidth={2} />
                    <Area type="monotone" dataKey="projected" stroke={BRAND.lightBlue} fill={`${BRAND.lightBlue}15`} strokeWidth={2} strokeDasharray="4 4" />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            </div>
            {/* Parallel Enter button pinned to bottom */}
            <div className="px-5 pb-5 pt-2 mt-auto flex justify-center">
              <div className="flex items-center justify-center rounded-xl font-bold text-sm uppercase tracking-wider transition-all group-hover:shadow-lg group-hover:scale-105"
                style={{ width: "60%", paddingTop: "1.25rem", paddingBottom: "1.25rem", background: BRAND.navy, color: BRAND.white }}>
                Enter Staff Analytics
              </div>
            </div>
          </div>

        </div>
      </div>
    );
  };

  // ── Employees Page (Directory left, Payroll right, single page) ──
  const EmployeesPage = () => (
    <div className="space-y-6">
      <DirectorySkillsPage employees={employees} employeeSkills={employeeSkills} skills={skills} onRefresh={loadData} />
    </div>
  );

  // ── Gateway Dashboard (big buttons + upcoming events) ──
  const GatewayDashboard = () => {
    const now = new Date().toISOString().split("T")[0];
    const upcoming = events.filter(e => e.end_date >= now).sort((a, b) => a.start_date.localeCompare(b.start_date)).slice(0, 5);
    const gateways = [
      { id: "scheduling", label: "Staffing", icon: Calendar, desc: "Events, shifts & assignments", color: BRAND.primary },
      { id: "employees", label: "Employees", icon: Users, desc: "Directory & payroll", color: BRAND.lightBlue },
      { id: "inventory", label: "Inventory", icon: Package, desc: "Products & stock", color: BRAND.navy },
      { id: "analytics", label: "Analytics", icon: BarChart3, desc: "Reports, forecasts & P&L", color: BRAND.lightBlue },
    ];
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold" style={{ color: BRAND.navy }}>Dashboard</h1>
          <p className="text-sm mt-1 font-medium" style={{ color: BRAND.lightBlue }}>Welcome back. Here's your quick overview.</p>
        </div>
        {/* Upcoming events snapshot */}
        {upcoming.length > 0 && (
          <div className="rounded-2xl p-5" style={{ background: BRAND.white, border: `2px solid ${BRAND.accentBlue}` }}>
            <h3 className="text-sm font-bold mb-3 uppercase tracking-wider" style={{ color: BRAND.navy }}>Upcoming Events</h3>
            <div className="flex flex-wrap gap-3">
              {upcoming.map(e => (
                <div key={e.id} className="px-4 py-2.5 rounded-xl" style={{ background: `${BRAND.accentBlue}80`, border: `1px solid ${BRAND.accentBlue}` }}>
                  <div className="text-sm font-semibold" style={{ color: BRAND.navy }}>{e.name}</div>
                  <div className="text-xs font-medium" style={{ color: BRAND.lightBlue }}>{e.start_date}</div>
                </div>
              ))}
            </div>
          </div>
        )}
        {/* Gateway buttons */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {gateways.map(g => (
            <button key={g.id} onClick={() => {
              if (g.id === "scheduling") handleNavigate({ section: "scheduling", page: "staffing-dashboard" });
              else if (g.id === "employees") handleNavigate({ section: "employees", page: "employees-dash" });
              else if (g.id === "analytics") handleNavigate({ section: "analytics", page: "analytics" });
              else if (g.id === "inventory") handleNavigate({ section: "inventory", page: "inv-dashboard" });
              else handleNavigate({ section: g.id, page: null });
            }}
              className="flex flex-col items-center gap-3 p-6 rounded-2xl transition hover:scale-105 cursor-pointer text-center"
              style={{ background: BRAND.white, border: `2px solid ${BRAND.accentBlue}`, boxShadow: "0 2px 12px rgba(0,57,107,0.06)" }}>
              <div className="w-14 h-14 rounded-full flex items-center justify-center" style={{ background: BRAND.navy }}>
                <g.icon size={26} style={{ color: BRAND.white }} />
              </div>
              <div>
                <div className="text-sm font-bold" style={{ color: BRAND.navy }}>{g.label}</div>
                <div className="text-xs mt-0.5 font-medium" style={{ color: BRAND.lightBlue }}>{g.desc}</div>
              </div>
            </button>
          ))}
        </div>
        {/* Original dashboard stats below */}
        <DashboardPage employees={employees} events={events} locations={locations} shifts={shifts} availability={availability} products={products} stock={stock} historicSales={historicSales} />
      </div>
    );
  };

  // ── Inventory Landing Dashboard ──
  const InventoryDashboardPage = () => {
    // Placeholder for last inventory update log
    const lastUpdate = { user: "—", time: "No updates yet" };
    const totalProducts = products.length;
    const totalStockUnits = Object.values(stock).reduce((sum, s) => sum + (s.on_hand || 0), 0);

    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold" style={{ color: BRAND.navy }}>Inventory</h1>
          <p className="text-sm mt-1 font-medium" style={{ color: BRAND.lightBlue }}>Snapshot, entry, and quick links.</p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">

          {/* ── INVENTORY SNAPSHOT CARD ── */}
          <div className="rounded-2xl p-6 cursor-pointer transition-all duration-300 group hover:shadow-[0_0_24px_rgba(0,57,107,0.25)]"
            onClick={() => handleNavigate({ section: "inventory", page: "products" })}
            style={{ background: BRAND.white, border: `2px solid ${BRAND.navy}` }}>
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-sm font-bold uppercase tracking-wider" style={{ color: BRAND.navy }}>Inventory Snapshot</h3>
              <span className="text-xs font-semibold cursor-pointer hover:underline" style={{ color: BRAND.lightBlue }}>Enter Inventory &rarr;</span>
            </div>
            <div className="grid grid-cols-2 gap-4 mb-6">
              <StatCard icon={Package} label="Total Products" value={totalProducts} color="primary" />
              <StatCard icon={List} label="Units On Hand" value={totalStockUnits} color="success" />
            </div>
            <div className="rounded-xl p-4" style={{ background: BRAND.accentBlue }}>
              <ResponsiveContainer width="100%" height={180}>
                <BarChart data={products.slice(0, 8).map(p => ({ name: p.name?.substring(0, 12) || "?", qty: stock[p.id]?.on_hand || 0 }))}>
                  <CartesianGrid strokeDasharray="3 3" stroke={BRAND.accentBlue} />
                  <XAxis dataKey="name" tick={{ fill: BRAND.navy, fontSize: 10 }} />
                  <YAxis tick={{ fill: BRAND.navy, fontSize: 10 }} />
                  <Tooltip />
                  <Bar dataKey="qty" fill={BRAND.navy} radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
            <div className="w-full mt-4 py-3 rounded-xl font-bold text-sm text-center transition group-hover:scale-105 group-hover:shadow-lg"
              style={{ background: BRAND.navy, color: BRAND.white }}>
              Enter Inventory
            </div>
          </div>

          {/* ── RIGHT COLUMN: Update Log + Analytics + Projections ── */}
          <div className="space-y-6">

            {/* LAST INVENTORY UPDATE CARD */}
            <div className="rounded-2xl p-6 transition-all duration-300 hover:shadow-[0_0_24px_rgba(0,57,107,0.25)]"
              style={{ background: BRAND.white, border: `2px solid ${BRAND.navy}` }}>
              <div className="flex items-center justify-between mb-3">
                <h3 className="text-sm font-bold uppercase tracking-wider" style={{ color: BRAND.navy }}>Last Inventory Update</h3>
                <span className="text-xs font-semibold cursor-pointer hover:underline" style={{ color: BRAND.lightBlue }}>View Full Log &rarr;</span>
              </div>
              <div className="flex items-center gap-4">
                <div className="w-10 h-10 rounded-full flex items-center justify-center" style={{ background: BRAND.accentBlue }}>
                  <Clock size={20} style={{ color: BRAND.navy }} />
                </div>
                <div>
                  <div className="font-semibold text-sm" style={{ color: BRAND.navy }}>{lastUpdate.user}</div>
                  <div className="text-xs" style={{ color: BRAND.lightBlue }}>{lastUpdate.time}</div>
                </div>
              </div>
            </div>

            {/* ANALYTICS CARD */}
            <div className="rounded-2xl p-6 transition-all duration-300 hover:shadow-[0_0_24px_rgba(0,57,107,0.25)]"
              style={{ background: BRAND.white, border: `2px solid ${BRAND.navy}` }}>
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full flex items-center justify-center" style={{ background: BRAND.navy }}>
                    <BarChart3 size={20} style={{ color: BRAND.white }} />
                  </div>
                  <div>
                    <div className="font-bold text-sm" style={{ color: BRAND.navy }}>Analytics</div>
                    <div className="text-xs" style={{ color: BRAND.lightBlue }}>Sales data & trends</div>
                  </div>
                </div>
                <span onClick={(e) => { e.stopPropagation(); handleNavigate({ section: "inventory", page: "inv-analytics" }); }}
                  className="text-xs font-semibold cursor-pointer hover:underline" style={{ color: BRAND.lightBlue }}>Enter Analytics & Projection &rarr;</span>
              </div>
              <div className="flex flex-wrap gap-3">
                <button onClick={() => {}} className="px-4 py-2.5 rounded-xl font-bold text-xs uppercase tracking-wider transition hover:opacity-90 hover:shadow-md"
                  style={{ background: BRAND.navy, color: BRAND.white }}>
                  Run Reports
                </button>
                <button onClick={() => {}} className="px-4 py-2.5 rounded-xl font-bold text-xs uppercase tracking-wider transition hover:opacity-90 hover:shadow-md"
                  style={{ background: BRAND.navy, color: BRAND.white }}>
                  Run Inventory Analysis
                </button>
              </div>
            </div>

            {/* PROJECTIONS CARD */}
            <div className="rounded-2xl p-6 transition-all duration-300 hover:shadow-[0_0_24px_rgba(0,57,107,0.25)]"
              style={{ background: BRAND.white, border: `2px solid ${BRAND.navy}` }}>
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full flex items-center justify-center" style={{ background: BRAND.navy }}>
                    <TrendingUp size={20} style={{ color: BRAND.white }} />
                  </div>
                  <div>
                    <div className="font-bold text-sm" style={{ color: BRAND.navy }}>Projections</div>
                    <div className="text-xs" style={{ color: BRAND.lightBlue }}>Forecast & planning</div>
                  </div>
                </div>
                <span onClick={(e) => { e.stopPropagation(); handleNavigate({ section: "inventory", page: "inv-projections" }); }}
                  className="text-xs font-semibold cursor-pointer hover:underline" style={{ color: BRAND.lightBlue }}>Enter Projections &rarr;</span>
              </div>
              <div className="flex flex-wrap gap-3">
                <button onClick={() => {}} className="px-4 py-2.5 rounded-xl font-bold text-xs uppercase tracking-wider transition hover:opacity-90 hover:shadow-md"
                  style={{ background: BRAND.navy, color: BRAND.white }}>
                  Run Projection for New Event
                </button>
                <button onClick={() => {}} className="px-4 py-2.5 rounded-xl font-bold text-xs uppercase tracking-wider transition hover:opacity-90 hover:shadow-md"
                  style={{ background: BRAND.navy, color: BRAND.white }}>
                  Add Data to Inventory Projection Model
                </button>
              </div>
            </div>

          </div>
        </div>
      </div>
    );
  };

  // ── Analytics Page (Reports + Sales Forecast + Event P&L) ──
  const AnalyticsPage = () => {
    const [analyticsTab, setAnalyticsTab] = useState("reports"); // reports | sales-forecast | event-pnl
    return (
      <div className="space-y-4">
        <h1 className="text-2xl font-bold" style={{ color: BRAND.navy }}>Analytics</h1>
        <div className="grid grid-cols-3 gap-0 rounded-xl overflow-hidden" style={{ border: `2px solid ${BRAND.accentBlue}` }}>
          {[{ id: "reports", label: "Reports", icon: FileText }, { id: "sales-forecast", label: "Sales Forecast", icon: DollarSign }, { id: "event-pnl", label: "Event P&L", icon: TrendingUp }].map(t => (
            <button key={t.id} onClick={() => setAnalyticsTab(t.id)}
              className="flex items-center justify-center gap-2 py-4 text-sm font-bold uppercase tracking-wider transition-all"
              style={{
                background: analyticsTab === t.id ? BRAND.navy : BRAND.white,
                color: analyticsTab === t.id ? BRAND.white : BRAND.navy,
                borderRight: t.id !== "event-pnl" ? `1px solid ${BRAND.accentBlue}` : "none",
              }}>
              <t.icon size={18} /> {t.label}
            </button>
          ))}
        </div>
        {analyticsTab === "reports" && (
          <>
            <div className="flex flex-wrap gap-3 mb-4">
              <button onClick={() => {}} className="px-5 py-3 rounded-xl font-bold text-sm uppercase tracking-wider transition hover:opacity-90 hover:shadow-md"
                style={{ background: BRAND.navy, color: BRAND.white }}>
                View Inventory Reports
              </button>
            </div>
            <ReportsPage employees={employees} events={events} shifts={shifts} historicSales={historicSales} products={products} />
          </>
        )}
        {analyticsTab === "sales-forecast" && (
          <>
            <div className="flex flex-wrap gap-3 mb-4">
              <button onClick={() => {}} className="px-5 py-3 rounded-xl font-bold text-sm uppercase tracking-wider transition hover:opacity-90 hover:shadow-md"
                style={{ background: BRAND.navy, color: BRAND.white }}>
                Project Future Event Revenue
              </button>
              <button onClick={() => {}} className="px-5 py-3 rounded-xl font-bold text-sm uppercase tracking-wider transition hover:opacity-90 hover:shadow-md"
                style={{ background: BRAND.navy, color: BRAND.white }}>
                Project Future Event Inventory
              </button>
              <button onClick={() => {}} className="px-5 py-3 rounded-xl font-bold text-sm uppercase tracking-wider transition hover:opacity-90 hover:shadow-md"
                style={{ background: BRAND.lightBlue, color: BRAND.white }}>
                Update Projection Model
              </button>
            </div>
            <SalesProjectionsPage events={events} products={products} historicSales={historicSales} stock={stock} distributions={distributions} />
          </>
        )}
        {analyticsTab === "event-pnl" && (
          <EventPnLPage events={events} products={products} historicSales={historicSales} employees={employees} shifts={shifts} stock={stock} roleRequirements={roleRequirements} distributions={distributions} />
        )}
      </div>
    );
  };

  // ── Inventory Dashboard (legacy) ──
  const InventoryDash = () => (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold" style={{ color: BRAND.text }}>Inventory</h1>
        <p className="text-sm mt-1" style={{ color: BRAND.textMuted }}>Products, stock levels, analytics, and projections.</p>
      </div>
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <DashSectionWrap title="Products" icon={Package}>
          <InventoryProductsPage products={products} stock={stock} onRefresh={loadData} />
        </DashSectionWrap>
        <DashSectionWrap title="Stock & Distribution" icon={List}>
          <InventoryStockPage products={products} stock={stock} distributions={distributions} events={events} onRefresh={loadData} />
        </DashSectionWrap>
      </div>
      <DashSectionWrap title="Analytics" icon={BarChart3}>
        <InventoryAnalyticsPage historicSales={historicSales} products={products} distributions={distributions} stock={stock} events={events} />
      </DashSectionWrap>
      <DashSectionWrap title="Projections" icon={TrendingUp}>
        <InventoryProjectionsPage events={events} products={products} historicSales={historicSales} stock={stock} distributions={distributions} />
      </DashSectionWrap>
    </div>
  );

  // ── Projections Dashboard ──
  const ProjectionsDash = () => (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold" style={{ color: BRAND.text }}>Projections</h1>
        <p className="text-sm mt-1" style={{ color: BRAND.textMuted }}>Sales forecasts, staffing needs, and event P&amp;L analysis.</p>
      </div>
      <DashSectionWrap title="Sales Forecast" icon={DollarSign}>
        <SalesProjectionsPage events={events} products={products} historicSales={historicSales} stock={stock} distributions={distributions} />
      </DashSectionWrap>
      <DashSectionWrap title="Staffing Needs" icon={Users}>
        <StaffingProjectionsPage events={events} employees={employees} shifts={shifts} roleRequirements={roleRequirements} historicSales={historicSales} />
      </DashSectionWrap>
      <DashSectionWrap title="Event P&L" icon={TrendingUp}>
        <EventPnLPage events={events} products={products} historicSales={historicSales} employees={employees} shifts={shifts} stock={stock} roleRequirements={roleRequirements} distributions={distributions} />
      </DashSectionWrap>
    </div>
  );

  // ── Settings Dashboard ──
  const SettingsDash = () => (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold" style={{ color: BRAND.text }}>Settings</h1>
        <p className="text-sm mt-1" style={{ color: BRAND.textMuted }}>General settings and user management.</p>
      </div>
      <DashSectionWrap title="General" icon={Settings}>
        <SettingsPage user={user} />
      </DashSectionWrap>
      <DashSectionWrap title="User Management" icon={Users}>
        <UserManagementPage user={user} employees={employees} onRefresh={loadData} />
      </DashSectionWrap>
    </div>
  );

  const renderPage = () => {
    const page = currentNav.page;

    // Gateway dashboard
    if (!page || page === "dashboard") return <GatewayDashboard />;

    // Main single-page views
    if (page === "scheduling-cal") return <SchedulingPage />;
    if (page === "staffing-dashboard") return <StaffingDashboardPage />;
    if (page === "assignment") return <StaffingPage events={events} employees={employees} shifts={shifts} locations={locations} availability={availability} roleRequirements={roleRequirements} onRefresh={loadData} user={user} currentRole={currentRole} venues={venues} eventVenues={eventVenues} />;
    if (page === "staffing-analytics") return <StaffingProjectionsPage events={events} employees={employees} shifts={shifts} roleRequirements={roleRequirements} historicSales={historicSales} />;
    if (page === "employees-dash") return <EmployeesPage />;

    // All other pages
    const pageContent = {
      // Inventory sub-pages
      "inv-dashboard": <InventoryDashboardPage />,
      products: <InventoryProductsPage products={products} stock={stock} onRefresh={loadData} />,
      stock: <InventoryStockPage products={products} stock={stock} distributions={distributions} events={events} onRefresh={loadData} />,
      "inv-analytics": <InventoryAnalyticsPage historicSales={historicSales} products={products} distributions={distributions} stock={stock} events={events} />,
      "inv-projections": <InventoryProjectionsPage events={events} products={products} historicSales={historicSales} stock={stock} distributions={distributions} />,
      // Analytics (combined: Reports + Sales Forecast + Event P&L)
      analytics: <AnalyticsPage />,
      reports: <ReportsPage employees={employees} events={events} shifts={shifts} historicSales={historicSales} products={products} />,
      // Legacy projection routes (still accessible)
      "sales-projections": <SalesProjectionsPage events={events} products={products} historicSales={historicSales} stock={stock} distributions={distributions} />,
      "staffing-projections": <StaffingProjectionsPage events={events} employees={employees} shifts={shifts} roleRequirements={roleRequirements} historicSales={historicSales} />,
      "event-pnl": <EventPnLPage events={events} products={products} historicSales={historicSales} employees={employees} shifts={shifts} stock={stock} roleRequirements={roleRequirements} distributions={distributions} />,
      // User menu pages
      "my-shifts": <MyShiftsPage employees={employees} events={events} shifts={shifts} user={user} locations={locations} />,
      notifications: <NotificationsPage notifications={notifications} />,
      payroll: <PayrollPage employees={employees} events={events} locations={locations} shifts={shifts} />,
      settings: <SettingsPage user={user} />,
      "user-management": <UserManagementPage user={user} employees={employees} onRefresh={loadData} />,
      // Legacy routes and staffing sub-pages
      events: <EventsPage events={events} employees={employees} shifts={shifts} locations={locations} venues={venues} eventVenues={eventVenues} availability={availability} employeeSkills={employeeSkills} skills={skills} roleRequirements={roleRequirements} onRefresh={loadData} />,
      scheduling: <StaffingDashboardPage />,
      staffing: <StaffingPage events={events} employees={employees} shifts={shifts} locations={locations} availability={availability} roleRequirements={roleRequirements} onRefresh={loadData} user={user} currentRole={currentRole} venues={venues} eventVenues={eventVenues} />,
      directory: <DirectorySkillsPage employees={employees} employeeSkills={employeeSkills} skills={skills} onRefresh={loadData} />,
      availability: <AvailabilityPage employees={employees} events={events} availability={availability} onRefresh={loadData} user={user} currentRole={currentRole} venues={venues} eventVenues={eventVenues} />,
    };

    return pageContent[page] || <GatewayDashboard />;
  };

  // Loading state
  if (loading) {
    return (
      <div
        className="flex items-center justify-center"
        style={{ background: BRAND.navy, height: "100dvh", minHeight: "-webkit-fill-available" }}
      >
        <div className="text-center">
          <div
            className="inline-block animate-spin rounded-full h-12 w-12 border-4 border-opacity-30 border-current"
            style={{ borderColor: BRAND.primary }}
          ></div>
          <p className="mt-4" style={{ color: BRAND.white }}>
            Loading...
          </p>
        </div>
      </div>
    );
  }

  // Login state
  // ========== SET PASSWORD SCREEN (invited users / password recovery) ==========
  const SetPasswordScreen = () => {
    const [newPwd, setNewPwd] = useState("");
    const [confirmPwd, setConfirmPwd] = useState("");
    const [pwdSaving, setPwdSaving] = useState(false);
    const [pwdError, setPwdError] = useState("");
    const [pwdSuccess, setPwdSuccess] = useState(false);

    const handleSetPassword = async (e) => {
      e.preventDefault();
      if (newPwd.length < 6) { setPwdError("Password must be at least 6 characters"); return; }
      if (newPwd !== confirmPwd) { setPwdError("Passwords don't match"); return; }
      setPwdSaving(true);
      setPwdError("");
      try {
        const { error: updateError } = await supabase.auth.updateUser({ password: newPwd });
        if (updateError) throw updateError;
        setPwdSuccess(true);
        setTimeout(() => { setShowSetPassword(false); loadData(); }, 1500);
      } catch (err) {
        setPwdError(err.message || "Failed to set password");
      } finally { setPwdSaving(false); }
    };

    return (
      <div className="flex items-center justify-center p-4" style={{ background: BRAND.navy, height: "100dvh", minHeight: "-webkit-fill-available" }}>
        <div className="w-full max-w-md p-8 rounded-2xl" style={{ background: BRAND.white, border: `2px solid ${BRAND.accentBlue}`, boxShadow: "0 16px 48px rgba(0,0,0,0.25)" }}>
          <div className="text-center mb-8">
            <h1 className="text-3xl font-bold mb-2" style={{ color: BRAND.navy, letterSpacing: "2px" }}>COLLIDE</h1>
            <p className="text-sm font-medium" style={{ color: BRAND.lightBlue }}>Welcome! Set your password to get started.</p>
          </div>
          {pwdSuccess ? (
            <div className="p-4 rounded-lg text-center" style={{ background: "rgba(74,222,128,0.15)", color: "#4ade80" }}>
              <p className="font-medium">Password set successfully!</p>
              <p className="text-sm mt-1">Redirecting to your dashboard...</p>
            </div>
          ) : (
            <form onSubmit={handleSetPassword} className="space-y-4">
              <Input label="New Password" type="password" value={newPwd} onChange={(e) => setNewPwd(e.target.value)} placeholder="Min 6 characters" />
              <Input label="Confirm Password" type="password" value={confirmPwd} onChange={(e) => setConfirmPwd(e.target.value)} placeholder="Re-enter password" />
              {pwdError && (
                <div className="p-3 rounded-lg text-sm" style={{ background: "rgba(244,67,54,0.2)", color: BRAND.danger }}>{pwdError}</div>
              )}
              <Btn type="submit" disabled={pwdSaving} className="w-full">
                {pwdSaving ? "Setting Password..." : "Set Password & Continue"}
              </Btn>
            </form>
          )}
        </div>
      </div>
    );
  };

  if (showSetPassword && user) return <SetPasswordScreen />;

  if (!user) {
    return <LoginPage onLoginSuccess={setUser} />;
  }

  // Wait for role to load before rendering main UI
  if (!roleLoaded) {
    return (
      <div
        className="flex items-center justify-center"
        style={{ background: BRAND.navy, height: "100dvh", minHeight: "-webkit-fill-available" }}
      >
        <div className="text-center">
          <div
            className="inline-block animate-spin rounded-full h-12 w-12 border-4 border-opacity-30 border-current"
            style={{ borderColor: BRAND.primary }}
          ></div>
          <p className="mt-4" style={{ color: BRAND.white }}>
            Loading your workspace...
          </p>
        </div>
      </div>
    );
  }

  // Collide Logo SVG component
  const CollideLogo = ({ color = BRAND.navy, height = 28 }) => {
    // Body color follows the color prop; the "C" letter inverts for contrast
    const bodyColor = color;
    const cLetterColor = color === BRAND.white ? BRAND.navy : BRAND.white;
    const cyanAccent = BRAND.primary;
    return (
      <svg viewBox="0 0 576 576" height={height} xmlns="http://www.w3.org/2000/svg">
        {/* Body / flame shapes (st2 → bodyColor) */}
        <path fill={bodyColor} d="M491.01,206.76c-.75.2-1.13.59-1.64,1.14-12.7,13.59-26.11,28.86-40.68,40.51-.86.69-1.81,1.6-3,1.49,7.74-12.59,17-24.27,27.14-35.02,7.19-7.62,14.86-14.24,22.87-20.92-.27,4.44-2.63,8.57-4.7,12.39-.06.11.06.32,0,.43Z"/>
        <path fill={bodyColor} d="M341.39,93.63c-.25,1.28.62.77,1.41.91,14.52,2.65,29.09,1.43,43.48,5.27,17.99,4.8,33.5,17.63,47.02,29.9,17.96,16.29,35.83,35.6,51.28,54.26,1.34,1.62,3.86,5.82,5.13,6.83.32.25.47.26.86.2-.29-.98.44-2.22.43-2.99,1.73,1.31,2.78,3.56,3.8,5.42l-.13.56c-9.47,7.55-19.6,14.98-27.82,23.91-8.47,9.2-14.79,18.48-21.23,29.19-1.47,2.45-2.24,4.66-4.02,7.08-1.2,1.63-3.43,5.06-5.73,3.66-4.88-5.71-10.57-10.53-14.88-16.73-7.84-11.27-9.5-30.32-12.59-43.79-1.42-6.17-3.33-12.35-4.97-18.18-.74-2.63-.83-5.68-1.98-8.21-.3-.65.05-1.05-1.05-.85.77,6.7,2.58,13.3,3.74,19.97,6.98,40.22,14.11,80.44,20.68,120.7,5.43,33.3,10.13,66.71,16.3,99.88,7.79,10.08,21.52,29.1,9.74,40.69-12.4,12.2-51.45,15.61-68.93,18.69-26.44,4.66-52.01,9.81-78.78,12.68-33.39,3.58-72.67,11.32-105.96,5.93-19.16-3.1-26.29-8.51-19.94-28.78,1.07-3.41,4.56-9.31,4.73-11.93.12-1.8-.44-3.15-.46-4.7-.38-21.7-.9-43.27-1.28-64.95-.5-27.94-2.77-55.33-2.14-83.71.67-29.6,5.13-58.7,6.43-87.96.36-8.1.04-16.24.43-24.34.04-.9.16-6.66-.96-3.95-1.35,3.27-1.17,9.24-1.71,12.82-.24,1.61-1.7,2.51-1.97,5.28-1.55,15.91-3.56,31.82-5.18,47.78-.75,7.46-.78,9.34-3.21,16.44-3.41,9.99-7.31,19.79-10.89,29.71-1.49,1.04-9.69-4.62-11.54-5.61-15.32-8.15-40.5-23.8-57.73-24.54l9.72-22.96c16.71-46.63,37.46-108.64,93.19-119.15,4.71-.89,10.36-.2,14.21-3.74l4.71-5.76c3.57,3.39,6.75,7.58,10.6,10.65,24.91,19.9,75.87,4.37,93.37-20.59,3.72-5.3,3.49-10.23,11.61-8.38,4.25.97,7.65,3.09,12.23,3.37Z"/>
        <path fill={bodyColor} d="M320.45,88.04c-8.03,11.72-19.43,21.4-32.49,27.11-16.88,7.39-46.18,8.66-62.12-1.56-3.32-2.13-6.24-5.69-9.26-8.26-.13-.77.06-.54.54-.75,2.55-1.12,18.73,4.02,22.88,4.69,23.08,3.69,49.46-2.75,69.29-14.65,3.52-2.11,6.93-5.93,11.16-6.57Z"/>
        <path fill={bodyColor} d="M151.59,289.62c-.13.78-2.19.46-2.77.42-16.49-1.11-32.17-5.54-46.82-13.01-5.87-2.99-11.85-6.13-16.03-11.32-2.04-2.54-3.25-4.26,1.24-3.8,15.1,1.54,43.02,15.43,56.64,23.28,2.4,1.38,4.81,3.93,7.74,4.44Z"/>
        {/* Cyan accents (st0) */}
        <path fill={cyanAccent} d="M213.58,105.97l-4.71,5.76c-3.85,3.54-9.5,2.85-14.21,3.74-55.73,10.51-76.48,72.52-93.19,119.15l-9.72,22.96c-2.55-.11-5.14.08-7.7,0-1.23-1.22,9.2-21.49,10.47-24.35,14.87-33.61,32.5-92.78,67.16-109.71,8.26-4.04,24.01-9.52,32.99-11.03,2.38-.4,5.69-.21,7.8-.75,3.11-.8,6.59-6.67,11.1-5.78Z"/>
        <path fill={cyanAccent} d="M497.08,188.53c-2.3-5.59-8.69-12.9-12.69-17.65-8.05-9.55-17.09-18.3-25-27.98-12.35-15.11-22.65-29.75-38.96-41.37-1.74-1.24-12.49-8.15-13.5-8.37-3.27-.7-6.08-1.1-9.53-1.93-19.65-4.77-34.94-2.22-54.08-4.06-6.21-.6-11.97-5.11-18.35-4.23-3.63.5-9.7,5.73-13.11,7.83-21.04,12.94-44.35,17.89-68.94,14.28-7.45-1.09-15.29-4.03-22.4-4.95-7.02-.91-12.57,5.62-19.01,7.69-8.38,2.7-16.99,3.16-25.66,6.4-35.2,13.15-52.85,45.28-66.8,78.04-7.81,18.34-15.58,36.61-24.26,54.36-1.71,3.49-6.31,12.09-6.18,15.56.06,1.62,6.69,8.18,8.24,9.51,14.36,12.33,44.46,22.13,63.24,23.09,9.88.51,13.04-.35,16.48-9.62,2.45-6.62,3.81-13.71,6.42-20.29h1.27s-.43,12.16-.43,12.16c-.97,27.34-1.24,53.73.02,81.13,1,21.66,2.05,43.31,3.4,64.94.6,9.59,2.96,21.81-.41,30.76-4.42,11.75-12.93,26.17,3.03,34.1,15.94,7.91,56.21,4.54,74.54,2.83,39.89-3.72,81.5-8.63,120.84-15.93,19.06-3.54,43.08-7.6,61.04-14.18,26.13-9.59,27.03-24.88,13.01-47.15-1.09-1.72-4.34-5.34-4.77-6.76-1.73-5.66-2.17-16.09-3.17-22.46-6.16-39.38-11.37-79.02-18.44-118.24-1.51-8.36-3.64-16.7-4.57-25.12.76-.12.94-.02,1.48.44,1.75,1.49,5.15,6.92,7.08,9.15,2.5,2.9,5.31,5.54,7.71,8.53,2.28,1.87,7.41-1.86,9.52-3.26,13.59-9,39.12-34.83,46.89-49.04-.75.2-1.13.59-1.64,1.14-12.7,13.59-26.11,28.86-40.68,40.51-.86.69-1.81,1.6-3,1.49,7.74-12.59,17-24.27,27.14-35.02,7.19-7.62,14.86-14.24,22.87-20.92-.27,4.44-2.63,8.57-4.7,12.39,3.48-3.95,8.21-12.61,6.07-17.8ZM217.11,104.58c2.55-1.12,18.73,4.02,22.88,4.69,23.08,3.69,49.46-2.75,69.29-14.65,3.52-2.11,6.93-5.93,11.16-6.57-8.03,11.72-19.43,21.4-32.49,27.11-16.88,7.38-46.18,8.66-62.12-1.56-3.32-2.13-6.24-5.69-9.26-8.26-.13-.77.06-.54.54-.75ZM148.82,290.04c-16.49-1.11-32.17-5.54-46.82-13.01-5.87-2.99-11.85-6.13-16.03-11.32-2.04-2.54-3.25-4.26,1.24-3.8,15.1,1.54,43.02,15.43,56.64,23.28,2.4,1.38,4.81,3.93,7.74,4.44-.13.78-2.19.46-2.77.42ZM494.67,191.39c-9.47,7.55-19.6,14.98-27.82,23.91-8.47,9.2-14.79,18.48-21.23,29.19-1.47,2.45-2.24,4.66-4.02,7.08-1.2,1.63-3.43,5.06-5.73,3.66-4.88-5.71-10.57-10.53-14.88-16.73-7.84-11.27-9.5-30.32-12.59-43.79-1.42-6.17-3.33-12.35-4.97-18.18-.74-2.63-.83-5.68-1.98-8.21-.3-.65.05-1.05-1.05-.85.77,6.7,2.58,13.3,3.74,19.97,6.98,40.22,14.11,80.44,20.68,120.7,5.43,33.3,10.13,66.71,16.3,99.88,7.79,10.08,21.52,29.1,9.74,40.69-12.4,12.2-51.45,15.61-68.93,18.69-26.44,4.66-52.01,9.81-78.78,12.68-33.39,3.58-72.67,11.32-105.96,5.93-19.16-3.1-26.29-8.51-19.94-28.78,1.07-3.41,4.56-9.31,4.73-11.93.12-1.8-.44-3.15-.46-4.7-.38-21.7-.9-43.27-1.28-24.95-.5-27.94-2.77-55.33-2.14-83.71.67-29.6,5.13-58.7,6.43-87.96.36-8.1.04-16.24.43-24.34.04-.9.16-6.67-.96-3.95-1.35,3.27-1.17,9.24-1.71,12.82-.24,1.61-1.7,2.51-1.97,5.28-1.55,15.91-3.56,31.82-5.18,47.78-.75,7.46-.78,9.34-3.21,16.44-3.41,9.99-7.31,19.79-10.89,29.71-1.49,1.04-9.69-4.62-11.54-5.61-15.32-8.15-40.5-23.8-57.73-24.54-2.55-.11-5.14.08-7.7,0-1.23-1.22,9.2-21.49,10.47-24.35,14.87-33.61,32.5-92.78,67.16-109.71,8.26-4.03,24.01-9.51,32.99-11.03,2.38-.4,5.69-.21,7.8-.75,3.11-.8,6.59-6.67,11.1-5.78,3.57,3.39,6.75,7.58,10.6,10.65,24.91,19.89,75.87,4.37,93.37-20.59,3.72-5.3,3.49-10.23,11.61-8.38,4.25.97,7.65,3.09,12.23,3.37-.25,1.28.62.77,1.41.91,14.52,2.65,29.09,1.43,43.48,5.27,17.99,4.8,33.5,17.63,47.02,29.9,17.96,16.29,35.83,35.6,51.28,54.26,1.34,1.62,3.86,5.82,5.13,6.83.32.25.47.26.86.2-.29-.98.44-2.22.43-2.99,1.73,1.31,2.78,3.56,3.8,5.42l-.13.56Z"/>
        {/* "C" letter (st1 → contrasting color) */}
        <path fill={cLetterColor} d="M254.2,253.21l-4.86-36.2c-.72-5.32,3.13-10.36,8.45-11.07l92.65-12.45-3.28-24.4-92.65,12.45c-18.79,2.52-32.1,19.96-29.57,38.75l4.86,36.21c2.52,18.78,19.96,32.09,38.75,29.57l93.89-12.62-3.28-24.39-93.89,12.62c-5.32.71-10.36-3.14-11.07-8.45Z"/>
        <rect fill={cLetterColor} x="283.62" y="213.71" width="71.5" height="24.62" transform="translate(-27.25 44.54) rotate(-7.65)"/>
      </svg>
    );
  };

  return (
    <div
      className="flex flex-col"
      style={{
        background: BRAND.white,
        height: "100dvh",
        minHeight: "-webkit-fill-available",
        overflow: "hidden",
      }}
    >
      {/* ═══════ HEADER ═══════ */}
      <div className="flex-shrink-0 border-b px-4 py-2.5 flex items-center justify-between gap-3" style={{ background: BRAND.navy, borderColor: "rgba(255,255,255,0.1)" }}>
        {/* Left: Logo + Mobile burger */}
        <div className="flex items-center gap-3 flex-shrink-0">
          {isMobile && (
            <button onClick={() => setMobileMenuOpen(!mobileMenuOpen)} className="p-2 -ml-1 rounded-lg transition" style={{ color: BRAND.white }} aria-label="Toggle menu">
              {mobileMenuOpen ? <X size={22} /> : <Menu size={22} />}
            </button>
          )}
          <button onClick={() => handleNavigate({ section: "dashboard", page: null })} className="flex items-center gap-2">
            <CollideLogo color={BRAND.white} height={24} />
          </button>
          {currentRole && (
            <span className="flex-shrink-0" style={{ fontSize: 10, padding: "2px 10px", borderRadius: 12, background: BRAND.primary, color: BRAND.navy, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.5px" }}>
              {currentRole === "team_lead" ? "Team Lead" : currentRole}
            </span>
          )}
        </div>

        {/* Center: Search */}
        {!isMobile && (
          <div className="flex-1 max-w-md mx-4">
            <button onClick={() => setCommandPaletteOpen(true)} className="w-full px-4 py-2 rounded-full text-sm flex items-center gap-2 transition" style={{ background: "rgba(255,255,255,0.15)", border: "none", color: BRAND.white }}>
              <Search size={16} /><span style={{ opacity: 0.6 }}>Search...</span><span className="ml-auto text-xs" style={{ opacity: 0.4 }}>⌘K</span>
            </button>
          </div>
        )}

        {/* Right: User avatar dropdown */}
        <div className="flex items-center gap-1 flex-shrink-0">
          {isMobile && (
            <button onClick={() => setCommandPaletteOpen(true)} className="p-2 rounded-lg transition" aria-label="Search">
              <Search size={20} style={{ color: BRAND.white }} />
            </button>
          )}
          {/* Notification bell shortcut */}
          <button onClick={() => handleNavigate({ section: "notifications", page: "notifications" })} className="p-2 rounded-lg transition relative" style={{ color: BRAND.white }} aria-label="Notifications">
            <Bell size={20} />
            {notifications.length > 0 && (
              <span className="absolute top-1 right-1 w-2.5 h-2.5 rounded-full border-2" style={{ background: BRAND.danger, borderColor: BRAND.navy }}></span>
            )}
          </button>
          {/* User avatar menu */}
          <div className="relative" data-user-menu>
            <button onClick={() => setUserMenuOpen(!userMenuOpen)} className="flex items-center gap-2 px-2 py-1.5 rounded-full transition" style={{ background: userMenuOpen ? "rgba(255,255,255,0.15)" : "transparent" }}>
              <div className="w-8 h-8 rounded-full flex items-center justify-center" style={{ background: BRAND.navy }}>
                <User size={16} style={{ color: BRAND.white }} />
              </div>
              {!isMobile && <span className="text-sm font-medium" style={{ color: BRAND.white }}>{displayName}</span>}
              <ChevronDown size={14} style={{ color: "rgba(255,255,255,0.7)", transform: userMenuOpen ? "rotate(180deg)" : "rotate(0)", transition: "transform 0.2s" }} />
            </button>
            {userMenuOpen && (
              <div className="absolute right-0 top-full mt-2 w-56 rounded-2xl overflow-hidden z-[100]" style={{ background: BRAND.white, border: `1px solid ${BRAND.accentBlue}`, boxShadow: "0 12px 40px rgba(0,57,107,0.18)" }}>
                <div className="px-4 py-3 border-b" style={{ borderColor: BRAND.accentBlue, background: `${BRAND.accentBlue}60` }}>
                  <div className="text-sm font-semibold" style={{ color: BRAND.navy }}>{displayName}</div>
                  <div className="text-xs" style={{ color: BRAND.lightBlue }}>{user?.email}</div>
                </div>
                {USER_MENU_ITEMS.filter(item => !item.roles || item.roles.includes(currentRole)).map(item => (
                  <button key={item.id} onClick={() => { handleNavigate({ section: item.id, page: item.page }); setUserMenuOpen(false); }}
                    className="w-full flex items-center gap-3 px-4 py-2.5 text-sm transition text-left" style={{ color: BRAND.navy, background: "transparent" }}
                    onMouseEnter={e => e.currentTarget.style.background = BRAND.accentBlue}
                    onMouseLeave={e => e.currentTarget.style.background = "transparent"}>
                    <item.icon size={16} style={{ color: BRAND.lightBlue }} />
                    {item.label}
                  </button>
                ))}
                <div className="border-t" style={{ borderColor: BRAND.accentBlue }}>
                  <button onClick={handleLogout} className="w-full flex items-center gap-3 px-4 py-2.5 text-sm transition text-left" style={{ color: BRAND.danger }}
                    onMouseEnter={e => e.currentTarget.style.background = "rgba(244,67,54,0.08)"}
                    onMouseLeave={e => e.currentTarget.style.background = "transparent"}>
                    <LogOut size={16} /> Log Out
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* ═══════ MAIN CONTENT AREA ═══════ */}
      <div className="flex-1 relative" style={{ minHeight: 0, overflow: "hidden" }}>

        {/* ── Floating Nav Sidebar (desktop) — FAB pill buttons ── */}
        {!isMobile && (
          <div className="absolute left-0 top-0 bottom-0 z-40 flex flex-col items-start justify-start py-6 pl-3" style={{ pointerEvents: "none" }}>
            <div className="flex flex-col gap-2" style={{ pointerEvents: "auto" }}>
              {NAV_SIDEBAR.filter(item => !item.roles || item.roles.includes(currentRole)).map(item => {
                const Icon = item.icon;
                const isActive = currentNav.section === item.id || currentNav.page === item.page;
                const hasFlyout = item.flyout && item.flyout.length > 0;

                return (
                  <div key={item.id} className="relative"
                    onMouseEnter={() => { if (hasFlyout) { clearTimeout(flyoutTimeout.current); setHoveredFlyout(item.id); } }}
                    onMouseLeave={() => { if (hasFlyout) { flyoutTimeout.current = setTimeout(() => setHoveredFlyout(null), 300); } }}
                  >
                    <button
                      onClick={() => {
                        if (item.page) {
                          handleNavigate({ section: item.id, page: item.page });
                        } else if (hasFlyout) {
                          // For flyout items, clicking the first sub-item
                          const firstSub = item.flyout.find(s => !s.roles || s.roles.includes(currentRole));
                          if (firstSub) handleNavigate({ section: item.id, page: firstSub.page });
                        } else {
                          handleNavigate({ section: item.id, page: null });
                        }
                      }}
                      className="flex items-center gap-2.5 rounded-full transition-all duration-200"
                      style={{
                        background: isActive ? BRAND.primary : BRAND.navy,
                        color: BRAND.white,
                        padding: "12px 20px 12px 14px",
                        boxShadow: isActive ? "0 4px 20px rgba(84,205,249,0.35)" : "0 4px 16px rgba(0,57,107,0.3)",
                        transform: isActive ? "scale(1.05)" : "scale(1)",
                        minWidth: 0,
                        whiteSpace: "nowrap",
                      }}
                      onMouseEnter={e => { if (!isActive) e.currentTarget.style.background = BRAND.lightBlue; }}
                      onMouseLeave={e => { if (!isActive) e.currentTarget.style.background = BRAND.navy; }}
                    >
                      <Icon size={20} style={{ flexShrink: 0 }} />
                      <span className="text-sm font-semibold">{item.label}</span>
                      {hasFlyout && <ChevronRight size={14} style={{ marginLeft: 2, opacity: 0.7 }} />}
                    </button>

                    {/* Flyout submenu — fans out to the right */}
                    {hasFlyout && hoveredFlyout === item.id && (
                      <div
                        className="absolute top-1/2 rounded-2xl overflow-hidden z-50"
                        style={{
                          left: "calc(100% + 8px)",
                          transform: "translateY(-50%)",
                          background: BRAND.white,
                          border: `2px solid ${BRAND.accentBlue}`,
                          boxShadow: "0 8px 32px rgba(0,57,107,0.18)",
                          minWidth: 200,
                        }}
                        onMouseEnter={() => { clearTimeout(flyoutTimeout.current); setHoveredFlyout(item.id); }}
                        onMouseLeave={() => { flyoutTimeout.current = setTimeout(() => setHoveredFlyout(null), 300); }}
                      >
                        <div className="px-4 py-2 border-b" style={{ borderColor: BRAND.accentBlue, background: `${BRAND.accentBlue}80` }}>
                          <span className="text-xs font-bold uppercase tracking-wider" style={{ color: BRAND.navy }}>{item.label}</span>
                        </div>
                        {item.flyout.filter(sub => !sub.roles || sub.roles.includes(currentRole)).map(sub => {
                          const isSubActive = currentNav.page === sub.page;
                          return (
                            <button key={sub.id} onClick={() => { handleNavigate({ section: item.id, page: sub.page }); setHoveredFlyout(null); }}
                              className="w-full flex items-center gap-3 px-4 py-3 text-sm font-medium transition text-left"
                              style={{ color: isSubActive ? BRAND.primary : BRAND.navy, background: isSubActive ? `${BRAND.primary}10` : "transparent" }}
                              onMouseEnter={e => { if (!isSubActive) e.currentTarget.style.background = BRAND.accentBlue; }}
                              onMouseLeave={e => { if (!isSubActive) e.currentTarget.style.background = isSubActive ? `${BRAND.primary}10` : "transparent"; }}>
                              <div className="w-2 h-2 rounded-full flex-shrink-0" style={{ background: isSubActive ? BRAND.primary : BRAND.lightBlue }}></div>
                              {sub.label}
                            </button>
                          );
                        })}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* ── Mobile drawer ── */}
        {isMobile && mobileMenuOpen && (
          <>
            <div onClick={() => setMobileMenuOpen(false)} className="fixed inset-0 z-40" style={{ background: "rgba(0,57,107,0.3)", backdropFilter: "blur(4px)" }} />
            <div className="fixed top-0 left-0 bottom-0 z-50 w-72 overflow-y-auto p-4 pt-5 space-y-1" style={{ background: BRAND.white, borderRight: `2px solid ${BRAND.accentBlue}`, boxShadow: "4px 0 24px rgba(0,57,107,0.15)" }}>
              <div className="flex items-center justify-between mb-4 pb-3" style={{ borderBottom: `2px solid ${BRAND.accentBlue}` }}>
                <CollideLogo color={BRAND.navy} height={22} />
                <button onClick={() => setMobileMenuOpen(false)} className="p-2 rounded-lg transition"><X size={22} style={{ color: BRAND.navy }} /></button>
              </div>
              {NAV_SIDEBAR.filter(item => !item.roles || item.roles.includes(currentRole)).map(item => {
                const Icon = item.icon;
                const isActive = currentNav.section === item.id;
                const hasFlyout = item.flyout && item.flyout.length > 0;
                const isExpanded = expandedSections.has(item.id);
                return (
                  <div key={item.id}>
                    <button onClick={() => {
                      if (hasFlyout) { toggleSection(item.id); }
                      else if (item.page) { handleNavigate({ section: item.id, page: item.page }); setMobileMenuOpen(false); }
                      else { handleNavigate({ section: item.id, page: null }); setMobileMenuOpen(false); }
                    }} className="w-full flex items-center gap-3 px-3 py-3 rounded-xl transition text-left" style={{ background: isActive ? `${BRAND.primary}15` : "transparent", color: isActive ? BRAND.primary : BRAND.navy, fontSize: 15 }}>
                      <div className="w-9 h-9 rounded-full flex items-center justify-center flex-shrink-0" style={{ background: isActive ? BRAND.primary : BRAND.navy }}>
                        <Icon size={18} style={{ color: BRAND.white }} />
                      </div>
                      <span className="flex-1 font-semibold">{item.label}</span>
                      {hasFlyout && <ChevronDown size={18} style={{ color: BRAND.lightBlue, transform: isExpanded ? "rotate(0)" : "rotate(-90deg)", transition: "transform 0.2s" }} />}
                    </button>
                    {hasFlyout && isExpanded && (
                      <div className="ml-6 space-y-0.5 mt-1 mb-1">
                        {item.flyout.filter(sub => !sub.roles || sub.roles.includes(currentRole)).map(sub => (
                          <button key={sub.id} onClick={() => { handleNavigate({ section: item.id, page: sub.page }); setMobileMenuOpen(false); }}
                            className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg transition text-left"
                            style={{ color: currentNav.page === sub.page ? BRAND.primary : BRAND.navy, fontSize: 14, background: currentNav.page === sub.page ? `${BRAND.primary}10` : "transparent" }}>
                            <div className="w-2 h-2 rounded-full flex-shrink-0" style={{ background: currentNav.page === sub.page ? BRAND.primary : BRAND.lightBlue }}></div>
                            {sub.label}
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                );
              })}
              {/* User menu items in mobile drawer */}
              <div className="mt-4 pt-4" style={{ borderTop: `2px solid ${BRAND.accentBlue}` }}>
                {USER_MENU_ITEMS.filter(item => !item.roles || item.roles.includes(currentRole)).map(item => (
                  <button key={item.id} onClick={() => { handleNavigate({ section: item.id, page: item.page }); setMobileMenuOpen(false); }}
                    className="w-full flex items-center gap-3 px-3 py-3 rounded-lg transition text-left" style={{ color: BRAND.navy, fontSize: 15 }}>
                    <item.icon size={20} style={{ color: BRAND.lightBlue }} /><span className="flex-1 font-medium">{item.label}</span>
                  </button>
                ))}
              </div>
            </div>
          </>
        )}

        {/* ── Page Content ── */}
        <div className="h-full overflow-y-auto" style={{ padding: isMobile ? "16px" : "24px 24px 24px 24px", paddingLeft: isMobile ? "16px" : "220px", WebkitOverflowScrolling: "touch" }}>
          {renderPage()}
        </div>
      </div>

      {/* Command Palette */}
      <CommandPalette isOpen={commandPaletteOpen} onClose={() => setCommandPaletteOpen(false)} pages={[]} currentPage={currentNav} onNavigate={handleNavigate} />
    </div>
  );
}
