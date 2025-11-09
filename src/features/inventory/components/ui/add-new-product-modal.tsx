import React from "react";

export type AddNewProductModalProps = {
  open: boolean;
  onClose: () => void;
  onSubmit: () => void;
  onChange: (field: keyof Values, value: string) => void;

  // opens your category manager modal in the container
  onQuickManageCategory: () => void;
  // opens your UOM manager modal in the container
  onQuickAddUom: () => void;

  // Form data owned by the container
  values: Values;
  errors?: Partial<Record<keyof Values, string>>;

  // Options provided by the container
  categoryOptions: string[];
  uomOptions: { id: string; name: string }[];

  isSaving?: boolean;
  isLoadingUoms?: boolean;
};

export type Values = {
  name: string;
  description: string;
  category: string;
  packaging: string;
  initialQuantity: string;
  sellingPrice: string;
};

const baseField =
  "w-full rounded-xl border border-zinc-200 bg-white px-3 py-2 text-sm outline-none focus:border-zinc-300 focus:ring-2 focus:ring-amber-200";

const AddNewProductModal: React.FC<AddNewProductModalProps> = ({
  open,
  onClose,
  onSubmit,
  onChange,
  onQuickManageCategory,
  onQuickAddUom,
  values,
  errors = {},
  categoryOptions,
  uomOptions,
  isSaving = false,
  isLoadingUoms = false,
}) => {
  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-[120] grid place-items-center"
      role="dialog"
      aria-modal="true"
      aria-labelledby="add-product-title"
    >
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-zinc-900/50 backdrop-blur-sm"
        onClick={onClose}
      />

      {/* Modal Card */}
      <div className="relative z-[121] w-[92%] max-w-2xl overflow-hidden rounded-2xl border border-zinc-200 bg-white shadow-xl">
        {/* Header (sticky) */}
        <div className="sticky top-0 border-b bg-white/80 p-5 backdrop-blur supports-[backdrop-filter]:bg-white/60">
          <h2 id="add-product-title" className="text-xl font-semibold">
            Add New Product
          </h2>
        </div>

        {/* Body */}
        <div className="p-5">
          <div className="grid grid-cols-1 gap-4">
            {/* Name */}
            <div>
              <label className="mb-1 block text-xs font-semibold uppercase tracking-wide text-zinc-500">
                Name
              </label>
              <input
                className={baseField}
                placeholder="e.g., Argan Oil Shampoo"
                value={values.name}
                onChange={(e) => onChange("name", e.target.value)}
              />
              {errors.name && (
                <p className="mt-1 text-sm text-rose-600">{errors.name}</p>
              )}
            </div>

            {/* Description */}
            <div>
              <label className="mb-1 block text-xs font-semibold uppercase tracking-wide text-zinc-500">
                Description
              </label>
              <input
                className={baseField}
                placeholder="Short product description"
                value={values.description}
                onChange={(e) => onChange("description", e.target.value)}
              />
              {errors.description && (
                <p className="mt-1 text-sm text-rose-600">
                  {errors.description}
                </p>
              )}
            </div>

            {/* Category + Quick Manage */}
            <div>
              <label className="mb-1 block text-xs font-semibold uppercase tracking-wide text-zinc-500">
                Category
              </label>
              <div className="flex gap-2">
                <select
                  className={`${baseField} flex-1`}
                  value={values.category}
                  onChange={(e) => onChange("category", e.target.value)}
                >
                  <option value="">Select category</option>
                  {categoryOptions.map((c) => (
                    <option key={c} value={c}>
                      {c}
                    </option>
                  ))}
                </select>
                <button
                  type="button"
                  className="rounded-xl border border-zinc-200 bg-white px-3 py-2 text-sm font-semibold text-zinc-700 hover:bg-zinc-50 active:scale-[0.99]"
                  onClick={onQuickManageCategory}
                >
                  Edit Categories
                </button>
              </div>
              {errors.category && (
                <p className="mt-1 text-sm text-rose-600">{errors.category}</p>
              )}
            </div>

            {/* Packaging / UOM + Quick Manage */}
            <div>
              <label className="mb-1 block text-xs font-semibold uppercase tracking-wide text-zinc-500">
                Packaging / UOM
              </label>
              <div className="flex gap-2">
                <select
                  className={`${baseField} flex-1`}
                  value={values.packaging}
                  onChange={(e) => onChange("packaging", e.target.value)}
                  disabled={isLoadingUoms}
                >
                  <option value="">
                    {isLoadingUoms ? "Loading..." : "Choose packaging / UOM"}
                  </option>
                  {uomOptions.map((u) => (
                    <option key={u.id} value={u.name}>
                      {u.name}
                    </option>
                  ))}
                </select>
                <button
                  type="button"
                  className="rounded-xl border border-zinc-200 bg-white px-3 py-2 text-sm font-semibold text-zinc-700 hover:bg-zinc-50 active:scale-[0.99]"
                  onClick={onQuickAddUom}
                >
                  Edit UOM
                </button>
              </div>
              {errors.packaging && (
                <p className="mt-1 text-sm text-rose-600">{errors.packaging}</p>
              )}
            </div>

            {/* Quantity & Price */}
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div>
                <label className="mb-1 block text-xs font-semibold uppercase tracking-wide text-zinc-500">
                  Initial Quantity
                </label>
                <input
                  className={baseField}
                  inputMode="numeric"
                  placeholder="10"
                  value={values.initialQuantity}
                  onChange={(e) => onChange("initialQuantity", e.target.value)}
                />
                {errors.initialQuantity && (
                  <p className="mt-1 text-sm text-rose-600">
                    {errors.initialQuantity}
                  </p>
                )}
              </div>

              <div>
                <label className="mb-1 block text-xs font-semibold uppercase tracking-wide text-zinc-500">
                  Price
                </label>
                <div className="relative">
                  <span className="pointer-events-none absolute left-3 top-2.5 text-zinc-500">
                    ₱
                  </span>
                  <input
                    className={`${baseField} pl-7`}
                    inputMode="decimal"
                    placeholder="400.00"
                    value={values.sellingPrice}
                    onChange={(e) => onChange("sellingPrice", e.target.value)}
                  />
                </div>
                {errors.sellingPrice && (
                  <p className="mt-1 text-sm text-rose-600">
                    {errors.sellingPrice}
                  </p>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Footer (sticky-ish with subtle background) */}
        <div className="flex items-center justify-end gap-3 border-t bg-white/60 p-5">
          <button
            type="button"
            className="rounded-xl bg-zinc-100 px-5 py-2 text-sm font-semibold text-zinc-800 ring-1 ring-inset ring-zinc-200 hover:bg-zinc-200"
            onClick={onClose}
            disabled={isSaving}
          >
            Cancel
          </button>
          <button
            type="button"
            className="rounded-xl bg-amber-400 px-5 py-2 text-sm font-semibold text-black shadow-sm hover:bg-amber-500 disabled:opacity-60"
            onClick={onSubmit}
            disabled={isSaving}
          >
            {isSaving ? "Saving…" : "Save"}
          </button>
        </div>
      </div>
    </div>
  );
};

export default AddNewProductModal;
