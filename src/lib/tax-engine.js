import { TAX_CONFIG_2026 } from '../constants/tax';

// ── CRA 2026 Tax Engine (T4127 122nd Edition) ──
export const CRATax = {
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

  // Convenience wrapper for quick total deductions calculation
  calculateTotalDeductions: (income, province = "ON") => {
    const cpp = Math.min(Math.max(0, (Math.min(income, TAX_CONFIG_2026.cpp.ympe) - TAX_CONFIG_2026.cpp.basicExemption)) * TAX_CONFIG_2026.cpp.rate, TAX_CONFIG_2026.cpp.maxContribution);
    const ei = Math.min(income, TAX_CONFIG_2026.ei.maxInsurableEarnings) * TAX_CONFIG_2026.ei.rate;
    const federal = CRATax.calcFederalTax(income, TAX_CONFIG_2026.federal.bpa, 1);
    const provincial = CRATax.calcOntarioTax(income, TAX_CONFIG_2026.ontario.bpa, 1);
    return { federal, provincial, cpp, ei, total: federal + provincial + cpp + ei, net: income - (federal + provincial + cpp + ei) };
  },
};
