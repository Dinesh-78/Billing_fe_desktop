import { useEffect, useState } from 'react';
import { Package, FolderTree, ShoppingCart, Users, TrendingUp } from 'lucide-react';
import { Link } from 'react-router-dom';
import { db } from '@/lib/db';

export default function Dashboard() {
  const [stats, setStats] = useState({
    products: 0,
    categories: 0,
    orders: 0,
    customers: 0,
    totalRevenue: 0,
    recentOrders: [] as { id: number; customer_name: string; total_amount: number; purchase_date: string }[],
  });

  useEffect(() => {
    const load = async () => {
      const [products, categories, orders, customers] = await Promise.all([
        db.products.getAll(),
        db.categories.getAll(),
        db.orders.getAll(),
        db.customers.getAll(),
      ]);
      const totalRevenue = orders.reduce((sum, o) => sum + o.total_amount, 0);
      setStats({
        products: products.length,
        categories: categories.length,
        orders: orders.length,
        customers: customers.length,
        totalRevenue,
        recentOrders: orders.slice(0, 5),
      });
    };
    load();
  }, []);

  const cards = [
    { label: 'Products', value: stats.products, icon: Package, to: '/products', iconClass: 'text-primary-400' },
    { label: 'Categories', value: stats.categories, icon: FolderTree, to: '/categories', iconClass: 'text-blue-400' },
    { label: 'Orders', value: stats.orders, icon: ShoppingCart, to: '/orders', iconClass: 'text-amber-400' },
    { label: 'Customers', value: stats.customers, icon: Users, to: '/customers', iconClass: 'text-violet-400' },
  ];

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-semibold text-slate-100">Dashboard</h1>
        <p className="text-slate-500 mt-1">Overview of your shop</p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {cards.map(({ label, value, icon: Icon, to, iconClass }) => (
          <Link
            key={to}
            to={to}
            className="block p-4 rounded-xl bg-slate-800/50 border border-slate-700 hover:border-slate-600 transition-colors"
          >
            <div className="flex items-center justify-between">
              <span className="text-slate-400 text-sm font-medium">{label}</span>
              <Icon size={20} className={iconClass} />
            </div>
            <p className="text-2xl font-semibold text-slate-100 mt-2">{value}</p>
          </Link>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="p-6 rounded-xl bg-slate-800/50 border border-slate-700">
          <div className="flex items-center gap-2 mb-4">
            <TrendingUp size={20} className="text-primary-400" />
            <h2 className="text-lg font-semibold text-slate-100">Total Revenue</h2>
          </div>
          <p className="text-3xl font-bold text-primary-400">₹{stats.totalRevenue.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</p>
        </div>

        <div className="p-6 rounded-xl bg-slate-800/50 border border-slate-700">
          <h2 className="text-lg font-semibold text-slate-100 mb-4">Recent Orders</h2>
          {stats.recentOrders.length === 0 ? (
            <p className="text-slate-500 text-sm">No orders yet</p>
          ) : (
            <ul className="space-y-2">
              {stats.recentOrders.map((o) => (
                <li key={o.id} className="flex justify-between text-sm">
                  <span className="text-slate-300">{o.customer_name}</span>
                  <span className="text-primary-400">₹{o.total_amount.toFixed(2)}</span>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </div>
  );
}
