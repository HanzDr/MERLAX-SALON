import React, { useMemo, useState } from "react";
import { X, Plus, Trash2 } from "lucide-react";

/* ------------------------- Types ------------------------- */
export type MoveRow = {
  tempId: string;
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

  productOptions: {
    id: string;
    name: string;
    packaging?: string | null;
    currentQty: number;
  }[];
  isSaving?: boolean;
};

/* ------------------------- UI helpers ------------------------- */
const baseField =
  "rounded-xl border border-zinc-200 bg-white/80 px-3 py-2 text-sm shadow-sm outline-none focus:ring-2 focus:ring-amber-200";
const errorField = "border-rose-400 focus:ring-rose-200";

type RowErrors = Partial<Record<keyof MoveRow, string>>;
type ErrorState = Record<string, RowErrors>;

/* ------------------------- Component ------------------------- */
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

      if (!r.productId) {
        errs.productId = "Please select a product.";
      } else if (!productIdSet.has(r.productId)) {
        errs.productId = "Selected product is invalid.";
      }

      if (!r.movementType) {
        errs.movementType = "Please choose a type.";
      } else if (!["ADD", "DEDUCT"].includes(r.movementType)) {
        errs.movementType = "Type must be ADD or DEDUCT.";
      }

      if (!r.reason) {
        errs.reason = "Please choose a reason.";
      }

      const qty = Number(r.quantity);
      if (r.quantity === "" || Number.isNaN(qty)) {
        errs.quantity = "Enter a valid quantity.";
      } else if (qty <= 0) {
        errs.quantity = "Quantity must be greater than 0.";
      }

      if (!errs.quantity && r.movementType === "DEDUCT" && r.productId) {
        const available = qtyById.get(r.productId);
        if (typeof available === "number" && qty > available) {
          errs.quantity = `Cannot deduct ${qty}. Available: ${available}.`;
        }
      }

      if (Object.keys(errs).length) nextErrors[r.tempId] = errs;
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

  /* ------------- little computed details for the header ------------- */
  const addCount = rows.filter((r) => r.movementType === "ADD").length;
  const deductCount = rows.filter((r) => r.movementType === "DEDUCT").length;

  return (
    <div
      className="fixed inset-0 z-[130] grid place-items-center"
      role="dialog"
      aria-modal="true"
      aria-labelledby="inventory-move-title"
    >
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-zinc-900/50 backdrop-blur-sm"
        onClick={onClose}
      />

      {/* Modal shell */}
      <div className="relative z-[131] w-[96%] max-w-5xl overflow-hidden rounded-2xl border border-white/20 bg-white/90 shadow-2xl backdrop-blur-xl">
        {/* Header */}
        <div className="sticky top-0 z-10 flex items-center justify-between gap-3 border-b border-zinc-200/60 bg-white/70 px-5 py-4 backdrop-blur-xl">
          <div>
            <h2
              id="inventory-move-title"
              className="text-xl sm:text-2xl font-bold text-zinc-900"
            >
              Inventory Movement
            </h2>
            <p className="text-xs text-zinc-500">
              Create one or more stock adjustments in a single batch
            </p>
          </div>

          <div className="flex items-center gap-2">
            <span className="hidden sm:inline-flex items-center gap-1 rounded-full bg-emerald-50 px-3 py-1 text-xs font-semibold text-emerald-700 ring-1 ring-inset ring-emerald-200">
              +ADD: {addCount}
            </span>
            <span className="hidden sm:inline-flex items-center gap-1 rounded-full bg-rose-50 px-3 py-1 text-xs font-semibold text-rose-700 ring-1 ring-inset ring-rose-200">
              −DEDUCT: {deductCount}
            </span>
            <button
              type="button"
              onClick={onClose}
              className="rounded-xl p-2 text-zinc-500 hover:bg-zinc-100"
              aria-label="Close"
            >
              <X className="h-5 w-5" />
            </button>
          </div>
        </div>

        {/* Column labels */}
        <div className="hidden grid-cols-[2fr_110px_160px_140px_80px] gap-3 px-5 py-3 text-[11px] font-semibold uppercase tracking-wide text-zinc-500 sm:grid md:grid-cols-[2fr_130px_200px_160px_90px]">
          <div>Product</div>
          <div>Type</div>
          <div>Reason</div>
          <div>Quantity</div>
          <div className="text-center">Action</div>
        </div>

        {/* Rows */}
        <div className="max-h-[60vh] space-y-3 overflow-y-auto px-5 pb-5">
          {rows.length === 0 ? (
            <div className="my-6 grid place-items-center rounded-2xl border border-dashed border-amber-300/60 bg-amber-50/50 p-8 text-center">
              <div className="text-sm font-medium text-amber-900">
                No items added yet
              </div>
              <p className="mt-1 text-xs text-amber-700/80">
                Click “Add Item” to start a movement.
              </p>
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
                  className={[
                    "grid gap-3 rounded-2xl border border-zinc-200 bg-white/80 p-3 shadow-sm transition-colors",
                    "hover:bg-amber-50/40",
                    "sm:grid-cols-[2fr_110px_160px_1fr_80px]",
                    "md:grid-cols-[2fr_130px_200px_1fr_90px]",
                  ].join(" ")}
                >
                  {/* Product */}
                  <div>
                    <label className="mb-1 block text-[11px] font-semibold uppercase tracking-wide text-zinc-500 sm:hidden">
                      Product
                    </label>
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
                            ? `${p.name} – ${p.packaging}`
                            : p.name;
                        return (
                          <option key={p.id} value={p.id} title={label}>
                            {label}
                          </option>
                        );
                      })}
                    </select>
                    {typeof available === "number" && (
                      <div className="mt-1 text-[11px] text-zinc-500">
                        Available: {available}
                      </div>
                    )}
                    {errs.productId && (
                      <p
                        id={`${r.tempId}-prod-err`}
                        className="mt-1 text-xs text-rose-600"
                      >
                        {errs.productId}
                      </p>
                    )}
                  </div>

                  {/* Movement type — pill select */}
                  <div>
                    <label className="mb-1 block text-[11px] font-semibold uppercase tracking-wide text-zinc-500 sm:hidden">
                      Type
                    </label>
                    <div className="grid grid-cols-2 gap-1 rounded-xl bg-zinc-100 p-1">
                      {(["ADD", "DEDUCT"] as const).map((opt) => {
                        const active = r.movementType === opt;
                        const common =
                          "rounded-lg px-2 py-2 text-center text-xs font-semibold transition";
                        const activeCls =
                          opt === "ADD"
                            ? "bg-emerald-600 text-white shadow"
                            : "bg-rose-600 text-white shadow";
                        const idleCls =
                          "bg-white text-zinc-700 hover:bg-zinc-50";
                        return (
                          <button
                            key={opt}
                            type="button"
                            onClick={() =>
                              handleChange(r.tempId, "movementType", opt)
                            }
                            className={`${common} ${
                              active ? activeCls : idleCls
                            }`}
                            aria-pressed={active}
                          >
                            {opt}
                          </button>
                        );
                      })}
                    </div>
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
                    <label className="mb-1 block text-[11px] font-semibold uppercase tracking-wide text-zinc-500 sm:hidden">
                      Reason
                    </label>
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
                    <label className="mb-1 block text-[11px] font-semibold uppercase tracking-wide text-zinc-500 sm:hidden">
                      Quantity
                    </label>
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
                  <div className="flex items-center justify-center sm:justify-end">
                    <button
                      type="button"
                      className="inline-flex items-center gap-1 rounded-lg border border-rose-200 px-3 py-2 text-xs font-semibold text-rose-700 hover:bg-rose-50 active:scale-[0.99]"
                      onClick={() => onRemoveRow(r.tempId)}
                      aria-label="Remove row"
                    >
                      <Trash2 className="h-4 w-4" />
                      Remove
                    </button>
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* Bottom bar */}
        <div className="flex flex-col gap-3 border-t border-zinc-200/60 bg-white/70 px-5 py-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={onAddRow}
              className="inline-flex items-center gap-2 rounded-xl border border-amber-300/60 bg-amber-50 px-4 py-2 text-sm font-semibold text-amber-800 shadow-sm hover:bg-amber-100 active:scale-[0.99] transition"
            >
              <Plus className="h-4 w-4" /> Add Item
            </button>
            <span className="text-xs text-zinc-500">
              {rows.length} {rows.length === 1 ? "line" : "lines"}
            </span>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              className="rounded-xl border border-zinc-300 bg-white px-5 py-2 text-sm font-semibold text-zinc-800 hover:bg-zinc-50"
              onClick={onClose}
              disabled={isSaving}
            >
              Cancel
            </button>
            <button
              type="button"
              className="rounded-xl bg-amber-500 px-5 py-2 text-sm font-semibold text-white shadow-sm hover:bg-amber-600 disabled:opacity-60"
              onClick={handleSubmit}
              disabled={isSaving || rows.length === 0}
            >
              {isSaving ? "Saving…" : "Save Movement"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default InventoryMoveModal;
