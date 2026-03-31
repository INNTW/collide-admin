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
// Role hierarchy: admin > team_lead > employee
// Each nav item specifies which roles can see it
const NAV_TREE = {
  sections: [
    {
      id: "dashboard",
      label: "Dashboard",
      icon: Home,
      page: null,
      roles: ["admin", "team_lead", "employee"],
    },
    {
      id: "scheduling",
      label: "Scheduling",
      icon: Calendar,
      roles: ["admin", "team_lead", "employee"],
      children: [
        { id: "events-manager", label: "Events Manager", page: "events-manager", roles: ["admin", "team_lead"] },
        { id: "calendar", label: "Calendar View", page: "calendar-view", roles: ["admin", "team_lead"] },
        { id: "shift-builder", label: "Shift Builder", page: "shift-builder", roles: ["admin", "team_lead"] },
        { id: "role-requirements", label: "Role Requirements", page: "role-requirements", roles: ["admin", "team_lead"] },
        { id: "availability", label: "Availability", page: "availability", roles: ["admin", "team_lead", "employee"] },
        { id: "my-shifts", label: "My Shifts", page: "my-shifts", roles: ["admin", "team_lead", "employee"] },
      ],
    },
    {
      id: "employees",
      label: "Employees",
      icon: Users,
      roles: ["admin", "team_lead"],
      children: [
        { id: "directory", label: "Directory", page: "directory", roles: ["admin", "team_lead"] },
        { id: "skills-tags", label: "Skills & Tags", page: "skills-tags", roles: ["admin", "team_lead"] },
        { id: "payroll", label: "Payroll & T4", page: "payroll", roles: ["admin"] },
      ],
    },
    {
      id: "inventory",
      label: "Inventory",
      icon: Package,
      roles: ["admin", "team_lead"],
      children: [
        { id: "products", label: "Products", page: "products", roles: ["admin", "team_lead"] },
        { id: "stock", label: "Stock & Distribution", page: "stock", roles: ["admin", "team_lead"] },
        { id: "inv-analytics", label: "Analytics", page: "inv-analytics", roles: ["admin"] },
        { id: "inv-projections", label: "Projections", page: "inv-projections", roles: ["admin"] },
      ],
    },
    {
      id: "projections",
      label: "Projections",
      icon: TrendingUp,
      roles: ["admin"],
      children: [
        { id: "sales-projections", label: "Sales Forecast", page: "sales-projections", roles: ["admin"] },
        { id: "staffing-projections", label: "Staffing Needs", page: "staffing-projections", roles: ["admin"] },
        { id: "event-pnl", label: "Event P&L", page: "event-pnl", roles: ["admin"] },
      ],
    },
    {
      id: "reports",
      label: "Reports",
      icon: BarChart3,
      page: "reports",
      roles: ["admin", "team_lead"],
    },
    {
      id: "notifications",
      label: "Notifications",
      icon: Bell,
      page: "notifications",
      roles: ["admin", "team_lead", "employee"],
    },
    {
      id: "settings",
      label: "Settings",
      icon: Settings,
      roles: ["admin"],
      children: [
        { id: "general-settings", label: "General", page: "settings", roles: ["admin"] },
        { id: "user-management", label: "User Management", page: "user-management", roles: ["admin"] },
      ],
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
        className="w-full px-4 py-2 rounded-lg text-white transition focus:outline-none focus:ring-2"
        style={{
          background: "rgba(255,255,255,0.05)",
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
                style={{ color: "#e0e6ff", borderTop: i > 0 ? "1px solid rgba(255,255,255,0.05)" : "none" }}
                onMouseDown={() => handleSelect(s)}
                onMouseEnter={(e) => { e.currentTarget.style.background = "rgba(84,205,249,0.1)"; }}
                onMouseLeave={(e) => { e.currentTarget.style.background = "transparent"; }}
              >
                <div style={{ color: "#54CDF9", fontWeight: 600 }}>{mainText}</div>
                <div className="text-xs mt-0.5" style={{ color: "rgba(224,230,255,0.5)" }}>{secondaryText}</div>
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
    ghost: {
      bg: "transparent",
      text: BRAND.text,
      hover: "rgba(255,255,255,0.1)",
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
      className="flex items-center justify-center p-4"
      style={{ background: BRAND.gradient, height: "100dvh", minHeight: "-webkit-fill-available" }}
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
  const today = new Date().toISOString().split("T")[0];
  const upcomingEvents = (events || [])
    .filter((e) => e.end_date >= today)
    .sort((a, b) => a.start_date.localeCompare(b.start_date))
    .slice(0, 5);

  const totalStaff = (employees || []).length;
  const activeEvents = (events || []).filter(e => e.status === "active").length;

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
          label="Upcoming Events"
          value={upcomingEvents.length}
          color="warning"
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
              background: activeTab === tab ? `${BRAND.primary}20` : "rgba(255,255,255,0.05)",
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
                      <td className="py-3 px-3 text-center" style={{ color: BRAND.text }}>{eventVenuesCount}</td>
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
                      <td className="py-3 px-3 text-xs" style={{ color: "rgba(224,230,255,0.6)" }}>{ven.address || "—"}</td>
                      <td className="py-3 px-3 text-center" style={{ color: BRAND.text }}>{ven.city || "—"}</td>
                      <td className="py-3 px-3 text-center" style={{ color: BRAND.text }}>{ven.province || "—"}</td>
                      <td className="py-3 px-3 text-center" style={{ color: BRAND.text }}>{venueEventCount}</td>
                      <td className="py-3 px-3 text-center">
                        <div className="flex items-center justify-center gap-1">
                          <button onClick={() => openEditVenue(ven)} className="p-1.5 rounded-lg hover:bg-white/10 transition">
                            <Edit2 size={14} style={{ color: BRAND.primary }} />
                          </button>
                          <button onClick={() => handleDeleteVenue(ven.id)} className="p-1.5 rounded-lg hover:bg-white/10 transition">
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
                <p className="text-xs" style={{ color: "rgba(224,230,255,0.6)" }}>No venues available. Create venues in the Venues tab first.</p>
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
                      <div className="text-xs" style={{ color: "rgba(224,230,255,0.5)" }}>{ven.city}, {ven.province}</div>
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
          <button onClick={() => setViewMode("month")} className="inline-flex items-center gap-2 px-3 py-2 rounded-lg hover:bg-white/10 transition">
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
                        <p className="text-xs mt-1" style={{ color: "rgba(224,230,255,0.6)" }}>
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
                        <div className="w-16 text-sm font-medium flex-shrink-0 pt-1" style={{ color: "rgba(224,230,255,0.7)" }}>
                          {String(hour).padStart(2, "0")}:00
                        </div>
                        <div className="flex-1 space-y-1">
                          {hourShifts.map(shift => {
                            const emp = employees.find(e => e.id === shift.employee_id);
                            const evt = events.find(e => e.id === shift.event_id);
                            return (
                              <div key={shift.id} className="p-2 rounded-lg" style={{ background: "rgba(84,205,249,0.1)", borderLeft: `3px solid ${BRAND.primary}` }}>
                                <p className="text-sm font-medium" style={{ color: BRAND.text }}>
                                  {emp ? `${emp.first_name} ${emp.last_name}` : "Unassigned"} {shift.role ? `— ${shift.role}` : ""}
                                </p>
                                <p className="text-xs" style={{ color: "rgba(224,230,255,0.6)" }}>
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
                    <div key={emp.id} className="p-2 rounded-lg text-sm cursor-pointer hover:bg-white/10 transition" style={{ background: "rgba(255,255,255,0.05)" }}>
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
            <span className="text-xs capitalize" style={{ color: "rgba(224,230,255,0.7)" }}>{status}</span>
          </div>
        ))}
      </div>

      <div className="rounded-xl overflow-hidden" style={{ background: "rgba(255,255,255,0.03)", border: `1px solid ${BRAND.glassBorder}` }}>
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
                        borderRight: colIdx < 6 ? `1px solid rgba(255,255,255,0.04)` : "none",
                        borderBottom: rowIdx < rows.length - 1 ? `1px solid rgba(255,255,255,0.04)` : "none",
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
                      <span className="text-xs truncate hidden md:inline" style={{ color: "rgba(224,230,255,0.5)", lineHeight: `${barHeight}px` }}>
                        📍{venueNames[0]}
                      </span>
                    )}
                    {staffCount > 0 && (
                      <span className="text-xs flex-shrink-0 hidden lg:inline" style={{ color: "rgba(224,230,255,0.5)", lineHeight: `${barHeight}px` }}>
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

// ============================================================================
// PAGES: AVAILABILITY
// ============================================================================

const AvailabilityPage = ({ employees = [], events = [], availability: parentAvailability = {}, onRefresh, user, currentRole }) => {
  const [selectedEmployee, setSelectedEmployee] = useState("");
  const [weekOffset, setWeekOffset] = useState(0);
  const [weekSlots, setWeekSlots] = useState({});
  const [saving, setSaving] = useState(false);
  const [saveMsg, setSaveMsg] = useState(null);

  // Find the logged-in user's employee record
  const currentEmployee = useMemo(
    () => employees.find((e) => e.email === user?.email),
    [employees, user]
  );

  const isEmployeeOnly = currentRole === "employee";

  // Auto-select: employees locked to self, admins default to first
  useEffect(() => {
    if (isEmployeeOnly && currentEmployee) {
      setSelectedEmployee(currentEmployee.id);
    } else if (!selectedEmployee && employees.length > 0) {
      setSelectedEmployee(employees[0].id);
    }
  }, [employees, currentEmployee, isEmployeeOnly]);

  // Compute the 7 days of the current week view
  const weekDays = useMemo(() => {
    const today = new Date();
    const dayOfWeek = today.getDay();
    const monday = new Date(today);
    monday.setDate(today.getDate() - ((dayOfWeek + 6) % 7) + weekOffset * 7);
    return Array.from({ length: 7 }, (_, i) => {
      const d = new Date(monday);
      d.setDate(monday.getDate() + i);
      return d;
    });
  }, [weekOffset]);

  const formatDate = (d) => d.toISOString().split("T")[0];
  const dayNames = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

  // Build weekSlots from parentAvailability when employee or week changes
  useEffect(() => {
    if (!selectedEmployee) return;
    const empAvail = parentAvailability[selectedEmployee] || {};
    const slots = {};
    weekDays.forEach((d) => {
      const key = formatDate(d);
      slots[key] = empAvail[key] || "available";
    });
    setWeekSlots(slots);
  }, [selectedEmployee, weekDays, parentAvailability]);

  const statusColors = {
    available: { bg: "rgba(74,222,128,0.2)", color: "#4ade80", label: "Available" },
    tentative: { bg: "rgba(251,191,36,0.2)", color: "#fbbf24", label: "Tentative" },
    unavailable: { bg: "rgba(244,67,54,0.2)", color: "#ef4444", label: "Unavailable" },
  };
  const statusCycle = ["available", "tentative", "unavailable"];

  const cycleStatus = (dateKey) => {
    setWeekSlots((prev) => {
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

      // Build upsert rows for the week
      const rows = Object.entries(weekSlots).map(([date, status]) => ({
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
        console.error("Failed to save availability:", errText);
        setSaveMsg({ type: "error", text: "Failed to save: " + errText });
        return;
      }

      setSaveMsg({ type: "success", text: "Availability saved!" });
      if (onRefresh) await onRefresh();
    } catch (err) {
      console.error("Save error:", err);
      setSaveMsg({ type: "error", text: "Failed to save: " + (err.message || "Unknown error") });
    } finally {
      setSaving(false);
    }
  };

  const weekLabel = weekDays.length > 0
    ? `${weekDays[0].toLocaleDateString("en-US", { month: "short", day: "numeric" })} – ${weekDays[6].toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}`
    : "";

  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-bold" style={{ color: BRAND.text }}>
        Availability
      </h1>

      <SectionCard title={isEmployeeOnly ? "Your Availability" : "Select Employee"} icon={Users}>
        {isEmployeeOnly ? (
          <div className="px-4 py-3 rounded-lg" style={{ background: "rgba(255,255,255,0.05)", border: `1px solid ${BRAND.glassBorder}` }}>
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

      <SectionCard title="Weekly Schedule" icon={Calendar}>
        {/* Week navigation */}
        <div className="flex items-center justify-between mb-4">
          <Btn variant="ghost" size="sm" onClick={() => setWeekOffset((w) => w - 1)}>← Prev</Btn>
          <span className="text-sm font-medium" style={{ color: BRAND.text }}>{weekLabel}</span>
          <Btn variant="ghost" size="sm" onClick={() => setWeekOffset((w) => w + 1)}>Next →</Btn>
        </div>

        {/* Tap-to-cycle legend */}
        <div className="flex gap-3 mb-4 flex-wrap">
          {statusCycle.map((s) => (
            <div key={s} className="flex items-center gap-1.5">
              <div className="w-3 h-3 rounded-full" style={{ background: statusColors[s].color }} />
              <span className="text-xs" style={{ color: "rgba(224,230,255,0.7)" }}>{statusColors[s].label}</span>
            </div>
          ))}
        </div>

        {/* Day slots */}
        <div className="space-y-2">
          {weekDays.map((d, idx) => {
            const key = formatDate(d);
            const status = weekSlots[key] || "available";
            const sc = statusColors[status];
            const isToday = formatDate(d) === formatDate(new Date());
            return (
              <div
                key={key}
                onClick={() => cycleStatus(key)}
                className="flex items-center justify-between p-4 rounded-lg cursor-pointer transition-all active:scale-[0.98]"
                style={{
                  background: sc.bg,
                  border: isToday ? `2px solid ${BRAND.primary}` : "2px solid transparent",
                  minHeight: 56,
                }}
              >
                <div>
                  <span className="text-sm font-semibold" style={{ color: BRAND.text }}>
                    {dayNames[idx]}
                  </span>
                  <span className="text-xs ml-2" style={{ color: "rgba(224,230,255,0.5)" }}>
                    {d.toLocaleDateString("en-US", { month: "short", day: "numeric" })}
                  </span>
                  {isToday && (
                    <span className="text-xs ml-2 px-1.5 py-0.5 rounded" style={{ background: `${BRAND.primary}30`, color: BRAND.primary }}>Today</span>
                  )}
                </div>
                <span className="text-xs font-semibold px-3 py-1 rounded-full" style={{ background: sc.bg, color: sc.color }}>
                  {sc.label}
                </span>
              </div>
            );
          })}
        </div>

        <p className="text-xs mt-2" style={{ color: "rgba(224,230,255,0.4)" }}>
          Tap a day to cycle: Available → Tentative → Unavailable
        </p>

        {saveMsg && (
          <div className="mt-3 p-3 rounded-lg text-sm" style={{
            background: saveMsg.type === "success" ? "rgba(74,222,128,0.15)" : "rgba(244,67,54,0.15)",
            color: saveMsg.type === "success" ? "#4ade80" : "#ef4444",
          }}>
            {saveMsg.text}
          </div>
        )}

        <Btn variant="primary" className="w-full mt-4" onClick={handleSave} disabled={saving || !selectedEmployee}>
          {saving ? "Saving..." : "Save Availability"}
        </Btn>
      </SectionCard>
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
          <p className="text-sm" style={{ color: "rgba(224,230,255,0.7)" }}>
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
          <p className="text-sm mt-1" style={{ color: "rgba(224,230,255,0.6)" }}>
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
                background: viewMode === mode ? `${BRAND.primary}20` : "rgba(255,255,255,0.05)",
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
            <div className="mb-3 flex items-center gap-4 text-xs" style={{ color: "rgba(224,230,255,0.6)" }}>
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
                  style={{ background: "rgba(255,255,255,0.05)" }}
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
                        <p className="text-xs" style={{ color: "rgba(224,230,255,0.6)" }}>Role: {shift.role}</p>
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
      <div className="flex items-center justify-between flex-wrap gap-4">
        <h1 className="text-2xl font-bold" style={{ color: BRAND.text }}>Products</h1>
        <Btn icon={Plus} onClick={() => { resetForm(); setEditProduct(null); setShowAddModal(true); }}>Add Product</Btn>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard label="Total Products" value={activeProducts.length} icon={Package} color="primary" />
        <StatCard label="Stock Units" value={totalStockUnits} icon={Package} color="success" />
        <StatCard label="Stock Value" value={currency(totalStockValue)} icon={DollarSign} color="warning" />
        <StatCard label="Avg Margin" value={`${avgMargin}%`} icon={TrendingUp} color="primary" />
      </div>

      {/* Filters */}
      <div className="flex items-center gap-3 flex-wrap">
        <div className="flex-1 min-w-48">
          <input
            type="text"
            placeholder="Search products..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full px-4 py-2 rounded-lg text-white focus:outline-none focus:ring-2"
            style={{ background: "rgba(255,255,255,0.05)", border: `1px solid ${BRAND.glassBorder}` }}
          />
        </div>
        <select
          value={filterCategory}
          onChange={(e) => setFilterCategory(e.target.value)}
          className="px-4 py-2 rounded-lg text-white focus:outline-none"
          style={{ background: "rgba(255,255,255,0.05)", border: `1px solid ${BRAND.glassBorder}` }}
        >
          <option value="">All Categories</option>
          {PRODUCT_CATEGORIES.map(c => <option key={c.value} value={c.value}>{c.label}</option>)}
        </select>
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
                  <p className="text-xs mt-1" style={{ color: "rgba(224,230,255,0.5)" }}>
                    SKU: {p.sku} &middot; {p.category || "T-Shirts"}
                  </p>
                </div>
                <div className="flex items-center gap-1">
                  <button onClick={() => openEdit(p)} className="p-1.5 rounded-lg hover:bg-white/10 transition">
                    <Edit2 size={14} style={{ color: BRAND.primary }} />
                  </button>
                  <button onClick={() => handleToggleStatus(p)} className="p-1.5 rounded-lg hover:bg-white/10 transition">
                    {isInactive ? <Eye size={14} style={{ color: BRAND.success }} /> : <EyeOff size={14} style={{ color: BRAND.warning }} />}
                  </button>
                  <button onClick={() => handleDelete(p.id)} className="p-1.5 rounded-lg hover:bg-white/10 transition">
                    <Trash2 size={14} style={{ color: BRAND.danger }} />
                  </button>
                </div>
              </div>

              <div className="grid grid-cols-3 gap-2 text-center">
                <div className="rounded-lg p-2" style={{ background: "rgba(255,255,255,0.04)" }}>
                  <p className="text-xs" style={{ color: "rgba(224,230,255,0.5)" }}>Cost</p>
                  <p className="font-semibold text-sm" style={{ color: BRAND.text }}>{currency(p.cost)}</p>
                </div>
                <div className="rounded-lg p-2" style={{ background: "rgba(255,255,255,0.04)" }}>
                  <p className="text-xs" style={{ color: "rgba(224,230,255,0.5)" }}>Retail</p>
                  <p className="font-semibold text-sm" style={{ color: BRAND.primary }}>{currency(p.retail)}</p>
                </div>
                <div className="rounded-lg p-2" style={{ background: "rgba(255,255,255,0.04)" }}>
                  <p className="text-xs" style={{ color: "rgba(224,230,255,0.5)" }}>Margin</p>
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
                    <td className="py-3 px-3 text-center" style={{ color: "rgba(224,230,255,0.7)" }}>{distrib}</td>
                    <td className="py-3 px-3 text-center" style={{ color: BRAND.success }}>{sold}</td>
                    <td className="py-3 px-3 text-center" style={{ color: "rgba(224,230,255,0.7)" }}>{returned}</td>
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
            className="px-3 py-1.5 rounded-lg text-sm text-white focus:outline-none"
            style={{ background: "rgba(255,255,255,0.05)", border: `1px solid ${BRAND.glassBorder}` }}
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
                    <td className="py-3 px-3" style={{ color: "rgba(224,230,255,0.7)" }}>{event?.name || "Unknown"}</td>
                    <td className="py-3 px-3 text-center" style={{ color: BRAND.text }}>{d.qty_sent}</td>
                    <td className="py-3 px-3 text-center" style={{ color: BRAND.success }}>{d.qty_sold || 0}</td>
                    <td className="py-3 px-3 text-center" style={{ color: "rgba(224,230,255,0.7)" }}>{d.qty_returned || 0}</td>
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
                            className="text-xs px-2 py-1 rounded hover:bg-white/10 transition"
                            style={{ color: BRAND.success }}
                          >Sold</button>
                          <button
                            onClick={() => {
                              const qty = prompt(`Return how many ${product?.name}? (max ${remaining})`);
                              if (qty) handleRecordReturn(d.id, qty);
                            }}
                            className="text-xs px-2 py-1 rounded hover:bg-white/10 transition"
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
            <label className="block text-xs mb-1" style={{ color: "rgba(224,230,255,0.6)" }}>Product</label>
            <select value={selectedProduct} onChange={(e) => setSelectedProduct(e.target.value)}
              className="w-full px-3 py-2 rounded-lg text-sm text-white focus:outline-none"
              style={{ background: "rgba(255,255,255,0.05)", border: `1px solid ${BRAND.glassBorder}` }}>
              <option value="">All Products</option>
              {products.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-xs mb-1" style={{ color: "rgba(224,230,255,0.6)" }}>Event Type</label>
            <select value={selectedEventType} onChange={(e) => setSelectedEventType(e.target.value)}
              className="w-full px-3 py-2 rounded-lg text-sm text-white focus:outline-none"
              style={{ background: "rgba(255,255,255,0.05)", border: `1px solid ${BRAND.glassBorder}` }}>
              <option value="">All Types</option>
              {Object.entries(EVENT_TYPE_DEFAULTS).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-xs mb-1" style={{ color: "rgba(224,230,255,0.6)" }}>
              Time Range: <span style={{ color: BRAND.primary }}>{dateRange} days</span>
            </label>
            <input type="range" min="7" max="365" step="7" value={dateRange}
              onChange={(e) => setDateRange(parseInt(e.target.value))}
              className="w-full" />
          </div>
          <div>
            <label className="block text-xs mb-1" style={{ color: "rgba(224,230,255,0.6)" }}>
              Min Sell-Through: <span style={{ color: BRAND.primary }}>{minSellThrough}%</span>
            </label>
            <input type="range" min="0" max="100" step="5" value={minSellThrough}
              onChange={(e) => setMinSellThrough(parseInt(e.target.value))}
              className="w-full" />
          </div>
        </div>
        <div className="mt-3">
          <label className="block text-xs mb-1" style={{ color: "rgba(224,230,255,0.6)" }}>
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
              <div key={item.id} className="rounded-lg p-3" style={{ background: "rgba(255,255,255,0.04)", border: `1px solid ${BRAND.glassBorder}` }}>
                <div className="flex items-center justify-between mb-2">
                  <span className="font-medium text-sm" style={{ color: BRAND.text }}>{item.name}</span>
                  <span className="text-xs px-2 py-0.5 rounded-full capitalize" style={{ background: `${statusColor}20`, color: statusColor }}>
                    {status}
                  </span>
                </div>
                <div className="grid grid-cols-4 gap-1 text-center text-xs">
                  <div>
                    <p style={{ color: "rgba(224,230,255,0.5)" }}>On Hand</p>
                    <p className="font-semibold" style={{ color: BRAND.text }}>{item.onHand}</p>
                  </div>
                  <div>
                    <p style={{ color: "rgba(224,230,255,0.5)" }}>Sold</p>
                    <p className="font-semibold" style={{ color: BRAND.success }}>{item.totalSold}</p>
                  </div>
                  <div>
                    <p style={{ color: "rgba(224,230,255,0.5)" }}>Sell %</p>
                    <p className="font-semibold" style={{ color: item.sellThrough >= 60 ? BRAND.success : BRAND.warning }}>{item.sellThrough.toFixed(0)}%</p>
                  </div>
                  <div>
                    <p style={{ color: "rgba(224,230,255,0.5)" }}>Days Left</p>
                    <p className="font-semibold" style={{ color: statusColor }}>{item.daysOfStock > 365 ? "365+" : item.daysOfStock}</p>
                  </div>
                </div>
                {/* Mini progress bar for sell-through */}
                <div className="mt-2 h-1.5 rounded-full overflow-hidden" style={{ background: "rgba(255,255,255,0.1)" }}>
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
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.1)" />
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
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.1)" />
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
            <label className="block text-xs mb-1" style={{ color: "rgba(224,230,255,0.6)" }}>Select Existing Event (optional)</label>
            <select value={selectedEvent} onChange={(e) => setSelectedEvent(e.target.value)}
              className="w-full px-3 py-2 rounded-lg text-sm text-white focus:outline-none"
              style={{ background: "rgba(255,255,255,0.05)", border: `1px solid ${BRAND.glassBorder}` }}>
              <option value="">— Custom Parameters —</option>
              {upcomingEvents.map(e => <option key={e.id} value={e.id}>{e.name} ({e.start_date})</option>)}
            </select>
          </div>
          <div>
            <label className="block text-xs mb-1" style={{ color: "rgba(224,230,255,0.6)" }}>Event Type</label>
            <select value={eventType} onChange={(e) => setEventType(e.target.value)}
              className="w-full px-3 py-2 rounded-lg text-sm text-white focus:outline-none"
              style={{ background: "rgba(255,255,255,0.05)", border: `1px solid ${BRAND.glassBorder}` }}>
              {Object.entries(EVENT_TYPE_DEFAULTS).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-xs mb-1" style={{ color: "rgba(224,230,255,0.6)" }}>
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
            <label className="block text-xs mb-1" style={{ color: "rgba(224,230,255,0.6)" }}>
              Expected Traffic: <span style={{ color: BRAND.primary }}>{expectedTraffic.toLocaleString()}</span>
            </label>
            <input type="range" min="50" max="5000" step="50" value={expectedTraffic}
              onChange={(e) => setExpectedTraffic(parseInt(e.target.value))}
              className="w-full" />
          </div>
          <div>
            <label className="block text-xs mb-1" style={{ color: "rgba(224,230,255,0.6)" }}>
              Growth Factor: <span style={{ color: BRAND.primary }}>{(growthFactor * 100).toFixed(0)}%</span>
            </label>
            <input type="range" min="0.5" max="3.0" step="0.05" value={growthFactor}
              onChange={(e) => setGrowthFactor(parseFloat(e.target.value))}
              className="w-full" />
          </div>
          <div>
            <label className="block text-xs mb-1" style={{ color: "rgba(224,230,255,0.6)" }}>
              Sell-Through Override: <span style={{ color: BRAND.primary }}>{sellThroughOverride > 0 ? `${sellThroughOverride}%` : "Auto"}</span>
            </label>
            <input type="range" min="0" max="100" step="5" value={sellThroughOverride}
              onChange={(e) => setSellThroughOverride(parseInt(e.target.value))}
              className="w-full" />
          </div>
          <div>
            <label className="block text-xs mb-1" style={{ color: "rgba(224,230,255,0.6)" }}>
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
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.1)" />
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
            className="px-3 py-2 rounded-lg text-sm text-white focus:outline-none"
            style={{ background: "rgba(255,255,255,0.05)", border: `1px solid ${BRAND.glassBorder}` }}
          >
            <option value="">All Event Types</option>
            {Object.entries(EVENT_TYPE_DEFAULTS).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}
          </select>
          <div className="flex items-center gap-2 px-3 py-2 rounded-lg" style={{ background: "rgba(255,255,255,0.05)", border: `1px solid ${BRAND.glassBorder}` }}>
            <span className="text-xs" style={{ color: "rgba(224,230,255,0.6)" }}>Growth</span>
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
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.1)" />
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
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.1)" />
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
                  <td className="py-3 px-3 text-center text-xs" style={{ color: "rgba(224,230,255,0.7)" }}>{p.start_date}</td>
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
              <div key={p.id} className="rounded-lg p-3" style={{ background: "rgba(255,255,255,0.04)", border: `1px solid ${BRAND.glassBorder}` }}>
                <div className="flex items-center justify-between mb-2">
                  <span className="font-medium text-sm" style={{ color: BRAND.text }}>{p.name}</span>
                  {needsRestock && (
                    <span className="text-xs px-2 py-0.5 rounded-full" style={{ background: `${BRAND.danger}20`, color: BRAND.danger }}>Restock</span>
                  )}
                </div>
                <div className="grid grid-cols-3 gap-2 text-center text-xs">
                  <div>
                    <p style={{ color: "rgba(224,230,255,0.5)" }}>Proj. Revenue</p>
                    <p className="font-semibold" style={{ color: BRAND.primary }}>{currency(projRevenue)}</p>
                  </div>
                  <div>
                    <p style={{ color: "rgba(224,230,255,0.5)" }}>Proj. Units</p>
                    <p className="font-semibold" style={{ color: BRAND.text }}>{projUnits}</p>
                  </div>
                  <div>
                    <p style={{ color: "rgba(224,230,255,0.5)" }}>In Stock</p>
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
        <div className="flex items-center gap-2 px-3 py-2 rounded-lg" style={{ background: "rgba(255,255,255,0.05)", border: `1px solid ${BRAND.glassBorder}` }}>
          <span className="text-xs" style={{ color: "rgba(224,230,255,0.6)" }}>Avg Rate</span>
          <input
            type="number"
            placeholder={avgHourlyRate.toFixed(2)}
            value={hourlyOverride}
            onChange={(e) => setHourlyOverride(e.target.value)}
            className="w-20 px-2 py-1 rounded text-sm text-white text-center focus:outline-none"
            style={{ background: "rgba(255,255,255,0.08)", border: `1px solid ${BRAND.glassBorder}` }}
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
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.1)" />
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
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.1)" />
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
            <div className="mt-4 p-3 rounded-lg" style={{ background: "rgba(255,255,255,0.04)" }}>
              <p className="text-xs mb-2" style={{ color: "rgba(224,230,255,0.5)" }}>Overall Fill Rate</p>
              <div className="w-full h-3 rounded-full overflow-hidden" style={{ background: "rgba(255,255,255,0.1)" }}>
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
                  <td className="py-3 px-3 text-center text-xs" style={{ color: "rgba(224,230,255,0.7)" }}>{e.start_date}</td>
                  <td className="py-3 px-3 text-center" style={{ color: BRAND.text }}>{e.days}</td>
                  <td className="py-3 px-3 text-center" style={{ color: BRAND.primary }}>{e.neededStaff}</td>
                  <td className="py-3 px-3 text-center" style={{ color: BRAND.success }}>{e.assignedStaff}</td>
                  <td className="py-3 px-3 text-center font-semibold" style={{ color: e.gap > 0 ? BRAND.danger : BRAND.success }}>
                    {e.gap > 0 ? `-${e.gap}` : "0"}
                  </td>
                  <td className="py-3 px-3 text-center">
                    <div className="inline-flex items-center gap-1">
                      <div className="w-16 h-2 rounded-full overflow-hidden" style={{ background: "rgba(255,255,255,0.1)" }}>
                        <div className="h-full rounded-full" style={{ width: `${Math.min(100, e.fillRate)}%`, background: e.fillRate >= 100 ? BRAND.success : e.fillRate >= 50 ? BRAND.warning : BRAND.danger }} />
                      </div>
                      <span className="text-xs" style={{ color: "rgba(224,230,255,0.6)" }}>{e.fillRate.toFixed(0)}%</span>
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
        <div className="flex items-center gap-2 px-3 py-2 rounded-lg" style={{ background: "rgba(255,255,255,0.05)", border: `1px solid ${BRAND.glassBorder}` }}>
          <span className="text-xs" style={{ color: "rgba(224,230,255,0.6)" }}>Growth</span>
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
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.1)" />
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
                <div key={type} className="p-3 rounded-lg" style={{ background: "rgba(255,255,255,0.04)" }}>
                  <div className="flex items-center justify-between mb-2">
                    <span className="font-medium text-sm" style={{ color: BRAND.text }}>{def.label}</span>
                    <span className="text-sm font-semibold" style={{ color: typeMargin >= 0 ? BRAND.success : BRAND.danger }}>{typeMargin.toFixed(0)}% margin</span>
                  </div>
                  <div className="flex items-center justify-between text-xs">
                    <span style={{ color: "rgba(224,230,255,0.5)" }}>{typeEvents.length} events</span>
                    <span style={{ color: BRAND.primary }}>{currency(typeRevenue)} rev &rarr; {currency(typeProfit)} profit</span>
                  </div>
                  <div className="w-full h-2 rounded-full mt-2 overflow-hidden" style={{ background: "rgba(255,255,255,0.1)" }}>
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
                  <td className="py-3 px-2 text-right" style={{ color: "rgba(224,230,255,0.6)" }}>{currency(e.fixedCosts)}</td>
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
                          {u.first_name && u.last_name ? `${u.first_name} ${u.last_name}` : "—"}
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
      <Modal isOpen={showCreateModal} onClose={() => { setShowCreateModal(false); setCreateForm({ email: "", first_name: "", last_name: "", app_role: "employee", hourly_rate: "" }); }} title="Create New User" size="md">
        <div className="space-y-3">
          <div className="grid grid-cols-2 gap-3">
            <Input label="First Name" value={createForm.first_name} onChange={(e) => setCreateForm({ ...createForm, first_name: e.target.value })} placeholder="John" />
            <Input label="Last Name" value={createForm.last_name} onChange={(e) => setCreateForm({ ...createForm, last_name: e.target.value })} placeholder="Doe" />
          </div>
          <Input label="Email" type="email" value={createForm.email} onChange={(e) => setCreateForm({ ...createForm, email: e.target.value })} placeholder="john@collideapparel.com" />
          <p className="text-xs" style={{ color: "rgba(224,230,255,0.5)" }}>They will receive an email to set their own password.</p>
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
          <p className="text-sm" style={{ color: "rgba(224,230,255,0.7)" }}>
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

  // Navigation State
  const [currentNav, setCurrentNav] = useState(() => {
    const hash = window.location.hash.replace('#/', '');
    if (hash) {
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
        <p style={{ color: "rgba(224,230,255,0.6)", fontSize: 14, lineHeight: 1.5 }}>
          You don't have permission to view this page. Contact your admin if you think this is a mistake.
        </p>
      </div>
    </div>
  );

  const renderPage = () => {
    // Role guard — block access to pages the user's role can't see
    if (!hasPageAccess(currentNav.page)) {
      return <AccessDenied />;
    }

    const pageContent = {
      dashboard: <DashboardPage employees={employees} events={events} locations={locations} shifts={shifts} availability={availability} products={products} stock={stock} historicSales={historicSales} />,
      "events-manager": <EventsManagementPage events={events} locations={locations} venues={venues} eventVenues={eventVenues} onRefresh={loadData} />,
      "calendar-view": <CalendarViewPage events={events} employees={employees} shifts={shifts} locations={locations} availability={availability} employeeSkills={employeeSkills} skills={skills} venues={venues} eventVenues={eventVenues} />,
      "shift-builder": <ShiftBuilderPage events={events} employees={employees} shifts={shifts} locations={locations} roleRequirements={roleRequirements} onRefresh={loadData} />,
      "role-requirements": <RoleRequirementsPage events={events} shifts={shifts} locations={locations} employees={employees} roleRequirements={roleRequirements} onRefresh={loadData} />,
      directory: <DirectoryPage employees={employees} employeeSkills={employeeSkills} skills={skills} />,
      "skills-tags": <SkillsTagsPage employees={employees} skills={skills} employeeSkills={employeeSkills} onRefresh={loadData} />,
      availability: <AvailabilityPage employees={employees} events={events} availability={availability} onRefresh={loadData} user={user} currentRole={currentRole} />,
      "my-shifts": <MyShiftsPage employees={employees} events={events} shifts={shifts} user={user} locations={locations} />,
      payroll: <PayrollPage employees={employees} events={events} locations={locations} shifts={shifts} />,
      products: <InventoryProductsPage products={products} stock={stock} onRefresh={loadData} />,
      stock: <InventoryStockPage products={products} stock={stock} distributions={distributions} events={events} onRefresh={loadData} />,
      "inv-analytics": <InventoryAnalyticsPage historicSales={historicSales} products={products} distributions={distributions} stock={stock} events={events} />,
      "inv-projections": <InventoryProjectionsPage events={events} products={products} historicSales={historicSales} stock={stock} distributions={distributions} />,
      "sales-projections": <SalesProjectionsPage events={events} products={products} historicSales={historicSales} stock={stock} distributions={distributions} />,
      "staffing-projections": <StaffingProjectionsPage events={events} employees={employees} shifts={shifts} roleRequirements={roleRequirements} historicSales={historicSales} />,
      "event-pnl": <EventPnLPage events={events} products={products} historicSales={historicSales} employees={employees} shifts={shifts} stock={stock} roleRequirements={roleRequirements} distributions={distributions} />,
      reports: <ReportsPage employees={employees} events={events} shifts={shifts} historicSales={historicSales} products={products} />,
      notifications: <NotificationsPage notifications={notifications} />,
      settings: <SettingsPage user={user} />,
      "user-management": <UserManagementPage user={user} employees={employees} onRefresh={loadData} />,
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
        className="flex items-center justify-center"
        style={{ background: BRAND.gradient, height: "100dvh", minHeight: "-webkit-fill-available" }}
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

  // Wait for role to load before rendering main UI
  if (!roleLoaded) {
    return (
      <div
        className="flex items-center justify-center"
        style={{ background: BRAND.gradient, height: "100dvh", minHeight: "-webkit-fill-available" }}
      >
        <div className="text-center">
          <div
            className="inline-block animate-spin rounded-full h-12 w-12 border-4 border-opacity-30 border-current"
            style={{ borderColor: BRAND.primary }}
          ></div>
          <p className="mt-4" style={{ color: BRAND.text }}>
            Loading your workspace...
          </p>
        </div>
      </div>
    );
  }

  return (
    <div
      className="flex flex-col"
      style={{
        background: BRAND.gradient,
        height: "100dvh",       /* dynamic viewport height — works on mobile */
        minHeight: "-webkit-fill-available",
        overflow: "hidden",     /* prevent body scroll — children handle their own */
      }}
    >
      {/* Header */}
      <div
        className="flex-shrink-0 border-b px-3 py-2 md:px-4 md:py-3 flex items-center justify-between gap-2"
        style={{ borderColor: BRAND.glassBorder }}
      >
        <div className="flex items-center gap-2 flex-shrink-0">
          {isMobile && (
            <button
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="p-2.5 -ml-1 hover:bg-white/10 rounded-lg transition"
              aria-label="Toggle menu"
            >
              {mobileMenuOpen ? (
                <X size={22} style={{ color: BRAND.text }} />
              ) : (
                <Menu size={22} style={{ color: BRAND.text }} />
              )}
            </button>
          )}
          <h1 className={`font-bold ${isMobile ? "text-lg" : "text-xl"}`} style={{ color: BRAND.primary }}>
            Collide
          </h1>
          {currentRole && (
            <span className="flex-shrink-0" style={{
              fontSize: 10,
              padding: "2px 8px",
              borderRadius: 12,
              background: currentRole === "admin" ? `${BRAND.primary}30` : currentRole === "team_lead" ? "rgba(251,191,36,0.2)" : "rgba(74,222,128,0.2)",
              color: currentRole === "admin" ? BRAND.primary : currentRole === "team_lead" ? "#fbbf24" : "#4ade80",
              fontWeight: 600,
              textTransform: "uppercase",
              letterSpacing: "0.5px",
            }}>
              {currentRole === "team_lead" ? "Team Lead" : currentRole}
            </span>
          )}
        </div>

        {/* Search — hidden on mobile, shown on desktop */}
        {!isMobile && (
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
        )}

        <div className="flex items-center gap-1 flex-shrink-0">
          {isMobile && (
            <button
              onClick={() => setCommandPaletteOpen(true)}
              className="p-2.5 hover:bg-white/10 rounded-lg transition"
              aria-label="Search"
            >
              <Search size={20} style={{ color: BRAND.text }} />
            </button>
          )}
          <button
            onClick={() => handleNavigate({ section: "notifications", page: "notifications" })}
            className="p-2.5 hover:bg-white/10 rounded-lg transition"
            aria-label="Notifications"
          >
            <Bell size={20} style={{ color: BRAND.text }} />
          </button>
          <button
            onClick={handleLogout}
            className="p-2.5 hover:bg-white/10 rounded-lg transition"
            aria-label="Log out"
          >
            <LogOut size={20} style={{ color: BRAND.text }} />
          </button>
        </div>
      </div>

      {/* Breadcrumb — hide on mobile to save space */}
      {!isMobile && currentNav.page && (
        <div
          className="flex-shrink-0 px-4 py-2 text-sm border-b"
          style={{
            color: "rgba(224,230,255,0.6)",
            borderColor: BRAND.glassBorder,
          }}
        >
          {getBreadcrumb()}
        </div>
      )}

      {/* Main content area */}
      <div className="flex-1 flex" style={{ minHeight: 0 }}>
        {/* Desktop sidebar */}
        {!isMobile && (
          <div
            className="w-64 flex-shrink-0 overflow-y-auto border-r p-4 space-y-1"
            style={{ borderColor: BRAND.glassBorder }}
          >
            {NAV_TREE.sections.filter(section => {
              if (!currentRole) return false;
              return !section.roles || section.roles.includes(currentRole);
            }).map((section) => {
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
                      {section.children.filter(child => {
                        if (!currentRole) return false;
                        return !child.roles || child.roles.includes(currentRole);
                      }).map((child) => {
                        const isChildActive = currentNav.page === child.page;
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
                              background: isChildActive ? `${BRAND.primary}20` : "transparent",
                              color: isChildActive ? BRAND.primary : "rgba(224,230,255,0.7)",
                            }}
                          >
                            <div
                              className="w-2 h-2 rounded-full"
                              style={{
                                background: isChildActive ? BRAND.primary : "rgba(224,230,255,0.3)",
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

        {/* Mobile sidebar overlay */}
        {isMobile && mobileMenuOpen && (
          <>
            {/* Backdrop */}
            <div
              onClick={() => setMobileMenuOpen(false)}
              className="fixed inset-0 z-40"
              style={{ background: "rgba(0,10,30,0.7)", backdropFilter: "blur(4px)", WebkitBackdropFilter: "blur(4px)" }}
            />
            {/* Drawer */}
            <div
              className="fixed top-0 left-0 bottom-0 z-50 w-72 overflow-y-auto p-4 pt-5 space-y-1"
              style={{
                background: "linear-gradient(180deg, #001A35 0%, #00152B 100%)",
                borderRight: `1px solid ${BRAND.glassBorder}`,
                boxShadow: "4px 0 24px rgba(0,0,0,0.5)",
                WebkitOverflowScrolling: "touch",
              }}
            >
              {/* Drawer header */}
              <div className="flex items-center justify-between mb-4 pb-3" style={{ borderBottom: `1px solid ${BRAND.glassBorder}` }}>
                <h2 className="text-lg font-bold" style={{ color: BRAND.primary }}>Menu</h2>
                <button
                  onClick={() => setMobileMenuOpen(false)}
                  className="p-2 hover:bg-white/10 rounded-lg transition"
                  aria-label="Close menu"
                >
                  <X size={22} style={{ color: BRAND.text }} />
                </button>
              </div>
              {NAV_TREE.sections.filter(section => {
                if (!currentRole) return false;
                return !section.roles || section.roles.includes(currentRole);
              }).map((section) => {
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
                      className="w-full flex items-center gap-3 px-3 py-3 rounded-lg transition active:bg-white/15 text-left"
                      style={{
                        background: isActive ? `${BRAND.primary}20` : "transparent",
                        color: isActive ? BRAND.primary : BRAND.text,
                        fontSize: 15,
                      }}
                    >
                      <Icon size={20} />
                      <span className="flex-1 font-medium">{section.label}</span>
                      {hasChildren && (
                        <ChevronDown
                          size={18}
                          style={{
                            transform: isExpanded ? "rotate(0)" : "rotate(-90deg)",
                            transition: "transform 0.2s",
                          }}
                        />
                      )}
                    </button>

                    {hasChildren && isExpanded && (
                      <div className="ml-5 space-y-0.5 mt-1 mb-1">
                        {section.children.filter(child => {
                          if (!currentRole) return false;
                          return !child.roles || child.roles.includes(currentRole);
                        }).map((child) => {
                          const isChildActive = currentNav.page === child.page;
                          return (
                            <button
                              key={child.id}
                              onClick={() =>
                                handleNavigate({
                                  section: section.id,
                                  page: child.page,
                                })
                              }
                              className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg transition active:bg-white/15 text-left"
                              style={{
                                background: isChildActive ? `${BRAND.primary}20` : "transparent",
                                color: isChildActive ? BRAND.primary : "rgba(224,230,255,0.7)",
                                fontSize: 14,
                              }}
                            >
                              <div
                                className="w-2 h-2 rounded-full flex-shrink-0"
                                style={{
                                  background: isChildActive ? BRAND.primary : "rgba(224,230,255,0.3)",
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
          </>
        )}

        {/* Page Content */}
        <div
          className="flex-1 overflow-y-auto"
          style={{
            padding: isMobile ? "16px" : "24px",
            WebkitOverflowScrolling: "touch",
          }}
        >
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
    </div>
  );
}
