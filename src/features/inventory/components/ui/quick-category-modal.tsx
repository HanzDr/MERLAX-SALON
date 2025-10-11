import React from "react";
import { X, Plus, Trash2 } from "lucide-react";

export type QuickCategoryModalProps = {
  open: boolean;
  onClose: () => void;

  categories: { id: string; name: string }[];
  isLoading?: boolean;
  isMutating?: boolean;

  newName: string;
  onNewNameChange: (v: string) => void;

  onAdd: () => Promise<void> | void;
  onDelete: (id: string) => Promise<void> | void;
};

const fieldBase =
  "w-full rounded-lg border px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-black/10";

const QuickCategoryModal: React.FC<QuickCategoryModalProps> = ({
  open,
  onClose,
  categories,
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
      className="fixed inset-0 z-[120] flex items-center justify-center"
      role="dialog"
      aria-modal="true"
      aria-labelledby="quick-category-title"
    >
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/40" onClick={onClose} />

      {/* Modal */}
      <div className="relative z-[121] w-[92%] max-w-xl rounded-2xl bg-white p-6 shadow-2xl">
        <div className="mb-4 flex items-center justify-between">
          <h2 id="quick-category-title" className="text-xl font-bold">
            Manage Categories
          </h2>
          <button
            type="button"
            onClick={onClose}
            className="rounded-full p-1 hover:bg-gray-100"
          >
            <X className="h-5 w-5 text-gray-500" />
          </button>
        </div>

        {/* Add new */}
        <div className="mb-4 flex gap-2">
          <input
            className={fieldBase}
            placeholder="New category name"
            value={newName}
            onChange={(e) => onNewNameChange(e.target.value)}
            disabled={isMutating}
          />
          <button
            type="button"
            className="inline-flex items-center gap-2 rounded-xl bg-amber-400 px-4 py-2 text-sm font-semibold text-white hover:bg-amber-500 disabled:opacity-60"
            onClick={onAdd}
            disabled={isMutating || !newName.trim()}
          >
            <Plus className="h-4 w-4" /> Add
          </button>
        </div>

        {/* List */}
        <div className="max-h-[320px] overflow-y-auto rounded-xl border">
          {isLoading ? (
            <div className="p-4 text-center text-sm text-gray-500">
              Loading…
            </div>
          ) : categories.length === 0 ? (
            <div className="p-6 text-center text-gray-500">
              No categories yet.
            </div>
          ) : (
            <ul className="divide-y">
              {categories.map((c) => (
                <li
                  key={c.id}
                  className="flex items-center justify-between p-3"
                >
                  <span className="font-medium text-gray-800">{c.name}</span>
                  <button
                    className="p-2 text-rose-600 hover:text-rose-700"
                    onClick={() => onDelete(c.id)}
                    aria-label={`Delete ${c.name}`}
                    disabled={isMutating}
                  >
                    <Trash2 className="h-5 w-5" />
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>

        {/* Footer */}
        <div className="mt-4 flex justify-end">
          <button
            type="button"
            className="rounded-xl bg-black px-5 py-2 text-sm font-semibold text-white hover:opacity-90"
            onClick={onClose}
            disabled={isMutating}
          >
            Done
          </button>
        </div>
      </div>
    </div>
  );
};

export default QuickCategoryModal;
