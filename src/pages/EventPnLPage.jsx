import React, { useState, useMemo } from 'react';
import { DollarSign, TrendingUp, BarChart3, FileText } from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, ComposedChart, Line, PieChart, Pie, Cell } from 'recharts';
import { StatCard, SectionCard, EmptyState } from '../components';
import { BRAND } from '../constants/brand';
import { EVENT_TYPE_DEFAULTS } from '../constants/events';
import { currency } from '../utils/formatters';

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

export default EventPnLPage;
