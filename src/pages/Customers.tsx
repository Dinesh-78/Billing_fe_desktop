import { useEffect, useState } from 'react';
import { Search } from 'lucide-react';
import { db } from '@/lib/db';
import type { Customer } from '@/types';

export default function Customers() {
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      const data = await db.customers.getAll();
      setCustomers(data);
      setLoading(false);
    };
    load();
  }, []);

  const filtered = customers.filter(
    (c) =>
      c.name.toLowerCase().includes(search.toLowerCase()) ||
      c.phone_number.includes(search)
  );

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold text-slate-100">Customers</h1>
        <p className="text-slate-500 text-sm mt-1">Customers with their purchase history</p>
      </div>

      <div className="relative max-w-sm">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-slate-500" />
        <input
          type="text"
          placeholder="Search by name or phone..."
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
                  <th className="text-left px-4 py-3 font-medium">Customer Name</th>
                  <th className="text-left px-4 py-3 font-medium">Phone Number</th>
                  <th className="text-right px-4 py-3 font-medium">Total Purchases</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-700">
                {filtered.map((c) => (
                  <tr key={c.id} className="hover:bg-slate-800/40">
                    <td className="px-4 py-3 text-slate-200 font-medium">{c.name}</td>
                    <td className="px-4 py-3 text-slate-400">{c.phone_number}</td>
                    <td className="px-4 py-3 text-right font-medium text-primary-400">
                      ₹{c.total_purchases.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {filtered.length === 0 && (
            <p className="text-center py-12 text-slate-500">No customers found</p>
          )}
        </div>
      )}
    </div>
  );
}
