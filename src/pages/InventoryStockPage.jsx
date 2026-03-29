import React, { useState } from "react";
import {
  Plus,
  Package,
  DollarSign,
  Zap,
  AlertCircle,
} from "lucide-react";
import { Modal, Input, Select, Btn, EmptyState, StatCard, SectionCard } from "../components";
import { BRAND } from "../constants/brand";
import { currency } from "../utils/formatters";
import { supabase } from "../lib/supabase";

const InventoryStockPage = ({ products = [], stock = {}, distributions = [], events = [], onRefresh }) => {
  const [showDistModal, setShowDistModal] = useState(false);
  const [showRestockModal, setShowRestockModal] = useState(false);
  const [saving, setSaving] = useState(false);
  const [distForm, setDistForm] = useState({ event_id: "", product_id: "", qty_sent: "", notes: "" });
  const [restockForm, setRestockForm] = useState({ product_id: "", quantity: "" });
  const [filterProduct, setFilterProduct] = useState("");

  const totalDistributed = distributions.reduce((sum, d) => sum + (d.qty_sent || 0), 0);
  const totalReturned = distributions.reduce((sum, d) => sum + (d.qty_returned || 0), 0);
  const totalSold = distributions.reduce((sum, d) => sum + (d.qty_sold || 0), 0);
  const totalOnHand = Object.values(stock).reduce((a, b) => a + b, 0);

  const handleCreateDistribution = async () => {
    if (!distForm.event_id || !distForm.product_id || !distForm.qty_sent) return;
    setSaving(true);
    await supabase.from("distributions").insert({
      event_id: distForm.event_id,
      product_id: distForm.product_id,
      qty_sent: parseInt(distForm.qty_sent),
      status: "shipped",
      shipped_at: new Date().toISOString(),
      notes: distForm.notes || null,
    });
    // Reduce stock
    const currentQty = stock[distForm.product_id] || 0;
    const newQty = Math.max(0, currentQty - parseInt(distForm.qty_sent));
    await supabase.from("stock_levels").update({ quantity: newQty, updated_at: new Date().toISOString() }).eq("product_id", distForm.product_id);
    setSaving(false);
    setShowDistModal(false);
    setDistForm({ event_id: "", product_id: "", qty_sent: "", notes: "" });
    onRefresh?.();
  };

  const handleRecordReturn = async (distId, returnQty) => {
    const qty = parseInt(returnQty);
    if (!qty || qty <= 0) return;
    const dist = distributions.find(d => d.id === distId);
    if (!dist) return;
    const newReturned = (dist.qty_returned || 0) + qty;
    await supabase.from("distributions").update({
      qty_returned: newReturned,
      returned_at: new Date().toISOString(),
      status: "returned",
    }).eq("id", distId);
    // Add back to stock
    const currentQty = stock[dist.product_id] || 0;
    await supabase.from("stock_levels").update({ quantity: currentQty + qty, updated_at: new Date().toISOString() }).eq("product_id", dist.product_id);
    onRefresh?.();
  };

  const handleRecordSales = async (distId, soldQty) => {
    const qty = parseInt(soldQty);
    if (!qty || qty <= 0) return;
    const dist = distributions.find(d => d.id === distId);
    if (!dist) return;
    await supabase.from("distributions").update({
      qty_sold: (dist.qty_sold || 0) + qty,
    }).eq("id", distId);
    onRefresh?.();
  };

  const handleRestock = async () => {
    if (!restockForm.product_id || !restockForm.quantity) return;
    setSaving(true);
    const currentQty = stock[restockForm.product_id] || 0;
    const newQty = currentQty + parseInt(restockForm.quantity);
    // Upsert stock level
    const { data: existing } = await supabase.from("stock_levels").select("id").eq("product_id", restockForm.product_id).maybeSingle();
    if (existing) {
      await supabase.from("stock_levels").update({ quantity: newQty, last_restocked_at: new Date().toISOString(), updated_at: new Date().toISOString() }).eq("product_id", restockForm.product_id);
    } else {
      await supabase.from("stock_levels").insert({ product_id: restockForm.product_id, quantity: parseInt(restockForm.quantity), last_restocked_at: new Date().toISOString() });
    }
    setSaving(false);
    setShowRestockModal(false);
    setRestockForm({ product_id: "", quantity: "" });
    onRefresh?.();
  };

  const filteredDist = distributions.filter(d => !filterProduct || d.product_id === filterProduct)
    .sort((a, b) => new Date(b.created_at) - new Date(a.created_at));

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-4">
        <h1 className="text-2xl font-bold" style={{ color: BRAND.text }}>Stock & Distribution</h1>
        <div className="flex gap-2">
          <Btn icon={Plus} variant="secondary" onClick={() => setShowRestockModal(true)}>Restock</Btn>
          <Btn icon={Plus} onClick={() => setShowDistModal(true)}>New Distribution</Btn>
        </div>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard label="On Hand" value={totalOnHand} icon={Package} color="primary" />
        <StatCard label="Distributed" value={totalDistributed} icon={Zap} color="warning" />
        <StatCard label="Sold" value={totalSold} icon={DollarSign} color="success" />
        <StatCard label="Returned" value={totalReturned} icon={Package} color="danger" />
      </div>

      {/* Stock Levels Table */}
      <SectionCard title="Current Stock Levels" icon={Package}>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr style={{ borderBottom: `1px solid ${BRAND.glassBorder}` }}>
                <th className="text-left py-3 px-3" style={{ color: BRAND.primary }}>Product</th>
                <th className="text-center py-3 px-3" style={{ color: BRAND.primary }}>Category</th>
                <th className="text-center py-3 px-3" style={{ color: BRAND.primary }}>On Hand</th>
                <th className="text-center py-3 px-3" style={{ color: BRAND.primary }}>Distributed</th>
                <th className="text-center py-3 px-3" style={{ color: BRAND.primary }}>Sold</th>
                <th className="text-center py-3 px-3" style={{ color: BRAND.primary }}>Returned</th>
                <th className="text-center py-3 px-3" style={{ color: BRAND.primary }}>Value</th>
              </tr>
            </thead>
            <tbody>
              {products.map(p => {
                const onHand = stock[p.id] || 0;
                const distrib = distributions.filter(d => d.product_id === p.id).reduce((sum, d) => sum + (d.qty_sent || 0), 0);
                const sold = distributions.filter(d => d.product_id === p.id).reduce((sum, d) => sum + (d.qty_sold || 0), 0);
                const returned = distributions.filter(d => d.product_id === p.id).reduce((sum, d) => sum + (d.qty_returned || 0), 0);
                const lowStock = onHand < 10;
                return (
                  <tr key={p.id} className="hover:bg-white/5 transition" style={{ borderBottom: `1px solid ${BRAND.glassBorder}` }}>
                    <td className="py-3 px-3" style={{ color: BRAND.text }}>{p.name}</td>
                    <td className="py-3 px-3 text-center text-xs">
                      <span className="px-2 py-1 rounded-full" style={{ background: "rgba(84,205,249,0.15)", color: BRAND.primary }}>{p.category}</span>
                    </td>
                    <td className="py-3 px-3 text-center font-semibold" style={{ color: lowStock ? BRAND.danger : BRAND.success }}>
                      {onHand} {lowStock && <AlertCircle size={12} className="inline ml-1" />}
                    </td>
                    <td className="py-3 px-3 text-center" style={{ color: "rgba(224,230,255,0.7)" }}>{distrib}</td>
                    <td className="py-3 px-3 text-center" style={{ color: BRAND.success }}>{sold}</td>
                    <td className="py-3 px-3 text-center" style={{ color: "rgba(224,230,255,0.7)" }}>{returned}</td>
                    <td className="py-3 px-3 text-center" style={{ color: BRAND.primary }}>{currency(onHand * Number(p.cost))}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
          {products.length === 0 && <EmptyState icon={Package} title="No products" message="Add products first in the Products page" />}
        </div>
      </SectionCard>

      {/* Recent Distributions */}
      <SectionCard title="Distribution History" icon={Zap}>
        <div className="mb-4">
          <select
            value={filterProduct}
            onChange={(e) => setFilterProduct(e.target.value)}
            className="px-3 py-1.5 rounded-lg text-sm text-white focus:outline-none"
            style={{ background: "rgba(255,255,255,0.05)", border: `1px solid ${BRAND.glassBorder}` }}
          >
            <option value="">All Products</option>
            {products.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
          </select>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr style={{ borderBottom: `1px solid ${BRAND.glassBorder}` }}>
                <th className="text-left py-3 px-3" style={{ color: BRAND.primary }}>Product</th>
                <th className="text-left py-3 px-3" style={{ color: BRAND.primary }}>Event</th>
                <th className="text-center py-3 px-3" style={{ color: BRAND.primary }}>Sent</th>
                <th className="text-center py-3 px-3" style={{ color: BRAND.primary }}>Sold</th>
                <th className="text-center py-3 px-3" style={{ color: BRAND.primary }}>Returned</th>
                <th className="text-center py-3 px-3" style={{ color: BRAND.primary }}>Status</th>
                <th className="text-center py-3 px-3" style={{ color: BRAND.primary }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {filteredDist.slice(0, 20).map(d => {
                const product = products.find(p => p.id === d.product_id);
                const event = events.find(e => e.id === d.event_id);
                const remaining = (d.qty_sent || 0) - (d.qty_sold || 0) - (d.qty_returned || 0);
                const statusColors = { draft: BRAND.warning, shipped: BRAND.primary, returned: BRAND.success, completed: BRAND.success };
                return (
                  <tr key={d.id} className="hover:bg-white/5 transition" style={{ borderBottom: `1px solid ${BRAND.glassBorder}` }}>
                    <td className="py-3 px-3" style={{ color: BRAND.text }}>{product?.name || "Unknown"}</td>
                    <td className="py-3 px-3" style={{ color: "rgba(224,230,255,0.7)" }}>{event?.name || "Unknown"}</td>
                    <td className="py-3 px-3 text-center" style={{ color: BRAND.text }}>{d.qty_sent}</td>
                    <td className="py-3 px-3 text-center" style={{ color: BRAND.success }}>{d.qty_sold || 0}</td>
                    <td className="py-3 px-3 text-center" style={{ color: "rgba(224,230,255,0.7)" }}>{d.qty_returned || 0}</td>
                    <td className="py-3 px-3 text-center">
                      <span className="text-xs px-2 py-1 rounded-full" style={{ background: `${statusColors[d.status] || BRAND.primary}20`, color: statusColors[d.status] || BRAND.primary }}>
                        {d.status}
                      </span>
                    </td>
                    <td className="py-3 px-3 text-center">
                      {remaining > 0 && (
                        <div className="flex items-center justify-center gap-1">
                          <button
                            onClick={() => {
                              const qty = prompt(`Record sales for ${product?.name}? (max ${remaining})`);
                              if (qty) handleRecordSales(d.id, qty);
                            }}
                            className="text-xs px-2 py-1 rounded hover:bg-white/10 transition"
                            style={{ color: BRAND.success }}
                          >Sold</button>
                          <button
                            onClick={() => {
                              const qty = prompt(`Return how many ${product?.name}? (max ${remaining})`);
                              if (qty) handleRecordReturn(d.id, qty);
                            }}
                            className="text-xs px-2 py-1 rounded hover:bg-white/10 transition"
                            style={{ color: BRAND.warning }}
                          >Return</button>
                        </div>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
          {filteredDist.length === 0 && <EmptyState icon={Zap} title="No distributions" message="Create a distribution to send inventory to an event" />}
        </div>
      </SectionCard>

      {/* New Distribution Modal */}
      <Modal isOpen={showDistModal} onClose={() => { setShowDistModal(false); setDistForm({ event_id: "", product_id: "", qty_sent: "", notes: "" }); }} title="Create Distribution" size="md">
        <div className="space-y-1">
          <Select label="Event" value={distForm.event_id} onChange={(e) => setDistForm({ ...distForm, event_id: e.target.value })} options={events.map(ev => ({ value: ev.id, label: ev.name }))} placeholder="Select event..." />
          <Select label="Product" value={distForm.product_id} onChange={(e) => setDistForm({ ...distForm, product_id: e.target.value })} options={products.map(p => ({ value: p.id, label: `${p.name} (${stock[p.id] || 0} in stock)` }))} placeholder="Select product..." />
          <Input label="Quantity to Send" value={distForm.qty_sent} onChange={(e) => setDistForm({ ...distForm, qty_sent: e.target.value })} type="number" placeholder="0" />
          <Input label="Notes (optional)" value={distForm.notes} onChange={(e) => setDistForm({ ...distForm, notes: e.target.value })} placeholder="Any notes..." />
          {distForm.product_id && distForm.qty_sent && parseInt(distForm.qty_sent) > (stock[distForm.product_id] || 0) && (
            <p className="text-xs" style={{ color: BRAND.danger }}>Warning: Sending more than available stock ({stock[distForm.product_id] || 0} on hand)</p>
          )}
          <div className="flex justify-end gap-2 mt-4">
            <Btn variant="secondary" onClick={() => setShowDistModal(false)}>Cancel</Btn>
            <Btn onClick={handleCreateDistribution} disabled={saving || !distForm.event_id || !distForm.product_id || !distForm.qty_sent}>{saving ? "Saving..." : "Ship"}</Btn>
          </div>
        </div>
      </Modal>

      {/* Restock Modal */}
      <Modal isOpen={showRestockModal} onClose={() => { setShowRestockModal(false); setRestockForm({ product_id: "", quantity: "" }); }} title="Restock Inventory" size="md">
        <div className="space-y-1">
          <Select label="Product" value={restockForm.product_id} onChange={(e) => setRestockForm({ ...restockForm, product_id: e.target.value })} options={products.map(p => ({ value: p.id, label: `${p.name} (${stock[p.id] || 0} current)` }))} placeholder="Select product..." />
          <Input label="Quantity to Add" value={restockForm.quantity} onChange={(e) => setRestockForm({ ...restockForm, quantity: e.target.value })} type="number" placeholder="0" />
          <div className="flex justify-end gap-2 mt-4">
            <Btn variant="secondary" onClick={() => setShowRestockModal(false)}>Cancel</Btn>
            <Btn variant="success" onClick={handleRestock} disabled={saving || !restockForm.product_id || !restockForm.quantity}>{saving ? "Saving..." : "Restock"}</Btn>
          </div>
        </div>
      </Modal>
    </div>
  );
};

export default InventoryStockPage;
