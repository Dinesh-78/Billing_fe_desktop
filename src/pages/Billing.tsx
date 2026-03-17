import { useState, useEffect } from 'react';
import { Plus, Trash2, Search, Banknote, Printer } from 'lucide-react';
import { db } from '@/lib/db';
import type { Product, Order } from '@/types';
import TaxInvoicePrint from '@/components/TaxInvoicePrint';
import { AdditionalCharge, BillingItem } from '@/types/Billingtypes';



export default function Billing() {
  const [products, setProducts] = useState<(Product & { category_name: string })[]>([]);
  const [search, setSearch] = useState('');
  const [mode, setMode] = useState<'Cash' | 'Credit' | 'Credit Card' | 'Finance'>('Cash');
  const [acName, setAcName] = useState('');
  const [town, setTown] = useState('');
  const [phone, setPhone] = useState('');
  const [billDate, setBillDate] = useState(new Date().toISOString().split('T')[0]);
  const [billNumber, setBillNumber] = useState('');
  const [items, setItems] = useState<BillingItem[]>([]);
  const [additionalCharges, setAdditionalCharges] = useState<AdditionalCharge[]>([]);
  const [tender, setTender] = useState(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [printOrder, setPrintOrder] = useState<(Order & { items: (import('@/types').OrderItem & { hsn_code?: string; mrp?: number })[] }) | null>(null);
  const [storeSettings, setStoreSettings] = useState<Record<string, string>>({});
  const [savedMessage, setSavedMessage] = useState(false);
  const [codeSearch, setCodeSearch] = useState('');

  useEffect(() => {
    db.products.getAll().then(setProducts);
    db.store.getSettings().then(setStoreSettings);
  }, []);

  const filtered = products.filter(
    (p) =>
      p.name.toLowerCase().includes(search.toLowerCase()) ||
      p.product_code.toLowerCase().includes(search.toLowerCase())
  );

  const addItem = (p: Product & { category_name?: string }) => {
    if (p.stock < 1) return;
    setItems((prev) => {
      const existing = prev.find((i) => i.product.id === p.id);
      if (existing) {
        if (existing.quantity >= p.stock) return prev;
        return prev.map((i) =>
          i.product.id === p.id ? { ...i, quantity: i.quantity + 1 } : i
        );
      }
      return [...prev, { product: p, quantity: 1, unit: 'pcs', rate: p.selling_price }];
    });
  };

  const updateItemQty = (productId: number, qty: number) => {
    setItems((prev) => {
      const item = prev.find((i) => i.product.id === productId);
      if (!item) return prev;
      const newQty = Math.max(0, Math.min(item.product.stock, qty));
      if (newQty === 0) return prev.filter((i) => i.product.id !== productId);
      return prev.map((i) =>
        i.product.id === productId ? { ...i, quantity: newQty } : i
      );
    });
  };

  const updateItemRate = (productId: number, rate: number) => {
    setItems((prev) => prev.map((i) =>
      i.product.id === productId ? { ...i, rate: Math.max(0, rate) } : i
    ));
  };

  const removeItem = (productId: number) => {
    setItems((prev) => prev.filter((i) => i.product.id !== productId));
  };

  const handleCodeKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      if (!codeSearch.trim()) return;
      const match = products.find(p => p.product_code.toLowerCase() === codeSearch.trim().toLowerCase());
      if (match) {
        if (match.stock < 1) {
          setError(`${match.name} is out of stock`);
          setTimeout(() => setError(''), 3000);
          return;
        }
        addItem(match);
        setCodeSearch('');
      } else {
        setError('Product not found: ' + codeSearch);
        setTimeout(() => setError(''), 3000);
      }
    }
  };

  const addAdditionalCharge = () => {
    setAdditionalCharges((prev) => [...prev, { chargeName: '', rate: 0, value: 0 }]);
  };

  const updateAdditionalCharge = (idx: number, field: keyof AdditionalCharge, val: string | number) => {
    setAdditionalCharges((prev) => {
      const next = [...prev];
      next[idx] = { ...next[idx], [field]: val };
      return next;
    });
  };

  const totals = items.reduce(
    (acc, i) => {
      const amount = i.quantity * i.rate;
      const gstAmt = amount * (i.product.gst_rate / 100);
      const netAmt = amount + gstAmt;
      return {
        qty: acc.qty + i.quantity,
        amount: acc.amount + amount,
        gstAmt: acc.gstAmt + gstAmt,
        netAmt: acc.netAmt + netAmt,
      };
    },
    { qty: 0, amount: 0, gstAmt: 0, netAmt: 0 }
  );

  const additionalTotal = additionalCharges.reduce((sum, c) => sum + c.value, 0);
  const netTotal = totals.netAmt + additionalTotal;
  const change = Math.max(0, tender - netTotal);

  const validateAndGetItems = () => {
    setError('');
    if (!acName.trim()) {
      setError('A/c Name is required');
      return null;
    }
    if (!phone.trim()) {
      setError('Phone is required');
      return null;
    }
    if (items.length === 0) {
      setError('Add at least one item');
      return null;
    }
    const outOfStock = items.find((i) => i.quantity > i.product.stock);
    if (outOfStock) {
      setError(`${outOfStock.product.name} has only ${outOfStock.product.stock} in stock`);
      return null;
    }
    return true;
  };

  const handleSave = async (andPrint: boolean) => {
    if (!validateAndGetItems()) return;
    setLoading(true);
    try {
      const order = await db.orders.create({
        customer_name: acName.trim(),
        customer_phone: phone.trim(),
        items: items.map((i) => ({
          product_id: i.product.id,
          quantity: i.quantity,
          unit_price: i.rate,
          gst_rate: i.product.gst_rate,
        })),
        additionalTotal,
      });
      setError('');
      setItems([]);
      setAdditionalCharges([]);
      setAcName('');
      setTown('');
      setPhone('');
      setTender(0);
      if (andPrint) {
        const fullOrder = await db.orders.getById(order.id);
        if (fullOrder) setPrintOrder(fullOrder);
      } else {
        setSavedMessage(true);
        setTimeout(() => setSavedMessage(false), 4000);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-4 text-sm">
      <div className="flex items-center justify-between">
      <h1 className="text-xl font-semibold text-slate-100">Billing</h1>
       
         <div className="relative max-w-md">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-slate-500" />
        <input
          type="text"
          placeholder="Search product by name or code..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="w-full pl-9 pr-4 py-2"
        />
      </div>
      </div>

      {search.trim() !== '' && (
        <div className="max-h-28 overflow-auto rounded-lg border border-slate-700 divide-y divide-slate-700">
          {filtered
            .filter((p) => p.stock > 0)
            .map((p) => (
              <div
                key={p.id}
                className="flex items-center justify-between px-3 py-1.5 hover:bg-slate-800/50"
              >
                <span className="text-slate-200">
                  {p.product_code} · {p.name} · ₹{p.selling_price.toFixed(2)} · Stock: {p.stock}
                </span>
                <button
                  type="button"
                  onClick={() => addItem(p)}
                  className="p-1.5 rounded bg-primary-600/20 text-primary-400 hover:bg-primary-600/30"
                >
                  <Plus size={14} />
                </button>
              </div>
            ))}
        </div>
      )}
      {/* Mode & Customer */}
      <div className="flex flex-wrap gap-6 p-4 rounded-xl bg-slate-800/50 border border-slate-700">
        <div>
          <span className="text-slate-500 block mb-2">Mode</span>
          <div className="flex gap-4">
            {(['Cash', 'Credit', 'Credit Card', 'Finance'] as const).map((m) => (
              <label key={m} className="flex items-center gap-2 cursor-pointer">
                <input
                  type="radio"
                  name="mode"
                  checked={mode === m}
                  onChange={() => setMode(m)}
                  className="text-primary-500"
                />
                <span className="text-slate-300">{m}</span>
              </label>
            ))}
          </div>
        </div>
        <div className="flex-1 min-w-[200px] grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div>
            <label className="text-slate-500 block mb-1">A/c Name</label>
            <input
              type="text"
              value={acName}
              onChange={(e) => setAcName(e.target.value)}
              className="w-full px-3 py-1.5 bg-slate-800 border border-slate-600 rounded text-slate-100"
              placeholder="Customer name"
            />
          </div>
          <div>
            <label className="text-slate-500 block mb-1">Town</label>
            <input
              type="text"
              value={town}
              onChange={(e) => setTown(e.target.value)}
              className="w-full px-3 py-1.5 bg-slate-800 border border-slate-600 rounded text-slate-100"
              placeholder="Town"
            />
          </div>
          <div>
            <label className="text-slate-500 block mb-1">Phone</label>
            <input
              type="text"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              className="w-full px-3 py-1.5 bg-slate-800 border border-slate-600 rounded text-slate-100"
              placeholder="Phone"
            />
          </div>
        </div>
      </div>

      {/* Invoice Details */}
      <div className="flex flex-wrap gap-6 p-4 rounded-xl bg-slate-800/50 border border-slate-700">
        <div>
          <label className="text-slate-500 block mb-1">Date</label>
          <input
            type="date"
            value={billDate}
            onChange={(e) => setBillDate(e.target.value)}
            className="px-3 py-1.5 bg-slate-800 border border-slate-600 rounded text-slate-100"
          />
        </div>
        <div>
          <label className="text-slate-500 block mb-1">Number VL</label>
          <input
            type="text"
            value={billNumber}
            onChange={(e) => setBillNumber(e.target.value)}
            className="px-3 py-1.5 bg-slate-800 border border-slate-600 rounded text-slate-100 w-24"
            placeholder="Bill #"
          />
        </div>
      </div>

      {/* Product Search */}
    

      {/* Quick Add Products */}
    

      {/* Item Billing Table */}
      <div className="rounded-xl border border-slate-700 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-slate-800/80 text-slate-400">
              <tr>
                <th className="text-left px-2 py-2 font-medium w-10">SNo</th>
                <th className="text-left px-2 py-2 font-medium w-16">Code</th>
                <th className="text-left px-2 py-2 font-medium min-w-[120px]">Item Name</th>
                <th className="text-left px-2 py-2 font-medium w-16">Unit</th>
                <th className="text-right px-2 py-2 font-medium w-20">Quantity</th>
                <th className="text-right px-2 py-2 font-medium w-24">Rate</th>
                <th className="text-right px-2 py-2 font-medium w-24">Amount</th>
                <th className="text-right px-2 py-2 font-medium w-16">GST @</th>
                <th className="text-right px-2 py-2 font-medium w-20 bg-green-900/30">GST Amt</th>
                <th className="text-right px-2 py-2 font-medium w-24">Net Amount</th>
                <th className="w-10"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-700">
              {items.map((item, idx) => {
                const amount = item.quantity * item.rate;
                const gstAmt = amount * (item.product.gst_rate / 100);
                const netAmt = amount + gstAmt;
                return (
                  <tr key={item.product.id} className="hover:bg-slate-800/40">
                    <td className="px-2 py-2 text-slate-400">{idx + 1}</td>
                    <td className="px-2 py-2 font-mono text-slate-300">{item.product.product_code}</td>
                    <td className="px-2 py-2 text-slate-200">{item.product.name}</td>
                    <td className="px-2 py-2 text-slate-400">{item.unit}</td>
                    <td className="px-2 py-2 text-right">
                      <input
                        type="number"
                        step="0.01"
                        min="0"
                        value={item.quantity}
                        onChange={(e) => updateItemQty(item.product.id, parseFloat(e.target.value) || 0)}
                        className="w-16 text-right bg-slate-800/80 border border-slate-600 rounded px-1 py-0.5 text-slate-200"
                      />
                    </td>
                    <td className="px-2 py-2 text-right">
                      <input
                        type="number"
                        step="0.01"
                        min="0"
                        value={item.rate === 0 ? '' : item.rate}
                        onChange={(e) => updateItemRate(item.product.id, parseFloat(e.target.value) || 0)}
                        className="w-20 text-right bg-slate-800/80 border border-slate-600 rounded px-1 py-0.5 text-slate-200"
                      />
                    </td>
                    <td className="px-2 py-2 text-right text-slate-300">
                      {amount.toFixed(4)}
                    </td>
                    <td className="px-2 py-2 text-right text-slate-400">
                      {item.product.gst_rate.toFixed(2)}%
                    </td>
                    <td className="px-2 py-2 text-right bg-green-900/20 text-green-300">
                      {gstAmt.toFixed(2)}
                    </td>
                    <td className="px-2 py-2 text-right text-slate-200 font-medium">
                      {netAmt.toFixed(2)}
                    </td>
                    <td className="px-2 py-2">
                      <button
                        type="button"
                        onClick={() => removeItem(item.product.id)}
                        className="p-1 rounded text-slate-500 hover:text-red-400"
                      >
                        <Trash2 size={14} />
                      </button>
                    </td>
                  </tr>
                );
              })}
              {/* Data Entry Row */}
              <tr className="hover:bg-slate-800/40 bg-slate-800/20">
                <td className="px-2 py-2 text-slate-400">{items.length + 1}</td>
                <td className="px-2 py-2">
                  <input
                    type="text"
                    value={codeSearch}
                    onChange={(e) => setCodeSearch(e.target.value)}
                    onKeyDown={handleCodeKeyDown}
                    placeholder="Code"
                    className="w-full min-w-[80px] bg-slate-900 border border-slate-600 rounded px-1.5 py-1 text-slate-200 outline-none focus:border-primary-500 focus:ring-1 focus:ring-primary-500 font-mono text-sm"
                    autoFocus
                  />
                </td>
                <td colSpan={2} className="px-2 py-2 text-slate-500 italic text-sm">
                  Press Enter to add item
                </td>
                <td className="px-2 py-2 text-right">
                  <input
                    type="text"
                    disabled
                    className="w-16 text-right bg-slate-800/40 border border-slate-700/50 rounded px-1 py-0.5 text-slate-500"
                    placeholder="-"
                  />
                </td>
                <td colSpan={6}></td>
              </tr>
            </tbody>
            {items.length > 0 && (
              <tfoot className="bg-slate-800/60 border-t-2 border-slate-600">
                <tr className="text-slate-200 font-medium">
                  <td colSpan={4} className="px-2 py-2">
                    Totals ({netTotal.toFixed(2)})
                  </td>
                  <td className="px-2 py-2 text-right">{totals.qty.toFixed(2)}</td>
                  <td className="px-2 py-2"></td>
                  <td className="px-2 py-2 text-right">{totals.amount.toFixed(2)}</td>
                  <td className="px-2 py-2"></td>
                  <td className="px-2 py-2 text-right bg-green-900/20 text-green-300">
                    {totals.gstAmt.toFixed(2)}
                  </td>
                  <td className="px-2 py-2 text-right">{totals.netAmt.toFixed(2)}</td>
                  <td></td>
                </tr>
              </tfoot>
            )}
          </table>
        </div>
      </div>

      {/* Additional Charges */}
      <div className="rounded-xl border border-slate-700 overflow-hidden">
        <div className="flex items-center justify-between px-4 py-2 bg-slate-800/60">
          <span className="text-slate-400 font-medium">Additional Charges</span>
          <button
            type="button"
            onClick={addAdditionalCharge}
            className="text-primary-400 hover:text-primary-300 text-sm flex items-center gap-1"
          >
            <Plus size={14} /> Add
          </button>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-slate-500 border-b border-slate-700">
                <th className="text-left px-4 py-2 font-medium">ChargeName</th>
                <th className="text-right px-4 py-2 font-medium w-24">Rate</th>
                <th className="text-right px-4 py-2 font-medium w-24">Value</th>
              </tr>
            </thead>
            <tbody>
              {additionalCharges.map((c, idx) => (
                <tr key={idx} className="border-b border-slate-700/50">
                  <td className="px-4 py-2">
                    <input
                      type="text"
                      value={c.chargeName}
                      onChange={(e) => updateAdditionalCharge(idx, 'chargeName', e.target.value)}
                      className="w-full bg-transparent border-b border-slate-600 py-1 text-slate-200"
                      placeholder="Charge name"
                    />
                  </td>
                  <td className="px-4 py-2">
                    <input
                      type="number"
                      step="0.01"
                      value={c.rate || ''}
                      onChange={(e) =>
                        updateAdditionalCharge(idx, 'rate', parseFloat(e.target.value) || 0)
                      }
                      className="w-full text-right bg-transparent border-b border-slate-600 py-1 text-slate-200"
                    />
                  </td>
                  <td className="px-4 py-2">
                    <input
                      type="number"
                      step="0.01"
                      value={c.value || ''}
                      onChange={(e) =>
                        updateAdditionalCharge(idx, 'value', parseFloat(e.target.value) || 0)
                      }
                      className="w-full text-right bg-transparent border-b border-slate-600 py-1 text-slate-200"
                    />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {additionalCharges.length === 0 && (
          <p className="px-4 py-3 text-slate-500 text-xs">No additional charges</p>
        )}
      </div>

      {/* Summary & Actions */}
      <div className="flex flex-wrap items-end justify-between gap-6 p-4 rounded-xl bg-slate-800/50 border border-slate-700">
        <div className="flex gap-6 items-center">
          <div>
            <label className="text-slate-500 block mb-1">Net Amt.</label>
            <span className="text-lg font-semibold text-primary-400">
              ₹{netTotal.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
            </span>
          </div>
          <div>
            <label className="text-slate-500 block mb-1">Tender</label>
            <input
              type="number"
              step="0.01"
              min="0"
              value={tender || ''}
              onChange={(e) => setTender(parseFloat(e.target.value) || 0)}
              className="w-28 px-3 py-1.5 bg-slate-800 border border-slate-600 rounded text-slate-100 text-right"
            />
          </div>
          <div>
            <label className="text-slate-500 block mb-1">Change</label>
            <span className="block w-28 px-3 py-1.5 bg-slate-900 rounded text-slate-200 text-right">
              {change.toFixed(2)}
            </span>
          </div>
        </div>
        <div className="flex gap-3">
          <button
            type="button"
            onClick={() => handleSave(false)}
            disabled={loading || items.length === 0}
            className="px-4 py-2 rounded-lg bg-primary-600 hover:bg-primary-500 text-white font-medium disabled:opacity-50 flex items-center gap-2"
          >
            <Banknote size={16} /> Save
          </button>
          <button
            type="button"
            onClick={() => handleSave(true)}
            disabled={loading || items.length === 0}
            className="px-4 py-2 rounded-lg bg-primary-600/80 hover:bg-primary-500/80 text-white font-medium disabled:opacity-50 flex items-center gap-2"
          >
            <Printer size={16} /> Save & Print
          </button>
          <button
            type="button"
            className="px-4 py-2 rounded-lg border border-slate-600 text-slate-300 hover:bg-slate-700"
          >
            Close
          </button>
        </div>
      </div>

      {error && (
        <div className="p-3 rounded-lg bg-red-500/10 border border-red-500/30 text-red-400 text-sm">
          {error}
        </div>
      )}
      {savedMessage && (
        <div className="p-3 rounded-lg bg-primary-500/10 border border-primary-500/30 text-primary-400 text-sm">
          Bill saved. View saved bills in the Orders page.
        </div>
      )}

      {printOrder && (
        <TaxInvoicePrint
          order={printOrder}
          store={storeSettings}
          billNumber={billNumber.trim() ? billNumber : `VL ${printOrder.id}`}
          onPrinted={() => setPrintOrder(null)}
        />
      )}
    </div>
  );
}
