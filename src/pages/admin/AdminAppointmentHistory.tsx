import React, { useEffect, useMemo, useRef, useState } from "react";
import { useAppointments } from "@/features/appointments/hooks/useAppointments";
import { ReceiptText, Trash2, Search } from "lucide-react";
import { supabase } from "@/lib/supabaseclient";

/** Table row shape expected from the hook. */
type HistoryRow = {
  id: string;
  customer_name: string | null;
  stylist_name: string | null; // legacy single stylist field
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

  /** Optional raw name fields for Walk-Ins coming from Appointments */
  firstName?: string | null;
  middleName?: string | null;
  lastName?: string | null;

  /** Possible snake_case variants (defensive) */
  first_name?: string | null;
  middle_name?: string | null;
  last_name?: string | null;
};

/* ============================ Helpers ============================ */

/** Robust normalizer → "YYYY-MM-DD" or null */
const normalizeDate = (
  input?: string | number | Date | null
): string | null => {
  if (!input) return null;

  // Date instance
  if (input instanceof Date && !Number.isNaN(input.getTime())) {
    return input.toISOString().slice(0, 10);
  }

  // Timestamp number
  if (typeof input === "number") {
    const dt = new Date(input);
    return Number.isNaN(dt.getTime()) ? null : dt.toISOString().slice(0, 10);
  }

  // String cases
  const raw = String(input).trim();
  if (!raw) return null;

  // YYYY-MM-DD (or with / .)
  let m = raw.match(/^(\d{4})[-/.](\d{1,2})[-/.](\d{1,2})$/);
  if (m) {
    const y = +m[1],
      mo = +m[2],
      d = +m[3];
    const dt = new Date(y, mo - 1, d);
    return Number.isNaN(dt.getTime()) ? null : dt.toISOString().slice(0, 10);
  }

  // DD-MM-YYYY or DD/MM/YYYY or DD.MM.YYYY
  m = raw.match(/^(\d{1,2})[-/.](\d{1,2})[-/.](\d{4})$/);
  if (m) {
    const d = +m[1],
      mo = +m[2],
      y = +m[3];
    const dt = new Date(y, mo - 1, d);
    return Number.isNaN(dt.getTime()) ? null : dt.toISOString().slice(0, 10);
  }

  // Fallback: let Date parse ISO-ish or named formats
  const dt = new Date(raw);
  return Number.isNaN(dt.getTime()) ? null : dt.toISOString().slice(0, 10);
};

const fmtPHP = (n: number | null | undefined) =>
  `₱${Number(n ?? 0).toLocaleString("en-PH", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;

/** Display as DD/MM/YYYY using the normalized date */
const fmtDate = (val: string | Date) => {
  const ymd = normalizeDate(val);
  if (!ymd) return "—";
  const [y, m, d] = ymd.split("-").map(Number);
  const dt = new Date(y, (m || 1) - 1, d || 1);
  return dt
    .toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
    })
    .replace(/,/, ""); // remove comma → "Oct 15 2025"
};

const statusPill = (statusRaw: string) => {
  const status = statusRaw.toLowerCase();
  if (status === "completed")
    return "bg-emerald-50 text-emerald-700 ring-1 ring-inset ring-emerald-200";
  if (status === "cancelled")
    return "bg-rose-50 text-rose-700 ring-1 ring-inset ring-rose-200";
  if (status === "ongoing" || status === "on-going")
    return "bg-sky-50 text-sky-700 ring-1 ring-inset ring-sky-200";
  return "bg-zinc-50 text-zinc-700 ring-1 ring-inset ring-zinc-200";
};

const isCompleted = (status: string) => /complete/i.test(status);
const PAGE_SIZE_OPTIONS = [5, 10, 20];

/** Build a display name with fallbacks */
const computeDisplayName = (r: HistoryRow & Record<string, any>): string => {
  const joinedName = (r.customer_name ?? "").trim();
  if (joinedName) return joinedName;

  // Walk-in case: no linked customer
  if (!r.customer_id) {
    const first =
      r.firstName ?? r.firstname ?? r.first_name ?? ("" as string | null);
    const middle =
      r.middleName ?? r.middlename ?? r.middle_name ?? ("" as string | null);
    const last =
      r.lastName ?? r.lastname ?? r.last_name ?? ("" as string | null);

    const full = [first, middle, last]
      .map((s) => String(s ?? "").trim())
      .filter(Boolean)
      .join(" ");

    return full || "Walk-In";
  }

  // Linked customer but no name returned
  return "Customer";
};

/* ======================== Print helpers ======================== */

const escapeHTML = (s: string) =>
  s.replace(/[&<>"']/g, (c) =>
    c === "&"
      ? "&amp;"
      : c === "<"
      ? "&lt;"
      : c === ">"
      ? "&gt;"
      : c === '"'
      ? "&quot;"
      : "&#39;"
  );

type ReceiptExtra = {
  services: string[];
  products: string[];
  discounts: Array<{ label: string; amountOff: number; percentOff: number }>;
};

const buildReceiptHTML = (
  row: HistoryRow & Record<string, any>,
  extra: ReceiptExtra
) => {
  const printedAt = new Date().toLocaleString("en-PH", { hour12: false });
  const id = escapeHTML(row.id);
  const customer = escapeHTML(computeDisplayName(row));
  const dateStr = fmtDate(row.service_date);
  const status = escapeHTML(
    row.status === "Ongoing" ? "On-Going" : String(row.status ?? "—")
  );
  const total = fmtPHP(row.total_amount);
  const notes = escapeHTML(
    row.notes ?? (row.customer_id ? "Booked Online" : "Walk-In")
  );

  const servicesList = extra.services.length
    ? `<ul>${extra.services
        .map((n) => `<li>${escapeHTML(n)}</li>`)
        .join("")}</ul>`
    : "—";
  const productsList = extra.products.length
    ? `<ul>${extra.products
        .map((n) => `<li>${escapeHTML(n)}</li>`)
        .join("")}</ul>`
    : "—";
  const discountsList = extra.discounts.length
    ? `<ul>${extra.discounts
        .map((d) => {
          const pieces: string[] = [];
          if (d.percentOff) pieces.push(`${d.percentOff}% off`);
          if (d.amountOff)
            pieces.push(`₱${d.amountOff.toLocaleString("en-PH")} off`);
          const meta = pieces.length ? ` — ${pieces.join(" + ")}` : "";
          return `<li>${escapeHTML(d.label)}${meta}</li>`;
        })
        .join("")}</ul>`
    : "—";

  return `<!doctype html><html><head><meta charset="utf-8"/><title>Receipt - ${id}</title>
  <meta name="viewport" content="width=device-width, initial-scale=1"/><style>
  :root{--ink:#111827;--muted:#6b7280;--border:#e5e7eb;--brand:#f59e0b}*{box-sizing:border-box}
  html,body{margin:0;padding:0;color:var(--ink);font-family:ui-sans-serif,system-ui,-apple-system,Segoe UI,Roboto,Ubuntu,Cantarell,Noto Sans,Helvetica Neue,Arial,"Apple Color Emoji","Segoe UI Emoji"}
  @page{size:A4;margin:18mm}.wrap{max-width:720px;margin:0 auto}.head{display:flex;align-items:center;justify-content:space-between;gap:16px;margin-bottom:24px}
  .brand{font-weight:800;font-size:20px;letter-spacing:.3px}.brand-badge{display:inline-block;padding:2px 8px;border-radius:9999px;background:var(--brand);color:#fff;font-weight:700;margin-left:8px}
  .meta{font-size:12px;color:var(--muted)}.card{border:1px solid var(--border);border-radius:12px;padding:16px;margin-bottom:12px}.row{display:flex;gap:16px;margin:6px 0}
  .label{width:160px;color:var(--muted);font-size:12px}.value{flex:1;font-size:14px;font-weight:600}.total{font-size:20px;font-weight:800}
  .footer{margin-top:24px;font-size:12px;color:var(--muted);text-align:center}.sep{height:1px;background:var(--border);margin:16px 0}.small{font-size:12px}
  h4{margin:0 0 8px 0;font-size:14px}
  </style></head><body><div class="wrap"><div class="head"><div class="brand">Receipt <span class="brand-badge">PAID</span></div>
  <div class="meta">Printed: ${escapeHTML(printedAt)}<br/>Ref: ${id}</div></div>

  <div class="card">
    <div class="row"><div class="label">Customer</div><div class="value">${customer}</div></div>
    <div class="row"><div class="label">Service Date</div><div class="value">${escapeHTML(
      dateStr
    )}</div></div>
    <div class="row"><div class="label">Status</div><div class="value">${status}</div></div>
    <div class="sep"></div>
    <div class="row"><div class="label">Book Type</div><div class="value small">${
      notes || "—"
    }</div></div>
  </div>

  <div class="card">
    <h4>Services Performed</h4>
    ${servicesList}
  </div>

  <div class="card">
    <h4>Products Used</h4>
    ${productsList}
  </div>

  <div class="card">
    <h4>Applied Discounts</h4>
    ${discountsList}
  </div>

  <div class="card"><div class="row"><div class="label">Total</div><div class="value total">${escapeHTML(
    total
  )}</div></div></div>

  <div class="footer">Thank you! — Please keep this receipt for your records.</div></div>
  <script>window.addEventListener('load',()=>{try{window.print()}catch(_){}setTimeout(()=>{window.close()},300)})</script></body></html>`;
};

/* ======================== Component ======================== */

const AdminAppointmentHistory: React.FC = () => {
  const { loadAdminAppointmentHistory, softDeleteAppointment } =
    useAppointments();

  const loadHistoryRef = useRef(loadAdminAppointmentHistory);
  useEffect(() => {
    loadHistoryRef.current = loadAdminAppointmentHistory;
  }, [loadAdminAppointmentHistory]);

  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(PAGE_SIZE_OPTIONS[0]);
  const [searchInput, setSearchInput] = useState("");
  const [search, setSearch] = useState(""); // debounced

  // This holds the **entire** dataset when searching so client filtering is complete.
  const [allRowsCache, setAllRowsCache] = useState<HistoryRow[] | null>(null);

  const [rows, setRows] = useState<HistoryRow[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [initialized, setInitialized] = useState(false);

  // Map of appointment_id -> joined stylist names (from AppointmentStylists)
  const [stylistNamesMap, setStylistNamesMap] = useState<
    Record<string, string>
  >({});

  // Debounce search input -> search
  useEffect(() => {
    const t = setTimeout(() => setSearch(searchInput.trim()), 300);
    return () => clearTimeout(t);
  }, [searchInput]);

  // Reset cache when query changes
  useEffect(() => {
    setAllRowsCache(null);
    setPage(1);
  }, [search]);

  // Prevent races
  const reqIdRef = useRef(0);

<<<<<<< HEAD
  // Helper to normalize list
  const normalize = (arr: any[]): HistoryRow[] =>
    (arr ?? []).map((r) => ({
      ...r,
      service_date: normalizeDate(r.service_date) ?? r.service_date,
    })) as HistoryRow[];

  // Fetch **one page** — NOTE: we do not pass the search term to the server anymore.
  const fetchOne = async (p: number, ps: number) => {
    return loadHistoryRef.current({
      page: p,
      pageSize: ps,
      search: "", // client-side searching by name
      // @ts-expect-error optional hint ignored if not supported
      searchBy: "name",
    });
  };

  // When searching, fetch **all pages** once so client-side name filter is complete.
  const fetchAllForSearch = async () => {
    const FIRST_PAGE_SIZE = 200; // tune as needed
    const first = await fetchOne(1, FIRST_PAGE_SIZE);
    const items1 = normalize(first?.items ?? []);
    const total = Number(first?.total ?? items1.length);
    if (items1.length >= total) return items1;

    const pages = Math.ceil(total / FIRST_PAGE_SIZE);
    const promises: Promise<any>[] = [];
    for (let p = 2; p <= pages; p++) {
      promises.push(fetchOne(p, FIRST_PAGE_SIZE));
    }
    const rest = await Promise.all(promises);
    const merged = items1.concat(...rest.map((r) => normalize(r?.items ?? [])));
    const uniq = Array.from(new Map(merged.map((x) => [x.id, x])).values());
    return uniq;
  };

  // Batch-hydrate stylist names for visible rows (or whole search dataset)
  const hydrateStylists = async (appointments: HistoryRow[]) => {
    const ids = Array.from(new Set(appointments.map((r) => r.id)));
    if (!ids.length) {
      setStylistNamesMap({});
      return;
    }

    const { data, error } = await supabase
      .from("AppointmentStylists")
      .select("appointment_id, Stylists(name)")
      .in("appointment_id", ids);

    if (error) {
      console.error("Failed to hydrate stylists:", error.message);
      return;
    }

    const groups = new Map<string, string[]>();
    for (const row of data ?? []) {
      const aid = String((row as any).appointment_id);
      const nm = String((row as any)?.Stylists?.name ?? "").trim();
      if (!nm) continue;
      if (!groups.has(aid)) groups.set(aid, []);
      groups.get(aid)!.push(nm);
    }

    const mapObj: Record<string, string> = {};
    for (const id of ids) {
      const arr = groups.get(id) ?? [];
      mapObj[id] = arr.length ? arr.join(", ") : "";
    }
    setStylistNamesMap(mapObj);
  };

  // Main fetch effect
  const fetchPage = async (p = page, ps = pageSize, q = search) => {
    const my = ++reqIdRef.current;
    setLoading(true);
    setErr(null);
    try {
      if (q) {
        // client-side search by customer name only
        const dataset = allRowsCache ?? (await fetchAllForSearch());
        if (my !== reqIdRef.current) return;

        if (!allRowsCache) setAllRowsCache(dataset);
        setRows(dataset);
        setTotal(dataset.length);
        await hydrateStylists(dataset); // optional; does not affect search
      } else {
        // server-side paging (no text filter)
        const res = await fetchOne(p, ps);
        if (my !== reqIdRef.current) return;

        const items = normalize(res?.items ?? []);
        setRows(items);
        setTotal(Number(res?.total ?? items.length));
        await hydrateStylists(items);
      }
      setInitialized(true);
    } catch (e: any) {
      if (my !== reqIdRef.current) return;
      setErr(e?.message || "Failed to load history.");
      setInitialized(true);
    } finally {
      if (my === reqIdRef.current) setLoading(false);
    }
  };

=======
  // Fetch page (stable deps only)
  const fetchPage = async (p = page, ps = pageSize, q = search) => {
    const myReqId = ++reqIdRef.current;
    setLoading(true);
    setErr(null);
    try {
      const res = await loadHistoryRef.current({
        page: p,
        pageSize: ps,
        search: q,
      });

      if (myReqId !== reqIdRef.current) return;

      // Normalize date to "YYYY-MM-DD" for consistency
      const items = (res?.items ?? []).map((r) => ({
        ...r,
        service_date: toYMD(r.service_date) ?? r.service_date,
      })) as HistoryRow[];

      setRows(items);
      setTotal(Number(res?.total ?? 0));
      setInitialized(true);
    } catch (e: any) {
      if (myReqId !== reqIdRef.current) return;
      setErr(e?.message || "Failed to load history.");
      setInitialized(true);
    } finally {
      if (myReqId === reqIdRef.current) setLoading(false);
    }
  };

>>>>>>> 2a8dfd498642c07a3b20c3c73175f2c4b57bb785
  useEffect(() => {
    fetchPage().catch(() => {});
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [page, pageSize, search]);

  // === Client filter: **customer name only** (walk-ins supported)
  const usingClientFilter = Boolean(search);
  const nameFilteredRows = useMemo(() => {
    if (!usingClientFilter) return rows;
    const q = search.toLowerCase();
    return (allRowsCache ?? rows).filter((r) =>
      computeDisplayName(r).toLowerCase().includes(q)
    );
  }, [usingClientFilter, search, rows, allRowsCache]);

  // Paginate client-side when searching; otherwise server already paged
  const effectiveTotal = usingClientFilter ? nameFilteredRows.length : total;
  const pagedRows = useMemo(() => {
    if (!usingClientFilter) return rows;
    const start = (page - 1) * pageSize;
    return nameFilteredRows.slice(start, start + pageSize);
  }, [usingClientFilter, rows, nameFilteredRows, page, pageSize]);

  const totalPages = useMemo(
    () => Math.max(1, Math.ceil(effectiveTotal / pageSize)),
    [effectiveTotal, pageSize]
  );
  const goTo = (p: number) =>
    setPage(Math.max(1, Math.min(totalPages, p || 1)));

<<<<<<< HEAD
  // ===== Receipt data fetchers (services/products/discounts) =====
  type ReceiptExtra = {
    services: string[];
    products: string[];
    discounts: Array<{ label: string; amountOff: number; percentOff: number }>;
=======
  // Actions
  const onPrintReceipt = (row: HistoryRow) => openReceiptPrint(row);

  const onDelete = async (row: HistoryRow) => {
    const yes = window.confirm(
      "Delete this appointment from history? This will hide it (soft delete)."
    );
    if (!yes) return;

    // Optimistic remove
    const prevRows = rows;
    const prevTotal = total;

    setRows((r) => r.filter((x) => x.id !== row.id));
    setTotal((t) => Math.max(0, t - 1));

    try {
      await softDeleteAppointment(row.id); // flips display=false
      // If page becomes empty and not the first page, go back one page and refetch
      if (rows.length === 1 && page > 1) {
        setPage((p) => p - 1);
      } else {
        await fetchPage(page, pageSize, search);
      }
    } catch (e: any) {
      // Roll back optimistic change
      setRows(prevRows);
      setTotal(prevTotal);
      alert(e?.message ?? "Failed to delete appointment.");
    }
>>>>>>> 2a8dfd498642c07a3b20c3c73175f2c4b57bb785
  };

  const fetchReceiptExtras = async (
    appointmentId: string
  ): Promise<ReceiptExtra> => {
    // Products used
    const { data: ap, error: apErr } = await supabase
      .from("AppointmentProducts")
      .select("Products(name)")
      .eq("appointment_id", appointmentId);
    if (apErr) console.error("Products fetch failed:", apErr.message);
    const products =
      (ap ?? [])
        .map((r: any) => String(r?.Products?.name ?? "").trim())
        .filter(Boolean) || [];

    // Discounts
    const { data: ad, error: adErr } = await supabase
      .from("AppointmentDiscount")
      .select("Discounts(name, type, value)")
      .eq("appointment_id", appointmentId);
    if (adErr) console.error("Discounts fetch failed:", adErr.message);
    const discounts =
      (ad ?? [])
        .map((r: any) => {
          const name = String(r?.Discounts?.name ?? "").trim();
          const t = String(r?.Discounts?.type ?? "").toLowerCase();
          const val = Number(r?.Discounts?.value ?? 0) || 0;
          const isPercent = /percent/.test(t);
          return {
            label:
              name ||
              (isPercent
                ? `${val}% off`
                : `₱${val.toLocaleString("en-PH")} off`),
            amountOff: isPercent ? 0 : Math.max(0, val),
            percentOff: isPercent ? Math.max(0, val) : 0,
          };
        })
        .filter((d) => d.amountOff > 0 || d.percentOff > 0) || [];

    // Services performed (Services & Packages) via AppointmentServicePlan
    const { data: asp, error: aspErr } = await supabase
      .from("AppointmentServicePlan")
      .select("Services(name), Package(name)")
      .eq("appointment_id", appointmentId);
    if (aspErr) console.error("Service plan fetch failed:", aspErr.message);

    const services: string[] = [];
    for (const row of asp ?? []) {
      const svcName = String((row as any)?.Services?.name ?? "").trim();
      const pkgName = String((row as any)?.Package?.name ?? "").trim();
      if (svcName) services.push(svcName);
      if (pkgName) services.push(pkgName);
    }

    return { services, products, discounts };
  };

  const onPrintReceipt = async (row: HistoryRow & Record<string, any>) => {
    try {
      const extra = await fetchReceiptExtras(row.id);
      const html = buildReceiptHTML(row, extra);
      const w = window.open("", "_blank");
      if (!w) {
        alert("Please allow pop-ups to print the receipt.");
        return;
      }
      w.document.open();
      w.document.write(html);
      w.document.close();
    } catch (e: any) {
      console.error("Failed to open receipt:", e?.message || e);
      alert("Failed to generate receipt.");
    }
  };

  const onDelete = async (row: HistoryRow) => {
    const yes = window.confirm(
      "Delete this appointment from history? This will hide it (soft delete)."
    );
    if (!yes) return;

    const prevRows = rows;
    const prevTotal = total;

    setRows((r) => r.filter((x) => x.id !== row.id));
    setTotal((t) => Math.max(0, t - 1));

    try {
      await softDeleteAppointment(row.id);
      if (rows.length === 1 && page > 1) setPage((p) => p - 1);
      else await fetchPage(page, pageSize, search);
    } catch (e: any) {
      setRows(prevRows);
      setTotal(prevTotal);
      alert(e?.message ?? "Failed to delete appointment.");
    }
  };

  /* ============================ UI ============================ */

  return (
    <section className="mx-auto w-full max-w-[1200px]">
      {/* Card Shell */}
      <div className="rounded-2xl border border-zinc-200 bg-white shadow-sm overflow-hidden">
        {/* Header */}
        <div className="flex flex-col gap-4 p-5 sm:flex-row sm:items-center sm:justify-between">
          <div className="space-y-1">
            <h3 className="text-lg font-semibold tracking-tight">
              Appointment History
            </h3>
            <p className="text-sm text-zinc-500">
              Browse past appointments, receipts, and statuses.
            </p>
          </div>

          {/* Top Controls */}
          <div className="flex w-full flex-col gap-3 sm:w-auto sm:flex-row sm:items-center">
            {/* Page size */}
            <div className="inline-flex items-center gap-2 rounded-xl border border-zinc-200 bg-zinc-50 px-2 py-1">
              <span className="px-2 text-sm text-zinc-600">Rows</span>
              <select
                className="rounded-lg bg-white px-2 py-1 text-sm outline-none focus:ring-2 focus:ring-amber-200"
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
            </div>

            {/* Search */}
            <div className="relative sm:w-72">
              <input
                value={searchInput}
                onChange={(e) => {
                  setSearchInput(e.target.value);
                  setPage(1);
                }}
                placeholder="Search customer name…"
                className="w-full rounded-xl border border-zinc-200 bg-white px-10 py-2 text-sm outline-none focus:border-zinc-300 focus:ring-2 focus:ring-amber-200"
              />
              <Search
                className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-zinc-500"
                aria-hidden
              />
            </div>
          </div>
        </div>

        {/* Table container with sticky header + horizontal scroll on mobile */}
        <div className="relative">
          {/* Loading overlay */}
          {initialized && loading && (
            <div className="absolute inset-0 z-10 grid place-items-center bg-white/60 backdrop-blur-sm">
              <span className="rounded-md bg-white px-3 py-1 text-sm text-zinc-600 shadow">
                Loading…
              </span>
            </div>
          )}

          <div className="overflow-x-auto">
            <table className="w-full border-t border-zinc-100 text-left text-sm">
              <thead className="sticky top-0 z-10 bg-white/95 backdrop-blur supports-[backdrop-filter]:bg-white/70">
                <tr className="text-zinc-600">
                  <Th>Customer</Th>
                  <Th>Stylist</Th>
                  <Th>Date</Th>
                  <Th>Status</Th>
                  <Th className="text-right">Total</Th>
                  <Th>Booking Type</Th>
                  <Th className="text-right">Actions</Th>
                </tr>
              </thead>

              <tbody className="divide-y divide-zinc-100">
                {!initialized ? (
                  <SkeletonRows />
                ) : err ? (
                  <tr>
                    <td colSpan={7} className="py-10 text-center text-rose-600">
                      {err}
                    </td>
                  </tr>
                ) : (usingClientFilter ? nameFilteredRows : rows).length ===
                  0 ? (
                  <tr>
                    <td colSpan={7} className="py-10 text-center text-zinc-500">
                      No results found.
                    </td>
                  </tr>
                ) : (
                  (usingClientFilter ? pagedRows : rows).map((r, idx) => {
                    const stylistJoined =
                      stylistNamesMap[r.id] ||
                      (r.stylist_name ? String(r.stylist_name) : "—");
                    return (
                      <tr
                        key={r.id}
                        className={[
                          "hover:bg-amber-50/40 transition-colors",
                          idx % 2 === 0 ? "bg-white" : "bg-zinc-50/50",
                        ].join(" ")}
                      >
                        <Td className="font-medium text-zinc-900">
                          {computeDisplayName(r)}
                        </Td>
                        <Td className="text-zinc-700">
                          {stylistJoined || "—"}
                        </Td>
                        <Td className="text-zinc-700">
                          {fmtDate(r.service_date)}
                        </Td>
                        <Td>
                          <span
                            className={`inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-semibold ${statusPill(
                              r.status
                            )}`}
                          >
                            <span
                              className={`h-1.5 w-1.5 rounded-full ${
                                /cancel/i.test(r.status)
                                  ? "bg-rose-500"
                                  : /complete/i.test(r.status)
                                  ? "bg-emerald-500"
                                  : /ongoing|on-?going/i.test(r.status)
                                  ? "bg-sky-500"
                                  : "bg-zinc-400"
                              }`}
                            />
                            {r.status === "Ongoing" ? "On-Going" : r.status}
                          </span>
                        </Td>
                        <Td className="text-right tabular-nums text-zinc-900">
                          {fmtPHP(r.total_amount)}
                        </Td>
                        <Td className="text-zinc-700">
                          {r.notes ??
                            (r.customer_id ? "Booked Online" : "Walk-In")}
                        </Td>
                        <Td className="text-right">
                          <div className="inline-flex items-center justify-end gap-1.5">
                            {isCompleted(r.status) && (
                              <button
                                className="rounded-lg border border-zinc-200 px-2.5 py-1.5 text-xs font-semibold text-zinc-700 hover:bg-zinc-50 active:scale-[0.99]"
                                title="Print receipt"
                                onClick={() => onPrintReceipt(r as any)}
                              >
                                <span className="inline-flex items-center gap-1.5">
                                  <ReceiptText className="h-4 w-4" />
                                  Receipt
                                </span>
                              </button>
                            )}
                            <button
                              className="rounded-lg border border-rose-200 px-2.5 py-1.5 text-xs font-semibold text-rose-700 hover:bg-rose-50 active:scale-[0.99]"
                              title="Delete"
                              onClick={() => onDelete(r)}
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

          {/* Bottom bar: pagination */}
          <div className="flex flex-col items-center gap-3 border-t border-zinc-100 p-4 sm:flex-row sm:justify-between">
            <div className="text-sm text-zinc-600">
              Showing{" "}
              <b className="text-zinc-900">
                {Math.min((page - 1) * pageSize + 1, effectiveTotal)}
              </b>{" "}
              -{" "}
              <b className="text-zinc-900">
                {Math.min(page * pageSize, effectiveTotal)}
              </b>{" "}
              of <b className="text-zinc-900">{effectiveTotal}</b>
            </div>

            <nav
              className="inline-flex items-center gap-1"
              aria-label="Pagination"
            >
              <PagerButton
                onClick={() => goTo(1)}
                disabled={page <= 1}
                ariaLabel="First"
              >
                «
              </PagerButton>
              <PagerButton
                onClick={() => goTo(page - 1)}
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
                onClick={() => goTo(page + 1)}
                disabled={page >= totalPages}
                ariaLabel="Next"
              >
                ›
              </PagerButton>
              <PagerButton
                onClick={() => goTo(totalPages)}
                disabled={page >= totalPages}
                ariaLabel="Last"
              >
                »
              </PagerButton>
            </nav>
          </div>
        </div>
      </div>
    </section>
  );
};

/* ---------- Small UI bits ---------- */

function Th({
  children,
  className = "",
}: React.PropsWithChildren<{ className?: string }>) {
  return (
    <th
      className={[
        "sticky top-0 px-4 py-3 text-xs font-semibold uppercase tracking-wide",
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
}: React.PropsWithChildren<{ className?: string }>) {
  return (
    <td className={["px-4 py-3 align-middle", className].join(" ")}>
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
          ? "text-zinc-300 bg-zinc-50 cursor-not-allowed"
          : "text-zinc-700 bg-white hover:bg-zinc-50 active:scale-[0.99]",
      ].join(" ")}
    >
      {children}
    </button>
  );
}

function SkeletonRows() {
  const cells = 7;
  const rows = 6;
  return (
    <>
      {Array.from({ length: rows }).map((_, r) => (
        <tr key={r} className={r % 2 ? "bg-zinc-50/50" : "bg-white"}>
          {Array.from({ length: cells }).map((__, c) => (
            <td key={c} className="px-4 py-3">
              <div className="h-4 w-full max-w-[200px] animate-pulse rounded bg-zinc-200" />
            </td>
          ))}
        </tr>
      ))}
    </>
  );
}

export default AdminAppointmentHistory;
