import React from "react";
import {
  Users,
  Calendar,
  DollarSign,
  TrendingUp,
} from "lucide-react";
import {
  LineChart,
  Line,
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
import { StatCard, SectionCard } from "../components";
import { BRAND } from "../constants/brand";
import { currency } from "../utils/formatters";

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

export default ReportsPage;
