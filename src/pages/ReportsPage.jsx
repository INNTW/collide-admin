import React, { useMemo } from "react";
import {
  Users,
  Calendar,
  DollarSign,
  TrendingUp,
  BarChart3,
  FileText,
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
import { StatCard, SectionCard, Btn } from "../components";
import { BRAND } from "../constants/brand";
import { currency } from "../utils/formatters";
import { CRATax } from "../lib/tax-engine";
import { exportCSV } from "../utils/csv-export";

const MONTH_NAMES = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

const ReportsPage = ({ employees = [], events = [], shifts = [], historicSales = [], products = [] }) => {
  // Build a lookup of employee_id -> hourly_rate for payroll calculations
  const employeeMap = useMemo(() => {
    const map = {};
    for (const emp of employees) {
      map[emp.id] = emp;
    }
    return map;
  }, [employees]);

  // Compute staff trend data: group shifts by month, count unique employees and total shifts per month (last 6 months)
  const staffTrendData = useMemo(() => {
    if (!shifts.length) return [];

    const now = new Date();
    const monthsBack = 6;
    const buckets = {};

    // Initialize last 6 months
    for (let i = monthsBack - 1; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
      buckets[key] = { month: MONTH_NAMES[d.getMonth()], staff: new Set(), shifts: 0 };
    }

    for (const shift of shifts) {
      if (!shift.shift_date) continue;
      const parts = shift.shift_date.split("-");
      const key = `${parts[0]}-${parts[1]}`;
      if (buckets[key]) {
        buckets[key].shifts += 1;
        if (shift.employee_id) buckets[key].staff.add(shift.employee_id);
      }
    }

    return Object.values(buckets).map((b) => ({
      month: b.month,
      staff: b.staff.size,
      shifts: b.shifts,
    }));
  }, [shifts]);

  // Compute YTD payroll: sum of (shift hours * employee hourly_rate) for shifts in the current year
  const ytdPayroll = useMemo(() => {
    const currentYear = new Date().getFullYear().toString();
    let total = 0;
    for (const shift of shifts) {
      if (!shift.shift_date || !shift.shift_date.startsWith(currentYear)) continue;
      const emp = employeeMap[shift.employee_id];
      const rate = emp?.hourly_rate || 0;
      // Calculate hours from start_time and end_time
      let hours = shift.hours || 0;
      if (!hours && shift.start_time && shift.end_time) {
        const [sh, sm] = shift.start_time.split(":").map(Number);
        const [eh, em] = shift.end_time.split(":").map(Number);
        hours = (eh + em / 60) - (sh + sm / 60);
        if (hours < 0) hours += 24; // overnight shift
      }
      total += hours * rate;
    }
    return total;
  }, [shifts, employeeMap]);

  // Compute average wage/hour from employee hourly_rate values
  const avgWagePerHour = useMemo(() => {
    const withRate = employees.filter((e) => e.hourly_rate && e.hourly_rate > 0);
    if (!withRate.length) return 0;
    return withRate.reduce((sum, e) => sum + Number(e.hourly_rate), 0) / withRate.length;
  }, [employees]);

  // Compute payroll breakdown using CRATax engine
  const payrollData = useMemo(() => {
    if (ytdPayroll <= 0) {
      return [
        { name: "Gross Pay", value: 0, color: BRAND.primary },
        { name: "CPP + EI", value: 0, color: BRAND.success },
        { name: "Federal Tax", value: 0, color: BRAND.warning },
        { name: "Provincial Tax", value: 0, color: BRAND.danger },
      ];
    }

    const deductions = CRATax.calculateTotalDeductions(ytdPayroll);
    const grossAfterDeductions = ytdPayroll - deductions.total;

    return [
      { name: "Net Pay", value: Math.max(0, grossAfterDeductions), color: BRAND.primary },
      { name: "CPP + EI", value: deductions.cpp + deductions.ei, color: BRAND.success },
      { name: "Federal Tax", value: deductions.federal, color: BRAND.warning },
      { name: "Provincial Tax", value: deductions.provincial, color: BRAND.danger },
    ];
  }, [ytdPayroll]);

  // Revenue trend from historicSales data
  const revenueTrendData = useMemo(() => {
    if (!historicSales || !historicSales.length) return [];

    const buckets = {};
    for (const sale of historicSales) {
      const dateStr = sale.sale_date || sale.event_date || sale.date;
      if (!dateStr) continue;
      const parts = dateStr.split("-");
      const key = `${parts[0]}-${parts[1]}`;
      const monthIdx = parseInt(parts[1], 10) - 1;
      if (!buckets[key]) {
        buckets[key] = { month: MONTH_NAMES[monthIdx] || key, revenue: 0, transactions: 0 };
      }
      buckets[key].revenue += Number(sale.total_amount || sale.revenue || sale.amount || 0);
      buckets[key].transactions += 1;
    }

    // Sort by key (YYYY-MM) and return last 6 months
    return Object.entries(buckets)
      .sort(([a], [b]) => a.localeCompare(b))
      .slice(-6)
      .map(([, v]) => v);
  }, [historicSales]);

  const COLORS_ARRAY = [BRAND.primary, BRAND.success, BRAND.warning, BRAND.danger];

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between flex-wrap gap-4">
        <h1 className="text-2xl font-bold" style={{ color: BRAND.text }}>
          Reports & Analytics
        </h1>
        <Btn
          icon={FileText}
          variant="secondary"
          size="sm"
          onClick={() => {
            const reportData = employees.map((emp) => {
              const empShifts = shifts.filter((s) => s.employee_id === emp.id);
              const totalHours = empShifts.reduce((sum, s) => {
                let hours = s.hours || 0;
                if (!hours && s.start_time && s.end_time) {
                  const [sh, sm] = s.start_time.split(":").map(Number);
                  const [eh, em] = s.end_time.split(":").map(Number);
                  hours = (eh + em / 60) - (sh + sm / 60);
                  if (hours < 0) hours += 24;
                }
                return sum + hours;
              }, 0);
              const grossPay = totalHours * Number(emp.hourly_rate || 0);
              return {
                name: `${emp.first_name} ${emp.last_name}`,
                total_shifts: empShifts.length,
                total_hours: totalHours.toFixed(1),
                total_gross_pay: grossPay.toFixed(2),
              };
            });
            exportCSV(
              reportData,
              [
                { key: "name", label: "Employee Name" },
                { key: "total_shifts", label: "Total Shifts" },
                { key: "total_hours", label: "Total Hours" },
                { key: "total_gross_pay", label: "Total Gross Pay" },
              ],
              "staff_report"
            );
          }}
        >
          Export Report
        </Btn>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <StatCard icon={Users} label="Total Staff" value={employees.length} color="primary" />
        <StatCard icon={Calendar} label="Total Shifts" value={shifts.length} color="primary" />
        <StatCard
          icon={DollarSign}
          label="YTD Payroll"
          value={currency(ytdPayroll)}
          color="success"
        />
        <StatCard
          icon={TrendingUp}
          label="Avg Wage/Hour"
          value={currency(avgWagePerHour)}
          color="warning"
        />
      </div>

      <SectionCard title="Staff & Shift Trend" icon={TrendingUp}>
        {staffTrendData.length > 0 ? (
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
        ) : (
          <p className="text-center py-8" style={{ color: BRAND.text, opacity: 0.5 }}>
            No shift data available. Shifts will appear here once scheduled.
          </p>
        )}
      </SectionCard>

      <SectionCard title="Payroll Breakdown" icon={DollarSign}>
        {ytdPayroll > 0 ? (
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
                <Tooltip formatter={(value) => currency(value)} />
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
              <div className="border-t pt-2 mt-2" style={{ borderColor: BRAND.glassBorder }}>
                <div className="flex items-center justify-between font-semibold">
                  <span style={{ color: BRAND.text }}>Total Gross</span>
                  <span style={{ color: BRAND.primary }}>{currency(ytdPayroll)}</span>
                </div>
              </div>
            </div>
          </div>
        ) : (
          <p className="text-center py-8" style={{ color: BRAND.text, opacity: 0.5 }}>
            No payroll data to display. Payroll estimates will appear once shifts are assigned to employees with hourly rates.
          </p>
        )}
      </SectionCard>

      {revenueTrendData.length > 0 && (
        <SectionCard title="Revenue Trend" icon={BarChart3}>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={revenueTrendData}>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.1)" />
              <XAxis dataKey="month" stroke={BRAND.text} />
              <YAxis stroke={BRAND.text} tickFormatter={(v) => `$${(v / 1000).toFixed(0)}k`} />
              <Tooltip
                contentStyle={{ background: BRAND.glass, border: `1px solid ${BRAND.glassBorder}` }}
                formatter={(value) => currency(value)}
              />
              <Legend />
              <Bar dataKey="revenue" name="Revenue" fill={BRAND.primary} radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </SectionCard>
      )}
    </div>
  );
};

export default ReportsPage;
