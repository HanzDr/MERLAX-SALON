// src/pages/admin/AdminAppointmentHistory.tsx
import React, { useEffect, useMemo, useRef, useState } from "react";
import { useAppointments } from "@/features/appointments/hooks/useAppointments";
import { ReceiptText, Trash2 } from "lucide-react";

/** Table row shape expected from the hook. */
type HistoryRow = {
  id: string;
  customer_name: string | null;
  stylist_name: string | null;
  service_date: string | Date;
  status:
    | "Booked"
    | "On-Going"
    | "Ongoing"
    | "Completed"
    | "Cancelled"
    | string;
  total_amount: number | null;
  notes?: string | null;
  customer_id?: string | null;
};

/* ============================ Helpers ============================ */

/** Normalize many date inputs to strict "YYYY-MM-DD" (local) or null if invalid. */
const toYMD = (input: string | Date | null | undefined): string | null => {
  if (!input) return null;

  // Date instance
  if (input instanceof Date && !Number.isNaN(input.getTime())) {
    const y = input.getFullYear();
    const m = String(input.getMonth() + 1).padStart(2, "0");
    const d = String(input.getDate()).padStart(2, "0");
    return `${y}-${m}-${d}`;
  }

  const s = String(input).trim();
  if (!s) return null;

  // Fast-path common formats: "YYYY-MM-DD", "YYYY-MM-DDTHH:mm:ssZ", "YYYY/MM/DD", "YYYY.MM.DD"
  const m = s.match(/^(\d{4})[-/.](\d{1,2})[-/.](\d{1,2})/);
  if (m) {
    const y = Number(m[1]),
      mo = Number(m[2]),
      d = Number(m[3]);
    const dt = new Date(y, (mo || 1) - 1, d || 1);
    if (
      !Number.isNaN(dt.getTime()) &&
      dt.getFullYear() === y &&
      dt.getMonth() === (mo || 1) - 1 &&
      dt.getDate() === (d || 1)
    ) {
      return `${y}-${String(mo).padStart(2, "0")}-${String(d).padStart(
        2,
        "0"
      )}`;
    }
  }

  // Let Date parse; then format local Y-M-D
  const dt = new Date(s);
  if (!Number.isNaN(dt.getTime())) {
    const y = dt.getFullYear();
    const mo = String(dt.getMonth() + 1).padStart(2, "0");
    const d = String(dt.getDate()).padStart(2, "0");
    return `${y}-${mo}-${d}`;
  }

  return null;
};

const fmtPHP = (n: number | null | undefined) =>
  `₱${Number(n ?? 0).toLocaleString("en-PH", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;

/** Render dd/MM/yyyy for table display, after normalizing. */
const fmtDate = (val: string | Date) => {
  const ymd = toYMD(val);
  if (!ymd) return "—";
  const [y, m, d] = ymd.split("-").map(Number);
  const dt = new Date(y, (m || 1) - 1, d || 1);
  return dt
    .toLocaleDateString("en-GB", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
    })
    .replace(/\./g, "/");
};

const statusPill = (statusRaw: string) => {
  const status = statusRaw.toLowerCase();
  if (status === "completed")
    return "bg-emerald-100 text-emerald-700 border border-emerald-200";
  if (status === "cancelled")
    return "bg-rose-100 text-rose-700 border border-rose-200";
  if (status === "ongoing" || status === "on-going")
    return "bg-sky-100 text-sky-700 border border-sky-200";
  return "bg-gray-100 text-gray-700 border border-gray-200";
};

const isCompleted = (status: string) => /complete/i.test(status);

const PAGE_SIZE_OPTIONS = [5, 10, 20];

/* ======================== Component ======================== */

const AdminAppointmentHistory: React.FC = () => {
  const { loadAdminAppointmentHistory } = useAppointments();

  // keep a stable ref to avoid effect re-running when the hook re-creates the function
  const loadHistoryRef = useRef(loadAdminAppointmentHistory);
  useEffect(() => {
    loadHistoryRef.current = loadAdminAppointmentHistory;
  }, [loadAdminAppointmentHistory]);

  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(PAGE_SIZE_OPTIONS[0]);
  const [searchInput, setSearchInput] = useState("");
  const [search, setSearch] = useState(""); // debounced value

  const [rows, setRows] = useState<HistoryRow[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [initialized, setInitialized] = useState(false);

  // Debounce search input -> search
  useEffect(() => {
    const t = setTimeout(() => setSearch(searchInput.trim()), 300);
    return () => clearTimeout(t);
  }, [searchInput]);

  // Coalesce requests so slower responses don't overwrite newer ones
  const reqIdRef = useRef(0);

  // Fetch page (stable deps only)
  useEffect(() => {
    let isMounted = true;
    const myReqId = ++reqIdRef.current;

    (async () => {
      try {
        setLoading(true);
        setErr(null);

        const res = await loadHistoryRef.current({
          page,
          pageSize,
          search,
        });

        if (!isMounted || myReqId !== reqIdRef.current) return;

        // Normalize date to "YYYY-MM-DD" right here for consistency
        const items = (res?.items ?? []).map((r) => ({
          ...r,
          service_date: toYMD(r.service_date) ?? r.service_date,
        })) as HistoryRow[];

        setRows(items);
        setTotal(Number(res?.total ?? 0));
        setInitialized(true);
      } catch (e: any) {
        if (!isMounted || myReqId !== reqIdRef.current) return;
        setErr(e?.message || "Failed to load history.");
        // keep previous rows to avoid flicker on transient errors
        setInitialized(true);
      } finally {
        if (isMounted && myReqId === reqIdRef.current) setLoading(false);
      }
    })();

    return () => {
      isMounted = false;
    };
  }, [page, pageSize, search]);

  const totalPages = useMemo(
    () => Math.max(1, Math.ceil(total / pageSize)),
    [total, pageSize]
  );

  const goTo = (p: number) =>
    setPage(Math.max(1, Math.min(totalPages, p || 1)));

  // Actions — wire these to your modals/flows if needed
  const onView = (row: HistoryRow) => {
    console.log("view", row.id);
  };
  const onDelete = (row: HistoryRow) => {
    console.log("delete", row.id);
  };

  return (
    <div className="w-full">
      {/* Top controls */}
      <div className="mb-4 flex items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <span className="text-sm text-gray-700">Show</span>
          <select
            className="rounded-md border bg-white px-2 py-1 text-sm"
            value={pageSize}
            onChange={(e) => {
              setPageSize(Number(e.target.value));
              setPage(1);
            }}
          >
            {PAGE_SIZE_OPTIONS.map((opt) => (
              <option key={opt} value={opt}>
                {opt}
              </option>
            ))}
          </select>
          <span className="text-sm text-gray-700">entries</span>
        </div>

        <div className="relative w-full max-w-xs">
          <input
            value={searchInput}
            onChange={(e) => {
              setSearchInput(e.target.value);
              setPage(1);
            }}
            placeholder="Search..."
            className="w-full rounded-lg border px-3 py-2 pl-3 text-sm shadow-sm focus:outline-none focus:ring-2 focus:ring-amber-300"
          />
        </div>
      </div>

      {/* Table */}
      <div className="relative overflow-hidden rounded-2xl">
        {/* subtle loading overlay that doesn't wipe the table */}
        {initialized && loading && (
          <div className="absolute inset-0 z-10 flex items-center justify-center bg-white/60 backdrop-blur-[1px]">
            <span className="rounded-md bg-white px-3 py-1 text-sm text-gray-600 shadow">
              Loading…
            </span>
          </div>
        )}

        <table className="min-w-full">
          <thead className="bg-white">
            <tr>
              <th className="sticky top-0 px-6 py-3 text-left text-sm font-semibold text-gray-700">
                Customer Name
              </th>
              <th className="sticky top-0 px-6 py-3 text-left text-sm font-semibold text-gray-700">
                Stylist Name
              </th>
              <th className="sticky top-0 px-6 py-3 text-left text-sm font-semibold text-gray-700">
                Service Date
              </th>
              <th className="sticky top-0 px-6 py-3 text-left text-sm font-semibold text-gray-700">
                Status
              </th>
              <th className="sticky top-0 px-6 py-3 text-left text-sm font-semibold text-gray-700">
                Total Amount
              </th>
              <th className="sticky top-0 px-6 py-3 text-left text-sm font-semibold text-gray-700">
                Notes
              </th>
              <th className="sticky top-0 px-6 py-3 text-left text-sm font-semibold text-gray-700">
                Action
              </th>
            </tr>
          </thead>

          <tbody className="bg-amber-50/40">
            {!initialized ? (
              <tr>
                <td
                  className="px-6 py-8 text-center text-sm text-gray-500"
                  colSpan={7}
                >
                  Loading…
                </td>
              </tr>
            ) : err ? (
              <tr>
                <td
                  className="px-6 py-8 text-center text-sm text-rose-600"
                  colSpan={7}
                >
                  {err}
                </td>
              </tr>
            ) : rows.length === 0 ? (
              <tr>
                <td
                  className="px-6 py-8 text-center text-sm text-gray-500"
                  colSpan={7}
                >
                  No results found.
                </td>
              </tr>
            ) : (
              rows.map((r) => (
                <tr key={r.id}>
                  <td className="px-6 py-4 text-sm text-gray-900">
                    {r.customer_name || "—"}
                  </td>
                  <td className="px-6 py-4 text-sm text-gray-900">
                    {r.stylist_name || "—"}
                  </td>
                  <td className="px-6 py-4 text-sm text-gray-900">
                    {fmtDate(r.service_date)}
                  </td>
                  <td className="px-6 py-4 text-sm">
                    <span
                      className={`inline-flex rounded-full px-3 py-1 text-xs font-semibold ${statusPill(
                        r.status
                      )}`}
                    >
                      {r.status === "Ongoing" ? "On-Going" : r.status}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-sm text-gray-900">
                    {fmtPHP(r.total_amount)}
                  </td>
                  <td className="px-6 py-4 text-sm text-gray-900">
                    {r.notes ?? (r.customer_id ? "Booked Online" : "Walk-In")}
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex w-full items-center justify-end gap-3">
                      {isCompleted(r.status) && (
                        <button
                          className="rounded-md p-2 text-gray-700 hover:bg-gray-100"
                          title="View"
                          onClick={() => onView(r)}
                        >
                          <ReceiptText className="h-5 w-5" />
                        </button>
                      )}
                      <button
                        className="rounded-md p-2 text-rose-700 hover:bg-rose-50"
                        title="Delete"
                        onClick={() => onDelete(r)}
                      >
                        <Trash2 className="h-5 w-5" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Pagination */}
      <div className="mt-4 flex items-center justify-center gap-2">
        <button
          className="rounded-full px-3 py-1.5 text-sm text-gray-600 hover:bg-gray-100 disabled:opacity-40"
          onClick={() => goTo(page - 1)}
          disabled={page <= 1}
        >
          Previous
        </button>

        <div className="flex items-center gap-2">
          {Array.from({ length: totalPages }, (_, i) => i + 1).map((p) => (
            <button
              key={p}
              onClick={() => goTo(p)}
              className={`h-8 w-8 rounded-lg text-sm font-semibold ${
                p === page
                  ? "bg-amber-400 text-white"
                  : "bg-gray-100 text-gray-700 hover:bg-gray-200"
              }`}
            >
              {p}
            </button>
          ))}
        </div>

        <button
          className="rounded-full px-3 py-1.5 text-sm text-gray-600 hover:bg-gray-100 disabled:opacity-40"
          onClick={() => goTo(page + 1)}
          disabled={page >= totalPages}
        >
          Next
        </button>
      </div>
    </div>
  );
};

export default AdminAppointmentHistory;
