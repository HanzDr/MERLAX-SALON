import React from "react";
import { Trash2 } from "lucide-react";

/* ------------------------- Types ------------------------- */
export type MovementRow = {
  id: string;
  productId: string;
  productName: string;
  productCategory?: string | null;
  productPackaging?: string | null;
  movementType: "ADD" | "DEDUCT";
  reason?: "SALES" | "USAGE" | "RESTOCK" | "ADJUSTMENT" | "OUT" | "" | null;
  quantity: number;
  createdAt: string;
};

type Props = {
  rows: MovementRow[];
  search: string;
  onSearchChange: (v: string) => void;
  page: number;
  pageSize: number;
  total: number;
  pageSizeOptions?: number[];
  onPageChange: (nextPage: number) => void;
  onPageSizeChange: (size: number) => void;
  onDelete?: (id: string) => void;
  loading?: boolean;
};

/* ------------------------- Helpers ------------------------- */
const badgeClass: Record<"ADD" | "DEDUCT", string> = {
  ADD: "bg-green-100 text-green-700 border-green-200",
  DEDUCT: "bg-rose-100 text-rose-700 border-rose-200",
};

/** Format like “Oct 15 2025 13:45” (local time, readable) */
const formatReadableDate = (raw: string) => {
  if (!raw) return "—";
  let str = raw;
  // Fix Safari parsing of "YYYY-MM-DD HH:mm:ss"
  if (str.includes(" ") && !str.includes("T")) str = str.replace(" ", "T");
  const date = new Date(str);
  if (isNaN(date.getTime())) return raw;

  const opts: Intl.DateTimeFormatOptions = {
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  };
  return date.toLocaleString(undefined, opts);
};

/* ----------------------- Component ----------------------- */
const InventoryMoveTable: React.FC<Props> = ({
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
}) => {
  const totalPages = Math.max(1, Math.ceil(total / pageSize));

  return (
    <div className="w-full rounded-2xl bg-white p-4 shadow-sm">
      {/* Header controls */}
      <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
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

        <div className="relative w-full sm:w-64">
          <input
            value={search}
            onChange={(e) => onSearchChange(e.target.value)}
            placeholder="Search movements..."
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
      </div>

      {/* Table */}
      <div className="overflow-x-auto">
        <table className="w-full border-collapse text-sm">
          <thead className="bg-gray-100 text-gray-700 font-semibold">
            <tr>
              <th className="py-2 px-3 text-left">Product</th>
              <th className="py-2 px-3 text-left">Category</th>
              <th className="py-2 px-3 text-left">Packaging</th>
              <th className="py-2 px-3 text-left">Type</th>
              <th className="py-2 px-3 text-left">Reason</th>
              <th className="py-2 px-3 text-left">Qty</th>
              <th className="py-2 px-3 text-left">Date</th>
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
                  No inventory movements found.
                </td>
              </tr>
            ) : (
              rows.map((r, idx) => (
                <tr
                  key={r.id}
                  className={`border-b ${
                    idx % 2 === 0 ? "bg-[#FFF9F2]" : "bg-[#FFF6EE]"
                  }`}
                >
                  <td className="py-2 px-3 font-medium text-gray-800">
                    {r.productName}
                  </td>
                  <td className="py-2 px-3">{r.productCategory ?? "—"}</td>
                  <td className="py-2 px-3">{r.productPackaging ?? "—"}</td>
                  <td className="py-2 px-3">
                    <span
                      className={`inline-flex items-center rounded-full border px-2 py-0.5 text-xs font-semibold ${
                        badgeClass[r.movementType]
                      }`}
                    >
                      {r.movementType}
                    </span>
                  </td>
                  <td className="py-2 px-3">{r.reason || "—"}</td>
                  <td className="py-2 px-3 font-semibold text-gray-800">
                    {r.quantity}
                  </td>
                  <td className="py-2 px-3" title={r.createdAt}>
                    {formatReadableDate(r.createdAt)}
                  </td>
                  <td className="py-2 px-3 text-center">
                    <button
                      className="text-red-600 hover:text-red-700"
                      onClick={() => onDelete?.(r.id)}
                      aria-label={`Delete movement ${r.id}`}
                    >
                      <Trash2 className="h-5 w-5" />
                    </button>
                  </td>
                </tr>
              ))
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
    </div>
  );
};

export default InventoryMoveTable;
