import { useEffect, useState } from 'react';
import { Plus, Pencil, Trash2, Image as ImageIcon } from 'lucide-react';
import { db } from '@/lib/db';
import type { Category } from '@/types';
import Modal from '@/components/Modal';
import CategoryForm from '@/components/CategoryForm';

export default function Categories() {
  const [categories, setCategories] = useState<Category[]>([]);
  const [modal, setModal] = useState<'add' | 'edit' | null>(null);
  const [editing, setEditing] = useState<Category | null>(null);
  const [loading, setLoading] = useState(true);

  const load = async () => {
    setLoading(true);
    const data = await db.categories.getAll();
    setCategories(data);
    setLoading(false);
  };

  useEffect(() => {
    load();
  }, []);

  const handleDelete = async (c: Category) => {
    if (!confirm(`Delete category "${c.name}"? Products must be reassigned first.`)) return;
    const ok = await db.categories.delete(c.id);
    if (ok) load();
    else alert('Cannot delete: category has products');
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold text-slate-100">Categories</h1>
          <p className="text-slate-500 text-sm mt-1">Manage product categories with GST rates</p>
        </div>
        <button
          onClick={() => {
            setEditing(null);
            setModal('add');
          }}
          className="inline-flex items-center gap-2 px-4 py-2 bg-primary-600 hover:bg-primary-500 text-white rounded-lg font-medium transition-colors"
        >
          <Plus size={18} />
          Add Category
        </button>
      </div>

      {loading ? (
        <p className="text-slate-500">Loading...</p>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {categories.map((c) => (
            <div
              key={c.id}
              className="p-4 rounded-xl border border-slate-700 bg-slate-800/50 hover:border-slate-600 transition-colors"
            >
              <div className="flex items-start justify-between gap-3">
                <div className="flex items-center gap-3 min-w-0">
                  {c.image_path ? (
                    <img
                      src={c.image_path}
                      alt=""
                      className="w-12 h-12 rounded-lg object-cover bg-slate-700 flex-shrink-0"
                    />
                  ) : (
                    <div className="w-12 h-12 rounded-lg bg-slate-700 flex items-center justify-center flex-shrink-0">
                      <ImageIcon size={20} className="text-slate-500" />
                    </div>
                  )}
                  <div className="min-w-0">
                    <h3 className="font-medium text-slate-200 truncate">{c.name}</h3>
                    <p className="text-xs text-slate-500">
                      {c.country_code} / {c.state_code} · CGST {c.cgst_rate}% · SGST {c.sgst_rate}%
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-1 flex-shrink-0">
                  <button
                    onClick={() => {
                      setEditing(c);
                      setModal('edit');
                    }}
                    className="p-2 rounded-lg hover:bg-slate-700 text-slate-400 hover:text-slate-200"
                    title="Edit"
                  >
                    <Pencil size={16} />
                  </button>
                  {c.name !== 'Uncategorized' && (
                    <button
                      onClick={() => handleDelete(c)}
                      className="p-2 rounded-lg hover:bg-red-500/20 text-slate-400 hover:text-red-400"
                      title="Delete"
                    >
                      <Trash2 size={16} />
                    </button>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      <Modal open={modal !== null} onClose={() => setModal(null)} title={modal === 'add' ? 'Add Category' : 'Edit Category'}>
        <CategoryForm
          initialData={editing ?? undefined}
          onSubmit={() => {
            setModal(null);
            setEditing(null);
            load();
          }}
          onCancel={() => setModal(null)}
        />
      </Modal>
    </div>
  );
}
