import { useForm } from '@inertiajs/react';
import Mso from '@/Pages/Absensi/Mso';

/**
 * Form dinamis: render row dari formConfig[entity].
 * Pakai useForm (controlled) → prefill edit otomatis + error server real-time.
 */
export default function MasterDataForm({ activeTab, fields, editing, onSuccess }) {
  const initial = {};
  fields.forEach((f) => {
    initial[f.name] = editing ? (editing[f.name] ?? '') : '';
  });
  const form = useForm(initial);

  const submit = (e) => {
    e.preventDefault();
    const data = {};
    fields.forEach((f) => {
      const v = form.data[f.name];
      if (f.type === 'select') data[f.name] = v ?? '';
      else if (f.type === 'number') data[f.name] = v === '' || v === null ? '' : Number(v);
      else data[f.name] = v;
    });
    if (editing) {
      form.put(`/master-data/${activeTab}/${editing.id}`, {
        preserveScroll: true,
        onSuccess,
      });
    } else {
      form.post(`/master-data/${activeTab}`, {
        preserveScroll: true,
        onSuccess,
      });
    }
  };

  return (
    <form onSubmit={submit} className="grid grid-cols-1 md:grid-cols-2 gap-space-md">
      {fields.map((f) => (
        <div key={f.name} className="flex flex-col gap-space-xs">
          <label htmlFor={f.name} className="font-label-sm text-on-surface-variant mb-space-xs block">
            {f.label}
            {f.required ? ' *' : ''}
          </label>
          {f.type === 'select' ? (
            <select
              id={f.name}
              name={f.name}
              value={form.data[f.name] ?? ''}
              onChange={(e) => form.setData(f.name, e.target.value)}
              className="w-full px-space-sm py-space-xs border border-outline-variant rounded-xl bg-surface-container-high text-on-surface focus:outline-none focus:ring-2 focus:ring-primary"
            >
              {f.options?.map((o) => (
                <option key={o.value} value={o.value}>{o.label}</option>
              ))}
            </select>
          ) : (
            <input
              id={f.name}
              name={f.name}
              type={f.type === 'number' ? 'number' : 'text'}
              value={form.data[f.name] ?? ''}
              onChange={(e) => form.setData(f.name, e.target.value)}
              className="w-full px-space-sm py-space-xs border border-outline-variant rounded-xl bg-surface-container-high text-on-surface focus:outline-none focus:ring-2 focus:ring-primary"
            />
          )}
          {form.errors?.[f.name] && (
            <span className="font-label-sm text-error mt-space-xs">{form.errors[f.name]}</span>
          )}
        </div>
      ))}

      <div className="md:col-span-2 flex justify-end gap-space-sm mt-space-md pt-space-md border-t border-outline-variant">
        <button
          type="button"
          onClick={onSuccess}
          className="px-space-md py-space-sm bg-surface-container-high text-on-surface-variant rounded-xl font-label-md font-medium hover:bg-surface-container transition-colors"
        >
          Batal
        </button>
        <button
          type="submit"
          disabled={form.processing}
          className="px-space-md py-space-sm bg-primary text-on-primary rounded-xl font-label-md font-medium hover:bg-primary/90 transition-colors flex items-center gap-space-xs shadow disabled:opacity-60"
        >
          <Mso name="save" /> Simpan
        </button>
      </div>
    </form>
  );
}
