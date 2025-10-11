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
  price: number;
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
  // e.g., "Oct 15 2025"
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
  price: string;
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

  const closeEdit = () => {
    setEdit((e) => ({ ...e, open: false }));
  };

  const validateEdit = (): boolean => {
    const errs: typeof editErrors = {};
    const priceNum = Number(edit.price);
    if (edit.price === "" || !Number.isFinite(priceNum) || priceNum < 0) {
      errs.price = "Price must be a non-negative number.";
    }
    if (edit.lowStockLevel !== "") {
      const lvl = Number(edit.lowStockLevel);
      if (!Number.isFinite(lvl) || lvl < 0) {
        errs.lowStockLevel = "Low stock level must be a non-negative number.";
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

  return (
    <div className="w-full rounded-2xl bg-white p-4 shadow-sm">
      {/* Header controls */}
      <div className="mb-4 flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
        {/* Left: page size */}
        <div className="flex items-center gap-2 text-sm">
          <span>Show</span>
          <select
            value={pageSize}
            onChange={(e) => onPageSizeChange(Number(e.target.value))}
            className="rounded-lg border px-2 py-1"
          >
            {pageSizeOptions.map((n) => (
              <option key={n} value={n}>
                {n}
              </option>
            ))}
          </select>
          <span>entries</span>
        </div>

        {/* Right: search + filters */}
        <div className="flex w-full flex-col gap-2 sm:w-auto sm:flex-row sm:items-center">
          {/* Search */}
          <div className="relative w-full sm:w-64">
            <input
              value={search}
              onChange={(e) => onSearchChange(e.target.value)}
              placeholder="Search..."
              className="w-full rounded-lg border pl-8 pr-3 py-2 text-sm"
            />
            <svg
              className="absolute left-2 top-2.5 h-4 w-4 text-gray-400"
              fill="none"
              stroke="currentColor"
              strokeWidth={2}
              viewBox="0 0 24 24"
            >
              <circle cx="11" cy="11" r="8" />
              <path d="m21 21-4.3-4.3" />
            </svg>
          </div>

          {/* Category filter */}
          <select
            value={categoryFilter}
            onChange={(e) => onCategoryFilterChange(e.target.value)}
            className="rounded-lg border px-2 py-2 text-sm"
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
            className="rounded-lg border px-2 py-2 text-sm"
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
        <table className="w-full border-collapse text-sm">
          <thead className="bg-gray-100 font-semibold text-gray-700">
            <tr>
              <th className="py-2 px-3 text-left">Product</th>
              <th className="py-2 px-3 text-left">Category</th>
              <th className="py-2 px-3 text-left">Description</th>
              <th className="py-2 px-3 text-left">Packaging</th>
              <th className="py-2 px-3 text-left">Quantity</th>
              <th className="py-2 px-3 text-left">Price</th>
              <th className="py-2 px-3 text-left">Last Updated</th>
              <th className="py-2 px-3 text-center">Action</th>
            </tr>
          </thead>

          <tbody>
            {loading ? (
              <tr>
                <td colSpan={8} className="py-6 text-center text-gray-500">
                  Loading…
                </td>
              </tr>
            ) : rows.length === 0 ? (
              <tr>
                <td
                  colSpan={8}
                  className="py-6 text-center italic text-gray-500"
                >
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

                return (
                  <tr
                    key={p.id}
                    className={`border-b ${
                      idx % 2 === 0 ? "bg-[#FFF9F2]" : "bg-[#FFF6EE]"
                    }`}
                  >
                    <td className="py-2 px-3 font-medium text-gray-800">
                      <div className="flex items-center gap-2">
                        {p.name}
                        {belowLow && (
                          <span
                            title="At or below low stock level"
                            className="inline-flex items-center gap-1 rounded-full bg-rose-100 px-2 py-0.5 text-[11px] font-semibold text-rose-700"
                          >
                            <AlertTriangle className="h-3 w-3" />
                            Low Stock Level
                          </span>
                        )}
                      </div>
                    </td>

                    <td className="py-2 px-3">{p.category}</td>
                    <td className="py-2 px-3">{p.description}</td>
                    <td className="py-2 px-3">{p.packaging}</td>
                    <td className="py-2 px-3">{p.quantity}</td>

                    <td className="py-2 px-3 font-semibold text-gray-800">
                      {currencyPrefix}
                      {Number(p.price).toLocaleString(undefined, {
                        minimumFractionDigits: 2,
                        maximumFractionDigits: 2,
                      })}
                    </td>

                    <td className="py-2 px-3">
                      {formatDateFriendly(p.lastUpdated)}
                    </td>

                    <td className="py-2 px-3 text-center">
                      <div className="flex items-center justify-center gap-3">
                        <button
                          className="rounded-md border px-3 py-1 text-xs font-semibold text-gray-700 hover:bg-gray-50"
                          onClick={() => startEdit(p)}
                          aria-label={`Edit ${p.name}`}
                          title="Edit product"
                        >
                          Edit
                        </button>

                        <button
                          className="text-red-600 hover:text-red-700"
                          onClick={() => onDelete?.(p.id)}
                          aria-label={`Delete ${p.name}`}
                          title="Delete product"
                        >
                          <Trash2 className="h-5 w-5" />
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      {/* Footer / Pagination */}
      <div className="mt-4 flex items-center justify-between text-sm">
        <span>
          Showing <b>{rows.length}</b> of <b>{total}</b> entries
        </span>
        <div className="flex items-center gap-2">
          <button
            className="rounded-lg border px-3 py-1 disabled:opacity-50"
            disabled={page <= 1}
            onClick={() => onPageChange(page - 1)}
          >
            Previous
          </button>
          <span>
            Page <b>{page}</b> / {totalPages}
          </span>
          <button
            className="rounded-lg border px-3 py-1 disabled:opacity-50"
            disabled={page >= totalPages}
            onClick={() => onPageChange(page + 1)}
          >
            Next
          </button>
        </div>
      </div>

      {/* Edit Modal */}
      {edit.open && (
        <div
          className="fixed inset-0 z-[120] flex items-center justify-center"
          role="dialog"
          aria-modal="true"
          aria-labelledby="edit-product-title"
        >
          <div className="absolute inset-0 bg-black/40" onClick={closeEdit} />
          <div className="relative z-[121] w-[92%] max-w-lg rounded-2xl bg-white p-6 shadow-2xl">
            <div className="mb-4 flex items-center justify-between">
              <h3 id="edit-product-title" className="text-xl font-semibold">
                Edit “{edit.name}”
              </h3>
              <button
                type="button"
                onClick={closeEdit}
                className="rounded-full p-1 hover:bg-gray-100"
                aria-label="Close"
              >
                <X className="h-5 w-5 text-gray-500" />
              </button>
            </div>

            <div className="space-y-4">
              <div>
                <label className="mb-1 block text-sm text-gray-700">
                  Description
                </label>
                <input
                  className="w-full rounded-xl border px-3 py-2 outline-none focus:ring-2 focus:ring-black/10"
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
                <label className="mb-1 block text-sm text-gray-700">
                  Price
                </label>
                <div className="relative">
                  <span className="pointer-events-none absolute left-3 top-2.5 text-gray-500">
                    {currencyPrefix}
                  </span>
                  <input
                    className="w-full rounded-xl border px-7 py-2 outline-none focus:ring-2 focus:ring-black/10"
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
                <label className="mb-1 block text-sm text-gray-700">
                  Low Stock Level
                </label>
                <input
                  className="w-full rounded-xl border px-3 py-2 outline-none focus:ring-2 focus:ring-black/10"
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

            <div className="mt-5 flex justify-end gap-3">
              <button
                type="button"
                className="rounded-xl bg-black px-5 py-2 text-sm font-semibold text-white hover:opacity-90"
                onClick={closeEdit}
                disabled={savingEdit}
              >
                Cancel
              </button>
              <button
                type="button"
                className="rounded-xl bg-amber-400 px-5 py-2 text-sm font-semibold text-white hover:bg-amber-500 disabled:opacity-60"
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
