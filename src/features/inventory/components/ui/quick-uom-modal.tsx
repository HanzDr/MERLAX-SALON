import React from "react";
import { Trash2, Plus } from "lucide-react";

export type QuickUomModalProps = {
  open: boolean;
  onClose: () => void;

  // data provided by the page/hook
  uoms: { id: string; name: string }[];
  isLoading?: boolean;
  isMutating?: boolean;

  // controlled input for new UOM name
  newName: string;
  onNewNameChange: (v: string) => void;

  // actions provided by the page/hook
  onAdd: () => void; // add the current newName
  onDelete: (id: string) => void; // delete a UOM by id
};

const fieldBase =
  "w-full rounded-xl border px-3 py-2 outline-none focus:ring-2 focus:ring-black/10";

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
      className="fixed inset-0 z-[110] flex items-center justify-center"
      role="dialog"
      aria-modal="true"
      aria-labelledby="quick-uom-title"
    >
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/40" onClick={onClose} />

      {/* Modal */}
      <div className="relative z-[111] w-[92%] max-w-xl rounded-2xl bg-white p-6 shadow-2xl">
        <h2 id="quick-uom-title" className="text-xl font-bold">
          Packaging / Unit of Measure
        </h2>

        {/* Add new */}
        <div className="mt-4">
          <label className="block text-sm text-gray-700 mb-1">Quick Add</label>
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
              className="inline-flex items-center gap-2 rounded-xl bg-black px-4 py-2 text-sm font-semibold text-white hover:opacity-90 disabled:opacity-60"
            >
              <Plus className="h-4 w-4" />
              {isMutating ? "Adding…" : "Add"}
            </button>
          </div>
        </div>

        {/* Existing list */}
        <div className="mt-6">
          <div className="text-sm font-medium text-gray-700 mb-2">
            Existing UOMs
          </div>
          <div className="max-h-64 overflow-auto rounded-xl border">
            {isLoading ? (
              <div className="p-4 text-sm text-gray-500">Loading…</div>
            ) : uoms.length === 0 ? (
              <div className="p-4 text-sm text-gray-500 italic">
                No UOMs yet. Add your first one above.
              </div>
            ) : (
              <ul className="divide-y">
                {uoms.map((u) => (
                  <li
                    key={u.id}
                    className="flex items-center justify-between px-4 py-2"
                  >
                    <span className="text-gray-800">{u.name}</span>
                    <button
                      type="button"
                      onClick={() => onDelete(u.id)}
                      className="text-red-600 hover:text-red-700"
                      aria-label={`Delete ${u.name}`}
                      disabled={isMutating}
                    >
                      <Trash2 className="h-5 w-5" />
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>

        {/* Actions */}
        <div className="mt-6 flex justify-end">
          <button
            type="button"
            onClick={onClose}
            className="rounded-xl bg-black px-5 py-2 text-sm font-semibold text-white hover:opacity-90"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};

export default QuickUomModal;
