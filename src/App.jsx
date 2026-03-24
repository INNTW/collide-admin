import { useState, useEffect, useMemo, useCallback, useRef } from "react";
import { LineChart, Line, BarChart, Bar, AreaChart, Area, PieChart, Pie, Cell, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, ComposedChart } from "recharts";
import { Calendar, Users, MapPin, DollarSign, Clock, Plus, Printer, Search, ChevronDown, ChevronRight, Edit2, Trash2, X, Check, AlertTriangle, Eye, EyeOff, FileText, Home, Filter, ArrowLeft, Package, BarChart3, Bell, Download, Copy, CheckCircle, XCircle, TrendingUp, Layers, Send, Settings, UserCheck, Timer, Clipboard, LogOut, Lock, Shield, User } from "lucide-react";
import { supabase } from "./lib/supabase";

// ============================================================
// COLLIDE APPAREL — Staff & Inventory Manager v3.0
// Auth + Roles + CRA Tax Engine + T4 Generation
// ============================================================

// BRAND CONFIGURATION — Glassmorphism Dark Theme
const BRAND = {
  colors: {
    navy: "#001F3F",
    navyDark: "#000d1a",
    brightBlue: "#54CDF9",
    blueDark: "#3ab5e8",
    white: "#ffffff",
    lightText: "#e5e7eb",
    mutedText: "#9ca3af",
  },
  gradient: "linear-gradient(135deg, #001F3F 0%, #003366 40%, #001a33 70%, #000d1a 100%)",
  glass: {
    background: "rgba(255, 255, 255, 0.08)",
    border: "rgba(255, 255, 255, 0.15)",
    blur: "blur(16px)",
  },
};

// ============================================================
// CRA 2026 TAX ENGINE — Ontario
// Source: CRA T4127 122nd Edition, T4032-ON Jan 2026
// https://www.canada.ca/en/revenue-agency/services/forms-publications/payroll/t4127-payroll-deductions-formulas/t4127-jan/t4127-jan-payroll-deductions-formulas-computer-programs.html
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
};

const DEMO_USERS = [
  { email: "tharindra@collideapparel.com", password: "admin", role: "admin", employee_id: null, name: "Tharindra De Silva" },
  { email: "marcus@collideapparel.com", password: "demo", role: "team_lead", employee_id: "e1", name: "Marcus Chen" },
  { email: "priya@collideapparel.com", password: "demo", role: "sales", employee_id: "e2", name: "Priya Sharma" },
  { email: "jordan@collideapparel.com", password: "demo", role: "sales", employee_id: "e3", name: "Jordan Williams" },
];

const formatDate = (d) => d ? new Date(d + "T00:00:00").toLocaleDateString("en-CA", { month: "short", day: "numeric", year: "numeric" }) : "—";
const formatDateShort = (d) => d ? new Date(d + "T00:00:00").toLocaleDateString("en-CA", { month: "short", day: "numeric" }) : "";
const calcHours = (start, end, breakMin = 0) => { const [sh, sm] = start.split(":").map(Number); const [eh, em] = end.split(":").map(Number); return Math.max(0, (eh * 60 + em - sh * 60 - sm - breakMin) / 60); };
const currency = (n) => `$${Number(n || 0).toFixed(2)}`;
const pct = (n) => `${(n * 100).toFixed(1)}%`;
const provinces = ["AB","BC","MB","NB","NL","NS","NT","NU","ON","PE","QC","SK","YT"];
const uid = () => "id_" + Date.now() + "_" + Math.random().toString(36).slice(2, 7);
const statusColors = { active: "bg-emerald-100 text-emerald-800", inactive: "bg-gray-100 text-gray-600", onboarding: "bg-amber-100 text-amber-800", upcoming: "bg-blue-100 text-blue-800", completed: "bg-emerald-100 text-emerald-800", cancelled: "bg-red-100 text-red-700", scheduled: "bg-blue-100 text-blue-800", confirmed: "bg-emerald-100 text-emerald-800", no_show: "bg-red-100 text-red-700", available: "bg-emerald-100 text-emerald-700", unavailable: "bg-red-100 text-red-700", tentative: "bg-amber-100 text-amber-700", open: "bg-blue-100 text-blue-800", processing: "bg-amber-100 text-amber-800", finalized: "bg-emerald-100 text-emerald-800", sent: "bg-indigo-100 text-indigo-800", draft: "bg-gray-100 text-gray-600", in_transit: "bg-amber-100 text-amber-800", delivered: "bg-emerald-100 text-emerald-800", returned: "bg-blue-100 text-blue-800" };
const CHART_COLORS = ["#54CDF9","#10b981","#f59e0b","#ef4444","#8b5cf6","#06b6d4","#ec4899","#84cc16"];

const DEMO_EMPLOYEES = [
  { id:"e1", first_name:"Marcus", last_name:"Chen", email:"marcus@collideapparel.com", phone:"416-555-0101", sin_encrypted:"***-***-***", date_of_birth:"1995-03-12", address:"45 King St W", city:"Toronto", province:"ON", postal_code:"M5H 1J8", tax_province:"ON", td1_federal_claim:15705, td1_provincial_claim:11865, hourly_rate:22, overtime_rate:33, emergency_contact_name:"Linda Chen", emergency_contact_phone:"416-555-0102", bank_institution:"001", bank_transit:"12345", bank_account:"1234567", status:"active", notes:"Team lead, experienced with large events", role:"team_lead" },
  { id:"e2", first_name:"Priya", last_name:"Sharma", email:"priya@collideapparel.com", phone:"647-555-0201", sin_encrypted:"***-***-***", date_of_birth:"1998-07-22", address:"100 Queen St W", city:"Toronto", province:"ON", postal_code:"M5H 2N2", tax_province:"ON", td1_federal_claim:15705, td1_provincial_claim:11865, hourly_rate:19, overtime_rate:28.50, emergency_contact_name:"Raj Sharma", emergency_contact_phone:"647-555-0202", bank_institution:"004", bank_transit:"54321", bank_account:"7654321", status:"active", notes:"Great with customer interactions", role:"sales" },
  { id:"e3", first_name:"Jordan", last_name:"Williams", email:"jordan@collideapparel.com", phone:"905-555-0301", sin_encrypted:"***-***-***", date_of_birth:"2000-11-05", address:"200 Bay St", city:"Toronto", province:"ON", postal_code:"M5J 2J5", tax_province:"ON", td1_federal_claim:15705, td1_provincial_claim:11865, hourly_rate:18, overtime_rate:27, emergency_contact_name:"Karen Williams", emergency_contact_phone:"905-555-0302", bank_institution:"002", bank_transit:"67890", bank_account:"9876543", status:"active", notes:"", role:"sales" },
  { id:"e4", first_name:"Aisha", last_name:"Mohammed", email:"aisha@collideapparel.com", phone:"416-555-0401", sin_encrypted:"***-***-***", date_of_birth:"1997-01-15", address:"55 Yonge St", city:"Toronto", province:"ON", postal_code:"M5E 1J4", tax_province:"ON", td1_federal_claim:15705, td1_provincial_claim:11865, hourly_rate:20, overtime_rate:30, emergency_contact_name:"Hassan Mohammed", emergency_contact_phone:"416-555-0402", bank_institution:"003", bank_transit:"11111", bank_account:"2222222", status:"active", notes:"Bilingual — English/French", role:"team_lead" },
  { id:"e5", first_name:"Tyler", last_name:"O'Brien", email:"tyler@collideapparel.com", phone:"647-555-0501", sin_encrypted:"***-***-***", date_of_birth:"1999-06-30", address:"10 Dundas St E", city:"Toronto", province:"ON", postal_code:"M5B 2G9", tax_province:"ON", td1_federal_claim:15705, td1_provincial_claim:11865, hourly_rate:18, overtime_rate:27, emergency_contact_name:"Sean O'Brien", emergency_contact_phone:"647-555-0502", bank_institution:"001", bank_transit:"33333", bank_account:"4444444", status:"active", notes:"Available weekends only", role:"sales" },
  { id:"e6", first_name:"Mei", last_name:"Lin", email:"mei@collideapparel.com", phone:"416-555-0601", sin_encrypted:"***-***-***", date_of_birth:"1996-09-18", address:"300 Bloor St W", city:"Toronto", province:"ON", postal_code:"M5S 1W3", tax_province:"ON", td1_federal_claim:15705, td1_provincial_claim:11865, hourly_rate:21, overtime_rate:31.50, emergency_contact_name:"Wei Lin", emergency_contact_phone:"416-555-0602", bank_institution:"002", bank_transit:"55555", bank_account:"6666666", status:"inactive", notes:"On leave until April", role:"sales" },
];

const DEMO_EVENTS = [
  { id:"ev1", name:"Toronto Raptors Game Day Pop-Up", start_date:"2026-04-04", end_date:"2026-04-05", description:"Merchandise pop-up at Scotiabank Arena", status:"upcoming", notes:"" },
  { id:"ev2", name:"Spring Music Fest", start_date:"2026-04-10", end_date:"2026-04-12", description:"Three-day music festival at Downsview Park", status:"upcoming", notes:"3 booth locations" },
  { id:"ev3", name:"Montreal Fashion Week", start_date:"2026-04-10", end_date:"2026-04-12", description:"Fashion Week vendor booth", status:"upcoming", notes:"Same weekend as Spring Music Fest" },
  { id:"ev4", name:"Vancouver Street Fest", start_date:"2026-04-18", end_date:"2026-04-19", description:"Street festival vendor booth", status:"upcoming", notes:"" },
  { id:"ev5", name:"Calgary Stampede Merch", start_date:"2026-07-03", end_date:"2026-07-12", description:"10-day Calgary Stampede merchandise booth", status:"upcoming", notes:"Large event, need extra staff" },
  { id:"evH1", name:"Toronto CNE 2025", start_date:"2025-08-15", end_date:"2025-09-01", description:"Canadian National Exhibition", status:"completed", notes:"" },
  { id:"evH2", name:"Montreal Osheaga 2025", start_date:"2025-08-01", end_date:"2025-08-03", description:"Osheaga Music Festival", status:"completed", notes:"" },
  { id:"evH3", name:"Ottawa Bluesfest 2025", start_date:"2025-07-10", end_date:"2025-07-20", description:"RBC Bluesfest", status:"completed", notes:"" },
  { id:"evH4", name:"Vancouver Celebration of Light 2025", start_date:"2025-07-26", end_date:"2025-08-02", description:"Fireworks festival merch", status:"completed", notes:"" },
];

const DEMO_LOCATIONS = [
  { id:"loc1", event_id:"ev1", name:"Main Entrance Booth", address:"40 Bay St", city:"Toronto", province:"ON" },
  { id:"loc2", event_id:"ev1", name:"Section 100 Kiosk", address:"40 Bay St", city:"Toronto", province:"ON" },
  { id:"loc3", event_id:"ev2", name:"Main Stage Tent", address:"Downsview Park", city:"Toronto", province:"ON" },
  { id:"loc4", event_id:"ev2", name:"Food Court Booth", address:"Downsview Park", city:"Toronto", province:"ON" },
  { id:"loc5", event_id:"ev2", name:"VIP Lounge", address:"Downsview Park", city:"Toronto", province:"ON" },
  { id:"loc6", event_id:"ev3", name:"Palais des congrès Booth", address:"1001 Place Jean-Paul-Riopelle", city:"Montreal", province:"QC" },
  { id:"loc7", event_id:"ev4", name:"Main Booth", address:"Robson Street", city:"Vancouver", province:"BC" },
  { id:"loc8", event_id:"ev5", name:"Stampede Grounds Tent", address:"1410 Olympic Way SE", city:"Calgary", province:"AB" },
  { id:"loc9", event_id:"ev5", name:"Downtown Pop-Up", address:"Stephen Avenue Walk", city:"Calgary", province:"AB" },
  { id:"locH1", event_id:"evH1", name:"CNE Main Gate", address:"Exhibition Place", city:"Toronto", province:"ON" },
  { id:"locH2", event_id:"evH2", name:"Osheaga Main Tent", address:"Parc Jean-Drapeau", city:"Montreal", province:"QC" },
  { id:"locH3", event_id:"evH3", name:"Bluesfest Merch Tent", address:"LeBreton Flats", city:"Ottawa", province:"ON" },
  { id:"locH4", event_id:"evH4", name:"English Bay Booth", address:"English Bay", city:"Vancouver", province:"BC" },
];

const DEMO_SHIFTS = [
  { id:"s1", employee_id:"e1", event_location_id:"loc1", shift_date:"2026-04-04", start_time:"09:00", end_time:"17:00", role:"Team Lead", break_minutes:30, status:"scheduled", actual_start:null, actual_end:null },
  { id:"s2", employee_id:"e2", event_location_id:"loc1", shift_date:"2026-04-04", start_time:"09:00", end_time:"17:00", role:"Sales Associate", break_minutes:30, status:"scheduled", actual_start:null, actual_end:null },
  { id:"s3", employee_id:"e3", event_location_id:"loc2", shift_date:"2026-04-04", start_time:"10:00", end_time:"18:00", role:"Sales Associate", break_minutes:30, status:"scheduled", actual_start:null, actual_end:null },
  { id:"s4", employee_id:"e1", event_location_id:"loc1", shift_date:"2026-04-05", start_time:"09:00", end_time:"17:00", role:"Team Lead", break_minutes:30, status:"scheduled", actual_start:null, actual_end:null },
  { id:"s5", employee_id:"e4", event_location_id:"loc3", shift_date:"2026-04-10", start_time:"08:00", end_time:"18:00", role:"Team Lead", break_minutes:60, status:"scheduled", actual_start:null, actual_end:null },
  { id:"s6", employee_id:"e5", event_location_id:"loc3", shift_date:"2026-04-10", start_time:"08:00", end_time:"18:00", role:"Sales Associate", break_minutes:60, status:"scheduled", actual_start:null, actual_end:null },
  { id:"s7", employee_id:"e3", event_location_id:"loc4", shift_date:"2026-04-10", start_time:"10:00", end_time:"20:00", role:"Sales Associate", break_minutes:60, status:"scheduled", actual_start:null, actual_end:null },
  { id:"s8", employee_id:"e2", event_location_id:"loc6", shift_date:"2026-04-10", start_time:"09:00", end_time:"19:00", role:"Team Lead", break_minutes:60, status:"scheduled", actual_start:null, actual_end:null },
];

const DEMO_AVAILABILITY = {
  e1: { "2026-04-04":"available","2026-04-05":"available","2026-04-10":"available","2026-04-11":"available","2026-04-12":"available","2026-04-18":"unavailable","2026-04-19":"unavailable" },
  e2: { "2026-04-04":"available","2026-04-05":"available","2026-04-10":"available","2026-04-11":"available","2026-04-12":"tentative","2026-04-18":"available","2026-04-19":"available" },
  e3: { "2026-04-04":"available","2026-04-05":"tentative","2026-04-10":"available","2026-04-11":"available","2026-04-12":"available","2026-04-18":"available","2026-04-19":"available" },
  e4: { "2026-04-04":"unavailable","2026-04-05":"unavailable","2026-04-10":"available","2026-04-11":"available","2026-04-12":"available","2026-04-18":"available","2026-04-19":"available" },
  e5: { "2026-04-04":"available","2026-04-05":"available","2026-04-10":"available","2026-04-11":"available","2026-04-12":"unavailable","2026-04-18":"tentative","2026-04-19":"tentative" },
};

const DEMO_PRODUCTS = [
  { id:"p1", name:"Collide Logo Tee (Black)", sku:"CLT-BLK", category:"T-Shirts", cost:8.50, retail:32, sizes:["S","M","L","XL","2XL"], weight_kg:0.2 },
  { id:"p2", name:"Collide Logo Tee (White)", sku:"CLT-WHT", category:"T-Shirts", cost:8.50, retail:32, sizes:["S","M","L","XL","2XL"], weight_kg:0.2 },
  { id:"p3", name:"Collide Hoodie (Black)", sku:"CLH-BLK", category:"Hoodies", cost:18, retail:65, sizes:["S","M","L","XL","2XL"], weight_kg:0.5 },
  { id:"p4", name:"Collide Snapback Cap", sku:"CLC-SNP", category:"Hats", cost:6, retail:35, sizes:["OS"], weight_kg:0.15 },
  { id:"p5", name:"Collide Dad Hat", sku:"CLC-DAD", category:"Hats", cost:5.50, retail:30, sizes:["OS"], weight_kg:0.12 },
  { id:"p6", name:"Collide Tote Bag", sku:"CLB-TOT", category:"Accessories", cost:3, retail:18, sizes:["OS"], weight_kg:0.1 },
  { id:"p7", name:"Collide Socks (3-pack)", sku:"CLS-3PK", category:"Accessories", cost:4, retail:22, sizes:["S/M","L/XL"], weight_kg:0.15 },
  { id:"p8", name:"Collide Crewneck (Grey)", sku:"CLC-GRY", category:"Hoodies", cost:15, retail:55, sizes:["S","M","L","XL"], weight_kg:0.45 },
];

const DEMO_STOCK = { p1:480, p2:350, p3:220, p4:300, p5:250, p6:500, p7:180, p8:160 };

const DEMO_HISTORIC_SALES = [
  { event_id:"evH1", event_name:"Toronto CNE 2025", event_type:"festival", days:18, product_id:"p1", sent:200, sold:168, returned:32, revenue:5376 },
  { event_id:"evH1", event_name:"Toronto CNE 2025", event_type:"festival", days:18, product_id:"p2", sent:150, sold:122, returned:28, revenue:3904 },
  { event_id:"evH1", event_name:"Toronto CNE 2025", event_type:"festival", days:18, product_id:"p3", sent:80, sold:64, returned:16, revenue:4160 },
  { event_id:"evH1", event_name:"Toronto CNE 2025", event_type:"festival", days:18, product_id:"p4", sent:100, sold:89, returned:11, revenue:3115 },
  { event_id:"evH1", event_name:"Toronto CNE 2025", event_type:"festival", days:18, product_id:"p5", sent:80, sold:61, returned:19, revenue:1830 },
  { event_id:"evH1", event_name:"Toronto CNE 2025", event_type:"festival", days:18, product_id:"p6", sent:150, sold:134, returned:16, revenue:2412 },
  { event_id:"evH2", event_name:"Montreal Osheaga 2025", event_type:"festival", days:3, product_id:"p1", sent:120, sold:98, returned:22, revenue:3136 },
  { event_id:"evH2", event_name:"Montreal Osheaga 2025", event_type:"festival", days:3, product_id:"p2", sent:100, sold:78, returned:22, revenue:2496 },
  { event_id:"evH2", event_name:"Montreal Osheaga 2025", event_type:"festival", days:3, product_id:"p3", sent:50, sold:41, returned:9, revenue:2665 },
  { event_id:"evH2", event_name:"Montreal Osheaga 2025", event_type:"festival", days:3, product_id:"p4", sent:60, sold:52, returned:8, revenue:1820 },
  { event_id:"evH2", event_name:"Montreal Osheaga 2025", event_type:"festival", days:3, product_id:"p6", sent:80, sold:71, returned:9, revenue:1278 },
  { event_id:"evH3", event_name:"Ottawa Bluesfest 2025", event_type:"festival", days:11, product_id:"p1", sent:100, sold:72, returned:28, revenue:2304 },
  { event_id:"evH3", event_name:"Ottawa Bluesfest 2025", event_type:"festival", days:11, product_id:"p3", sent:40, sold:28, returned:12, revenue:1820 },
  { event_id:"evH3", event_name:"Ottawa Bluesfest 2025", event_type:"festival", days:11, product_id:"p4", sent:50, sold:38, returned:12, revenue:1330 },
  { event_id:"evH3", event_name:"Ottawa Bluesfest 2025", event_type:"festival", days:11, product_id:"p6", sent:60, sold:49, returned:11, revenue:882 },
  { event_id:"evH4", event_name:"Vancouver CoL 2025", event_type:"festival", days:8, product_id:"p1", sent:80, sold:59, returned:21, revenue:1888 },
  { event_id:"evH4", event_name:"Vancouver CoL 2025", event_type:"festival", days:8, product_id:"p2", sent:60, sold:42, returned:18, revenue:1344 },
  { event_id:"evH4", event_name:"Vancouver CoL 2025", event_type:"festival", days:8, product_id:"p4", sent:40, sold:31, returned:9, revenue:1085 },
  { event_id:"evH4", event_name:"Vancouver CoL 2025", event_type:"festival", days:8, product_id:"p6", sent:50, sold:38, returned:12, revenue:684 },
];

const DEMO_DISTRIBUTIONS = [
  { id:"d1", event_id:"ev1", product_id:"p1", qty_sent:60, qty_sold:0, qty_returned:0, status:"draft" },
  { id:"d2", event_id:"ev1", product_id:"p4", qty_sent:30, qty_sold:0, qty_returned:0, status:"draft" },
  { id:"d3", event_id:"ev1", product_id:"p6", qty_sent:40, qty_sold:0, qty_returned:0, status:"draft" },
];

const DEMO_TEMPLATES = [
  { id:"t1", name:"Standard Day Shift (1 Lead + 2 Sales)", shifts: [
    { role:"Team Lead", start_time:"09:00", end_time:"17:00", break_minutes:30 },
    { role:"Sales Associate", start_time:"09:00", end_time:"17:00", break_minutes:30 },
    { role:"Sales Associate", start_time:"09:00", end_time:"17:00", break_minutes:30 },
  ]},
  { id:"t2", name:"Long Festival Day (1 Lead + 3 Sales, split)", shifts: [
    { role:"Team Lead", start_time:"08:00", end_time:"18:00", break_minutes:60 },
    { role:"Sales Associate", start_time:"08:00", end_time:"15:00", break_minutes:30 },
    { role:"Sales Associate", start_time:"08:00", end_time:"15:00", break_minutes:30 },
    { role:"Sales Associate", start_time:"14:00", end_time:"21:00", break_minutes:30 },
  ]},
  { id:"t3", name:"Weekend Pop-Up (1 Lead + 1 Sales)", shifts: [
    { role:"Team Lead", start_time:"10:00", end_time:"18:00", break_minutes:30 },
    { role:"Sales Associate", start_time:"10:00", end_time:"18:00", break_minutes:30 },
  ]},
];

const DEMO_NOTIFICATIONS = [
  { id:"n1", type:"schedule_published", message:"Schedule published for Toronto Raptors Game Day Pop-Up", date:"2026-03-20", recipients:["Marcus Chen","Priya Sharma","Jordan Williams"], status:"sent" },
  { id:"n2", type:"shift_reminder", message:"Shift reminder: Tomorrow at 09:00 — Main Entrance Booth", date:"2026-04-03", recipients:["Marcus Chen","Priya Sharma"], status:"draft" },
];

const downloadCSV = (rows, filename) => {
  const csv = rows.map(r => r.map(c => `"${String(c||"").replace(/"/g,'""')}"`).join(",")).join("\n");
  const blob = new Blob([csv], { type: "text/csv" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a"); a.href = url; a.download = filename; a.click(); URL.revokeObjectURL(url);
};

// SHARED GLASSMORPHISM COMPONENTS
const Badge = ({ status }) => {
  const colors = {
    active: { bg: "rgba(16, 185, 129, 0.15)", text: "#10b981" },
    inactive: { bg: "rgba(107, 114, 128, 0.15)", text: "#9ca3af" },
    upcoming: { bg: "rgba(59, 130, 246, 0.15)", text: "#3b82f6" },
    completed: { bg: "rgba(16, 185, 129, 0.15)", text: "#10b981" },
    cancelled: { bg: "rgba(239, 68, 68, 0.15)", text: "#ef4444" },
    scheduled: { bg: "rgba(59, 130, 246, 0.15)", text: "#3b82f6" },
    confirmed: { bg: "rgba(16, 185, 129, 0.15)", text: "#10b981" },
    available: { bg: "rgba(16, 185, 129, 0.15)", text: "#10b981" },
    unavailable: { bg: "rgba(239, 68, 68, 0.15)", text: "#ef4444" },
    tentative: { bg: "rgba(245, 158, 11, 0.15)", text: "#f59e0b" },
    draft: { bg: "rgba(107, 114, 128, 0.15)", text: "#9ca3af" },
    sent: { bg: "rgba(99, 102, 241, 0.15)", text: "#6366f1" },
  };
  const color = colors[status] || colors.draft;
  return (
    <span style={{ background: color.bg, color: color.text, padding: "4px 8px", borderRadius: "20px", fontSize: "12px", fontWeight: "500", textTransform: "capitalize" }}>
      {(status || "").replace(/_/g, " ")}
    </span>
  );
};

const Modal = ({ open, onClose, title, children, wide }) => {
  if (!open) return null;
  return (
    <div style={{ position: "fixed", inset: 0, zIndex: 50, display: "flex", alignItems: "flex-start", justifyContent: "center", paddingTop: "32px", background: "rgba(0, 0, 0, 0.6)", overflowY: "auto" }} onClick={onClose}>
      <div style={{ background: BRAND.gradient, borderRadius: "16px", boxShadow: "0 20px 25px -5px rgba(0, 0, 0, 0.5)", width: "100%", maxWidth: wide ? "56rem" : "28rem", maxHeight: "88vh", overflowY: "auto", margin: "16px" }} onClick={e => e.stopPropagation()}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "16px 24px", borderBottom: `1px solid ${BRAND.glass.border}`, position: "sticky", top: 0, background: BRAND.gradient, borderRadius: "16px 16px 0 0", zIndex: 10 }}>
          <h2 style={{ fontSize: "18px", fontWeight: "600", color: BRAND.colors.brightBlue }}>{title}</h2>
          <button onClick={onClose} style={{ padding: "4px", background: "none", border: "none", cursor: "pointer", color: BRAND.colors.lightText }}><X size={20} /></button>
        </div>
        <div style={{ padding: "24px", color: BRAND.colors.lightText }}>{children}</div>
      </div>
    </div>
  );
};

const Input = ({ label, ...props }) => (
  <div style={{ marginBottom: "12px" }}>
    {label && <label style={{ display: "block", fontSize: "12px", fontWeight: "500", color: BRAND.colors.lightText, marginBottom: "4px" }}>{label}</label>}
    <input {...props} style={{ width: "100%", padding: "8px 12px", background: BRAND.glass.background, border: `1px solid ${BRAND.glass.border}`, borderRadius: "8px", fontSize: "14px", color: BRAND.colors.lightText, outline: "none", backdropFilter: BRAND.glass.blur }} />
  </div>
);

const Select = ({ label, options, ...props }) => (
  <div style={{ marginBottom: "12px" }}>
    {label && <label style={{ display: "block", fontSize: "12px", fontWeight: "500", color: BRAND.colors.lightText, marginBottom: "4px" }}>{label}</label>}
    <select {...props} style={{ width: "100%", padding: "8px 12px", background: BRAND.glass.background, border: `1px solid ${BRAND.glass.border}`, borderRadius: "8px", fontSize: "14px", color: BRAND.colors.lightText, outline: "none", backdropFilter: BRAND.glass.blur }}>
      {options.map(o => <option key={typeof o === "string" ? o : o.value} value={typeof o === "string" ? o : o.value} style={{ background: BRAND.colors.navy, color: BRAND.colors.lightText }}>{typeof o === "string" ? o : o.label}</option>)}
    </select>
  </div>
);

const Btn = ({ children, variant = "primary", size = "md", className = "", ...props }) => {
  const sizes = { sm: { padding: "6px 12px", fontSize: "12px" }, md: { padding: "8px 16px", fontSize: "14px" }, lg: { padding: "10px 20px", fontSize: "16px" } };
  const variants = {
    primary: { background: BRAND.colors.brightBlue, color: BRAND.colors.navy },
    secondary: { background: BRAND.glass.background, color: BRAND.colors.lightText, border: `1px solid ${BRAND.glass.border}` },
    danger: { background: "#ef4444", color: BRAND.colors.white },
    ghost: { background: "transparent", color: BRAND.colors.mutedText },
    success: { background: "#10b981", color: BRAND.colors.white },
  };
  const style = {
    display: "inline-flex",
    alignItems: "center",
    justifyContent: "center",
    gap: "8px",
    fontWeight: "500",
    borderRadius: "8px",
    transition: "all 0.2s",
    border: "none",
    cursor: "pointer",
    whiteSpace: "nowrap",
    ...sizes[size],
    ...variants[variant],
  };
  return <button style={style} {...props}>{children}</button>;
};

const EmptyState = ({ icon: Icon, title, desc, action }) => (
  <div style={{ textAlign: "center", padding: "48px 0" }}>
    <div style={{ margin: "0 auto", width: "48px", height: "48px", background: BRAND.glass.background, borderRadius: "12px", display: "flex", alignItems: "center", justifyContent: "center", marginBottom: "16px" }}><Icon size={24} color={BRAND.colors.mutedText} /></div>
    <h3 style={{ fontSize: "14px", fontWeight: "600", color: BRAND.colors.lightText, marginBottom: "4px" }}>{title}</h3>
    <p style={{ fontSize: "14px", color: BRAND.colors.mutedText, marginBottom: "16px" }}>{desc}</p>
    {action}
  </div>
);

const StatCard = ({ label, value, icon: Icon, color }) => (
  <div style={{ background: BRAND.glass.background, borderRadius: "12px", border: `1px solid ${BRAND.glass.border}`, padding: "16px", backdropFilter: BRAND.glass.blur }}>
    <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
      <div style={{ width: "40px", height: "40px", borderRadius: "8px", display: "flex", alignItems: "center", justifyContent: "center", background: color }}><Icon size={20} color={BRAND.colors.white} /></div>
      <div>
        <div style={{ fontSize: "24px", fontWeight: "bold", color: BRAND.colors.brightBlue }}>{value}</div>
        <div style={{ fontSize: "12px", color: BRAND.colors.mutedText }}>{label}</div>
      </div>
    </div>
  </div>
);

const SectionCard = ({ title, subtitle, action, children }) => (
  <div style={{ background: BRAND.glass.background, borderRadius: "12px", border: `1px solid ${BRAND.glass.border}`, overflow: "hidden", backdropFilter: BRAND.glass.blur }}>
    {(title || action) && <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "12px 20px", borderBottom: `1px solid ${BRAND.glass.border}`, background: "rgba(0, 31, 63, 0.4)" }}>
      <div>{title && <h3 style={{ fontWeight: "600", color: BRAND.colors.brightBlue, fontSize: "14px" }}>{title}</h3>}{subtitle && <p style={{ fontSize: "12px", color: BRAND.colors.mutedText }}>{subtitle}</p>}</div>
      {action}
    </div>}
    <div style={{ padding: "20px", color: BRAND.colors.lightText }}>{children}</div>
  </div>
);

// PAGE: DASHBOARD
const DashboardPage = ({ employees, events, locations, shifts, availability, products, stock, historicSales }) => {
  const activeStaff = employees.filter(e => e.status === "active").length;
  const upcomingEvents = events.filter(e => e.status === "upcoming").length;
  const totalShifts = shifts.filter(s => s.status !== "cancelled").length;
  const totalHrs = shifts.filter(s => s.status !== "cancelled").reduce((sum, s) => sum + calcHours(s.start_time, s.end_time, s.break_minutes), 0);
  const totalStockUnits = Object.values(stock).reduce((a, b) => a + b, 0);
  const totalStockValue = products.reduce((sum, p) => sum + (stock[p.id] || 0) * p.cost, 0);

  const weekendMap = {};
  events.filter(e => e.status === "upcoming").forEach(ev => {
    const d = new Date(ev.start_date + "T00:00:00");
    const ws = new Date(d); ws.setDate(d.getDate() - d.getDay());
    const key = ws.toISOString().split("T")[0];
    if (!weekendMap[key]) weekendMap[key] = [];
    weekendMap[key].push(ev);
  });

  const nextEvents = [...events].filter(e => e.status === "upcoming").sort((a,b) => a.start_date.localeCompare(b.start_date)).slice(0, 5);

  const revenueByEvent = {};
  historicSales.forEach(s => { revenueByEvent[s.event_name] = (revenueByEvent[s.event_name] || 0) + s.revenue; });
  const revenueChartData = Object.entries(revenueByEvent).map(([name, rev]) => ({ name: name.replace(/2025/,"").trim(), revenue: rev }));

  const chartTooltip = (props) => {
    if (props.active && props.payload?.length) {
      return (
        <div style={{ background: BRAND.glass.background, border: `1px solid ${BRAND.glass.border}`, padding: "8px 12px", borderRadius: "8px", backdropFilter: BRAND.glass.blur, color: BRAND.colors.lightText, fontSize: "12px" }}>
          {props.payload.map((p, i) => <div key={i}>{p.name}: {typeof p.value === "number" ? currency(p.value) : p.value}</div>)}
        </div>
      );
    }
    return null;
  };

  return (
    <div style={{ display: "grid", gridTemplateColumns: "1fr", gap: "24px" }}>
      <div>
        <h1 style={{ fontSize: "28px", fontWeight: "bold", color: BRAND.colors.brightBlue }}>Dashboard</h1>
        <p style={{ color: BRAND.colors.mutedText, marginTop: "8px" }}>Collide Apparel — Staff & Inventory Manager</p>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(150px, 1fr))", gap: "16px" }}>
        <StatCard label="Active Staff" value={activeStaff} icon={Users} color={`linear-gradient(135deg, ${BRAND.colors.brightBlue}, ${BRAND.colors.blueDark})`} />
        <StatCard label="Upcoming Events" value={upcomingEvents} icon={Calendar} color="linear-gradient(135deg, #10b981, #059669)" />
        <StatCard label="Scheduled Shifts" value={totalShifts} icon={Clock} color="linear-gradient(135deg, #f59e0b, #d97706)" />
        <StatCard label="Total Hours" value={totalHrs.toFixed(0)} icon={Timer} color="linear-gradient(135deg, #8b5cf6, #7c3aed)" />
        <StatCard label="Stock Units" value={totalStockUnits} icon={Package} color="linear-gradient(135deg, #06b6d4, #0891b2)" />
        <StatCard label="Stock Value" value={currency(totalStockValue).replace("$", "")} icon={DollarSign} color="linear-gradient(135deg, #ec4899, #db2777)" />
      </div>

      <SectionCard title="Revenue by Event (2025)" action={<Download size={16} color={BRAND.colors.mutedText} />}>
        <ResponsiveContainer width="100%" height={300}>
          <BarChart data={revenueChartData}>
            <CartesianGrid strokeDasharray="3 3" stroke={BRAND.glass.border} />
            <XAxis dataKey="name" stroke={BRAND.colors.mutedText} />
            <YAxis stroke={BRAND.colors.mutedText} />
            <Tooltip content={chartTooltip} />
            <Bar dataKey="revenue" fill={BRAND.colors.brightBlue} radius={[8, 8, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </SectionCard>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "16px" }}>
        <SectionCard title="Next Events">
          <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
            {nextEvents.length > 0 ? nextEvents.map(e => (
              <div key={e.id} style={{ padding: "12px", background: BRAND.glass.background, borderRadius: "8px", border: `1px solid ${BRAND.glass.border}` }}>
                <div style={{ fontWeight: "500", color: BRAND.colors.brightBlue, fontSize: "13px" }}>{e.name}</div>
                <div style={{ fontSize: "12px", color: BRAND.colors.mutedText, marginTop: "4px" }}>{formatDate(e.start_date)} — {formatDate(e.end_date)}</div>
              </div>
            )) : <EmptyState icon={Calendar} title="No upcoming events" desc="Schedule events to get started" />}
          </div>
        </SectionCard>

        <SectionCard title="Schedule Conflicts">
          <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
            {Object.entries(weekendMap).filter(([,v]) => v.length > 1).length > 0 ? Object.entries(weekendMap).filter(([,v]) => v.length > 1).map(([wk, evts]) => (
              <div key={wk} style={{ padding: "12px", background: "rgba(239, 68, 68, 0.1)", borderRadius: "8px", border: "1px solid rgba(239, 68, 68, 0.3)" }}>
                <div style={{ fontWeight: "500", color: "#fca5a5", fontSize: "13px" }}>Week of {formatDate(wk)}</div>
                {evts.map(e => <div key={e.id} style={{ fontSize: "12px", color: BRAND.colors.mutedText, marginTop: "4px" }}>• {e.name}</div>)}
              </div>
            )) : <div style={{ padding: "12px", color: BRAND.colors.mutedText, fontSize: "13px", textAlign: "center" }}>No conflicts detected</div>}
          </div>
        </SectionCard>
      </div>
    </div>
  );
};

// PAGE: EMPLOYEES
const EmployeesPage = ({ employees, setEmployees, availability, setAvailability, events }) => {
  const [showForm, setShowForm] = useState(false);
  const [editId, setEditId] = useState(null);
  const [showMatrix, setShowMatrix] = useState(false);
  const [formData, setFormData] = useState({ first_name: "", last_name: "", email: "", phone: "", hourly_rate: 18, status: "active" });

  const handleSave = async () => {
    if (editId) {
      const { error } = await supabase.from("employees").update(formData).eq("id", editId);
      if (!error) setEmployees(employees.map(e => e.id === editId ? { ...e, ...formData } : e));
    } else {
      const newEmp = { ...formData, role: "sales", td1_federal_claim: 16452, td1_provincial_claim: 12989, tax_province: "ON" };
      const { data, error } = await supabase.from("employees").insert(newEmp).select().single();
      if (!error && data) setEmployees([...employees, data]);
    }
    setShowForm(false);
    setEditId(null);
    setFormData({ first_name: "", last_name: "", email: "", phone: "", hourly_rate: 18, status: "active" });
  };

  const handleEdit = (e) => {
    setFormData(e);
    setEditId(e.id);
    setShowForm(true);
  };

  const handleDelete = async (id) => {
    const { error } = await supabase.from("employees").delete().eq("id", id);
    if (!error) setEmployees(employees.filter(e => e.id !== id));
  };

  return (
    <div style={{ display: "grid", gridTemplateColumns: "1fr", gap: "24px" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <h1 style={{ fontSize: "28px", fontWeight: "bold", color: BRAND.colors.brightBlue }}>Employees</h1>
        <div style={{ display: "flex", gap: "8px" }}>
          <Btn variant="secondary" onClick={() => setShowMatrix(!showMatrix)}><Filter size={16}/> Availability Matrix</Btn>
          <Btn onClick={() => { setShowForm(true); setEditId(null); setFormData({ first_name: "", last_name: "", email: "", phone: "", hourly_rate: 18, status: "active" }); }}><Plus size={16}/> Add Employee</Btn>
        </div>
      </div>

      {showMatrix ? (
        <SectionCard title="Availability Matrix">
          <div style={{ overflowX: "auto" }}>
            <table style={{ width: "100%", fontSize: "12px", borderCollapse: "collapse" }}>
              <thead>
                <tr style={{ borderBottom: `1px solid ${BRAND.glass.border}` }}>
                  <th style={{ padding: "8px", textAlign: "left", color: BRAND.colors.brightBlue, fontWeight: "600" }}>Employee</th>
                  {events.filter(e => e.status === "upcoming").slice(0, 7).map(e => (
                    <th key={e.id} style={{ padding: "8px", textAlign: "center", color: BRAND.colors.brightBlue, fontWeight: "600", whiteSpace: "nowrap" }}>{e.name.substring(0, 10)}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {employees.map(emp => (
                  <tr key={emp.id} style={{ borderBottom: `1px solid ${BRAND.glass.border}` }}>
                    <td style={{ padding: "8px", color: BRAND.colors.lightText, fontWeight: "500" }}>{emp.first_name} {emp.last_name}</td>
                    {events.filter(e => e.status === "upcoming").slice(0, 7).map(e => {
                      const d = new Date(e.start_date + "T00:00:00");
                      const avail = availability[emp.id]?.[e.start_date];
                      return (
                        <td key={e.id} style={{ padding: "8px", textAlign: "center" }}>
                          <Badge status={avail || "unavailable"} />
                        </td>
                      );
                    })}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </SectionCard>
      ) : (
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(280px, 1fr))", gap: "16px" }}>
          {employees.map(e => (
            <SectionCard key={e.id} title={`${e.first_name} ${e.last_name}`} action={
              <div style={{ display: "flex", gap: "8px" }}>
                <button onClick={() => handleEdit(e)} style={{ background: "none", border: "none", cursor: "pointer", color: BRAND.colors.mutedText }}><Edit2 size={16} /></button>
                <button onClick={() => handleDelete(e.id)} style={{ background: "none", border: "none", cursor: "pointer", color: "#ef4444" }}><Trash2 size={16} /></button>
              </div>
            }>
              <div style={{ fontSize: "12px", color: BRAND.colors.mutedText }}>
                <div>{e.email}</div>
                <div>{e.phone}</div>
                <div style={{ marginTop: "8px", paddingTop: "8px", borderTop: `1px solid ${BRAND.glass.border}` }}>
                  <div style={{ color: BRAND.colors.lightText }}>Rate: {currency(e.hourly_rate)}/hr</div>
                  <Badge status={e.status} />
                </div>
              </div>
            </SectionCard>
          ))}
        </div>
      )}

      <Modal open={showForm} onClose={() => { setShowForm(false); setEditId(null); }} title={editId ? "Edit Employee" : "Add Employee"}>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px" }}>
          <Input label="First Name" value={formData.first_name} onChange={(e) => setFormData({ ...formData, first_name: e.target.value })} />
          <Input label="Last Name" value={formData.last_name} onChange={(e) => setFormData({ ...formData, last_name: e.target.value })} />
          <Input label="Email" type="email" value={formData.email} onChange={(e) => setFormData({ ...formData, email: e.target.value })} />
          <Input label="Phone" value={formData.phone} onChange={(e) => setFormData({ ...formData, phone: e.target.value })} />
          <Input label="Hourly Rate" type="number" value={formData.hourly_rate} onChange={(e) => setFormData({ ...formData, hourly_rate: parseFloat(e.target.value) || 18 })} />
          <Select label="Status" value={formData.status} onChange={(e) => setFormData({ ...formData, status: e.target.value })} options={["active", "inactive", "onboarding"]} />
        </div>
        <div style={{ display: "flex", gap: "8px", marginTop: "20px" }}>
          <Btn onClick={handleSave}>Save</Btn>
          <Btn variant="secondary" onClick={() => setShowForm(false)}>Cancel</Btn>
        </div>
      </Modal>
    </div>
  );
};

// PAGE: EVENTS
const EventsPage = ({ events, setEvents, locations, setLocations, shifts, employees }) => {
  const [showForm, setShowForm] = useState(false);
  const [editId, setEditId] = useState(null);
  const [formData, setFormData] = useState({ name: "", description: "", start_date: "", end_date: "", status: "upcoming" });

  const handleSave = async () => {
    if (editId) {
      const { error } = await supabase.from("events").update(formData).eq("id", editId);
      if (!error) setEvents(events.map(e => e.id === editId ? { ...e, ...formData } : e));
    } else {
      const { data, error } = await supabase.from("events").insert(formData).select().single();
      if (!error && data) setEvents([...events, data]);
    }
    setShowForm(false);
    setEditId(null);
    setFormData({ name: "", description: "", start_date: "", end_date: "", status: "upcoming" });
  };

  const handleEdit = (e) => {
    setFormData(e);
    setEditId(e.id);
    setShowForm(true);
  };

  const handleDelete = async (id) => {
    const { error } = await supabase.from("events").delete().eq("id", id);
    if (!error) setEvents(events.filter(e => e.id !== id));
  };

  return (
    <div style={{ display: "grid", gridTemplateColumns: "1fr", gap: "24px" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <h1 style={{ fontSize: "28px", fontWeight: "bold", color: BRAND.colors.brightBlue }}>Events</h1>
        <Btn onClick={() => { setShowForm(true); setEditId(null); setFormData({ name: "", description: "", start_date: "", end_date: "", status: "upcoming" }); }}><Plus size={16}/> Add Event</Btn>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "16px" }}>
        {["upcoming", "completed"].map(status => (
          <div key={status}>
            <h2 style={{ fontSize: "16px", fontWeight: "600", color: BRAND.colors.brightBlue, marginBottom: "12px", textTransform: "capitalize" }}>{status} Events</h2>
            <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
              {events.filter(e => e.status === status).map(e => (
                <SectionCard key={e.id} action={
                  <div style={{ display: "flex", gap: "8px" }}>
                    <button onClick={() => handleEdit(e)} style={{ background: "none", border: "none", cursor: "pointer", color: BRAND.colors.mutedText }}><Edit2 size={16} /></button>
                    <button onClick={() => handleDelete(e.id)} style={{ background: "none", border: "none", cursor: "pointer", color: "#ef4444" }}><Trash2 size={16} /></button>
                  </div>
                }>
                  <div style={{ color: BRAND.colors.lightText }}>
                    <div style={{ fontWeight: "500", marginBottom: "4px" }}>{e.name}</div>
                    <div style={{ fontSize: "12px", color: BRAND.colors.mutedText }}>
                      {formatDate(e.start_date)} — {formatDate(e.end_date)}
                    </div>
                    <div style={{ fontSize: "12px", color: BRAND.colors.mutedText, marginTop: "4px" }}>{e.description}</div>
                  </div>
                </SectionCard>
              ))}
            </div>
          </div>
        ))}
      </div>

      <Modal open={showForm} onClose={() => { setShowForm(false); setEditId(null); }} title={editId ? "Edit Event" : "Add Event"} wide>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px" }}>
          <Input label="Event Name" value={formData.name} onChange={(e) => setFormData({ ...formData, name: e.target.value })} style={{ gridColumn: "1 / -1" }} />
          <Input label="Description" value={formData.description} onChange={(e) => setFormData({ ...formData, description: e.target.value })} style={{ gridColumn: "1 / -1" }} />
          <Input label="Start Date" type="date" value={formData.start_date} onChange={(e) => setFormData({ ...formData, start_date: e.target.value })} />
          <Input label="End Date" type="date" value={formData.end_date} onChange={(e) => setFormData({ ...formData, end_date: e.target.value })} />
          <Select label="Status" value={formData.status} onChange={(e) => setFormData({ ...formData, status: e.target.value })} options={["upcoming", "completed", "cancelled"]} />
        </div>
        <div style={{ display: "flex", gap: "8px", marginTop: "20px" }}>
          <Btn onClick={handleSave}>Save</Btn>
          <Btn variant="secondary" onClick={() => setShowForm(false)}>Cancel</Btn>
        </div>
      </Modal>
    </div>
  );
};

// PAGE: SCHEDULE
const SchedulePage = ({ employees, events, locations, shifts, setShifts, availability, templates }) => {
  const [selectedEvent, setSelectedEvent] = useState(null);
  const [showShiftForm, setShowShiftForm] = useState(false);
  const [formData, setFormData] = useState({ employee_id: "", template_id: "", start_time: "09:00", end_time: "17:00", date: "", notes: "" });

  const handleAddShift = async () => {
    if (formData.employee_id && formData.date && selectedEvent) {
      // Find a location for this event to satisfy the DB foreign key
      const eventLoc = locations.find(l => l.event_id === selectedEvent);
      if (!eventLoc) { alert("No locations for this event. Add a location first."); return; }
      const newShift = {
        event_location_id: eventLoc.id,
        employee_id: formData.employee_id,
        shift_date: formData.date,
        start_time: formData.start_time,
        end_time: formData.end_time,
        notes: formData.notes,
        status: "scheduled"
      };
      const { data, error } = await supabase.from("shifts").insert(newShift).select().single();
      if (!error && data) setShifts([...shifts, data]);
      setShowShiftForm(false);
      setFormData({ employee_id: "", template_id: "", start_time: "09:00", end_time: "17:00", date: "", notes: "" });
    }
  };

  const handleDeleteShift = async (id) => {
    const { error } = await supabase.from("shifts").delete().eq("id", id);
    if (!error) setShifts(shifts.filter(s => s.id !== id));
  };

  // Map shifts to events via event_locations
  const eventLocationIds = locations.filter(l => l.event_id === selectedEvent).map(l => l.id);
  const eventShifts = selectedEvent ? shifts.filter(s => eventLocationIds.includes(s.event_location_id)) : [];
  const selectedEventData = events.find(e => e.id === selectedEvent);

  return (
    <div style={{ display: "grid", gridTemplateColumns: "1fr", gap: "24px" }}>
      <h1 style={{ fontSize: "28px", fontWeight: "bold", color: BRAND.colors.brightBlue }}>Schedule Management</h1>

      <div style={{ display: "grid", gridTemplateColumns: "250px 1fr", gap: "16px" }}>
        <SectionCard title="Select Event">
          <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
            {events.filter(e => e.status === "upcoming").map(e => (
              <button key={e.id} onClick={() => setSelectedEvent(e.id)} style={{ padding: "10px 12px", borderRadius: "8px", border: "none", cursor: "pointer", background: selectedEvent === e.id ? BRAND.colors.brightBlue : BRAND.glass.background, color: selectedEvent === e.id ? BRAND.colors.navy : BRAND.colors.lightText, fontSize: "13px", fontWeight: "500", transition: "all 0.2s" }}>
                {e.name}
              </button>
            ))}
          </div>
        </SectionCard>

        {selectedEvent && (
          <div style={{ display: "grid", gap: "16px" }}>
            <SectionCard title={selectedEventData?.name || "Shifts"} action={<Btn onClick={() => setShowShiftForm(true)}><Plus size={16}/> Add Shift</Btn>}>
              {eventShifts.length > 0 ? (
                <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(300px, 1fr))", gap: "12px" }}>
                  {eventShifts.map(s => {
                    const emp = employees.find(e => e.id === s.employee_id);
                    return (
                      <div key={s.id} style={{ padding: "12px", background: BRAND.glass.background, borderRadius: "8px", border: `1px solid ${BRAND.glass.border}` }}>
                        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "start", marginBottom: "8px" }}>
                          <div style={{ color: BRAND.colors.lightText, fontWeight: "500" }}>{emp?.first_name} {emp?.last_name}</div>
                          <button onClick={() => handleDeleteShift(s.id)} style={{ background: "none", border: "none", cursor: "pointer", color: "#ef4444" }}><Trash2 size={14} /></button>
                        </div>
                        <div style={{ fontSize: "12px", color: BRAND.colors.mutedText }}>
                          <div>{s.shift_date || s.date}</div>
                          <div>{s.start_time} – {s.end_time}</div>
                          {s.notes && <div style={{ marginTop: "4px", color: BRAND.colors.lightText }}>Note: {s.notes}</div>}
                        </div>
                      </div>
                    );
                  })}
                </div>
              ) : (
                <div style={{ padding: "24px", textAlign: "center", color: BRAND.colors.mutedText }}>No shifts scheduled</div>
              )}
            </SectionCard>

            <Modal open={showShiftForm} onClose={() => setShowShiftForm(false)} title="Add Shift">
              <div style={{ display: "grid", gap: "12px" }}>
                <Select label="Employee" value={formData.employee_id} onChange={(e) => setFormData({ ...formData, employee_id: e.target.value })} options={employees.map(e => ({ label: `${e.first_name} ${e.last_name}`, value: e.id }))} />
                <Input label="Date" type="date" value={formData.date} onChange={(e) => setFormData({ ...formData, date: e.target.value })} />
                <Input label="Start Time" type="time" value={formData.start_time} onChange={(e) => setFormData({ ...formData, start_time: e.target.value })} />
                <Input label="End Time" type="time" value={formData.end_time} onChange={(e) => setFormData({ ...formData, end_time: e.target.value })} />
                <Input label="Notes" value={formData.notes} onChange={(e) => setFormData({ ...formData, notes: e.target.value })} />
              </div>
              <div style={{ display: "flex", gap: "8px", marginTop: "20px" }}>
                <Btn onClick={handleAddShift}>Add</Btn>
                <Btn variant="secondary" onClick={() => setShowShiftForm(false)}>Cancel</Btn>
              </div>
            </Modal>
          </div>
        )}
      </div>
    </div>
  );
};

// PAGE: PAYSHEETS
const PaySheetsPage = ({ employees, events, locations, shifts, role }) => {
  const [dateRange, setDateRange] = useState({ start: "", end: "" });
  const [selectedEmployee, setSelectedEmployee] = useState("");

  const getShiftDuration = (shift) => {
    const [startH, startM] = shift.start_time.split(":").map(Number);
    const [endH, endM] = shift.end_time.split(":").map(Number);
    return ((endH * 60 + endM) - (startH * 60 + startM)) / 60;
  };

  const calculatePayPeriod = (empId, startDate, endDate) => {
    const empShifts = shifts.filter(s => s.employee_id === empId && (s.shift_date || s.date) >= startDate && (s.shift_date || s.date) <= endDate);
    const emp = employees.find(e => e.id === empId);
    const grossPay = empShifts.reduce((sum, s) => sum + (getShiftDuration(s) * (emp?.hourly_rate || 0)), 0);

    const cpp = grossPay * 0.0595;
    const ei = grossPay * 0.0163;
    const fedTax = grossPay * 0.15;
    const provTax = grossPay * 0.0505;

    return {
      grossPay: grossPay.toFixed(2),
      cpp: cpp.toFixed(2),
      ei: ei.toFixed(2),
      fedTax: fedTax.toFixed(2),
      provTax: provTax.toFixed(2),
      netPay: (grossPay - cpp - ei - fedTax - provTax).toFixed(2),
      hours: empShifts.reduce((sum, s) => sum + getShiftDuration(s), 0).toFixed(1)
    };
  };

  const filteredEmployees = selectedEmployee ? employees.filter(e => e.id === selectedEmployee) : employees;

  return (
    <div style={{ display: "grid", gridTemplateColumns: "1fr", gap: "24px" }}>
      <h1 style={{ fontSize: "28px", fontWeight: "bold", color: BRAND.colors.brightBlue }}>Payroll & T4</h1>

      <SectionCard title="Pay Period Filter">
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: "12px", alignItems: "end" }}>
          <Input label="Start Date" type="date" value={dateRange.start} onChange={(e) => setDateRange({ ...dateRange, start: e.target.value })} />
          <Input label="End Date" type="date" value={dateRange.end} onChange={(e) => setDateRange({ ...dateRange, end: e.target.value })} />
          <Select label="Employee" value={selectedEmployee} onChange={(e) => setSelectedEmployee(e.target.value)} options={[{ label: "All Employees", value: "" }, ...employees.map(e => ({ label: `${e.first_name} ${e.last_name}`, value: e.id }))]} />
        </div>
      </SectionCard>

      {dateRange.start && dateRange.end && (
        <div style={{ display: "grid", gap: "16px" }}>
          {filteredEmployees.map(emp => {
            const payData = calculatePayPeriod(emp.id, dateRange.start, dateRange.end);
            return (
              <SectionCard key={emp.id} title={`${emp.first_name} ${emp.last_name}`}>
                <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(150px, 1fr))", gap: "12px" }}>
                  <div style={{ padding: "12px", background: BRAND.glass.background, borderRadius: "8px" }}>
                    <div style={{ fontSize: "11px", color: BRAND.colors.mutedText, marginBottom: "4px" }}>Hours Worked</div>
                    <div style={{ fontSize: "18px", fontWeight: "bold", color: BRAND.colors.brightBlue }}>{payData.hours}</div>
                  </div>
                  <div style={{ padding: "12px", background: BRAND.glass.background, borderRadius: "8px" }}>
                    <div style={{ fontSize: "11px", color: BRAND.colors.mutedText, marginBottom: "4px" }}>Gross Pay</div>
                    <div style={{ fontSize: "18px", fontWeight: "bold", color: BRAND.colors.brightBlue }}>${payData.grossPay}</div>
                  </div>
                  <div style={{ padding: "12px", background: BRAND.glass.background, borderRadius: "8px" }}>
                    <div style={{ fontSize: "11px", color: BRAND.colors.mutedText, marginBottom: "4px" }}>Deductions</div>
                    <div style={{ fontSize: "12px", color: BRAND.colors.mutedText }}>
                      <div>CPP: ${payData.cpp}</div>
                      <div>EI: ${payData.ei}</div>
                      <div>Tax: ${parseFloat(payData.fedTax + payData.provTax).toFixed(2)}</div>
                    </div>
                  </div>
                  <div style={{ padding: "12px", background: `linear-gradient(135deg, rgba(84, 205, 249, 0.2) 0%, rgba(58, 181, 232, 0.1) 100%)`, borderRadius: "8px", border: `1px solid rgba(84, 205, 249, 0.3)` }}>
                    <div style={{ fontSize: "11px", color: BRAND.colors.mutedText, marginBottom: "4px" }}>Net Pay</div>
                    <div style={{ fontSize: "18px", fontWeight: "bold", color: BRAND.colors.brightBlue }}>${payData.netPay}</div>
                  </div>
                </div>
              </SectionCard>
            );
          })}
        </div>
      )}
    </div>
  );
};

// PAGE: INVENTORY
const InventoryPage = ({ products, setProducts, stock, setStock, distributions, setDistributions, historicSales, events, locations }) => {
  const [activeTab, setActiveTab] = useState("products");
  const [showForm, setShowForm] = useState(false);
  const [editId, setEditId] = useState(null);
  const [formData, setFormData] = useState({ sku: "", name: "", description: "", cost: 0, retail: 0 });

  const handleSave = async () => {
    if (editId) {
      const { error } = await supabase.from("products").update(formData).eq("id", editId);
      if (!error) setProducts(products.map(p => p.id === editId ? { ...p, ...formData } : p));
    } else {
      const { data, error } = await supabase.from("products").insert(formData).select().single();
      if (!error && data) setProducts([...products, data]);
    }
    setShowForm(false);
    setEditId(null);
    setFormData({ sku: "", name: "", description: "", cost: 0, retail: 0 });
  };

  const handleEdit = (p) => {
    setFormData(p);
    setEditId(p.id);
    setShowForm(true);
  };

  const handleDelete = async (id) => {
    const { error } = await supabase.from("products").delete().eq("id", id);
    if (!error) setProducts(products.filter(p => p.id !== id));
  };

  const tabs = [
    { id: "products", label: "Products" },
    { id: "stock", label: "Stock & Distribution" },
    { id: "projections", label: "Projections" },
    { id: "analytics", label: "Analytics" }
  ];

  return (
    <div style={{ display: "grid", gridTemplateColumns: "1fr", gap: "24px" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <h1 style={{ fontSize: "28px", fontWeight: "bold", color: BRAND.colors.brightBlue }}>Inventory Management</h1>
        {activeTab === "products" && <Btn onClick={() => { setShowForm(true); setEditId(null); setFormData({ sku: "", name: "", description: "", cost: 0, retail: 0 }); }}><Plus size={16}/> Add Product</Btn>}
      </div>

      <div style={{ display: "flex", gap: "8px", borderBottom: `1px solid ${BRAND.glass.border}`, paddingBottom: "12px" }}>
        {tabs.map(tab => (
          <button key={tab.id} onClick={() => setActiveTab(tab.id)} style={{ padding: "8px 16px", borderRadius: "6px 6px 0 0", border: "none", cursor: "pointer", background: activeTab === tab.id ? BRAND.colors.brightBlue : "transparent", color: activeTab === tab.id ? BRAND.colors.navy : BRAND.colors.mutedText, fontSize: "13px", fontWeight: "500", transition: "all 0.2s" }}>
            {tab.label}
          </button>
        ))}
      </div>

      {activeTab === "products" && (
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(280px, 1fr))", gap: "16px" }}>
          {products.map(p => {
            const margin = (((p.retail - p.cost) / p.retail) * 100).toFixed(0);
            return (
              <SectionCard key={p.id} title={p.name} action={
                <div style={{ display: "flex", gap: "8px" }}>
                  <button onClick={() => handleEdit(p)} style={{ background: "none", border: "none", cursor: "pointer", color: BRAND.colors.mutedText }}><Edit2 size={16} /></button>
                  <button onClick={() => handleDelete(p.id)} style={{ background: "none", border: "none", cursor: "pointer", color: "#ef4444" }}><Trash2 size={16} /></button>
                </div>
              }>
                <div style={{ fontSize: "12px", color: BRAND.colors.mutedText }}>
                  <div>SKU: {p.sku}</div>
                  <div style={{ marginTop: "8px", paddingTop: "8px", borderTop: `1px solid ${BRAND.glass.border}` }}>
                    <div style={{ color: BRAND.colors.lightText }}>Cost: ${p.cost.toFixed(2)}</div>
                    <div style={{ color: BRAND.colors.lightText }}>Retail: ${p.retail.toFixed(2)}</div>
                    <div style={{ color: BRAND.colors.brightBlue, marginTop: "4px" }}>Margin: {margin}%</div>
                  </div>
                </div>
              </SectionCard>
            );
          })}
        </div>
      )}

      {activeTab === "stock" && (
        <SectionCard title="Stock Levels & Distributions">
          <div style={{ overflowX: "auto" }}>
            <table style={{ width: "100%", fontSize: "12px", borderCollapse: "collapse" }}>
              <thead>
                <tr style={{ borderBottom: `1px solid ${BRAND.glass.border}` }}>
                  <th style={{ padding: "8px", textAlign: "left", color: BRAND.colors.brightBlue, fontWeight: "600" }}>Product</th>
                  <th style={{ padding: "8px", textAlign: "center", color: BRAND.colors.brightBlue, fontWeight: "600" }}>On Hand</th>
                  <th style={{ padding: "8px", textAlign: "center", color: BRAND.colors.brightBlue, fontWeight: "600" }}>Distributed</th>
                  <th style={{ padding: "8px", textAlign: "center", color: BRAND.colors.brightBlue, fontWeight: "600" }}>Returned</th>
                </tr>
              </thead>
              <tbody>
                {products.map(p => {
                  const onHand = (typeof stock === "object" && !Array.isArray(stock)) ? (stock[p.id] || 0) : 0;
                  const distrib = distributions.filter(d => d.product_id === p.id).reduce((sum, d) => sum + (d.qty_sent || 0), 0);
                  const returned = distributions.filter(d => d.product_id === p.id).reduce((sum, d) => sum + (d.qty_returned || 0), 0);
                  return (
                    <tr key={p.id} style={{ borderBottom: `1px solid ${BRAND.glass.border}` }}>
                      <td style={{ padding: "8px", color: BRAND.colors.lightText, fontWeight: "500" }}>{p.name}</td>
                      <td style={{ padding: "8px", textAlign: "center", color: BRAND.colors.brightBlue }}>{onHand}</td>
                      <td style={{ padding: "8px", textAlign: "center", color: BRAND.colors.lightText }}>{distrib}</td>
                      <td style={{ padding: "8px", textAlign: "center", color: BRAND.colors.lightText }}>{returned}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </SectionCard>
      )}

      {activeTab === "projections" && (
        <SectionCard title="Inventory Projections">
          <div style={{ padding: "24px", textAlign: "center", color: BRAND.colors.mutedText }}>
            <p>Projections based on historic sell-through rates for upcoming events</p>
            <div style={{ marginTop: "16px", padding: "16px", background: BRAND.glass.background, borderRadius: "8px", fontSize: "13px" }}>
              <div style={{ color: BRAND.colors.lightText }}>No upcoming events scheduled</div>
            </div>
          </div>
        </SectionCard>
      )}

      {activeTab === "analytics" && (
        <SectionCard title="Historic Analytics">
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "16px" }}>
            <div style={{ padding: "16px", background: BRAND.glass.background, borderRadius: "8px" }}>
              <div style={{ fontSize: "13px", color: BRAND.colors.mutedText, marginBottom: "8px" }}>Total Historic Sales</div>
              <div style={{ fontSize: "24px", fontWeight: "bold", color: BRAND.colors.brightBlue }}>${historicSales.reduce((sum, s) => sum + (s.revenue || 0), 0).toFixed(0)}</div>
            </div>
            <div style={{ padding: "16px", background: BRAND.glass.background, borderRadius: "8px" }}>
              <div style={{ fontSize: "13px", color: BRAND.colors.mutedText, marginBottom: "8px" }}>Units Sold</div>
              <div style={{ fontSize: "24px", fontWeight: "bold", color: BRAND.colors.brightBlue }}>{historicSales.reduce((sum, s) => sum + (s.sold || 0), 0)}</div>
            </div>
          </div>
        </SectionCard>
      )}

      <Modal open={showForm} onClose={() => { setShowForm(false); setEditId(null); }} title={editId ? "Edit Product" : "Add Product"}>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px" }}>
          <Input label="SKU" value={formData.sku} onChange={(e) => setFormData({ ...formData, sku: e.target.value })} />
          <Input label="Product Name" value={formData.name} onChange={(e) => setFormData({ ...formData, name: e.target.value })} style={{ gridColumn: "1 / -1" }} />
          <Input label="Description" value={formData.description} onChange={(e) => setFormData({ ...formData, description: e.target.value })} style={{ gridColumn: "1 / -1" }} />
          <Input label="Cost" type="number" value={formData.cost} onChange={(e) => setFormData({ ...formData, cost: parseFloat(e.target.value) || 0 })} />
          <Input label="Retail" type="number" value={formData.retail} onChange={(e) => setFormData({ ...formData, retail: parseFloat(e.target.value) || 0 })} />
        </div>
        <div style={{ display: "flex", gap: "8px", marginTop: "20px" }}>
          <Btn onClick={handleSave}>Save</Btn>
          <Btn variant="secondary" onClick={() => setShowForm(false)}>Cancel</Btn>
        </div>
      </Modal>
    </div>
  );
};

// PAGE: REPORTS
const ReportsPage = ({ employees, events, locations, shifts, historicSales, products }) => {
  const [dateRange, setDateRange] = useState({ start: "", end: "" });

  const getRevenue = () => {
    return historicSales.reduce((sum, s) => sum + (s.revenue || 0), 0);
  };

  const getTotalHours = () => {
    return shifts.filter(s => !dateRange.start || ((s.shift_date || s.date) >= dateRange.start && (s.shift_date || s.date) <= dateRange.end)).reduce((sum, s) => {
      const [startH, startM] = s.start_time.split(":").map(Number);
      const [endH, endM] = s.end_time.split(":").map(Number);
      return sum + ((endH * 60 + endM) - (startH * 60 + startM)) / 60;
    }, 0);
  };

  const getTotalLabourCost = () => {
    let total = 0;
    shifts.forEach(s => {
      if (!dateRange.start || ((s.shift_date || s.date) >= dateRange.start && (s.shift_date || s.date) <= dateRange.end)) {
        const emp = employees.find(e => e.id === s.employee_id);
        const [startH, startM] = s.start_time.split(":").map(Number);
        const [endH, endM] = s.end_time.split(":").map(Number);
        const hours = ((endH * 60 + endM) - (startH * 60 + startM)) / 60;
        total += hours * (emp?.hourly_rate || 0);
      }
    });
    return total;
  };

  const revenue = getRevenue();
  const labourCost = getTotalLabourCost();
  const hours = getTotalHours();

  return (
    <div style={{ display: "grid", gridTemplateColumns: "1fr", gap: "24px" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <h1 style={{ fontSize: "28px", fontWeight: "bold", color: BRAND.colors.brightBlue }}>Analytics & Reports</h1>
      </div>

      <SectionCard title="Date Range Filter">
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px" }}>
          <Input label="Start Date" type="date" value={dateRange.start} onChange={(e) => setDateRange({ ...dateRange, start: e.target.value })} />
          <Input label="End Date" type="date" value={dateRange.end} onChange={(e) => setDateRange({ ...dateRange, end: e.target.value })} />
        </div>
      </SectionCard>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: "16px" }}>
        <div style={{ padding: "16px", background: `linear-gradient(135deg, rgba(84, 205, 249, 0.2) 0%, rgba(58, 181, 232, 0.1) 100%)`, borderRadius: "8px", border: `1px solid rgba(84, 205, 249, 0.3)` }}>
          <div style={{ fontSize: "12px", color: BRAND.colors.mutedText, marginBottom: "8px" }}>Total Revenue</div>
          <div style={{ fontSize: "24px", fontWeight: "bold", color: BRAND.colors.brightBlue }}>${revenue.toFixed(0)}</div>
        </div>
        <div style={{ padding: "16px", background: `linear-gradient(135deg, rgba(84, 205, 249, 0.2) 0%, rgba(58, 181, 232, 0.1) 100%)`, borderRadius: "8px", border: `1px solid rgba(84, 205, 249, 0.3)` }}>
          <div style={{ fontSize: "12px", color: BRAND.colors.mutedText, marginBottom: "8px" }}>Staff Hours</div>
          <div style={{ fontSize: "24px", fontWeight: "bold", color: BRAND.colors.brightBlue }}>{hours.toFixed(1)}</div>
        </div>
        <div style={{ padding: "16px", background: `linear-gradient(135deg, rgba(84, 205, 249, 0.2) 0%, rgba(58, 181, 232, 0.1) 100%)`, borderRadius: "8px", border: `1px solid rgba(84, 205, 249, 0.3)` }}>
          <div style={{ fontSize: "12px", color: BRAND.colors.mutedText, marginBottom: "8px" }}>Labour Cost</div>
          <div style={{ fontSize: "24px", fontWeight: "bold", color: BRAND.colors.brightBlue }}>${labourCost.toFixed(0)}</div>
        </div>
        <div style={{ padding: "16px", background: `linear-gradient(135deg, rgba(84, 205, 249, 0.2) 0%, rgba(58, 181, 232, 0.1) 100%)`, borderRadius: "8px", border: `1px solid rgba(84, 205, 249, 0.3)` }}>
          <div style={{ fontSize: "12px", color: BRAND.colors.mutedText, marginBottom: "8px" }}>Gross Profit</div>
          <div style={{ fontSize: "24px", fontWeight: "bold", color: BRAND.colors.brightBlue }}>${(revenue - labourCost).toFixed(0)}</div>
        </div>
      </div>

      <SectionCard title="Year-over-Year Summary">
        <div style={{ overflowX: "auto" }}>
          <table style={{ width: "100%", fontSize: "12px", borderCollapse: "collapse" }}>
            <thead>
              <tr style={{ borderBottom: `1px solid ${BRAND.glass.border}` }}>
                <th style={{ padding: "8px", textAlign: "left", color: BRAND.colors.brightBlue, fontWeight: "600" }}>Metric</th>
                <th style={{ padding: "8px", textAlign: "right", color: BRAND.colors.brightBlue, fontWeight: "600" }}>Current Period</th>
              </tr>
            </thead>
            <tbody>
              <tr style={{ borderBottom: `1px solid ${BRAND.glass.border}` }}>
                <td style={{ padding: "8px", color: BRAND.colors.lightText }}>Total Events</td>
                <td style={{ padding: "8px", textAlign: "right", color: BRAND.colors.mutedText }}>{events.length}</td>
              </tr>
              <tr style={{ borderBottom: `1px solid ${BRAND.glass.border}` }}>
                <td style={{ padding: "8px", color: BRAND.colors.lightText }}>Active Staff</td>
                <td style={{ padding: "8px", textAlign: "right", color: BRAND.colors.mutedText }}>{employees.filter(e => e.status === "active").length}</td>
              </tr>
              <tr style={{ borderBottom: `1px solid ${BRAND.glass.border}` }}>
                <td style={{ padding: "8px", color: BRAND.colors.lightText }}>Products</td>
                <td style={{ padding: "8px", textAlign: "right", color: BRAND.colors.mutedText }}>{products.length}</td>
              </tr>
              <tr>
                <td style={{ padding: "8px", color: BRAND.colors.lightText }}>Avg. Labour %</td>
                <td style={{ padding: "8px", textAlign: "right", color: BRAND.colors.mutedText }}>{revenue > 0 ? ((labourCost / revenue) * 100).toFixed(1) : 0}%</td>
              </tr>
            </tbody>
          </table>
        </div>
      </SectionCard>
    </div>
  );
};

// PAGE: NOTIFICATIONS
const NotificationsPage = ({ notifications, setNotifications, events, employees, shifts, locations }) => {
  const [showCompose, setShowCompose] = useState(false);
  const [formData, setFormData] = useState({ title: "", message: "", type: "schedule-published", target: "all" });

  const handleSend = async () => {
    if (formData.title && formData.message) {
      const newNotif = {
        type: "general",
        message: `${formData.title}: ${formData.message}`,
        recipients: [formData.target],
        status: "sent",
        sent_at: new Date().toISOString(),
      };
      const { data, error } = await supabase.from("notifications").insert(newNotif).select().single();
      if (!error && data) setNotifications([...notifications, data]);
      setShowCompose(false);
      setFormData({ title: "", message: "", type: "schedule-published", target: "all" });
    }
  };

  const drafts = notifications.filter(n => n.status === "draft");
  const sent = notifications.filter(n => n.status === "published");

  return (
    <div style={{ display: "grid", gridTemplateColumns: "1fr", gap: "24px" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <h1 style={{ fontSize: "28px", fontWeight: "bold", color: BRAND.colors.brightBlue }}>Notifications</h1>
        <Btn onClick={() => setShowCompose(true)}><Plus size={16}/> Compose</Btn>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "16px" }}>
        <SectionCard title={`Drafts (${drafts.length})`}>
          <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
            {drafts.length > 0 ? drafts.map(n => (
              <div key={n.id} style={{ padding: "12px", background: BRAND.glass.background, borderRadius: "8px", border: `1px solid ${BRAND.glass.border}` }}>
                <div style={{ fontWeight: "500", color: BRAND.colors.lightText }}>{n.title}</div>
                <div style={{ fontSize: "12px", color: BRAND.colors.mutedText, marginTop: "4px" }}>{n.message.substring(0, 100)}...</div>
              </div>
            )) : <div style={{ padding: "16px", textAlign: "center", color: BRAND.colors.mutedText }}>No drafts</div>}
          </div>
        </SectionCard>

        <SectionCard title={`Sent (${sent.length})`}>
          <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
            {sent.length > 0 ? sent.slice(0, 5).map(n => (
              <div key={n.id} style={{ padding: "12px", background: BRAND.glass.background, borderRadius: "8px", border: `1px solid ${BRAND.glass.border}` }}>
                <div style={{ fontWeight: "500", color: BRAND.colors.lightText }}>{n.title}</div>
                <div style={{ fontSize: "11px", color: BRAND.colors.mutedText, marginTop: "4px" }}>Sent to {n.sent_to} • {n.created_at}</div>
              </div>
            )) : <div style={{ padding: "16px", textAlign: "center", color: BRAND.colors.mutedText }}>No notifications sent</div>}
          </div>
        </SectionCard>
      </div>

      <Modal open={showCompose} onClose={() => setShowCompose(false)} title="Compose Notification" wide>
        <div style={{ display: "grid", gap: "12px" }}>
          <Input label="Title" value={formData.title} onChange={(e) => setFormData({ ...formData, title: e.target.value })} />
          <Input label="Message" value={formData.message} onChange={(e) => setFormData({ ...formData, message: e.target.value })} style={{ gridColumn: "1 / -1" }} />
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px" }}>
            <Select label="Type" value={formData.type} onChange={(e) => setFormData({ ...formData, type: e.target.value })} options={["schedule-published", "shift-reminder", "general", "urgent"]} />
            <Select label="Send To" value={formData.target} onChange={(e) => setFormData({ ...formData, target: e.target.value })} options={["all", "team_leads", "sales"]} />
          </div>
        </div>
        <div style={{ display: "flex", gap: "8px", marginTop: "20px" }}>
          <Btn onClick={handleSend}>Send</Btn>
          <Btn variant="secondary" onClick={() => setShowCompose(false)}>Cancel</Btn>
        </div>
      </Modal>
    </div>
  );
};

const LoginPage = ({ onLogin }) => {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleLogin = async () => {
    setError("");
    setLoading(true);
    try {
      const { data, error: authError } = await supabase.auth.signInWithPassword({ email, password });
      if (authError) { setError(authError.message); setLoading(false); return; }
      // Fetch employee profile for role info
      const { data: empData } = await supabase.from("employees").select("*").eq("auth_user_id", data.user.id).single();
      const userObj = {
        email: data.user.email,
        role: empData?.role || "admin",
        employee_id: empData?.id || null,
        name: empData ? `${empData.first_name} ${empData.last_name}` : data.user.email.split("@")[0],
      };
      onLogin(userObj);
    } catch (err) {
      setError("Login failed. Please try again.");
    }
    setLoading(false);
  };

  return (
    <div style={{ minHeight: "100vh", background: BRAND.gradient, display: "flex", alignItems: "center", justifyContent: "center", padding: "16px" }}>
      <div style={{ width: "100%", maxWidth: "400px", background: BRAND.glass.background, borderRadius: "16px", border: `1px solid ${BRAND.glass.border}`, padding: "32px", backdropFilter: BRAND.glass.blur }}>
        <h1 style={{ fontSize: "28px", fontWeight: "bold", color: BRAND.colors.brightBlue, marginBottom: "8px", textAlign: "center" }}>Collide Apparel</h1>
        <p style={{ color: BRAND.colors.mutedText, marginBottom: "24px", textAlign: "center", fontSize: "14px" }}>Staff & Inventory Manager</p>

        {error && <div style={{ padding: "8px 12px", marginBottom: "16px", background: "rgba(239,68,68,0.15)", border: "1px solid rgba(239,68,68,0.3)", borderRadius: "8px", color: "#fca5a5", fontSize: "13px" }}>{error}</div>}

        <div style={{ marginBottom: "12px" }}>
          <Input label="Email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="you@collideapparel.com" />
        </div>
        <div style={{ marginBottom: "24px" }}>
          <Input label="Password" type="password" value={password} onChange={(e) => setPassword(e.target.value)} placeholder="••••••••" onKeyDown={(e) => e.key === "Enter" && handleLogin()} />
        </div>

        <Btn onClick={handleLogin} style={{ width: "100%", marginBottom: "12px", opacity: loading ? 0.6 : 1 }}>{loading ? "Signing in..." : "Sign In"}</Btn>
      </div>
    </div>
  );
};

const EmployeePortal = ({ currentUser, employee, employees, events, locations, shifts, setShifts, availability, setAvailability, products, distributions, setDistributions, stock, setStock }) => (
  <div>
    <h1 style={{ fontSize: "28px", fontWeight: "bold", color: BRAND.colors.brightBlue, marginBottom: "16px" }}>My Dashboard</h1>
    <p style={{ color: BRAND.colors.mutedText }}>{employee ? `Welcome, ${employee.first_name}` : "Employee Portal"}</p>
  </div>
);

// MAIN APP
// ── Command Palette (Cmd+K) ─────────────────────────────
const CommandPalette = ({ open, onClose, navItems, onNavigate }) => {
  const [query, setQuery] = useState("");
  const inputRef = useRef(null);

  useEffect(() => { if (open && inputRef.current) inputRef.current.focus(); }, [open]);
  useEffect(() => { if (!open) setQuery(""); }, [open]);

  const actions = [
    ...navItems.map(n => ({ id: n.id, label: n.label, icon: n.icon, type: "page" })),
    { id: "add-employee", label: "Add Employee", icon: Plus, type: "action" },
    { id: "add-event", label: "Add Event", icon: Plus, type: "action" },
    { id: "export-csv", label: "Export CSV", icon: Download, type: "action" },
    { id: "print", label: "Print Current View", icon: Printer, type: "action" },
  ];

  const filtered = query ? actions.filter(a => a.label.toLowerCase().includes(query.toLowerCase())) : actions;

  if (!open) return null;
  return (
    <div style={{ position: "fixed", inset: 0, zIndex: 100, display: "flex", alignItems: "flex-start", justifyContent: "center", paddingTop: "20vh", background: "rgba(0,0,0,0.5)", backdropFilter: "blur(4px)" }} onClick={onClose}>
      <div style={{ width: 520, background: "rgba(0,20,40,0.95)", border: `1px solid ${BRAND.glass.border}`, borderRadius: 16, overflow: "hidden", backdropFilter: "blur(20px)", boxShadow: `0 24px 48px rgba(0,0,0,0.4), 0 0 0 1px ${BRAND.glass.border}` }} onClick={e => e.stopPropagation()}>
        <div style={{ display: "flex", alignItems: "center", gap: 12, padding: "16px 20px", borderBottom: `1px solid ${BRAND.glass.border}` }}>
          <Search size={18} style={{ color: BRAND.colors.mutedText, flexShrink: 0 }} />
          <input ref={inputRef} value={query} onChange={e => setQuery(e.target.value)} placeholder="Search pages, actions..." style={{ flex: 1, background: "transparent", border: "none", outline: "none", color: BRAND.colors.lightText, fontSize: 15 }} />
          <kbd style={{ padding: "2px 8px", borderRadius: 6, background: BRAND.glass.background, border: `1px solid ${BRAND.glass.border}`, color: BRAND.colors.mutedText, fontSize: 11 }}>ESC</kbd>
        </div>
        <div style={{ maxHeight: 320, overflowY: "auto", padding: "8px" }}>
          {filtered.length === 0 && <div style={{ padding: "24px 16px", textAlign: "center", color: BRAND.colors.mutedText, fontSize: 13 }}>No results found</div>}
          {filtered.map(a => (
            <button key={a.id} onClick={() => { if (a.type === "page") onNavigate(a.id); onClose(); }} style={{ width: "100%", display: "flex", alignItems: "center", gap: 12, padding: "10px 14px", borderRadius: 10, border: "none", background: "transparent", color: BRAND.colors.lightText, fontSize: 13, cursor: "pointer", transition: "all 0.15s" }}
              onMouseOver={e => { e.currentTarget.style.background = BRAND.glass.background; }}
              onMouseOut={e => { e.currentTarget.style.background = "transparent"; }}
            >
              <a.icon size={16} style={{ color: BRAND.colors.brightBlue }} />
              <span style={{ flex: 1, textAlign: "left" }}>{a.label}</span>
              <span style={{ fontSize: 10, color: BRAND.colors.mutedText, textTransform: "uppercase", letterSpacing: 1 }}>{a.type}</span>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
};

export default function App() {
  const [currentUser, setCurrentUser] = useState(null);
  const [appLoading, setAppLoading] = useState(true);
  const [page, setPage] = useState("dashboard");
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [cmdkOpen, setCmdkOpen] = useState(false);
  const [hoveredNav, setHoveredNav] = useState(null);
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

  const isAdmin = currentUser?.role === "admin";
  const myEmployee = employees.find(e => e.id === currentUser?.employee_id);

  // Load all data from Supabase
  const loadData = useCallback(async () => {
    try {
      const [empRes, evtRes, locRes, shiftRes, availRes, prodRes, stockRes, distRes, histRes, templRes, notRes] = await Promise.all([
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
    } catch (err) {
      console.error("Error loading data:", err);
    }
  }, []);

  // Check for existing session on mount
  useEffect(() => {
    const init = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (session) {
        const { data: empData } = await supabase.from("employees").select("*").eq("auth_user_id", session.user.id).single();
        setCurrentUser({
          email: session.user.email,
          role: empData?.role || "admin",
          employee_id: empData?.id || null,
          name: empData ? `${empData.first_name} ${empData.last_name}` : session.user.email.split("@")[0],
        });
        await loadData();
      }
      setAppLoading(false);
    };
    init();
    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (_event, session) => {
      if (!session) { setCurrentUser(null); }
    });
    return () => subscription?.unsubscribe();
  }, [loadData]);

  // When user logs in, load data
  const handleLogin = async (userObj) => {
    setCurrentUser(userObj);
    await loadData();
  };

  // Cmd+K keyboard shortcut
  useEffect(() => {
    const handler = (e) => { if ((e.metaKey || e.ctrlKey) && e.key === "k") { e.preventDefault(); setCmdkOpen(o => !o); } if (e.key === "Escape") setCmdkOpen(false); };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, []);

  if (appLoading) {
    return (
      <div style={{ minHeight: "100vh", background: BRAND.gradient, display: "flex", alignItems: "center", justifyContent: "center" }}>
        <div style={{ textAlign: "center" }}>
          <div style={{ width: 48, height: 48, borderRadius: 12, background: "linear-gradient(135deg, #54CDF9 0%, #3ab5e8 100%)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 20, fontWeight: 900, color: BRAND.colors.navy, margin: "0 auto 16px" }}>C</div>
          <div style={{ fontSize: "14px", color: BRAND.colors.mutedText }}>Loading...</div>
        </div>
      </div>
    );
  }

  if (!currentUser) {
    return <LoginPage onLogin={handleLogin} />;
  }

  const handleLogout = async () => {
    await supabase.auth.signOut();
    setCurrentUser(null);
  };

  const navItems = [
    { id: "dashboard", label: "Dashboard", icon: Home },
    { id: "employees", label: "Employees", icon: Users },
    { id: "events", label: "Events", icon: Calendar },
    { id: "schedule", label: "Schedule", icon: Clock },
    { id: "paysheets", label: "Payroll", icon: DollarSign },
    { id: "inventory", label: "Inventory", icon: Package },
    { id: "reports", label: "Reports", icon: BarChart3 },
    { id: "notifications", label: "Notifications", icon: Bell },
  ];

  const visibleNav = isAdmin ? navItems : navItems.filter(n => ["dashboard", "notifications"].includes(n.id));
  const unsentNotifs = notifications.filter(n => n.status === "draft").length;
  const sidebarWidth = sidebarCollapsed ? 72 : 240;

  return (
    <div style={{ display: "flex", height: "100vh", background: BRAND.gradient, fontFamily: "-apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif", position: "relative", overflow: "hidden" }}>
      {/* Ambient glow orbs */}
      <div style={{ position: "absolute", top: -120, right: -120, width: 450, height: 450, background: "radial-gradient(circle, rgba(84,205,249,0.12) 0%, transparent 70%)", pointerEvents: "none" }} />
      <div style={{ position: "absolute", bottom: -180, left: "25%", width: 550, height: 550, background: "radial-gradient(circle, rgba(84,205,249,0.06) 0%, transparent 70%)", pointerEvents: "none" }} />

      {/* ── Collapsible Sidebar (Layout A) ── */}
      <aside style={{
        width: sidebarWidth, flexShrink: 0, display: "flex", flexDirection: "column", overflow: "hidden",
        background: "rgba(0,15,30,0.6)", borderRight: `1px solid ${BRAND.glass.border}`,
        backdropFilter: "blur(20px)", WebkitBackdropFilter: "blur(20px)",
        transition: "width 0.3s cubic-bezier(0.4, 0, 0.2, 1)", zIndex: 10,
      }}>
        {/* Logo */}
        <div style={{ padding: sidebarCollapsed ? "20px 16px" : "20px 24px", borderBottom: `1px solid ${BRAND.glass.border}`, display: "flex", alignItems: "center", gap: 12, minHeight: 64 }}>
          <div style={{ width: 36, height: 36, borderRadius: 10, background: "linear-gradient(135deg, #54CDF9 0%, #3ab5e8 100%)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 16, fontWeight: 900, color: BRAND.colors.navy, flexShrink: 0 }}>C</div>
          {!sidebarCollapsed && (
            <div style={{ overflow: "hidden", whiteSpace: "nowrap" }}>
              <div style={{ fontSize: 15, fontWeight: 700, color: BRAND.colors.white, letterSpacing: 1 }}>COLLIDE</div>
              <div style={{ fontSize: 10, color: BRAND.colors.brightBlue, letterSpacing: 2, textTransform: "uppercase" }}>Staff Manager</div>
            </div>
          )}
        </div>

        {/* Nav items */}
        <nav style={{ flex: 1, padding: "12px 8px", display: "flex", flexDirection: "column", gap: 2, overflowY: "auto" }}>
          {visibleNav.map(item => {
            const isActive = page === item.id;
            const isHovered = hoveredNav === item.id;
            return (
              <button key={item.id}
                onClick={() => setPage(item.id)}
                onMouseOver={() => setHoveredNav(item.id)}
                onMouseOut={() => setHoveredNav(null)}
                style={{
                  width: "100%", display: "flex", alignItems: "center", gap: 12,
                  padding: sidebarCollapsed ? "12px 0" : "12px 16px",
                  justifyContent: sidebarCollapsed ? "center" : "flex-start",
                  borderRadius: 12, border: "none", cursor: "pointer", position: "relative",
                  background: isActive ? "rgba(84,205,249,0.12)" : isHovered ? "rgba(255,255,255,0.04)" : "transparent",
                  transition: "all 0.2s ease",
                }}>
                {isActive && <div style={{ position: "absolute", left: 0, top: "50%", transform: "translateY(-50%)", width: 3, height: 20, borderRadius: 4, background: BRAND.colors.brightBlue }} />}
                <item.icon size={18} style={{ color: isActive ? BRAND.colors.brightBlue : BRAND.colors.mutedText, flexShrink: 0, transition: "color 0.2s" }} />
                {!sidebarCollapsed && (
                  <span style={{ fontSize: 13, fontWeight: isActive ? 600 : 400, color: isActive ? BRAND.colors.white : BRAND.colors.mutedText, whiteSpace: "nowrap", transition: "color 0.2s", flex: 1, textAlign: "left" }}>
                    {item.label}
                  </span>
                )}
                {!sidebarCollapsed && item.id === "notifications" && unsentNotifs > 0 && (
                  <span style={{ background: "#ef4444", color: BRAND.colors.white, fontSize: 10, fontWeight: 700, borderRadius: "50%", width: 18, height: 18, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>{unsentNotifs}</span>
                )}
              </button>
            );
          })}
        </nav>

        {/* Bottom: User + Collapse */}
        <div style={{ borderTop: `1px solid ${BRAND.glass.border}`, padding: "12px 8px" }}>
          {!sidebarCollapsed && (
            <div style={{ display: "flex", alignItems: "center", gap: 10, padding: "8px 10px", marginBottom: 8, borderRadius: 10, background: "rgba(255,255,255,0.04)" }}>
              <div style={{ width: 32, height: 32, borderRadius: "50%", background: "linear-gradient(135deg, #54CDF9, #3ab5e8)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 12, fontWeight: 700, color: BRAND.colors.navy, flexShrink: 0 }}>
                {currentUser.name.split(" ").map(n => n[0]).join("")}
              </div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: 12, fontWeight: 600, color: BRAND.colors.white, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{currentUser.name}</div>
                <div style={{ fontSize: 10, color: BRAND.colors.mutedText }}>{currentUser.role === "admin" ? "Admin" : "Staff"}</div>
              </div>
            </div>
          )}
          <button onClick={handleLogout} style={{ width: "100%", display: "flex", alignItems: "center", justifyContent: sidebarCollapsed ? "center" : "flex-start", gap: 10, padding: "8px 12px", borderRadius: 8, border: "none", background: "transparent", color: BRAND.colors.mutedText, fontSize: 12, cursor: "pointer", transition: "all 0.2s" }}
            onMouseOver={e => { e.currentTarget.style.background = "rgba(255,255,255,0.04)"; }}
            onMouseOut={e => { e.currentTarget.style.background = "transparent"; }}
          >
            <LogOut size={15} />{!sidebarCollapsed && "Sign Out"}
          </button>
          <button onClick={() => setSidebarCollapsed(c => !c)} style={{ width: "100%", display: "flex", alignItems: "center", justifyContent: "center", gap: 8, padding: "8px", marginTop: 4, borderRadius: 8, border: "none", background: "rgba(255,255,255,0.04)", color: BRAND.colors.mutedText, fontSize: 12, cursor: "pointer", transition: "all 0.2s" }}
            onMouseOver={e => { e.currentTarget.style.background = "rgba(255,255,255,0.08)"; }}
            onMouseOut={e => { e.currentTarget.style.background = "rgba(255,255,255,0.04)"; }}
          >
            {sidebarCollapsed ? "→" : "← Collapse"}
          </button>
        </div>
      </aside>

      {/* ── Main Content Area ── */}
      <div style={{ flex: 1, display: "flex", flexDirection: "column", overflow: "hidden", position: "relative", zIndex: 5 }}>
        {/* ── Top Bar (Layout C search bar) ── */}
        <div style={{
          display: "flex", alignItems: "center", justifyContent: "space-between", gap: 16,
          padding: "0 32px", height: 56, flexShrink: 0,
          background: "rgba(0,15,30,0.4)", borderBottom: `1px solid ${BRAND.glass.border}`,
          backdropFilter: "blur(16px)", WebkitBackdropFilter: "blur(16px)",
        }}>
          {/* Page title */}
          <div style={{ fontSize: 14, fontWeight: 600, color: BRAND.colors.white, textTransform: "capitalize" }}>
            {page === "paysheets" ? "Payroll" : page}
          </div>

          {/* Search bar */}
          <button onClick={() => setCmdkOpen(true)} style={{
            display: "flex", alignItems: "center", gap: 10, padding: "8px 16px", width: 300,
            background: "rgba(255,255,255,0.06)", border: `1px solid ${BRAND.glass.border}`, borderRadius: 10,
            cursor: "pointer", transition: "all 0.2s",
          }}
            onMouseOver={e => { e.currentTarget.style.background = "rgba(255,255,255,0.1)"; }}
            onMouseOut={e => { e.currentTarget.style.background = "rgba(255,255,255,0.06)"; }}
          >
            <Search size={14} style={{ color: BRAND.colors.mutedText }} />
            <span style={{ flex: 1, textAlign: "left", color: BRAND.colors.mutedText, fontSize: 12 }}>Search...</span>
            <kbd style={{ padding: "2px 6px", borderRadius: 5, background: "rgba(255,255,255,0.06)", border: `1px solid ${BRAND.glass.border}`, color: BRAND.colors.mutedText, fontSize: 10 }}>⌘K</kbd>
          </button>

          {/* Right side: notification bell + user avatar */}
          <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
            <button onClick={() => setPage("notifications")} style={{ position: "relative", background: "none", border: "none", cursor: "pointer", padding: 4 }}>
              <Bell size={18} style={{ color: BRAND.colors.mutedText }} />
              {unsentNotifs > 0 && <div style={{ position: "absolute", top: 0, right: 0, width: 8, height: 8, borderRadius: "50%", background: "#ef4444", border: `2px solid ${BRAND.colors.navy}` }} />}
            </button>
            <div style={{ width: 30, height: 30, borderRadius: "50%", background: "linear-gradient(135deg, #54CDF9, #3ab5e8)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 11, fontWeight: 700, color: BRAND.colors.navy }}>
              {currentUser.name.split(" ").map(n => n[0]).join("")}
            </div>
          </div>
        </div>

        {/* ── Page Content ── */}
        <main style={{ flex: 1, padding: 32, overflowY: "auto" }}>
          {isAdmin ? (
            <>
              {page === "dashboard" && <DashboardPage employees={employees} events={events} locations={locations} shifts={shifts} availability={availability} products={products} stock={stock} historicSales={historicSales} />}
              {page === "employees" && <EmployeesPage employees={employees} setEmployees={setEmployees} availability={availability} setAvailability={setAvailability} events={events} />}
              {page === "events" && <EventsPage events={events} setEvents={setEvents} locations={locations} setLocations={setLocations} shifts={shifts} employees={employees} />}
              {page === "schedule" && <SchedulePage employees={employees} events={events} locations={locations} shifts={shifts} setShifts={setShifts} availability={availability} templates={templates} />}
              {page === "paysheets" && <PaySheetsPage employees={employees} events={events} locations={locations} shifts={shifts} role="admin" />}
              {page === "inventory" && <InventoryPage products={products} setProducts={setProducts} stock={stock} setStock={setStock} distributions={distributions} setDistributions={setDistributions} historicSales={historicSales} events={events} locations={locations} />}
              {page === "reports" && <ReportsPage employees={employees} events={events} locations={locations} shifts={shifts} historicSales={historicSales} products={products} />}
              {page === "notifications" && <NotificationsPage notifications={notifications} setNotifications={setNotifications} events={events} employees={employees} shifts={shifts} locations={locations} />}
            </>
          ) : (
            <EmployeePortal currentUser={currentUser} employee={myEmployee} employees={employees} events={events} locations={locations} shifts={shifts} setShifts={setShifts} availability={availability} setAvailability={setAvailability} products={products} distributions={distributions} setDistributions={setDistributions} stock={stock} setStock={setStock} />
          )}
        </main>
      </div>

      {/* ── Command Palette ── */}
      <CommandPalette open={cmdkOpen} onClose={() => setCmdkOpen(false)} navItems={visibleNav} onNavigate={setPage} />

      <style>{`html, body { margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif; background: ${BRAND.gradient}; color: ${BRAND.colors.lightText}; } ::-webkit-scrollbar { width: 6px; height: 6px; } ::-webkit-scrollbar-track { background: transparent; } ::-webkit-scrollbar-thumb { background: rgba(255,255,255,0.15); border-radius: 3px; } ::-webkit-scrollbar-thumb:hover { background: rgba(255,255,255,0.25); } @keyframes fadeIn { from { opacity: 0; transform: translateY(8px); } to { opacity: 1; transform: translateY(0); } }`}</style>
    </div>
  );
}
