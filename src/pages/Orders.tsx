import { useEffect, useState } from 'react';
import { Plus, Eye, Search, Printer } from 'lucide-react';
import { db } from '@/lib/db';
import TaxInvoicePrint from '@/components/TaxInvoicePrint';
import type { Order } from '@/types';
import Modal from '@/components/Modal';
import OrderForm from '@/components/OrderForm';

export default function Orders() {
  const [orders, setOrders] = useState<Order[]>([]);
  const [search, setSearch] = useState('');
  const [modal, setModal] = useState<'add' | 'view' | null>(null);
  const [selectedOrder, setSelectedOrder] = useState<(Order & { items?: import('@/types').OrderItem[] }) | null>(null);
  const [loading, setLoading] = useState(true);
  const [storeSettings, setStoreSettings] = useState<Record<string, string>>({});
  const [printOrder, setPrintOrder] = useState<(Order & { items?: import('@/types').OrderItem[] }) | null>(null);

  useEffect(() => {
    db.store.getSettings().then(setStoreSettings);
  }, []);

  const load = async () => {
    setLoading(true);
    const data = await db.orders.getAll();
    setOrders(data);
    setLoading(false);
  };

  useEffect(() => {
    load();
  }, []);

  const filtered = orders.filter(
    (o) =>
      o.customer_name.toLowerCase().includes(search.toLowerCase()) ||
      o.customer_phone.includes(search)
  );

  const handleView = async (o: Order) => {
    const full = await db.orders.getById(o.id);
    setSelectedOrder(full ?? null);
    setModal('view');
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold text-slate-100">Orders</h1>
          <p className="text-slate-500 text-sm mt-1">View and create invoices</p>
        </div>
        <button
          onClick={() => setModal('add')}
          className="inline-flex items-center gap-2 px-4 py-2 bg-primary-600 hover:bg-primary-500 text-white rounded-lg font-medium transition-colors"
        >
          <Plus size={18} />
          New Order
        </button>
      </div>

      <div className="relative max-w-sm">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-slate-500" />
        <input
          type="text"
          placeholder="Search by customer..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
         className="w-full pl-9 pr-4 py-2 max-w-sm rounded-lg bg-slate-800 border border-slate-600 text-slate-100 placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent transition"
        />
      </div>

      {loading ? (
        <p className="text-slate-500">Loading...</p>
      ) : (
        <div className="rounded-xl border border-slate-700 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-slate-800/80 text-slate-400">
                <tr>
                  <th className="text-left px-4 py-3 font-medium">Date</th>
                  <th className="text-left px-4 py-3 font-medium">Customer</th>
                  <th className="text-left px-4 py-3 font-medium">Phone</th>
                  <th className="text-right px-4 py-3 font-medium">Total</th>
                  <th className="text-right px-4 py-3 font-medium w-20">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-700">
                {filtered.map((o) => (
                  <tr key={o.id} className="hover:bg-slate-800/40">
                    <td className="px-4 py-3 text-slate-300">{o.purchase_date}</td>
                    <td className="px-4 py-3 text-slate-200">{o.customer_name}</td>
                    <td className="px-4 py-3 text-slate-400">{o.customer_phone}</td>
                    <td className="px-4 py-3 text-right font-medium text-primary-400">
                      ₹{o.total_amount.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                    </td>
                    <td className="px-4 py-3">
                      <button
                        onClick={() => handleView(o)}
                        className="p-2 rounded-lg hover:bg-slate-700 text-slate-400 hover:text-slate-200 transition-colors"
                        title="View"
                      >
                        <Eye size={16} />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {filtered.length === 0 && (
            <p className="text-center py-12 text-slate-500">No orders found</p>
          )}
        </div>
      )}

      <Modal open={modal === 'add'} onClose={() => setModal(null)} title="New Order">
        <OrderForm
          onSubmit={() => {
            setModal(null);
            load();
          }}
          onCancel={() => setModal(null)}
        />
      </Modal>

      <Modal open={modal === 'view'} onClose={() => setModal(null)} title={`Order #${selectedOrder?.id ?? ''}`}>
        {selectedOrder && (
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <span className="text-slate-500">Customer</span>
                <p className="text-slate-200 font-medium">{selectedOrder.customer_name}</p>
              </div>
              <div>
                <span className="text-slate-500">Phone</span>
                <p className="text-slate-200 font-medium">{selectedOrder.customer_phone}</p>
              </div>
              <div>
                <span className="text-slate-500">Date</span>
                <p className="text-slate-200 font-medium">{selectedOrder.purchase_date}</p>
              </div>
              <div>
                <span className="text-slate-500">Total</span>
                <p className="text-primary-400 font-semibold">₹{selectedOrder.total_amount.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</p>
              </div>
            </div>
            {selectedOrder.items && selectedOrder.items.length > 0 && (
              <div>
                <h3 className="text-sm font-medium text-slate-400 mb-2">Items</h3>
                <table className="w-full text-sm">
                  <thead>
                    <tr className="text-slate-500 border-b border-slate-700">
                      <th className="text-left py-2">Product</th>
                      <th className="text-right py-2">Qty</th>
                      <th className="text-right py-2">Price</th>
                      <th className="text-right py-2">Total</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-700">
                    {selectedOrder.items.map((item) => (
                      <tr key={item.product_id}>
                        <td className="py-2 text-slate-200">{item.product_name}</td>
                        <td className="text-right text-slate-400">{item.quantity}</td>
                        <td className="text-right text-slate-400">₹{item.unit_price.toFixed(2)}</td>
                        <td className="text-right text-slate-200">₹{item.total.toFixed(2)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
            <div className="flex justify-end pt-4">
              <button
                onClick={() => selectedOrder && setPrintOrder(selectedOrder)}
                className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-primary-600 hover:bg-primary-500 text-white font-medium"
              >
                <Printer size={16} />
                Print / Save PDF
              </button>
            </div>
          </div>
        )}
      </Modal>

      {printOrder && printOrder.items && (
        <TaxInvoicePrint
          order={printOrder}
          store={storeSettings}
          billNumber={`VL ${printOrder.id}`}
          onPrinted={() => setPrintOrder(null)}
        />
      )}
    </div>
  );
}
