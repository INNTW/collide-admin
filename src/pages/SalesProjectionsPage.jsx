import React, { useState, useMemo } from 'react';
import { DollarSign, TrendingUp, Package, Calendar, BarChart3 } from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, ComposedChart, Line } from 'recharts';
import { StatCard, SectionCard, EmptyState } from '../components';
import { BRAND } from '../constants/brand';
import { EVENT_TYPE_DEFAULTS } from '../constants/events';
import { currency } from '../utils/formatters';

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

export default SalesProjectionsPage;
