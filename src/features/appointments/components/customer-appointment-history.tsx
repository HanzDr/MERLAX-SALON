<<<<<<< HEAD
import React, { useEffect, useMemo, useRef, useState } from "react";
=======
import React from "react";
>>>>>>> 2a8dfd498642c07a3b20c3c73175f2c4b57bb785
import { Search, Trash2 } from "lucide-react";

type Status = "Completed" | "Cancelled";

export type AppointmentRow = {
  id: string;
  service: string;
  stylist: string;
<<<<<<< HEAD
  /** Can be any format coming in; we normalize for display + search */
  date: string;
  amount: string;
  paymentMode: string;
=======
  date: string; // e.g., 13/05/2025 (already formatted)
  amount: string; // e.g., ₱495.00 (already formatted)
  paymentMode: string; // e.g., "Bank" | "Cash"
>>>>>>> 2a8dfd498642c07a3b20c3c73175f2c4b57bb785
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

<<<<<<< HEAD
  /* Search */
  searchText?: string;
  onSearchTextChange?: (v: string) => void;
  searchMode?: "client" | "server"; // default: client

  /* Pagination (server-side) */
  page: number; // 1-based
  totalPages: number;
=======
  /* Search (parent handles data fetch) */
  searchText?: string;
  onSearchTextChange?: (v: string) => void;

  /* Pagination (server-side) */
  page: number; // 1-based
  totalPages: number; // provided by parent
>>>>>>> 2a8dfd498642c07a3b20c3c73175f2c4b57bb785
  onPageChange?: (page: number) => void;

  /* Row action */
  onDelete?: (id: string) => void;

  /* Optional empty state text */
  emptyText?: string;
};

<<<<<<< HEAD
/* ===================== Date utils ===================== */

const MONTHS = [
  "january",
  "february",
  "march",
  "april",
  "may",
  "june",
  "july",
  "august",
  "september",
  "october",
  "november",
  "december",
];

function pad(n: number) {
  return String(n).padStart(2, "0");
}

/** Parse common inputs into a Date (local) or null */
function tryParseDate(input: string): Date | null {
  if (!input) return null;
  const s = input.trim();

  // YYYY-MM-DD / YYYY/MM/DD
  let m = s.match(/^(\d{4})[-/](\d{1,2})[-/](\d{1,2})$/);
  if (m) {
    const yy = Number(m[1]),
      mm = Number(m[2]),
      dd = Number(m[3]);
    const d = new Date(yy, mm - 1, dd);
    return Number.isNaN(d.getTime()) ? null : d;
  }

  // DD/MM/YYYY or D/M/YYYY
  m = s.match(/^(\d{1,2})[/-](\d{1,2})[/-](\d{4})$/);
  if (m) {
    const dd = Number(m[1]),
      mm = Number(m[2]),
      yy = Number(m[3]);
    const d = new Date(yy, mm - 1, dd);
    return Number.isNaN(d.getTime()) ? null : d;
  }

  // Mon D, YYYY  | Month D, YYYY | Month D YYYY
  const monthRegex = MONTHS.join("|");
  m = s.match(
    new RegExp(`^(${monthRegex})\\s+(\\d{1,2})(?:,\\s*|\\s+)(\\d{4})$`, "i")
  );
  if (m) {
    const month = MONTHS.indexOf(m[1].toLowerCase());
    const dd = Number(m[2]);
    const yy = Number(m[3]);
    const d = new Date(yy, month, dd);
    return Number.isNaN(d.getTime()) ? null : d;
  }

  // D Mon YYYY | D Month YYYY
  m = s.match(new RegExp(`^(\\d{1,2})\\s+(${monthRegex})\\s+(\\d{4})$`, "i"));
  if (m) {
    const dd = Number(m[1]);
    const month = MONTHS.indexOf(m[2].toLowerCase());
    const yy = Number(m[3]);
    const d = new Date(yy, month, dd);
    return Number.isNaN(d.getTime()) ? null : d;
  }

  // Fallback: let Date try (handles some locales)
  const d = new Date(s);
  return Number.isNaN(d.getTime()) ? null : d;
}

/** Display format: `Oct 15 2025` */
function formatDisplayDate(input: string): string {
  const d = tryParseDate(input);
  if (!d) {
    // Try to accept ISO time-like strings (already parsed format)
    const maybe = new Date(input);
    if (!Number.isNaN(maybe.getTime())) return formatDisplayDateFromDate(maybe);
    // As a last resort, show original
    return input;
  }
  return formatDisplayDateFromDate(d);
}

function formatDisplayDateFromDate(d: Date): string {
  const monthShort = d.toLocaleString(undefined, { month: "short" }); // Oct
  const day = d.getDate();
  const y = d.getFullYear();
  return `${monthShort} ${day} ${y}`;
}

/** Tokens for searching by date variants */
function dateSearchTokens(dateStr: string): string[] {
  const d = tryParseDate(dateStr);
  if (!d) return [];

  const y = d.getFullYear();
  const m = d.getMonth() + 1;
  const day = d.getDate();

  const iso = `${y}-${pad(m)}-${pad(day)}`; // 2025-10-15
  const dmy = `${pad(day)}/${pad(m)}/${y}`; // 15/10/2025
  const mdy = `${pad(m)}/${pad(day)}/${y}`; // 10/15/2025
  const monShort = d
    .toLocaleString(undefined, { month: "short" })
    .toLowerCase(); // oct
  const monLong = d.toLocaleString(undefined, { month: "long" }).toLowerCase(); // october
  const human1 = `${monShort} ${day}`; // oct 15
  const human2 = `${day} ${monShort}`; // 15 oct
  const human3 = `${monLong} ${day}`; // october 15
  const human4 = `${day} ${monLong}`; // 15 october

  return [
    iso,
    dmy,
    mdy,
    monShort,
    monLong,
    String(day),
    pad(m),
    human1,
    human2,
    human3,
    human4,
  ];
}

/* ===================== UI bits ===================== */

const TabBtn: React.FC<{
=======
const PillTab: React.FC<{
>>>>>>> 2a8dfd498642c07a3b20c3c73175f2c4b57bb785
  label: string;
  active?: boolean;
  onClick?: () => void;
}> = ({ label, active, onClick }) => (
  <button
    type="button"
    onClick={onClick}
    className={[
<<<<<<< HEAD
      "relative rounded-full px-3.5 py-1.5 text-xs font-medium transition-all",
      "focus:outline-none focus-visible:ring-2 focus-visible:ring-amber-300 focus-visible:ring-offset-2",
      active
        ? "bg-amber-500 text-white shadow-[0_6px_20px_-8px_rgba(245,158,11,0.65)]"
        : "text-gray-700 hover:text-gray-900 hover:bg-gray-100",
    ].join(" ")}
  >
    {label}
    {active && (
      <span className="absolute inset-x-4 -bottom-[6px] h-[3px] rounded-full bg-amber-500/70" />
    )}
=======
      "px-3 py-1.5 rounded-full text-xs font-medium transition-colors",
      active
        ? "bg-[#FFB030] text-white shadow-sm"
        : "bg-gray-100 text-gray-700 hover:bg-gray-200",
    ].join(" ")}
  >
    {label}
>>>>>>> 2a8dfd498642c07a3b20c3c73175f2c4b57bb785
  </button>
);

const StatusBadge: React.FC<{ status: Status }> = ({ status }) => {
<<<<<<< HEAD
  const styles =
    status === "Completed"
      ? "bg-emerald-50 text-emerald-700 ring-emerald-200/60"
      : "bg-rose-50 text-rose-700 ring-rose-200/60";

  return (
    <span
      className={[
        "inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-[11px] font-semibold ring-1",
        styles,
      ].join(" ")}
    >
      <span
        className={[
          "h-1.5 w-1.5 rounded-full",
          status === "Completed" ? "bg-emerald-500" : "bg-rose-500",
        ].join(" ")}
      />
=======
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
>>>>>>> 2a8dfd498642c07a3b20c3c73175f2c4b57bb785
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
<<<<<<< HEAD
    <div className="mt-5 flex flex-wrap items-center justify-center gap-2 text-xs">
=======
    <div className="flex items-center justify-center gap-2 text-xs mt-4">
>>>>>>> 2a8dfd498642c07a3b20c3c73175f2c4b57bb785
      <button
        type="button"
        onClick={() => onPageChange?.(page - 1)}
        disabled={isFirst}
<<<<<<< HEAD
        className="rounded-md px-2 py-1 text-gray-700 ring-1 ring-gray-200 disabled:opacity-40 hover:bg-gray-50"
      >
        Previous
      </button>
      <div className="flex items-center gap-1">
        {pages.map((p) => (
          <button
            key={p}
            type="button"
            onClick={() => onPageChange?.(p)}
            className={[
              "grid h-8 w-8 place-items-center rounded-full text-xs font-medium transition",
              p === page
                ? "bg-amber-500 text-white shadow-[0_6px_20px_-8px_rgba(245,158,11,0.65)]"
                : "text-gray-700 ring-1 ring-gray-200 hover:bg-gray-50",
            ].join(" ")}
            aria-current={p === page ? "page" : undefined}
          >
            {p}
          </button>
        ))}
      </div>
=======
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
>>>>>>> 2a8dfd498642c07a3b20c3c73175f2c4b57bb785
      <button
        type="button"
        onClick={() => onPageChange?.(page + 1)}
        disabled={isLast}
<<<<<<< HEAD
        className="rounded-md px-2 py-1 text-gray-700 ring-1 ring-gray-200 disabled:opacity-40 hover:bg-gray-50"
=======
        className="text-gray-600 disabled:text-gray-300"
>>>>>>> 2a8dfd498642c07a3b20c3c73175f2c4b57bb785
      >
        Next
      </button>
    </div>
  );
};

<<<<<<< HEAD
/* ===================== Main ===================== */

=======
>>>>>>> 2a8dfd498642c07a3b20c3c73175f2c4b57bb785
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
<<<<<<< HEAD
  searchMode = "client",
=======
>>>>>>> 2a8dfd498642c07a3b20c3c73175f2c4b57bb785
  page,
  totalPages,
  onPageChange,
  onDelete,
  emptyText = "No appointments found.",
}) => {
<<<<<<< HEAD
  const isServer = searchMode === "server";

  /* Search state */
  const [localSearch, setLocalSearch] = useState(searchText ?? "");
  const mountedRef = useRef(false);

  useEffect(() => {
    if (!mountedRef.current) {
      mountedRef.current = true;
      setLocalSearch(searchText ?? "");
      return;
    }
    setLocalSearch(searchText ?? "");
  }, [searchText, isServer]);

  const emitSearch = (v: string) => {
    onSearchTextChange?.(v);
    onPageChange?.(1);
  };

  const onLocalChange = (v: string) => {
    setLocalSearch(v);
    if (isServer) emitSearch(v.trim());
  };

  const clearSearch = () => {
    setLocalSearch("");
    if (isServer) emitSearch("");
  };

  const normalizedQuery = (localSearch ?? "").trim().toLowerCase();

  // Prepare displayed rows with normalized date *for display*
  const rowsWithDisplayDate = useMemo(
    () =>
      rows.map((r) => ({
        ...r,
        __displayDate: formatDisplayDate(r.date), // shown in the table
      })),
    [rows]
  );

  // Client-side filtering with rich date tokens
  const effectiveRows = useMemo(() => {
    if (isServer) return rowsWithDisplayDate;
    if (!normalizedQuery) return rowsWithDisplayDate;

    return rowsWithDisplayDate.filter((r) => {
      const dateTokens = dateSearchTokens(r.date).join(" ");
      const haystack = [
        r.service,
        r.stylist,
        r.__displayDate, // "Oct 15 2025" helps too
        r.date, // original
        dateTokens, // normalized tokens
        r.amount,
        r.paymentMode,
        r.status,
      ]
        .filter(Boolean)
        .join(" ")
        .toLowerCase();

      return haystack.includes(normalizedQuery);
    });
  }, [rowsWithDisplayDate, isServer, normalizedQuery]);

  const displayRows = isServer ? rowsWithDisplayDate : effectiveRows;

  return (
    <section className="w-full px-4 sm:px-6 lg:px-8 pt-3 pb-8">
      {/* Header */}
      <div className="mb-5 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h2 className="text-2xl sm:text-3xl font-semibold tracking-tight">
            {title}
          </h2>
          <p className="mt-1 text-sm text-gray-500">
            View completed and cancelled appointments.
          </p>
        </div>

        {/* Quick Filters */}
        <div className="flex items-center gap-2">
          <TabBtn
            label="All"
            active={activeTab === "ALL"}
            onClick={() => onTabChange?.("ALL")}
          />
          <TabBtn
            label="Completed"
            active={activeTab === "COMPLETED"}
            onClick={() => onTabChange?.("COMPLETED")}
          />
          <TabBtn
            label="Cancelled"
            active={activeTab === "CANCELLED"}
            onClick={() => onTabChange?.("CANCELLED")}
          />
        </div>
      </div>

      {/* Controls */}
      <div className="mb-4 grid grid-cols-1 gap-3 sm:grid-cols-2">
        <div className="flex items-center gap-2 text-xs">
          <span className="text-gray-600">Show</span>
          <select
            className="h-9 rounded-md border border-gray-200 bg-white px-2 text-xs shadow-sm hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-amber-300"
=======
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
>>>>>>> 2a8dfd498642c07a3b20c3c73175f2c4b57bb785
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

<<<<<<< HEAD
        {/* Search */}
        <label className="relative block">
          <span className="sr-only">Search appointments</span>
          <input
            value={localSearch}
            onChange={(e) => onLocalChange(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && isServer) emitSearch(localSearch.trim());
              if (e.key === "Escape") clearSearch();
            }}
            placeholder='Search service, stylist, date (e.g., "2025-10-15" or "Oct 15"), etc.'
            className="h-9 w-full rounded-md border border-gray-200 bg-white pl-9 pr-8 text-xs shadow-sm placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-amber-300"
          />
          <Search className="pointer-events-none absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
          {localSearch && (
            <button
              type="button"
              onClick={clearSearch}
              className="absolute right-1.5 top-1/2 -translate-y-1/2 rounded p-1 text-gray-400 hover:text-gray-600 focus:outline-none focus:ring-2 focus:ring-amber-300"
              aria-label="Clear search"
              title="Clear"
            >
              ×
            </button>
          )}
        </label>
      </div>

      {/* Table */}
      <div className="overflow-hidden rounded-xl ring-1 ring-gray-200 bg-white/70 backdrop-blur">
        <div className="max-h-[55vh] overflow-auto">
          <table className="min-w-full text-left align-middle">
            <thead className="sticky top-0 z-10 bg-white/90 backdrop-blur border-b border-gray-100">
              <tr className="text-[11px] uppercase tracking-wider text-gray-500">
                <th className="px-4 py-3 font-semibold">Service</th>
                <th className="px-4 py-3 font-semibold">Stylist</th>
                <th className="px-4 py-3 font-semibold">Date</th>
                <th className="px-4 py-3 font-semibold">Amount</th>
                <th className="px-4 py-3 font-semibold">Payment Mode</th>
                <th className="px-4 py-3 font-semibold">Status</th>
                <th className="px-4 py-3 font-semibold">Action</th>
              </tr>
            </thead>

            <tbody className="divide-y divide-gray-100">
              {displayRows.length === 0 ? (
                <tr>
                  <td colSpan={7}>
                    <div className="flex flex-col items-center justify-center py-16 text-center">
                      <div className="mb-2 rounded-full bg-amber-50 p-3 ring-1 ring-amber-100">
                        <Search className="h-5 w-5 text-amber-500" />
                      </div>
                      <p className="text-sm font-medium text-gray-800">
                        {emptyText}
                      </p>
                      <p className="mt-1 text-xs text-gray-500">
                        Try adjusting filters or search terms.
                      </p>
                    </div>
                  </td>
                </tr>
              ) : (
                displayRows.map((r) => (
                  <tr
                    key={r.id}
                    className="group transition-colors hover:bg-amber-50/40"
                  >
                    <td className="px-4 py-3">
                      <div className="text-sm font-medium text-gray-900">
                        {r.service}
                      </div>
                    </td>

                    <td className="px-4 py-3">
                      <div className="text-sm font-semibold text-gray-800">
                        {r.stylist}
                      </div>
                    </td>

                    <td className="px-4 py-3">
                      <div className="text-sm text-gray-800">
                        {r.__displayDate}
                      </div>
                    </td>

                    <td className="px-4 py-3">
                      <div className="text-sm text-gray-900">{r.amount}</div>
                    </td>

                    <td className="px-4 py-3">
                      <div className="text-sm text-gray-800">
                        {r.paymentMode}
                      </div>
                    </td>

                    <td className="px-4 py-3">
                      <StatusBadge status={r.status} />
                    </td>

                    <td className="px-4 py-3">
                      <button
                        type="button"
                        onClick={() => onDelete?.(r.id)}
                        className={[
                          "inline-flex items-center justify-center rounded-md p-2 transition",
                          "text-red-600 hover:text-red-700 hover:bg-red-50 focus:outline-none focus-visible:ring-2 focus-visible:ring-red-300",
                        ].join(" ")}
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
      </div>

      {/* Pager */}
=======
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
>>>>>>> 2a8dfd498642c07a3b20c3c73175f2c4b57bb785
      <Pagination
        page={page}
        totalPages={totalPages}
        onPageChange={onPageChange}
      />
    </section>
  );
};

export default CustomerAppointmentHistory;
