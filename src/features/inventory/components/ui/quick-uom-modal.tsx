import React from "react";
import { Trash2, Plus } from "lucide-react";

export type QuickUomModalProps = {
  open: boolean;
  onClose: () => void;

  uoms: { id: string; name: string }[];
  isLoading?: boolean;
  isMutating?: boolean;

  newName: string;
  onNewNameChange: (v: string) => void;

  onAdd: () => void;
  onDelete: (id: string) => void;
};

const fieldBase =
  "w-full rounded-xl border border-zinc-200 bg-white px-3 py-2 text-sm outline-none focus:border-zinc-300 focus:ring-2 focus:ring-amber-200";

const QuickUomModal: React.FC<QuickUomModalProps> = ({
  open,
  onClose,
  uoms,
  isLoading = false,
  isMutating = false,
  newName,
  onNewNameChange,
  onAdd,
  onDelete,
}) => {
  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-[131] grid place-items-center"
      role="dialog"
      aria-modal="true"
      aria-labelledby="quick-uom-title"
    >
      {/* Backdrop (higher than Add Product's 100) */}
      <div
        className="absolute inset-0 z-[130] bg-zinc-900/50 backdrop-blur-sm"
        onClick={onClose}
      />

      {/* Modal Card */}
      <div className="relative z-[131] w-[92%] max-w-xl overflow-hidden rounded-2xl border border-zinc-200 bg-white shadow-xl">
        {/* Header */}
        <div className="sticky top-0 border-b bg-white/80 p-5 backdrop-blur supports-[backdrop-filter]:bg-white/60">
          <h2 id="quick-uom-title" className="text-xl font-semibold">
            Packaging / Unit of Measure
          </h2>
        </div>

        {/* Body */}
        <div className="p-5">
          {/* Add new */}
          <div>
            <label className="mb-1 block text-sm text-zinc-700">
              Quick Add
            </label>
            <div className="flex gap-2">
              <input
                className={`${fieldBase} flex-1`}
                placeholder="e.g., 50ml, 500ml, 1L, Sachet"
                value={newName}
                onChange={(e) => onNewNameChange(e.target.value)}
                disabled={isMutating}
              />
              <button
                type="button"
                onClick={onAdd}
                disabled={isMutating || !newName.trim()}
                className="inline-flex items-center gap-2 rounded-xl bg-amber-400 px-4 py-2 text-sm font-semibold text-black shadow-sm hover:bg-amber-500 disabled:opacity-60 active:scale-[0.99]"
              >
                <Plus className="h-4 w-4" />
                {isMutating ? "Adding…" : "Add"}
              </button>
            </div>
          </div>

          {/* Existing list */}
          <div className="mt-6">
            <div className="mb-2 text-sm font-medium text-zinc-700">
              Existing UOMs
            </div>
            <div className="max-h-64 overflow-auto rounded-xl border border-zinc-200">
              {isLoading ? (
                <div className="p-4 text-sm text-zinc-500">Loading…</div>
              ) : uoms.length === 0 ? (
                <div className="p-4 text-sm italic text-zinc-500">
                  No UOMs yet. Add your first one above.
                </div>
              ) : (
                <ul className="divide-y divide-zinc-100">
                  {uoms.map((u) => (
                    <li
                      key={u.id}
                      className="flex items-center justify-between px-4 py-2 transition-colors hover:bg-amber-50/40"
                    >
                      <span className="text-zinc-900">{u.name}</span>
                      <button
                        type="button"
                        onClick={() => onDelete(u.id)}
                        className="rounded-lg border border-rose-200 px-2.5 py-1.5 text-xs font-semibold text-rose-700 hover:bg-rose-50 active:scale-[0.99]"
                        aria-label={`Delete ${u.name}`}
                        disabled={isMutating}
                      >
                        <span className="inline-flex items-center gap-1.5">
                          <Trash2 className="h-4 w-4" />
                          Delete
                        </span>
                      </button>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end gap-3 border-t bg-white/60 p-5">
          <button
            type="button"
            onClick={onClose}
            className="rounded-xl bg-zinc-100 px-5 py-2 text-sm font-semibold text-zinc-800 ring-1 ring-inset ring-zinc-200 hover:bg-zinc-200 active:scale-[0.99]"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};

export default QuickUomModal;
