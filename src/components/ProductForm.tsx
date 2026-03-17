import { useState, useEffect } from 'react';
import { db } from '@/lib/db';
import type { Product, Category, Tax } from '@/types';

interface ProductFormProps {
  categories: Category[];
  initialData?: Product & { category_name?: string };
  onSubmit: () => void;
  onCancel: () => void;
}

const emptyForm = {
  product_code: '',
  name: '',
  image_path: '',
  purchase_price: 0,
  hsn_code: '',
  stock: 0,
  category_id: 1,
  low_stock_threshold: 5,
  selling_price: 0,
  mrp: 0,
  gst_rate: 0,
};

export default function ProductForm({ categories, initialData, onSubmit, onCancel }: ProductFormProps) {
  const [form, setForm] = useState(emptyForm);
  const [taxes, setTaxes] = useState<Tax[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    db.taxes.getAll().then(setTaxes);
  }, []);

  useEffect(() => {
    if (initialData) {
      setForm({
        product_code: initialData.product_code,
        name: initialData.name,
        image_path: initialData.image_path ?? '',
        purchase_price: initialData.purchase_price,
        hsn_code: initialData.hsn_code,
        stock: initialData.stock,
        category_id: initialData.category_id,
        low_stock_threshold: initialData.low_stock_threshold,
        selling_price: initialData.selling_price,
        mrp: initialData.mrp,
        gst_rate: initialData.gst_rate,
      });
    } else {
      setForm(emptyForm);
    }
  }, [initialData]);

  const update = (k: keyof typeof form, v: string | number) => {
    setForm((prev) => ({ ...prev, [k]: v }));
    setError('');
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    if (!form.product_code.trim()) {
      setError('Product code is required');
      return;
    }
    if (!form.name.trim()) {
      setError('Product name is required');
      return;
    }
    if (form.category_id < 1) {
      setError('Please select a category');
      return;
    }
    setLoading(true);
    try {
      if (initialData) {
        await db.products.update(initialData.id, {
          ...form,
          image_path: form.image_path || null,
        });
      } else {
        await db.products.create({
          ...form,
          image_path: form.image_path || null,
        });
      }
      onSubmit();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save');
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {error && (
        <div className="p-3 rounded-lg bg-red-500/10 border border-red-500/30 text-red-400 text-sm">
          {error}
        </div>
      )}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div>
          <label>Product Code *</label>
          <input
            type="text"
            value={form.product_code}
            onChange={(e) => update('product_code', e.target.value)}
            placeholder="e.g. PRD001"
            required
          />
        </div>
        <div>
          <label>Product Name *</label>
          <input
            type="text"
            value={form.name}
            onChange={(e) => update('name', e.target.value)}
            placeholder="Product name"
            required
          />
        </div>
      </div>
      <div>
        <label>Product Image (URL or file path)</label>
        <input
          type="text"
          value={form.image_path}
          onChange={(e) => update('image_path', e.target.value)}
          placeholder="https://... or file path"
        />
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div>
          <label>Purchase Price (₹)</label>
          <input
            type="number"
            step="0.01"
            min="0"
            value={form.purchase_price || ''}
            onChange={(e) => update('purchase_price', parseFloat(e.target.value) || 0)}
          />
        </div>
        <div>
          <label>HSN Code</label>
          <input
            type="text"
            value={form.hsn_code}
            onChange={(e) => update('hsn_code', e.target.value)}
            placeholder="e.g. 1001"
          />
        </div>
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div>
          <label>Category *</label>
          <select
            value={form.category_id}
            onChange={(e) => update('category_id', parseInt(e.target.value, 10))}
          >
            {categories.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label>Stock</label>
          <input
            type="number"
            min="0"
            value={form.stock}
            onChange={(e) => update('stock', parseInt(e.target.value, 10) || 0)}
          />
        </div>
      </div>
      <div>
        <label>Low Stock Threshold</label>
        <input
          type="number"
          min="0"
          value={form.low_stock_threshold}
          onChange={(e) => update('low_stock_threshold', parseInt(e.target.value, 10) || 0)}
          placeholder="Notify when stock falls below"
        />
        <p className="text-xs text-slate-500 mt-1">You'll get a notification when stock is at or below this value</p>
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div>
          <label>Selling Price (₹) *</label>
          <input
            type="number"
            step="0.01"
            min="0"
            value={form.selling_price || ''}
            onChange={(e) => update('selling_price', parseFloat(e.target.value) || 0)}
          />
        </div>
        <div>
          <label>MRP (₹)</label>
          <input
            type="number"
            step="0.01"
            min="0"
            value={form.mrp || ''}
            onChange={(e) => update('mrp', parseFloat(e.target.value) || 0)}
          />
        </div>
        <div>
          <label>GST Rate (%)</label>
          <select
            value={form.gst_rate}
            onChange={(e) => update('gst_rate', parseFloat(e.target.value) || 0)}
          >
            <option value={0}>0% (Exempt)</option>
            {taxes.map((t) => {
              const gstTotal = t.cgst_rate + t.sgst_rate;
              const label = `${gstTotal}% (${t.country_code}${t.state_code ? ` / ${t.state_code}` : ''})`;
              return (
                <option key={t.id} value={gstTotal}>
                  {label}
                </option>
              );
            })}
            {form.gst_rate > 0 && !taxes.some((t) => t.cgst_rate + t.sgst_rate === form.gst_rate) && (
              <option value={form.gst_rate}>
                {form.gst_rate}% (Custom)
              </option>
            )}
          </select>
          <p className="text-xs text-slate-500 mt-1">From Tax module</p>
        </div>
      </div>
      <div className="flex justify-end gap-3 pt-4 border-t border-slate-700">
        <button
          type="button"
          onClick={onCancel}
          className="px-4 py-2 rounded-lg border border-slate-600 text-slate-300 hover:bg-slate-700 transition-colors"
        >
          Cancel
        </button>
        <button
          type="submit"
          disabled={loading}
          className="px-4 py-2 rounded-lg bg-primary-600 hover:bg-primary-500 text-white font-medium disabled:opacity-50 transition-colors"
        >
          {loading ? 'Saving...' : initialData ? 'Update Product' : 'Add Product'}
        </button>
      </div>
    </form>
  );
}
