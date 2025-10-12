import React from "react";
import { Search, Trash2 } from "lucide-react";

type Status = "Completed" | "Cancelled";

export type AppointmentRow = {
  id: string;
  service: string;
  stylist: string;
  date: string; // e.g., 13/05/2025 (already formatted)
  amount: string; // e.g., ₱495.00 (already formatted)
  paymentMode: string; // e.g., "Bank" | "Cash"
  status: Status;
};

export type TabKey = "ALL" | "COMPLETED" | "CANCELLED";

type Props = {
  title?: string;
  rows: AppointmentRow[];

  /* Tabs (parent handles filter) */
  activeTab: TabKey;
  onTabChange?: (tab: TabKey) => void;

  /* Page size dropdown (parent handles data fetch) */
  perPageOptions?: number[];
  perPage?: number;
  onPerPageChange?: (n: number) => void;

  /* Search (parent handles data fetch) */
  searchText?: string;
  onSearchTextChange?: (v: string) => void;

  /* Pagination (server-side) */
  page: number; // 1-based
  totalPages: number; // provided by parent
  onPageChange?: (page: number) => void;

  /* Row action */
  onDelete?: (id: string) => void;

  /* Optional empty state text */
  emptyText?: string;
};

const PillTab: React.FC<{
  label: string;
  active?: boolean;
  onClick?: () => void;
}> = ({ label, active, onClick }) => (
  <button
    type="button"
    onClick={onClick}
    className={[
      "px-3 py-1.5 rounded-full text-xs font-medium transition-colors",
      active
        ? "bg-[#FFB030] text-white shadow-sm"
        : "bg-gray-100 text-gray-700 hover:bg-gray-200",
    ].join(" ")}
  >
    {label}
  </button>
);

const StatusBadge: React.FC<{ status: Status }> = ({ status }) => {
  const base =
    "inline-flex items-center px-2.5 py-0.5 rounded-full text-[11px] font-medium";
  return (
    <span
      className={
        status === "Completed"
          ? `${base} bg-emerald-50 text-emerald-700`
          : `${base} bg-rose-50 text-rose-700`
      }
    >
      {status}
    </span>
  );
};

const Pagination: React.FC<{
  page: number;
  totalPages: number;
  onPageChange?: (p: number) => void;
}> = ({ page, totalPages, onPageChange }) => {
  const pages = Array.from(
    { length: Math.max(1, totalPages) },
    (_, i) => i + 1
  );
  const isFirst = page <= 1;
  const isLast = page >= totalPages;

  return (
    <div className="flex items-center justify-center gap-2 text-xs mt-4">
      <button
        type="button"
        onClick={() => onPageChange?.(page - 1)}
        disabled={isFirst}
        className="text-gray-600 disabled:text-gray-300"
      >
        Previous
      </button>
      {pages.map((p) => (
        <button
          key={p}
          type="button"
          onClick={() => onPageChange?.(p)}
          className={[
            "h-7 w-7 rounded-full grid place-items-center",
            p === page
              ? "bg-[#FFB030] text-white"
              : "text-gray-700 hover:bg-gray-100",
          ].join(" ")}
        >
          {p}
        </button>
      ))}
      <button
        type="button"
        onClick={() => onPageChange?.(page + 1)}
        disabled={isLast}
        className="text-gray-600 disabled:text-gray-300"
      >
        Next
      </button>
    </div>
  );
};

const CustomerAppointmentHistory: React.FC<Props> = ({
  title = "Appointment History",
  rows,
  activeTab,
  onTabChange,
  perPageOptions = [5, 10, 25],
  perPage = perPageOptions[0],
  onPerPageChange,
  searchText = "",
  onSearchTextChange,
  page,
  totalPages,
  onPageChange,
  onDelete,
  emptyText = "No appointments found.",
}) => {
  return (
    <section className="w-full px-5 md:px-8 pt-2 pb-6">
      {/* Title */}
      <h2 className="text-2xl sm:text-3xl font-semibold mb-4">{title}</h2>

      {/* Tabs (parent will refetch) */}
      <div className="flex items-center gap-2 mb-4">
        <PillTab
          label="All"
          active={activeTab === "ALL"}
          onClick={() => onTabChange?.("ALL")}
        />
        <PillTab
          label="Completed"
          active={activeTab === "COMPLETED"}
          onClick={() => onTabChange?.("COMPLETED")}
        />
        <PillTab
          label="Cancelled"
          active={activeTab === "CANCELLED"}
          onClick={() => onTabChange?.("CANCELLED")}
        />
      </div>

      {/* Controls (parent will refetch) */}
      <div className="flex flex-wrap items-center justify-between gap-3 mb-3">
        <div className="flex items-center gap-2 text-xs">
          <span className="text-gray-600">Show</span>
          <select
            className="h-8 rounded-md border border-gray-300 bg-gray-100 px-2 text-xs"
            value={perPage}
            onChange={(e) => {
              onPerPageChange?.(Number(e.target.value));
              onPageChange?.(1);
            }}
          >
            {perPageOptions.map((n) => (
              <option key={n} value={n}>
                {n}
              </option>
            ))}
          </select>
          <span className="text-gray-600">entries</span>
        </div>

        <label className="relative w-full max-w-xs">
          <span className="sr-only">Search</span>
          <input
            value={searchText}
            onChange={(e) => {
              onSearchTextChange?.(e.target.value);
              onPageChange?.(1);
            }}
            placeholder="Search service, stylist, date, etc."
            className="w-full h-8 rounded-md border border-gray-300 pl-8 pr-2 text-xs placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-[#FFB030]"
          />
          <Search className="absolute left-2 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
        </label>
      </div>

      {/* Table (compact, no avatar) */}
      <div className="overflow-x-auto">
        <table className="min-w-full text-left align-middle border-separate border-spacing-y-2">
          <thead className="text-gray-700 text-xs">
            <tr>
              <th className="px-4 py-2 font-semibold">Service</th>
              <th className="px-4 py-2 font-semibold">Stylist</th>
              <th className="px-4 py-2 font-semibold">Date</th>
              <th className="px-4 py-2 font-semibold">Amount</th>
              <th className="px-4 py-2 font-semibold">Payment Mode</th>
              <th className="px-4 py-2 font-semibold">Status</th>
              <th className="px-4 py-2 font-semibold">Action</th>
            </tr>
          </thead>

          <tbody>
            {rows.length === 0 ? (
              <tr>
                <td
                  colSpan={7}
                  className="px-4 py-8 text-center text-gray-500 text-sm"
                >
                  {emptyText}
                </td>
              </tr>
            ) : (
              rows.map((r) => (
                <tr
                  key={r.id}
                  className="bg-white rounded-lg overflow-hidden ring-1 ring-amber-100 hover:bg-amber-50/40"
                >
                  <td className="px-4 py-3">
                    <div className="font-medium text-gray-800 text-sm">
                      {r.service}
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    <span className="font-semibold text-gray-800 text-sm">
                      {r.stylist}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-gray-800 text-sm">{r.date}</td>
                  <td className="px-4 py-3 text-gray-800 text-sm">
                    {r.amount}
                  </td>
                  <td className="px-4 py-3 text-gray-800 text-sm">
                    {r.paymentMode}
                  </td>
                  <td className="px-4 py-3">
                    <StatusBadge status={r.status} />
                  </td>
                  <td className="px-4 py-3">
                    <button
                      type="button"
                      onClick={() => onDelete?.(r.id)}
                      className="text-red-600 hover:text-red-700"
                      aria-label={`Delete appointment ${r.id}`}
                      title="Delete"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Server-side pager */}
      <Pagination
        page={page}
        totalPages={totalPages}
        onPageChange={onPageChange}
      />
    </section>
  );
};

export default CustomerAppointmentHistory;
