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
  "w-full rounded-xl border border-zinc-200 bg-white px-3 py-2 text-sm outline-none focus:border-zinc-300 focus:ring-2 focus:ring-amber-200";

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
      className="fixed inset-0 z-[120] grid place-items-center"
      role="dialog"
      aria-modal="true"
      aria-labelledby="quick-category-title"
    >
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-zinc-900/50 backdrop-blur-sm"
        onClick={onClose}
      />

      {/* Modal Card */}
      <div className="relative z-[121] w-[92%] max-w-xl overflow-hidden rounded-2xl border border-zinc-200 bg-white shadow-xl">
        {/* Header (sticky) */}
        <div className="sticky top-0 flex items-center justify-between border-b bg-white/80 p-5 backdrop-blur supports-[backdrop-filter]:bg-white/60">
          <h2 id="quick-category-title" className="text-xl font-semibold">
            Manage Categories
          </h2>
          <button
            type="button"
            onClick={onClose}
            className="rounded-full p-1 hover:bg-zinc-100"
            aria-label="Close"
          >
            <X className="h-5 w-5 text-zinc-600" />
          </button>
        </div>

        {/* Body */}
        <div className="p-5">
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
              className="inline-flex items-center gap-2 rounded-xl bg-amber-400 px-4 py-2 text-sm font-semibold text-black shadow-sm hover:bg-amber-500 disabled:opacity-60 active:scale-[0.99]"
              onClick={onAdd}
              disabled={isMutating || !newName.trim()}
            >
              <Plus className="h-4 w-4" />
              Add
            </button>
          </div>

          {/* List */}
          <div className="max-h-[320px] overflow-y-auto rounded-xl border border-zinc-200">
            {isLoading ? (
              <div className="p-4 text-center text-sm text-zinc-500">
                Loading…
              </div>
            ) : categories.length === 0 ? (
              <div className="p-6 text-center text-zinc-500">
                No categories yet.
              </div>
            ) : (
              <ul className="divide-y divide-zinc-100">
                {categories.map((c) => (
                  <li
                    key={c.id}
                    className="flex items-center justify-between p-3 transition-colors hover:bg-amber-50/40"
                  >
                    <span className="font-medium text-zinc-900">{c.name}</span>
                    <button
                      className="rounded-lg border border-rose-200 px-2.5 py-1.5 text-xs font-semibold text-rose-700 hover:bg-rose-50 active:scale-[0.99] disabled:opacity-60"
                      onClick={() => onDelete(c.id)}
                      aria-label={`Delete ${c.name}`}
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

        {/* Footer */}
        <div className="flex items-center justify-end gap-3 border-t bg-white/60 p-5">
          <button
            type="button"
            className="rounded-xl bg-zinc-100 px-5 py-2 text-sm font-semibold text-zinc-800 ring-1 ring-inset ring-zinc-200 hover:bg-zinc-200 active:scale-[0.99]"
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
