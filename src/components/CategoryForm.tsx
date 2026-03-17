import { useState, useEffect } from 'react';
import { db } from '@/lib/db';
import { COUNTRY_CODES, INDIAN_STATES } from '@/lib/constants';
import type { Category } from '@/types';

interface CategoryFormProps {
  initialData?: Category;
  onSubmit: () => void;
  onCancel: () => void;
}

const emptyForm = {
  name: '',
  image_path: '',
  country_code: 'IN',
  state_code: '',
  cgst_rate: 0,
  sgst_rate: 0,
};

export default function CategoryForm({ initialData, onSubmit, onCancel }: CategoryFormProps) {
  const [form, setForm] = useState(emptyForm);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (initialData) {
      setForm({
        name: initialData.name,
        image_path: initialData.image_path ?? '',
        country_code: initialData.country_code,
        state_code: initialData.state_code,
        cgst_rate: initialData.cgst_rate,
        sgst_rate: initialData.sgst_rate,
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
    if (!form.name.trim()) {
      setError('Category name is required');
      return;
    }
    setLoading(true);
    try {
      if (initialData) {
        await db.categories.update(initialData.id, {
          ...form,
          image_path: form.image_path || null,
        });
      } else {
        await db.categories.create({
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
      <div>
        <label>Category Name *</label>
        <input
          type="text"
          value={form.name}
          onChange={(e) => update('name', e.target.value)}
          placeholder="e.g. Groceries"
          required
        />
      </div>
      <div>
        <label>Category Image (URL or path)</label>
        <input
          type="text"
          value={form.image_path}
          onChange={(e) => update('image_path', e.target.value)}
          placeholder="https://... or file path"
        />
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
      
       
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
          {loading ? 'Saving...' : initialData ? 'Update' : 'Add Category'}
        </button>
      </div>
    </form>
  );
}
