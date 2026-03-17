import { useState, useEffect } from 'react';
import { Plus, Trash2, Search } from 'lucide-react';
import { db } from '@/lib/db';
import type { Product } from '@/types';

interface CartItem {
  product: Product & { category_name?: string };
  quantity: number;
}

interface OrderFormProps {
  onSubmit: () => void;
  onCancel: () => void;
}

export default function OrderForm({ onSubmit, onCancel }: OrderFormProps) {
  const [products, setProducts] = useState<(Product & { category_name: string })[]>([]);
  const [search, setSearch] = useState('');
  const [customerName, setCustomerName] = useState('');
  const [customerPhone, setCustomerPhone] = useState('');
  const [cart, setCart] = useState<CartItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    db.products.getAll().then(setProducts);
  }, []);

  const filtered = products.filter(
    (p) =>
      p.name.toLowerCase().includes(search.toLowerCase()) ||
      p.product_code.toLowerCase().includes(search.toLowerCase())
  );

  const addToCart = (p: Product & { category_name?: string }) => {
    if (p.stock < 1) return;
    setCart((prev) => {
      const existing = prev.find((c) => c.product.id === p.id);
      if (existing) {
        if (existing.quantity >= p.stock) return prev;
        return prev.map((c) =>
          c.product.id === p.id ? { ...c, quantity: c.quantity + 1 } : c
        );
      }
      return [...prev, { product: p, quantity: 1 }];
    });
  };

  const updateQty = (productId: number, delta: number) => {
    setCart((prev) => {
      const item = prev.find((c) => c.product.id === productId);
      if (!item) return prev;
      const newQty = Math.max(0, Math.min(item.product.stock, item.quantity + delta));
      if (newQty === 0) return prev.filter((c) => c.product.id !== productId);
      return prev.map((c) =>
        c.product.id === productId ? { ...c, quantity: newQty } : c
      );
    });
  };

  const removeFromCart = (productId: number) => {
    setCart((prev) => prev.filter((c) => c.product.id !== productId));
  };

  const total = cart.reduce((sum, c) => {
    const subtotal = c.quantity * c.product.selling_price;
    const gst = subtotal * (c.product.gst_rate / 100);
    return sum + subtotal + gst;
  }, 0);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    if (!customerName.trim()) {
      setError('Customer name is required');
      return;
    }
    if (!customerPhone.trim()) {
      setError('Customer phone is required');
      return;
    }
    if (cart.length === 0) {
      setError('Add at least one product');
      return;
    }
    const outOfStock = cart.find((c) => c.quantity > c.product.stock);
    if (outOfStock) {
      setError(`${outOfStock.product.name} has only ${outOfStock.product.stock} in stock`);
      return;
    }
    setLoading(true);
    try {
      await db.orders.create({
        customer_name: customerName.trim(),
        customer_phone: customerPhone.trim(),
        items: cart.map((c) => ({
          product_id: c.product.id,
          quantity: c.quantity,
          unit_price: c.product.selling_price,
          gst_rate: c.product.gst_rate,
        })),
      });
      onSubmit();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create order');
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
          <label>Customer Name *</label>
          <input
            type="text"
            value={customerName}
            onChange={(e) => setCustomerName(e.target.value)}
            placeholder="Customer name"
            required
          />
        </div>
        <div>
          <label>Customer Phone *</label>
          <input
            type="tel"
            value={customerPhone}
            onChange={(e) => setCustomerPhone(e.target.value)}
            placeholder="Phone number"
            required
          />
        </div>
      </div>

      <div>
        <label>Add Products</label>
        <div className="relative mb-2">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-slate-500" />
          <input
            type="text"
            placeholder="Search product..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-9"
          />
        </div>
        <div className="max-h-40 overflow-auto rounded-lg border border-slate-700 divide-y divide-slate-700">
          {filtered
            .filter((p) => p.stock > 0)
            .map((p) => (
              <div
                key={p.id}
                className="flex items-center justify-between px-3 py-2 hover:bg-slate-800/50"
              >
                <span className="text-slate-200 text-sm">
                  {p.name} <span className="text-slate-500">({p.product_code})</span> · ₹{p.selling_price.toFixed(2)} · Stock: {p.stock}
                </span>
                <button
                  type="button"
                  onClick={() => addToCart(p)}
                  className="p-1.5 rounded-lg bg-primary-600/20 text-primary-400 hover:bg-primary-600/30 transition-colors"
                >
                  <Plus size={16} />
                </button>
              </div>
            ))}
          {filtered.filter((p) => p.stock > 0).length === 0 && (
            <p className="px-3 py-4 text-slate-500 text-sm">No products available</p>
          )}
        </div>
      </div>

      {cart.length > 0 && (
        <div>
          <h3 className="text-sm font-medium text-slate-400 mb-2">Cart</h3>
          <div className="rounded-lg border border-slate-700 divide-y divide-slate-700">
            {cart.map((c) => (
              <div
                key={c.product.id}
                className="flex items-center justify-between px-3 py-2"
              >
                <span className="text-slate-200 text-sm">{c.product.name}</span>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => updateQty(c.product.id, -1)}
                    className="w-7 h-7 rounded bg-slate-700 hover:bg-slate-600 text-slate-300 text-sm font-medium"
                  >
                    −
                  </button>
                  <span className="w-8 text-center text-slate-200 font-medium">{c.quantity}</span>
                  <button
                    type="button"
                    onClick={() => updateQty(c.product.id, 1)}
                    disabled={c.quantity >= c.product.stock}
                    className="w-7 h-7 rounded bg-slate-700 hover:bg-slate-600 disabled:opacity-50 text-slate-300 text-sm font-medium"
                  >
                    +
                  </button>
                  <span className="w-20 text-right text-slate-400 text-sm">
                    ₹{((c.quantity * c.product.selling_price) * (1 + c.product.gst_rate / 100)).toFixed(2)}
                  </span>
                  <button
                    type="button"
                    onClick={() => removeFromCart(c.product.id)}
                    className="p-1 rounded text-slate-500 hover:text-red-400"
                  >
                    <Trash2 size={14} />
                  </button>
                </div>
              </div>
            ))}
          </div>
          <p className="text-right mt-2 text-lg font-semibold text-primary-400">
            Total: ₹{total.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
          </p>
        </div>
      )}

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
          disabled={loading || cart.length === 0}
          className="px-4 py-2 rounded-lg bg-primary-600 hover:bg-primary-500 text-white font-medium disabled:opacity-50 transition-colors"
        >
          {loading ? 'Creating...' : 'Create Order'}
        </button>
      </div>
    </form>
  );
}
