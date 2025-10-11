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

const fieldBase =
  "w-full rounded-xl border px-3 py-2 outline-none focus:ring-2 focus:ring-black/10";

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
      className="fixed inset-0 z-[100] flex items-center justify-center"
      role="dialog"
      aria-modal="true"
      aria-labelledby="add-product-title"
    >
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/40" onClick={onClose} />

      {/* Modal */}
      <div className="relative z-[101] w-[92%] max-w-2xl rounded-2xl bg-white p-6 shadow-2xl">
        <h2 id="add-product-title" className="text-2xl font-bold">
          Add New Product
        </h2>

        <div className="mt-6 grid grid-cols-1 gap-4">
          {/* Name */}
          <div>
            <label className="mb-1 block text-sm text-gray-700">Name</label>
            <input
              className={fieldBase}
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
            <label className="mb-1 block text-sm text-gray-700">
              Description
            </label>
            <input
              className={fieldBase}
              placeholder="Short product description"
              value={values.description}
              onChange={(e) => onChange("description", e.target.value)}
            />
            {errors.description && (
              <p className="mt-1 text-sm text-rose-600">{errors.description}</p>
            )}
          </div>

          {/* Category + Quick Manage */}
          <div>
            <label className="mb-1 block text-sm text-gray-700">Category</label>
            <div className="flex gap-2">
              <select
                className={`${fieldBase} flex-1`}
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
                className="rounded-xl border px-3 py-2 text-sm font-medium hover:bg-gray-50"
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
            <label className="mb-1 block text-sm text-gray-700">
              Packaging / UOM
            </label>
            <div className="flex gap-2">
              <select
                className={`${fieldBase} flex-1`}
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
                className="rounded-xl border px-3 py-2 text-sm font-medium hover:bg-gray-50"
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
              <label className="mb-1 block text-sm text-gray-700">
                Initial Quantity
              </label>
              <input
                className={fieldBase}
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
              <label className="mb-1 block text-sm text-gray-700">Price</label>
              <div className="relative">
                <span className="pointer-events-none absolute left-3 top-2.5 text-gray-500">
                  ₱
                </span>
                <input
                  className={`${fieldBase} pl-7`}
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

          {/* Actions */}
          <div className="mt-2 flex items-center justify-end gap-3">
            <button
              type="button"
              className="rounded-xl bg-black px-5 py-2 text-sm font-semibold text-white hover:opacity-90"
              onClick={onClose}
              disabled={isSaving}
            >
              Cancel
            </button>
            <button
              type="button"
              className="rounded-xl bg-amber-400 px-5 py-2 text-sm font-semibold text-white hover:bg-amber-500 disabled:opacity-60"
              onClick={onSubmit}
              disabled={isSaving}
            >
              {isSaving ? "Saving…" : "Save"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AddNewProductModal;
