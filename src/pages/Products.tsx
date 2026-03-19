import { useEffect, useState, useRef } from 'react';
import { Plus, Pencil, Trash2, Search, Image as ImageIcon, Mic } from 'lucide-react';
import { db } from '@/lib/db';
import type { Product, Category } from '@/types';
import ProductForm from '@/components/ProductForm';
import Modal from '@/components/Modal';
import clsx from 'clsx';

type ProductWithCategory = Product & { category_name: string };

export default function Products() {
  const [products, setProducts] = useState<ProductWithCategory[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [search, setSearch] = useState('');
  const [modal, setModal] = useState<'add' | 'edit' | null>(null);
  const [editingProduct, setEditingProduct] = useState<ProductWithCategory | null>(null);
  const [loading, setLoading] = useState(true);
  const [listening, setListening] = useState(false);
  const recognitionRef = useRef<any>(null);
  const isManualStop = useRef(false);
  const SpeechRecognition =
    (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;

  const toggleVoiceSearch = () => {
    if (listening && recognitionRef.current) {
      isManualStop.current = true;
      recognitionRef.current.stop();
      setListening(false);
      return;
    }

    if (!SpeechRecognition) {
      alert("Speech Recognition not supported in this browser");
      return;
    }

    const recognition = new SpeechRecognition();
    recognition.continuous = true;
    recognition.interimResults = true;
    recognition.lang = "en-IN";

    isManualStop.current = false;

    recognition.onresult = (event: any) => {
      let transcript = '';
      for (let i = 0; i < event.results.length; i++) {
        transcript += event.results[i][0].transcript;
      }
      setSearch(transcript);
    };

    recognition.onerror = () => {
      setListening(false);
    };

    recognition.onend = () => {
      setListening(false);
    };

    recognition.start();
    recognitionRef.current = recognition;
    setListening(true);
  };

  const loadData = async () => {
    setLoading(true);
    const [prods, cats] = await Promise.all([db.products.getAll(), db.categories.getAll()]);
    setProducts(prods);
    setCategories(cats);
    setLoading(false);
  };

  useEffect(() => {
    loadData();
  }, []);

  const filtered = products.filter(
    (p) =>
      p.name.toLowerCase().includes(search.toLowerCase()) ||
      p.product_code.toLowerCase().includes(search.toLowerCase())
  );

  const handleAdd = () => {
    setEditingProduct(null);
    setModal('add');
  };

  const handleEdit = (p: ProductWithCategory) => {
    setEditingProduct(p);
    setModal('edit');
  };

  const handleDelete = async (p: ProductWithCategory) => {
    if (!confirm(`Delete product "${p.name}"? This cannot be undone if no invoices reference it.`)) return;
    const result = await db.products.delete(p.id);
    if (result.success) {
      loadData();
    } else {
      alert(result.error ?? 'Failed to delete');
    }
  };

  const handleFormSubmit = async () => {
    setModal(null);
    setEditingProduct(null);
    loadData();
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold text-slate-100">Products</h1>
          <p className="text-slate-500 text-sm mt-1">Manage your product catalog</p>
        </div>
        <button
          onClick={handleAdd}
          className="inline-flex items-center gap-2 px-4 py-2 bg-primary-600 hover:bg-primary-500 text-white rounded-lg font-medium transition-colors"
        >
          <Plus size={18} />
          Add Product
        </button>
      </div>

      <div className="relative w-full max-w-md group">
        <Search className="absolute left-4 top-1/2 -translate-y-1/2 size-4 text-slate-400 group-focus-within:text-primary-400 transition-colors z-10 pointer-events-none" />
        <input
          type="text"
          placeholder="Search by name or code..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="w-full pl-11 pr-10 py-2 bg-slate-800/80 hover:bg-slate-700/80 focus:bg-slate-900 border border-slate-700/60 hover:border-slate-600/80 focus:border-primary-500/50 rounded-full text-sm text-slate-200 placeholder-slate-400 transition-all duration-200 outline-none focus:ring-2 focus:ring-primary-500/20 shadow-[0_2px_10px_rgba(0,0,0,0.2)] focus:shadow-[0_4px_14px_rgba(0,0,0,0.3)] backdrop-blur-md relative"
        />
        <button
          type="button"
          onClick={toggleVoiceSearch}
          className={`absolute right-2 top-1/2 -translate-y-1/2 p-1.5 rounded-full transition-colors z-10 ${listening ? 'bg-red-500/20 text-red-500 animate-pulse' : 'text-slate-400 hover:text-primary-400 hover:bg-slate-700/50'}`}
          title="Voice Search"
        >
          <Mic size={15} />
        </button>
      </div>

      {loading ? (
        <p className="text-slate-500">Loading...</p>
      ) : (
        <div className="rounded-xl border border-slate-700 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-slate-800/80 text-slate-400">
                <tr>
                  <th className="text-left px-4 py-3 font-medium">Code</th>
                  <th className="text-left px-4 py-3 font-medium">Name</th>
                  <th className="text-left px-4 py-3 font-medium">Category</th>
                  <th className="text-right px-4 py-3 font-medium">Stock</th>
                  <th className="text-right px-4 py-3 font-medium">Price</th>
                  <th className="text-right px-4 py-3 font-medium">MRP</th>
                  <th className="text-right px-4 py-3 font-medium w-24">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-700">
                {filtered.map((p) => (
                  <tr key={p.id} className="hover:bg-slate-800/40">
                    <td className="px-4 py-3 font-mono text-slate-300">{p.product_code}</td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        {p.image_path ? (
                          <img
                            src={p.image_path}
                            alt=""
                            className="w-8 h-8 rounded object-cover bg-slate-700"
                          />
                        ) : (
                          <div className="w-8 h-8 rounded bg-slate-700 flex items-center justify-center">
                            <ImageIcon size={14} className="text-slate-500" />
                          </div>
                        )}
                        <span className="text-slate-200">{p.name}</span>
                      </div>
                    </td>
                    <td className="px-4 py-3 text-slate-400">{p.category_name ?? '-'}</td>
                    <td className="px-4 py-3 text-right">
                      <span
                        className={clsx(
                          'font-medium',
                          p.stock <= p.low_stock_threshold ? 'text-amber-400' : 'text-slate-300'
                        )}
                      >
                        {p.stock}
                        {p.stock <= p.low_stock_threshold && (
                          <span className="text-amber-500/80 ml-1 text-xs">(low)</span>
                        )}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-right text-slate-300">₹{p.selling_price.toFixed(2)}</td>
                    <td className="px-4 py-3 text-right text-slate-400">₹{p.mrp.toFixed(2)}</td>
                    <td className="px-4 py-3">
                      <div className="flex items-center justify-end gap-1">
                        <button
                          onClick={() => handleEdit(p)}
                          className="p-2 rounded-lg hover:bg-slate-700 text-slate-400 hover:text-slate-200 transition-colors"
                          title="Edit"
                        >
                          <Pencil size={16} />
                        </button>
                        <button
                          onClick={() => handleDelete(p)}
                          className="p-2 rounded-lg hover:bg-red-500/20 text-slate-400 hover:text-red-400 transition-colors"
                          title="Delete"
                        >
                          <Trash2 size={16} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {filtered.length === 0 && (
            <p className="text-center py-12 text-slate-500">No products found</p>
          )}
        </div>
      )}

      <Modal open={modal !== null} onClose={() => setModal(null)} title={modal === 'add' ? 'Add Product' : 'Edit Product'}>
        <ProductForm
          categories={categories}
          initialData={editingProduct ?? undefined}
          onSubmit={handleFormSubmit}
          onCancel={() => setModal(null)}
        />
      </Modal>
    </div>
  );
}
