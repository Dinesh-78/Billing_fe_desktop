import { HashRouter, Routes, Route, NavLink } from 'react-router-dom';
import { LayoutDashboard, Package, FolderTree, ShoppingCart, Users, Receipt, FileText } from 'lucide-react';
import { clsx } from 'clsx';
import Products from '@/pages/Products';
import Categories from '@/pages/Categories';
import Orders from '@/pages/Orders';
import Customers from '@/pages/Customers';
import Tax from '@/pages/Tax';
import Billing from '@/pages/Billing';
import Dashboard from '@/pages/Dashboard';
import LowStockAlert from '@/components/LowStockAlert';

const navItems = [
  { to: '/', icon: LayoutDashboard, label: 'Dashboard' },
  { to: '/products', icon: Package, label: 'Products' },
  { to: '/categories', icon: FolderTree, label: 'Categories' },
  { to: '/billing', icon: FileText, label: 'Billing' },
  { to: '/orders', icon: ShoppingCart, label: 'Orders' },
  { to: '/customers', icon: Users, label: 'Customers' },
  { to: '/tax', icon: Receipt, label: 'Tax' },
];

export default function App() {
  return (
    <HashRouter>
      <div className="flex h-screen overflow-hidden bg-slate-950">
        <aside className="w-56 flex-shrink-0 border-r border-slate-800 bg-slate-900/50 flex flex-col">
          <div className="p-4 border-b border-slate-800">
            <h1 className="text-lg font-semibold text-primary-400 tracking-tight">Billing Desktop</h1>
            <p className="text-xs text-slate-500 mt-0.5">Offline Shop Management</p>
          </div>
          <nav className="flex-1 p-2 space-y-0.5 overflow-auto">
            {navItems.map(({ to, icon: Icon, label }) => (
              <NavLink
                key={to}
                to={to}
                className={({ isActive }) =>
                  clsx(
                    'flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-colors',
                    isActive
                      ? 'bg-primary-600/20 text-primary-400 border border-primary-500/30'
                      : 'text-slate-400 hover:bg-slate-800 hover:text-slate-200'
                  )
                }
              >
                <Icon size={18} strokeWidth={2} />
                {label}
              </NavLink>
            ))}
          </nav>
        </aside>
        <main className="flex-1 flex flex-col overflow-hidden">
          <LowStockAlert />
          <div className="flex-1 overflow-auto p-6">
            <Routes>
              <Route path="/" element={<Dashboard />} />
              <Route path="/products" element={<Products />} />
              <Route path="/categories" element={<Categories />} />
              <Route path="/billing" element={<Billing />} />
              <Route path="/orders" element={<Orders />} />
              <Route path="/customers" element={<Customers />} />
              <Route path="/tax" element={<Tax />} />
            </Routes>
          </div>
        </main>
      </div>
    </HashRouter>
  );
}
