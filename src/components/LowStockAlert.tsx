import { useEffect, useState } from 'react';
import { AlertTriangle, X } from 'lucide-react';
import { db } from '@/lib/db';
import type { Product } from '@/types';

export default function LowStockAlert() {
  const [products, setProducts] = useState<Product[]>([]);
  const [dismissed, setDismissed] = useState(false);

  useEffect(() => {
    const load = async () => {
      try {
        const lowStock = await db.products.getLowStock();
        setProducts(lowStock);
      } catch {
        setProducts([]);
      }
    };
    load();
  }, []);

  if (products.length === 0 || dismissed) return null;

  return (
    <div className="flex items-center justify-between gap-4 px-4 py-2 bg-amber-500/10 border-b border-amber-500/30 text-amber-200">
      <div className="flex items-center gap-2">
        <AlertTriangle size={18} className="text-amber-400 flex-shrink-0" />
        <span className="text-sm font-medium">
          Low stock alert: {products.length} product{products.length > 1 ? 's' : ''} below threshold
          {products.length <= 3 && (
            <span className="text-amber-300/80 ml-1">
              ({products.map((p) => `${p.name} (${p.stock})`).join(', ')})
            </span>
          )}
        </span>
      </div>
      <button
        onClick={() => setDismissed(true)}
        className="p-1 rounded hover:bg-amber-500/20 text-amber-400 transition-colors"
        aria-label="Dismiss"
      >
        <X size={16} />
      </button>
    </div>
  );
}
