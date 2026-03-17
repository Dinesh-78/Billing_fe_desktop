import { useEffect, useState } from "react";
import { Plus, Pencil, Trash2 } from "lucide-react";
import { db } from "@/lib/db";
import type { Tax } from "@/types";
import { COUNTRY_CODES, INDIAN_STATES } from "@/lib/constants";
import Modal from "@/components/Modal";

const emptyForm = {
  country_code: "IN",
  state_code: "",
  cgst_rate: 0,
  sgst_rate: 0,
};

export default function Tax() {
  const [taxes, setTaxes] = useState<Tax[]>([]);
  const [modal, setModal] = useState<"add" | "edit" | null>(null);
  const [editing, setEditing] = useState<Tax | null>(null);
  const [form, setForm] = useState(emptyForm);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const load = async () => {
    const data = await db.taxes.getAll();
    setTaxes(data);
  };

  useEffect(() => {
    load();
  }, []);

  useEffect(() => {
    if (editing) {
      setForm({
        country_code: editing.country_code,
        state_code: editing.state_code,
        cgst_rate: editing.cgst_rate,
        sgst_rate: editing.sgst_rate,
      });
    } else {
      setForm(emptyForm);
    }
  }, [editing]);

  const update = (k: keyof typeof form, v: string | number) => {
    setForm((prev) => ({ ...prev, [k]: v }));
    setError("");
  };

  const updateGst = (gst: number) => {
    const half = gst / 2;
    setForm((prev) => ({ ...prev, cgst_rate: half, sgst_rate: half }));
    setError("");
  };

  const gstValue = form.cgst_rate + form.sgst_rate;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      if (editing) {
        await db.taxes.update(editing.id, form);
      } else {
        await db.taxes.create(form);
      }
      setModal(null);
      setEditing(null);
      load();
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Failed to save. Country + State combination may already exist.",
      );
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (t: Tax) => {
    if (
      !confirm(
        `Delete tax for ${t.country_code} / ${t.state_code || "(blank)"}?`,
      )
    )
      return;
    await db.taxes.delete(t.id);
    load();
  };

  const TaxForm = () => (
    <form onSubmit={handleSubmit} className="space-y-4">
      {error && (
        <div className="p-3 rounded-lg bg-red-500/10 border border-red-500/30 text-red-400 text-sm">
          {error}
        </div>
      )}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div>
          <label>Country Code <span className="text-red-400">*</span></label>
          <select
            value={form.country_code}
            onChange={(e) => update("country_code", e.target.value)}
          >
            {COUNTRY_CODES.map((cc) => (
              <option key={cc} value={cc}>
                {cc}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label>State Code <span className="text-red-400">*</span></label>
          <select
            value={form.state_code}
            onChange={(e) => update("state_code", e.target.value)}
          >
            <option value="">—</option>
            {form.country_code === "IN" &&
              INDIAN_STATES.map((st) => (
                <option key={st} value={st}>
                  {st}
                </option>
              ))}
            {form.country_code !== "IN" && (
              <option value={form.state_code || ""}>
                {form.state_code || "Custom"}
              </option>
            )}
          </select>
        </div>
      </div>
      <div>
        <label>GST Rate (%) <span className="text-red-400">*</span></label>
        <input
          type="number"
          step="0.01"
          min="0"
          max="100"
          value={gstValue || ""}
          onChange={(e) => updateGst(parseFloat(e.target.value) || 0)}
          placeholder="e.g. 5 (splits into CGST 2.5% + SGST 2.5%)"
        />
        <p className="text-xs text-slate-500 mt-1">
          Split equally into CGST and SGST
        </p>
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
      <div>
        <label>CGST Rate (%) <span className="text-red-400">*</span></label>
        <input
          type="number"
          step="0.01"
          min="0"
          max="100"
          value={form.cgst_rate || ""}
          onChange={(e) => update("cgst_rate", parseFloat(e.target.value) || 0)}
        />
      </div>
      <div>
        <label>SGST Rate (%) <span className="text-red-400">*</span></label>
        <input
          type="number"
          step="0.01"
          min="0"
          max="100"
          value={form.sgst_rate || ""}
          onChange={(e) => update("sgst_rate", parseFloat(e.target.value) || 0)}
        />
      </div>
      </div>

      <div className="flex justify-end gap-3 pt-4 border-t border-slate-700">
        <button
          type="button"
          onClick={() => {
            setModal(null);
            setEditing(null);
          }}
          className="px-4 py-2 rounded-lg border border-slate-600 text-slate-300 hover:bg-slate-700 transition-colors"
        >
          Cancel
        </button>
        <button
          type="submit"
          disabled={loading}
          className="px-4 py-2 rounded-lg bg-primary-600 hover:bg-primary-500 text-white font-medium disabled:opacity-50 transition-colors"
        >
          {loading ? "Saving..." : editing ? "Update" : "Add Tax"}
        </button>
      </div>
    </form>
  );

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold text-slate-100">Tax</h1>
          <p className="text-slate-500 text-sm mt-1">
            Manage tax rates by country and state
          </p>
        </div>
        <button
          onClick={() => {
            setEditing(null);
            setModal("add");
          }}
          className="inline-flex items-center gap-2 px-4 py-2 bg-primary-600 hover:bg-primary-500 text-white rounded-lg font-medium transition-colors"
        >
          <Plus size={18} />
          Add Tax
        </button>
      </div>

      <div className="rounded-xl border border-slate-700 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-slate-800/80 text-slate-400">
              <tr>
                <th className="text-left px-4 py-3 font-medium">
                  Country Code
                </th>
                <th className="text-left px-4 py-3 font-medium">State Code</th>
                <th className="text-right px-4 py-3 font-medium">GST (%)</th>
                <th className="text-right px-4 py-3 font-medium">CGST (%)</th>
                <th className="text-right px-4 py-3 font-medium">SGST (%)</th>
                <th className="text-right px-4 py-3 font-medium w-24">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-700">
              {taxes.map((t) => (
                <tr key={t.id} className="hover:bg-slate-800/40">
                  <td className="px-4 py-3 font-mono text-slate-300">
                    {t.country_code}
                  </td>
                  <td className="px-4 py-3 text-slate-400">
                    {t.state_code || "—"}
                  </td>
                  <td className="px-4 py-3 text-right text-slate-300">
                    {t.cgst_rate + t.sgst_rate || 0}%
                  </td>
                  <td className="px-4 py-3 text-right text-slate-300">
                    {t.cgst_rate}%
                  </td>
                  <td className="px-4 py-3 text-right text-slate-300">
                    {t.sgst_rate}%
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center justify-end gap-1">
                      <button
                        onClick={() => {
                          setEditing(t);
                          setModal("edit");
                        }}
                        className="p-2 rounded-lg hover:bg-slate-700 text-slate-400 hover:text-slate-200"
                        title="Edit"
                      >
                        <Pencil size={16} />
                      </button>
                      <button
                        onClick={() => handleDelete(t)}
                        className="p-2 rounded-lg hover:bg-red-500/20 text-slate-400 hover:text-red-400"
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
        {taxes.length === 0 && (
          <p className="text-center py-12 text-slate-500">
            No tax rates added yet
          </p>
        )}
      </div>

      <Modal
        open={modal !== null}
        onClose={() => {
          setModal(null);
          setEditing(null);
        }}
        title={editing ? "Edit Tax" : "Add Tax"}
      >
        <TaxForm />
      </Modal>
    </div>
  );
}
