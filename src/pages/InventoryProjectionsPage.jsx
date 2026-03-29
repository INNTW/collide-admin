import React, { useState, useEffect, useMemo } from 'react';
import { Package, AlertCircle, DollarSign, BarChart3, FileText } from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { StatCard, SectionCard, EmptyState } from '../components';
import { BRAND } from '../constants/brand';
import { EVENT_TYPE_DEFAULTS } from '../constants/events';
import { currency } from '../utils/formatters';

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

export default InventoryProjectionsPage;
