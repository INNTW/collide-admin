// ============================================================
// CRA 2026 TAX ENGINE — Ontario
// Source: CRA T4127 122nd Edition, T4032-ON Jan 2026
// ============================================================

export const TAX_CONFIG_2026 = {
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
