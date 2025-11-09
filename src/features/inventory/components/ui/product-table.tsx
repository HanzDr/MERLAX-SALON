import React, { useState } from "react";
import { Trash2, AlertTriangle, X } from "lucide-react";
import { supabase } from "@/lib/supabaseclient";

export type ProductRow = {
  id: string;
  name: string;
  category: string;
  description: string;
  packaging: string;
  quantity: number;
  price: number; // unit price
  lastUpdated: string;
  image?: string | null;
  lowStockLevel?: number | null;
};

type Props = {
  rows: ProductRow[];

  // Search
  search: string;
  onSearchChange: (v: string) => void;

  // Pagination (controlled)
  page: number; // 1-based
  pageSize: number;
  total: number;
  pageSizeOptions?: number[];
  onPageChange: (nextPage: number) => void;
  onPageSizeChange: (size: number) => void;

  // Actions
  onDelete?: (id: string) => void;

  // Visuals
  loading?: boolean;
  currencyPrefix?: string;

  // Refresh hook after edit
  onEdited?: () => void | Promise<void>;

  // Filters (controlled by parent)
  categoryOptions?: string[];
  categoryFilter: string; // "" means all
  onCategoryFilterChange: (v: string) => void;

  lowStockFilter: "all" | "low" | "notlow";
  onLowStockFilterChange: (v: "all" | "low" | "notlow") => void;
};

const formatDateFriendly = (input: string) => {
  const d = new Date(input);
  if (Number.isNaN(d.getTime())) return input;
  return d
    .toLocaleDateString(undefined, {
      month: "short",
      day: "numeric",
      year: "numeric",
    })
    .replace(/,/g, "");
};

type EditState = {
  open: boolean;
  id: string;
  name: string;
  description: string;
  price: string; // unit price (editable)
  lowStockLevel: string;
};

const ProductTable: React.FC<Props> = ({
  rows,
  search,
  onSearchChange,
  page,
  pageSize,
  total,
  pageSizeOptions = [5, 10, 20],
  onPageChange,
  onPageSizeChange,
  onDelete,
  loading = false,
  currencyPrefix = "₱",
  onEdited,

  categoryOptions = [],
  categoryFilter,
  onCategoryFilterChange,

  lowStockFilter,
  onLowStockFilterChange,
}) => {
  const totalPages = Math.max(1, Math.ceil(total / pageSize));

  const [edit, setEdit] = useState<EditState>({
    open: false,
    id: "",
    name: "",
    description: "",
    price: "",
    lowStockLevel: "",
  });

  const [savingEdit, setSavingEdit] = useState(false);
  const [editErrors, setEditErrors] = useState<{
    description?: string;
    price?: string;
    lowStockLevel?: string;
  }>({});

  const startEdit = (row: ProductRow) => {
    setEditErrors({});
    const hasLow =
      typeof row.lowStockLevel === "number" &&
      Number.isFinite(row.lowStockLevel);
    setEdit({
      open: true,
      id: row.id,
      name: row.name,
      description: row.description ?? "",
      price:
        row.price != null && Number.isFinite(row.price)
          ? String(row.price)
          : "",
      lowStockLevel: hasLow ? String(row.lowStockLevel) : "",
    });
  };

  const closeEdit = () => setEdit((e) => ({ ...e, open: false }));

  const validateEdit = (): boolean => {
    const errs: typeof editErrors = {};
    const priceNum = Number(edit.price);
    if (edit.price === "" || !Number.isFinite(priceNum) || priceNum < 0) {
      errs.price = "Price must be a non-negative number.";
    }
    if (edit.lowStockLevel !== "") {
      const lvl = Number(edit.lowStockLevel);
      if (!Number.isNaN(lvl) && lvl < 0) {
        errs.lowStockLevel = "Low stock level must be a non-negative number.";
      }
      if (Number.isNaN(lvl)) {
        errs.lowStockLevel = "Low stock level must be a number.";
      }
    }
    setEditErrors(errs);
    return Object.keys(errs).length === 0;
  };

  const saveEdit = async () => {
    if (!validateEdit()) return;

    setSavingEdit(true);
    try {
      const payload: Record<string, any> = {
        description: (edit.description ?? "").trim(),
        price: Number(edit.price),
        lowStockLevel:
          edit.lowStockLevel === "" ? null : Number(edit.lowStockLevel),
      };

      const { error } = await supabase
        .from("Products")
        .update(payload)
        .eq("product_id", edit.id);

      if (error) throw error;

      closeEdit();
      await onEdited?.();
    } catch (e: any) {
      alert(e?.message ?? "Failed to update product.");
    } finally {
      setSavingEdit(false);
    }
  };

  const fmtMoney = (n: number) =>
    n.toLocaleString(undefined, {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    });

  return (
    <div className="w-full rounded-2xl border border-zinc-200 bg-white shadow-sm">
      {/* Header controls */}
      <div className="flex flex-col gap-3 border-b border-zinc-100 p-4 md:flex-row md:items-center md:justify-between">
        {/* Left: page size */}
        <div className="inline-flex items-center gap-2 rounded-xl bg-zinc-50 px-2 py-1 ring-1 ring-inset ring-zinc-200">
          <span className="px-2 text-sm text-zinc-600">Rows</span>
          <select
            value={pageSize}
            onChange={(e) => onPageSizeChange(Number(e.target.value))}
            className="rounded-lg bg-white px-2 py-1 text-sm outline-none focus:ring-2 focus:ring-amber-200"
          >
            {pageSizeOptions.map((n) => (
              <option key={n} value={n}>
                {n}
              </option>
            ))}
          </select>
        </div>

        {/* Right: search + filters */}
        <div className="flex w-full flex-col gap-2 sm:w-auto sm:flex-row sm:items-center">
          {/* Search */}
          <div className="relative w-full sm:w-64">
            <input
              value={search}
              onChange={(e) => onSearchChange(e.target.value)}
              placeholder="Search products…"
              className="w-full rounded-xl border border-zinc-200 bg-white px-10 py-2 text-sm outline-none focus:border-zinc-300 focus:ring-2 focus:ring-amber-200"
            />
            <svg
              className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-zinc-500"
              fill="none"
              stroke="currentColor"
              strokeWidth={2}
              viewBox="0 0 24 24"
              aria-hidden
            >
              <circle cx="11" cy="11" r="8" />
              <path d="m21 21-4.3-4.3" />
            </svg>
          </div>

          {/* Category filter */}
          <select
            value={categoryFilter}
            onChange={(e) => onCategoryFilterChange(e.target.value)}
            className="rounded-xl border border-zinc-200 bg-white px-3 py-2 text-sm outline-none focus:border-zinc-300 focus:ring-2 focus:ring-amber-200"
            title="Filter by category"
          >
            <option value="">All Categories</option>
            {categoryOptions.map((cat) => (
              <option key={cat} value={cat}>
                {cat}
              </option>
            ))}
          </select>

          {/* Low stock filter */}
          <select
            value={lowStockFilter}
            onChange={(e) =>
              onLowStockFilterChange(e.target.value as "all" | "low" | "notlow")
            }
            className="rounded-xl border border-zinc-200 bg-white px-3 py-2 text-sm outline-none focus:border-zinc-300 focus:ring-2 focus:ring-amber-200"
            title="Filter by low stock"
          >
            <option value="all">All Stock</option>
            <option value="low">Low Only</option>
            <option value="notlow">Not Low</option>
          </select>
        </div>
      </div>

      {/* Table */}
      <div className="overflow-x-auto">
        <table className="w-full text-left text-sm">
          <thead className="sticky top-0 z-10 bg-white/90 backdrop-blur supports-[backdrop-filter]:bg-white/70">
            <tr className="text-zinc-600">
              <Th>Product</Th>
              <Th>Category</Th>
              <Th>Description</Th>
              <Th>Packaging</Th>
              <Th className="text-right">Quantity</Th>
              <Th className="text-right">Total Price</Th>
              <Th>Last Updated</Th>
              <Th className="text-center">Action</Th>
            </tr>
          </thead>

          <tbody className="divide-y divide-zinc-100">
            {loading ? (
              <SkeletonRows />
            ) : rows.length === 0 ? (
              <tr>
                <td colSpan={8} className="py-8 text-center text-zinc-500">
                  No products found.
                </td>
              </tr>
            ) : (
              rows.map((p, idx) => {
                const hasLow =
                  typeof p.lowStockLevel === "number" &&
                  Number.isFinite(p.lowStockLevel);
                const belowLow =
                  hasLow && p.quantity <= (p.lowStockLevel as number);

                const unitPrice = Number(p.price) || 0;
                const totalPrice = unitPrice * (Number(p.quantity) || 0);

                return (
                  <tr
                    key={p.id}
                    className={[
                      "transition-colors hover:bg-amber-50/40",
                      idx % 2 === 0 ? "bg-white" : "bg-zinc-50/50",
                    ].join(" ")}
                  >
                    <Td className="font-medium text-zinc-900">
                      <div className="flex items-center gap-2">
                        {p.name}
                        {belowLow && (
                          <span
                            title="At or below low stock level"
                            className="inline-flex items-center gap-1 rounded-full bg-rose-50 px-2 py-0.5 text-[11px] font-semibold text-rose-700 ring-1 ring-inset ring-rose-200"
                          >
                            <AlertTriangle className="h-3 w-3" />
                            Low Stock Level
                          </span>
                        )}
                      </div>
                    </Td>

                    <Td className="text-zinc-700">{p.category}</Td>
                    <Td className="text-zinc-700">
                      {p.description || (
                        <span className="text-zinc-400">—</span>
                      )}
                    </Td>
                    <Td className="text-zinc-700">{p.packaging || "—"}</Td>

                    <Td className="text-right tabular-nums text-zinc-900">
                      {p.quantity}
                    </Td>

                    <Td className="text-right tabular-nums text-zinc-900">
                      <div className="inline-flex flex-col items-end">
                        <div>
                          {currencyPrefix}
                          {fmtMoney(totalPrice)}
                        </div>
                        <div className="text-[11px] text-zinc-500">
                          ({currencyPrefix}
                          {fmtMoney(unitPrice)} each)
                        </div>
                      </div>
                    </Td>

                    <Td className="text-zinc-700" title={p.lastUpdated}>
                      {formatDateFriendly(p.lastUpdated)}
                    </Td>

                    <Td className="text-center">
                      <div className="inline-flex items-center justify-center gap-2">
                        <button
                          className="rounded-lg border border-zinc-200 px-2.5 py-1.5 text-xs font-semibold text-zinc-700 hover:bg-zinc-50 active:scale-[0.99]"
                          onClick={() => startEdit(p)}
                          aria-label={`Edit ${p.name}`}
                          title="Edit product"
                        >
                          Edit
                        </button>

                        <button
                          className="rounded-lg border border-rose-200 px-2.5 py-1.5 text-xs font-semibold text-rose-700 hover:bg-rose-50 active:scale-[0.99]"
                          onClick={() => onDelete?.(p.id)}
                          aria-label={`Delete ${p.name}`}
                          title="Delete product"
                        >
                          <span className="inline-flex items-center gap-1.5">
                            <Trash2 className="h-4 w-4" />
                          </span>
                        </button>
                      </div>
                    </Td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      {/* Footer / Pagination */}
      <div className="flex flex-col items-center gap-3 border-t border-zinc-100 p-4 sm:flex-row sm:justify-between">
        <div className="text-sm text-zinc-600">
          Showing <b className="text-zinc-900">{rows.length}</b> of{" "}
          <b className="text-zinc-900">{total}</b> entries
        </div>

        <nav className="inline-flex items-center gap-1" aria-label="Pagination">
          <PagerButton
            onClick={() => onPageChange(1)}
            disabled={page <= 1}
            ariaLabel="First"
          >
            «
          </PagerButton>
          <PagerButton
            onClick={() => onPageChange(page - 1)}
            disabled={page <= 1}
            ariaLabel="Previous"
          >
            ‹
          </PagerButton>
          <span className="mx-2 select-none text-sm text-zinc-600">
            Page <b className="text-zinc-900">{page}</b> of{" "}
            <b className="text-zinc-900">{totalPages}</b>
          </span>
          <PagerButton
            onClick={() => onPageChange(page + 1)}
            disabled={page >= totalPages}
            ariaLabel="Next"
          >
            ›
          </PagerButton>
          <PagerButton
            onClick={() => onPageChange(totalPages)}
            disabled={page >= totalPages}
            ariaLabel="Last"
          >
            »
          </PagerButton>
        </nav>
      </div>

      {/* Edit Modal */}
      {edit.open && (
        <div
          className="fixed inset-0 z-[120] grid place-items-center"
          role="dialog"
          aria-modal="true"
          aria-labelledby="edit-product-title"
        >
          <div
            className="absolute inset-0 bg-zinc-900/50 backdrop-blur-sm"
            onClick={closeEdit}
          />
          <div className="relative z-[121] w-[92%] max-w-lg overflow-hidden rounded-2xl border border-zinc-200 bg-white shadow-xl">
            {/* Header */}
            <div className="sticky top-0 border-b bg-white/80 p-5 backdrop-blur supports-[backdrop-filter]:bg-white/60">
              <div className="flex items-center justify-between">
                <h3 id="edit-product-title" className="text-xl font-semibold">
                  Edit “{edit.name}”
                </h3>
                <button
                  type="button"
                  onClick={closeEdit}
                  className="rounded-full p-1 text-zinc-500 hover:bg-zinc-100"
                  aria-label="Close"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>
            </div>

            {/* Body */}
            <div className="p-5 space-y-4">
              <div>
                <label className="mb-1 block text-sm text-zinc-700">
                  Description
                </label>
                <input
                  className="w-full rounded-xl border border-zinc-200 px-3 py-2 outline-none focus:border-zinc-300 focus:ring-2 focus:ring-amber-200"
                  value={edit.description}
                  onChange={(e) =>
                    setEdit((s) => ({ ...s, description: e.target.value }))
                  }
                  placeholder="Short description"
                />
                {editErrors.description && (
                  <p className="mt-1 text-sm text-rose-600">
                    {editErrors.description}
                  </p>
                )}
              </div>

              <div>
                <label className="mb-1 block text-sm text-zinc-700">
                  Unit Price
                </label>
                <div className="relative">
                  <span className="pointer-events-none absolute left-3 top-2.5 text-zinc-500">
                    {currencyPrefix}
                  </span>
                  <input
                    className="w-full rounded-xl border border-zinc-200 px-7 py-2 outline-none focus:border-zinc-300 focus:ring-2 focus:ring-amber-200"
                    inputMode="decimal"
                    value={edit.price}
                    onChange={(e) =>
                      setEdit((s) => ({ ...s, price: e.target.value }))
                    }
                    placeholder="0.00"
                  />
                </div>
                {editErrors.price && (
                  <p className="mt-1 text-sm text-rose-600">
                    {editErrors.price}
                  </p>
                )}
              </div>

              <div>
                <label className="mb-1 block text-sm text-zinc-700">
                  Low Stock Level
                </label>
                <input
                  className="w-full rounded-xl border border-zinc-200 px-3 py-2 outline-none focus:border-zinc-300 focus:ring-2 focus:ring-amber-200"
                  inputMode="numeric"
                  value={edit.lowStockLevel}
                  onChange={(e) =>
                    setEdit((s) => ({ ...s, lowStockLevel: e.target.value }))
                  }
                  placeholder="e.g., 5 (leave blank for none)"
                />
                {editErrors.lowStockLevel && (
                  <p className="mt-1 text-sm text-rose-600">
                    {editErrors.lowStockLevel}
                  </p>
                )}
              </div>
            </div>

            {/* Footer */}
            <div className="flex items-center justify-end gap-3 border-t bg-white/60 p-5">
              <button
                type="button"
                className="rounded-xl bg-zinc-100 px-5 py-2 text-sm font-semibold text-zinc-800 ring-1 ring-inset ring-zinc-200 hover:bg-zinc-200"
                onClick={closeEdit}
                disabled={savingEdit}
              >
                Cancel
              </button>
              <button
                type="button"
                className="rounded-xl bg-amber-400 px-5 py-2 text-sm font-semibold text-black shadow-sm hover:bg-amber-500 disabled:opacity-60"
                onClick={saveEdit}
                disabled={savingEdit}
              >
                {savingEdit ? "Saving…" : "Save"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ProductTable;

/* ---------- Small UI bits ---------- */

function Th({
  children,
  className = "",
  ...rest
}: React.PropsWithChildren<React.ThHTMLAttributes<HTMLTableCellElement>>) {
  return (
    <th
      className={[
        "px-4 py-3 text-xs font-semibold uppercase tracking-wide",
        "text-zinc-500",
        className,
      ].join(" ")}
      scope="col"
      {...rest}
    >
      {children}
    </th>
  );
}

function Td({
  children,
  className = "",
  ...rest
}: React.PropsWithChildren<React.TdHTMLAttributes<HTMLTableCellElement>>) {
  return (
    <td className={["px-4 py-3 align-middle", className].join(" ")} {...rest}>
      {children}
    </td>
  );
}

function PagerButton({
  children,
  onClick,
  disabled,
  ariaLabel,
}: React.PropsWithChildren<{
  onClick: () => void;
  disabled?: boolean;
  ariaLabel: string;
}>) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      aria-label={ariaLabel}
      className={[
        "h-9 w-9 rounded-lg border border-zinc-200 text-sm",
        "grid place-items-center",
        disabled
          ? "cursor-not-allowed bg-zinc-50 text-zinc-300"
          : "bg-white text-zinc-700 hover:bg-zinc-50 active:scale-[0.99]",
      ].join(" ")}
    >
      {children}
    </button>
  );
}

function SkeletonRows() {
  const cols = 8;
  const rows = 6;
  return (
    <>
      {Array.from({ length: rows }).map((_, r) => (
        <tr key={r} className={r % 2 ? "bg-zinc-50/50" : "bg-white"}>
          {Array.from({ length: cols }).map((__, c) => (
            <td key={c} className="px-4 py-3">
              <div className="h-4 w-full max-w-[180px] animate-pulse rounded bg-zinc-200" />
            </td>
          ))}
        </tr>
      ))}
    </>
  );
}
