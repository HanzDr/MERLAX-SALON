import React, { useEffect, useRef, useState } from "react";
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
  productUnitPrice?: number | null;
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
  onDelete?: (id: string) => void | Promise<void>;
  loading?: boolean;
  currencyPrefix?: string;
};

/* ------------------------- Helpers ------------------------- */
const badgeClass: Record<"ADD" | "DEDUCT", string> = {
  ADD: "bg-emerald-50 text-emerald-700 ring-1 ring-inset ring-emerald-200",
  DEDUCT: "bg-rose-50 text-rose-700 ring-1 ring-inset ring-rose-200",
};

const formatReadableDate = (raw: string) => {
  if (!raw) return "—";
  let str = raw;
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

const fmtMoney = (n: number) =>
  n.toLocaleString(undefined, {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });

/* ------------------------- Confirm Modal ------------------------- */
type ConfirmModalProps = {
  open: boolean;
  title?: string;
  description?: string;
  confirmLabel?: string;
  cancelLabel?: string;
  loading?: boolean;
  onCancel: () => void;
  onConfirm: () => void | Promise<void>;
};

function ConfirmModal({
  open,
  title = "Delete this entry?",
  description = "This action will hide/remove the selected movement entry. You can’t undo this from here.",
  confirmLabel = "Delete",
  cancelLabel = "Cancel",
  loading = false,
  onCancel,
  onConfirm,
}: ConfirmModalProps) {
  const dialogRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onCancel();
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [open, onCancel]);

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-[100] grid place-items-center"
      role="dialog"
      aria-modal="true"
      aria-labelledby="confirm-title"
      aria-describedby="confirm-desc"
    >
      <div
        className="absolute inset-0 bg-zinc-900/50 backdrop-blur-sm"
        onClick={onCancel}
        aria-hidden="true"
      />
      <div
        ref={dialogRef}
        className="relative z-[101] w-[92%] max-w-md overflow-hidden rounded-2xl border border-zinc-200 bg-white shadow-xl"
      >
        <div className="sticky top-0 border-b bg-white/80 p-5 backdrop-blur supports-[backdrop-filter]:bg-white/60">
          <h2
            id="confirm-title"
            className="text-lg font-semibold text-zinc-900"
          >
            {title}
          </h2>
          <p id="confirm-desc" className="mt-1 text-sm text-zinc-600">
            {description}
          </p>
        </div>

        <div className="p-5">
          <div className="flex items-center justify-end gap-3">
            <button
              className="rounded-xl bg-zinc-100 px-4 py-2 text-sm font-medium text-zinc-800 ring-1 ring-inset ring-zinc-200 hover:bg-zinc-200 disabled:opacity-60"
              onClick={onCancel}
              disabled={loading}
            >
              {cancelLabel}
            </button>
            <button
              className="rounded-xl bg-rose-600 px-4 py-2 text-sm font-semibold text-white shadow-sm hover:bg-rose-700 disabled:opacity-60"
              onClick={onConfirm}
              disabled={loading}
            >
              {loading ? "Deleting…" : confirmLabel}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

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
  currencyPrefix = "₱",
}) => {
  const totalPages = Math.max(1, Math.ceil(total / pageSize));

  const [confirmOpen, setConfirmOpen] = useState(false);
  const [targetId, setTargetId] = useState<string | null>(null);
  const [deleting, setDeleting] = useState(false);

  const askDelete = (id: string) => {
    setTargetId(id);
    setConfirmOpen(true);
  };

  const cancelDelete = () => {
    if (deleting) return;
    setConfirmOpen(false);
    setTargetId(null);
  };

  const confirmDelete = async () => {
    if (!targetId || !onDelete) {
      setConfirmOpen(false);
      setTargetId(null);
      return;
    }
    try {
      setDeleting(true);
      await onDelete(targetId);
      setConfirmOpen(false);
      setTargetId(null);
    } finally {
      setDeleting(false);
    }
  };

  return (
    <div className="w-full rounded-2xl border border-zinc-200 bg-white shadow-sm">
      {/* Header controls */}
      <div className="flex flex-col gap-3 border-b border-zinc-100 p-4 sm:flex-row sm:items-center sm:justify-between">
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

        <div className="relative w-full sm:w-72">
          <input
            value={search}
            onChange={(e) => onSearchChange(e.target.value)}
            placeholder="Search movements…"
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
      </div>

      {/* Table */}
      <div className="overflow-x-auto">
        <table className="w-full text-left text-sm">
          <thead className="sticky top-0 z-10 bg-white/90 backdrop-blur supports-[backdrop-filter]:bg-white/70">
            <tr className="text-zinc-600">
              <Th>Product</Th>
              <Th>Category</Th>
              <Th>Packaging</Th>
              <Th>Type</Th>
              <Th>Reason</Th>
              <Th className="text-right">Qty</Th>
              <Th className="text-right">Total Price</Th>
              <Th>Date</Th>
              <Th className="text-center">Action</Th>
            </tr>
          </thead>

          <tbody className="divide-y divide-zinc-100">
            {loading ? (
              <SkeletonRows />
            ) : rows.length === 0 ? (
              <tr>
                <td colSpan={9} className="py-8 text-center text-zinc-500">
                  No inventory movements found.
                </td>
              </tr>
            ) : (
              rows.map((r, idx) => {
                const unit = Number(r.productUnitPrice ?? 0);
                const hasUnit = Number.isFinite(unit) && unit > 0;
                const totalPrice = hasUnit ? unit * Number(r.quantity || 0) : 0;

                return (
                  <tr
                    key={r.id}
                    className={[
                      "transition-colors hover:bg-amber-50/40",
                      idx % 2 === 0 ? "bg-white" : "bg-zinc-50/50",
                    ].join(" ")}
                  >
                    <Td className="font-medium text-zinc-900">
                      {r.productName}
                      <div className="mt-0.5 text-[11px] font-normal text-zinc-500">
                        ID: {r.productId}
                      </div>
                    </Td>
                    <Td className="text-zinc-700">
                      {r.productCategory ?? "—"}
                    </Td>
                    <Td className="text-zinc-700">
                      {r.productPackaging ?? "—"}
                    </Td>
                    <Td>
                      <span
                        className={`inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-semibold ${
                          badgeClass[r.movementType]
                        }`}
                      >
                        {r.movementType}
                      </span>
                    </Td>
                    <Td className="text-zinc-700">{r.reason || "—"}</Td>
                    <Td className="text-right tabular-nums text-zinc-900">
                      {r.quantity}
                    </Td>

                    <Td className="text-right tabular-nums text-zinc-900">
                      {hasUnit ? (
                        <div className="inline-flex flex-col items-end">
                          <div>
                            {currencyPrefix}
                            {fmtMoney(totalPrice)}
                          </div>
                          <div className="text-[11px] text-zinc-500">
                            ({currencyPrefix}
                            {fmtMoney(unit)} each)
                          </div>
                        </div>
                      ) : (
                        "—"
                      )}
                    </Td>

                    <Td className="text-zinc-700" title={r.createdAt ?? ""}>
                      {formatReadableDate(r.createdAt)}
                    </Td>
                    <Td className="text-center">
                      <button
                        className="rounded-lg border border-rose-200 px-2.5 py-1.5 text-xs font-semibold text-rose-700 hover:bg-rose-50 active:scale-[0.99]"
                        onClick={() => askDelete(r.id)}
                        aria-label={`Delete movement ${r.id}`}
                      >
                        <span className="inline-flex items-center gap-1.5">
                          <Trash2 className="h-4 w-4" />
                        </span>
                      </button>
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
            <b className="text-zinc-900">
              {Math.max(1, Math.ceil(total / pageSize))}
            </b>
          </span>
          <PagerButton
            onClick={() => onPageChange(page + 1)}
            disabled={page >= Math.max(1, Math.ceil(total / pageSize))}
            ariaLabel="Next"
          >
            ›
          </PagerButton>
          <PagerButton
            onClick={() =>
              onPageChange(Math.max(1, Math.ceil(total / pageSize)))
            }
            disabled={page >= Math.max(1, Math.ceil(total / pageSize))}
            ariaLabel="Last"
          >
            »
          </PagerButton>
        </nav>
      </div>

      {/* Confirm Delete Modal */}
      <ConfirmModal
        open={confirmOpen}
        loading={deleting}
        onCancel={cancelDelete}
        onConfirm={confirmDelete}
        title="Hide this movement?"
        description="This will set the movement entry to hidden (isDisplay = false) or delete it, depending on your handler. You can’t undo this here."
        confirmLabel="Delete movement"
      />
    </div>
  );
};

export default InventoryMoveTable;

/* ---------- Small UI bits ---------- */

function Th({
  children,
  className = "",
}: React.PropsWithChildren<{ className?: string }>) {
  return (
    <th
      className={[
        "px-4 py-3 text-xs font-semibold uppercase tracking-wide",
        "text-zinc-500",
        className,
      ].join(" ")}
      scope="col"
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
  const cols = 9;
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
