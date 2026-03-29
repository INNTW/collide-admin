import React, { useState } from "react";
import {
  Plus,
  Package,
  DollarSign,
  TrendingUp,
  Edit2,
  Eye,
  EyeOff,
  Trash2,
  FileText,
} from "lucide-react";
import { Modal, Input, Select, Btn, EmptyState, StatCard } from "../components";
import { BRAND } from "../constants/brand";
import { PRODUCT_CATEGORIES } from "../constants/events";
import { currency } from "../utils/formatters";
import { supabase } from "../lib/supabase";
import { exportCSV } from "../utils/csv-export";

const InventoryProductsPage = ({ products = [], stock = {}, onRefresh }) => {
  const [showAddModal, setShowAddModal] = useState(false);
  const [editProduct, setEditProduct] = useState(null);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({ name: "", sku: "", category: "T-Shirts", cost: "", retail: "", sizes: "S,M,L,XL", weight_kg: "" });
  const [searchTerm, setSearchTerm] = useState("");
  const [filterCategory, setFilterCategory] = useState("");

  const totalStockUnits = Object.values(stock).reduce((a, b) => a + b, 0);
  const totalStockValue = products.reduce((sum, p) => sum + (stock[p.id] || 0) * Number(p.cost || 0), 0);
  const activeProducts = products.filter(p => p.status === "active");
  const avgMargin = activeProducts.length > 0
    ? (activeProducts.reduce((sum, p) => sum + (Number(p.retail) > 0 ? ((Number(p.retail) - Number(p.cost)) / Number(p.retail)) * 100 : 0), 0) / activeProducts.length).toFixed(0)
    : 0;

  const resetForm = () => setForm({ name: "", sku: "", category: "T-Shirts", cost: "", retail: "", sizes: "S,M,L,XL", weight_kg: "" });

  const openEdit = (p) => {
    setEditProduct(p);
    setForm({
      name: p.name,
      sku: p.sku,
      category: p.category || "T-Shirts",
      cost: String(p.cost),
      retail: String(p.retail),
      sizes: (p.sizes || []).join(","),
      weight_kg: String(p.weight_kg || ""),
    });
  };

  const handleSave = async () => {
    if (!form.name || !form.sku) return;
    setSaving(true);
    const payload = {
      name: form.name,
      sku: form.sku,
      category: form.category || "T-Shirts",
      cost: parseFloat(form.cost) || 0,
      retail: parseFloat(form.retail) || 0,
      sizes: form.sizes ? form.sizes.split(",").map(s => s.trim()).filter(Boolean) : ["S", "M", "L", "XL"],
      weight_kg: parseFloat(form.weight_kg) || 0,
    };
    if (editProduct) {
      await supabase.from("products").update(payload).eq("id", editProduct.id);
    } else {
      const { data } = await supabase.from("products").insert(payload).select();
      // Create stock_levels entry for new product
      if (data?.[0]) {
        await supabase.from("stock_levels").insert({ product_id: data[0].id, quantity: 0 });
      }
    }
    setSaving(false);
    setShowAddModal(false);
    setEditProduct(null);
    resetForm();
    onRefresh?.();
  };

  const handleDelete = async (id) => {
    if (!confirm("Delete this product? This cannot be undone.")) return;
    await supabase.from("products").delete().eq("id", id);
    onRefresh?.();
  };

  const handleToggleStatus = async (p) => {
    const newStatus = p.status === "active" ? "inactive" : "active";
    await supabase.from("products").update({ status: newStatus }).eq("id", p.id);
    onRefresh?.();
  };

  const filtered = products.filter(p => {
    const matchSearch = !searchTerm || p.name.toLowerCase().includes(searchTerm.toLowerCase()) || p.sku.toLowerCase().includes(searchTerm.toLowerCase());
    const matchCategory = !filterCategory || p.category === filterCategory;
    return matchSearch && matchCategory;
  });

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-4">
        <h1 className="text-2xl font-bold" style={{ color: BRAND.text }}>Products</h1>
        <div className="flex gap-2">
          <Btn
            icon={FileText}
            variant="secondary"
            size="sm"
            onClick={() =>
              exportCSV(
                filtered.map((p) => ({
                  name: p.name,
                  sku: p.sku,
                  category: p.category || "",
                  cost: Number(p.cost || 0).toFixed(2),
                  retail: Number(p.retail || 0).toFixed(2),
                  stock_qty: stock[p.id] || 0,
                })),
                [
                  { key: "name", label: "Product Name" },
                  { key: "sku", label: "SKU" },
                  { key: "category", label: "Category" },
                  { key: "cost", label: "Cost" },
                  { key: "retail", label: "Retail" },
                  { key: "stock_qty", label: "Stock Quantity" },
                ],
                "inventory"
              )
            }
          >
            Export Inventory
          </Btn>
          <Btn icon={Plus} onClick={() => { resetForm(); setEditProduct(null); setShowAddModal(true); }}>Add Product</Btn>
        </div>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard label="Total Products" value={activeProducts.length} icon={Package} color="primary" />
        <StatCard label="Stock Units" value={totalStockUnits} icon={Package} color="success" />
        <StatCard label="Stock Value" value={currency(totalStockValue)} icon={DollarSign} color="warning" />
        <StatCard label="Avg Margin" value={`${avgMargin}%`} icon={TrendingUp} color="primary" />
      </div>

      {/* Filters */}
      <div className="flex items-center gap-3 flex-wrap">
        <div className="flex-1 min-w-48">
          <input
            type="text"
            placeholder="Search products..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full px-4 py-2 rounded-lg text-white focus:outline-none focus:ring-2"
            style={{ background: "rgba(255,255,255,0.05)", border: `1px solid ${BRAND.glassBorder}` }}
          />
        </div>
        <select
          value={filterCategory}
          onChange={(e) => setFilterCategory(e.target.value)}
          className="px-4 py-2 rounded-lg text-white focus:outline-none"
          style={{ background: "rgba(255,255,255,0.05)", border: `1px solid ${BRAND.glassBorder}` }}
        >
          <option value="">All Categories</option>
          {PRODUCT_CATEGORIES.map(c => <option key={c.value} value={c.value}>{c.label}</option>)}
        </select>
      </div>

      {/* Product Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
        {filtered.map(p => {
          const margin = Number(p.retail) > 0 ? (((Number(p.retail) - Number(p.cost)) / Number(p.retail)) * 100).toFixed(0) : 0;
          const onHand = stock[p.id] || 0;
          const isInactive = p.status !== "active";
          return (
            <div
              key={p.id}
              className={`rounded-xl p-4 ${isInactive ? "opacity-60" : ""}`}
              style={{ background: BRAND.glass, border: `1px solid ${BRAND.glassBorder}`, backdropFilter: BRAND.blur }}
            >
              <div className="flex items-start justify-between mb-3">
                <div>
                  <h3 className="font-semibold text-base" style={{ color: BRAND.text }}>{p.name}</h3>
                  <p className="text-xs mt-1" style={{ color: "rgba(224,230,255,0.5)" }}>
                    SKU: {p.sku} &middot; {p.category || "T-Shirts"}
                  </p>
                </div>
                <div className="flex items-center gap-1">
                  <button onClick={() => openEdit(p)} className="p-1.5 rounded-lg hover:bg-white/10 transition">
                    <Edit2 size={14} style={{ color: BRAND.primary }} />
                  </button>
                  <button onClick={() => handleToggleStatus(p)} className="p-1.5 rounded-lg hover:bg-white/10 transition">
                    {isInactive ? <Eye size={14} style={{ color: BRAND.success }} /> : <EyeOff size={14} style={{ color: BRAND.warning }} />}
                  </button>
                  <button onClick={() => handleDelete(p.id)} className="p-1.5 rounded-lg hover:bg-white/10 transition">
                    <Trash2 size={14} style={{ color: BRAND.danger }} />
                  </button>
                </div>
              </div>

              <div className="grid grid-cols-3 gap-2 text-center">
                <div className="rounded-lg p-2" style={{ background: "rgba(255,255,255,0.04)" }}>
                  <p className="text-xs" style={{ color: "rgba(224,230,255,0.5)" }}>Cost</p>
                  <p className="font-semibold text-sm" style={{ color: BRAND.text }}>{currency(p.cost)}</p>
                </div>
                <div className="rounded-lg p-2" style={{ background: "rgba(255,255,255,0.04)" }}>
                  <p className="text-xs" style={{ color: "rgba(224,230,255,0.5)" }}>Retail</p>
                  <p className="font-semibold text-sm" style={{ color: BRAND.primary }}>{currency(p.retail)}</p>
                </div>
                <div className="rounded-lg p-2" style={{ background: "rgba(255,255,255,0.04)" }}>
                  <p className="text-xs" style={{ color: "rgba(224,230,255,0.5)" }}>Margin</p>
                  <p className="font-semibold text-sm" style={{ color: BRAND.success }}>{margin}%</p>
                </div>
              </div>

              <div className="mt-3 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Package size={14} style={{ color: BRAND.primary }} />
                  <span className="text-sm" style={{ color: BRAND.text }}>{onHand} in stock</span>
                </div>
                {(p.sizes || []).length > 0 && (
                  <div className="flex gap-1">
                    {(p.sizes || []).map(s => (
                      <span key={s} className="text-xs px-1.5 py-0.5 rounded" style={{ background: "rgba(84,205,249,0.15)", color: BRAND.primary }}>{s}</span>
                    ))}
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {filtered.length === 0 && (
        <EmptyState icon={Package} title="No products found" message={searchTerm ? "Try a different search term" : "Add your first product to get started"} />
      )}

      {/* Add/Edit Modal */}
      <Modal isOpen={showAddModal || !!editProduct} onClose={() => { setShowAddModal(false); setEditProduct(null); resetForm(); }} title={editProduct ? "Edit Product" : "Add Product"} size="lg">
        <div className="space-y-1">
          <Input label="Product Name" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="e.g. Collide Classic Tee" />
          <div className="grid grid-cols-2 gap-4">
            <Input label="SKU" value={form.sku} onChange={(e) => setForm({ ...form, sku: e.target.value })} placeholder="e.g. CLT-001" />
            <Select label="Category" value={form.category} onChange={(e) => setForm({ ...form, category: e.target.value })} options={PRODUCT_CATEGORIES} />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <Input label="Cost ($)" value={form.cost} onChange={(e) => setForm({ ...form, cost: e.target.value })} type="number" placeholder="0.00" />
            <Input label="Retail ($)" value={form.retail} onChange={(e) => setForm({ ...form, retail: e.target.value })} type="number" placeholder="0.00" />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <Input label="Sizes (comma-separated)" value={form.sizes} onChange={(e) => setForm({ ...form, sizes: e.target.value })} placeholder="S,M,L,XL" />
            <Input label="Weight (kg)" value={form.weight_kg} onChange={(e) => setForm({ ...form, weight_kg: e.target.value })} type="number" placeholder="0.3" />
          </div>
          <div className="flex justify-end gap-2 mt-4">
            <Btn variant="secondary" onClick={() => { setShowAddModal(false); setEditProduct(null); resetForm(); }}>Cancel</Btn>
            <Btn onClick={handleSave} disabled={saving || !form.name || !form.sku}>{saving ? "Saving..." : editProduct ? "Update" : "Create"}</Btn>
          </div>
        </div>
      </Modal>
    </div>
  );
};

export default InventoryProductsPage;
