import React, { useState, useMemo } from 'react';
import { DollarSign, Briefcase, TrendingUp, FileText, Download, Clock } from 'lucide-react';
import { Select, Input, Btn, EmptyState, StatCard, SectionCard, Modal } from '../components';
import { BRAND } from '../constants/brand';
import { formatDate, formatTime, currency } from '../utils/formatters';
import { CRATax } from '../lib/tax-engine';
import { exportCSV as exportCSVUtil } from '../utils/csv-export';

// ── Helpers ──

/** Parse "HH:MM" to fractional hours */
function parseTime(timeStr) {
  if (!timeStr) return 0;
  const [h, m] = timeStr.split(':').map(Number);
  return h + (m || 0) / 60;
}

/** Calculate hours between start and end times (handles overnight) */
function calcHours(startTime, endTime) {
  const start = parseTime(startTime);
  const end = parseTime(endTime);
  if (end <= start) return 24 - start + end; // overnight
  return end - start;
}

/** Return the last day of a given month (1-indexed) */
function lastDayOfMonth(year, month) {
  return new Date(year, month, 0).getDate();
}

/** Export payroll data array as CSV and trigger download */
function exportPayrollCSV(payPeriods, employees) {
  const data = payPeriods.map((pp) => {
    const emp = employees.find((e) => e.id === pp.employeeId);
    return {
      name: emp ? `${emp.first_name} ${emp.last_name}` : 'Unknown',
      period: pp.label,
      hours: pp.hours.toFixed(2),
      gross_pay: pp.calc.grossPay.toFixed(2),
      cpp: pp.calc.cpp.toFixed(2),
      ei: pp.calc.ei.toFixed(2),
      federal_tax: pp.calc.federalTax.toFixed(2),
      provincial_tax: pp.calc.provincialTax.toFixed(2),
      net_pay: pp.calc.netPay.toFixed(2),
    };
  });
  exportCSVUtil(
    data,
    [
      { key: 'name', label: 'Employee Name' },
      { key: 'period', label: 'Period' },
      { key: 'hours', label: 'Hours' },
      { key: 'gross_pay', label: 'Gross Pay' },
      { key: 'cpp', label: 'CPP' },
      { key: 'ei', label: 'EI' },
      { key: 'federal_tax', label: 'Federal Tax' },
      { key: 'provincial_tax', label: 'Provincial Tax' },
      { key: 'net_pay', label: 'Net Pay' },
    ],
    'payroll'
  );
}

// ── Component ──

const PayrollPage = ({ employees = [], events = [], locations = [], shifts = [] }) => {
  const [selectedEmployee, setSelectedEmployee] = useState('all');
  const [selectedPeriod, setSelectedPeriod] = useState(
    new Date().toISOString().slice(0, 7) // "YYYY-MM"
  );
  const [expandedStub, setExpandedStub] = useState(null);
  const [t4Modal, setT4Modal] = useState(null); // holds T4 data or null
  const [t4Employee, setT4Employee] = useState(employees[0]?.id || '');

  // ── Compute payroll from shifts ──
  const { payPeriodRecords, allCalcsByEmployee } = useMemo(() => {
    const [yearStr, monthStr] = selectedPeriod.split('-');
    const year = parseInt(yearStr, 10);
    const month = parseInt(monthStr, 10);
    if (!year || !month) return { payPeriodRecords: [], allCalcsByEmployee: {} };

    const midMonth = 15;
    const endMonth = lastDayOfMonth(year, month);

    // Filter shifts for selected month
    const monthShifts = shifts.filter((s) => {
      if (!s.shift_date) return false;
      return s.shift_date.startsWith(selectedPeriod);
    });

    // Group shifts by employee
    const byEmployee = {};
    for (const s of monthShifts) {
      const empId = s.employee_id;
      if (!empId) continue;
      if (!byEmployee[empId]) byEmployee[empId] = [];
      byEmployee[empId].push(s);
    }

    const records = [];
    const allCalcs = {}; // employeeId -> array of calcPayPeriod results (for T4)

    for (const emp of employees) {
      const empShifts = byEmployee[emp.id] || [];
      if (empShifts.length === 0) continue;

      // Split into two biweekly periods
      const firstHalf = empShifts.filter((s) => {
        const day = parseInt(s.shift_date.split('-')[2], 10);
        return day <= midMonth;
      });
      const secondHalf = empShifts.filter((s) => {
        const day = parseInt(s.shift_date.split('-')[2], 10);
        return day > midMonth;
      });

      // YTD accumulator — for simplicity, start fresh per month view
      // In production you'd load prior months' totals from DB
      const ytd = {
        pensionableEarnings: 0,
        cpp: 0,
        cpp2: 0,
        insurableEarnings: 0,
        ei: 0,
      };

      if (!allCalcs[emp.id]) allCalcs[emp.id] = [];

      const periods = [
        { shifts: firstHalf, label: `${selectedPeriod}-01 to ${selectedPeriod}-${midMonth}` },
        { shifts: secondHalf, label: `${selectedPeriod}-${midMonth + 1} to ${selectedPeriod}-${endMonth}` },
      ];

      for (const period of periods) {
        if (period.shifts.length === 0) continue;

        let totalHours = 0;
        for (const s of period.shifts) {
          totalHours += calcHours(s.start_time, s.end_time);
        }

        const hourlyRate = parseFloat(emp.hourly_rate || 0);
        const grossPay = totalHours * hourlyRate;
        if (grossPay <= 0) continue;

        // 24 pay periods/year (biweekly within month = 2/month * 12 = 24)
        const calc = CRATax.calcPayPeriod(grossPay, emp, ytd, 24);

        // Update YTD accumulator
        ytd.pensionableEarnings += grossPay;
        ytd.cpp += calc.cpp;
        ytd.cpp2 += calc.cpp2;
        ytd.insurableEarnings += grossPay;
        ytd.ei += calc.ei;

        allCalcs[emp.id].push(calc);

        records.push({
          id: `${emp.id}-${period.label}`,
          employeeId: emp.id,
          employeeName: `${emp.first_name} ${emp.last_name}`,
          label: period.label,
          shiftCount: period.shifts.length,
          hours: totalHours,
          calc,
        });
      }
    }

    return { payPeriodRecords: records, allCalcsByEmployee: allCalcs };
  }, [selectedPeriod, shifts, employees]);

  // ── Filter by selected employee ──
  const filteredRecords = useMemo(() => {
    if (selectedEmployee === 'all') return payPeriodRecords;
    return payPeriodRecords.filter((r) => r.employeeId === selectedEmployee);
  }, [payPeriodRecords, selectedEmployee]);

  // ── Aggregate stats for display ──
  const totalGross = filteredRecords.reduce((s, r) => s + r.calc.grossPay, 0);
  const totalHours = filteredRecords.reduce((s, r) => s + r.hours, 0);
  const totalDeductions = filteredRecords.reduce((s, r) => s + r.calc.totalDeductions, 0);
  const totalNet = filteredRecords.reduce((s, r) => s + r.calc.netPay, 0);

  // ── T4 generation ──
  function handleGenerateT4() {
    const empId = t4Employee || employees[0]?.id;
    const emp = employees.find((e) => e.id === empId);
    if (!emp) return;

    // Gather all pay period calcs across ALL months for this employee
    // For now, use the current month's data; in production you'd aggregate the full year
    const empCalcs = allCalcsByEmployee[empId] || [];
    if (empCalcs.length === 0) {
      alert('No payroll data for this employee in the selected month.');
      return;
    }

    const t4 = CRATax.generateT4(emp, empCalcs);
    setT4Modal(t4);
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between flex-wrap gap-2">
        <h1 className="text-2xl font-bold" style={{ color: BRAND.text }}>
          Payroll & T4
        </h1>
        <div className="flex gap-2">
          <Btn
            icon={Download}
            size="sm"
            variant="secondary"
            onClick={() => exportPayrollCSV(filteredRecords, employees)}
            disabled={filteredRecords.length === 0}
          >
            Export CSV
          </Btn>
        </div>
      </div>

      {/* Filters */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
        <Select
          label="Employee"
          value={selectedEmployee}
          onChange={(e) => setSelectedEmployee(e.target.value)}
          options={[
            { value: 'all', label: 'All Employees' },
            ...employees.map((e) => ({
              value: e.id,
              label: `${e.first_name} ${e.last_name}`,
            })),
          ]}
        />
        <Input
          label="Period"
          type="month"
          value={selectedPeriod}
          onChange={(e) => setSelectedPeriod(e.target.value)}
        />
        <div className="flex items-end gap-2">
          <Select
            label="T4 Employee"
            value={t4Employee}
            onChange={(e) => setT4Employee(e.target.value)}
            options={employees.map((e) => ({
              value: e.id,
              label: `${e.first_name} ${e.last_name}`,
            }))}
          />
          <Btn icon={FileText} size="sm" onClick={handleGenerateT4}>
            Generate T4
          </Btn>
        </div>
      </div>

      {/* Summary Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <StatCard icon={DollarSign} label="Gross Pay" value={currency(totalGross)} color="primary" />
        <StatCard icon={Clock} label="Total Hours" value={`${totalHours.toFixed(1)}h`} color="primary" />
        <StatCard icon={Briefcase} label="Deductions" value={currency(totalDeductions)} color="warning" />
        <StatCard icon={TrendingUp} label="Net Pay" value={currency(totalNet)} color="success" />
      </div>

      {/* Pay Stubs */}
      <SectionCard title="Pay Stubs" icon={FileText}>
        {filteredRecords.length === 0 ? (
          <EmptyState
            title="No pay stubs"
            message="No shifts found for this period. Assign shifts to employees to generate payroll."
          />
        ) : (
          <div className="space-y-2">
            {filteredRecords.map((r) => {
              const isExpanded = expandedStub === r.id;
              return (
                <div key={r.id}>
                  <div
                    className="flex items-center justify-between p-3 rounded-lg cursor-pointer hover:bg-white/10 transition"
                    style={{ background: 'rgba(255,255,255,0.05)' }}
                    onClick={() => setExpandedStub(isExpanded ? null : r.id)}
                  >
                    <div>
                      <p className="text-sm font-medium" style={{ color: BRAND.text }}>
                        {r.employeeName}
                      </p>
                      <p className="text-xs" style={{ color: 'rgba(224,230,255,0.6)' }}>
                        {r.label} &middot; {r.shiftCount} shift{r.shiftCount !== 1 ? 's' : ''} &middot; {r.hours.toFixed(1)}h
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="text-sm font-bold" style={{ color: BRAND.primary }}>
                        {currency(r.calc.netPay)}
                      </p>
                      <p className="text-xs" style={{ color: 'rgba(224,230,255,0.5)' }}>
                        gross {currency(r.calc.grossPay)}
                      </p>
                    </div>
                  </div>

                  {/* Expanded deduction breakdown */}
                  {isExpanded && (
                    <div
                      className="mx-3 mb-2 p-3 rounded-lg space-y-1"
                      style={{ background: 'rgba(255,255,255,0.03)', borderLeft: `3px solid ${BRAND.primary}` }}
                    >
                      <DeductionRow label="Gross Pay" value={r.calc.grossPay} bold />
                      <div className="border-t border-white/10 my-1" />
                      <DeductionRow label="CPP" value={-r.calc.cpp} />
                      <DeductionRow label="CPP2" value={-r.calc.cpp2} />
                      <DeductionRow label="EI" value={-r.calc.ei} />
                      <DeductionRow label="Federal Tax" value={-r.calc.federalTax} />
                      <DeductionRow label="Provincial Tax (ON)" value={-r.calc.provincialTax} />
                      <div className="border-t border-white/10 my-1" />
                      <DeductionRow label="Total Deductions" value={-r.calc.totalDeductions} />
                      <DeductionRow label="Net Pay" value={r.calc.netPay} bold accent />
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </SectionCard>

      {/* T4 Modal */}
      <Modal isOpen={!!t4Modal} onClose={() => setT4Modal(null)} title={`T4 Summary — ${t4Modal?.year || ''}`} size="lg">
        {t4Modal && <T4Display t4={t4Modal} />}
      </Modal>
    </div>
  );
};

// ── Sub-components ──

function DeductionRow({ label, value, bold, accent }) {
  return (
    <div className="flex justify-between text-sm">
      <span style={{ color: bold ? BRAND.text : 'rgba(224,230,255,0.6)' }}>{label}</span>
      <span
        style={{
          color: accent ? BRAND.primary : value < 0 ? '#f87171' : BRAND.text,
          fontWeight: bold ? 700 : 400,
        }}
      >
        {value < 0 ? `-${currency(Math.abs(value))}` : currency(value)}
      </span>
    </div>
  );
}

function T4Display({ t4 }) {
  const emp = t4.employee;
  const boxes = [
    { box: '14', label: 'Employment Income', value: t4.box14_employmentIncome },
    { box: '16', label: 'CPP Contributions', value: t4.box16_cpp },
    { box: '16A', label: 'CPP2 Contributions', value: t4.box16A_cpp2 },
    { box: '18', label: 'EI Premiums', value: t4.box18_ei },
    { box: '22', label: 'Income Tax Deducted', value: t4.box22_incomeTaxDeducted },
    { box: '24', label: 'EI Insurable Earnings', value: t4.box24_eiInsurableEarnings },
    { box: '26', label: 'CPP Pensionable Earnings', value: t4.box26_cppPensionableEarnings },
  ];

  return (
    <div className="space-y-4">
      <div
        className="p-4 rounded-lg"
        style={{ background: 'rgba(255,255,255,0.05)', border: `1px solid ${BRAND.glassBorder}` }}
      >
        <p className="text-lg font-bold mb-1" style={{ color: BRAND.text }}>
          {emp.first_name} {emp.last_name}
        </p>
        <p className="text-xs mb-3" style={{ color: 'rgba(224,230,255,0.5)' }}>
          Tax Year {t4.year} &middot; Province: {t4.box10_provinceOfEmployment}
        </p>

        <div className="grid grid-cols-1 gap-2">
          {boxes.map((b) => (
            <div key={b.box} className="flex justify-between py-1 border-b border-white/5">
              <span className="text-sm" style={{ color: 'rgba(224,230,255,0.7)' }}>
                Box {b.box} — {b.label}
              </span>
              <span className="text-sm font-semibold" style={{ color: BRAND.primary }}>
                {currency(b.value)}
              </span>
            </div>
          ))}
        </div>

        <div className="mt-3 pt-2 border-t border-white/10 flex justify-between">
          <span className="text-sm font-medium" style={{ color: 'rgba(224,230,255,0.7)' }}>
            Federal Tax
          </span>
          <span className="text-sm" style={{ color: BRAND.text }}>{currency(t4.federalTax)}</span>
        </div>
        <div className="flex justify-between">
          <span className="text-sm font-medium" style={{ color: 'rgba(224,230,255,0.7)' }}>
            Provincial Tax
          </span>
          <span className="text-sm" style={{ color: BRAND.text }}>{currency(t4.provincialTax)}</span>
        </div>
      </div>

      <p className="text-xs text-center" style={{ color: 'rgba(224,230,255,0.4)' }}>
        This is a preview. Validate with your accountant before filing with CRA.
      </p>
    </div>
  );
}

export default PayrollPage;
