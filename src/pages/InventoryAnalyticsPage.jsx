import React, { useState, useMemo } from "react";
import {
  Package,
  DollarSign,
  TrendingUp,
  BarChart3,
} from "lucide-react";
import {
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts";
import { EmptyState, StatCard, SectionCard } from "../components";
import { BRAND } from "../constants/brand";
import { EVENT_TYPE_DEFAULTS } from "../constants/events";
import { currency } from "../utils/formatters";

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

export default InventoryAnalyticsPage;
