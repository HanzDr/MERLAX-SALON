import React, { useMemo, useState } from "react";
import { X, Plus, Trash2 } from "lucide-react";

/* ------------------------- Types ------------------------- */
export type MoveRow = {
  tempId: string; // temporary key for UI rendering
  productId: string;
  movementType: "ADD" | "DEDUCT";
  reason: string;
  quantity: string;
};

export type InventoryMoveModalProps = {
  open: boolean;
  onClose: () => void;
  onSubmit: () => void;

  rows: MoveRow[];
  onAddRow: () => void;
  onRemoveRow: (tempId: string) => void;
  onChange: (tempId: string, field: keyof MoveRow, value: string) => void;

  // include packaging + currentQty so we can render "name - packaging" and validate against stock
  productOptions: {
    id: string;
    name: string;
    packaging?: string | null;
    currentQty: number; // <-- NEW
  }[];
  isSaving?: boolean;
};

/* ------------------------- Component ------------------------- */
const baseField =
  "rounded-lg border px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-black/10";
const errorField = "border-rose-400 focus:ring-rose-200";

type RowErrors = Partial<Record<keyof MoveRow, string>>;
type ErrorState = Record<string, RowErrors>;

const InventoryMoveModal: React.FC<InventoryMoveModalProps> = ({
  open,
  onClose,
  onSubmit,
  rows,
  onAddRow,
  onRemoveRow,
  onChange,
  productOptions,
  isSaving = false,
}) => {
  const [rowErrors, setRowErrors] = useState<ErrorState>({});

  const productIdSet = useMemo(
    () => new Set(productOptions.map((p) => p.id)),
    [productOptions]
  );

  const qtyById = useMemo(() => {
    const m = new Map<string, number>();
    productOptions.forEach((p) => m.set(p.id, Number(p.currentQty || 0)));
    return m;
  }, [productOptions]);

  const validateAll = (): boolean => {
    const nextErrors: ErrorState = {};

    for (const r of rows) {
      const errs: RowErrors = {};

      // Product exists
      if (!r.productId) {
        errs.productId = "Please select a product.";
      } else if (!productIdSet.has(r.productId)) {
        errs.productId = "Selected product is invalid.";
      }

      // Type
      if (!r.movementType) {
        errs.movementType = "Please choose a type.";
      } else if (r.movementType !== "ADD" && r.movementType !== "DEDUCT") {
        errs.movementType = "Type must be ADD or DEDUCT.";
      }

      // Reason
      if (!r.reason) {
        errs.reason = "Please choose a reason.";
      }

      // Quantity
      const qty = Number(r.quantity);
      if (r.quantity === "" || isNaN(qty)) {
        errs.quantity = "Enter a valid quantity.";
      } else if (qty <= 0) {
        errs.quantity = "Quantity must be greater than 0.";
      }

      // Over-deduct check
      if (!errs.quantity && r.movementType === "DEDUCT" && r.productId) {
        const available = qtyById.get(r.productId);
        if (typeof available === "number" && qty > available) {
          errs.quantity = `Cannot deduct ${qty}. Available: ${available}.`;
        }
      }

      if (Object.keys(errs).length) {
        nextErrors[r.tempId] = errs;
      }
    }

    setRowErrors(nextErrors);
    return Object.keys(nextErrors).length === 0;
  };

  const clearFieldError = (tempId: string, field: keyof MoveRow) => {
    setRowErrors((prev) => {
      if (!prev[tempId]?.[field]) return prev;
      const copy = { ...prev };
      const row = { ...(copy[tempId] || {}) };
      delete row[field];
      if (Object.keys(row).length === 0) delete copy[tempId];
      else copy[tempId] = row;
      return copy;
    });
  };

  const handleChange = (
    tempId: string,
    field: keyof MoveRow,
    value: string
  ) => {
    onChange(tempId, field, value);
    clearFieldError(tempId, field);
  };

  const handleSubmit = () => {
    if (!validateAll()) return;
    onSubmit();
  };

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-[110] flex items-center justify-center"
      role="dialog"
      aria-modal="true"
      aria-labelledby="inventory-move-title"
    >
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/40" onClick={onClose} />

      {/* Modal */}
      <div className="relative z-[111] w-[95%] max-w-4xl rounded-2xl bg-white p-6 shadow-2xl">
        {/* Header */}
        <div className="mb-4 flex items-center justify-between">
          <h2
            id="inventory-move-title"
            className="text-2xl font-bold text-gray-900"
          >
            Inventory Movement
          </h2>
          <button
            type="button"
            onClick={onClose}
            className="rounded-full p-1 hover:bg-gray-100"
          >
            <X className="h-5 w-5 text-gray-500" />
          </button>
        </div>

        {/* Table header */}
        <div className="mb-2 grid grid-cols-5 gap-2 text-sm font-semibold text-gray-600">
          <div>Product</div>
          <div>Type</div>
          <div>Reason</div>
          <div>Quantity</div>
          <div className="text-center">Action</div>
        </div>

        {/* Rows */}
        <div className="max-h-[350px] space-y-2 overflow-y-auto pr-1">
          {rows.length === 0 ? (
            <div className="rounded-xl border py-8 text-center text-gray-400">
              No items added yet.
            </div>
          ) : (
            rows.map((r) => {
              const errs = rowErrors[r.tempId] || {};
              const available = r.productId
                ? qtyById.get(r.productId)
                : undefined;

              return (
                <div
                  key={r.tempId}
                  className="grid grid-cols-5 items-start gap-2 rounded-xl border p-2"
                >
                  {/* Product */}
                  <div>
                    <select
                      className={`${baseField} ${
                        errs.productId ? errorField : ""
                      } w-full`}
                      value={r.productId}
                      onChange={(e) =>
                        handleChange(r.tempId, "productId", e.target.value)
                      }
                      aria-invalid={!!errs.productId}
                      aria-describedby={
                        errs.productId ? `${r.tempId}-prod-err` : undefined
                      }
                      required
                    >
                      <option value="">Select product</option>
                      {productOptions.map((p) => {
                        const label =
                          p.packaging && p.packaging.trim().length > 0
                            ? `${p.name} - ${p.packaging}`
                            : p.name;
                        return (
                          <option key={p.id} value={p.id} title={label}>
                            {label}
                          </option>
                        );
                      })}
                    </select>
                    {errs.productId && (
                      <p
                        id={`${r.tempId}-prod-err`}
                        className="mt-1 text-xs text-rose-600"
                      >
                        {errs.productId}
                      </p>
                    )}
                    {typeof available === "number" && (
                      <p className="mt-1 text-[11px] text-gray-500">
                        Available: {available}
                      </p>
                    )}
                  </div>

                  {/* Movement type */}
                  <div>
                    <select
                      className={`${baseField} ${
                        errs.movementType ? errorField : ""
                      } w-full`}
                      value={r.movementType}
                      onChange={(e) =>
                        handleChange(
                          r.tempId,
                          "movementType",
                          e.target.value as "ADD" | "DEDUCT"
                        )
                      }
                      aria-invalid={!!errs.movementType}
                      aria-describedby={
                        errs.movementType ? `${r.tempId}-type-err` : undefined
                      }
                      required
                    >
                      <option value="ADD">ADD</option>
                      <option value="DEDUCT">DEDUCT</option>
                    </select>
                    {errs.movementType && (
                      <p
                        id={`${r.tempId}-type-err`}
                        className="mt-1 text-xs text-rose-600"
                      >
                        {errs.movementType}
                      </p>
                    )}
                  </div>

                  {/* Reason */}
                  <div>
                    <select
                      className={`${baseField} ${
                        errs.reason ? errorField : ""
                      } w-full`}
                      value={r.reason}
                      onChange={(e) =>
                        handleChange(r.tempId, "reason", e.target.value)
                      }
                      aria-invalid={!!errs.reason}
                      aria-describedby={
                        errs.reason ? `${r.tempId}-reason-err` : undefined
                      }
                      required
                    >
                      <option value="">Select reason</option>
                      <option value="SALES">SALES</option>
                      <option value="USAGE">USAGE</option>
                      <option value="RESTOCK">RESTOCK</option>
                      <option value="ADJUSTMENT">ADJUSTMENT</option>
                      <option value="OUT">OUT</option>
                    </select>
                    {errs.reason && (
                      <p
                        id={`${r.tempId}-reason-err`}
                        className="mt-1 text-xs text-rose-600"
                      >
                        {errs.reason}
                      </p>
                    )}
                  </div>

                  {/* Quantity */}
                  <div>
                    <input
                      type="number"
                      min="1"
                      className={`${baseField} ${
                        errs.quantity ? errorField : ""
                      } w-full`}
                      value={r.quantity}
                      onChange={(e) =>
                        handleChange(r.tempId, "quantity", e.target.value)
                      }
                      placeholder="10"
                      aria-invalid={!!errs.quantity}
                      aria-describedby={
                        errs.quantity ? `${r.tempId}-qty-err` : undefined
                      }
                      required
                    />
                    {errs.quantity && (
                      <p
                        id={`${r.tempId}-qty-err`}
                        className="mt-1 text-xs text-rose-600"
                      >
                        {errs.quantity}
                      </p>
                    )}
                  </div>

                  {/* Delete */}
                  <div className="flex justify-center pt-2">
                    <button
                      type="button"
                      className="p-2 text-red-600 hover:text-red-700"
                      onClick={() => onRemoveRow(r.tempId)}
                      aria-label="Remove row"
                    >
                      <Trash2 className="h-5 w-5" />
                    </button>
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* Add button */}
        <div className="mt-4">
          <button
            type="button"
            onClick={onAddRow}
            className="inline-flex items-center gap-2 text-sm font-medium text-amber-600 hover:text-amber-700"
          >
            <Plus className="h-4 w-4" /> Add Another Product
          </button>
        </div>

        {/* Footer */}
        <div className="mt-6 flex justify-end gap-3">
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
            onClick={handleSubmit}
            disabled={isSaving || rows.length === 0}
          >
            {isSaving ? "Saving…" : "Save"}
          </button>
        </div>
      </div>
    </div>
  );
};

export default InventoryMoveModal;
